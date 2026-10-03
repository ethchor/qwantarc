import type { APIRoute } from 'astro';
import { buildIndex } from '../../lib/ai';

/** The site index the guide and the MCP server search. Markdown stays in the .md twins to keep this small. */
export const GET: APIRoute = async () => {
  const entries = (await buildIndex()).map(({ markdown: _markdown, ...entry }) => entry);
  return new Response(JSON.stringify({ version: 1, generated: new Date().toISOString(), entries }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
