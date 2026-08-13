import { describe, expect, it, vi } from 'vitest';
import type { Env, ResumeData, VectorMatch } from '../../types';
import {
  attributeSources,
  buildFullResumeContext,
  RETRIEVAL_CONFIG,
  searchResumeContext,
  selectMatches,
  toSources,
} from '../context';
import resumeJson from '../resume.json';

const resumeData = resumeJson as unknown as ResumeData;

/**
 * Every chunk type written by buildChunks has to be rendered by
 * searchResumeContext. Matches are grouped by `metadata.type` and then rendered
 * by looking up SECTION_LABELS, so a type missing from that table is retrieved
 * from Vectorize and then silently discarded.
 *
 * That is exactly what happened to `ai_context` and `recognition`: the whole
 * chat-only context layer was embedded, matched at the top of the results, and
 * never reached the model. The failure is invisible without a test like this,
 * because retrieval still "works" and the assistant just answers as if the
 * information does not exist.
 */
const INDEXED_TYPES = [
  'personal',
  'summary',
  'tools',
  'exploring',
  'projects',
  'experience',
  'recognition',
  'ai_context',
] as const;

// `skills` is written by the indexer but intentionally not rendered as a
// section: it is surfaced through relevantSkills instead. Asserted separately.
const RENDERED_SEPARATELY = ['skills'] as const;

interface MatchSpec {
  id: string;
  type: string;
  text: string;
  score?: number;
  title?: string;
  sourceId?: string;
  section?: string;
}

function rawMatch(spec: MatchSpec): VectorMatch {
  return {
    id: spec.id,
    score: spec.score ?? 0.9,
    metadata: {
      type: spec.type,
      section: spec.section ?? spec.type,
      text: spec.text,
      title: spec.title ?? spec.id,
      sourceId: spec.sourceId ?? spec.id,
    },
  } as VectorMatch;
}

function envReturning(matches: MatchSpec[]): Env {
  return {
    AI: { run: vi.fn().mockResolvedValue({ data: [[0.1, 0.2, 0.3]] }) },
    VECTORIZE: {
      query: vi.fn().mockResolvedValue({ matches: matches.map(rawMatch) }),
    },
  } as unknown as Env;
}

describe('searchResumeContext', () => {
  it('renders every indexed chunk type into the prompt context', async () => {
    const matches = INDEXED_TYPES.map(type => ({
      id: `${type}_0`,
      type,
      text: `MARKER_${type.toUpperCase()}`,
    }));

    const { relevantSections } = await searchResumeContext(
      envReturning(matches),
      'anything',
      resumeData
    );

    const dropped = INDEXED_TYPES.filter(
      t => !relevantSections.includes(`MARKER_${t.toUpperCase()}`)
    );
    expect(dropped, `chunk types retrieved but never rendered: ${dropped.join(', ')}`).toEqual([]);
  });

  it('surfaces the chat-only ai_context layer', async () => {
    const { relevantSections } = await searchResumeContext(
      envReturning([
        {
          id: 'ai_context_felix-harness',
          type: 'ai_context',
          text: 'Felix Memoturn Fold Skillist',
        },
      ]),
      'what agent infrastructure has he built',
      resumeData
    );

    expect(relevantSections).toContain('Felix Memoturn Fold Skillist');
  });

  it('exposes skills through relevantSkills rather than a section', async () => {
    const { relevantSkills } = await searchResumeContext(
      envReturning([{ id: 'skills', type: 'skills', text: 'irrelevant' }]),
      'what does he know',
      resumeData
    );

    expect(RENDERED_SEPARATELY).toContain('skills');
    expect(relevantSkills.length).toBeGreaterThan(0);
  });

  it('returns only the matched tool groups, not the whole skill list', async () => {
    const { relevantSkills } = await searchResumeContext(
      envReturning([
        {
          id: 'tools_native-desktop',
          type: 'tools',
          title: 'Tools and technologies — Native & Desktop',
          text: 'C++, JUCE, CMake, Tauri, DSP',
        },
      ]),
      'does he write c++',
      resumeData
    );

    expect(relevantSkills).toContain('JUCE');
    expect(relevantSkills.length).toBeLessThan(resumeData.skills.length);
  });

  it('reports the matches and sources that grounded the answer', async () => {
    const { matches, sources } = await searchResumeContext(
      envReturning([
        {
          id: 'project_felix',
          type: 'projects',
          title: 'Project: felix',
          sourceId: 'felix',
          text: 'a',
        },
        {
          id: 'project_felix_highlights_0',
          type: 'projects',
          title: 'Project: felix — what it does',
          sourceId: 'felix',
          text: 'b',
        },
      ]),
      'tell me about felix',
      resumeData
    );

    expect(matches).toHaveLength(2);
    // Both chunks describe the same project, so they cite as one source.
    expect(sources).toEqual([{ label: 'Projects', title: 'Project: felix' }]);
  });

  it('falls back to the full record when the vector query throws', async () => {
    const env = {
      AI: { run: vi.fn().mockResolvedValue({ data: [[0.1]] }) },
      VECTORIZE: { query: vi.fn().mockRejectedValue(new Error('index unavailable')) },
    } as unknown as Env;

    const { relevantSections } = await searchResumeContext(env, 'anything', resumeData, [
      'AI CONTEXT FALLBACK MARKER',
    ]);

    expect(relevantSections).toContain('Experience:');
    // The fallback previously omitted recognition and the ai-context layer, so
    // the same question got a different answer depending on Vectorize's health.
    expect(relevantSections).toContain('Recognition:');
    expect(relevantSections).toContain('AI CONTEXT FALLBACK MARKER');
  });
});

describe('selectMatches', () => {
  it('drops matches below the score floor', () => {
    const selected = selectMatches([
      rawMatch({ id: 'strong', type: 'projects', text: 'keep', score: 0.8 }),
      rawMatch({ id: 'weak', type: 'projects', text: 'drop', score: 0.05 }),
    ]);

    expect(selected.map(m => m.id)).toEqual(['strong']);
  });

  it('keeps the top matches when everything is below the floor', () => {
    // An empty context reads to the model as permission to invent, so a weak
    // best match still beats nothing.
    const weak = Array.from({ length: 6 }, (_, i) =>
      rawMatch({ id: `weak_${i}`, type: 'projects', text: 'x', score: 0.1 - i * 0.01 })
    );

    expect(selectMatches(weak)).toHaveLength(RETRIEVAL_CONFIG.alwaysKeepTop);
  });

  it('drops matches whose metadata does not validate', () => {
    // Mimics a vector left behind by an older schema. Before runtime validation
    // this flowed straight into the system prompt.
    const malformed = {
      id: 'bad',
      score: 0.9,
      metadata: { type: 'not_a_real_type', text: 'x' },
    } as unknown as VectorMatch;
    const good = rawMatch({ id: 'good', type: 'projects', text: 'y' });

    expect(selectMatches([malformed, good]).map(m => m.id)).toEqual(['good']);
  });

  it('deduplicates by id', () => {
    const match = rawMatch({ id: 'project_felix', type: 'projects', text: 'x' });
    expect(selectMatches([match, match])).toHaveLength(1);
  });

  it('stops filling once the character budget is exhausted', () => {
    const big = Array.from({ length: 10 }, (_, i) =>
      rawMatch({
        id: `big_${i}`,
        type: 'projects',
        text: 'x'.repeat(1000),
        score: 0.9 - i * 0.01,
      })
    );

    const selected = selectMatches(big);
    const total = selected.reduce((sum, m) => sum + m.text.length, 0);
    expect(total).toBeLessThanOrEqual(RETRIEVAL_CONFIG.maxContextChars);
    expect(selected.length).toBeLessThan(big.length);
  });

  it('returns matches in descending score order', () => {
    // Both above MIN_SCORE, so ordering is what is under test rather than the floor.
    const selected = selectMatches([
      rawMatch({ id: 'low', type: 'projects', text: 'a', score: 0.6 }),
      rawMatch({ id: 'high', type: 'projects', text: 'b', score: 0.95 }),
    ]);

    expect(selected.map(m => m.id)).toEqual(['high', 'low']);
  });

  it('uses a floor calibrated above the noise of unrelated queries', () => {
    // Measured against the live index: unrelated prompts top out around 0.54,
    // correct hits bottom out around 0.58. A match scoring like an unrelated
    // query must not reach the prompt.
    expect(RETRIEVAL_CONFIG.minScore).toBeGreaterThan(0.54);
    expect(RETRIEVAL_CONFIG.minScore).toBeLessThan(0.58);
  });
});

describe('toSources', () => {
  it('keeps titles that legitimately contain an em dash', () => {
    // Splitting on the first ' — ' turned "Tools and technologies — AI & Agents"
    // into a useless "Tools and technologies" chip.
    const matches = selectMatches([
      rawMatch({
        id: 'tools_ai-agents',
        type: 'tools',
        title: 'Tools and technologies — AI & Agents',
        sourceId: 'tools',
        text: 'a',
      }),
    ]);

    expect(toSources(matches)[0]?.title).toBe('Tools and technologies — AI & Agents');
  });

  it('caps the number of citations', () => {
    const matches = selectMatches(
      Array.from({ length: 10 }, (_, i) =>
        rawMatch({
          id: `project_${i}`,
          type: 'projects',
          title: `Project ${i}`,
          sourceId: `p${i}`,
          text: 'x',
          // All within the citation band, so the count cap is what binds.
          score: 0.9 - i * 0.002,
        })
      )
    );

    expect(toSources(matches).length).toBeLessThanOrEqual(4);
  });

  it('does not cite a match that merely cleared the floor', () => {
    // A fixed top-N cited the 4th-best chunk as confidently as the 1st even when
    // it scored far below and contributed nothing.
    const matches = selectMatches([
      rawMatch({
        id: 'strong',
        type: 'projects',
        title: 'Strong',
        sourceId: 'a',
        text: 'x',
        score: 0.88,
      }),
      rawMatch({
        id: 'close',
        type: 'projects',
        title: 'Close',
        sourceId: 'b',
        text: 'x',
        score: 0.86,
      }),
      rawMatch({
        id: 'marginal',
        type: 'personal',
        title: 'Marginal',
        sourceId: 'c',
        text: 'x',
        score: 0.57,
      }),
    ]);

    // All three still reach the model as context...
    expect(matches).toHaveLength(3);
    // ...but only the two that actually informed it are claimed as sources.
    expect(toSources(matches).map(s => s.title)).toEqual(['Strong', 'Close']);
  });

  it('collapses several chunks of one entity into a single citation', () => {
    const matches = selectMatches([
      rawMatch({
        id: 'experience_adobe_2022-present',
        type: 'experience',
        title: 'Principal Technical Architect at Adobe (2022–Present)',
        sourceId: 'adobe_2022-present',
        text: 'a',
      }),
      rawMatch({
        id: 'experience_adobe_2022-present_highlights_0',
        type: 'experience',
        title: 'Principal Technical Architect at Adobe (2022–Present) — accomplishments',
        sourceId: 'adobe_2022-present',
        text: 'b',
      }),
    ]);

    expect(toSources(matches)).toEqual([
      {
        label: 'Relevant Experience',
        title: 'Principal Technical Architect at Adobe (2022–Present)',
      },
    ]);
  });
});

describe('buildFullResumeContext', () => {
  it('includes project and experience highlights', () => {
    const { relevantSections } = buildFullResumeContext(resumeData);
    const firstHighlight = resumeData.experience[0]?.highlights?.[0];

    expect(firstHighlight).toBeTruthy();
    expect(relevantSections).toContain(firstHighlight as string);
  });
});

describe('attributeSources', () => {
  const employment = rawMatch({
    id: 'ai_context_career-arc',
    type: 'ai_context',
    title: 'Where Blake has worked',
    sourceId: 'career-arc',
    score: 0.61,
    text: 'Blake has worked at two companies. Lyons Consulting Group (Capgemini) from 2017 to 2019 as a Technical Architect. Adobe from 2019 to now.',
  });
  const contact = rawMatch({
    id: 'ai_context_faq-contact',
    type: 'ai_context',
    title: 'FAQ: how to get in touch with Blake',
    sourceId: 'faq-contact',
    score: 0.648,
    text: 'The links on this page are the way to reach Blake: email, LinkedIn, GitHub, and Bluesky.',
  });
  const frontend = rawMatch({
    id: 'ai_context_faq-frontend',
    type: 'ai_context',
    title: 'FAQ: does Blake do frontend work',
    sourceId: 'faq-frontend',
    score: 0.639,
    text: 'He works in React and React Router, TanStack Router, Tailwind CSS and shadcn/ui.',
  });

  // The exact failure this exists to fix: the answer is built from the
  // lowest-scoring chunk, while score-ordered citation credits the other two.
  const matches = selectMatches([contact, frontend, employment]);
  const answer =
    'Blake has worked at two companies: Lyons Consulting Group (Capgemini) from 2017 to 2019 as a Technical Architect, and Adobe from 2019 to now.';

  it('cites the chunk the answer was built from, not the highest scoring one', () => {
    expect(matches[0]?.id).toBe('ai_context_faq-contact');
    expect(attributeSources(matches, answer).map(s => s.title)).toEqual(['Where Blake has worked']);
  });

  it('score-ordered citation gets this wrong, which is why attribution exists', () => {
    expect(toSources(matches).map(s => s.title)).not.toContain('Where Blake has worked');
  });

  it('cites nothing when the answer grounds in nothing', () => {
    // Deliberately shares no distinctive vocabulary with any candidate. An
    // earlier version of this fixture said "try the contact links", which does
    // legitimately draw on the contact chunk — the logic was right and the
    // fixture was wrong.
    const refusal = 'That is not something the record covers.';
    expect(attributeSources(matches, refusal)).toEqual([]);
  });

  it('cites nothing for an empty answer or no matches', () => {
    expect(attributeSources(matches, '   ')).toEqual([]);
    expect(attributeSources([], answer)).toEqual([]);
  });

  it('ignores vocabulary shared across every candidate', () => {
    // "Blake" appears in all three, so an answer that only says his name
    // attributes to nothing rather than to whichever chunk happens to rank first.
    expect(attributeSources(matches, 'Blake. Blake. Blake.')).toEqual([]);
  });

  it('can cite several chunks when the answer genuinely draws on several', () => {
    const combined =
      'He works in React and Tailwind CSS, and has worked at Lyons Consulting Group and Adobe.';
    const titles = attributeSources(matches, combined).map(s => s.title);
    expect(titles).toContain('Where Blake has worked');
    expect(titles).toContain('FAQ: does Blake do frontend work');
  });

  it('collapses several chunks of one entity into a single citation', () => {
    const parent = rawMatch({
      id: 'project_felix',
      type: 'projects',
      title: 'Project: felix',
      sourceId: 'felix',
      text: 'Felix is a manifest-driven agents harness on Cloudflare Workers.',
    });
    const child = rawMatch({
      id: 'project_felix_highlights_0',
      type: 'projects',
      title: 'Project: felix — what it does',
      sourceId: 'felix',
      text: 'Felix compiles a manifest into a runnable agent harness.',
    });
    const sources = attributeSources(
      selectMatches([parent, child]),
      'Felix is a manifest harness.'
    );
    expect(sources).toHaveLength(1);
    expect(sources[0]?.title).toBe('Project: felix');
  });
});

describe('attributeSources absolute floor', () => {
  const a = rawMatch({
    id: 'ai_context_scope-metrics-and-scale',
    type: 'ai_context',
    title: 'Scope: what this record does not quantify',
    sourceId: 'scope-metrics',
    text: 'This record is qualitative and contains no traffic figures, revenue impact, team sizes or latency benchmarks.',
  });
  const b = rawMatch({
    id: 'ai_context_faq-awards-and-recognition',
    type: 'ai_context',
    title: 'FAQ: awards, recognition, and public speaking',
    sourceId: 'faq-awards',
    text: 'One competitive award is on this record: second place at the Adobe AI Summit and Hackathon in 2025.',
  });

  it('does not cite a chunk on one incidental word', () => {
    // Relative share alone let this through: on a short answer every score is
    // near zero, and 30% of almost-nothing still qualifies.
    const matches = selectMatches([a, b]);
    const thin = 'This record does not include that.';
    expect(attributeSources(matches, thin)).toEqual([]);
  });

  it('still cites when the answer genuinely uses distinctive content', () => {
    const matches = selectMatches([a, b]);
    const grounded =
      'The record contains no traffic figures, revenue impact, or latency benchmarks.';
    expect(attributeSources(matches, grounded).map(s => s.title)).toEqual([
      'Scope: what this record does not quantify',
    ]);
  });
});
