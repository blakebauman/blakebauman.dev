/**
 * Chat conversation logging utilities for D1 database
 */

import { v7 as uuidv7 } from 'uuid';

/**
 * Hash an IP address for privacy, salted with a server-side secret.
 *
 * An unsalted SHA-256 of an IP address is not anonymization: the IPv4 space is
 * 32 bits, so anyone holding the hashes can recover every address by hashing
 * all of them. The salt is what makes the hash useless without server access,
 * while still being stable enough to group a visitor's messages into a session.
 *
 * When the salt is unset (local dev) the hash is still computed but marked, so
 * unsalted rows are identifiable rather than silently mixed in with real ones.
 */
export async function hashIP(ip: string, salt?: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt ? `${salt}:${ip}` : ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return salt ? hex : `unsalted:${hex}`;
}

export interface LogMessageMetadata {
  responseTimeMs?: number;
  wasRedirected?: boolean;
  vectorMatchesCount?: number;
}

/**
 * Create a new session or update last_activity_at for existing session
 */
export async function createOrUpdateSession(
  db: D1Database,
  sessionId: string,
  ipHash: string,
  userAgent: string | null
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO chat_sessions (id, ip_hash, user_agent, message_count)
       VALUES (?, ?, ?, 0)
       ON CONFLICT(id) DO UPDATE SET
         last_activity_at = datetime('now'),
         message_count = message_count + 1`
    )
    .bind(sessionId, ipHash, userAgent)
    .run();
}

/**
 * Log a single chat message (user or assistant)
 */
export async function logMessage(
  db: D1Database,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: LogMessageMetadata
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO chat_messages (id, session_id, role, content, response_time_ms, was_redirected, vector_matches_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      uuidv7(),
      sessionId,
      role,
      content,
      metadata?.responseTimeMs ?? null,
      metadata?.wasRedirected ? 1 : 0,
      metadata?.vectorMatchesCount ?? null
    )
    .run();
}

/**
 * Log a complete conversation exchange (user prompt + assistant response)
 * This is the main function to call from the request handler
 */
export async function logConversation(
  db: D1Database,
  sessionId: string,
  ipHash: string,
  userAgent: string | null,
  userPrompt: string,
  assistantResponse: string,
  metadata?: LogMessageMetadata
): Promise<void> {
  // Use a batch for atomicity
  await db.batch([
    // Upsert session
    db
      .prepare(
        `INSERT INTO chat_sessions (id, ip_hash, user_agent, message_count)
         VALUES (?, ?, ?, 2)
         ON CONFLICT(id) DO UPDATE SET
           last_activity_at = datetime('now'),
           message_count = message_count + 2`
      )
      .bind(sessionId, ipHash, userAgent),
    // Log user message
    db
      .prepare(
        `INSERT INTO chat_messages (id, session_id, role, content)
         VALUES (?, ?, 'user', ?)`
      )
      .bind(uuidv7(), sessionId, userPrompt),
    // Log assistant response with metadata
    db
      .prepare(
        `INSERT INTO chat_messages (id, session_id, role, content, response_time_ms, was_redirected, vector_matches_count)
         VALUES (?, ?, 'assistant', ?, ?, ?, ?)`
      )
      .bind(
        uuidv7(),
        sessionId,
        assistantResponse,
        metadata?.responseTimeMs ?? null,
        metadata?.wasRedirected ? 1 : 0,
        metadata?.vectorMatchesCount ?? null
      ),
  ]);
}
