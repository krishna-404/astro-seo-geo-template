#!/usr/bin/env node
/**
 * Writes a `.md` twin of every content-collection page into dist/, alongside
 * the `.html` Astro already built there.
 *
 *   node scripts/markdown-twins.mjs
 *
 * Runs AFTER `astro build` — it needs dist/ to exist, if only so a missing
 * dist/ fails loudly instead of writing markdown nobody serves.
 *
 * SCOPE: the two content collections (blog, glossary) only. Their MDX source
 * IS the page body — plain markdown, no JSX, checked in readContent.mjs — so
 * the twin is exact rather than reconstructed. The hand-authored pages
 * (/, /about, /contact) have no equivalent markdown source; a faithful twin
 * for those would mean converting rendered HTML back to markdown, which is a
 * different, lossier mechanism and a separate piece of work. The console
 * summary below states the count this run actually covers, per the
 * no-silent-caps rule — this is a subset of the site, not the whole thing.
 *
 * Each twin carries the same title/tldr/sources a visitor sees on the page
 * itself (the blog and glossary templates both render a "Sources" section
 * from frontmatter — see src/pages/<collection>/[...slug].astro) so the twin
 * is a faithful copy, not a stripped-down one.
 *
 * DELIBERATELY NOT IN TWINS: the TOC, related-links block and prev/next
 * pager the HTML pages render. Twins are the article's source markdown —
 * an agent reading markdown already has the heading structure, and the
 * related/pager blocks are site chrome whose scorer lives in the Astro
 * world; llms.txt gives agents the full page index instead. Decision
 * recorded in CHECKLIST §6/§7 — don't "complete" the twins by duplicating
 * the scorer here.
 */
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCollection } from './lib/readContent.mjs';
import { SITE_URL } from '../src/data/origin.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

if (!existsSync(dist)) {
  console.error('markdown-twins: dist/ does not exist — run `astro build` first');
  process.exit(1);
}

const COLLECTIONS = {
  blog: '/blog',
  glossary: '/glossary',
};

const sourcesSection = (sources) => {
  if (!sources || sources.length === 0) return '';
  const lines = sources.map((s, i) => {
    let line = s.label;
    if (s.url) line += ` — <${s.url}>`;
    if (s.retrieved) line += ` (retrieved ${s.retrieved.slice?.(0, 10) ?? s.retrieved})`;
    return `${i + 1}. ${line}`;
  });
  return `\n\n## Sources\n\n${lines.join('\n')}`;
};

const bylineFor = (data) => {
  if (!data.published) return '';
  const published = String(data.published).slice(0, 10);
  const updated = data.updated ? String(data.updated).slice(0, 10) : null;
  return `\n\n*Published ${published}${updated && updated !== published ? ` · Updated ${updated}` : ''}*`;
};

let written = 0;

for (const [collection, routePrefix] of Object.entries(COLLECTIONS)) {
  for (const entry of readCollection(collection)) {
    const route = `${routePrefix}/${entry.slug}`;
    const canonical = `${SITE_URL}${route}`;

    const md = [
      `# ${entry.data.title}`,
      entry.data.tldr ?? entry.data.description ?? '',
      entry.body,
    ].join('\n\n')
      + bylineFor(entry.data)
      + sourcesSection(entry.data.sources)
      + `\n\n---\nCanonical: ${canonical}\n`;

    const outDir = resolve(dist, routePrefix.replace(/^\//, ''));
    mkdirSync(outDir, { recursive: true });
    writeFileSync(resolve(outDir, `${entry.slug}.md`), md);
    written += 1;
  }
}

console.log(`markdown-twins: ${written} .md twins written to dist/ (blog and glossary only — see file header for scope)`);
