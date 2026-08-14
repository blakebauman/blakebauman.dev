/**
 * Syncs repository facts from GitHub into resume.json.
 *
 * Two things go stale by hand and cannot be caught by reading the file:
 *
 * 1. Recency. "What is the most recent project?" is one of the default suggested
 *    prompts, and it was answered from hand-written `year` strings that do not
 *    change when you push. This writes `lastActivity` from the repository's real
 *    push date.
 *
 * 2. Visibility. Five projects were marked `visibility: "private"` while their
 *    repositories were public and linkable. That is not a cosmetic error: the
 *    chunker renders private projects as "Repository: private, no public source
 *    available", so the assistant was stating something false about work anyone
 *    could clone. This reports every mismatch rather than silently rewriting it,
 *    because the correct resolution differs per project — a public repo that is
 *    deliberately not featured wants `listed: false`, not `visibility: private`.
 *
 * Usage:
 *   pnpm run sync:github            # write lastActivity, report mismatches
 *   pnpm run sync:github -- --check # report only, do not write
 *
 * Exit codes: 0 clean, 1 visibility mismatch (an untrue claim), 2 stale dates
 * only (expected drift), 3 could not check (API error or rate limit). See the
 * note above the exit calls at the bottom.
 *
 * Unauthenticated by default (60 requests/hour, and this makes roughly 20).
 * Set GITHUB_TOKEN to raise that ceiling or to see private repositories.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RESUME_PATH = resolve(import.meta.dirname, '../app/chat/resume.json');
const CHECK_ONLY = process.argv.includes('--check');
const TOKEN = process.env.GITHUB_TOKEN;

interface Project {
  name: string;
  github?: string;
  visibility?: string;
  listed?: boolean;
  lastActivity?: string;
  [key: string]: unknown;
}

interface Resume {
  projects: Project[];
  [key: string]: unknown;
}

interface RepoFacts {
  pushedAt: string;
  isPrivate: boolean;
}

function ghHeaders(): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'blakebauman.dev-sync',
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
  };
}

/** Parses `owner/repo`, or `owner` for an organization-level link. */
function parseGithubUrl(url: string): { owner: string; repo?: string } | null {
  const match = url.match(/github\.com\/([^/]+)(?:\/([^/?#]+))?/);
  if (!match?.[1]) return null;
  return { owner: match[1], repo: match[2]?.replace(/\.git$/, '') };
}

async function fetchRepo(owner: string, repo: string): Promise<RepoFacts | null> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: ghHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${owner}/${repo}: ${await res.text()}`);
  const data = (await res.json()) as { pushed_at: string; private: boolean };
  return { pushedAt: data.pushed_at, isPrivate: data.private };
}

/** For an org link, the most recent push across its repositories. */
async function fetchOrg(owner: string): Promise<RepoFacts | null> {
  const res = await fetch(`https://api.github.com/orgs/${owner}/repos?per_page=100`, {
    headers: ghHeaders(),
  });
  if (!res.ok) return null;
  const repos = (await res.json()) as Array<{ pushed_at: string; private: boolean }>;
  if (!Array.isArray(repos) || !repos.length) return null;
  const newest = repos
    .map(r => r.pushed_at)
    .sort()
    .pop() as string;
  return { pushedAt: newest, isPrivate: repos.every(r => r.private) };
}

async function main() {
  const resume = JSON.parse(readFileSync(RESUME_PATH, 'utf8')) as Resume;

  const updates: string[] = [];
  const mismatches: string[] = [];
  const unreachable: string[] = [];

  for (const project of resume.projects) {
    if (!project.github) continue;
    const parsed = parseGithubUrl(project.github);
    if (!parsed) {
      unreachable.push(`${project.name}: unparseable github url ${project.github}`);
      continue;
    }

    let facts: RepoFacts | null;
    try {
      facts = parsed.repo
        ? await fetchRepo(parsed.owner, parsed.repo)
        : await fetchOrg(parsed.owner);
    } catch (error) {
      // Exit 3, not 1. A rate limit or a network blip is an operational failure,
      // and reporting it as a visibility mismatch would claim the record states
      // something untrue when nothing was actually checked.
      console.error(`  ERROR  ${project.name}: ${(error as Error).message}`);
      process.exit(3);
    }

    if (!facts) {
      // 404 unauthenticated means private *or* renamed/deleted. Without a token
      // those are indistinguishable, so this is reported, never assumed.
      unreachable.push(
        `${project.name}: ${project.github} not reachable${TOKEN ? '' : ' (no GITHUB_TOKEN, so private repos look identical to deleted ones)'}`
      );
      continue;
    }

    const day = facts.pushedAt.slice(0, 10);
    if (project.lastActivity !== day) {
      updates.push(`${project.name}: ${project.lastActivity ?? '(unset)'} -> ${day}`);
      if (!CHECK_ONLY) project.lastActivity = day;
    }

    const markedPrivate = project.visibility === 'private';
    if (markedPrivate !== facts.isPrivate) {
      mismatches.push(
        `${project.name}: marked visibility="${project.visibility ?? 'public'}" but GitHub says private=${facts.isPrivate}`
      );
    }
  }

  const report = (title: string, lines: string[]) => {
    if (!lines.length) return;
    console.log(`\n${title}`);
    for (const line of lines) console.log(`  ${line}`);
  };

  report(CHECK_ONLY ? 'Stale lastActivity' : 'Updated lastActivity', updates);
  report('Visibility mismatches (fix by hand — see the note at the top of this file)', mismatches);
  report('Not reachable', unreachable);

  if (!CHECK_ONLY && updates.length) {
    writeFileSync(RESUME_PATH, `${JSON.stringify(resume, null, 2)}\n`);
    console.log(`\nWrote ${updates.length} update(s) to resume.json.`);
    console.log('Run `pnpm run format` then re-populate the index.');
  }

  if (!updates.length && !mismatches.length && !unreachable.length) {
    console.log('\nEverything in sync.');
  }

  // Two failure kinds, deliberately distinguished by exit code, because they
  // deserve different responses when this runs on a schedule:
  //
  //   1  a visibility mismatch — the assistant is stating something untrue about
  //      a repository. Always an error, always worth waking up for.
  //   2  stale lastActivity only — time passed and something got pushed. Expected
  //      and frequent; failing on it nightly would train everyone to ignore the
  //      job, which costs more than the drift does.
  //   3  could not check — API error or rate limit. Kept separate from 1 so an
  //      operational blip never masquerades as the record being wrong.
  //
  // A normal (non-check) run just fixes staleness and never exits 2.
  if (mismatches.length) process.exit(1);
  if (CHECK_ONLY && updates.length) process.exit(2);
}

main().catch(error => {
  // Also 3: an unexpected throw means the check did not complete, not that the
  // record is wrong.
  console.error(error);
  process.exit(3);
});
