import { serverErrorResponse } from '../lib/http';
import type { Env } from '../types';
import { callTool, hasTool, listTools } from './tools';

/**
 * A Model Context Protocol server over Streamable HTTP, exposing the tool layer
 * in `tools.ts` to any external agent.
 *
 * Deliberately stateless and hand-written:
 *
 * - **Stateless.** Every tool here is read-only and every call is independent,
 *   so there is no session to keep. That removes the Durable Object the
 *   stateful `McpAgent` pattern would need, and with it a binding, a migration
 *   and a per-connection cost — for a server whose entire job is answering
 *   questions about a resume.
 * - **Hand-written.** The subset of MCP a stateless read-only server has to
 *   speak is `initialize`, `tools/list`, `tools/call` and `ping`. That is less
 *   code than the wiring an SDK would need, and it keeps the dependency count
 *   where the rest of this repo keeps it.
 *
 * Unauthenticated on purpose: everything it returns is already published on the
 * page. What it does spend is Workers AI credit on `search_record`, so the
 * caller must be rate limited — see the /mcp branch in workers/app.ts.
 */

// The revision of MCP this speaks. 2025-06-18 dropped JSON-RPC batching, which
// is why an array request is refused below rather than handled.
const PROTOCOL_VERSION = '2025-06-18';

const SERVER_INFO = {
  name: 'blakebauman.dev',
  title: "Blake Bauman's professional record",
  version: '1.0.0',
} as const;

const INSTRUCTIONS = [
  "This server answers questions about Blake Bauman's professional record: his roles, projects, skills and written case studies.",
  'Start with get_profile for who he is, search_record for open questions, or list_projects and list_experience for questions about what he has built or where he has worked.',
  'Everything returned is a record of what exists. It does not cover anything else, and an absence from it means the record does not say — not that the answer is no.',
].join(' ');

// JSON-RPC 2.0 reserved codes.
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INTERNAL_ERROR = -32603;

type JsonRpcId = string | number | null;

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

export const MCP_CORS_HEADERS: Record<string, string> = {
  // Public read-only data, and MCP clients arrive from every origin there is —
  // including browser-based ones, which cannot reach this without it. This is
  // the one endpoint here that is deliberately not origin-locked.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Mcp-Protocol-Version',
  'Access-Control-Expose-Headers': 'Mcp-Protocol-Version',
  'Access-Control-Max-Age': '86400',
};

function rpcResponse(id: JsonRpcId, result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Mcp-Protocol-Version': PROTOCOL_VERSION,
      ...MCP_CORS_HEADERS,
    },
  });
}

/**
 * A JSON-RPC error. The HTTP status stays 200 for a well-formed request that
 * failed at the protocol layer — the error belongs in the envelope, and a
 * client reading only the status would otherwise miss it.
 */
function rpcError(id: JsonRpcId, code: number, message: string, status = 200): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Mcp-Protocol-Version': PROTOCOL_VERSION,
      ...MCP_CORS_HEADERS,
    },
  });
}

/** A notification carries no id and gets no body — only an acknowledgement. */
function accepted(): Response {
  return new Response(null, { status: 202, headers: MCP_CORS_HEADERS });
}

function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.jsonrpc === '2.0' && typeof candidate.method === 'string';
}

async function dispatch(
  message: JsonRpcRequest,
  env: Env
): Promise<{ result: unknown } | { error: { code: number; message: string } }> {
  switch (message.method) {
    case 'initialize': {
      // The client's requested version is echoed when we speak it, so a client
      // pinned to an older revision is not forced to renegotiate. Anything else
      // gets ours, and the client decides whether it can live with it.
      const requested = message.params?.protocolVersion;
      return {
        result: {
          protocolVersion: requested === PROTOCOL_VERSION ? requested : PROTOCOL_VERSION,
          // No `listChanged`: the record ships with the Worker, so the tool list
          // cannot change without a deploy.
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
          instructions: INSTRUCTIONS,
        },
      };
    }

    case 'ping':
      return { result: {} };

    case 'tools/list':
      return { result: { tools: listTools() } };

    case 'tools/call': {
      const name = message.params?.name;
      if (typeof name !== 'string') {
        return { error: { code: INVALID_REQUEST, message: 'params.name must be a string' } };
      }

      // An unknown tool is a protocol error; a tool that ran and failed is not.
      // The distinction matters to a model: the first means it hallucinated a
      // capability, the second means it should try different arguments.
      if (!hasTool(name)) {
        return { error: { code: METHOD_NOT_FOUND, message: `Unknown tool: ${name}` } };
      }

      const { text, isError } = await callTool(name, message.params?.arguments, { env });
      return { result: { content: [{ type: 'text', text }], isError } };
    }

    default:
      return { error: { code: METHOD_NOT_FOUND, message: `Unknown method: ${message.method}` } };
  }
}

/**
 * Handles one MCP request. The caller is responsible for rate limiting and for
 * the OPTIONS preflight.
 */
export async function handleMcpRequest(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    // A server that offers no server-initiated SSE stream refuses GET rather
    // than opening one, per the Streamable HTTP transport.
    return rpcError(null, INVALID_REQUEST, 'This MCP endpoint accepts POST only.', 405);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return rpcError(null, PARSE_ERROR, 'Request body is not valid JSON.', 400);
  }

  if (Array.isArray(body)) {
    return rpcError(
      null,
      INVALID_REQUEST,
      `JSON-RPC batching is not supported in MCP ${PROTOCOL_VERSION}. Send one request per POST.`,
      400
    );
  }

  if (!isJsonRpcRequest(body)) {
    return rpcError(null, INVALID_REQUEST, 'Not a JSON-RPC 2.0 request.', 400);
  }

  // No id means a notification — `notifications/initialized` is the one that
  // actually arrives. Nothing is returned for it, including for errors.
  const id = body.id ?? null;
  if (body.id === undefined) {
    return accepted();
  }

  try {
    const outcome = await dispatch(body, env);
    return 'error' in outcome
      ? rpcError(id, outcome.error.code, outcome.error.message)
      : rpcResponse(id, outcome.result);
  } catch (error) {
    // Same discipline as every other handler here: the real cause goes to the
    // log with a request id, and the caller gets the id and nothing else.
    // serverErrorResponse builds the body, so the id is read back out of it
    // rather than generated twice.
    const logged = await serverErrorResponse('mcp', error, {}, 'The MCP server could not answer.')
      .json()
      .catch(() => ({ requestId: 'unknown' }));
    const { requestId } = logged as { requestId?: string };
    return rpcError(id, INTERNAL_ERROR, `Internal error (request id ${requestId ?? 'unknown'}).`);
  }
}
