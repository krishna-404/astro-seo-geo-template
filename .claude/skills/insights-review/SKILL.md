---
name: insights-review
description: Pull Umami + Search Console (web rows and the Generative AI export) + Bing + Cloudflare numbers (npm run insights), snapshot them into the repo, compare against previous snapshots to show progress over time, and produce a prioritised plan of what to do next. Use for "how are we doing", "run insights", "what should we work on next".
---

# Insights review: where we are, how we've moved, what's next

The site's improvement loop, made repeatable. Three parts: **snapshot**,
**delta**, **plan**. The strategy frame is the funnel ladder in
`marketing/STRATEGY.md § Content strategy` — read it first; this skill
executes its loop and flags when the picture no longer fits it.

## 1. Snapshot

```bash
mkdir -p marketing/insights
npm run insights -- --inspect --json > marketing/insights/$(date +%F).json
npm run insights -- --inspect > /tmp/insights-report.md   # human-readable twin for the reply
npm run aeo -- --trend                                    # the funnel, every snapshot
```

- Credentials are workspace env vars (SETUP § Insights read-back). If a
  section reports itself skipped, say which and continue with the rest.
- Snapshots are **committed** — `marketing/insights/*.json` is the site's
  measurement history and the whole basis of the delta step. One per day at
  most; re-running on the same day overwrites.

## 2. Delta — compare against the previous snapshots

Read the prior files in `marketing/insights/` (there may be none — say so and
skip to the plan). Compute and report, in this order:

- **High-intent queries — first, always**: the snapshot's
  `searchConsole.highIntent.rows` (★ = watch-list term; rules in
  `src/data/intent.json`, detection in `scripts/lib/intent.mjs`). For every
  row in this or any prior snapshot: impressions and position then → now, the
  page Google shows, and its status (`ok` / `wrong-page` / `unmapped`). Call
  out by name: a new transactional phrasing (add it to the watch list with
  its page), a watch term that started or stopped showing (`notShowing` is
  the list of those not yet earning impressions), any row still
  `wrong-page`, and any high-intent query that crossed 20 or 10. A snapshot
  taken before the `highIntent` block existed is not "absent" — derive the
  previous values from its `queries` rows with the same rules.
- **Answer-engine funnel — with the high-intent block, before the detail**:
  the snapshot's `aeo` block, or `npm run aeo -- --trend` for every snapshot at
  once. Report the five stage scores then → now, the `focus` stage (the highest
  one under its bar — that is the stage to work, not the lowest number), and
  every entry in `blockers`. A stage-1 blocker (the edge returning 401/403/429
  to an answering agent) outranks everything else in the plan. Say per stage
  how it was measured: `auto`, `partial` with the missing credential named, or
  `manual`. Snapshots taken before the `aeo` block existed carry no funnel;
  report them as "not measured", never as zero.
- **Generative AI — second, every time**: the snapshot's `generativeAi`
  block. With an export: total AI impressions this export vs the previous
  export (both dated), pages shown then → now (`movers`), the AI share per page
  against its web impressions, and the `uncited` list (web impressions, zero
  AI impressions). Without one: say the export is missing and how old the
  newest is — that line goes to the plan as the first ask. Then the two
  proxies: `promptShaped` queries (new ones by name) and `referrals` from AI
  assistants (which assistant, how many). Older snapshots carry no
  `generativeAi` block; report them as "not measured", never as zero.
- **Indexing**: indexed count vs last time; which URLs moved in or out.
  New pages stuck at "Discovered – currently not indexed" for >3 weeks need
  links, not patience.
- **Rankings on the watched queries**: for every query that had impressions
  in either snapshot, position then → now. Read `searchConsole.queries` in
  full (every row, sorted by impressions — never a top-N slice, which on a
  zero-click site is an arbitrary fragment) and `searchConsole.pageQueries`
  for the words each page is shown for. Call out crossings of the page-two
  (≤20) and page-one (≤10) boundaries by name.
- **Clicks and CTR**: totals and per-page. The first page to earn real clicks
  is news; say it plainly.
- **Umami**: visitors, top pages, the CTA events (the site's conversion event
  above all), and the **country split** against the target markets in
  `STRATEGY.md § The reader` — a site whose content leans one geography
  attracts that geography, and the loop reads as validation until someone
  reports the split. Referrer shifts worth a line.
- **Edge**: total requests, 404 share, and anything anomalous (a 5xx spike,
  a country shift).

Present the delta as a short table per section — previous, current, change —
with one sentence of interpretation each. No number without its comparison.

## 3. Plan — apply the funnel ladder

Work out where the site currently sits on the ladder, then propose the
**three highest-leverage actions**, each tied to a number from the delta:

0a. Generative AI: an `uncited` page with real web impressions is a top-three
   action (tldr, FAQ in the searcher's words, named sources); a cited page that
   lost impressions since the previous export gets its links and `updated`
   checked, never a rewrite; a missing or stale export is the first ask.
0. High-intent rows first, whatever their volume: a `wrong-page` or
   `unmapped` row is the top action; an `ok` row off page one gets the
   phrase-and-link check (content-cadence step 2a–b) and a supporting-piece
   candidate from `marketing/keyword-map.md § High-intent`.
1. Not-indexed pages that matter → internal links to add + the
   request-indexing list for the user.
2. Queries at position 4–20 with impressions (`nearPageOne`) → the specific
   page and the specific query-language change (say what the searcher
   types — the `pageQueries` block shows the exact words).
3. Rising impressions at position 50+ → links and freshness, never rewrites.
4. ≥50 impressions at ≤10 with ~0 clicks → snippet (title/description) work —
   only then, one page at a time, recorded as a dated test in the keyword
   map with a check-back date four weeks out.

If the data contradicts STRATEGY.md's current picture (§ Honest state, the
target markets, the clusters), say so in the review and propose the edit —
the strategy file is dated for exactly this, and it is updated deliberately,
never silently.

## Finish

Commit the snapshot with a message like `Insights snapshot YYYY-MM-DD` —
inside the cadence it rides the run's PR. Deliver the review as: current
state (3–4 lines), the delta tables, the three actions. Numbers from this
report NEVER go on site pages — published figures come from `facts.json`
with a source (AGENTS rule 1).
