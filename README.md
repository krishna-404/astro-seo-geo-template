# astro-website-template

A production-grade Astro template for marketing/content sites that costs **$0
to host** and ships with the SEO/AEO/GEO machinery, accessibility discipline
and CI battery of a site that learned everything the hard way.

- **Stack**: Astro 7 (static) · MDX content collections with zod schemas ·
  one small Cloudflare Worker · Google Sheets (data) · Google Apps Script
  (forms + email) · Umami (cookieless analytics, optional GA4) · Pagefind
  site search (build-time index, loads only on `/search`).
- **Content machinery**: scheduled publishing (future-date a post, one filter
  covers every surface) · related-links + prev/next internal linking by
  construction · opt-in TOC · zero-JS FAQ accordion single-sourced with its
  FAQPage JSON-LD · visible breadcrumbs mirroring BreadcrumbList (CI-checked).
- **Hosting**: Cloudflare Workers with static assets — static requests are
  free and *unlimited*, the worker's 100k free invocations/day cover the few
  dynamic routes. No servers, no Docker, nothing to patch at 3am.
- **Docs**: `SETUP.md` — **start here for a new site**: every per-site value
  in dependency order, so the hygiene items get done before content work
  buries them. `CHECKLIST.md` — every decision already baked in, with
  reasons. `PLAYBOOK.md` — build & operate, phase by phase, plus the trap
  archive. `AGENTS.md` — standing rules for anyone (human or AI) editing
  the repo.

## Quickstart

```bash
npm install
npm run dev          # local dev at localhost:4321
npm run build        # typecheck + sheets + llms.txt + build + twins + search index
npm run preview      # wrangler dev — serves dist/ WITH the worker (forms, twins)
```

Note `astro dev` serves pages only; `/api/*`, `/hi/*` and markdown negotiation
need the worker, so use `npm run build && npm run preview` to test those.

## A new site

**Follow `SETUP.md`** — the full walkthrough in dependency order: identity
files → brand + generated surfaces → first deploy + dashboard/DNS → services
(forms, analytics, search engines) → content. It ends each phase with a
verification step, and its placeholder grep
(`grep -rn "TODO\|example\.com\|Example Co" src public wrangler.jsonc marketing`)
tells you at any moment what is still unset. The short version: **do the
identity and hygiene phases before writing any content** — nothing enforces
`hello@example.com` out of your footer except that walkthrough.

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
public/          _headers _redirects favicons .well-known/ (robots.txt is
                 generated — src/pages/robots.txt.ts derives it from origin.mjs)
scripts/         CI-run: sheets, llms, twins, lastmod, csp, contrast, a11y,
                 indexnow
marketing/       human-run: favicon gen, OG cards, apps-script source
.github/         ci.yml (checks + gated deploy) · indexnow.yml ·
                 linkrot.yml (monthly external-link check)
```
