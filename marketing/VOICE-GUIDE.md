# House voice guide

<!-- TODO: filled by the /onboard-marketing skill, then edited by hand. The
     structure below is the part that transfers between businesses; every
     TODO is the part that cannot. A voice guide with the TODOs still in it
     is a sign the onboarding interview has not happened — run it. -->

The point of this document is not that AI must never touch a draft. The point
is that a piece which reads like nobody in particular wrote it has failed,
whoever typed it. The mechanical half of this standard is enforced by
`npm run check:voice` (rules in `src/data/voice.json`); this file carries the
half only judgement can check.

## 1. The reader

<!-- TODO: one specific person, not a persona deck. What do they already
     know? What have they been burned by? What do they type into a search
     box at 11pm? Write to that person in every piece. -->

- Second person, singular. The reader owns the problem; write to them, not
  about "users" or "businesses".

## 2. The stance: what gives us the right to speak

<!-- TODO: the specific experience, data, or position that makes this site
     worth reading. If a sentence could carry any competitor's logo, it is
     not stance, it is filler. -->

## 3. House rules

1. Lead with the specific: a person, a number, a named form, a scene. Never
   with the category ("In the world of…").
2. State the fact, then explain it. Definition-sentence openings.
3. Short paragraphs: two to five sentences, one idea each.
4. Say the noun again. No synonym rotation to avoid repetition.
5. Every claim carries its source. The Sources block is part of the product.
6. Rhythm: build the case in two full sentences, land it in four words.
7. Close on the specific thing the piece was about. A closing line that
   would fit any company on earth gets cut.
8. Bold is a scanning aid for the term a reader will search later, never
   emphasis.
9. If the answer is genuinely unclear, say it is unclear and say who
   decides. That is precision, not hedging.
10. <!-- TODO: the rule specific to this business that the others miss. -->

## 4. Words

The banned and watch lists are data, not prose: `src/data/voice.json`. The
`site` layer there carries this brand's own bans (self-praise words, category
clichés) and its `keepWords` — vocabulary used on purpose that no rewrite may
"fix". <!-- TODO: fill site layer via /onboard-marketing. -->

## 5. Integrity rails (these beat every stylistic rule)

1. No invented facts. Every number, name, date and claim traces to a source
   listed with the piece, or is marked `[VERIFY]` and held.
2. No fabricated statistics, customers, testimonials, ratings or case
   studies. Empty stays empty — omitting is fine, asserting is not.
3. Worked examples are labelled hypothetical and use round numbers.
4. State figures flat and unattributed unless the attribution is real. "We
   measured" claims a measurement; make it only when one happened.
5. <!-- TODO: the domain-specific boundary (regulated advice, geography,
      claims the product cannot yet support). -->

## 6. The ship checklist (judgement half — run after check:voice is green)

- [ ] Read the close aloud. Would it fit any company on earth?
- [ ] Blank a load-bearing word in any sentence: could a stranger guess it?
      A guessable sentence carries no information.
- [ ] Summarise each paragraph in one line. A paragraph you cannot, goes.
- [ ] Does the piece contain the thing declared in `proprietary` — and could
      an LLM with no access to this business have produced it?
- [ ] Does the title say what the searcher types (check `npm run insights`),
      not what a keyword tool invented?
- [ ] Every number traced; every `[VERIFY]` resolved or the piece held.
