# Data sheet — the open questions

<!-- TODO: this file holds the questions only the site owner can answer. It
     starts with one EXAMPLE block below; replace it with your own the first
     time a run (or you) hits something nobody in the repo knows. -->

**Why this file exists.** `STRATEGY.md` holds what the site knows and says.
`CHECKLIST.md` and `PLAYBOOK.md` hold how it is built and run. None of them
has a home for **what we do not know yet and need a human to answer** — and a
content engine that runs unattended hits exactly those things: a rate it may
not estimate, a permission it cannot grant itself, whether an account exists.
This file carries the questions. `npm run ask` (`scripts/data-sheet.mjs`)
prints the open ones, ranked by what they unblock, at session start and inside
every cadence report.

**The rule that keeps it from becoming another source of truth: this file
holds no answers.** The moment a question is answered, the answer moves to
where it belongs — a number to `src/data/facts.json` with a source, a tool
input to its data file, positioning to `STRATEGY.md` — and the question here
is marked ✅ with a pointer to where it went. Nothing is stated twice.

**How to fill it in.** Type under `**Answer:**`. Leave anything you do not
know; "don't know" is a real answer and better than a guess, because it tells
the engine to stop waiting. Then say "data sheet updated" in a session.

**Rules that do not bend, even for an answer given here.** A number that will
appear on the site needs a source we can name — "about five days, I think"
becomes a calculator input the reader fills in, never a published figure. No
customer, logo or testimonial until a real one agrees. Mark anything
**confidential** and it stays in the internal record.

**Three rules for the engine.** A run never answers a question here by
estimating — it may propose an answer in the report's Decisions *with a
source*, for the owner to confirm. A blocker a run hits for the first time
is **added** here in the same commit, in this format: a run that says "blocked
on X" without recording X has lost the finding. And a question reaches this
file only after it was put to the owner: in a session with them present, a
run asks with `AskUserQuestion` and writes down what they deferred, in their
words — this file is the record of pending answers, never a queue of
questions nobody asked.

**Format is load-bearing.** `scripts/data-sheet.mjs` parses the `### Q-…`
headings and their status marks. Keep the shape: heading with an id, a middle
dot, a title and a status mark; then **Priority**, **Unblocks**, **Ask**,
**Answer**. Ids group by letter (A = data the pages need, B = distribution and
references, C = tooling and access, D = market and competitors — or your own
scheme; the script only needs `Q-` plus letters/digits).

**Status:** ⬜ open · ✅ answered (with where it went) · 🚫 not applicable

---

### Q-A1 · EXAMPLE — a figure a planned page needs, from a source we may cite ⬜

**Priority:** high — the best missing dataset for the coverage layer
**Unblocks:** the first `/<coverage-layer>/<entry>` page · replacing a tool's
illustrative defaults with a real worked example

**Ask:** For any one real instance you can point at (a published tariff, a
contract, an invoice, a regulator's table): the figures themselves, their
unit and currency, the document they come from, and whether we may cite it
publicly. One instance publishes a worked example; three start a layer.

**Answer:**

---

## Log

| Date | Change |
|---|---|
| <!-- YYYY-MM-DD --> | Created from the template. Replace the example question with the first real one. |
