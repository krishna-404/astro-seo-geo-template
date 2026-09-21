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
 * The Search Console section leads with HIGH-INTENT queries (scripts/lib/
 * intent.mjs, rules in src/data/intent.json): the transactional phrasings —
 * "<category> software", "<category> tracking system", "<x> vs <y>" — that a
 * buyer with budget types. On a zero-click site they sit far below the
 * informational rows by volume and a report sorted by impressions never shows
 * them first; here they are surfaced in every pull, so the cadence run can
 * work them first and carry them in the report with what was done.
 *
 * A FOURTH surface, read through a side door (scripts/lib/genai.mjs): the
 * Search Console GENERATIVE AI report — how often the site's URLs were shown
 * inside AI Overviews and AI Mode, by page, country, device and date. It has
 * no API and no BigQuery export (Sep 2026), so the owner exports it from the
 * UI and drops the zip into marketing/insights/genai/; this script reads the
 * newest one, joins it with the ordinary page rows (AI share per page, pages
 * with web impressions and zero AI impressions), and adds the two proxies the
 * report withholds — prompt-shaped queries from the web rows, and referrals
 * from AI assistants in Umami. Bing Webmaster Tools is a FIFTH, optional:
 * Bing's index feeds Copilot and ChatGPT search, so its query, per-page and
 * index-count numbers are the other half of the answer-engine picture
 * (BING_WEBMASTER_API_KEY).
 *
 * THE ANSWER-ENGINE FUNNEL, printed first. Five sources is four more than
 * anybody reconciles on a Monday, so the report opens with one screen
 * (scripts/lib/aeo.mjs): reachable → ingested → indexed → shown → followed,
 * each stage scored and each capped by the one above it, with the stage to
 * work next named. It adds no network call — it folds what the sections below
 * already pulled. Its two new inputs are the ones that make "how are we doing
 * on AEO" answerable without a human at all:
 *
 *   - the Cloudflare pull now classifies answer-engine user-agents at the
 *     edge (scripts/lib/crawlers.mjs) into the ones that build an index, the
 *     ones that fetch a page while answering somebody, and the ones that only
 *     train — and counts 401/403/429 apart from 404, because a refused
 *     crawler is a rule we wrote and a 404 is link rot;
 *   - the live sitemap is read on every pull, so coverage has a denominator.
 *
 * Every stage says whether it was measured automatically, partially (a
 * credential is missing, and which) or by a person. Stage 4 is the honest
 * hole: Google withholds AI-feature data from its API and no assistant sells
 * a "were we named" endpoint, so it scores from a proxy, capped at 60, and
 * says so. `npm run aeo` re-scores the committed snapshots without pulling.
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
 *   BING_WEBMASTER_API_KEY optional but load-bearing for AEO: Bing Webmaster
 *                          Tools → Settings → API access → Generate. Read-only
 *                          here. Bing's index is what Copilot answers from and
 *                          what ChatGPT search pulls web results from, so
 *                          without this key the funnel's INDEXED stage knows
 *                          only Google's half — and a site can be invisible in
 *                          two assistants for a reason that is pure classic
 *                          indexing and has nothing to do with "AI".
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
import { existsSync, readFileSync } from 'node:fs';
import { SITE_URL } from '../src/data/origin.mjs';
import { highIntentReport } from './lib/intent.mjs';
import { readGenAiExports, genAiReport, GENAI_DIR } from './lib/genai.mjs';
import { classify } from './lib/crawlers.mjs';
import { aeoReport, aeoMarkdown } from './lib/aeo.mjs';

const SITE = new URL(SITE_URL).host;
if (/example\.com$/.test(SITE)) {
  console.log(`insights: origin is still ${SITE} — no live site yet, nothing to measure. Set src/data/origin.mjs first.`);
  process.exit(0);
}
const GSC_PROPERTY = `sc-domain:${SITE}`;
/** The one AEO input with no API anywhere: what the assistants said when asked. */
const AI_PANEL = 'marketing/ai-panel.md';

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
    const byImpressions = (a, b) => b.impressions - a.impressions || a.position - b.position;
    const [queriesRaw, pagesRaw, pageQueriesRaw] = await Promise.all([
      query({ dimensions: ['query'], rowLimit: 500 }),
      query({ dimensions: ['page'], rowLimit: 100 }),
      // page × query: which words each page is actually shown for. This is
      // the input to "say what the searcher types" (AGENTS § Content rules) —
      // without it a title rewrite is a guess.
      query({ dimensions: ['page', 'query'], rowLimit: 1000 }),
    ]);
    // GSC orders rows by clicks; on a zero-click site that is an arbitrary
    // order, and a top-N slice of it is an arbitrary fragment (the ancestor
    // site's early snapshots kept the first 20 and lost its best cluster
    // entirely). Keep EVERY row, sorted by impressions — the snapshot is the
    // measurement history.
    const queries = [...queriesRaw].sort(byImpressions);
    const pages = [...pagesRaw].sort(byImpressions);
    const pageQueries = {};
    for (const r of [...pageQueriesRaw].sort(byImpressions)) {
      const [page, q] = r.keys;
      (pageQueries[page] ??= []).push({ query: q, clicks: r.clicks, impressions: r.impressions, position: r.position });
    }
    // The actionable slice: real demand (impressions) sitting just off page
    // one, where a title rewrite or content upgrade moves the needle.
    const opportunities = queries
      .filter((r) => r.impressions >= 20 && r.position >= 4 && r.position <= 20)
      .sort(byImpressions)
      .slice(0, 15);
    // The same slice with no volume floor — at a small site's size (hundreds
    // of impressions a month) ≥20 on a single query is rare, and the position
    // 4–20 set on ANY impressions is the rung-2 shortlist the funnel ladder
    // works (STRATEGY.md § Content strategy).
    const nearPageOne = queries
      .filter((r) => r.position >= 4 && r.position <= 20)
      .sort(byImpressions)
      .slice(0, 40);
    // The buyer's queries, whatever their volume: every row carrying a
    // transactional signal or sitting on the watch list, with the page Google
    // shows it on against the page whose frontmatter claims it. Worked first
    // in every cadence run; the report's own section.
    const highIntent = highIntentReport(queries, pageQueries, SITE);
    return { startDate, endDate, queries, pages, pageQueries, opportunities, nearPageOne, highIntent };
  } catch (e) {
    if (e.notOnboarded) return { skipped: e.message };
    throw e;
  }
}

/** ---------- The live sitemap — the denominator for every coverage figure ---------- */

/**
 * Read every <loc> out of the live sitemap index and its children. No
 * credentials, so it runs on every pull: "23 of 41 pages are in Bing's index"
 * needs the 41, and the 41 has to come from what is PUBLISHED right now, not
 * from a local build that may be ahead of the deploy. Same source of truth as
 * indexnow.mjs. Failure is soft — a scorecard without a denominator says so.
 */
async function sitemapUrls() {
  const locs = async (url) =>
    [...(await (await fetch(url, { signal: AbortSignal.timeout(20_000) })).text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const sitemaps = await locs(`https://${SITE}/sitemap-index.xml`);
  // A one-file sitemap lists pages directly; an index lists sitemaps. Telling
  // them apart by extension is wrong (both end .xml), so recurse only into
  // entries the index actually points at, and fall back to the top level.
  const children = (await Promise.all(sitemaps.map((u) => locs(u).catch(() => [])))).flat();
  return [...new Set(children.length ? children : sitemaps)];
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

  const urls = await sitemapUrls();

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

  // The manual-submission shortlist: at this site's size, requesting indexing
  // by hand in Search Console measurably shortens time-to-index, and the GSC
  // API has no endpoint for it — a person pastes each URL into the top search
  // box and clicks "Request indexing" (daily quota is roughly a dozen, hence
  // 10). Priority: never-crawled first, then discovered-but-not-indexed, then
  // crawled-but-not-indexed — the order in which a manual nudge helps most.
  const PRIORITY = [/unknown to google/i, /discovered/i, /crawled/i, /excluded|not indexed/i];
  const unindexed = results.filter((r) => !/^submitted and indexed$/i.test(r.state) && !r.state.startsWith('error'));
  unindexed.sort((a, b) => {
    const rank = (r) => {
      const i = PRIORITY.findIndex((p) => p.test(r.state));
      return i === -1 ? PRIORITY.length : i;
    };
    return rank(a) - rank(b);
  });
  return { total: urls.length, byState, requestIndexing: unindexed.slice(0, 10).map((r) => r.url) };
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

  // ---- Answer-engine crawlers: the GEO half of the edge ----
  //
  // WHY THIS LIVES HERE AND NOWHERE ELSE. A visit from OAI-SearchBot or
  // PerplexityBot is invisible to every other source this script reads: Umami
  // needs JavaScript and a bot runs none, Search Console reports Google and
  // only Google, and Bing reports Bing. The edge sees every request that was
  // ever made, which makes this the only automatic answer to "do the answer
  // engines actually read this site" — and, more usefully, to "are we
  // REFUSING one of them", which a browser check can never reveal because the
  // rule that blocks a crawler leaves a browser alone.
  //
  // Two constraints shape the shape of the query. The adaptive dataset takes
  // one day of range per call on this plan (same limit the 404 table lives
  // with), so the window is walked a day at a time and days that return
  // nothing are simply absent — retention, not an error. And there is no
  // server-side pattern filter on userAgent, so each day pulls the top 500
  // agent/status pairs and classification happens here; on a site whose human
  // traffic pushes crawlers past rank 500 the counts would under-read, which
  // `truncatedDays` reports rather than hides.
  const CRAWLER_DAYS = Math.min(DAYS, 7);
  const agents = new Map();
  const brief = { total: 0, agents: new Set() };
  let truncatedDays = 0;
  let crawlerDays = 0;
  const dayResults = await Promise.all(
    Array.from({ length: CRAWLER_DAYS }, (_, i) => isoDate(now - (i + 1) * DAY)).map(async (date) => {
      const d = await gql(`query { viewer { zones(filter: {zoneTag: "${zoneTag}"}) {
        agents: httpRequestsAdaptiveGroups(filter: {date: "${date}"}, limit: 500, orderBy: [count_DESC]) {
          count dimensions { userAgent edgeResponseStatus } }
        brief: httpRequestsAdaptiveGroups(filter: {date: "${date}", clientRequestPath: "/llms.txt"}, limit: 50, orderBy: [count_DESC]) {
          count dimensions { userAgent } }
      } } }`);
      return { date, ...d };
    }).map((pr) => pr.catch(() => null)),
  );
  for (const d of dayResults) {
    if (!d) continue;
    crawlerDays += 1;
    if (d.agents.length >= 500) truncatedDays += 1;
    for (const row of d.agents) {
      const hit = classify(row.dimensions.userAgent);
      if (!hit) continue;
      const a = agents.get(hit.agent) ?? {
        agent: hit.agent, engine: hit.engine, product: hit.product, role: hit.role,
        requests: 0, ok: 0, refused: 0, notFound: 0, failed: 0, days: new Set(), statuses: {},
      };
      // 403 and 404 are both "4xx" and mean opposite things here. A 404 to a
      // crawler is link rot — a URL we removed or never had, already covered
      // by the 404 table above. A 401/403/429 is a rule WE wrote, invisible
      // in a browser, and the one failure mode that takes a site out of an
      // index rather than out of a page. Counting them together would bury
      // the serious one under the ordinary one, so they are counted apart.
      const status = Number(row.dimensions.edgeResponseStatus);
      a.requests += row.count;
      if (status >= 500) a.failed += row.count;
      else if (status === 401 || status === 403 || status === 429) a.refused += row.count;
      else if (status >= 400) a.notFound += row.count;
      else a.ok += row.count;
      a.statuses[status] = (a.statuses[status] ?? 0) + row.count;
      a.days.add(d.date);
      agents.set(hit.agent, a);
    }
    for (const row of d.brief) {
      brief.total += row.count;
      const hit = classify(row.dimensions.userAgent);
      if (hit) brief.agents.add(hit.agent);
    }
  }

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
    aiCrawlers: {
      daysCovered: crawlerDays,
      daysRequested: CRAWLER_DAYS,
      truncatedDays,
      llmsTxt: { total: brief.total, agents: [...brief.agents] },
      agents: [...agents.values()]
        .map((a) => ({ ...a, days: a.days.size }))
        .sort((a, b) => b.requests - a.requests),
    },
  };
}

/** ---------- Bing Webmaster Tools (optional) ---------- */

/**
 * Why Bing at all: Bing's index is what Copilot answers from and what ChatGPT
 * search leans on for web results (the Sep 2026 discovery-audit frame — "classic SEO and Bing indexing are prerequisites for GEO, not
 * alternatives"). Verify the site there (site.ts → VERIFICATION.bing); IndexNow already
 * pings it; this reads the numbers back. The JSON API's
 * response shape is `{ d: [...] }` on the classic endpoint; guarded either way.
 */
async function bing() {
  const key = process.env.BING_WEBMASTER_API_KEY;
  if (!key) return { skipped: 'BING_WEBMASTER_API_KEY not set — see SETUP.md § Insights read-back.' };
  const site = `https://${SITE}/`;
  const call = async (method) => {
    const r = await fetch(`https://ssl.bing.com/webmaster/api.svc/json/${method}?siteUrl=${encodeURIComponent(site)}&apikey=${key}`, {
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) throw new Error(`Bing ${method} → ${r.status}: ${(await r.text()).slice(0, 160)}`);
    const j = await r.json();
    return j.d ?? j;
  };
  const [queries, links, crawl, pageStats, traffic] = await Promise.all([
    call('GetQueryStats').catch((e) => ({ error: e.message })),
    call('GetLinkCounts').catch((e) => ({ error: e.message })),
    call('GetCrawlStats').catch((e) => ({ error: e.message })),
    // Per-PAGE Bing impressions. The AEO reading of this table: a page with
    // Bing impressions is a page Copilot and ChatGPT search can reach for,
    // and a page with none is invisible to both however well it does on
    // Google. Nothing else this script reads can say that.
    call('GetPageStats').catch((e) => ({ error: e.message })),
    call('GetRankAndTrafficStats').catch((e) => ({ error: e.message })),
  ]);
  const rows = Array.isArray(queries) ? queries : [];
  // The query endpoint returns one row per query per day; fold to per query.
  const byQuery = new Map();
  for (const r of rows) {
    const q = r.Query ?? r.query;
    if (!q) continue;
    const cur = byQuery.get(q) ?? { query: q, impressions: 0, clicks: 0 };
    cur.impressions += Number(r.Impressions ?? 0);
    cur.clicks += Number(r.Clicks ?? 0);
    byQuery.set(q, cur);
  }
  const topQueries = [...byQuery.values()].sort((a, b) => b.impressions - a.impressions).slice(0, 30);
  const crawlRows = Array.isArray(crawl) ? crawl : [];
  const last = crawlRows.at(-1) ?? {};
  const pages = (Array.isArray(pageStats) ? pageStats : [])
    .map((r) => ({
      page: String(r.Query ?? r.Url ?? r.query ?? '').replace(`https://${SITE}`, '') || '/',
      impressions: Number(r.Impressions ?? 0),
      clicks: Number(r.Clicks ?? 0),
    }))
    .filter((r) => r.page)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 30);
  const trend = (Array.isArray(traffic) ? traffic : []).slice(-1)[0] ?? null;
  return {
    topQueries,
    queriesError: queries?.error,
    pages,
    pagesError: pageStats?.error,
    trend: trend ? { impressions: trend.Impressions ?? null, clicks: trend.Clicks ?? null, indexed: trend.InIndex ?? null } : (traffic?.error ? { error: traffic.error } : null),
    links: links?.error ? { error: links.error } : links,
    crawl: crawl?.error ? { error: crawl.error } : { days: crawlRows.length, lastInIndex: last.InIndex ?? null, lastCrawledPages: last.CrawledPages ?? null, lastHttp4xx: last.Code4xx ?? null },
  };
}

/** ---------- Search Console — Generative AI report (UI export) ---------- */

/**
 * No credentials: it reads files. Runs after Umami and Search Console so it
 * can join their rows. See scripts/lib/genai.mjs for what it can and cannot
 * know, and DEPLOY.md § 7c for how the export gets into the folder.
 */
function genai(u, g) {
  const exps = readGenAiExports(GENAI_DIR);
  return genAiReport({
    site: SITE,
    exports: exps,
    gscPages: g?.pages ?? [],
    gscQueries: g?.queries ?? [],
    referrers: u?.referrers ?? [],
    now,
  });
}

/** ---------- Report ---------- */

const settle = async (fn) => {
  try { return await fn(); } catch (e) { return { error: e.message }; }
};

const [u, g, c, b, ins, sitemap] = await Promise.all([
  settle(umami), settle(gsc), settle(cloudflare), settle(bing),
  INSPECT ? settle(gscInspect) : Promise.resolve(null),
  sitemapUrls().catch(() => null),
]);
let ai;
try { ai = genai(u, g); } catch (e) { ai = { error: e.message }; }

// The answer-engine funnel, folded from the blocks above. It adds no network
// call of its own: everything it scores was already pulled, it just refuses to
// leave "how are we doing on AEO" as five tables a person has to reconcile.
let aeo;
try {
  aeo = aeoReport({
    site: SITE, windowDays: DAYS, cloudflare: c, bing: b, searchConsole: g,
    generativeAi: ai, indexing: ins, sitemapCount: sitemap?.length ?? null,
    panel: existsSync(AI_PANEL) ? readFileSync(AI_PANEL, 'utf8') : '', now,
  });
} catch (e) { aeo = { error: e.message }; }

const report = {
  site: SITE,
  generated: new Date(now).toISOString(), windowDays: DAYS,
  sitemapUrls: sitemap?.length ?? null,
  aeo,
  umami: u, searchConsole: g, generativeAi: ai, bing: b, cloudflare: c,
  ...(ins && { indexing: ins }),
};

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

section('Answer-engine funnel (AEO / GEO) — the headline');
if (aeo?.error) out.push(`_${aeo.error}_`);
else {
  out.push('Getting cited is a funnel, and each stage is capped by the one above it: an engine that cannot FETCH the page will never index it, and a page no index carries will never be shown in an answer however well it is written. Read it top down and work the first stage that is under its bar — the tables further down this report are the detail behind these five rows.\n');
  out.push(aeoMarkdown(aeo));
}

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
  if (ai?.referrals) {
    out.push('\n**Referrals from AI assistants** — a visitor who clicked a citation in ChatGPT, Perplexity, Gemini, Copilot, Claude… The only place a citation that was actually FOLLOWED shows up.\n');
    if (!ai.referrals.length) out.push('_None in this window._');
    else table(['Assistant', 'Referrer', 'Visitors'], ai.referrals.map((r) => [r.assistant, r.referrer, r.visitors]));
  }
  out.push('\n**Countries**\n');
  table(['Country', 'Visitors'], u.countries.map((r) => [r.x, r.y]));
}

section('Google Search Console — demand and positions');
if (g.skipped || g.error) out.push(`_${g.skipped ?? g.error}_`);
else {
  out.push(`Window ${g.startDate} → ${g.endDate} (GSC lags ~2 days).\n`);
  if (g.highIntent) {
    const hi = g.highIntent;
    out.push('**High-intent queries — work these first** (transactional and commercial phrasings: software, system, tool, pricing, vs…; rules in `src/data/intent.json`). Status: `ok` = Google shows the page that claims the query; `wrong-page` = a different page is ranking, so the claiming page needs the phrase and an inbound link on it; `unmapped` = no page claims it yet — map it in `marketing/keyword-map.md § High-intent` or add it to a money page\'s keywords.\n');
    if (hi.rows.length === 0) out.push('_No high-intent query earned an impression in this window._');
    else table(['Query', 'Impressions', 'Clicks', 'Position', 'Google shows', 'Claimed by', 'Status'],
      hi.rows.map((r) => [
        (r.watch ? '★ ' : '') + r.query, r.impressions, r.clicks, r.position.toFixed(1),
        r.shownOn ?? '—', r.intended ?? '—', r.status,
      ]));
    if (hi.notShowing.length) {
      out.push(`\n_Watch-list terms with no impressions yet (${hi.notShowing.length}): ` +
        hi.notShowing.map((w) => `"${w.query}" → ${w.page}`).join(' · ') + '._');
    }
    out.push('');
  }
  out.push(`**Top queries** (${g.queries.length} in the window, top 30 by impressions; every row is in the JSON snapshot)\n`);
  table(['Query', 'Clicks', 'Impressions', 'CTR', 'Position'],
    g.queries.slice(0, 30).map((r) => [r.keys[0], r.clicks, r.impressions, pct(r.clicks, r.impressions), r.position.toFixed(1)]));
  out.push('\n**Top pages**\n');
  table(['Page', 'Clicks', 'Impressions', 'CTR', 'Position'],
    g.pages.map((r) => [r.keys[0].replace(`https://${SITE}`, '') || '/', r.clicks, r.impressions, pct(r.clicks, r.impressions), r.position.toFixed(1)]));
  out.push('\n**Opportunities** — ≥20 impressions at position 4–20: demand we rank for but do not win\n');
  if (g.opportunities.length === 0) out.push('_None in this window._');
  else table(['Query', 'Impressions', 'Clicks', 'Position'],
    g.opportunities.map((r) => [r.keys[0], r.impressions, r.clicks, r.position.toFixed(1)]));
  out.push('\n**Near page one** — every query at position 4–20, any volume: the rung-2 shortlist (STRATEGY.md § funnel ladder)\n');
  if (!g.nearPageOne?.length) out.push('_None in this window._');
  else table(['Query', 'Impressions', 'Clicks', 'Position'],
    g.nearPageOne.map((r) => [r.keys[0], r.impressions, r.clicks, r.position.toFixed(1)]));
  if (g.pageQueries) {
    out.push('\n**What each page is shown for** — top 5 queries per page, pages with ≥3 impressions (the words to put in the title, description and a heading)\n');
    for (const [page, rows] of Object.entries(g.pageQueries)) {
      const total = rows.reduce((n, r) => n + r.impressions, 0);
      if (total < 3) continue;
      out.push(`- \`${page.replace(`https://${SITE}`, '') || '/'}\` (${total} impr): ` +
        rows.slice(0, 5).map((r) => `"${r.query}" ${r.impressions}@${r.position.toFixed(0)}`).join(' · '));
    }
    out.push('');
  }
}

section('Generative AI — where Google\'s AI features show the site');
if (ai?.error) out.push(`_${ai.error}_`);
else {
  out.push('The Search Console **Generative AI** report: impressions inside AI Overviews and AI Mode, by page. Impressions only — Google withholds the queries and the clicks, and there is no API, so this reads the newest export dropped in `' + GENAI_DIR + '/` (SETUP.md § Insights read-back). The two tables after it are proxies for what the report hides.\n');
  if (!ai.exportDate) out.push(`_${ai.note}_`);
  else {
    const delta = ai.previousTotal == null ? '' : ` (previous export ${ai.previousDate}: ${ai.previousTotal.toLocaleString()})`;
    out.push(`**Export dated ${ai.exportDate}**${ai.stale ? ` — **${ai.ageDays} days old; ask for a fresh one**` : ''}: **${ai.total.toLocaleString()} AI impressions**${delta}, ${ai.pagesCited} pages shown.\n`);
    out.push('**Pages shown in AI features** — AI impressions beside the ordinary web impressions for the same page in this window; the share says how much of a page\'s visibility is already AI-shaped\n');
    table(['Page', 'AI impr.', 'Web impr.', 'AI share'],
      ai.topPages.map((p) => [p.page, p.ai, p.web ?? '—', p.share == null ? '—' : `${(100 * p.share).toFixed(0)}%`]));
    if (ai.movers.length && ai.previousDate) {
      out.push(`\n**Moved since the ${ai.previousDate} export**\n`);
      table(['Page', 'Then', 'Now'], ai.movers.map((p) => [p.page, p.previous, p.ai]));
    }
    out.push('\n**Shown on the web, never in AI** — ≥10 web impressions in the window and zero AI impressions in the export: the pages to give an answer-shaped opening (the `tldr`), a FAQ block in the searcher\'s words and named sources — the three levers with evidence behind them\n');
    if (!ai.uncited.length) out.push('_Every page with web impressions also appears in AI features._');
    else table(['Page', 'Web impr.', 'Position'], ai.uncited.map((p) => [p.page, p.web, p.position.toFixed(1)]));
    if (ai.countries.length) {
      out.push('\n**AI impressions by country** — read against the Umami split and the target markets in STRATEGY.md\n');
      table(['Country', 'AI impr.'], ai.countries.map((c) => [c.key, c.impressions]));
    }
  }
  out.push('\n**Prompt-shaped queries** — web rows whose phrasing is a prompt, not a keyword (8+ words, a question, a follow-up verb; `isPromptShaped` in scripts/lib/genai.mjs). Google hides the queries behind AI impressions; these are the nearest visible thing, and the phrasing to answer in a FAQ line\n');
  if (!ai.promptShaped.length) out.push('_None in this window._');
  else table(['Query', 'Impressions', 'Clicks', 'Position'], ai.promptShaped.map((r) => [r.query, r.impressions, r.clicks, r.position.toFixed(1)]));
}

section('Bing Webmaster Tools — the index behind Copilot and ChatGPT search');
if (b.skipped || b.error) out.push(`_${b.skipped ?? b.error}_`);
else {
  if (b.queriesError) out.push(`_Query stats: ${b.queriesError}_`);
  else if (!b.topQueries.length) out.push('_No Bing query rows in the window._');
  else table(['Query (Bing)', 'Impressions', 'Clicks'], b.topQueries.map((r) => [r.query, r.impressions, r.clicks]));
  if (b.pagesError) out.push(`\n_Page stats: ${b.pagesError}_`);
  else if (b.pages?.length) {
    out.push('\n**Pages Bing shows** — the AEO reading: a page with Bing impressions is a page Copilot and ChatGPT search can reach for; a page with none is invisible to both however well it does on Google\n');
    table(['Page', 'Impressions', 'Clicks'], b.pages.map((r) => [r.page, r.impressions, r.clicks]));
  }
  if (b.trend?.error) out.push(`\n_Rank and traffic: ${b.trend.error}_`);
  else if (b.trend) out.push(`\nLatest day Bing reports: ${b.trend.impressions ?? '—'} impressions, ${b.trend.clicks ?? '—'} clicks, ${b.trend.indexed ?? '—'} pages indexed.`);
  if (b.crawl?.error) out.push(`\n_Crawl stats: ${b.crawl.error}_`);
  else if (b.crawl) out.push(`\nCrawl: ${b.crawl.days} days of data · pages in Bing's index ${b.crawl.lastInIndex ?? '—'} · crawled ${b.crawl.lastCrawledPages ?? '—'} · 4xx ${b.crawl.lastHttp4xx ?? '—'} (latest day)`);
  if (b.links?.error) out.push(`\n_Link counts: ${b.links.error}_`);
  else if (b.links) out.push(`\nInbound links Bing knows: ${JSON.stringify(b.links).slice(0, 300)}`);
}

if (ins) {
  section('Indexing — URL Inspection over the live sitemap');
  if (ins.skipped || ins.error) out.push(`_${ins.skipped ?? ins.error}_`);
  else {
    out.push(`${ins.total} URLs in the sitemap.\n`);
    if (ins.requestIndexing?.length) {
      out.push(`**Request indexing manually — today's list** (paste each into the Search Console top bar → Request indexing; ~a dozen/day is the quota)\n`);
      ins.requestIndexing.forEach((u, i) => out.push(`${i + 1}. ${u}`));
      out.push('');
    }
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

  const cr = c.aiCrawlers;
  if (cr) {
    out.push(`\n**Answer-engine crawlers** — ${cr.daysCovered}/${cr.daysRequested} days of adaptive data (one day of range per call on this plan; missing days are retention, not an error)${cr.truncatedDays ? `; ${cr.truncatedDays} day(s) hit the 500-agent cap, so counts there under-read` : ''}. Roles: \`index\` builds the index an assistant answers FROM, \`live\` fetched the page while answering somebody's question, \`train\` affects no answer given today.\n`);
    if (!cr.agents.length) out.push('_No answer-engine crawler reached the edge in this window._');
    else table(['Agent', 'Engine → product', 'Role', 'Requests', 'Days', 'Served', 'REFUSED (401/403/429)', '404', '5xx'],
      cr.agents.map((a) => [a.agent, `${a.engine} → ${a.product}`, a.role, a.requests.toLocaleString(), a.days, a.ok.toLocaleString(), a.refused ? `**${a.refused}**` : '0', a.notFound || '0', a.failed || '0']));
    out.push(`\n\`/llms.txt\` fetched ${cr.llmsTxt.total} time(s)${cr.llmsTxt.agents.length ? ` by ${cr.llmsTxt.agents.join(', ')}` : ''} — the machine brief is only worth maintaining if something reads it.`);
  }
}

out.push('\n---\n_Read-only report. No figure here may be published on the site — pages cite `facts.json`, per AGENTS rule 1._');
console.log(out.join('\n'));
process.exit(u.error || g.error || c.error ? 1 : 0);
