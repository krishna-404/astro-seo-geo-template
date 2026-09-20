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
 *     else a portrait when the page carries one (the author page), else the
 *     tagline on a brand panel.
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
import { readdirSync, readFileSync, mkdirSync, existsSync, statSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const template = resolve(here, 'page.html');
const distDir = resolve(root, 'dist');
const outRoot = resolve(root, 'public/og');

// ── EDIT FOR YOUR SITE ─────────────────────────────────────────────────────
// Node scripts cannot import src/data/site.ts, so the two brand strings live
// here (see marketing/README.md). Keep SITE_NAME in step with SITE.name and
// TAGLINE with SITE.tagline; the brand colour is mirrored in page.html.
const SITE_NAME = 'Example Co';
const TAGLINE = 'A one-line description of what this company does';
// ───────────────────────────────────────────────────────────────────────────

/** Section label per first path segment. Anything else reads as the site. */
const EYEBROW = {
  blog: 'Blog',
  glossary: 'Glossary',
  author: 'Author',
  about: 'About',
  contact: 'Contact',
  'for-llms': 'For AI assistants',
  'privacy-policy': 'Privacy',
};

function decode(s) {
  return s
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

/** Long titles step down so two lines always hold them. */
function headlineSize(title) {
  if (title.length > 84) return 38;
  if (title.length > 66) return 42;
  if (title.length > 50) return 46;
  return 50;
}

function routeOf(file) {
  const rel = relative(distDir, file).replace(/\\/g, '/').replace(/\.html$/, '');
  return rel === 'index' ? '/' : `/${rel.replace(/\/index$/, '')}`;
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
const pages = walk(distDir)
  .map((file) => ({ file, route: routeOf(file) }))
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

  // The visual: the lead figure, else a portrait, else the tagline panel.
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
  let portrait = null;
  if (!figure) {
    const img = /<img[^>]+src="(\/_astro\/founder[^"]+\.(?:jpg|jpeg|png|webp))"/.exec(html)?.[1];
    if (img && existsSync(join(distDir, img))) {
      const ext = img.split('.').pop();
      portrait = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${readFileSync(join(distDir, img)).toString('base64')}`;
    }
  }
  if (!figure && !portrait) noVisual += 1;

  await page.evaluate(
    ({ title, desc, eyebrow, size, brand, figure, portrait }) => {
      document.getElementById('brand').textContent = brand.name;
      document.getElementById('tagline').textContent = brand.tagline;
      document.getElementById('domain').textContent = brand.domain;
      document.getElementById('eyebrow').textContent = eyebrow;
      const h = document.getElementById('headline');
      h.textContent = title;
      h.style.fontSize = `${size}px`;
      document.getElementById('desc').textContent = desc;
      const v = document.getElementById('visual');
      v.className = `visual ${figure ? 'visual--figure' : portrait ? 'visual--portrait' : 'visual--none'}`;
      v.innerHTML = figure
        ? figure
        : portrait
          ? `<img id="shot" src="${portrait}" alt=""><p>${desc}</p>`
          : `<p>${brand.tagline}</p>`;
    },
    { title, desc, eyebrow, size: headlineSize(title), brand: { name: SITE_NAME, tagline: TAGLINE, domain }, figure, portrait }
  );
  if (portrait) {
    await page.waitForFunction(() => {
      const img = document.getElementById('shot');
      return img && img.complete && img.naturalWidth > 0;
    });
  }

  const out = join(outRoot, `${route.slice(1)}.jpg`);
  mkdirSync(dirname(out), { recursive: true });
  await page.screenshot({ path: out, type: 'jpeg', quality: 88 });
  console.log(`${relative(root, out)}  ← ${figure ? 'figure' : portrait ? 'portrait' : 'tagline panel'}`);
  written += 1;
}

await browser.close();
console.log(`\n${written} cards written (${noVisual} without a figure)`);
