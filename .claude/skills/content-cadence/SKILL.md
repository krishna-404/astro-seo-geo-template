---
name: content-cadence
description: The recurring content-engine run — daily-lite (measure, log, shortlist, report) and weekly-full (rules refresh + writing run), ending in an emailed report via the site's Apps Script. Meant to be fired by a scheduled Routine; also use when the user says "run the cadence" or "do the content run".
---

# The content cadence

One entry point for the whole engine. Two modes; pick by argument
("daily"/"weekly"), or when unset: **weekly** if 7+ days have passed since
the last `weekly run` entry in `marketing/news-log.md`, else **daily**.

Discipline for a scheduled run: no human is watching. Anything that needs a
decision only the owner can make goes in the report as a question, never
guessed at. All changes land as PRs; nothing merges or publishes itself.

## Daily-lite (every run)

1. **Measure.** `npm run insights -- --json` (add `--inspect` when GSC
   credentials exist). Save the JSON snapshot to
   `marketing/insights/<YYYY-MM-DD>.json` and diff against the previous
   snapshot: moved queries, new pages indexed, traffic and referrer shifts,
   FAQ questions opened, yesterday's 404s.
2. **Shortlist.** The report's "request indexing" list: the 10 URLs from the
   `--inspect` shortlist (never-crawled first). These need the owner's hands
   — the GSC API cannot request indexing.
3. **Scan.** A light news and social check of the site's clusters: log
   genuinely new candidates to `marketing/news-log.md` as `noted, held for weekly` — do
   not write pieces on a daily run. Exception: a candidate that is clearly
   time-critical for the site's readers goes in the report as a flagged
   question, for the owner to trigger /write-content early.
4. **Release.** If a future-dated post's date has arrived, the deploy of
   today's merged work publishes it — note it in the report.
5. **Housekeeping.** `npm run inventory`; commit snapshot + log + inventory
   (a PR, or direct to the working branch the owner designated for cadence
   bookkeeping).

## Weekly-full (daily-lite, plus)

6. **Rules refresh.** Run /refresh-anti-ai-rules (its own PR: rule diff +
   sweep of the latest posts for newly landed tells).
7. **Writing run.** Run /write-content (its own PR: drafts with spread
   dates, page updates, interlinks, news-log entry). The fuel rule holds —
   field notes are an add-on, never a gate: news, social and insights fuel
   keep the engine writing without them, and only a week where every
   channel is dry produces updates and an honest "wrote nothing new" line
   instead of filler.

## The report (every run, last step)

Compose markdown with these sections, then send it:

- **Data** — the numbers and their deltas since the last run.
- **Findings** — what the data means: queries to chase, pages
  underperforming their position, indexing anomalies, FAQ signals.
- **Actions taken** — PRs opened (links), pages swept, posts scheduled and
  their dates, rules changed.
- **Needs you** — the 10-URL request-indexing list, PRs awaiting merge,
  decisions flagged. When unused field notes hit zero, add a one-line nudge
  that an /interview would enrich the next runs — a nudge only: the engine
  keeps writing from news, social and insights fuel regardless.

Send via the site's own form route — POST
`https://<site>/api/contact` (form-encoded):
`action=report`, `token=$CADENCE_REPORT_TOKEN`, `subject=<mode> run
YYYY-MM-DD`, `body=<the markdown>`. The Apps Script emails it to the owner
and appends it to the sheet's Reports tab (SETUP § Services). Token unset or
the POST failing → say so loudly at the end of the session instead, so a
broken report channel is itself reported.
