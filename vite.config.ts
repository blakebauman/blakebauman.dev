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
