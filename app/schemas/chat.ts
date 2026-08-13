import { z } from 'zod';
import { stripInvisible } from '../lib/text';

const MAX_PROMPT_LENGTH = 1000;
const MIN_PROMPT_LENGTH = 2;
const MAX_HISTORY_MESSAGES = 12;
// Hard ceiling on the array *before* it is parsed. `.slice(-12)` runs as a
// transform, which means every element is validated and sanitized first — so
// without this a 100k-element history is fully processed just to throw all but
// the last twelve away.
const MAX_HISTORY_INPUT_MESSAGES = 50;
// Replayed assistant turns are client-supplied and therefore untrusted. They
// are capped well below the prompt limit because their only legitimate job is
// giving the model enough of its own prior answer to resolve "it" and "that" —
// not carrying 1000 characters of attacker-chosen text into the context.
const MAX_HISTORY_CONTENT_LENGTH = 600;

/**
 * Sanitizes text by removing control and invisible characters and normalizing
 * whitespace.
 *
 * Zero-width and bidi characters are stripped here rather than only at match
 * time because this text is also persisted to D1 and interpolated into the
 * model prompt — an invisible character that survives sanitization is one that
 * every downstream check has to defend against separately.
 */
function sanitizeText(input: string): string {
  return stripInvisible(input).trim().replace(/\s+/g, ' ');
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
    .transform(sanitizeText)
    // Truncate rather than reject: a legitimate client replaying a long prior
    // answer should not get a 400, it should just carry less of it.
    .transform(content => content.slice(0, MAX_HISTORY_CONTENT_LENGTH)),
});

/**
 * Schema for the full chat API request body.
 *
 * `.strict()` so unknown keys are rejected instead of silently ignored — the
 * body is small and fully specified, and an unexpected field is more likely to
 * be probing than a typo.
 */
export const ChatRequestSchema = z
  .object({
    prompt: PromptSchema,
    conversationHistory: z
      .array(ConversationMessageSchema)
      .max(
        MAX_HISTORY_INPUT_MESSAGES,
        `Conversation history must contain at most ${MAX_HISTORY_INPUT_MESSAGES} messages`
      )
      .default([])
      .transform(messages => messages.slice(-MAX_HISTORY_MESSAGES)),
    sessionId: z.uuid().optional(),
  })
  .strict();

/**
 * Schema for chat API query parameters
 */
export const ChatQueryParamsSchema = z.object({
  stream: z
    .enum(['true', 'false'])
    .default('false')
    .transform(val => val === 'true'),
});

export const CHAT_LIMITS = {
  maxPromptLength: MAX_PROMPT_LENGTH,
  minPromptLength: MIN_PROMPT_LENGTH,
  maxHistoryMessages: MAX_HISTORY_MESSAGES,
  maxHistoryContentLength: MAX_HISTORY_CONTENT_LENGTH,
} as const;

// Export inferred types
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatQueryParams = z.infer<typeof ChatQueryParamsSchema>;
