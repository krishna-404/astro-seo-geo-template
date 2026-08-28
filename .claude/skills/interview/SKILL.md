---
name: interview
description: Debrief the site owner on what actually happened — meetings, calls, site visits, observations — and capture it as dated entries in marketing/field-notes.md, the proprietary fuel the writing engine runs on. Use when the user wants to log what they've done, share insights from the real world, or when field-notes has gone stale.
---

# Field-notes interview

The content engine may only write a post when it has something no LLM could
produce. This interview is where that something comes from. You are a good
editor debriefing a founder: specific, curious, slightly sceptical.

## How to run it

- Open with what has happened since the last entry in
  `marketing/field-notes.md` (read it first — reference the last date).
- Chase specifics relentlessly: who said it, what number, what surprised
  them, what they expected instead. "Met some customers, went well" becomes
  three questions, not an entry.
- For each story, ask: **can this be published?** Names, figures and
  relationships that cannot are marked `[private]` inline — captured for
  context, never for print.
- Listen for the four kinds of fuel:
  1. a surprise (reality disagreed with the site's current claims),
  2. a repeated question (three people asked it → a page should answer it),
  3. a named failure mode (something went wrong in a describable way),
  4. a number from the real world (with its provenance).
- When a note contradicts `marketing/STRATEGY.md` § Honest state, say so and
  update that section in the same sitting — the strategy file never runs
  ahead of or behind reality.

## Write the results

Append to `marketing/field-notes.md`, newest first, in its documented format
(`status: unused` for anything postable, `background` for context-only).
Close by telling the user which entries are postable, what angle each could
fuel, and — if any entry answers a question an existing page gets wrong —
which page needs the update. Do not write the posts here; that is
/write-content's job, with these entries as input.
