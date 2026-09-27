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

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { SITE_URL } from '../src/data/origin.mjs';
import { readCollection } from './lib/content.mjs';
import { collections, staticRoutes as pageRoutes } from './lib/routes.mjs';

const today = new Date().toISOString().slice(0, 10);

/** A YAML date or string as YYYY-MM-DD, or ''. */
const day = (v) => {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
};

// All three statuses, with the status named: an inventory that hides a
// scheduled post answers "does this exist?" wrong on the one day it matters
// (scripts/lib/content.mjs § who wants what).
const inventory = [];
for (const coll of Object.keys(collections())) {
  const rows = readCollection(coll, { include: 'all' }).map((e) => ({
    slug: e.slug,
    path: e.file,
    route: e.route,
    title: typeof e.data.title === 'string' ? e.data.title : '',
    published: day(e.data.published),
    updated: day(e.data.updated),
    status: e.status,
    draft: e.status === 'draft',
    words: (e.body.match(/[A-Za-z’']+/g) ?? []).length,
    outLinks: (e.body.match(/\]\(\/[a-z]/g) ?? []).length,
  }));
  rows.sort((a, b) => (b.published || '').localeCompare(a.published || ''));
  inventory.push({ coll, rows });
}

const staticPages = Object.entries(pageRoutes()).map(([route, path]) => ({ route, path }));
// Author pages are real indexable pages with a real permalink, rendered from a
// dynamic route: the walk above cannot see them, so /author/<slug> was missing
// from the one document that answers "what does this site have".
{
  const { authors } = JSON.parse(readFileSync('src/data/authors.json', 'utf8'));
  for (const a of authors ?? []) {
    staticPages.push({ route: `/author/${a.slug}`, path: 'src/pages/author/[...slug].astro' });
  }
}
staticPages.sort((a, b) => a.route.localeCompare(b.route));

const out = [];
out.push('# Content inventory');
out.push('');
out.push(`Generated ${today} by \`npm run inventory\` — do not hand-edit; regenerate instead.`);
out.push('Check this before pitching anything new: new pieces extend clusters, they do not');
out.push('duplicate them. Live URLs are permalinks; a scheduled piece goes live on the first');
out.push('build after its date, and a draft renders nowhere until it flips.');
out.push('');
const totalWords = inventory.flatMap((c) => c.rows).reduce((s, r) => s + r.words, 0);
const totalLive = inventory.flatMap((c) => c.rows).filter((r) => r.status === 'published').length;
out.push('| Surface | Pieces | Words (approx) |');
out.push('|---|---|---|');
for (const { coll, rows } of inventory) {
  const live = rows.filter((r) => r.status === 'published');
  const queued = rows.filter((r) => r.status === 'scheduled').length;
  const drafts = rows.filter((r) => r.status === 'draft').length;
  const extra = [queued ? `+${queued} scheduled` : '', drafts ? `+${drafts} draft` : ''].filter(Boolean).join(', ');
  out.push(`| ${coll} | ${live.length}${extra ? ` (${extra})` : ''} | ${live.reduce((s, r) => s + r.words, 0).toLocaleString('en-US')} |`);
}
out.push(`| static pages | ${staticPages.length} | — |`);
out.push(`| **total** | **${totalLive + staticPages.length}** | **${totalWords.toLocaleString('en-US')}** |`);

for (const { coll, rows } of inventory) {
  out.push('');
  out.push(`## ${coll}`);
  out.push('');
  out.push('| Title | Permalink | Source | Status | Published | Updated | Words | Out-links |');
  out.push('|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    const link = r.status === 'published' ? `${SITE_URL}${r.route}` : `_(${r.status})_ \`${r.route}\``;
    out.push(`| ${r.title.replace(/\|/g, '\\|')} | ${link} | \`${r.path}\` | ${r.status} | ${r.published || '—'} | ${r.updated || '—'} | ${r.words} | ${r.outLinks} |`);
  }
}

out.push('');
out.push('## Static pages');
out.push('');
out.push('| Permalink | Source |');
out.push('|---|---|');
for (const p of staticPages) out.push(`| ${SITE_URL}${p.route === '/' ? '' : p.route} | \`${p.path}\` |`);
out.push('');

const OUT = 'marketing/content-inventory.md';
const rendered = out.join('\n');

// --check: fail when the committed inventory no longer matches the repo,
// ignoring the volatile "Generated <date>" line — so any content change that
// forgets `npm run inventory` is caught at the fast tier instead of the
// inventory quietly answering "does this exist?" wrong until the next
// cadence run.
const stripDate = (t) => t.replace(/^Generated \d{4}-\d{2}-\d{2} /m, 'Generated ');
if (process.argv.includes('--check')) {
  let committed = '';
  try {
    committed = readFileSync(OUT, 'utf8');
  } catch {
    console.log(`FAIL: ${OUT} does not exist — run \`npm run inventory\` and commit it.`);
    process.exit(1);
  }
  if (stripDate(committed) !== stripDate(rendered)) {
    console.log(`FAIL: ${OUT} is stale — content changed without regenerating. Run \`npm run inventory\` and commit the result.`);
    process.exit(1);
  }
  console.log(`ok: ${OUT} matches the repo.`);
  process.exit(0);
}

mkdirSync('marketing', { recursive: true });
writeFileSync(OUT, rendered);
console.log(`${OUT}: ${totalLive} live pieces + ${staticPages.length} static pages, ${totalWords.toLocaleString('en-US')} words.`);
