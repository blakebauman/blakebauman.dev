import { config } from 'dotenv';
import type { ResumeData } from '../app/types';

// Load environment variables
config();

async function populateVectorize() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set in .env file');
  }

  // Import resume data (JSON modules export as default)
  const { default: resumeData } = (await import('../app/chat/resume.json')) as {
    default: ResumeData;
  };

  // Create chunks of resume data
  const chunks = [
    {
      id: 'personal',
      text: `Name: ${resumeData.name}
Title: ${resumeData.title}
Location: ${resumeData.location}
Contact: ${resumeData.email}${resumeData.phone ? ` | ${resumeData.phone}` : ''}
Links: LinkedIn: ${resumeData.linkedin} | GitHub: ${resumeData.github} | Website: ${resumeData.website}`,
      metadata: {
        type: 'personal',
        section: 'personal_info',
      },
    },
    {
      id: 'skills',
      text: `Skills: ${resumeData.skills.join(', ')}`,
      metadata: {
        type: 'skills',
        section: 'skills',
      },
    },
    ...resumeData.experience.map((exp, index) => ({
      id: `experience_${index}`,
      text: `Company: ${exp.company}
Role: ${exp.role}
Years: ${exp.years}
Description: ${exp.description}`,
      metadata: {
        type: 'experience',
        section: 'work_experience',
        company: exp.company,
        role: exp.role,
        years: exp.years,
      },
    })),
  ];

  // Create embeddings using the Cloudflare AI API
  const embeddings = await Promise.all(
    chunks.map(async chunk => {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/baai/bge-large-en-v1.5`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: chunk.text,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to generate embedding: ${await response.text()}`);
      }

      const json = (await response.json()) as { result?: { data?: number[][] } };
      const result = json.result;
      if (!result?.data?.[0]) {
        throw new Error('Invalid embedding response');
      }
      return {
        id: chunk.id,
        values: result.data[0],
        metadata: {
          ...chunk.metadata,
          text: chunk.text,
        },
      };
    })
  );

  // Insert vectors into Vectorize
  const insertResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/indexes/resume-index/upsert`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vectors: embeddings,
      }),
    }
  );

  if (!insertResponse.ok) {
    throw new Error(`Failed to insert vectors: ${await insertResponse.text()}`);
  }

  console.log('Vectorize index population complete!');
}

// Run the script
populateVectorize().catch(console.error);
