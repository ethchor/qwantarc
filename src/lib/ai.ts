import { getNav, QIG_NAME, type NavSection, type QigPage } from './qig';

/** Where each host lives in production. */
export const DEVELOPER_ORIGIN = 'https://developer.qwantarc.com';
export const BRAND_ORIGIN = 'https://qwantarc.com';
export const MCP_URL = 'https://mcp.qwantarc.com/mcp';

/** One searchable entry, shared by the site guide, the MCP server and llms.txt. */
export interface IndexEntry {
  path: string;
  url: string;
  title: string;
  kind: 'brand' | 'section' | 'page';
  section?: string;
  group?: string;
  summary: string;
  /** Plain text of the page, for retrieval. */
  text: string;
  /** The page as Markdown, when it has a Markdown twin. */
  markdown?: string;
}

/** Markdown to plain text, good enough for search and short context windows. */
export function toPlain(md: string): string {
  return md
    .replace(/<[^>]+>/g, ' ')
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*/g, ''))
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*\|?\s*-{3,}.*$/gm, '')
    .replace(/\|/g, ' · ')
    .replace(/[*_`#>]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/** Rewrites site-relative links to absolute ones, so the Markdown stands on its own. */
const absolutize = (md: string) =>
  md
    .replace(/<h2 id="[^"]*">(.*?)<\/h2>/g, '## $1')
    .replace(/\]\((\/[^)\s]*)\)/g, `](${DEVELOPER_ORIGIN}$1)`);

export function pageMarkdown(page: QigPage, section: NavSection): string {
  const url = `${DEVELOPER_ORIGIN}/design/qig/${page.id}`;
  return [
    `# ${page.data.title}`,
    '',
    `> ${QIG_NAME} · ${section.title}${page.data.group ? ` · ${page.data.group}` : ''}`,
    `> Source: ${url}`,
    '',
    ...(page.data.summary ? [absolutize(page.data.summary), ''] : []),
    absolutize((page.body ?? '').trim()),
    '',
  ].join('\n');
}

const BRAND_PAGES: IndexEntry[] = [
  {
    path: '/',
    url: `${BRAND_ORIGIN}/`,
    title: 'Qwantarc',
    kind: 'brand',
    summary: 'Everything we build, from cognition to comfort, follows the intelligent arc.',
    text: [
      'Qwantarc builds software along one arc, from cognition to comfort.',
      'Cognition: it begins with understanding. Systems that notice, learn and think a step ahead, so people don’t have to.',
      'Craft: then the making. Every detail considered, every motion earned, nothing added for show.',
      'Comfort: and it ends in ease. Technology that feels like it was always there, quiet until it’s needed.',
      'Every Qwantarc product follows one design system, Qwantarc Interface Guidelines (QIG).',
    ].join('\n'),
  },
  {
    path: '/contact',
    url: `${BRAND_ORIGIN}/contact`,
    title: 'Contact Qwantarc',
    kind: 'brand',
    summary: 'Start an enquiry about partnerships, products, careers or press, or write to vimu@qwantarc.com.',
    text: 'Get in touch with Qwantarc. The enquiry form on the contact page takes a topic (partnership, product, careers, press or something else), your name, email, optional company and a message, and sends it straight to the team. Every message is read by a person. You can also write to vimu@qwantarc.com.',
  },
];

/** Every page a person or an agent might be pointed to. */
export async function buildIndex(): Promise<IndexEntry[]> {
  const nav = await getNav();
  const entries: IndexEntry[] = [
    ...BRAND_PAGES,
    {
      path: '/design/qig',
      url: `${DEVELOPER_ORIGIN}/design/qig`,
      title: QIG_NAME,
      kind: 'section',
      summary:
        'How Qwantarc designs software: principles, foundations, patterns and components, on any platform and in any technology.',
      text: nav.map((s) => `${s.title}: ${s.summary}`).join('\n'),
    },
  ];
  for (const section of nav) {
    entries.push({
      path: `/design/qig/${section.id}`,
      url: `${DEVELOPER_ORIGIN}/design/qig/${section.id}`,
      title: section.title,
      kind: 'section',
      section: section.title,
      summary: section.summary,
      text: section.pages.map((p) => `${p.data.title}: ${p.data.summary ?? ''}`).join('\n'),
    });
    for (const page of section.pages) {
      entries.push({
        path: `/design/qig/${page.id}`,
        url: `${DEVELOPER_ORIGIN}/design/qig/${page.id}`,
        title: page.data.title,
        kind: 'page',
        section: section.title,
        group: page.data.group,
        summary: toPlain(page.data.summary ?? ''),
        text: toPlain(page.body ?? ''),
        markdown: pageMarkdown(page, section),
      });
    }
  }
  return entries;
}
