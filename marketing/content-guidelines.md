# Content guidelines — how every piece on this site is written

The transferable writing rules, in one place. `VOICE-GUIDE.md` carries this
site's own voice (reader, stance, tone, banned and kept words);
`writer-brief.md` carries formats and lengths; `page-guidelines.md` carries
what each page TYPE has to contain. This file is the rules that hold for any
piece of text the engine or a human produces here, and every skill that
writes content reads it first. Where it and `STRATEGY.md` disagree,
`STRATEGY.md` wins.

Ingested from the sources in `marketing/playbook-intake.md`; each rule
names its origin so a later reader can weigh it.

## 0. The standing prompt line

Every prompt that generates or edits content for this site ends with:

> Remove all mannered prose.

Mannered prose substitutes metaphor and flourish for direct statement.
Instead of "a parameter worth varying," the mannered writer produces "a dial
worth turning." Instead of "this point still matters," they write "this
point earns its keep." The phrases exist to display the writer, not to
convey the idea, and readers can tell. It makes the reader work harder so
the writer can perform, and it is imprecise: a metaphor drags in
connotations the writer did not choose. The fix is to say what you mean.
When a literal phrase is available, use it.
(Source: Anthropic, prompting guidance for Claude Fable 5.1, § Writing style.)

The line is stored once, in `src/data/voice.json → prompt.standing`, and
quoted by every skill that drafts, rewrites, summarises or answers. A skill
that writes content without it is a bug.

## 1. Write for the machine that lifts, and the buyer who reads

A page is read twice: by a person deciding whether to trust you, and by a
retrieval system deciding whether to quote you. Both want the same thing.

1. **Bottom line up front.** The direct answer sits in the first 100–150
   words (the `tldr`) and again in two to four self-contained sentences under
   each heading. No "as mentioned above", no pronoun pointing backwards.
2. **Every H2 is an island.** Read on its own, the section still makes
   sense. A retrieval system pulls a passage, not a page.
3. **Extractable passages.** Sentences that fully answer a question with no
   surrounding context. Kill vague pronouns. A sentence that only makes sense
   in context cannot be cited out of it.
4. **Question-shaped headings.** H2/H3 phrased as the query the searcher
   typed, answer directly beneath. Take the phrasing from Search Console's
   prompt-shaped rows, never invented.
5. **Short, focused paragraphs.** Two to five sentences, one idea each,
   under 90 words. Half the word count of print is the target.
6. **Semantic triples.** Subject, predicate, object. Not "the pros of using
   landscape design software are many" but "Landscape design software
   provides a way to visualise a designer's pool construction plans."
7. **Entity-rich, concrete.** Name the brand, the product, the person, the
   place, the specific concept. Not "this tool helps with AI visibility" but
   "Mentions' AI Visibility Report shows how often a brand appears in the
   pages cited by AI Overviews."
8. **A number every 150–200 words**, each with a source. Statistics with
   provenance, quotations from named authorities and cited sources are the
   three levers with measured lift (Aggarwal et al., KDD 2024). Keyword
   stuffing measurably hurts.
9. **Lists and tables for anything enumerable.** Pricing in a table with
   real headers. Steps in a numbered list. Each row self-contained.
10. **No em dashes on entity pages** (About, author, money pages): commas,
    periods or parentheses. Elsewhere the `voice.json` density cap holds.
11. **No unprovable adjectives.** "Revolutionary", "world-class",
    "best-in-class" are banned by `voice.json`; the rule behind the list is
    that every adjective must be provable or cut.

## 2. Say what nobody else can

A model has read the other forty versions of the page. Generic pages are not
cited. Each piece carries at least one of (the blog schema's `proprietary`
field names which):

- first-party or proprietary data, an original survey, a measurement
- a first-hand review, a case-specific teardown, screenshots of the product
  in use
- a named expert interview, a customer quote with permission
- a contrarian, evidence-backed position
- a named, coined framework (work the brand name in)
- an interactive tool or standalone resource

A piece that has none of these is not written this week. Publishing nothing
is a valid outcome; publishing filler never is.

## 3. Write for objections, not for interest

(Source: WizOfEcom, "The death of the influencer", Sep 2026.)

Only a buyer has objections; nobody else is listening for the answer. A post
that anyone in the industry could have written attracts people anyone could
have attracted. So the standing sources of topics, in order:

1. **Their objections.** The five objections heard most often on sales
   calls are the next five posts. `marketing/field-notes.md` records them;
   `/interview` asks for them.
2. **The outcome they want.** Attract by their goal, not their curiosity.
3. **What they suspect is true.** Prove you understand the problem better
   than they can say it out loud.
4. **Decisions you made.** Nobody can copy your evidence, because nobody
   else lived it.

The site's positioning fills three blanks and repeats them until they stick
(`STRATEGY.md § 2–4`): the **message** (the conviction, backed with real
proof), the **enemy** (the dying model, the wrong strategy, the channel that
stopped working) and the **belonging** (what agreeing with you says about
the reader). Same conviction with a different enemy can outperform a whole
campaign; test the enemy, not the message.

## 4. Freshness is a claim, not a date

- A page is refreshed when a fact, example, price or ranking it states has
  changed, and `updated` is bumped only then. Bumping a date without a change
  churns the signal crawlers learn to discard.
- Every page states when its figures were checked (`retrieved` on sources,
  the visible date) and names the current year where a date matters.
- Refresh order: pages older than 90 days with impressions first
  (`npm run audit:pages` lists them). "What changed since the last update"
  is a line the refreshed page carries.

## 5. Mechanics that keep it honest

- Every claim traces to a source in the piece's `sources`; a number without
  one is `[VERIFY]` and the piece is held (VOICE-GUIDE § 5).
- No invented customers, testimonials, ratings, measurements. Omitting is
  fine; asserting is fatal.
- Worked examples are labelled hypothetical and use round numbers.
- Third person on entity pages ("Acme helps…"), second person everywhere
  else ("you").
- Bold is a scanning aid for the term a reader will search, never emphasis.
- Sentence case below the h1. One h1. MDX bodies start at `##`.
- `npm run check:voice` green, then the VOICE-GUIDE § 6 ship checklist by
  hand, then `npm run audit:pages -- --page <route>` and fix what it names.

## 6. Every piece ships with its distribution

A new article is not done when it is merged. It ships with:

- **Social posts written**, one per channel the ICP uses (`STRATEGY.md`
  names them), appended to `marketing/social-queue.md` as `status:
  unposted`. Three jobs, three shapes (WizOfEcom): a top-of-funnel post that
  reaches the right strangers (the claim, the number, the enemy), a
  middle-of-funnel post that filters (the objection and the answer, for the
  reader who is deciding), a bottom-of-funnel ask (the page, the tool, the
  call). Most accounts run only the first; the order matters because each
  layer lands on whoever the layer above delivered.
- **An in-body link from an indexed page** on its target anchor
  (site-blueprint § 3).
- **Its glossary entries**, its keyword-map row, its social card.
- **The metric per layer**, never one number for all three: top on
  qualified views, profile visits and follows from the ICP (the only layer
  where volume is the point); middle on saves, DMs and who is engaging
  rather than how many; bottom on link clicks, applications and booked
  calls, the lowest engagement of the three by design. A save is somebody
  deciding the thinking is worth coming back to; the right 5,000 views beat
  the wrong 500,000. Middle-layer posts are supposed to lose people; judge
  a filter by who it keeps.
- **Test the narrative, not the post.** Six to eight pieces per
  message-enemy-belonging until one is an obvious anomaly, then build on
  the one that won. Same conviction with a different enemy can outperform
  a whole campaign (trial, reviewed quarterly — playbook-intake).

## 7. The ship checklist, in one place

Run in this order on every piece, human or machine:

1. `proprietary` names something real. Could a model with no access to this
   business have produced it? If yes, hold.
2. The `tldr` answers the primary query in one to three sentences.
3. Every H2 stands alone; every section opener is a self-contained answer.
4. At least three FAQ entries in the searcher's own words (Search Console
   prompt-shaped rows, the social sweep).
5. A table or list where the content is enumerable; a lead figure declared.
6. A number with a source every 150–200 words; two or more named sources.
7. Two to eight in-body links on searcher phrasing; one inbound from an
   indexed page.
8. Title says what the searcher types; ≤60 characters or the sacrificial
   half after " — ".
9. `npm run check:voice` green; `npm run audit:pages -- --page` read and
   worked; the VOICE-GUIDE § 6 judgement half by hand.
10. Social drafts appended to `marketing/social-queue.md`.
11. Remove all mannered prose.

## Log

| Date | Change |
|---|---|
| 2026-09-27 | Created from the ingested playbooks (see `marketing/playbook-intake.md`). |
