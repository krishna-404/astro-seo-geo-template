#!/usr/bin/env node
/**
 * Renders one social card per content page to public/og/<collection>/<slug>.jpg.
 *
 *   npm install --no-save playwright
 *   CHROMIUM_CHANNEL=chrome node marketing/og/render-pages.mjs
 *
 * Playwright is deliberately not a project dependency — this runs at publish
 * time, not on every build, so it is installed ad hoc and `--no-save` keeps it
 * out of package.json. `CHROMIUM_CHANNEL=chrome` points it at the Chrome that
 * is already installed; drop it to use Playwright's own browser
 * (`npx playwright install chromium` first).
 *
 * Each card is the page title over the screenshot the page already uses as its
 * header (`heroArt`, resolved the same way the page templates resolve it). So a
 * shared link previews as the thing the page is about, instead of all 45 URLs
 * previewing as the same default card.
 *
 * The page templates only point `og:image` at a card **that exists on disk** —
 * so forgetting to re-run this degrades to the default card rather than
 * shipping a 404 to LinkedIn. Re-run it when a title changes, when a page is
 * added, or when the screenshots are recut.
 *
 * jpeg, not png: a card is ~90KB as jpeg and ~450KB as png, and nothing here
 * has hard edges that jpeg hurts. 21 pages of png would be 9MB in the repo.
 */
import { chromium } from 'playwright';
import { readdirSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const template = resolve(here, 'page.html');
const screensDir = resolve(root, 'src/assets/screens');
const outRoot = resolve(root, 'public/og');

/** Collection → [folder under src/content, eyebrow, default heroArt]. */
const COLLECTIONS = {
  blog: ['blog', 'Blog', 'command'],
  solutions: ['solution', 'Solution', 'command'],
  glossary: ['glossary', 'Glossary', 'documents'],
  'hs-code': ['hs-code', 'HS code', 'position'],
};

/**
 * Pages that are not collection entries: the marketing pages, the collection
 * indexes, and /vs. They were left on the default card, which meant the eight
 * /vs pages — the highest-intent URLs on the site, the ones that get pasted
 * into a sales thread — all previewed identically.
 *
 * Route → [output path under public/og, eyebrow, heroArt].
 * /vs/<slug> is generated from COMPETITORS rather than listed here.
 */
const STATIC = {
  '/': ['pages/home', 'AI trade desk', 'command'],
  '/features': ['pages/features', 'What it does', 'command'],
  '/pricing': ['pages/pricing', 'Pricing', 'expenses'],
  '/ops-cost-calculator': ['pages/ops-cost-calculator', 'Calculator', 'expenses'],
  '/vs': ['pages/vs', 'Compared', 'escalation'],
  '/blog': ['pages/blog', 'Blog', 'command'],
  '/glossary': ['pages/glossary', 'Glossary', 'documents'],
  '/solutions': ['pages/solutions', 'Solutions', 'command'],
  '/hs-code': ['pages/hs-code', 'HS code', 'position'],
  '/contact': ['pages/contact', 'Contact', 'escalation'],
};

/**
 * Titles for the pages above come from the BUILT HTML, not from a list here.
 *
 * A collection entry's title is in its frontmatter, so this script can read it
 * without a build. A .astro page's title is a prop, and copying it into this
 * file would mean two places to change and one of them silently going stale —
 * which is precisely the failure the per-page cards exist to fix. Reading
 * dist/ costs a build first and keeps the card unable to claim something the
 * page does not say.
 */
const distDir = resolve(root, 'dist');

function titleFromDist(route) {
  const file = resolve(distDir, `${route === '/' ? 'index' : route.slice(1)}.html`);
  if (!existsSync(file)) return null;
  const m = /<title>(.*?)<\/title>/s.exec(readFileSync(file, 'utf8'));
  if (!m) return null;
  return m[1]
    .replace(/&#8211;/g, '–')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/^Docket\s*[—–-]\s*/, '')
    .replace(/\s*[—–-]\s*Docket$/, '')
    .trim();
}

/** Mirrors GLOSSARY_ART in src/data/pageArt.ts — keep the two in step. */
const GLOSSARY_ART = {
  incoterms: 'contracts',
  documents: 'documents',
  shipping: 'shipments',
  customs: 'documents',
  payment: 'calendar',
  finance: 'expenses',
};

/** Enough YAML for our frontmatter: top-level `key: value`, quoted or bare. */
function frontmatter(text) {
  const end = text.indexOf('\n---', 3);
  if (!text.startsWith('---') || end === -1) return {};
  const out = {};
  for (const line of text.slice(3, end).split('\n')) {
    const m = /^([a-zA-Z][\w-]*):\s*(.*)$/.exec(line);
    if (!m) continue;
    const [, key, raw] = m;
    const value = raw.trim().replace(/^["'](.*)["']$/s, '$1');
    if (value !== '') out[key] = value;
  }
  return out;
}

/** Long titles step down so the card never runs to four lines. */
function headlineSize(title) {
  if (title.length > 74) return 40;
  if (title.length > 58) return 46;
  if (title.length > 44) return 50;
  return 54;
}

// No browser of its own: `CHROMIUM_CHANNEL=chrome` drives the Google Chrome
// already on the machine, which skips Playwright's 130MB download entirely.
const browser = await chromium.launch({
  channel: process.env.CHROMIUM_CHANNEL || undefined,
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(`file://${template}`, { waitUntil: 'networkidle' });

let written = 0;
let skipped = 0;

for (const [route, [folder, eyebrow, fallback]] of Object.entries(COLLECTIONS)) {
  const dir = resolve(root, 'src/content', folder);
  if (!existsSync(dir)) continue;
  mkdirSync(join(outRoot, route), { recursive: true });

  for (const file of readdirSync(dir).filter((f) => /\.mdx?$/.test(f))) {
    const data = frontmatter(readFileSync(join(dir, file), 'utf8'));
    const slug = file.replace(/\.mdx?$/, '');

    // Drafts have no page, so they get no card.
    if (data.draft === 'true') {
      skipped += 1;
      continue;
    }
    if (!data.title) {
      console.warn(`skip ${route}/${slug}: no title in frontmatter`);
      skipped += 1;
      continue;
    }

    const variant =
      data.heroArt ?? (folder === 'glossary' ? GLOSSARY_ART[data.category] : undefined) ?? fallback;
    const shot = join(screensDir, `${variant}.png`);
    if (!existsSync(shot)) {
      console.warn(`skip ${route}/${slug}: no screenshot for heroArt "${variant}"`);
      skipped += 1;
      continue;
    }

    await page.evaluate(
      ({ title, eyebrow, size, src }) => {
        document.getElementById('headline').textContent = title;
        document.getElementById('headline').style.fontSize = `${size}px`;
        document.getElementById('eyebrow').textContent = eyebrow;
        document.getElementById('shot').src = src;
      },
      {
        title: data.title,
        eyebrow,
        size: headlineSize(data.title),
        src: `data:image/png;base64,${readFileSync(shot).toString('base64')}`,
      }
    );
    await page.waitForFunction(() => {
      const img = document.getElementById('shot');
      return img.complete && img.naturalWidth > 0;
    });

    const out = join(outRoot, route, `${slug}.jpg`);
    await page.screenshot({ path: out, type: 'jpeg', quality: 88 });
    console.log(`${route}/${slug}.jpg  ← ${variant}`);
    written += 1;
  }
}

/**
 * The pages that are not collection entries, plus one card per competitor.
 * Same renderer, same template — only the title source differs.
 */
const site = readFileSync(resolve(root, 'src/data/site.ts'), 'utf8');
const competitorSlugs = [...site.matchAll(/^\s*slug: '([^']+)',\n\s*strength:/gm)].map((m) => m[1]);

const extras = [
  ...Object.entries(STATIC).map(([route, [out, eyebrow, art]]) => ({ route, out, eyebrow, art })),
  ...competitorSlugs.map((slug) => ({
    route: `/vs/${slug}`,
    out: `vs/${slug}`,
    eyebrow: 'Compared',
    art: 'escalation',
  })),
];

if (!existsSync(distDir)) {
  console.warn(
    `\nskipping ${extras.length} non-collection cards: no dist/ — run \`npm run build\` first`
  );
  skipped += extras.length;
} else {
  for (const { route, out, eyebrow, art } of extras) {
    const title = titleFromDist(route);
    if (!title) {
      console.warn(`skip ${route}: no built page at dist/`);
      skipped += 1;
      continue;
    }
    const shot = join(screensDir, `${art}.png`);
    if (!existsSync(shot)) {
      console.warn(`skip ${route}: no screenshot "${art}"`);
      skipped += 1;
      continue;
    }

    await page.evaluate(
      ({ title, eyebrow, size, src }) => {
        document.getElementById('headline').textContent = title;
        document.getElementById('headline').style.fontSize = `${size}px`;
        document.getElementById('eyebrow').textContent = eyebrow;
        document.getElementById('shot').src = src;
      },
      {
        title,
        eyebrow,
        size: headlineSize(title),
        src: `data:image/png;base64,${readFileSync(shot).toString('base64')}`,
      }
    );
    await page.waitForFunction(() => {
      const img = document.getElementById('shot');
      return img.complete && img.naturalWidth > 0;
    });

    mkdirSync(join(outRoot, dirname(out)), { recursive: true });
    await page.screenshot({ path: join(outRoot, `${out}.jpg`), type: 'jpeg', quality: 88 });
    console.log(`${out}.jpg  ← ${art}`);
    written += 1;
  }
}

await browser.close();
console.log(`\n${written} cards written, ${skipped} skipped`);
