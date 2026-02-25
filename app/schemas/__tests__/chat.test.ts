import { describe, expect, it } from 'vitest';
import {
  ChatQueryParamsSchema,
  ChatRequestSchema,
  ConversationMessageSchema,
  PromptSchema,
} from '../chat';
import { getFirstErrorMessage } from '../errors';

describe('PromptSchema', () => {
  it('validates a valid prompt', () => {
    const result = PromptSchema.safeParse('What are your skills?');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('What are your skills?');
    }
  });

  it('rejects prompt that is too short', () => {
    const result = PromptSchema.safeParse('a');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(getFirstErrorMessage(result.error)).toBe('Prompt must be at least 2 characters');
    }
  });

  it('rejects prompt that is too long', () => {
    const longPrompt = 'a'.repeat(1001);
    const result = PromptSchema.safeParse(longPrompt);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(getFirstErrorMessage(result.error)).toBe('Prompt must be less than 1000 characters');
    }
  });

  it('rejects non-string prompt', () => {
    const result = PromptSchema.safeParse(123);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(getFirstErrorMessage(result.error)).toBe('Prompt must be a string');
    }
  });

  it('rejects null prompt', () => {
    const result = PromptSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it('sanitizes control characters', () => {
    const result = PromptSchema.safeParse('Hello\x00World\x1F!');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('HelloWorld!');
    }
  });

  it('trims whitespace', () => {
    const result = PromptSchema.safeParse('  Hello World  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('Hello World');
    }
  });

  it('collapses multiple spaces', () => {
    const result = PromptSchema.safeParse('Hello    World');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('Hello World');
    }
  });

  it('collapses newlines to spaces', () => {
    const result = PromptSchema.safeParse('Hello\n\nWorld');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('Hello World');
    }
  });
});

describe('ConversationMessageSchema', () => {
  it('validates a valid user message', () => {
    const result = ConversationMessageSchema.safeParse({
      role: 'user',
      content: 'Hello',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('user');
      expect(result.data.content).toBe('Hello');
    }
  });

  it('validates a valid assistant message', () => {
    const result = ConversationMessageSchema.safeParse({
      role: 'assistant',
      content: 'Hi there!',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('assistant');
    }
  });

  it('rejects invalid role', () => {
    const result = ConversationMessageSchema.safeParse({
      role: 'system',
      content: 'Hello',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(getFirstErrorMessage(result.error)).toBe('Role must be "user" or "assistant"');
    }
  });

  it('rejects empty content', () => {
    const result = ConversationMessageSchema.safeParse({
      role: 'user',
      content: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(getFirstErrorMessage(result.error)).toBe('Message content cannot be empty');
    }
  });

  it('rejects content that is too long', () => {
    const result = ConversationMessageSchema.safeParse({
      role: 'user',
      content: 'a'.repeat(1001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(getFirstErrorMessage(result.error)).toBe(
        'Message content must be less than 1000 characters'
      );
    }
  });

  it('sanitizes message content', () => {
    const result = ConversationMessageSchema.safeParse({
      role: 'user',
      content: '  Hello\x00World  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe('HelloWorld');
    }
  });
});

describe('ChatRequestSchema', () => {
  it('validates a request with just a prompt', () => {
    const result = ChatRequestSchema.safeParse({
      prompt: 'What is your experience?',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prompt).toBe('What is your experience?');
      expect(result.data.conversationHistory).toEqual([]);
    }
  });

  it('validates a request with conversation history', () => {
    const result = ChatRequestSchema.safeParse({
      prompt: 'Tell me more',
      conversationHistory: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.conversationHistory).toHaveLength(2);
    }
  });

  it('limits conversation history to 12 messages', () => {
    const history = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `Message ${i}`,
    }));

    const result = ChatRequestSchema.safeParse({
      prompt: 'Final message',
      conversationHistory: history,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.conversationHistory).toHaveLength(12);
      // Should keep the last 12 messages
      expect(result.data.conversationHistory[0]?.content).toBe('Message 8');
    }
  });

  it('defaults conversationHistory to empty array', () => {
    const result = ChatRequestSchema.safeParse({
      prompt: 'Hello',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.conversationHistory).toEqual([]);
    }
  });

  it('rejects invalid conversation history items', () => {
    const result = ChatRequestSchema.safeParse({
      prompt: 'Hello',
      conversationHistory: [{ role: 'invalid', content: 'test' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('ChatQueryParamsSchema', () => {
  it('parses stream=true', () => {
    const result = ChatQueryParamsSchema.safeParse({ stream: 'true' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stream).toBe(true);
    }
  });

  it('parses stream=false', () => {
    const result = ChatQueryParamsSchema.safeParse({ stream: 'false' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stream).toBe(false);
    }
  });

  it('defaults to stream=false', () => {
    const result = ChatQueryParamsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stream).toBe(false);
    }
  });

  it('rejects invalid stream values', () => {
    const result = ChatQueryParamsSchema.safeParse({ stream: 'yes' });
    expect(result.success).toBe(false);
  });
});
