import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Vitest still runs on its own Vite 5 (its peer range excludes Vite 8), so the
// native resolve.tsconfigPaths option used in vite.config.ts is not available
// here. The tsconfig defines a single alias; mirror it directly.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'build', '.react-router'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'build/',
        '.react-router/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types.ts',
      ],
    },
  },
});
