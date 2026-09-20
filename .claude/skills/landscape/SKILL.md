---
name: landscape
description: Map the category before positioning, design or voice are decided — find the sites a buyer actually compares this one with (the owner's list, the pages ranking for the money queries, the "alternatives" listings, the category's awwwards entries), tear each down the same way (positioning, buyer, page layers, proof, pricing, design register, voice, discovery levers, speed), put the teardown to the owner for feedback, and write marketing/landscape.md — the input /new-site, /keyword-map, /design-direction and /onboard-marketing read. Use after /discover, when the owner asks "what are competitors doing", or before a comparison page is written.
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
   and the ones /keyword-map tears down for structure.
3. **The listings.** The "alternatives to <leader>" pages, the category on
   G2, Capterra, Clutch, Product Hunt or the directory this buyer browses
   (`marketing/link-targets.md` names it), and the competitors' own `/vs/`
   pages — who *they* compare themselves with.
4. **The designed ones.** `https://www.awwwards.com/websites/<category>/`
   and the galleries in /design-direction § 1 filtered to the category —
   the sites that set the visual bar, which are rarely the ones winning
   deals. Mark them as reference, not competitor.
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

## 4. Write the results

- `marketing/landscape.md` — the set with its sources, one block per
  site, the owner's verdict under each, the category gaps, the register
  decision, and today's date in the Log. Fetched pages are cited by URL
  and date; a teardown from memory is not a teardown.
- `marketing/keyword-map.md` — a candidate row per `/vs/<competitor>`
  the owner confirmed prospects actually weigh, marked planned; the
  ranking pages for each money query, noted for /keyword-map's teardown.
- `marketing/DATA-SHEET.md` — anything the owner did not know (which
  competitor a prospect chose and why is a `Q-D` question, not a guess).
- `marketing/brief.md § 8` — any admired or rejected site the session
  surfaced, with the reason.

## 5. Revisit

When a `/vs/` page is written, when the owner names a new competitor, and
once a year: re-fetch the set, diff the positioning lines and the design
register, and date the change in the Log. A landscape older than a year
describes a category that no longer exists.
