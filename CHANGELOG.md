# Changelog

One line per merged pull request, newest first — the upgrade notes for a site
built from this template. Each entry says what changed and, where it matters,
what a site that already adopted the template has to do about it.

The per-file `## Log` tables stay where they are: this file says WHAT changed,
those say why a particular decision in a particular file reads the way it
does. Decisions with reasons are `CHECKLIST.md`.

## Unreleased

- **The sweep reads awwwards Elements, one table per band** (28 Sep 2026).
  `npm run design:refs` now also fetches the awwwards Elements gallery for
  the bands a site from this template has (hero, header, menu, about,
  pricing, FAQ, stats, team, CTA, contact, footer, blog; `--elements`
  overrides, `--elements none` skips) and writes one table per band —
  element, maker, the live page it was cut from, the awwwards page, tags —
  into `marketing/design-refs.md`; `/design-direction` § 3 reads a band's
  table before that band is decided. A slug awwwards has no category for is
  a text search there, and the sheet says so per band rather than filing
  it as a category (`scripts/lib/awwwards.mjs`, tested). A site that
  already adopted the template: nothing to do; the next `design:refs` run
  carries the tables.
- **The design pass gets an interview, a live sweep, a journey, a signature
  move and a measured proof** — the design intake of 27 Sep (the owner's
  playbook, scroll-craft, taste-skill, the component libraries and galleries,
  sorted in `marketing/playbook-intake.md`). `/design-direction` now asks the
  owner where the visitor goes and what they must feel before it looks,
  runs `npm run design:refs -- --category <slug>` (the category's current
  awwwards entries and the Sites of the Day with live URLs and tags, register
  vs tech, into `marketing/design-refs.md`, generated), writes the journey
  and its one peak before any band, decides one CSS-only signature move and
  a six-dimension fingerprint against the template default, and proves the
  result with `npm run design:shoot` (contact sheets: phone, desktop, six
  frames along the scroll) and **`npm run check:design`** — a new
  built-output check in verify and CI: no sideways scroll or spill at 375 and
  1440, the page intact at 200 % text, touch targets ≥44px, the hero CTA
  inside the fold, no gradient text, glass, `transition: all`, emoji,
  eyebrow-over-everything, section numbers, identical card rows, repeated
  bands or pure black. `check-source-rules` bans `transition: all` and lone
  `vh` heights. In the tokens: one radius scale (`--radius-sm/--radius/
  --radius-lg`), `--ease-out` with two durations, a measured `.btn`
  disabled state, pointer-gated hover, brand `::selection` and
  `accent-color`; the contact form shows errors inline by `:user-invalid`;
  the header gains a native `<details>` phone menu and wraps at 200 % text.
  The template homepage drops from ten eyebrows to two. `marketing/
  design-brief.md` grows § 0 (the journey), § 11 (signature move) and § 12
  (fingerprint); ACTIONS A-Q04 re-sweeps quarterly. **Adopting sites:**
  `npm run check:design` will be red on a page with a label over every
  heading or a `transition: all` — fix the composition, not the threshold;
  re-run `/design-direction` § 0–2 to fill the brief's new sections.

- **The cadence deploys itself, and every rule has one owner** — streams C and
  D of the 27 Sep audit. `marketing/STRATEGY.md § 9` becomes the one statement
  of the merge model, and its default changes from PR review to
  **commit-to-main**: a `/content-cadence` run commits to `main` on a green
  battery and runs the ship steps itself (regenerate → build → deploy → purge →
  IndexNow + Bing → live smoke), with three guards that fall back to a pull
  request. Every deploy path regenerates `lastmod`, the inventory and the OG
  cards before it builds, which is why date drift stays a note. The doc set is
  consolidated to one owner per rule, and `README.md` gains a glossary of this
  repo's terms and a start-here path. New: `fuel` and `ogImageAlt` in the
  content schema, visible glossary aliases, `scripts/ask.mjs`, `CHANGELOG.md`.
  **Adopting sites:** confirm or change the merge model in STRATEGY § 9 — the
  default now publishes without a human step.

## 2026-09-27

- **#15 — Streams A and B: one config per fact, four shared libraries, a test
  suite, money pages, comparison pages, and an About page that is data.**
  `src/data/collections.json` and `src/data/redirects.json` replace eleven
  hand-kept lists and a TypeScript map parsed by regex; `scripts/lib/` gains
  `html`, `content`, `routes` and `snapshots`; `discovery-audit` folds into the
  AEO report as levers; IndexNow drops its race machinery and gains Bing URL
  Submission; `npm test` (`node --test`) arrives at the fast tier. New
  `solutions` and `comparison` collections with routes, schemas and snippets;
  the About page rebuilt from `facts.json → company` plus `src/data/about.json`,
  omitting any value still TODO. **Adopting sites:** a collection now needs an
  entry in `collections.json`, and redirects move to `redirects.json`.
- **#14 — Playbooks, guidelines, an owner action ledger, /ingest-playbook, and
  the template audit.** `marketing/ACTIONS.md` with `npm run actions`,
  `page-guidelines.md`, `content-guidelines.md`, `launch-playbook.md`,
  `runbook.md`, `playbook-intake.md`; `npm run audit:pages`; the quick-win,
  BOFU and competitor blocks in the Search Console pull; `/ingest-playbook` and
  `/launch`; `marketing/audit-2026-09-27.md`.

## 2026-09-21

- **#13 — Answer-engine funnel: AEO and GEO get one score, mostly unattended.**
  `scripts/lib/aeo.mjs` scores reachable → ingested → indexed → shown →
  followed, each stage capped by the one above and declaring whether it was
  measured `auto`, `partial` or `manual`; `scripts/lib/crawlers.mjs` becomes the
  one registry of answer-engine user-agents. `npm run aeo`, `-- --trend`.
- **#12 — Apps Script asks for one sheet, not the whole Drive account.** The
  contact-form script is container-bound and its manifest pins
  `spreadsheets.currentonly` + `script.send_mail`, instead of inferring an
  account-wide grant. **Adopting sites:** re-paste both files, publish a new
  version, and revoke the old grant before re-consenting — a grant already
  given is not narrowed by editing the manifest.

## 2026-09-20

- **#11 — Skills ask their questions in the session, not in a file.** Every
  setup skill puts its questions to the owner with `AskUserQuestion`, batched
  up to four with concrete options; only what the owner defers reaches
  `marketing/DATA-SHEET.md`.
- **#10 — Docs follow the card and Actions changes; the brand card's absence
  fails the build.**
- **#9 — Figures on every content page, social cards that show the page, and
  opt-in GitHub Actions.** `figures:` frontmatter drawn as inline SVG at build
  time, the lead figure lifted onto the page's own social card;
  `check-invariants` fails a content page without one. CI and IndexNow become
  manual-dispatch only — the pre-push battery is the gate.
- **#8 — Fold the parallel /discover and /landscape work into the canonical
  skills.**
- **#7 — Add /discover and /landscape, widen design and voice sources,
  re-sequence /new-site.** The conversation no longer starts at "decide": the
  brief and the asset intake come first, then the category teardown.
- **#6 — Posts API, no post caps, the cadence's PR inbox, and /new-site.**
  `POST /api/posts` validates a post and opens a pull request; the per-date and
  per-week post caps are removed (the schema, sources, `proprietary`, voice and
  in-body links are the gates, never a count).
- **#5 — Port the September engine work, measure generative AI, add the design
  layer.** The high-intent machinery, the ask loop, the Search Console
  Generative AI export, the expressive CSS layer and `/design-direction`.

## Before #5

The template's own construction — the Astro + Workers architecture, the
invariant battery, the hooks, `SETUP.md` and `CHECKLIST.md`. Not itemised here;
`CHECKLIST.md` carries each decision with its reason and its date.
