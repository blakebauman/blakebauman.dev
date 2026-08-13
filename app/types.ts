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

interface AIRunInput {
  prompt?: string;
  messages?: Array<{ role: string; content: string }>;
  text?: string[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

interface AIRunResult {
  data?: number[][];
  response?: string;
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
  ADMIN_API_KEY?: string;
  CHAT_ENABLED?: string;
  // Salt for hashing client IPs before they are written to D1. Absent in local
  // dev; see logger.ts for the degraded behaviour when it is missing.
  IP_HASH_SALT?: string;
}
