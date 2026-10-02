import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Las interfaces solo declaran tipos: al compilar no generan código ejecutable
      exclude: ['src/interfaces/**'],
      reporter: ['text', 'html'],
      thresholds: { lines: 90 },
    },
  },
});
