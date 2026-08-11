# Playbook — how a site built from this template is built and operated

The phase-by-phase runbook, adapted from the playbook of the site this
template derives from (a static Astro site that spent two days in nginx/VPS
debugging so you don't have to). That ancestor's 66 recorded traps shaped
everything here; the ones that are platform-specific to nginx are gone as
mechanisms but kept as lessons where they transfer.

**Three documents, three jobs.** `CHECKLIST.md` — every decision already baked
in, and why. This file — the order of work and the operating knowledge.
`AGENTS.md` — the standing rules for anyone editing the repo.

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
  GitHub Actions ── collection-route check · astro check · build ·
      │             lastmod check · invariants (h1, tables, titles,
      │             broken links, CTA measurement) · contrast sweep
      ▼  (only if green, only on main)
  wrangler deploy ── dist/ → Cloudflare asset store (free, unlimited)
      │              worker/index.ts → the metered edge routes
      ▼
  Cloudflare zone ── TLS, HSTS, www→apex, WAF rate limit, edge cache
      │
      ▼
  Browser
```

There is no server. Static assets serve unmetered from Cloudflare's store;
exactly five behaviours run in a ~150-line worker (forms proxy, sheet data,
`/hi` rewrites, markdown-twin negotiation, optional analytics proxy); Google
Apps Script handles form storage + email off the critical path.

## 2. Build-time architecture

Everything published derives from one source; generate → commit → never
hand-edit the output:

| Output | Derived from | Script | When |
|---|---|---|---|
| `src/data/sheets/*.json` | published Google Sheet tabs | `scripts/fetch-sheets.mjs` | pre-build |
| `llms.txt`, `llms-full.txt` | site config + content collections | `scripts/generate-llms.mjs` | pre-build |
| `.md` twin per content page | the same MDX the page renders | `scripts/markdown-twins.mjs` | post-build |
| `dist/pagefind/` search index | the built `[data-pagefind-body]` HTML | `pagefind --site dist` (`npm run search:index`) | post-build, every build |
| sitemap `<lastmod>` | git commit dates (committed map) | `scripts/lastmod.mjs` | on content change; CI verifies |
| favicons (ico + PNGs + apple) | `public/favicon.svg` | `marketing/favicon.mjs` | on brand change |
| OG cards (per page + default) | titles read from **built HTML** | `marketing/og/render-pages.mjs` | on title/page change |

⚠ Anything that checks for a generated file at build time needs **two
builds**: one to emit what the generator reads, one to pick up the result.
OG cards land on the build after they're generated.

**Scheduled posts**: give a blog post a future `published` date and it stays
off every surface (pages, sitemap, RSS, llms.txt, twins, lastmod — one filter,
`src/data/publishing.mjs`) until a build runs on or after that date. A static
site has no runtime clock: the post appears on the FIRST BUILD after the
instant passes, so schedule a rebuild for launch-time posts (a
`workflow_dispatch` run of CI, or a per-site cron trigger on the deploy
workflow). Date-only YAML (`published: 2026-09-01`) means midnight UTC.

## 3. Serve-time architecture (Workers static assets)

- `astro build.format: 'file'` + `wrangler html_handling:
  "drop-trailing-slash"` → `/about.html` served at `/about`, `/about/` 301s.
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

## 5. Measurement

- Umami (cookieless, no banner) by default; GA4 opt-in behind the consent
  banner that owns its tag. See README § Analytics and CHECKLIST §5.
- ⚠ Conversions leave the page (outbound, `tel:`, `mailto:`, form POST) — no
  pageview fires. Every CTA carries `data-umami-event` +
  `data-umami-event-place`; CI enforces; the thanks page turns form
  submissions into pageviews.
- ⚠ Proxying analytics same-origin requires BOTH hops (script + collector) —
  the script derives its endpoint from its own src. One hop = zero data.
- Attribution is last-touch and that is a hard limit, not a shortcut —
  first-touch needs storage, and storage is banned. `/hi/<code>` covers
  outbound campaigns cookielessly.
- Before organic traffic exists, the metric that matters is **AI citations**:
  keep a list of target queries, periodically run each in ChatGPT,
  Perplexity and Google AI Overviews, and log who got cited. Rankings and
  pageviews say nothing yet; citations move weeks before the traffic
  reports do.

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
      `indexnow.yml` submits automatically after each green deploy. Google
      does not participate — the sitemap covers Google.
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

**Routing**
- [ ] `curl -sI https://DOMAIN/ | head -1` → 200
- [ ] `curl -sI https://www.DOMAIN/` → 301 to apex ⚠
- [ ] `curl -sI http://DOMAIN/` → https, same host
- [ ] `curl -sIL https://DOMAIN/ | grep -c '^HTTP'` → redirects resolve in one hop
- [ ] `curl -sI https://DOMAIN/about/` → redirect to `/about` (trailing
      slash; the platform emits 307 here — see CHECKLIST §2 for why that is
      accepted)
- [ ] `curl -sI https://DOMAIN/definitely-not-a-page | head -1` → 404

**Headers — on a page AND on a fingerprinted asset** ⚠ (the pairing catches
header-scoping bugs)
- [ ] Security set present on both; `Cache-Control` 300 on pages,
      `immutable` on `/_astro/*`
- [ ] Exactly one HSTS header
- [ ] `curl -sI -H 'Accept: text/markdown' https://DOMAIN/blog/<slug>` →
      `content-type: text/markdown`, `vary: Accept`; without the header → HTML
- [ ] `curl -sI https://DOMAIN/hi/test` → 200, `x-robots-tag: noindex`

**Assets & metadata**
- [ ] `/favicon.ico` 200 ⚠ (crawlers probe it regardless of HTML) ·
      `/apple-touch-icon.png` 200 and opaque
- [ ] `/robots.txt`, `/llms.txt`, `/llms-full.txt`, `/rss.xml`,
      `/.well-known/security.txt`, IndexNow key file — all 200
- [ ] `/pagefind/pagefind-entry.json` → 200 with a sane `page_count`;
      `/search?q=<a real term>` returns results in a browser; `/search`
      absent from the sitemap
- [ ] Sitemap: URL count sane; noindex pages absent; every URL has a
      `lastmod` and they are not all identical ⚠
- [ ] Canonicals match served URLs (no `.html`, no trailing slash)
- [ ] JSON-LD validates (Rich Results Test); paste a URL into a social
      composer and see the OG card render

**Behaviour**
- [ ] Submit the real form → row in Sheet + email arrives ⚠ (the redirect
      proves nothing — every failure path also redirects)
- [ ] Honeypot-filled submission lands in `Filtered`, emails no one
- [ ] Analytics records a pageview ⚠ (a tag in the HTML proves nothing) and
      each tracked CTA fires with its `place`
- [ ] `LiveData` values update after a Sheet edit (≤5 min)
- [ ] Site renders and form submits with JavaScript disabled
- [ ] No horizontal scroll at 320px; consent banner (if armed) doesn't cover
      the hero CTA at 375×667 ⚠
- [ ] Lighthouse in a clean profile ⚠ (extensions appear in traces and get
      blamed on your site); read observed metrics, not the simulated
      headline; check what the LCP element actually IS before optimising it

## 9. Inherited trap archive (the short version)

Platform traps this architecture *eliminated* (kept here so nobody
re-introduces the vulnerable pattern): nginx `add_header` non-merge ·
`location` matching request-vs-resolved URI · `try_files`/`$uri` split ·
`absolute_redirect` http behind TLS proxies · envsubst eating `$vars` ·
literal-hostname `proxy_pass` taking the site down with a DNS outage ·
`mirror`-and-loopback contraptions · Docker layer/`.git` exclusion killing
lastmod.

Traps that still apply in full — each encoded in code or CI here, details in
`CHECKLIST.md`: measured contrast (2.8:1 brand colours look fine) ·
autofilled honeypots · Apps Script versioning/scopes/quota ·
`Vary: Accept` on negotiated content · noindex⇔sitemap agreement ·
git-dates-not-build-dates · SVG-only favicons → grey globe in SERPs ·
transparent apple-touch-icons → black squares · two HSTS emitters ·
self-written review markup → manual action · collections without routes ·
hidden-link cloaking · deploy races on indexing pings · `fetch-depth: 0`.

## 10. Process lessons

Not about this codebase — about not wasting a day. Each cost the ancestor
project exactly that:

- **Read the whole command output.** A piped `| tail -2` showed the check
  passing while the build it gated never ran — and the next check read a
  stale `dist/` and passed too.
- **Verify the failure path, not just the happy path.** Two form designs
  both redirected perfectly; only a logging stand-in revealed that one of
  them delivered nothing.
- **Test against a committed state, not the working tree.** A negative test
  passed because the generator had regenerated the file before the diff ran.
- **Squash merges make branches look permanently unmerged.** The original
  commits never become ancestors of main, so "N commits ahead" persists
  forever with zero content difference — compare trees, not commit counts.
  Corollaries: never stack branches on a squash-merging repo (the same
  content arriving from two ancestries is a guaranteed conflict; branch off
  main every time), and after a squash neither `git diff main branch` nor
  `git diff main...branch` answers "is this merged" — compare the branch
  tree against the main commit it merged into.
