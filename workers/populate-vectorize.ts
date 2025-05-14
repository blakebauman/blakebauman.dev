import type { Env, ResumeData } from '../app/types';
import { populateVectorizeIndex, VectorizeError } from '../app/lib/vectorize';

export default {
  async fetch(request: Request, env: Env) {
    try {
      // Import resume data
      const resumeData = await import("../app/chat/resume.json") as { default: ResumeData };

      // Populate vectorize index
      await populateVectorizeIndex(env, resumeData.default);

      return new Response(JSON.stringify({
        success: true,
        message: "Vectorize index population complete!"
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error("Error populating Vectorize index:", error);
      const errorMessage = error instanceof VectorizeError 
        ? error.message 
        : error instanceof Error 
          ? error.message 
          : "Unknown error";
      
      return new Response(JSON.stringify({
        success: false,
        error: errorMessage
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
} satisfies ExportedHandler<Env>; 