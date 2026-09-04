---
name: keyword-map
description: Turn keyword research into a deliberate site architecture — research the queries the ICP searches, classify each by intent, map it to the page type that answers it, and maintain marketing/keyword-map.md plus a ranked build backlog. Use when planning what pages a site needs, when the user asks for keyword research or a content plan, or at the cadence's site-audit pass.
---

# Map keywords to pages

The difference between "write some blog posts" and a site that wins is this map.
Every page the site will ever build should trace to a query in
`marketing/keyword-map.md`, and every priority query should trace to a page (live
or planned). This skill builds and maintains that map. Read
`marketing/site-blueprint.md` first — it defines the page-type taxonomy and the
intent→page-type rule this skill applies; `STRATEGY.md` wins any conflict.

## 1. Gather the query universe

Pull queries from evidence, never invention:

- `npm run insights -- --json` (add `--inspect` when Search Console is
  configured): the queries the site *already* earns impressions for, with their
  positions. These are the highest-confidence entries — real demand, measured.
- `marketing/news-log.md` ICP social sweep: the exact phrasing the ICP uses for a
  problem (voice of customer), harvested from where they post.
- Competitors' ranking pages and the "People also ask" / related-search boxes for
  the head terms in each cluster.
- `STRATEGY.md` clusters: for each declared cluster, the head term and the
  question family around it.

Take the audience's own words. Never invent phrasing a keyword tool would surface
but no human says.

## 2. Classify each query by intent, then assign a page type

Intent decides the page type (site-blueprint § 1). Get this wrong and the page
ranks for nothing or converts nobody:

| Intent | Signals in the query | Page type |
|---|---|---|
| Informational | "what is", "how to", "meaning", "guide", "checklist" | glossary / guide / problem page |
| Commercial-investigation | "best", "top", "vs", "alternative to", "for <segment>" | comparison / use-case / industry page |
| Transactional | "software", "tool", "pricing", "buy", "hire", "calculator" | money page / pricing / tool |
| Navigational | a brand or product name | the page they already want |

One page = one primary query = one intent. If two queries share intent and would
answer identically, they are one page (list the second as an alias), never two
pages competing.

## 3. Write the map

`marketing/keyword-map.md` is a living table, grouped by cluster. Each row:

`primary query | intent | cluster | page type | target URL | status | evidence`

- **target URL**: the live page, or the planned slug if it does not exist yet.
- **status**: `mapped` (planned, no page) → `drafting` → `live` → `ranking`
  (position ≤20 with impressions) → `won` (position ≤10 with clicks).
- **evidence**: impressions/position from insights, or "social sweep" / "cluster
  head" / "competitor gap" for queries not yet earning impressions.

Keep aliases and secondary queries on the same row as their primary — the map is
one row per page, not one row per keyword.

## 4. Find the gaps — the backlog

The map's value is what it reveals is missing. Produce a ranked backlog, ordered
by the funnel ladder (site-blueprint § 4 — convert, then CTR, then impressions):

1. **Uncaptured demand**: a query with impressions (from insights) and no page
   mapped to it — a page waiting to be built. Highest priority; the demand is
   already proving itself.
2. **Lopsided clusters**: a cluster with a pillar and no spokes, or spokes and no
   pillar (site-blueprint § 3). Fill toward a complete cluster.
3. **Missing page types**: a page type the strategy calls for that does not exist
   yet (no comparison pages while prospects search "vs"; no use-case page for a
   named segment).
4. **Interlinking debt**: a mapped `live` page that no *indexed* page links to on
   its target anchor — it will not rank until it is linked (site-blueprint § 3).

Each backlog item names the query, the page type, the cluster, and what fuel a
piece would need (site-blueprint / the fuel rule). Do not schedule building an
empty layer just to look complete — a page ships only with a real query and the
data to answer it.

## 5. Deliver

The map and backlog are documentation, so they land as a PR of their own (or ride
the cadence PR): the updated `marketing/keyword-map.md`, and the backlog either in
the PR body or appended to the map under a "Backlog" heading. /write-content reads
this map to pick its next targets; /content-cadence's audit pass re-runs steps 1
and 4 to keep it current. Nothing here publishes a page — it decides which pages
are worth building.
