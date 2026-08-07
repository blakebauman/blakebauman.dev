import { reactRouter } from '@react-router/dev/vite';
import { cloudflareDevProxy } from '@react-router/dev/vite/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import type { AppLoadContext } from 'react-router';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// The Cloudflare dev proxy is only needed for `react-router dev` (it provides live
// bindings via wrangler's getPlatformProxy). During `react-router build` it would try
// to start an authenticated remote wrangler session — which fails in CI where no
// Cloudflare credentials exist — so gate it on the actual CLI command being `dev`.
const isDevServer = process.argv.some(arg => arg === 'dev' || arg.endsWith('/dev'));

// getPlatformProxy opens a remote proxy session unconditionally unless
// `remoteBindings` is explicitly false; it does not check whether any binding
// actually needs one. That session is currently rejected by Cloudflare with
// error 1031 ("Invalid Workers Preview configuration") on the account's
// workers.dev preview subdomain, which kills the dev server before it binds a
// port. Defaulting to local bindings keeps `pnpm run dev` usable for everything
// except the chatbot: AI and Vectorize have no local implementation, so
// /api/chat returns "Binding AI needs to be run remotely". Run
// `REMOTE_BINDINGS=true pnpm run dev` for the full stack once preview URLs work.
const useRemoteBindings = process.env.REMOTE_BINDINGS === 'true';

export default defineConfig(({ isSsrBuild }) => ({
  build: {
    rollupOptions: isSsrBuild
      ? {
          input: './workers/app.ts',
        }
      : undefined,
  },
  plugins: [
    ...(isDevServer
      ? [
          cloudflareDevProxy({
            remoteBindings: useRemoteBindings,
            getLoadContext({ context }) {
              return { cloudflare: context.cloudflare } as unknown as AppLoadContext;
            },
          }),
        ]
      : []),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ],
}));
