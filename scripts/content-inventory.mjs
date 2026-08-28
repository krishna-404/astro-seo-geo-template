#!/usr/bin/env node
/**
 * content-inventory.mjs — writes marketing/content-inventory.md: everything
 * the site has, one generated document.
 *
 * Why generated and not compiled by hand: the ancestor writer-pack shipped a
 * hand-compiled 263-URL inventory that was stale by its own admission within
 * weeks. An inventory exists to answer "does this already exist?" before
 * anything new is pitched — a stale one answers wrong, silently. This one is
 * re-written by `npm run inventory` (the /content-cadence skill runs it every
 * cycle) and can never disagree with the repo, because the repo is its input.
 *
 * It serves two readers at once:
 *   - a human (or agent) about to pitch or write: counts, clusters, word
 *     counts, and the permalink of every live piece so duplication is
 *     checkable in one file;
 *   - any LLM navigating the repo: routes ↔ source paths ↔ titles in one
 *     table, the map llms.txt gives site visitors, but for the repository.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SITE_URL } from '../src/data/origin.mjs';

const ROUTE_DIR = {}; // collection name → route dir, where they differ
const today = new Date().toISOString().slice(0, 10);

const fmField = (fm, key) => {
  const m = fm.match(new RegExp(`^${key}:\\s*(['"]?)([\\s\\S]*?)\\1\\s*$`, 'm'));
  if (!m) return '';
  // YAML escapes a quote inside a single-quoted scalar by doubling it.
  return m[1] === "'" ? m[2].replace(/''/g, "'") : m[2];
};

const collections = [];
for (const dir of readdirSync('src/content', { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const coll = dir.name;
  const rows = [];
  for (const f of readdirSync(join('src/content', coll)).filter((n) => /\.mdx?$/.test(n))) {
    const p = join('src/content', coll, f);
    const raw = readFileSync(p, 'utf8');
    const fm = raw.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? '';
    const body = raw.replace(/^---\n[\s\S]*?\n---\n/, '');
    rows.push({
      slug: f.replace(/\.mdx?$/, ''),
      path: p,
      route: `/${ROUTE_DIR[coll] ?? coll}/${f.replace(/\.mdx?$/, '')}`,
      title: fmField(fm, 'title'),
      published: fmField(fm, 'published'),
      updated: fmField(fm, 'updated'),
      draft: /^draft:\s*true$/m.test(raw),
      words: (body.match(/[A-Za-z’']+/g) ?? []).length,
      outLinks: (body.match(/\]\(\/[a-z]/g) ?? []).length,
    });
  }
  rows.sort((a, b) => (b.published || '').localeCompare(a.published || ''));
  collections.push({ coll, rows });
}

const staticPages = [];
(function walk(dir, prefix) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(join(dir, e.name), `${prefix}/${e.name}`);
    else if (e.name.endsWith('.astro') && !e.name.includes('[')) {
      const base = e.name.replace(/\.astro$/, '');
      staticPages.push({ route: base === 'index' ? prefix || '/' : `${prefix}/${base}`, path: join(dir, e.name) });
    }
  }
})('src/pages', '');
staticPages.sort((a, b) => a.route.localeCompare(b.route));

const out = [];
out.push('# Content inventory');
out.push('');
out.push(`Generated ${today} by \`npm run inventory\` — do not hand-edit; regenerate instead.`);
out.push('Check this before pitching anything new: new pieces extend clusters, they do not');
out.push('duplicate them. Live URLs are permalinks; drafts render nowhere yet.');
out.push('');
const totalWords = collections.flatMap((c) => c.rows).reduce((s, r) => s + r.words, 0);
const totalLive = collections.flatMap((c) => c.rows).filter((r) => !r.draft).length;
out.push('| Surface | Pieces | Words (approx) |');
out.push('|---|---|---|');
for (const { coll, rows } of collections) {
  const live = rows.filter((r) => !r.draft);
  out.push(`| ${coll} | ${live.length}${rows.length > live.length ? ` (+${rows.length - live.length} draft)` : ''} | ${live.reduce((s, r) => s + r.words, 0).toLocaleString('en-US')} |`);
}
out.push(`| static pages | ${staticPages.length} | — |`);
out.push(`| **total** | **${totalLive + staticPages.length}** | **${totalWords.toLocaleString('en-US')}** |`);

for (const { coll, rows } of collections) {
  out.push('');
  out.push(`## ${coll}`);
  out.push('');
  out.push('| Title | Permalink | Source | Published | Updated | Words | Out-links |');
  out.push('|---|---|---|---|---|---|---|');
  for (const r of rows) {
    const link = r.draft ? `_(draft)_ \`${r.route}\`` : `${SITE_URL}${r.route}`;
    out.push(`| ${r.title.replace(/\|/g, '\\|')} | ${link} | \`${r.path}\` | ${r.published || '—'} | ${r.updated || '—'} | ${r.words} | ${r.outLinks} |`);
  }
}

out.push('');
out.push('## Static pages');
out.push('');
out.push('| Permalink | Source |');
out.push('|---|---|');
for (const p of staticPages) out.push(`| ${SITE_URL}${p.route === '/' ? '' : p.route} | \`${p.path}\` |`);
out.push('');

mkdirSync('marketing', { recursive: true });
writeFileSync('marketing/content-inventory.md', out.join('\n'));
console.log(`marketing/content-inventory.md: ${totalLive} live pieces + ${staticPages.length} static pages, ${totalWords.toLocaleString('en-US')} words.`);
