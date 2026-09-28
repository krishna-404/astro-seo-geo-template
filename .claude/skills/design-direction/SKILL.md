---
name: design-direction
description: Give a site built from this template a real design direction instead of the default look — interview the owner on the visitor's journey and the feeling the page should carry, sweep awwwards and the galleries live (npm run design:refs), decide type, colour, layout motif, motion, states and one signature move inside the template's constraints (AA measured, CSS-only motion, no client JS, LCP), write marketing/design-brief.md, apply it through the tokens and patterns in global.css, and prove it on the contact sheets (npm run design:shoot) and the measured smell sweep (npm run check:design). Use at onboarding (SETUP Phase 1, right after the brand contract), when the owner says the site looks bland or generic, or before a redesign.
---

# Design direction

The template ships a sound default: an editorial hero, a bento grid, one
inverted band, a fluid type scale, a numbered rail — all in `global.css`'s
*expressive layer*. Sound is not the same as designed. A site that never
chooses its own type, palette, composition and journey reads as a template,
and a buyer reads "template" as "nobody is home". This skill is the
deliberate choosing, done once per site and revisited when the brand moves.

**The constraint is the brief.** Everything the template enforces still
holds: colour clears WCAG AA on every band (`npm run check:contrast` measures
it), no client JavaScript outside `/search`, motion is CSS-only and lives
inside `prefers-reduced-motion: no-preference`, the LCP element loads eagerly,
CSS stays inlined and under ~15 kB gzipped, one `<h1>`, mobile-first. So we
borrow **composition, type, colour, rhythm, pacing and restraint** from the
best sites — never their WebGL, their scroll-jacking, their GSAP timeline or
their 2 MB of fonts. A design direction that needs a bundle is not one this
template can hold; a direction that needs a *runtime* is refused at § 1
before it is admired.

**What "award-worthy" means here.** The awwwards front page is mostly WebGL
and GSAP; that is not the target. The target is the register of the sites
that are designed AND ship fast pages (§ 1's standing list) — one display
face used large and rarely, one accent, generous whitespace, real proof in
the hero, motion that only ever confirms — plus the three things a jury
actually rewards and a static page can deliver: a **journey** with one
peak and a resolved ending (§ 2), a **signature move** nobody else has
(§ 3.10), and a **fingerprint** that is this brand's, not the template's
(§ 3.11). Every one of those is composition and CSS.

## 0. Interview, before looking

Ask in the session with `AskUserQuestion`, four at a time, concrete
options, "Other" carrying the owner's own words. Read `marketing/brief.md`
first (§ 8 has the sites they admire and dislike, with reasons; the asset
register has what exists) and `marketing/landscape.md` § 6 (the category's
design register, and the register decision already taken) — do not re-ask
what those answered. Record every answer verbatim in
`marketing/design-brief.md § 0`; if the owner delegates ("you decide"),
write "self-authored under explicit delegation" and decide.

1. **Three words, and three references that are not websites.** The
   register in three adjectives, and a film, an album, a shop, a magazine
   or a building the site should feel like. A non-web reference stops the
   answer being "like Stripe".
2. **The journey.** In the owner's own words: what a visitor should meet
   first, what they must believe by the end (one sentence — not a feature
   list), and the ONE moment they will describe to someone else. This is
   the peak; everything else is scored around it.
3. **Calm and intense.** Where the page should be quiet and where it
   should hit — a page with the same energy everywhere has none.
4. **Distance from premium-minimal.** The standing-list register is the
   default; how far and in which direction: editorial, dense, playful,
   brutalist, warm/craft, institutional. A named direction is a
   constraint; "not generic" is not.
5. **The signature-move seed.** One thing the owner has seen no site in
   their category do, or a thing about the product that could only be
   shown one way. It becomes § 3.10.
6. **Proof.** Which real evidence exists to put in the hero panel: a
   product screen, a figure in `facts.json`, a photograph of the actual
   work, a document. A hero with no proof gets an illustration and reads
   as a template.
7. **Off-limits.** Colours, imagery, words, competitors' looks, anything
   the owner never wants to see. Goes straight to § 3.8.
8. **Devices and states.** Where their buyers actually read (phone on a
   site visit, desktop in an office), and whether the site will ever have
   a logged-in, loading or empty state to design (most will not; say so).

## 1. Look, before deciding

**Run the sweep first**: `npm run design:refs -- --category <slug>` (one of
`business-corporate`, `startups`, `technology`, `e-commerce`,
`design-agencies`, `portfolio`, `architecture`, `fashion`, `mobile-apps`,
`hotel-restaurant`, `luxury`, `institutions`, `real-estate`…). It writes
`marketing/design-refs.md` — generated, never hand-edited — with the
category's current awwwards entries and the latest Sites of the Day, each
with its live URL and the tags awwwards applied, the tags counted in two
families, **one table per band from awwwards Elements** (hero, header,
menu, about, pricing, FAQ, stats, team, CTA, contact, footer, blog — the
same award-tier work cut at the grain a band is designed at; `--elements
a,b,c` overrides the list, `--elements none` skips it), and the galleries'
reachability. A band the sheet marks **text search** is a word awwwards has
no category for (`services` is one): its rows matched the word and are read
as such, never as the category's verdict. **Register tags** (typography,
minimal, clean, scrolling, grid, storytelling, header design) are what the
category is doing and what this template can borrow at zero JS; **tech
tags** (GSAP, Three.js, WebGL, Webflow, React) are the warning signal — a
look that needs a runtime. A category where six of twelve entries are
GSAP is a category where a fast, typographic, still page is the 20% the
rivals are not doing.

Then gather 8–12 references and write one line each in the brief's § 1:
what the site does with type, colour, layout, motion, imagery — and what
it *refuses* to do. Open the live sites, not the thumbnails.

- **awwwards, from the sweep.** Four to six from the category, two or
  three from the Sites of the Day, chosen for register tags, not tech.
  For each, name the one thing worth borrowing and how the template
  holds it: an oversized single-line headline (`--step-5`, `.display`), a
  chaptered layout (`.rail` as the folio), a typographic poster hero (no
  panel, type as the image), a split stage (`.hero__grid` with the proof
  right), a gallery (the bento as objects with labels).
- **awwwards Elements, from the sweep — read per band, when that band is
  decided.** Whole-site entries give the register; the element tables give
  the composition of one band at a time, which is how § 3 decides. Before
  the hero, the About page, the pricing table, the FAQ, the stats strip,
  the team, the CTA band, the contact form or the footer is designed, open
  that band's table, read three or four live pages, and write one line in
  the brief: the one thing worth borrowing and the template mechanism that
  holds it (a services panel as `.bento` objects with labels; a pricing
  table as `.table-scroll` with the "us" column lifted; an FAQ as native
  `<details>` with the `::details-content` transition; a stats strip as
  `.display` numerals from `facts.json`). A pattern that needs the tech tag
  next to it is admired and left.
- **The standing list — sites that are designed AND ship fast pages.** Read
  three or four that are closest to this site's job: Stripe, Linear, Vercel,
  Apple, Notion, 37signals/Basecamp, Ramp, Mercury, Raycast, Arc, Resend,
  Framer's own marketing pages, Sanity, Posthog. What they share: a display
  face used large and rarely, a restrained palette with one accent, generous
  whitespace, a product screen as the hero image, motion that only ever
  confirms an action. That is the register this template can hold at zero JS.
- **The galleries beyond awwwards** (the sweep lists them with reachability;
  read two or three that match the site's job, not all): Godly (the
  current product-marketing register), Land-book, Landdding and Lapa
  Ninja (landing pages filterable by industry — Landdding by 40+
  industries with the designer credited), SiteInspire and Minimal Gallery
  (restraint, editorial layouts), One Page Love (single-page sites), Dark
  Mode Design (inverted palettes done well), Httpster (typographic and
  brutalist — the warning sign of the register, not the target), Inspora
  (web, branding, motion and print screenshots by category — for the
  non-web references from § 0), Refero and Mobbin (product UI patterns and
  flows, for the hero panel's product screen and any tool page), Fonts In
  Use and Typewolf (type pairings seen in the wild, with the faces
  named). Designeer is a directory of all of these; use it to find the
  next gallery, never as a reference itself. Note which gallery a
  reference came from: a Land-book winner and an awwwards SOTD are
  optimising for different things.
- **Component and section libraries — composition sources, never code.**
  Read them for what a section, a card, a navigation or a reveal can be;
  every one ships React, Tailwind, Framer Motion, GSAP or WebGL, which
  this template does not run, so nothing is installed and nothing is
  pasted. The good ones: uselayouts.com (layouts, navigation,
  interactions, UI; free, MIT), obsidianui.dev (animated interfaces;
  MIT), originkit.dev (animated components; free), pixel-perfect.space
  (micro-interactions; free), ui.soralabs.studio (scroll chapters, sticky
  cards, text reveals), atelier-ui.com (scroll and text effects, a WebGL
  layer — read the first two, refuse the third), cuedesign.space (a
  curated set lifted from awwwards-tier sites; a paid membership — the
  free tier is enough to read), motionin.design (self-contained motion
  sections, original rather than lifted from live sites — a pattern
  source for what a reveal or a product showcase can be, each one
  re-expressed as `view()` timelines, `::details-content` or a
  `clip-path` transition, or refused). The test for each pattern: can it
  be one of the mechanisms in § 3.5? If not, it is admired and left.
- **Type, icons, backgrounds — the sources with usable licences.**
  Fontshare (Indian Type Foundry — free for commercial use under its own
  licence; read the licence page of the family before downloading, then
  self-host the woff2 in `public/fonts/`, two weights at most — the CSP
  is `font-src 'self'`, so no gallery's CDN is ever linked); Google Fonts
  the same way (download, subset, self-host — never the `<link>`); for
  pairings, Fonts In Use and Typewolf above. Icons: the template's policy
  is none, or ONE set inlined as SVG — Phosphor, Tabler, Lucide, Heroicons
  are MIT; Hugeicons has a free tier and a paid one, read which the
  needed glyphs fall in before taking any. Backgrounds: backgrounds.supply
  and the like are gradient and pattern ideas — reproduced in the tokens
  as CSS, never a PNG, and measured behind text like any band.
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
  brief can point at — the peak-end rule is the one § 2 is built on),
  Growth.Design (case studies of real flows), and the design writing of
  the people who ship the standing-list register: Linear's and Stripe's
  design posts, Rauno Freiberg, Emil Kowalski (motion that confirms
  rather than decorates), Josh Comeau (CSS that holds up). For colour
  systems that clear AA by construction: Radix Colors, Adobe Leonardo,
  Atmos. For the design-language vocabulary (what a card, a band, a
  button *is* on this site): Shopify Polaris, Atlassian, GOV.UK Design
  System, IBM Carbon — read for the naming and the rules, never to import
  a system.
- **The trend check.** Read what actually held up in production this year
  (as of 2026: bento layouts and dark mode shipped at scale; kinetic
  typography and glassmorphism survive only in heroes and navigation;
  3D/WebGL and blob shapes stayed with experiential brands; scroll-driven
  reveals moved from GSAP to CSS `animation-timeline`; AI-readability
  layers — schema, llms.txt, FAQ blocks — became table stakes). A trend
  that fails Core Web Vitals or screen readers is not a trend for this
  site.
- **The category itself.** `marketing/landscape.md`'s § 6 lines carry the
  design register of every rival, read on a date, and its pattern read the
  register the buyer is used to. The direction is chosen against that:
  match the ~80% that makes the site credible in its category, spend the
  20% where the rivals are all the same — and the sweep's tech-tag count
  says where that is.

Galleries show what is being made; the writing above explains why it
works — both are read live, never from memory (AGENTS: decisions are made
against current references). A gallery the sweep marks unreachable (a bot
wall) is opened in a browser or the owner shares screenshots; it is never
summarised from memory.

Do not copy a specific site's layout. References tell you the *register*;
the direction has to be this brand's — § 3.11 checks that it is.

Put the references to the owner before deciding: three to five, with the
one-line reading each, and ask in the session with `AskUserQuestion` which
register they want to be read against — the references are the options, one
line of consequence each, and "Other" carries the direction they name
themselves. Record what they chose and what they rejected in the brief's
Log — a reference the owner did not see is not a reference.

## 2. The journey — write the feeling before the bands

A page is not a stack of sections; it is a route a visitor walks, and the
route is designed before any band is. Fill `design-brief.md § 0` from the
interview:

- **The beats.** Four to seven, in order, each shifting what the visitor
  knows or feels: *recognition* (this is for me) → *tension* (the cost of
  the problem) → *turn* (the way out) → *substance* (how it works, proof)
  → *range* (what else it covers) → *commitment* (the one action). A band
  that serves no beat is cut. Each beat names its band and its layout
  family (`hero--editorial`, `bento`, `rail`, `split`, a figure band, the
  FAQ, the inverted close) — and the same family never sits twice in a
  row (`npm run check:design` fails two adjacent bands with the same
  class list).
- **The feeling curve.** One line per beat: the emotion, then what on
  screen causes it. If two adjacent beats produce the same feeling, one
  of them is filler. Calm before intensity, or the intensity is noise.
- **The peak.** ONE moment — the one from interview question 2. It gets
  three things at the expense of every other band: the best asset (the
  product screen, the figure, the photograph), silence in front of it
  (a plain band, more space, less copy), and the most room. A page with
  three peaks has none.
- **The ending resolves.** The last band is the inverted `.band--ink`
  with one action and it holds; a page never trails off into the footer.
  The final feeling is the one that lasts.
- **The tell-someone test.** Complete "it's the site where ___" with
  something that happened to the visitor, not a technique. "Where the
  number you owe climbs as you scroll to the fix" passes; "it has a scroll
  reveal" does not. If nothing completes it, there is no signature move
  yet (§ 3.10).

## 3. Decide — write `marketing/design-brief.md`

Fill the skeleton, one decision per heading, each with the reference that
informed it and the constraint that bounds it. A decision about one band
(the hero, the About page, pricing, FAQ, stats, team, CTA, contact, the
footer) is made with that band's element table from the sweep open — the
reference is named in the brief line, source `elements:<band>`:

1. **Three words.** The register the site should read as (e.g. "precise,
   warm, unhurried"). Everything below has to agree with them.
2. **Type.** Display face + text face — two families at most, and
   emphasis is the same family's italic or bold, never a third. The
   template's default is the system stack; a chosen face is
   **self-hosted** in `public/fonts/` as woff2 (subset, two weights at
   most, `font-display: swap`, preload the display face), because the CSP
   is `font-src 'self'` — no Google Fonts or Fontshare request. Point
   `--font-display` at it in `global.css`; the fluid steps
   (`--step--1 … --step-5`) do the sizing. Say which step the hero uses and
   how tight `--display-tracking` goes. Inter and the system stack are a
   choice, not a default: they read as "nothing chosen" unless the brief
   says why (an accessibility-first or public-sector register earns it).
   Body measure 45–75 characters (`--measure`, `.prose` at 44rem); light
   text on the dark band gets a touch more leading, tracking and weight
   than the same size on white.
3. **Colour.** `--brand`, `--brand-strong`, `--brand-soft`, the four bands,
   the inverted band tokens (`--band-ink`, `--on-ink-*`). ONE accent for
   the whole site, saturation restrained; secondary text is an ink from
   the ramp, never a flat grey; no pure black anywhere (the sweep fails
   it). Every value that carries or sits behind text is **measured before
   it is chosen**: run `npm run build && npm run check:contrast` and darken
   until green. A brighter accent can live where it is neither text nor
   behind text (a rule, a mark, a glow). Two palettes are refused as
   defaults because every generated site reaches for them: purple-to-blue
   with a neon glow, and cream-and-brass "premium consumer" — either is
   allowed only when the brand's own colours are those and the brief says
   so.
4. **Layout motif.** One of: *editorial* (oversized headline, narrow copy,
   asymmetric panel — the default), *bento* (a lead card and supporters),
   *split* (copy left, product right on every band), *long-scroll narrative*
   (one idea per band, alternating), *typographic poster* (type is the
   image; no panel), *chaptered* (a numbered rail as the folio, long-form
   substance). Name the hero pattern and what sits in the hero panel: a
   product screen (preferred — it is proof), a figure from `facts.json`, a
   photograph, an illustration. Never a stock image, never a screenshot
   built from `<div>`s. The hero holds at most four text elements (one
   label or none, the h1 ≤ 2 lines on desktop, a lede ≤ 20 words, the
   CTAs) and its first CTA is inside a 375×667 fold — the sweep checks it.
5. **Motion policy.** What moves and why: the scroll reveal (`.reveal`,
   CSS `animation-timeline: view()`), card hover lift (gated to
   `(hover: hover) and (pointer: fine)`), disclosure transitions
   (`::details-content`), a `clip-path` wipe, a `scroll()` timeline that
   advances a figure or a numeral — all inside the motion query, all on
   `transform`, `opacity` or `clip-path`, never on width, height, margin or
   position, never `transition: all` (the source rule fails it). One ease
   (`--ease-out`), UI transitions under 300 ms, entrances from
   `scale(.95)`+opacity, never from zero. State what does **not** move:
   body copy, navigation, anything a reader has to read. Every animation
   is justified in one sentence (hierarchy, feedback, state, story) or
   cut.
6. **Texture and surface.** Gradient glow, grain, rules, the radius scale
   (`--radius-sm` for controls, `--radius` for panels, `--radius-lg` for
   cards — one scale, never a fourth value), shadow depth (three steps,
   tinted to the canvas, never on everything). Decorative layers are inert
   (`aria-hidden`, `pointer-events: none`) and never behind text unless
   measured. Depth comes from overlap and scale before it comes from
   shadow.
7. **Imagery.** Where product screens come from and how they are cut — crop a
   full-page app capture to the band that carries the point, 1440 px wide,
   through `astro:assets` — the illustration style if any, and the
   social-card treatment (`marketing/og/default.html` follows the tokens).
   Text is never baked into an image.
8. **What we refuse.** The list from § 1's trend check, the smell list in
   § 4, plus the brand's own no-gos from interview question 7, so the next
   editor does not re-argue them.
9. **The design language.** The tokens and patterns *are* the design
   system: name what each one means on this site so the next page is
   built from the vocabulary, not improvised. The buttons (primary,
   secondary, what a `.btn` never does — and all four states: hover,
   focus-visible, active, disabled, each a measured colour pair), the
   cards (what earns a card, what sits on the plain band), the bands
   (which content goes on the inverted band, at most one per page), the
   numbered rail, the disclosure, the phone menu (`Header.astro`'s
   `<details>`), the table (`.table-scroll`), the form (inline errors by
   `:user-invalid`, the thanks page as the success state), the image
   treatment, the spacing rhythm (`--gutter`, `--measure`, what a section
   gap is — more space above a heading than below it), the icon policy
   (none, one set, inline SVG only), the empty state (a collection index
   with nothing in it), the 404, and the JS-off notice on `/search`. One
   line each. A pattern not in this list is not used until it is added
   here with a CHECKLIST §8 line.
10. **The signature move.** One bespoke interaction this site has and no
    other does, built from the CSS mechanisms in § 3.5 and coded into the
    page, not a parameter of a shared class. A figure that draws itself as
    the band enters; a sticky rail whose numerals fill as each step passes;
    a hero headline whose second line is revealed by a `clip-path` keyed to
    `scroll()`; a comparison table whose "us" row lifts on entry; a
    numeral in `.display` that counts through `@property` as it scrolls
    into view. Recolouring the default reveal is not a signature move; the
    test is that a person who knows the template could tell this site by
    it. Write what it is, which band carries it (usually the peak), and
    the sentence it earns in the tell-someone test.
11. **The fingerprint.** Six dimensions, and this site differs from the
    template default (recorded in the brief's table) and from any previous
    site built from the same copy on at least four: the motif; the hero
    pattern and its panel; the band sequence (order and families); the
    close; the type pairing; the signature move. A site that matches the
    default on three or more is the template with a new colour, and the
    owner is told so before it ships.

## 4. Apply

- Tokens first: `src/styles/global.css` `:root` — fonts, steps, colours,
  bands, radius, ease. Then `marketing/og/default.html`,
  `marketing/og/page.html` (its `:root` mirrors the tokens — the lifted
  figures are painted by them) and `marketing/favicon.mjs`, so the cards
  and icons follow (SETUP Phase 1 lists every file the brand colour lives
  in; `check-parity` fails a card template in a different brand colour).
- Composition second: `src/pages/index.astro` chooses its hero pattern and
  panel, the bento's lead card, the one inverted band, and carries the
  signature move. Other pages inherit through the shared classes; touch
  them only where the motif demands.
- Fonts: `public/fonts/<face>-<weight>.woff2`, `@font-face` in `global.css`,
  `<link rel="preload" as="font" type="font/woff2" crossorigin>` for the
  display face in `BaseLayout` (one preload — more delays the LCP).
- Prove it, in this order:
  1. `npm run build`, `npm run check:contrast`, `npm run check:a11y`,
     `npm run check:invariants`, and **`npm run check:design`** — the
     measured half of the smell pass, over every page at 375 and 1440: no
     sideways scroll, nothing spilling off the screen, the layout intact at
     200% text, touch targets ≥44px, the hero CTA inside the fold, no
     gradient text, no glass outside the header, no `transition: all`, no
     emoji in headings or buttons, at most one eyebrow per three sections
     and none that is a section number, no three identical cards in a row,
     no two adjacent bands alike, no pure black. It runs in `npm run
     verify` and in CI; a red is fixed in the tokens or the composition,
     never by loosening the threshold (a loosened threshold is a dated
     CHECKLIST §9 line, with the reason).
  2. **`npm run design:shoot`** — the contact sheets, into
     `marketing/design/shots/` (gitignored): every page at 375 and 1440,
     the full phone page, and six frames along the desktop scroll side by
     side. Read each sheet cold: one word per frame for what it makes you
     feel, against the feeling curve in the brief's § 0; where they
     disagree the PAGE is wrong, not the brief. Confirm the peak is the
     largest frame and has the most room; confirm the last frame resolves.
  3. **The squint test** on the 1440 frame: blur it until detail is gone;
     you should still name the primary element, the secondary, the groups,
     in that order. If not, the fix is hierarchy — size, weight, space —
     never shadow, gradient or motion.
  4. **The smell pass by eye** — the judgement half, on the same shots and
     again on any generated page before it ships. As of Sep 2026 a page
     reads as generated when it has: a bland hero with nothing to prove;
     a badge pill above the h1 ("✨ Now with AI"); two hero buttons where
     one action was decided; a "trusted by" logo strip with no real
     customers behind it; every corner at the same large radius and every
     card with the same soft shadow; centred text on every band; Inter or
     the system stack with one purple accent and nothing chosen; stock or
     generated photography of people smiling at laptops; abstract 3D blobs
     standing in for a product screen; a testimonial with a first name and
     an initial; a section labelled "01 / 06"; a scroll cue or animated
     mouse; a marquee more than once; a version label in the hero; filler
     verbs ("elevate", "seamless", "unleash" — `check:voice` catches the
     words, the eye catches the layout that needs them). Each one found is
     fixed in the tokens or the composition, not hidden, and added to the
     brief's § 8 if the brand is prone to it. When one of these proves
     measurable, it moves into `check-design-smells.mjs` with a CHECKLIST
     §9 line (AGENTS rule 18).
  5. **A real phone.** Headless Chrome cannot show a collapsing URL bar,
     iOS's touch scrolling or a thumb on a 44px target; the owner opens the
     preview on theirs before the direction is signed off. Tab through the
     homepage once for focus order.
  6. Confirm CSS size in the build output stayed under the budget.
- Record it: the brief (every heading, the fingerprint table, the Log with
  what the owner saw and chose), a CHECKLIST §8 line for any new pattern
  or mechanism, and a PLAYBOOK note if a script or asset pipeline changed.
  Re-render the social cards if the tokens changed (SETUP Phase 2).

## 5. Revisit

Once a quarter (ACTIONS A-Q04 — `npm run actions` goes red when the sweep
is older than 92 days), or when the owner brings a site they admire: re-run
`npm run design:refs`, diff the two sweeps' tag counts (what the category
started and stopped doing), re-read three or four sites, and either update
the brief with a dated decision or write down why the direction stands. A
brief that is never revisited becomes the next template look.

## What this skill never does

- Install a runtime for a look: no GSAP, Lenis, Framer Motion, Three.js,
  Tailwind or a component library. A pattern is re-expressed in the
  mechanisms of § 3.5 or refused.
- Copy a reference's layout, copy, palette or type pairing wholesale. The
  fingerprint (§ 3.11) is checked against the template, but the
  references are checked by eye — a site that is recognisably one of them
  is a site someone else designed.
- Ship a colour by eye, a number in markup (AGENTS rule 1 — the peak's
  figure comes from `facts.json`), a stock image, or a signature move
  that needs JavaScript.
- Accept the default because the owner has no opinion. "You decide" is a
  delegation to decide, recorded as such, not permission to leave the
  template's look in place.
