/**
 * Golden-set retrieval eval.
 *
 * Retrieval quality was previously unmeasurable: topK with no score floor over
 * a small index always returns its full quota, so every query "succeeds"
 * whether or not anything relevant came back. This script makes that visible.
 *
 * It runs against a deployed instance, because Vectorize has no local
 * implementation (the same constraint documented in CLAUDE.md). It needs the
 * debug retrieval endpoint, which is gated behind VECTORIZE_ADMIN_KEY.
 *
 *   VECTORIZE_ADMIN_KEY=... pnpm run vectorize:eval
 *   EVAL_BASE_URL=https://staging.example.dev pnpm run vectorize:eval
 *
 * Reports recall@k, MRR, and the score distribution — the distribution is what
 * MIN_SCORE in app/chat/context.ts should be tuned against, rather than guessed.
 */

interface GoldenCase {
  question: string;
  /** Chunk id prefixes that would be a correct retrieval for this question. */
  expect: string[];
}

// Questions a real visitor asks, mapped to the chunks that should answer them.
// Prefixes rather than exact ids, so a question satisfied by either a project's
// main chunk or one of its highlight chunks counts as a hit.
const GOLDEN_SET: GoldenCase[] = [
  // Current work and role
  {
    question: 'What is Blake working on right now?',
    expect: ['ai_context_faq-current-work', 'ai_context_adobe'],
  },
  {
    question: 'What does he do at Adobe?',
    expect: ['experience_adobe_2022', 'ai_context_adobe-role-scope'],
  },
  { question: 'What is CX Enterprise Coworker?', expect: ['ai_context_adobe-cx-coworker'] },
  {
    question: 'Explain Adobe Experience Platform Agent Orchestrator',
    expect: ['ai_context_adobe-agent-orchestrator'],
  },
  {
    question: 'Has he contributed to Adobe product code or just client work?',
    expect: ['ai_context_adobe-role-scope'],
  },

  // The agent infrastructure
  { question: 'What is Felix?', expect: ['project_felix', 'ai_context_felix-harness'] },
  {
    question: 'How does Felix handle tool calls?',
    expect: ['project_felix', 'ai_context_felix-harness'],
  },
  {
    question: 'What orchestration patterns does he support?',
    expect: ['project_felix', 'ai_context_felix-harness'],
  },
  { question: 'What is Fold?', expect: ['project_fold', 'ai_context_fold-gateway'] },
  {
    question: 'Tell me about the MCP gateway',
    expect: ['project_fold', 'ai_context_fold-gateway'],
  },
  {
    question: 'How do agents get credentials without holding API keys?',
    expect: ['project_fold', 'ai_context_fold-gateway'],
  },
  { question: 'What is Memoturn?', expect: ['project_memoturn', 'ai_context_memoturn-platform'] },
  {
    question: 'Does he have experience with LLM evals?',
    expect: ['project_memoturn', 'ai_context_memoturn-platform'],
  },
  { question: 'What is Skillist?', expect: ['project_skillist', 'ai_context_skillist-registry'] },
  {
    question: 'Why did he build four separate agent projects?',
    expect: ['ai_context_agent-infra-thesis'],
  },

  // Projects added from the GitHub record
  {
    question: 'Tell me about edgevault',
    expect: ['project_edgevault', 'ai_context_edgevault-platform'],
  },
  {
    question: 'Has he built a feature flag system?',
    expect: ['project_edgevault', 'ai_context_edgevault-platform'],
  },
  {
    question: 'What is contentworker?',
    expect: ['project_contentworker', 'ai_context_contentworker-cms'],
  },
  {
    question: 'Does he know hexagonal architecture?',
    expect: ['project_contentworker', 'ai_context_contentworker-cms'],
  },
  {
    question: 'What is memoturn-db?',
    expect: ['project_memoturn-db', 'ai_context_memoturn-db-engine'],
  },
  {
    question: 'What does prompton do?',
    expect: ['project_prompton', 'ai_context_prompton-client'],
  },
  {
    question: 'Tell me about deckhand',
    expect: ['project_deckhand', 'ai_context_deckhand-desktop'],
  },
  {
    question: 'What is the timetracker app?',
    expect: ['project_timetracker-app', 'ai_context_timetracker-product'],
  },
  {
    question: 'Has he built anything with passkeys?',
    expect: [
      'project_timetracker-app',
      'ai_context_timetracker-product',
      'ai_context_auth-and-security',
    ],
  },
  {
    question: 'What authentication has he built?',
    expect: ['ai_context_auth-and-security', 'project_edgevault', 'project_timetracker-app'],
  },
  {
    question: 'How does he handle secrets and credentials?',
    expect: ['ai_context_auth-and-security', 'project_edgevault', 'project_fold'],
  },
  { question: 'What is offpavement-shop?', expect: ['project_offpavement-shop'] },
  {
    question: 'How does this website chatbot work?',
    expect: ['project_blakebauman-dev', 'ai_context_this-site-architecture'],
  },

  // Languages and stack
  {
    question: 'Has he written any Rust?',
    expect: ['ai_context_language-breadth', 'project_memoturn-db', 'project_prompton'],
  },
  { question: 'Does he write Go?', expect: ['ai_context_language-breadth', 'project_fold'] },
  {
    question: 'Has he done any C++?',
    expect: [
      'ai_context_language-breadth',
      'project_caveacoustics',
      'ai_context_cave-acoustics-audio',
    ],
  },
  {
    question: 'What Python work has he done?',
    expect: [
      'ai_context_language-breadth',
      'project_ecommerce-intent-reasoning-engine',
      'project_adventure-agent',
    ],
  },
  {
    question: 'Does he know Kubernetes?',
    expect: ['tools_systems-infra', 'project_fold', 'project_contentworker'],
  },
  {
    question: 'How deep is his Cloudflare experience?',
    expect: ['ai_context_cloudflare-expertise', 'tools_edge-runtime'],
  },
  { question: 'What databases has he worked with?', expect: ['tools_data-backend', 'skills'] },

  // Career and history
  { question: 'What did he do at Capgemini?', expect: ['experience_lyons'] },
  { question: 'Tell me about his time at Lyons Consulting Group', expect: ['experience_lyons'] },
  {
    question: 'Has he done a zero downtime migration?',
    expect: ['experience_adobe_2019', 'ai_context_enterprise-experience'],
  },
  {
    question: 'How many years of experience does he have?',
    expect: ['ai_context_career-arc', 'summary_'],
  },
  { question: 'What is his career trajectory?', expect: ['ai_context_career-arc'] },
  {
    question: 'Has he won any awards?',
    expect: ['recognition_', 'ai_context_faq-awards-and-recognition'],
  },

  // Person and fit
  { question: 'How do I contact Blake?', expect: ['personal', 'ai_context_faq-contact'] },
  { question: 'Is he available for hire?', expect: ['ai_context_faq-contact'] },
  { question: 'What is he best at?', expect: ['ai_context_faq-strengths'] },
  { question: 'Does he lead teams?', expect: ['ai_context_faq-leadership'] },
  { question: 'Does he do frontend work?', expect: ['ai_context_faq-frontend'] },
  {
    question: 'What is the hardest thing he has built?',
    expect: ['ai_context_faq-hardest-problem'],
  },
  {
    question: 'What kind of role is he looking for?',
    expect: ['ai_context_work-style', 'ai_context_faq-contact'],
  },

  // Scope and honesty — the answers that keep the assistant from overstating
  {
    question: 'Which of these projects are actually in production?',
    expect: ['ai_context_scope-production-vs-prototype'],
  },
  {
    question: 'How much traffic did his systems handle?',
    expect: ['ai_context_scope-metrics-and-scale'],
  },
  { question: 'What is his education?', expect: ['ai_context_scope-boundaries'] },
];

const BASE_URL = process.env.EVAL_BASE_URL ?? 'https://blakebauman.dev';
const ADMIN_KEY = process.env.VECTORIZE_ADMIN_KEY;
const TOP_K_REPORTED = [1, 3, 5, 10];

interface DebugMatch {
  id: string;
  score: number;
  type: string;
  title: string;
}

async function retrieve(question: string): Promise<DebugMatch[]> {
  const res = await fetch(`${BASE_URL}/api/debug/retrieval`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ADMIN_KEY}`,
    },
    body: JSON.stringify({ prompt: question }),
  });

  if (!res.ok) {
    throw new Error(`Retrieval failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as { matches: DebugMatch[] };
  return data.matches;
}

function rankOfFirstHit(matches: DebugMatch[], expected: string[]): number | null {
  const index = matches.findIndex(match => expected.some(prefix => match.id.startsWith(prefix)));
  return index === -1 ? null : index + 1;
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index] as number;
}

async function main() {
  if (!ADMIN_KEY) {
    console.error('VECTORIZE_ADMIN_KEY is required.');
    console.error('Usage: VECTORIZE_ADMIN_KEY=... pnpm run vectorize:eval');
    process.exit(1);
  }

  console.log(`Evaluating ${GOLDEN_SET.length} questions against ${BASE_URL}\n`);

  const ranks: Array<number | null> = [];
  const hitScores: number[] = [];
  const misses: string[] = [];

  for (const testCase of GOLDEN_SET) {
    let matches: DebugMatch[];
    try {
      matches = await retrieve(testCase.question);
    } catch (error) {
      console.error(`  ERROR  ${testCase.question}\n         ${(error as Error).message}`);
      process.exit(1);
    }

    const rank = rankOfFirstHit(matches, testCase.expect);
    ranks.push(rank);

    if (rank === null) {
      misses.push(testCase.question);
      const top = matches[0];
      console.log(
        `  MISS   ${testCase.question}\n         wanted ${testCase.expect.join(' | ')}\n         got    ${top ? `${top.id} (${top.score.toFixed(3)})` : 'nothing'}`
      );
    } else {
      const score = matches[rank - 1]?.score ?? 0;
      hitScores.push(score);
      if (rank > 3) {
        console.log(
          `  LOW    ${testCase.question}\n         first hit at rank ${rank} (${score.toFixed(3)})`
        );
      }
    }
  }

  const total = GOLDEN_SET.length;
  console.log(`\n${'-'.repeat(60)}`);

  const row = (label: string, value: string) => `${label.padEnd(12)}${value}`;

  for (const k of TOP_K_REPORTED) {
    const hits = ranks.filter(r => r !== null && r <= k).length;
    console.log(row(`recall@${k}`, `${hits}/${total}  (${((hits / total) * 100).toFixed(1)}%)`));
  }

  const mrr = ranks.reduce<number>((sum, rank) => sum + (rank ? 1 / rank : 0), 0) / total;
  console.log(row('MRR', mrr.toFixed(3)));

  // The distribution is the point: MIN_SCORE should sit below the low end of
  // correct-hit scores and above the typical score of an unrelated match.
  const sorted = [...hitScores].sort((a, b) => a - b);
  console.log(`\nScores of correct hits (n=${sorted.length}):`);
  console.log(`  min    ${percentile(sorted, 0).toFixed(3)}`);
  console.log(`  p10    ${percentile(sorted, 10).toFixed(3)}   <- MIN_SCORE should sit below this`);
  console.log(`  median ${percentile(sorted, 50).toFixed(3)}`);
  console.log(`  max    ${percentile(sorted, 100).toFixed(3)}`);

  if (misses.length) {
    console.log(`\n${misses.length} question(s) retrieved nothing relevant.`);
    process.exit(1);
  }

  console.log('\nEvery question retrieved a relevant chunk.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
