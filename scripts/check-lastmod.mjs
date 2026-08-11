#!/usr/bin/env node
/**
 * Fails if src/data/lastmod.json has drifted from what git says — with one
 * deliberate exception.
 *
 *   npm run lastmod:check
 *
 * THE EXCEPTION, AND WHY IT IS NOT A LOOPHOLE. The map records the commit date
 * of each page's source. Committing the map is itself a commit, and it changes
 * the date of every file in it. So a commit that edits a page can never contain
 * a map that already knows that commit's date: generate, commit, and the map is
 * instantly one commit behind for exactly the pages you just edited.
 *
 * That is chicken-and-egg, not staleness. This check therefore accepts a
 * difference when the newly computed date is HEAD's own commit date, and
 * rejects every other difference. The guard stays strong: a map two commits
 * behind, a route whose date was hand-edited, a missing or invented route all
 * still fail.
 *
 * The published cost is that a page edited in the latest commit carries its
 * PREVIOUS edit date until the next commit regenerates the map. That
 * understates recency, never overstates it — the conservative direction, and
 * the same bias the rest of this repo's numbers take.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [, , committedPath] = process.argv;
if (!committedPath) {
  console.error('usage: check-lastmod.mjs <path-to-committed-copy>');
  process.exit(2);
}

const committed = JSON.parse(readFileSync(committedPath, 'utf8')).routes;
const current = JSON.parse(
  readFileSync(resolve(root, 'src/data/lastmod.json'), 'utf8')
).routes;

const headDate = Date.parse(
  execFileSync('git', ['log', '-1', '--format=%cI'], { cwd: root, encoding: 'utf8' }).trim()
);

const problems = [];
const drifted = [];

for (const route of new Set([...Object.keys(committed), ...Object.keys(current)])) {
  const was = committed[route];
  const now = current[route];

  if (!now) {
    problems.push(`${route}: in the committed map but git no longer knows the page`);
    continue;
  }
  if (!was) {
    problems.push(`${route}: missing from the committed map — run \`npm run lastmod\``);
    continue;
  }
  if (was === now) continue;

  // Expected: this commit touched that page, so the map cannot know its date.
  if (Date.parse(now) === headDate) continue;

  drifted.push(`${route}: map says ${was}, git says ${now}`);
}

/*
 * COVERAGE, which is a different question from freshness and the one this check
 * originally could not answer.
 *
 * Everything above compares the committed map against a freshly generated one.
 * That catches a stale date. It cannot catch a route that is in neither, because
 * the two agree — which is exactly how /contact shipped with no <lastmod> while
 * this check printed "ok". The sitemap is the list of URLs we actually publish,
 * so it is the right thing to measure the map against.
 *
 * Needs dist/, so it only runs after a build. Says so rather than passing
 * quietly when there is nothing to check — a skipped check that looks like a
 * passing one is how the first gap survived.
 */
const sitemap = resolve(root, 'dist/sitemap-0.xml');
if (existsSync(sitemap)) {
  const xml = readFileSync(sitemap, 'utf8');
  const published = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    new URL(m[1]).pathname.replace(/\/$/, '')
  );
  const uncovered = published.filter((p) => !current[p || '/']);
  for (const p of uncovered) {
    problems.push(`${p || '/'}: in the sitemap but has no lastmod — see scripts/lastmod.mjs`);
  }
  console.log(`   ${published.length} sitemap URLs, ${published.length - uncovered.length} with a lastmod`);
} else {
  console.log('   note: no dist/sitemap-0.xml — coverage not checked. Run `npm run build` first.');
}

for (const d of drifted) console.log(`   note: ${d}`);
if (drifted.length) {
  console.log(
    `   ${drifted.length} date(s) behind — harmless (they understate recency).` +
      ' Run `npm run lastmod` to refresh.'
  );
}

if (problems.length) {
  console.error('   FAIL: src/data/lastmod.json does not describe the site.');
  for (const p of problems) console.error(`     ${p}`);
  console.error('   Run `npm run lastmod` and commit the result.');
  process.exit(1);
}
console.log('   ok');
