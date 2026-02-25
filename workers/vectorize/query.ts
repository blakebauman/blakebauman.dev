import type { Env } from '../../app/types';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      // Get the path from the URL
      const url = new URL(request.url);

      // Handle favicon requests
      if (url.pathname.startsWith('/favicon')) {
        return new Response('', { status: 404 });
      }

      // Get query parameter or use default
      const userQuery = url.searchParams.get('q') || 'AI and edge computing';

      // Generate embedding for the query
      const queryEmbedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
        text: [userQuery],
      });

      if (!queryEmbedding.data || !queryEmbedding.data[0]) {
        throw new Error('Failed to generate query embedding');
      }

      // Query the vector database for similar vectors
      const matches = await env.VECTORIZE.query(queryEmbedding.data[0], {
        topK: 3,
      });

      return new Response(
        JSON.stringify({
          query: userQuery,
          matches: matches,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          details: error instanceof Error ? error.stack : undefined,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  },
};
