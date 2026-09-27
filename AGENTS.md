# AGENTS.md — standing rules for working in a site built from this template

**Six documents, six jobs.** `README.md` — the quickstart, and the glossary of
this repo's terms. `SETUP.md` — the ordered walkthrough a NEW site starts
with: every per-site value, in dependency order, before any content work.
`AGENTS.md` — the standing rules for anyone, human or agent, editing the repo.
`CHECKLIST.md` — every architectural decision already made, with its reason.
`PLAYBOOK.md` — the order of work, the operating knowledge and the traps.
`marketing/` — the operating layer the content engine runs on;
`marketing/README.md` indexes it. **Update the document that owns a rule in the
same commit as the change** — a setting nobody wrote down is indistinguishable
from a setting nobody made.

**Before you push: `npm run verify`** — the full CI battery locally (the
pre-push hook runs it for you; hooks install automatically via `npm install`).
The pre-commit hook runs the fast source tier. Most rules below are
mechanized (parity checks, source bans, invariants, worker smoke) — a rule
being checked is not a reason to ignore it here; the prose carries the WHY.

## The rules that get broken by hand (CI catches most, not all)

1. **No number or claim is typed into markup.** Everything published lives in
   `src/data/facts.json` with a `source` field, or comes from a Google Sheet
   snapshot in `src/data/sheets/`. Need a number that isn't there? Add it with
   a source or leave a visible TODO — never estimate.
2. **Mobile-first CSS, always.** The unprefixed rule is the phone rule;
   `min-width` queries add tablet and desktop. Touch targets ≥44px. No
   horizontal body scroll at any width — wide tables go in `.table-scroll`
   (markdown tables are wrapped automatically with region semantics; don't
   hand-wrap those, don't remove the rehype plugin). A hand-authored
   `.table-scroll` in an `.astro` file carries `tabindex="0" role="region"`
   and a specific `aria-label` — CI checks every wrapper for the trio.
3. **Every CTA is measured, whichever analytics vendor is active.** Any
   `.btn`, `tel:` or `mailto:` link carries `data-umami-event` (the event
   name) and `data-umami-event-place` (the surface it sits on). CI fails on
   unmeasured CTAs. Umami binds the attributes natively; the consent banner
   forwards them to GA4 when that vendor is enabled. Never add a per-vendor
   tracking snippet to a component.
4. **Analytics: cookieless is the default and a protected property.** Umami
   needs no consent banner because it sets no cookies and stores nothing on
   the device. Enabling ANY cookie-setting vendor (GA4 included) requires the
   consent banner, which OWNS that vendor's tag — `BaseLayout` must never
   emit it, or the banner is decoration. Update `/privacy-policy`'s data
   (`src/data/privacy.json`) in the SAME commit as any vendor change.
   Reverse-IP **company** identification (Leadfeeder-class tools) is a
   different legal class from person-level tracking — less contested, but the
   vendor still sets a cookie: gate it behind the same consent review as any
   vendor, and leave its person-level form tracking off unless decided on
   purpose.
5. **Never use localStorage or sessionStorage.** Repo-wide ban. The consent
   decision is a cookie; attribution is honestly last-touch because
   first-touch would need storage.
6. **Colour is measured, not eyeballed.** Use the tokens in
   `src/styles/global.css`; never a hex literal in a component. Every token
   that carries or sits behind text must clear WCAG AA on every band
   background — `npm run check:contrast` sweeps every built page and runs in
   CI. **Design is chosen, not inherited**: the expressive layer in
   `global.css` (fluid `--step-*` type scale, `--font-display`, the inverted
   `.band--ink`, `.bento`, `.rail`, `.reveal`) is how a site gets its own look
   inside those constraints; `/design-direction` decides it and
   `marketing/design-brief.md` records it. Borrow composition, type and
   rhythm from the best sites — never their WebGL or their JavaScript.
7. **One `<h1>` per page.** Templates render the frontmatter `title` as the
   h1 — MDX bodies start at `##`.
8. **noindex and the sitemap must agree.** A page excluded from one is
   excluded from the other (see the filter in `astro.config.mjs`).
9. **Generated files are never hand-edited**: `public/llms.txt`,
   `public/llms-full.txt`, `src/data/lastmod.json`, `src/data/sheets/*.json`,
   favicons, OG cards. Regenerate via their scripts.
10. **Astro traps that cost debugging rounds** (inherited, still true):
    scoped CSS does not reach a child component's root — wrap the child in a
    plain element and style that; a dropped newline before an inline element
    glues words together — use explicit `{' '}`; `<script>` in a component
    needs `is:inline` to stay inline; optional assets via `import.meta.glob`,
    never a plain import; build-time file checks resolve from
    `process.cwd()`, never `import.meta.url`. **A DELETED content entry
    survives in the content data store** (`node_modules/.astro/data-store.json`,
    and `.astro/`): delete a file and the next local build still emits its
    page, with no twin and no social card. `check-invariants` says so loudly
    rather than letting it ship, and CI never sees it (a fresh `npm ci` has no
    store), but locally the fix is `rm -rf node_modules/.astro .astro dist`
    before rebuilding — not more debugging of a page whose source is gone.
11. **URL format is locked**: extensionless, no trailing slash.
    `build.format: 'file'` (Astro) and `html_handling:
    "drop-trailing-slash"` (wrangler.jsonc) must change together or not at
    all.
12. **The worker route list is a cost lever.** Only routes in
    `wrangler.jsonc → run_worker_first` invoke the worker (metered);
    everything else serves free. Adding a route there needs a reason.
13. **Three inherited traps that recur** (each cost a debugging round): an
    `aria-label` on a link or button whose visible content is a labelled
    image must match or contain the visible text, or voice-control users
    cannot activate it — prefer making the image decorative and letting the
    visible text be the accessible name. The LCP image loads **eagerly**
    with `fetchpriority="high"`, never lazy — lazy-loading the LCP element
    makes the page measurably slower. Hero sizing uses `dvh` with `svh`
    then `vh` fallbacks stacked before it — never plain `vh` alone, or a
    collapsing mobile URL bar leaves a gap.
14. **Motion is opt-in via media query, never opted out of.** Disclosure and
    entry animation use the modern-CSS toolkit — `@starting-style`,
    `transition-behavior: allow-discrete`, `interpolate-size:
    allow-keywords`, `::details-content` transitions — and every such rule
    lives INSIDE `@media (prefers-reduced-motion: no-preference)`. Reduced
    motion is the absence of rules, not an override block. (The global
    `prefers-reduced-motion: reduce` clamp in global.css stays as
    belt-and-braces.) No motion requires JavaScript.
15. **External links that open new tabs announce it.** Default is same-tab.
    If you use `target="_blank"`, the link needs `rel` containing `noopener`
    and an accessible name that says so — visible text or an `.sr-only`
    "(opens in new tab)". CI fails any `target="_blank"` without both.
16. **Decorative layers are inert.** Any purely decorative
    absolutely-positioned element carries `aria-hidden="true"` AND
    `pointer-events: none` — the standard causes of swallowed clicks and
    screen readers announcing empty boxes.
17. **`/search` is the only page allowed page-level JS**, and it is the
    pattern to copy if that ever changes: interaction-gated dynamic import
    (zero bytes until the visitor engages), additive (JS-off shows a
    working page with an honest notice), result styles limited to token
    pairs the contrast sweep already measures elsewhere. New indexable
    content sections need `data-pagefind-body` on the article and
    `data-pagefind-ignore` on their chrome.

18. **Found a digression from the architecture or these rules? Fix it AND
    mechanize it — but only if it is architecture-level.** The bar: could
    the same defect recur on another page, component, or config without
    anyone noticing? If yes — a rule class ("every page must…", "these two
    configs must agree", "this generated surface must cover…") — add a
    check at the cheapest rung that can see it:
    - source/config level → `scripts/check-parity.mjs` or
      `scripts/check-source-rules.mjs` (these run at pre-commit — keep them
      fast, no build, no network)
    - built output → `scripts/check-invariants.mjs`
    - worker behavior → `scripts/smoke-worker.mjs`
    - visible only at the live edge → `scripts/smoke-live.mjs`
    Then prove the check works by breaking the thing once and watching it go
    red before restoring (a check that has never failed has never been
    tested), and record it in CHECKLIST §9 with its one-line WHY — the WHY
    is what stops a future editor from deleting a check whose defect they
    have never seen.
    If no — a typo, one page's copy, a single wrong link — just fix it. A
    check that guards one page is noise: it dilutes the battery, slows every
    run, and teaches people that failures are usually somebody else's
    special case.

## Content rules

Each rule below is **stated in full in the file that owns it**; the line here
is the rule and where it lives. Where the two differ, the owner wins. The
shape of the whole site — page taxonomy, keyword-research→content mapping,
interlinking doctrine, conversion, the AEO/GEO levers — is
`marketing/site-blueprint.md`; `STRATEGY.md` is this site's instance of it and
wins any conflict.

| Rule | Stated in full in |
|---|---|
| **Every prompt that writes content ends with "Remove all mannered prose."** A skill that drafts, rewrites, retitles, summarises or answers without it is a bug | `src/data/voice.json → prompt`; `marketing/content-guidelines.md § 0` explains it |
| How a piece is written | `marketing/content-guidelines.md` |
| What each page type contains; `npm run audit:pages` scores it, new pieces clear 70 | `marketing/page-guidelines.md` |
| The fuel rule — field notes are an add-on, never a gate | `marketing/content-guidelines.md § 2` |
| The funnel ladder | `marketing/STRATEGY.md § 5` |
| High-intent first; keep `intent.json → watch` and `keyword-map.md § High-intent` in step, same commit | `src/data/intent.json` `$comment` + `scripts/lib/intent.mjs` header |
| Who merges and who deploys | `marketing/STRATEGY.md § 9` |
| A question, never an estimate — asked in the session with `AskUserQuestion`, four at a time, concrete options | `marketing/DATA-SHEET.md` header; listings in `marketing/link-targets.md`; `npm run ask` prints both |
| Every human action and its check | `marketing/ACTIONS.md` |
| The AEO/GEO funnel; work the stage it names, not the lowest number | `scripts/lib/aeo.mjs` header; agents in `scripts/lib/crawlers.mjs` |
| The Generative AI export — a cited page is strengthened and linked, never rewritten | `marketing/insights/genai/README.md`; the panel is `marketing/ai-panel.md`, never fabricated |
| The request-indexing shortlist — no API exists, so it is always a human's hands | `scripts/insights.mjs` + ACTIONS A-D01 |
| Daily, weekly, monthly and quarterly items | `marketing/runbook.md` |

Three more that own themselves:

- **Decisions are made against current references, never from memory.**
  Before a decision on positioning, design, voice, schema, consent or
  infrastructure reaches the owner, fetch what the best sites and the current
  guidance do today and show three to five concrete examples with a reading of
  each (`/new-site` § The three rules). The category is read first by
  `/landscape` into `marketing/landscape.md`. Record the examples with the
  decision, in the file that owns it.
- **An outside playbook goes through /ingest-playbook**, never straight into a
  file: evidence, policy, fit and works; sorted into adopted / trial /
  refused; routed to the file that owns it; recorded in
  `marketing/playbook-intake.md` with the verdict and the reason. A trick that
  reportedly worked for its author is not evidence; a mechanism and a
  measurement are.
- **A launch runs from `marketing/launch-playbook.md`** (/launch), after every
  launch action in ACTIONS.md verifies.

**The enforced subset** — these fail a check, so they are stated here too:

- Every page traces to a query in `marketing/keyword-map.md` (one page = one
  primary query = one intent), and every priority query to a page there, live
  or planned. A money page declares its query in frontmatter
  (`primaryKeyword`, `secondaryKeywords`) and its collection is listed in
  `src/data/intent.json → claimFrom`.
- **A claim the site may not make is a regex, not a reminder.** `voice.json →
  site.bannedClaims` lists the assertions of fact this site must never make;
  `check-source-rules` fails any page that says one. State a figure flat and
  unattributed; omit what cannot be asserted. Match the CLAIM, not the verb
  the last edit used.
- Blog posts carry a named human author from `src/data/authors.json` (the
  byline links to `/author/<slug>`, the verifiable credential behind the name;
  a guest gets their own entry with a real profile, never a borrowed one), a
  `proprietary` field naming what an LLM could not have produced, `sources` on
  anything factual, and a `tldr` that front-loads the answer — the GEO lever
  with evidence behind it, alongside citations, quotes and statistics. Keyword
  stuffing measurably hurts.
- Interlinking: every post carries at least 2 contextual in-body internal
  links anchored on the phrase a searcher types ("goes to demurrage", not
  "click here"); a generated related-posts footer does not count. Site-wide,
  `check-link-graph` also fails an orphan content page, a dead internal link,
  a junk anchor, and identical anchor text pointing at two pages (it splits
  the ranking signal). The half no static check can see — that the inbound
  link comes from an *already-indexed* page — is worked at cadence time from
  Search Console.
- **Every content page carries a figure, and its social card shows it.** A
  page with no picture reads as text a machine produced. `figures:` in
  frontmatter is drawn at build time as inline SVG, and the lead figure is
  lifted verbatim onto the page's social card. `check-invariants` fails a
  content page without exactly one lead figure, and any indexable page without
  its own card. The eight kinds and the rule that a `bars` figure takes its
  numbers only from `facts.json` or a declared `source` — rule 1, in a picture
  — are `src/data/figureSchema.ts`; how to choose one is /write-content § 7.
- **Posts may arrive through the API, and the daily run owns the PR inbox.**
  `POST /api/posts` (`worker/posts.ts`, SETUP Phase 4) validates a post and
  opens a PR; the run does the judgement half the API cannot and merges under
  STRATEGY.md § 9, naming in the report any PR it will not merge.
- No volume cap on posts. `published` is the real date a piece went live;
  several on one day are fine when each carries its own fuel. What reads as
  generated content is a thin post, not a dated one, so the gates are the
  schema, the sources, `proprietary`, the voice check and the in-body links —
  never a count.
- The voice standard has two halves. Mechanical: `npm run check:voice`
  enforces `src/data/voice.json` at all three rungs, and /refresh-anti-ai-rules
  refreshes the base layer from its published sources, never silently.
  Judgement: `marketing/VOICE-GUIDE.md § ship checklist`, by hand on every
  piece — a green script run is not a pass.
- **Every new piece ships with its social posts** in
  `marketing/social-queue.md` (`status: unposted`; the actions check counts
  what is unposted), an inbound link from an indexed page, its glossary
  entries and its keyword-map row. A post that introduces a term adds that
  entry in the same commit; an update that changes a fact an entry states
  corrects the entry in the same commit (`updated` bumped, source added).
- Programmatic pages (glossary etc.) publish without the blog's author and
  `proprietary` gates but must be built from real data — `sources` min 1 is
  schema-enforced. A programmatic page with no unique data is what
  scaled-content policies penalise.
- Every content collection needs a route: entries with no
  `src/pages/<collection>/[...slug].astro` render nowhere, silently.
- FAQ answers live ONLY in the `faq` frontmatter array — the accordion and the
  FAQPage JSON-LD both render from it. Never write FAQ markup in the body;
  that recreates the drift the single source exists to prevent.
- Long entries (4+ `##` headings) set `toc: true`. Glossary `related`
  frontmatter is curation and outranks the scorer: ids listed there render
  first, in order, and the build-time scorer fills the remaining slots.
  `marketing/content-inventory.md` is generated (`npm run inventory`) — never
  hand-edit it.
- Interactive tools are built only on converging demand signals and the
  owner's go-ahead: deterministic code over a sourced data file, prefill via
  query params, the /search JS pattern — a model never generates a number a
  reader can check.

## Forms & data

- The contact form is a plain POST to `/api/contact` → worker → Google Apps
  Script → Sheet + email, answered by OUR 303 to `/contact/thanks`. Keep it
  JS-free. The honeypot is named `hp` and positioned off-screen — do not
  rename it to anything a browser autofills, do not `display:none` it.
- Apps Script changes require publishing a NEW VERSION (Deploy → Manage
  deployments) — saving the editor changes nothing live. Run `selfTest()`
  after scope changes.
- Google Sheets integration follows the two-tab pattern: private `master`
  tab, published `public` tab QUERY-ing only approved rows and public
  columns. Never publish a tab containing emails/phones.

## When you change…

| Change | Also do |
|---|---|
| A page title | Re-run OG cards (`marketing/og/render-pages.mjs`); keep it ≤60 characters or put the sacrificial half after " — " (`check-source-rules` fails a title the SERP clamp would hard-cut) |
| A URL that must keep working (page moved, folded, or visitors keep typing it) | One row in `src/data/redirects.json` with a one-line reason, AND the exact path in `wrangler.jsonc → run_worker_first` (`check-parity` fails one without the other; `smoke-worker` and `smoke-live` assert the 301) |
| A blocker only the owner can resolve | Ask them in the session with `AskUserQuestion` if they are here; what they defer goes to `marketing/DATA-SHEET.md` in the documented format, same commit — `npm run ask` will surface it |
| An action only a human can do (a key, a dashboard, an export, a listing) | One item in `marketing/ACTIONS.md` with a mechanical `Check` where one exists; `npm run actions` verifies it every run and the report carries it |
| A new step in a run, or a new report section | The `marketing/runbook.md` row AND the content-cadence step AND the report section, same commit |
| Any product change that alters a price, a feature or a claim | The About page's Key Facts, the pricing table, every comparison cell that mentions it, the glossary entries that define it — before the announcement (runbook § The accuracy check after a ship) |
| Any inline `<script is:inline>` | `npm run build` regenerates the CSP hashes; commit the changed `worker/csp.generated.json` (CI diffs it). Never add an inline `onclick=`-style handler — the CSP generator fails the build on those |
| Brand colour / favicon.svg | Edit the literal `BRAND_BG` in `marketing/favicon.mjs`, the `:root` tokens in `marketing/og/page.html` (they mirror `global.css`), and `--brand` in `marketing/og/default.html`; then `node marketing/favicon.mjs`, `node marketing/og/render.mjs`, re-run the page cards, `npm run check:contrast` |
| Any vendor or data collection | `src/data/privacy.json` in the same commit |
| Domain | `src/data/origin.mjs` (one place) |
| Sheet tabs | `src/data/sheets.config.json` (build) — the worker reads the same file |
| Anything in a Cloudflare dashboard | Record it in PLAYBOOK.md §6 — dashboards have no diff |
| A post's `published` date to the future | Nothing else — one filter (`src/data/publishing.mjs`) keeps it off every surface; it ships on the first build after the date (schedule one — PLAYBOOK §2) |
