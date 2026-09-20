#!/usr/bin/env node
/**
 * Behavioral smoke test of the worker — the only code in the repo with
 * actual logic, and until this file the only code CI never executed.
 *
 *   npm run build && npm run smoke:worker
 *
 * Spawns `wrangler dev` against the built dist/ and asserts every behavior
 * the worker exists to provide (each maps to a numbered block in
 * worker/index.ts):
 *
 *   1. Form proxy: POST /api/contact → OUR 303 to /contact/thanks, even with
 *      CONTACT_SCRIPT_ID unset (empty-default rule: broken feature, never a
 *      broken site). GET → 405.
 *   2. Sheet data: unknown tab → 404 (a typo'd tab name must not 502).
 *   3. /hi rewrite: 200 with the contact page, x-robots-tag noindex, CSP.
 *      Malformed codes fall through to the 404 page.
 *   4. Twin negotiation: Accept: text/markdown → text/markdown + Vary,
 *      for HEAD as well as GET (crawlers probe with HEAD; a HEAD answer
 *      disagreeing with GET poisons caches — inherited trap). Without the
 *      header → HTML, still Vary: Accept.
 *   5. Security headers + generated CSP on every worker response.
 *   6. Permanent redirects: every worker PERMANENT_REDIRECTS entry answers
 *      301 to its target (the map is parsed from worker/index.ts so this
 *      test cannot drift from it; check-parity asserts each path is in
 *      run_worker_first, which is what makes it reachable in production).
 *
 * NOT covered here, on purpose: the Apps Script upstream (needs a secret and
 * a live Google endpoint — PLAYBOOK §8's "submit the real form" stays a
 * launch step) and the rate limiter (the binding's local simulation is not
 * the production limiter; asserting on it would test the simulator).
 */

import { spawn } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';

const PORT = 8791;
const BASE = `http://127.0.0.1:${PORT}`;

// A real content route to negotiate on — read from the built output so the
// test never goes stale against renamed sample content.
const blogSlug = readdirSync('dist/blog').find((f) => f.endsWith('.html'))?.replace(/\.html$/, '');
if (!blogSlug) {
  console.error('smoke-worker: no built blog page found — run npm run build first');
  process.exit(1);
}

// POSTS_API_TOKEN is set for the run so the posts API's auth and validation
// paths can be exercised; GITHUB_POSTS_TOKEN is deliberately NOT, so a valid
// payload stops at the 503 "nothing can be written" answer and no GitHub
// request is ever made from a smoke test. GITHUB_REPO is set too, or the 503
// would fire one step earlier and hide the validation result.
const wrangler = spawn('npx', ['wrangler', 'dev', '--port', String(PORT), '--var', 'POSTS_API_TOKEN:smoke-token', '--var', 'GITHUB_REPO:example/example'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true, // its own process group, so cleanup kills workerd children too
});
let devLog = '';
wrangler.stdout.on('data', (d) => (devLog += d));
wrangler.stderr.on('data', (d) => (devLog += d));
const cleanup = () => {
  try {
    process.kill(-wrangler.pid, 'SIGTERM');
  } catch {
    /* already gone */
  }
};
process.on('exit', cleanup);

// Readiness: poll until the server answers, bounded.
const deadline = Date.now() + 60_000;
let up = false;
while (Date.now() < deadline && !up) {
  up = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(1000) })
    .then((r) => r.ok)
    .catch(() => false);
  if (!up) await new Promise((r) => setTimeout(r, 500));
}
if (!up) {
  console.error(`smoke-worker: wrangler dev never came up. Log:\n${devLog.slice(-2000)}`);
  process.exit(1);
}

let fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) fail = 1;
};
const get = (path, opts = {}) => fetch(`${BASE}${path}`, { redirect: 'manual', ...opts });

// ── 1. form proxy ──────────────────────────────────────────────────────────
let r = await get('/api/contact', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: 'name=Smoke+Test&email=smoke%40test.invalid&message=hi&hp=',
});
check('POST /api/contact → 303', r.status === 303, `got ${r.status}`);
check(
  '303 location is /contact/thanks',
  new URL(r.headers.get('location') ?? '', BASE).pathname === '/contact/thanks',
  `got ${r.headers.get('location')}`
);
r = await get('/api/contact');
check('GET /api/contact → 405 + Allow: POST', r.status === 405 && r.headers.get('allow') === 'POST', `got ${r.status}`);

// ── 1b. posts API (worker/posts.ts) ────────────────────────────────────────
const postsAuth = { authorization: 'Bearer smoke-token', 'content-type': 'application/json' };
r = await get('/api/posts');
check('GET /api/posts → 405 + Allow: POST', r.status === 405 && r.headers.get('allow') === 'POST', `got ${r.status}`);
r = await get('/api/posts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
check('POST /api/posts without a bearer → 401', r.status === 401 && /bearer/i.test(r.headers.get('www-authenticate') ?? ''), `got ${r.status}`);
r = await get('/api/posts', { method: 'POST', headers: { ...postsAuth, authorization: 'Bearer wrong' }, body: '{}' });
check('POST /api/posts with the wrong bearer → 401', r.status === 401, `got ${r.status}`);
r = await get('/api/posts', { method: 'POST', headers: postsAuth, body: 'not json' });
check('POST /api/posts with a non-JSON body → 400', r.status === 400, `got ${r.status}`);
r = await get('/api/posts', { method: 'POST', headers: postsAuth, body: JSON.stringify({ title: 'x' }) });
let j = await r.json();
check('POST /api/posts with a thin payload → 400 naming every failure', r.status === 400 && Array.isArray(j.errors) && j.errors.length >= 5, `got ${r.status}: ${JSON.stringify(j).slice(0, 120)}`);
check('…including the author registry and the in-body-link rules', j.errors?.some((e) => /author/.test(e)) && j.errors?.some((e) => /body/.test(e)), JSON.stringify(j.errors).slice(0, 200));
const { authors } = JSON.parse(readFileSync('src/data/authors.json', 'utf8'));
const validPost = {
  title: 'Smoke test post that never publishes anywhere',
  description: 'A payload the smoke test sends to prove validation passes and the write stops at the missing GitHub token, never touching GitHub.',
  tldr: 'This post exists only inside scripts/smoke-worker.mjs and is never written to the repository or the site.',
  author: { name: authors[0].name, title: authors[0].title, sameAs: authors[0].sameAs },
  proprietary: 'proprietary-numbers',
  sources: [{ label: 'The smoke test itself' }],
  body: ('## A heading\n\nA paragraph that links to [a glossary entry](/glossary/core-web-vitals) and to [the blog](/blog/how-the-seo-machinery-works) so the in-body link rule passes. ').repeat(8),
};
r = await get('/api/posts', { method: 'POST', headers: postsAuth, body: JSON.stringify(validPost) });
j = await r.json();
check('POST /api/posts with a valid payload and no GitHub token → 503, validated', r.status === 503 && j.slug === 'smoke-test-post-that-never-publishes-anywhere', `got ${r.status}: ${JSON.stringify(j).slice(0, 120)}`);
r = await get('/api/posts', { method: 'POST', headers: postsAuth, body: JSON.stringify({ ...validPost, title: 'A title that is far too long for the SERP and has no clause the clamp could drop cleanly' }) });
j = await r.json();
check('…a title the SERP clamp would hard-cut → 400', r.status === 400 && j.errors?.some((e) => /clamp/.test(e)), JSON.stringify(j.errors).slice(0, 160));
r = await get('/api/posts/12');
check('GET /api/posts/<n> without a bearer → 401', r.status === 401, `got ${r.status}`);
r = await get('/api/posts/12', { headers: postsAuth });
check('GET /api/posts/<n> with no GitHub token → 503', r.status === 503, `got ${r.status}`);

// ── 2. sheet data ──────────────────────────────────────────────────────────
r = await get('/api/data/definitely-not-a-tab');
check('GET /api/data/<unknown> → 404', r.status === 404, `got ${r.status}`);

// ── 3. /hi rewrite ─────────────────────────────────────────────────────────
r = await get('/hi/smoketest');
const hiBody = await r.text();
check('/hi/<code> → 200', r.status === 200, `got ${r.status}`);
check('/hi is a REWRITE of the contact page', /<form[^>]*action="\/api\/contact"/.test(hiBody), 'contact form not in body');
check('/hi carries x-robots-tag noindex', /noindex/.test(r.headers.get('x-robots-tag') ?? ''), `got ${r.headers.get('x-robots-tag')}`);
r = await get('/hi/-bad-code-');
check('/hi/<malformed> falls through (404)', r.status === 404, `got ${r.status}`);

// ── 4. twin negotiation ────────────────────────────────────────────────────
const twinPath = `/blog/${blogSlug}`;
r = await get(twinPath, { headers: { accept: 'text/markdown' } });
check('Accept: text/markdown → text/markdown', (r.headers.get('content-type') ?? '').includes('text/markdown'), `got ${r.headers.get('content-type')}`);
check('…with Vary: Accept', /accept/i.test(r.headers.get('vary') ?? ''), `got ${r.headers.get('vary')}`);
const mdBody = await r.text();
check('…and a markdown body', /^#|^---/m.test(mdBody.slice(0, 200)), `starts: ${mdBody.slice(0, 40)}`);
r = await get(twinPath, { method: 'HEAD', headers: { accept: 'text/markdown' } });
check('HEAD negotiates identically', (r.headers.get('content-type') ?? '').includes('text/markdown') && /accept/i.test(r.headers.get('vary') ?? ''), `ct=${r.headers.get('content-type')} vary=${r.headers.get('vary')}`);
r = await get(twinPath);
check('no Accept header → HTML', (r.headers.get('content-type') ?? '').includes('text/html'), `got ${r.headers.get('content-type')}`);
check('…HTML answer also carries Vary: Accept', /accept/i.test(r.headers.get('vary') ?? ''), 'caches would mix the two bodies');

// ── 6. permanent redirects ─────────────────────────────────────────────────
// Parsed from the worker source, not copied: a row added there is asserted
// here without anyone remembering. An empty map asserts nothing, deliberately.
const redirectMap = readFileSync('worker/index.ts', 'utf8')
  .match(/PERMANENT_REDIRECTS:\s*Record<string,\s*string>\s*=\s*\{([\s\S]*?)\}/)?.[1] ?? '';
for (const [, from, to] of redirectMap.matchAll(/'(\/[^']*)':\s*'([^']+)'/g)) {
  r = await get(from);
  check(
    `${from} → 301 ${to}`,
    r.status === 301 && new URL(r.headers.get('location') ?? '', BASE).pathname === to,
    `got ${r.status} → ${r.headers.get('location')}`
  );
}

// ── 5. security headers + CSP on worker responses ──────────────────────────
const { default: cspGenerated } = await import('../worker/csp.generated.json', { with: { type: 'json' } });
for (const [path, opts] of [['/hi/smoketest', {}], [twinPath, {}]]) {
  const res = await get(path, opts);
  check(`${path} security set`, res.headers.get('x-content-type-options') === 'nosniff' && !!res.headers.get('permissions-policy'), 'missing security headers');
  check(`${path} serves the committed CSP`, res.headers.get('content-security-policy') === cspGenerated.csp, 'differs from worker/csp.generated.json');
}

cleanup();
if (fail) {
  console.log('\nWorker smoke test FAILED.');
  process.exit(1);
}
console.log('\nWorker smoke test passed.');
