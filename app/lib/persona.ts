/**
 * Deterministic, signal-aware personalization (no LLM).
 *
 * Single source of truth for "client signal -> presentation". Pure functions only,
 * so the same inputs produce the same output on the server (SSR) and the client
 * (hydration) — no hydration mismatch, no flash. Everything keys off coarse buckets
 * derived from plain request headers, and every unknown/`direct` case falls back to
 * the canonical content.
 */

export type ReferrerSource = 'github' | 'linkedin' | 'social' | 'search' | 'direct';

export interface Persona {
  referrer: ReferrerSource;
  device: 'mobile' | 'desktop';
  returning: boolean;
}

interface ProjectLike {
  tech: string[];
}

// Canonical chatbot seed (mirrors the hardcoded defaults in chatbot.tsx / chatbot-ui.tsx).
export const DEFAULT_CHAT_GREETING =
  "I read Blake's record. Ask me what he's worked on, where, and with what.";

// Shown to visitors who've been here before (bb_seen cookie) but are opening a fresh
// chat session: a quiet acknowledgement, not a gimmick.
export const RETURNING_CHAT_GREETING =
  "Back again. Ask me anything on Blake's record, or pick up where you left off.";

export const DEFAULT_SUGGESTED_PROMPTS = [
  'What is he building with agentic AI at Adobe?',
  'Has he worked with Cloudflare?',
  'What is the most recent project on the record?',
  'What did he ship at Lyons?',
];

// --- Signal -> presentation tables (small + top-of-file so they're easy to tune) ---

/**
 * Lowercased tech keywords to front-load per referrer. A project's score is the count
 * of its tech tags that contain any of these substrings; scoring then stable-sorts, so
 * unmatched projects keep their canonical order.
 */
const REFERRER_TECH_BOOST: Partial<Record<ReferrerSource, string[]>> = {
  // Engineers from GitHub: hands-on, edge, OSS-flavored work first.
  github: [
    'cloudflare',
    'workers',
    'durable',
    'hono',
    'react',
    'typescript',
    'websockets',
    'cli',
    'c++',
    'dsp',
    'vectorize',
    'rag',
  ],
  // Recruiters/leaders from LinkedIn: enterprise scale, cloud, AI/architecture first.
  linkedin: [
    'aws',
    'bedrock',
    'agentcore',
    'terraform',
    'langchain',
    'langgraph',
    'mcp',
    'claude api',
    'postgresql',
    'dynamodb',
    'cdk',
  ],
};

const REFERRER_GREETING: Partial<Record<ReferrerSource, string>> = {
  github:
    "I read Blake's record. Ask about the code: the edge stack, the agents, what's on GitHub.",
  linkedin:
    "I read Blake's record. Ask about his roles, enterprise architecture work, and what he's shipped.",
};

const REFERRER_PROMPTS: Partial<Record<ReferrerSource, string[]>> = {
  github: [
    'What has Blake built on Cloudflare Workers?',
    'Tell me about his AI agent projects.',
    'What is the most recent project on the record?',
    'Which projects use Durable Objects?',
  ],
  linkedin: [
    'What is he building with agentic AI at Adobe?',
    'Summarize his architecture experience.',
    'What enterprise systems has he led?',
    'What did he ship at Lyons?',
  ],
};

// --- Derivation ---

function bucketReferrer(referer: string | null): ReferrerSource {
  if (!referer) return 'direct';
  let host: string;
  try {
    host = new URL(referer).hostname.toLowerCase();
  } catch {
    return 'direct';
  }

  if (host.includes('github')) return 'github';
  if (host.includes('linkedin') || host.includes('lnkd.in')) return 'linkedin';
  if (
    host.includes('twitter') ||
    host.includes('t.co') ||
    host.includes('x.com') ||
    host.includes('bsky') ||
    host.includes('bluesky') ||
    host.includes('facebook') ||
    host.includes('mastodon') ||
    host.includes('reddit')
  ) {
    return 'social';
  }
  if (
    host.includes('google') ||
    host.includes('bing') ||
    host.includes('duckduckgo') ||
    host.includes('ecosia') ||
    host.includes('search')
  ) {
    return 'search';
  }
  return 'direct';
}

function bucketDevice(userAgent: string | null): 'mobile' | 'desktop' {
  if (!userAgent) return 'desktop';
  return /mobile|android|iphone|ipod|ipad|iemobile|blackberry|opera mini/i.test(userAgent)
    ? 'mobile'
    : 'desktop';
}

function hasSeenCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  return /(?:^|;\s*)bb_seen=1(?:;|$)/.test(cookieHeader);
}

export function derivePersona(request: Request): Persona {
  const headers = request.headers;
  return {
    referrer: bucketReferrer(headers.get('Referer')),
    device: bucketDevice(headers.get('User-Agent')),
    returning: hasSeenCookie(headers.get('Cookie')),
  };
}

// --- Presentation ---

/**
 * Stable reorder of projects by tech-keyword score for the persona's referrer.
 * Returns a new array containing exactly the same projects (a permutation) — never
 * drops or duplicates. `direct`/unknown referrers return the input order unchanged.
 */
export function orderProjects<T extends ProjectLike>(projects: T[], persona: Persona): T[] {
  const boost = REFERRER_TECH_BOOST[persona.referrer];
  if (!boost || boost.length === 0) return projects;

  const score = (project: T): number => {
    const tech = project.tech.map(t => t.toLowerCase());
    return tech.reduce(
      (sum, tag) => sum + (boost.some(keyword => tag.includes(keyword)) ? 1 : 0),
      0
    );
  };

  // Decorate-sort-undecorate to keep the sort stable across runtimes.
  return projects
    .map((project, index) => ({ project, index, score: score(project) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(entry => entry.project);
}

export function chatGreetingFor(persona: Persona): string {
  // A returning visitor opening a fresh session gets a warm acknowledgement; the
  // referrer-tailored greeting takes over for first-time visitors.
  if (persona.returning) return RETURNING_CHAT_GREETING;
  return REFERRER_GREETING[persona.referrer] ?? DEFAULT_CHAT_GREETING;
}

export function suggestedPromptsFor(persona: Persona): string[] {
  return REFERRER_PROMPTS[persona.referrer] ?? DEFAULT_SUGGESTED_PROMPTS;
}
