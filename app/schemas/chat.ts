import { z } from 'zod';

const MAX_PROMPT_LENGTH = 1000;
const MIN_PROMPT_LENGTH = 2;
const MAX_HISTORY_MESSAGES = 12;

/**
 * Sanitizes text by removing control characters and normalizing whitespace
 */
function sanitizeText(input: string): string {
  return (
    input
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Trim whitespace
      .trim()
      // Collapse multiple spaces/newlines
      .replace(/\s+/g, ' ')
  );
}

/**
 * Schema for validating and sanitizing user prompts
 */
export const PromptSchema = z
  .string({ message: 'Prompt must be a string' })
  .transform(sanitizeText)
  .pipe(
    z
      .string()
      .min(MIN_PROMPT_LENGTH, `Prompt must be at least ${MIN_PROMPT_LENGTH} characters`)
      .max(MAX_PROMPT_LENGTH, `Prompt must be less than ${MAX_PROMPT_LENGTH} characters`)
  );

/**
 * Schema for a single conversation message
 */
export const ConversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant'], {
    message: 'Role must be "user" or "assistant"',
  }),
  content: z
    .string()
    .min(1, 'Message content cannot be empty')
    .max(MAX_PROMPT_LENGTH, `Message content must be less than ${MAX_PROMPT_LENGTH} characters`)
    .transform(sanitizeText),
});

/**
 * Schema for the full chat API request body
 */
export const ChatRequestSchema = z.object({
  prompt: PromptSchema,
  conversationHistory: z
    .array(ConversationMessageSchema)
    .default([])
    .transform(messages => messages.slice(-MAX_HISTORY_MESSAGES)),
  sessionId: z.string().uuid().optional(),
});

/**
 * Schema for chat API query parameters
 */
export const ChatQueryParamsSchema = z.object({
  stream: z
    .enum(['true', 'false'])
    .default('false')
    .transform(val => val === 'true'),
});

// Export inferred types
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatQueryParams = z.infer<typeof ChatQueryParamsSchema>;
