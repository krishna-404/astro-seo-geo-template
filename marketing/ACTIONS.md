# Actions — what a human has to do, checked on every run

**Why this file exists.** The engine runs unattended and most of what it
cannot do is a human's job: give a script a key, click a button in a
dashboard, export a report, claim a listing, read an email. `DATA-SHEET.md`
holds the *questions* only the owner can answer; `link-targets.md` holds the
*listings* only a human can claim. This file holds every other **action**:
one-off launch tasks, the keys the scripts need, and the recurring things a
site dies without. `npm run actions` (`scripts/actions.mjs`) checks each one
that can be checked mechanically, prints what is open, and `--update` ticks
the boxes so nobody keeps a list by hand. It runs at session start, inside
every cadence run, and its block goes into every report under **Actions**.

**Two kinds of item.** An item with a mechanical `Check` is verified by the
script every run and its mark is rewritten: a key that disappears from the
environment, an export that goes stale, a panel that was not run this month
all flip back to open by themselves. An item whose check is `manual` is
ticked by the owner: write the date under **Done:** and the script reads it
(`manual:N` means it has to be redone every N days, and the date decides).

**Rules.** A run never ticks a manual item; it asks. A run that hits an
action nobody wrote down adds it here in the same PR, in this format. Where
an API does not exist, the item says so and the how-to is the human's path.
No item is deleted: one that no longer applies is marked 🚫 with a reason.

**Format is load-bearing.** `scripts/actions.mjs` parses `### A-…` headings
and the four fields. Keep the shape: id, middle dot, title, status mark;
then **Phase**, **Check**, **Why**, **How**, **Done**.

Check kinds: `manual` · `manual:N` (redo every N days) · `env:VAR` (`+` for
all of several) · `origin` · `placeholders` · `grep:<file>:<regex>` ·
`nogrep:<file>:<regex>` · `file:<path>` · `fresh:<dir>:<days>` (newest dated
file) · `entries:<file>:<days>` (newest `## YYYY-MM-DD` heading) ·
`snapshot:<days>` · `panel:<days>` · `securitytxt` · `indexnow` ·
`datasheet` · `linktargets` · `social`

**Status:** ⬜ open · ✅ done · 🚫 not applicable (with a reason in Done)

---

## Launch — once, before the site is announced

### A-L01 · Set the canonical domain ⬜

**Phase:** launch
**Check:** origin
**Why:** Every absolute URL on every surface derives from `src/data/origin.mjs`. While it says `example.com`, nothing can be measured and the live smoke skips itself.
**How:** Edit the one line in `src/data/origin.mjs`. SETUP Phase 1.
**Done:**

### A-L02 · Clear the template placeholders ⬜

**Phase:** launch
**Check:** placeholders
**Why:** `Example Co` in the OG cards and `hello@example.com` in the footer ship silently; nothing but this grep stops them.
**How:** `grep -rn "TODO\|example\.com\|Example Co" src public wrangler.jsonc marketing` until it is clean apart from `privacy.json` markers and `productSchema.example.ts`. SETUP Phase 1.
**Done:**

### A-L03 · Register the real authors ⬜

**Phase:** launch
**Check:** nogrep:src/data/authors.json:TODO
**Why:** Every byline links to `/author/<slug>`; a `TODO` author is a credential nobody can verify and the check fails the commit.
**How:** Fill `src/data/authors.json`: real name, title, a bio of checkable facts, a real LinkedIn URL. /onboard-marketing step 4.
**Done:**

### A-L04 · Put the founder and company facts in facts.json ⬜

**Phase:** launch
**Check:** nogrep:src/data/facts.json:TODO
**Why:** The Organization node, the About page's Key Facts table and every published number read from here. A `TODO` renders as a claim the site cannot make.
**How:** Replace every TODO in `src/data/facts.json` with the value and its source. Confirm every number with the owner in writing before it goes live (page-guidelines § About).
**Done:**

### A-L05 · Verify the site in Bing Webmaster Tools ⬜

**Phase:** launch
**Check:** grep:src/data/site.ts:bing:\s*'[0-9A-Fa-f]{16,}'
**Why:** Bing's index feeds Copilot, DuckDuckGo and ChatGPT search. Without verification the site is invisible to two of the three big assistants and nothing on Google will show it.
**How:** Bing Webmaster Tools → add the site → meta tag method → paste the token into `VERIFICATION.bing` in `src/data/site.ts` → deploy → verify. Then submit the sitemap there.
**Done:**

### A-L06 · Wire analytics ⬜

**Phase:** launch
**Check:** grep:src/data/site.ts:websiteId:\s*'[^']+'
**Why:** Conversions leave the page; without a tracker nothing records them. Umami is cookieless and needs no banner.
**How:** `ANALYTICS.umami.websiteId` + `upstream` in `src/data/site.ts` and `UMAMI_UPSTREAM` in `wrangler.jsonc`, both hops. SETUP Phase 4. GA4 instead means the consent banner and `privacy.json` in the same commit.
**Done:**

### A-L07 · Fill security.txt for this domain ⬜

**Phase:** launch
**Check:** nogrep:public/.well-known/security.txt:example\.com
**Why:** RFC 9116 makes the file assert which host it belongs to; a wrong `Canonical` is worse than none.
**How:** Set `Contact`, `Canonical`, `Expires` (about a year out). The annual renewal is A-Y01.
**Done:**

### A-L08 · Search Console domain property, sitemap submitted ⬜

**Phase:** launch
**Check:** manual
**Why:** No API creates a property or submits a sitemap. Until this exists there is no demand data at all.
**How:** Search Console → Add property → **Domain** (DNS TXT, not URL-prefix). Sitemaps → submit `https://<domain>/sitemap-index.xml`. Then add the service-account email from A-K01 as a Restricted user.
**Done:**

### A-L09 · IndexNow key file in place ⬜

**Phase:** launch
**Check:** indexnow
**Why:** IndexNow is how Bing, Yandex and Seznam learn about a deploy the same day. The key file is the only proof of ownership they accept.
**How:** Generate a 32-hex key, save it as `public/<key>.txt` containing exactly the key, deploy. `/ship` submits after every deploy.
**Done:**

### A-L10 · Cloudflare dashboard, setting by setting ⬜

**Phase:** launch
**Check:** manual
**Why:** Zone HSTS, the www redirect, the four OFF switches, SPF/DMARC/CAA: none of it has a diff, all of it breaks something silently.
**How:** Walk PLAYBOOK §6 top to bottom, then `curl -I` each claim. Record any deviation in PLAYBOOK §6 in the same commit.
**Done:**

### A-L11 · Contact form deployed and tested end to end ⬜

**Phase:** launch
**Check:** manual
**Why:** Every failure path also redirects to the thanks page; only a row in the Sheet and an email in the inbox prove the form works.
**How:** SETUP Phase 4 § Forms: Apps Script from inside the sheet, manifest pasted, `selfTest()` run, web app deployed, `CONTACT_SCRIPT_ID` set as a worker secret. Submit the real form; check the row and the email; submit with the honeypot filled and check it lands in `Filtered`.
**Done:**

### A-L12 · Live verification battery ⬜

**Phase:** launch
**Check:** manual
**Why:** Headers, redirects, HSTS and the CSP are invisible until something in front of the origin breaks them.
**How:** PLAYBOOK §8 against the live site: the curl list, the assets, the behaviour list. `node scripts/smoke-live.mjs` does the automated half.
**Done:**

### A-L13 · About page built to the entity spec, facts approved in writing ⬜

**Phase:** launch
**Check:** manual
**Why:** The About page is the one first-party document answer engines read to say what the company is. Its Key Facts table and its schema carry claims the owner has to stand behind.
**How:** `marketing/page-guidelines.md § About`: the eight sections, the Key Facts table as HTML, the schema, the pre-publish list. Every number confirmed by the owner in writing before publish.
**Done:**

### A-L14 · Run the launch announcement ⬜

**Phase:** launch
**Check:** manual
**Why:** A site that goes live without an announcement has no first inbound links, no first citations and no first-hour signal anywhere.
**How:** `marketing/launch-playbook.md` (or `/launch`): the T-14 to T+30 sequence, the promo kit, the one KPI, the day-after review. Write the date and the KPI result here.
**Done:**

### A-L15 · Schedule the cadence Routine ⬜

**Phase:** launch
**Check:** manual
**Why:** Nothing recurs unless a Routine fires it. One firing a day; a second stands down by design.
**How:** SETUP Phase 5 step 3: a Routine on this repo's environment with the prompt "Run /content-cadence. Daily mode on weekdays; weekly mode on Monday." Give the environment every key in the Keys section.
**Done:**

## Keys — what the scripts cannot read without you

There is no API that hands a script a credential. Each item names the key,
where it comes from, and what stays dark without it. Keys live in the
session or Routine environment, never in the repo.

With `GSC_SA_KEY`, `UMAMI_URL` + `UMAMI_WEBSITE_ID`, `CLOUDFLARE_READ_ANALYTICS`,
`CADENCE_REPORT_TOKEN` and `CLOUDFLARE_DEPLOY_TOKEN` + `CLOUDFLARE_ZONE_ID` set,
the daily run measures, writes, commits and **deploys itself** — no human step
between a green battery and the live site (`marketing/STRATEGY.md § 9`). Add
`BING_WEBMASTER_API_KEY` and it tells Bing directly on the way out.

### A-K01 · GSC_SA_KEY — Search Console read-back ⬜

**Phase:** keys
**Check:** env:GSC_SA_KEY
**Why:** Queries, pages, positions, the high-intent rows, the quick wins, the request-indexing shortlist: every demand number comes from here. Without it the run cannot see what Google shows.
**How:** Google Cloud → service account with the Search Console API enabled → JSON key → `base64 -w0 key.json`. Add the service-account email as a **Restricted** user on the `sc-domain:` property. Set `GSC_SA_KEY` in the Routine environment.
**Done:**

### A-K02 · CLOUDFLARE_READ_ANALYTICS — the edge ⬜

**Phase:** keys
**Check:** env:CLOUDFLARE_READ_ANALYTICS
**Why:** The only place a refused answer-engine crawler is visible. Without it stage 1 of the AEO funnel is unmeasured and a WAF block on GPTBot is invisible.
**How:** Cloudflare → API tokens → custom token scoped Zone:Read + Analytics:Read on this zone, nothing else.
**Done:**

### A-K03 · UMAMI_URL + UMAMI_WEBSITE_ID (+ token or login) — visitors ⬜

**Phase:** keys
**Check:** env:UMAMI_URL+UMAMI_WEBSITE_ID+UMAMI_BEARER_TOKEN|UMAMI_URL+UMAMI_WEBSITE_ID+UMAMI_USERNAME+UMAMI_PASSWORD
**Why:** Visitors, CTA events, referrals from AI assistants, the country split. Without it stage 5 of the funnel and rung 1 of the funnel ladder are blind.
**How:** Umami → Settings → Websites → Website ID; `UMAMI_BEARER_TOKEN`, or `UMAMI_USERNAME`/`UMAMI_PASSWORD` and the script logs in itself.
**Done:**

### A-K04 · BING_WEBMASTER_API_KEY — the index behind Copilot and ChatGPT search ⬜

**Phase:** keys
**Check:** env:BING_WEBMASTER_API_KEY
**Why:** The only automatic read of the index two of the three biggest assistants answer from, and the key that lets `npm run indexnow` submit the recently changed URLs to Bing's URL Submission API on every deploy — the daily run's deploy included — rather than reaching Bing only through the shared IndexNow endpoint. Without it stage 3 of the funnel knows only Google's half.
**How:** Bing Webmaster Tools → Settings → API access → Generate. Read-only use.
**Done:**

### A-K05 · CADENCE_REPORT_TOKEN — the report email ⬜

**Phase:** keys
**Check:** env:CADENCE_REPORT_TOKEN
**Why:** Without it the run's report has no channel and is committed to the repo instead of arriving in an inbox.
**How:** `openssl rand -hex 24` → `REPORT_TOKEN` in `contact-form.gs` (re-deploy the web app, new version) and the same value as `CADENCE_REPORT_TOKEN` in the Routine environment.
**Done:**

### A-K06 · CLOUDFLARE_DEPLOY_TOKEN — /ship ⬜

**Phase:** keys
**Check:** env:CLOUDFLARE_DEPLOY_TOKEN
**Why:** Nothing deploys except the ship steps run from a session holding this token — `/ship` by hand, or the daily cadence run itself on the default merge model (GitHub Actions are opt-in, CHECKLIST §2). Without it the run falls back to opening a pull request and says so in the report.
**How:** Cloudflare → API tokens → Edit Workers + Cache Purge, this account only. Never a Global API Key. Set `CLOUDFLARE_ZONE_ID` beside it: the purge step needs it, and without it a deploy serves stale pages for up to five minutes (`max-age=300`) instead of immediately. The zone id is on the dashboard overview; record it in PLAYBOOK §6.
**Done:**

### A-K07 · Posts API secrets (optional) ⬜

**Phase:** keys
**Check:** manual
**Why:** Only if external automation will submit posts. Both secrets unset means the route answers 503 and nothing else changes.
**How:** `wrangler secret put POSTS_API_TOKEN` and `GITHUB_POSTS_TOKEN` (fine-grained PAT, Contents + Pull requests on this repo). Mark 🚫 with "not using the posts API" if not.
**Done:**

## Daily — the human half of the daily run

### A-D01 · Paste the request-indexing shortlist into Search Console ⬜

**Phase:** daily
**Check:** manual:1
**Why:** The Search Console API has no request-indexing endpoint. At this site's size a manual request measurably shortens time-to-index.
**How:** The report's **Do this today** lists up to 10 URLs with an "Inspect in Search Console" link each. Click, Request indexing. Write today's date here (or reply "indexed" to the report and the next run records it).
**Done:**

### A-D02 · Read the deploy line; act on what the run declined ⬜

**Phase:** daily
**Check:** manual:2
**Why:** On the default merge model (`marketing/STRATEGY.md § 9`) the run commits to `main` and deploys itself, so most days this is a read. What still needs you is a pull request the run declined — an API post it would not merge, a change outside its scope — and a run that fell back to the PR path because a guard fired.
**How:** Read the report's first line (deploy version id, URLs submitted, live smoke) and its **Pull requests** section. Act only on the rows the run named as declined: read the reason, then merge and `/ship`, or reply with the decision.
**Done:**

### A-D03 · Post the social drafts for each new piece ⬜

**Phase:** daily
**Check:** social
**Why:** Every new article ships with its social posts written (`marketing/social-queue.md`). A draft nobody posts is distribution that never happened.
**How:** Open `marketing/social-queue.md`, post each `status: unposted` entry on the channel it names, set `status: posted:YYYY-MM-DD`. The check counts unposted entries.
**Done:**

## Weekly — the human half of the weekly run

### A-W01 · Export the Search Console Generative AI report ⬜

**Phase:** weekly
**Check:** fresh:marketing/insights/genai:7
**Why:** The only first-party measure of AI Overviews and AI Mode impressions, and it has no API. Stale export, stale stage 4.
**How:** Search Console → Performance → Generative AI → Last 28 days → Export → Download CSV → save as `marketing/insights/genai/genai-YYYY-MM-DD.zip` → commit (`marketing/insights/genai/README.md`).
**Done:**

### A-W02 · A snapshot landed this week ⬜

**Phase:** weekly
**Check:** snapshot:7
**Why:** `marketing/insights/<date>.json` is the measurement history; a week without one is a week the delta cannot see.
**How:** The run writes it when the keys in the Keys section are set. If this is open, a key is missing or the Routine did not fire; check both.
**Done:**

### A-W03 · Answer the open data-sheet questions ⬜

**Phase:** weekly
**Check:** datasheet
**Why:** Every open question is a page, a figure or a layer the engine is holding back rather than guessing.
**How:** `npm run ask`; type under **Answer:** in `marketing/DATA-SHEET.md`; "don't know" is an answer.
**Done:**

### A-W04 · Claim the next listing ⬜

**Phase:** weekly
**Check:** linktargets
**Why:** Listicles are built from directory data; a product absent from the directories is invisible to whoever writes the next one. Each listing is also a backlink and an entity anchor.
**How:** `marketing/link-targets.md`: claim the next `todo` row (needs an email and usually a phone), set it `live` with the URL, or `skip` with a reason.
**Done:**

### A-W05 · Read the weekly report and reply to its Decisions ⬜

**Phase:** weekly
**Check:** manual:7
**Why:** Anything larger than a small in-scope change waits on a yes. Unanswered Decisions stall the backlog.
**How:** Reply to the report email or write the decision in the file it names. Date here.
**Done:**

### A-W06 · Search Console: Security & Manual Actions empty, indexing report read ⬜

**Phase:** weekly
**Check:** manual:7
**Why:** A manual action found a week late is a disaster; a day late is fine. Neither report has an API the script can read.
**How:** Search Console → Security & Manual Actions (must be empty) → Pages (new exclusions, "Duplicate, Google chose a different canonical"). PLAYBOOK §9.
**Done:**

## Monthly

### A-M01 · Run the AI prompt panel ⬜

**Phase:** monthly
**Check:** panel:35
**Why:** No assistant sells a "were we named" endpoint. The panel is the only measure of who ChatGPT, Perplexity, Gemini, Copilot and Claude name for the buyer's questions.
**How:** `marketing/ai-panel.md`: 20 minutes, one `## Run YYYY-MM-DD` block, never fabricated.
**Done:**

### A-M02 · Read the link-rot result ⬜

**Phase:** monthly
**Check:** manual:31
**Why:** A dead `sources` link quietly undermines the credibility signal the schemas enforce. The workflow runs on the 3rd; nobody reads it unless this says so.
**How:** GitHub → Actions → linkrot → newest run. Fix, archive (web.archive.org) or drop each dead citation.
**Done:**

### A-M03 · Name the competitors the scripts should watch ⬜

**Phase:** monthly
**Check:** grep:src/data/intent.json:"competitors":\s*\[\s*"
**Why:** Competitor-name queries in Search Console ("<rival> alternatives", "<rival> vs") are the highest-intent rows there are, and the script cannot recognise a rival it has not been told about.
**How:** `src/data/intent.json → competitors`: the names from `marketing/landscape.md`. Reviewed monthly; a new rival is added the month it appears in a SERP or a panel answer.
**Done:**

### A-M04 · Debrief the real world into field notes ⬜

**Phase:** monthly
**Check:** entries:marketing/field-notes.md:31
**Why:** Field notes are the richest fuel a post can carry and the one thing an LLM cannot produce. A nudge, not a gate: the engine writes from the other channels without them.
**How:** Run `/interview` in a session; it appends dated entries to `marketing/field-notes.md`.
**Done:**

## Quarterly

### A-Q01 · Full crawl of the live site ⬜

**Phase:** quarterly
**Check:** manual:92
**Why:** Redirect chains, orphans and stray 404s accumulate between deploys and no per-page check sees the whole graph at the edge.
**How:** Screaming Frog free tier (500 URLs) or equivalent against the live origin. Fix what it finds; a URL that must keep working goes in `PERMANENT_REDIRECTS`.
**Done:**

### A-Q02 · Re-validate structured data, one page per type ⬜

**Phase:** quarterly
**Check:** manual:92
**Why:** schema.org and Google's supported types both drift.
**How:** Rich Results Test on the homepage, one post, one glossary entry, the About page.
**Done:**

### A-Q03 · Re-confirm the About page facts and the landscape ⬜

**Phase:** quarterly
**Check:** manual:92
**Why:** Pricing, contract terms, notable clients and competitors named on the About page go stale in a quarter, and a stale key fact is the fastest way to lose a citation already earned. The landscape is re-fetched on the same clock.
**How:** Walk the Key Facts table with the owner; bump `updated`; run `/landscape` § 5 (Revisit) and date the Log in `marketing/landscape.md`.
**Done:**

## Annual

### A-Y01 · Renew security.txt ⬜

**Phase:** annual
**Check:** securitytxt
**Why:** `Expires` is a year out by design; an expired file reads as an unmaintained site to exactly the audience it exists for.
**How:** Re-date, bump `Expires`, commit. The check turns open 30 days before expiry.
**Done:**

### A-Y02 · Domain and registrar ⬜

**Phase:** annual
**Check:** manual:365
**Why:** Auto-renew off and a stale contact email is how a domain is lost.
**How:** Registrar: auto-renew on, transfer lock on, contact email current.
**Done:**

### A-Y03 · HSTS max-age and preload review ⬜

**Phase:** annual
**Check:** manual:365
**Why:** Preload is a browser-binary decision; raise max-age only once the header has been verified live for a year.
**How:** PLAYBOOK §6 caveats; `curl -sI https://<domain>/ | grep -ci strict-transport` → `1`.
**Done:**

---

## Log

| Date | Change |
|---|---|
| 2026-09-27 | Created: launch, keys, daily, weekly, monthly, quarterly and annual actions, parsed by `scripts/actions.mjs`. |
