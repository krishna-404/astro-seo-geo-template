# Playbook intake — every outside playbook ingested, what was taken, what was refused

**Why this file exists.** Playbooks arrive as links, screenshots, PDFs and
pasted threads. Each is written for a different buyer, a different channel
and a different budget, and half of every one is marketing about
marketing. `/ingest-playbook` reads one, sorts every move into
*transfers* / *already covered* / *refused*, routes what transfers into the
file that owns it (page-guidelines, content-guidelines, runbook,
launch-playbook, ACTIONS, a skill step, a script check) and records the
sort here, so the same playbook is never re-argued and a later reader can
see where a rule came from. `channel-gaps.md` holds the quarterly
re-argument for off-site moves.

**The rule.** Nothing is adopted blindly. Every move passes four tests
before it lands anywhere (the /ingest-playbook § 3 gate): **evidence** (a
mechanism or a measured result, and whether the number is self-reported),
**policy** (Google's spam policies on site-reputation abuse, scaled content
and link spam; platform disclosure rules; this template's own guardrails),
**fit** (this stack, this buyer, this budget) and **works** (a mechanical
move is proven on this repo before it becomes a rule; a judgement move is
adopted as a dated trial on one page, measured four weeks later, and only
then written as a rule). A move is adopted only into a file with an owner
and, where it is a rule class ("every page must…"), a check (AGENTS rule
18). A move is refused with a reason. Nothing is adopted from memory of a
playbook; the source is fetched or pasted and read in full. Each transfer
below carries its status: **adopted** (how it was verified), **trial**
(what is measured, by when) or **refused**.

Format, newest first:

```
## YYYY-MM-DD — <source title> (<author / site>, <url or "pasted">)
Kind: thread | article | PDF | screenshot | checklist | SOP
One line: what it argues.
Transfers → <file § section>: <the move, in our terms>
Already covered: <the move> → <where>
Refused: <the move> — <reason>
Open: <a question for the owner, added to DATA-SHEET as Q-…>
```

---

## 2026-09-27 — The design intake: a playbook, two agent skills, five component libraries, eleven resources (pasted by the owner)

Kind: checklist (the pasted design playbook) + two repos read from source (scroll-craft, taste-skill) + a list of component libraries and design resources, each fetched and read on 2026-09-27.
One line: the owner wants the template to produce sites of awwwards taste — unique, designed, prize-worthy — and to look at the best sites before every new site. Everything below was sorted against the template's constraints: no client JS outside /search, CSS-only motion, AA measured, no Tailwind, self-hosted fonts, no runtime for a look.

### The pasted design playbook ("Consistent design → write a DESIGN.md first …")
Evidence: each line is a mechanism (a token system, a state per control, no overflow) with a measurable result; none needs trust.
Transfers (adopted) → `.claude/skills/design-direction` § 3.9 (every button, card and input of a kind looks alike — the design language table now names the four button states and the form states) · `global.css` (`--radius-sm` so controls, panels and cards share one radius scale; `--ease-out`, `--dur-hover`, `--dur-press`; `.btn:disabled` as a measured colour pair; `::selection` and `accent-color` in the brand; the card lift gated to `(hover: hover) and (pointer: fine)`) · `ContactForm.astro` (errors inline, CSS-only by `:user-invalid`, so they show where they happen and only after the field is touched) · `Header.astro` (a phone menu as native `<details>`, animated inside the motion query — this REVERSES the Sep 2026 decision that three links did not earn a menu: a destination only reachable from the footer is, on a phone, not reachable) · `scripts/check-design-smells.mjs` ("no sideways scrolling, nothing spilling off the screen, layout intact when the text is enlarged, buttons big enough to tap" — measured at 375 and 1440, in verify and CI).
Already covered: "write a DESIGN.md first" → `marketing/design-brief.md` (it IS the DESIGN.md; every colour, step, gutter and radius is a token in `global.css`); "restrained palette, clear type hierarchy" → the token set and the fluid steps; "readable on dark and light" → the contrast sweep over `.band--ink`; "transitions on modals, dropdowns and tab switches" → the FAQ and the phone menu use `::details-content`; the site ships no modal or tab by decision (no JS); "a proper 404" → `src/pages/404.astro`; "an empty state" → the blog index's `.blog__empty`.
Refused: a loading state — a static site loads nothing after paint except /search, which already carries its JS-off notice; "submitting / failure messages" as page states — submitting is a navigation and success is `/contact/thanks`; delivery failure is logged at the edge (worker/index.ts) because the visitor is not its audience.

### scroll-craft (github.com/nateherkai/scroll-craft, MIT, v0.3 — SKILL.md and references/{taste,uniqueness,feel,hero-depth,verify}.md read in full)
Evidence: a working process with a verification harness; its design rules agree with Refactoring UI and the standing list; its uniqueness claim is a gate, not a number.
Policy/fit: the ENGINE fails — scrollcraft.js pins acts, scrubs video by scroll and drives GSAP-class timelines; the template allows no page-level JS and refuses scroll-jacking (AGENTS rule 17, design-brief § 9). The PROCESS transfers whole.
Transfers (adopted) → `.claude/skills/design-direction` § 0 (the interview: three words + three non-web references, the journey, calm/intense, the one moment, the signature-move seed, distance from premium-minimal, assets, off-limits — asked with AskUserQuestion, recorded verbatim, "self-authored under delegation" when delegated) · § 2 (the journey: four to seven beats, the feeling curve written before the bands, ONE peak that gets the best asset, silence before it and the most room, an ending that resolves, the tell-someone test) · § 3.10 (one bespoke signature move, re-expressed in the CSS mechanisms the template allows: `view()`/`scroll()` timelines, `clip-path`, `@property`, `::details-content`) · § 3.11 (the fingerprint gate: differ from the template default on ≥4 of 6 dimensions) · § 4 (`npm run design:shoot`: the contact sheet — six frames along the scroll, read cold, one word per frame against the curve; the feel check; the squint test; a real phone) · `marketing/design-brief.md` § 0, § 11, § 12.
Transfers (adopted, mechanised) → `scripts/check-design-smells.mjs`: the taste floor's measurable half — `transition: all`, gradient text, glass outside the header, emoji as icons, eyebrow density (≤ one per three sections), section-number labels, identical card rows, pure black; `scripts/check-source-rules.mjs`: `transition: all` and lone `vh` heights at the source rung. Proven red on 2026-09-27 (a gradient h1, a frosted panel, a "01 / 06" eyebrow, `transition: all` injected into the built homepage → four findings; `transition: all 200ms; min-height: 50vh` injected into Faq.astro → two source failures) and restored.
Already covered: "photographic worlds, not clay dioramas" → design-brief § 8 (no stock, no generated people) and the proof-in-the-hero rule; "real numbers only, no invented statistics" → AGENTS rule 1; "no text baked into images" → Figure.astro draws figures as inline SVG; contrast per line on the composited page → `check-contrast` (it composites translucent ancestors); "em dashes in visible text" → `voice.json` owns punctuation tells; the repo's own voice uses the em dash on purpose, so the ban is refused as a rule and left to the voice layer.
Refused: the engine (scrollcraft.js/.css), scrubbed video, pinned acts, the eight grammars as written (four survive as layout motifs: typographic poster, chaptered, split stage, gallery — long-scroll, live surface, continuous world and rhythmic cutlist need pinning or a product runtime); Kie.ai asset generation — generated imagery is the smell the brief refuses, and a photograph of the real work is the asset; "at least four device families, never the same twice in a row" — the template has bands, not devices; the mechanism survives as "no two adjacent bands alike" (mechanised).

### taste-skill (github.com/Leonxlnx/taste-skill — skills/taste-skill and skills/redesign-skill SKILL.md read in full)
Evidence: a 62-item pre-flight and an audit checklist; mechanisms throughout, no measurements claimed. Written for React + Tailwind + GSAP.
Transfers (adopted) → `.claude/skills/design-direction` § 3.2 (two families, emphasis from the same family, Inter/system as a choice that needs a reason), § 3.3 (one accent, restrained saturation, no pure black, the two default palettes — purple glow, cream-and-brass — refused unless the brand's own), § 3.4 (the hero holds ≤4 text elements, h1 ≤2 lines, lede ≤20 words, first CTA inside the fold), § 3.5 (motion motivated in one sentence, transform/opacity/clip-path only, ease-out, <300 ms, hover gated to a real pointer), § 4's smell pass by eye (badge pill, version label, scroll cue, marquee, "trusted by" with no customers, filler verbs) · `scripts/check-design-smells.mjs` (eyebrow count ≤ ⌈sections/3⌉, no three identical cards, the hero fold at 375×667, 200% text at desktop, touch targets) · the redesign audit's order of work (font, palette, states, layout, components, empty/error states, polish) → § 4's prove-it order.
Already covered: dark mode → CHECKLIST § 8 (not included, on purpose); WCAG AA → the sweep; reduced motion → AGENTS rule 14; "no hand-rolled SVG icons" → the icon policy is none or one inlined set (Header's chevron is two borders, not an icon); `min-h-[100dvh]` never `h-screen` → AGENTS rule 13 (now a source rule); real copy, real names → AGENTS rule 1 and `voice.json`.
Refused: the three dials (variance, motion, density) — the brief's § 0 and § 2 decide these in words the owner can read; the em-dash ban as a page rule — the voice layer's call; GSAP skeletons, `'use client'` leaf components, Tailwind class defaults, Motion `useScroll` — no runtime; "logo wall under the hero" as a pattern — only with real customers, which is a content rule already; "picsum placeholders" — a placeholder image is a TODO, never shipped.

### The five component libraries (uselayouts.com; originkit.dev; atelier-ui.com; pixel-perfect.space; ui.soralabs.studio/catalog; cuedesign.space) and obsidianui.dev
Evidence: all read on 2026-09-27. Every one ships React + Tailwind with Framer Motion, GSAP, canvas or WebGL (Atelier adds React Three Fiber; Sora Labs and Obsidian GSAP/canvas); Cue is a paid membership ($99–249) curating patterns from awwwards-tier sites.
Transfers (adopted) → `.claude/skills/design-direction` § 1 "Component and section libraries — composition sources, never code": read for what a section, a navigation or a reveal can be; each pattern is re-expressed in the template's CSS mechanisms or admired and left. Cue's free tier is enough to read; nothing paid.
Refused: installing any of them, pasting any of them — outside the stack (AGENTS rule 17; CHECKLIST § 8 "No Tailwind, on purpose"); Atelier's WebGL layer as a reference at all.

### The resources list (reelfolio.io, obsidianui.dev, designeer.xyz, inspora.design, backgrounds.supply, fontshare.com, hugeicons.com, modulify.ai/templates, wedoflow.com, landdding.com, motionin.design)
Transfers (adopted) → `scripts/design-refs.mjs` (Landdding, Inspora and Designeer join the gallery list with reachability checked each sweep; Designeer as a directory for finding the next gallery, never a reference) · `.claude/skills/design-direction` § 1 (Fontshare as a font source — self-hosted woff2 only, licence read per family, never its CDN; Hugeicons as an icon-set candidate with its free/paid split read first; backgrounds.supply as gradient and pattern ideas reproduced as CSS tokens and measured behind text; motionin.design as a motion-pattern source, each pattern re-expressed or refused).
Refused: reelfolio.io (a paid showreel-video tool — not a website resource); modulify.ai and wedoflow.com (AI-generated and Webflow template packs — a template pack is the look this skill exists to escape, and a paid one); backgrounds.supply as image files (a PNG background is bytes and an unmeasured surface).

### "Before starting a new website the repo should look for inspiration" (the owner's ask, in their words)
Transfers (adopted, mechanised) → `scripts/design-refs.mjs` (`npm run design:refs -- --category <slug>`: the category's current awwwards entries and the latest Sites of the Day with their live URLs and tags, the tags split into register and tech, the galleries' reachability; writes `marketing/design-refs.md`, generated) · `.claude/skills/design-direction` § 1 runs it first · `SETUP.md` Phase 1 and `/new-site` phase 7 name it · `ACTIONS.md` A-Q04 (`entries:marketing/design-refs.md:92` — the sweep is re-run every quarter or `npm run actions` goes red) · `runbook.md` quarterly row.
Already covered: `/landscape` § 4 reads the category's awwwards entries into landscape.md § 6 — it keeps doing so; the sweep is the dated, machine-read half it hands to design.
Open: none — the category slug is a per-site value; `/design-direction` § 1 lists the valid ones and the owner picks in the session.

## 2026-09-27 — Twelve playbooks, one ingest

### Atomik Growth Launch Playbook (PDF summary, @SG, Sep 24 2026)
Kind: PDF (11 pages, a teardown of 14 Atomik blog posts).
One line: a launch is a two-hour window where the algorithm judges velocity; fill it on purpose with a category reframe, a picked day, tiered amplifiers, custom copy, a war room and a second wave.
Transfers → `launch-playbook.md` § 1–5: the T-14…T+30 timeline, the first-hour minute table, the tiers built from the founder's own network, the promo kit per backer, press first then post, one KPI, fix the landing page before pointing anything at it, receipts over endorsements, the second wave at +6h, clipping only from long-form that exists, the day-30 breakdown as the first case-study post.
Transfers → `ACTIONS.md` A-L14 (run the announcement, date and KPI recorded).
Already covered: "lead with proof, no 'revolutionary'" → `voice.json` bans; "views are a vanity metric" → the funnel ladder (STRATEGY § 5).
Refused: the rented network (300 coordinated accounts, 10,000 clip pages) — not owned, not needed for the choreography; comment-seeding with prepared takes and agency-written investor posts without disclosure — astroturf; "guaranteed views" — the vendor's own terms disclaim it; the "compounding attention" claim — asserted, not shown.
Open: which one KPI the owner would pay for (enquiries, demos, sign-ups) → `STRATEGY.md § 8` at launch, asked in `/launch`.

### "The D*ath Of The Influencer: Trust = MicroAuthority" (@WizOfEcom, Mogul Media, x.com/wizofecom/status/2103156728267182470 — read in full from the owner's paste on 2026-09-27; the link returns 402 to a fetcher)
Kind: article (eight sections).
One line: trust replaced attention; founder-led content converts when it is written for a buyer's objections and carries a message, an enemy and a belonging, and each of its three layers is measured on its own signal.
Evidence: one operator's account (165k followers, 60+ client accounts) and two of their own posts (984k views / 2,276 saves against 156k views / 4,833 saves). Self-reported, no control; the mechanism (only a buyer has objections; a save is a return intent) is sound and costs nothing to run as a trial.
Transfers (adopted, mechanism-level) → `content-guidelines.md` § 3 (write for objections; the outcome, what they suspect, decisions and what they cost; the five objections from sales calls are the next five posts; message / enemy / belonging), § 6 (three jobs and the signal each is measured on: top on qualified views, profile visits and ICP follows; middle on saves, DMs and who engages; bottom on clicks, applications and booked calls — lowest engagement by design).
Transfers (trial) → `runbook.md` M7 (the 20-post audit: label top/middle/bottom, count, check who followed last month) and the narrative test (six to eight pieces per message-enemy-belonging until one is an anomaly, then build on it) — measured on saves and replies, not views, reviewed at the first quarterly channel-gaps pass.
Transfers → `.claude/skills/onboard-marketing` step 3 (the thesis as message + enemy + belonging); `.claude/skills/interview` (objections asked for by name).
Already covered: "who followed you, not how many" → the ICP social sweep and the country split; "where this breaks" (mass reach, an offer that does not close, wanting to be known, 30-day results) → `launch-playbook.md` § 6.
Refused: the "$3 to $5 per follower" figure and the follower-value curve — one account's estimate, never a number this site states; the closing offers (a guided programme, an agency retainer).

### "The AI SEO Playbook" (@SEOKeval, x.com/SEOKeval/status/2102044017936465937 — read from the owner's screenshots on 2026-09-27; the link returns 402 to a fetcher)
Kind: article (four steps).
One line: AI has no opinions, only sources; the author analysed what AI Overviews cited for "best toothpaste for plaque removal" (best-listicles, top 5–7 items, dental blogs), wrote ten listicle variations with their brand at #1, paid ten DR30+ dental blogs $100–200 each to publish one variation apiece, waited three weeks for indexing, and reports the brand recommended #1 in AI Overviews, AI Mode and ChatGPT.
Evidence: one self-reported case, one query, no control, no duration stated beyond "under 30 days".
Policy: fails. Paid placements without disclosure are sponsored content Google's site-reputation-abuse policy targets and most jurisdictions' advertising rules require labelling; ten near-duplicate listicles are the scaled-content pattern; a "consensus" manufactured by the brand is the fabricated-proof class VOICE-GUIDE § 5 forbids. An assistant that learns the trick delists the sources, and the brand with them.
Transfers (adopted) → `marketing/ai-panel.md` § What the run does with the answers: for every prompt, record the PROFILE of the cited sources (format, depth, publisher type), because a recommendation is assembled from sources and the profile says where to earn a place; `runbook.md` W11 (outreach targets are the publishers of the type the panel shows being cited, pitched with a real page, disclosed if anything is paid); `page-guidelines.md` § 4 (a "best" roundup of our own, modelled on the cited structure, with a #1 we can defend and the rivals named honestly).
Refused: paying blogs to publish brand-first listicles; ten variations of one page; placing the brand at #1 in copy the brand wrote and did not disclose.

### GSC → BOFU → checklist loop (pasted by the owner; author not given — attributed to a practitioner serving "7–9 figure tech companies")
Kind: thread (eleven steps).
Evidence: the mechanism is Search Console's own data plus a checklist; nothing to take on trust. Adopted as code and proven on this repo (the `bofu` block ran against synthetic rows; the audit against the template's pages).
One line: export Search Console by position, find the bottom-of-funnel queries at 4–20, work the AI-search checklist on the easiest page, check daily.
Transfers → `src/data/intent.json → bofu` shapes and `scripts/lib/intent.mjs § playbookBlocks` (`searchConsole.bofu`, printed by `npm run insights`); `runbook.md` § The BOFU loop; content-cadence step 2g.
Already covered: "positions 4–20 are the shortlist" → `nearPageOne`; "leads only from positions 1–5" → the funnel ladder rung 2.
Refused: giving the sheet to a chat model by hand — the pull is scripted; the "download link in the first comment" — the checklist itself is the next entry.

### AI Search Checklist (Contact, pasted checklist: on-page, differentiation, copy, craft, freshness, query fan-out A–H)
Kind: checklist (81 items).
Evidence: a vendor's checklist; each item is a mechanism (extractability, freshness, coverage of sub-queries) consistent with the one controlled GEO study the site already cites (Aggarwal et al., KDD 2024). Adopted as an informational scorer, never a build gate, and proven on this repo (`--min 90` goes red on the sample pages).
Transfers → `page-guidelines.md` § 1 (the six groups and the fan-out table) and `scripts/page-audit.mjs` (`npm run audit:pages`, twenty checks, first fix named, `--min` as a draft gate).
Transfers → `content-guidelines.md` § 1 (BLUF, islands, extractable passages, semantic triples, entity-rich, short sentences).
Already covered: `tldr`, FAQ from one array, sources, author `sameAs`, lead figure → the schemas and invariants.
Refused: "an embedded YouTube video is present" as a per-page requirement — video only where one exists (no video, no VideoObject — there is nothing to score); "updated within the last 30 days" as a universal bar — 30 for pages whose facts move, 90 elsewhere, and never a date bump without a change.

### About Us page, the 8-point post and the Contact.so SOP (pasted)
Kind: SOP.
One line: the About page is the entity source document for the knowledge graph and the assistants: eight sections, a Key Facts table as HTML, third person, no em dashes, competitors named, schema validated.
Transfers → `page-guidelines.md` § 3 in full; `ACTIONS.md` A-L13 (built, facts approved in writing) and A-Q03 (reconfirmed quarterly); `.claude/skills/new-site` phase 10 (the About page built to the spec); `src/pages/about.astro` stays the template's demo until a site fills it.
Already covered: Organization / Person / BreadcrumbList / FAQPage from one source → BaseLayout and `faqSchema.ts`; "no self-written aggregateRating" → CHECKLIST § 11; the Key Facts numbers from `facts.json` → AGENTS rule 1.
Refused: "ignore llms.txt" as advice to remove it — it is generated for free and kept, but the About page is the surface the assistants read (page-guidelines § 3 says so); the calendly plug.

### "Optimized title/H1, key takeaways, structured formats, freshness, FAQs" (pasted, five bullets)
Already covered: all five → `page-guidelines.md` § 1.

### "Easiest SEO keyword optimization" (pasted: Pages by impressions → Queries → position near 1 → add the missing query)
Transfers → `scripts/lib/intent.mjs § playbookBlocks` (`searchConsole.quickWins`: page × query at position ≤5 whose phrase the page's source does not say, via `scripts/lib/pageText.mjs`); `runbook.md` § The quick-win loop; content-cadence step 2f.

### Free backlinks from Google properties (@hridoyreh thread, screenshot: Chrome Web Store, Google Docs, Google Sites, Search Console Community, "SEO Wins")
Kind: thread.
Transfers → `link-targets.md` row: a Chrome Web Store listing, only if the site ships a real extension (added as a `skip` row with the condition).
Refused: publishing Google Docs and Google Sites pages to link to the site — nofollowed, thin, and the pattern scaled-content policy names; posting a staged question in the Search Console Community "as if you know nothing" — deceptive, and the community is not a link source; the paid "SEO Wins" database — a product plug.

### "Marketing engineering: before/after static ads" (pasted)
Kind: thread.
One line: scrape Reddit pain points, generate before/after ad creatives, bulk-upload to Facebook ads, prune losers, let winners seed the next round.
Transfers → `.claude/skills/write-content` ICP social sweep (already harvests pain points in the ICP's words; noted that a "before / after" pair is a valid post shape for the top layer).
Refused: the paid-ads pipeline, the Postgres store and the image generation — outside this site's stack and strategy (no paid acquisition in the template; AGENTS rules 3–4 gate and measure every vendor). Re-argue in `channel-gaps.md` if the strategy adds paid.

### "How we generated millions of organic clicks with programmatic SEO" (pasted, eleven patterns)
Transfers → `page-guidelines.md` § 4 (the eleven patterns with the line an assistant lifts); `.claude/skills/keyword-map` § 1 (pattern candidates in the backlog with the data each needs); `runbook.md` W4.
Already covered: "built only from real data" → AGENTS § Content (programmatic pages, `sources` min 1); glossary as the linking layer → site-blueprint § 3.
Refused: the revenue and citation claims as evidence — self-reported; the "5-person team out-ranks 10x headcount" framing — not a move.

### AEO research list (pasted, eight arrows: reading GSC + product analytics, what ChatGPT searches on Bing, modelling Gemini/Claude questions, who is cited, the sources behind citations, the gap, fixing pages, which page types get picked)
Transfers → `runbook.md` W10 and `ai-panel.md` (the panel records who is cited and the sources behind the citation; a cited listicle or thread becomes a link-target row); the Bing block in `npm run insights` covers "what ChatGPT searches on Bing".
Already covered: the funnel and its levers (`npm run aeo`), the Generative AI export.

### Seven AI agents for AEO (pasted: competitor page scoring, keep/change per element, question-to-page match, citation chance per URL, buyer-sort of search terms, internal link map, 20 yes/no checks on drafts)
Transfers → `scripts/page-audit.mjs` (citation chance per URL with the first fix; twenty checks; `--min` as the draft gate); `intent.json → bofu` (the buyer-sort); `page-guidelines.md` § 5 (the link map with an honest reason per link); `runbook.md` § The BOFU loop (score the competitor pages above ours on answer, depth, proof, freshness before touching ours).
Refused: nothing; the seven are shapes, not claims.

### "8 internal linking hacks" (Borja, distribb.io, pasted)
Transfers → `page-guidelines.md` § 5 (the eight steps, the link shape, the per-link record, the four-week check); `runbook.md` W7 and § The page-two push; `.claude/skills/write-content` § 4.
Already covered: anchor discipline, no orphans, no identical anchor to two targets → `check-link-graph`; "from an indexed page" → site-blueprint § 3.
Refused: the Distribb product links.

### Prompting Claude Fable 5.1 (Anthropic docs, fetched 2026-09-27)
Transfers → `content-guidelines.md` § 0 and `src/data/voice.json → prompt` (the standing line "Remove all mannered prose." and the definition of mannered prose); `.claude/skills/content-cadence` (finish the whole task: never end a run describing what it would do next); every content-producing skill carries the line.
Already covered: batching tool calls, progress updates — harness behaviour, not repo rules.

### "Perfectly optimized page for AI search" (Nectiv infographic, screenshot)
Transfers → `page-guidelines.md` § 1 (title/meta/URL/robots row; one page one intent; answer first; fan-out coverage; tables and bullets; a number to quote; question in answer out; say what nobody else can; schema twice; author; freshness). Illustrative content noted as illustrative.
Already covered: the machine-readable half → BaseLayout's JSON-LD, the invariants.

### Monthly agency scope (pasted, "what you get each month")
Transfers → `runbook.md` § What the engine delivers in a month (the scope as a visible bar); W11 (directory submissions and up to five outreach pitches a month, proposed by the run, sent by a human); the "social posts for every article" rule → `content-guidelines.md` § 6 and `social-queue.md`; "prices, features and claims kept accurate right after you ship" → `runbook.md` § The accuracy check after a ship.
Already covered: keyword map, indexing checks, AEO tracking, weekly report.
Refused: "up to 12 articles" as a quota — no volume cap and no volume target here; the fuel rule decides.
