/**
 * html.mjs — reading the built site. One walker, one entity decoder, one
 * tag stripper, one JSON-LD reader.
 *
 * WHY. Nine scripts walked `dist/` for `.html` files, in four spellings
 * (recursive readdirSync, withFileTypes flatMap, two that returned routes
 * instead of paths). Two of them decoded HTML entities with different tables:
 * check-invariants decoded numeric and hex plus five named entities,
 * render-pages decoded three named plus two hard-coded numeric dashes and left
 * `&nbsp;` alone. A title read as 64 characters instead of 60 because of that
 * (fixed 20 Sep 2026); the next such bug would be invisible in the other copy.
 * So: the decoder lives here, and every caller gets the same table.
 *
 * `ldNodes` swallows parse errors on purpose — check-invariants reports an
 * unparseable JSON-LD block as its own named failure, and every other caller
 * wants the nodes that DO parse rather than a crash.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** Every `.html` file under `dir`, recursively, as paths. */
export function walkHtml(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkHtml(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

/**
 * Built file → the route it serves. `dist/index.html` → `/`,
 * `dist/blog/x.html` → `/blog/x`, `dist/blog/index.html` → `/blog`.
 */
export function routeOf(file, dist = 'dist') {
  const rel = relative(dist, file).split(sep).join('/').replace(/\.html$/, '');
  if (rel === 'index') return '/';
  return `/${rel.replace(/\/index$/, '')}`;
}

/** Every built page as `{ file, route, html }`, sorted by file. */
export function readPages(dist = 'dist') {
  if (!existsSync(dist)) return [];
  return walkHtml(dist)
    .sort()
    .map((file) => ({ file, route: routeOf(file, dist), html: readFileSync(file, 'utf8') }));
}

const NAMED = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };

/**
 * Decode the HTML entities Astro emits: numeric, hex, and the six named ones
 * that appear in escaped attribute and text content. Measure string lengths on
 * the decoded text — `&#39;` is five characters for one apostrophe.
 */
export function decode(text) {
  return String(text ?? '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(amp|quot|apos|lt|gt|nbsp);/g, (_, n) => NAMED[n]);
}

/** Visible text of a page: scripts and styles gone, tags gone, entities decoded. */
export function strip(html) {
  return decode(
    String(html ?? '')
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Every JSON-LD node on a page, `@graph` flattened. Blocks that do not parse
 * are skipped silently — check-invariants has a named check for those, and no
 * other caller wants one bad block to hide the good ones.
 */
export function ldNodes(html) {
  const nodes = [];
  for (const m of String(html ?? '').matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const j = JSON.parse(m[1]);
      for (const n of Array.isArray(j['@graph']) ? j['@graph'] : [j]) {
        if (n && typeof n === 'object') nodes.push(n);
      }
    } catch { /* reported by check-invariants' own parse check */ }
  }
  return nodes;
}

/** Every JSON-LD block as raw text, for the callers that check parsing itself. */
export function ldBlocks(html) {
  return [...String(html ?? '').matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

/**
 * Absolute URL on this site → its path. Anything already a path comes back
 * unchanged. Repeated in four places in insights.mjs and once each in
 * intent.mjs and genai.mjs before 27 Sep 2026, in two spellings that disagreed
 * about the trailing slash.
 *
 * @param {string} site the bare host, e.g. "example.com"
 * @param {string} url
 */
export const sitePath = (site, url) =>
  String(url ?? '').replace(`https://${site}`, '').replace(/\/+$/, '') || '/';

/** Normalise for comparison: lower-case, letters/digits only, single spaces. */
export const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Every `<loc>` in a sitemap, following a sitemap index to its children.
 * `fetchText` is injected so the same function serves the live pull
 * (insights, indexnow, smoke-live) and a local read.
 *
 * @param {string} entry sitemap URL
 * @param {(url: string) => Promise<string|null>} fetchText
 */
export async function sitemapUrls(entry, fetchText) {
  const locs = (xml) => [...String(xml ?? '').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  const first = await fetchText(entry);
  if (!first) return [];
  const isIndex = /<sitemapindex/.test(first);
  if (!isIndex) return locs(first);
  const out = [];
  for (const child of locs(first)) {
    const xml = await fetchText(child);
    if (xml) out.push(...locs(xml));
  }
  return out;
}

/** `<loc>` and `<lastmod>` pairs from a sitemap document. */
export function sitemapEntries(xml) {
  return [...String(xml ?? '').matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
    loc: (m[1].match(/<loc>([^<]+)<\/loc>/)?.[1] ?? '').trim(),
    lastmod: (m[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] ?? '').trim() || null,
  })).filter((e) => e.loc);
}
