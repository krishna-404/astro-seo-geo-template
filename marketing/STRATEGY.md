# Strategy

<!-- TODO: filled by the /onboard-marketing skill, then owned by a human.
     This file is the source of truth the content engine reads before writing
     anything: where any other document disagrees with it, this file wins.
     Keep it honest — the /interview skill appends what actually happened to
     marketing/field-notes.md, and this file's "Honest state" section is
     updated from that record, never from optimism. -->

## 1. What this is

<!-- TODO: the business in three sentences. What is sold, to whom, and what
     the buyer stops suffering when they buy it. -->

## 2. The thesis

<!-- TODO: the one argument the whole site advances. Every cluster, guide and
     news piece should be an instance of this argument or it does not run. -->

## 3. The reader and who actually pays

<!-- TODO: who reads, who decides, who pays — and where those are different
     people, which one the site is for. -->

## 4. The wedge

<!-- TODO: the first thing a new customer buys or does, and what it opens. -->

## 5. Content strategy

The shape of a complete SEO/AEO/GEO site — the page-type taxonomy, the
intent→page-type rule, the interlinking doctrine and the answer-engine levers —
is documented once, transferably, in `marketing/site-blueprint.md`. This section
is where THIS site commits to its instance of it.

**The page-type plan** (site-blueprint § 1): <!-- TODO: which layers this site
builds and in what order — money pages, comparison/"vs", use-case/ICP, industry,
location, tools, plus the always-on blog + glossary. -->

**The keyword map**: every target query maps to a page (live or planned) in
`marketing/keyword-map.md`, maintained by /keyword-map. No page is built without a
query it is meant to win; no priority query is left without a page.

**The funnel ladder — the standing order of work.** Impressions alone are
worth nothing; every cycle's work is ordered bottom-up:

1. **Convert what already lands.** Every page that receives visitors has a
   working, measured next step (CTA events per entrance, the path to
   whatever this site's conversion is). Fix this before anything else.
2. **Then CTR where the site already ranks.** Position ≤20 — above all
   ≤10 — with impressions and few clicks is the highest-probability work on
   the board: titles and descriptions in the searcher's own words. (Getting
   indexed and to page one is this rung's precondition.)
3. **Impressions last.** New content targets the highest-search keywords
   within a winnable cluster — consistent work, but only after rungs 1–2
   hold on what exists; new pages then enter rung 2's CTR loop as they
   rank.

- The cadence: <!-- TODO: e.g. 1–3 pieces/week, weekly news run, monthly
  refresh — set the interval the /content-cadence Routine runs on. -->
- The clusters: <!-- TODO: 3–8 named topic clusters. New pieces extend
  clusters (check marketing/content-inventory.md first); they do not
  duplicate them. -->
- The queries: picked from evidence (`npm run insights`), never invented.
  Impressions at position 4–20 are the shortlist; position 50+ means the
  page needs links and authority, not a better title.
- The fuel rule: a new post exists only when it can cite a field note
  (marketing/field-notes.md), a news-log event (marketing/news-log.md, with
  primary sources), or an insights finding as its `proprietary` claim. No
  fresh fuel, no new post — that cycle does updates and interlinking instead.

## 6. Canonical numbers and claims

<!-- TODO: the figures the site is allowed to state, each with its source.
     These belong in src/data/facts.json (which is where pages read them);
     list here only the story they tell. If a number is not here or in
     facts.json, no page may say it. -->

## 7. Guardrails — what this site will not do

- No invented customers, testimonials, or measurements (VOICE-GUIDE § 5).
- <!-- TODO: the business-specific lines that must never be crossed
     (regulated advice, geography claims, pricing promises…). -->

## 8. Honest state

<!-- TODO: as of <date>: what exists, what is claimed, what is not yet true.
     Update this section whenever reality changes; the content engine reads
     it before writing so the site never runs ahead of the truth. -->
