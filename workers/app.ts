import { createRequestHandler } from "react-router";
import type { Env, ResumeData } from '../app/types';
import { populateVectorizeIndex } from '../app/lib/vectorize';

interface CloudflareEnvironment extends Env {}

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: CloudflareEnvironment;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  // @ts-expect-error - virtual module provided by React Router at build time
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

export default {
  async fetch(request: Request, env: CloudflareEnvironment, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Handle vectorize population
    if (url.pathname === '/api/populate-vectorize' && request.method === 'POST') {
      try {
        // Import resume data
        const resumeData = await import("../app/chat/resume.json") as { default: ResumeData };

        // Use the shared library function to populate the index
        await populateVectorizeIndex(env, resumeData.default);

        return new Response(JSON.stringify({
          success: true,
          message: "Vectorize index population complete!"
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
          },
        });
      } catch (error: unknown) {
        console.error("Error populating Vectorize index:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({
          success: false,
          error: errorMessage
        }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
          },
        });
      }
    }

    // Handle OPTIONS request for CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        },
      });
    }

    // Handle all other routes with React Router
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<CloudflareEnvironment>;
