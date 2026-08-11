#!/usr/bin/env node
/**
 * Renders one social card per built page: title over a brand-coloured
 * background, 1200×630, written to
 *
 *   public/og/<collection>/<slug>.jpg   for blog/glossary entries
 *   public/og/pages/<flattened-route>.jpg  for everything else
 *
 * Run it AFTER a build:
 *
 *   npm run build
 *   npm install --no-save playwright
 *   CHROMIUM_CHANNEL=chrome node marketing/og/render-pages.mjs
 *
 * Playwright is deliberately not a project dependency — this runs at publish
 * time, not on every build, so it is installed ad hoc and `--no-save` keeps it
 * out of package.json. `CHROMIUM_CHANNEL=chrome` points it at the Chrome that
 * is already installed; drop it to use Playwright's own browser
 * (`npx playwright install chromium` first).
 *
 * TITLES COME FROM THE BUILT HTML, not from a list in this file. A page's
 * title is set in its frontmatter or its .astro props, and copying titles
 * into this script would mean two places to change and one of them silently
 * going stale — which is precisely the failure per-page cards exist to fix.
 * Reading dist/ costs a build first and keeps the card unable to claim
 * something the page does not say.
 *
 * TWO BUILDS. Cards land in public/, which Astro copies into dist/ at build
 * time — so a card rendered now ships on the NEXT build (build → render →
 * build again, or just accept that it goes out with the next deploy). The
 * page templates only point `og:image` at a card that exists on disk, so
 * forgetting to re-run this degrades to the default card rather than
 * shipping a 404 to LinkedIn. Re-run when a title changes or a page is added.
 *
 * jpeg, not png: a card is ~90KB as jpeg and ~450KB as png, and a flat-colour
 * card has nothing that jpeg hurts. Twenty pages of png would be megabytes in
 * the repo for no visible gain.
 */
import { chromium } from 'playwright';
import { readdirSync, readFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative, sep } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const template = resolve(here, 'page.html');
const distDir = resolve(root, 'dist');
const outRoot = resolve(root, 'public/og');

/**
 * ─── EDIT FOR YOUR SITE ─────────────────────────────────────────────────────
 * Node cannot import site.ts (TypeScript), so the two values the card needs
 * live here. Keep SITE_NAME in step with SITE.name and BRAND_BG with the
 * brand colour in global.css / site.ts.
 */
const SITE_NAME = 'Example Co';
const BRAND_BG = '#0f4c81';

/** Collection route segment → eyebrow label. Anything else gets no eyebrow. */
const COLLECTIONS = { blog: 'Blog', glossary: 'Glossary' };

/** Every built .html under dist/, as a route ('/', '/about', '/blog/x'). */
function discoverRoutes(dir = distDir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      discoverRoutes(p, out);
    } else if (name.endsWith('.html')) {
      const rel = relative(distDir, p).split(sep).join('/');
      const route = '/' + rel.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '');
      out.push({ route: route === '/' ? '/' : route.replace(/\/$/, ''), file: p });
    }
  }
  return out;
}

/** The page's own <title>, minus the site-name prefix/suffix. */
function titleOf(file) {
  const m = /<title>(.*?)<\/title>/s.exec(readFileSync(file, 'utf8'));
  if (!m) return null;
  const name = SITE_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return m[1]
    .replace(/&#8211;/g, '–')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(new RegExp(`^${name}\\s*[—–|-]\\s*`), '')
    .replace(new RegExp(`\\s*[—–|-]\\s*${name}$`), '')
    .trim();
}

/**
 * Output path for a route. Collection entries keep their collection folder so
 * the page templates can point og:image at og/<collection>/<slug>.jpg; every
 * other route flattens into og/pages/ ('/' → 'home', '/contact/thanks' →
 * 'contact-thanks').
 */
function outPathFor(route) {
  const segs = route === '/' ? [] : route.slice(1).split('/');
  if (segs.length === 2 && COLLECTIONS[segs[0]]) return join(segs[0], `${segs[1]}.jpg`);
  return join('pages', `${segs.length ? segs.join('-') : 'home'}.jpg`);
}

/** Long titles step down so the card never runs to four lines. */
function headlineSize(title) {
  if (title.length > 74) return 40;
  if (title.length > 58) return 46;
  if (title.length > 44) return 50;
  return 54;
}

if (!existsSync(distDir)) {
  console.error('render-pages: no dist/ — run `npm run build` first (titles come from built HTML)');
  process.exit(1);
}

// No browser of its own: `CHROMIUM_CHANNEL=chrome` drives the Google Chrome
// already on the machine, which skips Playwright's 130MB download entirely.
const browser = await chromium.launch({
  channel: process.env.CHROMIUM_CHANNEL || undefined,
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });

// The template is self-contained (system fonts, no assets); the script owns
// the brand colour and site name so the card cannot drift from this config.
const html = readFileSync(template, 'utf8')
  .replaceAll('__BRAND_BG__', BRAND_BG)
  .replaceAll('__SITE_NAME__', SITE_NAME);
await page.setContent(html, { waitUntil: 'load' });

let written = 0;
let skipped = 0;

for (const { route, file } of discoverRoutes().sort((a, b) => a.route.localeCompare(b.route))) {
  // 404 is not a page anyone shares, and it is not in the sitemap.
  if (route === '/404') {
    skipped += 1;
    continue;
  }

  const title = titleOf(file);
  if (!title) {
    console.warn(`skip ${route}: no <title> in built HTML`);
    skipped += 1;
    continue;
  }

  const eyebrow = COLLECTIONS[route.slice(1).split('/')[0]] ?? '';
  await page.evaluate(
    ({ title, eyebrow, size }) => {
      document.getElementById('headline').textContent = title;
      document.getElementById('headline').style.fontSize = `${size}px`;
      const eb = document.getElementById('eyebrow');
      eb.textContent = eyebrow;
      eb.style.display = eyebrow ? '' : 'none';
    },
    { title, eyebrow, size: headlineSize(title) }
  );

  const out = outPathFor(route);
  mkdirSync(join(outRoot, dirname(out)), { recursive: true });
  await page.screenshot({ path: join(outRoot, out), type: 'jpeg', quality: 88 });
  console.log(`og/${out.split(sep).join('/')}  ← ${route}`);
  written += 1;
}

await browser.close();
console.log(`\n${written} cards written, ${skipped} skipped — remember they ship on the NEXT build`);
