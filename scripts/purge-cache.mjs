#!/usr/bin/env node
/**
 * Purge the Cloudflare edge cache after a deploy.
 *
 *   npm run purge                    # everything
 *   npm run purge -- /contact /features   # just those URLs
 *
 * WHY THIS EXISTS. Pages are served with `Cache-Control: public, max-age=300,
 * must-revalidate` and the Cloudflare cache rule honours it, so an edit reaches
 * readers within five minutes on its own. That is fine for content and wrong
 * for a deploy: the moment you have shipped a fix you want it live, not live in
 * a few minutes, and you certainly do not want to be told "it works for me"
 * because your own browser revalidated first.
 *
 * CREDENTIALS COME FROM THE ENVIRONMENT AND MUST NEVER BE COMMITTED:
 *
 *   CLOUDFLARE_ZONE_ID     Overview tab, right-hand column. Not a secret, but
 *                          it lives here so the two cannot drift apart.
 *   CLOUDFLARE_API_TOKEN   A SCOPED token, not the Global API Key. The global
 *                          key can do anything to every zone on the account and
 *                          cannot be limited; a leaked one is a whole-account
 *                          incident. Create at My Profile > API Tokens with a
 *                          single permission — Zone / Cache Purge / Purge —
 *                          scoped to this zone alone. That token can do nothing
 *                          except throw away cached copies of a public website,
 *                          which is about as harmless as a credential gets.
 *
 * Purging everything is the right default at this size. Cloudflare rate-limits
 * it to roughly one call every few seconds per zone, which no deploy comes near.
 * Pass paths when you have changed one page and would rather not make every
 * other visitor pay for a fresh origin fetch.
 */
const ZONE = process.env.CLOUDFLARE_ZONE_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const SITE = 'https://dodocket.com';

if (!ZONE || !TOKEN) {
  console.error('Set CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN. See DEPLOY.md § 3.');
  process.exit(2);
}

const paths = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const body = paths.length
  ? { files: paths.map((p) => new URL(p, SITE).href) }
  : { purge_everything: true };

const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE}/purge_cache`, {
  method: 'POST',
  headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

const json = await res.json().catch(() => ({}));

// Cloudflare answers 200 with success:false for a bad token or zone, so the
// status code alone is not the check.
if (!res.ok || !json.success) {
  console.error(`purge failed (HTTP ${res.status})`);
  for (const e of json.errors ?? []) console.error(`  ${e.code}: ${e.message}`);
  if (!json.errors?.length) console.error(`  ${JSON.stringify(json)}`);
  process.exit(1);
}

console.log(paths.length ? `purged ${paths.length} URL(s):` : 'purged everything');
for (const p of paths) console.log(`  ${new URL(p, SITE).href}`);
console.log('\nVerify — first request MISS, second HIT:');
console.log("  curl -sI https://dodocket.com/ | grep -i cf-cache-status");
