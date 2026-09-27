# Page guidelines — what each page type has to contain to rank, be cited and convert

`site-blueprint.md § 1` decides WHICH page types a site has and when to build
them. This file says what each one CONTAINS: the anatomy of a page built for
the moment the reader is a language model deciding what to cite, and a
buyer deciding whether to trust it. `content-guidelines.md` is how the words
are written; this is what goes on the page. `npm run audit:pages` scores the
checklist in § 1 on every built page and names the first fix.

Ingested from the sources in `marketing/playbook-intake.md`. Every prompt
that builds a page from this file ends with: Remove all mannered prose.

---

## 1. The checklist every page clears

Six groups. A page is scored on them; the audit prints the ones it fails.

**Page components** (what a machine extracts and cites)

- Key takeaways up top: the `tldr`, four to six sentences that answer the
  query outright and survive being lifted alone.
- A FAQ section from the `faq` frontmatter: real questions in the
  searcher's words, each answered in two sentences with a number, a date
  or a fact. No vague claims that read as bias. Three or more.
- A comparison table where anything is compared; a numbered list where
  anything is sequenced; bullets for anything enumerable.
- Short paragraphs, under 90 words.
- Screenshots or a unique figure (the lead figure, drawn at build time).
- Customer quotes as direct quotes, with permission, never invented.
- Author profile linked (`/author/<slug>`), social profiles linked
  (E-E-A-T).
- A visible "last updated" date backed by `dateModified`.

**Differentiation** (what only this site has)

- First-party data, screenshots of the product in use, a named expert, a
  case-specific teardown, a contrarian evidence-backed position, a coined
  framework carrying the brand name, an interactive tool. At least one.

**Copy** (how it reads to a machine)

- Question-based headers. Bottom line up front. Extractable passages.
- Every H2 a self-contained island. Entity-rich: brands, products, people,
  places, specific concepts by name.
- Citable facts with sources; a number every 150–200 words.

**Craft**

- Short sentences (average ≤22 words). Semantic triples. Sentence case.

**Freshness**

- Updated within 90 days (30 for pages whose facts move: pricing,
  rankings, availability). Information, examples and data refreshed, not
  the date alone. "What changed since the last update" stated.

**Query fan-out** (one question becomes a dozen sub-queries; cover the
buckets so one page answers the whole fan-out)

| Bucket | The page answers | Example sections |
|---|---|---|
| A · Core intent | the direct answer in the first 100–150 words; who the page is for; the topic in plain words; the main qualifier ("best", "top") explained; a clear conclusion | |
| B · Related topics | what else the reader needs before deciding; definitions and context | What is this? How does it work? Who is it for? When to use it? Main types |
| C · Implicit questions | cost, timeline, effort, risks, what happens after | How much does it cost? How long does it take? Is it worth it? What are the risks? Who is this not for? |
| D · Comparative | the alternatives by name, a table, pros and cons, when each fits, no "best for everyone" | A vs B · Best alternatives · Pricing comparison · In-house vs agency vs software |
| E · Recency | visible date, current year where it matters, prices and rankings current, what changed | |
| F · Contextual variation | how the answer changes by budget, size, location, urgency, goal; "best for" labels | Best for startups · Best for small budgets · Best for beginners |
| G · Next steps | what to do after reading; a decision framework; post-decision FAQs; links deeper | How do I choose? What should I ask before buying? How do I get started? |
| H · Evidence | sources on every factual claim; original experience; case studies, screenshots, data, quotes; how the recommendations were chosen; author, reviewer, company expertise | Selection criteria · Methodology · Limitations |

**Title, meta and crawl** (the template enforces most of it)

- Title names the topic and the jobs the page does; the H1 matches; the
  URL is short and permanent. ≤60 characters (`check-source-rules`).
- Meta description 70–165 characters, in the searcher's words.
- robots.txt allows GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot,
  Google-Extended (`check-invariants`); the page is server-rendered
  (everything here is static HTML by construction).
- Schema says twice what the page says once: Article/BlogPosting or
  DefinedTerm, FAQPage, Organization, BreadcrumbList, Dataset for original
  research, SoftwareApplication or Service where it applies.

## 2. Per page type

### Homepage

Answers three questions in five seconds above the fold: what is it and from
whom, how does it help me, why you and not a competitor. One primary CTA
repeated down the page. Proof next to the claim it backs. FAQ from one
array. No carousel. (site-blueprint § 1.)

### Money page (one per offering)

Deal-breaker first: what it is, how it helps, then price. Process (how you
deliver) and personality (who they will work with). `primaryKeyword` and
`secondaryKeywords` declared in frontmatter; the collection listed in
`intent.json → claimFrom`. A comparison table against the alternatives the
buyer weighs (bucket D). A pricing table with real headers or an honest
"pricing on request" with what decides it. FAQ answers the C bucket: cost,
timeline, risks, what happens after signing.

### Comparison, "vs" and alternatives pages

The one page class that generates a letter, not a correction. Every cell
verified against a primary source (the rival's own pricing page, docs,
terms) before it ships, `retrieved` dated. Structure: who this is for per
option (the exact line an assistant lifts), a feature and pricing table,
pros and cons of each, when each is the better fit, never "best for
everyone". Name the rivals; the co-occurrence of both brands on your domain
is what puts you in the model's competitive set. Rivals come from
`marketing/landscape.md` and `intent.json → competitors`; a "<rival>
alternatives" query in the BOFU block is the trigger to build one.

### Use-case, persona and industry pages

Same product, one buyer type, their own pain language. Template fixed,
persona swapped, narrow enough to match a real question word for word.
Built only with data specific to the segment, or it is a doorway page.

### Guides and blog posts

The `proprietary` field names the fuel. `tldr`, question-shaped H2s, a
lead figure, two to eight in-body links, three or more FAQ entries, named
sources, an author with a real profile. `toc: true` at four or more H2s.
One primary query; its words in title, description, a heading and a FAQ.

### Glossary entries

`shortDefinition` (40–300 characters) is the product: the quotable answer.
Body adds depth, sources (min 1, schema-enforced), `related` curation. A
question-shaped FAQ from "what is X", "X meaning", "X vs Y" queries.
Definitions are among the most-cited page types; link each entry up into
the money and comparison pages that use the term.

### Tools and calculators

Deterministic code over a sourced data file; a model never generates a
number a reader can check. Prefill via query params. JS-off shows the
formula and a worked example (what answer engines cite). No signup wall: an
assistant cannot vouch for a tool it cannot see working. Built on
converging demand signals and the owner's go-ahead (write-content § 4c).

### Author pages

Name, title, a bio of checkable facts, real `sameAs` profiles, everything
they wrote. The Person node other pages reference by `@id`.

### Pricing page (when the strategy publishes prices)

A real HTML table: plan, price, what is included, contract terms. `Offer`
schema matching the visible table. Stale pricing is the fastest way to lose
a citation already earned; it sits on the 30-day refresh clock.

## 3. The About page — human-readable, machine-readable entity source

(Source: Contact.so, "About Us page SOP", ingested Sep 2026.)

Two jobs at once: a normal About page for a person, and the one first-party
document Google's knowledge graph and the assistants parse when someone
asks "what is <Company>". Without it they stitch third-party snippets.

**Routing.** `/about`, 200, server-rendered (it is). Linked from the global
footer of every page, in the sitemap, in the main nav. Internal links to
the homepage, pricing, the main product or service pages, case studies and
the primary conversion page. No noindex, no canonical elsewhere.

**Eight sections, in order, H1 then H2s:**

1. **Entity definition (H1 "About <Company>").** One declarative sentence,
   the most important on the site, shaped like a Wikipedia first line:
   "<Company> is a <category> that <does what> for <whom>." Then two or
   three factual sentences. Third person. Brand name in the first five
   words. No adjective that is not provable. Every sentence carries a fact
   a machine can lift as a key-value pair. No em dashes on this page.
2. **What <Company> does (H2).** Each service or product as an H3: one
   sentence on what is delivered, one on the outcome. No prose mixing
   services, no nested sub-services, no unquantified claims.
3. **What makes <Company> different (H2).** About five differentiators as
   H3s, one or two sentences each, specific and quantified, competitors
   named ("month-to-month terms, where <Rival> mandates twelve-month
   contracts"). Naming rivals places the company in their competitive set
   in the entity graph, on purpose.
4. **Who uses <Company> (H2).** A taxonomy, not copy: bullet points naming
   exact ICP segments ("B2B SaaS marketing teams at 50 to 200 employees"),
   verticals served, confirmed numbers (customers served, projects
   delivered), notable clients with permission.
5. **The team behind <Company> (H2).** Founder, two-sentence backstory, the
   origin story in two sentences, team composition and locations, a link
   to the founder's LinkedIn (the Person node's `sameAs`).
6. **How <Company> works (H2).** Communication channels, response times,
   who the customer works with, turnaround, onboarding, reported savings.
   For a product: technology and integrations.
7. **Key facts (H2).** An HTML `<table>` or `<dl>`, never an image. Rows:
   Company name · Type · Founded · Founder · Headquarters · Website · Core
   offering · Pricing · Contract terms · Services · Communication · Notable
   clients · Customers served · Projects delivered · Competitors · Social.
   Every value read from `src/data/facts.json` with a source (AGENTS rule
   1). A row the site cannot fill honestly is omitted, never estimated.
8. **Frequently asked questions (H2).** Six H3 questions mirroring what
   people type: What is <Company>? How much does it cost? How is it
   different from <Rival>? Who founded it? What does it offer? The single
   most common objection ("Is it month-to-month?"). Two or three sentences
   each, restating the brand name and one hard fact. Rendered from the one
   `faq` array so the FAQPage schema cannot drift.

**Schema (one JSON-LD block):** Organization (with `founder` as a Person
carrying `sameAs`, `address`, `sameAs` profiles that exist, `contactPoint`),
Service or SoftwareApplication with `offers`, BreadcrumbList, FAQPage whose
`text` matches the on-page answers. `aggregateRating` only from real,
public review data (CHECKLIST § 11).

**Meta.** Title: "About <Company> | <Category> for <ICP>" (≤60).
Description: "<Company> is a <category> that <does what> for <ICP>. Founded
<year> in <city>. <one pricing or contract fact>."

**Pre-publish list.** Every claim is on the owner's approved facts list,
confirmed in writing (ACTIONS A-L13). Competitors named in § 3 and the key
facts. Zero em dashes. No unprovable adjectives, no "unlimited". Founder
name and LinkedIn in the Organization schema. Only active social accounts
listed. Internal links present. Re-confirmed quarterly (ACTIONS A-Q03).

**Not worth building for this page:** an `llms.txt` strategy. The file is
generated here because it costs nothing, but no crawler is known to read
it; the About page is what the assistants read.

## 4. Programmatic page patterns — one structure, many pages

(Source: programmatic SEO playbook, ingested Sep 2026.)

Search demand follows patterns. Where the strategy calls for a layer and
the data exists, one template becomes many pages. Each pattern below names
the demand shape, what wins and the line an assistant lifts. Built only
from real data (a programmatic page with no unique data is what
scaled-content policy penalises); every page still traces to a
`keyword-map.md` row.

| Pattern | Query shape | What it is | The lift line |
|---|---|---|---|
| Best roundups | best <category>, top <tools> | ranked shortlist for a buyer deciding | pick a clear #1 and commit; hedged recommendations are not lifted |
| Head-to-head | <x> vs <y>, <x> alternatives | two tools people are choosing between | "who this is for" per option |
| Persona / use-case | <product> for <audience> | the same product framed for one buyer | the narrower the persona, the closer to a real question word for word |
| Integration | <tool> + <tool> | how two products work together | what surfaces when someone asks "does X work with Y" |
| Free tools / generators | <type> template, <x> generator | something usable immediately | no signup wall; an assistant cannot vouch for what it cannot see |
| Converters | <x> to <y> | a format or unit converter | stack related conversions on one page |
| Example galleries | <type> examples | curated real references | a one-line "why this works" under each |
| Directories | <category> tools | every player in a category | freshness; a stale list is not safe to cite |
| Glossary | what is <term> | plain definition | link definitions up into the high-intent pages |
| Localised | the same set, another language or market | new demand, less competition | localise the intent, not the words; only with localised data (site-blueprint § 1) |
| Stat / benchmark | <industry> statistics, state of <category> | original or aggregated numbers | update on a fixed schedule and date it visibly; the "according to" page |

## 5. The internal link plan

(Source: the eight internal-linking hacks, ingested Sep 2026; the doctrine
is site-blueprint § 3.)

Run at the weekly cadence and on every new piece:

1. **Search Console first.** Pages with impressions; per page, the queries
   it appears for (`pageQueries`); the 28-day comparison for pages losing
   visibility.
2. **Group by topic and the reader's question**, not by keyword overlap.
3. **Pick the pillar** per topic: the broad guide that links out to every
   spoke and back.
4. **Pick the money page** per topic: where a visitor buys, books or
   starts. Find the passage in each pillar and spoke where that next step
   fits.
5. **Support posts** link to the next question, to their pillar, and to
   the money page where the product fits the task.
6. **Boost pages at position 11–20** for a relevant query: find articles
   that already discuss the task and add a contextual link, with the exact
   sentence and anchor. Record the query's starting position and the date.
7. **Footer** carries the money pages and the pillars, short labels,
   consistent.
8. **Vary the anchor** to fit each sentence; never the identical anchor to
   two destinations (`check:links` fails it); the same wording for the
   same target is fine.

The shape: support ↔ support → money / pillar · support → pillar ·
money ↔ money · pillar ↔ pillar · pillar → money. Assess each direction on
its own. For every proposed link: source URL, destination URL, existing
sentence, proposed sentence, anchor, the reader's reason to click. Keep the
list of applied changes; skip existing links on the next run; compare
search performance with the same filters four weeks later.

## Log

| Date | Change |
|---|---|
| 2026-09-27 | Created from the ingested playbooks (see `marketing/playbook-intake.md`); `npm run audit:pages` scores § 1. |
