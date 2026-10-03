/** Loads the site index (live, or the bundled snapshot). The search itself is shared with the site. */
import snapshot from './snapshot.json';
import type { Entry } from '../../../src/lib/search';

export { search, terms, type Entry, type Hit } from '../../../src/lib/search';

interface Data {
  entries: Entry[];
  markdown: Record<string, string>;
}

const TTL = 10 * 60 * 1000;
let cached: { at: number; entries: Entry[] } | null = null;

/** The live index from the site (cached for ten minutes), or the bundled snapshot. */
export async function loadEntries(site: string): Promise<Entry[]> {
  if (cached && Date.now() - cached.at < TTL) return cached.entries;
  try {
    const res = await fetch(`${site}/ai/index.json`, { cf: { cacheTtl: 600 } });
    if (res.ok) {
      const body = (await res.json()) as { entries: Entry[] };
      cached = { at: Date.now(), entries: body.entries };
      return body.entries;
    }
  } catch {
    // fall through to the snapshot
  }
  return (snapshot as Data).entries;
}

/** A page's Markdown, live when possible. */
export async function loadMarkdown(site: string, slug: string): Promise<string | null> {
  try {
    const res = await fetch(`${site}/design/qig/${slug}.md`, { cf: { cacheTtl: 600 } });
    if (res.ok && (res.headers.get('content-type') ?? '').includes('markdown')) return await res.text();
  } catch {
    // fall through
  }
  return (snapshot as Data).markdown[slug] ?? null;
}

