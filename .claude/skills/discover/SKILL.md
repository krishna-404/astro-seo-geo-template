---
name: discover
description: The first conversation for a new site — a discovery interview that asks the questions whose answers shape everything downstream (why now, what the site must do, who signs off, what exists today, what is off-limits) and an asset intake that collects or requests every file the build needs (logo, fonts, colours, screenshots, photography, copy, proof, legal identity, access), writing marketing/brief.md and turning every missing asset into a DATA-SHEET question. Use before /new-site Phase 1, when someone says "we need a website", or when marketing/brief.md still carries TODOs.
---

# Discover — the brief and the asset intake

Everything the engine later builds is capped by what this conversation
captures. A site built from a vague brief ships a vague site; a site built
without its assets ships placeholders and a favicon nobody replaced. This
skill runs once, before anything is decided, and produces one file:
`marketing/brief.md` — the brief (what the site is for) and the asset
register (what we have, what we need, where each lands).

Two rules from /new-site hold here too. **Show before asking:** when a
question is a choice (what a homepage's one action is, what a trust page
carries), fetch two or three current examples from the owner's category
first and ask against them, never against a blank. **Write, don't
remember:** every answer goes into `brief.md` in the same session, every
number with a source, and every question the owner cannot answer goes into
`marketing/DATA-SHEET.md` — never into a guess.

Ask one question at a time, in the owner's language, and push on generic
answers. "A modern site that builds trust" is not an answer; "importers
who compare three freight forwarders and want to see rates before they
call" is.

## 1. The interview — in this order

Read `marketing/brief.md`, `STRATEGY.md` and `DATA-SHEET.md` first so
nothing already known is asked twice. Then:

1. **Why now.** What triggered this site or rebuild, and what has to be
   true ninety days after launch for it to have been worth doing. Get one
   sentence and one measurable outcome (enquiries a month, demos booked,
   a listing claimed). This is the metric /insights-review will report
   against.
2. **The one job.** What the site must make happen: the single primary
   action a visitor takes, and what happens after it — who receives the
   form, how fast they answer, on which channel. A site with two primary
   actions has none; make the owner pick. (SETUP Phase 0's first decision
   lands here; /new-site § Decide confirms it with examples.)
3. **The business in three sentences.** What is sold, to whom, what the
   buyer stops suffering. Capture the short version only — /onboard-
   marketing deepens the reader, thesis and stance; do not run that
   interview here.
4. **Who is involved.** Who signs off, who else has opinions that will
   arrive late, who maintains the site after launch and how much time they
   have a week. The maintainer's time sets the cadence /content-cadence
   can honestly run at.
5. **What exists today.** An existing site (URL, what works, what
   embarrasses them, its analytics and Search Console access, which URLs
   get traffic or are printed on things and must keep working — the seed
   of the redirect map), existing brand guidelines that may not change,
   existing copy, decks, brochures, and any content worth migrating.
6. **Markets and constraints.** Countries and languages in order, the
   regulated claims the industry cannot make, the legal review the copy
   has to pass, currency and units, and the launch date if one is fixed.
7. **The category.** Who they lose deals to, who prospects compare them
   with, who they admire in the space and who they never want to be
   mistaken for. Three to eight names; this seeds /landscape.
8. **Taste.** Two or three sites they admire, inside or outside the
   category, and what specifically they admire — the register, a
   pattern, a tone. And two they dislike, with the reason. This seeds
   /design-direction and the voice step; record the reason, not just the
   URL.
9. **Off-limits.** Customers that may not be named, numbers that may not
   be published, geographies not served, promises the product cannot
   keep. These become `bannedClaims` and STRATEGY § Guardrails later.
10. **The pages they think they need.** Take the list without arguing; it
    is tested against `marketing/site-blueprint.md § 1` in /keyword-map,
    and the owner's list tells you what they believe the buyer wants.

## 2. The asset intake

Walk the register in `brief.md § Asset register` row by row. For each
asset, one of three states: **have** (file or access received, path
recorded), **needed** (the owner will supply — a DATA-SHEET question with
what exactly, in which format, by when), or **none** (does not exist and
will not; record what the site does instead). Never leave a row blank, and
never substitute a placeholder for an asset that is merely late.

| Asset | What to ask for | Where it lands |
|---|---|---|
| Logo | Vector master (SVG), a single-colour version, a version for dark backgrounds, the square mark on its own, clear-space and minimum-size rules if they exist | `public/favicon.svg`, header, `marketing/og/default.html`; `node marketing/favicon.mjs` |
| Brand colours | Hex values and which is primary; whether they are fixed or negotiable — every colour that carries text is measured by `npm run check:contrast` and darkened until it passes, so ask now whether a brand red may be darkened | `src/styles/global.css` tokens, `BRAND_BG` in `marketing/favicon.mjs` and `marketing/og/render-pages.mjs`, `--brand` in `marketing/og/default.html` |
| Fonts | The licensed files (woff2, or a licence that allows subsetting to woff2) for at most two weights of a display face and a text face; a font without a self-hosting licence cannot be used — the CSP is `font-src 'self'` | `public/fonts/`, `@font-face` in `global.css` |
| Brand guidelines | The document, if one exists, and which parts are fixed | Cited in `marketing/design-brief.md` |
| Product screenshots | Access to the product to capture 1440-px-wide screens, or the screens themselves; the hero panel prefers a product screen because it is proof | `src/assets/`, cut through `astro:assets` |
| Photography | Founder and team headshots, premises, the product in use — real, with usage rights; no stock | `src/assets/`, `src/data/authors.json` |
| Illustration and video | Only if they exist and the style is one the site will keep; video is embedded lazily, never autoplayed | `src/assets/`, page-level |
| Copy and collateral | Brochures, decks, one-pagers, sales scripts, FAQ lists from support — the source of the buyer's own words | Quoted in `STRATEGY.md`, `writer-brief.md`, `field-notes.md` |
| Proof | Customer names and logos with written permission, testimonials with the person's sign-off, case studies with numbers and sources, certifications, awards, memberships with links | `src/data/facts.json` with `source`; nothing without permission (VOICE-GUIDE § 5) |
| Numbers | Every figure the site may state, with its provenance | `src/data/facts.json` |
| Legal identity | Legal name, registered address, registration and tax ids, founding date, the exact spelling used on every profile | `src/data/site.ts`, `facts.json`, `public/.well-known/security.txt`, `src/data/privacy.json` |
| People | Founder and author names, titles, bios of checkable facts, real LinkedIn profiles | `src/data/authors.json`, `site.ts` `FOUNDER` |
| Contact channels | Phone, email, WhatsApp, address, opening hours — and who answers each | `site.ts`, contact page |
| Social and entity profiles | Handles and URLs for every profile that exists (LinkedIn company page, Google Business Profile, Crunchbase, X, YouTube…) and which are missing | `site.ts` `sameAs`, `marketing/link-targets.md` for the missing ones |
| Domain and access | Registrar login, DNS control, Cloudflare account, existing analytics, Search Console and Bing properties, GitHub org | Recorded as **have/needed** only — never the credentials themselves; `src/data/origin.mjs` gets the domain |
| Existing site | URL, a crawl or sitemap, the analytics export, the list of URLs that must keep working | The redirect map in `brief.md § Migration`, later `worker/index.ts → PERMANENT_REDIRECTS` |
| Pricing | Whether prices are published, the model, and what may be shown | `STRATEGY.md`, the pricing page decision in /keyword-map |

Assets that arrive as files go into the repo in their final location in
the same session, not into a chat thread. Credentials never go anywhere in
the repo: record that access exists and who holds it.

## 3. Write the results

- `marketing/brief.md` — every section filled or marked with the
  DATA-SHEET id that will fill it. The Log gets today's date.
- `marketing/DATA-SHEET.md` — one `Q-` block per missing asset or
  unanswered question, in the documented format, with what it unblocks.
- `marketing/STRATEGY.md § Honest state` — the one-line true state of the
  business today, from the interview, dated.
- `src/data/site.ts`, `facts.json`, `authors.json`, `origin.mjs` — any
  value the interview settled that SETUP Phase 1 lists, so the placeholder
  grep shrinks in the same session.

## Finish

Read the brief back to the owner in five lines: the outcome, the one
action, the buyer, what exists, what is missing. Then hand off in order:
/landscape (the category, from the names in § 1.7), then /new-site from
Phase 3 (Decide) — it reads `brief.md` and does not ask again what the
brief already answers.
