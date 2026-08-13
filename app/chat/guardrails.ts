/**
 * Topic guardrails for the AI chatbot.
 *
 * Runs before any model call, so a refusal costs nothing. Three properties
 * matter here and each one was a gap in the previous version:
 *
 * 1. Everything is matched against a *normalized* string. Patterns used to run
 *    against the raw prompt while keywords ran against a lowercased copy, so a
 *    zero-width space or a fullwidth character defeated the jailbreak patterns
 *    while the keyword list still waved the prompt through.
 * 2. Short prompts are not automatically allowed. They were, unconditionally,
 *    which meant anything under 30 characters skipped every check.
 * 3. The on-topic vocabulary is derived from the content, so adding a project
 *    or an ai-context entry teaches the guardrail about it automatically.
 */

import { normalizeForMatch, wordBoundaryPattern } from '../lib/text';
import { aiContext, resumeData } from './data';

/**
 * Words that must never become on-topic signals, no matter what a content file
 * says. Deriving vocabulary from data means a careless topic tag can widen the
 * guardrail — a single `"why"` in an ai-context entry's topics was enough to
 * make "why do manifolds matter in engines" read as on-topic. Filtering at the
 * point of derivation keeps that a content typo instead of a guardrail hole.
 *
 * Deliberately not a general English stopword list: short technical terms like
 * "mcp", "aem" and "a2a" are exactly the signals this vocabulary exists to
 * carry, so length alone cannot be the filter.
 */
const VOCABULARY_STOPWORDS = new Set([
  // Interrogatives and function words
  'why',
  'how',
  'what',
  'who',
  'when',
  'where',
  'which',
  'the',
  'and',
  'for',
  'not',
  'but',
  'all',
  'any',
  'can',
  'does',
  'did',
  'was',
  'are',
  'you',
  'from',
  'with',
  'this',
  'that',
  'into',
  'over',
  'about',
  'more',
  'most',
  'than',
  'then',
  'now',
  'new',
  'one',
  'two',
  'use',
  'used',
  'using',
  'has',
  'have',
  'will',
  'only',
  'very',
  'just',
  'also',
  'both',
  'each',
  'many',
  'much',
  'other',
  'some',
  'such',
  // Generic nouns and adjectives that appear in unrelated questions
  'work',
  'works',
  'design',
  'scale',
  'history',
  'team',
  'lead',
  'limits',
  'numbers',
  'personal',
  'status',
  'unknown',
  'current',
  'recent',
  'latest',
  'complex',
  'difficult',
  'challenge',
  'proud',
  'platform',
  'choice',
  'best',
  'good',
  'hardest',
  'boundaries',
  'iteration',
]);

/**
 * On-topic vocabulary derived from the record itself: project names and their
 * aliases, company names, roles, and every topic tag on the ai-context entries.
 * The hardcoded list below covers the question-shaped words that no data file
 * would ever contain.
 */
function buildDerivedVocabulary(): string[] {
  const terms = new Set<string>();

  const add = (value: string) => {
    const normalized = normalizeForMatch(value);
    // Two characters is too short to be a useful signal and matches noise.
    if (normalized.length < 3) return;
    // Multi-word phrases are self-disambiguating; only single words need the filter.
    if (!normalized.includes(' ') && VOCABULARY_STOPWORDS.has(normalized)) return;
    terms.add(normalized);
  };

  for (const project of resumeData.projects) {
    add(project.name);
    // "nomoji.dev" should also match a bare "nomoji".
    const base = project.name.split(/[-.]/)[0];
    if (base && base.length >= 4) add(base);
    for (const alias of project.aliases ?? []) add(alias);
  }

  for (const exp of resumeData.experience) {
    add(exp.company);
    add(exp.role);
    // "Lyons Consulting Group (Capgemini)" should match a bare "Capgemini".
    for (const word of exp.company.split(/[\s()]+/)) {
      if (word.length >= 5) add(word);
    }
  }

  for (const item of aiContext.context) {
    for (const topic of item.topics) add(topic);
    for (const alias of item.aliases ?? []) add(alias);
  }

  return [...terms];
}

// Question-shaped and relational words that describe the *subject* rather than
// naming it. These cannot be derived from the record.
//
// Precision matters more than it looks. A bare "work" or "works" seems obviously
// on-topic until "explain how scaffolding works in construction" matches it, so
// the generic verbs appear only as multi-word phrases, where the preposition
// carries the meaning. Nouns that are already specific to a professional record
// ("resume", "expertise") are safe on their own.
const CORE_KEYWORDS = [
  // Subject
  'blake',
  'bauman',
  'he',
  'his',
  'him',
  // Record nouns
  'experience',
  'career',
  'role',
  'position',
  'background',
  'skill',
  'skills',
  'expertise',
  'tech stack',
  'project',
  'projects',
  'portfolio',
  'resume',
  'cv',
  'qualification',
  'employer',
  'job',
  // Generic verbs, only in phrases that fix their meaning
  'work on',
  'work at',
  'work with',
  'works on',
  'works at',
  'works with',
  'worked on',
  'worked at',
  'worked with',
  'worked for',
  'working on',
  'working with',
  'work history',
  'work experience',
  'has built',
  'has created',
  'built',
  'created',
  // Professions
  'architect',
  'developer',
  'engineer',
  'engineering',
  // Contact and availability
  'contact',
  'hire',
  'hiring',
  'availability',
  // Interests
  'exploring',
  'interest',
  'strength',
  'strengths',
  // Links and source
  'github',
  'linkedin',
  'repo',
  'repository',
  'repositories',
  'open source',
];

const ON_TOPIC_PATTERNS = [...new Set([...CORE_KEYWORDS, ...buildDerivedVocabulary()])].map(
  wordBoundaryPattern
);

// Patterns indicating a jailbreak attempt or a clearly unrelated request.
// Matched against the normalized prompt, so spacing and case are already
// canonical by the time these run.
const OFF_TOPIC_PATTERNS = [
  // Instruction-override attempts
  /ignore\s+(all\s+|any\s+)?(previous|prior|above|earlier|the)\s+(instruction|rule|prompt|direction)/,
  /forget\s+(all\s+|any\s+)?(previous|prior|your|the)\s+(instruction|rule|prompt|direction)/,
  /disregard\s+(all\s+|any\s+)?(previous|prior|above|earlier|the)/,
  /override\s+(your|the|all)\s+(instruction|rule|prompt|system)/,
  /(reveal|show|print|repeat|output|display)\s+(me\s+)?(your|the)\s+(system\s+)?(prompt|instruction|rule)/,
  /what\s+(are|were)\s+your\s+(original\s+)?(instruction|rule|prompt)/,
  /pretend\s+(you\s+are|to\s+be|you're)/,
  /act\s+as\s+(if|a|an|though)/,
  /you\s+are\s+now\s+/,
  /new\s+persona/,
  /roleplay\s+as/,
  /dan\s+mode/,
  /developer\s+mode/,
  /jailbreak/,
  // Attempts to smuggle instructions through the retrieved-context fence
  /<\/?\s*(context|system|instruction)\s*>/,
  // Clearly unrelated requests
  /write\s+(me\s+)?(a\s+)?(code|script|program|essay|story|poem|song)/,
  /help\s+(me\s+)?(with\s+)?(my\s+)?(homework|assignment|test|exam)/,
  /what\s+is\s+the\s+(capital|population|weather|time|date)/,
  /how\s+do\s+i\s+(cook|make|build|fix|install)\s/,
  /tell\s+me\s+a\s+(joke|story|poem)/,
  /what\s+do\s+you\s+think\s+about/,
  /your\s+opinion\s+on/,
];

export const REDIRECT_MESSAGE =
  "I'm Blake's professional assistant and can only answer questions about his work experience, skills, and projects. Is there something about Blake's background I can help you with?";

export interface GuardrailInput {
  prompt: string;
  /** Prior turns, used only to decide whether a short prompt is a real follow-up. */
  conversationHistory?: Array<{ role: string; content: string }>;
}

function isOffTopicPattern(text: string): boolean {
  return OFF_TOPIC_PATTERNS.some(pattern => pattern.test(text));
}

function hasOnTopicTerm(text: string): boolean {
  return ON_TOPIC_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Check if a prompt is on-topic for Blake's professional background.
 *
 * @returns redirect message if off-topic, null if it should proceed to the LLM
 */
export function checkTopicRelevance(
  input: string | GuardrailInput,
  historyArg?: Array<{ role: string; content: string }>
): string | null {
  const { prompt, conversationHistory } =
    typeof input === 'string'
      ? { prompt: input, conversationHistory: historyArg ?? [] }
      : { prompt: input.prompt, conversationHistory: input.conversationHistory ?? [] };

  const normalized = normalizeForMatch(prompt);

  // Refuse instruction-override attempts first, and check the recent history
  // too: an injection split across turns ("remember this rule for later" then
  // "now apply it") never has both halves in the current prompt.
  if (isOffTopicPattern(normalized)) {
    return REDIRECT_MESSAGE;
  }
  for (const message of conversationHistory.slice(-2)) {
    if (message.role === 'user' && isOffTopicPattern(normalizeForMatch(message.content))) {
      return REDIRECT_MESSAGE;
    }
  }

  if (hasOnTopicTerm(normalized)) {
    return null;
  }

  // Genuine follow-ups ("tell me more", "what about that one?") carry no
  // subject of their own — they inherit it from the previous turn. That is only
  // true when there *is* a previous turn: the old unconditional length check
  // let any short prompt through as the opening message.
  const isShortFollowUp = normalized.length < 30 && conversationHistory.length > 0;
  if (isShortFollowUp) {
    return null;
  }

  return REDIRECT_MESSAGE;
}

/**
 * Cheap check on what the model produced. Does not block — a false positive
 * would break a legitimate answer — but flags the response so leakage attempts
 * are visible in the logs.
 */
export function detectResponseLeakage(response: string): boolean {
  const normalized = normalizeForMatch(response);
  return (
    /<\/?\s*(context|conversation)\s*>/.test(normalized) ||
    normalized.includes('you are blake bauman') ||
    normalized.includes('grounding rules')
  );
}
