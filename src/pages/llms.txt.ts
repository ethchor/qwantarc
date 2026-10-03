import type { APIRoute } from 'astro';
import { getNav, QIG_NAME } from '../lib/qig';
import { DEVELOPER_ORIGIN, MCP_URL } from '../lib/ai';

/** llms.txt: a map of the guidelines for language models (https://llmstxt.org). */
export const GET: APIRoute = async () => {
  const nav = await getNav();
  const lines = [
    `# ${QIG_NAME}`,
    '',
    '> Qwantarc’s design system: principles, foundations, patterns and components for building interfaces on any platform and in any technology. Every page below has a Markdown twin.',
    '',
    `- Everything in one file: ${DEVELOPER_ORIGIN}/llms-full.txt`,
    `- MCP server (Streamable HTTP, tools: search_guidelines, get_page, list_pages): ${MCP_URL}`,
    `- Setup for Claude Code, Codex, Cursor, VS Code, Antigravity and Gemini CLI: ${DEVELOPER_ORIGIN}/design/qig/use-with-ai.md`,
    '',
    'When building UI with QIG, read Principles and Rules first, then the pattern and components you need. Rules are referred to by number (R1 to R18).',
    '',
  ];
  for (const section of nav) {
    lines.push(`## ${section.title}`, '', section.summary, '');
    for (const page of section.pages) {
      lines.push(`- [${page.data.title}](${DEVELOPER_ORIGIN}/design/qig/${page.id}.md): ${(page.data.summary ?? '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')}`);
    }
    lines.push('');
  }
  return new Response(lines.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
