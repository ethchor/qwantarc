/** Keyword search over the site index. Shared by the site guide (in the browser) and the qwantarc-ai Worker. */

export interface Entry {
  path: string;
  url: string;
  title: string;
  kind: 'brand' | 'section' | 'page';
  section?: string;
  group?: string;
  summary: string;
  text: string;
}

const STOP = new Set(
  'a an and are as at be but by can do does for from how i in into is it its me my of on or our show the their them there these this to was we what when where which who why will with you your about tell take go page'.split(
    ' ',
  ),
);
const ALIASES: Record<string, string> = {
  color: 'colour',
  colors: 'colour',
  dark: 'appearance',
  theme: 'appearance',
  font: 'typography',
  fonts: 'typography',
  type: 'typography',
  contact: 'contact',
  email: 'contact',
  enquiry: 'contact',
  modal: 'sheets',
  dialog: 'sheets',
  dropdown: 'pop-up',
  select: 'pop-up',
  toast: 'toasts',
  snackbar: 'toasts',
  tokens: 'values',
  token: 'values',
  agent: 'ai',
  agents: 'ai',
  mcp: 'ai',
  claude: 'ai',
  codex: 'ai',
  principal: 'principle',
  principals: 'principle',
  principles: 'principle',
  delete: 'destructive',
  deleting: 'destructive',
  remove: 'destructive',
  trash: 'destructive',
  destroy: 'destructive',
  undo: 'destructive',
  confirm: 'alert',
  confirmation: 'alert',
  popup: 'popover',
  notification: 'toasts',
  loader: 'spinner',
  loading: 'loading',
  form: 'editing',
  forms: 'editing',
};

export const terms = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => ALIASES[w] ?? w.replace(/(ies)$/, 'y').replace(/(?<!s)s$/, ''));

export interface Hit {
  entry: Entry;
  score: number;
  excerpt: string;
}

/** Scores titles, summaries and text; returns the best entries with a short excerpt around the match. */
export function search(entries: Entry[], query: string, limit = 5): Hit[] {
  const q = [...new Set(terms(query))];
  if (!q.length) return [];
  const docs = entries.map((entry) => ({
    entry,
    title: terms(entry.title + ' ' + entry.path.split('/').pop()),
    summary: terms(entry.summary),
    text: terms(entry.text),
  }));
  const df = (t: string) => docs.filter((d) => d.title.includes(t) || d.summary.includes(t) || d.text.includes(t)).length;
  const dfs = Object.fromEntries(q.map((t) => [t, df(t)]));
  const idf = Object.fromEntries(q.map((t) => [t, Math.log(1 + entries.length / (1 + dfs[t]))]));
  const count = (list: string[], t: string) => list.reduce((n, w) => n + (w === t || (t.length > 3 && w.startsWith(t)) ? 1 : 0), 0);
  // Typos: a long word one or two letters off still matches titles and summaries, at half weight.
  const near = (list: string[], t: string) => (t.length < 6 ? 0 : list.some((w) => w.length >= 5 && Math.abs(w.length - t.length) <= 2 && edits(w, t) <= 2) ? 0.5 : 0);
  return docs
    .map((d) => {
      let score = 0;
      for (const t of q) {
        const exact = 6 * Math.min(count(d.title, t), 2) + 3 * Math.min(count(d.summary, t), 3) + Math.min(count(d.text, t), 6) * 0.6;
        // Only words found nowhere are treated as possible typos.
        score += idf[t] * (exact || (dfs[t] === 0 ? 6 * near(d.title, t) + 3 * near(d.summary, t) : 0));
      }
      if (d.entry.kind === 'section') score *= 0.8;
      return { entry: d.entry, score, excerpt: excerpt(d.entry, q) };
    })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function excerpt(entry: Entry, q: string[]): string {
  const lines = entry.text.split('\n').filter(Boolean);
  const scored = lines.map((line, i) => ({ i, s: q.reduce((n, t) => n + (line.toLowerCase().includes(t) ? 1 : 0), 0) }));
  const best = scored.sort((a, b) => b.s - a.s)[0];
  const start = best && best.s > 0 ? best.i : 0;
  return lines.slice(start, start + 4).join(' ').slice(0, 520);
}

/** Edit distance between two short words. */
function edits(a: string, b: string): number {
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
