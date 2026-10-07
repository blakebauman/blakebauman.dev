import { isValidElement, type ReactNode } from 'react';
import { projectSlug } from '../agent/tools';
import { resumeData } from '../chat/data';
import { CASE_STUDIES, type CaseStudy, caseStudyFor } from '../content/case-studies';
import {
  absoluteUrl,
  CONTENT_SIGNAL,
  identitySentence,
  markdownPath,
  RECORD_UPDATED,
  sameAs,
} from './seo';

/**
 * The site as markdown, for agents.
 *
 * Cloudflare's managed "Markdown for Agents" converts HTML at the edge, but it
 * needs a paid plan and works from the rendered page — nav, colophon and all.
 * The page is itself generated from resume.json and CASE_STUDIES, so this
 * generates the markdown from the same source instead: no conversion step to
 * lose structure, and nothing on the HTML page that the markdown can disagree
 * with.
 *
 * Served at `/index.md` and `/work/<slug>.md`, and in place of the HTML when a
 * request to `/` or `/work/<slug>` prefers `text/markdown`.
 */

/** Plain text of a React node: the hand-highlighted code excerpts are spans around strings. */
export function nodeText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return '';
}

function frontmatter(fields: Record<string, string | undefined>): string {
  const lines = Object.entries(fields)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    // JSON strings are valid YAML scalars and need no escaping rules of their own.
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${lines.join('\n')}\n---`;
}

function bullets(items: string[] | undefined): string {
  return (items ?? []).map(i => `- ${i}`).join('\n');
}

function blocks(parts: Array<string | false | 0 | null | undefined>): string {
  return parts.filter(Boolean).join('\n\n');
}

export function homeMarkdown(): string {
  const listed = resumeData.projects
    .filter(p => p.listed !== false)
    .sort((a, b) => (b.lastActivity ?? '').localeCompare(a.lastActivity ?? ''));

  const experience = resumeData.experience.map(role =>
    blocks([
      `### ${role.role}, ${role.company} (${role.years})`,
      role.location && `*${role.location}*`,
      role.description,
      bullets(role.highlights),
      role.tech?.length && `Tech: ${role.tech.join(', ')}`,
    ])
  );

  const projects = listed.map(project =>
    blocks([
      `### ${project.name}${project.maturity ? ` (${project.maturity})` : ''}`,
      project.description,
      bullets(project.highlights),
      [
        project.tech.length && `Tech: ${project.tech.join(', ')}`,
        project.github && `Source: ${project.github}`,
        project.website && `Site: ${project.website}`,
        caseStudyFor(projectSlug(project)) &&
          `Case study: ${absoluteUrl(markdownPath(`/work/${projectSlug(project)}`))}`,
      ]
        .filter(Boolean)
        .join('  \n'),
    ])
  );

  const tools = Array.isArray(resumeData.tools)
    ? resumeData.tools.join(', ')
    : Object.entries(resumeData.tools)
        .map(([group, items]) => `- ${group}: ${items.join(', ')}`)
        .join('\n');

  return blocks([
    frontmatter({
      title: `${resumeData.name} | ${resumeData.title}`,
      url: absoluteUrl('/'),
      description: identitySentence(),
      updated: RECORD_UPDATED,
    }),
    `# ${resumeData.name}`,
    `> ${identitySentence()}`,
    ...resumeData.summary,
    '## Case studies',
    CASE_STUDIES.map(
      s => `- [${s.name}](${absoluteUrl(markdownPath(`/work/${s.slug}`))}): ${s.oneLine}`
    ).join('\n'),
    '## Experience',
    ...experience,
    '## Projects',
    ...projects,
    resumeData.recognition?.length && '## Recognition',
    ...(resumeData.recognition ?? []).map(r => `### ${r.title} (${r.year})\n\n${r.description}`),
    '## Tools',
    tools,
    '## Contact',
    bullets([`Email: ${resumeData.email}`, ...sameAs()]),
  ]).concat('\n');
}

export function caseStudyMarkdown(study: CaseStudy): string {
  const sections = study.sections.map(section =>
    blocks([
      `## ${section.heading}`,
      ...(section.paragraphs ?? []),
      section.list?.map(i => `- **${i.term}** ${i.detail}`).join('\n'),
      // The diagram is inline SVG; its caption is the part that carries meaning.
      section.figure && `*Diagram:* ${section.figure.caption}`,
      section.code &&
        `\`${section.code.path}\` (${section.code.tag})\n\n\`\`\`\n${nodeText(section.code.lines).trimEnd()}\n\`\`\``,
    ])
  );

  return blocks([
    frontmatter({
      title: `${study.name}: a case study by ${resumeData.name}`,
      url: absoluteUrl(`/work/${study.slug}`),
      author: resumeData.name,
      description: study.oneLine,
      updated: study.updated,
    }),
    `# ${study.name}`,
    `> ${study.oneLine}`,
    `By [${resumeData.name}](${absoluteUrl('/index.md')}), ${resumeData.title}.`,
    study.meta.map(m => `**${m.k}:** ${m.v}`).join(' · '),
    bullets(study.links.map(l => `[${l.label}](${l.href})`)),
    ...sections,
  ]).concat('\n');
}

/** Everything, in one fetch: llms-full.txt. */
export function fullMarkdown(): string {
  return [homeMarkdown(), ...CASE_STUDIES.map(caseStudyMarkdown)].join('\n\n');
}

export function markdownHeaders(body: string): Record<string, string> {
  return {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
    'Content-Signal': CONTENT_SIGNAL,
    // Cloudflare's convention for converted pages. A rough four characters per
    // token, which is all a caller budgeting context needs.
    'x-markdown-tokens': String(Math.ceil(body.length / 4)),
    Vary: 'Accept',
  };
}

/** q-value of a media type in an Accept header, 0 if absent. */
function quality(accept: string, type: string): number {
  let best = 0;
  for (const part of accept.split(',')) {
    const [media, ...params] = part.trim().split(';');
    if (media?.trim().toLowerCase() !== type) continue;
    const q = params.map(p => p.trim()).find(p => p.startsWith('q='));
    best = Math.max(best, q ? Number(q.slice(2)) || 0 : 1);
  }
  return best;
}

/** True when the caller asked for markdown at least as strongly as for HTML. */
export function prefersMarkdown(accept: string | null): boolean {
  if (!accept) return false;
  const md = quality(accept, 'text/markdown');
  return md > 0 && md >= quality(accept, 'text/html');
}

/**
 * The markdown for a request, or null when the request is not for markdown.
 * Handles both the explicit `.md` URLs and content negotiation on the HTML
 * paths, so the worker needs one call.
 */
export function markdownFor(request: Request, url: URL): Response | null {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;

  const path = url.pathname;
  const explicit = path.endsWith('.md');
  if (!explicit && !prefersMarkdown(request.headers.get('Accept'))) return null;

  // The HTML page this markdown is the twin of, for the canonical Link.
  const htmlPath = path === '/index.md' ? '/' : path.replace(/\.md$/, '');

  let body: string | null = null;
  if (path === '/' || path === '/index.md') {
    body = homeMarkdown();
  } else {
    const match = /^\/work\/([a-z0-9-]+?)(\.md)?$/.exec(path);
    const study = match?.[1] ? caseStudyFor(match[1]) : undefined;
    if (study && Boolean(match?.[2]) === explicit) body = caseStudyMarkdown(study);
  }

  if (body === null) {
    return explicit
      ? new Response('Not found\n', {
          status: 404,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      : null;
  }

  return new Response(request.method === 'HEAD' ? null : body, {
    headers: {
      ...markdownHeaders(body),
      Link: `<${absoluteUrl(htmlPath)}>; rel="canonical"`,
    },
  });
}
