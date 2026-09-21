/**
 * aeo.mjs — "how are we doing on AEO and GEO", answered without a human in
 * the loop, from the sources that have an API.
 *
 * THE PROBLEM THIS SOLVES. The answer-engine numbers this repo already
 * collects are each true and none of them is an answer. Bing query rows, an
 * AI-Overviews export, four referrals from Perplexity, a wall of Cloudflare
 * status codes — a person has to hold all of it at once to say whether the
 * site is doing well, and a person holding all of it at once is exactly the
 * manual step we are trying to delete. So this module folds them into ONE
 * FUNNEL, because getting cited is a funnel and each stage can only be as
 * good as the one above it:
 *
 *   1. REACHABLE  the answering agents can fetch pages at all (2xx, not 403)
 *   2. INGESTED   they actually do fetch them — which engines, how recently
 *   3. INDEXED    the pages are in the indexes the answers are drawn FROM
 *   4. SHOWN      the site appears inside an answer
 *   5. FOLLOWED   somebody clicked the citation and arrived
 *
 * Reading the funnel top-down is the whole point: stage 4 at zero means
 * nothing if stage 1 is at 40, because a WAF rule is the finding and the
 * content is not. The `next` list is built that way — the highest stage
 * below its threshold wins, and only that one is proposed.
 *
 * WHAT IS AUTOMATIC AND WHAT IS NOT, stated per stage rather than in prose,
 * because the honest answer to "can this run unattended" differs by stage and
 * changes as credentials are added. Each stage carries `automatic`:
 *
 *   true     measured this run from an API, no human involved
 *   'partial' measured, but a missing credential costs it a source — the
 *            `manual` string names the credential and what it would add
 *   false    the only real source is a person doing something (the Search
 *            Console Generative AI export; the prompt panel)
 *
 * Stage 4 is the one that is genuinely not fully automatable in Sep 2026:
 * Google withholds AI-feature data from its API, and no assistant sells a
 * "were we named" endpoint. So stage 4 scores from a PROXY when the export is
 * absent — prompt-shaped query impressions — and says so in the evidence
 * rather than quietly passing a guess off as a measurement. A proxy score is
 * capped at 60: a proxy may not read as STRONG.
 *
 * SCORING. 0–100, banded the same way as discovery-audit.mjs (≥75 STRONG,
 * ≥40 WEAK, below CRITICAL), and `null` for "no data reached this stage",
 * which is never the same as zero and never enters the mean. Counts are
 * scored on a log curve, not linearly: for a site this size the difference
 * between 0 and 4 AI referrals is the whole story and the difference between
 * 90 and 120 is noise.
 *
 * Read-only, zero dependencies, and nothing it emits may land on a page —
 * AGENTS rule 1 applies here exactly as it does to insights.mjs.
 */

import { ANSWERING_ROLES } from './crawlers.mjs';

/** The five engines whose index decides whether a buyer's assistant can cite us. */
const INDEX_ENGINES = ['Google', 'Microsoft', 'OpenAI', 'Anthropic', 'Perplexity'];

export const band = (s) => (s == null ? 'n/a' : s >= 75 ? 'STRONG' : s >= 40 ? 'WEAK' : 'CRITICAL');

/** Log curve: `full` is the count that earns 100. Small counts move the score a lot. */
const curve = (n, full) => (n <= 0 ? 0 : Math.min(100, Math.round((Math.log10(1 + n) / Math.log10(1 + full)) * 100)));
const pct = (n, d) => (d > 0 ? Math.round((100 * n) / d) : null);

/**
 * @param {object} o
 * @param {string} o.site                bare host
 * @param {number} o.windowDays
 * @param {object} [o.cloudflare]        insights `cloudflare` block (wants `aiCrawlers`)
 * @param {object} [o.bing]              insights `bing` block
 * @param {object} [o.searchConsole]     insights `searchConsole` block
 * @param {object} [o.generativeAi]      insights `generativeAi` block
 * @param {object} [o.indexing]          insights `indexing` block (--inspect only)
 * @param {number} [o.sitemapCount]      URLs in the live sitemap — the denominator
 * @param {string} [o.panel]             marketing/ai-panel.md, raw
 * @param {number} [o.now]
 */
export function aeoReport({
  site, windowDays = 28, cloudflare, bing, searchConsole, generativeAi, indexing,
  sitemapCount = null, panel = '', now = Date.now(),
}) {
  const stages = [];
  const stage = (key, name, s) => stages.push({ key, name, band: band(s.score), ...s });

  /* ---------------------------------------------------------- 1. REACHABLE */
  {
    const cr = cloudflare?.aiCrawlers;
    const agents = cr?.agents ?? [];
    const answering = agents.filter((a) => ANSWERING_ROLES.has(a.role));
    const ok = answering.reduce((n, a) => n + a.ok, 0);
    const refused = answering.reduce((n, a) => n + (a.refused ?? 0), 0);
    const notFound = answering.reduce((n, a) => n + (a.notFound ?? 0), 0);
    const failed = answering.reduce((n, a) => n + a.failed, 0);
    const total = ok + refused + notFound + failed;
    // This stage scores REFUSALS and server errors only. A 404 to a crawler
    // is link rot: real, worth fixing, and already on the 404 table — but it
    // costs one URL, not the site's place in an index, and letting it drag
    // this score down would make the stage cry wolf on every pull. A
    // 401/403/429 is different in kind: it is a rule we wrote, it is
    // invisible in a browser, and it removes the site from the index an
    // assistant answers from. One refused agent caps the stage at 40.
    const blockedBy = answering.filter((a) => (a.refused ?? 0) > 0).map((a) => `${a.agent} (${a.refused} × 401/403/429)`);
    const scorable = ok + refused + failed;
    stage('reachable', 'Reachable — the answering agents get a page, not a block', {
      score: total ? (blockedBy.length ? Math.min(40, pct(ok, scorable)) : pct(ok, scorable)) : null,
      automatic: cr ? true : 'partial',
      manual: cr ? null : 'CLOUDFLARE_READ_ANALYTICS — without it the edge is unread and a WAF block on an answer-engine agent is invisible.',
      evidence: !cr
        ? 'No Cloudflare read-back, so nothing knows whether an answer engine was served or refused.'
        : !total
          ? `No answering agent reached the edge in the ${cr.daysCovered ?? 0} day(s) of edge data — nothing to block and nothing to serve.`
          : `${ok.toLocaleString()} served, ${refused.toLocaleString()} REFUSED (401/403/429), ${failed.toLocaleString()} errored (5xx)` +
            (blockedBy.length ? ` — refusing ${blockedBy.join(', ')}` : '') +
            (notFound ? ` · ${notFound.toLocaleString()} × 404 (link rot, not a block — see the 404 table)` : ''),
      blockers: blockedBy.length
        ? [`The edge is REFUSING ${blockedBy.join(', ')}. Check the WAF, bot-fight mode and any rate limit before writing another page: this is the one defect on the list that removes the site from an index rather than from a page.`]
        : [],
    });
  }

  /* ----------------------------------------------------------- 2. INGESTED */
  {
    const cr = cloudflare?.aiCrawlers;
    const agents = cr?.agents ?? [];
    const byEngine = new Map();
    for (const a of agents) {
      if (!ANSWERING_ROLES.has(a.role)) continue;
      const e = byEngine.get(a.engine) ?? { engine: a.engine, requests: 0, roles: new Set(), agents: [] };
      e.requests += a.requests;
      e.roles.add(a.role);
      e.agents.push(a.agent);
      byEngine.set(a.engine, e);
    }
    const seen = INDEX_ENGINES.filter((e) => byEngine.has(e));
    const missing = INDEX_ENGINES.filter((e) => !byEngine.has(e));
    const live = agents.filter((a) => a.role === 'live' && a.requests > 0);
    const brief = cr?.llmsTxt ?? null;
    stage('ingested', 'Ingested — they fetch the pages, not just the robots file', {
      score: cr ? Math.round((seen.length / INDEX_ENGINES.length) * 100) : null,
      automatic: cr ? true : 'partial',
      manual: cr ? null : 'CLOUDFLARE_READ_ANALYTICS — the only source that sees a non-browser request at all.',
      evidence: !cr
        ? 'No Cloudflare read-back.'
        : `${seen.length}/${INDEX_ENGINES.length} answering indexes crawled us in ${cr.daysCovered} day(s): ${seen.join(', ') || 'none'}` +
          (missing.length ? ` · absent: ${missing.join(', ')}` : '') +
          (live.length ? ` · LIVE fetches (a user's question reached us in real time): ${live.map((a) => `${a.agent} ×${a.requests}`).join(', ')}` : '') +
          (brief ? ` · llms.txt read ${brief.total} time(s) by ${brief.agents.join(', ') || 'nobody identifiable'}` : ''),
      engines: [...byEngine.values()].map((e) => ({ ...e, roles: [...e.roles] })).sort((a, b) => b.requests - a.requests),
      // Only a real read-back can say an engine is ABSENT; no read-back means
      // unknown, and reporting unknown as an outage is how a scorecard earns
      // the habit of being ignored.
      blockers: cr && missing.includes('Microsoft')
        ? ['Bingbot has not crawled in this window. Bing is the index Copilot answers from and ChatGPT search pulls web results from — this is an AEO outage, not a Bing-market-share question.']
        : [],
    });
  }

  /* ------------------------------------------------------------ 3. INDEXED */
  {
    const b = bing && !bing.skipped && !bing.error ? bing : null;
    const bingIndexed = b?.crawl && !b.crawl.error ? b.crawl.lastInIndex : null;
    const bingQueries = b?.topQueries?.length ?? 0;
    // Google's side: --inspect gives the real per-URL verdict; without it,
    // "pages earning an impression" is the weaker stand-in.
    const googleIndexed = indexing && !indexing.skipped && !indexing.error
      ? Object.entries(indexing.byState).filter(([s]) => /indexed/i.test(s) && !/not indexed/i.test(s)).reduce((n, [, r]) => n + r.length, 0)
      : (searchConsole?.pages?.length ?? null);
    const scores = [];
    if (bingIndexed != null && sitemapCount) scores.push(Math.min(100, pct(bingIndexed, sitemapCount)));
    if (googleIndexed != null && sitemapCount) scores.push(Math.min(100, pct(googleIndexed, sitemapCount)));
    stage('indexed', 'Indexed — the pages are in the indexes the answers are drawn from', {
      score: scores.length ? Math.round(scores.reduce((a, c) => a + c, 0) / scores.length) : null,
      automatic: b ? true : 'partial',
      manual: b ? null : 'BING_WEBMASTER_API_KEY — Bing\'s index count and query rows are half of this stage, and the half that covers Copilot and ChatGPT search.',
      evidence: [
        sitemapCount ? `${sitemapCount} URLs in the live sitemap` : 'sitemap not read',
        bingIndexed != null ? `${bingIndexed} in Bing's index, ${bingQueries} Bing queries earning impressions`
          : b ? 'Bing read back, but its crawl stats carried no index count'
            : 'Bing UNREAD — no BING_WEBMASTER_API_KEY, so the Copilot/ChatGPT-search side of the index is a blind spot',
        googleIndexed != null ? `${googleIndexed} indexed by Google${indexing ? '' : ' (pages earning impressions — run with --inspect for the real verdict)'}` : 'Google indexing unread',
      ].join(' · '),
      blockers: bing && !b ? ['Set BING_WEBMASTER_API_KEY (Bing Webmaster Tools → Settings → API access) — see SETUP.md § Insights read-back.'] : [],
    });
  }

  /* -------------------------------------------------------------- 4. SHOWN */
  {
    const ai = generativeAi ?? {};
    const exported = ai.exportDate && !ai.error;
    const proxy = (ai.promptShaped ?? []).reduce((n, r) => n + (r.impressions ?? 0), 0);
    let score = null;
    let evidence;
    if (exported) {
      score = Math.min(100, curve(ai.total, 500) - (ai.stale ? 20 : 0));
      evidence = `${ai.total.toLocaleString()} AI-feature impressions across ${ai.pagesCited} pages (Search Console export ${ai.exportDate}${ai.stale ? `, ${ai.ageDays} days STALE` : ''})` +
        (ai.uncited?.length ? ` · ${ai.uncited.length} pages earn web impressions and have never been shown in an AI feature` : '');
    } else {
      // Proxy: rows whose phrasing is a prompt rather than a keyword. Capped
      // at 60 — it is evidence that answer-shaped demand reaches us, not
      // evidence that an answer showed us.
      score = proxy ? Math.min(60, curve(proxy, 300)) : (searchConsole && !searchConsole.skipped ? 0 : null);
      const n = (ai.promptShaped ?? []).length;
      evidence = `No Generative AI export — scored from the PROXY: ${proxy.toLocaleString()} impressions on ${n} prompt-shaped quer${n === 1 ? 'y' : 'ies'}. Capped at 60; a proxy never reads STRONG.`;
    }
    const runs = [...String(panel).matchAll(/^## Run (\d{4}-\d{2}-\d{2})/gm)].map((m) => m[1]).sort();
    const lastPanel = runs.at(-1) ?? null;
    stage('shown', 'Shown — the site appears inside an answer', {
      score,
      automatic: exported ? false : false,
      manual: exported
        ? `Search Console → Performance → Generative AI → Export, dropped into marketing/insights/genai/. UI-only: the API rejects every generative-AI type and BigQuery does not carry it. Newest export ${ai.exportDate}${ai.stale ? ' — STALE' : ''}.`
        : 'Search Console → Performance → Generative AI → Export, dropped into marketing/insights/genai/. Until one lands, this stage is a proxy, not a measurement.',
      coversGoogleOnly: true,
      panelLastRun: lastPanel,
      evidence: evidence + ` · Non-Google assistants (ChatGPT, Perplexity, Claude, Copilot) are covered by nothing automatic: the prompt panel is ${lastPanel ? `last run ${lastPanel}` : 'never run'} (marketing/ai-panel.md).`,
      blockers: [],
    });
  }

  /* ----------------------------------------------------------- 5. FOLLOWED */
  {
    // The referral list is derived from Umami's referrers, so "no referrals"
    // and "Umami was never read" are different answers and only one of them
    // is about the site. `referrals` is present (possibly empty) whenever the
    // genai block was built; absent means nothing looked.
    const measured = Array.isArray(generativeAi?.referrals);
    const refs = generativeAi?.referrals ?? [];
    const visitors = refs.reduce((n, r) => n + (r.visitors ?? 0), 0);
    const known = refs.length;
    stage('followed', 'Followed — somebody clicked the citation and arrived', {
      score: measured ? curve(visitors, 50) : null,
      automatic: measured ? true : 'partial',
      manual: measured ? null : 'UMAMI_URL / UMAMI_WEBSITE_ID — a click on a citation arrives as an ordinary visit with an assistant referrer, and Umami is the only thing that sees it.',
      evidence: !measured
        ? 'Umami unread, so a citation that was followed would leave no trace here.'
        : visitors
          ? `${visitors} visitor${visitors === 1 ? '' : 's'} from ${known} assistant${known === 1 ? '' : 's'} in ${windowDays} days: ${refs.map((r) => `${r.assistant} ${r.visitors}`).join(', ')}`
          : `No visitor arrived from an AI assistant in ${windowDays} days. At this site's size that is the expected reading until stage 3 is STRONG — it is a lagging indicator, never the first thing to fix.`,
      assistants: refs,
      blockers: [],
    });
  }

  /* ------------------------------------------------------------- roll-up */
  const scored = stages.filter((s) => s.score != null);
  const overall = scored.length ? Math.round(scored.reduce((n, s) => n + s.score, 0) / scored.length) : null;
  // The funnel rule: propose work on the HIGHEST stage that is below its bar,
  // never the lowest-scoring one. A site cited nowhere because it is blocked
  // at the edge does not need more content.
  const BAR = { reachable: 90, ingested: 60, indexed: 60, shown: 40, followed: 20 };
  const weak = stages.find((s) => s.score != null && s.score < BAR[s.key]);
  const auto = stages.filter((s) => s.automatic === true).length;

  return {
    site, windowDays, generated: new Date(now).toISOString(),
    overall, band: band(overall),
    stages,
    automatic: { full: auto, of: stages.length },
    focus: weak
      ? { stage: weak.key, name: weak.name, score: weak.score, why: `The funnel reads top-down: ${weak.name.split(' — ')[0]} is at ${weak.score} against a bar of ${BAR[weak.key]}, so every stage under it is capped by it.` }
      : null,
    blockers: stages.flatMap((s) => s.blockers ?? []),
    manualSteps: stages.filter((s) => s.automatic !== true).map((s) => ({ stage: s.key, need: s.manual })),
  };
}

/** Markdown for the report. Kept beside the scoring so the two cannot drift. */
export function aeoMarkdown(r) {
  const out = [];
  out.push(`**Answer-engine funnel: ${r.overall ?? '—'} / 100 (${r.band})** — ${r.automatic.full} of ${r.automatic.of} stages measured automatically this run.\n`);
  out.push('| # | Stage | Score | | Measured | Evidence |');
  out.push('|---|---|---|---|---|---|');
  r.stages.forEach((s, i) => {
    const how = s.automatic === true ? 'auto' : s.automatic === 'partial' ? '**partial**' : '**manual**';
    out.push(`| ${i + 1} | ${s.name} | ${s.score ?? '—'} | ${s.band} | ${how} | ${s.evidence} |`);
  });
  const eng = r.stages.find((s) => s.key === 'ingested')?.engines ?? [];
  if (eng.length) {
    out.push('\n**Which engines crawled us**\n');
    out.push('| Engine | Agents | Requests | Role |');
    out.push('|---|---|---|---|');
    for (const e of eng) out.push(`| ${e.engine} | ${e.agents.join(', ')} | ${e.requests.toLocaleString()} | ${e.roles.join(' + ')} |`);
  }
  if (r.focus) out.push(`\n**Work this next: ${r.focus.name}.** ${r.focus.why}`);
  if (r.blockers.length) out.push('\n**Blockers**\n' + r.blockers.map((b) => `- ${b}`).join('\n'));
  const manual = r.manualSteps.filter((m) => m.need);
  if (manual.length) {
    out.push('\n**What still needs a human** (everything else above ran unattended)\n');
    for (const m of manual) out.push(`- \`${m.stage}\` — ${m.need}`);
  }
  return out.join('\n');
}
