# astro-website-template

A production-grade Astro template for marketing/content sites that costs **$0
to host** and ships with the SEO/AEO/GEO machinery, accessibility discipline
and CI battery of a site that learned everything the hard way.

- **Stack**: Astro 7 (static) · MDX content collections with zod schemas ·
  one small Cloudflare Worker · Google Sheets (data) · Google Apps Script
  (forms + email) · Umami (cookieless analytics, optional GA4).
- **Hosting**: Cloudflare Workers with static assets — static requests are
  free and *unlimited*, the worker's 100k free invocations/day cover the few
  dynamic routes. No servers, no Docker, nothing to patch at 3am.
- **Docs**: `CHECKLIST.md` — every decision already baked in, with reasons.
  `PLAYBOOK.md` — build & operate, phase by phase, plus the trap archive.
  `AGENTS.md` — standing rules for anyone (human or AI) editing the repo.

## Quickstart

```bash
npm install
npm run dev          # local dev at localhost:4321
npm run build        # typecheck + sheets + llms.txt + build + markdown twins
npm run preview      # wrangler dev — serves dist/ WITH the worker (forms, twins)
```

Note `astro dev` serves pages only; `/api/*`, `/hi/*` and markdown negotiation
need the worker, so use `npm run build && npm run preview` to test those.

## A new site in 12 steps

1. **Copy this folder** (or `git clone` + re-init), `npm install`.
2. **Domain**: set it once in `src/data/origin.mjs`.
3. **Identity**: edit `src/data/site.ts` — name, tagline, description, nav,
   contact, author. Fill `src/data/facts.json` (every number with a source).
4. **Brand**: replace `public/favicon.svg`; set the brand tokens in
   `src/styles/global.css`; run `node marketing/favicon.mjs`; then
   `npm run build && npm run check:contrast` — **do not ship a colour the
   checker rejects; darken it until it passes** (the measured tokens that
   ship with the template already pass).
5. **Content**: replace the placeholder blog/glossary entries in
   `src/content/`; rewrite the pages' copy (`src/pages/`).
6. **Forms**: create a Google Sheet; open Extensions → Apps Script; paste
   `marketing/apps-script/contact-form.gs`; set its config constants; run
   `selfTest()` in the editor (this triggers the OAuth prompts — skipping it
   is why deployed scripts "Complete" and write nothing); Deploy → Web app
   (execute as you, accessible to anyone); copy the deployment id.
7. **Cloudflare**: `npx wrangler login`, rename the worker in
   `wrangler.jsonc`, `npx wrangler secret put CONTACT_SCRIPT_ID`, then
   `npm run deploy` for a first `*.workers.dev` deploy. Attach the custom
   domain (Workers → your worker → Domains & Routes).
8. **Dashboard settings** (no diff, no history — that's why they're written
   down): PLAYBOOK.md Phase 6. The critical ones: SSL Full (Strict), Always
   Use HTTPS, zone HSTS ON (the origin sends none — one emitter), www→apex
   Redirect Rule, WAF rate-limit on `/api/contact`, Email Obfuscation OFF,
   Rocket Loader OFF.
9. **CI/CD**: push to GitHub; add repo secret `CLOUDFLARE_API_TOKEN` (scoped:
   Edit Workers). Every PR runs the checks; green main deploys.
10. **Search engines**: Search Console (domain property via DNS TXT), Bing
    Webmaster (set `VERIFICATION.bing`), submit the sitemap in both; generate
    an IndexNow key → `public/<key>.txt`.
11. **Data (optional)**: publish a Sheet tab as CSV (two-tab privacy pattern
    — see CHECKLIST §3), add it to `src/data/sheets.config.json`, mark
    elements with `data-live`, include `<LiveData />` on that page.
12. **Verify against the live site**: run the curl list in PLAYBOOK Phase 10.
    Most of what this template encodes is invisible until something in front
    of the origin breaks it.

## Analytics: read this before adding any tag

**For a no-cookie, no-consent-popup experience use Umami** (or any analytics
that sets no cookies and touches no device storage). That is this template's
default: set `ANALYTICS.umami.websiteId` + `upstream` in `src/data/site.ts`
and `UMAMI_UPSTREAM` in `wrangler.jsonc`, and the site runs analytics with
**no banner at all** — legitimately, because consent obligations attach to
storage access and there is none. The worker proxies both the script and the
collector same-origin so ad-blockers don't silently eat your data.

**Using Google Analytics (GA4) requires a consent popup.** It sets cookies.
Set `ANALYTICS.ga4.measurementId` and the template's `ConsentBanner` arms
itself automatically: it owns the gtag snippet, injects it only on Accept,
clears the cookies on Reject, and forwards CTA events so your markup doesn't
change. You pay for GA4 with a banner over your hero on every first visit —
decide deliberately.

**Either way, every CTA is measured.** Give every conversion surface
`data-umami-event="..."` + `data-umami-event-place="..."` — CI fails the build
on unmeasured CTAs, because outbound/`tel:`/`mailto:` conversions produce no
pageview and are otherwise invisible forever.

## What's where

```
src/data/        site.ts (config) · origin.mjs (domain) · facts.json (numbers)
                 privacy.json (drives /privacy-policy + its indexability)
                 sheets.config.json (Sheet tabs) · lastmod.json (generated)
src/content/     blog/ glossary/ — MDX + zod schemas (content.config.ts)
src/pages/       one file per route; [...slug].astro per collection
src/components/  Header/Footer/ContactForm/ConsentBanner/LiveData/…
src/styles/      global.css — measured design tokens, mobile-first utilities
worker/          index.ts — forms proxy, sheet data, /hi rewrites, md twins
public/          _headers _redirects robots.txt favicons .well-known/
scripts/         CI-run: sheets, llms, twins, lastmod, contrast, indexnow
marketing/       human-run: favicon gen, OG cards, apps-script source
.github/         ci.yml (checks + gated deploy) · indexnow.yml
```
