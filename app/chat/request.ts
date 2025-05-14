import type { Env, ResumeData, ChunkMetadata } from '../types';

interface VectorMatch {
  id: string;
  score: number;
  metadata?: ChunkMetadata;
}

interface VectorResults {
  matches: VectorMatch[];
}

export async function requestAI({
  request,
  context,
}: {
  request: Request;
  context: { cloudflare: { env: Env } };
}) {
  const { prompt }: { prompt: string } = await request.json();

  try {
    // Check if we're in development mode
    const isDev = process.env.NODE_ENV === 'development';

    // Ensure we have access to the AI service
    if (!context.cloudflare?.env?.AI?.run) {
      throw new Error("AI service is not properly configured. Please ensure you're running with the correct Cloudflare bindings.");
    }

    // Fetch resume data from Cloudflare KV
    const resume = await context.cloudflare.env.RESUME_DATA_KV.get<ResumeData>(
      "resume_json",
      "json"
    );

    if (!resume) {
      const resumeData = await import("./resume.json");
      await context.cloudflare.env.RESUME_DATA_KV.put(
        "resume_json",
        JSON.stringify(resumeData)
      );
    }

    let relevantSections = "";
    let relevantSkills: string[] = [];
    
    // Get the full resume data - will never be null after this line
    const resumeData = resume || (await import("./resume.json")).default;
    
    // Only use embeddings and vector search if available and not in development
    if (!isDev && context.cloudflare?.env?.AI?.run && context.cloudflare?.env?.VECTORIZE?.query) {
      try {
        // Create embeddings for the user's prompt using Workers AI
        const embeddings = await context.cloudflare.env.AI.run(
          "@cf/baai/bge-base-en-v1.5",
          { text: [prompt] }
        );

        if (embeddings.data?.[0]) {
          // Query Vectorize to find relevant resume sections
          const vectorResults = await context.cloudflare.env.VECTORIZE.query(
            embeddings.data[0],
            {
              topK: 5 // Increased from 3 to get more context
            }
          );

          console.log("Vector search results:", JSON.stringify(vectorResults));

          // Process matches by type
          const matchesByType = vectorResults.matches.reduce((acc: Record<string, VectorMatch[]>, match: VectorMatch) => {
            const type = match.metadata?.type;
            if (type) {
              if (!acc[type]) {
                acc[type] = [];
              }
              acc[type].push(match);
            }
            return acc;
          }, {});

          // Format relevant sections based on type
          if (matchesByType.skills) {
            relevantSkills = resumeData.skills;
          }

          if (matchesByType.experience) {
            relevantSections += `\nRelevant Experience:\n${matchesByType.experience
              .map(match => match.metadata?.text)
              .filter(Boolean)
              .join("\n\n")}`;
          }

          if (matchesByType.personal) {
            relevantSections += `\nPersonal Information:\n${matchesByType.personal
              .map(match => match.metadata?.text)
              .filter(Boolean)
              .join("\n\n")}`;
          }
        }
      } catch (error) {
        console.error("Vector search error:", error);
        // Fall back to using complete resume data
        relevantSkills = resumeData.skills;
        relevantSections += "\nExperience:";
        for (const exp of resumeData.experience) {
          relevantSections += `\n\nCompany: ${exp.company}\nRole: ${exp.role}\nYears: ${exp.years}\nDescription: ${exp.description}`;
        }
      }
    } else {
      // If vector search isn't available, use the entire resume
      relevantSkills = resumeData.skills;
      relevantSections += "\nExperience:";
      for (const exp of resumeData.experience) {
        relevantSections += `\n\nCompany: ${exp.company}\nRole: ${exp.role}\nYears: ${exp.years}\nDescription: ${exp.description}`;
      }
    }

    // Check if the query is about basic information like current employer
    const isBasicQuery = 
      prompt.toLowerCase().includes('work') || 
      prompt.toLowerCase().includes('experience') || 
      prompt.toLowerCase().includes('job') ||
      prompt.toLowerCase().includes('company') ||
      prompt.toLowerCase().includes('adobe') ||
      prompt.toLowerCase().includes('employer');

    // Generate response using Workers AI
    const response = await context.cloudflare.env.AI.run(
      "@cf/meta/llama-2-7b-chat-int8",
      {
        messages: [
          {
            role: "system",
            content: `You are a helpful AI assistant that answers questions about Blake Bauman's resume. 
            ${isBasicQuery ? 
              `Blake currently works at Adobe as a Principal Technical Architect (2022-Present).
               Blake previously worked at Adobe as a Technical Architect (2019-2022).
               Blake also worked at Lyons Consulting Group (Capgemini) as a Technical Architect (2019-2022).
              ` : ''}
            
            You have access to the following information:
            
            ${relevantSkills.length > 0 ? `Skills: ${relevantSkills.join(", ")}\n` : ''}
            ${relevantSections ? `\nRelevant Sections:\n${relevantSections}\n` : ''}
            
            IMPORTANT:
            1. Answer based on the information provided. If specific details aren't available, indicate that.
            2. DO NOT fabricate or hallucinate any details about employment history, dates, companies, or responsibilities.
            3. Keep responses concise, professional, and factual.
            4. Blake DOES work at Adobe as a Principal Technical Architect.`
          },
          { role: "user", content: prompt }
        ]
      }
    );

    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: response.response || "Sorry, I couldn't generate a response.",
            },
          },
        ],
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error generating AI response:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to generate AI response",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
