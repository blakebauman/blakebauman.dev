import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../types';
import { requestAI } from '../request';

// Mock resume data (must match ResumeDataSchema - request.ts uses resumeJson for context)
const mockResumeData = {
  name: 'Test User',
  title: 'Software Engineer',
  location: 'Test Location',
  email: 'test@example.com',
  phone: '123-456-7890',
  linkedin: 'https://linkedin.com/in/test',
  github: 'https://github.com/test',
  website: 'https://test.com',
  skills: ['JavaScript', 'TypeScript', 'React'],
  tools: ['JavaScript', 'TypeScript', 'React'],
  exploring: ['AI', 'LLMs'],
  projects: [
    {
      name: 'test-project',
      description: 'A test project',
      tech: ['TypeScript', 'React'],
      github: 'https://github.com/test/test-project',
    },
  ],
  experience: [
    {
      company: 'Test Company',
      role: 'Senior Developer',
      years: '2020-2023',
      description: 'Led development of key features',
    },
  ],
  summary: ['Test professional summary.'],
  blockquote: { text: 'I learn {word} fast.', highlight: 'things' },
  sections: {
    tools: 'Tools intro.',
    exploring: 'Exploring intro.',
    projects: 'Projects intro.',
    contact: 'Contact intro.',
  },
};

// Mock environment - request.ts uses AI.run for both embeddings and LLM (not AI_EMBEDDINGS)
const mockEnv = {
  RESUME_DATA_KV: {
    get: vi.fn(),
    put: vi.fn(),
  },
  AI: {
    run: vi.fn(),
  },
  VECTORIZE: {
    query: vi.fn(),
  },
};

describe('requestAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock KV get to return resume data
    mockEnv.RESUME_DATA_KV.get.mockResolvedValue(mockResumeData);

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
      context: { cloudflare: { env: mockEnv as unknown as Env } },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    expect(data.choices[0]?.message.content).toBe('Test response');
  });

  it('should fetch resume data from KV if not present', async () => {
    mockEnv.RESUME_DATA_KV.get.mockResolvedValue(null);

    const request = new Request('http://test.com', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Tell me about your experience' }),
    });

    await requestAI({
      request,
      context: { cloudflare: { env: mockEnv as unknown as Env } },
    });

    expect(mockEnv.RESUME_DATA_KV.put).toHaveBeenCalled();
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
      context: { cloudflare: { env: mockEnv as unknown as Env } },
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
      context: { cloudflare: { env: mockEnv as unknown as Env } },
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
      context: { cloudflare: { env: mockEnv as unknown as Env } },
    });

    expect(response.status).toBe(500);
    const data = (await response.json()) as { error: string };
    expect(data.error).toBe('AI response generation failed');
  });
});
