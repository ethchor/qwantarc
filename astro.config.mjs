// @ts-check
import { defineConfig } from 'astro/config';

// One static build serves both hosts: qwantarc.com (the brand site, `/`) and
// developer.qwantarc.com (`/design/**`). vercel.json redirects between them by host.
export default defineConfig({
  site: 'https://developer.qwantarc.com',
  trailingSlash: 'ignore',
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: false,
    },
  },
});
