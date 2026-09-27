# Playbook — how a site built from this template is built and operated

The order of work and the operating knowledge: what to build when, what the
edge and the dashboards must say, and how to verify it against the live site.
The decisions themselves, with their reasons, are `CHECKLIST.md`; the per-site
values are `SETUP.md`.

**Six documents, six jobs.** `README.md` — the quickstart, and the glossary of
this repo's terms. `SETUP.md` — the ordered walkthrough a NEW site starts
with: every per-site value, in dependency order, before any content work.
`AGENTS.md` — the standing rules for anyone, human or agent, editing the repo.
`CHECKLIST.md` — every architectural decision already made, with its reason.
`PLAYBOOK.md` — the order of work, the operating knowledge and the traps.
`marketing/` — the operating layer the content engine runs on;
`marketing/README.md` indexes it. **Update the document that owns a rule in the
same commit as the change** — a setting nobody wrote down is indistinguishable
from a setting nobody made.

Items marked ⚠ fail *silently* — they look fine and are not.

---

## 0. Decide before writing code

Three decisions that are cheap now and unrecoverable later:

- **One buyer, one primary conversion action.** Every page's CTA hierarchy
  falls out of this; decided late, every page gets re-argued.
- **Pick ONE canonical domain and never serve content on two hosts.** Every
  other host — www, legacy, vanity — 301s to it. Splitting authority is
  unrecoverable without a migration.
- **Cold-email sending domains stay entirely separate.** Never link the site
  to them, never host anything on them. Their reputation is a different
  asset with a different lifecycle, and a burned sending domain must not
  take the canonical domain's standing with it.

## 1. The shape of it

```
   git push
      │
      ▼
  .githooks/pre-push ── npm run verify: collection-route check · astro
      │                 check · build · lastmod check · invariants ·
      │                 worker smoke · html-validate · contrast · axe
      │                 (the gate; GitHub Actions are opt-in — §3 of CHECKLIST)
      ▼  (only if green)
  wrangler deploy ── dist/ → Cloudflare asset store (free, unlimited)
      │              worker/index.ts → the metered edge routes
      ▼
  Cloudflare zone ── TLS, HSTS, www→apex, WAF rate limit, edge cache
      │
      ▼
  Browser
```

There is no server. Static assets serve unmetered from Cloudflare's store; a
handful of behaviours run in one worker (forms proxy, sheet data, `/hi`
rewrites, markdown-twin negotiation, optional analytics proxy, permanent
redirects, the posts API); Google Apps Script handles form storage and email
off the critical path. Why each of those is the shape it is: `CHECKLIST.md`
§ 1–3.

## 2. Build-time architecture

Everything published derives from one source; generate → commit → never
hand-edit the output:

| Output | Derived from | Script | When |
|---|---|---|---|
| `src/data/sheets/*.json` | published Google Sheet tabs | `scripts/fetch-sheets.mjs` | pre-build |
| `llms.txt`, `llms-full.txt` | site config + content collections | `scripts/generate-llms.mjs` | pre-build |
| `.md` twin per content page | the same MDX the page renders | `scripts/markdown-twins.mjs` | post-build |
| `dist/pagefind/` search index | the built `[data-pagefind-body]` HTML | `pagefind --site dist` (`npm run search:index`) | post-build, every build |
| sitemap `<lastmod>` | git commit dates (committed map) | `scripts/lastmod.mjs` | on content change; `npm run verify` checks it |
| favicons (ico + PNGs + apple) | `public/favicon.svg` | `marketing/favicon.mjs` | on brand change |
| OG cards (per page + default) | title, description and lead figure read from **built HTML** | `marketing/og/render-pages.mjs` | on any content change (`check-invariants` fails a page without its card) |

⚠ Anything that checks for a generated file at build time needs **two
builds**: one to emit what the generator reads, one to pick up the result.
OG cards land on the build after they're generated.

**Scheduled posts**: give a blog post a future `published` date and it stays
off every surface (pages, sitemap, RSS, llms.txt, twins, lastmod — one filter,
`src/data/publishing.mjs`) until a build runs on or after that date. A static
site has no runtime clock: the post appears on the FIRST BUILD after the
instant passes and the deploy that follows it. GitHub Actions are opt-in, so
the release is whatever the merge model says (`marketing/STRATEGY.md § 9`):
on the default the daily cadence run's own deploy releases it, with no human
step; on PR review a human's `/ship` on or after the date does. Date-only YAML
(`published: 2026-09-01`) means midnight UTC.

## 3. Serve-time architecture (Workers static assets)

- `astro build.format: 'file'` + `wrangler html_handling:
  "drop-trailing-slash"` → `/about.html` served at `/about`, `/about/`
  redirects (307 — CHECKLIST §2).
  ⚠ These two settings must change together or every route breaks.
- Headers in `public/_headers` — rules **merge**, so the nginx trap class
  "one location's header wipes the inherited set" cannot occur. Security
  headers on `/*`; cache classes per path; `Link: rel="describedby"` → llms.txt.
- ⚠ HSTS: exactly one emitter, and here it is the **zone setting**, so
  `_headers` must never carry it. Verify at the edge:
  `curl -sI https://DOMAIN/ | grep -ci strict-transport` → `1`.
- Markdown twins: the worker negotiates `Accept: text/markdown` on
  content-collection routes and adds `Vary: Accept` on both bodies.
  ⚠ Same URL, two bodies — without the Vary, caches mix them.
- `/hi/<code>`: internal rewrite to the contact page (URL stays visible =
  the attribution datum), `X-Robots-Tag: noindex` at header level.
- `/api/posts`, `/api/posts/<n>`: the posts API (`worker/posts.ts`, SETUP
  Phase 4). Bearer-authenticated and rate-limited; validates a blog post
  against a mirror of the blog schema plus the source rules, writes it to an
  `api/post/*` branch through the GitHub API and opens a PR; `GET` reads the
  PR for its status (queued for the daily run's PR inbox · published ·
  cancelled). The only route
  that writes anything, and it writes to GitHub, never to the site. Both
  secrets unset = 503 and nothing else changes.
- Permanent redirects live in ONE file, `src/data/redirects.json`, which the
  worker imports (a URL that once existed and reached a sitemap or an IndexNow
  ping; a URL visitors keep typing that the site never had). Every key must
  also be in `run_worker_first` or the request never reaches the worker and the
  visitor gets the 404 page — `check-parity` enforces it, and `smoke-worker` /
  `smoke-live` read the same JSON and assert each entry, so a row added there
  is tested without anyone remembering. Each row carries its own `reason`.
- ⚠ `run_worker_first` in wrangler.jsonc is the metering boundary: listed
  routes cost invocations, everything else is free. Review it when adding
  worker behaviour.

## 4. Forms without a backend

```
<form method="post" action="/api/contact">   ← no JS, works with JS off
        │
        ▼
worker: read body → waitUntil(POST → Apps Script /exec?_ip&_cc&_dev)
        └────────→ 303 /contact/thanks  (OUR response, always)
```

Lessons encoded (each cost the ancestor site a bug):
- **Read the body before redirecting** — fire-and-forget without reading the
  body loses every submission while showing a perfect redirect.
- **Never proxy the upstream's response to the visitor** — Apps Script
  answers 200 with Google-sandbox HTML; you cannot intercept a 200.
- **Apps Script cannot read request headers** — client IP/country/device ride
  the query string as fixed URL-safe tokens, never the raw UA.
- **`e.parameter` merges query + body** (spoofable); the script uses
  `e.parameters` (plural) — two values = tampering.
- **Editing the script ≠ deploying it** — publish a new *version* or the
  live URL keeps serving old code. ⚠ Most common "my fix did nothing".
- **Run `selfTest()` from the editor first** — it deliberately catches
  nothing, which surfaces missing OAuth scopes; a deployed script without
  granted scopes reports "Completed" and writes nothing. ⚠
- **Mail quota counts recipients, not messages** (100/day consumer, 1,500
  Workspace); colleagues on **Bcc** so Reply-All can't expose them;
  `replyTo` = the enquirer.
- **Store rejects in a `Filtered` tab** — buyers increasingly send AI agents
  that fill every field including the honeypot. Read it occasionally.
- **Ask for one sheet, not the Drive account** — Apps Script infers scopes by
  scanning the source and rounds up, so a single `openById()` forces
  account-wide `…/auth/spreadsheets` on whoever clicks Allow. The script is
  **container-bound** (`SHEET_ID` empty, `getActiveSpreadsheet()` via `book()`,
  which still resolves inside an anonymous `doPost`) and
  `marketing/apps-script/appsscript.json` **pins** `oauthScopes` to
  `…/spreadsheets.currentonly` + `…/script.send_mail`. Both halves or neither.
  A grant already given is not narrowed by editing the manifest — revoke, then
  re-consent. ⚠

## 5. Measurement

- Umami (cookieless, no banner) by default; GA4 opt-in behind the consent
  banner that owns its tag. See README § Analytics and CHECKLIST §5.
- ⚠ Conversions leave the page (outbound, `tel:`, `mailto:`, form POST) — no
  pageview fires. Every CTA carries `data-umami-event` +
  `data-umami-event-place`; `check-invariants` enforces; the thanks page turns form
  submissions into pageviews.
- ⚠ Proxying analytics same-origin requires BOTH hops (script + collector) —
  the script derives its endpoint from its own src. One hop = zero data.
- Attribution is last-touch and that is a hard limit, not a shortcut —
  first-touch needs storage, and storage is banned. `/hi/<code>` covers
  outbound campaigns cookielessly.
- FAQ accordions are measured the same declarative way: every `<summary>`
  toggle fires the `faq` event with the question text and a `place`
  (`Faq.astro`) — the only first-party signal about which questions visitors
  actually relate to. Counts include closes; the first click is always an
  open, so read it as engagement, not a precise open-count.
- ⚠ Before organic traffic exists, rankings and pageviews say nothing. The
  metric that moves first is **AI citations** — run the target queries monthly
  in the assistants and log who got named (`marketing/ai-panel.md`). Citations
  move weeks before the traffic reports do.

**Reading the numbers back.** `npm run insights` pulls Umami, Search Console
(including `--inspect` for per-URL indexing verdicts) and the Cloudflare edge
into one report, and `npm run aeo` folds them into the answer-engine funnel.
Read-only credentials from the environment; every section soft-skips until it
is configured. **Setting them up is SETUP Phase 4**; what each number means and
how it is scored is the header of the script that computes it
(`scripts/insights.mjs`, `scripts/lib/intent.mjs`, `scripts/lib/genai.mjs`,
`scripts/lib/aeo.mjs`, `scripts/lib/crawlers.mjs`); which run works which block
is `marketing/runbook.md`. Two things worth knowing before you read one:

- The Search Console section leads with the **high-intent queries**, not the
  biggest ones. On a zero-click site the buyer's transactional phrasings sit
  far below the informational rows by volume, and a report sorted by
  impressions never shows them first.
- Every row is kept, never a top-N slice: GSC orders by clicks, which on a
  zero-click site is arbitrary. The page × query dimension is pulled too, so a
  title rewrite uses the words the page is actually shown for.

## 6. Cloudflare dashboard — setting by setting

None of this is in the repo, which is exactly why it is written down. Record
any change here in the same commit.

**Workers → your worker**
- [ ] Custom domain attached (Domains & Routes) — apex, plus `www` if you
      prefer it as a route; otherwise redirect www at the zone (below).
- [ ] Secret `CONTACT_SCRIPT_ID` set (`wrangler secret put`).

**SSL/TLS**
- [ ] Mode **Full (Strict)**. (With Workers as origin this is the default
      sane state; never "Flexible" on any zone — redirect-loop machine.)
- [ ] Always Use HTTPS: on. Minimum TLS 1.2.
- [ ] **Zone HSTS: ON** — max-age 6 months to start. ⚠ `includeSubDomains`
      binds every future subdomain and cannot be un-shipped from visitors'
      browsers until max-age lapses; `preload` is a browser-binary decision —
      submit only after the header is verified live, or the domain gets
      rejected and rate-limited.
- [ ] ⚠ Verify with `curl -I`, never the dashboard: exactly one
      `strict-transport-security` header on the live site.

**DNS records** (Cloudflare → DNS; none of these have anything to do with
serving pages, which is exactly why they get forgotten)
- [ ] ⚠ **SPF + DMARC even though the domain sends no mail.** A domain
      without them can be spoofed in email headers with nothing to contradict
      the forgery — and the damage lands on the domain's reputation, not the
      spoofer's. For a non-sending canonical domain the records are two
      lines, both "reject everything":
      `TXT @ "v=spf1 -all"` and `TXT _dmarc "v=DMARC1; p=reject"`.
      (If the domain DOES send mail — e.g. Workspace — publish the
      provider's SPF include and DKIM instead, and walk DMARC up to
      `p=reject` once reports look clean. Cold-email sending domains are
      separate domains with separate records — §0.)
- [ ] **CAA record pinning your CA**: `CAA 0 issue "letsencrypt.org"` +
      `CAA 0 issue "pki.goog"` (Cloudflare provisions edge certs via
      LE/Google Trust Services — pin what is actually in use; check the
      current cert issuer first with
      `openssl s_client -connect DOMAIN:443 2>/dev/null | openssl x509 -noout -issuer`).
      Any other CA is then refused issuance for the domain.
- [ ] Verify all three from outside:
      `dig +short TXT DOMAIN`, `dig +short TXT _dmarc.DOMAIN`,
      `dig +short CAA DOMAIN`.

**Rules**
- [ ] Redirect Rule: `www.DOMAIN/*` → `https://DOMAIN/$1`, 301. ⚠ Then
      **curl it** — the ancestor site's www redirect lived in a doc and
      served 404 for days; nothing on the site can reveal it.
- [ ] WAF Rate limiting rule: `/api/contact`, ~10 req/min per IP (free plan
      includes one rule). ⚠ Submit your own form afterwards and confirm it
      still reaches the Sheet.

**Speed / Scrape Shield**
- [ ] ⚠ Rocket Loader OFF (reorders/defers scripts; breaks inline consent
      and analytics), Auto Minify OFF (the build already minifies; history
      of corrupting inline JS), Email Obfuscation OFF (injects a
      render-blocking script and rewrites mailto:), Hotlink Protection OFF
      (blocks social platforms from fetching OG cards — every share loses
      its preview).
- [ ] Brotli on (default). Early Hints: harmless either way.

**Caching**
- ⚠ Mostly NOT needed here — Workers assets serve from Cloudflare's own
  store; there is no origin to protect and no cache rule required. Do not
  add a "Cache Everything" page rule: it would cache `/api/*`.
- `npm run purge` (`scripts/purge-cache.mjs`) is the escape hatch, not part
  of the deploy. Pages ship `max-age=300`, so a routine deploy self-heals at
  the edge within five minutes and needs nothing; run the purge when a stale
  cached response must go **now** (a bad page shipped, a wrong header got
  cached). Takes optional paths (`npm run purge -- /about`); needs
  `CLOUDFLARE_ZONE_ID` plus a **scoped** token (Zone · Cache Purge · Purge,
  nothing else — never the Global API Key). Details in the script header.

## 7. Search engines, indexing, AI answers

- [ ] Google Search Console: **domain property** via DNS TXT (URL-prefix
      properties silently miss www/http/subdomains). Submit the sitemap.
      ⚠ Read the Page indexing report, not the totals — "Duplicate, Google
      chose a different canonical" and "Discovered – currently not indexed"
      mean canonical/internal-linking problems.
- [ ] Bing Webmaster Tools (⚠ not optional if AI answers matter — Bing feeds
      Copilot/DuckDuckGo/ChatGPT search): verify via `VERIFICATION.bing`
      meta, submit sitemap.
- [ ] IndexNow: key file at `public/<key>.txt` containing exactly the key;
      `/ship` and the daily cadence run call `npm run indexnow` after every
      deploy (the full live sitemap, following the sitemap index;
      `indexnow.yml` exists for manual dispatch). With
      `BING_WEBMASTER_API_KEY` set, the same command also submits the last two
      days' changed URLs to Bing URL Submission. Google does not participate
      — the sitemap covers Google.
- [ ] robots.txt is a generated route — the AI-crawler list (with intent
      comments) lives in `src/pages/robots.txt.ts` and the Sitemap URL
      derives from `origin.mjs`, so a domain change needs no manual edit.
      Keep the crawler list reviewed; ⚠ understand what each governs before
      blocking anything (Google-Extended = Gemini answers, NOT search
      ranking).
- [ ] After favicon/title/major changes: request indexing of `/` (a nudge,
      not a lever; favicon recrawl takes days–weeks regardless).
- [ ] ⚠ Per page, "in the sitemap / indexable / linked" are THREE decisions.
      A deliberately-unlinked page must be reachable via sitemap or
      structured data — and never via a hidden link (cloaking).

## 8. Verification — against the LIVE site, not localhost

**`npm run smoke:live` is the automated half and its own specification.**
`scripts/smoke-live.mjs` runs as the last step of every deploy once
`origin.mjs` carries the real domain, and asserts: the routing set (apex 200,
www → 301, http → https, trailing slash normalised, unknown route → real 404,
every row in `src/data/redirects.json` → its 301), exactly one HSTS value, a
CSP carrying generated hashes, the security set on a page, `/hi/*` 200 +
noindex, markdown-twin negotiation with `Vary: Accept`, the machine surfaces
(`/favicon.ico`, `/robots.txt`, `/llms.txt`, `/rss.xml`, `/sitemap-index.xml`,
`/.well-known/security.txt`) and an unchallenged 200 for every answer-engine
agent in `scripts/lib/crawlers.mjs`. Do not restate those here — a second copy
is a second thing to drift.

**What no script can see, and stays a human's — the launch-day list:**

- [ ] **Redirects resolve in one hop**: `curl -sIL https://DOMAIN/ | grep -c '^HTTP'`.
- [ ] **Headers on a fingerprinted asset, not only a page** ⚠ — the pairing is
      what catches header-scoping bugs. `Cache-Control` 300 on pages,
      `immutable` on `/_astro/*`.
- [ ] **`/search` in a browser, with a real query** ⚠ — a CSP mistake breaks
      Pagefind's WebAssembly first, and only the console says so. Then
      `/pagefind/pagefind-entry.json` → 200 with a sane `page_count`, and
      `/search` absent from the sitemap.
- [ ] `/apple-touch-icon.png` 200 **and opaque** · `/llms-full.txt` 200 · the
      IndexNow key file 200 with its body equal to its name.
- [ ] **Sitemap sanity**: URL count plausible, noindex pages absent, every URL
      carrying a `lastmod` and not all of them identical ⚠.
- [ ] Canonicals match the served URLs (no `.html`, no trailing slash).
- [ ] JSON-LD validates (Rich Results Test); paste a URL into a social composer
      and watch the OG card render.
- [ ] **Submit the real form** → row in the Sheet **and** the email arrives ⚠.
      The redirect proves nothing: every failure path also redirects. Then a
      honeypot-filled submission → lands in `Filtered`, emails no one.
- [ ] **Analytics records a pageview** ⚠ — a tag in the HTML proves nothing —
      and each tracked CTA fires with its `place`.
- [ ] `LiveData` values update after a Sheet edit (≤5 min).
- [ ] The site renders and the form submits with JavaScript disabled.
- [ ] No horizontal scroll at 320px; the consent banner, if armed, does not
      cover the hero CTA at 375×667 ⚠.
- [ ] Lighthouse in a clean profile ⚠ — extensions appear in traces and get
      blamed on your site. Read the observed metrics, not the simulated
      headline, and check what the LCP element actually IS before optimising
      it.

## 9. Recurring cadence — the site is launched, now what

Launch verification (§8) is a snapshot; what follows only fails with the
passage of time. The full checklists live in **`marketing/runbook.md`**
(daily, weekly, monthly, quarterly, annual: who does each item, which
script, which report section) and the human half is the ledger in
**`marketing/ACTIONS.md`**, which `npm run actions` verifies on every run
and every session start. The launch itself is `marketing/launch-playbook.md`.
This section keeps only the traps those lists cannot explain in a row:

- ⚠ **Security & Manual Actions in Search Console has no API.** A manual
  action found a week late is a disaster and a day late is fine; it stays a
  weekly human check (ACTIONS A-W06) however automated the rest becomes.
- ⚠ **`npm run aeo` names a stage; work that stage, not the lowest
  number.** An edge that refuses an answer engine outranks every content
  item (§5).
- ⚠ **Stage 4 of the funnel stays part human.** No assistant sells a "were
  we named" endpoint and the Generative AI report has no API, so the
  monthly prompt panel and the weekly export (ACTIONS A-M01, A-W01) are the
  only measurements; a run never estimates them.
- ⚠ **The link-rot workflow is the one scheduled Action** (the 3rd of the
  month). Read its result; never ignore-list a dead citation casually.
- ⚠ **security.txt expires by design** (~1 year); `npm run actions` turns
  the item open 30 days before, but the renewal is a commit a person makes.
- ⚠ **Dashboards drift silently and have no diff.** The annual re-run of
  the §8 battery exists because nothing else would notice.

## 10. Process lessons

The traps that live in code are AGENTS rules 10 and 13 and the checks the
battery runs; the decisions behind them are `CHECKLIST.md`. These four are not
about this codebase, and each cost a day:

- **Read the whole command output.** A piped `| tail -2` showed a check
  passing while the build it gated never ran — and the next check then read a
  stale `dist/` and passed too.
- **Verify the failure path, not just the happy path.** Two form designs both
  redirected perfectly; only a logging stand-in revealed that one of them
  delivered nothing.
- **Test against a committed state, not the working tree.** A negative test
  passed because the generator had regenerated the file before the diff ran.
- **Squash merges make branches look permanently unmerged** (`/ship` step 8
  cites this). The original commits never become ancestors of main, so "N
  commits ahead" persists forever with zero content difference. Never stack a
  branch on a squash-merging repo — the same content arriving from two
  ancestries is a guaranteed conflict; branch off main every time — and to
  answer "is this merged", compare the branch tree against the main commit it
  merged into, not commit counts and not `git diff main...branch`.
