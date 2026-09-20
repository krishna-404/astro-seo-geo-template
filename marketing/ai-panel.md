# AI prompt panel — who the assistants name when a buyer asks

**Why this file exists.** Search Console's Generative AI report says how often
Google's own AI features showed a page of ours. It says nothing about ChatGPT,
Perplexity, Gemini in the app, Copilot or Claude, nothing about which
**competitors** the answer named, and nothing about which **sources** it cited —
and those sources are the whole game: an assistant recommends whoever the page
it cites recommends. The only way to know is to ask the assistants the buyer's
questions and write down what came back. That is this panel. Run it **monthly**
(the Monday cadence run asks for it when the last run is older than 35 days);
each run is a `## Run YYYY-MM-DD` block below, oldest first, so the trend reads
top to bottom. `npm run audit:discovery` scores the panel's recency.

**How to run it (20 minutes).** Logged out where possible, target-market
location if the assistant allows one. Ask each prompt in
each assistant, then record: brands named (in order), the pages cited (domain
and URL), whether this site appeared and where, and the one line the answer
opened with. Do not argue with the assistant or ask follow-ups — the first
answer is the one a buyer reads.

**The prompt set.** Drawn from `src/data/intent.json`'s watch list (the
transactional queries a buyer with budget types) and the questions the ICP
posts; one prompt per line so the set is diffable. Add a prompt when a new
high-intent phrasing earns impressions; never remove one (a prompt that stops
naming anyone is a finding).

```
TODO — one prompt per line, in the buyer's words. Seed from src/data/intent.json's
watch list and the questions the ICP posts. Examples of the SHAPE, not the content:
  Which software does <the job this site sells> for a <the buyer>?
  What is the best <category> tool for a small <buyer type>?
  Is <brand> a credible product? Who is behind it?
  Compare <brand> with <competitor A> and <competitor B> for <buyer>
  What is <core glossary term> and how is it calculated?
```

**What the run does with the answers.** A competitor named in an answer we are
absent from goes to `marketing/keyword-map.md § High-intent` as an angle the
page does not yet argue. A cited page we could be on (a listicle, a directory, a
community thread) goes to `marketing/link-targets.md`. A phrasing the assistant
used that our page does not say becomes a FAQ line on the claiming page. The
report's **Generative AI** section carries the run's headline: prompts where
we were named / total, and who was named instead.

**Rules.** No fabricated runs. If a panel was not run, the block is not
written. The assistants' answers are evidence about the assistants, never a
source for a page.

---

## Runs

_None yet. The first `## Run YYYY-MM-DD` block goes here._
