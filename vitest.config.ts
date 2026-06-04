import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@geostyler/web-component',
    environment: 'jsdom',
    server: {
      deps: {
        inline: true
      }
    },
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'clover', 'json', 'lcov']
    },
    globals: true
  }
});
