# AGENTS.md — standing rules for working in a site built from this template

This file is the source of truth for anyone — human or agent — editing this
repo. `SETUP.md` is where a NEW site starts: the ordered walkthrough of every
per-site value, before any content work. `CHECKLIST.md` records every
architectural decision already made and why; `PLAYBOOK.md` is the
phase-by-phase build/operate runbook; `README.md` is the quickstart.
**Update the relevant document in the same commit as any change to
structure, config, or a third-party dashboard** — a setting nobody wrote down
is indistinguishable from a setting nobody made.

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
   CI.
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
    `process.cwd()`, never `import.meta.url`.
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

- Every blog author lives in `src/data/authors.json` (enforced): the byline
  links to `/author/<slug>` — the verifiable credential behind the name — and
  a guest author gets their own entry with a real profile and bio, never a
  borrowed one.
- Blog posts: named human author with a real `sameAs` profile; a required
  `proprietary` field naming what an LLM could not have produced; `sources`
  on anything factual; `tldr` front-loads the answer (that's the GEO lever
  with actual evidence behind it — alongside citations, quotes and
  statistics; keyword stuffing measurably hurts).
- Blog cadence and interlinking (enforced by `check-source-rules`): no two
  posts share a `published` date and no ISO week carries more than 5 — a
  same-day batch reads as generated content to anyone who checks. Every post
  carries at least 2 contextual in-body internal links, anchored on the
  phrase a searcher types ("goes to demurrage", not "click here"); a
  generated related-posts footer does not count. Site-wide, the link graph
  is also checked (`check-link-graph`): no orphan content pages (an
  intentional inbound link from another page — the auto-scorer does not
  count), no dead internal links, no junk anchors.
- The voice standard has two halves. Mechanical: `npm run check:voice`
  enforces `src/data/voice.json` (banned AI-tell vocabulary and shapes,
  em-dash density, stacked bold lead-ins, Title Case headings) at all three
  rungs; the base layer is refreshed from its published sources by the
  /refresh-anti-ai-rules skill, via PR, never silently. Judgement:
  `marketing/VOICE-GUIDE.md` § ship checklist, run by hand on every piece —
  a green script run is not a pass.
- **The fuel rule.** A new post exists only when its `proprietary`
  frontmatter names something real: a `marketing/field-notes.md` entry, a
  `marketing/news-log.md` event with primary sources, a verified
  social-sweep finding, or an insights finding. Field notes are an add-on,
  never a gate — the engine keeps writing from the internet-derived
  channels without them; only when every channel is dry does that cycle do
  updates and interlinking instead. The
  content engine (skills: /onboard-marketing, /interview, /write-content,
  /refresh-anti-ai-rules, /content-cadence) delivers everything as PRs; a
  human merges, nothing auto-publishes.
- `marketing/content-inventory.md` is generated (`npm run inventory`) —
  never hand-edit it; regenerate.
- **Glossary upkeep rides every content change.** A post that introduces a
  term adds its glossary entry in the same PR; an update that changes a
  fact a glossary entry states corrects the entry in the same PR (`updated`
  bumped, source added). Interactive tools/calculators are built only on
  converging demand signals and the owner's go-ahead: deterministic code
  over a sourced data file, prefill via query params, the /search JS
  pattern — a model never generates a number a reader can check.
- Programmatic pages (glossary etc.) auto-publish but must be built from real
  data — `sources` min 1 is schema-enforced. A programmatic page with no
  unique data is what scaled-content policies penalise.
- Every content collection needs a route (CI-enforced): entries with no
  `src/pages/<collection>/[...slug].astro` render nowhere, silently.
- Long entries (4+ `##` headings) set `toc: true` — an "On this page" anchor
  list renders between the tldr and the body. Short entries don't need a map
  of themselves; leave it off.
- FAQ answers live ONLY in the `faq` frontmatter array — the accordion and
  the FAQPage JSON-LD both render from it. Never write FAQ markup in the
  body; that recreates the drift the single source exists to prevent.
- Glossary `related` frontmatter is curation, and curation outranks the
  scorer: ids listed there render first in listed order; the build-time
  scorer only fills the remaining related-link slots. Curate the 1–2 links
  that genuinely teach the next concept; let the scorer do the rest.

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
| A page title | Re-run OG cards (`marketing/og/render-pages.mjs`) |
| Any inline `<script is:inline>` | `npm run build` regenerates the CSP hashes; commit the changed `worker/csp.generated.json` (CI diffs it). Never add an inline `onclick=`-style handler — the CSP generator fails the build on those |
| Brand colour / favicon.svg | Edit the literal `BRAND_BG` in BOTH `marketing/favicon.mjs` and `marketing/og/render-pages.mjs`, plus `--brand` in `marketing/og/default.html`; then `node marketing/favicon.mjs`, re-run OG cards, `npm run check:contrast` |
| Any vendor or data collection | `src/data/privacy.json` in the same commit |
| Domain | `src/data/origin.mjs` (one place) |
| Sheet tabs | `src/data/sheets.config.json` (build) — the worker reads the same file |
| Anything in a Cloudflare dashboard | Record it in PLAYBOOK.md §6 — dashboards have no diff |
| A post's `published` date to the future | Nothing else — one filter (`src/data/publishing.mjs`) keeps it off every surface; it ships on the first build after the date (schedule one — PLAYBOOK §2) |
