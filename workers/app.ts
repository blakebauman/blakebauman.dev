import { createRequestHandler } from 'react-router';
import aiContextData from '../app/chat/ai-context.json';
import { RETRIEVAL_CONFIG } from '../app/chat/context';
import resumeData from '../app/chat/resume.json';
import { isAuthorized, jsonResponse, serverErrorResponse } from '../app/lib/http';
import { populateVectorizeIndex } from '../app/lib/vectorize';
import { ChatLogsQuerySchema } from '../app/schemas/admin';
import type { Env } from '../app/types';

interface CloudflareEnvironment extends Env {}

// Resolved at build time by Vite, same mechanism the request handler uses.
const IS_DEV = import.meta.env.MODE === 'development';

// How long chat logs are kept. Interpolated into SQL rather than bound because
// SQLite's datetime modifier takes a literal; the value is a constant here and
// never reaches this from a request.
const LOG_RETENTION_DAYS = 90;

function hasSeenCookie(request: Request): boolean {
  const cookie = request.headers.get('Cookie');
  return cookie ? /(?:^|;\s*)bb_seen=1(?:;|$)/.test(cookie) : false;
}

function isDocumentRequest(request: Request): boolean {
  // React Router data requests append ?_data / .data; only stamp top-level navigations.
  if (request.headers.get('Sec-Fetch-Dest') === 'document') return true;
  return (request.headers.get('Accept') || '').includes('text/html');
}

/**
 * Cloudflare sets CF-Connecting-IP itself and it cannot be spoofed by the
 * client. X-Forwarded-For can be, which made it a way to rotate or share rate
 * limit buckets, so it is no longer consulted. Requests without the header
 * (only possible off-platform) share the 'unknown' bucket, which is the
 * conservative direction to fail in.
 */
function getClientIP(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

// Exact origins only. The previous check was `origin.includes('localhost')`
// with no environment gate, which reflected any origin containing that
// substring anywhere — https://localhost.attacker.example among them — in
// production.
const ALLOWED_ORIGINS = ['https://blakebauman.dev', 'https://www.blakebauman.dev'];
const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8787',
  'http://127.0.0.1:8787',
];

function getCorsOrigin(request: Request): string {
  const origin = request.headers.get('Origin');
  if (!origin) return ALLOWED_ORIGINS[0] as string;
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (IS_DEV && DEV_ORIGINS.includes(origin)) return origin;
  return ALLOWED_ORIGINS[0] as string;
}

function getCorsHeaders(request: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(request),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    // The response varies by request origin, so caches must not serve one
    // origin's CORS headers to another.
    Vary: 'Origin',
  };
}

/**
 * Applies the shared rate limiter. Returns a 429 response when the caller is
 * over the limit, or null to continue. The binding is absent in local dev.
 */
async function checkRateLimit(
  request: Request,
  env: CloudflareEnvironment,
  corsHeaders: Record<string, string>
): Promise<Response | null> {
  if (!env.CHAT_RATE_LIMITER) return null;

  const { success } = await env.CHAT_RATE_LIMITER.limit({ key: getClientIP(request) });
  if (success) return null;

  return jsonResponse(
    { error: 'Too many requests. Please try again later.', retryAfter: 60 },
    429,
    {
      'Retry-After': '60',
      ...corsHeaders,
    }
  );
}

declare module 'react-router' {
  export interface AppLoadContext {
    cloudflare: {
      env: CloudflareEnvironment;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  // @ts-expect-error - virtual module provided by React Router at build time
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE
);

export default {
  async fetch(request: Request, env: CloudflareEnvironment, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request);

    // Handle OPTIONS request for CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Rebuild the Vectorize index. This is the only populate path — the
    // separate vectorize worker that used to own a second, divergent copy has
    // been removed. It passes ai-context.json, which the old copy of this
    // handler did not, silently dropping the entire chat-only knowledge layer
    // whenever the index was rebuilt from here.
    if (url.pathname === '/api/populate-vectorize' && request.method === 'POST') {
      if (!(await isAuthorized(request.headers.get('Authorization'), env.VECTORIZE_ADMIN_KEY))) {
        return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
      }

      const limited = await checkRateLimit(request, env, corsHeaders);
      if (limited) return limited;

      try {
        const result = await populateVectorizeIndex(env, resumeData, aiContextData);
        return jsonResponse(
          {
            success: true,
            message: 'Vectorize index population complete',
            inserted: result.inserted,
            deleted: result.deleted,
          },
          200,
          corsHeaders
        );
      } catch (error: unknown) {
        return serverErrorResponse(
          'populate-vectorize',
          error,
          corsHeaders,
          'Failed to populate the Vectorize index.'
        );
      }
    }

    // Retrieval inspection for the golden-set eval (scripts/eval-retrieval.ts).
    // Returns what Vectorize matched and at what score, with no model call — the
    // only way to measure retrieval quality separately from answer quality.
    // Authenticated because it exposes the index and burns an embedding per call.
    if (url.pathname === '/api/debug/retrieval' && request.method === 'POST') {
      if (!(await isAuthorized(request.headers.get('Authorization'), env.VECTORIZE_ADMIN_KEY))) {
        return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
      }

      try {
        const body = (await request.json()) as { prompt?: unknown };
        if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
          return jsonResponse({ error: 'A non-empty "prompt" is required' }, 400, corsHeaders);
        }

        const embeddings = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [body.prompt] });
        const queryVector = embeddings.data?.[0];
        if (!queryVector) {
          return jsonResponse({ error: 'Failed to embed the prompt' }, 502, corsHeaders);
        }

        // Unfiltered on purpose: the eval tunes MIN_SCORE, so it has to see the
        // scores the floor would have discarded.
        const results = await env.VECTORIZE.query(queryVector, {
          topK: RETRIEVAL_CONFIG.topK,
          returnMetadata: 'all',
        });

        return jsonResponse(
          {
            prompt: body.prompt,
            config: RETRIEVAL_CONFIG,
            matches: (results.matches ?? []).map(match => ({
              id: match.id,
              score: match.score,
              type: match.metadata?.type ?? null,
              title: match.metadata?.title ?? null,
            })),
          },
          200,
          corsHeaders
        );
      } catch (error: unknown) {
        return serverErrorResponse(
          'debug-retrieval',
          error,
          corsHeaders,
          'Retrieval check failed.'
        );
      }
    }

    // Admin endpoint for viewing chat logs (protected by ADMIN_API_KEY)
    if (url.pathname === '/api/admin/chat-logs' && request.method === 'GET') {
      if (!(await isAuthorized(request.headers.get('Authorization'), env.ADMIN_API_KEY))) {
        return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
      }

      const limited = await checkRateLimit(request, env, corsHeaders);
      if (limited) return limited;

      if (!env.CHAT_LOGS_DB) {
        return jsonResponse({ error: 'Chat logs database not configured' }, 500, corsHeaders);
      }

      const parsedQuery = ChatLogsQuerySchema.safeParse({
        days: url.searchParams.get('days') ?? undefined,
        limit: url.searchParams.get('limit') ?? undefined,
      });
      if (!parsedQuery.success) {
        return jsonResponse(
          { error: parsedQuery.error.issues[0]?.message ?? 'Invalid query parameters' },
          400,
          corsHeaders
        );
      }
      const { days, limit } = parsedQuery.data;

      try {
        const sessionsResult = await env.CHAT_LOGS_DB.prepare(
          `SELECT s.id, s.created_at, s.last_activity_at, s.ip_hash, s.user_agent, s.message_count
           FROM chat_sessions s
           WHERE s.created_at >= datetime('now', '-' || ? || ' days')
           ORDER BY s.last_activity_at DESC
           LIMIT ?`
        )
          .bind(days, limit)
          .all();

        const messagesResult = await env.CHAT_LOGS_DB.prepare(
          `SELECT m.session_id, m.role, m.content, m.created_at, m.response_time_ms,
                  m.was_redirected, m.vector_matches_count
           FROM chat_messages m
           INNER JOIN chat_sessions s ON m.session_id = s.id
           WHERE s.created_at >= datetime('now', '-' || ? || ' days')
           ORDER BY m.session_id, m.created_at ASC`
        )
          .bind(days)
          .all();

        // Group messages by session
        const messagesBySession: Record<string, typeof messagesResult.results> = {};
        for (const msg of messagesResult.results) {
          const sessionId = msg.session_id as string;
          if (!messagesBySession[sessionId]) {
            messagesBySession[sessionId] = [];
          }
          messagesBySession[sessionId].push(msg);
        }

        const sessions = sessionsResult.results.map(session => ({
          ...session,
          messages: messagesBySession[session.id as string] || [],
        }));

        return jsonResponse(
          {
            sessions,
            meta: {
              days,
              sessionCount: sessions.length,
              messageCount: messagesResult.results.length,
            },
          },
          200,
          corsHeaders
        );
      } catch (error: unknown) {
        return serverErrorResponse(
          'admin-chat-logs',
          error,
          corsHeaders,
          'Failed to fetch chat logs.'
        );
      }
    }

    if (url.pathname === '/api/chat') {
      if (env.CHAT_ENABLED !== 'true') {
        return jsonResponse({ error: 'Chat is temporarily unavailable.' }, 503, corsHeaders);
      }

      // Only POST reaches the model. The route module used to export a loader
      // as well, so a GET ran the whole chat path while this check — keyed on
      // POST — waved it through unmetered.
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405, {
          Allow: 'POST, OPTIONS',
          ...corsHeaders,
        });
      }

      const limited = await checkRateLimit(request, env, corsHeaders);
      if (limited) return limited;
    }

    // Handle all other routes with React Router
    const response = await requestHandler(request, {
      cloudflare: { env, ctx },
    });

    // Mark first-time visitors so loaders can detect returning visitors (signal-aware
    // personalization). Only on document GETs that didn't already carry the cookie.
    if (request.method === 'GET' && !hasSeenCookie(request) && isDocumentRequest(request)) {
      const withCookie = new Response(response.body, response);
      withCookie.headers.append(
        'Set-Cookie',
        'bb_seen=1; Path=/; Max-Age=15552000; HttpOnly; SameSite=Lax; Secure'
      );
      return withCookie;
    }

    return response;
  },

  /**
   * Retention. Chat logs hold full prompt and response text plus a hashed IP,
   * and nothing previously removed them — the only bound on how long a
   * conversation was kept was how long the database existed. Sessions are
   * pruned by last activity and messages by their own timestamp, so a session
   * that stayed active keeps its recent turns rather than being dropped whole.
   */
  async scheduled(_event: ScheduledController, env: CloudflareEnvironment, ctx: ExecutionContext) {
    if (!env.CHAT_LOGS_DB) return;

    ctx.waitUntil(
      (async () => {
        try {
          const results = await env.CHAT_LOGS_DB.batch([
            env.CHAT_LOGS_DB.prepare(
              `DELETE FROM chat_messages
               WHERE created_at < datetime('now', '-${LOG_RETENTION_DAYS} days')`
            ),
            env.CHAT_LOGS_DB.prepare(
              `DELETE FROM chat_sessions
               WHERE last_activity_at < datetime('now', '-${LOG_RETENTION_DAYS} days')`
            ),
          ]);
          console.log(
            `Chat log retention: removed ${results[0]?.meta?.changes ?? 0} messages, ${results[1]?.meta?.changes ?? 0} sessions`
          );
        } catch (error) {
          console.error('Chat log retention failed:', error);
        }
      })()
    );
  },
} satisfies ExportedHandler<CloudflareEnvironment>;
