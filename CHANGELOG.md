# Changelog

One line per merged pull request, newest first — the upgrade notes for a site
built from this template. Each entry says what changed and, where it matters,
what a site that already adopted the template has to do about it.

The per-file `## Log` tables stay where they are: this file says WHAT changed,
those say why a particular decision in a particular file reads the way it
does. Decisions with reasons are `CHECKLIST.md`.

## Unreleased

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
