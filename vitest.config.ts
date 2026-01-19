import path from 'node:path';
import {configDefaults, defineConfig} from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@site': path.resolve(__dirname),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    exclude: [...configDefaults.exclude, '**/.worktrees/**'],
    clearMocks: true,
    restoreMocks: true,
  },
});
