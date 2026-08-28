# SETUP — turning this template into a real site, in order

This is the walkthrough for a NEW site: every per-site value, in dependency
order, each phase ending with a verification you can run. It exists because
the values below are scattered across a dozen files by design (each lives
next to what it configures), which means nothing but this list makes you
visit all of them — and the ones you skip won't fail a build; they'll ship
as `Example Co` in your OG cards and `hello@example.com` in your footer.

**Do phases 0–2 before writing any content.** Once the blog work starts,
nobody comes back for the hygiene items — that is what this file is for.

The placeholder convention: everything that needs your value says `TODO`,
`example.com`, or `Example Co`. At any point,

```bash
grep -rn "TODO\|example\.com\|Example Co" src public wrangler.jsonc marketing --include='*.*'
```

lists what's still yours to do. **Phase 2 is not done until that grep is
clean** (the two exceptions it may legitimately still show: `privacy.json`
TODOs render as visible `[TO CONFIRM: …]` markers and block nothing — clear
them in phase 4; `productSchema.example.ts` is reference code, delete it if
unused).

Sibling docs: `README.md` quickstart · `CHECKLIST.md` every baked-in decision
and why · `PLAYBOOK.md` operating knowledge and traps · `AGENTS.md` standing
editing rules. This file tells you WHERE to go; those tell you WHY it's built
that way.

---

## Phase 0 — decide (nothing in the repo yet)

Three decisions that are cheap now and unrecoverable later (PLAYBOOK §0):

- [ ] **One buyer, one primary conversion action.** Every page's CTA
      hierarchy falls out of this.
- [ ] **One canonical domain.** Every other host (www, legacy, vanity) will
      301 to it. Splitting authority is unrecoverable without a migration.
- [ ] **Cold-email sending domains stay separate** — never linked from the
      site, never hosting anything.

## Phase 1 — identity (all in-repo, no accounts, no deploys)

Work top to bottom; later files read earlier ones.

- [ ] `src/data/origin.mjs` — the domain. One line; every absolute URL on
      every surface (canonicals, sitemap, robots, llms.txt, schema) derives
      from it.
- [ ] `src/data/site.ts` — the brand contract: `name`, `tagline`,
      `description` (120–165 chars — CI enforces the bounds on every
      indexable page), `locale`, `themeColor`, nav, contact channels,
      `FOUNDER` (real person, real LinkedIn — the schema and every byline
      key on it). Leave `ANALYTICS` and `VERIFICATION` empty for now
      (phase 4).
- [ ] `src/data/facts.json` — replace the founder TODOs, delete the
      `example` block, add your real numbers WITH sources. The rule (AGENTS
      rule 1): no number is ever typed into markup — pages import from here.
- [ ] `src/data/taxonomy.ts` — the glossary categories your content will
      actually use (closed vocabulary; a typo'd category fails the build).
- [ ] **Brand colour + favicon**: replace `public/favicon.svg`; set the
      tokens in `src/styles/global.css`; update the `BRAND_BG` literal in
      BOTH `marketing/favicon.mjs` and `marketing/og/render-pages.mjs`, and
      `--brand` in `marketing/og/default.html`; then
      `node marketing/favicon.mjs`. ⚠ Colour is measured, not eyeballed:
      `npm run build && npm run check:contrast` — do not ship a colour the
      checker rejects; darken it until it passes.
- [ ] `public/.well-known/security.txt` — `Contact`, `Canonical` (your real
      host — RFC 9116 makes the file assert which host it belongs to, so a
      wrong value is worse than none), `Expires` ~1 year out. Put the annual
      renewal in your calendar now (PLAYBOOK §9 — an expired file reads as
      an unmaintained site to exactly the audience it exists for).
- [ ] `wrangler.jsonc` — rename the worker (`"name"`).
- [ ] Page copy: `src/pages/index.astro`, `about.astro`, `contact.astro` —
      rewrite the template's self-describing copy (including the homepage
      FAQ array, which feeds both the accordion and the FAQPage schema).
- [ ] Sample content: the entries in `src/content/blog/` and
      `src/content/glossary/` carry `TODO Founder Name` authors. Replace
      them with your first real entries — or fix their frontmatter if you
      keep them as drafts while learning the schema shape.

**Verify:** `npm ci && npm run build` is green (zod tells you exactly which
frontmatter field it hates), `npm run check` passes, and the placeholder
grep above is clean apart from the two stated exceptions. (`npm ci` also
activates the git hooks — from here on, commits run the fast checks and
pushes run the full battery automatically.)

## Phase 2 — generated surfaces (two-build rule)

Generated files are committed, never hand-edited (AGENTS rule 9). Anything
that checks for a generated file needs two builds: one to emit what the
generator reads, one to pick the result up.

- [ ] `node marketing/og/render-pages.mjs` (installs its own headless
      browser ad hoc) — per-page OG cards from the BUILT titles, then
      rebuild so pages reference them.
- [ ] `npm run lastmod` — the git-derived sitemap dates (CI regenerates and
      diffs, so a stale map fails there, not silently).
- [ ] `npm run build` once more; commit everything it changed
      (`public/llms*.txt`, `src/data/lastmod.json`, OG cards, favicons,
      `worker/csp.generated.json` — the CSP hashes derive from your built
      inline scripts and CI diffs the committed copy).

**Verify:** `npm run verify` — the full local battery (build, invariants,
worker smoke, HTML validity, contrast, axe). This is the same set CI runs
and the same command the pre-push hook runs; green here means green there.
Then `git status` clean after a fresh `npm run build` — if a build dirties a
committed generated file, commit it; that is the contract.

## Phase 3 — first deploy + the dashboard

- [ ] `npx wrangler login`, then `npm run deploy` for a first
      `*.workers.dev` deploy; attach the custom domain (Workers → Domains &
      Routes).
- [ ] Push to GitHub; add repo secret `CLOUDFLARE_API_TOKEN` (scoped: Edit
      Workers — never a Global API Key). Green main now deploys via CI;
      Cloudflare's own git-connected builds stay OFF (they'd deploy in
      parallel with CI and skip the invariants).
- [ ] Walk PLAYBOOK §6 top to bottom — SSL Full (Strict), zone HSTS (the
      one emitter), www→apex redirect, the OFF-switches (Rocket Loader,
      Email Obfuscation, Auto Minify, Hotlink Protection), **and the DNS
      records nobody remembers: SPF `-all` + DMARC `p=reject` (yes, even
      though the domain sends no mail — an unprotected domain can be spoofed
      and the damage lands on you) + CAA.** Record any deviation in
      PLAYBOOK §6 in the same commit.

**Verify:** the curl battery in PLAYBOOK §8, against the LIVE site. Most of
what this template encodes is invisible until something in front of the
origin breaks it.

## Phase 4 — services (each independent; site works without all of them)

- [ ] **Forms**: Google Sheet → Extensions → Apps Script → paste
      `marketing/apps-script/contact-form.gs`, set its config constants, run
      `selfTest()` IN THE EDITOR first (it triggers the OAuth prompts —
      skipping it is why deployed scripts "Complete" and write nothing),
      Deploy → Web app, then `npx wrangler secret put CONTACT_SCRIPT_ID`.
      ⚠ Verify the failure path, not the redirect: submit the real form and
      check the row lands in the Sheet AND the email arrives.
- [ ] **Analytics**: read README § Analytics first. Umami (cookieless, no
      banner): `ANALYTICS.umami` in `site.ts` + `UMAMI_UPSTREAM` in
      `wrangler.jsonc` — both hops or neither. GA4 instead: `measurementId`
      arms the consent banner automatically; update
      `src/data/privacy.json` in the same commit (AGENTS rule 4).
- [ ] **Cadence report email**: the content engine's run report reuses the
      form's Apps Script — no new vendor. In `contact-form.gs`, set
      `REPORT_TOKEN` to a long random string (`openssl rand -hex 24`) and
      re-deploy the web app; give the cadence session the same value as the
      `CADENCE_REPORT_TOKEN` env var. Each run then POSTs
      `action=report` to `/api/contact`, which emails the summary to
      `NOTIFY_TO` and appends it to the sheet's Reports tab. Token unset =
      channel off; attempts land quarantined in Filtered.
- [ ] **Insights read-back** (`npm run insights`): a read-only pull of the
      three measurement surfaces — Umami (what humans with JS did), Search
      Console (what Google showed and what got clicked, the only source that
      sees demand you did NOT convert), Cloudflare edge (every request,
      crawlers and answer engines included). Each section soft-skips until
      its credentials exist, all read-only, all env vars, never committed:
      `UMAMI_URL` + `UMAMI_WEBSITE_ID` + `UMAMI_BEARER_TOKEN` (or
      `UMAMI_USERNAME`/`UMAMI_PASSWORD`); `GSC_SA_KEY` (base64 of a Google
      service-account JSON key, the SA email added as a restricted user on
      the `sc-domain:` property); `CLOUDFLARE_READ_ANALYTICS` (token scoped
      Zone:Read + Analytics:Read only). `--inspect` runs URL Inspection over
      the live sitemap and explains any page that is not indexed.
- [ ] **Privacy page**: clear the `privacy.json` TODOs, then flip
      `status.draft` to `false` — one flag publishes it and its
      indexability together.
- [ ] **Search engines**: GSC (domain property via DNS TXT), Bing Webmaster
      (`VERIFICATION.bing` in site.ts), submit the sitemap in both;
      IndexNow key file `public/<key>.txt` (the workflow submits after each
      green deploy).
- [ ] **Live data (optional)**: two-tab Sheet pattern (CHECKLIST §3 — the
      published tab physically cannot leak contact fields), tab URL into
      `src/data/sheets.config.json`, `<LiveData />` on the page.

**Verify:** PLAYBOOK §8 "Behaviour" list — form → Sheet + email, honeypot →
`Filtered` tab, analytics records a pageview (a tag in the HTML proves
nothing), JS-off still renders and submits.

## Phase 5 — content, and staying healthy

Now write — and pick what to write from evidence, not guesswork:
`npm run insights` (Phase 4) shows the queries, positions and indexing state;
impressions at position 4–20 are the shortlist, impressions at position 50+
mean the page needs links and authority, not a better title. The rules that
bite are AGENTS § Content: named human author with
a real profile, `tldr` front-loads the answer, `sources` on anything factual,
FAQ answers only in frontmatter, `toc: true` at 4+ headings, dates spread
(no two posts share a `published` date) and at least 2 in-body internal
links per post — the last two are enforced by `check-source-rules`. Scheduled posts:
future-date `published` and schedule a build for that day (PLAYBOOK §2).

**The content engine.** Five skills in `.claude/skills/` run the whole
loop, and three marketing files are its memory:

1. Run **/onboard-marketing** once — it interviews you and fills
   `marketing/STRATEGY.md`, `VOICE-GUIDE.md`, `writer-brief.md` and the
   `voice.json` site layer. Until then those files carry TODOs and the
   engine has no strategy to execute.
2. Run **/interview** whenever you have been out in the world — meetings,
   calls, things noticed. It captures dated entries in
   `marketing/field-notes.md`: the proprietary fuel. **The fuel rule:** the
   engine only writes a post when it can cite a field note, a primary-source
   news event (`marketing/news-log.md`), or an insights finding — no fuel,
   no filler.
3. Schedule **/content-cadence** as a recurring Routine (claude.ai → your
   site's repo environment → schedule a Routine, or ask Claude Code to
   create one) with a prompt like:
   > Run /content-cadence. Daily mode on weekdays; weekly mode on Monday.
   Daily runs measure (insights snapshot + deltas), log news candidates,
   and email you the report — including the 10 URLs to paste into Search
   Console's "Request indexing" by hand, which the API cannot do. Weekly
   runs additionally refresh the anti-AI rules from their public sources
   (sweeping the latest posts for newly landed tells) and do the writing
   run. Everything lands as PRs; **you merge — nothing auto-publishes.**
   Give the Routine's environment the insights credentials and
   `CADENCE_REPORT_TOKEN` (both above).

From here the rhythm is PLAYBOOK §9 (weekly GSC glance, monthly link-rot
run, quarterly crawl, annual security.txt/HSTS/domain review) — put the
annual items in a calendar now, while you still remember they exist.
