import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules/**', 'node_modules.bak/**', '.direnv/**'],
  },
});
