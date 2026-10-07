import { fullMarkdown, markdownHeaders } from '../lib/markdown';

/**
 * llms-full.txt — the whole record and every case study as one markdown
 * document, the companion llms.txt points to. Built by the same functions that
 * serve `/index.md` and `/work/<slug>.md`, so it cannot drift from them.
 */
export function loader() {
  const body = fullMarkdown();
  return new Response(body, {
    headers: { ...markdownHeaders(body), 'Cache-Control': 'public, max-age=86400' },
  });
}
