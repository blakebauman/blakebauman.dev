import { z } from 'zod';

/**
 * Query parameters for the chat-logs admin endpoint.
 *
 * These were previously read with a bare `parseInt` and no bounds, so
 * `?days=abc` bound NaN straight into the SQL and `?days=100000` scanned the
 * whole table. Coercion plus explicit bounds makes both a 400 instead.
 */
export const ChatLogsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(7),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
});

export type ChatLogsQuery = z.infer<typeof ChatLogsQuerySchema>;
