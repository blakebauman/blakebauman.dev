import { describe, expect, it } from 'vitest';
import { ChunkMetadataSchema, ResumeDataSchema, VectorMatchSchema } from '../resume';

describe('ResumeDataSchema', () => {
  const validResumeData = {
    name: 'John Doe',
    title: 'Software Engineer',
    location: 'San Francisco, CA',
    email: 'john@example.com',
    phone: '555-1234',
    linkedin: 'https://linkedin.com/in/johndoe',
    github: 'https://github.com/johndoe',
    website: 'https://johndoe.dev',
    skills: ['JavaScript', 'TypeScript', 'React'],
    tools: ['VS Code', 'Git'],
    exploring: ['Rust', 'Go'],
    projects: [
      {
        name: 'My Project',
        description: 'A cool project',
        tech: ['React', 'Node.js'],
        github: 'https://github.com/johndoe/project',
      },
    ],
    experience: [
      {
        company: 'Acme Inc',
        role: 'Senior Engineer',
        years: '2020-Present',
        description: 'Building awesome stuff',
      },
    ],
    summary: ['Professional summary paragraph one.', 'Professional summary paragraph two.'],
    blockquote: { text: 'I learn {word} quickly.', highlight: 'things' },
    sections: {
      tools: 'Tools intro text.',
      exploring: 'Exploring intro text.',
      projects: 'Projects intro text.',
      contact: 'Contact intro text.',
    },
  };

  it('validates complete resume data', () => {
    const result = ResumeDataSchema.safeParse(validResumeData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('John Doe');
      expect(result.data.skills).toContain('TypeScript');
    }
  });

  it('rejects missing required fields', () => {
    const invalidData = { ...validResumeData };
    delete (invalidData as Record<string, unknown>).name;

    const result = ResumeDataSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('rejects invalid skills type', () => {
    const invalidData = {
      ...validResumeData,
      skills: 'JavaScript', // Should be array
    };

    const result = ResumeDataSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('validates with empty arrays', () => {
    const dataWithEmptyArrays = {
      ...validResumeData,
      skills: [],
      tools: [],
      exploring: [],
      projects: [],
      experience: [],
    };

    const result = ResumeDataSchema.safeParse(dataWithEmptyArrays);
    expect(result.success).toBe(true);
  });

  it('validates multiple experience entries', () => {
    const dataWithMultipleExp = {
      ...validResumeData,
      experience: [
        {
          company: 'Company A',
          role: 'Engineer',
          years: '2020-2022',
          description: 'Did stuff',
        },
        {
          company: 'Company B',
          role: 'Senior Engineer',
          years: '2022-Present',
          description: 'Did more stuff',
        },
      ],
    };

    const result = ResumeDataSchema.safeParse(dataWithMultipleExp);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.experience).toHaveLength(2);
    }
  });

  it('rejects invalid experience entry', () => {
    const invalidData = {
      ...validResumeData,
      experience: [
        {
          company: 'Acme Inc',
          // Missing role, years, description
        },
      ],
    };

    const result = ResumeDataSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('ChunkMetadataSchema', () => {
  it('validates personal type metadata', () => {
    const result = ChunkMetadataSchema.safeParse({
      type: 'personal',
      section: 'personal_info',
      text: 'Name: John Doe',
    });
    expect(result.success).toBe(true);
  });

  it('validates experience type metadata with optional fields', () => {
    const result = ChunkMetadataSchema.safeParse({
      type: 'experience',
      section: 'work_experience',
      text: 'Worked at Acme',
      company: 'Acme Inc',
      role: 'Engineer',
      years: '2020-Present',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.company).toBe('Acme Inc');
    }
  });

  it('validates all valid types', () => {
    const types = [
      'personal',
      'skills',
      'experience',
      'tools',
      'exploring',
      'projects',
      'summary',
    ] as const;

    for (const type of types) {
      const result = ChunkMetadataSchema.safeParse({
        type,
        section: 'test',
        text: 'test text',
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid type', () => {
    const result = ChunkMetadataSchema.safeParse({
      type: 'invalid',
      section: 'test',
      text: 'test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const result = ChunkMetadataSchema.safeParse({
      type: 'skills',
      // Missing section and text
    });
    expect(result.success).toBe(false);
  });
});

describe('VectorMatchSchema', () => {
  it('validates a vector match with metadata', () => {
    const result = VectorMatchSchema.safeParse({
      id: 'skills',
      score: 0.95,
      metadata: {
        type: 'skills',
        section: 'skills',
        text: 'JavaScript, TypeScript',
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.score).toBe(0.95);
      expect(result.data.metadata?.type).toBe('skills');
    }
  });

  it('validates a vector match without metadata', () => {
    const result = VectorMatchSchema.safeParse({
      id: 'experience_0',
      score: 0.8,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.metadata).toBeUndefined();
    }
  });

  it('rejects missing id', () => {
    const result = VectorMatchSchema.safeParse({
      score: 0.9,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid score type', () => {
    const result = VectorMatchSchema.safeParse({
      id: 'test',
      score: 'high', // Should be number
    });
    expect(result.success).toBe(false);
  });
});
