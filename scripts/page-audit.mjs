#!/usr/bin/env node
/**
 * page-audit.mjs — the AI-search page checklist, scored per page.
 *
 *   npm run audit:pages                 # every indexable content page, worst first
 *   npm run audit:pages -- --page /blog/x   # one page, every check with its verdict
 *   npm run audit:pages -- --json
 *   npm run audit:pages -- --min 70     # exit 1 if any page scores under 70 (a draft gate)
 *
 * WHY. marketing/page-guidelines.md carries the checklist a page has to clear
 * to be lifted into an answer — key takeaways up top, question-shaped
 * headings, extractable passages, a FAQ in the searcher's words, a table or a
 * list, a figure, named sources, an author, a visible date, the fan-out
 * buckets (cost, time, risks, alternatives, who it is for, next steps). A
 * checklist in prose is worked once and forgotten; this scores it on every
 * built page so a page that drifts is named, with the FIRST fix to make.
 *
 * Two readers: the cadence run (lowest-scoring pages with impressions are
 * the refresh shortlist; the report's Page audit section) and /write-content
 * (run it on the draft, fix what it names, before the PR).
 *
 * INFORMATIONAL by default — the invariant battery owns the hard rules
 * (one h1, tldr present, sources on glossary, figure present). `--min N`
 * turns it into a gate for a writing run that wants one. A check marked n/a
 * prints its reason and never counts. Nothing here is site copy.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, sep } from 'node:path';

const DIST = 'dist';
const args = process.argv.slice(2);
const AS_JSON = args.includes('--json');
const ONE = args[args.indexOf('--page') + 1] && args.includes('--page') ? args[args.indexOf('--page') + 1] : null;
const MIN = args.includes('--min') ? Number(args[args.indexOf('--min') + 1]) : null;
if (!existsSync(DIST)) {
  console.error('page-audit: no dist/ — run `npm run build` first.');
  process.exit(2);
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}
const route = (f) => '/' + f.slice(DIST.length + 1).replace(/\.html$/, '').split(sep).join('/').replace(/^index$/, '');
const decode = (t) => t.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
const strip = (h) => decode(h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const DAY = 864e5;

function ldTypes(h) {
  const types = new Set();
  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const j = JSON.parse(m[1]);
      for (const n of Array.isArray(j['@graph']) ? j['@graph'] : [j]) if (n?.['@type']) types.add(n['@type']);
    } catch { /* invariants report it */ }
  }
  return types;
}

/** Impressions per page from the newest snapshot, to rank the refresh list. */
function impressions() {
  const dir = 'marketing/insights';
  const snaps = existsSync(dir) ? readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort() : [];
  if (!snaps.length) return {};
  try {
    const s = JSON.parse(readFileSync(join(dir, snaps.at(-1)), 'utf8'));
    const out = {};
    for (const r of s.searchConsole?.pages ?? []) out[new URL(r.keys[0]).pathname.replace(/\/$/, '') || '/'] = r.impressions;
    return out;
  } catch { return {}; }
}

const BUCKETS = [
  ['cost', 'C · cost, pricing, budget', /\b(cost|costs|price|pricing|fee|fees|budget|how much|per month|per year|\$|€|£|₹)\b/i],
  ['time', 'C · timeline, setup, how long', /\b(how long|timeline|weeks?|days?|hours?|minutes?|setup|onboarding|turnaround|lead time)\b/i],
  ['risk', 'C · risks, limitations, common mistakes', /\b(risk|risks|limitation|limitations|mistake|mistakes|pitfall|pitfalls|caveat|drawback|downside|does not|cannot|won.t)\b/i],
  ['compare', 'D · alternatives, vs, pros and cons', /\b(vs\.?|versus|alternative|alternatives|compare|comparison|compared|instead of|pros and cons|trade-?off)\b/i],
  ['who', 'F · who it is for, best for, depends on', /\b(best for|for (?:startups|small|large|enterprise|teams|agencies|beginners|freelancers|founders)|who (?:is|it.s) for|if you|depends on|not (?:right|suitable) for)\b/i],
  ['next', 'G · next steps, how to choose, get started', /\b(next step|next steps|how to choose|get started|getting started|what to do|checklist|before you|to start)\b/i],
  ['define', 'B · what it is, how it works', /\b(what is|what are|how (?:does|do) .{0,40} work|how it works|means|definition|defined as)\b/i],
];

function audit(f, h) {
  const r = route(f);
  const art = h.match(/<article\b[^>]*data-pagefind-body[^>]*>([\s\S]*?)<\/article>/)?.[1];
  if (!art) return null;
  const kind = /class="post\b/.test(h) ? 'post' : /class="term\b/.test(h) ? 'term' : 'page';
  // The prose body only: strip the chrome (breadcrumbs, related, pager, CTA, sources).
  // Astro appends data-astro-cid-* to every scoped element, so match on the
  // class attribute and let the rest of the tag be anything.
  const bodyHtml = art.match(/<div class="(?:post|term)__body prose"[^>]*>([\s\S]*?)(?=<p class="post__tags|<section class="(?:post|term)__sources|<section class="faq|<section class="related|<aside|<nav class="pager")/)?.[1] ?? art;
  const body = strip(bodyHtml);
  const words = (body.match(/[A-Za-z’']+/g) ?? []).length;
  const sentences = body.split(/(?<=[.!?])\s+(?=[A-Z])/).filter((s) => s.trim().length > 2);
  const avgSentence = sentences.length ? words / sentences.length : 0;
  const paras = [...bodyHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map((m) => strip(m[1])).filter(Boolean);
  const longParas = paras.filter((p) => (p.match(/[A-Za-z’']+/g) ?? []).length > 90).length;
  const heads = [...bodyHtml.matchAll(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/g)].map((m) => strip(m[1]));
  const questionHeads = heads.filter((t) => /\?\s*$/.test(t) || /^(what|how|why|when|which|who|where|can|does|do|is|are|should)\b/i.test(t)).length;
  // The first sentence after each h2: it must stand alone, so it must not
  // start on a pronoun pointing backwards.
  const openers = [...bodyHtml.matchAll(/<\/h2>\s*(?:<[^p][^>]*>\s*)*<p\b[^>]*>([\s\S]*?)<\/p>/g)].map((m) => strip(m[1]));
  const backRefs = openers.filter((p) => /^(this|that|these|those|it|they|he|she|such|the same|as (?:mentioned|noted|above))\b/i.test(p)).length;
  const faqN = (art.match(/<details\b/g) ?? []).length;
  const tables = (art.match(/<table\b/g) ?? []).length;
  const lists = (bodyHtml.match(/<[uo]l\b/g) ?? []).length;
  const figures = (art.match(/<figure\b/g) ?? []).length + (art.match(/<img\b/g) ?? []).length;
  const sourcesHtml = art.match(/<section class="(?:post|term)__sources"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? '';
  const sourceLinks = (sourcesHtml.match(/href="https?:\/\//g) ?? []).length;
  const sourceItems = (sourcesHtml.match(/<li\b/g) ?? []).length;
  const author = /href="\/author\//.test(art);
  const numbers = (body.match(/\b\d[\d,.]*\s?(%|percent|ms|s\b|kb|mb|gb|days?|weeks?|months?|years?|hours?|minutes?|x\b|×|\$|€|£|₹|pages?|urls?|requests?|words?|characters?|chars)\b|\b(?:\$|€|£|₹)\s?\d/gi) ?? []).length;
  const modified = h.match(/article:modified_time" content="([^"]+)"/)?.[1] ?? h.match(/article:published_time" content="([^"]+)"/)?.[1] ?? null;
  const ageDays = modified ? Math.floor((Date.now() - new Date(modified).getTime()) / DAY) : null;
  const visibleDate = /<time\b/.test(art) || /\bupdated\b/i.test(strip(art.match(/<p class="(?:post__byline|term__meta)"[^>]*>[\s\S]*?<\/p>/)?.[0] ?? ''));
  const inLinks = (bodyHtml.match(/href="\/[a-z]/g) ?? []).length;
  const types = ldTypes(h);
  const title = decode(h.match(/<title>([^<]*)<\/title>/)?.[1] ?? '');
  const h1 = strip(h.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '');
  const text = (art && strip(art)) || '';
  const year = new Date().getFullYear();

  const checks = [];
  const add = (key, ok, fix, na = null) => checks.push({ key, ok: na ? null : Boolean(ok), na, fix });

  // 01 On-page components
  add('answer-first (tldr)', /class="(?:post|term)__tldr"/.test(art), 'add the front-loaded answer (`tldr` frontmatter)');
  add('faq ≥3 in the searcher\'s words', faqN >= 3, `FAQ has ${faqN} question(s); add the prompt-shaped queries Search Console shows as \`faq\` entries (≥3)`);
  add('table or list', tables + lists > 0, 'no table or list in the body; put the comparison, the steps or the options in one');
  add('comparison table', tables > 0, 'no table; a comparison table is the block answer engines lift most', kind === 'term' ? 'glossary entries need no table' : null);
  add('figure or image', figures > 0, 'no figure; declare a lead figure in frontmatter');
  add('named sources ≥2 with links', sourceLinks >= 2, `${sourceItems} source(s), ${sourceLinks} linked; cite two or more, each with a URL`);
  add('author profile linked', author, 'byline must link to /author/<slug>', kind !== 'post' ? 'reference entry, no byline' : null);
  add('schema: article or term + FAQPage', (types.has('BlogPosting') || types.has('Article') || types.has('DefinedTerm')) && (faqN === 0 || types.has('FAQPage')), 'typed main node missing or FAQ without FAQPage');
  // 03 Copy
  add('question-shaped headings ≥40%', heads.length ? questionHeads / heads.length >= 0.4 : false, `${questionHeads}/${heads.length} h2/h3 are questions; phrase headings as the query ("What is…", "How do I…")`);
  add('section openers stand alone', backRefs === 0, `${backRefs} section(s) open on a back-reference (this/it/they…); make the first sentence under each h2 a self-contained answer`);
  add('short paragraphs (≤90 words)', longParas === 0, `${longParas} paragraph(s) over 90 words; split them`);
  add('short sentences (avg ≤22 words)', avgSentence > 0 && avgSentence <= 22, `average sentence ${avgSentence.toFixed(0)} words; cut clauses`);
  add('a number every 200 words', words < 200 || numbers >= Math.floor(words / 200), `${numbers} concrete figure(s) in ${words} words; add sourced numbers (one per ~200 words)`);
  add('title carries the h1 topic', h1 && title && norm(title).includes(norm(h1).split(' ').slice(0, 3).join(' ')), 'title and h1 diverge; the title must say what the h1 says');
  add('in-body links 2–8', inLinks >= 2 && inLinks <= 8, `${inLinks} in-body link(s); 2–8, anchored on the phrase a searcher types`);
  add('word count ≥300', words >= 300, `${words} words; a page this thin is not cited`);
  // 05 Freshness
  add('updated within 90 days', ageDays != null && ageDays <= 90, ageDays == null ? 'no modified/published meta' : `last dated ${ageDays} days ago; refresh the facts, examples and data, bump \`updated\``);
  add('visible last-updated date', visibleDate, 'no visible date on the page');
  add('names the current year where a date matters', new RegExp(`\\b${year}\\b`).test(text) || ageDays <= 30, `no "${year}" on the page; state when the figures were checked`);
  // 06 Fan-out buckets
  const hit = BUCKETS.filter(([, , re]) => re.test(text)).map(([k]) => k);
  const missed = BUCKETS.filter(([k]) => !hit.includes(k)).map(([, label]) => label);
  add('fan-out buckets ≥4 of 7', hit.length >= 4, `covers ${hit.length}/7 buckets; missing: ${missed.join('; ')}`, kind === 'term' && words < 500 ? 'short reference entry' : null);

  const scored = checks.filter((c) => c.ok !== null);
  const pass = scored.filter((c) => c.ok).length;
  const score = scored.length ? Math.round((100 * pass) / scored.length) : 0;
  const firstFix = checks.find((c) => c.ok === false)?.fix ?? '—';
  return { route: r, kind, score, pass, of: scored.length, words, ageDays, firstFix, checks, buckets: hit };
}
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

const impr = impressions();
const pages = walk(DIST)
  .map((f) => ({ f, h: readFileSync(f, 'utf8') }))
  .filter((p) => !/name="robots" content="noindex/.test(p.h))
  .filter((p) => !ONE || route(p.f) === ONE)
  .map((p) => audit(p.f, p.h))
  .filter(Boolean)
  .map((p) => ({ ...p, impressions: impr[p.route] ?? 0 }))
  .sort((a, b) => a.score - b.score || b.impressions - a.impressions);

if (AS_JSON) {
  console.log(JSON.stringify({ generated: new Date().toISOString(), pages }, null, 2));
} else if (ONE) {
  const p = pages[0];
  if (!p) { console.log(`page-audit: ${ONE} is not a content page in dist/`); process.exit(2); }
  console.log(`# ${p.route} — ${p.score}/100 (${p.pass}/${p.of} checks), ${p.words} words, ${p.ageDays ?? '?'} days since dated\n`);
  for (const c of p.checks) console.log(`${c.ok === null ? 'n/a ' : c.ok ? 'ok  ' : 'FIX '} ${c.key}${c.ok === false ? ` — ${c.fix}` : c.na ? ` (${c.na})` : ''}`);
} else {
  console.log(`# Page audit — ${pages.length} content pages, worst first (marketing/page-guidelines.md § The checklist)\n`);
  console.log('| Page | Score | Impr. | Age (d) | First fix |');
  console.log('|---|---|---|---|---|');
  for (const p of pages) console.log(`| ${p.route} | ${p.score} | ${p.impressions} | ${p.ageDays ?? '—'} | ${p.firstFix} |`);
  const mean = pages.length ? Math.round(pages.reduce((n, p) => n + p.score, 0) / pages.length) : 0;
  console.log(`\nMean ${mean}. Refresh order: lowest score with impressions first. \`--page <route>\` prints every check for one page.`);
  console.log('\n_Informational unless --min is given. The invariant battery owns the hard rules; this owns the citation checklist. Nothing here is site copy._');
}
if (MIN != null) {
  const under = pages.filter((p) => p.score < MIN);
  if (under.length) {
    console.log(`\npage-audit: ${under.length} page(s) under ${MIN}: ${under.map((p) => `${p.route} (${p.score})`).join(', ')}`);
    process.exit(1);
  }
}
