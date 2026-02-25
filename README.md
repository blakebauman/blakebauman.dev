# blakebauman.dev

Personal portfolio and resume site built with React Router v7, deployed to Cloudflare Workers. Features an AI-powered chatbot that answers questions about the resume using Cloudflare Workers AI and Vectorize for semantic search.

## Commands

```bash
pnpm install    # Install dependencies
pnpm run dev     # Start dev server (http://localhost:5173)
pnpm run build   # Production build
pnpm run deploy  # Build and deploy to Cloudflare Workers
pnpm run typecheck  # Generate types and run TypeScript checks
pnpm test        # Run tests
```

### Vectorize (separate worker)

```bash
pnpm run vectorize:dev      # Run vectorize worker locally (requires --remote)
pnpm run vectorize:deploy   # Deploy vectorize worker
pnpm run vectorize:populate  # Populate vector index (requires VECTORIZE_ADMIN_KEY)
```

## Environment

- **VECTORIZE_ADMIN_KEY** (secret): Required to call `/api/populate-vectorize`. Set via `wrangler secret put VECTORIZE_ADMIN_KEY`.
- **OPENAI_API_KEY** (secret, optional): For alternate AI backends if configured.

## Architecture

- **Framework**: React Router v7 with SSR
- **Styling**: Tailwind CSS v4
- **Deployment**: Cloudflare Workers (static assets + server)
- **AI**: Workers AI (embeddings + LLM), Vectorize (semantic search), KV (resume data)

See [CLAUDE.md](CLAUDE.md) for detailed architecture notes.
