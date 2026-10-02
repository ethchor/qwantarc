// @ts-check
import { defineConfig } from 'astro/config';

// One static build serves both hosts: qwantarc.com (the brand site, `/`) and
// developer.qwantarc.com (`/design/qig/**`). vercel.json redirects between them by host.
export default defineConfig({
  site: 'https://developer.qwantarc.com',
  trailingSlash: 'ignore',
  markdown: {
    shikiConfig: { theme: 'vesper', wrap: false },
  },
});
