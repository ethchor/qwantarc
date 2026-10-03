/**
 * qwantarc-ai
 *  - POST qwantarc.com/api/ask   The site guide's cloud engine: answers grounded in the site index, streamed.
 *  - POST mcp.qwantarc.com/mcp   The QIG MCP server (Streamable HTTP, stateless, read-only tools).
 */
import { loadEntries, loadMarkdown, search, type Entry } from './search';

interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}
interface Env {
  AI: {
    run(model: string, input: Record<string, unknown>): Promise<ReadableStream | Record<string, unknown>>;
  };
  ASK_LIMIT: RateLimiter;
  MCP_LIMIT: RateLimiter;
  SITE: string;
  MODEL: string;
  ALLOWED_ORIGINS: string;
}

const ip = (request: Request) => request.headers.get('cf-connecting-ip') ?? 'unknown';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.hostname === 'mcp.qwantarc.com' || url.pathname === '/mcp') return mcp(request, env, url);
    if (url.pathname === '/api/ask') return ask(request, env);
    return new Response('Not found', { status: 404 });
  },
};

/* ---------------------------------------------------------------------------------------------- */
/* The site guide                                                                                  */
/* ---------------------------------------------------------------------------------------------- */

const GUIDE_PROMPT = `You are the guide on Qwantarc's websites: qwantarc.com (the company) and developer.qwantarc.com (Qwantarc Interface Guidelines, QIG, Qwantarc's design system).
Help people find their way and answer questions about Qwantarc and QIG.
- Answer in one to three short sentences of plain text. No headings, no lists, no Markdown.
- Answer from the context below; it is the site's own content, so use it confidently. Only if it truly doesn't cover the question, say so and point to the closest page.
- When a page would help, add up to three lines at the very end, each exactly: GO: <path> using paths that appear in the context. Never invent paths.
- For getting in touch, point to /contact (an enquiry form) or vimu@qwantarc.com.
- Don't ask for personal details. Be calm, specific and brief.`;

function cors(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('origin') ?? '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  return allowed.includes(origin) ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {};
}

function contextFor(entries: Entry[], query: string): string {
  const hits = search(entries, query, 4);
  const pages = hits.length ? hits.map((h) => h.entry) : entries.filter((e) => e.path === '/' || e.path === '/design/qig');
  return pages
    .map((e) => {
      const hit = hits.find((h) => h.entry === e);
      return `[${e.path}] ${e.title}: ${e.summary}\n${(hit?.excerpt ?? e.text).slice(0, 600)}`;
    })
    .join('\n\n');
}

/** Reduces Workers AI's event stream to `data: {"t":"…"}` events and a final `data: [DONE]`. */
function textOnly(): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';
  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const j = JSON.parse(data) as { response?: string; choices?: { delta?: { content?: string } }[] };
          const t = j.choices?.[0]?.delta?.content ?? j.response ?? '';
          if (t) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t })}\n\n`));
        } catch {
          // ignore partial or unknown events
        }
      }
    },
    flush(controller) {
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
    },
  });
}

async function ask(request: Request, env: Env): Promise<Response> {
  const headers = cors(request, env);
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { ...headers, 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type' },
    });
  }
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405, headers });
  if (!headers['access-control-allow-origin']) return Response.json({ error: 'Not allowed from this site.' }, { status: 403 });
  if (!(await env.ASK_LIMIT.limit({ key: ip(request) })).success) {
    return Response.json({ error: 'Too many questions at once. Try again in a minute.' }, { status: 429, headers });
  }

  let body: { messages?: { role: string; content: string }[]; page?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Couldn’t read the question.' }, { status: 400, headers });
  }
  const messages = (body.messages ?? [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-6)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 800) }));
  const last = [...messages].reverse().find((m) => m.role === 'user');
  if (!last) return Response.json({ error: 'Ask a question first.' }, { status: 422, headers });

  const entries = await loadEntries(env.SITE);
  // Search with the latest question; borrow the previous one only for short follow-ups ("and on mobile?").
  const users = messages.filter((m) => m.role === 'user').map((m) => m.content);
  const latest = users[users.length - 1];
  const query = latest.split(/\s+/).length < 4 && users.length > 1 ? `${users[users.length - 2]} ${latest}` : latest;
  const page = typeof body.page === 'string' ? body.page.slice(0, 120) : '/';
  const system = `${GUIDE_PROMPT}\n\nThe person is on: ${page}\n\nContext:\n${contextFor(entries, query)}`;

  try {
    const stream = await env.AI.run(env.MODEL, {
      messages: [{ role: 'system', content: system }, ...messages],
      stream: true,
      max_tokens: 360,
      temperature: 0.3,
    });
    return new Response((stream as ReadableStream).pipeThrough(textOnly()), {
      headers: { ...headers, 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store' },
    });
  } catch (err) {
    console.error('ask failed', err);
    return Response.json({ error: 'The guide is resting. Try again later.' }, { status: 503, headers });
  }
}

/* ---------------------------------------------------------------------------------------------- */
/* MCP server                                                                                      */
/* ---------------------------------------------------------------------------------------------- */

const VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const MCP_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, GET, OPTIONS, DELETE',
  'access-control-allow-headers': 'content-type, accept, authorization, mcp-session-id, mcp-protocol-version, last-event-id',
  'access-control-expose-headers': 'mcp-session-id',
};

const INSTRUCTIONS = `Qwantarc Interface Guidelines (QIG) is a design system for building interfaces on any platform.
Before building UI: read "principles" and "rules" with get_page, then search_guidelines for the screen's pattern and the components it needs.
Rules are cited by number (R1 to R18). Every page is also at https://developer.qwantarc.com/design/qig/<slug>.md.`;

const TOOLS = [
  {
    name: 'search_guidelines',
    title: 'Search QIG',
    description:
      'Search Qwantarc Interface Guidelines for pages that answer a question, such as "destructive button", "empty state" or "dark mode colours". Returns titles, slugs, summaries and excerpts.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What you want to know or build.' },
        limit: { type: 'integer', minimum: 1, maximum: 10, description: 'How many pages to return (default 5).' },
      },
      required: ['query'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_page',
    title: 'Read a QIG page',
    description: 'Get one page of the guidelines as Markdown by its slug, such as "buttons", "rules", "colour" or "editing-records".',
    inputSchema: {
      type: 'object',
      properties: { slug: { type: 'string', description: 'The page slug, the last part of its address.' } },
      required: ['slug'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'list_pages',
    title: 'List QIG pages',
    description: 'List every page of the guidelines with its slug and summary, optionally for one section: Getting started, Foundations, Patterns, Components or Resources.',
    inputSchema: {
      type: 'object',
      properties: { section: { type: 'string', description: 'Optional section name.' } },
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

/** Edit distance, for "did you mean" on slugs. */
function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

type Rpc = { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: Record<string, unknown> };

const slugOf = (e: Entry) => e.path.split('/').pop() ?? '';
const text = (t: string, isError = false) => ({ content: [{ type: 'text', text: t }], ...(isError ? { isError: true } : {}) });

async function callTool(name: string, args: Record<string, unknown>, env: Env) {
  const entries = (await loadEntries(env.SITE)).filter((e) => e.kind === 'page');
  if (name === 'search_guidelines') {
    const query = String(args.query ?? '').slice(0, 300);
    const limit = Math.min(10, Math.max(1, Number(args.limit) || 5));
    const hits = search(entries, query, limit);
    if (!hits.length) return text(`No pages matched "${query}". Try list_pages to browse, or other words.`);
    return text(
      hits
        .map(
          (h, i) =>
            `${i + 1}. ${h.entry.title} (slug: ${slugOf(h.entry)}, ${h.entry.section}${h.entry.group ? ` / ${h.entry.group}` : ''})\n   ${h.entry.summary}\n   Excerpt: ${h.excerpt}\n   ${h.entry.url}`,
        )
        .join('\n\n') + '\n\nRead a page in full with get_page.',
    );
  }
  if (name === 'get_page') {
    const slug = String(args.slug ?? '')
      .toLowerCase()
      .replace(/^.*\/design\/qig\//, '')
      .replace(/\.md$/, '')
      .replace(/[^a-z0-9-]/g, '');
    const md = slug ? await loadMarkdown(env.SITE, slug) : null;
    if (md) return text(md);
    const near = [
      ...new Set([
        ...entries.map(slugOf).filter((s) => slug && distance(s, slug) <= 2),
        ...search(entries, slug.replace(/-/g, ' '), 3).map((h) => slugOf(h.entry)),
      ]),
    ].slice(0, 3);
    return text(`No page "${slug}".${near.length ? ` Did you mean: ${near.join(', ')}?` : ''}`, true);
  }
  if (name === 'list_pages') {
    const section = String(args.section ?? '').toLowerCase();
    const list = entries.filter((e) => !section || (e.section ?? '').toLowerCase().includes(section));
    if (!list.length) return text(`No section matches "${args.section}". Sections: Getting started, Foundations, Patterns, Components, Resources.`, true);
    const bySection = new Map<string, Entry[]>();
    for (const e of list) bySection.set(e.section ?? 'Other', [...(bySection.get(e.section ?? 'Other') ?? []), e]);
    return text(
      [...bySection]
        .map(([s, items]) => `## ${s}\n${items.map((e) => `- ${slugOf(e)}: ${e.title}. ${e.summary}`).join('\n')}`)
        .join('\n\n'),
    );
  }
  return null;
}

async function handleRpc(msg: Rpc, env: Env): Promise<Record<string, unknown> | null> {
  const reply = (result: unknown) => ({ jsonrpc: '2.0', id: msg.id ?? null, result });
  const fail = (code: number, message: string) => ({ jsonrpc: '2.0', id: msg.id ?? null, error: { code, message } });
  if (msg.id === undefined) return null; // notifications need no reply
  switch (msg.method) {
    case 'initialize': {
      const asked = String(msg.params?.protocolVersion ?? '');
      return reply({
        protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'qig', title: 'Qwantarc Interface Guidelines', version: '1.0.0', websiteUrl: 'https://developer.qwantarc.com/design/qig' },
        instructions: INSTRUCTIONS,
      });
    }
    case 'ping':
      return reply({});
    case 'tools/list':
      return reply({ tools: TOOLS });
    case 'tools/call': {
      const name = String(msg.params?.name ?? '');
      const result = await callTool(name, (msg.params?.arguments as Record<string, unknown>) ?? {}, env);
      return result ? reply(result) : fail(-32602, `Unknown tool: ${name}`);
    }
    case 'resources/list':
      return reply({ resources: [] });
    case 'prompts/list':
      return reply({ prompts: [] });
    default:
      return fail(-32601, `Method not found: ${msg.method}`);
  }
}

async function mcp(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: MCP_HEADERS });
  if (url.pathname === '/' && request.method === 'GET') {
    return Response.json(
      {
        name: 'Qwantarc Interface Guidelines (QIG) MCP server',
        endpoint: 'https://mcp.qwantarc.com/mcp',
        transport: 'Streamable HTTP',
        tools: TOOLS.map((t) => t.name),
        setup: 'https://developer.qwantarc.com/design/qig/use-with-ai',
      },
      { headers: MCP_HEADERS },
    );
  }
  if (url.pathname !== '/mcp') return new Response('Not found', { status: 404, headers: MCP_HEADERS });
  if (request.method !== 'POST') {
    // Stateless server: no server-initiated stream and no sessions to delete.
    return new Response(null, { status: 405, headers: { ...MCP_HEADERS, allow: 'POST' } });
  }
  if (!(await env.MCP_LIMIT.limit({ key: ip(request) })).success) {
    return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Rate limited. Try again in a minute.' } }, { status: 429, headers: MCP_HEADERS });
  }
  let payload: Rpc | Rpc[];
  try {
    payload = await request.json();
  } catch {
    return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400, headers: MCP_HEADERS });
  }
  const batch = Array.isArray(payload);
  const replies = (await Promise.all((batch ? payload : [payload]).map((m) => handleRpc(m, env)))).filter(Boolean);
  if (!replies.length) return new Response(null, { status: 202, headers: MCP_HEADERS });
  return Response.json(batch ? replies : replies[0], { headers: { ...MCP_HEADERS, 'content-type': 'application/json' } });
}
