#!/usr/bin/env node
/**
 * discovery-audit.mjs — score the site on the levers that decide whether it
 * gets found, ranked and CITED, the way an outside discovery audit would.
 *
 *   npm run audit:discovery              # needs dist/ (run after a build)
 *   npm run audit:discovery -- --json
 *
 * Why this exists. In Sep 2026 the template's owner read a 54-page discovery
 * audit of a different site (twelve layers, fifty findings, twenty levers
 * scored 0–100) and asked what of it the template was missing. Most of that
 * audit is REPRODUCIBLE from a built site: is the Organization node complete,
 * does every article carry an author, do index pages emit ItemList, is
 * llms.txt authored or a platform default, do images carry alt, is the robots
 * meta there, are the answer-engine crawlers allowed. So the audit's frame
 * lives here as code, scored the same way, and the weekly cadence run prints
 * it — a site does not get to drift from a standard it re-measures every week.
 *
 * Two kinds of lever, kept apart on purpose, like the audit did:
 *   ON the site  — measured from dist/ and the repo. Deterministic.
 *   OFF the site — read from the newest marketing/insights/<date>.json
 *                  snapshot, marketing/link-targets.md and DATA-SHEET.md.
 *                  These are the channels a website cannot fix from inside.
 *
 * Scores are 0–100 with the evidence beside them. INFORMATIONAL: this script
 * never fails a build — the invariant battery owns the hard rules; this owns
 * the picture. A lever marked n/a is one this site has decided against
 * (review markup with no customers; video with no video) and the reason is
 * printed, so the score is never "fixed" by inventing the thing.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, sep } from 'node:path';
import { readCollection } from './lib/readContent.mjs';

const DIST = 'dist';
const AS_JSON = process.argv.includes('--json');
if (!existsSync(DIST)) {
  console.error('discovery-audit: no dist/ — run `npm run build` first.');
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
const pages = walk(DIST).map((f) => ({ f, h: readFileSync(f, 'utf8') }))
  .filter((p) => !/name="robots" content="noindex/.test(p.h));
const route = (f) => '/' + f.slice(DIST.length + 1).replace(/\.html$/, '').split(sep).join('/').replace(/^index$/, '');

function ldNodes(h) {
  const nodes = [];
  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const j = JSON.parse(m[1]);
      for (const n of Array.isArray(j['@graph']) ? j['@graph'] : [j]) if (n && typeof n === 'object') nodes.push(n);
    } catch { /* invariants report it */ }
  }
  return nodes;
}
const pct = (n, d) => (d ? Math.round((100 * n) / d) : 0);
const readIf = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

const levers = [];
const lever = (side, name, score, evidence, ref) => levers.push({ side, name, score, evidence, ref });

/* ------------------------------------------------------------- ON the site */

// Crawler access — robots.txt allows the answer-engine crawlers.
{
  const robots = readIf(join(DIST, 'robots.txt'));
  const groups = robots.split(/\n(?=User-agent:)/i);
  const blocked = groups.filter((g) => /^Disallow:\s*\/\s*$/im.test(g)).map((g) => /User-agent:\s*(\S+)/i.exec(g)?.[1]);
  const named = (robots.match(/^User-agent:/gim) ?? []).length;
  lever('on', 'Crawler access', blocked.length ? 20 : 100, `${named} user-agent groups, ${blocked.length ? `Disallow / for ${blocked.join(', ')}` : 'nothing disallowed'}; WAF behaviour is smoke-live\'s to test`, 'OFF-03');
}

// Machine identity — Organization completeness + entity hygiene.
{
  const home = pages.find((p) => route(p.f) === '/');
  const org = home ? ldNodes(home.h).find((n) => n['@type'] === 'Organization') : null;
  const want = ['name', 'url', 'logo', 'description', 'contactPoint', 'founder', 'sameAs', 'legalName', 'address', 'foundingDate'];
  const have = org ? want.filter((k) => org[k] && (!Array.isArray(org[k]) || org[k].length)) : [];
  const missing = want.filter((k) => !have.includes(k));
  lever('on', 'Machine identity (Organization)', pct(have.length, want.length), `${have.length}/${want.length} fields — missing ${missing.join(', ') || 'none'}${missing.length ? ' (owner-supplied: DATA-SHEET Q-B5)' : ''}`, 'ENT-01…05');
}

// Extractable schema — share of indexable pages with a typed main node beyond Organization/WebSite.
{
  const RICH = new Set(['Article', 'BlogPosting', 'FAQPage', 'DefinedTerm', 'DefinedTermSet', 'Product', 'SoftwareApplication', 'WebApplication', 'ItemList', 'HowTo', 'Blog', 'CollectionPage', 'Person', 'AboutPage', 'ContactPage', 'WebPage']);
  const withRich = pages.filter((p) => ldNodes(p.h).some((n) => RICH.has(n['@type']) && n['@type'] !== 'Person'));
  const withFaq = pages.filter((p) => ldNodes(p.h).some((n) => n['@type'] === 'FAQPage'));
  lever('on', 'Extractable schema', pct(withRich.length, pages.length), `${withRich.length}/${pages.length} indexable pages carry a typed node beyond Organization; ${withFaq.length} carry FAQPage`, 'SD-02, SD-03');
}

// Author & E-E-A-T — every post has an author Person with sameAs and a byline page.
{
  const posts = readCollection('blog');
  const registry = JSON.parse(readIf('src/data/authors.json') || '{}');
  const authors = Array.isArray(registry.authors) ? registry.authors : Object.values(registry).filter((a) => a && typeof a === 'object' && a.name);
  const profiles = (a) => [].concat(a?.sameAs ?? [], a?.linkedin ?? []).filter(Boolean);
  const registered = posts.filter((p) => authors.some((a) => a.name === p.data.author?.name || profiles(a).some((u) => profiles(p.data.author).includes(u))));
  const withSameAs = posts.filter((p) => profiles(p.data.author).length);
  lever('on', 'Author & E-E-A-T', posts.length ? pct(Math.min(registered.length, withSameAs.length), posts.length) : 100, `${posts.length} posts; ${withSameAs.length} with a real author profile, ${registered.length} with a registered /author page`, 'CNT-01');
}

// Content shape — front-loaded answer (tldr) and citation density (sources).
{
  // Every content collection the repo has, discovered from src/content/ so a
  // new collection is scored the day it appears.
  const cols = existsSync('src/content') ? readdirSync('src/content').filter((d) => statSync(join('src/content', d)).isDirectory()) : [];
  const entries = cols.flatMap((c) => readCollection(c));
  const tldr = entries.filter((e) => e.data.tldr);
  const sourced = entries.filter((e) => Array.isArray(e.data.sources) && e.data.sources.length);
  const avgSources = entries.length ? (entries.reduce((n, e) => n + (e.data.sources?.length ?? 0), 0) / entries.length).toFixed(1) : '0';
  lever('on', 'Content shape (front-loaded answer)', pct(tldr.length, entries.length), `${tldr.length}/${entries.length} content entries carry a tldr`, 'CNT-03');
  lever('on', 'Citation density', pct(sourced.length, entries.length), `${sourced.length}/${entries.length} entries name sources, ${avgSources} per entry on average`, 'CNT-04');
}

// Commercial coverage — money pages vs high-intent watch list.
{
  const intent = JSON.parse(readIf('src/data/intent.json') || '{}');
  const watch = intent.watch ?? intent.watchList ?? [];
  const money = pages.filter((p) => /^\/(solutions|vs)\/.+|-calculator$/.test(route(p.f)));
  const claimed = new Set(watch.map((w) => w.page).filter(Boolean));
  const covered = [...claimed].filter((pg) => pages.some((p) => route(p.f) === pg));
  lever('on', 'Commercial coverage', watch.length ? pct(covered.length, claimed.size) : (money.length ? 80 : 0), `${money.length} money pages (solutions, vs, calculators); ${covered.length}/${claimed.size} high-intent watch-list queries have their claiming page live`, 'ARC-01, ARC-02');
}

// Index pages carry ItemList.
{
  const idx = pages.filter((p) => { const r = route(p.f); if (!r || r.split('/').length !== 2) return false; const pre = `${r}/`; return new Set([...p.h.matchAll(/href="([^"#?]+)"/g)].map((m) => m[1]).filter((u) => u.startsWith(pre))).size >= 3; });
  const withList = idx.filter((p) => ldNodes(p.h).some((n) => n['@type'] === 'ItemList' || n.mainEntity?.['@type'] === 'ItemList'));
  if (!idx.length) lever('on', 'Index pages as lists (ItemList)', null, 'n/a — no index page links to three or more pages under its own prefix yet; the rule applies the day one does', 'SD-04');
  else lever('on', 'Index pages as lists (ItemList)', pct(withList.length, idx.length), `${withList.length}/${idx.length} collection indexes emit ItemList`, 'SD-04');
}

// Images — alt on every img; large previews permitted.
{
  const imgs = pages.flatMap((p) => [...p.h.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]));
  const noAlt = imgs.filter((t) => !/\salt=/.test(t));
  const preview = pages.filter((p) => /max-image-preview:large/.test(p.h));
  const altScore = imgs.length ? pct(imgs.length - noAlt.length, imgs.length) : 100;
  lever('on', 'Image discoverability', Math.round((altScore + pct(preview.length, pages.length)) / 2), `${imgs.length ? `${imgs.length - noAlt.length}/${imgs.length} img carry alt` : 'no <img> yet'}; ${preview.length}/${pages.length} pages permit large previews (Discover eligibility)`, 'PERF-04, SD-06, DIS-01, IMG-01');
}

// Machine brief — llms.txt authored, twins present.
{
  const llms = readIf(join(DIST, 'llms.txt'));
  const site = /name:\s*'([^']+)'/.exec(readIf('src/data/site.ts'))?.[1] ?? '';
  const authored = llms.length > 800 && (site ? llms.includes(site) : true) && !/shopify|start your own store/i.test(llms);
  const full = existsSync(join(DIST, 'llms-full.txt'));
  const twins = walk(DIST).length ? readdirSync(DIST).filter((d) => existsSync(join(DIST, d)) && statSync(join(DIST, d)).isDirectory() && readdirSync(join(DIST, d)).some((f) => f.endsWith('.md'))).length : 0;
  lever('on', 'Machine brief (llms.txt, twins)', (authored ? 60 : 0) + (full ? 20 : 0) + (twins ? 20 : 0), `llms.txt ${authored ? 'authored from facts.json' : 'MISSING or generic'}, llms-full.txt ${full ? 'present' : 'absent'}, markdown twins in ${twins} collection folders`, 'ENT-02, AGT-01');
}

// Social cards — own card vs default.
{
  const withOwn = pages.filter((p) => /og:image" content="[^"]*\/og\/(?!default\.)/.test(p.h));
  lever('on', 'Social cards', pct(withOwn.length + 1, pages.length), `${withOwn.length}/${pages.length} pages carry their own card (the homepage uses the brand card by decision)`, '—');
}

// Decided-against levers, printed so nobody "fixes" them.
lever('on', 'Rating signals (aggregateRating)', null, 'n/a by default — review markup is emitted only from independently collected reviews that are VISIBLE on the page (CHECKLIST §11); self-written review markup is what Google\'s manual actions target', 'SD-01, RSK-01');
{
  const withVideo = pages.filter((p) => /youtube\.com\/embed|<video\b/.test(p.h));
  const withVO = pages.filter((p) => ldNodes(p.h).some((n) => n['@type'] === 'VideoObject'));
  if (!withVideo.length) lever('on', 'Video (VideoObject)', null, 'n/a — the site carries no video. If one is added: YouTube-hosted, click-to-load (<Video />), transcript, VideoObject', 'VID-01…03');
  else lever('on', 'Video (VideoObject)', pct(withVO.length, withVideo.length), `${withVO.length}/${withVideo.length} pages with video declare VideoObject`, 'VID-01…03');
}

/* ------------------------------------------------------------ OFF the site */

const snapDir = 'marketing/insights';
const snaps = existsSync(snapDir) ? readdirSync(snapDir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort() : [];
const snap = snaps.length ? JSON.parse(readFileSync(join(snapDir, snaps.at(-1)), 'utf8')) : null;
const snapDate = snaps.at(-1)?.slice(0, 10) ?? 'none';

// Generative AI visibility — from the export.
{
  const ai = snap?.generativeAi;
  if (!ai || ai.error) lever('off', 'Generative AI visibility (Google)', 0, `no generativeAi block in the ${snapDate} snapshot — export the Search Console Generative AI report into marketing/insights/genai/`, 'GSC gen-AI');
  else if (!ai.exportDate) lever('off', 'Generative AI visibility (Google)', 0, ai.note, 'GSC gen-AI');
  else lever('off', 'Generative AI visibility (Google)', Math.min(100, 20 + Math.round(Math.log10(1 + ai.total) * 20) + (ai.stale ? -20 : 0)), `${ai.total} AI impressions across ${ai.pagesCited} pages (export ${ai.exportDate}${ai.stale ? ', STALE' : ''}); ${ai.uncited?.length ?? 0} pages shown on the web but never in AI`, 'GSC gen-AI');
}

// AI-assistant referrals — citations that were followed.
{
  const refs = snap?.generativeAi?.referrals ?? [];
  const n = refs.reduce((s, r) => s + (r.visitors ?? 0), 0);
  lever('off', 'AI-assistant referrals', Math.min(100, n * 10), `${n} visitors from ${refs.map((r) => r.assistant).join(', ') || 'no assistant'} in the ${snapDate} window`, '§22 GA4 segments');
}

// Bing — the index behind Copilot and ChatGPT search.
{
  const verified = /bing:\s*'[0-9A-F]{16,}'/i.test(readIf('src/data/site.ts'));
  const b = snap?.bing;
  const read = b && !b.skipped && !b.error;
  lever('off', 'Bing (Copilot, ChatGPT search)', (verified ? 50 : 0) + (read ? 50 : 0), `${verified ? 'verified in Bing Webmaster Tools' : 'NOT verified'}; ${read ? `${b.topQueries?.length ?? 0} Bing queries read back` : 'no Bing read-back (BING_WEBMASTER_API_KEY)'}`, '§16');
}

// Entity anchors and directory listings — link-targets.md statuses.
{
  const lt = readIf('marketing/link-targets.md');
  const rows = [...lt.matchAll(/^\|(?!\s*-)(?!\s*Target)[^\n]*\|\s*`?(todo|doing|live|skip)`?[^\n]*$/gim)];
  const live = rows.filter((m) => m[1].toLowerCase() === 'live').length;
  const open = rows.filter((m) => /todo|doing/i.test(m[1])).length;
  lever('off', 'Third-party listings and entity anchors', pct(live, live + open), `${live} live, ${open} open in marketing/link-targets.md — the listicles that own the transactional SERPs are built from these`, 'ENT-05, OFF-05');
}

// AI prompt panel — has it been run, how recently.
{
  const panel = readIf('marketing/ai-panel.md');
  const runs = [...panel.matchAll(/^## Run (\d{4}-\d{2}-\d{2})/gm)].map((m) => m[1]).sort();
  const last = runs.at(-1);
  const age = last ? Math.round((Date.now() - new Date(last).getTime()) / 864e5) : null;
  lever('off', 'AI answer share-of-voice (prompt panel)', last ? (age <= 35 ? 100 : age <= 70 ? 60 : 30) : 0, last ? `last panel ${last} (${age} days ago), ${runs.length} runs logged` : 'never run — marketing/ai-panel.md holds the prompt set; the Monday run asks for it monthly', '§10.1, Q15');
}

// Open owner questions — the data the site is waiting on.
{
  const ds = readIf('marketing/DATA-SHEET.md');
  const open = (ds.match(/^### Q-[^\n]*⬜/gm) ?? []).length;
  const done = (ds.match(/^### Q-[^\n]*✅/gm) ?? []).length;
  lever('off', 'Owner-supplied facts (data sheet)', pct(done, open + done), `${done} answered, ${open} open — \`npm run ask\` prints them`, 'DATA-SHEET');
}

/* --------------------------------------------------------------- output */

if (AS_JSON) {
  console.log(JSON.stringify({ generated: new Date().toISOString(), snapshot: snapDate, pages: pages.length, levers }, null, 2));
  process.exit(0);
}
const band = (s) => (s == null ? 'n/a' : s >= 75 ? 'STRONG' : s >= 40 ? 'WEAK' : 'CRITICAL');
const out = [`# Discovery scorecard — ${pages.length} indexable pages, snapshot ${snapDate}`, ''];
for (const side of ['on', 'off']) {
  out.push(`## ${side === 'on' ? 'On the site (measured from dist/)' : 'Off the site (from the newest snapshot and the marketing files)'}`, '');
  out.push('| Lever | Score | | Evidence | Audit ref |', '|---|---|---|---|---|');
  for (const l of levers.filter((l) => l.side === side)) out.push(`| ${l.name} | ${l.score == null ? '—' : l.score} | ${band(l.score)} | ${l.evidence} | ${l.ref} |`);
  out.push('');
}
const scored = levers.filter((l) => l.score != null);
out.push(`**Mean over ${scored.length} scored levers: ${Math.round(scored.reduce((n, l) => n + l.score, 0) / scored.length)}.** The shape matters more than the mean: everything CRITICAL above is configuration, a feed, a profile or an export — work, not spend.`);
out.push('', '_Informational. The invariant battery owns the hard rules; this owns the picture. Nothing here is site copy._');
console.log(out.join('\n'));
