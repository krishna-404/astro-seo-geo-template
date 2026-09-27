#!/usr/bin/env node
/**
 * Writes public/llms.txt and public/llms-full.txt from the same sources the
 * pages themselves render from — facts.json and the content collections — so
 * neither file can say something the site does not. GENERATED: never
 * hand-edit the output files; edit this script (or the sources) and re-run.
 *
 *   node scripts/generate-llms.mjs
 *
 * Runs BEFORE `astro build`, not after: both files land in public/, which
 * Astro copies into dist/ verbatim, so nothing downstream needs to know this
 * step exists.
 *
 * WHY GENERATED. On the site this template came from, llms.txt was
 * hand-maintained: every claim in it was retyped by a person, with nothing
 * checking it stayed in step with the site, and the page list had no
 * mechanism to notice a new collection entry. Generating both from
 * source is the same discipline the sitemap and lastmod.json already get.
 *
 * llms.txt stays an INDEX — title, link, one line each — per the llmstxt.org
 * convention. llms-full.txt is the corpus: every published entry's tldr and
 * full body, for an engine that wants the content itself in one fetch rather
 * than a crawl per page.
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCollection, bodyAsText, leadFigureLine } from './lib/content.mjs';
import { collections } from './lib/routes.mjs';
import { SITE_URL } from '../src/data/origin.mjs';
import brand from '../src/data/brand.json' with { type: 'json' };
import authorsRegistry from '../src/data/authors.json' with { type: 'json' };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const url = (path) => `${SITE_URL}${path}`;

/**
 * ─── EDIT THIS BLOCK FOR YOUR SITE ──────────────────────────────────────────
 * Node cannot import src/data/site.ts (it is TypeScript), so the few strings
 * this file needs live here. Keep them in step with SITE in site.ts — name,
 * tagline and description should read identically in both places. The domain
 * itself comes from origin.mjs, the one shared constant.
 */
// The brand strings from src/data/brand.json — the same file site.ts reads, so
// llms.txt cannot introduce a second name for the company. `brief` rather than
// `description`: this paragraph is written to be lifted whole into an answer,
// where the meta description is written to survive the SERP clamp.
// The founder, from the author registry — the one record (src/data/site.ts §
// FOUNDER_SLUG explains why it moved out of facts.json).
const FOUNDER = authorsRegistry.authors.find((a) => a.slug === 'founder') ?? authorsRegistry.authors[0];

const LLMS = {
  name: brand.name,
  tagline: brand.tagline,
  description: brand.brief,
};

// Collections, routes and labels from src/data/collections.json — the one
// config. A new collection appears in llms.txt the build after its entry
// lands there, with no edit here.
const COLLECTIONS = Object.fromEntries(
  Object.entries(collections()).map(([c, cfg]) => [c, { route: cfg.route, label: cfg.eyebrow }])
);

/**
 * The one or two sentences that tell a machine reader what a collection IS.
 * A collection with no blurb still gets its section and its list — the blurb
 * is the editorial half, and its absence is not a reason to omit the pages.
 */
const BLURB = {
  glossary:
    'Reference definitions. Each entry carries a short definition written to be\n' +
    'quoted, its authorities by name, and a `retrieved` date where a URL was\n' +
    'checked. Where a figure is jurisdiction-specific or unverified, the entry says\n' +
    'so rather than publishing a number.',
  solutions: 'What this company sells, one page per offering: what the customer gets, how it is delivered, and what it costs where a price is published.',
  comparison: 'Head-to-head comparisons. Every cell in every table names its source and the date it was checked.',
};

const entries = Object.fromEntries(
  Object.keys(COLLECTIONS).map((c) => [c, readCollection(c)])
);

// ---------------------------------------------------------------------------
// llms.txt — the index
// ---------------------------------------------------------------------------

const listSection = (key) =>
  entries[key]
    .map((e) => `- [${e.data.title}](${url(`${COLLECTIONS[key].route}/${e.slug}`)})${e.data.description ? `: ${e.data.description}` : ''}`)
    .join('\n');

/**
 * One `## <Label>` section per collection: its blurb where it has one, then
 * its entries. A glossary-shaped collection (entries carry `term`) lists the
 * terms inline — an agent wants the vocabulary, not a link per word; every
 * other collection lists title, URL and description, one per line.
 */
function collectionSections() {
  return Object.keys(COLLECTIONS)
    .map((key) => {
      const cfg = COLLECTIONS[key];
      const list = entries[key];
      const isTerms = list.length > 0 && list.every((e) => e.data.term);
      const body = isTerms
        ? list.map((e) => e.data.term ?? e.data.title).join(' · ')
        : listSection(key);
      const lines = [`## ${cfg.label}`, ''];
      if (BLURB[key]) lines.push(BLURB[key], '');
      lines.push(body || `(no entries published yet)`, '');
      lines.push(`Index: <${url(cfg.route)}>${key === 'blog' ? ` · Feed: <${url('/rss.xml')}>` : ''}`);
      return lines.join('\n');
    })
    .join('\n\n');
}

const llmsTxt = `# ${LLMS.name}

> ${LLMS.tagline}

${LLMS.description}

## The numbers on this site

Every figure published on ${new URL(SITE_URL).host} is sourced in
\`src/data/facts.json\` in the site repository, and this file is generated from
that same source at build time. Nothing is estimated: a figure that cannot be
sourced is not published.

## Pages

- [Home](${url('/')})
- [About](${url('/about')})
- [Contact](${url('/contact')})
- [For LLMs](${url('/for-llms')}): a brand brief for automated readers
- [Full corpus](${url('/llms-full.txt')}): every content page in one file
- [RSS](${url('/rss.xml')})
- [Sitemap](${url('/sitemap-index.xml')})

${collectionSections()}

## Contact

${FOUNDER.name}, ${FOUNDER.title}
LinkedIn: ${FOUNDER.sameAs[0]}

## Note

Only ${new URL(SITE_URL).host} is canonical.
`;

writeFileSync(resolve(root, 'public/llms.txt'), llmsTxt);

// ---------------------------------------------------------------------------
// llms-full.txt — the corpus
// ---------------------------------------------------------------------------

const corpusEntry = (key, e) => {
  const route = `${COLLECTIONS[key].route}/${e.slug}`;
  return [
    `# ${e.data.title}`,
    '',
    [e.data.tldr ?? e.data.description ?? '', leadFigureLine(e.data)].filter(Boolean).join('\n\n'),
    '',
    bodyAsText(e),
    '',
    `Source: ${url(route)}`,
  ].join('\n');
};

const corpusSections = Object.keys(COLLECTIONS).flatMap((key) =>
  entries[key].map((e) => corpusEntry(key, e))
);

const llmsFullTxt = `# ${LLMS.name} — full corpus

> ${LLMS.tagline} This file concatenates every content page
> published on ${new URL(SITE_URL).host}, tldr and full body, for a reader
> that wants the content in one fetch rather than a crawl per page. It is
> generated at build time from the same MDX source the pages render from —
> see llms.txt for the index.

${corpusSections.join('\n\n---\n\n')}
`;

writeFileSync(resolve(root, 'public/llms-full.txt'), llmsFullTxt);

const total = Object.values(entries).reduce((n, list) => n + list.length, 0);
console.log(
  `llms.txt and llms-full.txt written (${total} entries across ${Object.keys(COLLECTIONS).length} collections)`
);
