import type { Env } from '../app/types';
import { populateVectorizeIndex } from '../app/lib/vectorize';
import resumeData from '../app/chat/resume.json';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      // Get the path from the URL
      const path = new URL(request.url).pathname;
      const url = new URL(request.url);
      
      // Log environment information to help debug
      console.log("Vectorize binding information:", {
        type: typeof env.VECTORIZE,
        keys: Object.keys(env.VECTORIZE),
        env: env.VECTORIZE_INDEX || 'Not set'
      });
      
      // Handle favicon requests
      if (path.startsWith("/favicon")) {
        return new Response("", { status: 404 });
      }
      
      // Handle index population
      if (path === "/insert" || path === "/populate" || path === "/") {
        // Populate the vectorize index using the shared library function
        await populateVectorizeIndex(env, resumeData);

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Vectorize index populated successfully'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Handle vector querying
      if (path === "/query") {
        // Get query parameter or use default
        const userQuery = url.searchParams.get('q') || "AI and edge computing";
        
        // Generate embedding for the query
        const queryEmbedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
          text: [userQuery]
        });
        
        if (!queryEmbedding.data || !queryEmbedding.data[0]) {
          throw new Error("Failed to generate query embedding");
        }
        
        // Query the vector database for similar vectors
        const matches = await env.VECTORIZE.query(queryEmbedding.data[0], {
          topK: 3
        });
        
        return new Response(JSON.stringify({
          query: userQuery,
          matches: matches
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Default response if no path matches
      return new Response(JSON.stringify({
        message: "Use /populate to populate the index or /query?q=YOUR_QUERY to search"
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}; 