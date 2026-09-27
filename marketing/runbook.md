# Runbook — the daily, weekly, monthly and quarterly runs

The operating checklists. `.claude/skills/content-cadence/SKILL.md` is the
executable (a Routine fires it, one run a day); this file is the list it
works, with who does each item (machine or human), the script that does it,
and what the report has to say. PLAYBOOK §9 keeps only the traps behind
these rows and points here. `marketing/ACTIONS.md` is the human half as a ledger the
script verifies every run (`npm run actions`).

Standing rules for every run: high-intent first; measure before writing;
one page at a time on anything attributable; a question, never an
estimate; the report says what changed and which number it targets; every
prompt that writes content ends with "Remove all mannered prose."

## What the engine delivers in a month

The scope a client of a content agency would be sold, kept here so a month
that delivered less is visible (ingested from a published monthly scope,
`playbook-intake.md`):

- The keyword map of the market, every page matched to the searches it
  should win (`marketing/keyword-map.md`, weekly maintenance, monthly audit)
- Articles answering questions buyers already search for, as many as the
  fuel supports, each with its social posts written
- "Alternatives" and "vs" pages for the buyers comparing you (triggered by
  the BOFU and competitor blocks)
- Free tools people search for and share (on converging signals and a yes)
- Fixes to pages that exist: titles, internal links, snippets, freshness,
  broken redirects, plus daily checks that they keep working
- Pages stuck on page two pushed to page one (the 11–20 loop)
- Every page checked for indexing (`--inspect`; the request-indexing list)
- Prices, features and claims kept accurate, including right after
  something ships (the About key facts, pricing, comparison cells)
- AEO/GEO tracking and fixes: the funnel, the Generative AI export, the
  prompt panel, the citation checklist on every page
- A watch on competitors: what they publish, which searches they gain
- Directory submissions surfaced and tracked; outreach pitches proposed
- A weekly report on what changed and what moved
- Everything it writes deployed the same day, on a green battery
  (STRATEGY.md § 9)

## Daily run (weekdays)

| # | Item | Owner | Script / step | Report section |
|---|---|---|---|---|
| D1 | Snapshot the numbers; diff against history | machine | `npm run insights -- --inspect --json` → `marketing/insights/<date>.json` (content-cadence step 1) | Appendix |
| D2 | Verify the human actions; tick the auto ones | machine | `npm run actions -- --update` (step 0) | Actions |
| D3 | PR inbox: review API posts, merge what the site's merge model allows | machine | step 1b | Pull requests |
| D4 | High-intent rows: right page, right words, one link on the exact anchor | machine | step 2a–d | High-intent queries |
| D5 | Quick wins: a page at position ≤5 for words it does not say → add the phrase to a heading, the description or a FAQ line | machine | `searchConsole.quickWins` (step 2f) | Quick wins |
| D6 | BOFU rows at 4–20: check the page being pushed daily; start a new one only after four weeks | machine, one page at a time | `searchConsole.bofu` + `npm run audit:pages -- --page` (step 2g) | Bottom of funnel |
| D7 | Generative AI: cited pages strengthened, uncited pages given the three levers, prompt-shaped rows into FAQs | machine | step 2e | Generative AI |
| D8 | Funnel ladder: one to three small evidence-backed changes (CTA, snippet test, links and freshness) | machine | step 3 | What changed |
| D9 | Request-indexing shortlist (up to 10 URLs) | human | step 4; ACTIONS A-D01 | Do this today |
| D10 | Open questions and next listings | machine surfaces, human answers | `npm run ask` (step 5); ACTIONS A-W03/A-W04 | What I need from you · Where to list next |
| D11 | News and ICP-social scan, candidates logged, nothing written | machine | step 6 | Decisions (time-critical only) |
| D12 | Competitor watch: rows naming a rival; new pages a rival published (from the landscape's sitemap or feed) | machine | `searchConsole.competitorQueries` (step 2h) | Competitors |
| D13 | Regenerate lastmod, inventory and OG cards; build (a future-dated post whose day has come enters this build); `npm run verify`; commit to `main`; deploy; IndexNow + Bing; live smoke | machine | steps 7–9; STRATEGY § 9 | first line |
| D14 | Social queue: post the unposted drafts | human | ACTIONS A-D03 | Do this today |
| D15 | Read the deploy line; act only on a pull request the run declined | human | ACTIONS A-D02 | first line · Do this today |
| D16 | Deliver the report | machine | § The report; Apps Script channel, else the Gmail connector if attached, else committed | — |

## Weekly run (Monday, adds to the daily)

| # | Item | Owner | Script / step | Report section |
|---|---|---|---|---|
| W1 | Anti-AI rules refresh, sweep of the latest posts | machine | `/refresh-anti-ai-rules` (step 10) | Decisions |
| W2 | Writing run: high-intent supporting piece first, then what the fuel supports; each piece ships with social drafts, an inbound link from an indexed page, glossary upkeep | machine | `/write-content` (step 11) | What changed |
| W3 | Tools sweep: tool-shaped queries → input-driven calculator proposals | machine | step 12 | Decisions |
| W4 | Coverage check down the keyword map's layers; programmatic pattern candidates (page-guidelines § 4) with the data each needs | machine | step 13 | Decisions |
| W5 | Page audit: every content page scored; pages under 70 with impressions become the refresh list; one refreshed per week minimum | machine | `npm run audit:pages` (step 13b) | Page audit |
| W6 | Freshness sweep: pages older than 90 days with impressions (30 for pricing, rankings, availability), facts re-checked, `updated` bumped only where something changed | machine | step 13c | Page audit |
| W7 | Internal link plan: pillars, money pages, support posts, the 11–20 boost, footer, anchors (page-guidelines § 5) | machine | step 13d | What changed |
| W8 | Data sheet and link targets maintained; landscape line for a rival that changed | machine | step 15 | What I need from you |
| W9 | High-intent refresh; competitor list reviewed against the snapshots and the panel | machine | step 16; `intent.json → competitors` | High-intent queries |
| W10 | Generative AI weekly: export freshness, panel age, the AEO levers, Bing block, funnel trend | machine asks, human exports | step 17; ACTIONS A-W01 | Generative AI |
| W11 | Directory and outreach: the next three listings; up to five outreach targets (sites that write about the space, from the landscape's lists) proposed with the page each would link | machine proposes, human sends | step 15; `link-targets.md` | Where to list next · Decisions |
| W12 | Generative AI export, GSC manual-actions check, report read and Decisions answered | human | ACTIONS A-W01, A-W05, A-W06 | — |

## Monthly (first weekly run of the month)

| # | Item | Owner | Reference |
|---|---|---|---|
| M1 | Site audit: keyword map refreshed from the newest insights; site-blueprint § 7 completeness | machine | content-cadence step 14 |
| M2 | AI prompt panel run | human | `marketing/ai-panel.md`; ACTIONS A-M01 |
| M3 | Link-rot result read; dead citations fixed, archived or dropped | human reads, machine fixes | ACTIONS A-M02 |
| M4 | Competitors named in `intent.json`; a rival that appeared in a SERP or a panel answer added | human confirms | ACTIONS A-M03 |
| M5 | Field-notes interview: the five objections heard on calls this month are the next five posts | human | `/interview`; ACTIONS A-M04; content-guidelines § 3 |
| M6 | Content decay: pages that stopped earning views (Umami then → now) refreshed or consolidated, never left to thin out | machine | insights-review § Umami |
| M7 | Social audit: last twenty posts labelled top / middle / bottom; if eighteen are top, the two lower layers were never built | machine reads `social-queue.md`, human decides | content-guidelines § 6 |

## Quarterly

| # | Item | Owner | Reference |
|---|---|---|---|
| Q1 | Full crawl of the live site | human | ACTIONS A-Q01 |
| Q2 | Structured data re-validated, one page per type | human | ACTIONS A-Q02 |
| Q3 | About page key facts reconfirmed; landscape refreshed (`/landscape`) | human + machine | ACTIONS A-Q03 |
| Q4 | Channel gaps re-argued with any new playbook (`/ingest-playbook`) | machine | `marketing/channel-gaps.md`, `playbook-intake.md` |
| Q5 | robots.txt and `scripts/lib/crawlers.mjs` against new answer-engine bots (know what each governs before blocking) | machine | PLAYBOOK §7 |

## Annual

security.txt renewed; domain and registrar; HSTS review; the PLAYBOOK §8
battery re-run top to bottom (ACTIONS A-Y01–A-Y03).

## The loops, spelled out

**The quick-win loop (daily, two minutes).** Open the pages with the most
impressions. For each, the queries it appears for. A query near position 1
the page does not literally say gets the phrase added: a heading, a FAQ
line, the description. `npm run insights` prints the rows as `quickWins`
from `pageQueries` against the page's source (`scripts/lib/pageText.mjs`).
Repeat until the block is empty.

**The BOFU loop (daily, one page).** The 28-day export sorted by position;
the bottom-of-funnel shapes (alternatives, vs, review, best X for Y,
software for role, export from, pricing, with MCP) at positions 4–20
(`searchConsole.bofu`). Leads come from positions 1–5. Pick the row whose
page is easiest to move: read the pages above it in the SERP for answer,
depth, proof and freshness; run `npm run audit:pages -- --page` on ours;
implement the checklist items it names in priority order; record the
change and the date in the keyword map; check the row daily.

**The page-two push (weekly).** Pages at 11–20 for a relevant query get a
contextual in-body link from an indexed page that already discusses the
task, on the query's phrasing; record the starting position and date;
compare four weeks later with the same filters.

**The competitor watch (daily rows, weekly pages).** Queries naming a rival
are the comparison pages to own. Weekly, the rival's new pages (its sitemap
or feed, recorded in `landscape.md`) and the searches it gained (the panel,
the SERP shape) become backlog rows.

**The freshness sweep (weekly).** `npm run audit:pages` lists age and
score. Older than 90 days with impressions: re-check every fact, price and
example; bump `updated` only if something changed; state what changed.

**The accuracy check after a ship (event-driven).** When the product
ships something, the About key facts, the pricing table, every comparison
cell that mentions the feature and the glossary entries that define it are
updated in the same PR, before the announcement.

## Log

| Date | Change |
|---|---|
| 2026-09-27 | Created from the ingested playbooks (`marketing/playbook-intake.md`). |
