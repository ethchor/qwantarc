import type { APIRoute } from 'astro';
import { getNav, QIG_NAME } from '../lib/qig';
import { pageMarkdown } from '../lib/ai';

/** The whole of the guidelines in one Markdown file, for agents that prefer a single read. */
export const GET: APIRoute = async () => {
  const nav = await getNav();
  const parts = [`# ${QIG_NAME}\n\nThe complete guidelines, page by page.\n`];
  for (const section of nav) {
    parts.push(`\n---\n\n# ${section.title}\n\n${section.summary}\n`);
    for (const page of section.pages) parts.push(`\n---\n\n${pageMarkdown(page, section).replace(/^# /, '## ')}`);
  }
  return new Response(parts.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
