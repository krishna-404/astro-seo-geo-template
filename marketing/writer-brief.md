# Writer brief

The working instructions for anyone — human or agent — producing content for
this site. Read `STRATEGY.md` first (it wins every disagreement), then
`VOICE-GUIDE.md`, then this.

## What you will write, and to what spec

<!-- TODO per site: formats and lengths. A sensible default: -->

| Format | Length | Notes |
|---|---|---|
| Guide / blog post | 1,200–2,300 words | one primary query per piece |
| Glossary entry | 300–800 words | `shortDefinition` is the product; the body adds depth |
| News piece | 700–1,100 words | only from a news-log event with primary sources |

## Sources are half the job

Every rule, rate, number, name and date traces to a primary source or a named
secondary one, listed in the piece's `sources` frontmatter (it renders — it is
part of the product). If a claim cannot be sourced, write the principle
without the number, or mark it `[VERIFY]` and hold the piece. A held piece
costs a cycle; a wrong number costs the site's standing.

## Before you write anything new

1. `marketing/content-inventory.md` — does this piece already exist? New
   pieces extend clusters; they do not duplicate them.
2. `npm run insights` — what does the searcher actually type? Titles and
   headings carry the query's own words.
3. `marketing/field-notes.md` and `marketing/news-log.md` — what is the
   proprietary claim? A piece with nothing only this site can say does not
   run this week.

## Review gates

1. `npm run check:voice` green (mechanical rules), then the VOICE-GUIDE § 6
   ship checklist by hand — a clean script run is not a pass.
2. `npm run check:links` green — the piece is linked into the site (2+
   in-body outbound, at least one inbound from a related page).
3. Dates: never the same `published` date as another piece; batches are
   spread forward across the coming weeks (check-source-rules enforces).
4. A human reads the PR before merge. Nothing auto-publishes.

## After publish

Re-run the OG cards if titles changed, and request indexing in Search Console
for the new URLs — `npm run insights -- --inspect` prints the day's shortlist.
IndexNow submission happens automatically on deploy.
