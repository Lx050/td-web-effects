import { defineConfig } from 'vite';

export default defineConfig({
  // Set base to repo name for GitHub Pages, e.g. '/td-web-effects/'
  // Leave as '/' for custom domain or local dev
  base: process.env.GITHUB_ACTIONS ? '/td-web-effects/' : '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        particles: 'particles.html',
        ink: 'ink.html',
      },
    },
  },
});
