# HANDOFF — the approved work, in enough detail for a fresh session

**Written 27 Sep 2026 at the end of the session that produced PR #14.** That
session's context was near its limit; this file is the plan a new session
executes. Read it top to bottom before touching anything, then
`marketing/audit-2026-09-27.md` (the audit the decisions came from) and
`AGENTS.md` (the standing rules). Every prompt that writes prose here ends
with: Remove all mannered prose.

## 0. Where things stand

- **PR #14 is merged into `main`** (squash, `25a869eb`, 27 Sep 2026). It
  carried: the playbooks and guidelines in `marketing/`, `ACTIONS.md` +
  `scripts/actions.mjs`, `scripts/page-audit.mjs`, the quick-win / BOFU /
  competitor blocks in `scripts/lib/intent.mjs` + `scripts/lib/pageText.mjs`,
  `/ingest-playbook` and `/launch`, the stale-text sweep, the audit, and the
  audit's clear-cut fixes (audit § 1–2). The branch
  `claude/funny-ramanujan-tu03it` is finished; delete it or leave it.
- **Delivery model the owner chose:** work directly on `main`, push to `main`
  when a stream is done. `npm run verify` green before every push (the
  pre-push hook runs it). No pull requests are needed for this work; the
  owner reviews `main`.
- **Environment this was run in** (a claude.ai cloud session): `GSC_SA_KEY`,
  `CLOUDFLARE_READ_ANALYTICS`, `UMAMI_URL`, `UMAMI_WEBSITE_ID`,
  `CADENCE_REPORT_TOKEN`, `CLOUDFLARE_DEPLOY_TOKEN` are set;
  `CLOUDFLARE_ZONE_ID` and `BING_WEBMASTER_API_KEY` are not. `origin.mjs`
  is still `example.com`, so `npm run insights` exits early and the live
  smoke self-skips; nothing here deploys the template itself. `.env.example`
  lists every variable.
- `npm ci` activates the git hooks. `npm run verify` takes ~55 s and is
  green on `main` (15 steps). `node --version` is 22.
- Commit messages end with the session's attribution lines (the harness
  supplies them); never put a model identifier in a commit, a comment or a
  doc.

## 1. The eleven decisions (owner's answers, 27 Sep 2026)

| # | Decision | Answer |
|---|---|---|
| 1 | Shared script libraries + one collections config (audit O2/O3) | **Yes, full** |
| 2 | One scorer per question: fold `discovery-audit` into `lib/aeo` (O1) | **Yes** |
| 3 | Tests (M1) | **Yes, `node --test`, wired into pre-commit** |
| 4 | Cut the IndexNow race machinery (O4) and the custom zip reader (O5) | **Cut both** |
| 5 | Money-page scaffold + comparison layout (M2) | **Scaffold both** |
| 6 | About page rebuilt to the entity spec, Key Facts in facts.json (M3), homepage FAQ to the shared component (M4) | **Rebuild now** |
| 7 | Doc consolidation (O12, audit § 5) | **All three passes** |
| 8 | Twin routes through the worker | **Keep**; note the free-tier threshold in CHECKLIST |
| 9 | GitHub Actions push trigger | **No.** Instead: *"when a daily routine runs here on claude, it should automatically deploy and also update indexnow & bing with the recent changes."* The cadence run deploys itself (§ 5 below). Actions stay opt-in. |
| 10 | lastmod drift: fail or note | Owner: *"Everything should be deployed immediately, so why would there be a drift. Decide yourself."* Decision: **keep drift a note, and make every deploy path regenerate `lastmod`, the inventory and the OG cards before it builds** (§ 5), so the committed map is never behind at deploy time. |
| 11 | Delivery | *"Merge the present PR to main and then update changes there and push to main once done."* Done for #14; the rest lands on `main`. |

Also standing from that session: **nothing from an outside playbook is
adopted blindly** (AGENTS § Content rules; `/ingest-playbook` § 3: evidence,
policy, fit, works). The same bar applies to every recommendation below —
verify against the file before acting on a line number, and prove each new
check red once.

## 2. Working agreement

- Work on `main`. One stream at a time on the branch, or streams in
  parallel in git worktrees (A and B are disjoint enough; C and D come after
  A and B are merged). Merge worktree branches locally into `main`; never
  push a branch other than `main`.
- Before each push: `npm run verify` green on the exact tree; every new
  check proven red once (break the thing, watch it fail, restore) and
  recorded in `CHECKLIST.md § 9` with its one-line WHY (AGENTS rule 18).
- Regenerated files are committed (`src/data/lastmod.json`,
  `marketing/content-inventory.md`, `public/og/*`, `public/llms*.txt`,
  `worker/csp.generated.json`). OG cards need
  `npm i --no-save playwright` then `node marketing/og/render-pages.mjs`
  after a build, then a second build.
- Strike each audit row as it lands (`marketing/audit-2026-09-27.md`: add a
  Log line and mark the § 3/§ 4 row done) and move the decision into
  `CHECKLIST.md` with its reason.
- Conflict hotspots when streams run in parallel: `src/data/collections.json`
  (A creates it, B adds two collections), `src/content.config.ts` (B),
  `package.json` (A), `CHECKLIST.md` (all), `AGENTS.md` (C, D),
  `.claude/skills/content-cadence/SKILL.md` (A for `audit:discovery`
  removal, C for self-deploy, D for trimming). Give each stream only its
  section; resolve at merge.

## 3. Stream A — scripts: shared libraries, one config, one scorer, tests

### A1. `src/data/collections.json` — the one collections config

Create it (plain JSON, imported by the worker and every script; Astro
templates may import it too):

```json
{
  "$comment": "The one list of content collections. Every script that needs the collection list, its route directory, whether a markdown twin is served, or the eyebrow on its social card reads THIS file; worker/index.ts derives TWIN_PREFIXES from it. Adding a collection: one entry here + the zod schema in src/content.config.ts + a route file (check-collection-routes fails without it).",
  "collections": {
    "blog":     { "route": "/blog",     "twins": true, "eyebrow": "Blog",     "schema": "BlogPosting" },
    "glossary": { "route": "/glossary", "twins": true, "eyebrow": "Glossary", "schema": "DefinedTerm" }
  }
}
```

Stream B adds `solutions` and `comparison` (route `/solutions`, `/vs`).

Replace every hard-coded collection list with a read of this file:
`scripts/markdown-twins.mjs` (`COLLECTIONS`), `scripts/generate-llms.mjs`
(`COLLECTIONS`), `scripts/lastmod.mjs` (`COLLECTIONS`),
`scripts/check-content-images.mjs`, `scripts/check-invariants.mjs` (three
places: the orphan check's `['blog','glossary']`, the twin-presence check,
the collection-index check), `scripts/smoke-live.mjs`, `marketing/og/
render-pages.mjs` (`EYEBROW`), `src/lib/lastmod.ts`, `worker/index.ts`
(`TWIN_PREFIXES`). `check-link-graph`, `content-inventory` and
`check-collection-routes` discover collections from `src/content/` today;
switch them to the config too (the config is the contract; a folder with
no config entry is a finding). Their `ROUTE_DIR = {}` locals go away.

`wrangler.jsonc → run_worker_first` cannot import JSON, so **one parity
rule stays**: every `twins: true` collection has `<route>/*` in
`run_worker_first` and vice versa. Rewrite `check-parity` rule 2 to derive
the expectation from `collections.json` instead of regex-parsing
`worker/index.ts` and `markdown-twins.mjs`.

### A2. `src/data/redirects.json` — permanent redirects out of TS

```json
{
  "$comment": "Permanent (301) redirects the worker serves. Each key must also be in wrangler.jsonc → run_worker_first (check-parity). One-line reason per row. Empty until a site needs one.",
  "redirects": {}
}
```

Shape when filled: `"/old-path": { "to": "/new-path", "reason": "folded into the guide, 2026-10-01" }`.
`worker/index.ts` imports it (drop `PERMANENT_REDIRECTS`); `check-parity`
rule 5, `smoke-worker.mjs` and `smoke-live.mjs` read the JSON instead of
regex-parsing the TS. Update AGENTS "When you change… a URL that must keep
working" and PLAYBOOK § 3 to name the JSON.

### A3. Shared libraries

- `scripts/lib/html.mjs`: `walkHtml(dir)` (every `.html` under `dist/`),
  `routeOf(file)` (dist file → route, `index` → `/`), `decode(text)` (one
  entity decoder, numeric + hex + the five named), `strip(html)` (scripts
  and styles removed, tags removed, whitespace collapsed), `ldNodes(html)`
  (every JSON-LD node, `@graph` flattened, parse errors swallowed —
  `check-invariants` reports those separately). Replace the copies in
  `check-invariants` (walk, two decodes, `ldNodes`, two inline JSON-LD
  parses), `check-source-rules` (`walk`, `walkContent`), `check-voice`,
  `page-audit`, `generate-csp`, `check-a11y` (`pages()`), `check-contrast`
  (`pages()`), `render-pages`, `actions.mjs` (the placeholder walk stays
  its own: it walks source, not dist).
- `scripts/lib/content.mjs` (or extend `scripts/lib/readContent.mjs`):
  `readEntry(file)` → `{ slug, collection, route, data (YAML-parsed),
  body, raw, status }` with `status ∈ draft | scheduled | published`
  from `src/data/publishing.mjs`; `readCollection(name, { include })`
  where `include` defaults to `published` and callers opt in to
  `scheduled`/`draft`. **Replace the six regex frontmatter parsers**:
  `pageText.mjs`, `check-voice.mjs` (`prosify` keeps its prose-field
  extraction but takes parsed data), `content-inventory.mjs` (`fmField`),
  `check-link-graph.mjs`, `check-source-rules.mjs` (four places),
  `check-collection-routes.mjs`. Each check then chooses its status set
  **explicitly** (this is the drift the audit found — today
  `/^draft:\s*true$/m` treats a scheduled post as live in four checks and
  not in three):
  - link graph: scheduled entries are nodes (a link to one is not dead)
    and still need an inbound link; drafts excluded.
  - voice, source rules: check published + scheduled (they are queued to
    go live); drafts excluded.
  - inventory: list all three with the status column.
  - twins, llms, lastmod, sitemap: published only (unchanged).
- `scripts/lib/routes.mjs`: `collections()` (the config), `routeFor(file)`,
  `fileFor(route)` (content and `src/pages/*.astro`), `staticRoutes()`.
  Replace the seven route↔file mappers: `pageText.sourceFor`,
  `src/lib/lastmod.ts sourceCandidates` (TS: keep a thin copy that reads
  the JSON), `lastmod.mjs discoverPages` (currently one level deep — the
  new walker must recurse), `check-link-graph`, `content-inventory`,
  `check-collection-routes`, `indexnow changedRoutes` (deleted in A5).
- `scripts/lib/snapshots.mjs`: `newestSnapshot()` (returns `{ date,
  data }` or null), `panelRuns()` (dates from `## Run YYYY-MM-DD` in
  `marketing/ai-panel.md`), `dataSheet()` (`{ open, answered, questions }`
  — move `parseQuestions` here from `data-sheet.mjs`), `linkTargets()`
  (`{ rows, todo, live }` — move `parseTargets` here). Replace the copies
  in `aeo.mjs`, `page-audit.mjs`, `actions.mjs`, `data-sheet.mjs`,
  `discovery-audit.mjs` (before it is folded).
- Remove now-internal `export`s the audit listed: `pageText` (`norm`,
  `sourceFor`, `textOf` — unless tests import them; tests may), `genai`
  (`readZip` goes; keep `parseCsv`, `isPromptShaped` exported for tests),
  `intent` (keep the ones tests use), `crawlers.CRAWLERS`
  (`smoke-live.mjs` has its own `CRAWLERS` — make smoke-live use the
  registry's `ROBOTS_AGENTS` or a shared export instead of a second list),
  `posts.ts` exports (keep for tests).

### A4. Fold `discovery-audit.mjs` into `lib/aeo.mjs`

- `aeoReport()` gains a `levers` array (off-site, informational, never in
  the stage mean): **Third-party listings and entity anchors** (from
  `linkTargets()`), **AI answer share-of-voice (prompt panel)** (from
  `panelRuns()`), **Owner-supplied facts (data sheet)** (from
  `dataSheet()`), **Bing verified** (regex on `site.ts`, already used by
  stage 3), **Machine identity (Organization completeness)** (keep — it
  reads the built homepage's Organization node for `legalName`, `address`,
  `foundingDate`, `founder`, `sameAs`, which the invariants do NOT
  require), **Commercial coverage** (money pages live vs
  `intent.json → watch` pages; the route regex becomes
  `/^\/(solutions|vs)\/.+|-calculator$/`, read from `collections.json`
  where possible). Drop the levers the invariants already gate (crawler
  access, extractable schema, author E-E-A-T, content shape, citation
  density, ItemList, image alt, machine brief, social cards) and the
  duplicated funnel stages (crawl, GenAI, referrals — they ARE stages 2, 4,
  5). `aeoMarkdown` prints the levers table under the stages.
- Delete `scripts/discovery-audit.mjs` and the `audit:discovery` npm
  script. Grep and rewrite every reference (`audit:discovery`,
  `discovery-audit`, "discovery scorecard", "twenty levers"): AGENTS
  § Content rules (Generative AI bullet), SETUP Phase 4 (two places),
  PLAYBOOK § 5, CHECKLIST § 9 (the informational-scorecard bullet becomes
  the record of the fold, with the WHY: two formulas for one stage gave two
  numbers), `.claude/skills/content-cadence` step 17(d) and § The report,
  `.claude/skills/new-site` phase 9, `.claude/skills/insights-review`,
  `marketing/runbook.md` W10, `marketing/ai-panel.md`, `README.md`,
  `marketing/page-guidelines.md` (Video mention), `marketing/audit-2026-09-27.md`.
- `npm run aeo` needs `dist/` only for the Organization lever; print
  "n/a — build first" for that lever when `dist/` is absent, never exit 2.

### A5. `scripts/indexnow.mjs` — cut the race machinery, add Bing

- Keep: read the **live** sitemap (index + children, like
  `insights.sitemapUrls`), key discovery (`public/<key>.txt` or
  `INDEXNOW_KEY`), `--min-urls` (refuse to submit a suspiciously short
  list), one POST to `https://api.indexnow.org/indexnow` with the full
  list (IndexNow fans out to Bing, Yandex, Seznam, Naver).
- Delete: `--changed` and `changedRoutes()`, `--expect`, the key-file and
  sitemap polling loops, every comment about CI firing on push. Fix the
  usage header.
- Add **Bing URL Submission** when `BING_WEBMASTER_API_KEY` is set:
  `POST https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlBatch?apikey=<key>`
  with `{ "siteUrl": "https://<host>", "urlList": [...] }` and
  `Content-Type: application/json; charset=utf-8`. Bing's daily quota is
  per site and small for a new site, so submit only URLs whose sitemap
  `<lastmod>` is within the last 2 days, capped at 100, newest first; on
  any non-2xx print the body and continue (IndexNow already reached Bing).
  Print what was submitted where. This is the "update indexnow & bing"
  the owner asked for; `/ship` and the cadence call it after every deploy.
- `.github/workflows/indexnow.yml`: keep manual dispatch; remove the
  commented `workflow_run` block and the `--changed` comments.
- Update CHECKLIST § 7 (IndexNow bullet), PLAYBOOK § 7, SETUP Phase 4
  (Bing key now also drives submission), `.env.example`, ACTIONS A-K04
  (**Why** gains "and URL submission after every deploy").

### A6. `scripts/lib/genai.mjs` — drop the zip reader

- Delete `readZip` and the data-descriptor scan. `readGenAiExports`
  accepts a folder of CSVs; when it finds a `.zip`, extract it with the
  system `unzip -o -d <same name without .zip>` (it exists in the cloud
  session; check `which unzip`, and if absent print the one-line ask "unzip
  the export into a folder of the same name"). `parseCsv` stays.
- Update `marketing/insights/genai/README.md` step 4 (zip or folder, both
  fine; the script unzips) and content-cadence step 17(g).
- Fix the header's "Since June 2026" if it reappears (it now says
  31 Aug 2026, matching the README).

### A7. Tests — `node --test`, wired into pre-commit

- `scripts/**/*.test.mjs` next to the module (`scripts/lib/intent.test.mjs`
  …). `npm test` → `node --test scripts/`. Add `npm test` to
  `.githooks/pre-commit` (after `check-source-rules`) and as a `verify.mjs`
  step. Zero dependencies.
- Cases, minimum: `intent.playbookBlocks` (the synthetic rows in the
  session's smoke test: quick win `words` vs `missing`, BOFU labels,
  competitor expansion with an empty and a filled list, navigational
  exclusion); `intent.bofuLabel` for each shape; `genai.parseCsv`
  (quoted fields, doubled quotes, CRLF, BOM); `genai.isPromptShaped`;
  `aeo.aeoReport` (a stage with no data scores `null` and is excluded
  from the mean; a refused agent caps stage 1 at 40; proxy stage 4 caps at
  60); `crawlers.classify` (ordering, `token: true` entries never match a
  UA); `posts.ts validatePost` (the five schema-valid `proprietary` values
  pass, an unknown one fails; a title the clamp would hard-cut fails;
  fewer than two in-body links fails) and `toMdx` (frontmatter round-trips
  through the YAML reader); `actions.mjs evaluate` (each check kind on a
  fixture tree: `manual:N` with a fresh and a stale date, `env`,
  `fresh`, `entries`, `panel`, `securitytxt` 31 vs 29 days, `indexnow`,
  `social`); `pageText.saysPhrase` (`phrase` / `words` / `missing`);
  `check-source-rules` clamp rule (60 chars, em-dash clause inside the
  budget, hard cut) — extract the rule into `src/lib/clampTitle.ts`'s
  plain-ESM twin or a shared `scripts/lib/clamp.mjs` so the test and the
  three copies (source-rules, `posts.ts survivesClamp`, `clampTitle.ts`)
  share one implementation. `posts.ts` is TypeScript: test it through
  `wrangler`'s esbuild? Simpler: move `validatePost`/`toMdx`/`slugify` into
  `worker/posts-rules.mjs` (plain ESM, imported by `posts.ts`) so `node
  --test` reaches them. Refactor `actions.mjs` so `evaluate` is importable
  (guard the CLI body with `if (import.meta.url === pathToFileURL(process.argv[1]).href)`).
- CHECKLIST § 9: one bullet. WHY: the enum drift that broke every API post
  would have been a ten-line test.

### A8. Smaller script items (all from the audit; verify each line first)

- `verify.mjs`: remove step 7's duplicate `astro check` + `check:worker`
  (`npm run build` runs both); keep `npm run lint` as its own step; keep
  `ensureAll`. Update its header ("ci.yml mirrors this").
- `report-html.mjs`: delete `--text` mode and its comment; the Apps Script
  takes `htmlBody`.
- `check-contrast.mjs` + `check-a11y.mjs`: one Playwright pass serving
  `dist/` once, two rule sets (optional; do it if the shared `html.mjs`
  makes it a small change).
- `worker/posts.ts`: mirror the fields it lacks (`toc`, `primaryKeyword`,
  `secondaryKeywords`, `canonical`, `ogImage`, `draft`); add
  `via: z.string().optional()` to the blog schema so `via: posts-api`
  survives zod (the cadence's PR inbox identifies API posts by it); the
  description band stays 70–165 (the invariant's band, not the schema's
  50–200 — or tighten the schema to 70–165 and 60 for `title`, which
  `check-source-rules` already enforces; tightening the schema is the
  better fix: one number, one place). Fix the section numbering comment
  in `worker/index.ts` (header says 1–7, code runs 1, 1b, 2, 5, 3, 6, 4).
- `check-invariants.mjs`: the orphaned "worker falls back to HTML" comment
  above `ldNodes` belongs to the twin check.
- `lib/genai.mjs`: `usize` read then `void`ed — remove with the zip
  reader. `favicon.mjs`: static-import `statSync`.
- `purge-cache.mjs`: the header's "lives here so the two cannot drift"
  sentence makes no sense — rewrite; it needs `CLOUDFLARE_ZONE_ID` because
  the deploy token may lack `Zone:Read` (say so). `wrangler.jsonc`: the
  `/api/*` comment omits the posts API.
- `content-inventory.mjs`: include `/author/<slug>` pages (walk
  `src/data/authors.json`) in the static-pages table.
- `actions.mjs`: `env:` kind gains an alternative form `env:A+B|C`
  (A and B, or C) so A-K03 can check the Umami token or the login pair;
  use `lib/snapshots.mjs`.
- npm entries: `test`, `smoke:live` (`node scripts/smoke-live.mjs`), `og`
  (`node marketing/og/render.mjs`), `og:pages` (`node marketing/og/render-pages.mjs`),
  `favicon` (`node marketing/favicon.mjs`). Update `marketing/README.md`.
- Undeclared dependencies: `report-html.mjs` imports `unified`,
  `remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-stringify` and
  `favicon.mjs` imports `sharp`, all resolved transitively through Astro
  or `--no-save`. Decide: add the five remark/rehype packages as
  devDependencies at the versions Astro's lockfile already holds (safer),
  and record in CHECKLIST § 10 (the dev-dependency policy bullet).
- `.githooks/pre-push`, `lastmod.mjs`, `generate-csp.mjs`, `check-a11y.mjs`
  comments were corrected on #14; re-grep for "CI " / "ci.yml" after A4
  and A5 for any that reappear.
- Dead CSS in `src/styles/global.css` (`.band--blue`, `.grid--2`, `.stat*`,
  `.bento__full`) is **kept**: it is the expressive layer `/design-direction`
  draws on. Add one comment line above each saying so.

### A9. CHECKLIST § 9 / § 10 entries for stream A

One bullet per new check or removed mechanism, each with its WHY: the
collections config (WHY: eleven hand-kept lists, one of which — the draft
regex — disagreed with `isPublished`), the redirects JSON (WHY: three regex
parsers of one TS map), the tests, the scorer fold, the IndexNow
simplification plus Bing submission, the zip reader's removal. Strike the
matching rows in `marketing/audit-2026-09-27.md § 4` and add a Log line.

## 4. Stream B — src: money pages, comparison pages, the About page

### B1. `solutions` collection (money pages)

- `src/content.config.ts`: `solutions` with `...seo` plus
  `primaryKeyword: z.string()` (**required** here), `offering: z.string()`
  (what the customer gets, one line — the Key Facts "Core offering" row),
  `schemaType: z.enum(['Service','Product','SoftwareApplication'])`,
  `pricing: z.object({ model: z.enum(['published','on-request','free']),
  from: z.number().optional(), currency: z.string().default('USD'),
  note: z.string().optional() })`, `process: z.array(z.object({ step,
  detail })).default([])` (how it is delivered — site-blueprint § 1 says
  money pages carry process), `outcomes: z.array(z.string()).default([])`,
  `cta: z.object({ label: z.string(), href: z.string() })` (the one
  primary action), `sources` (min 1 when any number is stated — enforce in
  `check-source-rules`: a `solutions` entry whose body or `pricing.from`
  carries a digit needs a source). `figures` as everywhere.
- Route `src/pages/solutions/[...slug].astro`: h1 = title, `tldr`, the
  offering in one sentence, outcomes as a list, the process as a `steps`
  figure or numbered list, a **comparison table** bucket D placeholder
  only when the entry supplies `compare` rows (do not scaffold empty
  tables), FAQ via `<Faq />` (group `solutions:<slug>`), the CTA as
  `.btn btn--primary` with `data-umami-event="cta-<slug>"` and
  `data-umami-event-place="solution"`, `Breadcrumbs`, related links across
  collections, `data-pagefind-body` on the article, chrome
  `data-pagefind-ignore`. JSON-LD: the `schemaType` node with `offers`
  (only when `pricing.model === 'published'`), `provider` → `#organization`,
  `FAQPage` via `faqPageNode`, `BreadcrumbList`. No index page (nav links
  money pages directly; an empty index would be an indexable empty page).
- `src/content/solutions/.gitkeep` (ships empty). `check-collection-routes`
  requires the route; `getStaticPaths` with zero entries builds nothing.
- `src/data/collections.json`: `"solutions": { "route": "/solutions",
  "twins": true, "eyebrow": "Solutions", "schema": "Service" }`.
- `src/data/intent.json → claimFrom`: `[{ "collection": "solutions",
  "route": "/solutions" }, { "collection": "comparison", "route": "/vs" }]`.
- `.vscode/frontmatter.code-snippets`: a `solution` snippet.
- `wrangler.jsonc → run_worker_first`: add `/solutions/*` and `/vs/*`
  (twins) — parity rule 2 (stream A's version) demands it.

### B2. `comparison` collection (`/vs/<rival>`, "alternatives")

- Schema: `...seo`, `primaryKeyword` required, `us: z.string()` (our
  product's name as compared), `rivals: z.array(z.object({ name, url:
  z.url(), pricingUrl: z.url().optional() })).min(1)`, `rows:
  z.array(z.object({ criterion: z.string(), us: z.string(), them:
  z.array(z.string()) (one per rival, same order), source: z.url(),
  retrieved: z.coerce.date() })).min(3)` — **every cell verified: source
  and retrieved are required, schema-enforced** (site-blueprint § 1: "the
  one page class that generates a letter"), `bestFor: z.array(z.object({
  option: z.string(), audience: z.string() })).min(2)` (the "who this is
  for" per option — the line an assistant lifts), `verdict: z.string()`
  (never "best for everyone"), `updated: z.coerce.date()` **required**
  (page-audit's 30-day clock applies: add `comparison` to the
  30-day set in `page-audit.mjs`), `sources` min 1.
- Route `src/pages/vs/[...slug].astro`: h1, `tldr`, the table in a
  `.table-scroll` with `tabindex="0" role="region"` and a specific
  `aria-label` ("<us> compared with <rivals>"), each row showing the
  criterion, our cell, each rival's cell, and a "checked <date>" column;
  a `compare` figure as the lead figure (auto-derived from the first six
  rows if the entry declares none — extend `src/lib/figures.ts`), the
  best-for list, the verdict, FAQ, CTA to the matching solution, the
  sources block with every row's source deduplicated. JSON-LD:
  `Article` with `about` naming both entities, `FAQPage`, `BreadcrumbList`.
- `src/content/comparison/.gitkeep`; `collections.json`:
  `"comparison": { "route": "/vs", "twins": true, "eyebrow": "Compared", "schema": "Article" }`.
- `check-source-rules`: a comparison row whose `retrieved` is older than
  90 days fails (a stale verified cell is a false claim). Prove red.
- `.vscode` snippet `comparison`.

### B3. The About page to the entity spec (`marketing/page-guidelines.md § 3`)

- `src/data/facts.json → company` gains the Key Facts keys, each
  `{ "value": "TODO", "source": "TODO" }`: `legalName`, `type`
  (category phrase), `founded` (year), `headquarters`
  (`{ city, region, country }`), `coreOffering`, `pricing` (one line),
  `contractTerms`, `services` (array), `communication` (channels and
  response time), `notableClients` (array, each with `permission: true`
  required before render), `customersServed` (number), `projectsDelivered`
  (number), `competitors` (array of names — keep in step with
  `intent.json → competitors`; a `check-parity` rule that they match is
  cheap), `social` (array of URLs that exist). Keep `founder` as is.
- `src/pages/about.astro` rebuilt: H1 "About <SITE.name>"; § 1 the entity
  sentence built from `facts.company` (`<name> is a <type> that
  <coreOffering> for <ICP>`) in the third person, brand name in the first
  five words, plus two or three factual sentences; § 2 "What <name> does"
  with each service as an H3 (from `services`, two sentences each — the
  copy lives in `facts.json` or in a new `src/data/about.json`; pick one
  and say so in CHECKLIST); § 3 "What makes <name> different" (five H3s,
  rivals named); § 4 "Who uses <name>" (ICP segments as bullets, the
  numbers from `facts.json` only); § 5 "The team behind <name>" (from
  `authors.json`, founder LinkedIn); § 6 "How <name> works"
  (communication, response time, onboarding); § 7 **Key Facts as an HTML
  `<table>`** in a `.table-scroll` region, one row per key above, **a row
  omitted when its value is still TODO** (never a placeholder claim);
  § 8 six FAQs via `<Faq groupName="about" />` from a `faq` array in
  `about.json`. Zero em dashes on the page (add the page to a
  `check-source-rules` rule: no `—` in `src/pages/about.astro`; prove red).
  Internal links: home, each solution, `/contact`, the primary CTA
  measured (`data-umami-event="cta-contact"`, place `about`). Schema:
  `AboutPage` (`mainEntity` → `#organization`), `FAQPage`,
  `BreadcrumbList`; the site-wide `Organization` node in `BaseLayout`
  gains `legalName`, `foundingDate`, `address`, `sameAs` from the new
  keys **only when they are not TODO** (JSON-LD entity hygiene invariant
  forbids empty strings). Meta: title `About <name> | <type> for <ICP>`
  (≤60), description per the spec.
- Placeholder discipline: the new `TODO`s are meant to be caught by the
  SETUP grep and by ACTIONS A-L02/A-L04/A-L13; that is correct behaviour.
- Homepage: replace the hand-built FAQ `<details>` and the hand-built
  FAQPage node in `src/pages/index.astro` with `<Faq groupName="home" />`
  and `faqPageNode(faq)` (`src/lib/faqSchema.ts`). The visible ↔ schema
  invariant and the FAQ click event then hold on the homepage too.
- OG cards: `/about`'s title changes → re-render cards, rebuild, commit.
- Docs touched by B (keep minimal; stream D consolidates): CHECKLIST § 1
  (the two collections, the config), § 6 (About page + Key Facts), SETUP
  Phase 1 (facts keys, about page), `marketing/page-guidelines.md` § 2/§ 3
  pointers to the route files, `.claude/skills/new-site` phases 6 and 10,
  `.claude/skills/write-content` § 2 (money page = `solutions` entry,
  comparison = `comparison` entry), `marketing/keyword-map.md` header
  example paths, `marketing/audit-2026-09-27.md` rows M2/M3/M4 struck.

## 5. Stream C — the cadence deploys itself (the owner's answer to decision 9)

The owner: *"when a daily routine runs here on claude, it should
automatically deploy and also update indexnow & bing with the recent
changes."* And on drift: *"Everything should be deployed immediately."*

- **`marketing/STRATEGY.md § 9 Merge model`** (added on #14 as a TODO with
  "PR review" as the default): the template's default becomes
  **"commit to main, deploy on green"**: the cadence run commits its work
  to `main` after `npm run verify` is green, then runs the ship steps
  itself. Keep "PR review" as the documented alternative for a site whose
  owner wants to read before publish. Write the choice line as
  `Merge model: commit-to-main (default) · decided 2026-09-27`.
- **`.claude/skills/content-cadence/SKILL.md`**: step 8 (Housekeeping)
  becomes: `npm run lastmod` · `npm run inventory` · build · re-render OG
  cards **if any title or description changed** (`git diff --name-only`
  over `src/content` and `src/pages`) · second build · `npm run verify`.
  Step 9 (Deliver) becomes: commit to `main` with the run's summary as the
  message · push · **deploy** (the `/ship` steps 3–7: build is already
  done, `wrangler deploy` with `CLOUDFLARE_DEPLOY_TOKEN`, purge with
  `CLOUDFLARE_ZONE_ID`, `npm run indexnow` — IndexNow plus the Bing URL
  submission from A5 —, `node scripts/smoke-live.mjs`). Guards: never
  when `origin.mjs` is `example.com`; never on a red battery; never when
  `CLOUDFLARE_DEPLOY_TOKEN` is missing (then fall back to the PR path and
  say so in the report — and ACTIONS A-K06 names the missing key). The
  PR inbox (step 1b): API posts that clear the bar are merged and shipped
  by the run; the ones it declines are named with the reason. Step 7
  (Release): a future-dated post whose day has come is released by this
  run's deploy — no human step. The report's first line: the deploy
  version id, the URLs submitted to IndexNow and Bing, the live smoke
  result. **Do this today** loses "merge the PRs" and keeps request
  indexing (still no API), the social queue, the export.
- **`.claude/skills/ship/SKILL.md`**: add step 2b "regenerate `lastmod`,
  the inventory and the OG cards, commit" before the build (the drift
  decision), step 6 gains the Bing submission, and a note that the daily
  run calls these same steps unattended.
- **`marketing/ACTIONS.md`**: A-D02 becomes "Read the deploy line in the
  report; only a PR the run declined needs your hands" (`manual:2` stays);
  A-K06's **How** gains `CLOUDFLARE_ZONE_ID`; A-K04's **Why** gains URL
  submission; A-L15's Routine prompt unchanged; add to the Keys intro:
  "with these five set, the run deploys itself".
- **`marketing/runbook.md`**: D13 → "build, verify, commit to main,
  deploy, IndexNow + Bing, live smoke" (owner: machine); D15 ("Merge and
  ship", human) becomes "Read the deploy line; act only on declined PRs";
  D16 unchanged; the § What the engine delivers list gains "deployed the
  same day".
- **Every "a human merges, nothing auto-publishes" sentence** (eleven
  places — AGENTS § Content rules ×2, SETUP Phase 5 ×2, CHECKLIST § 2,
  content-cadence ×2, write-content § 6, writer-brief review gate 4,
  site-blueprint § 7, new-site phase 13, runbook D3) becomes one pointer:
  "the merge model in STRATEGY.md § 9 decides; the default deploys on a
  green battery". This is the first thing stream D's PR 1 does, so C and
  D overlap here — do C's sentence changes inside D's first pass.
- **SETUP Phase 5 step 3** (the Routine): the environment needs the five
  keys plus `CLOUDFLARE_ZONE_ID` and `BING_WEBMASTER_API_KEY`; say the run
  deploys itself and what it will not do without each key.
- **PLAYBOOK § 2** scheduled posts: "the daily run's deploy releases it".
- GitHub Actions stay opt-in; `ci.yml`'s header already says so.
- CHECKLIST § 2: replace the "PR review default" wording in the posts-API
  bullet; add the decision bullet: **the cadence deploys itself** (WHY:
  the owner's instruction; the battery is the gate either way; a run that
  waits for a human to merge leaves scheduled posts unreleased).

## 6. Stream D — the doc consolidation (three passes, each pushed green)

Principle: a rule is stated once in the file that owns it and cited
everywhere else with a pointer. Owners (audit § 5):

| Rule | Owner (only full statement) |
|---|---|
| Fuel rule | `marketing/content-guidelines.md § 2` |
| Funnel ladder | `marketing/STRATEGY.md § 5` |
| High-intent first, quick wins, BOFU | `src/data/intent.json` `$comment` + `scripts/lib/intent.mjs` header |
| Generative AI export | `marketing/insights/genai/README.md` |
| A question, not an estimate; batching up to four per `AskUserQuestion` | `marketing/DATA-SHEET.md` header |
| Request-indexing shortlist | `scripts/insights.mjs` + ACTIONS A-D01 |
| No number typed into markup | AGENTS rule 1 |
| Merge model / who deploys | `marketing/STRATEGY.md § 9` |
| Remove all mannered prose (definition) | `src/data/voice.json → prompt` |
| AEO funnel, actions check kinds, data-sheet format, page-audit checks | the script headers |
| Every human action | `marketing/ACTIONS.md` |
| Daily/weekly/monthly items | `marketing/runbook.md` |

**Pass 1 — AGENTS + PLAYBOOK + the merge-model sentences (stream C).**
AGENTS § Content rules: each of the long bullets (high-intent, banned
claims, Generative AI, AEO funnel, posts API, decisions against references,
figures, question-not-estimate, fuel rule) becomes one or two lines and a
pointer; the enforced subset stays as it is; the new bullets from #14
(standing line, ACTIONS, social queue, ingest) stay but shrink. PLAYBOOK
§ 1 and § 2 point at CHECKLIST § 1–3 and keep only the diagram and the
two-build rule; § 5 keeps the measurement traps and points at SETUP Phase 4
for the setup; § 10 and § 11 are cut to the squash-merge lesson (`/ship`
cites it) and the "read the whole output / test the failure path" lessons
(two lines each). Fix the five doc-map preambles (README, AGENTS,
CHECKLIST, PLAYBOOK, SETUP) to one identical paragraph. Target: AGENTS
≈2,400 words (from 3,900), PLAYBOOK ≈2,300 (from 3,800).

**Pass 2 — content-cadence trimmed by about a third, insights-review
reconciled.** Remove the three intro essays (lines ~28–67: high-intent,
Generative AI, AEO — they restate the script headers); step 2e and step 17
keep only what insights-review does not (the "cited pages stay cited"
rule, the export ask); step 12 points at write-content § 4c; step 13d
points at page-guidelines § 5; step 15 points at runbook W8/W11. Reconcile
the "what runs first" order in one sentence at the top: **sequence** is
step 0 actions → 1 measure → 1b PR inbox → 2 high-intent; **priority for
what to work** is a stage-1 edge blocker above everything, then
high-intent, then the rest; insights-review § 3 adopts the same order
(today it ranks Generative AI 0a above high-intent 0). BOFU pace is "one
page at a time, four weeks each" everywhere. The TL;DR spec is "one to
three sentences, ≤400 characters" everywhere (site-blueprint § 5 still
says "40–60 words, 2–4 bullets"; content-cadence 2e(2) says "one
sentence"). In-body links "2–5, never more than 8" everywhere. Target:
content-cadence ≈3,700 words (from 5,650).

**Pass 3 — site-blueprint, CHECKLIST § 9, keyword-map, the setup skills.**
site-blueprint § 4 → pointer to STRATEGY § 5; § 5 → pointers to
content-guidelines § 1 and page-guidelines § 1 (delete the conflicting
numbers); § 6 → pointer to VOICE-GUIDE § 3 rules 10–12; "Where each rule
is enforced" → "CHECKLIST § 9". CHECKLIST § 9: one line per check with its
WHY, no retelling of workflow steps; the dev-dependency policy stated once
(it is at two places, ~338 and ~421); AGENTS rules 2, 5, 14 not repeated;
§ 10's operating-model bullets (actions, data sheet) point at AGENTS; the
narrative asides (~282 the OG-card story, ~486 the `--orange` token story,
~619 the bash-trap aside, ~668 and ~672 the audit stories) cut to the rule
plus one clause. `marketing/keyword-map.md`'s header stops copying the
keyword-map skill § 3. Skills: new-site's phase text becomes the exit
condition plus the skill it calls; its "three rules" stay only in
new-site and the other skills cite them (discover ~15–37,
onboard-marketing ~8–25, landscape ~106–112, design-direction ~108–117,
launch, ingest-playbook); discover and onboard-marketing stop asking the
same four questions (business in three sentences, off-limits vs
guardrails, expected pages vs page-type plan, category names) — discover
asks, onboard-marketing deepens; the admired-sites and gallery lists live
once (design-direction) and new-site/onboard-marketing cite them; the
tools split (input-driven vs reference-data) lives once (write-content
§ 4c); write-content § 7's figure table lists all eight kinds (done on
#14) and AGENTS/CHECKLIST cite it; the "ancestor site" narrative lines
(AGENTS ~304, write-content ~171, design-direction ~153–155) go.
Contradictions to settle in this pass: weekend runs (Routine prompt says
weekdays; content-cadence now says "a site that schedules weekend runs");
the fuel rule in `interview` (~8–9 reads as a gate — say "add-on");
`content-guidelines § 2` vs `writer-brief` fuel lists (writer-brief points
at content-guidelines); trailing-slash 307 everywhere; the snippet-test
threshold ("≤10, ≥50 impressions, near-zero clicks") everywhere.

**Missing docs (audit M7–M9), do in pass 3:** README gains a
**Glossary of this repo's terms** (fuel, funnel ladder / rung 2b,
enforcement ladder, answer-engine funnel / focus stage, BOFU, quick wins,
watch list, `claimFrom`, money page, coverage layers, twins, battery, PR
inbox, merge model, Decisions, daily-lite / weekly-full, standing line,
the ancestor site) and a **Start here** paragraph (run `/new-site`;
SETUP.md is where each value lives; renumber new-site's phases to SETUP's
or drop SETUP's phase numbers — pick one). `CHANGELOG.md` at the root,
one line per merged PR, starting with #5–#14. `marketing/runbook.md`
gains a "Your ten minutes today" header (the human rows only, with time
estimates) and a weekend line. `marketing/README.md` indexes the engine
files (the ~22 marketing documents) in one table.

## 7. Verification protocol (every stream)

1. Fast tier: `node scripts/check-parity.mjs && node scripts/check-source-rules.mjs && node scripts/check-voice.mjs && node scripts/check-link-graph.mjs && node scripts/content-inventory.mjs --check && node scripts/check-collection-routes.mjs && npx eslint . && npm run check:worker` (plus `npm test` once A7 lands).
2. `npm run verify` (builds; ~55 s). If OG cards changed: `npm i --no-save playwright && node marketing/og/render-pages.mjs && npm run build` first, commit the cards.
3. Prove each new check red once; paste the red line into the commit message.
4. `npm run actions` still parses (the ACTIONS format is load-bearing); `npm run ask` prints both blocks.
5. `npm run audit:pages` runs on the built site; `npm run aeo` runs with no `dist/` and with one.
6. `npm run smoke:worker` covers the new twin routes (add `/solutions` and `/vs` negotiation to `smoke-worker.mjs` and `smoke-live.mjs` once entries exist; with zero entries the routes 404 — assert the 404 is the styled 404, not a worker error).
7. Push `main`; the pre-push hook runs the battery again.

## 8. Order and parallelism

1. **A** and **B** in parallel (two worktrees off `main`): A owns
   `scripts/`, `worker/`, `package.json`, `.githooks/`, `.github/`,
   `src/data/collections.json` (creates), `src/data/redirects.json`,
   `src/lib/lastmod.ts`; B owns `src/content.config.ts`, `src/pages/`,
   `src/components/`, `src/data/facts.json`, `src/data/intent.json`,
   `src/data/about.json`, `public/og/`, `.vscode/`. Both may append to
   `CHECKLIST.md` (A: § 9/§ 10; B: § 1/§ 6) and `marketing/audit-2026-09-27.md`
   (Log lines). B adds its two entries to `collections.json` (create it
   with the shape in A1 if A has not merged yet; resolve at merge).
2. Merge A, then B, into `main`; run the protocol; push.
3. **C + D pass 1** together (they touch the same sentences); push.
4. **D pass 2**; push. **D pass 3**; push.
5. Final: strike every audit row, add the CHECKLIST decision bullets,
   update `CHANGELOG.md`, run `npm run ask` and paste its output into the
   final message so the owner sees what is theirs.

## 9. Findings from the three audit scans not yet acted on (verify each against the file; lines were taken at commit `2162851`/`2294be5` and have moved)

**Scripts scan.** Exports used only in their own file (see A3). Dead
fields: `intent.watchList` (gone with the fold), `discovery-audit`'s
non-array authors fallback and `a?.linkedin`, its dist re-walk and
`withOwn.length + 1` fudge (all gone with the fold). `astro.config.mjs`
`/draft/` filter: no such route (remove the entry from `NOINDEX_ROUTES`
logic if it reappears). Duplicates beyond A3: `band()` in `aeo` and
`discovery-audit` (fold); `norm()` in `pageText`, `intent`, `page-audit`
(one export in `pageText` or `html.mjs`); "strip `https://SITE`" repeated
in `insights.mjs` (four places), `genai`, `intent` (one helper);
`shownOn` map built twice in `intent.mjs` (`highIntentReport` and
`playbookBlocks` — build once, pass in); git-date lookup in `lastmod.mjs`
vs `src/lib/lastmod.ts`; brand name/tagline copied in `generate-llms.mjs`,
`render-pages.mjs`, `site.ts` (a `src/data/brand.json` that `site.ts`
imports and the node scripts read removes two of the three "EDIT FOR YOUR
SITE" knobs — do it if cheap; update `marketing/README.md` and SETUP
Phase 1 accordingly); brand colour in `favicon.mjs` and `og/page.html`;
`site.ts` read by regex in `check-invariants` (two places) and the fold;
IndexNow key detection differs between `indexnow.mjs` (8–128 chars,
`INDEXNOW_KEY`) and `actions.mjs` (32 hex, no env) — align `actions.mjs`
to the script's rule; sitemap reading: `insights` follows the index,
`indexnow`, `smoke-live`, `check-lastmod` read `sitemap-0.xml` only (use
one `sitemapUrls()` in `html.mjs` or `routes.mjs`). `ci.yml` header still
says "Every PR gets the full check battery; main additionally deploys"
before the OPT-IN paragraph — rewrite the header; its deploy job comments
(~147–205) describe a job that cannot fire on dispatch — say so in one
line. `indexnow.mjs` header omits `--changed` (moot after A5).
`smoke-live.mjs` has no npm entry (A8). `render-pages.mjs`'s portrait
branch (`<img src="/_astro/founder…">`) is dead — remove it or ship the
photo path (B3 decides: no photo pipeline; remove the branch).

**src scan.** `src/components/LiveData.astro` is opt-in and unused
(keep; it is documented). `SHEETS` export in `site.ts` unused (remove;
the worker reads the JSON). `src/lib/founderPhoto.ts`: keep, comment
fixed on #14. Content schema: `aliases` go only into JSON-LD
`alternateName` (render them visibly on the glossary page — "also called
…" — so the schema never claims a name a visitor cannot see);
`tags` render as plain spans with no tag pages (fine; say so in
CHECKLIST § 6 or drop `tags`); `proprietary` is a closed enum while the
docs say it "names the fuel" — add `fuel: z.string().optional()` (the
field-note id / news-log date / finding) next to the enum and make
write-content fill it; no `ogImageAlt` field although BaseLayout wants
one for a custom `ogImage` — add it to `seo`; glossary has no published
date (its Article node has only `dateModified` — acceptable; say so); two
founder identities (`#author-<slug>` on the author page vs `#founder`
elsewhere, and the founder's name/LinkedIn duplicated in `facts.json` and
`authors.json`) — make the author page use `#founder` when the slug is
the founder's and have `facts.company.founder` read from `authors.json`
(one record); `jobTitle: 'Founder'` hard-coded in BaseLayout → from
`authors.json`. Schema vs CI: tighten `description` to 70–165 and `title`
to 60 in the schema (A8). `public/_headers`: the `/_astro/*`, `/*.woff2`,
`/*.webp`, `/*.jpeg` rules are dormant (keep, they are for assets a site
will add) and the explicit `/og/*`, favicon and apple-touch blocks repeat
the extension rules (collapse them). `_redirects` (all comments) vs
`PERMANENT_REDIRECTS`: after A2 there is one redirect mechanism; make
`_redirects` a comment that points at `redirects.json` or delete it.
`figureSchema.ts` example fact path `time.deskHoursPerContainerBreakdown`
is an ancestor leftover — replace with a neutral example.
`worker/index.ts` `/api/data/*` always 404s with `tabs {}` (fine; it is
the opt-in sheets channel). The `via: posts-api` key (A8).

**Docs scan.** Everything in § 6 above, plus: `PLAYBOOK.md:3-7` (the
66-traps intro) and CHECKLIST `:71` (nginx line, fixed) are narrative;
`voice.json prompt.$comment` names skills that must quote the line (all
do now — re-verify after D); `discover`'s description now says "as
/new-site phase 1" and `discover:173-174` still says "/new-site from
Phase 3" — reconcile; `ai-panel.md` logs oldest-first on purpose (keep,
say why in one line); `content-cadence:488` `npm run ask -- --markdown`
was replaced by two direct commands (keep it that way, or make `ask` a
small script that accepts the flag — the latter is cleaner:
`scripts/ask.mjs` that runs both modules and passes `--markdown` through;
then `npm run ask -- --markdown` works and the skill can say so).

## 10. Do not

- Do not re-adopt the refused playbook moves (`marketing/playbook-intake.md`):
  paid or seeded listicle placement, Google Docs/Sites link pages, staged
  forum questions, near-duplicate page variations, undisclosed
  amplification, a rented clip network, "up to 12 articles" quotas.
- Do not restore the GitHub Actions push trigger (decision 9); do not move
  the twins to static files (decision 8); do not add hosted web fonts, web
  storage, client JS beyond `/search`, self-written ratings, doorway
  pages, a CMS, Tailwind (CHECKLIST § 11).
- Do not fabricate: no number without a source, no customer, no panel run,
  no export. A Key Facts row without a value is omitted, not filled.
- Do not make drift fail (decision 10); regenerate before every deploy
  instead.
- Do not leave a decision only in chat: every one lands in CHECKLIST with
  its reason, and this file is struck line by line as the work lands.
