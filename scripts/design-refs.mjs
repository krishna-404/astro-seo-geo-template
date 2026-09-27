#!/usr/bin/env node
/**
 * The reference sweep /design-direction § 1 starts from.
 *
 *   npm run design:refs -- --category business-corporate [--sotd 12] [--n 24]
 *
 * WHY THIS IS A SCRIPT AND NOT A PARAGRAPH. "Look at the best sites first"
 * was a sentence in the skill, and a sentence is skipped the moment a
 * session is in a hurry. This fetches the category's current awwwards
 * entries and the latest Sites of the Day, counts the tags awwwards itself
 * applied, and writes the sheet the skill then reads one site at a time —
 * so a design decision starts from what is being made THIS quarter, never
 * from memory of last year's trends (AGENTS: decisions are made against
 * current references).
 *
 * Two tag families are counted separately because they mean opposite
 * things here: REGISTER tags (typography, minimal, clean, scrolling,
 * grid, animation, header design…) are what the category is doing and what
 * this template can borrow at zero JS; TECH tags (GSAP, Three.js, WebGL,
 * React, Webflow, Framer, Lottie…) are the warning signal — a look that
 * needs a runtime is a look this template cannot hold.
 *
 * Output: marketing/design-refs.md, GENERATED (never hand-edited — the
 * readings go in marketing/design-brief.md). Each sweep is a dated
 * `## YYYY-MM-DD — sweep` block prepended above the previous ones, so the
 * quarterly revisit (ACTIONS A-Q04, `entries:` check) can diff two dates.
 *
 * Network: on demand only, never in CI or verify. awwwards serves its
 * category and SOTD pages to a plain fetch; a gallery that answers 403/429
 * (a bot wall) is printed as a URL to read in a browser — never summarised
 * from memory. No cookies, no login, nothing stored but the public listing.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i > -1 && args[i + 1] ? args[i + 1] : fallback;
};
const CATEGORY = opt('category', 'business-corporate');
const N = +opt('n', 24);
const SOTD = +opt('sotd', 12);
const OUT = 'marketing/design-refs.md';
const TODAY = new Date().toISOString().slice(0, 10);

const UA = {
  'user-agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml',
  'accept-language': 'en',
};

/** Fetch with two retries — awwwards answers 503 to one request in ten. */
async function get(url) {
  let last = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: UA, redirect: 'follow' });
      if (r.ok) return { status: r.status, text: await r.text() };
      last = { status: r.status, text: '' };
      if (r.status === 403 || r.status === 429) return last; // a bot wall does not clear on retry
    } catch (e) {
      last = { status: 0, text: '', error: e.message };
    }
    await new Promise((res) => setTimeout(res, 800 * (attempt + 1)));
  }
  return last;
}

const decodeEntities = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

/** awwwards embeds one JSON object per card in data-collectable-model-value. */
function awwwardsCards(html) {
  const out = [];
  const seen = new Set();
  for (const m of html.matchAll(/data-collectable-model-value="([^"]+)"/g)) {
    try {
      const o = JSON.parse(decodeEntities(m[1]));
      if (!o.slug || seen.has(o.slug)) continue;
      seen.add(o.slug);
      out.push({
        title: o.title ?? o.slug,
        slug: o.slug,
        tags: Array.isArray(o.tags) ? o.tags.map(decodeEntities) : [],
        date: o.createdAt ? new Date(o.createdAt * 1000).toISOString().slice(0, 10) : '',
      });
    } catch {
      /* a card whose JSON we cannot read is skipped, not guessed */
    }
  }
  return out;
}

/** The live site behind an awwwards entry: its /sites/<slug> page links out once. */
async function liveUrl(slug) {
  const r = await get(`https://www.awwwards.com/sites/${slug}`);
  if (!r.text) return '';
  const m =
    /href="(https?:\/\/(?!(?:www\.)?awwwards\.com)[^"?#]+)[^"]*"[^>]*>\s*(?:<[^>]+>\s*)*(?:Visit|Go to)\b/i.exec(
      r.text
    ) ?? /"url":"(https?:\\?\/\\?\/(?!(?:www\.)?awwwards\.com)[^"]+)"/.exec(r.text);
  return m ? m[1].replace(/\\\//g, '/') : '';
}

// Tag families. Anything not in TECH counts as register; the split is what
// the skill reads first ("the tags are the trend signal, the tech tags are
// the warning signal" — /design-direction § 1).
const TECH =
  /^(gsap|gsap animation|three\.?js|webgl|react|next\.?js|nuxt|vue|svelte|webflow|framer|framer motion|lottie|spline|shopify|wordpress|wix|squarespace|readymag|barba|lenis|locomotive|unity|unreal|blender|3d)$/i;

const count = (cards) => {
  const reg = new Map();
  const tech = new Map();
  for (const c of cards)
    for (const t of c.tags) {
      const m = TECH.test(t) ? tech : reg;
      m.set(t, (m.get(t) ?? 0) + 1);
    }
  const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]);
  return { register: top(reg), tech: top(tech) };
};

const fmtCounts = (rows, n = 14) =>
  rows.length ? rows.slice(0, n).map(([t, k]) => `${t} ×${k}`).join(' · ') : '(none)';

// The galleries beyond awwwards, each with the URL that filters to a
// category where the gallery has one. Reachability is checked and printed;
// the listing itself is JS-rendered on most of them, so they are READ, not
// scraped. `job` says which register each curates — read two or three that
// match the site's job, not all of them.
const GALLERIES = [
  { name: 'Godly', url: 'https://godly.website/', job: 'the current product-marketing register' },
  { name: 'Land-book', url: 'https://land-book.com/', job: 'landing pages, filterable by industry' },
  { name: 'Landdding', url: 'https://www.landdding.com/', job: 'landing pages by 40+ industries and by platform, designer credited' },
  { name: 'Lapa Ninja', url: 'https://www.lapa.ninja/', job: 'landing pages by industry' },
  { name: 'SiteInspire', url: 'https://www.siteinspire.com/', job: 'restraint and editorial layouts' },
  { name: 'Minimal Gallery', url: 'https://minimal.gallery/', job: 'restraint, done well' },
  { name: 'One Page Love', url: 'https://onepagelove.com/', job: 'single-page sites' },
  { name: 'Dark Mode Design', url: 'https://www.darkmodedesign.com/', job: 'inverted palettes done well' },
  { name: 'Httpster', url: 'https://httpster.net/', job: 'typographic and brutalist — the warning sign of the register' },
  { name: 'Inspora', url: 'https://inspora.design/', job: 'web, branding, product and motion screenshots by category' },
  { name: 'Refero', url: 'https://refero.design/', job: 'product UI patterns for the hero panel and any tool page' },
  { name: 'Fonts In Use', url: 'https://fontsinuse.com/', job: 'type pairings in the wild, faces named' },
  { name: 'Typewolf', url: 'https://www.typewolf.com/', job: 'type pairings, faces named' },
  { name: 'Designeer', url: 'https://designeer.xyz/', job: 'a directory of the galleries and component libraries — for finding the next one, not a reference itself' },
];

console.log(`→ design reference sweep — awwwards /${CATEGORY}/ + Sites of the Day`);

const cat = await get(`https://www.awwwards.com/websites/${CATEGORY}/`);
const sotd = await get('https://www.awwwards.com/websites/sites_of_the_day/');
const catCards = cat.text ? awwwardsCards(cat.text).slice(0, N) : [];
const sotdCards = sotd.text ? awwwardsCards(sotd.text).slice(0, SOTD) : [];
if (!catCards.length)
  console.log(`   awwwards category answered ${cat.status} — read https://www.awwwards.com/websites/${CATEGORY}/ in a browser`);
if (!sotdCards.length)
  console.log(`   awwwards SOTD answered ${sotd.status} — read https://www.awwwards.com/websites/sites_of_the_day/ in a browser`);

// Resolve the live URL for the entries the skill will actually open (the
// first twelve of the category, the SOTD list whole) — one request each.
for (const c of [...catCards.slice(0, 12), ...sotdCards]) c.url = await liveUrl(c.slug);

const galleries = [];
for (const g of GALLERIES) {
  const r = await get(g.url);
  galleries.push({ ...g, status: r.status });
}

const catCounts = count(catCards);
const sotdCounts = count(sotdCards);

const card = (c) =>
  `| ${c.title} | ${c.date} | ${c.url ? `<${c.url}>` : '—'} | <https://www.awwwards.com/sites/${c.slug}> | ${c.tags.join(', ')} |`;

const block = `## ${TODAY} — sweep (category: ${CATEGORY})

**Read this, then open the sites.** One line per reference in
\`marketing/design-brief.md\` § 1: what it does with type, colour, layout,
motion, imagery — and what it refuses. A register tag is something this
template can borrow at zero JS; a tech tag is a look that needs a runtime,
which this template cannot hold (AGENTS rule 6, /design-direction § 1).

### awwwards — /${CATEGORY}/ (${catCards.length} entries)

Register tags: ${fmtCounts(catCounts.register)}
Tech tags (the warning signal): ${fmtCounts(catCounts.tech)}

| Site | Awarded | Live | awwwards | Tags |
|---|---|---|---|---|
${catCards.map(card).join('\n') || '| (fetch failed — read in a browser) | | | | |'}

### awwwards — Sites of the Day (${sotdCards.length} latest)

Register tags: ${fmtCounts(sotdCounts.register)}
Tech tags: ${fmtCounts(sotdCounts.tech)}

| Site | Awarded | Live | awwwards | Tags |
|---|---|---|---|---|
${sotdCards.map(card).join('\n') || '| (fetch failed — read in a browser) | | | | |'}

### The galleries beyond awwwards (read two or three that match the site's job)

| Gallery | Curates | Reachable today |
|---|---|---|
${galleries.map((g) => `| [${g.name}](${g.url}) | ${g.job} | ${g.status === 200 ? 'yes' : `no (${g.status || 'network'}) — open in a browser`} |`).join('\n')}

`;

const head = `# Design references — GENERATED by \`npm run design:refs\`, never hand-edited

What the category and the awards are doing on the date of each sweep, as
the starting sheet for \`/design-direction\` § 1. The readings (one line per
site, what it does and what it refuses) belong in \`marketing/design-brief.md\`;
this file only records what was there to read. Newest sweep first; keep the
older ones — the quarterly revisit (ACTIONS A-Q04) diffs two dates.

`;

const prev = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
const oldSweeps = prev.includes('\n## ') ? prev.slice(prev.indexOf('\n## ') + 1) : '';
writeFileSync(OUT, head + block + oldSweeps);

console.log(`   ${catCards.length} category entries, ${sotdCards.length} SOTD, ${galleries.filter((g) => g.status === 200).length}/${galleries.length} galleries reachable`);
console.log(`   register: ${fmtCounts(catCounts.register, 8)}`);
console.log(`   tech:     ${fmtCounts(catCounts.tech, 8)}`);
console.log(`   wrote ${OUT} — now read the sites, one line each, into marketing/design-brief.md § 1`);
