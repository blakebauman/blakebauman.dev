export interface Env {
  RESUME_DATA_KV: KVNamespace;
  AI: {
    run: (model: string, input: {
      prompt?: string;
      messages?: Array<{ role: string; content: string }>;
      text?: string[];
      // Add other possible parameters
      temperature?: number;
      max_tokens?: number;
    }) => Promise<{
      data?: number[][];
      response?: string;
      shape?: number[];
      pooling?: string;
      usage?: Record<string, unknown>;
    }>;
  };
  VECTORIZE: {
    upsert: (vectors: Array<{
      id: string;
      values: number[];
      metadata: ChunkMetadata;
    }>) => Promise<void>;
    query: (vector: number[], options: {
      topK: number;
    }) => Promise<{ 
      matches: Array<{
        id: string;
        score: number;
        metadata?: ChunkMetadata;
      }>,
      count: number 
    }>;
  };
  CF_API_TOKEN: string;
  VECTORIZE_INDEX?: string;
}

export interface ChunkMetadata {
  type: 'personal' | 'skills' | 'experience';
  section: string;
  text: string;
  company?: string;
  role?: string;
  years?: string;
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
  experience: Array<{
    company: string;
    role: string;
    years: string;
    description: string;
  }>;
} 