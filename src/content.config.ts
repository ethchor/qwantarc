import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** QIG pages, one Markdown file each, in a folder per section. */
const qig = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/qig',
    generateId: ({ entry }) => entry.replace(/^.*\//, '').replace(/\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    summary: z.string().optional(),
    section: z.enum(['getting-started', 'foundations', 'patterns', 'components', 'resources']),
    group: z.string().optional(),
    order: z.number().default(0),
  }),
});

export const collections = { qig };
