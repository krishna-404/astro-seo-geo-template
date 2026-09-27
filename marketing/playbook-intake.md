# Playbook intake — every outside playbook ingested, what was taken, what was refused

**Why this file exists.** Playbooks arrive as links, screenshots, PDFs and
pasted threads. Each is written for a different buyer, a different channel
and a different budget, and half of every one is marketing about
marketing. `/ingest-playbook` reads one, sorts every move into
*transfers* / *already covered* / *refused*, routes what transfers into the
file that owns it (page-guidelines, content-guidelines, runbook,
launch-playbook, ACTIONS, a skill step, a script check) and records the
sort here, so the same playbook is never re-argued and a later reader can
see where a rule came from. `channel-gaps.md` holds the quarterly
re-argument for off-site moves.

**The rule.** A move is adopted only into a file with an owner and, where
it is a rule class ("every page must…"), a check (AGENTS rule 18). A move
is refused with a reason. Nothing is adopted from memory of a playbook;
the source is fetched or pasted and read.

Format, newest first:

```
## YYYY-MM-DD — <source title> (<author / site>, <url or "pasted">)
Kind: thread | article | PDF | screenshot | checklist | SOP
One line: what it argues.
Transfers → <file § section>: <the move, in our terms>
Already covered: <the move> → <where>
Refused: <the move> — <reason>
Open: <a question for the owner, added to DATA-SHEET as Q-…>
```

---

## 2026-09-27 — Twelve playbooks, one ingest

### Atomik Growth Launch Playbook (PDF summary, @SG, Sep 24 2026)
Kind: PDF (11 pages, a teardown of 14 Atomik blog posts).
One line: a launch is a two-hour window where the algorithm judges velocity; fill it on purpose with a category reframe, a picked day, tiered amplifiers, custom copy, a war room and a second wave.
Transfers → `launch-playbook.md` § 1–5: the T-14…T+30 timeline, the first-hour minute table, the tiers built from the founder's own network, the promo kit per backer, press first then post, one KPI, fix the landing page before pointing anything at it, receipts over endorsements, the second wave at +6h, clipping only from long-form that exists, the day-30 breakdown as the first case-study post.
Transfers → `ACTIONS.md` A-L14 (run the announcement, date and KPI recorded).
Already covered: "lead with proof, no 'revolutionary'" → `voice.json` bans; "views are a vanity metric" → the funnel ladder (STRATEGY § 5).
Refused: the rented network (300 coordinated accounts, 10,000 clip pages) — not owned, not needed for the choreography; comment-seeding with prepared takes and agency-written investor posts without disclosure — astroturf; "guaranteed views" — the vendor's own terms disclaim it; the "compounding attention" claim — asserted, not shown.
Open: which one KPI the owner would pay for (enquiries, demos, sign-ups) → `STRATEGY.md § 8` at launch, asked in `/launch`.

### "The D*ath Of The Influencer" (@WizOfEcom, Mogul Media, x.com/wizofecom/status/2103156728267182470, from screenshots — the link returned 402)
Kind: article (eight sections).
One line: trust replaced attention; founder-led content converts when it is written for a buyer's objections and carries a message, an enemy and a belonging.
Transfers → `content-guidelines.md` § 3 (write for objections; message / enemy / belonging; the five objections from sales calls are the next five posts), § 6 (three content jobs: top reaches strangers, middle filters, bottom asks; saves over views).
Transfers → `runbook.md` M7 (label the last twenty posts top/middle/bottom; eighteen top means two layers were never built) and M5 (objections harvested at the monthly interview).
Transfers → `.claude/skills/onboard-marketing` step 3 (test the thesis as message + enemy + belonging).
Already covered: "who followed you, not how many" → the country split and the ICP social sweep.
Refused: the two commercial offers at the end (a guided programme, an agency retainer) — not a move.

### GSC → BOFU → checklist loop (@SEOKeval, x.com/SEOKeval/status/2102044017936465937, pasted — the link returned 402)
Kind: thread (eleven steps).
One line: export Search Console by position, find the bottom-of-funnel queries at 4–20, work the AI-search checklist on the easiest page, check daily.
Transfers → `src/data/intent.json → bofu` shapes and `scripts/lib/intent.mjs § playbookBlocks` (`searchConsole.bofu`, printed by `npm run insights`); `runbook.md` § The BOFU loop; content-cadence step 2g.
Already covered: "positions 4–20 are the shortlist" → `nearPageOne`; "leads only from positions 1–5" → the funnel ladder rung 2.
Refused: giving the sheet to a chat model by hand — the pull is scripted; the "download link in the first comment" — the checklist itself is the next entry.

### AI Search Checklist (Contact, pasted checklist: on-page, differentiation, copy, craft, freshness, query fan-out A–H)
Kind: checklist (81 items).
Transfers → `page-guidelines.md` § 1 (the six groups and the fan-out table) and `scripts/page-audit.mjs` (`npm run audit:pages`, twenty checks, first fix named, `--min` as a draft gate).
Transfers → `content-guidelines.md` § 1 (BLUF, islands, extractable passages, semantic triples, entity-rich, short sentences).
Already covered: `tldr`, FAQ from one array, sources, author `sameAs`, lead figure → the schemas and invariants.
Refused: "an embedded YouTube video is present" as a per-page requirement — video only where one exists (discovery-audit prints it n/a); "updated within the last 30 days" as a universal bar — 30 for pages whose facts move, 90 elsewhere, and never a date bump without a change.

### About Us page, the 8-point post and the Contact.so SOP (pasted)
Kind: SOP.
One line: the About page is the entity source document for the knowledge graph and the assistants: eight sections, a Key Facts table as HTML, third person, no em dashes, competitors named, schema validated.
Transfers → `page-guidelines.md` § 3 in full; `ACTIONS.md` A-L13 (built, facts approved in writing) and A-Q03 (reconfirmed quarterly); `.claude/skills/new-site` phase 10 (the About page built to the spec); `src/pages/about.astro` stays the template's demo until a site fills it.
Already covered: Organization / Person / BreadcrumbList / FAQPage from one source → BaseLayout and `faqSchema.ts`; "no self-written aggregateRating" → CHECKLIST § 11; the Key Facts numbers from `facts.json` → AGENTS rule 1.
Refused: "ignore llms.txt" as advice to remove it — it is generated for free and kept, but the About page is the surface the assistants read (page-guidelines § 3 says so); the calendly plug.

### "Optimized title/H1, key takeaways, structured formats, freshness, FAQs" (pasted, five bullets)
Already covered: all five → `page-guidelines.md` § 1.

### "Easiest SEO keyword optimization" (pasted: Pages by impressions → Queries → position near 1 → add the missing query)
Transfers → `scripts/lib/intent.mjs § playbookBlocks` (`searchConsole.quickWins`: page × query at position ≤5 whose phrase the page's source does not say, via `scripts/lib/pageText.mjs`); `runbook.md` § The quick-win loop; content-cadence step 2f.

### Free backlinks from Google properties (@hridoyreh thread, screenshot: Chrome Web Store, Google Docs, Google Sites, Search Console Community, "SEO Wins")
Kind: thread.
Transfers → `link-targets.md` row: a Chrome Web Store listing, only if the site ships a real extension (added as a `skip` row with the condition).
Refused: publishing Google Docs and Google Sites pages to link to the site — nofollowed, thin, and the pattern scaled-content policy names; posting a staged question in the Search Console Community "as if you know nothing" — deceptive, and the community is not a link source; the paid "SEO Wins" database — a product plug.

### "Marketing engineering: before/after static ads" (pasted)
Kind: thread.
One line: scrape Reddit pain points, generate before/after ad creatives, bulk-upload to Facebook ads, prune losers, let winners seed the next round.
Transfers → `.claude/skills/write-content` ICP social sweep (already harvests pain points in the ICP's words; noted that a "before / after" pair is a valid post shape for the top layer).
Refused: the paid-ads pipeline, the Postgres store and the image generation — outside this site's stack and strategy (no paid acquisition in the template; CHECKLIST § 11 forbids unmeasured vendors). Re-argue in `channel-gaps.md` if the strategy adds paid.

### "How we generated millions of organic clicks with programmatic SEO" (pasted, eleven patterns)
Transfers → `page-guidelines.md` § 4 (the eleven patterns with the line an assistant lifts); `.claude/skills/keyword-map` § 2 (pattern candidates in the backlog with the data each needs); `runbook.md` W4.
Already covered: "built only from real data" → AGENTS § Content (programmatic pages, `sources` min 1); glossary as the linking layer → site-blueprint § 3.
Refused: the revenue and citation claims as evidence — self-reported; the "5-person team out-ranks 10x headcount" framing — not a move.

### AEO research list (pasted, eight arrows: reading GSC + product analytics, what ChatGPT searches on Bing, modelling Gemini/Claude questions, who is cited, the sources behind citations, the gap, fixing pages, which page types get picked)
Transfers → `runbook.md` W10 and `ai-panel.md` (the panel records who is cited and the sources behind the citation; a cited listicle or thread becomes a link-target row); the Bing block in `npm run insights` covers "what ChatGPT searches on Bing".
Already covered: the funnel (`npm run aeo`), the Generative AI export, the discovery scorecard.

### Seven AI agents for AEO (pasted: competitor page scoring, keep/change per element, question-to-page match, citation chance per URL, buyer-sort of search terms, internal link map, 20 yes/no checks on drafts)
Transfers → `scripts/page-audit.mjs` (citation chance per URL with the first fix; twenty checks; `--min` as the draft gate); `intent.json → bofu` (the buyer-sort); `page-guidelines.md` § 5 (the link map with an honest reason per link); `runbook.md` § The BOFU loop (score the competitor pages above ours on answer, depth, proof, freshness before touching ours).
Refused: nothing; the seven are shapes, not claims.

### "8 internal linking hacks" (Borja, distribb.io, pasted)
Transfers → `page-guidelines.md` § 5 (the eight steps, the link shape, the per-link record, the four-week check); `runbook.md` W7 and § The page-two push; `.claude/skills/write-content` § 4.
Already covered: anchor discipline, no orphans, no identical anchor to two targets → `check-link-graph`; "from an indexed page" → site-blueprint § 3.
Refused: the Distribb product links.

### Prompting Claude Fable 5.1 (Anthropic docs, fetched 2026-09-27)
Transfers → `content-guidelines.md` § 0 and `src/data/voice.json → prompt` (the standing line "Remove all mannered prose." and the definition of mannered prose); `.claude/skills/content-cadence` (finish the whole task: never end a run describing what it would do next); every content-producing skill carries the line.
Already covered: batching tool calls, progress updates — harness behaviour, not repo rules.

### "Perfectly optimized page for AI search" (Nectiv infographic, screenshot)
Transfers → `page-guidelines.md` § 1 (title/meta/URL/robots row; one page one intent; answer first; fan-out coverage; tables and bullets; a number to quote; question in answer out; say what nobody else can; schema twice; author; freshness). Illustrative content noted as illustrative.
Already covered: the machine-readable half → BaseLayout's JSON-LD, the invariants.

### Monthly agency scope (pasted, "what you get each month")
Transfers → `runbook.md` § What the engine delivers in a month (the scope as a visible bar); W11 (directory submissions and up to five outreach pitches a month, proposed by the run, sent by a human); the "social posts for every article" rule → `content-guidelines.md` § 6 and `social-queue.md`; "prices, features and claims kept accurate right after you ship" → `runbook.md` § The accuracy check after a ship.
Already covered: keyword map, indexing checks, AEO tracking, weekly report.
Refused: "up to 12 articles" as a quota — no volume cap and no volume target here; the fuel rule decides.
