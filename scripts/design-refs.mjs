#!/usr/bin/env node
/**
 * The reference sweep /design-direction § 1 starts from.
 *
 *   npm run design:refs -- --category business-corporate [--sotd 12] [--n 24]
 *                          [--elements hero_image,about_us,…|none] [--per-band 10]
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
 * THREE LISTINGS, TWO GRAINS. The category and the Sites of the Day are
 * whole sites — the register, the pacing, the one signature move. awwwards
 * Elements (28 Sep 2026) is the same award-tier work cut by BAND — hero,
 * header, about, pricing, FAQ, stats, team, CTA, contact, footer — which is
 * the grain /design-direction actually decides at: a services panel, a
 * pricing table, an About page are borrowed and re-expressed one band at a
 * time. So the sheet carries one table per band, each row the element, who
 * made it, the live page it was cut from and the awwwards page. The band
 * list defaults to the bands a site from this template has; `--elements`
 * overrides it, `--elements none` skips the pass.
 *
 * Two tag families are counted separately because they mean opposite
 * things here: REGISTER tags (typography, minimal, clean, scrolling,
 * grid, animation, header design…) are what the category is doing and what
 * this template can borrow at zero JS; TECH tags (GSAP, Three.js, WebGL,
 * React, Webflow, Framer, Lottie…) are the warning signal — a look that
 * needs a runtime is a look this template cannot hold.
 *
 * THE ELEMENTS TRAP. `/elements/<x>/` is a category only when `<x>` is one
 * of the slugs awwwards knows; any other word answers 200 with a full grid
 * that is a TEXT SEARCH for that word (`services` is one — awwwards has no
 * services category). The sheet says which it got, per band, read from the
 * page's own filter links (`scripts/lib/awwwards.mjs`), so a search is never
 * filed as a category and a typo never fills a table with the wrong band.
 *
 * Output: marketing/design-refs.md, GENERATED (never hand-edited — the
 * readings go in marketing/design-brief.md). Each sweep is a dated
 * `## YYYY-MM-DD — sweep` block prepended above the previous ones, so the
 * quarterly revisit (ACTIONS A-Q04, `entries:` check) can diff two dates.
 *
 * Network: on demand only, never in CI or verify. awwwards serves its
 * category, SOTD and elements pages to a plain fetch (one request per
 * band; the live page is in the card, so no second request); a gallery
 * that answers 403/429 (a bot wall) is printed as a URL to read in a
 * browser — never summarised from memory. No cookies, no login, nothing
 * stored but the public listing.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import {
  siteCards,
  elementCards,
  elementCategories,
  elementMode,
  countTags,
} from './lib/awwwards.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i > -1 && args[i + 1] ? args[i + 1] : fallback;
};
const CATEGORY = opt('category', 'business-corporate');
const N = +opt('n', 24);
const SOTD = +opt('sotd', 12);
const PER_BAND = +opt('per-band', 10);
// The bands a site from this template has, in page order. Every one is an
// awwwards category slug (checked live on 28 Sep 2026); `services` is not a
// category there and is deliberately absent — it is read from the About and
// pricing tables and the whole-site entries.
const DEFAULT_ELEMENTS =
  'hero_image,header,menu,about_us,pricing_page,FAQ,stats,team,CTA,contact,footer,blog';
const ELEMENTS =
  opt('elements', DEFAULT_ELEMENTS) === 'none'
    ? []
    : opt('elements', DEFAULT_ELEMENTS)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
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

/** The live site behind an awwwards entry: its /sites/<slug> page links out once. */
async function liveUrl(slug) {
  const r = await get(`https://www.awwwards.com/sites/${slug}`);
  if (!r.text) return '';
  const m =
    /href="(https?:\/\/(?!(?:www\.)?awwwards\.com)[^"?#]+)[^"]*"[^>]*>\s*(?:<[^>]+>\s*)*(?:Visit|Go to)\b/i.exec(
      r.text,
    ) ?? /"url":"(https?:\\?\/\\?\/(?!(?:www\.)?awwwards\.com)[^"]+)"/.exec(r.text);
  return m ? m[1].replace(/\\\//g, '/') : '';
}

const fmtCounts = (rows, n = 14) =>
  rows.length
    ? rows
        .slice(0, n)
        .map(([t, k]) => `${t} ×${k}`)
        .join(' · ')
    : '(none)';

// The galleries beyond awwwards, each with the URL that filters to a
// category where the gallery has one. Reachability is checked and printed;
// the listing itself is JS-rendered on most of them, so they are READ, not
// scraped. `job` says which register each curates — read two or three that
// match the site's job, not all of them.
const GALLERIES = [
  { name: 'Godly', url: 'https://godly.website/', job: 'the current product-marketing register' },
  {
    name: 'Land-book',
    url: 'https://land-book.com/',
    job: 'landing pages, filterable by industry',
  },
  {
    name: 'Landdding',
    url: 'https://www.landdding.com/',
    job: 'landing pages by 40+ industries and by platform, designer credited',
  },
  { name: 'Lapa Ninja', url: 'https://www.lapa.ninja/', job: 'landing pages by industry' },
  {
    name: 'SiteInspire',
    url: 'https://www.siteinspire.com/',
    job: 'restraint and editorial layouts',
  },
  { name: 'Minimal Gallery', url: 'https://minimal.gallery/', job: 'restraint, done well' },
  { name: 'One Page Love', url: 'https://onepagelove.com/', job: 'single-page sites' },
  {
    name: 'Dark Mode Design',
    url: 'https://www.darkmodedesign.com/',
    job: 'inverted palettes done well',
  },
  {
    name: 'Httpster',
    url: 'https://httpster.net/',
    job: 'typographic and brutalist — the warning sign of the register',
  },
  {
    name: 'Inspora',
    url: 'https://inspora.design/',
    job: 'web, branding, product and motion screenshots by category',
  },
  {
    name: 'Refero',
    url: 'https://refero.design/',
    job: 'product UI patterns for the hero panel and any tool page',
  },
  {
    name: 'Fonts In Use',
    url: 'https://fontsinuse.com/',
    job: 'type pairings in the wild, faces named',
  },
  { name: 'Typewolf', url: 'https://www.typewolf.com/', job: 'type pairings, faces named' },
  {
    name: 'Designeer',
    url: 'https://designeer.xyz/',
    job: 'a directory of the galleries and component libraries — for finding the next one, not a reference itself',
  },
];

console.log(
  `→ design reference sweep — awwwards /${CATEGORY}/ + Sites of the Day${ELEMENTS.length ? ` + Elements × ${ELEMENTS.length} bands` : ''}`,
);

const cat = await get(`https://www.awwwards.com/websites/${CATEGORY}/`);
const sotd = await get('https://www.awwwards.com/websites/sites_of_the_day/');
const catCards = cat.text ? siteCards(cat.text).slice(0, N) : [];
const sotdCards = sotd.text ? siteCards(sotd.text).slice(0, SOTD) : [];
if (!catCards.length)
  console.log(
    `   awwwards category answered ${cat.status} — read https://www.awwwards.com/websites/${CATEGORY}/ in a browser`,
  );
if (!sotdCards.length)
  console.log(
    `   awwwards SOTD answered ${sotd.status} — read https://www.awwwards.com/websites/sites_of_the_day/ in a browser`,
  );

// Resolve the live URL for the entries the skill will actually open (the
// first twelve of the category, the SOTD list whole) — one request each.
for (const c of [...catCards.slice(0, 12), ...sotdCards]) c.url = await liveUrl(c.slug);

// One request per band. The live page is inside each card, so none more.
const bands = [];
let known = new Set();
for (const slug of ELEMENTS) {
  const r = await get(`https://www.awwwards.com/elements/${slug}/`);
  const mode = elementMode(r.text, slug);
  if (r.text && !known.size) known = elementCategories(r.text);
  const cards = mode === 'unknown' ? [] : elementCards(r.text).slice(0, PER_BAND);
  bands.push({ slug, mode, status: r.status, cards, counts: countTags(cards) });
  if (mode === 'text')
    console.log(
      `   /elements/${slug}/ is a TEXT SEARCH, not a category — filed as one; the categories are: ${[...known].sort().join(', ') || '(unread)'}`,
    );
  if (mode === 'unknown')
    console.log(
      `   /elements/${slug}/ answered ${r.status} — read https://www.awwwards.com/elements/${slug}/ in a browser`,
    );
}

const galleries = [];
for (const g of GALLERIES) {
  const r = await get(g.url);
  galleries.push({ ...g, status: r.status });
}

const catCounts = countTags(catCards);
const sotdCounts = countTags(sotdCards);

const cell = (s) => String(s ?? '').replace(/\|/g, '\\|');
const card = (c) =>
  `| ${cell(c.title)} | ${c.date} | ${c.url ? `<${c.url}>` : '—'} | <https://www.awwwards.com/sites/${c.slug}> | ${cell(c.tags.join(', '))} |`;
const element = (c) =>
  `| ${cell(c.title)} | ${cell(c.by) || '—'} | ${c.url ? `<${c.url}>` : '—'} | ${c.slug ? `<https://www.awwwards.com/inspiration/${c.slug}>` : '—'} | ${cell(c.tags.join(', '))} |`;

const bandBlock = (b) => {
  const what =
    b.mode === 'category'
      ? 'category'
      : b.mode === 'text'
        ? `**text search** — awwwards has no \`${b.slug}\` category; these matched the word, read them as such`
        : `answered ${b.status || 'network'} — read <https://www.awwwards.com/elements/${b.slug}/> in a browser`;
  return `#### ${b.slug} (${b.cards.length}, ${what})

Tech tags (the warning signal): ${fmtCounts(b.counts.tech, 8)}

| Element | By | Live page | awwwards | Tags |
|---|---|---|---|---|
${b.cards.map(element).join('\n') || '| (nothing read) | | | | |'}
`;
};

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
${
  ELEMENTS.length
    ? `
### awwwards — Elements, one table per band (${bands.reduce((n, b) => n + b.cards.length, 0)} elements)

The same award-tier work cut by band — read the table for a band right
before that band is designed (§ 3), open the live page, name the one
thing worth borrowing and the template mechanism that holds it. A band
marked **text search** is not an awwwards category; its rows matched the
word and are read with that in mind.

${bands.map(bandBlock).join('\n')}`
    : ''
}
### The galleries beyond awwwards (read two or three that match the site's job)

| Gallery | Curates | Reachable today |
|---|---|---|
${galleries.map((g) => `| [${g.name}](${g.url}) | ${g.job} | ${g.status === 200 ? 'yes' : `no (${g.status || 'network'}) — open in a browser`} |`).join('\n')}

`;

const head = `# Design references — GENERATED by \`npm run design:refs\`, never hand-edited

What the category, the awards and the elements gallery are doing on the
date of each sweep, as the starting sheet for \`/design-direction\` § 1. The
readings (one line per site or element, what it does and what it refuses)
belong in \`marketing/design-brief.md\`; this file only records what was
there to read. Newest sweep first; keep the older ones — the quarterly
revisit (ACTIONS A-Q04) diffs two dates.

`;

const prev = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
const oldSweeps = prev.includes('\n## ') ? prev.slice(prev.indexOf('\n## ') + 1) : '';
writeFileSync(OUT, head + block + oldSweeps);

const elementsRead = bands.reduce((n, b) => n + b.cards.length, 0);
console.log(
  `   ${catCards.length} category entries, ${sotdCards.length} SOTD, ${elementsRead} elements across ${bands.filter((b) => b.cards.length).length}/${bands.length} bands, ${galleries.filter((g) => g.status === 200).length}/${galleries.length} galleries reachable`,
);
console.log(`   register: ${fmtCounts(catCounts.register, 8)}`);
console.log(`   tech:     ${fmtCounts(catCounts.tech, 8)}`);
console.log(
  `   wrote ${OUT} — now read the sites, one line each, into marketing/design-brief.md § 1`,
);
