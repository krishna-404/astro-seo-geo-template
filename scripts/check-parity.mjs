#!/usr/bin/env node
/**
 * Mechanizes the "must change together" rules that were previously enforced
 * only by comments. Source-level: reads config files as text, needs no build,
 * fast enough for the pre-commit hook.
 *
 *   1. astro `build.format` ↔ wrangler `html_handling`. 'file' pairs with
 *      "drop-trailing-slash", 'directory' with "auto-trailing-slash".
 *      Changing one without the other breaks EVERY route (CHECKLIST §1).
 *   2. Twin routes agree in all three places: the worker's TWIN_PREFIXES,
 *      markdown-twins.mjs's COLLECTIONS, and wrangler's run_worker_first
 *      globs. A prefix missing from any one of the three silently kills
 *      markdown negotiation for that collection (or serves twins that were
 *      never generated).
 *   3. The `/*` security-header block in public/_headers matches the
 *      worker's withSecurityHeaders() values. The platform never applies
 *      _headers to worker responses, so the two emitters exist by design —
 *      and "must stay in lockstep" was, until this check, a comment.
 *   4. /search noindex ↔ excluded from the sitemap filter (the iron rule:
 *      the two must agree, in both directions, in the same commit).
 *      check-invariants sees the built output; this sees the source, at
 *      commit time, before a build.
 *   5. Every worker PERMANENT_REDIRECTS key is in wrangler run_worker_first.
 *      Same failure shape as rule 2, on a route the worker owns exactly:
 *      the redirect looks written and correct, the worker never sees the
 *      request, and the visitor gets the 404 page. Silent, and invisible in
 *      review because both files read fine on their own.
 */

import { readFileSync } from 'node:fs';

let fail = 0;
const bad = (msg) => {
  console.log(`   FAIL: ${msg}`);
  fail = 1;
};

const astroConfig = readFileSync('astro.config.mjs', 'utf8');
const wrangler = readFileSync('wrangler.jsonc', 'utf8');
const worker = readFileSync('worker/index.ts', 'utf8');
const twins = readFileSync('scripts/markdown-twins.mjs', 'utf8');
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

// ── 2. twin prefixes in three places ──────────────────────────────────────
console.log('→ twin routes agree: worker TWIN_PREFIXES / twins COLLECTIONS / run_worker_first');
const twinPrefixes = [...(worker.match(/TWIN_PREFIXES\s*=\s*\[([^\]]*)\]/)?.[1] ?? '').matchAll(/'([^']+)'/g)]
  .map((m) => m[1]); // e.g. '/blog/'
const collections = [...(twins.match(/COLLECTIONS\s*=\s*\{([^}]*)\}/s)?.[1] ?? '').matchAll(/:\s*'([^']+)'/g)]
  .map((m) => m[1] + '/'); // '/blog' → '/blog/'
const workerFirst = [...(wrangler.match(/"run_worker_first":\s*\[([^\]]*)\]/)?.[1] ?? '').matchAll(/"([^"]+)"/g)]
  .map((m) => m[1]);
if (!twinPrefixes.length || !collections.length || !workerFirst.length) {
  bad('could not parse one of the three twin-route lists — check the parser against the source files');
} else {
  const missing = [];
  for (const p of new Set([...twinPrefixes, ...collections])) {
    if (!twinPrefixes.includes(p)) missing.push(`worker TWIN_PREFIXES lacks '${p}'`);
    if (!collections.includes(p)) missing.push(`markdown-twins COLLECTIONS lacks '${p.slice(0, -1)}'`);
    if (!workerFirst.includes(`${p}*`)) missing.push(`wrangler run_worker_first lacks "${p}*" (negotiation never reaches the worker)`);
  }
  if (missing.length) missing.forEach(bad);
  else console.log(`   ok (${twinPrefixes.join(', ')})`);
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
  if (!/!page\.includes\('\/search'\)/.test(astroConfig)) bad("astro.config.mjs sitemap filter no longer excludes '/search' — noindex and the sitemap must agree");
  if (fail === before) console.log('   ok');
}

// ── 5. worker redirects reach the worker ──────────────────────────────────
console.log('→ every PERMANENT_REDIRECTS path is in wrangler run_worker_first');
{
  const map = worker.match(/PERMANENT_REDIRECTS:\s*Record<string,\s*string>\s*=\s*\{([\s\S]*?)\}/)?.[1];
  if (map === undefined) {
    bad('could not parse PERMANENT_REDIRECTS in worker/index.ts — check the parser against the source');
  } else {
    const paths = [...map.matchAll(/'(\/[^']*)':/g)].map((m) => m[1]);
    const missing = paths.filter((p) => !workerFirst.includes(p));
    if (missing.length) {
      missing.forEach((p) =>
        bad(`wrangler run_worker_first lacks "${p}" — the worker never sees the request and the visitor gets the 404 page`)
      );
    } else {
      console.log(`   ok (${paths.length ? paths.join(', ') : 'no redirects configured'})`);
    }
  }
}

process.exit(fail);
