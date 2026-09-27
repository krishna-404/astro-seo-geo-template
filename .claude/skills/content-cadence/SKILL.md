---
name: content-cadence
description: The recurring content-engine run — daily-lite (measure — web rows AND the Search Console Generative AI export — work the high-intent queries first, log, shortlist, ask, report) and weekly-full (rules refresh + writing run + tools sweep + map/data-sheet maintenance), ending in an emailed report via the site's Apps Script. Meant to be fired by a scheduled Routine; also use when the user says "run the cadence" or "do the content run".
---

# The content cadence

One entry point for the whole engine. Two modes; pick by argument
("daily"/"weekly"), or when unset: **weekly** if 7+ days have passed since
the last `weekly run` entry in `marketing/news-log.md`, else **daily**.

**What a run is for.** Not to produce a report. To leave the site better than
it found it, in a way the owner can see in the email: more of the words
searchers type on the pages Google already shows, more links from the pages
that earn impressions to the pages that earn money, a working next step on
every page that receives visitors. The report says what changed and which
number it targets. A run that only measured has to say so and why.

**Discipline for a scheduled run.** No human is watching. Anything that
needs a decision only the owner can make goes in the report as a question,
never guessed at. All changes land as PRs; nothing merges or publishes
itself. `npm run verify` green on the exact tree is the bar for opening the
PR at all. (A site that later decides its cadence should commit to `main`
and deploy itself makes that decision in STRATEGY.md and rewrites step 9
here — the battery is then the only gate, so the scope rule below becomes
load-bearing.)

**High-intent first.** Search Console's transactional rows — "<category>
software", "<category> tracking system", "<x> vs <y>" — are a handful of
impressions under hundreds of informational ones, and a run that reads the
report top-down never reaches them. They are the queries a buyer with budget
types. So every run works them **before** anything else (step 2), and the
email carries its own **High-intent queries** section with what was done. The
detection is mechanical: `npm run insights` prints the block first, from
`src/data/intent.json` (signal words + the curated watch list, each term tied
to the page that claims it) and `scripts/lib/intent.mjs`.

**Generative AI is measured, not assumed.** Search Console's **Generative AI**
report is the only first-party measure of how often Google's AI Overviews and
AI Mode showed a page of this site. It has no API and no BigQuery export, so
the loop runs through the one door there is: the owner exports it (Performance
→ Generative AI → Export), drops the zip in `marketing/insights/genai/`, and
`npm run insights` reads the newest one and joins it with the web rows
(`scripts/lib/genai.mjs`). Every run works that block (step 2e), the weekly run
asks for a fresh export when the newest is older than seven days and for the
monthly **AI prompt panel** (`marketing/ai-panel.md`) when the last run is
older than 35 days, and the report carries a **Generative AI** section. Two
proxies ride along because the report withholds queries and clicks:
prompt-shaped web queries, and referrals from AI assistants in Umami. The rule
that binds all of it: a page that is already cited is strengthened and linked,
never rewritten; a page shown on the web and never in AI gets the three levers
with evidence behind them — an answer-shaped opening, a FAQ block in the
searcher's words, named sources.

**AEO and GEO have a number, and most of it needs nobody.** `npm run insights`
opens with the **answer-engine funnel** (`scripts/lib/aeo.mjs`): reachable →
ingested → indexed → shown → followed, each stage scored 0–100 and each capped
by the one above it. Read it top-down and work the stage it names, never the
lowest number on it — a site whose edge is refusing PerplexityBot does not need
another post. Four of the five stages run unattended from the Cloudflare,
Umami, Bing and Search Console credentials; stage 4 (**shown**) is the one that
still needs a person, because Google withholds AI-feature data from every API
and no assistant sells a "were we named" endpoint, so it scores from a capped
proxy until an export lands. Each stage prints whether it was measured
`auto`, `partial` (and which credential is missing) or `manual`, so a blind
spot never reads as a pass. `npm run aeo -- --trend` scores every committed
snapshot and is the only view that shows the funnel MOVING.

**One SCHEDULED firing a day; a second one stands down.** When this skill was
fired by a Routine rather than typed by a human, read `marketing/news-log.md`
first for a run entry dated today. If one exists this is a duplicate firing:
do not repeat the sweep, do not write a second post the first run already
wrote, work only what is genuinely new since that entry, and say in the report
that a run had already gone out. A duplicate Routine is fixed in the Routines
UI, not in the repo (it usually means one was recreated while the old one
still existed).

**A manual run is never skipped.** If a human typed `/content-cadence`, run it
in full no matter how many runs have already gone out today — they asked for a
run; give them one. The only things that still bind are the mechanical
quality gates in `check-source-rules.mjs` — schema, sources, voice, in-body
links — which fail closed regardless of who fired the run.

**Finish the whole task.** A scheduled run has nobody to say "continue".
Never end a run describing what it would do next or asking permission for a
step this skill already covers; do the step. The run ends when the PR is
open (or its absence explained) and the report is sent.

**The standing prompt line.** Every prompt this run writes to draft, rewrite,
retitle, summarise or answer content ends with the line in
`src/data/voice.json → prompt.standing`: Remove all mannered prose.
`marketing/content-guidelines.md § 0` defines it. The checklists the run
works are `marketing/runbook.md` (which step, which script, which report
section) and `marketing/page-guidelines.md` (what a page must contain).

**No post caps.** There is no per-date or per-week limit on posts; a run
writes what its fuel supports, high-intent pieces first, and dates each piece
with the real day it goes live. A site that schedules weekend runs has them lean towards glossary and
coverage-layer pages because that is usually where the backlog is.

## Daily-lite (every run)

0. **Actions first.** `npm run actions -- --update`. It re-verifies every
   human action in `marketing/ACTIONS.md` that can be verified (keys present
   in this environment, exports fresh, panel recent, placeholders gone) and
   rewrites the marks; manual items are read from their **Done:** dates.
   The result rides the PR (the file changed) and the report's **Actions**
   section. A key that is missing is named there with what stays dark
   without it; the run never works around a missing key by estimating.
   A human action the run discovers for the first time is added to the
   file in the same PR, in its format.
1. **Measure.** Run /insights-review — it pulls the surfaces, snapshots to
   `marketing/insights/<date>.json`, diffs against history and produces the
   prioritised plan. Reuse its output; do not duplicate the pull. Read the
   whole query set and the page-by-query block (`pageQueries`), not the top
   rows: on a zero-click site the top rows are noise.
1b. **PR inbox.** List the repository's open pull requests before anything
   else is written, and work each one:
   - **Posts from the API** (`api/post/*` branches, label `api-post`,
     frontmatter `via: posts-api` — the posts API in `worker/posts.ts`, if
     the site has enabled it). Read the post as a reviewer would: does the
     `tldr` answer, do the sources hold, is the `proprietary` claim real,
     does the voice pass VOICE-GUIDE's judgement checklist. Then do the
     judgement half the API cannot: an in-body link to it from an *indexed*
     page on its target anchor, glossary entries for terms it leans on, its
     row in `marketing/keyword-map.md`, a title and description in the
     searcher's words when Search Console already shows the phrasing. Push
     those to the branch and run `npm run verify`. Whether the run then
     **merges** is the site's decision in STRATEGY.md: a site whose cadence
     commits to `main` merges green posts that clear the bar and deploys
     them with its ship step; a PR-review site leaves them ready-for-review
     with the updates pushed and says so in the report.
   - **Every other open PR** (a previous run's, a human's, a fix branch):
     the same rule — merge when the site allows it, the PR is the site's own
     work, verify is green and the change is confident, small and in scope;
     otherwise leave it and put it in Decisions with what would unblock it.
     Never merge over a red verify; never rewrite someone else's branch.
2. **High-intent first.** Take the `searchConsole.highIntent` block from the
   snapshot (★ rows are watch-list terms; `notShowing` lists watch terms with
   no impressions yet) and work it in this order, before step 3:
   - **(a) The right page, saying the words.** Every high-intent row must be
     `ok`: the page Google shows is the page whose frontmatter claims the
     query, and that page carries the query's exact words in its title or
     description, a heading and a FAQ question. A `wrong-page` row gets the
     phrase on the claiming page plus an in-body link to it from the page
     Google is showing instead, anchored on the query. An `unmapped` row is
     either added to a money page's `secondaryKeywords` (same intent) or
     mapped as a new page in `marketing/keyword-map.md § High-intent`. A new
     phrasing with impressions goes on the watch list in `intent.json` the
     day it appears, with its page.
   - **(b) Links on the exact anchor.** Each high-intent money page gets one
     new in-body link this run from an *indexed*, topically related page,
     anchored on a high-intent phrasing it does not already receive (vary
     the anchor per source; `check:links` fails the same anchor aimed at two
     targets). The pages that earn the cluster's informational impressions
     are the first sources.
   - **(c) The supporting piece.** When the run writes (weekly, or a daily
     schedule that publishes), the highest-priority high-intent cluster —
     most impressions, money page still off page one — gets a supporting
     piece first: a category guide, a spreadsheet-vs-software page, a "how to
     choose" page, a comparison page (every cell verified), or a FAQ block on
     the money page in the searcher's words. Pick from `marketing/keyword-map.md
     § High-intent` backlog order; it ships as a post when the fuel is a
     post's worth, otherwise as the smaller type.
   - **(d) Record it.** The report's High-intent section names each query,
     its position (previous → current), the page, and what this run did.
     "Nothing today, because X" is a valid line; silence is not.
   - **(e) Generative AI, from the snapshot's `generativeAi` block.** Read it
     every run; it costs nothing when there is no export (the block then
     carries only the two proxies and a one-line ask). In this order:
     1. **Cited pages stay cited.** Every page in `topPages` (shown inside AI
        Overviews or AI Mode) gets a link check — it should link to the money
        page for its cluster on a high-intent anchor — and its `tldr`,
        sources and `updated` date stay current. Never retitle or restructure
        a page an AI feature is already showing; a citation is the hardest
        thing on the site to earn back.
     2. **Uncited pages get the three levers.** For each page in `uncited`
        (web impressions in the window, zero AI impressions in the export),
        check it opens with the answer (the `tldr` says the thing in one
        sentence), carries a FAQ block in the searcher's own words, and names
        its sources by name. Fix one or two per run; record which.
     3. **Prompt-shaped queries become FAQ lines.** Each row in
        `promptShaped` is the phrasing a buyer typed as a question; the page
        Google shows for it should answer it verbatim in a FAQ entry.
     4. **Country split.** AI impressions by country, read against the Umami
        split and STRATEGY.md's target markets.
     5. **Stale export.** When `stale` is true (older than seven days) or
        there is no export, **What I need from you** opens with the export
        ask and the four-step how-to from `marketing/insights/genai/README.md`.
        A run never estimates AI impressions; it says the export is missing.
   - **(f) Quick wins, from `searchConsole.quickWins`.** Each row is a page
     already shown at position ≤5 for a phrase its source does not say
     (`scripts/lib/pageText.mjs` read the source; `status: words` means every
     word is there but not the phrase, `missing` names the absent words). Add
     the phrase where it is true: a heading, the description, a FAQ line in
     the searcher's words. Work every row; this is the cheapest ranking move
     on the board and it is mechanical. Record each in the report.
   - **(g) Bottom of funnel, one page at a time, from `searchConsole.bofu`.**
     The rows are the buyer's shapes (alternatives, vs, review, best X for Y,
     software for role, export from, pricing, with MCP) at position 4–20.
     Pick the one whose page is easiest to move: read the two or three pages
     above it in the SERP for answer, depth, proof and freshness, run
     `npm run audit:pages -- --page <route>` on ours, and implement what it
     names in priority order (FAQ in the query's words, a comparison table,
     question-shaped headings, a number with a source, the fan-out buckets).
     Record the page, the query, the starting position and the date in
     `marketing/keyword-map.md § High-intent`; check the row daily; do not
     start a second page until the first has had four weeks. A `<rival>
     alternatives` or `<rival> vs` row with no page is a comparison page for
     the backlog (page-guidelines § 2), never built without every cell
     verified. When `competitorsConfigured` is 0, the report asks for the
     list once (ACTIONS A-M03).
   - **(h) Competitor watch, from `searchConsole.competitorQueries`.** Every
     row naming a rival: which page Google shows, whether a comparison page
     claims it. New phrasing → the watch list. The weekly run adds the rival's
     new pages and gained searches (step 15).
3. **Improve — small, evidence-backed, in scope.** From the delta and
   `marketing/keyword-map.md`, make **one to three** changes chosen bottom-up
   on the funnel ladder (STRATEGY.md § Content strategy):
   - **Rung 1, convert what lands.** A page with visitors whose CTA events
     are missing or not firing gets its next step fixed.
   - **Rung 2, CTR where the site ranks.** For every query at position 4–20
     with impressions (`nearPageOne`), check the page it lands on carries the
     query's own words in its title, description, a heading or a FAQ
     question. If not, add them — a FAQ entry in the searcher's words is the
     cheapest correct fix; retitling a money page is a Decision.
   - **Rung 2b, the snippet is the only thing a searcher sees.** A page at
     position ≤10 with ≥50 impressions and **near-zero clicks** is a snippet
     problem, not a ranking problem. Pick one such page a run, rewrite its
     `title` and `description` in the searcher's own words, **and record it
     as a test**: the keyword map's Status column gets "title tested <date>,
     check <date + 4 weeks>". One page at a time, never a batch, or nothing
     is attributable. Do not re-test a page inside its four weeks.
   - **Rung 3, links and freshness.** Pages with rising impressions at
     position 50+ get an in-body link from an *indexed* page on their target
     anchor, never a rewrite. Bump `updated` on any page whose substance
     changed.
   Each change is recorded in the report with the query or number it
   targets. When the evidence supports no change, say "no page change today"
   and why — a valid outcome; padding is not. Anything larger than a
   confident, small, in-scope change — a new page type, a retitle of a money
   page, a tool, a positioning change — goes in **Decisions** with its
   evidence, and is not built until the owner says so.
4. **Shortlist.** The report's "request indexing" list: the 10 URLs from the
   `--inspect` shortlist (never-crawled first). These need the owner's hands
   — the GSC API cannot request indexing.
5. **Ask, and hand over what only a human can do.** Run `npm run ask`
   (`scripts/data-sheet.mjs` then `scripts/actions.mjs`). It prints the open
   questions in `marketing/DATA-SHEET.md` ranked by what they unblock, the
   next unclaimed rows of `marketing/link-targets.md`, and the open actions
   with the keys the scripts are missing. All three go in the report,
   verbatim enough to act on without opening the repo. Where an API does not
   exist for something the run needs (request indexing, the Generative AI
   export, a listing, a dashboard toggle), the report says so and hands the
   owner the how-to; where a key would unlock it, the report asks for the
   key by name.
   - **Never answer a data-sheet question by estimating.** That is the whole
     point of the file. If a run finds a *source* that answers one, it may
     propose the answer in Decisions with the source, and the owner confirms.
   - **Never claim a listing.** Directory sign-ups need a human, an email and
     usually a phone number. The run surfaces the next three and stops.
   - **A blocker the run hits for the first time is added to the sheet in
     the same PR**, in the same format. A run that says "blocked on X"
     without adding X as a question has lost the finding.
6. **Scan.** A light news + ICP-social check of the site's clusters —
   including a quick look at where the ICP posts (the platforms STRATEGY.md
   names): log genuinely new candidates, including any ICP pain-point or
   keyword, to `marketing/news-log.md` as `noted, held for weekly` — do not
   write pieces on a daily run; the weekly run works them. Exception: a
   candidate that is clearly time-critical for the site's readers goes in
   the report as a flagged Decision.
7. **Release.** If a future-dated post's date has arrived, today's build
   includes it and the next `/ship` publishes it — say so in **Do this
   today**, because nothing deploys by itself.
8. **Housekeeping.** `npm run inventory`; then `npm run verify` — green, or
   the PR is not opened and the report's first line says why.
9. **Deliver.** One PR: snapshot, log, inventory, the step-0 actions update,
   the step-2/3 edits, any new data-sheet question, any social drafts for a
   piece that went live (`marketing/social-queue.md`, content-guidelines § 6). PR body: what changed, which query or number each
   change targets, what was dropped and why. A human merges and `/ship`
   deploys (there is no automatic deploy — Actions are opt-in). Re-run the OG
   cards only if a title changed.

## Weekly-full (daily-lite, plus)

10. **Rules refresh.** Run /refresh-anti-ai-rules (its own PR: rule diff +
   sweep of the latest posts for newly landed tells).
11. **Writing run.** Run /write-content (its own PR: drafts dated the day
   they go live, page updates, glossary upkeep, interlinks, news-log entry). The
   step-2c high-intent supporting piece is drafted first. Its weekly ICP social sweep runs here in full — read where the
   ICP posts, harvest pain-points and the ICP's own keyword phrasing, log
   them to news-log (the daily scan only notes candidates). The fuel rule
   holds — field notes are an add-on, never a gate: news, ICP-social and
   insights fuel keep the engine writing without them, and only a week where
   every channel is dry produces updates and an honest "wrote nothing new"
   line instead of filler. If the sweep returns no first-hand material for
   a second week running, that is a data-sheet question ("where does the
   ICP actually post?"), not a reason to pad.
12. **Tools sweep — tool-shaped queries, not only pages.** Read the snapshot
   for queries that ask for a thing to use rather than a page to read
   ("calculator", "tracker", "estimate", "checker", anything in
   `intent.json`'s signal list with that shape) and decide each by which
   kind of calculator it wants. **Input-driven** — it computes from numbers
   the reader already has — is buildable now as deterministic code over the
   reader's inputs (/write-content § 4c), publishes no reference data, and
   goes in Decisions with the signals so the owner can say go.
   **Reference-data-driven** — it needs a table the site would have to
   publish — stays gated until the rows are sourced; record it as a
   data-sheet question naming the rows. A tool that would change the site's
   shape (a nav entry, a lead-capture flow, pricing) is always a Decision.
13. **Coverage check.** The writing should be walking down
   `marketing/keyword-map.md`'s coverage layers (site-blueprint § 1), not
   only its Search Console rows — a site that only works the queries it
   already shows for never reaches the buyer who has not searched yet. If a
   layer has been blocked on data for a month, the weekly run either sources
   the data or puts the layer in Decisions with what would unblock it.
13b. **Page audit.** `npm run audit:pages` scores every content page on the
   citation checklist (page-guidelines § 1) and names the first fix. Pages
   under 70 with impressions are the refresh list; the run refreshes at least
   one a week (the fix it names, the facts re-checked, `updated` bumped only
   if something changed) and carries the table in the report's **Page
   audit** section. A page an AI feature already cites is strengthened,
   never restructured (step 2e).
13c. **Freshness sweep.** From the same table: pages dated more than 90 days
   ago with impressions (30 for pricing, rankings or availability) get their
   facts, examples and figures re-checked against their sources; the page
   says what changed; the About page's Key Facts and any comparison cell
   touched by something the product shipped are updated first (runbook § The
   accuracy check after a ship).
13d. **Internal link plan.** page-guidelines § 5, from the snapshot: group
   pages by topic, confirm each cluster's pillar and money page, propose
   contextual links between support posts and up to the pillar and the money
   page, and boost every page at position 11–20 with an in-body link from an
   indexed page that already discusses the task. Each proposed link carries
   source, destination, the existing sentence, the proposed sentence, the
   anchor and the reader's reason; applied links are recorded with the date
   and the query's starting position, compared four weeks later. Skip links
   already present; never the identical anchor to two targets.
14. **Site audit (monthly, or when the weekly run has slack).** Run /keyword-map
   steps 1 and 4 to refresh `marketing/keyword-map.md` from the latest
   insights (fold in new Search Console queries with impressions), then work
   the site-completeness checklist in `marketing/site-blueprint.md § 7`.
   Confident, small, in-scope fixes ride the PR; everything larger goes to
   Decisions. The audit never silently rewrites architecture.
15. **Data sheet and link targets, maintained.** The daily run only
   *surfaces* these; the weekly run maintains them. Re-read
   `marketing/DATA-SHEET.md`: retire a question the site has outgrown,
   sharpen one that has been open a month without an answer (usually it is
   too broad — split it), and add every blocker the week hit. Re-read
   `marketing/link-targets.md`: move rows the owner has claimed to `live`
   with the URL, add a target the week's competitor reading turned up
   (`marketing/landscape.md` keeps that reading; a rival that relaunched
   or a list that changed gets a dated line there). **A
   directory that now lists the site is a backlink and a page that can
   rank** — note it in the report so the next run can link to it and watch
   for referral traffic. Backlinks are tracked in that file, never
   improvised in a run. **Outreach:** propose up to five sites that write
   about the space (from `landscape.md`'s lists and the panel's cited
   sources), each with the page of ours it would link and the one-line
   pitch, in Decisions; a human sends them. **Competitor pages:** for each
   rival in `intent.json → competitors`, note new pages since last week
   (its sitemap or feed, URL recorded in `landscape.md`) and the searches it
   gained (the SERP shape, the panel); a page type the rival built that we
   have not is a backlog row.
16. **High-intent refresh.** Re-read `src/data/intent.json` against the
   week's snapshots: promote any new transactional phrasing with impressions
   to the watch list with its page; retire nothing (a term that stopped
   showing is a finding, not noise); re-rank `marketing/keyword-map.md
   § High-intent` by impressions and position; and re-read the top-ranking
   pages for the top two high-intent queries for an angle, use-case or
   phrasing the site does not answer — a backlog row when it earns a page.

17. **Generative AI, the weekly half.** (a) If the newest export in
   `marketing/insights/genai/` is older than seven days, the report asks for a
   fresh one first. (b) If `marketing/ai-panel.md` has no `## Run` block in the
   last 35 days, the report asks the owner to run the prompt panel (20 minutes,
   the how-to is in the file) — the run never fabricates one. When a run
   exists, read it: a competitor named in an answer this site is absent from
   becomes an angle in `marketing/keyword-map.md § High-intent`; a cited
   listicle, directory or thread the site could be on becomes a row in
   `marketing/link-targets.md`; a phrasing the assistant used and the page
   does not say becomes a FAQ line. (c) Add to the panel's prompt set any new
   high-intent phrasing that earned impressions this week. (d) Print
   `npm run aeo` and read the **Levers** table under the funnel — listings,
   the prompt panel, the data sheet, Bing verification, Organization
   completeness, commercial coverage — and carry its CRITICAL rows into
   Decisions when they are the owner's to fix (profiles, the entity record,
   exports) and into this run's PR when they are the site's (a missing
   claiming page, an incomplete Organization node). (e) Read the
   **Bing** block when `BING_WEBMASTER_API_KEY` is set: Bing's index feeds
   Copilot and ChatGPT search, so a query Bing shows the site for and Google
   does not is a phrasing to say on the page too, and a page with Bing
   impressions is a page those two assistants can reach for. When the key is
   NOT set, say so once in **What I need from you** with what it would unblock
   (the funnel's INDEXED stage, currently Google-only) — and do not repeat the
   ask in later runs once it has been declined. (f) Print
   `npm run aeo -- --trend` and carry its **focus** stage into Decisions. A
   stage-1 blocker — the edge refusing an answering agent with 401/403/429 —
   outranks every other item in the run, content included: it is a rule we
   wrote, it is invisible in a browser, and it removes the site from an index
   rather than from a page. (g) When the Google Drive connector is attached
   to the session and the owner has named a folder for the export (a
   DATA-SHEET answer), look there for a `genai-*.zip` newer than the newest
   in `marketing/insights/genai/` and copy it in before reading; otherwise
   the ask stands. The reader extracts a zip with the system `unzip` into a
   folder of the same name — no zip parsing of its own — so on a machine
   without `unzip` it prints the one-line ask instead of an empty report.

## Changing the engine

**Any change to how this site is worked gets written into this skill in the
same PR.** A decision that lives only in a chat transcript is a decision the
next scheduled run will not make. So when a rule, a data source, a check or a
new artefact lands: say which step it belongs to, whether it is daily or
weekly, and what the report has to say about it. If it changes what the owner
sees, update § The report too. A change that touches neither the run nor the
report is probably not a change to the engine.

## The report (every run, last step)

Written for the owner, who is not an SEO and should not need to be. Plain
words, the action first, the tables last. Compose markdown in this order:

1. **`# <Mode> run <YYYY-MM-DD>`**, then one line: the PR link, or why
   there is none.
2. **In plain words** — five lines at most, no jargon: how many people
   visited and the change; how many pages Google has indexed and the change;
   clicks from search (and, while it is zero, say so plainly); how many
   visitors reached the conversion event. Each with the previous number.
   **Plus one line on where the visitors came from** — the country split
   against the target markets in STRATEGY.md. A site whose content leans one
   geography attracts that geography and the traffic then reads as
   validation; if the target markets are not moving after a quarter of
   writing for them, say so — that is a strategy finding, not a content one.
3. **High-intent queries** — one table, every row from the snapshot's
   `highIntent` block (★ = watch-list term) plus the watch-list terms not
   showing yet: query · impressions · position (previous → current) · the
   page Google shows · what this run did (the phrase added, the link added
   with its anchor, the supporting piece with its URL, or "nothing today,
   because …"). Mandatory even when every line says "no change" — the owner
   reads it as the buyer's-eye view of the site.
3a. **Pull requests** — one line per PR the inbox found: its title, where it
   came from (API post, previous run, human), what this run did (merged with
   which updates; pushed updates and left ready for review; left open,
   because …), and the live URL for anything now published. Omit only when
   there were no open PRs.
3a2. **Answer-engine funnel** — the AEO/GEO headline, one table, every run:
   the five stages with score, band and how each was measured (`auto` /
   `partial` / `manual`), then the focus stage and any blockers. Overall score
   then → now when a previous snapshot exists. This section answers "how are
   we doing on AEO and GEO" on its own, so it goes ABOVE the detail below it.

3a3. **Quick wins and bottom of funnel** — two tables, every run. Quick
   wins: page · query · impressions · position · what was added (the phrase
   and where), from `searchConsole.quickWins`; "none" is a valid line.
   Bottom of funnel: the BOFU rows at 4–20 with shape, position (previous →
   current), the page Google shows, the claiming page, and the one page
   being worked this month with its start date. When no competitors are
   configured, one line asks for the list (ACTIONS A-M03).
3a4. **Competitors** — the rows naming a rival (query · rival · impressions ·
   position · page shown), the rival's new pages and gained searches from
   the weekly step 15, and any comparison page proposed. Omit only when no
   competitor is configured and no row appeared.
3b. **Generative AI** — mandatory, even when it says the export is missing.
   Four lines then a table: AI impressions in the newest export (previous
   export → now, both dated) and how many pages were shown; visitors who
   arrived from an AI assistant this window (which ones); the newest
   prompt-panel result as "named in N of M prompts; named instead: …" or
   "panel not run since <date>"; then the pages shown in AI features with
   their web impressions and AI share, followed by the pages shown on the web
   and never in AI, each with what this run did (the tldr rewritten, the FAQ
   line added with its phrasing, the source named) or "nothing today,
   because …". When the export is older than seven days, say so here and put
   the export ask at the top of **What I need from you**.
4. **What changed on the site** — the new piece first (URL, primary query,
   the fuel it came from), then one bullet per improvement: the page, what
   changed, the query or number it targets. If nothing was written, one line
   saying which source blocked it.
4b. **Page audit** — weekly, and daily when a page was refreshed: the
   `npm run audit:pages` table (page · score · impressions · age · first
   fix) for pages under 70, the page refreshed this run and what changed.
5. **Do this today** — a numbered list. First the 10 request-indexing URLs
   as bare URLs, one per list item (`scripts/report-html.mjs` turns each into
   an "Inspect in Search Console" button); then the PRs awaiting merge; then
   the unposted entries in `marketing/social-queue.md`; then anything else
   that needs the owner's hands.
5b. **Actions** — the output of `node scripts/actions.mjs --markdown`: how many
   done, the keys the scripts are missing (each with where it comes from and
   what stays dark without it), and the open items by phase with the how-to.
   Mandatory every run; when an item was ticked since the last run, say so.
   Where no API exists for an item, this is where the owner is asked to do
   it by hand; where a key exists, this is where it is asked for by name.
6. **What I need from you** — the output of `node scripts/data-sheet.mjs
   --markdown` (the `ask` npm script chains two scripts, so a flag after
   `--` reaches only the second), in
   the owner's words: the top open questions from `marketing/DATA-SHEET.md`,
   each with the ask itself and what it unblocks, answerable from the email
   without opening the repo. **Mandatory while anything is open** — the one
   part of the report that asks rather than tells. A blocker hit today was
   added to the sheet today and appears here.
7. **Where to list the site next** — the next unclaimed rows of
   `marketing/link-targets.md`, with why each matters and what it costs. The
   run never claims a listing itself. Also name any row the owner has since
   ticked off, because a live listing is a backlink the next run can use.
8. **Decisions** — each a question with one line of evidence and a
   recommended answer: tools from step 12, retitles, layers blocked on data.
   Include the standing nudge when field notes have zero unused entries: an
   /interview would give the next writing run its richest fuel (a nudge
   only — the engine keeps writing from the other channels regardless).
9. **Appendix — the numbers** — the delta tables from /insights-review
   (Umami, Search Console, indexing, edge), each previous → current.

Send it: write the markdown to a scratch file, render
`npm run report:html -- <file> > <file>.html`, then POST form-encoded to
`https://<site>/api/contact`: `action=report`, `token=$CADENCE_REPORT_TOKEN`,
`subject=<mode> run YYYY-MM-DD`, `body=<the markdown>`, `html=<the rendered
HTML>`. The Apps Script emails the HTML with the markdown as plain-text
fallback and appends the markdown to the sheet's Reports tab (SETUP
§ Services). The worker answers 303 to every form POST and discards the
script's reply, so the POST's status proves nothing: treat a 303 as sent,
and if the token is unset or the POST fails outright, say so loudly at the
end of the session and commit the report as
`marketing/insights/<date>-report.md` so it is not lost — a broken report
channel is itself reported. When the token is unset and the session holds a
Gmail connector, send the same HTML to the owner's address through it
instead and say which channel carried the report; the committed copy is
kept either way when no channel worked.
