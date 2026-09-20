---
name: new-site
description: Take a new site from an empty copy of this template to launched and running its cadence — every phase in order (decide, identity and entity, strategy and voice, page plan, design direction, infrastructure, measurement, privacy, seed content, launch, cadence), each decision put to the owner with current best-in-class examples fetched live, and every answer written into the file that owns it. Use when someone clones the template for a new site, when SETUP.md still has unchecked boxes, or when the owner asks "how do I set this up".
---

# New site — from template to launched

SETUP.md is the checklist of every per-site value and where it lives. This
skill is the *conversation* that fills it: one phase at a time, one decision at
a time, and never a decision without examples. Its job is to make the owner's
choices well-informed and cheap, and to leave nothing in a chat transcript
that should be in a file.

## The two rules that shape every step

**Show before asking.** For every decision, fetch what the best sites and the
most current guidance do *right now* and put three to five concrete examples in
front of the owner, with a one-line reading of each: what it does, what it
costs, what it forecloses. Never present a decision as a blank question, and
never from memory when the answer is on the internet today. Where to look, per
kind of decision:

| Decision | Where the current examples live |
|---|---|
| Positioning, hero copy, page structure | The three or four best-designed sites in the owner's category and the standing list of well-designed product sites (Stripe, Linear, Vercel, Apple, Notion, 37signals, Ramp, Mercury, Raycast, Resend, Sanity, PostHog); the pages that rank for the owner's money queries |
| Design | awwwards.com/websites/<category>/ and the current Sites of the Day; the same standing list; this year's "what held up in production" reality-checks (see /design-direction § 1) |
| Voice | Two or three sites in the category the owner admires, read aloud; VOICE-GUIDE's straightforward default; the anti-AI sources /refresh-anti-ai-rules reads |
| SEO, AEO, GEO | Google Search Central's current documentation (structured data, helpful content, scaled content); the Search Console reports the site will be measured by (Performance, Generative AI, Discover); the peer-reviewed GEO evidence (cited sources, quotations, statistics) |
| Entity and profiles | schema.org Organization; Wikidata, LinkedIn company pages, Crunchbase, Bing Places, Apple Business Connect — what a competitor's record looks like when it is done well |
| Privacy and consent | The regulator's own guidance for the owner's markets (GDPR, PDPA, DPDP, UAE PDPL); what Umami, GA4 and reverse-IP vendors actually store |
| Infrastructure | Cloudflare's current Workers static-assets documentation; the PLAYBOOK's own §3 and §6 |

Record every example you show and every decision taken in the file that owns
it (below). A reference the owner did not see is not a reference.

**Write, don't remember.** Every answer lands in its file in the same session:
`src/data/site.ts`, `facts.json` (with sources), `authors.json`,
`marketing/STRATEGY.md`, `VOICE-GUIDE.md`, `writer-brief.md`,
`design-brief.md`, `keyword-map.md`, `DATA-SHEET.md` (for anything the owner
does not know yet), `link-targets.md`, `privacy.json`, and the SETUP.md boxes
ticked. A question the owner cannot answer becomes a DATA-SHEET question, never
a guess.

## The phases, in order

Each phase names the skill or SETUP phase that does the work; this skill
sequences them, supplies the examples, and checks the exit condition before
moving on.

1. **Decide** (SETUP Phase 0). One buyer; one primary conversion; one
   canonical domain; the target markets in order; the sending domains that
   stay separate. *Examples:* how three category leaders state their buyer
   and their one CTA on the homepage. *Exit:* the three decisions written
   into STRATEGY.md § Honest state.

2. **Identity and the entity record** (SETUP Phase 1; PLAYBOOK §1). Name,
   tagline, description, locale, contact channels, founder with a real
   profile — and the record engines resolve the brand from: legal name,
   address, founding date, the company's own LinkedIn/Crunchbase/Wikidata
   presence, the same string everywhere. *Examples:* a competitor's
   Organization node and knowledge panel done well; the malformed one from
   the Sep 2026 discovery audit (`B&#39;spoke`, four empty sameAs). *Exit:*
   `site.ts`, `facts.json`, `authors.json`, `security.txt` filled; unknowns
   in DATA-SHEET; `npm run build` green.

3. **Strategy and voice** (/onboard-marketing). Reader, thesis, stance,
   clusters, numbers with sources, guardrails, voice choices. *Examples:*
   the heroes and pricing pages of the category's best-written sites, read
   against the straightforward default; two AI-tell-heavy competitor pages
   as the counter-example. *Exit:* STRATEGY.md, VOICE-GUIDE.md,
   writer-brief.md and `voice.json → site` carry no TODOs.

4. **Page plan and keyword map** (/keyword-map; site-blueprint § 1). Which
   layers this site needs — money pages, comparisons, use-case and industry
   pages, glossary, tools, blog — and the query each page claims.
   *Examples:* the pages that currently rank for the owner's top five money
   queries, read for page type, structure and schema; the high-intent
   phrasings a buyer with budget types. *Exit:* `marketing/keyword-map.md`
   with a ranked build backlog and `intent.json → watch` seeded.

5. **Design direction** (/design-direction). Three words, type, colour,
   layout motif, motion, texture, imagery, refusals — inside the
   constraints. *Examples:* awwwards for the category and the Sites of the
   Day; the standing list; this year's reality check. *Exit:*
   `marketing/design-brief.md` filled, tokens set, contrast sweep green,
   homepage screenshot at 375 and 1440 checked with the owner.

6. **Infrastructure** (SETUP Phases 2–3; PLAYBOOK §3, §6). Cloudflare zone
   and worker, `wrangler.jsonc` name, generated surfaces (favicons, OG
   cards, llms.txt), first deploy, zone HSTS, redirects. *Examples:* the
   PLAYBOOK's setting-by-setting table is the reference here; show the
   owner what each dashboard toggle does before it is flipped. *Exit:*
   `smoke-live` green against the live origin.

7. **Measurement** (SETUP Phase 4; PLAYBOOK §5). Umami, Search Console and
   Bing verification, IndexNow, the insights credentials, the weekly
   Generative AI export routine, the AI prompt panel's first prompt set, the
   discovery scorecard baseline. *Examples:* what the Generative AI report
   and the prompt panel look like for a site in the category that is being
   cited. *Exit:* `npm run insights` prints every section; `npm run
   audit:discovery` baseline recorded in STRATEGY.md § Honest state.

8. **Privacy and consent** (CHECKLIST §5). Cookieless by default; every
   vendor that sets a cookie gated by the banner; `privacy.json` cleared and
   published in the same commit as any vendor. *Examples:* the regulator's
   guidance for each target market; what two competitor sites actually set
   (read their cookies). *Exit:* `/privacy-policy` live and accurate.

9. **Seed content** (/write-content). The first money pages, ten to fifteen
   glossary entries, two posts with real fuel, social cards rendered,
   internal links wired. *Examples:* the ranking page for each seeded query,
   torn down for structure, schema and FAQ. *Exit:* `npm run verify` green;
   no orphan pages; every page traces to a keyword-map row.

10. **Launch** (PLAYBOOK §8). The live verification list, request indexing
    for every URL, the first directory and entity listings from
    `link-targets.md`, the Search Console and Bing submissions. *Exit:*
    every PLAYBOOK §8 box ticked against the live site.

11. **Cadence and the posts API** (SETUP Phase 5; DEPLOY-equivalent docs).
    Schedule /content-cadence as a Routine, one firing a day; decide the
    merge model (PR review, or commit-to-main with verify as the gate) and
    record it in STRATEGY.md; set the report channel; if external automation
    will submit posts, set `POSTS_API_TOKEN` and `GITHUB_POSTS_TOKEN` and run
    the worker smoke. *Exit:* the first report arrives.

## Finish

Summarise what was decided (with the file each decision lives in), what is
still a DATA-SHEET question, and the first three things the cadence will do.
Then hand the owner /interview for the ongoing fuel and /insights-review for
the first read of the numbers.
