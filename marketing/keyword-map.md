# Keyword map

<!-- TODO: built and maintained by the /keyword-map skill, then owned by a human.
     One row per PAGE (not per keyword — aliases and secondary queries share a
     row with their primary). Every page the site builds should trace to a row
     here; every priority query should trace to a page (live or planned).
     See marketing/site-blueprint.md for the intent→page-type rule and the
     page-type taxonomy. STRATEGY.md wins any conflict. -->

Generated/updated: <!-- date -->

## How to read this

- **status**: `mapped` (planned, no page yet) → `drafting` → `live` → `ranking`
  (position ≤20 with impressions) → `won` (position ≤10 with clicks).
- **intent**: informational · commercial-investigation · transactional ·
  navigational — decides the page type.
- **evidence**: impressions/position from `npm run insights`, or `social sweep` /
  `cluster head` / `competitor gap` for queries not yet earning impressions.

## High-intent — the buyer's queries, worked first

<!-- Every transactional or commercial query with impressions — the
     `searchConsole.highIntent` block of the latest snapshot (★ = watch-list
     term in src/data/intent.json) — has a row here, ranked by impressions
     then position, with the money page that claims it and the supporting
     pieces planned or published for it. A query is high-intent when a buyer
     choosing would type it: "software", "system", "tool", "pricing", "vs",
     "calculator". These rows are worked before any informational cluster
     (content-cadence step 2). Keep intent.json → watch in step with this
     section: a term added here is added there with its page, same commit. -->

| Query (★ = watch list) | Impr · position | Page Google shows | Claiming page | Status | Supporting pieces |
|---|---|---|---|---|---|
| <!-- e.g. "<category> software" --> | <!-- 15 · 65 --> | <!-- /solutions/x --> | <!-- /solutions/x --> | ok / wrong-page / unmapped | <!-- planned or live URLs --> |

## The map, by cluster

<!-- One section per cluster from STRATEGY.md. Example row shape: -->

### <cluster name>

| Primary query (+ aliases) | Intent | Page type | Target URL | Status | Evidence |
|---|---|---|---|---|---|
| <!-- e.g. "demurrage meaning" (define demurrage, what is demurrage) --> | informational | glossary | /glossary/demurrage | live | 226 impr · pos ~79 |

## Backlog — gaps to close, funnel-ladder order

<!-- Produced by /keyword-map step 4. Ranked: uncaptured demand first, then
     lopsided clusters, missing page types, interlinking debt. Each item names
     the query, page type, cluster, and the fuel a piece would need. -->

1. <!-- TODO -->
