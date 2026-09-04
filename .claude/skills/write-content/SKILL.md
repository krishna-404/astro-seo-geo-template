---
name: write-content
description: The evidence-fueled writing run — pick targets from insights, field notes, a primary-source news sweep and a social sweep, then draft, check, interlink and schedule content as one reviewable PR. Used by /content-cadence's weekly run; also use when the user asks to write blog posts or update pages based on what would perform best.
---

# Write content, from evidence

**The fuel rule:** every new post carries something real and checkable, and
its `proprietary` frontmatter names it. Fuel comes from any of these
channels, and the engine runs on whichever have something this week:

- (a) a `marketing/field-notes.md` entry — the richest fuel when present,
  and strictly an ADD-ON: the engine never waits for interviews and never
  stalls because field notes are empty or stale;
- (b) a `marketing/news-log.md` event with primary sources;
- (c) an ICP social-sweep finding (below) — a pain-point or keyword the ICP
  posted this week, verified before use;
- (d) an `npm run insights` finding plus verified source data.

Only when every channel is genuinely dry does the run do updates,
interlinking and page fixes instead of a new post — and it says so.
Publishing nothing is a valid outcome; publishing filler never is.

## 1. Gather (read before writing anything)

- `marketing/STRATEGY.md` (wins all conflicts), `VOICE-GUIDE.md`,
  `writer-brief.md`, and `marketing/site-blueprint.md` (the page-type taxonomy,
  intent→page-type rule, interlinking and AEO/GEO levers this run applies).
- `marketing/keyword-map.md` — the ranked backlog and the query each planned page
  targets. Pick this run's targets from here (or from a fresh insights finding);
  if the map is empty or stale, run /keyword-map first.
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
- **ICP social sweep** (weekly): go where this site's ICP actually posts
  (the platforms and communities STRATEGY.md names — typically some of X,
  LinkedIn, Reddit, Hacker News, industry forums) and read what the ICP is
  saying THIS week, not just what is said about the category. Harvest three
  things and log them:
  1. **Pain-points** — the frustration in the ICP's own words. These map to
     the site's clusters and become blog angles and, when repeated,
     glossary/FAQ entries.
  2. **Keywords** — the exact phrasing the ICP uses for a problem, added to
     the candidate list the next `npm run insights` pass validates against
     real search demand. Take the audience's words; never invent phrasing a
     keyword tool would.
  3. **Objections and misconceptions** — worth a correcting piece.
  A thread is a DEMAND SIGNAL and an angle — never a source: every claim in
  the resulting piece still traces to a primary source, and no post quotes,
  screenshots or identifies a private individual without their consent. Log
  kept and dropped candidates (with the pain-point/keyword harvested) in the
  news-log entry alongside the news sweep — it dedups social too, so the
  same recurring gripe is not re-litigated every week.

## 2. Decide — page type, then the funnel ladder

First match each target to its page type by intent (site-blueprint § 1–2): a
"what is X" query is a glossary/guide entry, an "X vs Y" query a comparison page,
an "X software/pricing" query a money page. One page = one primary query = one
intent; never build two pages competing for the same query.

Then order the cycle's work by the funnel ladder (STRATEGY.md § Content strategy)
bottom-up; impressions alone are worth nothing:

1. **Convert what already lands**: any ranking page whose measured next
   step is weak or missing (CTA events ÷ entrances, the path to this
   site's conversion) gets fixed before anything else.
2. **CTR where the site already ranks**: position ≤20 (above all ≤10) with
   impressions and few clicks — titles/descriptions in the searcher's own
   words. Highest-probability clicks on the board.
3. **Impressions last**: new content targets the highest-search keywords
   within a winnable cluster, only after rungs 1–2 hold. A fresh news event
   with a genuine hook may jump the queue while fresh; it still ships with
   its conversion path and snippet done, not as bare reach.

Cap new posts at what the week's fuel honestly supports (never more than
the cadence in STRATEGY.md; the hard cap is 5/week, enforced).

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
  enforces). Make it count: the inbound link comes from an **already-indexed**,
  topically-related page (check `npm run insights -- --inspect` for what is
  indexed — a new page linked only from other new pages stays stranded), and its
  anchor carries the new page's **target keyword** (site-blueprint § 3). Bump
  `updated` on pages edited for links only if prose actually changed around the
  link.
- Anchor discipline: vary the anchor across links to the same page, never use the
  identical anchor for two different destinations, and wire pillar↔spoke links
  both ways within the cluster.
- Link glossary terms where they occur; add glossary `related` entries where
  the curation genuinely teaches the next concept.

## 4b. Glossary upkeep — every update, where applicable

The glossary is a living reference, not a launch artifact; every run checks
it both ways:

- **New or leaned-on term** → a post that introduces a term the glossary
  lacks, or leans on one repeatedly, adds the entry in the same PR (the
  schema's evidence rules apply in full: real `sources`, a quotable
  `shortDefinition`), and links the term where it occurs.
- **Changed facts** → when a news event or page update changes something a
  glossary entry states (a rate, a rule, a definition's edge), the entry is
  corrected in the same PR with its `updated` bumped and the new source
  added. A glossary that contradicts the post citing it is worse than no
  glossary.
- **Demand signals** → question-shaped queries from insights ("what is X",
  "X meaning", "X full form") seed glossary `faq` entries, phrased the way
  the searcher typed them.

## 4c. Tools and calculators — when the signals are strong

An interactive tool is the highest-leverage page a site can ship — a link
magnet, an AI-citation magnet, and a lead qualifier — and it is built
rarely, on evidence, never on a whim. Build one when signals converge:
tool-intent queries with impressions ("calculator", "how much", "estimate",
"checker"), repeated social/forum requests for the same computation, or a
field note where a reader did the arithmetic by hand.

Rules for building one (the ancestor site's calculator is the precedent):

- **Deterministic code computes; a model never does.** Every constant,
  rate and formula lives in a data file (e.g. `src/data/assumptions.json`)
  with a `source` per figure — a prospect who re-runs the arithmetic must
  land exactly where the page does. A figure without a source stays out;
  ship the tool with fewer inputs instead.
- **Prefill via query params** (`?x=3&y=1200`) so outreach and posts can
  deep-link a reader into a page that already knows their situation.
- **Follow the /search JS pattern** (AGENTS rule 17): interaction-gated
  inline script, additive (JS-off shows the formula and a worked example —
  which is also what answer engines cite), styles from existing tokens.
  Shipping a second JS page is a deliberate architecture change: extend the
  invariant deliberately and document it in CHECKLIST per the
  self-extending rule — never sneak it past the battery.
- Propose the tool in the cadence report first with the signals that
  justify it; build on the owner's go-ahead. It ships like everything else:
  a PR, interlinked from the pages whose queries it serves, output framed
  per STRATEGY.md.

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
