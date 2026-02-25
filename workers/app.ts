import { createRequestHandler } from 'react-router';
import type { Env, ResumeData } from '../app/types';
import { populateVectorizeIndex } from '../app/lib/vectorize';

interface CloudflareEnvironment extends Env {}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(request: Request): string {
  // Use CF-Connecting-IP header (Cloudflare) or fallback to a hash of the request
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'anonymous'
  );
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    // Reset or create new entry
    const resetTime = now + RATE_LIMIT_WINDOW_MS;
    rateLimitMap.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetTime };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - entry.count,
    resetTime: entry.resetTime,
  };
}

// CORS configuration - restrict to allowed origins
const ALLOWED_ORIGINS = ['https://blakebauman.dev', 'https://www.blakebauman.dev'];

function getCorsOrigin(request: Request): string {
  const origin = request.headers.get('Origin');
  // In development, allow localhost
  if (origin?.includes('localhost') || origin?.includes('127.0.0.1')) {
    return origin;
  }
  // In production, only allow specified origins
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  // Default to first allowed origin for same-origin requests
  return ALLOWED_ORIGINS[0];
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

    // Handle vectorize population
    if (url.pathname === '/api/populate-vectorize' && request.method === 'POST') {
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
      const rateLimitKey = getRateLimitKey(request);
      const rateLimit = checkRateLimit(rateLimitKey);

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
