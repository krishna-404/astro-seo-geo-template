# Brief — TODO site name

<!-- TODO: filled by /discover before anything is decided. This file is the
     answer to "what is this site for, and what do we have to build it
     with". STRATEGY.md deepens the reader and the argument; design-brief.md
     the look; keyword-map.md the pages. This file is what those read first.
     Every TODO left here is a question the owner has not answered yet — it
     belongs in DATA-SHEET.md with an id, not here as a blank. -->

## 1. Why now, and what success is

<!-- TODO: the trigger in one sentence, and the one measurable outcome
     ninety days after launch (e.g. "twelve qualified enquiries a month
     through the form"). /insights-review reports against this line. -->

## 2. The one job

<!-- TODO: the single primary action a visitor takes, and what happens
     after it: who receives it, on which channel, how fast they answer. -->

## 3. The business, in three sentences

<!-- TODO: what is sold, to whom, what the buyer stops suffering. The short
     version — STRATEGY.md § 1–4 carries the depth. -->

## 4. Who is involved

| Role | Name | Notes |
|---|---|---|
| Signs off | TODO | |
| Has opinions | TODO | when they arrive, what they care about |
| Maintains after launch | TODO | hours a week — sets the honest cadence |

## 5. What exists today

- Existing site: TODO (URL, what works, what embarrasses, analytics and
  Search Console access: have / needed).
- Brand guidelines: TODO (fixed parts vs negotiable).
- Copy and collateral received: TODO (list, and where each was filed).
- Content worth migrating: TODO.

## 6. Markets and constraints

- Markets and languages, in order: TODO.
- Regulated or reviewed claims: TODO (who reviews, how long it takes).
- Currency, units, date format: TODO.
- Launch date, if fixed: TODO.

## 7. The category — names for /landscape

| Name | Relationship | Why they matter |
|---|---|---|
| TODO | lose deals to / compared with / admire / never be mistaken for | |

## 8. Taste

| Site | Admire or dislike | Specifically what |
|---|---|---|
| TODO | | the register, a pattern, a tone — the reason, not the URL |

## 9. Off-limits

<!-- TODO: customers not to name, numbers not to publish, geographies not
     served, promises the product cannot keep. These become voice.json
     bannedClaims and STRATEGY.md § 7. -->

## 10. The pages the owner expects

<!-- TODO: the owner's list, untested. /keyword-map tests it against
     site-blueprint § 1 and records what changed and why. -->

## Asset register

Status: **have** (path recorded) · **needed** (DATA-SHEET id) · **none**
(what the site does instead). No blank rows, no placeholders standing in
for an asset that is merely late.

| Asset | Status | Path or DATA-SHEET id | Notes |
|---|---|---|---|
| Logo — SVG master, mono, on-dark, square mark, clear-space rules | TODO | | |
| Brand colours — hex, primary, fixed or negotiable | TODO | | may the accent be darkened to pass AA? |
| Fonts — woff2 or a licence allowing subsetting, ≤2 weights each | TODO | | `font-src 'self'` — no hosted fonts |
| Brand guidelines document | TODO | | |
| Product screenshots or product access (1440 px) | TODO | | |
| Photography — founder, team, premises, product in use; rights confirmed | TODO | | |
| Illustration / video | TODO | | |
| Copy and collateral — brochures, decks, sales scripts, support FAQs | TODO | | |
| Proof — logos, testimonials, case studies, certifications, with permission | TODO | | |
| Numbers with sources | TODO | | → `src/data/facts.json` |
| Legal identity — legal name, address, ids, founding date, canonical spelling | TODO | | |
| People — founder and authors, titles, bios, LinkedIn | TODO | | → `src/data/authors.json` |
| Contact channels and who answers each | TODO | | |
| Social and entity profiles — existing and missing | TODO | | missing → `link-targets.md` |
| Domain, DNS, Cloudflare, analytics, Search Console, Bing, GitHub — access held by whom | TODO | | never the credentials |
| Existing site crawl / sitemap / URLs that must keep working | TODO | | → § Migration |
| Pricing — published or not, model, what may be shown | TODO | | |

## Migration

<!-- Only when an existing site is being replaced. Every URL that has
     traffic, inbound links or is printed on things maps to its new home;
     the map becomes worker/index.ts → PERMANENT_REDIRECTS plus the matching
     wrangler.jsonc run_worker_first entries (check-parity fails one without
     the other). -->

| Old URL | New URL | Why it must keep working |
|---|---|---|
| TODO | | |

## Log

| Date | Change |
|---|---|
| <!-- YYYY-MM-DD --> | Created from the template. Fill with /discover. |
