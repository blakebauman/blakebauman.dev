import { describe, it, expect } from 'vitest';

// Test the validation logic directly
const MAX_PROMPT_LENGTH = 1000;
const MIN_PROMPT_LENGTH = 2;

function sanitizePrompt(input: string): string {
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function validatePrompt(prompt: unknown): { valid: boolean; error?: string; sanitized?: string } {
  if (prompt === null || prompt === undefined) {
    return { valid: false, error: 'Prompt is required' };
  }

  if (typeof prompt !== 'string') {
    return { valid: false, error: 'Prompt must be a string' };
  }

  const sanitized = sanitizePrompt(prompt);

  if (sanitized.length < MIN_PROMPT_LENGTH) {
    return { valid: false, error: `Prompt must be at least ${MIN_PROMPT_LENGTH} characters` };
  }

  if (sanitized.length > MAX_PROMPT_LENGTH) {
    return { valid: false, error: `Prompt must be less than ${MAX_PROMPT_LENGTH} characters` };
  }

  return { valid: true, sanitized };
}

describe('Input Validation', () => {
  describe('sanitizePrompt', () => {
    it('removes control characters', () => {
      expect(sanitizePrompt('hello\x00world')).toBe('hello world');
      expect(sanitizePrompt('test\x1Fvalue')).toBe('test value');
    });

    it('trims whitespace', () => {
      expect(sanitizePrompt('  hello  ')).toBe('hello');
    });

    it('collapses multiple spaces', () => {
      expect(sanitizePrompt('hello    world')).toBe('hello world');
    });

    it('handles newlines', () => {
      expect(sanitizePrompt('hello\n\nworld')).toBe('hello world');
    });
  });

  describe('validatePrompt', () => {
    it('rejects null prompt', () => {
      const result = validatePrompt(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Prompt is required');
    });

    it('rejects undefined prompt', () => {
      const result = validatePrompt(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Prompt is required');
    });

    it('rejects non-string prompt', () => {
      const result = validatePrompt(123);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Prompt must be a string');
    });

    it('rejects empty prompt', () => {
      const result = validatePrompt('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe(`Prompt must be at least ${MIN_PROMPT_LENGTH} characters`);
    });

    it('rejects prompt too short', () => {
      const result = validatePrompt('a');
      expect(result.valid).toBe(false);
      expect(result.error).toBe(`Prompt must be at least ${MIN_PROMPT_LENGTH} characters`);
    });

    it('rejects prompt too long', () => {
      const longPrompt = 'a'.repeat(MAX_PROMPT_LENGTH + 1);
      const result = validatePrompt(longPrompt);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(`Prompt must be less than ${MAX_PROMPT_LENGTH} characters`);
    });

    it('accepts valid prompt', () => {
      const result = validatePrompt('Hello, can you tell me about your experience?');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('Hello, can you tell me about your experience?');
    });

    it('sanitizes and validates prompt', () => {
      const result = validatePrompt('  Hello\x00World  ');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('Hello World');
    });
  });
});
