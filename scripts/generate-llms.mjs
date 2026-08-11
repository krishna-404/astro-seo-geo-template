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
 * mechanism to notice a new glossary term or blog post. Generating both from
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
import { readCollection } from './lib/readContent.mjs';
import { SITE_URL } from '../src/data/origin.mjs';
import facts from '../src/data/facts.json' with { type: 'json' };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const url = (path) => `${SITE_URL}${path}`;

/**
 * ─── EDIT THIS BLOCK FOR YOUR SITE ──────────────────────────────────────────
 * Node cannot import src/data/site.ts (it is TypeScript), so the few strings
 * this file needs live here. Keep them in step with SITE in site.ts — name,
 * tagline and description should read identically in both places. The domain
 * itself comes from origin.mjs, the one shared constant.
 */
const LLMS = {
  name: 'Example Co',
  tagline: 'A one-line description of what this company does',
  description:
    'Two or three sentences an answer engine can quote verbatim: what the ' +
    'company does, for whom, and the one thing that makes it different.',
};

const COLLECTIONS = {
  blog: { route: '/blog', label: 'Blog' },
  glossary: { route: '/glossary', label: 'Glossary' },
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
- [Full corpus](${url('/llms-full.txt')}): every blog and glossary page in one file
- [RSS](${url('/rss.xml')})
- [Sitemap](${url('/sitemap-index.xml')})

## ${COLLECTIONS.blog.label}

${listSection('blog') || '(no posts published yet)'}

Index: <${url('/blog')}> · Feed: <${url('/rss.xml')}>

## ${COLLECTIONS.glossary.label}

Reference definitions. Each entry carries a short definition written to be
quoted, its authorities by name, and a \`retrieved\` date where a URL was
checked. Where a figure is jurisdiction-specific or unverified, the entry says
so rather than publishing a number.

${entries.glossary.map((e) => e.data.term ?? e.data.title).join(' · ') || '(no entries published yet)'}

Index: <${url('/glossary')}>

## Contact

${facts.company.founder.name}, founder
LinkedIn: ${facts.company.founder.linkedin}

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
    e.data.tldr ?? e.data.description ?? '',
    '',
    e.body,
    '',
    `Source: ${url(route)}`,
  ].join('\n');
};

const corpusSections = Object.keys(COLLECTIONS).flatMap((key) =>
  entries[key].map((e) => corpusEntry(key, e))
);

const llmsFullTxt = `# ${LLMS.name} — full corpus

> ${LLMS.tagline} This file concatenates every blog and glossary page
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
