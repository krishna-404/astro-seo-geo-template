---
name: design-direction
description: Give a site built from this template a real design direction instead of the default look — pull references from awwwards (the site's own category plus the current Sites of the Day) and from a standing list of the best-designed product sites, decide type, colour, layout motif, motion and imagery inside the template's constraints (AA measured, CSS-only motion, no client JS, LCP), write marketing/design-brief.md, and apply it through the tokens and patterns in global.css. Use at onboarding (SETUP Phase 1, right after the brand contract), when the owner says the site looks bland or generic, or before a redesign.
---

# Design direction

The template ships a sound default: an editorial hero, a bento grid, one
inverted band, a fluid type scale, a numbered rail — all in `global.css`'s
*expressive layer*. Sound is not the same as designed. A site that never
chooses its own type, palette and composition reads as a template, and a
buyer reads "template" as "nobody is home". This skill is the deliberate
choosing, done once per site and revisited when the brand moves.

**The constraint is the brief.** Everything the template enforces still
holds: colour clears WCAG AA on every band (`npm run check:contrast` measures
it), no client JavaScript outside `/search`, motion is CSS-only and lives
inside `prefers-reduced-motion: no-preference`, the LCP element loads eagerly,
CSS stays inlined and under ~15 kB gzipped, one `<h1>`, mobile-first. So we
borrow **composition, type, colour, rhythm and restraint** from the best
sites — never their WebGL, their scroll-jacking or their 2 MB of fonts. A
design direction that needs a bundle is not one this template can hold.

## 1. Look, before deciding

Gather 8–12 references and write one line each: what the site does with
type, colour, layout, motion, imagery — and what it *refuses* to do.

- **awwwards, the site's category.** Fetch
  `https://www.awwwards.com/websites/<category>/` for the category that fits
  (`business-corporate`, `startups`, `technology`, `e-commerce`,
  `design-agencies`, `portfolio`, `architecture`, `fashion`, `mobile-apps`,
  `hotel-restaurant`) and the front page `https://www.awwwards.com/websites/`
  for the last ten Sites of the Day. Note the tags awwwards itself applies
  (typography, minimal, clean, scrolling, animation, 3D, WebGL…) — the tags
  are the trend signal, the tech tags are the warning signal.
- **The standing list — sites that are designed AND ship fast pages.** Read
  three or four that are closest to this site's job: Stripe, Linear, Vercel,
  Apple, Notion, 37signals/Basecamp, Ramp, Mercury, Raycast, Arc, Resend,
  Framer's own marketing pages, Sanity, Posthog. What they share: a display
  face used large and rarely, a restrained palette with one accent, generous
  whitespace, a product screen as the hero image, motion that only ever
  confirms an action. That is the register this template can hold at zero JS.
- **The trend check.** Read what actually held up in production this year
  (as of 2026: bento layouts and dark mode shipped at scale; kinetic
  typography and glassmorphism survive only in heroes and navigation;
  3D/WebGL and blob shapes stayed with experiential brands; AI-readability
  layers — schema, llms.txt, FAQ blocks — became table stakes). A trend that
  fails Core Web Vitals or screen readers is not a trend for this site.

Do not copy a specific site's layout. References tell you the *register*;
the direction has to be this brand's.

## 2. Decide — write `marketing/design-brief.md`

Fill the skeleton, one decision per heading, each with the reference that
informed it and the constraint that bounds it:

1. **Three words.** The register the site should read as (e.g. "precise,
   warm, unhurried"). Everything below has to agree with them.
2. **Type.** Display face + text face. The template's default is the system
   stack; a chosen face is **self-hosted** in `public/fonts/` as woff2
   (subset, two weights at most, `font-display: swap`, preload the display
   face), because the CSP is `font-src 'self'` — no Google Fonts request.
   Point `--font-display` at it in `global.css`; the fluid steps
   (`--step--1 … --step-5`) do the sizing. Say which step the hero uses and
   how tight `--display-tracking` goes.
3. **Colour.** `--brand`, `--brand-strong`, `--brand-soft`, the four bands,
   the inverted band tokens (`--band-ink`, `--on-ink-*`). Every value that
   carries or sits behind text is **measured before it is chosen**: run
   `npm run build && npm run check:contrast` and darken until green. A
   brighter accent can live where it is neither text nor behind text (a
   rule, a mark, a glow).
4. **Layout motif.** One of: *editorial* (oversized headline, narrow copy,
   asymmetric panel — the default), *bento* (a lead card and supporters),
   *split* (copy left, product right on every band), *long-scroll narrative*
   (one idea per band, alternating). Name the hero pattern and what sits in
   the hero panel: a product screen (preferred — it is proof), a figure from
   `facts.json`, a photograph, an illustration. Never a stock image.
5. **Motion policy.** What moves and why: the scroll reveal (`.reveal`,
   CSS `animation-timeline: view()`), card hover lift, disclosure
   transitions — all inside the motion query. State what does **not** move:
   body copy, navigation, anything a reader has to read.
6. **Texture and surface.** Gradient glow, grain, rules, rounded radius
   (`--radius`, `--radius-lg`), shadow depth. Decorative layers are inert
   (`aria-hidden`, `pointer-events: none`) and never behind text unless
   measured.
7. **Imagery.** Where product screens come from and how they are cut (the
   ancestor site crops full-page app captures to the band that carries the
   point, 1440 px wide, through `astro:assets`), the illustration style if
   any, the social-card treatment (`marketing/og/default.html` follows the
   tokens).
8. **What we refuse.** The list from § 1's trend check, plus the brand's own
   no-gos, so the next editor does not re-argue them.

## 3. Apply

- Tokens first: `src/styles/global.css` `:root` — fonts, steps, colours,
  bands, radius. Then `marketing/og/default.html` and `marketing/favicon.mjs`
  / `marketing/og/render-pages.mjs` `BRAND_BG` so the cards and icons follow
  (SETUP Phase 1 lists every file the brand colour lives in).
- Composition second: `src/pages/index.astro` chooses its hero pattern and
  panel, the bento's lead card, the one inverted band. Other pages inherit
  through the shared classes; touch them only where the motif demands.
- Fonts: `public/fonts/<face>-<weight>.woff2`, `@font-face` in `global.css`,
  `<link rel="preload" as="font" type="font/woff2" crossorigin>` for the
  display face in `BaseLayout` (one preload — more delays the LCP).
- Prove it: `npm run build`, `npm run check:contrast`, `npm run check:a11y`,
  `npm run check:invariants`; check 375×667 (the hero must not push the
  first CTA below the fold) and a 1440 desktop; confirm CSS size in the
  build output stayed under the budget.
- Record it: the brief, a CHECKLIST §8 line for any new pattern, and a
  PLAYBOOK note if a script or asset pipeline changed. Re-render the social
  cards if the tokens changed (SETUP Phase 2).

## 4. Revisit

Once a quarter, or when the owner brings a site they admire: re-run § 1 for
the category, diff against the brief, and either update the brief with a
dated decision or write down why the direction stands. A brief that is never
revisited becomes the next template look.
