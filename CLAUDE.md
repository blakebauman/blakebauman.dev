# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website (blakebauman.com) built with React Router v7 and deployed to Cloudflare Workers. Features an AI-powered chatbot that answers questions about the resume using Cloudflare AI and Vectorize for semantic search.

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

**`pnpm run dev` does not run `workers/app.ts` at all.** The dev server uses
`cloudflareDevProxy`, which supplies bindings to the React Router dev server;
the worker entry is only the SSR build input. So everything that lives in its
`fetch` — CORS, rate limiting, `/mcp`, `/api/populate-vectorize`,
`/api/debug/retrieval`, `/api/admin/chat-logs`, and the 405 gate on `/api/chat` —
is bypassed in dev, and those paths fall through to a React Router 404. To
exercise any of it locally, `pnpm run build && pnpm exec wrangler dev --local`.
Pass `--port` explicitly: other Workers projects on this machine hold 8787.

To exercise anything that needs AI or Vectorize locally, add `"remote": true` to
those two bindings and run `wrangler dev` **without** `--local` (`--local`
refuses remote bindings outright). That works — the 1031 preview-session failure
above is specific to the Vite dev proxy's `getPlatformProxy` session, not to
per-binding remote mode. Two caveats: every request then bills real Workers AI
usage and queries the live index, and `/api/chat` still takes the dev path
regardless, because wrangler sets `NODE_ENV=development` and `request.ts` gates
both the vector and agent paths on it. Testing the chat loop end to end means
also stubbing `isDev` to false for the run. Do not commit either change.

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
dropped the entire chat-only knowledge layer. It has been deleted *from this
repo*, but as of 2026-09-19 the `vectorize-worker` script is still deployed on
the account and `vectorize.blakebauman.dev` is still bound to it — so the
divergent populate path is still reachable. Retire both.

Populate is reconciling, not just additive. Vectorize has no API to list the ids
it holds, so `migrations/003_vector_manifest.sql` records what the last populate
wrote; the next one diffs against it and deletes what the current content no
longer produces. Without that, renaming a project leaves its old vector in the
index permanently — retrievable, stale, and invisible to every later populate.

## Architecture

### Stack
- **Framework**: React Router v7 with SSR
- **Styling**: Tailwind CSS v4, plus a hand-written design system in `app/app.css`
- **Type**: Archivo Variable for display, UI *and* body (`--font-body` aliases
  `--font-display`), JetBrains Mono Variable for code. Self-hosted via
  `@fontsource-variable/*`. No serif is loaded anywhere.
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
- `app/content/` - Long-form case-study content, including the hand-authored
  inline SVG diagrams. See "Case studies" below.
- `app/lib/` - Shared utilities (vectorize population, text normalization, HTTP/auth helpers)
- `workers/` - Cloudflare Worker entry point
- `scripts/` - Operational scripts (retrieval eval)

### Design system

`docs/DESIGN.md` is the contract; `app/app.css` implements it. Read DESIGN.md
before changing anything visual, and treat its Named Rules as binding rather than
advisory. The three that are load-bearing and easy to break by accident:

- **One hue at two lightnesses.** `--red` #FC432E signals and `--ember` #4E251E
  fills; they are the same hue at 30, and nothing else on the page is coloured.
  A second accent is the easiest way to lose this palette.
- **Neutrals stay near-neutral, not neutral.** Night, basalt, the well and the
  ink ramp all sit under ~0.013 OKLCH chroma on a blue hue — night measures
  0.0115 at hue 267. The tint is deliberate; what is banned is warmth, and any
  neutral that reads as a hue.
- **The width ladder.** Archivo's `wdth` axis encodes rank: 110% display, 104%
  heading, 100% UI, 88% metadata. There are four stops and no others, and the
  Fontsource `wdth` entrypoint is required for them to exist at all. With one
  family and one weight, this axis is most of the hierarchy.

Contrast figures in DESIGN.md were measured against the rendered DOM, not
estimated from OKLCH lightness. Re-measure after any palette change; OKLCH
lightness is perceptual and reasoning about it produces wrong answers.

**The contrast harness has two blind spots, and both have already produced a
real failure here.** It reads each element's resolved `background-color` in its
resting state, so it cannot see either of these:

- **A `background-image`.** The chat's dot grid composites to #1D1E22 over the
  well; `--ink-3` on a dot is 2.7:1, under the floor, while the harness happily
  reports the well at 3.2:1. Nothing renders that combination today.
- **A state.** The global `a:hover` sets `--red` and outranks `.btn`, which
  declared its colour only in the resting rule — so the primary button's label
  went red on a near-white hover fill at 3.05:1. A control that changes its
  background on hover must re-declare its colour in the same rule.

Measure textures and states by hand. A clean audit is not evidence that either
is safe.

### Case studies

`app/content/case-studies.tsx` holds the three long-form entries rendered by
`app/routes/work.tsx` at `/work/:slug`. `CASE_STUDIES` is the single source for
the route, the home page's featured tier (`LEAD_SLUGS`), and `sitemap.xml`, so
adding a fourth entry needs one edit.

The prose is written from the repositories themselves, not from `resume.json`.
When a project changes, both have to move: `resume.json` feeds the index and the
page listing, the case study feeds the long form, and nothing keeps them in sync
automatically.

The diagrams are hand-authored inline SVG rather than a charting dependency, so
they inherit the page's own CSS custom properties. Each carries `<title>` and
`<desc>`, and each has `min-width: 660px` inside a scrolling container so it
scrolls on a phone rather than scaling into illegibility. **A diagram is a claim:
verify arrow direction and component names against the source before shipping
one.**

### Agent surface (`app/agent/`)

`tools.ts` is one set of functions over the record, shared by every agentic
surface. `mcp.ts` exposes them as a Model Context Protocol server at `POST /mcp`
so an external agent can query the record directly; the on-site chat loop is
meant to consume the same layer, which is the point — an external agent and the
site's own assistant answer from one implementation rather than two that drift.

Six tools: `search_record` (the only one with a live dependency), `list_projects`,
`get_project`, `list_experience`, `read_case_study`, `get_profile`.

- **Tools return text, and `callTool` is the only boundary that formats it.**
  Every result is fence-stripped and capped there rather than per tool, because
  per-tool is one new tool away from an exception. Tool output re-enters a
  model's transcript on every hop of a loop, which makes it the more dangerous
  of the two places untrusted-shaped text meets a prompt.
- **The output cap is a backstop, not a content budget.** A tool whose ordinary
  output reaches it is losing its own tail — and for `list_projects`, whose
  entire job is completeness, that silently drops the oldest work. Both
  enumeration tools were doing exactly that at a 4000-character cap. The
  truncation test asserts that nothing truncates on the current record; when it
  fails, shorten the tool, do not raise the cap.
- **Slugs are `slugify(name)` from `vectorize.ts`, the same value `buildChunks`
  writes as `sourceId`.** That agreement is what makes search → `get_project` a
  working two-hop path: a hit names a source the next call can resolve. Breaking
  it breaks the loop silently, since both halves still work alone.
- **`search_record` degrades, it does not throw.** A dead binding comes back as
  content pointing at the enumeration tools. An internal error ends an agent
  loop; a redirect does not.
- **Zod schemas are the single definition.** `z.toJSONSchema` derives what
  `tools/list` advertises, so the contract and the validation cannot disagree.

`loop.ts` is the tool-calling loop behind `/api/chat`, gated on
`CHAT_AGENT_ENABLED`. It runs up to 3 hops, 3 tool calls per hop, 6 per turn and
12000 characters of tool output, then answers from what it gathered. The
answering call carries no `tools`: the loop is over, and a model that could
still emit a tool call there would stream a JSON blob at the reader with nothing
left to run it.

- **Retrieval is the fallback, and it stays that way.** `tryAgentLoop` returns
  null rather than throwing, and `/api/chat` falls through to
  `searchResumeContext` + `buildChatMessages`. A loop that broke must not cost
  the visitor their answer.
- **Tool results are fenced in `<tool_result>` and labelled as data.** Not a
  precaution — a bug. Unfenced, the felix case study's prose about tool calls
  that die mid-run, signed thinking blocks and prompt-cache identity read to the
  model as commentary on its own situation, and a plain "tell me about felix"
  came back as the off-topic redirect, deterministically. The retrieval path
  never had it because it has always fenced its context. `stripFenceMarkers`
  covers the tag, so nothing inside can close it early.
- **Never put an instruction to the model inside tool output.** A trailing
  "call get_project for full detail" in `list_projects` came back to the visitor
  verbatim, the assistant narrating its own plumbing. What a tool is for belongs
  in its description, which the model reads and the visitor never sees.
- **Rank-carrying facts lead.** Maturity sits immediately after the project
  name, not after the description: trailing it, the model answered "what has he
  shipped?" with felix — a prototype — among the production work. The prompt
  also steers "what has he shipped" to `list_projects({maturity:'production'})`
  rather than asking the model to filter twenty-one rows by eye.
- **Identical repeat calls are refused with a message saying so.** Reading its
  own unchanged result and asking again is the classic way a loop fails to
  terminate.
- **Both tool-call shapes are normalized.** Workers AI returns its native
  `{name, arguments}` for some models and OpenAI's `{function:{...}}` for
  others. A loop that parses neither does not crash — it answers with no tools,
  which reads as a bad model rather than a bug.

Citations come from two kinds of provenance and they are not equivalent. A
targeted lookup is a fact — the model named that entity itself — so
`get_project`, `read_case_study` and a filtered `list_experience` are cited
directly. A search hit is an inference, so it still goes through
`attributeSources` term overlap against the finished answer. Broad enumerations
are never cited, because citing them reproduces exactly the failure that
function exists to fix.

The MCP server is stateless and hand-written: every tool is read-only and every
call independent, so there is no session to keep and no Durable Object to hold
it. `MCP_ENABLED` gates it, mirroring `CHAT_ENABLED`, and absent means off. It
is unauthenticated — everything it returns is already on the page — but shares
the chat rate limiter, because `search_record` spends an embedding per call.
It is also the one endpoint here deliberately not origin-locked: MCP clients
arrive from every origin, so `/mcp` answers `Access-Control-Allow-Origin: *`.

### Discovery

Nothing finds `/mcp` on its own. There is **no `.well-known` discovery standard
for MCP servers** — the `.well-known/oauth-protected-resource` endpoints in the
spec are auth metadata for authenticated servers, and this one is deliberately
unauthenticated. So discovery is three deliberate pointers:

- **The colophon** (`copy.mcp` in resume.json) — the human path, and the only
  one that actually gets a URL in front of the person who configures a client.
  The endpoint renders as mono text, not a link: `/mcp` answers JSON-RPC over
  POST and returns 405 to a browser, so linking it would send a curious reader
  to an error.
- **`/llms.txt`** — the llmstxt.org convention, the closest thing to a
  machine-readable pointer that exists. Generated from resume.json,
  CASE_STUDIES and the tool registry, so it cannot advertise a tool the server
  does not have. Honours `listed: false` the way the page does.
- **`get_profile`** — so the on-site assistant can answer "can I query this
  programmatically?", which is the question the other two are really for, asked
  by someone already talking to the thing that can answer it.

**The topic guardrail is part of this and is easy to forget.** It runs before
any model call, so a question it refuses is one the assistant can never answer
however good its tools are. When `/mcp` shipped, five of six natural phrasings
of "can I query this?" were refused outright — "do you have an API?", "how do I
connect this to Claude?", "can my agent read this?" — because none of that
vocabulary was in the record. The fix was topic tags on the
`this-site-architecture` ai-context entry, not a change to guardrails.ts. Adding
any capability the assistant should be able to discuss means checking the
guardrail lets the question through first.

A bare `api` in those tags does make "what is the best API for weather data?"
on-topic. That is the existing calibration, not a regression: `database`,
`python`, `email` and `music` were already there and already did the same. The
cost is one inference on a question the model answers with "the record doesn't
cover that". Off-topic patterns are checked first, so no amount of on-topic
vocabulary weakens the injection screen.

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

### Domains

`blakebauman.com` is the primary domain. `blakebauman.dev` was, and both it and
its `www` remain bound to the same Worker so that every old link still resolves:
`canonicalHostRedirect` in `app/lib/canonical-host.ts` runs as the first thing
in the worker `fetch`, before CORS and before the rate limiter, and sends them
to the same path on the `.com` apex. Unbinding the `.dev` domains would turn
every one of those links into a DNS failure, so they stay.

The redirect is 301 for GET and HEAD and 308 for everything else. A 301 permits
a client to re-issue a POST as a GET, which on `/mcp` produces a body-less GET
and a 405 — a moved server that looks broken.

Two things deliberately did **not** move with the domain:

- **The Worker script name is still `blakebauman-dev`** (wrangler.jsonc). It is
  the deployment's identity; renaming it creates a second, empty Worker and
  strands the secrets, custom domains and observability history on the old one.
- **The Bluesky handle is still `blakebauman.dev`.** It is a DNS-verified handle
  backed by a TXT record on the `.dev` zone, so that zone cannot be torn down,
  and changing the handle is a Bluesky-side migration rather than an edit here.

`resume.json`'s `website` is the de facto site-URL constant — `root.tsx` takes
canonical, `og:url` and JSON-LD `Person.url` from it, and `agent/tools.ts` and
`components/resume.tsx` derive the `/mcp` URL from it. The three text surfaces
(`sitemap.xml`, `llms.txt`, `robots.txt`) each hardcode the origin separately.

### Cloudflare Bindings (wrangler.jsonc)
- `AI` - Workers AI for embeddings (@cf/baai/bge-base-en-v1.5) and LLM (@cf/meta/llama-3.3-70b-instruct-fp8-fast)
- `VECTORIZE` - Vector index for semantic resume search (768 dimensions, index: resume-index-768)
- `CHAT_RATE_LIMITER` - Native Workers rate limiting binding (20 req/min per IP; absent in local dev)
- `CHAT_LOGS_DB` - D1: chat logs plus the vector manifest. A nightly cron prunes
  logs older than 90 days.

Vars: `CHAT_ENABLED`, `MCP_ENABLED`, `CHAT_AGENT_ENABLED` — each must read
`"true"` to take effect. Turning `CHAT_AGENT_ENABLED` off reverts `/api/chat` to
single-shot retrieval, which is also where the loop falls back to on its own.

Secrets: `VECTORIZE_ADMIN_KEY` (populate + retrieval debug), `ADMIN_API_KEY`
(chat logs), `IP_HASH_SALT` (without it, IP hashes are brute-forceable and rows
are written with an `unsalted:` prefix).

### AI Chat Flow

With `CHAT_AGENT_ENABLED`, steps 3-5 are replaced by the tool-calling loop in
`app/agent/loop.ts`; steps 1, 2, 6 and 7 are common to both paths, and the loop
falls back to this one on any failure.

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
