#!/usr/bin/env node
/**
 * Every built-output invariant, in one place — run by CI and by
 * `npm run verify` (the pre-push battery), so the two can never drift.
 * Each check exists because its absence shipped a defect somewhere; the
 * one-line WHY above each is the institutional memory.
 *
 * Collects every failure per run rather than stopping at the first
 * (finding all of them beats finding one), and exits 1 if any fired.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { ROBOTS_AGENTS } from './lib/crawlers.mjs';

const DIST = 'dist';
let fail = 0;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}
const FILES = walk(DIST).sort();
const html = new Map(FILES.map((f) => [f, readFileSync(f, 'utf8')]));

function check(title, fn) {
  console.log(`→ ${title}`);
  const failures = [];
  fn((msg) => failures.push(msg));
  if (failures.length) {
    for (const m of failures) console.log(`   FAIL: ${m}`);
    fail = 1;
  } else {
    console.log('   ok');
  }
}

// One <h1>: templates render the frontmatter title as the h1; MDX starts at ##.
check('exactly one <h1> per page', (bad) => {
  for (const [f, h] of html) {
    const n = (h.match(/<h1[\s>]/g) ?? []).length;
    if (n !== 1) bad(`${f} has ${n} <h1> (page templates render the frontmatter title as the h1 — start MDX bodies at ##)`);
  }
});

// A bare table scrolls the whole page sideways on a phone.
check('every table wrapped in .table-scroll', (bad) => {
  for (const [f, h] of html) {
    const t = (h.match(/<table/g) ?? []).length;
    const w = (h.match(/table-scroll/g) ?? []).length;
    if (t > w) bad(`${f} has ${t} table(s) but ${w} wrapper(s)`);
  }
});

// BaseLayout clamps via clampTitle(); a failure means the clamp was bypassed.
// Measured on the DECODED string: Astro escapes an apostrophe to &#39;, five
// characters for one, and a 60-character title read as 64 (found 20 Sep 2026).
const decode = (t) => t.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
check('<title> at most 60 characters', (bad) => {
  for (const [f, h] of html) {
    const m = h.match(/<title>([^<]*)<\/title>/);
    if (!m) continue;
    const t = decode(m[1]);
    if (t.length > 60) bad(`${f} — ${t.length} chars: "${t}"`);
  }
});

// Two pages sharing a title compete for the same query.
check('page titles are unique', (bad) => {
  const seen = new Map();
  for (const [f, h] of html) {
    const m = h.match(/<title>([^<]*)<\/title>/);
    if (!m) continue;
    if (seen.has(m[1])) bad(`${f} and ${seen.get(m[1])} share the title "${m[1]}"`);
    else seen.set(m[1], f);
  }
});

// Google rewrites vague descriptions and truncates past ~165; bounds apply to
// indexable pages only — noindex pages never render a snippet.
check('meta descriptions present, unique, 70–165 chars on indexable pages', (bad) => {
  const seen = new Map();
  for (const [f, h] of html) {
    const m = h.match(/<meta name="description" content="([^"]*)"/);
    if (!m) { bad(`${f} has no meta description`); continue; }
    if (seen.has(m[1])) bad(`${f} and ${seen.get(m[1])} share a meta description`);
    else seen.set(m[1], f);
    const noindex = /name="robots" content="noindex/.test(h);
    if (!noindex && (m[1].length < 70 || m[1].length > 165)) {
      bad(`${f} description is ${m[1].length} chars (want 70–165): "${m[1].slice(0, 80)}…"`);
    }
  }
});

// If the @generated-csp marker survives the build, the generator was dropped
// from the pipeline and the site ships with no CSP, silently.
check('dist/_headers carries the generated CSP', (bad) => {
  const headers = readFileSync(join(DIST, '_headers'), 'utf8');
  if (!/^ {2}Content-Security-Policy: /m.test(headers)) {
    bad('no Content-Security-Policy in dist/_headers — did scripts/generate-csp.mjs run?');
  }
});

// Every root-relative href must resolve to a file the deploy will serve.
// Worker-only routes are whitelisted explicitly — the whitelist doubles as
// the inventory of off-repo routes.
check('no broken internal links', (bad) => {
  const WORKER_ROUTES = ['/api/', '/hi'];
  for (const [f, h] of html) {
    for (const m of h.matchAll(/href="(\/[^"#?]*)/g)) {
      const p = decodeURIComponent(m[1]);
      if (WORKER_ROUTES.some((w) => p.startsWith(w))) continue;
      const clean = p.replace(/\/$/, '') || '/index';
      const candidates = [join(DIST, clean), join(DIST, clean + '.html'), join(DIST, clean, 'index.html')];
      if (!candidates.some((c) => existsSync(c))) bad(`${f} links to ${p} which nothing serves`);
    }
  }
});

// Conversions leave the page — no pageview fires — so an unmarked CTA is
// invisible to analytics forever. data-umami-event is the vendor-neutral marker.
check('every CTA carries an analytics event', (bad) => {
  for (const [f, h] of html) {
    for (const m of h.matchAll(/<a\s[^>]*>/g)) {
      const tag = m[0];
      const isCta = /class="[^"]*\bbtn\b[^"]*"/.test(tag);
      const leaves = /href="(tel:|mailto:)/.test(tag);
      if ((isCta || leaves) && !/data-umami-event=/.test(tag)) bad(`${f} unmeasured CTA: ${tag.slice(0, 120)}`);
    }
  }
});

// Empty alt is a decision (decorative); MISSING alt is the forgotten case
// assistive tech reads as a filename.
check('every <img> has an alt attribute', (bad) => {
  for (const [f, h] of html) {
    for (const m of h.matchAll(/<img\s[^>]*>/g)) {
      if (!/\salt\s*=/.test(m[0])) bad(`${f} img without alt: ${m[0].slice(0, 100)}`);
    }
  }
});

// AGENTS rule 15 mechanized.
check('target=_blank links announce the new tab and carry noopener', (bad) => {
  for (const [f, h] of html) {
    for (const m of h.matchAll(/<a\s[^>]*target="_blank"[^>]*>(.*?)<\/a>/gs)) {
      const relOk = /rel="[^"]*noopener[^"]*"/.test(m[0]);
      const announced = /new tab/i.test(m[1]);
      if (!relOk || !announced) bad(`${f} _blank link needs rel=noopener + "new tab" in its accessible name: ${m[0].slice(0, 120)}`);
    }
  }
});

// The iron rule: noindex ⇔ out of sitemap.
check('no noindex page in the sitemap', (bad) => {
  const xml = readFileSync(join(DIST, 'sitemap-0.xml'), 'utf8');
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const p = new URL(m[1]).pathname.replace(/\/$/, '') || '/';
    const clean = p === '/' ? '/index' : p;
    const file = [join(DIST, clean + '.html'), join(DIST, clean, 'index.html')].find((c) => existsSync(c));
    if (!file) continue; // coverage is the lastmod check's job
    if (/name="robots" content="noindex/.test(readFileSync(file, 'utf8'))) {
      bad(`${m[1]} is in the sitemap but renders noindex`);
    }
  }
});

// A broken postbuild step would otherwise ship a stale or empty search index
// with a green build.
check('pagefind index covers exactly the data-pagefind-body pages', (bad) => {
  const entry = JSON.parse(readFileSync(join(DIST, 'pagefind', 'pagefind-entry.json'), 'utf8'));
  const indexed = Object.values(entry.languages).reduce((n, l) => n + l.page_count, 0);
  const expected = [...html.values()].filter((h) => h.includes('data-pagefind-body')).length;
  if (indexed !== expected) bad(`pagefind indexed ${indexed} pages, but ${expected} pages carry data-pagefind-body`);
});

// Internal linking by construction — only enforced once a collection has ≥2
// published entries (one post cannot link to a sibling).
check('no orphan content pages (related links present)', (bad) => {
  for (const dir of ['blog', 'glossary']) {
    const pages = readdirSync(join(DIST, dir)).filter((f) => f.endsWith('.html'));
    if (pages.length < 2) continue;
    for (const p of pages) {
      const h = readFileSync(join(DIST, dir, p), 'utf8');
      const rel = h.match(/<section class="related"[\s\S]*?<\/section>/);
      if (!rel || !/href="\/(blog|glossary)\//.test(rel[0])) bad(`${dir}/${p} has no related-content links — an orphan page`);
    }
  }
});

// Structured data must reflect the page (count + order, entity-decoded).
check('visible breadcrumbs mirror BreadcrumbList JSON-LD', (bad) => {
  for (const [f, h] of html) {
    if (!h.includes('"BreadcrumbList"')) continue;
    const ld = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    const graph = JSON.parse(ld[1].replaceAll('\\u003C', '<'));
    const list = (graph['@graph'] ?? [graph]).find((n) => n['@type'] === 'BreadcrumbList');
    const nav = h.match(/<nav class="crumbs"[^>]*>[\s\S]*?<\/nav>/);
    if (!nav) { bad(`${f} emits BreadcrumbList but renders no visible trail`); continue; }
    const lis = (nav[0].match(/<li[\s>]/g) ?? []).length;
    if (lis !== list.itemListElement.length) {
      bad(`${f} BreadcrumbList has ${list.itemListElement.length} items, visible trail has ${lis}`);
      continue;
    }
    const decoded = nav[0]
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
      .replace(/&quot;/g, '"').replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    let pos = 0;
    for (const item of list.itemListElement) {
      const at = decoded.indexOf(item.name, pos);
      if (at === -1) { bad(`${f} breadcrumb "${item.name}" missing or out of order in the visible trail`); break; }
      pos = at;
    }
  }
});

// A scroll box only a pointer can move locks keyboard users out (WCAG 2.1.1).
check('every .table-scroll wrapper is a labelled keyboard-scrollable region', (bad) => {
  for (const [f, h] of html) {
    for (const m of h.matchAll(/<div[^>]*class="[^"]*table-scroll[^"]*"[^>]*>/g)) {
      const tag = m[0];
      if (!/tabindex="0"/.test(tag) || !/role="region"/.test(tag) || !/aria-label="[^"]+"/.test(tag)) {
        bad(`${f} table-scroll without tabindex/role/aria-label: ${tag.slice(0, 120)}`);
      }
    }
  }
});

// The breadcrumb check parses only pages WITH a BreadcrumbList; a malformed
// @graph anywhere else ships silently and costs rich results.
check('every JSON-LD block parses', (bad) => {
  for (const [f, h] of html) {
    for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try { JSON.parse(m[1]); }
      catch (e) { bad(`${f} JSON-LD does not parse: ${e.message}`); }
    }
  }
});

// The worker falls back to HTML when a twin is missing, so a broken generator
// degrades silently — same rationale as the pagefind coverage check.
// Helper: every JSON-LD node on a page, @graph flattened.
function ldNodes(h) {
  const nodes = [];
  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const j = JSON.parse(m[1]);
      for (const n of Array.isArray(j['@graph']) ? j['@graph'] : [j]) if (n && typeof n === 'object') nodes.push(n);
    } catch { /* the parse check above reports it */ }
  }
  return nodes;
}

// ENTITY HYGIENE. An engine resolves the brand to an entity from the strings
// in Organization/Person/WebSite nodes, verbatim. The Sep 2026 audit of another
// site found its brand name shipped as "B&#39;spoke" in its own JSON-LD (an
// apostrophe escaped twice and never decoded) and a sameAs array with four
// empty strings — the canonical name a knowledge graph reads was a string no
// human would type, and the corroboration list was invalid. Neither shows on
// the page; both are one template edit away here. So: no HTML entity survives
// in a name/description/headline string, and every sameAs/url/logo/image is an
// absolute http(s) URL with nothing empty.
check('JSON-LD entity hygiene: no HTML entities in names, every sameAs/url a real absolute URL', (bad) => {
  const ENTITY = /&(#\d+|#x[0-9a-f]+|amp|quot|apos|lt|gt|nbsp);/i;
  const TEXT_KEYS = new Set(['name', 'headline', 'description', 'alternateName', 'legalName', 'slogan', 'jobTitle']);
  const URL_KEYS = new Set(['sameAs', 'url', 'logo', 'image', 'thumbnailUrl', 'contentUrl']);
  const visit = (f, node, path) => {
    for (const [k, v] of Object.entries(node)) {
      if (TEXT_KEYS.has(k) && typeof v === 'string' && ENTITY.test(v)) bad(`${f} ${path}${k} carries an HTML entity: ${JSON.stringify(v)}`);
      if (URL_KEYS.has(k)) {
        for (const u of Array.isArray(v) ? v : [v]) {
          if (u && typeof u === 'object') { if (u.url !== undefined) visit(f, { url: u.url }, `${path}${k}.`); continue; }
          if (typeof u !== 'string' || !/^https?:\/\/\S+$/.test(u)) bad(`${f} ${path}${k} is not an absolute URL: ${JSON.stringify(u)}`);
        }
      }
      if (v && typeof v === 'object' && !URL_KEYS.has(k)) {
        for (const child of Array.isArray(v) ? v : [v]) if (child && typeof child === 'object') visit(f, child, `${path}${k}.`);
      }
    }
  };
  for (const [f, h] of html) for (const n of ldNodes(h)) visit(f, n, '');
});

// The Organization node is the spine: name, url, logo, description and a
// contact point are what make it resolvable (the Sep 2026 discovery-audit frame, ENT-04). It is
// emitted once from BaseLayout, so this guards a refactor that drops a field.
check('Organization node carries name, url, logo, description, contactPoint on every page', (bad) => {
  for (const [f, h] of html) {
    const org = ldNodes(h).find((n) => n['@type'] === 'Organization');
    if (!org) { bad(`${f} has no Organization node`); continue; }
    for (const k of ['name', 'url', 'logo', 'description', 'contactPoint']) if (!org[k]) bad(`${f} Organization lacks ${k}`);
  }
});

// A collection index that links to its members but describes itself only as
// a page is, to an engine, a page — not a list (discovery-audit frame SD-04). Rule:
// any page that links to three or more pages under its own path prefix is an
// index and must emit an ItemList (itemListElement). Generic on purpose: the
// next collection index gets the rule without anyone listing it here.
check('every collection index page emits an ItemList', (bad) => {
  for (const [f, h] of html) {
    const route = '/' + f.slice(DIST.length + 1).replace(/\.html$/, '').split(sep).join('/');
    // Only top-level pages can be a collection index: /blog, /glossary, /vs …
    if (route === '/index' || route.split('/').length !== 2) continue;
    const prefix = `${route}/`;
    const children = new Set([...h.matchAll(/href="([^"#?]+)"/g)].map((m) => m[1]).filter((u) => u.startsWith(prefix)));
    if (children.size < 3) continue;
    if (!ldNodes(h).some((n) => n['@type'] === 'ItemList' || n.mainEntity?.['@type'] === 'ItemList' || n.itemListElement)) {
      bad(`${f} links to ${children.size} pages under ${prefix} but emits no ItemList — add one from the same loop that renders the list`);
    }
  }
});

// robots.txt stays open to the answer-engine crawlers by decision (the
// comments in src/pages/robots.txt.ts). A Disallow for one of them is a decision to
// take on purpose, in that file's comment, not a line that slips in.
check('robots.txt does not Disallow an answer-engine crawler', (bad) => {
  const robotsPath = join(DIST, 'robots.txt');
  if (!existsSync(robotsPath)) return;
  const groups = readFileSync(robotsPath, 'utf8').split(/\n(?=User-agent:)/i);
  // Derived from the registry, not repeated here: an engine added to
  // crawlers.mjs and forgotten here would silently lose this guard, which is
  // the exact defect class AGENTS rule 18 says to mechanize rather than
  // remember. `*` is not in the registry (it is not a crawler) and is watched
  // because a Disallow on it takes the whole site out of every index at once.
  const WATCH = new Set(['*', ...ROBOTS_AGENTS.map((a) => a.toLowerCase())]);
  for (const g of groups) {
    const ua = /User-agent:\s*(\S+)/i.exec(g)?.[1];
    if (!ua || !WATCH.has(ua.toLowerCase())) continue;
    if (/^Disallow:\s*\/\s*$/im.test(g)) bad(`robots.txt disallows ${ua} — AGENTS § Content rules: being cited is a distribution channel, and the robots.txt generator's own comment is the decision`);
  }
});

check('every content page has its markdown twin', (bad) => {
  for (const dir of ['blog', 'glossary']) {
    for (const p of readdirSync(join(DIST, dir)).filter((f) => f.endsWith('.html'))) {
      if (!existsSync(join(DIST, dir, p.replace(/\.html$/, '.md')))) {
        bad(`${dir}/${p} has no markdown twin — did markdown-twins.mjs run?`);
      }
    }
  }
});

// /search is the only page allowed page-level JS (AGENTS rule 17); the only
// legitimate script src is the proxied Umami tag. A generated "small helper
// script" shows up here, not in a code review three months later.
check('no script src outside the allowlist (AGENTS rule 17)', (bad) => {
  const ALLOWED = [/^\/s\.js$/];
  for (const [f, h] of html) {
    for (const m of h.matchAll(/<script[^>]*\ssrc="([^"]+)"[^>]*>/g)) {
      if (!ALLOWED.some((re) => re.test(m[1]))) {
        bad(`${f} ships script src ${m[1]} — if deliberate, extend the allowlist here AND document it in CHECKLIST`);
      }
    }
  }
});

// Every canonical must point at the URL this very file is served from:
// extensionless, no trailing slash. Guaranteed today by cleanPath() in
// BaseLayout — this keeps it guaranteed.
check('canonicals are self-consistent', (bad) => {
  for (const [f, h] of html) {
    const m = h.match(/<link rel="canonical" href="([^"]+)"/);
    if (!m) { bad(`${f} has no canonical`); continue; }
    const p = new URL(m[1]).pathname;
    if (/\.html$/.test(p) || (p !== '/' && /\/$/.test(p))) {
      bad(`${f} canonical ${p} has .html or trailing slash — a URL the server never hands out`);
      continue;
    }
    const expected = p === '/' ? join(DIST, 'index.html') : join(DIST, ...(p.slice(1) + '.html').split('/'));
    if (resolve(expected) !== resolve(f)) bad(`${f} canonical resolves to ${expected.split(sep).join('/')}, not itself`);
  }
});

// The homepage's social card is the BRAND card (SITE.ogImage — the harbour
// scene rendered from marketing/og/default.html), never a per-page title card.
// On the ancestor site render-pages.mjs rendered a card for '/', so
// og/pages/home.jpg existed, ogCardFor('/') preferred it, and the live
// homepage previewed as a lower-cased <title> fragment over a product
// screenshot while its docs said it used the brand card. Nothing noticed for six
// weeks because a scraper caches the first card it fetched. Two assertions:
// the built homepage points at SITE.ogImage, and no home card sits in public/
// waiting for the lookup to prefer it again.
check('homepage og:image is the brand card, not a page card', (bad) => {
  const site = readFileSync('src/data/site.ts', 'utf8');
  const brand = /ogImage:\s*'([^']+)'/.exec(site)?.[1];
  if (!brand) { bad('src/data/site.ts has no SITE.ogImage'); return; }
  const home = html.get(join(DIST, 'index.html'));
  if (!home) { bad('no dist/index.html'); return; }
  const og = /<meta property="og:image" content="([^"]+)"/.exec(home)?.[1] ?? '';
  if (!og.endsWith(brand)) bad(`dist/index.html og:image is ${og} — expected ${brand} (index.astro passes ogImage={SITE.ogImage}; render-pages.mjs skips '/')`);
  // The file itself. On the ancestor site render-pages.mjs cleared public/og/
  // before writing the page cards and took default.png with it; the meta
  // still pointed at the right path and the homepage previewed as a 404.
  if (!existsSync(join('public', brand)) && !existsSync(join(DIST, brand))) bad(`${brand} is not on disk in public/ — the brand card is missing (node marketing/og/render.mjs renders it; render-pages.mjs preserves it)`);
  for (const ext of ['jpg', 'png', 'webp']) {
    for (const stale of [join('public', 'og', 'pages', `home.${ext}`), join('public', 'og', `index.${ext}`)]) {
      if (existsSync(stale)) bad(`${stale} exists — a stale homepage page card; delete it — render-pages.mjs must keep skipping '/'`);
    }
  }
});

// Every other indexable page previews as ITSELF: its own card, on disk, shared
// with no other page. The card is rendered from the built page
// (marketing/og/render-pages.mjs) and carries the brand row, the title, the
// description and the page's own lead figure — so a missing card means
// render-pages was not re-run after a content change. On the ancestor site a
// third of the pages previewed as the default card for weeks because two
// collections had cards nothing pointed at and one had none. CHECKLIST §9.
check('every indexable page has its own social card, and no two pages share one', (bad) => {
  const site = readFileSync('src/data/site.ts', 'utf8');
  const brand = /ogImage:\s*'([^']+)'/.exec(site)?.[1] ?? '/og/default.png';
  const seen = new Map();
  for (const [f, h] of html) {
    const route = '/' + f.slice(DIST.length + 1).replace(/\.html$/, '').replace(/(^|\/)index$/, '');
    if (route === '/' || route === '/404') continue;
    if (/<meta name="robots" content="[^"]*noindex/.test(h)) continue;
    const og = /<meta property="og:image" content="([^"]+)"/.exec(h)?.[1];
    if (!og) { bad(`${f} has no og:image`); continue; }
    const path = new URL(og).pathname;
    if (!path.startsWith('/og/')) continue; // the page declared its own ogImage — its call
    if (path.endsWith(brand.replace(/^\//, '')) || path === brand) { bad(`${f} falls back to the brand card — run marketing/og/render-pages.mjs after npm run build`); continue; }
    if (!existsSync(join('public', path))) bad(`${f} og:image ${path} is not on disk`);
    if (path !== `/og${route}.jpg`) bad(`${f} og:image is ${path}, expected /og${route}.jpg (src/lib/ogCard.ts and render-pages.mjs must agree)`);
    if (seen.has(path)) bad(`${f} and ${seen.get(path)} share the card ${path}`);
    seen.set(path, f);
  }
});

// Every content page carries a figure — a pictograph or infographic drawn at
// build time (src/components/Figure.astro) — and marks its lead one with
// data-og-figure, which is what the social card lifts. A page without one
// reads as text-only and previews as a title alone (AGENTS § Figures).
check('every content page carries a lead figure (data-og-figure)', (bad) => {
  const content = /^dist\/(blog|glossary)\/(?!index\.html$).+\.html$/;
  for (const [f, h] of html) {
    if (!content.test(f)) continue;
    const leads = (h.match(/data-og-figure/g) ?? []).length;
    if (leads !== 1) bad(`${f} has ${leads} lead figures (expected exactly one — declare \`figures:\` in frontmatter or let the collection's auto figure render)`);
  }
});

check('robots.txt and rss.xml exist and are sane', (bad) => {
  const robotsPath = join(DIST, 'robots.txt');
  if (!existsSync(robotsPath)) bad('no dist/robots.txt');
  else if (!/^Sitemap: https?:\/\/.+sitemap/m.test(readFileSync(robotsPath, 'utf8'))) {
    bad('robots.txt has no absolute Sitemap line');
  }
  const rssPath = join(DIST, 'rss.xml');
  if (!existsSync(rssPath)) bad('no dist/rss.xml');
  else {
    const rss = readFileSync(rssPath, 'utf8');
    if (!/^<\?xml/.test(rss)) bad('rss.xml missing XML declaration');
    const open = (rss.match(/<item>/g) ?? []).length;
    const close = (rss.match(/<\/item>/g) ?? []).length;
    if (open !== close || open === 0) bad(`rss.xml items malformed (${open} open, ${close} close)`);
  }
});

if (fail) {
  console.log('\nInvariant check failed.');
  process.exit(1);
}
console.log('\nAll invariants hold.');
