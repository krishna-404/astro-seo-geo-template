#!/usr/bin/env node
/**
 * Post-deploy smoke against the LIVE site — the automated subset of
 * PLAYBOOK §8. Everything here checks behavior that only exists in front of
 * the origin (zone settings, redirect rules, edge headers), which no in-repo
 * check can see and which historically broke silently (the ancestor's www
 * redirect served 404 for days).
 *
 *   node scripts/smoke-live.mjs            # uses origin.mjs
 *   node scripts/smoke-live.mjs https://x  # explicit origin (staging checks)
 *
 * Soft-skips while origin.mjs still says example.com — a fresh template has
 * no live site to test, and a red post-deploy job on day one teaches people
 * to ignore red.
 *
 * Every request retries: a deploy propagates through Cloudflare's edge in
 * seconds but not atomically, and a flaky first request must not cry wolf.
 *
 * Deliberately NOT here: the real form submission (it emails humans and
 * writes the Sheet — PLAYBOOK §8 keeps it manual), HSTS preload/verification
 * detail, and anything Lighthouse-shaped (field data is the metric — §5).
 */

import { readFileSync } from 'node:fs';
import { SITE_URL } from '../src/data/origin.mjs';

const origin = process.argv[2] ?? SITE_URL;
if (/example\.com/.test(origin)) {
  console.log(`smoke-live: origin is still ${origin} — no live site yet, skipping (green).`);
  process.exit(0);
}
const host = new URL(origin).host;

let fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) fail = 1;
};

/** GET with bounded retries; returns the Response or null. Never follows
 *  redirects — the redirect IS the thing under test. */
async function req(url, opts = {}, tries = 3) {
  for (let i = 0; i < tries; i += 1) {
    try {
      return await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15_000), ...opts });
    } catch {
      await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
    }
  }
  return null;
}

console.log(`smoke-live: ${origin}`);

// ── routing (PLAYBOOK §8 "Routing") ────────────────────────────────────────
let r = await req(`${origin}/`);
check('/ answers 200', r?.status === 200, `got ${r?.status}`);

r = await req(`https://www.${host}/`);
check('www → 301 to apex', r?.status === 301 && !new URL(r.headers.get('location'), origin).host.startsWith('www.'), `got ${r?.status} → ${r?.headers.get('location')}`);

r = await req(`http://${host}/`);
check('http → https', [301, 308].includes(r?.status) && (r.headers.get('location') ?? '').startsWith('https://'), `got ${r?.status} → ${r?.headers.get('location')}`);

r = await req(`${origin}/about/`);
check('trailing slash normalises (307 — CHECKLIST §2)', [301, 307, 308].includes(r?.status) && new URL(r.headers.get('location'), origin).pathname === '/about', `got ${r?.status} → ${r?.headers.get('location')}`);

r = await req(`${origin}/definitely-not-a-page-${Date.now()}`);
check('unknown route → real 404', r?.status === 404, `got ${r?.status}`);

// Worker PERMANENT_REDIRECTS, parsed from the source so the live check cannot
// drift from the map; an empty map asserts nothing.
const redirectMap = readFileSync('worker/index.ts', 'utf8')
  .match(/PERMANENT_REDIRECTS:\s*Record<string,\s*string>\s*=\s*\{([\s\S]*?)\}/)?.[1] ?? '';
for (const [, from, to] of redirectMap.matchAll(/'(\/[^']*)':\s*'([^']+)'/g)) {
  r = await req(`${origin}${from}`);
  check(`${from} → 301 ${to}`, r?.status === 301 && new URL(r.headers.get('location'), origin).pathname === to, `got ${r?.status} → ${r?.headers.get('location')}`);
}

// ── headers (PLAYBOOK §8 "Headers") ────────────────────────────────────────
r = await req(`${origin}/`);
const hsts = r?.headers.get('strict-transport-security');
check('exactly one HSTS value, from the zone', !!hsts && !hsts.includes(','), `got: ${hsts}`);
check('CSP present with generated hashes', (r?.headers.get('content-security-policy') ?? '').includes('sha256-'), 'marker shipped instead of the generated policy?');
check('security set on pages', r?.headers.get('x-content-type-options') === 'nosniff' && !!r?.headers.get('permissions-policy'));

r = await req(`${origin}/hi/smoke`);
check('/hi rewrite live: 200 + noindex header', r?.status === 200 && /noindex/.test(r?.headers.get('x-robots-tag') ?? ''), `got ${r?.status}, x-robots-tag: ${r?.headers.get('x-robots-tag')}`);

// A twin route, discovered from the live sitemap so the test tracks content.
const sitemap = await (await req(`${origin}/sitemap-0.xml`))?.text() ?? '';
const twinUrl = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).find((u) => /\/(blog|glossary)\//.test(u));
if (twinUrl) {
  r = await req(twinUrl, { headers: { accept: 'text/markdown' } });
  check('markdown twin negotiates live', (r?.headers.get('content-type') ?? '').includes('text/markdown') && /accept/i.test(r?.headers.get('vary') ?? ''), `ct=${r?.headers.get('content-type')} vary=${r?.headers.get('vary')}`);
} else {
  console.log('   (no content URLs in sitemap yet — twin negotiation untested)');
}

// ── machine surfaces (PLAYBOOK §8 "Assets & metadata") ─────────────────────
for (const path of ['/favicon.ico', '/robots.txt', '/llms.txt', '/rss.xml', '/sitemap-index.xml', '/.well-known/security.txt']) {
  const res = await req(`${origin}${path}`);
  check(`${path} → 200`, res?.status === 200, `got ${res?.status}`);
}

// ── answer-engine crawlers get through the edge ────────────────────────────
// robots.txt permission means nothing if the WAF or a bot-management rule
// silently 403s the crawler: that failure is invisible in analytics and fatal
// to being cited (the Sep 2026 discovery-audit frame, OFF-03). AI crawlers identify
// themselves honestly and do not retry cleverly, so each named UA must get the
// same 200 a browser gets, on the homepage and on the machine brief. Cloudflare
// "Bot Fight Mode" and "Block AI bots" are the two toggles that break this.
const CRAWLERS = {
  GPTBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot',
  'OAI-SearchBot': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot',
  ClaudeBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  PerplexityBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
  Bingbot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36',
  Googlebot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/W.X.Y.Z Safari/537.36',
};
for (const [name, ua] of Object.entries(CRAWLERS)) {
  for (const path of ['/', '/llms.txt']) {
    const res = await req(`${origin}${path}`, { headers: { 'user-agent': ua } });
    const challenged = /cf-mitigated|cf-chl/i.test([...(res?.headers ?? [])].map(([k, v]) => `${k}:${v}`).join(' '));
    check(`${name} fetches ${path} → 200, no challenge`, res?.status === 200 && !challenged, `got ${res?.status}${challenged ? ' (Cloudflare challenge)' : ''}`);
  }
}

if (fail) {
  console.log('\nsmoke-live FAILED — the live site disagrees with the repo. PLAYBOOK §8 has the manual follow-ups.');
  process.exit(1);
}
console.log('\nsmoke-live: live site agrees with the repo.');
