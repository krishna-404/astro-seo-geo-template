#!/usr/bin/env node
/**
 * indexnow.mjs — tell the answer-engine indexes that URLs changed, instead of
 * waiting to be crawled.
 *
 *   node scripts/indexnow.mjs                  # submit everything in the live sitemap
 *   node scripts/indexnow.mjs --min-urls 44    # refuse to submit a suspiciously short list
 *   node scripts/indexnow.mjs --dry-run        # show what would be sent, send nothing
 *
 * TWO ENDPOINTS, ONE RUN:
 *
 *   IndexNow (https://api.indexnow.org/indexnow) — one POST, fanned out by the
 *   shared endpoint to Bing, Yandex, Seznam and Naver. Google does not
 *   participate. Needs a key file served from the site's own root.
 *
 *   Bing URL Submission (ssl.bing.com/webmaster/api.svc) — when
 *   BING_WEBMASTER_API_KEY is set. IndexNow already reaches Bing, so this is
 *   belt and braces on the ONE index that decides whether Copilot and ChatGPT
 *   search can cite the site at all: Bing's quota is per site and small for a
 *   new one, so only URLs whose sitemap <lastmod> is within the last two days
 *   go, newest first, capped at 100. A non-2xx prints the body and the run
 *   still succeeds — IndexNow got there.
 *
 * THE DESIGN POINT THAT MATTERS. The URL list comes from the LIVE sitemap, not
 * from the local build. Submitting a URL that 404s is worse than not
 * submitting: it wastes the ping and erodes the host's standing with the
 * endpoint. Reading production means we can only ever submit pages that exist
 * right now.
 *
 * WHAT THIS USED TO DO AND NO LONGER DOES. It had `--changed <git-range>` (a
 * diff-to-routes mapper), `--expect <path>`, and two polling loops that waited
 * for a deploy to land — machinery for a pipeline where CI fired on a push and
 * raced the deploy. There is no such race now: `/ship` and the daily cadence
 * run call this AFTER `wrangler deploy` returns, so production is already the
 * new production. A hundred lines of race handling for a race that cannot
 * happen is a hundred lines that can be wrong. `--min-urls` stays, because a
 * short list still means something went wrong upstream.
 *
 * Zero dependencies, so it runs from a clean checkout with nothing installed.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { SITE_URL } from '../src/data/origin.mjs';
import { sitemapUrls, sitemapEntries } from './lib/html.mjs';

const ORIGIN = SITE_URL;
const HOST = new URL(ORIGIN).host;

/**
 * The IndexNow key. Two sources, tried in order:
 *
 *   1. The INDEXNOW_KEY env var.
 *   2. Discovery: a `public/<key>.txt` whose content is exactly its own
 *      basename — the shape IndexNow requires the key file to have anyway,
 *      so committing the key file once makes every run need no setup.
 *
 * To generate one (any 8–128 chars of a–z, A–Z, 0–9 and hyphen work; hex is
 * the convention):
 *
 *   k=$(openssl rand -hex 16); printf %s "$k" > "public/$k.txt"
 *
 * The key is not a secret (it is served publicly by design — its only job is
 * proving you control the host), so committing it is fine. ACTIONS A-L09
 * checks for it with this same rule.
 */
function discoverKey() {
  if (process.env.INDEXNOW_KEY) return process.env.INDEXNOW_KEY.trim();
  const pub = resolve(dirname(fileURLToPath(import.meta.url)), '../public');
  if (!existsSync(pub)) return null;
  for (const f of readdirSync(pub)) {
    // The name pattern is loose on purpose (IndexNow allows more than hex);
    // the REAL filter is the content check — llms-full.txt matches the
    // pattern but its content is not its own basename, so it never wins.
    const m = /^([A-Za-z0-9-]{8,128})\.txt$/.exec(f);
    if (m && readFileSync(resolve(pub, f), 'utf8').trim() === m[1]) return m[1];
  }
  return null;
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const minIdx = args.indexOf('--min-urls');
const minUrls = minIdx !== -1 ? Number(args[minIdx + 1]) || 0 : 0;

const fail = (msg) => {
  console.error(`indexnow: ${msg}`);
  process.exit(1);
};

const KEY = discoverKey();
if (!KEY) {
  // A skip, not a failure: a fresh clone of the template has no key yet, and a
  // permanently red IndexNow step teaches people to ignore red. The loud
  // message is the safeguard against this skip hiding a real misconfiguration.
  console.log(
    'indexnow: no key configured — skipping submission.\n' +
      '  To enable: k=$(openssl rand -hex 16); printf %s "$k" > "public/$k.txt"\n' +
      '  and commit it (or set INDEXNOW_KEY in the environment). See PLAYBOOK §7.'
  );
  process.exit(0);
}
const KEY_LOCATION = `${ORIGIN}/${KEY}.txt`;

/* ------------------------------------------------------------ 1. key file */
// Every submission is rejected with 403 unless the key file is live and
// contains exactly the key. One fetch: the deploy has already landed.
console.log(`Verifying key file at ${KEY_LOCATION}`);
const keyRes = await fetch(KEY_LOCATION, { cache: 'no-store' }).catch((e) => fail(`key file unreachable: ${e.message}`));
if (!keyRes.ok) fail(`key file returned ${keyRes.status} — deploy it before submitting`);
const keyBody = (await keyRes.text()).trim();
if (keyBody !== KEY) fail(`key file contains ${JSON.stringify(keyBody.slice(0, 40))}, expected the key itself`);
console.log('  ok');

/* ------------------------------------------------------- 2. live sitemap */
// Follows the sitemap INDEX to its children, so a site that outgrows one
// sitemap file keeps submitting all of its pages (this read only sitemap-0.xml
// before, silently capping submissions at the first 50,000 URLs).
const fetchText = async (url) => {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  }
};

console.log(`Reading ${ORIGIN}/sitemap-index.xml`);
let urlList = await sitemapUrls(`${ORIGIN}/sitemap-index.xml`, fetchText);
// A site with a single sitemap and no index still answers on sitemap-0.xml.
if (!urlList.length) urlList = await sitemapUrls(`${ORIGIN}/sitemap-0.xml`, fetchText);
if (!urlList.length) fail('sitemap contained no URLs');

if (minUrls && urlList.length < minUrls) {
  fail(`live sitemap has ${urlList.length} URLs, expected at least ${minUrls} — something upstream is wrong, not submitting`);
}

// IndexNow rejects the whole batch if any URL is off-host.
const offHost = urlList.filter((u) => new URL(u).host !== HOST);
if (offHost.length) fail(`off-host URLs would fail the batch: ${offHost.join(', ')}`);
console.log(`  ${urlList.length} URLs`);

/* -------------------------------------------- 3. recent URLs, for Bing */
// Bing's per-site daily quota is small for a new site, so the second submission
// is narrowed to what actually changed. <lastmod> is the sitemap's own answer to
// that question and it is already derived from git (src/lib/lastmod.ts).
const RECENT_DAYS = 2;
const BING_CAP = 100;
async function recentUrls() {
  const docs = [`${ORIGIN}/sitemap-0.xml`];
  const index = await fetchText(`${ORIGIN}/sitemap-index.xml`);
  if (index && /<sitemapindex/.test(index)) {
    docs.length = 0;
    for (const m of index.matchAll(/<loc>([^<]+)<\/loc>/g)) docs.push(m[1].trim());
  }
  const rows = [];
  for (const doc of docs) {
    const xml = await fetchText(doc);
    if (xml) rows.push(...sitemapEntries(xml));
  }
  const cutoff = Date.now() - RECENT_DAYS * 864e5;
  return rows
    .filter((r) => r.lastmod && new Date(r.lastmod).getTime() >= cutoff)
    .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime())
    .slice(0, BING_CAP)
    .map((r) => r.loc);
}

const bingKey = process.env.BING_WEBMASTER_API_KEY;
const bingList = bingKey ? await recentUrls() : [];

if (dryRun) {
  console.log(`\n--dry-run, not submitting.\n\nIndexNow (${urlList.length} URLs):`);
  urlList.forEach((u) => console.log(`  ${u}`));
  console.log(
    bingKey
      ? `\nBing URL Submission (${bingList.length} URLs changed in the last ${RECENT_DAYS} days, cap ${BING_CAP}):`
      : '\nBing URL Submission: skipped — BING_WEBMASTER_API_KEY is not set (ACTIONS A-K04).'
  );
  bingList.forEach((u) => console.log(`  ${u}`));
  process.exit(0);
}

/* ------------------------------------------------------- 4. submit: IndexNow */
// 200 = accepted, 202 = accepted with the key still being validated.
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
}).catch((e) => fail(`submit: ${e.message}`));

const text = await res.text().catch(() => '');
const meaning = {
  200: 'accepted',
  202: 'accepted — key still being validated, which is normal on a first run',
  400: 'bad request — malformed body',
  403: 'key not valid: the key file did not match',
  422: 'URLs do not belong to the host, or the key does not match the schema',
  429: 'rate limited — too many submissions',
}[res.status];

console.log(`\nIndexNow: ${res.status} ${meaning ?? 'unexpected'}${text ? ` — ${text.slice(0, 200)}` : ''}`);
if (res.status !== 200 && res.status !== 202) process.exit(1);
console.log(`  ${urlList.length} URLs submitted to Bing, Yandex, Seznam and Naver.`);

/* --------------------------------------------- 5. submit: Bing URL Submission */
if (!bingKey) {
  console.log('\nBing URL Submission: skipped — BING_WEBMASTER_API_KEY is not set (ACTIONS A-K04).');
} else if (!bingList.length) {
  console.log(`\nBing URL Submission: nothing changed in the last ${RECENT_DAYS} days — nothing to submit.`);
} else {
  const bingRes = await fetch(
    `https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlBatch?apikey=${encodeURIComponent(bingKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ siteUrl: ORIGIN, urlList: bingList }),
    }
  ).catch((e) => ({ ok: false, status: 0, text: async () => e.message }));
  const bingText = await bingRes.text().catch(() => '');
  if (bingRes.ok) {
    console.log(`\nBing URL Submission: ${bingRes.status} — ${bingList.length} URL(s) changed in the last ${RECENT_DAYS} days.`);
  } else {
    // Never fatal: IndexNow already reached Bing's index, and the most common
    // failure here is the per-site daily quota, which is information rather
    // than a defect.
    console.log(`\nBing URL Submission: ${bingRes.status} — not submitted. ${bingText.slice(0, 300)}`);
    console.log('  (IndexNow already reached Bing; a quota refusal here costs nothing.)');
  }
}
