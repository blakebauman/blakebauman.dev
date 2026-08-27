import { describe, expect, it } from 'vitest';
import type { Env } from '../../types';
import { handleMcpRequest } from '../mcp';

const env = {} as Env;

/** Only the fields these tests assert on. */
interface RpcEnvelope {
  result?: {
    protocolVersion?: string;
    capabilities?: { tools?: unknown };
    serverInfo?: { name?: string };
    instructions?: string;
    tools?: Array<{ name: string; description: string; inputSchema: { type?: string } }>;
    content?: Array<{ type: string; text: string }>;
    isError?: boolean;
  };
  error?: { code: number; message: string };
}

async function rpc(body: unknown, method = 'POST') {
  const request = new Request('https://blakebauman.dev/mcp', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
  const response = await handleMcpRequest(request, env);
  const text = await response.text();
  return { response, body: (text ? JSON.parse(text) : null) as RpcEnvelope | null };
}

function call(id: number, method: string, params?: Record<string, unknown>) {
  return { jsonrpc: '2.0', id, method, ...(params ? { params } : {}) };
}

describe('handshake', () => {
  it('advertises tools and tells a client how to read the record', async () => {
    const { body } = await rpc(call(1, 'initialize', { protocolVersion: '2025-06-18' }));
    expect(body?.result?.protocolVersion).toBe('2025-06-18');
    expect(body?.result?.capabilities?.tools).toBeDefined();
    expect(body?.result?.serverInfo?.name).toBe('blakebauman.dev');
    // An external agent gets no system prompt from us, so the instructions are
    // the only place the record's boundaries can be stated up front.
    expect(body?.result?.instructions).toContain('does not cover anything else');
  });

  it('falls back to its own revision when the client asks for another', async () => {
    const { body } = await rpc(call(1, 'initialize', { protocolVersion: '2024-01-01' }));
    expect(body?.result?.protocolVersion).toBe('2025-06-18');
  });

  it('acknowledges a notification without a body', async () => {
    const { response, body } = await rpc({ jsonrpc: '2.0', method: 'notifications/initialized' });
    expect(response.status).toBe(202);
    expect(body).toBeNull();
  });

  it('answers ping', async () => {
    const { body } = await rpc(call(2, 'ping'));
    expect(body?.result).toEqual({});
  });
});

describe('tools/list', () => {
  it('returns every tool with a JSON Schema the client can validate against', async () => {
    const { body } = await rpc(call(3, 'tools/list'));
    const tools = body?.result?.tools ?? [];
    const names = tools.map(t => t.name);
    expect(names).toContain('search_record');
    expect(names).toContain('get_project');
    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe('object');
    }
  });
});

describe('tools/call', () => {
  it('returns text content', async () => {
    const { body } = await rpc(call(4, 'tools/call', { name: 'list_experience', arguments: {} }));
    expect(body?.result?.isError).toBe(false);
    expect(body?.result?.content?.[0]?.type).toBe('text');
    expect(body?.result?.content?.[0]?.text.length).toBeGreaterThan(100);
  });

  /**
   * The distinction matters to a model. An unknown tool means it invented a
   * capability and should stop; a tool that ran and failed means it should try
   * different arguments. Collapsing both into a protocol error makes the second
   * case unrecoverable.
   */
  it('separates an invented tool from a tool that failed', async () => {
    const invented = await rpc(call(5, 'tools/call', { name: 'wire_money', arguments: {} }));
    expect(invented.body?.error?.code).toBe(-32601);
    expect(invented.body?.result).toBeUndefined();

    const failed = await rpc(
      call(6, 'tools/call', { name: 'get_project', arguments: { name: 'nonexistent' } })
    );
    expect(failed.body?.error).toBeUndefined();
    expect(failed.body?.result?.isError).toBe(true);
    expect(failed.body?.result?.content?.[0]?.text).toContain('Known projects:');
  });

  it('rejects a call with no tool name', async () => {
    const { body } = await rpc(call(7, 'tools/call', { arguments: {} }));
    expect(body?.error?.code).toBe(-32600);
  });
});

describe('transport', () => {
  it('refuses GET rather than opening a stream it does not serve', async () => {
    const { response } = await rpc(null, 'GET');
    expect(response.status).toBe(405);
  });

  it('rejects malformed JSON', async () => {
    const request = new Request('https://blakebauman.dev/mcp', { method: 'POST', body: '{oops' });
    const response = await handleMcpRequest(request, env);
    expect(response.status).toBe(400);
    const parsed = (await response.json()) as RpcEnvelope;
    expect(parsed.error?.code).toBe(-32700);
  });

  it('refuses a batch, which this protocol revision removed', async () => {
    const { response, body } = await rpc([call(1, 'ping'), call(2, 'ping')]);
    expect(response.status).toBe(400);
    expect(body?.error?.message).toContain('batching is not supported');
  });

  it('rejects a body that is not JSON-RPC', async () => {
    const { body } = await rpc({ hello: 'world' });
    expect(body?.error?.code).toBe(-32600);
  });

  it('reports an unknown method', async () => {
    const { body } = await rpc(call(8, 'resources/list'));
    expect(body?.error?.code).toBe(-32601);
  });

  it('is reachable cross-origin, since MCP clients come from everywhere', async () => {
    const { response } = await rpc(call(9, 'ping'));
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Mcp-Protocol-Version')).toBe('2025-06-18');
  });
});

describe('failure disclosure', () => {
  /**
   * Same discipline as every other handler here: the caller gets a traceable id
   * and nothing that describes which binding is misconfigured.
   */
  it('does not leak the cause of an internal error', async () => {
    // Fails after the query returns, past the tool's own catch — the path that
    // reaches the handler's error branch rather than degrading.
    const malformed = {
      AI: { run: async () => ({ data: [[0.1, 0.2]] }) },
      VECTORIZE: {
        query: async () => ({
          get matches(): never {
            throw new Error('resume-index-768 is corrupt on account abc123');
          },
        }),
      },
    } as unknown as Env;

    const request = new Request('https://blakebauman.dev/mcp', {
      method: 'POST',
      body: JSON.stringify(
        call(10, 'tools/call', { name: 'search_record', arguments: { query: 'anything' } })
      ),
    });
    const body = (await (await handleMcpRequest(request, malformed)).json()) as RpcEnvelope;

    expect(body.error?.code).toBe(-32603);
    expect(body.error?.message).not.toContain('resume-index-768');
    expect(body.error?.message).not.toContain('abc123');
    expect(body.error?.message).toMatch(/request id/);
  });

  /**
   * A failed binding is not an internal error. It comes back as tool content so
   * the model can pick another tool and carry on, and it still names no binding.
   */
  it('degrades a failed binding into recoverable content', async () => {
    const broken = {
      AI: {
        run: async () => {
          throw new Error('VECTORIZE index resume-index-768 is not bound to account abc123');
        },
      },
      VECTORIZE: { query: async () => ({ matches: [], count: 0 }) },
    } as unknown as Env;

    const request = new Request('https://blakebauman.dev/mcp', {
      method: 'POST',
      body: JSON.stringify(
        call(11, 'tools/call', { name: 'search_record', arguments: { query: 'anything' } })
      ),
    });
    const body = (await (await handleMcpRequest(request, broken)).json()) as RpcEnvelope;

    expect(body.error).toBeUndefined();
    expect(body.result?.isError).toBe(true);
    const text = body.result?.content?.[0]?.text ?? '';
    expect(text).toContain('list_projects');
    expect(text).not.toContain('resume-index-768');
    expect(text).not.toContain('abc123');
  });
});
