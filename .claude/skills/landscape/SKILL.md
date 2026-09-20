---
name: landscape
description: Map the category before positioning, design or voice are decided — find the sites a buyer actually compares this one with (the owner's list, the pages ranking for the money queries, the "alternatives" listings, the category's awwwards entries), tear each down the same way (positioning, buyer, page layers, proof, pricing, design register, voice, discovery levers, speed), put the teardown to the owner for feedback, and write marketing/landscape.md — the input /new-site, /keyword-map, /design-direction and /onboard-marketing read. Use after /discover, when the owner asks "what are competitors doing", before a comparison page is written, and once a quarter after that.
---

# Landscape — how the other players work, and what the owner makes of it

Positioning chosen without looking at the category is a guess; design and
voice chosen without it converge on the category's average. This skill
looks first, the same way for every site, and then asks the owner what
they see — because the owner knows which competitor actually wins deals
and which one only looks good, and that judgement is not on the internet.

The output is `marketing/landscape.md`: one teardown per site, the owner's
verdict on each, and the three things the whole category does not do. It
is read by /new-site § Decide (the one buyer and one action, against what
the category claims), /keyword-map (which `/vs/` pages to build and what
the ranking pages look like), /design-direction (the category's design
register, to sit inside or step out of) and /onboard-marketing (the voice
the category speaks, read aloud, and the AI-tell counter-examples).

## 1. Find the set

Six to ten sites. Fewer misses the shape of the category; more is a
directory, not a landscape. Sources, in this order, so the set is the
buyer's and not the owner's alone:

1. **The owner's list** from `marketing/brief.md § 7` — who they lose to,
   who prospects compare them with, who they admire, who they refuse to be
   mistaken for. Keep every "lose deals to" name.
2. **The money-query SERPs.** Search the three to five queries a buyer
   with budget types (the transactional phrasings: "<category> software",
   "<x> vs <y>", "<service> <market>", "… pricing") and take the sites
   that own the first page. These are the pages the site will have to beat
   and the ones /keyword-map tears down for structure. Classify every
   result (vendor, listicle, directory, publisher, marketplace) and record
   the SERP shape per query in `landscape.md § The SERP shape` — how many
   vendors, how many lists, who owns the top. A vendor absent from page
   one is not yet a rival there.
3. **The listings.** The "alternatives to <leader>" pages, the category on
   G2, Capterra, Clutch, Product Hunt or the directory this buyer browses
   (`marketing/link-targets.md` names it), and the competitors' own `/vs/`
   pages — who *they* compare themselves with. Every listicle and directory
   found becomes a row in `landscape.md § The lists` and a `todo` row in
   `marketing/link-targets.md` (the run adds the row; a human claims it);
   note which rivals each list includes and which it leaves out.
4. **The designed ones.** `https://www.awwwards.com/websites/<category>/`
   and the galleries in /design-direction § 1 filtered to the category —
   the sites that set the visual bar, which are rarely the ones winning
   deals. Mark them as reference, not competitor. Some galleries refuse
   non-browser fetches (awwwards and Land-book among them): use the ad-hoc
   Playwright the OG pipeline installs (`npm i --no-save playwright`), or
   ask the owner for screenshots.
5. **Adjacent categories** the buyer also spends with, when the direct set
   is thin or all looks the same: one or two, marked adjacent.

Record how each site got into the set. A site whose only source is the
owner's memory is weighted differently from one owning the money SERP.

## 2. Tear each one down the same way

Fetch the homepage, the money page, the pricing page if any, the about
page, and one blog post or guide. Read the built HTML, not a screenshot:
the `<h1>`, the first CTA, the JSON-LD, the presence of `llms.txt`, the
FAQ markup. Run each homepage through PageSpeed Insights for mobile LCP.
Then fill one block per site in `landscape.md`, in the same order every
time so the sites compare:

1. **Positioning.** The `<h1>` and the sentence under it, verbatim. Who
   it is for, in their words. What it claims that no competitor also
   claims — or "nothing".
2. **The one action.** The first CTA's text and where it goes; whether the
   phone number, form, demo or signup is the primary path; what the
   thank-you promises.
3. **Page layers present** (site-blueprint § 1): money pages per
   offering, `/vs/`, use-case or industry pages, location pages,
   glossary, tools, pricing, about with real people. A table of ticks.
4. **Proof.** Named customers, logos, numbers with or without sources,
   testimonials with or without a named person, certifications, case
   studies. Note what is asserted without evidence.
5. **Pricing.** Published, gated, or absent; the model.
6. **Design register.** Three words. Type (display and text, self-hosted
   or a hosted service), palette (one accent or many), layout motif, hero
   panel content (product screen, photo, illustration, stock), motion,
   mobile LCP in seconds, JavaScript weight. One line on what it refuses.
7. **Voice.** Three sentences read aloud from the money page. Formal or
   casual, "you" or "we", concrete or brochure; count the AI tells from
   `src/data/voice.json` in one post. This is the counter-example or the
   register /onboard-marketing shows the owner.
8. **Discovery levers.** Organization schema and whether it is well
   formed, `sameAs` profiles, FAQ schema, `llms.txt`, an author page with
   a real profile, hreflang where markets differ.
9. **What they do that we should.** One line.
10. **What they do that we refuse.** One line.

Then, across the set, write the **pattern read** into `landscape.md`: what
the category always does (the ~80% the site must match to be credible),
the claim every rival makes (so the thesis cannot be that), the proof
nobody shows, the page type nobody has built, the pricing convention, the
design register the buyer is used to, the voice the category defaults to.
These are observations with a URL each, not conclusions.

Do not editorialise beyond those lines yet; the owner's reading comes
next, and it should not be anchored on yours.

## 3. Put it to the owner

Show the teardowns in one sitting, site by site, the strongest competitor
first. For each, ask three things and record the answers verbatim:

- **Do they actually win?** Deals, not awards. The owner knows which
  competitor's name comes up on calls.
- **What do you admire here, and what do you reject?** The register, a
  pattern, a claim, a tone — the specific thing, not the site.
- **Where are we different, in one sentence a buyer would believe?** If
  the owner cannot say, that is the finding: positioning is the first
  thing /new-site § Decide has to settle.

Then ask the two questions the set as a whole raises:

- **What does nobody in the category do?** Publish prices, name the
  people, answer the question the buyer types at 11pm, show the product,
  say what they will not do. The gaps are the site's opening.
- **Which register do we want to be read against?** Inside the category's
  visual and verbal norms (a buyer recognises the category at a glance) or
  deliberately outside them (a buyer stops). Either is a valid decision;
  record which, and why, for /design-direction § 2 and VOICE-GUIDE.

## 4. Write the results, and route them

`marketing/landscape.md` carries the set with its sources, the SERP shape,
the lists, one block per site, the owner's verdict under each, the pattern
read, the category gaps, the register decision, and today's date in the
Log. Fetched pages are cited by URL and date; a teardown from memory is
not a teardown. This file keeps the evidence and decides nothing —
`STRATEGY.md` wins any conflict. Then route each finding to the file that
owns it, in the same session, and record where it went in
`landscape.md § Where each finding went`:

| Finding | Goes to |
|---|---|
| The claim every rival makes; the proof nobody shows | /onboard-marketing's thesis and stance questions → `STRATEGY.md` — the thesis must exclude at least two named rivals |
| Rivals the owner confirmed prospects actually weigh | `marketing/keyword-map.md` — a candidate `/vs/<competitor>` row each, marked planned, with the evidence; `src/data/intent.json → watch` when "<rival> vs" earns impressions |
| The ranking pages for each money query | Noted for /keyword-map's structure teardown |
| Queries rivals rank for that the site has no page for | `marketing/keyword-map.md` backlog; `marketing/channel-gaps.md` if the channel is deliberately not worked |
| Every listicle and directory found | `marketing/link-targets.md` rows, status `todo` |
| The category's design register and the three or four best-designed sites | /design-direction § 1's reference set; `design-brief.md § 8` refusals |
| Two rivals' pages heavy with AI tells, and one written well | /onboard-marketing step 8's counter-examples → `VOICE-GUIDE.md § Tone` |
| The rivals to name in the compare prompts | `marketing/ai-panel.md` prompt set |
| Any admired or rejected site the session surfaced, with the reason | `marketing/brief.md § 8` |
| Anything only the owner can answer (which competitor a prospect chose and why, a lost-deal list) | `marketing/DATA-SHEET.md`, a `Q-D` question — never a guess |

## 5. Revisit

Once a quarter with the cadence (the weekly run's link-targets step adds
targets "the week's competitor reading turned up" — this file is where that
reading is kept), when a `/vs/` page is written, when the owner names a new
competitor, when a rival relaunches, redesigns or is acquired, and before
any redesign: re-fetch the set, diff the positioning lines and the design
register, and date the change in the Log. A landscape older than a year
describes a category that no longer exists.
