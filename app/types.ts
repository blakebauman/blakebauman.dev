// Re-export types from schemas
export type {
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
  RESUME_DATA_KV: KVNamespace;
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
      }
    ) => Promise<import('./schemas').VectorQueryResult>;
  };
  CF_API_TOKEN?: string;
  VECTORIZE_INDEX?: string;
  VECTORIZE_ADMIN_KEY?: string;
}
