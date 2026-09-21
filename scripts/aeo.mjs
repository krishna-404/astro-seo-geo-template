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

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { aeoReport, aeoMarkdown, band } from './lib/aeo.mjs';

const SNAP_DIR = 'marketing/insights';
const args = process.argv.slice(2);
const AS_JSON = args.includes('--json');
const TREND = args.includes('--trend');
const FILE = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;
const PANEL = existsSync('marketing/ai-panel.md') ? readFileSync('marketing/ai-panel.md', 'utf8') : '';

const snapshots = existsSync(SNAP_DIR)
  ? readdirSync(SNAP_DIR).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()
  : [];

const files = FILE ? [FILE] : TREND ? snapshots.map((f) => join(SNAP_DIR, f)) : snapshots.slice(-1).map((f) => join(SNAP_DIR, f));
if (!files.length) {
  console.error(
    `aeo: no snapshot to score. Take one first:\n` +
    `  mkdir -p ${SNAP_DIR} && npm run insights -- --json > ${SNAP_DIR}/$(date +%F).json`,
  );
  process.exit(2);
}

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
      now: snap.generated ? new Date(snap.generated).getTime() : Date.now(),
    }),
  };
};

const runs = files.map(score);
const latest = runs.at(-1);

if (AS_JSON) {
  console.log(JSON.stringify(TREND ? runs : latest.report, null, 2));
  process.exit(0);
}

const out = [`# Answer-engine funnel — ${latest.report.site}, snapshot ${latest.date}`, ''];
out.push(aeoMarkdown(latest.report));

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
