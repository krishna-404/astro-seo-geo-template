# Writer brief

The working instructions for anyone — human or agent — producing content for
this site. Read `STRATEGY.md` first (it wins every disagreement), then
`VOICE-GUIDE.md`, then `content-guidelines.md` (how every piece is written)
and `page-guidelines.md` (what each page type contains), then this. Every
prompt that produces content ends with: Remove all mannered prose.

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
2b. `npm run audit:pages -- --page <route>` after a build: the citation
   checklist, with the first fix named. New pieces clear 70.
2c. The piece's social posts are in `marketing/social-queue.md`.
3. `published` is the real day the piece goes live; several on one day
   are fine, never backdated (no post caps since 20 Sep 2026).
4. Who merges and who deploys is the merge model in `marketing/STRATEGY.md
   § 9`; the default commits to `main` and deploys on a green battery.

## After publish

Re-run the OG cards if titles changed, and request indexing in Search Console
for the new URLs — `npm run insights -- --inspect` prints the day's shortlist.
`/ship` submits the sitemap to IndexNow after every deploy.
