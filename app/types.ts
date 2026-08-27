// Re-export types from schemas
export type {
  AIContext,
  AIContextItem,
  ChatQueryParams,
  ChatRequest,
  ChunkMetadata,
  ConversationMessage,
  Project,
  ResumeData,
  VectorMatch,
  VectorQueryResult,
} from './schemas';

/** A tool as Workers AI advertises it to the model. */
export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/**
 * A tool call as it comes back from the model.
 *
 * Two shapes are in circulation: Workers AI's native one (`name` plus an
 * already-parsed `arguments` object) and the OpenAI-compatible one (`function`
 * nested, `arguments` as a JSON string). Which one arrives depends on the model
 * and can change under us, so both are typed here and normalized in one place —
 * see `normalizeToolCalls` in app/agent/loop.ts.
 */
export interface AIToolCall {
  id?: string;
  name?: string;
  arguments?: Record<string, unknown> | string;
  function?: { name?: string; arguments?: Record<string, unknown> | string };
}

interface AIRunInput {
  prompt?: string;
  messages?: Array<{ role: string; content: string }>;
  text?: string[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  tools?: AIToolDefinition[];
}

interface AIRunResult {
  data?: number[][];
  response?: string;
  tool_calls?: AIToolCall[];
  shape?: number[];
  pooling?: string;
  usage?: Record<string, unknown>;
}

export interface Env {
  // Native Workers rate limiting binding (wrangler.jsonc "ratelimits").
  // Optional: absent in local dev, where rate limiting is skipped.
  CHAT_RATE_LIMITER?: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
  CHAT_LOGS_DB: D1Database;
  AI: {
    run(model: string, input: AIRunInput & { stream: true }): Promise<ReadableStream>;
    run(model: string, input: AIRunInput & { stream?: false }): Promise<AIRunResult>;
    run(model: string, input: AIRunInput): Promise<AIRunResult | ReadableStream>;
  };
  VECTORIZE: {
    upsert: (
      vectors: Array<{
        id: string;
        values: number[];
        metadata: import('./schemas').ChunkMetadata;
      }>
    ) => Promise<void>;
    query: (
      vector: number[],
      options: {
        topK: number;
        returnMetadata?: 'all' | 'indexed' | 'none';
      }
    ) => Promise<import('./schemas').VectorQueryResult>;
    // Vectorize has no "list all ids" API, which is why the populate path keeps
    // its own manifest in D1 — without one, a renamed or removed chunk leaves an
    // orphan vector in the index that can still be retrieved into a prompt.
    deleteByIds: (ids: string[]) => Promise<{ count?: number } | undefined>;
  };
  CF_API_TOKEN?: string;
  VECTORIZE_INDEX?: string;
  VECTORIZE_ADMIN_KEY?: string;
  // Read-only credential for /api/debug/retrieval, so the CI eval can inspect
  // rankings without holding a key that can also rebuild the index.
  EVAL_API_KEY?: string;
  ADMIN_API_KEY?: string;
  CHAT_ENABLED?: string;
  // Kill switch for the MCP endpoint, mirroring CHAT_ENABLED. Absent means
  // off, so a deploy that forgets it fails closed.
  MCP_ENABLED?: string;
  // Routes /api/chat through the agent loop instead of single-shot retrieval.
  // Absent means off, and the loop falls back to the retrieval path on any
  // failure — so this turns the loop off deliberately, not as a safety net.
  CHAT_AGENT_ENABLED?: string;
  // Salt for hashing client IPs before they are written to D1. Absent in local
  // dev; see logger.ts for the degraded behaviour when it is missing.
  IP_HASH_SALT?: string;
}
