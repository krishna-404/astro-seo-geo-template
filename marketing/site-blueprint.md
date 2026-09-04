# The site blueprint — what a site that wins SEO, AEO & GEO is made of

This is the transferable reference: the *shape* of a site that ranks in search,
gets answered by AI engines, and converts the people it brings. `STRATEGY.md` is
this site's specific instance of it (its clusters, its keyword map, its numbers);
where the two disagree, STRATEGY.md wins. This file is the part that is true for
any business, so it changes rarely — edit it only when the discipline itself
changes, not when a cluster does.

**The one argument.** A great site is not a pile of articles about your industry.
It is *the best information architecture for the buyer's entire problem space* —
every question they ask on the way to the purchase, answered on a page built for
exactly that question. Everything below is a consequence of that sentence.

Every page obeys the same five-part contract:

> **one primary query → one search intent → the page type that matches it →
> wired into a topic cluster → carrying the answer-engine levers.**

A page that breaks any link in that chain is either invisible (no query, no
intent), miscast (a sales page answering a definition query), stranded (no
cluster, no inbound links), or unciteable (buries its answer). The rest of this
document is those five parts, then what it takes to *keep* to convert, and the
audit that holds the whole thing together.

---

## 1. The page-type taxonomy — the layers of a complete site

Think of the site as a pyramid: a few high-intent commercial pages at the top, a
wide base of informational pages that feed them links and demand. Build top-down
for revenue, bottom-up for traffic — but a site that has only one half is broken.

| Layer | Page type | Search intent | URL pattern | Primary schema | Build when |
|---|---|---|---|---|---|
| Front door | **Homepage** | brand / navigational | `/` | `Organization`, `WebSite` | always |
| Commercial | **Money pages** (one per product/service/job) | transactional | `/<offering>` | `Product`/`Service`, `Offer` | one per distinct offering |
| Commercial | **Comparison / "vs" / alternatives** | commercial-investigation | `/vs/<competitor>` | `Article` + comparison table | per competitor prospects actually weigh you against |
| Segment | **Use-case / ICP / persona** | commercial-investigation | `/for/<segment>` | `Article`/`WebPage` | per buyer segment with its own pain language |
| Segment | **Industry / vertical** | commercial-investigation | `/industries/<vertical>` | `Article`/`WebPage` | per vertical with its own data and vocabulary |
| Segment | **Location / target-market** | local / geo-qualified | `/<market>/<topic>` | `WebPage` + `hreflang` | only with genuinely localized data |
| Campaign | **Messaging-angle landing pages** | matches one awareness level | `/lp/<angle>` (often `noindex`) | `WebPage` | per campaign angle the homepage's general message is wrong for |
| Informational | **Guides / blog** | informational | `/blog/<slug>` | `BlogPosting` | on cadence, each with proprietary fuel |
| Informational | **Problem pages** | informational, pain-live | `/blog/<problem>` or own dir | `Article` + `FAQPage` | for the searches made at the moment the pain is live |
| Reference | **Glossary / wiki / definitions** | informational, "what is X" | `/glossary/<term>` | `DefinedTerm` + `FAQPage` | when terms in your space are searched as definitions |
| Tools | **Calculators / interactive tools** | commercial, high-intent | `/<thing>-calculator` | `WebApplication`/`SoftwareApplication` | when you can deterministically compute something the buyer wants |
| Trust | **About / author / pricing** | navigational / trust | `/about`, `/author/<slug>`, `/pricing` | `AboutPage`, `Person`, `Offer` | always (about, author); pricing per strategy |
| Machine | **`/for-llms`, `llms.txt`, markdown twins** | AI readers | generated | — | always (they are generated, not written) |

The template ships two content collections — `blog` and `glossary` — because they
are universal. Every other layer is a route + collection you add *when the
strategy calls for it and you have the data*: a money page needs a real offering,
a location page needs localized data, a comparison page needs every claim
verified. Do not scaffold an empty layer to "look complete" — an empty or
data-free page is exactly what scaled-content policies penalise, and the "every
collection needs a route" and "no orphans" checks will (correctly) fail it. The
/keyword-map skill decides *which* layers this site needs; /write-content builds a
page in a layer only when there is a query and the data to answer it.

Rules that ride specific page types, learned the expensive way:

- **Homepage is a presentation, not a link farm.** In roughly five seconds above
  the fold it must answer three questions: *what is it (and from whom), how does
  it help me, and why you not a competitor.* Deliver that "minimum viable
  conversation" — unique value, the specific offer, the single biggest buying
  criterion — *before* asking for any in-body commitment. Design ~80% typical for
  the industry (credible) and ~20% distinctive (memorable). No carousels or
  sliders; they hurt UX and never rescue weak copy.
- **Money pages order deal-breaker-first.** What it is, then how it helps, then
  price — and include *process* (how you actually deliver) and *personality* to
  de-risk the decision.
- **Comparison pages are the one class that generates a letter, not a
  correction.** They assert, by name, that a competitor does or does not do
  something. Every cell is verified against a primary source before the page
  ships, or it does not ship. High intent, high risk — worth it, done carefully.
- **Location pages need genuinely localized data or they are doorway pages.** Same
  page with the town name swapped is the doorway-page pattern Google penalises.
  Multi-market variants carry `hreflang`, and `hreflang` never points at a
  noindex, canonicalized, redirected or blocked URL.
- **Tools are the highest-leverage page you can ship** — a link magnet, an
  AI-citation magnet, and a lead qualifier. Deterministic code computes from a
  sourced data file (a model never generates a number a prospect can re-check);
  prefill via query params so outreach can deep-link a reader into a page that
  already knows their situation.
- **About page is credibility, not autobiography** — what makes you relevant to
  *this* prospect, ending in a way to get in touch. Kill the standalone
  testimonials page: relocate each proof next to the claim it backs.

---

## 2. Keyword research → content — every page earns its query

No page is built without a query it is meant to win. The map from queries to
pages lives in `marketing/keyword-map.md`, maintained by the /keyword-map skill.

- **One page = one primary keyword = one intent.** Never build two pages that
  compete for the same query, and never point two internal links with the same
  anchor at two different pages — both split the signal and confuse the engine
  about which page ranks.
- **Classify intent before choosing a page type.** Informational → guide or
  glossary. Commercial-investigation ("best X", "X alternatives", "X vs Y") →
  comparison, use-case or industry page. Transactional → money or pricing page.
  Navigational → the page they already want. A definition query answered by a
  sales page ranks for nothing and converts nobody.
- **Say what the searcher literally types.** The query's own words go in the
  title, meta description, H1 and at least one H2. Take the *voice of the
  customer* — the exact phrasing real buyers use, harvested from `npm run
  insights` (Search Console), the ICP social sweep, and competitors' ranking
  pages — never phrasing a keyword tool invented that no human says.
- **Cover the cluster, not the keyword.** Around each primary query sits a cluster
  of related questions and subtopics; modern ranking rewards matching the
  searcher's whole goal, not keyword density. Map the cluster and cover it across
  a pillar and its spokes (§3).
- **Prioritise from evidence.** Pages already ranking **position 4–20** with
  impressions are the shortlist to improve (better title, better answer);
  **position 50+** means the page needs links and authority, not a new title.
  The funnel ladder (§4) sets the order across the whole site.

`marketing/keyword-map.md` is the living artifact: every priority query, its
intent, the cluster it belongs to, the page that targets it (existing or planned),
and its status (mapped / drafted / live / ranking). It is the difference between
"write some blog posts" and "close the gaps in a deliberate architecture."

---

## 3. Interlinking & architecture — the mechanism that makes new pages rank

Internal links are how link equity — and crawl priority — move through the site.
A page nothing points to gets none, however good it is. This is not decoration; it
is the mechanism by which a new page becomes a ranking page.

- **Topic clusters (pillar + spokes / silos).** Each cluster has a pillar page
  (the broad hub) that links out to every spoke (the specific subtopics); each
  spoke links back to its pillar and across to its siblings. This is what tells an
  engine you have topical authority on the subject, not one stray article.
- **The rule that makes new pages rank — link them from already-indexed pages.**
  A brand-new page has no authority of its own. It gets discovered and ranked
  because established, *already-indexed*, well-linked, topically-related pages
  point at it. So on publish, every new page gains **at least one in-body inbound
  link from an existing indexed page in its cluster, anchored on the new page's
  target keyword.** "Indexed" is a live fact, not a static one: the cadence run
  reads Search Console (`npm run insights --inspect`) to know which pages are
  actually indexed and picks the inbound-link source from among them — linking a
  new page only from other brand-new pages leaves the whole group stranded. The
  static half of this (no page ships an orphan) is enforced by
  `npm run check:links`; the "from an *indexed* page, on the right anchor" half is
  worked at cadence time because only Search Console knows what is indexed.
- **Anchor-text discipline.** Anchors are descriptive and carry the destination's
  keyword ("goes to demurrage", never "click here" / "read more" / "this page").
  *Vary* the anchor across links to the same page, and **never use the identical
  anchor for two different destinations.** The first instance of a link on a page
  is the one whose anchor is weighed most — put the best phrasing there, high on
  the page.
- **No orphans; the durable links live in nav and footer.** Every page receives at
  least one intentional internal link. The footer carries contact info and links
  to the main pages — people use it, and it links every top page from every page.
- **Refresh old pages with links to new ones on publish**, and keep the graph
  clean: no dead internal links, no junk anchors (all enforced by
  `check-link-graph`).
- **Respect link saturation.** 3–5 in-body links is the working band; past ~8 a
  page reads as a link farm and each link passes less value.

---

## 4. Conversion & trust — what the ranking is *for*

Impressions alone are worth nothing. The order of work is fixed by the funnel
ladder (the standing order in STRATEGY.md § Content strategy), and it runs
bottom-up:

1. **Convert what already lands.** Every page that receives visitors has a
   working, *measured* next step (CTA events per entrance). Fix this first.
2. **Then CTR where you already rank.** Position ≤20 (above all ≤10) with
   impressions and few clicks — titles and descriptions in the searcher's words.
3. **Impressions last.** New content for the highest-search winnable keywords —
   real, consistent work, but only after rungs 1–2 hold on what exists.

The elements that do the converting:

- **CTAs.** Every button label is a verb that completes "I want you to…" — "View
  all services", "Get my report", not "More" or "Submit". Clear beats clever. One
  primary CTA visible per screen (repeat the *same* one down the page rather than
  offering competing choices), and sequence asks by commitment: low-commitment
  high on the page, high-commitment after the evidence. Every CTA is measured
  (`data-umami-event`, enforced) — an unmeasured CTA can't be improved.
- **Social proof, honestly.** A testimonial that converts has three parts: the
  original problem or fear, the specific result (with numbers), and why the doubt
  was justified but overcome. Generic praise converts nobody. Place each proof
  next to the claim it backs. **Never fabricate a customer, review, rating or
  result**, and never mark up self-authored reviews — that violates review-snippet
  policy and risks a manual action. Collect real reviews, display them, then mark
  them up so the schema matches what a visitor can see. (Omitting proof is always
  fine; asserting a fake one is fatal — see VOICE-GUIDE § integrity.)
- **E-E-A-T / author signals.** Named human author with real credentials and a
  linked `/author/<slug>` page whose `sameAs` points at a real external profile.
  Show experience: process transparency and first-hand specifics only a
  practitioner could write. Keep a real "last updated" date that reflects a
  genuine edit, surfaced in schema and the sitemap.

---

## 5. AEO & GEO — getting cited by the answer engines

Ranking gets you a blue link; being *cited* gets you the answer. For a young
domain this is often the faster channel — the pool of genuinely specific, sourced
content the models pull from is far smaller than the pool competing for rank. The
levers with *measured* lift (Aggarwal et al., KDD 2024) are **cited sources,
quotations from authorities, and statistics**; keyword stuffing measurably hurts.

- **Front-load the answer.** A direct answer in the first 40–60 words of the page,
  and again in 2–4 self-contained sentences immediately under each heading. The
  `tldr` field enforces the page-level version; write the per-heading version by
  hand.
- **A TL;DR block (2–4 bullets, under ~100 words) before the first H2.**
- **Question-shaped headings.** H2/H3 phrased as the actual query — "What is X?",
  "How do I…?" — with the answer directly beneath.
- **Inverted pyramid, one idea per paragraph, 2–4 sentence chunks.** Dense blocks
  get skipped or misquoted. Half the word count of print writing is the target.
- **Lists and tables.** Answer engines parse, extract and cite these most easily.
  Each list item and table row is self-contained and leads with its key concept.
- **Fact density.** Roughly one concrete, quotable statistic per 150–200 words,
  each with a cited authoritative source. This is the single strongest GEO lever.
- **Write every sentence to survive being quoted alone.** Kill vague pronouns; a
  sentence that only makes sense in context can't be cited out of context.
- **Structured data.** `FAQPage` is the highest-impact type for AEO — it turns
  Q&A pairs into explicit citation candidates (render it from one source array,
  never hand-write FAQ markup in the body). Add `Article`/`BlogPosting` with a
  real author and `dateModified`, `Organization`, `BreadcrumbList`, and
  `Product`/`Offer` where relevant. A site-wide `Person` node anchors author
  identity; reference it by `@id` rather than restating the profile per page.
- **Entity / topical authority.** Cover a topic comprehensively and interlink it
  as a cluster; name entities consistently across the site so engines trust you as
  *the* source on the topic.
- **`llms.txt` + markdown twins.** Generated, low-cost, and honest (they can't say
  what the site doesn't). Evidence that engines honour `llms.txt` in 2026 is weak
  — generate it, keep it current, do not build strategy on it. Put the proven
  levers first: expert-led content, structured chunked answers, internal links,
  freshness.

---

## 6. Straightforward messaging — the house voice, generic half

The voice this template writes in is deliberately plain. This is the transferable
half of the standard; the per-site specifics (the reader, the stance, the words
this brand keeps and bans) live in `VOICE-GUIDE.md`, and the mechanical bans live
in `src/data/voice.json`. The generic rules — the ones true for any business:

- **The read-aloud test.** Delete any sentence you would not actually say out loud
  to a prospect's face. If it reads like a brochure, it is dead copy.
- **Lead with *what*.** The reader needs to know what you do before anything else.
  Never open with vision, mission or mood.
- **"You/your" outnumbers "I/we/our".** Copy centred on yourself instead of the
  reader is the most common failure. Write to the person who owns the problem.
- **Cut claims a competitor could paste onto their own site.** A line that could
  carry anyone's logo says nothing; prove the difference with evidence, not
  adjectives.
- **Use only words 100% of the audience already uses.** No jargon the reader
  doesn't say themselves.
- **Specificity over brevity — but keep the chunks short.** Use as many sentences
  as clarity needs; do not amputate meaning to look sleek. And do not chase the
  all-one-line-paragraphs fad — it reads as monotonous. Short paragraphs (two to
  five sentences, one idea each) that each say something concrete.
- **No false empathy.** Don't tell the reader how they feel ("you're frustrated
  and overwhelmed"). Let a real example or testimonial carry the emotion.
- **Be concrete.** Replace abstractions with numbers, names and observable
  outcomes. State the specific result, not "great results".

Plain, objective, factual copy is not just nicer — it measurably works: NN/g found
objective language raised usability 27% over promotional "marketese", and concise
+ scannable + objective together raised it 124%.

---

## 7. The site-completeness audit — what the cadence keeps true

A site decays: clusters grow lopsided, new pages strand themselves, queries appear
in Search Console with no page to catch them, landing pages lose their measured
next step. The /content-cadence run works this checklist on its periodic
(monthly/quarterly) pass and files what it finds as backlog items and report
questions — it never silently "fixes" architecture.

- **Coverage.** Does each declared cluster (STRATEGY.md) have its pillar and a
  reasonable set of spokes? Does each page *type* the strategy calls for exist?
  Gaps → backlog, ranked by the funnel ladder.
- **Keyword map.** Is every priority query mapped to a page (live or planned)? Have
  new Search Console queries with impressions been added to
  `marketing/keyword-map.md`? Any query with impressions and no matching page is a
  page waiting to be built.
- **Interlinking.** Orphans and dead links are already blocked at commit. The
  audit adds the parts a static check can't see: is each recent page linked from an
  *indexed* page on its target anchor (§3)? Are pillar↔spoke links wired both
  ways? Any identical anchor pointing at two different pages?
- **Conversion.** Does every page that receives visitors have a measured next step,
  and is it actually firing (`npm run insights`)?
- **AEO/GEO.** Do answer pages front-load a `tldr`, carry question-shaped H2s, hit
  the stat-density target, and emit the right schema?
- **Freshness.** Which live pages are stale relative to a changed fact or a moved
  query, and should be refreshed (not rewritten monthly for its own sake — that
  only churns the freshness signal)?

The audit's output is the same shape as everything else the engine produces: a
prioritised list in the cadence report's "Needs you", and PRs for the parts that
are confident, small and in scope. A human merges; nothing auto-publishes.

---

### Where each rule is enforced

Doctrine is only real when it is checked. The mechanizable parts of this blueprint
live in the battery (see CHECKLIST § enforcement for the full table):

- **Orphans, dead internal links, junk anchors, anchor-uniqueness** →
  `check-link-graph.mjs`
- **Blog cadence (spread dates), ≥2 in-body links, registered author** →
  `check-source-rules.mjs`
- **Front-loaded `tldr`, FAQ single-source, one H1, every collection has a route**
  → the schemas + `check-collection-routes.mjs` + `check-invariants.mjs`
- **CTA measured** → `check-invariants.mjs`
- **The mechanical voice bans** → `check-voice.mjs` (`src/data/voice.json`)

The judgement halves — is the answer actually front-loaded, is the proof real, is
the voice straightforward, is the cluster genuinely covered — are run by hand
against this document, `VOICE-GUIDE.md § 6`, and the audit above. A green battery
is a floor, not a pass.
