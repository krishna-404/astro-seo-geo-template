# AGENTS.md — standing rules for working in a site built from this template

This file is the source of truth for anyone — human or agent — editing this
repo. `CHECKLIST.md` records every architectural decision already made and why;
`PLAYBOOK.md` is the phase-by-phase build/operate runbook; `README.md` is the
quickstart. **Update the relevant document in the same commit as any change to
structure, config, or a third-party dashboard** — a setting nobody wrote down
is indistinguishable from a setting nobody made.

## The rules that get broken by hand (CI catches most, not all)

1. **No number or claim is typed into markup.** Everything published lives in
   `src/data/facts.json` with a `source` field, or comes from a Google Sheet
   snapshot in `src/data/sheets/`. Need a number that isn't there? Add it with
   a source or leave a visible TODO — never estimate.
2. **Mobile-first CSS, always.** The unprefixed rule is the phone rule;
   `min-width` queries add tablet and desktop. Touch targets ≥44px. No
   horizontal body scroll at any width — wide tables go in `.table-scroll`
   (markdown tables are wrapped automatically; don't hand-wrap, don't remove
   the rehype plugin).
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

## Content rules

- Blog posts: named human author with a real `sameAs` profile; a required
  `proprietary` field naming what an LLM could not have produced; `sources`
  on anything factual; `tldr` front-loads the answer (that's the GEO lever
  with actual evidence behind it — alongside citations, quotes and
  statistics; keyword stuffing measurably hurts).
- Programmatic pages (glossary etc.) auto-publish but must be built from real
  data — `sources` min 1 is schema-enforced. A programmatic page with no
  unique data is what scaled-content policies penalise.
- Every content collection needs a route (CI-enforced): entries with no
  `src/pages/<collection>/[...slug].astro` render nowhere, silently.

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
| Brand colour / favicon.svg | `node marketing/favicon.mjs`, re-run OG cards, `npm run check:contrast` |
| Any vendor or data collection | `src/data/privacy.json` in the same commit |
| Domain | `src/data/origin.mjs` (one place) |
| Sheet tabs | `src/data/sheets.config.json` (build) — the worker reads the same file |
| Anything in a Cloudflare dashboard | Record it in PLAYBOOK.md Phase 6 — dashboards have no diff |
