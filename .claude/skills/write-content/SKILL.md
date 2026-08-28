---
name: write-content
description: The evidence-fueled writing run — pick targets from insights, field notes and a primary-source news sweep, then draft, check, interlink and schedule content as one reviewable PR. Used by /content-cadence's weekly run; also use when the user asks to write blog posts or update pages based on what would perform best.
---

# Write content, from evidence

**The fuel rule, absolute:** a new post exists only when its `proprietary`
frontmatter can point at (a) a `marketing/field-notes.md` entry, (b) a
`marketing/news-log.md` event with primary sources, or (c) a finding from
`npm run insights` plus verified source data. No fresh fuel → this run does
updates, interlinking and page fixes instead, and says so. Publishing nothing
is a valid outcome; publishing filler never is.

## 1. Gather (read before writing anything)

- `marketing/STRATEGY.md` (wins all conflicts), `VOICE-GUIDE.md`,
  `writer-brief.md`.
- `npm run inventory` then `marketing/content-inventory.md` — what exists;
  new pieces extend clusters, never duplicate.
- `npm run insights -- --json` (and `--inspect` when GSC is configured):
  the query language searchers actually use; impressions at position 4–20
  (title/content fixes), position 50+ (needs links, not rewrites); pages
  with impressions that never say the query's words.
- `marketing/field-notes.md` — entries with `status: unused`.
- **News sweep** (this is where "trending news in the last week" happens):
  search the week's news in the site's clusters, then chase each candidate
  to its primary source — the regulator circular, the court text, the
  filing, the dataset. Apply the news-log drop-discipline: no operative
  event, already covered, misdated by aggregators, press release, no hook
  for our reader → dropped, with the reason logged. Log the whole sweep
  (published + dropped + verification catches) to `marketing/news-log.md`
  in its documented format.

## 2. Decide

Rank candidate work by expected impact: fixing a page at position 4–20 for a
real query usually beats a new post; a news event with a genuine hook beats
both while it is fresh. Cap new posts at what the week's fuel honestly
supports (never more than the cadence in STRATEGY.md; the hard cap is
5/week, enforced).

## 3. Draft

- One primary query per piece; its words in the title, description and at
  least one heading. Follow the writer-brief spec for the format.
- `proprietary` names the fuel: which field note, which news event, which
  finding. `sources` carries every claim's origin. Respect `[private]`
  marks in field notes absolutely.
- The `author` block matches an entry in `src/data/authors.json` (enforced)
  so the byline links to the author page. Never attribute a piece to someone
  who did not supply its substance.
- Update the used field-note's `status` to `drafted:<slug>`.

## 4. Interlink — across the whole site, both directions

- 2–5 in-body outbound links per piece, anchored on the phrase a searcher
  types (enforced minimum: 2).
- At least one EXISTING page gains an in-body link to each new piece — a new
  post nobody links to is an orphan on arrival (`npm run check:links`
  enforces). Bump `updated` on pages edited for links only if prose actually
  changed around the link.
- Link glossary terms where they occur; add glossary `related` entries where
  the curation genuinely teaches the next concept.

## 5. Schedule — spread, never batch

When the run produces more than one piece, assign `published` dates spread
forward (2+ days apart, ≤5 in any ISO week — enforced). A future-dated post
publishes when a build runs on/after its date; the daily cadence run's build
is what releases it. Never backdate.

## 6. Check, then deliver

1. `npm run check:voice`, `npm run check:links`, then the VOICE-GUIDE § 6
   ship checklist by hand on every draft — the judgement half is not
   optional and not delegable to the scripts.
2. `npm run verify` (full battery) before pushing.
3. One PR: drafts, page updates, news-log and field-notes changes,
   regenerated inventory. PR body: what ran, what was dropped and why, which
   queries each piece targets. **A human merges. Nothing auto-publishes.**
4. After merge reaches production: OG cards if titles changed; IndexNow is
   automatic on deploy; the GSC request-indexing shortlist goes in the
   cadence report.
