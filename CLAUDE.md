# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website (blakebauman.dev) built with React Router v7 and deployed to Cloudflare Workers. Features an AI-powered chatbot that answers questions about the resume using Cloudflare AI and Vectorize for semantic search.

## Commands

```bash
pnpm install          # Install dependencies
pnpm run dev          # Start dev server with HMR (http://localhost:5173), local bindings
REMOTE_BINDINGS=true pnpm run dev   # Same, but with live AI/Vectorize bindings
pnpm run build        # Production build
pnpm run deploy       # Build and deploy to Cloudflare Workers
pnpm run typecheck    # Generate types and run TypeScript checks
```

`pnpm run dev` defaults to local bindings. AI and Vectorize have no local
implementation, so `/api/chat` returns "Binding AI needs to be run remotely" and
the rest of the site works normally. `REMOTE_BINDINGS=true` restores live
bindings, but currently fails: Cloudflare rejects the preview session with error
1031 ("Invalid Workers Preview configuration") on the account's workers.dev
preview subdomain. Until that is fixed, the chatbot can only be exercised end to
end against a deployment.

### Testing
```bash
pnpm test             # Run tests with Vitest
pnpm test -- --watch  # Watch mode
pnpm test:coverage    # Run with coverage report
pnpm test -- app/chat # Run tests matching path
```

### Linting/Formatting (Biome)
```bash
pnpm run check        # Run Biome lint + format check
pnpm run check:fix    # Fix lint and format issues
pnpm run lint         # Run Biome linter only
pnpm run lint:fix     # Fix lint issues
pnpm run format       # Format all files
pnpm run format:check # Check formatting only
```

### Vectorize Commands
```bash
VECTORIZE_ADMIN_KEY=... pnpm run vectorize:populate  # Rebuild the index from resume.json + ai-context.json
VECTORIZE_ADMIN_KEY=... pnpm run vectorize:eval      # Golden-set retrieval eval: recall@k, MRR, score distribution
```

There is one populate path: `POST /api/populate-vectorize` on the main worker.
A separate `vectorize-worker` used to own a second, divergent copy of it that
omitted `ai-context.json`, so rebuilding the index from the main worker silently
dropped the entire chat-only knowledge layer. That worker has been deleted;
retire the `vectorize.blakebauman.dev` custom domain in the dashboard if it is
still bound.

Populate is reconciling, not just additive. Vectorize has no API to list the ids
it holds, so `migrations/003_vector_manifest.sql` records what the last populate
wrote; the next one diffs against it and deletes what the current content no
longer produces. Without that, renaming a project leaves its old vector in the
index permanently — retrievable, stale, and invisible to every later populate.

## Architecture

### Stack
- **Framework**: React Router v7 with SSR
- **Styling**: Tailwind CSS v4
- **Deployment**: Cloudflare Workers
- **AI Services**: Workers AI (embeddings + LLM), Vectorize (vector search)
- **Validation**: Zod v4 for runtime schema validation

### Entry Points
- `workers/app.ts` - Worker entry: rate limiting, CORS, API routes, React Router handoff
- `app/root.tsx` - React app root with Layout component
- `app/routes.ts` - Route configuration

### Key Directories
- `app/chat/` - AI chat logic (`request.ts` handles AI request flow)
- `app/schemas/` - Zod schemas for validation (chat, resume, ai-context, admin, errors)
- `app/components/` - Resume display components and chatbot UI
- `app/lib/` - Shared utilities (vectorize population, text normalization, HTTP/auth helpers)
- `workers/` - Cloudflare Worker entry point
- `scripts/` - Operational scripts (retrieval eval)

### Content (the whole knowledge base)
- `app/chat/resume.json` - Single source for both the rendered page and the chat.
  Projects and experience entries carry optional `highlights`, `aliases`, and
  `maturity`; each becomes its own retrievable chunk.

  Two independent fields control display, and they are not interchangeable:
  `visibility: "private"` means the repository has no public source (the chunker
  says so in the indexed text), while `listed: false` means the entry is
  deliberately kept off the page. A project with a public repo that simply has
  not earned a slot is `listed: false`, never `visibility: "private"` — marking
  it private would make the assistant claim there is no public source for a repo
  anyone can clone. Both stay indexed either way, so the chat can still discuss
  them.
- `app/chat/ai-context.json` - Chat-only layer, never rendered. Entries are
  `{id, title, text, topics, kind}` where `kind` is `background`, `faq`, or
  `scope`. The `scope` entries are the anti-hallucination layer: they give the
  model explicit language for what is a prototype, what is unquantified, and
  what is outside the record, so it reaches for those instead of inventing.
- `app/chat/data.ts` - The one place the JSON imports are cast to their schema
  types. Import content from here, not from the JSON directly.

Both files feed `buildChunks` in `app/lib/vectorize.ts`. Adding a project or an
ai-context entry automatically teaches the topic guardrail its name and topics —
there is no separate keyword list to keep in sync.

**Only `title` and `text` are embedded.** `buildChunks` joins them as the chunk
body; `topics` goes into Vectorize metadata and feeds the guardrail vocabulary,
and has no effect whatsoever on retrieval. Adding a phrasing to `topics` to make
a chunk findable does nothing — the phrasing has to appear in the title or the
body. The title is the first embedded line and carries disproportionate weight,
which makes it the strongest lever available.

**Write titles that name the subject, not titles shaped like the question.**
Embedding similarity is not keyword matching, and the obvious-seeming move backfires.
Measured on "where has he worked?", the same chunk under three titles:

| title | rank |
|---|---|
| `Career arc, 2017 to now` | not in top 16 |
| `Where Blake has worked: the companies, …` | **5** |
| `Where has Blake worked? The companies, …` | 9 |

Naming the subject in the words a visitor would use is what worked. Phrasing the
title as a question made it *worse* — an interrogative pulls the vector toward
question-shaped text rather than toward the subject.

**Some queries cannot be won by editing content.** Questions with no proper noun
and few content words flatten the whole corpus into a narrow band: "where has he
worked?" spans 0.057 across its top ten, and the three chunks above the right
answer did not move across two separate rewrites. The same question with "Blake"
in it scores ~0.12 higher and ranks correctly. When the spread is that tight,
ranking is noise and further content tuning is wasted effort — get the chunk
above the floor so it reaches the model, and stop.

**Retitling to win one phrasing can lose another.** The scope entry's title once
carried "shipped"; a rewrite carried "deployed" and "live" and dropped it, and
"what has he actually shipped?" fell from rank 1 to outside the top 16. After
any retitle, re-run the eval — the golden set carries paraphrases specifically
to catch this.

**Cross-cutting themes need their own entry.** Retrieval matches chunks, and a
chunk is about one subject. A theme that appears as a clause inside many chunks
is not retrievable by any phrasing of a question about it: authentication was
mentioned in several chunks (timetracker, Skillist, edgevault, Fold, prompton)
and *no* wording of "what authentication has he built?" surfaced any of
them — generic chunks like `personal` and `github-orgs` won instead, because they
sit near the corpus centroid. The fix is an entry whose subject *is* the theme;
`ai_context_auth-and-security` and `ai_context_language-breadth` are both that
shape. When adding content, ask what a visitor would ask about that spans
projects, and give each of those a home.

Do not add a BGE query-instruction prefix to the embedding call. It was tried
and measured: it lowers every score and does not improve ranking on this corpus.

### Cloudflare Bindings (wrangler.jsonc)
- `AI` - Workers AI for embeddings (@cf/baai/bge-base-en-v1.5) and LLM (@cf/meta/llama-3.3-70b-instruct-fp8-fast)
- `VECTORIZE` - Vector index for semantic resume search (768 dimensions, index: resume-index-768)
- `CHAT_RATE_LIMITER` - Native Workers rate limiting binding (20 req/min per IP; absent in local dev)
- `CHAT_LOGS_DB` - D1: chat logs plus the vector manifest. A nightly cron prunes
  logs older than 90 days.

Secrets: `VECTORIZE_ADMIN_KEY` (populate + retrieval debug), `ADMIN_API_KEY`
(chat logs), `IP_HASH_SALT` (without it, IP hashes are brute-forceable and rows
are written with an `unsalted:` prefix).

### AI Chat Flow
1. `POST /api/chat` only — non-POST returns 405, so nothing bypasses the rate limiter
2. `app/chat/guardrails.ts` checks topic relevance against a NFKC-normalized,
   invisible-character-stripped prompt, before any model call. It also screens
   recent history, since an injection can be split across turns.
3. `app/chat/request.ts` validates with Zod and embeds the prompt
4. `app/chat/context.ts` queries Vectorize (topK 16), drops matches below
   `MIN_SCORE`, validates each match's metadata at runtime, dedupes, and fills a
   6000-character context budget highest-score-first
5. `app/chat/prompt.ts` fences the retrieved text in `<context>` and labels it as
   data. Replayed conversation history is untrusted — a caller can forge an
   assistant turn — so it is sanitized, capped, and never treated as instructions.
6. Workers AI streams the response; a leading SSE frame carries the sources that
   grounded it, which the UI renders as chips
7. Falls back to the full record (including recognition and the ai-context layer)
   if vector search is unavailable

Retrieval quality is measurable via `pnpm run vectorize:eval`, which hits
`POST /api/debug/retrieval` (admin-key gated, no model call) and reports
recall@k, MRR, and the score distribution. Tune `MIN_SCORE` in
`app/chat/context.ts` from that distribution rather than by guessing.

### Type System
- `app/types.ts` - Re-exports from schemas, defines Env bindings
- `app/schemas/` - Zod schemas that generate TypeScript types
- Path alias `@/` maps to `app/` for imports
- React Router auto-generates route types in `./+types/` directories

## Conventions

### Input Validation
- Always validate user input with Zod schemas from `app/schemas/`
- Chat prompts: MAX_PROMPT_LENGTH 1000, MAX_HISTORY_MESSAGES 12 (see `CHAT_LIMITS`)
- Use `createValidationErrorResponse()` for consistent error responses
- Sanitize with `stripInvisible` / `normalizeForMatch` from `app/lib/text.ts`.
  Zero-width and bidi characters are what let an "ignore previous instructions"
  past a regex that looks correct; strip before storing, normalize before matching.

### Error Responses
Never return `error.message` to a caller. Use `serverErrorResponse()` from
`app/lib/http.ts`: it logs the real error with a generated request id and returns
a fixed message plus that id, so a user report can be traced without the response
describing which binding is misconfigured. Compare secrets with `isAuthorized()`
from the same module — it does a proper `Bearer` prefix parse and a timing-safe
comparison.

### Cloudflare Workers
- Use TypeScript and ES modules format
- Use wrangler.jsonc (not .toml) for new configurations
- Set `compatibility_date = "2025-02-11"` and `compatibility_flags = ["nodejs_compat"]`
- Store secrets via `wrangler secret put`, never in config files

### Code Style
- Biome handles linting and formatting (pre-commit hook via lefthook)
- Single quotes, 2-space indent, 100 char line width, trailing commas (ES5)
- Unused variables/imports are errors; explicit `any` is a warning
