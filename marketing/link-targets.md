# Link targets — where the site should be listed

<!-- TODO: fill the tables with the platforms that matter for YOUR category.
     The classes below are the generic shape; the rows are placeholders. -->

**Why this file exists.** Transactional SERPs ("best <category> software",
"<category> tools 2026") are rarely owned by vendor homepages. They are owned
by **listicles**, and listicles are assembled from directory data. A product
absent from the directories is invisible to whoever writes the next one. Every
listing is also a backlink and an entity anchor — the two ranking inputs a
site cannot manufacture from its own content.

**The daily cadence run surfaces the next three `todo` rows in its report and
never does them.** Claiming a listing needs a human, an email address and
usually a phone number. Tick a row off by changing its status here, in the
same commit as anything else, and the run stops asking. The weekly run
maintains the file: moves claimed rows to `live` with the URL, adds a target
the week's competitor reading turned up.

**The rule this file inherits.** A listing is distribution; a fabricated
review is not. Create profiles, fill every facet a buyer can filter on
(deployment, pricing model, integrations, region — an unfilled facet is a
filter you disappear from), and ask real users for reviews once there are
real users. Never write reviews, buy them, or mark up `review` /
`aggregateRating` on the site's own pages (CHECKLIST § 6).

**Status:** `todo` · `doing` · `live` (with the URL) · `skip` (with a reason)

**Format is load-bearing.** `scripts/data-sheet.mjs` parses these tables to
print the next targets: six columns, a numeric first cell, a status cell from
the four states above. Keep the columns.

---

## Tier 1 — the review platforms the listicles are built from

Do these in order, and pick the **primary category** first — it decides which
listicles can find you and is hard to change later. If the category is not
obvious, make it a `DATA-SHEET.md` question before claiming anything.

| # | Platform | Why it matters | Cost | Status | URL / note |
|---|---|---|---|---|---|
| 1 | <!-- e.g. G2 --> | The largest B2B review platform; note its Best Software list needs 10 reviews from the prior calendar year, so a listing is step one of a long game | Free basic listing | todo | |
| 2 | <!-- e.g. Capterra / GetApp / Software Advice --> | One network, one submission usually covers all three; buyers filter by category, pricing and features | Free listing | todo | |
| 3 | <!-- e.g. TrustRadius --> | Long-form reviews, research-minded buyers | Free basic | todo | |

## Tier 2 — entity anchors, so the answer engines know who you are

Not traffic — identity. These are the profiles knowledge graphs and answer
engines resolve a company name against; a site with none reads as unverified.

| # | Platform | Why it matters | Cost | Status | URL / note |
|---|---|---|---|---|---|
| 4 | LinkedIn company page | The one profile every B2B buyer checks; the founder's `sameAs` should link back to it | Free | todo | |
| 5 | Crunchbase | Company entity record; feeds several aggregators | Free basic | todo | |
| 6 | Wikidata item | The entity anchor knowledge graphs read; needs a notable, citable source — do not fabricate one | Free | todo | Only once there is a third-party source to cite |
| 7 | Bing Places / Apple Business Connect | Business entity records for the non-Google engines; only if there is a real address | Free | todo | Skip with a reason if there is no physical office |

## Tier 3 — sector directories and launch platforms

Narrower traffic, better fit, several editorial rather than review-driven so
they can be entered without customers. Batch the generic SaaS directories in
one sitting once Tier 1 is done — not before, because they carry no buyer.

| # | Platform | Why it matters | Cost | Status | URL / note |
|---|---|---|---|---|---|
| 8 | <!-- sector directory --> | Where your specific buyer browses vendors | Unknown | todo | Confirm it has a category that fits |
| 9 | AlternativeTo | Captures "alternative to X" intent — pair with any comparison pages | Free | todo | |
| 10 | Product Hunt | One shot; save it for a real launch moment | Free | todo | Timing decision, not a listing decision |
| 11 | Generic SaaS directory batch | Aggregate backlink value only | Free | todo | Do in one sitting; do not let it become the strategy |

## Not chasing, and why

| Target | Reason |
|---|---|
| Paid placement on any Tier 1 directory | Not before there is a real conversion path and evidence the category is right |
| Review-generation services | Buying reviews is the one thing a site that trades on trust cannot survive being caught doing |
| Google Business Profile | Only for a business with a real, visitable address — a virtual office breaches the guidelines and a map pack is not where this buyer looks |
| Guest-post link farms | Worth less than the time to place, and a risk |

---

## Log

| Date | Change |
|---|---|
| <!-- YYYY-MM-DD --> | Created from the template. Nothing claimed yet. |
