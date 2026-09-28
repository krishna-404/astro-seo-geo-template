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
- `apps-script/contact-form.gs` — `NOTIFY_TO`, `NOTIFY_BCC`, `THANKS`
  (`SHEET_ID` stays empty: the script writes to the sheet it is bound to, which
  is what keeps its permission prompt to that one file)

`favicon.mjs` is no longer on that list: it reads `--brand` out of
`src/styles/global.css`. The two card templates cannot import anything, so
**`check-parity` rule 7 fails a commit where their `--brand` and the token
disagree** (27 Sep 2026) — the rest of `page.html`'s `:root` block is still
mirrored by hand, so sweep it when the palette moves, and re-render the cards
afterwards.


## The engine's files — what lives where

The operating layer, one row each. A rule is stated in full in ONE of these
and cited everywhere else; `AGENTS.md § Content rules` is the index of which.

| File | What it holds | Who writes it |
|---|---|---|
| `STRATEGY.md` | This site's instance of the blueprint: buyer, clusters, the funnel ladder (§ 5), the merge model (§ 9), the honest state | `/onboard-marketing`, then the owner |
| `site-blueprint.md` | The transferable shape of a complete site: page taxonomy, intent→page-type, interlinking, conversion, AEO/GEO levers | Fixed; STRATEGY wins any conflict |
| `brief.md` | The discovery brief and the asset register: why now, the one job, what exists, what is off-limits | `/discover` |
| `landscape.md` | The category torn down site by site, with the owner's verdict on each | `/landscape` |
| `design-brief.md` | The site's own look: the journey and its peak, type, colour, motif, motion, the design language, one signature move, the fingerprint, what it refuses | `/design-direction` |
| `design-refs.md` | GENERATED — the category's awwwards entries, the Sites of the Day and one awwwards Elements table per band on the date of each sweep, tags split into register vs tech; the readings go in the brief | `npm run design:refs` |
| `VOICE-GUIDE.md` | The voice: reader, stance, house rules (§ 3), integrity rails, the ship checklist (§ 6) | `/onboard-marketing` |
| `writer-brief.md` | The one-page brief a writer works from: piece types, the pre-flight, the review gates | `/onboard-marketing` |
| `content-guidelines.md` | How every piece is written — and § 2 is the fuel rule | Fixed |
| `page-guidelines.md` | What each page type contains, including the citation checklist `npm run audit:pages` scores | Fixed |
| `keyword-map.md` | One row per page: the query it claims, its status, its evidence. High-intent at the top | `/keyword-map` |
| `runbook.md` | Who does what each day, week, month and quarter — and "Your ten minutes today" | Fixed |
| `ACTIONS.md` | Every human action with a mechanical `Check`, verified by `npm run actions` | The engine adds; the owner ticks |
| `DATA-SHEET.md` | The open questions only the owner can answer. Questions, never answers | The engine adds; the owner answers |
| `link-targets.md` | The listings and entity anchors a human has to claim | The engine surfaces; the owner claims |
| `launch-playbook.md` | The launch: the gate, then the announcement | `/launch` |
| `field-notes.md` | The owner's debriefs — the richest fuel channel | `/interview` |
| `news-log.md` | Dated events with primary sources, and each run's entry | Every run |
| `social-queue.md` | The social posts every new piece ships with, `unposted` until the owner posts | `/write-content` |
| `ai-panel.md` | The monthly share-of-voice panel across the assistants. Never fabricated | The owner runs it |
| `insights/` | The dated JSON snapshots, and `genai/` for the Search Console export | `/insights-review` |
| `channel-gaps.md` | Channels the site is absent from, and what each would cost | The engine proposes |
| `playbook-intake.md` | Every outside playbook ingested: adopted / trial / refused, with reasons | `/ingest-playbook` |
| `content-inventory.md` | Generated. `npm run inventory` — never hand-edited | `scripts/content-inventory.mjs` |
| `audit-2026-09-27.md` | The template audit and what happened to each finding | One-off |
| `apps-script/` | The contact form's Google Apps Script and its manifest. **This is the source of truth**; Google's editor has no diffs | By hand, then pasted |
| `og/`, `favicon.mjs` | The card and favicon renderers — see the table at the top of this file | Run on change |
