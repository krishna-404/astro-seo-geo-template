#!/usr/bin/env node
/**
 * Writes src/data/lastmod.json — the commit date of each page's source.
 *
 *   npm run lastmod
 *
 * WHY THIS FILE EXISTS AT ALL. The sitemap's <lastmod> is derived from git, so
 * that it reflects when a page actually changed rather than when the site was
 * last deployed. But CI build environments routinely have no usable history —
 * the first deployment of this code built inside a container that excluded
 * `.git` entirely, so every lookup came back empty. The feature degraded
 * exactly as designed (omit rather than invent a date) and therefore did
 * nothing at all in production: 0 of 43 URLs carried a lastmod.
 *
 * Handing `.git` to the build would not fix it either. CI checkouts are
 * typically shallow, and with depth 1 every file's "last commit" is HEAD —
 * which would stamp every URL with the deploy date. That is precisely the
 * misleading signal the git derivation exists to avoid, wearing a better
 * disguise.
 *
 * So the dates are resolved HERE, where full history exists, and committed.
 * The build then reads a plain JSON file and needs no git at all.
 *
 * The cost is that the file can go stale by one commit. `npm run verify` (the
 * pre-push battery) regenerates it and fails on a missing or invented route, so
 * it cannot drift silently — the same treatment the other site invariants get.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { readCollection } from './lib/content.mjs';
import { collectionNames, routeOfCollection, staticRoutes } from './lib/routes.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Last commit touching any of these paths, ISO-8601, or undefined. */
function newestCommit(files) {
  const times = files
    .filter((f) => existsSync(resolve(root, f)))
    .map((f) => {
      try {
        return execFileSync('git', ['log', '-1', '--format=%cI', '--', f], {
          cwd: root,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
      } catch {
        return '';
      }
    })
    .filter(Boolean)
    .map((d) => new Date(d).getTime())
    .sort((a, b) => a - b);
  const newest = times.at(-1);
  return newest ? new Date(newest).toISOString() : undefined;
}

const map = {};

// Collection entries: the content file is what changed. Read through the
// shared reader so drafts and scheduled (future-dated) entries never get a
// lastmod row — a route the sitemap will not contain must not appear here, or
// check-lastmod flags the committed map as stale on every verify run until the
// entry publishes. (This walk previously read the directory raw and leaked
// draft entries into the map.)
for (const folder of collectionNames()) {
  const route = routeOfCollection(folder);
  for (const entry of readCollection(folder)) {
    // The reader strips the extension; resolve the real filename for git.
    const file = ['md', 'mdx']
      .map((ext) => join('src/content', folder, `${entry.slug}.${ext}`))
      .find((f) => existsSync(resolve(root, f)));
    if (!file) continue;
    const date = newestCommit([file]);
    if (date) map[`${route}/${entry.slug}`] = date;
  }
}

// Author pages: one route per registry entry. An author page changes when the
// registry changes (bio, profiles), when its template changes, or when any
// blog post changes — the page lists the author's posts, and attributing a
// post to a different author moves two author pages at once, so the whole
// collection is an input rather than a per-author slice.
{
  const AUTHOR_SOURCES = ['src/data/authors.json', 'src/pages/author/[...slug].astro', 'src/content/blog'];
  const { authors } = JSON.parse(readFileSync(resolve(root, 'src/data/authors.json'), 'utf8'));
  for (const a of authors) {
    const date = newestCommit(AUTHOR_SOURCES);
    if (date) map[`/author/${a.slug}`] = date;
  }
}

// Plain pages, DISCOVERED rather than listed.
//
// This was a hand-maintained map until 10 Aug 2026, and /contact shipped
// without a lastmod because nobody remembered to add it. Nothing caught that:
// check-lastmod.mjs compares the committed map against a freshly generated one,
// and both were missing the same route, so they agreed. A list you have to
// remember to update is not an invariant. Walking src/pages means a new page
// cannot ship uncovered.
//
// EXTRA_SOURCES names the non-obvious inputs — pages whose content comes from
// data as well as markup, where editing only the data file should still move
// the date. /for-llms also lists the content collections: it summarises them,
// so a new entry changes what that page says.
const EXTRA_SOURCES = {
  '/': ['src/data/site.ts'],
  '/about': ['src/data/site.ts'],
  '/contact': ['src/data/site.ts'],
  '/privacy-policy': ['src/data/privacy.json'],
  // /for-llms summarises the collections, so a new entry changes what it says.
  '/for-llms': ['src/data/site.ts', ...collectionNames().map((c) => `src/content/${c}`)],
};

/** Routes deliberately outside the sitemap need no lastmod row: 404, and the
 *  noindex /search tool page (client-rendered results carry no date claim). */
const SKIP = new Set(['/404', '/search']);

/* Static pages are DISCOVERED, not listed — routes.mjs walks src/pages
 * recursively. This walk was one directory deep until 10 Aug 2026 and
 * /contact/thanks carried no lastmod because of it. */
for (const [route, file] of Object.entries(staticRoutes())) {
  if (SKIP.has(route)) continue;
  const date = newestCommit([file, ...(EXTRA_SOURCES[route] ?? [])]);
  if (date) map[route] = date;
}

const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(
  resolve(root, 'src/data/lastmod.json'),
  JSON.stringify(
    {
      $comment:
        'Generated by scripts/lastmod.mjs — do not hand-edit. Route → commit date of that page’s source, used for <lastmod> in the sitemap. Regenerate with `npm run lastmod` when content changes; `npm run verify` fails if a route is missing from it.',
      routes: sorted,
    },
    null,
    2
  ) + '\n'
);
console.log(`${Object.keys(sorted).length} routes written to src/data/lastmod.json`);
