# CHECKLIST — every architectural decision already baked into this template

Every decision this template makes for you, obvious or not, each with its
reason. If a setting is not on this list, it was not decided — treat it as an
open question, decide it, and add it here. **A setting nobody wrote down is
indistinguishable from a setting nobody made.**

Sibling documents: `SETUP.md` is the ordered walkthrough for turning this into
a real site (start there). `README.md` is the quickstart. `PLAYBOOK.md` is how
to build/operate it phase by phase, and the traps. `AGENTS.md` is the standing
rules for anyone (human or agent) editing a site built from this.

Legend: ✅ decided & implemented here · 🔧 decided, needs your per-site value ·
⬜ deliberately NOT decided (per-site choice, notes given).

---

## 1. Rendering & framework

- ✅ **Astro, `output: 'static'`.** No server runtime anywhere. Everything
  dynamic is build-time, edge (one small worker), or a third party behind a
  proxy. This is what makes the site cheap, fast, and hard to break at 3am.
- ✅ **Content is files in git (MDX content collections), not a CMS.** Zod
  schemas make content rules enforceable rather than aspirational; an agent or
  colleague writes a file and opens a PR — review, diff, rollback for free.
- ✅ **`trailingSlash: 'never'` + `build.format: 'file'`** → URLs like
  `/about`, files like `about.html`. Must stay in agreement with
  `wrangler.jsonc → html_handling: "drop-trailing-slash"`. Changing one
  without the other breaks every route. (Migrating a site that needs
  `/about/` URLs? Change both, together.)
- ✅ **`inlineStylesheets: 'always'`.** No render-blocking stylesheet request;
  costs ~5kB gzipped per page, buys a full round trip. Revisit past ~15kB
  gzipped of CSS or if analytics show deep multi-page sessions.
- ✅ **Markdown tables auto-wrapped in `.table-scroll`** by a rehype plugin in
  `astro.config.mjs` — a bare table scrolls the whole page sideways on a
  phone. The wrapper is a keyboard-scrollable labelled region (`tabindex="0"
  role="region" aria-label`) — a scroll box only a pointer can move locks
  keyboard users out (WCAG 2.1.1). Hand-authored wrappers in `.astro` files
  carry the same trio with a SPECIFIC label. CI enforces both on built HTML.
- ✅ **TypeScript strict + `noUncheckedIndexedAccess` + unused-checks**
  (`tsconfig.json`). `zod` imported directly, not via `astro:content`
  (deprecated re-export).
- ✅ **Almost no client JavaScript.** The only scripts any page may ship:
  (a) the contact form's additive attribution snippet, (b) `LiveData.astro`'s
  silent sheet refresh — both `is:inline`, both try/catch'd so failure leaves
  a working page — plus the analytics tag itself. Everything else is HTML/CSS.
- ✅ **`/search` is the one page-level JS exception** (documented, bounded):
  Pagefind static search on a single opt-in route. Zero bytes load until the
  visitor interacts with the input (idempotent dynamic-import singleton);
  results are client-rendered with `?q=` synced via `replaceState`
  (linkable, back-button-safe); `debouncedSearch` supplies the debounce +
  race guard; JS-off gets a notice plus the blog/glossary indexes. The page
  is noindex AND out of the sitemap. Only `[data-pagefind-body]` articles
  are indexed; chrome (breadcrumbs, TOC, related, pager, CTA) carries
  `data-pagefind-ignore` so results don't surface neighbours' titles.
- ✅ **`is:inline` on intentionally-inline scripts** — otherwise Astro bundles
  them into a `<script src>` and puts a network request on the critical path.

## 2. Hosting & edge (Cloudflare Workers, static assets)

- ✅ **Cloudflare Workers with static assets, not Pages, not a VPS, not
  Firebase.** Static requests: free and unlimited (no bandwidth cap). Worker
  invocations: 100k/day free. Firebase Spark caps at 10GB/month transfer; a
  VPS costs rent and ops. DNS on Cloudflare makes this one dashboard.
- ✅ **`run_worker_first` lists ONLY the routes that need the worker**
  (`/api/*`, `/hi*`, content-collection routes, `/s.js`). Everything else is
  served unmetered from the asset store. This is the free-tier lever — do not
  add routes casually.
- ✅ **One worker (`worker/index.ts`) does all edge logic**: form proxy, sheet
  data proxy, `/hi` rewrites, markdown-twin negotiation, optional analytics
  proxy. ~150 lines replacing the ancestor's ~510-line nginx.conf.
- ✅ **`html_handling: "drop-trailing-slash"`** — serves `/page.html` at
  `/page` and redirects `/page/` and `/page.html` → `/page`. Trailing-slash
  404s only ever bite links arriving from OUTSIDE, which is where backlinks
  come from. ⚠ Known platform behaviour, measured: these normalisation
  redirects are **307**, not 301, and that is not configurable. Acceptable
  because every page's canonical tag and the sitemap carry the permanence
  signal; forcing 301s would mean routing ALL traffic through the worker,
  which kills the free-tier economics. Redirects you author yourself
  (`_redirects`, zone rules) should still be 301.
- ✅ **`not_found_handling: "404-page"`** — the styled `404.html` serves with
  a real 404 status.
- ✅ **Headers via `public/_headers`** (rules MERGE — the nginx
  "one `add_header` wipes the inherited set" trap class cannot happen).
  Security set: `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy` (camera/mic/geo/
  payment/usb off, plus `browsing-topics`/`interest-cohort`/`unload` — the
  ad-API opt-outs match the cookieless stance; `unload=()` protects bfcache).
- ✅ **Content-Security-Policy, generated from the built site — never
  hand-listed** (`scripts/generate-csp.mjs`, runs inside `npm run build`).
  `script-src` = `'self'` + a sha256 hash per shipped inline script +
  `'wasm-unsafe-eval'` (Pagefind's index is WebAssembly) + the Google origins
  only when the consent banner actually shipped. Two emitters in lockstep:
  the generator swaps the `# @generated-csp` marker in `dist/_headers`, and
  the worker imports the COMMITTED `worker/csp.generated.json` (CI diffs it —
  a changed inline script fails until the new hashes are committed).
  Decided trade-offs: `style-src` keeps `'unsafe-inline'`
  (`inlineStylesheets: 'always'` puts a per-page `<style>` on every page;
  hashing would mean per-page policies for a vector that needs HTML injection
  first); inline event handlers are BANNED — the generator fails the build if
  one appears, because hashes cannot allow them; `frame-ancestors 'self'`
  mirrors `X-Frame-Options: SAMEORIGIN` — change them together.
- ✅ **HSTS has exactly ONE emitter: the Cloudflare zone setting.** It is
  deliberately absent from `_headers` — a browser honours only the FIRST
  Strict-Transport-Security header (RFC 6797). Verify with
  `curl -sI https://DOMAIN/ | grep -ci strict-transport` → `1`.
- ✅ **Cache-Control by file class**: pages 5 min + must-revalidate;
  `/_astro/*` (fingerprinted) 1 year + immutable; favicons/OG cards 7 days
  (stable URLs must never be immutable — a regenerated favicon has to land).
- ✅ **Deploy from GitHub Actions, gated on CI** (`needs: build`), not
  Cloudflare's git-connected builds — those deploy on push in parallel with
  CI, so a commit that fails an invariant would ship anyway.
- 🔧 **Zone dashboard settings** (no diff, no history — recorded in
  PLAYBOOK §6): Full (Strict) SSL, Always Use HTTPS, zone HSTS ON,
  www→apex Redirect Rule, Email Obfuscation OFF, Rocket Loader OFF.
- ⬜ **Custom domain attach + www handling** — per site, PLAYBOOK §6.

## 3. Data

- ✅ **Every published number lives in `src/data/facts.json` with a `source`
  field** — never typed into markup. A figure on four pages exists once.
  Unverified values carry `verified: false` so they are findable.
- ✅ **Google Sheets is the non-dev data channel, two-stage**:
  build-time snapshot (`scripts/fetch-sheets.mjs` → `src/data/sheets/*.json`,
  committed, diffable, offline-safe) + client-side silent refresh
  (`LiveData.astro` → worker `/api/data/<tab>`, edge-cached 5 min). Static
  page is never blank; JS-off is never wrong; live data is ≤5 min stale.
- ✅ **Two-tab Sheet privacy pattern is the rule**: a private `master` tab
  (all fields, never published) and a published `public` tab that QUERYs
  approved rows and public columns only. The site physically cannot leak
  contact fields because it can never see them.
- ✅ **`privacy.json` drives the privacy page AND its indexability**: while
  `status.draft` is true the page is `noindex` and out of the sitemap — one
  flag, both surfaces, they can never disagree. `TODO` strings render visibly
  as `[TO CONFIRM: …]`.
- ✅ **Site config in one file** (`src/data/site.ts`), domain in
  `src/data/origin.mjs` (plain ESM so node scripts share it).
- ✅ **One publish filter** (`src/data/publishing.mjs`, plain ESM like
  origin.mjs): `isPublished()` = not draft AND `published` not in the future.
  Consumed by every surface — pages, RSS, for-llms, and (via
  `scripts/lib/readContent.mjs`) llms.txt, twins, and lastmod. This predicate
  was previously copied as `!data.draft` in eight places and missing from
  lastmod entirely; a future-dated post now stays off all seven surfaces
  until a build runs after its date. The sitemap needs no filter of its own —
  it derives from built pages, and an unbuilt page cannot be listed; do not
  add a redundant one.

## 4. Forms & email (Google Apps Script)

- ✅ **Plain `<form method="post">` to same-origin `/api/contact`. No fetch,
  no spinner.** Works with JS off; a submission cannot vanish into a failed
  request; the thank-you redirect is a free analytics conversion.
- ✅ **The worker proxies to Apps Script and ALWAYS answers 303 →
  `/contact/thanks`** — the visitor never sees Google's page, and the
  write-capable Apps Script URL never appears in page source.
- ✅ **Client context rides the query string** (`_ip`, `_cc`, `_dev`) because
  Apps Script cannot read request headers. Fixed tokens only — never the raw
  User-Agent (most upstreams can't be trusted with unescaped values).
- ✅ **`CONTACT_SCRIPT_ID` is a Wrangler secret with empty-default
  behaviour**: unset breaks the feature, never the site.
- ✅ **Apps Script (`marketing/apps-script/contact-form.gs`)**: email is the
  durable record (sheet + email written independently); visitor always sees
  success; every branch logged; rejects stored in a `Filtered` tab, not
  discarded (AI agents fill honeypots now); colleagues on **Bcc** (Reply-All
  cannot leak them); `replyTo` = the enquirer; `selfTest()` catches nothing
  on purpose (surfaces missing OAuth scopes); `e.parameters` (plural) detects
  spoofed proxy params.
- ✅ **Honeypot named `hp`**, positioned off-screen (not `display:none`),
  `aria-hidden` + `tabindex="-1"` + `autocomplete="off"`. Names like
  `website` are autofill bait that silently rejects real people.
- ✅ **No "submitted too fast" timestamp check** — on a static page any
  rendered timestamp is the BUILD time, so it rejects everyone or no one.
- ✅ **Marketing opt-in is a separate, unticked checkbox** (pre-ticked is not
  consent under GDPR/PDPA/DPDP).
- 🔧 **Deploying the script**: run `selfTest()` in the editor first (triggers
  the OAuth prompts — without it the script "Completes" and writes nothing),
  then Deploy → New deployment; every EDIT needs a new VERSION published.
- ✅ **`/pagefind/*` serves from the free asset path — NOT the worker.**
  `/search` matches no `run_worker_first` glob and is not a twin route;
  don't "helpfully" add either to wrangler.jsonc. Cache tiers in
  `public/_headers`: hashed index/fragment chunks immutable, the stable-URL
  loader + `pagefind-entry.json` (the version manifest naming the chunks)
  stay on the 5-minute page rule.
- ✅ **Rate limiting**: 10 req/min/IP on `/api/contact`, enforced in the
  worker via the `ratelimits` binding in `wrangler.jsonc` (429 +
  `Retry-After`) — the same budget the ancestor's nginx enforced. A WAF
  rate-limiting rule on top (dashboard; free plan includes one rule) is
  optional belt-and-braces.

## 5. Analytics, consent & measurement

- ✅ **Cookieless-by-default: Umami, no consent banner.** Umami sets no
  cookies and stores nothing on the device, so no banner is required — a real
  property worth protecting. Proxied same-origin (`/s.js` + `/api/send`,
  BOTH hops — the tracker derives its endpoint from its own src) so blockers
  can't drop it.
- ✅ **GA4 is supported but consent-gated.** Setting a `measurementId` arms
  `ConsentBanner.astro`, which OWNS the gtag snippet and injects it only on
  Accept. The layout never emits the tag — otherwise the banner is
  decoration. Reject actively clears the `_ga*` cookies.
- ✅ **Every CTA is measured, vendor-neutrally — and CI enforces it.** All
  CTAs / `tel:` / `mailto:` links carry `data-umami-event` +
  `data-umami-event-place` (which SURFACE converted, not just a total).
  Umami binds these natively; with GA4 consent, a small forwarder relays the
  same attributes to `gtag()`. An unmeasured CTA fails CI: conversions leave
  the page, so no pageview ever records them.
- ✅ **Form conversions are pageviews of `/contact/thanks`** — part of why
  the form redirects instead of swapping in a success message.
- ✅ **Attribution is last-touch and honest about it**: `document.referrer` +
  UTM/`ref` params + `/hi/<code>` path, captured by an additive inline
  script. First-touch would need storage; **localStorage/sessionStorage are
  banned repo-wide** and a cookie would need consent.
- ✅ **`/hi/<recipient>` instead of `?utm_source=` on outbound links**: an
  internal rewrite (URL stays in the bar), its own pageview in analytics —
  open-to-click attribution with zero cookies. Header-level
  `X-Robots-Tag: noindex` so per-recipient URLs never hit search.
- ✅ **Analytics disabled outside production builds** — local work files no
  page views.
- ✅ **Consent decision stored in a cookie** (`site_consent`, 180 days,
  SameSite=Lax, Secure) — never web storage. Re-openable from a footer LINK
  (`data-consent-reopen`, a link so it degrades with JS off), which renders
  only when a gated vendor is actually configured.

## 6. SEO (classic)

- ✅ **Canonical, full OG set (+ `og:image` 1200×630 with declared
  dimensions and `og:image:alt`), Twitter card, JSON-LD — all from
  `BaseLayout`,** so no page can forget them. Canonical strips `.html` (never
  canonicalise to a URL the server doesn't hand out). `og:image:alt` /
  `twitter:image:alt` default to the title — accurate because generated cards
  RENDER the title; a page passing a custom `ogImage` should pass
  `ogImageAlt` too. Article pages also emit
  `article:published_time`/`article:modified_time` (modified only when
  `updated` is actually later than `published`), and every page carries
  `<link rel="sitemap">` — a free discovery hint.
- ✅ **`max-image-preview:large` robots meta on every indexable page** —
  Google's stated requirement for large image previews in Discover and
  result cards; without it images fall back to thumbnails. Noindex pages
  keep their plain `noindex, nofollow` directive instead (one meta, never
  both).
- ✅ **`WebSite` schema carries a `SearchAction`** pointing at
  `/search?q={search_term_string}` — honest by construction, because
  `/search` really does answer `?q=` (Pagefind syncs the param). This is the
  sitelinks-search-box eligibility signal; never emit it on a site whose
  search page is removed.
- ✅ **OG cards are skipped for pages that declare their own `ogImage`**
  (`render-pages.mjs` reads the built page's `og:image` meta) — an explicit
  image always wins in BaseLayout precedence, so a generated card for such a
  page is dead weight that could never be referenced.
- ✅ **`<title>` clamped to 60 chars** (`clampTitle`: drops ` — clause`, then
  ` | clause`, then cuts at a word boundary; never appends "…" — Google adds
  its own). `og:title` keeps the full string. CI checks built titles.
- ✅ **JSON-LD `@graph`**: `Organization` (`#organization`) + `Person`
  (`#founder`, real profile `sameAs`) site-wide; `BreadcrumbList`, `FAQPage`,
  `BlogPosting` (author by `@id`, `dateModified`) per page type. **Emit a
  field only when the thing exists** — an `image` pointing at a missing file
  is worse than no `image`. Escaped `</script>` (`<`) in the emitter.
- ✅ **Structured data has visible counterparts, single-sourced.**
  `BreadcrumbList` is mirrored by a visible `<Breadcrumbs />` trail on detail
  pages (CI asserts count+order agree; Google's rich-result guidance expects
  markup to reflect on-page navigation — index pages emit neither, on
  purpose). `FAQPage` and the on-page `<Faq />` accordion render from the ONE
  `faq` frontmatter array via `src/lib/faqSchema.ts` — the schema cannot
  claim a question the page doesn't show. Honest expectation: since 2023
  Google shows FAQ rich results only for well-known government and health
  sites, so for most sites this markup earns no SERP treatment — its value
  here is AEO (extractable Q&A pairs for answer engines) and the
  single-source consistency, which is why it stays. `HowTo` markup is fully
  deprecated; don't add it expecting rich results.
- ✅ **Opt-in TOC** (`toc: true` frontmatter, guideline 4+ h2s): plain
  crawlable anchors from Astro's extracted headings
  (`src/lib/toc.ts` + `<Toc />`), no scrollspy, no JS — the value is the
  anchor list (jump-links in SERPs, section-level citability). NOT injected
  into markdown twins: twins are the source markdown and already carry the
  heading structure.
- ✅ **Sitemap `<lastmod>` from git commit dates via a committed map**
  (`src/data/lastmod.json`), never the build clock — "everything changed
  every deploy" is the signal crawlers learn to discard. Routes discovered by
  walking `src/pages` (a hand list goes stale silently). CI regenerates with
  full history and diffs, plus a COVERAGE check against the built sitemap
  (a route missing from both map and sitemap agrees with itself).
- ✅ **noindex ⇔ out of sitemap, always both** (thanks page, draft privacy
  page). Listing a URL you told crawlers to ignore asks them to fetch it.
- ✅ **Favicon pipeline** (`marketing/favicon.mjs`): one `favicon.svg` →
  real `.ico` (16/32/48) + 48/96 PNGs + `apple-touch-icon` **flattened onto a
  solid colour** (iOS composites transparency onto black; Google's crawler
  wants a raster and probes `/favicon.ico` regardless of your HTML).
  Icon `<link>` order in BaseLayout is load-bearing (ico first).
- ✅ **OG cards generated per page from BUILT HTML titles**
  (`marketing/og/render-pages.mjs`) — a card cannot claim what the page
  doesn't say. JPEG not PNG (~5× smaller in-repo). Missing card degrades to
  `/og/default.png`, never a 404 (`ogCard.ts` checks disk).
- ✅ **RSS** at `/rss.xml`: atom self-link, description from `tldr`,
  `lastBuildDate` from the newest post (not the build clock).
- ✅ **robots.txt open, sitemap referenced** — generated at build
  (`src/pages/robots.txt.ts`) so the Sitemap URL derives from `origin.mjs`
  like every other absolute URL; a domain change needs no manual edit.
- ✅ **One `<h1>` per page (CI-enforced); MDX bodies start at `##`.**
- ✅ **System font stack, no web fonts.** Zero requests, zero font-swap
  layout shift, nothing to self-host or get consent for.
- ✅ **Playwright and sharp are NOT dependencies** — installed in CI/at
  publish time, keeping a 300MB browser out of `npm ci`. **`pagefind` IS a
  devDependency** — the documented exception: it runs on every build (the
  search index must exist wherever dist/ does), it's a ~4MB native binary
  not a browser, and the deploy job's `npm ci` needs it. Policy:
  devDependencies are acceptable; the live site ships no new runtime
  dependency without a CHECKLIST entry.
- ⬜ **Structured-data types beyond the defaults** (Product/Offer, Service,
  LocalBusiness…) — per site. Pattern to follow: one shared node module so
  two pages can never disagree; never add `review`/`aggregateRating` you
  wrote about yourself (self-serving review markup = policy violation, risks
  a manual action to clear an *optional* warning).
- ⬜ **Internationalisation (hreflang, locale routes)** — deliberately out of
  scope: this template is single-locale by design (`SITE.locale` feeds
  `<html lang>` and `og:locale`, nothing else). Going multilingual is a
  structural change, not a setting: locale-prefixed routes, a complete
  reciprocal hreflang matrix with `x-default` (one-directional links are
  ignored), self-canonical per locale (never canonicalise locales to one
  URL), and one hreflang method only. If you need it, design it as its own
  phase — a partial matrix is worse than none.

## 7. AEO / GEO (answer engines)

- ✅ **`llms.txt` + `llms-full.txt` generated from the same sources pages
  render from** (`scripts/generate-llms.mjs`, pre-build) — never
  hand-written, so they cannot drift from the site.
- ✅ **`/for-llms`, a real linked page** whose counts come from
  `getCollection().length`, never typed.
- ✅ **Markdown twins**: a `.md` file beside every content page's `.html`
  (`scripts/markdown-twins.mjs`, post-build), served at the SAME pretty URL
  when `Accept: text/markdown` — with `Vary: Accept` so caches keep the
  bodies apart. Clean markdown for agents, zero extra URLs.
- ✅ **RFC 8288 `Link` headers** pointing every response at `llms.txt` /
  `llms-full.txt` (`rel="describedby"`) and `/for-llms`
  (`rel="service-doc"`) — set in `public/_headers` for assets and mirrored
  in `worker/index.ts` for worker responses (the platform never applies
  `_headers` to those).
- ✅ **Related links by construction** (`src/lib/related.ts` + CI orphan
  check): every detail page links ≥1 topical neighbour — curated `related`
  frontmatter seeds rank first, a deterministic build-time scorer (topic +
  title-token Jaccard via `Intl.Segmenter`, recency decay, small
  same-collection bonus) fills the rest across BOTH collections. Blog posts
  additionally chain chronologically (prev/next with `rel` attrs; blog only —
  glossary has no chronology). Neither block appears in markdown twins
  (chrome, not article content) and both carry `data-pagefind-ignore`.
- ✅ **AI crawlers named explicitly in robots.txt** (GPTBot, OAI-SearchBot,
  ChatGPT-User, ClaudeBot, Claude-User, Claude-SearchBot, PerplexityBot,
  Perplexity-User, Google-Extended, Applebot, Applebot-Extended, CCBot,
  meta-externalagent, Bytespider). The wildcard already permits them —
  naming them documents intent so nobody "tightens" the file blind, and new
  vendor bots get noticed. Know what each governs before blocking
  (Google-Extended = AI answers, NOT search ranking).
- ✅ **Schemas encode the evidence-backed GEO levers** (Aggarwal et al., KDD
  2024 — citations, quotes, statistics help; keyword stuffing hurts):
  required `tldr` (the front-loaded answer), required `sources` (min 1 on
  programmatic pages), glossary `shortDefinition` 40–300 chars ("the 40-word
  answer an LLM will lift"), blog `proprietary` field naming what an LLM
  could not have produced.
- ✅ **Named human author with a real linkable profile on every post**
  (schema-enforced `sameAs`). Non-negotiable.
- ✅ **Bing Webmaster verification slot** — Bing's index feeds Copilot,
  DuckDuckGo and ChatGPT search. Two distribution channels, not one.
- ✅ **IndexNow**: key file + script that submits only LIVE sitemap URLs
  (never the local build — can't ping a 404), race-guarded by
  `--min-urls`, auto-run after deploy. Google doesn't participate; the
  sitemap covers Google.

## 8. Accessibility & CSS

- ✅ **Mobile-first, hard rule**: the unprefixed rule is the phone rule;
  `min-width` queries add tablet/desktop. Touch targets ≥44px. No horizontal
  body scroll at any width (wide tables scroll in `.table-scroll`).
- ✅ **Design tokens in one place (`global.css`), colour is measured, not
  eyeballed**: every token that carries or sits behind text clears WCAG AA on
  every band background, and CI sweeps every text node of every built page
  (composites translucent ancestors — Lighthouse samples, this walks).
  The ancestor's hand-picked brand colour measured 2.8:1 across 66 pairs
  including its own primary CTA; an eye is not the instrument.
- ✅ **Ink ramp compressed at the light end** — AA has a floor; the lightest
  grey must clear 4.5:1 on the darkest band. Don't reintroduce a lighter step.
- ✅ **Skip link + `<main id="main">`**; `.sr-only` utility; `:focus-visible`
  outline works on every band; `prefers-reduced-motion` clamps all
  animation/transitions and smooth-scroll.
- ✅ **Source-level a11y lint**: `eslint-plugin-astro` `flat/jsx-a11y-strict`
  (`eslint.config.js`, `npm run lint`, CI step) — catches malformed ARIA in
  templates, which the built-HTML checks structurally cannot. devDependency
  only. Policy: dev-time dependencies are acceptable; the LIVE SITE ships no
  new dependency without a CHECKLIST entry.
- ✅ **Motion is opt-in via media query** (AGENTS rule 14): disclosure/entry
  animation uses `@starting-style` / `allow-discrete` / `interpolate-size` /
  `::details-content`, always inside `prefers-reduced-motion:
  no-preference` — reduced motion is the absence of rules, and no motion
  requires JS.
- ✅ **Anchor targets clear the sticky header**: `:target
  { scroll-margin-block-start: 5rem }`, plus `scrollbar-gutter: stable` (with
  `overflow-y: scroll` fallback) so short↔tall page navigation never shifts
  layout sideways.
- ✅ **Inputs at `font-size: 1rem`** — anything smaller makes iOS zoom on
  focus.
- ✅ **No Tailwind, on purpose**: arbitrary utility colours would make "no
  unmeasured colour" unenforceable. The token set + contrast sweep IS the
  design system.
- ⬜ **Dark mode** — not included: it doubles the contrast-audit matrix and
  marketing sites rarely need it. Adding it means re-measuring every token
  pair in both schemes.

## 9. CI invariants (every one exists because it broke somewhere)

`.github/workflows/ci.yml`, in order:

- ✅ Checkout with `fetch-depth: 0` (lastmod derives from `git log`; depth 1
  = every route dated HEAD).
- ✅ **Source-level a11y lint** (`eslint jsx-a11y-strict`) — malformed ARIA
  never reaches the build.
- ✅ **Every content collection has a route** (a collection with entries and
  no route renders nowhere, silently, forever).
- ✅ **Content image refs resolve to real files**
  (`scripts/check-content-images.mjs`) — a frontmatter `ogImage` string or
  markdown image is not an import; a typo ships a 404 OG card silently.
- ✅ `npm run build` = types + zod schemas + render + search index + CSP
  generation in one step.
- ✅ **Committed worker CSP is current** (`git diff` on
  `worker/csp.generated.json` after the build) — a changed inline script
  changes the hashes, and the worker must never serve a different policy
  than the asset layer.
- ✅ Committed lastmod map is current + covers the whole sitemap.
- ✅ One `<h1>` per page · every `<table>` wrapped · `<title>` ≤ 60 chars.
- ✅ **Page titles unique · meta descriptions present, unique, 70–165 chars**
  (bounds on indexable pages only — noindex pages never render a snippet).
  Two pages sharing a title compete for the same query; Google rewrites
  vague descriptions and truncates past ~165.
- ✅ **`dist/_headers` carries the generated CSP** — if the
  `# @generated-csp` marker survives the build, the generator was dropped
  from the pipeline and the site would ship with no CSP, silently.
- ✅ **Built HTML validates** (`html-validate`, recommended preset):
  duplicate ids, invalid nesting, malformed attributes — the classes
  browsers silently repair and crawlers silently don't. One configured
  exclusion: `role="region"` divs, which is the deliberate `.table-scroll`
  pattern (its semantics have their own invariant).
- ✅ **axe-core scan of every built page** (`scripts/check-a11y.mjs`), fails
  on serious/critical: broken ARIA references, accessible-name computation,
  landmark structure — the engine classes the structural greps can't see.
  axe's colour-contrast rule is disabled there because the dedicated sweep
  measures composited backgrounds properly; one defect, one verdict.
- ✅ **No broken internal links** in built HTML (worker-only routes
  whitelisted — the whitelist doubles as the inventory of off-repo routes).
- ✅ **Every CTA carries `data-umami-event`** (unmeasured conversions are
  invisible forever).
- ✅ **Every `<img>` has an `alt` attribute** — empty is a decision
  (decorative), missing is the forgotten case AT reads as a filename.
- ✅ **`target="_blank"` ⇒ `rel` noopener + "new tab" in the accessible
  name** (AGENTS rule 15 mechanized).
- ✅ **No noindex page in the sitemap** — the iron rule, previously enforced
  only by convention.
- ✅ **Pagefind index covers exactly the `data-pagefind-body` pages** — a
  broken postbuild step would otherwise ship a stale or empty search index
  with a green build.
- ✅ **No orphan content pages**: every detail page carries ≥1 related link
  (once its collection has ≥2 entries) — internal linking by construction,
  checked.
- ✅ **Visible breadcrumbs mirror BreadcrumbList JSON-LD** (count + order,
  entity-decoded) — structured data must reflect the page.
- ✅ **Every `.table-scroll` carries `tabindex="0" role="region"
  aria-label`** — a scroll box only a pointer can move locks keyboard users
  out.
- ✅ WCAG AA contrast sweep of every built page (browser installed in-job),
  with all `<details>` force-opened first — closed FAQ answers are
  display:none and would otherwise never be measured.
- ✅ Invariants run in ONE step with **no `set -e`** (grep exits 1 on
  no-match — the guard would kill the script on exactly the page it exists
  to catch) and collect every failure per run.
- ✅ Deploy job runs only on green main (`needs: build`).
- ✅ **External link rot is checked monthly, never in CI**
  (`.github/workflows/linkrot.yml`, lychee over built HTML, external URLs
  only). Citations rot on someone else's schedule and a flaky third-party
  server must not block a deploy — but a dead `sources` link quietly
  undermines the exact credibility signal the schemas enforce. Fix, archive
  (web.archive.org), or drop; never ignore-list casually.

## 10. Repo conventions

- ✅ `src/assets` = processed/hashed by the image pipeline; `public/` =
  byte-for-byte at stable URLs. Fixed-URL files (favicons, verification
  files, `.well-known/`) MUST be in `public/`. (robots.txt is the one
  exception: a generated route, so its Sitemap URL derives from
  `origin.mjs`.)
- ✅ `scripts/` = what CI runs (no heavyweight deps); `marketing/` = what a
  human runs at publish time (may install a headless browser ad hoc).
- ✅ **Generate, commit the output, never hand-edit the output** (llms.txt,
  favicons, OG cards, lastmod.json, sheet snapshots).
- ✅ Sections shared between routes live in one component and are imported,
  never copied — two pages meant to agree then cannot drift.
- ✅ **Glossary categories are a closed vocabulary** (`src/data/taxonomy.ts`
  → `z.enum`): a typo'd category fails the build instead of shipping a
  one-entry group; the index renders groups in declared (pedagogical) order.
  Adding a category is one line in taxonomy.ts.
- ✅ **Frontmatter scaffolds** in `.vscode/frontmatter.code-snippets`
  (`blog-post`, `glossary-entry`) mirror the zod schemas so contributors
  never meet a schema error blind. Keep in step with content.config.ts.
- ❌ **`astro:env` evaluated 2026-08-12, rejected** — verification tokens and
  analytics IDs are committed-by-design in `site.ts` (see the bullet above);
  nothing client-visible varies per deployment, so a typed env schema would
  create the drift the current design prevents. The only deploy-varying
  value (`UMAMI_UPSTREAM`) is already a wrangler var.
- 🔧 `.well-known/security.txt` (RFC 9116) — so a researcher has somewhere
  better than a public issue. Ships with `example.com` placeholders: set
  `Contact`, `Canonical` (RFC 9116 makes it assert which host the file
  belongs to) and `Expires` (~1 year out) for your domain. Static file,
  nothing generates it.
- ✅ Prettier (+ astro plugin) & `.editorconfig` committed.
- ✅ **Verification tokens and analytics website IDs live in the repo**
  (public by design, next to their config so they can't drift); **API keys
  and script IDs never do** (Wrangler secrets / GH Actions secrets).

## 11. Deliberately rejected (do not quietly reintroduce)

- ❌ **A CMS** — drops the zod enforcement that makes content rules real.
- ❌ **Tailwind / arbitrary hex in components** — breaks measured contrast.
- ❌ **Web fonts** — cost with no measurable win for a marketing site.
- ❌ **localStorage / sessionStorage** — anywhere, for anything.
- ❌ **fetch()-based form submission** — the no-JS POST + 303 is sturdier.
- ❌ **GA4 as the default** — it drags a consent banner into every page for
  data Umami gives you without one.
- ❌ **`?utm_source=` on outbound links you control** — `/hi/<code>` reads
  as a page made for the recipient, not a list entry.
- ❌ **Hidden links to "fix" deliberately-unlinked pages** — crawler-visible,
  user-invisible links are cloaking; Google penalises it.
- ❌ **Self-written review/rating markup** — policy violation; a manual
  action costs more than an uncleaned optional warning.
- ❌ **Pre-ticked consent of any kind.**
