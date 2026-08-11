#!/usr/bin/env node
/**
 * indexnow.mjs — tell Bing, Yandex and Seznam that URLs changed, instead of
 * waiting to be crawled. Google does not participate.
 *
 *   node scripts/indexnow.mjs                       # submit everything in the live sitemap
 *   node scripts/indexnow.mjs --expect /new-page    # wait for /new-page to be live first
 *   node scripts/indexnow.mjs --min-urls 44         # wait until the deploy has landed
 *   node scripts/indexnow.mjs --dry-run             # show what would be sent
 *
 * The design point that matters: the URL list comes from the LIVE sitemap, not
 * from the local build. Submitting a URL that 404s is worse than not submitting
 * — it wastes the ping and erodes the host's standing with the endpoint. Reading
 * production means we can only ever submit pages that actually exist right now.
 *
 * Zero dependencies, so it runs from a clean checkout with nothing installed.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { SITE_URL } from '../src/data/origin.mjs';

const ORIGIN = SITE_URL;
const HOST = new URL(ORIGIN).host;

/**
 * The IndexNow key. Two sources, tried in order:
 *
 *   1. The INDEXNOW_KEY env var (what CI sets).
 *   2. Discovery: a `public/<key>.txt` whose content is exactly its own
 *      basename — the shape IndexNow requires the key file to have anyway,
 *      so committing the key file once makes local runs need no setup.
 *
 * The key is not a secret (it is served publicly by design — its only job is
 * proving you control the host), so committing it is fine.
 */
function discoverKey() {
  if (process.env.INDEXNOW_KEY) return process.env.INDEXNOW_KEY.trim();
  const pub = resolve(dirname(fileURLToPath(import.meta.url)), '../public');
  if (!existsSync(pub)) return null;
  for (const f of readdirSync(pub)) {
    const m = /^([a-f0-9]{16,64})\.txt$/i.exec(f);
    if (m && readFileSync(resolve(pub, f), 'utf8').trim() === m[1]) return m[1];
  }
  return null;
}

const KEY = discoverKey();
if (!KEY) {
  console.error(
    'indexnow: no key — set INDEXNOW_KEY, or commit public/<key>.txt containing exactly the key'
  );
  process.exit(1);
}
const KEY_LOCATION = `${ORIGIN}/${KEY}.txt`;

// The shared endpoint forwards to every participating engine, so one POST
// covers Bing, Yandex and Seznam rather than three.
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const expectIdx = args.indexOf('--expect');
const expectPath = expectIdx !== -1 ? args[expectIdx + 1] : null;
const minIdx = args.indexOf('--min-urls');
const minUrls = minIdx !== -1 ? Number(args[minIdx + 1]) : 0;

const fail = (msg) => {
  console.error(`indexnow: ${msg}`);
  process.exit(1);
};

/**
 * Poll a URL until it is 200, or give up. Cloudflare Workers deploys land in
 * seconds, so ~6 × 10s is generous headroom — the long window this had under a
 * container-rebuild deploy pipeline (20 × 15s) would just hide a real failure
 * for five minutes.
 */
async function waitForLive(url, { tries = 6, delayMs = 10000 } = {}) {
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(url, { method: 'HEAD', redirect: 'manual' });
      if (r.status === 200) return true;
      console.log(`  ${url} -> ${r.status} (try ${i}/${tries})`);
    } catch (e) {
      console.log(`  ${url} -> ${e.message} (try ${i}/${tries})`);
    }
    if (i < tries) await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

// 1. The key file has to be live and contain exactly the key, or every
//    submission is rejected with 403. Check it before sending anything.
//
//    Polled, not fetched once. The very first run after this lands on main
//    starts while the deploy that ADDS the key file may still be in flight,
//    so a single fetch would 404 and fail the run that is supposed to work.
//    Only waits when we are already waiting on a deploy. Run by hand, it checks
//    once and tells you immediately rather than sitting there polling.
const waitingOnDeploy = Boolean(minUrls || expectPath);
console.log(`Verifying key file at ${KEY_LOCATION}`);
if (!(await waitForLive(KEY_LOCATION, { tries: waitingOnDeploy ? 6 : 1 }))) {
  fail('key file never returned 200 — deploy it before submitting');
}
const keyRes = await fetch(KEY_LOCATION).catch((e) => fail(`key file unreachable: ${e.message}`));
if (!keyRes.ok) fail(`key file returned ${keyRes.status} — it must be 200`);
const keyBody = (await keyRes.text()).trim();
if (keyBody !== KEY) {
  fail(`key file contains ${JSON.stringify(keyBody.slice(0, 40))}, expected the key itself`);
}
console.log('  ok');

// 2. Optionally wait for a specific new page before submitting, so a deploy
//    that has not landed yet does not get a stale URL list sent for it.
if (expectPath) {
  const target = new URL(expectPath, ORIGIN).href;
  console.log(`Waiting for ${target}`);
  if (!(await waitForLive(target))) fail(`${target} never became available — not submitting`);
  console.log('  live');
}

// 3. Read the live sitemap. Production is the source of truth for what exists.
//
//    --min-urls closes the deploy race: CI fires on push, but the deploy takes
//    a moment to go live, so without this a run right after adding a page would
//    read the OLD sitemap and never ping the new page at all. Workers deploys
//    land in seconds, hence the short 6 × 10s window below.
async function readLiveSitemap() {
  const r = await fetch(`${ORIGIN}/sitemap-0.xml`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`sitemap returned ${r.status}`);
  const x = await r.text();
  return [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

console.log(`Reading ${ORIGIN}/sitemap-0.xml${minUrls ? ` (waiting for >= ${minUrls} URLs)` : ''}`);
let urlList = [];
const sitemapTries = minUrls ? 6 : 1;
for (let i = 1; i <= sitemapTries; i++) {
  try {
    urlList = await readLiveSitemap();
  } catch (e) {
    console.log(`  ${e.message} (try ${i})`);
  }
  if (urlList.length >= minUrls) break;
  console.log(`  ${urlList.length} URLs live, want ${minUrls} (try ${i}/${sitemapTries})`);
  // No sleep after the last attempt — nothing follows it but the failure.
  if (i < sitemapTries) await new Promise((r) => setTimeout(r, 10000));
}
if (minUrls && urlList.length < minUrls) {
  fail(`live sitemap still has ${urlList.length} URLs, expected ${minUrls} — deploy has not landed, not submitting`);
}

if (!urlList.length) fail('sitemap contained no URLs');
// IndexNow rejects the whole batch if any URL is off-host.
const offHost = urlList.filter((u) => new URL(u).host !== HOST);
if (offHost.length) fail(`off-host URLs would fail the batch: ${offHost.join(', ')}`);
console.log(`  ${urlList.length} URLs`);

if (dryRun) {
  console.log('\n--dry-run, not submitting:');
  urlList.forEach((u) => console.log(`  ${u}`));
  process.exit(0);
}

// 4. Submit. 200 = accepted, 202 = accepted with the key still being validated.
const body = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList };
const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
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

console.log(`\n${res.status} ${meaning ?? 'unexpected'}${text ? ` — ${text.slice(0, 200)}` : ''}`);
if (res.status !== 200 && res.status !== 202) process.exit(1);
console.log(`Submitted ${urlList.length} URLs to Bing, Yandex and Seznam.`);
