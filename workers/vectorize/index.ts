import aiContextData from '../../app/chat/ai-context.json';
import resumeData from '../../app/chat/resume.json';
import { populateVectorizeIndex } from '../../app/lib/vectorize';
import type { Env } from '../../app/types';

interface VectorizeEnv extends Env {
  VECTORIZE_ADMIN_KEY?: string;
}

const MAX_QUERY_LENGTH = 500;
const ALLOWED_ORIGINS = [
  'https://blakebauman.dev',
  'https://www.blakebauman.dev',
  'https://vectorize.blakebauman.dev',
  'https://blakebauman-dev.blakebauman.workers.dev',
];

function corsHeaders(origin: string | null): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
  }

  return headers;
}

export default {
  async fetch(request: Request, env: VectorizeEnv, _ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get('Origin');

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Handle favicon requests
      if (path.startsWith('/favicon')) {
        return new Response('', { status: 404 });
      }

      // Handle index population - PROTECTED endpoint
      if (path === '/insert' || path === '/populate' || path === '/') {
        // Require POST method
        if (request.method !== 'POST') {
          return new Response(
            JSON.stringify({
              error: 'Method not allowed',
            }),
            {
              status: 405,
              headers: { ...corsHeaders(origin), Allow: 'POST' },
            }
          );
        }

        // Require admin key authentication
        const authHeader = request.headers.get('Authorization');
        const providedKey = authHeader?.replace('Bearer ', '');

        if (!env.VECTORIZE_ADMIN_KEY) {
          return new Response(
            JSON.stringify({
              error: 'Server configuration error',
            }),
            {
              status: 500,
              headers: corsHeaders(origin),
            }
          );
        }

        if (!providedKey || providedKey !== env.VECTORIZE_ADMIN_KEY) {
          return new Response(
            JSON.stringify({
              error: 'Unauthorized',
            }),
            {
              status: 401,
              headers: corsHeaders(origin),
            }
          );
        }

        const vectorCount = await populateVectorizeIndex(env, resumeData, aiContextData);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Vectorize index populated successfully',
            vectorCount,
          }),
          {
            headers: corsHeaders(origin),
          }
        );
      }

      // Handle vector querying - public but rate-limited by Cloudflare
      if (path === '/query') {
        // Only allow GET requests
        if (request.method !== 'GET') {
          return new Response(
            JSON.stringify({
              error: 'Method not allowed',
            }),
            {
              status: 405,
              headers: { ...corsHeaders(origin), Allow: 'GET' },
            }
          );
        }

        const userQuery = url.searchParams.get('q') || 'AI and edge computing';

        // Validate query length to prevent abuse
        if (userQuery.length > MAX_QUERY_LENGTH) {
          return new Response(
            JSON.stringify({
              error: `Query too long. Maximum ${MAX_QUERY_LENGTH} characters.`,
            }),
            {
              status: 400,
              headers: corsHeaders(origin),
            }
          );
        }

        const queryEmbedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
          text: [userQuery],
        });

        if (!queryEmbedding.data || !queryEmbedding.data[0]) {
          throw new Error('Failed to generate query embedding');
        }

        const matches = await env.VECTORIZE.query(queryEmbedding.data[0], {
          topK: 10,
        });

        return new Response(
          JSON.stringify({
            query: userQuery,
            matches: matches,
          }),
          {
            headers: corsHeaders(origin),
          }
        );
      }

      // Default response - don't expose available endpoints
      return new Response(
        JSON.stringify({
          error: 'Not found',
        }),
        {
          status: 404,
          headers: corsHeaders(origin),
        }
      );
    } catch (error) {
      // Don't expose stack traces or internal error details
      console.error('Vectorize worker error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
        }),
        {
          status: 500,
          headers: corsHeaders(origin),
        }
      );
    }
  },
};
