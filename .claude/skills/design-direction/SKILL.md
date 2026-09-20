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
- **The galleries beyond awwwards** — each curates a different register,
  so read two or three that match the site's job, not all of them:
  Godly (godly.website — the current product-marketing register),
  Land-book and Lapa Ninja (landing pages, filterable by industry),
  SiteInspire and Minimal Gallery (restraint, editorial layouts),
  One Page Love (single-page sites), Dark Mode Design (inverted palettes
  done well), Httpster (typographic and brutalist sites — the warning
  sign of the register, not the target), Refero and Mobbin (product UI
  patterns and flows, for the hero panel's product screen and any tool
  page), Fonts In Use and Typewolf (type pairings seen in the wild, with
  the faces named). Note which gallery a reference came from: a
  Land-book winner and an awwwards SOTD are optimising for different
  things.
- **The writing about why it works** — the sources that explain the
  decisions rather than showcase them, so the brief can cite a reason:
  Refactoring UI (Wathan and Schoger — hierarchy, spacing, colour scales;
  the closest thing to this template's constraints in book form),
  Butterick's Practical Typography (measure, leading, the two-face rule),
  Google Fonts Knowledge (choosing and pairing type), Utopia.fyi (fluid
  type and space scales — what `--step-*` implements), Every Layout
  (Bell and Pickering — the layout primitives the template's bands and
  grids are built from), Nielsen Norman Group (readability, F-patterns,
  what buyers actually scan), Baymard Institute (e-commerce and form
  UX, research-backed), Smashing Magazine and A List Apart (long-form on
  accessible colour, motion and typography), web.dev (Core Web Vitals —
  the reason a trend is refused), Laws of UX (the named principles a
  brief can point at), Growth.Design (case studies of real flows), and
  the design writing of the people who ship the standing-list register:
  Linear's and Stripe's design posts, Rauno Freiberg, Emil Kowalski
  (motion that confirms rather than decorates), Josh Comeau (CSS that
  holds up). For colour systems that clear AA by construction: Radix
  Colors, Adobe Leonardo, Atmos. For the design-language vocabulary
  (what a card, a band, a button *is* on this site): Shopify Polaris,
  Atlassian, GOV.UK Design System, IBM Carbon — read for the naming and
  the rules, never to import a system.
- **The trend check.** Read what actually held up in production this year
  (as of 2026: bento layouts and dark mode shipped at scale; kinetic
  typography and glassmorphism survive only in heroes and navigation;
  3D/WebGL and blob shapes stayed with experiential brands; AI-readability
  layers — schema, llms.txt, FAQ blocks — became table stakes). A trend that
  fails Core Web Vitals or screen readers is not a trend for this site.

- **The category itself.** `marketing/landscape.md`'s § 6 lines carry the
  design register of every rival, read on a date, and its pattern read the
  register the buyer is used to. The direction is chosen against that:
  match the ~80% that makes the site credible in its category, spend the
  20% where the rivals are all the same.

Galleries show what is being made; the writing above explains why it
works — both are read live, never from memory (AGENTS: decisions are made
against current references). Some galleries refuse non-browser fetches
(awwwards and Land-book among them): use the ad-hoc Playwright the OG
pipeline installs (`npm i --no-save playwright`), or have the owner share
screenshots.

Do not copy a specific site's layout. References tell you the *register*;
the direction has to be this brand's.

Read `marketing/landscape.md` before any of the above if it exists: its
§ 6 lines are the category's design register, and its register decision
(inside the category's norms or deliberately outside them) is a choice
already taken with the owner — the references here are chosen to serve
it, not to reopen it. Read `marketing/brief.md § 8` for the sites the
owner admires and dislikes, with their reasons, and § Asset register for
what exists: a fixed brand palette, licensed fonts, product access for
screenshots. A direction that ignores a fixed asset is a redesign nobody
asked for.

Put the references to the owner before deciding: three to five, with the
one-line reading each, and ask in the session with `AskUserQuestion` which
register they want to be read against — the references are the options, one
line of consequence each, and "Other" carries the direction they name
themselves. Record what they chose and what they rejected in the brief's
Log — a reference the owner did not see is not a reference.

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
9. **The design language.** The tokens and patterns *are* the design
   system: name what each one means on this site so the next page is
   built from the vocabulary, not improvised. The buttons (primary,
   secondary, what a `.btn` never does), the cards (what earns a card,
   what sits on the plain band), the bands (which content goes on the
   inverted band, at most one per page), the numbered rail, the
   disclosure, the table (`.table-scroll`), the image treatment, the
   spacing rhythm (`--gutter`, `--measure`, what a section gap is), the icon
   policy (none, one set, inline SVG only), and the states (hover, focus
   visible, disabled — measured like text). One line each. A pattern
   not in this list is not used until it is added here with a CHECKLIST
   §8 line.

## 3. Apply

- Tokens first: `src/styles/global.css` `:root` — fonts, steps, colours,
  bands, radius. Then `marketing/og/default.html`, `marketing/og/page.html`
  (its `:root` mirrors the tokens — the lifted figures are painted by them)
  and `marketing/favicon.mjs` `BRAND_BG`, so the cards and icons follow
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
- **The smell pass** — run by eye on the 375 and 1440 screenshots before
  the owner sees them, and again on any generated page before it ships.
  The content side of this is mechanised (`npm run check:voice`, refreshed
  weekly by /refresh-anti-ai-rules); the design side is judgement only
  today — there is no `check-design-smells` script and no published
  source list comparable to Wikipedia's signs-of-AI-writing page, so this
  list is the working one and is dated. As of Sep 2026 a page reads as
  generated when it has: a gradient-filled headline or a purple-to-blue
  hero glow on a dark ground; frosted-glass cards (`backdrop-filter`)
  outside the header; three identical icon-title-blurb cards in a row,
  repeated band after band; emoji or sparkle glyphs as icons or in
  headings; a badge pill above the h1 ("✨ Now with AI"); two hero
  buttons where one action was decided; a "trusted by" logo strip with
  no real customers behind it; every corner at the same large radius and
  every card with the same soft shadow; centred text on every band;
  Inter or the system stack with one purple accent and nothing chosen;
  stock or generated photography of people smiling at laptops; abstract
  3D blobs standing in for a product screen; a testimonial with a first
  name and an initial. Each one found is fixed in the tokens or the
  composition, not hidden, and added to the brief's § 8 if the brand is
  prone to it. If this list starts being consulted at every run, mechanise
  the machine-checkable half (the CSS and markup patterns) at the
  built-output rung per AGENTS rule 18 and give it a `sources` block and
  a weekly refresh like `voice.json` has.
- Record it: the brief, a CHECKLIST §8 line for any new pattern, and a
  PLAYBOOK note if a script or asset pipeline changed. Re-render the social
  cards if the tokens changed (SETUP Phase 2).

## 4. Revisit

Once a quarter, or when the owner brings a site they admire: re-run § 1 for
the category, diff against the brief, and either update the brief with a
dated decision or write down why the direction stands. A brief that is never
revisited becomes the next template look.
