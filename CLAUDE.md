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

### Vectorize Commands (separate worker)
```bash
pnpm run vectorize:dev       # Run vectorize worker locally (requires --remote)
pnpm run vectorize:deploy    # Deploy vectorize worker
pnpm run vectorize:populate  # Populate vector index with resume data
```

## Architecture

### Stack
- **Framework**: React Router v7 with SSR enabled
- **Styling**: Tailwind CSS v4
- **Deployment**: Cloudflare Workers
- **AI Services**: Workers AI (embeddings + LLM), Vectorize (vector search), KV (data storage)

### Entry Points
- `workers/app.ts` - Main Cloudflare Worker entry point, handles routing and API endpoints
- `app/root.tsx` - React app root with Layout component
- `app/routes.ts` - Route configuration using React Router file-based routing

### Key Directories
- `app/chat/` - AI chat logic including `request.ts` for AI request handling
- `app/resume/` - Resume display components and chatbot UI
- `app/lib/` - Shared utilities (vectorize population)
- `workers/` - Cloudflare Worker entry points and vectorize workers

### Cloudflare Bindings (wrangler.toml)
- `AI` - Workers AI for embeddings (@cf/baai/bge-base-en-v1.5) and LLM (@cf/meta/llama-2-7b-chat-int8)
- `VECTORIZE` - Vector index for semantic resume search (768 dimensions)
- `RESUME_DATA_KV` - KV namespace for resume JSON storage

### AI Chat Flow
1. User sends prompt to `/api/chat` endpoint
2. `app/chat/request.ts` generates embeddings using Workers AI
3. Vectorize queries find relevant resume sections
4. Workers AI LLM generates response using matched context
5. Falls back to full resume context if vector search unavailable

### Type System
- `app/types.ts` - Shared types for Env bindings, ChunkMetadata, ResumeData
- React Router auto-generates route types in `./+types/` directories

## Cloudflare Workers Standards

When writing Cloudflare Workers code:
- Use TypeScript and ES modules format
- Use wrangler.jsonc (not .toml) for new configurations
- Set `compatibility_date = "2025-02-11"` and `compatibility_flags = ["nodejs_compat"]`
- Use Hibernatable WebSocket API for WebSockets (not legacy addEventListener)
- Store secrets via `wrangler secret put`, never in config files
