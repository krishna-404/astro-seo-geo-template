#!/usr/bin/env node
/**
 * aeo.mjs — "how are we doing on AEO and GEO?", as one screen, from the
 * snapshots already in the repo.
 *
 *   npm run aeo                      # newest snapshot in marketing/insights/
 *   npm run aeo -- --json
 *   npm run aeo -- --file <path>     # score a specific snapshot
 *   npm run aeo -- --trend           # every snapshot, oldest first
 *
 * It needs no build: the one lever that reads dist/ (the homepage Organization
 * node) prints "n/a — run npm run build first" when dist/ is absent.
 *
 * `npm run insights` prints this same funnel at the top of its report from
 * LIVE data. This command exists because the question gets asked far more
 * often than the credentials are worth spending: it re-reads the last pull
 * instead of making one, so it is instant, works offline, and — with
 * --trend — is the only view that shows the funnel MOVING, which is the
 * thing a single pull can never show.
 *
 * The scoring lives in scripts/lib/aeo.mjs, beside its own reasoning; this
 * file is the CLI and nothing else. Read-only, like everything under
 * scripts/: no figure here may be published on a page (AGENTS rule 1).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { aeoReport, aeoLevers, aeoMarkdown, band } from './lib/aeo.mjs';
import { SNAPSHOT_DIR, snapshotDates } from './lib/snapshots.mjs';
import { SITE_URL } from '../src/data/origin.mjs';

const SNAP_DIR = SNAPSHOT_DIR;
const args = process.argv.slice(2);
const AS_JSON = args.includes('--json');
const TREND = args.includes('--trend');
const FILE = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;
const PANEL = existsSync('marketing/ai-panel.md') ? readFileSync('marketing/ai-panel.md', 'utf8') : '';

const snapshots = snapshotDates().map((d) => `${d}.json`);

// The levers read the repo and the built site, not the snapshot, so they are
// computed once and the same set is attached to every scored run. One of them —
// the homepage Organization node — needs dist/; without a build it scores `null`
// and says so, rather than exiting, because the funnel is the point of this
// command and the levers are beside it.
const LEVERS = aeoLevers();

const files = FILE ? [FILE] : TREND ? snapshots.map((f) => join(SNAP_DIR, f)) : snapshots.slice(-1).map((f) => join(SNAP_DIR, f));
// With no snapshot every FUNNEL stage is unmeasured — but the levers are read
// from the repo, so there is still something true to print. Scoring an empty
// snapshot says "nothing measured" per stage (never zero) and shows the levers
// with the one command that asks for a pull. Exiting here instead would make a
// fresh clone answer a fair question with an error.
const NO_SNAPSHOT = !files.length;
const TAKE_ONE = `Take a snapshot to fill the funnel in:\n  mkdir -p ${SNAP_DIR} && npm run insights -- --json > ${SNAP_DIR}/$(date +%F).json`;

/** A snapshot predating a block is "not measured", never zero — see insights-review. */
const score = (path) => {
  const snap = JSON.parse(readFileSync(path, 'utf8'));
  return {
    date: path.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? path,
    report: aeoReport({
      site: snap.site ?? '(site)',
      windowDays: snap.windowDays ?? 28,
      cloudflare: snap.cloudflare,
      bing: snap.bing,
      searchConsole: snap.searchConsole,
      generativeAi: snap.generativeAi,
      indexing: snap.indexing,
      sitemapCount: snap.sitemapUrls ?? null,
      panel: PANEL,
      levers: LEVERS,
      now: snap.generated ? new Date(snap.generated).getTime() : Date.now(),
    }),
  };
};

const runs = NO_SNAPSHOT
  ? [{ date: 'none', report: aeoReport({ site: new URL(SITE_URL).host, panel: PANEL, levers: LEVERS }) }]
  : files.map(score);
const latest = runs.at(-1);

if (AS_JSON) {
  console.log(JSON.stringify(TREND ? runs : latest.report, null, 2));
  process.exit(0);
}

const out = [`# Answer-engine funnel — ${latest.report.site}, snapshot ${latest.date}`, ''];
if (NO_SNAPSHOT) out.push(`_No snapshot in \`${SNAP_DIR}\` yet, so every funnel stage reads "not measured" — which is not the same as zero. The levers below are read from the repo and are true now._\n`);
out.push(aeoMarkdown(latest.report));
if (NO_SNAPSHOT) out.push(`\n**${TAKE_ONE.split('\n')[0]}**\n\n\`\`\`\n${TAKE_ONE.split('\n')[1].trim()}\n\`\`\``);

if (TREND && runs.length > 1) {
  out.push('\n## Trend — every snapshot, oldest first\n');
  const keys = latest.report.stages.map((s) => s.key);
  out.push(`| Snapshot | Overall | ${keys.join(' | ')} |`);
  out.push(`|---|---|${keys.map(() => '---').join('|')}|`);
  for (const r of runs) {
    const by = new Map(r.report.stages.map((s) => [s.key, s.score]));
    out.push(`| ${r.date} | ${r.report.overall ?? '—'} | ${keys.map((k) => by.get(k) ?? '—').join(' | ')} |`);
  }
  const first = runs[0].report.overall;
  const now = latest.report.overall;
  if (first != null && now != null) {
    const d = now - first;
    out.push(`\nOverall ${first} → ${now} (${d > 0 ? '+' : ''}${d}) across ${runs.length} snapshots, ${runs[0].date} → ${latest.date}. ${band(now)}.`);
  }
} else if (TREND) {
  out.push('\n_Only one snapshot exists, so there is no trend yet. The delta is the point of this view — take one per cadence run and it fills in._');
}

out.push('\n---\n_Informational, read-only. Scored by `scripts/lib/aeo.mjs` from the newest pull; run `npm run insights` for live numbers and the tables behind each row._');
console.log(out.join('\n'));
