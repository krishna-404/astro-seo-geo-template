# Keyword map

<!-- TODO: built and maintained by the /keyword-map skill, then owned by a human.
     One row per PAGE (not per keyword — aliases and secondary queries share a
     row with their primary). Every page the site builds should trace to a row
     here; every priority query should trace to a page (live or planned).
     See marketing/site-blueprint.md for the intent→page-type rule and the
     page-type taxonomy. STRATEGY.md wins any conflict. -->

Generated/updated: <!-- date -->

## How to read this

The row shape, the status ladder, the intent classes and what counts as
evidence are defined once in **`/keyword-map § 3`**, which is also what writes
and maintains this file. This header does not repeat them; it used to, and the
two drifted.

## High-intent — the buyer's queries, worked first

<!-- The rows from the latest snapshot's `searchConsole.highIntent` block
     (★ = watch-list term in src/data/intent.json), ranked by impressions then
     position. /keyword-map § 3 says what belongs here and why these rows are
     worked before any informational cluster. The one rule that lives in this
     file: a term added here is added to intent.json → watch with its page, in
     the same commit. -->

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
