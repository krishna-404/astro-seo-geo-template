# marketing/ — things a human runs at publish time

`scripts/` is what CI runs on every push and must stay dependency-light.
This folder is what a person runs occasionally, and it may need a headless
browser or an image library. Nothing here runs during the build.

## What's here

| Path | What | Run it when |
|---|---|---|
| `favicon.mjs` | `public/favicon.svg` → `favicon.ico` (16/32/48) + 48/96px PNGs + an opaque `apple-touch-icon.png` | The logo or brand colour changes: `npm i --no-save sharp && node marketing/favicon.mjs` |
| `og/default.html` | Source for the site-wide social card — name, tagline, domain, `--brand` colour | Edit once when adopting the template, then re-render |
| `og/render.mjs` | Renders `og/default.html` → `public/og/default.png` (1200×630) | Whatever the default card says changes |
| `og/page.html` | Template for per-page cards: brand row, eyebrow, title, description, and the page's lead figure (inline SVG lifted from the built page). Its `:root` tokens mirror `global.css` | The brand tokens change: edit the `EDIT FOR YOUR SITE` block |
| `og/render-pages.mjs` | One card per built page at `public/og/<route>.jpg` — title, description and figure read from **dist/** HTML, never a hand-kept list; the brand row from `src/data/brand.json` and the eyebrow from `src/data/collections.json` | Any content change: `npm run build`, `npm i --no-save playwright`, `CHROMIUM_CHANNEL=chrome node marketing/og/render-pages.mjs`, `npm run build` |
| `apps-script/contact-form.gs` | The Google Apps Script behind the contact form — Sheet row + email, honeypot filter, `selfTest()`. **This file is the source of truth**; Google's editor has no diffs | Any form-logic change: edit here, paste there, publish a NEW VERSION (saving the editor changes nothing live) |
| `apps-script/appsscript.json` | The script project's manifest, pinning the two OAuth scopes (this spreadsheet, send mail as you). Without it Apps Script infers scopes from the source and asks for every spreadsheet in the account — see `apps-script/README.md` | Paste it alongside the `.gs` at setup; edit only if the script starts touching something new |

Two things to remember:

- **Cards ship on the NEXT build.** They land in `public/`, which Astro
  copies into `dist/` at build time — render, then build again, or let the
  next deploy carry them.
- **Playwright and sharp are deliberately not dependencies.** They run at
  publish time, not in CI or the build, so install them ad hoc with
  `--no-save` and keep the production toolchain light.

## The "EDIT FOR YOUR SITE" convention

The brand STRINGS are no longer among these. `src/data/brand.json` holds the
name, the tagline, the meta description and the quotable `brief`;
`src/data/site.ts` spreads them into `SITE`, and the two node scripts that
cannot import TypeScript — `scripts/generate-llms.mjs` and
`og/render-pages.mjs` — read the same JSON. They each carried their own copy
until 27 Sep 2026, which is three places to edit and two to forget.

What remains is the values a node script or Apps Script genuinely cannot
share: colour literals in files that are not CSS, and the Apps Script
constants that live in Google's editor. When adopting the template, sweep:

- `og/page.html` — the `:root` tokens, mirroring `global.css`
- `og/default.html` — the three strings (name, tagline, domain) and `--brand`
- `favicon.mjs` — `BRAND_BG` (the apple-touch-icon backing colour)
- `apps-script/contact-form.gs` — `NOTIFY_TO`, `NOTIFY_BCC`, `THANKS`
  (`SHEET_ID` stays empty: the script writes to the sheet it is bound to, which
  is what keeps its permission prompt to that one file)

Keep the colour literals in step with the brand tokens in
`src/styles/global.css` / `src/data/site.ts` — nothing checks this for you,
and a favicon or card still showing the old brand colour is the kind of
thing nobody notices for a year.
