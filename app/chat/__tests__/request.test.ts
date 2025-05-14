import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestAI } from '../request';

// Mock resume data
const mockResumeData = {
  name: "Test User",
  title: "Software Engineer",
  location: "Test Location",
  email: "test@example.com",
  phone: "123-456-7890",
  linkedin: "https://linkedin.com/in/test",
  github: "https://github.com/test",
  website: "https://test.com",
  skills: ["JavaScript", "TypeScript", "React"],
  experience: [
    {
      company: "Test Company",
      role: "Senior Developer",
      years: "2020-2023",
      description: "Led development of key features"
    }
  ]
};

// Mock environment
const mockEnv = {
  RESUME_DATA_KV: {
    get: vi.fn(),
    put: vi.fn()
  },
  AI: {
    run: vi.fn()
  },
  AI_EMBEDDINGS: {
    run: vi.fn()
  },
  VECTORIZE: {
    query: vi.fn()
  }
};

describe('requestAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock KV get to return resume data
    mockEnv.RESUME_DATA_KV.get.mockResolvedValue(mockResumeData);
    
    // Mock AI embeddings
    mockEnv.AI_EMBEDDINGS.run.mockResolvedValue({
      data: [[0.1, 0.2, 0.3]]
    });
    
    // Mock Vectorize query
    mockEnv.VECTORIZE.query.mockResolvedValue({
      matches: [
        {
          id: "personal",
          score: 0.9,
          metadata: {
            text: "Test User - Software Engineer"
          }
        }
      ]
    });
    
    // Mock AI response
    mockEnv.AI.run.mockResolvedValue({
      response: "Test response"
    });
  });

  it('should handle a basic query successfully', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      body: JSON.stringify({ prompt: "Tell me about your experience" })
    });

    const response = await requestAI({
      request,
      context: { cloudflare: { env: mockEnv } }
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.choices[0].message.content).toBe("Test response");
  });

  it('should fetch resume data from KV if not present', async () => {
    mockEnv.RESUME_DATA_KV.get.mockResolvedValue(null);
    
    const request = new Request('http://test.com', {
      method: 'POST',
      body: JSON.stringify({ prompt: "Tell me about your experience" })
    });

    await requestAI({
      request,
      context: { cloudflare: { env: mockEnv } }
    });

    expect(mockEnv.RESUME_DATA_KV.put).toHaveBeenCalled();
  });

  it('should handle embedding generation failure', async () => {
    mockEnv.AI_EMBEDDINGS.run.mockResolvedValue({ data: [] });

    const request = new Request('http://test.com', {
      method: 'POST',
      body: JSON.stringify({ prompt: "Tell me about your experience" })
    });

    const response = await requestAI({
      request,
      context: { cloudflare: { env: mockEnv } }
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to generate AI response");
  });

  it('should handle Vectorize query failure', async () => {
    mockEnv.VECTORIZE.query.mockRejectedValue(new Error("Vectorize query failed"));

    const request = new Request('http://test.com', {
      method: 'POST',
      body: JSON.stringify({ prompt: "Tell me about your experience" })
    });

    const response = await requestAI({
      request,
      context: { cloudflare: { env: mockEnv } }
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to generate AI response");
  });

  it('should handle AI response generation failure', async () => {
    mockEnv.AI.run.mockRejectedValue(new Error("AI response generation failed"));

    const request = new Request('http://test.com', {
      method: 'POST',
      body: JSON.stringify({ prompt: "Tell me about your experience" })
    });

    const response = await requestAI({
      request,
      context: { cloudflare: { env: mockEnv } }
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to generate AI response");
  });
}); 