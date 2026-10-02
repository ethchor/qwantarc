import { getCollection, type CollectionEntry } from 'astro:content';

export type QigPage = CollectionEntry<'qig'>;
export type SectionId = QigPage['data']['section'];

export const QIG_BASE = '/design/qig';
export const QIG_NAME = 'Qwantarc Interface Guidelines';
export const BRAND_URL = 'https://qwantarc.com';
/** The edition date shown in every page's change log. */
export const FIRST_PUBLISHED = 'April 1, 2025';

export interface Section {
  id: SectionId;
  title: string;
  summary: string;
  /** Two stops for the section's artwork. */
  colors: [string, string];
  /** Sort pages by `order` (true) or by title. */
  ordered: boolean;
}

export const SECTIONS: Section[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    summary: 'The principles and rules underneath every screen, and how to build one from the ground up.',
    colors: ['#1e6ef4', '#5ac8fa'],
    ordered: true,
  },
  {
    id: 'foundations',
    title: 'Foundations',
    summary: 'Colour, type, layout, materials, motion, icons, accessibility, privacy and writing: what every screen shares.',
    colors: ['#564ade', '#bf5af2'],
    ordered: false,
  },
  {
    id: 'patterns',
    title: 'Patterns',
    summary: 'Layouts and flows that repeat across products, from entering data to undoing a mistake.',
    colors: ['#008198', '#30d158'],
    ordered: false,
  },
  {
    id: 'components',
    title: 'Components',
    summary: 'Every control and view: when to use it, when not to, and the rules it follows.',
    colors: ['#c55300', '#ffcc00'],
    ordered: true,
  },
  {
    id: 'resources',
    title: 'Resources',
    summary: 'Every design value, the review checklist and a record of what changed.',
    colors: ['#3a3a3c', '#8e8e93'],
    ordered: true,
  },
];

export const sectionById = (id: SectionId) => SECTIONS.find((s) => s.id === id)!;

export const pageUrl = (id: string) => `${QIG_BASE}/${id}`;

export interface NavGroup {
  title: string | null;
  pages: QigPage[];
}

export interface NavSection extends Section {
  /** Two-digit section number, "01" to "05". */
  num: string;
  groups: NavGroup[];
  pages: QigPage[];
}

const byTitle = (a: QigPage, b: QigPage) => a.data.title.localeCompare(b.data.title);
const byOrder = (a: QigPage, b: QigPage) => a.data.order - b.data.order || byTitle(a, b);

/** Every section with its pages in sidebar order (components grouped by kind). */
export async function getNav(): Promise<NavSection[]> {
  const all = await getCollection('qig');
  return SECTIONS.map((section, index) => {
    const num = String(index + 1).padStart(2, '0');
    const pages = all.filter((p) => p.data.section === section.id).sort(section.ordered ? byOrder : byTitle);
    if (section.id !== 'components') return { ...section, num, pages, groups: [{ title: null, pages }] };
    const groups: NavGroup[] = [];
    for (const page of pages) {
      const title = page.data.group ?? 'Other';
      let group = groups.find((g) => g.title === title);
      if (!group) groups.push((group = { title, pages: [] }));
      group.pages.push(page);
    }
    for (const group of groups) group.pages.sort(byTitle);
    return { ...section, num, groups, pages: groups.flatMap((g) => g.pages) };
  });
}

/** Small, stable hash for the generated artwork. */
export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
