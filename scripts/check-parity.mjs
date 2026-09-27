#!/usr/bin/env node
/**
 * Mechanizes the "must change together" rules that were previously enforced
 * only by comments. Source-level: reads config files as text, needs no build,
 * fast enough for the pre-commit hook.
 *
 *   1. astro `build.format` ↔ wrangler `html_handling`. 'file' pairs with
 *      "drop-trailing-slash", 'directory' with "auto-trailing-slash".
 *      Changing one without the other breaks EVERY route (CHECKLIST §1).
 *   2. Every `twins: true` collection in src/data/collections.json has its
 *      `<route>/*` in wrangler's run_worker_first, and vice versa. The worker
 *      and the twin generator both DERIVE their lists from that config now, so
 *      only wrangler's is hand-kept — wrangler.jsonc is JSONC config that
 *      cannot import anything, which is why exactly one parity rule survives
 *      here rather than three. A prefix missing from run_worker_first silently
 *      kills markdown negotiation for that collection: the request never
 *      reaches the worker.
 *   3. The `/*` security-header block in public/_headers matches the
 *      worker's withSecurityHeaders() values. The platform never applies
 *      _headers to worker responses, so the two emitters exist by design —
 *      and "must stay in lockstep" was, until this check, a comment.
 *   4. /search noindex ↔ excluded from the sitemap filter (the iron rule:
 *      the two must agree, in both directions, in the same commit).
 *      check-invariants sees the built output; this sees the source, at
 *      commit time, before a build.
 *   5. Every key in src/data/redirects.json is in wrangler run_worker_first,
 *      and carries a reason. Same failure shape as rule 2, on a route the
 *      worker owns exactly: the redirect looks written and correct, the worker
 *      never sees the request, and the visitor gets the 404 page. Silent, and
 *      invisible in review because both files read fine on their own.
 *   6. src/data/facts.json's competitor list matches src/data/intent.json's.
 *      One is what the About page and the comparison pages may name; the other
 *      is what the scripts watch in Search Console. Two lists of the same
 *      companies drift, and the drift is invisible until a report names a rival
 *      the site does not compare itself with.
 */

import { readFileSync } from 'node:fs';
import { collections, routeOfCollection, twinCollections } from './lib/routes.mjs';

let fail = 0;
const bad = (msg) => {
  console.log(`   FAIL: ${msg}`);
  fail = 1;
};

const astroConfig = readFileSync('astro.config.mjs', 'utf8');
const wrangler = readFileSync('wrangler.jsonc', 'utf8');
const worker = readFileSync('worker/index.ts', 'utf8');
const headers = readFileSync('public/_headers', 'utf8');
const searchPage = readFileSync('src/pages/search.astro', 'utf8');

// ── 1. format ↔ html_handling ─────────────────────────────────────────────
console.log('→ astro build.format agrees with wrangler html_handling');
const format = astroConfig.match(/^\s*format:\s*'(file|directory)'/m)?.[1];
const handling = wrangler.match(/"html_handling":\s*"([a-z-]+)"/)?.[1];
if (!format || !handling) {
  bad(`could not read format (${format}) or html_handling (${handling}) — check the parser, not just the configs`);
} else {
  const pairs = { file: 'drop-trailing-slash', directory: 'auto-trailing-slash' };
  if (pairs[format] !== handling) {
    bad(`build.format '${format}' needs html_handling "${pairs[format]}", found "${handling}" — this combination breaks every route`);
  } else {
    console.log('   ok');
  }
}

// ── 2. twin collections reach the worker ──────────────────────────────────
console.log('→ every twins collection has its run_worker_first glob (and vice versa)');
const workerFirst = [...(wrangler.match(/"run_worker_first":\s*\[([^\]]*)\]/)?.[1] ?? '').matchAll(/"([^"]+)"/g)]
  .map((m) => m[1]);
if (!workerFirst.length) {
  bad('could not parse run_worker_first in wrangler.jsonc — check the parser against the source file');
} else {
  const expected = twinCollections().map((c) => `${routeOfCollection(c)}/*`);
  const before = fail;
  for (const glob of expected) {
    if (!workerFirst.includes(glob)) {
      bad(`wrangler run_worker_first lacks "${glob}" — negotiation never reaches the worker for that collection`);
    }
  }
  // The other direction: a glob for a collection route that is no longer a
  // twin collection is a metered route serving nothing (run_worker_first is
  // the cost lever — AGENTS rule 12).
  const collectionGlobs = Object.keys(collections()).map((c) => `${routeOfCollection(c)}/*`);
  for (const glob of workerFirst) {
    if (collectionGlobs.includes(glob) && !expected.includes(glob)) {
      bad(`wrangler run_worker_first has "${glob}" but that collection is not \`twins: true\` in src/data/collections.json — a metered route serving nothing`);
    }
  }
  if (fail === before) console.log(`   ok (${expected.join(', ') || 'no twin collections'})`);
}

// ── 3. _headers /* block ↔ worker withSecurityHeaders ─────────────────────
console.log('→ static and worker security headers are in lockstep');
// _headers: the headers of the first block (the /* rule), name: value lines.
const block = headers.split(/^\/\*$/m)[1]?.split(/^\/[^\s]/m)[0] ?? '';
const staticSet = new Map(
  [...block.matchAll(/^\s{2}([A-Za-z-]+):\s*(.+)$/gm)]
    .map(([, k, v]) => [k.toLowerCase(), v.trim()])
);
// worker: h.set('name', 'value') and multi-line h.set('name', '...' + '...').
const workerSet = new Map(
  [...worker.matchAll(/h\.set\(\s*'([a-z-]+)',\s*([\s\S]*?)\)\s*;/g)].map(([, k, expr]) => {
    const value = [...expr.matchAll(/'([^']*)'/g)].map((m) => m[1]).join('');
    return [k, value];
  })
);
const COMPARED = ['x-content-type-options', 'referrer-policy', 'x-frame-options', 'permissions-policy'];
for (const name of COMPARED) {
  const s = staticSet.get(name);
  const w = workerSet.get(name);
  if (!s) bad(`_headers /* block is missing ${name}`);
  else if (!w) bad(`worker withSecurityHeaders() is missing ${name}`);
  else if (s !== w) bad(`${name} differs:\n         _headers: ${s}\n         worker:   ${w}`);
}
// CSP: _headers gets it from the generator's marker; the worker from the
// committed JSON. Assert the marker exists and the committed value is
// non-empty — value equality is the generator's own job (it writes both).
if (!/^\s*# @generated-csp/m.test(headers)) {
  bad('public/_headers lost its # @generated-csp marker — the generator has nowhere to write the CSP');
}
const committedCsp = JSON.parse(readFileSync('worker/csp.generated.json', 'utf8')).csp;
if (!committedCsp) bad('worker/csp.generated.json has an empty csp — run npm run build and commit it');
if (!fail) console.log('   ok');

// ── 3b. build.concurrency stays 1 ───────────────────────────────────────
// Body figures resolve through module state (src/lib/figureContext.ts), which
// is only safe while Astro renders one page at a time. Raising
// build.concurrency would let one page's <Figure id> read another page's list.
if (/concurrency\s*:\s*(?!1\b)\d/.test(astroConfig)) {
  bad('astro.config.mjs sets build.concurrency above 1 — figureContext.ts (body figures) assumes pages render one at a time');
}

// ── 4. /search noindex ↔ sitemap exclusion ────────────────────────────────
console.log('→ /search is noindex AND excluded from the sitemap (both, always)');
{
  const before = fail;
  if (!/noindex=\{true\}/.test(searchPage)) bad('src/pages/search.astro no longer passes noindex={true} — a client-rendered tool page must not be indexed');
  if (!/NOINDEX_ROUTES\s*=\s*\[[^\]]*'\/search'/.test(astroConfig)) bad("astro.config.mjs NOINDEX_ROUTES no longer lists '/search' — noindex and the sitemap must agree");
  if (fail === before) console.log('   ok');
}

// ── 4b. the posts API's `proprietary` list mirrors the content schema ─────
// WHY: worker/posts-rules.mjs hand-mirrors the blog schema (a Worker cannot
// import astro:content). The mirrored enum drifted once (27 Sep 2026): the API
// accepted four values the schema had never had, so every accepted post
// failed the build and every schema-valid value got a 400.
console.log('→ worker/posts-rules.mjs PROPRIETARY mirrors the content.config.ts proprietary enum');
{
  const before = fail;
  const schema = readFileSync('src/content.config.ts', 'utf8');
  const posts = readFileSync('worker/posts-rules.mjs', 'utf8');
  const enumList = schema.match(/proprietary:\s*z\.enum\(\[([\s\S]*?)\]\)/)?.[1];
  const apiList = posts.match(/const PROPRIETARY\s*=\s*\[([^\]]*)\]/)?.[1];
  const values = (src) => (src ? [...src.matchAll(/'([^']+)'/g)].map((m) => m[1]) : null);
  const a = values(enumList);
  const b = values(apiList);
  if (!a || !b) bad('could not parse the proprietary enum in src/content.config.ts or PROPRIETARY in worker/posts-rules.mjs');
  else if (a.join('|') !== b.join('|')) bad(`proprietary values differ — schema: ${a.join(', ')} · posts API: ${b.join(', ')}`);
  if (fail === before) console.log('   ok');
}

// ── 5. redirects reach the worker, and each carries a reason ──────────────
console.log('→ every src/data/redirects.json path is in wrangler run_worker_first');
{
  const before = fail;
  const rows = JSON.parse(readFileSync('src/data/redirects.json', 'utf8')).redirects;
  const paths = Object.keys(rows);
  for (const p of paths) {
    if (!workerFirst.includes(p)) {
      bad(`wrangler run_worker_first lacks "${p}" — the worker never sees the request and the visitor gets the 404 page`);
    }
    if (!rows[p]?.to?.startsWith('/')) bad(`redirects.json "${p}" has no root-relative \`to\``);
    // A row without a reason is a mystery in a year: nobody can tell whether
    // the URL is still asked for or the redirect can go.
    if (!rows[p]?.reason?.trim()) bad(`redirects.json "${p}" has no \`reason\` — say why the URL is asked for and why a 301 rather than a page`);
  }
  if (fail === before) console.log(`   ok (${paths.length ? paths.join(', ') : 'no redirects configured'})`);
}

// ── 6. the competitor lists agree ─────────────────────────────────────────
console.log('→ facts.json competitors match intent.json competitors');
{
  const before = fail;
  const facts = JSON.parse(readFileSync('src/data/facts.json', 'utf8'));
  const intent = JSON.parse(readFileSync('src/data/intent.json', 'utf8'));
  const names = (v) => {
    const list = Array.isArray(v) ? v : Array.isArray(v?.value) ? v.value : [];
    return list.map((x) => String(typeof x === 'object' && x ? (x.value ?? x.name ?? '') : x).trim()).filter((x) => x && !/^TODO/i.test(x)).sort();
  };
  const a = names(facts.company?.competitors);
  const b = names(intent.competitors);
  if (a.join('|') !== b.join('|')) {
    bad(`competitor lists differ — facts.json: ${a.join(', ') || '(none)'} · intent.json: ${b.join(', ') || '(none)'}. One is what the pages may name, the other what the scripts watch; keep them in step (AGENTS § When you change…)`);
  }
  if (fail === before) console.log(`   ok (${a.length ? a.join(', ') : 'none named yet'})`);
}

process.exit(fail);
