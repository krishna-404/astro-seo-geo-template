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
- **Docs**: see **The document map** below.

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

## Quickstart

```bash
npm install          # also activates the git hooks (.githooks/)
npm run dev          # local dev at localhost:4321
npm run build        # typecheck + sheets + llms.txt + build + twins + search + CSP
npm run preview      # wrangler dev — serves dist/ WITH the worker (forms, twins)
npm run verify       # the FULL CI battery locally (pre-push runs this for you)
```

Note `astro dev` serves pages only; `/api/*`, `/hi/*` and markdown negotiation
need the worker, so use `npm run build && npm run preview` to test those.

## Start here — a new site

**Run `/new-site`.** It is the whole path from an empty clone to a launched
site running its cadence, in thirteen phases, and it puts every decision to
you in the session against current examples rather than leaving questions in a
file. Phase 1 is `/discover`, phase 13 schedules the recurring run.

**`SETUP.md` is where each value lives.** Its phases are numbered separately
from `/new-site`'s on purpose: `/new-site` numbers the *conversation*, SETUP
numbers the *files*, and each phase of the skill names the SETUP phase it
fills. Read SETUP when you want to know which file holds a value; run
`/new-site` when you want to be walked through deciding it. Working through
SETUP by hand instead is fine — you will just be answering the same questions
without the examples.

Either way: **do the identity and hygiene phases before writing any content.**
Nothing enforces `hello@example.com` out of your footer except that
walkthrough, and its placeholder grep
(`grep -rn "TODO\|example\.com\|Example Co" src public wrangler.jsonc marketing`)
tells you at any moment what is still unset. `npm run ask` prints what the
engine is currently waiting on you for.

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
                 voice.json (anti-AI rules; site layer incl. bannedClaims)
                 intent.json (high-intent query detection + watch list)
src/content/     blog/ glossary/ — MDX + zod schemas (content.config.ts)
src/pages/       one file per route; [...slug].astro per collection
src/components/  Header/Footer/ContactForm/ConsentBanner/LiveData/…
src/styles/      global.css — measured design tokens, mobile-first utilities
worker/          index.ts — forms proxy, sheet data, /hi rewrites, md twins
public/          _headers _redirects favicons .well-known/ (robots.txt is
                 generated — src/pages/robots.txt.ts derives it from origin.mjs)
scripts/         CI-run: sheets, llms, twins, lastmod, csp, invariants,
                 parity, worker/live smoke, contrast, a11y, verify, indexnow ·
                 operator-run: insights (with lib/intent.mjs: high-intent,
                 quick wins, BOFU, competitors), data-sheet + actions
                 (npm run ask), page-audit (npm run audit:pages),
                 report-html (the cadence email body)
marketing/       human-run: favicon gen, OG cards, apps-script source ·
                 the content engine's memory: brief (the /discover output:
                 what the site is for + the asset register), landscape (the
                 category torn down, with the owner's verdicts),
                 site-blueprint (the transferable SEO/AEO/GEO doctrine),
                 STRATEGY, keyword-map, VOICE-GUIDE, design-brief,
                 writer-brief, field-notes, news-log, generated inventory ·
                 what it is waiting on: DATA-SHEET (open questions, no answers),
                 link-targets (listings a human claims), ACTIONS (every human
                 action, verified by npm run actions), social-queue (posts
                 written per piece, waiting to be posted), channel-gaps (what
                 is deliberately not done off-site) · the operating layer:
                 runbook (daily/weekly/monthly checklists), launch-playbook,
                 page-guidelines, content-guidelines, playbook-intake (every
                 outside playbook sorted) · insights/ (dated snapshots)
.claude/skills/  the content engine: new-site (the whole setup as a
                 conversation, every decision with live examples) ·
                 discover (the brief and the asset intake, first) ·
                 landscape (the category, torn down and put to the owner) ·
                 onboard-marketing (strategy and voice, against published
                 voice guides) · design-direction (the site's own look:
                 the visitor's journey interviewed, the category's awwwards
                 entries swept live, one signature move, proven on contact
                 sheets and a measured smell sweep, inside the constraints) ·
                 keyword-map · interview · write-content ·
                 refresh-anti-ai-rules · insights-review · content-cadence
                 (see SETUP Phase 5 — schedule it as a Routine) · launch (the
                 gate, then the announcement) · ingest-playbook (a link or a
                 pasted playbook → sorted into the repo) · ship (merge +
                 deploy in one go)
.claude/settings.json  SessionStart hook → npm run ask (what is blocked and
                 what is yours to do, first)
.githooks/       pre-commit (fast tier) · pre-push (npm run verify) —
                 activated automatically by npm install
.github/         ci.yml and indexnow.yml (manual dispatch only — the
                 pre-push battery and /ship are the gate and the deploy) ·
                 linkrot.yml (monthly external-link check, the one scheduled
                 workflow)
```

## Glossary of this repo's terms

Four metaphors in this repo look alike and are not. This section is the one
place they are told apart.

| Term | What it means here |
|---|---|
| **The fuel rule** | A new post exists only when it can name something no model could have produced. `proprietary` says what KIND; `fuel` names the thing. Stated in full in `marketing/content-guidelines.md § 2`. |
| **Fuel channels** | The four things that count as fuel: a field note, a news-log event with primary sources, a verified ICP social-sweep finding, an insights finding. Field notes are the richest, never a gate. |
| **The funnel ladder** | The standing ORDER OF WORK on a site that already exists: convert what lands → CTR where you rank → impressions last. `marketing/STRATEGY.md § 5`. |
| **Rung 2b** | The snippet test inside that ladder: a page at position ≤10 with ≥50 impressions and near-zero clicks needs a better title and description, not a better ranking. One page at a time, re-checked after four weeks. |
| **The answer-engine funnel** | A different funnel, about being CITED rather than ranked: reachable → ingested → indexed → shown → followed, each stage capped by the one above. `scripts/lib/aeo.mjs`, printed by `npm run aeo`. |
| **Focus stage** | The highest stage of that funnel currently under its bar — the one thing to work. Never the lowest number on the report. |
| **The enforcement ladder** | The three rungs a rule can be mechanized at: pre-commit (source), pre-push `npm run verify` (built output), the live smoke (the edge). `CHECKLIST.md § 9`. |
| **The battery** | `npm run verify` — all seventeen steps. "A green battery" means it passed; it is a floor, not a pass. |
| **BOFU** | Bottom-of-funnel queries: the buyer's shapes (alternatives, vs, review, best X for Y, pricing) at position 4–20. Worked one page at a time, four weeks each. |
| **Quick wins** | A page already ranking at ≤5 for a phrase its source does not contain. Add the phrase; the cheapest move on the board. |
| **Watch list** | The curated high-intent terms in `src/data/intent.json → watch`, each tied to the page that claims it. A watch term with no impressions reports as "not showing yet" rather than vanishing. |
| **`claimFrom`** | The collections in `intent.json` whose frontmatter declares `primaryKeyword` — the list that lets a report say which page SHOULD own a query. |
| **Money page** | A page that sells something: the `solutions` collection, one page per offering, `primaryKeyword` required. |
| **Coverage layers** | The page types a complete site has, in build order (site-blueprint § 1) — money pages, comparison, use-case, industry, tools, plus the always-on blog and glossary. |
| **Twins** | The `.md` copy of every content page, served at the same URL to `Accept: text/markdown`. Generated from the same MDX the page renders. |
| **PR inbox** | Step 1b of the daily run: every open pull request read and worked, API posts included. |
| **Merge model** | Who merges and who deploys. `marketing/STRATEGY.md § 9`; the default commits to `main` and deploys on a green battery. |
| **Decisions** | A named section of the cadence report: each item a question with one line of evidence and a recommendation. The owner answers by replying. |
| **daily-lite / weekly-full** | The two cadence modes. Weekly is daily plus the rules refresh, the writing run, the sweeps and the map maintenance. |
| **The standing line** | "Remove all mannered prose." — the last line of every prompt that writes for this site. `src/data/voice.json → prompt.standing`. |
| **The sweep** | `npm run design:refs` — the category's current awwwards entries, the Sites of the Day and one awwwards Elements table per band (hero, about, pricing, FAQ, stats, team, CTA, contact, footer…), read on a date into `marketing/design-refs.md` (generated). Register tags are what to borrow; tech tags (GSAP, WebGL) are what this template refuses. Re-run quarterly (ACTIONS A-Q04). |
| **The journey** | `design-brief.md § 0`: four to seven beats a visitor walks, each with the feeling it should produce, ONE peak, an ending that resolves — written before any band is. |
| **Signature move** | One bespoke, CSS-only interaction a site has and no other does (`design-brief.md § 11`); the test is that someone who knows the template could tell the site by it. |
| **The fingerprint** | Six dimensions (motif, hero, band sequence, close, type, signature move) on which a site must differ from the template default on at least four, or it is the template in a new colour. |
| **The smell sweep** | `npm run check:design` — the machine-checkable half of the design smell list, measured on the rendered page at 375 and 1440, in the battery and CI. The judgement half is read by eye on the **contact sheets** from `npm run design:shoot`. |
| **The ancestor site** | The production site this template was extracted from. Its traps are why several checks exist; it is not a site you have access to, and nothing here depends on it. |
