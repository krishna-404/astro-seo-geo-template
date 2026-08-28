#!/usr/bin/env node
/**
 * insights.mjs — pull real numbers from the three places this site is measured,
 * so decisions about what to write or fix next come from evidence, not guesswork.
 *
 *   npm run insights                 # markdown report, last 28 days
 *   npm run insights -- --days 7     # shorter window
 *   npm run insights -- --json       # machine-readable, same data
 *   npm run insights -- --inspect    # URL Inspection over every sitemap URL:
 *                                    # answers "why is this page not indexed",
 *                                    # per page, grouped by Google's verdict
 *
 * Three sources, three different truths, deliberately side by side:
 *
 *   Umami       what HUMANS with JavaScript did — pages, referrers, countries,
 *               and the `data-umami-event` CTA clicks (demo / contact / whatsapp
 *               / phone, each with its `place`). See README § Analytics.
 *   Search      what GOOGLE showed and what got clicked — queries, pages, CTR,
 *   Console     position. The only source that sees demand we did NOT convert
 *               (impressions without clicks).
 *   Cloudflare  every EDGE request, JavaScript or not — crawlers, answer
 *               engines reading llms.txt, 404 scans. The only source that sees
 *               non-browser traffic, which for this site is genuinely
 *               interesting (see /for-llms).
 *
 * Each section runs iff its credentials are present and soft-skips with a note
 * otherwise, so a partially-configured workspace still gets a partial report.
 *
 * CREDENTIALS COME FROM THE ENVIRONMENT AND MUST NEVER BE COMMITTED:
 *
 *   UMAMI_URL              e.g. https://umami.example.org (your Umami host)
 *   UMAMI_WEBSITE_ID       Settings → Websites → Edit → Website ID
 *   UMAMI_BEARER_TOKEN     a login token; and/or
 *   UMAMI_USERNAME + UMAMI_PASSWORD   fallback — the script logs in itself
 *                          when the token is absent or expired
 *   GSC_SA_KEY             base64 of a Google service-account JSON key with the
 *                          Search Console API enabled. The service-account
 *                          email must be added as a RESTRICTED user on the
 *                          sc-domain:<your-domain> property — until it is, this
 *                          section reports exactly that, with the email to add.
 *   CLOUDFLARE_READ_ANALYTICS   scoped API token, Zone → Zone: Read + Zone →
 *                          Analytics: Read. Nothing else — it can read traffic
 *                          numbers for a public site and do nothing to anyone.
 *
 * Two API quirks learned by probing the live services, not from docs:
 *   - This Umami build's metrics endpoint takes `type=path`, not `type=url`
 *     (url 400s). Endpoint shapes vary across 2.x; re-probe before "fixing".
 *   - On a free-plan zone, `httpRequestsAdaptiveGroups` refuses any window
 *     wider than ONE DAY. Ranged totals therefore come from the daily rollup
 *     `httpRequests1dGroups`, and the adaptive dataset is used only for
 *     yesterday's top-404-path table (the rollup has counts but not paths).
 *
 * Zero dependencies — the GSC JWT is signed with node:crypto directly.
 *
 * THE ONE RULE. This script READS. Nothing it prints is site copy, and no
 * number it emits may land on a page — published figures come from facts.json
 * with a source, per AGENTS rule 1. Analytics pick which page to work on next;
 * they never become the page.
 */

import crypto from 'node:crypto';
import { SITE_URL } from '../src/data/origin.mjs';

const SITE = new URL(SITE_URL).host;
if (/example\.com$/.test(SITE)) {
  console.log(`insights: origin is still ${SITE} — no live site yet, nothing to measure. Set src/data/origin.mjs first.`);
  process.exit(0);
}
const GSC_PROPERTY = `sc-domain:${SITE}`;

const args = process.argv.slice(2);
const DAYS = Number(args[args.indexOf('--days') + 1]) || 28;
const AS_JSON = args.includes('--json');
const INSPECT = args.includes('--inspect');

const now = Date.now();
const DAY = 864e5;
const isoDate = (ms) => new Date(ms).toISOString().slice(0, 10);

/** ---------- Umami ---------- */

async function umami() {
  const base = process.env.UMAMI_URL?.replace(/\/$/, '');
  const id = process.env.UMAMI_WEBSITE_ID;
  if (!base || !id) return { skipped: 'UMAMI_URL / UMAMI_WEBSITE_ID not set — see SETUP.md § Insights read-back.' };

  let token = process.env.UMAMI_BEARER_TOKEN;
  const login = async () => {
    const { UMAMI_USERNAME: u, UMAMI_PASSWORD: p } = process.env;
    if (!u || !p) return null;
    const r = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: u, password: p }),
    });
    return r.ok ? (await r.json()).token : null;
  };
  if (!token) token = await login();
  if (!token) return { skipped: 'No UMAMI_BEARER_TOKEN and login failed or not configured.' };

  const range = `startAt=${now - DAYS * DAY}&endAt=${now}`;
  const get = async (path, retried = false) => {
    const r = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.status === 401 && !retried) {
      const fresh = await login();
      if (fresh) { token = fresh; return get(path, true); }
    }
    if (!r.ok) throw new Error(`Umami ${path} → ${r.status}`);
    return r.json();
  };
  const metrics = (type, limit) => get(`/api/websites/${id}/metrics?type=${type}&${range}&limit=${limit}`);

  const [stats, paths, referrers, events, countries, faqQuestions] = await Promise.all([
    get(`/api/websites/${id}/stats?${range}`),
    metrics('path', 15),
    metrics('referrer', 10),
    metrics('event', 15),
    metrics('country', 10),
    // Which FAQ questions visitors actually open — the `faq` event carries the
    // question text as a property (FaqList.astro). Counts include closes as
    // well as opens; the first click is always an open.
    get(`/api/websites/${id}/event-data/values?${range}&eventName=faq&propertyName=question`).catch(() => []),
  ]);
  return { stats, paths, referrers, events, countries, faqQuestions };
}

/** ---------- Google Search Console ---------- */

async function gscToken(sa) {
  const iat = Math.floor(now / 1000);
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat,
    exp: iat + 3600,
  })}`;
  const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${unsigned}.${sig}`,
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`GSC token exchange failed: ${JSON.stringify(j)}`);
  return j.access_token;
}

async function gsc() {
  const key = process.env.GSC_SA_KEY;
  if (!key) return { skipped: 'GSC_SA_KEY not set — see SETUP.md § Insights read-back.' };
  const sa = JSON.parse(Buffer.from(key, 'base64').toString());
  const token = await gscToken(sa);

  // Search Console data lags ~2 days; asking for fresher days returns zeros
  // that look like a traffic collapse.
  const endDate = isoDate(now - 2 * DAY);
  const startDate = isoDate(now - (DAYS + 2) * DAY);
  const query = async (body) => {
    const r = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_PROPERTY)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, ...body }),
      },
    );
    if (r.status === 403) {
      throw Object.assign(
        new Error(`Service account has no access to ${GSC_PROPERTY}. In Search Console → Settings → Users and permissions, add ${sa.client_email} with Restricted permission.`),
        { notOnboarded: true },
      );
    }
    if (!r.ok) throw new Error(`GSC query → ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return (await r.json()).rows ?? [];
  };

  try {
    const [queries, pages] = await Promise.all([
      query({ dimensions: ['query'], rowLimit: 100 }),
      query({ dimensions: ['page'], rowLimit: 25 }),
    ]);
    // The actionable slice: real demand (impressions) sitting just off page
    // one, where a title rewrite or content upgrade moves the needle.
    const opportunities = queries
      .filter((r) => r.impressions >= 20 && r.position >= 4 && r.position <= 20)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 15);
    return { startDate, endDate, queries: queries.slice(0, 20), pages, opportunities };
  } catch (e) {
    if (e.notOnboarded) return { skipped: e.message };
    throw e;
  }
}

/**
 * --inspect: run Google's URL Inspection API over every URL in the LIVE
 * sitemap (same source of truth as indexnow.mjs — only pages that exist right
 * now) and group by coverage state. This is the per-page answer to Search
 * Console's "Not indexed: N pages, M reasons" card. Quota is 2,000
 * inspections/day per property; this site is ~50 URLs, so nowhere near it.
 */
async function gscInspect() {
  const key = process.env.GSC_SA_KEY;
  if (!key) return { skipped: 'GSC_SA_KEY not set — see SETUP.md § Insights read-back.' };
  const sa = JSON.parse(Buffer.from(key, 'base64').toString());
  const token = await gscToken(sa);

  const locs = async (url) =>
    [...(await (await fetch(url)).text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const sitemaps = await locs(`https://${SITE}/sitemap-index.xml`);
  const urls = (await Promise.all(sitemaps.map(locs))).flat();

  const results = [];
  let denied = null;
  const queue = [...urls];
  await Promise.all(Array.from({ length: 5 }, async () => {
    for (let u; (u = queue.shift()) !== undefined && !denied; ) {
      const r = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ inspectionUrl: u, siteUrl: GSC_PROPERTY }),
      });
      if (r.status === 403) { denied = sa.client_email; return; }
      if (!r.ok) { results.push({ url: u, state: `error ${r.status}` }); continue; }
      const s = (await r.json()).inspectionResult?.indexStatusResult ?? {};
      results.push({
        url: u,
        state: s.coverageState ?? 'unknown',
        lastCrawl: s.lastCrawlTime?.slice(0, 10) ?? '—',
        // Google picking a different canonical than ours is the defect class
        // PLAYBOOK phase 7 says to watch for; surface it explicitly.
        canonicalMismatch: s.googleCanonical && s.userCanonical && s.googleCanonical !== s.userCanonical
          ? s.googleCanonical : null,
      });
    }
  }));
  if (denied) return { skipped: `Service account has no access to ${GSC_PROPERTY}. In Search Console → Settings → Users and permissions, add ${denied} with Restricted permission.` };

  const byState = {};
  for (const r of results) (byState[r.state] ??= []).push(r);
  return { total: urls.length, byState };
}

/** ---------- Cloudflare edge ---------- */

async function cloudflare() {
  const token = process.env.CLOUDFLARE_READ_ANALYTICS;
  if (!token) return { skipped: 'CLOUDFLARE_READ_ANALYTICS not set — see SETUP.md § Insights read-back.' };
  const headers = { Authorization: `Bearer ${token}`, 'content-type': 'application/json' };

  // Zone id is not a secret, but discovering it by name each run means there is
  // no second copy to drift when the zone moves accounts.
  const zones = await (await fetch(`https://api.cloudflare.com/client/v4/zones?name=${SITE}`, { headers })).json();
  const zoneTag = zones.result?.[0]?.id;
  if (!zoneTag) return { skipped: `Token cannot see the ${SITE} zone: ${JSON.stringify(zones.errors)}` };

  const gql = async (q) => {
    const r = await (await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST', headers, body: JSON.stringify({ query: q }),
    })).json();
    if (r.errors) throw new Error(`Cloudflare GraphQL: ${JSON.stringify(r.errors).slice(0, 300)}`);
    return r.data.viewer.zones[0];
  };

  const yesterday = isoDate(now - DAY);
  const rollup = await gql(`query { viewer { zones(filter: {zoneTag: "${zoneTag}"}) {
    days: httpRequests1dGroups(
      filter: {date_geq: "${isoDate(now - DAYS * DAY)}", date_leq: "${yesterday}"},
      limit: ${DAYS + 2}, orderBy: [date_ASC]) {
      dimensions { date }
      sum { requests pageViews cachedRequests threats
            countryMap { clientCountryName requests }
            responseStatusMap { edgeResponseStatus requests } }
      uniq { uniques }
    }
  } } }`);

  const days = rollup.days;
  const sum = (f) => days.reduce((a, d) => a + f(d), 0);
  const statuses = {};
  for (const d of days)
    for (const s of d.sum.responseStatusMap)
      statuses[s.edgeResponseStatus] = (statuses[s.edgeResponseStatus] ?? 0) + s.requests;
  const countries = {};
  for (const d of days)
    for (const c of d.sum.countryMap)
      countries[c.clientCountryName] = (countries[c.clientCountryName] ?? 0) + c.requests;

  // Adaptive dataset: max one day of range on this plan, so 404 paths cover
  // yesterday only. Enough to see whether they are a scan or a broken link.
  const adaptive = await gql(`query { viewer { zones(filter: {zoneTag: "${zoneTag}"}) {
    notFound: httpRequestsAdaptiveGroups(
      filter: {date: "${yesterday}", edgeResponseStatus: 404},
      limit: 12, orderBy: [count_DESC]) { count dimensions { clientRequestPath } }
  } } }`);

  return {
    daysCovered: days.length,
    totals: {
      requests: sum((d) => d.sum.requests),
      pageViews: sum((d) => d.sum.pageViews),
      uniques: sum((d) => d.uniq.uniques),
      cachedRequests: sum((d) => d.sum.cachedRequests),
      threats: sum((d) => d.sum.threats),
    },
    statuses,
    countries: Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, 10),
    notFoundYesterday: adaptive.notFound.map((r) => ({ path: r.dimensions.clientRequestPath, count: r.count })),
  };
}

/** ---------- Report ---------- */

const settle = async (fn) => {
  try { return await fn(); } catch (e) { return { error: e.message }; }
};

const [u, g, c, ins] = await Promise.all([
  settle(umami), settle(gsc), settle(cloudflare),
  INSPECT ? settle(gscInspect) : Promise.resolve(null),
]);
const report = { generated: new Date(now).toISOString(), windowDays: DAYS, umami: u, searchConsole: g, cloudflare: c, ...(ins && { indexing: ins }) };

if (AS_JSON) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(u.error || g.error || c.error ? 1 : 0);
}

const out = [];
const section = (title) => out.push(`\n## ${title}\n`);
const table = (headers, rows) => {
  out.push(`| ${headers.join(' | ')} |`);
  out.push(`|${headers.map(() => '---').join('|')}|`);
  for (const r of rows) out.push(`| ${r.join(' | ')} |`);
};
const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : '—');

out.push(`# ${SITE} — insight pull, last ${DAYS} days (${isoDate(now)})`);

section('Umami — human visitors');
if (u.skipped || u.error) out.push(`_${u.skipped ?? u.error}_`);
else {
  const s = u.stats;
  out.push(`**${s.visitors} visitors**, ${s.visits} visits, ${s.pageviews} pageviews · bounce ${pct(s.bounces, s.visits)}`);
  out.push('');
  table(['Page', 'Views'], u.paths.map((r) => [r.x, r.y]));
  out.push('\n**CTA events** (`data-umami-event`)\n');
  table(['Event', 'Count'], u.events.map((r) => [r.x, r.y]));
  if (u.faqQuestions?.length > 0) {
    out.push('\n**FAQ questions opened** (toggle counts — closes included, first click is always an open)\n');
    table(['Question', 'Toggles'], u.faqQuestions.map((r) => [r.value, r.total]));
  }
  out.push('\n**Referrers**\n');
  table(['Referrer', 'Visitors'], u.referrers.map((r) => [r.x || '(direct)', r.y]));
  out.push('\n**Countries**\n');
  table(['Country', 'Visitors'], u.countries.map((r) => [r.x, r.y]));
}

section('Google Search Console — demand and positions');
if (g.skipped || g.error) out.push(`_${g.skipped ?? g.error}_`);
else {
  out.push(`Window ${g.startDate} → ${g.endDate} (GSC lags ~2 days).\n`);
  out.push('**Top queries**\n');
  table(['Query', 'Clicks', 'Impressions', 'CTR', 'Position'],
    g.queries.map((r) => [r.keys[0], r.clicks, r.impressions, pct(r.clicks, r.impressions), r.position.toFixed(1)]));
  out.push('\n**Top pages**\n');
  table(['Page', 'Clicks', 'Impressions', 'CTR', 'Position'],
    g.pages.map((r) => [r.keys[0].replace(`https://${SITE}`, '') || '/', r.clicks, r.impressions, pct(r.clicks, r.impressions), r.position.toFixed(1)]));
  out.push('\n**Opportunities** — ≥20 impressions at position 4–20: demand we rank for but do not win\n');
  if (g.opportunities.length === 0) out.push('_None in this window._');
  else table(['Query', 'Impressions', 'Clicks', 'Position'],
    g.opportunities.map((r) => [r.keys[0], r.impressions, r.clicks, r.position.toFixed(1)]));
}

if (ins) {
  section('Indexing — URL Inspection over the live sitemap');
  if (ins.skipped || ins.error) out.push(`_${ins.skipped ?? ins.error}_`);
  else {
    out.push(`${ins.total} URLs in the sitemap.\n`);
    for (const [state, rows] of Object.entries(ins.byState).sort((a, b) => b[1].length - a[1].length)) {
      out.push(`**${state}** — ${rows.length}\n`);
      table(['URL', 'Last crawl', 'Google chose different canonical'],
        rows.map((r) => [r.url.replace(`https://${SITE}`, '') || '/', r.lastCrawl ?? '—', r.canonicalMismatch ?? '']));
      out.push('');
    }
  }
}

section('Cloudflare edge — all traffic, browsers or not');
if (c.skipped || c.error) out.push(`_${c.skipped ?? c.error}_`);
else {
  const t = c.totals;
  out.push(`**${t.requests.toLocaleString()} requests** over ${c.daysCovered} days · ${t.pageViews.toLocaleString()} page views · ${t.uniques.toLocaleString()} unique IPs (summed daily — overcounts return visitors) · cache hit ${pct(t.cachedRequests, t.requests)} · ${t.threats} threats blocked`);
  out.push('\n**Status codes**\n');
  table(['Status', 'Requests', 'Share'],
    Object.entries(c.statuses).sort((a, b) => b[1] - a[1]).map(([s, n]) => [s, n.toLocaleString(), pct(n, t.requests)]));
  out.push('\n**Top 404 paths, yesterday** (adaptive dataset allows one day of range on this plan)\n');
  if (c.notFoundYesterday.length === 0) out.push('_No 404s recorded yesterday._');
  else table(['Path', 'Hits'], c.notFoundYesterday.map((r) => [r.path, r.count]));
  out.push('\n**Requests by country**\n');
  table(['Country', 'Requests'], c.countries.map(([k, v]) => [k, v.toLocaleString()]));
}

out.push('\n---\n_Read-only report. No figure here may be published on the site — pages cite `facts.json`, per AGENTS rule 1._');
console.log(out.join('\n'));
process.exit(u.error || g.error || c.error ? 1 : 0);
