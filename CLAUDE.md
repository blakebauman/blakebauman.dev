# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website (blakebauman.dev) built with React Router v7 and deployed to Cloudflare Workers. Features an AI-powered chatbot that answers questions about the resume using Cloudflare AI and Vectorize for semantic search.

## Commands

```bash
pnpm install          # Install dependencies
pnpm run dev          # Start dev server with HMR (http://localhost:5173)
pnpm run build        # Production build
pnpm run deploy       # Build and deploy to Cloudflare Workers
pnpm run typecheck    # Generate types and run TypeScript checks
```

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

### Vectorize Commands (separate worker)
```bash
pnpm run vectorize:dev       # Run vectorize worker locally (requires --remote)
pnpm run vectorize:deploy    # Deploy vectorize worker
pnpm run vectorize:populate  # Populate vector index (requires VECTORIZE_ADMIN_KEY)
pnpm run vectorize:query     # Test query against production index
```

## Architecture

### Stack
- **Framework**: React Router v7 with SSR
- **Styling**: Tailwind CSS v4
- **Deployment**: Cloudflare Workers
- **AI Services**: Workers AI (embeddings + LLM), Vectorize (vector search), KV (data storage)
- **Validation**: Zod v4 for runtime schema validation

### Entry Points
- `workers/app.ts` - Worker entry: rate limiting, CORS, API routes, React Router handoff
- `app/root.tsx` - React app root with Layout component
- `app/routes.ts` - Route configuration

### Key Directories
- `app/chat/` - AI chat logic (`request.ts` handles AI request flow)
- `app/schemas/` - Zod schemas for validation (chat, resume, errors)
- `app/components/` - Resume display components and chatbot UI
- `app/lib/` - Shared utilities (vectorize population)
- `workers/` - Cloudflare Worker entry points

### Cloudflare Bindings (wrangler.jsonc)
- `AI` - Workers AI for embeddings (@cf/baai/bge-base-en-v1.5) and LLM (@cf/meta/llama-3.1-8b-instruct)
- `VECTORIZE` - Vector index for semantic resume search (768 dimensions, index: resume-index-768)
- `RESUME_DATA_KV` - KV namespace for resume JSON and rate limiting

### AI Chat Flow
1. User sends prompt to `/api/chat` (rate limited: 20 req/min per IP)
2. `app/chat/guardrails.ts` checks topic relevance (rejects off-topic before LLM call)
3. `app/chat/request.ts` validates with Zod, generates embeddings
4. Vectorize queries find relevant resume sections
5. Workers AI LLM generates response using matched context
6. Falls back to full resume context if vector search unavailable (dev mode)

### Type System
- `app/types.ts` - Re-exports from schemas, defines Env bindings
- `app/schemas/` - Zod schemas that generate TypeScript types
- Path alias `@/` maps to `app/` for imports
- React Router auto-generates route types in `./+types/` directories

## Conventions

### Input Validation
- Always validate user input with Zod schemas from `app/schemas/`
- Chat prompts: MAX_PROMPT_LENGTH 1000, MAX_HISTORY_MESSAGES 12
- Use `createValidationErrorResponse()` for consistent error responses

### Cloudflare Workers
- Use TypeScript and ES modules format
- Use wrangler.jsonc (not .toml) for new configurations
- Set `compatibility_date = "2025-02-11"` and `compatibility_flags = ["nodejs_compat"]`
- Store secrets via `wrangler secret put`, never in config files

### Code Style
- Biome handles linting and formatting (pre-commit hook via lefthook)
- Single quotes, 2-space indent, 100 char line width, trailing commas (ES5)
- Unused variables/imports are errors; explicit `any` is a warning
