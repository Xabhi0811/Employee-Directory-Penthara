import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Vitest configuration for the frontend.
 *
 * A dedicated config (rather than reusing vite.config.js) keeps the production
 * build plugins — terser, brotli/gzip compression — out of the test run, where
 * they add nothing but cost.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    // Stylesheet processing is irrelevant to behaviour and only slows tests down.
    css: false,
    // api.constants.js validates VITE_API_URL at import time and throws if it is
    // missing, so provide it for any test that transitively imports the API layer.
    env: {
      VITE_API_URL: 'http://localhost:5000/api',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx', // app bootstrap, nothing to unit test
        'src/test/**', // the test harness itself
        'src/**/*.test.{js,jsx}',
      ],
    },
  },
});
