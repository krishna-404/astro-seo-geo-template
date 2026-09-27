#!/usr/bin/env node
/**
 * The contact sheets the design pass is judged on.
 *
 *   npm run build && npm run design:shoot [-- --only /,/about,/blog/some-post]
 *
 * WHY. `npm run check:design` proves a page has no smell a browser can
 * measure; it cannot tell you the hero is bland, the peak is in the wrong
 * place or the third band feels like the second. That is judgement, and
 * judgement needs to SEE the page as a visitor does: a phone, a desktop,
 * and the page at six points of its scroll — with the scroll-driven reveal
 * and the hover-free resting state a real reader gets. This renders
 * exactly that for every page (or the routes in --only) into
 * marketing/design/shots/ (gitignored — a review surface, not an asset):
 *
 *   <route>@375.png        the phone viewport, top of page
 *   <route>@1440.png       the desktop viewport, top of page
 *   <route>@375-full.png   the whole page at phone width
 *   <route>@1440-sheet.png six frames at 0/20/40/60/80/100 % of the scroll,
 *                          side by side — the contact sheet
 *
 * How to read a sheet (from /design-direction § 3, the feel check): write
 * one word per frame for what it makes you feel, compare with the feeling
 * curve in design-brief.md § 0, and where they disagree the PAGE is wrong.
 * Then the squint test on the @1440 frame: blur it until detail is gone and
 * name the primary element, the secondary, the groups — in that order. If
 * you cannot, hierarchy is the fix, not shadow, gradient or motion.
 *
 * The scroll-craft harness this borrows from also detects dead scroll and
 * frozen clips; this template has no scroll-jacked acts and no scrubbed
 * video (AGENTS rule 17), so those checks have nothing to see here.
 * Mirrors check-contrast.mjs for the server and the browser; playwright is
 * installed ad hoc (`npm i --no-save playwright`), never a devDependency.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { walkHtml } from './lib/html.mjs';
import { chromium } from 'playwright';

const DIST = 'dist';
const OUT = 'marketing/design/shots';
const PORT = 4329;

const args = process.argv.slice(2);
const onlyIdx = args.indexOf('--only');
const ONLY = onlyIdx > -1 ? args[onlyIdx + 1].split(',').map((s) => s.trim()) : null;

const all = walkHtml(DIST).map((p) => '/' + relative(DIST, p).split(sep).join('/'));
const routes = (ONLY ? all.filter((r) => ONLY.includes(r.replace(/\/index\.html$|\.html$/, '') || '/')) : all).sort();
if (!routes.length) {
  console.error(`   no built page matches --only ${ONLY} — routes look like /about or /blog/<slug>`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
const name = (route) => (route.replace(/\.html$/, '').replace(/^\//, '') || 'index').replace(/\//g, '__');

const server = (await import('node:http')).createServer(async (req, res) => {
  const { readFile } = await import('node:fs/promises');
  try {
    const body = await readFile(join(DIST, decodeURIComponent(req.url.split('?')[0])));
    res.writeHead(200, { 'content-type': req.url.endsWith('.css') ? 'text/css' : 'text/html' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);

const written = [];
for (const route of routes) {
  const base = join(OUT, name(route));

  // Phone: the top of the page and the whole page.
  const phone = await browser.newPage({ viewport: { width: 375, height: 667 } });
  await phone.emulateMedia({ reducedMotion: 'no-preference' });
  await phone.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'networkidle' });
  await phone.screenshot({ path: `${base}@375.png` });
  await phone.screenshot({ path: `${base}@375-full.png`, fullPage: true });
  await phone.close();

  // Desktop: the top, then six frames along the scroll into one sheet.
  const desk = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desk.emulateMedia({ reducedMotion: 'no-preference' });
  await desk.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'networkidle' });
  await desk.screenshot({ path: `${base}@1440.png` });
  const height = await desk.evaluate(() => document.documentElement.scrollHeight);
  const frames = [];
  for (const pct of [0, 20, 40, 60, 80, 100]) {
    const y = Math.max(0, Math.round(((height - 900) * pct) / 100));
    await desk.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await desk.waitForTimeout(120); // one animation frame for the view() timeline to settle
    frames.push({ pct, y, png: (await desk.screenshot()).toString('base64') });
  }
  // Compose the sheet in the browser itself: no image library, one PNG out.
  const sheet = await browser.newPage({ viewport: { width: 6 * 480 + 7 * 12, height: 300 + 60 } });
  await sheet.setContent(
    `<style>body{margin:0;background:#101828;font:600 13px/1 ui-monospace,monospace;color:#c9d1dc}
     .s{display:grid;grid-template-columns:repeat(6,480px);gap:12px;padding:12px}
     figure{margin:0}img{width:480px;height:300px;object-fit:cover;object-position:top;display:block;border:1px solid #344054}
     figcaption{padding:8px 0 0}</style>
     <div class="s">${frames
       .map((f) => `<figure><img src="data:image/png;base64,${f.png}"><figcaption>${route} · ${f.pct}% · y=${f.y}</figcaption></figure>`)
       .join('')}</div>`
  );
  await sheet.screenshot({ path: `${base}@1440-sheet.png`, fullPage: true });
  await sheet.close();
  await desk.close();
  written.push(base);
}

await browser.close();
server.close();

console.log(`   ${written.length} page(s) shot into ${OUT}/ — per page: @375, @375-full, @1440, @1440-sheet`);
console.log('   read each sheet cold: one word per frame, against design-brief.md § 0; then the squint test on @1440');
writeFileSync(
  join(OUT, 'README.md'),
  `Screenshots from \`npm run design:shoot\` on ${new Date().toISOString().slice(0, 10)} — a review surface, gitignored, regenerated every run.\n`
);
