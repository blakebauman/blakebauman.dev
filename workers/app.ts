import { createRequestHandler } from 'react-router';
import { populateVectorizeIndex } from '../app/lib/vectorize';
import type { Env, ResumeData } from '../app/types';

interface CloudflareEnvironment extends Env {}

// Rate limiting configuration (uses KV for cross-request persistence in Workers)
const RATE_LIMIT_WINDOW_SEC = 60; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute

function getClientIP(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'anonymous'
  );
}

async function checkRateLimit(
  kv: KVNamespace,
  clientIP: string
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const currentMinute = Math.floor(Date.now() / 60000);
  const kvKey = `ratelimit:chat:${clientIP}:${currentMinute}`;

  const currentCount = await kv.get(kvKey);
  const count = currentCount ? parseInt(currentCount, 10) : 0;

  if (count >= RATE_LIMIT_MAX_REQUESTS) {
    const resetTime = (currentMinute + 1) * 60000;
    return { allowed: false, remaining: 0, resetTime };
  }

  await kv.put(kvKey, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW_SEC });
  const resetTime = (currentMinute + 1) * 60000;
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - count - 1,
    resetTime,
  };
}

// CORS configuration - restrict to allowed origins
const ALLOWED_ORIGINS = ['https://blakebauman.dev', 'https://www.blakebauman.dev'];

function getCorsOrigin(request: Request): string {
  const origin = request.headers.get('Origin');
  // In development, allow localhost
  if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    return origin as string;
  }
  // In production, only allow specified origins
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  // Default to first allowed origin for same-origin requests
  return ALLOWED_ORIGINS[0] ?? 'https://blakebauman.dev';
}

function getCorsHeaders(request: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(request),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
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
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Handle vectorize population (protected by VECTORIZE_ADMIN_KEY secret)
    if (url.pathname === '/api/populate-vectorize' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!env.VECTORIZE_ADMIN_KEY || token !== env.VECTORIZE_ADMIN_KEY) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      try {
        // Import resume data
        const resumeData = (await import('../app/chat/resume.json')) as { default: ResumeData };

        // Use the shared library function to populate the index
        await populateVectorizeIndex(env, resumeData.default);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Vectorize index population complete!',
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      } catch (error: unknown) {
        console.error('Error populating Vectorize index:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
          JSON.stringify({
            success: false,
            error: errorMessage,
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }
    }

    // Rate limit check for /api/chat endpoint
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      const rateLimit = await checkRateLimit(env.RESUME_DATA_KV, getClientIP(request));

      if (!rateLimit.allowed) {
        return new Response(
          JSON.stringify({
            error: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)),
              'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetTime / 1000)),
              ...corsHeaders,
            },
          }
        );
      }
    }

    // Handle all other routes with React Router
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<CloudflareEnvironment>;
