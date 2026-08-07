import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../types';
import { requestAI } from '../request';

// Mock execution context
const mockCtx = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
  props: {},
  exports: {},
} as unknown as ExecutionContext;

// Mock environment - request.ts uses AI.run for both embeddings and LLM (not AI_EMBEDDINGS)
const mockEnv = {
  AI: {
    run: vi.fn(),
  },
  VECTORIZE: {
    query: vi.fn(),
  },
  CHAT_LOGS_DB: null, // Not testing logging in these tests
};

describe('requestAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Vectorize query
    mockEnv.VECTORIZE.query.mockResolvedValue({
      matches: [
        {
          id: 'personal',
          score: 0.9,
          metadata: { type: 'personal', text: 'Test User - Software Engineer' },
        },
      ],
    });

    // AI.run is called twice: (1) embeddings with { text: [prompt] }, (2) LLM with { messages }
    mockEnv.AI.run.mockImplementation(
      (model: string, input: { text?: string[]; messages?: unknown[] }) => {
        if (input.text) {
          return Promise.resolve({ data: [[0.1, 0.2, 0.3]] });
        }
        return Promise.resolve({ response: 'Test response' });
      }
    );
  });

  it('should handle a basic query successfully', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Tell me about your experience' }),
    });

    const response = await requestAI({
      request,
      context: { cloudflare: { env: mockEnv as unknown as Env, ctx: mockCtx } },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    expect(data.choices[0]?.message.content).toBe('Test response');
  });

  it('should handle empty embeddings by falling back to full resume', async () => {
    mockEnv.AI.run.mockImplementation(
      (_model: string, input: { text?: string[]; messages?: unknown[] }) => {
        if (input.text) {
          return Promise.resolve({ data: [] }); // No embeddings - triggers fallback to full resume
        }
        return Promise.resolve({ response: 'Test response' });
      }
    );

    const request = new Request('http://test.com', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Tell me about your experience' }),
    });

    const response = await requestAI({
      request,
      context: { cloudflare: { env: mockEnv as unknown as Env, ctx: mockCtx } },
    });

    // When embeddings.data[0] is falsy, code uses full resume and continues to LLM
    expect(response.status).toBe(200);
    const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    expect(data.choices[0]?.message.content).toBe('Test response');
  });

  it('should handle Vectorize query failure with fallback to full resume', async () => {
    mockEnv.VECTORIZE.query.mockRejectedValue(new Error('Vectorize query failed'));

    const request = new Request('http://test.com', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Tell me about your experience' }),
    });

    const response = await requestAI({
      request,
      context: { cloudflare: { env: mockEnv as unknown as Env, ctx: mockCtx } },
    });

    // Vectorize failure is caught and falls back to full resume; LLM still responds
    expect(response.status).toBe(200);
    const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    expect(data.choices[0]?.message.content).toBe('Test response');
  });

  it('should handle AI response generation failure', async () => {
    mockEnv.AI.run.mockRejectedValue(new Error('AI response generation failed'));

    const request = new Request('http://test.com', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Tell me about your experience' }),
    });

    const response = await requestAI({
      request,
      context: { cloudflare: { env: mockEnv as unknown as Env, ctx: mockCtx } },
    });

    expect(response.status).toBe(500);
    const data = (await response.json()) as { error: string };
    expect(data.error).toBe('AI response generation failed');
  });
});
