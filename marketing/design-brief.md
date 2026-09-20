# Design brief — TODO site name

**Status:** skeleton. Fill it with /design-direction before the site goes
live; every heading is one decision, with the reference that informed it and
the constraint that bounds it. Until it is filled the site carries the
template's default direction (editorial hero, bento, one inverted band,
system type) — sound, and visibly a template.

**The constraints that do not move** (AGENTS.md): colour measured to WCAG AA
on every band · no client JS outside `/search` · motion CSS-only inside
`prefers-reduced-motion: no-preference` · CSS inlined, under ~15 kB gzipped ·
one `<h1>` · mobile-first · LCP image eager.

## 1. Three words

TODO — e.g. "precise, warm, unhurried".

## 2. Type

- Display face: TODO (self-hosted woff2 in `public/fonts/`, ≤2 weights,
  `--font-display` in `global.css`) · or the system stack, on purpose.
- Text face: TODO.
- Hero step: `--step-5` · `--display-tracking`: TODO · `--display-leading`: TODO.
- Reference: TODO.

## 3. Colour

| Token | Value | Measured against | Ratio |
|---|---|---|---|
| `--brand` | TODO | white, as text and behind white labels | TODO |
| `--brand-strong` | TODO | | |
| `--brand-soft` | TODO | | |
| `--band-ink` / `--on-ink-*` | TODO | | |

`npm run check:contrast` output attached: TODO date.

## 4. Layout motif

TODO — editorial / bento / split / long-scroll. Hero pattern: TODO. Hero
panel content: TODO (product screen preferred).

## 5. Motion policy

Moves: TODO. Never moves: body copy, navigation, anything read.

## 6. Texture and surface

TODO — glow, grain, rules, radius, shadow.

## 7. Imagery

TODO — where product screens come from and how they are cut; illustration
style; social-card treatment.

## 8. What we refuse

- 3D / WebGL scenes, scroll-jacking, kinetic body copy, glassmorphism outside
  the header — they fail Core Web Vitals or readers.
- Stock photography.
- A brand colour the contrast sweep rejects.
- TODO — the brand's own no-gos.

## Log

- TODO date — brief created from /design-direction; references: TODO.
