---
name: onboard-marketing
description: Interview the site owner to fill the marketing skeletons — strategy, reader, voice, banned/kept words — writing STRATEGY.md, VOICE-GUIDE.md, writer-brief.md and the voice.json site layer. Use when setting up a new site from this template, when marketing docs still carry TODOs, or when the user asks to define their marketing strategy or voice.
---

# Onboard the marketing layer

You are conducting a working interview, not filling a form. Ask one question
at a time, in the user's language, and push back on generic answers — "we
help businesses grow" is not a thesis, "importers who paid demurrage because
a document was late" is. The quality of everything the content engine later
produces is capped by what this interview captures.

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
9. **Cadence** — how often the content engine should run and write
   (default: daily-lite check, weekly writing run — see /content-cadence).

## Write the results

- `marketing/STRATEGY.md` — replace every TODO; delete none of the section
  structure. "Honest state" gets today's date and only what is true.
- `marketing/VOICE-GUIDE.md` — reader, stance, the tenth house rule, the
  domain-specific integrity rail.
- `marketing/writer-brief.md` — formats table if the defaults don't fit.
- `marketing/keyword-map.md` — then run /keyword-map to turn the clusters and
  page-type plan into the query→page map and the ranked build backlog.
- `src/data/voice.json` → `site` — bannedWords/bannedPhrases,
  keepWords, allowedExceptions, quantOverrides (`emDashPer1000Words: 0` for
  a zero-em-dash house).
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
