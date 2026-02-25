import { describe, it, expect } from 'vitest';
import { PromptSchema } from '../schemas';
import { getFirstErrorMessage } from '../schemas/errors';

describe('Input Validation (using Zod schemas)', () => {
  describe('PromptSchema - sanitization', () => {
    it('removes control characters', () => {
      const result1 = PromptSchema.safeParse('hello\x00world');
      expect(result1.success && result1.data).toBe('helloworld');

      const result2 = PromptSchema.safeParse('test\x1Fvalue');
      expect(result2.success && result2.data).toBe('testvalue');
    });

    it('trims whitespace', () => {
      const result = PromptSchema.safeParse('  hello  ');
      expect(result.success && result.data).toBe('hello');
    });

    it('collapses multiple spaces', () => {
      const result = PromptSchema.safeParse('hello    world');
      expect(result.success && result.data).toBe('hello world');
    });

    it('handles newlines', () => {
      const result = PromptSchema.safeParse('hello\n\nworld');
      expect(result.success && result.data).toBe('hello world');
    });
  });

  describe('PromptSchema - validation', () => {
    it('rejects null prompt', () => {
      const result = PromptSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('rejects undefined prompt', () => {
      const result = PromptSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });

    it('rejects non-string prompt', () => {
      const result = PromptSchema.safeParse(123);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFirstErrorMessage(result.error)).toBe('Prompt must be a string');
      }
    });

    it('rejects empty prompt', () => {
      const result = PromptSchema.safeParse('');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFirstErrorMessage(result.error)).toBe('Prompt must be at least 2 characters');
      }
    });

    it('rejects prompt too short', () => {
      const result = PromptSchema.safeParse('a');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFirstErrorMessage(result.error)).toBe('Prompt must be at least 2 characters');
      }
    });

    it('rejects prompt too long', () => {
      const longPrompt = 'a'.repeat(1001);
      const result = PromptSchema.safeParse(longPrompt);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFirstErrorMessage(result.error)).toBe('Prompt must be less than 1000 characters');
      }
    });

    it('accepts valid prompt', () => {
      const result = PromptSchema.safeParse('Hello, can you tell me about your experience?');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('Hello, can you tell me about your experience?');
      }
    });

    it('sanitizes and validates prompt', () => {
      const result = PromptSchema.safeParse('  Hello\x00World  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('HelloWorld');
      }
    });
  });
});
