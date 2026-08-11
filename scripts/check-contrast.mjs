#!/usr/bin/env node
/**
 * WCAG 2.1 AA colour-contrast audit over the built site.
 *
 *   npm run build && npm run check:contrast
 *
 * WHY THIS EXISTS. Lighthouse reports contrast for one page at a time and only
 * for the elements it happens to sample. This walks every text node on every
 * built page, resolves the colour actually painted behind it, and applies the
 * AA thresholds: 4.5:1 for normal text, 3:1 for large text (>=24px, or >=18.66px
 * at weight 700+). It is the same rule Lighthouse applies, run over everything.
 *
 * It resolves the *effective* background by walking ancestors until it finds a
 * non-transparent one, which is what makes it usable on a site whose sections
 * sit on several different band colours — a token that passes on white can
 * fail on a tinted band, and nothing but measurement will tell you which.
 *
 * KNOWN LIMITS, stated so nobody trusts it further than it goes: it does not
 * model background images, gradients, opacity on ancestors, or text over
 * decorative SVG art. Those are hand-checked. A pass here means "no
 * flat-colour text fails", not "the page is accessible".
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { chromium } from 'playwright';

const DIST = 'dist';
const PORT = 4319;

function pages(dir = DIST, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) pages(p, out);
    else if (name.endsWith('.html')) out.push('/' + relative(DIST, p).split(sep).join('/'));
  }
  return out;
}

/** Runs in the page. Returns one row per failing text element. */
const AUDIT = () => {
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const parse = (s) => {
    const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(s);
    return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null;
  };
  const lum = ([r, g, b]) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  /** Composite a possibly-translucent colour over what is behind it. */
  const over = (fg, bg) => fg.slice(0, 3).map((c, i) => c * fg[3] + bg[i] * (1 - fg[3]));

  /** Nearest painted background, compositing translucent layers on the way up. */
  const backdrop = (el) => {
    const stack = [];
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (!c || c[3] === 0) continue;
      stack.push(c);
      if (c[3] === 1) break;
    }
    let base = [255, 255, 255];
    for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base);
    return base;
  };

  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    const el = n.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    if (el.closest('script, style, noscript, template')) continue;

    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height) continue;

    const fg = parse(cs.color);
    if (!fg) continue;
    const bg = backdrop(el);
    const r = ratio(over(fg, bg), bg);

    const px = parseFloat(cs.fontSize);
    const weight = +cs.fontWeight || 400;
    const large = px >= 24 || (px >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    if (r >= need) continue;

    const sel =
      el.tagName.toLowerCase() +
      (el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).join('.')
        : '');
    out.push({
      sel,
      text: n.nodeValue.trim().slice(0, 40),
      color: cs.color,
      bg: `rgb(${bg.map(Math.round).join(', ')})`,
      ratio: +r.toFixed(2),
      need,
      px,
    });
  }
  return out;
};

const routes = pages().sort();
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

// The pinned Chromium under PLAYWRIGHT_BROWSERS_PATH rarely matches the build
// the freshly-installed playwright package expects, and this script is not worth
// a browser download. Point at whatever is on disk; fall back to the default.
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const failures = new Map(); // dedup by selector+colour pair, list the routes
for (const route of routes) {
  await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'networkidle' });
  // Closed <details> content is display:none and the walker skips it — FAQ
  // answers would never be measured. Force everything open first. The `name`
  // attribute must go before opening: exclusive groups enforce
  // one-open-at-a-time even for programmatic opens, so with it in place only
  // the last answer in each group would be measured.
  await page.evaluate(() => {
    document.querySelectorAll('details').forEach((d) => {
      d.removeAttribute('name');
      d.open = true;
    });
  });
  for (const f of await page.evaluate(AUDIT)) {
    const key = `${f.sel}|${f.color}|${f.bg}`;
    if (!failures.has(key)) failures.set(key, { ...f, routes: [] });
    failures.get(key).routes.push(route);
  }
}

await browser.close();
server.close();

if (!failures.size) {
  console.log(`   ok — ${routes.length} pages, no text below WCAG AA contrast`);
  process.exit(0);
}

const rows = [...failures.values()].sort((a, b) => a.ratio - b.ratio);
console.error(`   FAIL: ${rows.length} distinct text/background pairs below WCAG AA\n`);
for (const r of rows) {
  console.error(
    `   ${String(r.ratio).padStart(5)} (needs ${r.need})  ${r.color} on ${r.bg}  ${r.px}px`
  );
  console.error(`         ${r.sel}`);
  console.error(`         "${r.text}"  —  ${r.routes.length} page(s), e.g. ${r.routes[0]}\n`);
}
process.exit(1);
