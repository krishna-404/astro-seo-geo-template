---
name: onboard-marketing
description: Interview the site owner to fill the marketing skeletons — strategy, reader, voice, banned/kept words — writing STRATEGY.md, VOICE-GUIDE.md, writer-brief.md and the voice.json site layer. Use when setting up a new site from this template, when marketing docs still carry TODOs, or when the user asks to define their marketing strategy or voice.
---

# Onboard the marketing layer

You are conducting a working interview, not filling a form, and you conduct
it here: every question below goes to the user in this session through
`AskUserQuestion` — up to four related questions per call, each with two to
four concrete options drawn from the landscape and the examples fetched for
it, the user's own wording arriving through "Other". Nothing in this
interview is left as a line in a file for the user to answer later. Ask in
the user's language, and push back on generic answers — "we
help businesses grow" is not a thesis, "importers who paid demurrage because
a document was late" is. The quality of everything the content engine later
produces is capped by what this interview captures.

Read `marketing/brief.md` (the /discover output: the one job, the business
in three sentences, off-limits, the owner's taste) and
`marketing/landscape.md` (the category teardown, with the voice each
competitor speaks and the owner's verdicts) before asking anything. Do not
re-ask what they answer; deepen it. Where a question below is a choice —
the voice above all — show current examples first (/new-site § The three
rules) and ask against them.

## Order of questions

1. **The business** — what is sold, to whom, what the buyer stops suffering.
   Three sentences, concrete.
2. **The reader** — one specific person. What do they already know? What
   burned them? What do they type into a search box at 11pm?
3. **The thesis** — the one argument the whole site advances. Test it: does
   it exclude anything? A thesis every competitor could also claim is not one.
4. **The stance** — what gives THIS site the right to speak: experience,
   data, a position. Capture credentials for author bylines (name, title,
   LinkedIn) — the blog schema requires a real `sameAs` profile.
5. **The clusters** — 3–8 named topic areas. For each: the primary query
   family and why this site can win it.
5b. **The page-type plan** — walk `marketing/site-blueprint.md § 1` and decide
   which layers this site needs and in what order: money pages (one per
   offering), comparison/"vs" pages (which competitors), use-case/ICP and
   industry pages (which segments), location pages (only with localized data),
   tools/calculators, plus the always-on blog and glossary. Capture what exists
   vs. what to build — this seeds the keyword map's backlog.
6. **Numbers and claims** — what figures may the site state, and what is
   each one's source? Anything without a source goes in as a TODO, never as
   a number. Wire real ones into `src/data/facts.json`.
7. **Guardrails** — what must never be claimed (regulated advice, geography,
   customers that do not exist yet, results not yet achieved).
8. **Voice choices** — the default stance is straightforward messaging
   (site-blueprint § 6 / VOICE-GUIDE): plain, concrete, "you" over "we", no
   marketese. Confirm that fits, then capture the specifics: em-dash policy
   (zero or the default cap), words this brand never says (self-praise like
   "trusted", category clichés), words used on purpose (`keepWords`), and any
   base-layer banned word that is legitimate domain vocabulary here
   (`allowedExceptions`, each with a reason).

   **Show voice before asking about it.** A voice chosen from a blank
   converges on the category's brochure. Put four things in front of the
   owner, fetched now, and ask against them:

   - *The category, read aloud.* Three sentences from the money page of
     the two strongest sites in `marketing/landscape.md § 7`, plus the
     AI-tell count from one of their posts — the register the buyer is
     used to, and the counter-example.
   - *The dimensions.* Nielsen Norman Group's four tone-of-voice
     dimensions (funny–serious, formal–casual, respectful–irreverent,
     enthusiastic–matter-of-fact): place the category on each, then ask
     the owner where this brand sits, one notch at a time. The answer is
     a row in VOICE-GUIDE § Tone.
   - *The guides that show their working.* The published voice guides
     that state a rule, an example and a reason — read two or three
     closest to this brand's register and quote the rule that fits:
     Mailchimp's Content Style Guide (voice vs tone, writing for
     specific situations), GOV.UK's style guide and content design
     principles (plain language, the reader's words, front-load the
     answer), Monzo's tone of voice (plain-spoken finance), Shopify
     Polaris and Atlassian's voice-and-tone pages (product copy, error
     states, the this-not-that table), Intercom's and Slack's writing
     principles (warm without being cute), Microsoft's Writing Style
     Guide and the Apple Style Guide (the mechanical rules — numerals,
     capitalisation, product names), 18F's content guide and
     plainlanguage.gov (the evidence that plain copy is read and acted
     on), 37signals' *Getting Real* on copywriting (interface copy is
     the product). The straightforward default in `site-blueprint § 6`
     is an instance of what these agree on; cite the guide, not the
     memory of it.
   - *The this-not-that table.* Draft five pairs for this brand — the
     sentence the category would write against the sentence this site
     writes — from the interview so far, and ask the owner to correct
     them. The corrected pairs go into VOICE-GUIDE § Tone verbatim and
     are the fastest way a future writer learns the voice.

   Record which examples were shown and what the owner chose in the
   VOICE-GUIDE's Log.
9. **Cadence** — how often the content engine should run and write
   (default: daily-lite check, weekly writing run — see /content-cadence).

## Write the results

- `marketing/STRATEGY.md` — replace every TODO; delete none of the section
  structure. "Honest state" gets today's date and only what is true.
- `marketing/VOICE-GUIDE.md` — reader, stance, the tenth house rule, the
  domain-specific integrity rail, § Tone (the four dimensions placed, the
  this-not-that pairs, the guides cited) and the Log line naming the
  examples shown.
- `marketing/writer-brief.md` — formats table if the defaults don't fit.
- `marketing/keyword-map.md` — then run /keyword-map to turn the clusters and
  page-type plan into the query→page map and the ranked build backlog.
- `src/data/voice.json` → `site` — bannedWords/bannedPhrases,
  keepWords, allowedExceptions, quantOverrides (`emDashPer1000Words: 0` for
  a zero-em-dash house), and **bannedClaims**: regexes for the assertions of
  fact this site may not make (a measurement nobody took, a customer that
  does not exist, a result the product has not produced — from STRATEGY.md
  § Honest state). `check-source-rules` fails any page that says one.
- `src/data/intent.json` → `navigational` (the brand name and its
  misspellings, so brand lookups are not counted as buyer queries) and
  `claimFrom` (the money-page collections whose frontmatter declares
  `primaryKeyword`). The `watch` list fills as the first high-intent rows
  appear in Search Console (/keyword-map § High-intent).
- `marketing/DATA-SHEET.md` — replace the example question with the first
  real one the interview surfaced, asked here and deferred by the user; and
  `marketing/link-targets.md` — the directory category this buyer browses,
  as a data-sheet question if it is not obvious.
- Author identity → `src/data/authors.json` (slug, name, title, a bio of
  checkable facts, real sameAs profiles — every byline links to
  `/author/<slug>` and the check fails unregistered authors), plus
  `src/data/site.ts` / `facts.json` wherever the template already carries
  the founder (search for TODO markers).

## Finish

Run `npm run check:voice` and `npm run verify`'s fast tier — the site layer
you just wrote must not break the existing corpus without the user agreeing
to fix it. Summarise what was captured and what remains TODO, and point the
user at /interview (ongoing fuel) and /content-cadence (the engine).
