#!/usr/bin/env node
/**
 * Renders one social card per built page to public/og/<route>.jpg.
 *
 *   npm run build
 *   npm install --no-save playwright
 *   CHROMIUM_CHANNEL=chrome node marketing/og/render-pages.mjs
 *   npm run build   # so og:image picks up the cards now on disk
 *
 * Playwright is deliberately not a project dependency — this runs at publish
 * time, not on every build, so it is installed ad hoc and `--no-save` keeps it
 * out of package.json. `CHROMIUM_CHANNEL=chrome` points it at an installed
 * Chrome; `CHROMIUM_PATH=/path/to/chrome` at any Chromium binary.
 *
 * WHAT A CARD CARRIES — read from the BUILT page in dist/, never from a list
 * kept here (a list on the ancestor site went stale twice and once mis-carded
 * the homepage):
 *   - the brand row: name, tagline and domain — the same on every card, so a
 *     shared link always says who this is (the two literals below; the domain
 *     comes from the page's canonical);
 *   - the eyebrow (the page's section), the <title> and the og:description;
 *   - the page's own visual: the lead figure it draws (`<svg data-og-figure>`,
 *     lifted verbatim — inline SVG painted by the tokens page.html mirrors),
 *     else the tagline on a brand panel.
 *
 * WHICH PAGES: every dist/**\/*.html except the homepage (it keeps the brand
 * card, public/og/default.png), 404, pages marked noindex, and pages that
 * declare their own `ogImage` (BaseLayout precedence means an explicit image
 * always wins, so a generated card for them could never be referenced). The
 * card path mirrors the route: /blog/x → og/blog/x.jpg, /about → og/about.jpg,
 * /blog → og/blog.jpg. src/lib/ogCard.ts is the read side — change one,
 * change both.
 *
 * The page templates point og:image at a card ONLY if the file is on disk —
 * so forgetting to re-run this degrades to the default card rather than
 * shipping a 404 to LinkedIn — and check-invariants then fails the build:
 * every indexable page must have its own card. Re-run after any content
 * change (a title, a description or a lead figure all appear on the card).
 *
 * jpeg, not png: ~90KB against ~450KB, and nothing here has hard edges that
 * jpeg hurts at quality 88.
 */
import { chromium } from 'playwright';
import { readFileSync, readdirSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';
import { walkHtml, routeOf, decode } from '../../scripts/lib/html.mjs';
import { collections, routeOfCollection } from '../../scripts/lib/routes.mjs';
import brand from '../../src/data/brand.json' with { type: 'json' };

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const template = resolve(here, 'page.html');
const distDir = resolve(root, 'dist');
const outRoot = resolve(root, 'public/og');

// Node scripts cannot import src/data/site.ts, so the brand strings come from
// src/data/brand.json — the same file site.ts reads. Only the brand COLOUR is
// still mirrored by hand, in page.html (see marketing/README.md).
const SITE_NAME = brand.name;
const TAGLINE = brand.tagline;

/**
 * Section label per first path segment. A collection's label is its `eyebrow`
 * in src/data/collections.json, so a new collection gets a correct card the day
 * it ships; the hand-authored pages are listed here. Anything else reads as the
 * site name.
 */
const EYEBROW = {
  ...Object.fromEntries(
    Object.entries(collections()).map(([c, cfg]) => [routeOfCollection(c).slice(1), cfg.eyebrow])
  ),
  author: 'Author',
  about: 'About',
  contact: 'Contact',
  'for-llms': 'For AI assistants',
  'privacy-policy': 'Privacy',
};

/** Long titles step down so two lines always hold them. */
function headlineSize(title) {
  if (title.length > 84) return 38;
  if (title.length > 66) return 42;
  if (title.length > 50) return 46;
  return 50;
}

/** True when the page's og:image is neither the default nor this script's tree — it declared its own. */
function declaresOwnOgImage(html) {
  const m = /<meta property="og:image" content="([^"]+)"/.exec(html);
  if (!m) return false;
  const path = m[1].replace(/^https?:\/\/[^/]+/, '');
  return !path.startsWith('/og/');
}

if (!existsSync(distDir)) {
  console.error('render-pages: no dist/ — run `npm run build` first (titles come from built HTML)');
  process.exit(1);
}

const name = SITE_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pages = walkHtml(distDir)
  .map((file) => ({ file, route: routeOf(file, distDir) }))
  .filter(({ route }) => route !== '/' && route !== '/404')
  .map((p) => ({ ...p, html: readFileSync(p.file, 'utf8') }))
  .filter(({ html }) => !/<meta name="robots" content="[^"]*noindex/.test(html))
  .filter(({ html }) => !declaresOwnOgImage(html))
  .sort((a, b) => a.route.localeCompare(b.route));

// A clean slate: a card for a page that no longer exists is a stale file the
// invariants would otherwise never see. The brand card lives outside this tree.
for (const entry of existsSync(outRoot) ? readdirSync(outRoot) : []) {
  if (entry !== 'default.png') rmSync(join(outRoot, entry), { recursive: true, force: true });
}
mkdirSync(outRoot, { recursive: true });

const browser = await chromium.launch({
  channel: process.env.CHROMIUM_CHANNEL || undefined,
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(`file://${template}`, { waitUntil: 'networkidle' });

let written = 0;
let noVisual = 0;

for (const { route, html } of pages) {
  const title = decode(/<title>(.*?)<\/title>/s.exec(html)?.[1] ?? '')
    .replace(new RegExp(`^${name}\\s*[—–|-]\\s*`), '')
    .replace(new RegExp(`\\s*[—–|-]\\s*${name}$`), '')
    .trim();
  if (!title) {
    console.warn(`skip ${route}: no <title>`);
    continue;
  }
  const desc = decode(/<meta property="og:description" content="([^"]*)"/.exec(html)?.[1] ?? '');
  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
  const domain = canonical ? new URL(canonical).host : '';
  const eyebrow = EYEBROW[route.split('/')[1]] ?? SITE_NAME;

  // The visual: the lead figure, else the tagline panel. (There was a portrait
  // branch here that matched `/_astro/founder…` — a path this template never
  // emits, since it ships no photo pipeline. It could not fire, so it went.)
  let figure = null;
  let cursor = html.indexOf('<svg');
  while (cursor !== -1) {
    const end = html.indexOf('</svg>', cursor);
    const open = html.slice(cursor, html.indexOf('>', cursor) + 1);
    if (/data-og-figure/.test(open)) {
      figure = html.slice(cursor, end + 6);
      break;
    }
    cursor = html.indexOf('<svg', end);
  }
  if (!figure) noVisual += 1;

  await page.evaluate(
    ({ title, desc, eyebrow, size, brand, figure }) => {
      document.getElementById('brand').textContent = brand.name;
      document.getElementById('tagline').textContent = brand.tagline;
      document.getElementById('domain').textContent = brand.domain;
      document.getElementById('eyebrow').textContent = eyebrow;
      const h = document.getElementById('headline');
      h.textContent = title;
      h.style.fontSize = `${size}px`;
      document.getElementById('desc').textContent = desc;
      const v = document.getElementById('visual');
      v.className = `visual ${figure ? 'visual--figure' : 'visual--none'}`;
      v.innerHTML = figure ? figure : `<p>${brand.tagline}</p>`;
    },
    { title, desc, eyebrow, size: headlineSize(title), brand: { name: SITE_NAME, tagline: TAGLINE, domain }, figure }
  );

  const out = join(outRoot, `${route.slice(1)}.jpg`);
  mkdirSync(dirname(out), { recursive: true });
  await page.screenshot({ path: out, type: 'jpeg', quality: 88 });
  console.log(`${relative(root, out)}  ← ${figure ? 'figure' : 'tagline panel'}`);
  written += 1;
}

await browser.close();
console.log(`\n${written} cards written (${noVisual} without a figure)`);
