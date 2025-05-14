import { config } from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
config();

interface ResumeData {
  name: string;
  title: string;
  location: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  website: string;
  skills: string[];
  experience: Array<{
    company: string;
    role: string;
    years: string;
    description: string;
  }>;
}

async function populateVectorize() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set in .env file');
  }

  // Import resume data
  const resumeData = await import('../app/chat/resume.json') as ResumeData;

  // Create chunks of resume data
  const chunks = [
    {
      id: 'personal',
      text: `Name: ${resumeData.name}
Title: ${resumeData.title}
Location: ${resumeData.location}
Contact: ${resumeData.email} | ${resumeData.phone}
Links: LinkedIn: ${resumeData.linkedin} | GitHub: ${resumeData.github} | Website: ${resumeData.website}`,
      metadata: {
        type: 'personal',
        section: 'personal_info'
      }
    },
    {
      id: 'skills',
      text: `Skills: ${resumeData.skills.join(', ')}`,
      metadata: {
        type: 'skills',
        section: 'skills'
      }
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
        years: exp.years
      }
    }))
  ];

  // Create embeddings using the Cloudflare AI API
  const embeddings = await Promise.all(
    chunks.map(async (chunk) => {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/baai/bge-large-en-v1.5`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: chunk.text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate embedding: ${await response.text()}`);
      }

      const { result } = await response.json();
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
  const insertResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/indexes/resume-index/upsert`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      vectors: embeddings,
    }),
  });

  if (!insertResponse.ok) {
    throw new Error(`Failed to insert vectors: ${await insertResponse.text()}`);
  }

  console.log('Vectorize index population complete!');
}

// Run the script
populateVectorize().catch(console.error); 