#!/usr/bin/env node
/**
 * Bundles the built site index and every page's Markdown into src/snapshot.json, the fallback the
 * Worker uses when it can't reach the live site. Run after `npm run build` in the repo root.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '../../../dist');
const index = JSON.parse(readFileSync(resolve(dist, 'ai/index.json'), 'utf8'));
const markdown = {};
for (const entry of index.entries) {
  const file = resolve(dist, `.${entry.path}.md`);
  if (entry.kind === 'page' && existsSync(file)) markdown[entry.path.split('/').pop()] = readFileSync(file, 'utf8');
}
writeFileSync(resolve(here, '../src/snapshot.json'), JSON.stringify({ entries: index.entries, markdown }));
console.log(`[snapshot] ${index.entries.length} entries, ${Object.keys(markdown).length} pages`);
