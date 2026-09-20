/**
 * High-intent query detection, shared by scripts/insights.mjs (and anything
 * else that wants to know which Search Console rows are a BUYER choosing
 * rather than a reader learning).
 *
 * WHY. On a zero-click site the top rows of Search Console are a dozen
 * phrasings of "what is <term>" at position 80 — informational demand the
 * glossary will earn slowly. Underneath them sit a handful of rows like
 * "<category> software" and "<category> tracking system": tiny volume, but
 * they are the words a buyer types when they have budget. Those rows never
 * rise above the noise in a report sorted by impressions, so no run works
 * them first unless something surfaces them. This does: high-intent queries
 * are printed first in every pull, worked first in every cadence run, and
 * carried in the report with what was done about them.
 *
 * Two sources, deliberately:
 *   - PATTERN: a query carrying a transactional/commercial signal word from
 *     src/data/intent.json → `signals` (software, system, tool, pricing, vs,
 *     …) and not a navigational brand query (`navigational`). Mechanical, so
 *     a new phrasing is caught the day it appears.
 *   - WATCH: the curated list in intent.json → `watch` — the phrasings the
 *     site means to win, each tied to the page that claims it. A watch term
 *     with no impressions is reported as "not showing yet" instead of
 *     silently absent.
 *
 * The page a query SHOULD land on comes from the content itself: the
 * collections named in intent.json → `claimFrom` declare `primaryKeyword` +
 * `secondaryKeywords` in frontmatter, so the mapping cannot drift from what
 * the page says it is for. A query Google shows on a different page than the
 * one that claims it is flagged `wrong-page`; a query no page claims is
 * `unmapped` — a page waiting to be built, or a keyword to add to a page's
 * frontmatter.
 *
 * READ-ONLY, like everything under scripts/. Nothing here is site copy.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCollection } from './readContent.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const INTENT = JSON.parse(readFileSync(resolve(root, 'src/data/intent.json'), 'utf8'));

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const alternation = (list) => list.map((s) => norm(s).replace(/ /g, '\\s+')).filter(Boolean).join('|');

const signalRe = INTENT.signals?.length ? new RegExp(`\\b(?:${alternation(INTENT.signals)})\\b`) : null;
const navRe = INTENT.navigational?.length ? new RegExp(`\\b(?:${alternation(INTENT.navigational)})\\b`) : null;

/** True when the query carries a buying signal and is not a brand lookup. */
export function isHighIntent(query) {
  const q = norm(query);
  if (navRe && navRe.test(q)) return false;
  return Boolean(signalRe && signalRe.test(q));
}

/** Watch-list entry for an exact query, or null. */
export function watchEntry(query) {
  const q = norm(query);
  return (INTENT.watch ?? []).find((w) => norm(w.query) === q) ?? null;
}

/**
 * Route → keywords, read from the claiming pages' own frontmatter — the
 * collections intent.json → `claimFrom` names, each with the route it is
 * served under. Entries without a `primaryKeyword` are skipped.
 */
export function claimedKeywords() {
  const out = [];
  for (const { collection, route } of INTENT.claimFrom ?? []) {
    for (const e of readCollection(collection)) {
      const primary = e.data.primaryKeyword;
      if (!primary) continue;
      out.push({
        page: `${route.replace(/\/$/, '')}/${e.slug}`,
        primary: norm(primary),
        all: [primary, ...(e.data.secondaryKeywords ?? [])].map(norm),
      });
    }
  }
  return out;
}

/**
 * The page that claims a query: an exact match on any declared keyword
 * first, then the watch list, then a page whose primary keyword the query
 * contains. Returns a site-relative path or null.
 */
export function claimingPage(query, claims = claimedKeywords()) {
  const q = norm(query);
  const exact = claims.find((c) => c.all.includes(q));
  if (exact) return exact.page;
  const w = watchEntry(query);
  if (w) return w.page;
  const contains = claims.find((c) => q.includes(c.primary));
  return contains ? contains.page : null;
}

/**
 * Build the high-intent block from a Search Console pull.
 *
 * @param {Array<{keys:string[], clicks:number, impressions:number, position:number}>} queries
 * @param {Record<string, Array<{query:string, impressions:number, position:number}>>} pageQueries
 *        page URL → rows, as insights.mjs assembles it
 * @param {string} site  the bare host (e.g. "example.com"), to strip absolute page URLs
 */
export function highIntentReport(queries, pageQueries, site) {
  const claims = claimedKeywords();
  const shownOn = {};
  for (const [page, rows] of Object.entries(pageQueries ?? {})) {
    const path = page.replace(`https://${site}`, '') || '/';
    for (const r of rows) {
      const q = norm(r.query);
      if (!shownOn[q] || shownOn[q].impressions < r.impressions) shownOn[q] = { page: path, impressions: r.impressions };
    }
  }

  const rows = [];
  for (const r of queries) {
    const query = r.keys[0];
    const w = watchEntry(query);
    if (!w && !isHighIntent(query)) continue;
    const intended = w?.page ?? claimingPage(query, claims);
    const shown = shownOn[norm(query)]?.page ?? null;
    let status = 'unmapped';
    if (intended) status = shown && shown !== intended ? 'wrong-page' : 'ok';
    rows.push({
      query,
      impressions: r.impressions,
      clicks: r.clicks,
      position: Number(r.position.toFixed(1)),
      shownOn: shown,
      intended,
      status,
      watch: Boolean(w),
    });
  }
  rows.sort((a, b) => b.impressions - a.impressions || a.position - b.position);

  const seen = new Set(rows.map((r) => norm(r.query)));
  const notShowing = (INTENT.watch ?? [])
    .filter((w) => !seen.has(norm(w.query)))
    .map((w) => ({ query: w.query, page: w.page, since: w.since }));

  return { rows, notShowing, updated: INTENT.updated };
}
