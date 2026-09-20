---
name: new-site
description: Take a new site from an empty copy of this template to launched and running its cadence — every phase in order (discover and asset intake, landscape, decide, identity and entity, strategy and voice, page plan, design direction and language, infrastructure and migration, measurement, privacy and trust pages, seed content, launch, cadence), each decision put to the owner in the session with AskUserQuestion against current best-in-class examples fetched live, and every answer written into the file that owns it. Use when someone clones the template for a new site, when SETUP.md still has unchecked boxes, or when the owner asks "how do I set this up".
---

# New site — from template to launched

SETUP.md is the checklist of every per-site value and where it lives. This
skill is the *conversation* that fills it: one phase at a time, one decision at
a time, and never a decision without examples. Its job is to make the owner's
choices well-informed and cheap, and to leave nothing in a chat transcript
that should be in a file.

## The three rules that shape every step

**Show before asking.** For every decision, fetch what the best sites and the
most current guidance do *right now* and put three to five concrete examples in
front of the owner, with a one-line reading of each: what it does, what it
costs, what it forecloses. Never present a decision as a blank question, and
never from memory when the answer is on the internet today. Where to look, per
kind of decision:

| Decision | Where the current examples live |
|---|---|
| The brief: the one action, what a trust page carries, what exists | Two or three sites in the owner's category, fetched during /discover; the owner's own admired and disliked sites with the reason recorded |
| The category: who the buyer compares us with | The owner's list, the money-query SERPs, the "alternatives" listings and directories, the category on awwwards — torn down the same way in /landscape and put to the owner for a verdict |
| Positioning, hero copy, page structure | The three or four best-designed sites in the owner's category and the standing list of well-designed product sites (Stripe, Linear, Vercel, Apple, Notion, 37signals, Ramp, Mercury, Raycast, Resend, Sanity, PostHog); the pages that rank for the owner's money queries |
| Design | awwwards.com/websites/<category>/ and the current Sites of the Day; the galleries that curate other registers (Godly, Land-book, SiteInspire, Minimal Gallery, Refero, Fonts In Use…); the same standing list; the writing that explains why it works (Refactoring UI, Practical Typography, Utopia, Every Layout, NN/g, web.dev); this year's "what held up in production" reality-checks (see /design-direction § 1) |
| Voice | The category's money pages read aloud (`landscape.md § 7`); the four tone-of-voice dimensions; the published voice guides that show their working (Mailchimp, GOV.UK, Monzo, Polaris, Atlassian, Intercom, Microsoft, Apple, 18F — /onboard-marketing step 8); VOICE-GUIDE's straightforward default; the anti-AI sources /refresh-anti-ai-rules reads |
| SEO, AEO, GEO | Google Search Central's current documentation (structured data, helpful content, scaled content); the Search Console reports the site will be measured by (Performance, Generative AI, Discover); the peer-reviewed GEO evidence (cited sources, quotations, statistics) |
| Entity and profiles | schema.org Organization; Wikidata, LinkedIn company pages, Crunchbase, Bing Places, Apple Business Connect — what a competitor's record looks like when it is done well |
| Privacy and consent | The regulator's own guidance for the owner's markets (GDPR, PDPA, DPDP, UAE PDPL); what Umami, GA4 and reverse-IP vendors actually store |
| Infrastructure | Cloudflare's current Workers static-assets documentation; the PLAYBOOK's own §3 and §6 |

Record every example you show and every decision taken in the file that owns
it (below). A reference the owner did not see is not a reference.

**Ask here, in the run.** Every question goes to the owner in this session,
through the `AskUserQuestion` tool — never as a line in a file the owner is
expected to go and find. A phase that ends by writing its questions into
`DATA-SHEET.md` and stopping has not run the phase, it has postponed it.

- *Batch, don't drip.* Up to four related questions per call, grouped by
  what they decide, and the blocking ones first: the answers that change
  what gets built (the one action, the buyer, the register, the brand
  assets) before the ones that change a detail.
- *Options, not a blank.* Each question carries two to four concrete
  options drawn from the examples just fetched — an option is the reading
  you would otherwise have written into the file, with its one line of
  consequence. The owner's own answer arrives through "Other", and for the
  interview questions it usually will; that is the tool working, not the
  options failing.
- *Keep going.* Work the phase's questions until each is answered or the
  owner defers it, then build. The run stops at a gate (below), when the
  owner says stop, or when only deferred questions are left — never merely
  because a question exists.
- *Defer, don't dump.* A question becomes a `DATA-SHEET.md` block only
  after it was put to the owner here and the answer was *don't know*, *not
  yet*, or *I have to check*; the block records what was asked and what
  they said, so it reads as a pending answer and not as an unasked
  question. Then carry on with everything that does not depend on it,
  naming the assumption in the file that owns the decision.

**Write, don't remember.** Every answer lands in its file in the same session:
`src/data/site.ts`, `facts.json` (with sources), `authors.json`,
`marketing/brief.md` (the brief and the asset register), `landscape.md`,
`STRATEGY.md`, `VOICE-GUIDE.md`, `writer-brief.md`, `design-brief.md`,
`keyword-map.md`, `DATA-SHEET.md` (for anything the owner was asked here and
does not know yet — including every asset not yet received),
`link-targets.md`, `privacy.json`, and the SETUP.md boxes ticked. A question
the owner has been asked and cannot answer becomes a DATA-SHEET question,
never a guess; a question nobody put to them becomes neither.

**Sign off at the gates.** Four phases end with the owner looking at
something, not at a summary: the brief read back (Discover), the
teardowns with their verdicts (Landscape), the homepage screenshots at 375
and 1440 (Design direction), and the live site (Launch). An owner who has
not seen the thing has not signed it off; record the sign-off and its date
in the owning file's Log. A gate is still asked here: show the thing and put
the sign-off itself through `AskUserQuestion` (approve · approve with these
changes · not yet, and what is wrong). It is a confirmation inside the run,
not a message that ends the session — on approval the next phase starts in
the same run.

## The phases, in order

Each phase names the skill or SETUP phase that does the work; this skill
sequences them, supplies the examples, asks the questions in the session,
and checks the exit condition before moving on. It does not pause between
phases to wait for a file to be filled in: an open DATA-SHEET question holds
up only the decisions that actually depend on it.

1. **Discover** (/discover). The interview that shapes everything after
   it — why now and what success is, the one job, who signs off and who
   maintains, what exists today, markets and constraints, the category
   names, the owner's taste, what is off-limits — and the asset intake:
   logo, colours, fonts and their licences, product screenshots or
   product access, photography, copy and collateral, proof with
   permission, legal identity, people, contact channels, profiles, access
   held by whom, the existing site's URLs that must keep working. *Exit:*
   `marketing/brief.md` filled, every question in it put to the owner in the
   session, every still-missing asset a DATA-SHEET question, the brief read
   back to the owner in five lines.

2. **Landscape** (/landscape). Six to ten sites the buyer actually
   compares this one with — the owner's list, the money-query SERPs, the
   "alternatives" listings, the category's designed sites — each torn
   down the same way (positioning, the one action, page layers, proof,
   pricing, design register, voice read aloud, discovery levers, speed)
   and put to the owner: do they win deals, what to admire, what to
   reject, where we differ. *Exit:* `marketing/landscape.md` with the
   owner's verdicts, the three things nobody in the category does, and
   the register decision (inside the category's norms or outside them).

3. **Decide** (SETUP Phase 0). One buyer; one primary conversion; one
   canonical domain; the target markets in order; the sending domains that
   stay separate. *Examples:* how three category leaders state their buyer
   and their one CTA on the homepage — from the landscape, against the gaps
   it found. *Exit:* the three decisions written into STRATEGY.md § Honest
   state.

4. **Identity and the entity record** (SETUP Phase 1; PLAYBOOK §1). Name,
   tagline, description, locale, contact channels, founder with a real
   profile — and the record engines resolve the brand from: legal name,
   address, founding date, the company's own LinkedIn/Crunchbase/Wikidata
   presence, the same string everywhere. *Examples:* a competitor's
   Organization node and knowledge panel done well; the malformed one from
   the Sep 2026 discovery audit (`B&#39;spoke`, four empty sameAs). *Exit:*
   `site.ts`, `facts.json`, `authors.json`, `security.txt` filled from the
   asset register; unknowns in DATA-SHEET; `npm run build` green.

5. **Strategy and voice** (/onboard-marketing). Reader, thesis, stance,
   clusters, numbers with sources, guardrails, voice choices. *Examples:*
   the category's money pages read aloud from the landscape, against the
   straightforward default; the four tone-of-voice dimensions placed; the
   published voice guides closest to this register; a this-not-that table
   the owner corrects; two AI-tell-heavy competitor pages as the
   counter-example. *Exit:* STRATEGY.md, VOICE-GUIDE.md (§ Tone filled),
   writer-brief.md and `voice.json → site` carry no TODOs.

6. **Page plan and keyword map** (/keyword-map; site-blueprint § 1). Which
   layers this site needs — money pages, comparisons, use-case and industry
   pages, glossary, tools, blog — and the query each page claims.
   *Examples:* the pages that currently rank for the owner's top five money
   queries, read for page type, structure and schema; the high-intent
   phrasings a buyer with budget types; the owner's own page list from
   the brief, tested against the taxonomy and the `/vs/` candidates the
   landscape confirmed. *Exit:* `marketing/keyword-map.md` with a ranked
   build backlog and `intent.json → watch` seeded.

7. **Design direction and design language** (/design-direction). Three
   words, type, colour, layout motif, motion, texture, imagery, refusals,
   and the design language — what a button, a card, a band, the rail, a
   table and each state mean on this site — inside the constraints and
   serving the landscape's register decision and the brief's fixed assets.
   *Examples:* awwwards for the category and the Sites of the Day; the
   galleries that curate other registers; the standing list; the writing
   that explains why it works; this year's reality check — three to five
   put to the owner before deciding. *Exit:* `marketing/design-brief.md`
   filled through § 9, tokens set, fonts self-hosted, contrast sweep green,
   homepage screenshot at 375 and 1440 signed off by the owner.

8. **Infrastructure and migration** (SETUP Phases 2–3; PLAYBOOK §3, §6).
   Cloudflare zone and worker, `wrangler.jsonc` name, generated surfaces
   (favicons, OG cards, llms.txt), first deploy, zone HSTS, redirects — and,
   when a site is being replaced, the redirect map from `brief.md
   § Migration` into `worker/index.ts → PERMANENT_REDIRECTS` with the
   matching `run_worker_first` entries, checked against the old site's
   analytics so no URL with traffic is dropped. *Examples:* the PLAYBOOK's
   setting-by-setting table is the reference here; show the owner what
   each dashboard toggle does before it is flipped. *Exit:* `smoke-live`
   green against the live origin; every old URL in the map answers 301.

9. **Measurement** (SETUP Phase 4; PLAYBOOK §5). Umami, Search Console and
   Bing verification, IndexNow, the insights credentials, the weekly
   Generative AI export routine, the AI prompt panel's first prompt set, the
   discovery scorecard baseline. *Examples:* what the Generative AI report
   and the prompt panel look like for a site in the category that is being
   cited. *Exit:* `npm run insights` prints every section; `npm run
   audit:discovery` baseline recorded in STRATEGY.md § Honest state.

10. **Privacy, consent and the trust pages** (CHECKLIST §5). Cookieless by
    default; every vendor that sets a cookie gated by the banner;
    `privacy.json` cleared and published in the same commit as any vendor;
    the trust pages the markets require (privacy policy, terms, an imprint
    or legal-identity page where the jurisdiction demands one, the about
    page with real people) written from `brief.md § Legal identity`, never
    from a generic template. *Examples:* the regulator's guidance for each
    target market; what two competitor sites actually set (read their
    cookies); what the category's about pages show. *Exit:*
    `/privacy-policy` live and accurate; every required trust page live.

11. **Seed content** (/write-content). The first money pages, ten to fifteen
    glossary entries, two posts with real fuel, social cards rendered,
    internal links wired, the proof from the asset register placed where it
    is relevant (with its permission on file). *Examples:* the ranking page
    for each seeded query, torn down for structure, schema and FAQ. *Exit:*
    `npm run verify` green; no orphan pages; every page traces to a
    keyword-map row; the placeholder grep in SETUP.md is clean.

12. **Launch** (PLAYBOOK §8). The live verification list, request indexing
    for every URL, the first directory and entity listings from
    `link-targets.md`, the Search Console and Bing submissions, the owner
    walking the live site on a phone and signing it off. *Exit:* every
    PLAYBOOK §8 box ticked against the live site; the sign-off dated in
    `brief.md`'s Log.

13. **Cadence and the posts API** (SETUP Phase 5; DEPLOY-equivalent docs).
    Schedule /content-cadence as a Routine, one firing a day; decide the
    merge model (PR review, or commit-to-main with verify as the gate) and
    record it in STRATEGY.md; set the report channel; if external automation
    will submit posts, set `POSTS_API_TOKEN` and `GITHUB_POSTS_TOKEN` and run
    the worker smoke. *Exit:* the first report arrives.

## Finish

Summarise what was decided (with the file each decision lives in), what is
still a DATA-SHEET question — each one asked here and deferred by the owner,
assets not yet received first — how the outcome in `brief.md § 1` will be
measured, and the first three things the cadence will do.
Then hand the owner /interview for the ongoing fuel and /insights-review for
the first read of the numbers.
