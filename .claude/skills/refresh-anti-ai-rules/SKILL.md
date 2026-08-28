---
name: refresh-anti-ai-rules
description: Fetch the current "Signs of AI writing" sources, diff them against src/data/voice.json's base layer, propose rule updates, and sweep the latest posts for any newly added tells. Runs inside the weekly /content-cadence; also use when the user asks to update the anti-AI rules.
---

# Refresh the anti-AI rules

The tells rotate: each model generation retires some habits and grows new
ones, and the public lists lag the models. This skill keeps
`src/data/voice.json` current — and because the *internet* lags too, every
newly landed tell triggers a sweep of the site's own most recent posts, which
were written when that tell was not yet on the list.

## 1. Fetch the sources

- https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing — the primary
  source; read every section (vocabulary by era, structural patterns,
  formatting, citation issues).
- Any additional sources listed in `voice.json → base.sources`.
- Optionally search for substantial new work on AI-writing detection since
  `base.updated`; add a source entry (label, url, retrieved) for anything
  adopted from it. Never adopt a rule you cannot attribute.

## 2. Diff against the base layer

For each candidate change, decide by precision, not volume:

- **New tell** → `bannedWords`/`bannedPhrases`/`shapes.fail` only if it is
  high-precision (rare in honest prose). Ambiguous words (ordinary technical
  vocabulary) go to `watchWords` — a check that cries wolf gets deleted.
- **Era rotation** → new-era vocabulary into `eraWords` under a dated key;
  tells the sources now mark historical move OUT of fail tiers (delete or
  demote to `watchWords`) so the list tracks reality instead of growing
  forever.
- Never touch the `site` layer — that is the owner's voice, not the
  internet's.
- Update `base.updated` and the `retrieved` dates.

## 3. Prove, then sweep

1. Run `npm run check:voice` with the new rules. It must stay green on the
   corpus **except** where a newly added tell fires — those hits are the
   sweep list, not false alarms.
2. **The sweep:** for every flagged file, fix the marker the way the voice
   guide says (rewrite the sentence, not synonym-swap the word), preserving
   meaning. Bump each swept page's `updated` frontmatter — the edit is real.
   Prioritise the most recent posts: they were written closest to the tell's
   era and carry the most of it.
3. Re-run `npm run check:voice` (green) and `npm run verify`'s fast tier.

## 4. Deliver as a PR

One PR: the voice.json diff, the swept content, and a body that lists each
rule added/retired **with its source** and each page swept. Rules gate CI —
they never change silently on a branch that auto-merges. If a candidate rule
was considered and rejected, say so in the PR body; that judgement is worth
recording.
