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
        metadata: ChunkMetadata;
      }>
    ) => Promise<void>;
    query: (
      vector: number[],
      options: {
        topK: number;
      }
    ) => Promise<{
      matches: Array<{
        id: string;
        score: number;
        metadata?: ChunkMetadata;
      }>;
      count: number;
    }>;
  };
  CF_API_TOKEN: string;
  VECTORIZE_INDEX?: string;
}

export interface ChunkMetadata {
  type: 'personal' | 'skills' | 'experience' | 'tools' | 'exploring' | 'projects';
  section: string;
  text: string;
  company?: string;
  role?: string;
  years?: string;
}

export interface Project {
  name: string;
  description: string;
  tech: string[];
  github: string;
}

export interface ResumeData {
  name: string;
  title: string;
  location: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  website: string;
  skills: string[];
  tools: string[];
  exploring: string[];
  projects: Project[];
  experience: Array<{
    company: string;
    role: string;
    years: string;
    description: string;
  }>;
}
