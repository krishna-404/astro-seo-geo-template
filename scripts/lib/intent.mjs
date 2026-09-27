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
import { readCollection } from './content.mjs';
import { saysPhrase } from './pageText.mjs';
import { norm, sitePath } from './html.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const INTENT = JSON.parse(readFileSync(resolve(root, 'src/data/intent.json'), 'utf8'));

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
 * query (normalised) → the page Google actually shows for it, by impressions.
 * Both report builders need it and both built it, with one of the two
 * forgetting to strip the site prefix consistently.
 *
 * @param {Record<string, Array<{query:string, impressions:number}>>} pageQueries
 * @param {string} site the bare host
 * @returns {Record<string, {page: string, impressions: number}>}
 */
export function shownOnMap(pageQueries, site) {
  /** @type {Record<string, {page: string, impressions: number}>} */
  const shownOn = {};
  for (const [page, rows] of Object.entries(pageQueries ?? {})) {
    const path = sitePath(site, page);
    for (const r of rows) {
      const q = norm(r.query);
      if (!shownOn[q] || shownOn[q].impressions < r.impressions) {
        shownOn[q] = { page: path, impressions: r.impressions };
      }
    }
  }
  return shownOn;
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
  const shownOn = shownOnMap(pageQueries, site);

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


/* ------------------------------------------------------------------ BOFU */

/**
 * Bottom-of-funnel SHAPES (intent.json → `bofu`): a query that reads like a
 * buyer comparing, switching or shortlisting. `<competitor>` in a pattern
 * expands to the `competitors` list; patterns that need it are skipped while
 * the list is empty. Returns the first matching label, or null.
 */
const COMPETITORS = (INTENT.competitors ?? []).map(norm).filter(Boolean);
const compAlt = COMPETITORS.map((c) => c.replace(/ /g, '\\s+')).join('|');
const BOFU = (INTENT.bofu ?? [])
  .filter((b) => !b.re.includes('<competitor>') || compAlt)
  .map((b) => ({ label: b.label, re: new RegExp(b.re.replace(/<competitor>/g, compAlt), 'i') }));

export function bofuLabel(query) {
  const q = norm(query);
  if (navRe && navRe.test(q)) return null;
  return BOFU.find((b) => b.re.test(q))?.label ?? null;
}

/** The competitor a query names, or null. */
export function competitorIn(query) {
  const q = ' ' + norm(query) + ' ';
  return COMPETITORS.find((c) => q.includes(' ' + c + ' ')) ?? null;
}

/**
 * The three playbook blocks read straight off the Search Console pull:
 *
 *   bofu             every BOFU-shaped row at position 4–20 (the shortlist to
 *                    push to page one; a row at 1–3 is listed as `winning`)
 *   competitorQueries every row naming a competitor from intent.json
 *   quickWins        page × query rows at position ≤ quickWins.maxPosition
 *                    whose phrase the page's SOURCE does not say — add it to
 *                    a heading, the description or a FAQ line
 *
 * @param {Array<{keys:string[], clicks:number, impressions:number, position:number}>} queries
 * @param {Record<string, Array<{query:string, impressions:number, position:number, clicks?:number}>>} pageQueries
 * @param {string} site
 */
export function playbookBlocks(queries, pageQueries, site) {
  const claims = claimedKeywords();
  const shownOn = shownOnMap(pageQueries, site);

  const bofu = [];
  const winning = [];
  for (const r of queries) {
    const query = r.keys[0];
    const label = bofuLabel(query);
    if (!label) continue;
    const row = {
      query, label, impressions: r.impressions, clicks: r.clicks,
      position: Number(r.position.toFixed(1)),
      shownOn: shownOn[norm(query)]?.page ?? null,
      intended: claimingPage(query, claims),
    };
    if (r.position >= 4 && r.position <= 20) bofu.push(row);
    else if (r.position < 4) winning.push(row);
  }
  bofu.sort((a, b) => a.position - b.position || b.impressions - a.impressions);

  const competitorQueries = queries
    .map((r) => ({ query: r.keys[0], competitor: competitorIn(r.keys[0]), impressions: r.impressions, clicks: r.clicks, position: Number(r.position.toFixed(1)), shownOn: shownOn[norm(r.keys[0])]?.page ?? null }))
    .filter((r) => r.competitor)
    .sort((a, b) => b.impressions - a.impressions);

  const qw = INTENT.quickWins ?? {};
  const maxPos = qw.maxPosition ?? 5;
  const minImpr = qw.minImpressions ?? 1;
  const quickWins = [];
  for (const [page, rows] of Object.entries(pageQueries ?? {})) {
    const path = sitePath(site, page);
    for (const r of rows) {
      if (r.position > maxPos || r.impressions < minImpr) continue;
      if (navRe && navRe.test(norm(r.query))) continue;
      const said = saysPhrase(path, r.query);
      if (said.has === 'phrase' || said.has === 'unknown') continue;
      quickWins.push({
        page: path, query: r.query, impressions: r.impressions, position: Number(r.position.toFixed(1)),
        status: said.has, missing: said.missing, file: said.file,
      });
    }
  }
  quickWins.sort((a, b) => b.impressions - a.impressions || a.position - b.position);

  return { bofu, winning, competitorQueries, quickWins, competitorsConfigured: COMPETITORS.length };
}
