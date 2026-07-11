/**
 * Topic guardrails for the AI chatbot
 * Ensures conversations stay focused on Blake Bauman's professional background
 */

import resumeData from './resume.json';

// Project names from the resume, matched on word boundaries so short names
// like "fold" don't match inside unrelated words ("scaffold", "manifold").
// Derived from resume.json so new projects are recognized without touching this file.
const PROJECT_NAME_PATTERNS = resumeData.projects.flatMap(project => {
  const name = project.name.toLowerCase();
  const base = name.split(/[-.]/)[0] ?? name;
  const variants = new Set([name, name.replace(/[-.]/g, ' ')]);
  if (base.length >= 4) {
    variants.add(base);
  }
  return [...variants].map(
    variant => new RegExp(`\\b${variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
  );
});

// Keywords strongly indicating on-topic questions about Blake
// Keep this list focused - avoid generic words that appear in off-topic prompts
const ON_TOPIC_KEYWORDS = [
  // Name (most reliable indicator)
  'blake',
  'bauman',
  // Professional context
  'experience',
  'career',
  'role',
  'position',
  'background',
  'skill',
  'skills',
  'stack',
  'expertise',
  'project',
  'projects',
  'portfolio',
  'built',
  'created',
  // Companies Blake worked at
  'adobe',
  'capgemini',
  'lyons',
  'architect',
  'developer',
  'engineer',
  // Resume/contact
  'resume',
  'cv',
  'qualification',
  'contact',
  'hire',
  'hiring',
  // Blake-specific tech (more specific terms)
  'cloudflare worker',
  'edge delivery',
  'aem',
  'magento',
  'commerce',
  // Interest/exploration
  'exploring',
  'learning',
  'interest',
  // Pronouns clearly referring to Blake (he/him/his)
  ' he ',
  ' his ',
  ' him ',
];

// Patterns indicating jailbreak or clearly off-topic requests
const OFF_TOPIC_PATTERNS = [
  // Jailbreak attempts
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /forget\s+(all\s+)?(previous|prior|your)\s+instructions?/i,
  /disregard\s+(all\s+)?(previous|prior)/i,
  /pretend\s+(you\s+are|to\s+be|you're)/i,
  /act\s+as\s+(if|a|an)/i,
  /you\s+are\s+now\s+/i,
  /new\s+persona/i,
  /roleplay\s+as/i,
  /dan\s+mode/i,
  /jailbreak/i,
  // Clearly unrelated requests
  /write\s+(me\s+)?(a\s+)?(code|script|program|essay|story)/i,
  /help\s+(me\s+)?(with\s+)?(my\s+)?(homework|assignment|test)/i,
  /what\s+is\s+the\s+(capital|population|weather)/i,
  /how\s+do\s+i\s+(cook|make|build|fix)\s/i,
  /tell\s+me\s+a\s+(joke|story)/i,
  /what\s+do\s+you\s+think\s+about/i,
  /your\s+opinion\s+on/i,
];

export const REDIRECT_MESSAGE =
  "I'm Blake's professional assistant and can only answer questions about his work experience, skills, and projects. Is there something about Blake's background I can help you with?";

/**
 * Check if a prompt is on-topic for Blake's professional background
 * @returns redirect message if off-topic, null if should proceed to LLM
 */
export function checkTopicRelevance(prompt: string): string | null {
  const lowerPrompt = prompt.toLowerCase();

  // Check for jailbreak/off-topic patterns first
  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(prompt)) {
      return REDIRECT_MESSAGE;
    }
  }

  // Check for on-topic keywords
  const hasOnTopicKeyword = ON_TOPIC_KEYWORDS.some(keyword =>
    lowerPrompt.includes(keyword.toLowerCase())
  );

  if (hasOnTopicKeyword) {
    return null;
  }

  // Check for project names from the resume (e.g. "What is Fold?")
  if (PROJECT_NAME_PATTERNS.some(pattern => pattern.test(lowerPrompt))) {
    return null;
  }

  // Allow short prompts (likely follow-ups like "tell me more")
  if (prompt.length < 30) {
    return null;
  }

  // Longer prompts without relevant keywords are likely off-topic
  return REDIRECT_MESSAGE;
}
