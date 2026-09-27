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
never guessed at. `npm run verify` green on the exact tree is the bar for
delivering anything at all. Who merges and who deploys is the merge model in
`marketing/STRATEGY.md § 9`: the default commits to `main` and runs the ship
steps itself (step 9), so the battery is the only gate and the scope rule
below is load-bearing — small, evidence-backed, in scope.

**What this run reads, and what owns each number.** Every block the run works
is computed by a script whose header states the rule in full; this skill says
what to DO with the block, never how it is scored. `npm run insights` prints
them in one report: the **answer-engine funnel** (`scripts/lib/aeo.mjs`), the
**high-intent queries** (`src/data/intent.json` + `scripts/lib/intent.mjs`),
**Generative AI** (`scripts/lib/genai.mjs`; the export loop is
`marketing/insights/genai/README.md`), quick wins, BOFU and competitors
(`scripts/lib/pageText.mjs`, `scripts/lib/intent.mjs`). Read a header before
arguing with a number.

**Sequence and priority are different things.** The run executes in step
order: 0 actions → 1 measure → 1b PR inbox → 2 high-intent → 3 improve. What
it *works first* when the time runs short is a different ranking, and it is
this one, for every run and for /insights-review's plan alike:

1. **A stage-1 edge blocker** — the edge refusing an answering agent with
   401/403/429. It outranks everything, content included: it is a rule we
   wrote, it is invisible in a browser, and it removes the site from an index
   rather than from a page.
2. **High-intent rows**, whatever their volume — the words a buyer with
   budget types.
3. **Quick wins**, because they are mechanical and free.
4. Everything else, down the funnel ladder (`marketing/STRATEGY.md § 5`).

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
     **merges** is `marketing/STRATEGY.md § 9`: on the default it merges a
     green post that clears the bar, and step 9's deploy publishes it the
     same day; on PR review it leaves the post ready for review with the
     updates pushed. A post it will not merge is named in the report with
     the reason — that is the one row that still needs the owner (ACTIONS
     A-D02).
   - **Every other open PR** (a previous run's, a human's, a fix branch):
     the same rule — merge when the site allows it, the PR is the site's own
     work, verify is green and the change is confident, small and in scope;
     otherwise leave it and put it in Decisions with what would unblock it.
     Never merge over a red verify; never rewrite someone else's branch.
2. **High-intent first.** Take the `searchConsole.highIntent` block from the
   snapshot (★ rows are watch-list terms; `notShowing` lists watch terms with
   no impressions yet) and work it in this order, before step 3:
   - **(a) The right page, saying the words.** Every row must be `ok` —
     `scripts/lib/intent.mjs`'s header defines `ok`, `wrong-page` and
     `unmapped`. An `ok` page carries the query's exact words in its title or
     description, a heading and a FAQ question. A `wrong-page` row gets the
     phrase on the claiming page plus an in-body link to it from the page
     Google is showing instead, anchored on the query. An `unmapped` row is
     either added to a money page's `secondaryKeywords` (same intent) or
     mapped as a new page in `marketing/keyword-map.md § High-intent`. A new
     phrasing with impressions joins the watch list in `intent.json` the day
     it appears, with its page.
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
     carries only the two proxies and a one-line ask). /insights-review's plan
     names which pages to work; what binds this run is the pair of rules the
     plan cannot enforce:
     1. **A cited page is strengthened and linked, never rewritten.** Every
        page in `topPages` gets its link to the cluster's money page checked
        on a high-intent anchor, and its `tldr`, sources and `updated` kept
        current. Never retitle or restructure a page an AI feature is already
        showing — a citation is the hardest thing on the site to earn back.
     2. **A missing or stale export is an ask, never an estimate.** When
        `stale` is true or there is no export, **What I need from you** opens
        with the ask and the how-to from
        `marketing/insights/genai/README.md`. The run says the export is
        missing; it does not guess AI impressions.

     The rest of the block — `uncited` pages taking the three levers (an
     answer-shaped `tldr` of one to three sentences, a FAQ block in the
     searcher's words, named sources), `promptShaped` rows becoming FAQ lines
     verbatim, the country split read against the Umami split — is worked in
     whatever order /insights-review ranked it.
   - **(f) Quick wins, from `searchConsole.quickWins`.** Each row is a page
     already shown at position ≤5 for a phrase its source does not say
     (`scripts/lib/pageText.mjs` read the source; `status: words` means every
     word is there but not the phrase, `missing` names the absent words). Add
     the phrase where it is true: a heading, the description, a FAQ line in
     the searcher's words. Work every row; this is the cheapest ranking move
     on the board and it is mechanical. Record each in the report.
   - **(g) Bottom of funnel, one page at a time, from `searchConsole.bofu`.**
     The rows are the buyer's shapes at position 4–20. Pick the one whose page
     is easiest to move: read the two or three pages above it in the SERP for
     answer, depth, proof and freshness, run `npm run audit:pages -- --page
     <route>` on ours, and implement what it names in priority order. Record
     the page, the query, the starting position and the date in
     `marketing/keyword-map.md § High-intent`, check the row daily, and **do
     not start a second page until the first has had four weeks** — one page
     at a time is what makes the move attributable. A `<rival> alternatives`
     or `<rival> vs` row with no page is a comparison page for the backlog
     (`marketing/page-guidelines.md § 2`), never built without every cell
     verified. When `competitorsConfigured` is 0, the report asks for the list
     once (ACTIONS A-M03).
   - **(h) Competitor watch, from `searchConsole.competitorQueries`.** Every
     row naming a rival: which page Google shows, whether a comparison page
     claims it. New phrasing → the watch list. The weekly run adds the rival's
     new pages and gained searches (step 15).
3. **Improve — small, evidence-backed, in scope.** From the delta and
   `marketing/keyword-map.md`, make **one to three** changes, chosen bottom-up
   on the funnel ladder — `marketing/STRATEGY.md § 5` states the rungs, their
   order and the snippet test's three numbers. Bump `updated` on any page
   whose substance changed.

   Each change is recorded in the report with the query or number it targets.
   When the evidence supports no change, say "no page change today" and why —
   a valid outcome; padding is not. Anything larger than a confident, small,
   in-scope change — a new page type, a retitle of a money page, a tool, a
   positioning change — goes in **Decisions** with its evidence, and is not
   built until the owner says so.
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
7. **Release.** A future-dated post whose date has arrived enters today's
   build and goes live on this run's deploy (step 9) — name it in **What
   changed**. On a PR-review site it waits for a human `/ship`, and then it
   belongs in **Do this today** instead.
8. **Housekeeping.** In this order, because each step reads what the one
   before it wrote: `npm run lastmod` · `npm run inventory` · `npm run build`
   · re-render the OG cards **if any title or description changed**
   (`git diff --name-only` over `src/content` and `src/pages`, then
   `npm i --no-save playwright && node marketing/og/render-pages.mjs`) ·
   a second build to pick the cards up · `npm run verify`. Green, or nothing
   is delivered and the report's first line says why. Regenerating before the
   build is what keeps the committed `lastmod` map from lagging a site that
   deploys the same day.
9. **Deliver — and, on the default merge model, deploy.** One changeset:
   snapshot, log, inventory, lastmod, the step-0 actions update, the step-2/3
   edits, any new data-sheet question, any social drafts for a piece that went
   live (`marketing/social-queue.md`, content-guidelines § 6). The message says
   what changed, which query or number each change targets, and what was
   dropped and why.

   `marketing/STRATEGY.md § 9` decides what happens next.

   - **commit-to-main (the default):** commit to `main`, push, then run the
     ship steps — `/ship` steps 3–7, with the build already done by step 8:
     `CLOUDFLARE_API_TOKEN="$CLOUDFLARE_DEPLOY_TOKEN" npm run deploy`, purge
     with `CLOUDFLARE_ZONE_ID`, `npm run indexnow` (IndexNow plus the Bing URL
     submission), `node scripts/smoke-live.mjs`.
   - **PR review:** open the PR and stop; the report says it is waiting.

   **Guards — any one of these and the run opens a PR instead and names the
   reason in the report's first line:** `src/data/origin.mjs` still says
   `example.com` (nothing to deploy to); the battery is red; or
   `CLOUDFLARE_DEPLOY_TOKEN` is unset (ACTIONS A-K06 asks for it by name).
   A missing `CLOUDFLARE_ZONE_ID` is not a guard — skip the purge, say so, and
   note that pages self-refresh within five minutes.

## Weekly-full (daily-lite, plus)

10. **Rules refresh.** Run /refresh-anti-ai-rules (its own PR: rule diff +
   sweep of the latest posts for newly landed tells).
11. **Writing run.** Run /write-content (drafts dated the day they go live,
   page updates, glossary upkeep, interlinks, news-log entry). The step-2c
   high-intent supporting piece is drafted first, and the weekly ICP social
   sweep runs here in full — the daily scan only notes candidates. The fuel
   rule (`marketing/content-guidelines.md § 2`) decides whether anything gets
   written: a week where every channel is dry produces updates and an honest
   "wrote nothing new" line, never filler. A sweep that returns no first-hand
   material for a second week running is a data-sheet question ("where does
   the ICP actually post?"), not a reason to pad.
12. **Tools sweep — tool-shaped queries, not only pages.** Read the snapshot
   for queries that ask for a thing to use rather than a page to read
   ("calculator", "tracker", "estimate", "checker"), and sort each by the
   input-driven / reference-data-driven split that /write-content § 4c
   defines. Input-driven goes in Decisions with its signals so the owner can
   say go; reference-data-driven becomes a data-sheet question naming the rows
   it needs. A tool that would change the site's shape — a nav entry, a
   lead-capture flow, pricing — is always a Decision.
13. **Coverage check.** The writing should be walking down
   `marketing/keyword-map.md`'s coverage layers (site-blueprint § 1), not
   only its Search Console rows — a site that only works the queries it
   already shows for never reaches the buyer who has not searched yet. If a
   layer has been blocked on data for a month, the weekly run either sources
   the data or puts the layer in Decisions with what would unblock it.
13b. **Page audit.** `npm run audit:pages` scores every content page on the
   citation checklist (`marketing/page-guidelines.md § 1` owns it) and names
   the first fix. Pages under 70 with impressions are the refresh list; the
   run refreshes at least one a week and carries the table in the report's
   **Page audit** section. A page an AI feature already cites is
   strengthened, never restructured (step 2e).
13c. **Freshness sweep.** From the same table: pages dated more than 90 days
   ago with impressions — 30 days for pricing, rankings or availability — get
   their facts, examples and figures re-checked against their sources, and say
   what changed. The About page's Key Facts and any comparison cell touched by
   something the product shipped come first (runbook § The accuracy check
   after a ship).
13d. **Internal link plan.** Run the plan in `marketing/page-guidelines.md
   § 5` against this week's snapshot — it owns the clustering, the proposal
   format and the record-and-recheck. The one thing this run adds: every page
   at position 11–20 gets an in-body link from an indexed page that already
   discusses the task.
14. **Site audit (monthly, or when the weekly run has slack).** Run /keyword-map
   steps 1 and 4 to refresh `marketing/keyword-map.md` from the latest
   insights (fold in new Search Console queries with impressions), then work
   the site-completeness checklist in `marketing/site-blueprint.md § 7`.
   Confident, small, in-scope fixes ride the PR; everything larger goes to
   Decisions. The audit never silently rewrites architecture.
15. **Data sheet and link targets, maintained.** The daily run only
   *surfaces* these; the weekly run maintains them — `marketing/runbook.md`
   W8 and W11 say what each pass covers. In this run that means: re-read
   `marketing/DATA-SHEET.md` (retire a question the site has outgrown, split
   one that has been open a month without an answer — it is usually too broad
   — and add every blocker the week hit); re-read
   `marketing/link-targets.md` (claimed rows to `live` with the URL, new
   targets from the week's reading); and re-read `marketing/landscape.md` for
   each rival in `intent.json → competitors` (new pages from its sitemap or
   feed, the searches it gained, a page type it built that we have not).
   Two things this step must not improvise: **a directory that now lists the
   site is a backlink and a page that can rank** — it is recorded in
   `link-targets.md`, never invented in a run — and outreach is *proposed*
   (up to five sites, each with the page of ours it would link and a one-line
   pitch, in Decisions), never sent.
16. **High-intent refresh.** Re-read `src/data/intent.json` against the
   week's snapshots: promote any new transactional phrasing with impressions
   to the watch list with its page; retire nothing (a term that stopped
   showing is a finding, not noise); re-rank `marketing/keyword-map.md
   § High-intent` by impressions and position; and re-read the top-ranking
   pages for the top two high-intent queries for an angle, use-case or
   phrasing the site does not answer — a backlog row when it earns a page.

17. **Generative AI, the weekly half.** The export loop and its cadence are
   `marketing/insights/genai/README.md`; the panel and its prompt set are
   `marketing/ai-panel.md`. What the weekly run does with them:

   (a) **Ask when either is stale** — an export older than seven days, or a
   panel with no `## Run` block in 35 days (ACTIONS A-W01, A-M01). The run
   never fabricates either. When the Google Drive connector is attached and
   the owner has named a folder for the export (a DATA-SHEET answer), look
   there for a newer `genai-*.zip` and copy it in before asking.

   (b) **Read the panel when a run exists.** A competitor named in an answer
   the site is absent from becomes an angle in `marketing/keyword-map.md
   § High-intent`; a cited listicle, directory or thread becomes a row in
   `marketing/link-targets.md`; a phrasing the assistant used and the page
   does not say becomes a FAQ line. Add this week's new high-intent phrasings
   to the prompt set.

   (c) **Work `npm run aeo`'s Levers table.** A CRITICAL row that is the
   owner's — profiles, the entity record, an export — goes in Decisions; one
   that is the site's — a missing claiming page, an incomplete Organization
   node — is fixed in this run. Then `npm run aeo -- --trend`, and its
   **focus** stage goes in Decisions.

   (d) **Read the Bing block** when `BING_WEBMASTER_API_KEY` is set: a query
   Bing shows the site for and Google does not is a phrasing to say on the
   page too. When the key is not set, say so once in **What I need from you**
   with what it unblocks (the funnel's INDEXED stage, Google-only without it),
   and do not repeat the ask once it has been declined.

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

1. **`# <Mode> run <YYYY-MM-DD>`**, then one line for the delivery: on the
   default merge model, the deployed version id, the number of URLs submitted
   to IndexNow and Bing, and the live-smoke result — or, if a guard fired or
   the site is on PR review, the pull request link and which it was.
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
   an "Inspect in Search Console" button); then the unposted entries in
   `marketing/social-queue.md`; then any pull request the run **declined**,
   with the reason; then anything else that needs the owner's hands. A run
   that deployed itself does not ask for a merge.
5b. **Actions** — the second half of `npm run ask -- --markdown`: how many
   done, the keys the scripts are missing (each with where it comes from and
   what stays dark without it), and the open items by phase with the how-to.
   Mandatory every run; when an item was ticked since the last run, say so.
   Where no API exists for an item, this is where the owner is asked to do
   it by hand; where a key exists, this is where it is asked for by name.
6. **What I need from you** — the first half of `npm run ask -- --markdown`
   (one script, both halves, the flag forwarded to each), in the owner's
   words: the top open questions from `marketing/DATA-SHEET.md`,
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
