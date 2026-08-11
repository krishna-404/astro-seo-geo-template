/**
 * The one piece of server-side code in the whole architecture.
 *
 * This worker replaces the ~510-line nginx.conf of the site this template
 * derives from. Everything it does exists because static config cannot do it:
 *
 *   1. POST /api/contact  — same-origin form proxy to Google Apps Script.
 *      The browser never sees the Apps Script URL (it is write-capable), the
 *      visitor always gets OUR redirect (never Google's sandbox page), and the
 *      client context Apps Script cannot read (IP, country, device class) is
 *      appended as query params. Lesson inherited from nginx: always
 *      synthesize your own response; never let the visitor see the vendor's.
 *   2. GET /api/data/<tab> — edge-cached proxy to published Google Sheet CSVs,
 *      powering the client-side silent refresh (see LiveData.astro) without
 *      CORS, without exposing sheet URLs, and without hammering Google.
 *   3. /hi and /hi/<code> — cookieless attribution: an internal REWRITE (not a
 *      redirect) to the contact page, so the pretty URL stays in the address
 *      bar and analytics records /hi/<code> as its own pageview. Replaces
 *      ?utm_source= on outbound links: a path segment reads as a page made for
 *      the recipient, not a tracking parameter.
 *   4. Markdown twins — content negotiation on the Accept header for
 *      content-collection routes: a client preferring text/markdown gets the
 *      .md twin that scripts/markdown-twins.mjs wrote next to the .html, same
 *      URL, with Vary: Accept so caches keep the two apart.
 *   5. (optional) /s.js + /api/send — same-origin Umami proxy, so a
 *      domain-level blocker cannot drop analytics. Both hops or neither: the
 *      tracker derives its collector endpoint from its own script src.
 *
 * Everything else falls through to the static asset store, where requests are
 * free and unlimited. Keep it that way: wrangler.jsonc's run_worker_first list
 * is the free-tier lever — do not add routes to it casually.
 */

import sheetsConfig from '../src/data/sheets.config.json';

interface Env {
  ASSETS: { fetch(request: Request | string): Promise<Response> };
  /** Google Apps Script deployment id — a secret (`wrangler secret put CONTACT_SCRIPT_ID`).
   *  Empty/unset = form proxy off; the visitor still gets the thanks page. */
  CONTACT_SCRIPT_ID?: string;
  /** e.g. https://umami.example.com — empty/unset disables the analytics proxy. */
  UMAMI_UPSTREAM?: string;
}

interface Ctx {
  waitUntil(promise: Promise<unknown>): void;
}

const SHEET_TABS: Record<string, { url: string }> = (sheetsConfig as { tabs: Record<string, { url: string }> }).tabs;

/** Same fixed-token device classification the nginx map used. Fixed tokens
 *  because the value travels on a query string and most servers (Apps Script
 *  included) cannot be trusted to handle an unescaped raw User-Agent. Never
 *  pass the raw UA. */
function deviceClass(ua: string): 'bot' | 'mobile' | 'tablet' | 'desktop' {
  if (/bot|crawler|spider|curl|wget|python|httpx|scrapy/i.test(ua)) return 'bot';
  if (/ipad|tablet|kindle|silk/i.test(ua)) return 'tablet';
  if (/mobi|android|iphone/i.test(ua)) return 'mobile';
  return 'desktop';
}

/** /hi or /hi/<code>: 1–40 chars, letters/digits/hyphen, no leading hyphen. */
const HI_RE = /^\/hi(?:\/[A-Za-z0-9][A-Za-z0-9-]{0,39})?$/;

/** Routes that have .md twins on disk (the content collections — must match
 *  scripts/markdown-twins.mjs COLLECTIONS and wrangler.jsonc run_worker_first). */
const TWIN_PREFIXES = ['/blog/', '/glossary/'];

export default {
  async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // ── 1. Contact form → Apps Script ────────────────────────────────────
    if (pathname === '/api/contact') {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
      }
      const scriptId = env.CONTACT_SCRIPT_ID ?? '';
      // Read the body BEFORE returning: a fire-and-forget upstream call still
      // needs the bytes, and after the redirect is sent the request body may
      // no longer be readable. (The nginx ancestor of this code silently lost
      // every submission by redirecting without reading the body — trap 17.)
      const body = await request.arrayBuffer();
      if (scriptId) {
        const cf = (request as Request & { cf?: { country?: string } }).cf;
        const upstream = new URL(`https://script.google.com/macros/s/${scriptId}/exec`);
        // Context Apps Script cannot read from headers — pass on the URL.
        // e.parameters (plural) on the Apps Script side detects tampering:
        // a duplicated key means the submitter appended their own value.
        upstream.searchParams.set('_ip', request.headers.get('cf-connecting-ip') ?? '');
        upstream.searchParams.set('_cc', cf?.country ?? '');
        upstream.searchParams.set('_dev', deviceClass(request.headers.get('user-agent') ?? ''));
        ctx.waitUntil(
          fetch(upstream.toString(), {
            method: 'POST',
            headers: {
              'content-type':
                request.headers.get('content-type') ?? 'application/x-www-form-urlencoded',
            },
            body,
            // Apps Script answers with a 302 to script.googleusercontent.com;
            // follow it so the execution actually completes, then discard it.
            redirect: 'follow',
          }).catch(() => {
            // Nothing to tell the visitor — they are already on the thanks
            // page, and they are not the right audience for our outage.
            // Apps Script's own Filtered/error paths are the durable record.
          })
        );
      }
      // The visitor's response is OURS regardless of what upstream does or
      // whether it is configured at all. 303 turns the POST into a GET.
      return Response.redirect(new URL('/contact/thanks', url).toString(), 303);
    }

    // ── 2. Published-sheet data for the client-side silent refresh ───────
    if (pathname.startsWith('/api/data/')) {
      const tab = pathname.slice('/api/data/'.length);
      const entry = Object.prototype.hasOwnProperty.call(SHEET_TABS, tab)
        ? SHEET_TABS[tab]
        : undefined;
      if (!entry || request.method !== 'GET') {
        return new Response('Not found', { status: 404 });
      }
      // Edge-cache the Google response for 5 minutes: LiveData refreshes are
      // then nearly always cache hits — fast, and Google never sees the
      // site's traffic level. 5 minutes matches the HTML Cache-Control, so
      // "how stale can the site be" has one answer everywhere.
      const upstream = await fetch(entry.url, {
        cf: { cacheTtl: 300, cacheEverything: true },
      } as RequestInit);
      if (!upstream.ok) return new Response('Upstream error', { status: 502 });
      return new Response(upstream.body, {
        status: 200,
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'cache-control': 'public, max-age=300, must-revalidate',
          'x-content-type-options': 'nosniff',
        },
      });
    }

    // ── 5. Optional same-origin analytics proxy ──────────────────────────
    const umami = (env.UMAMI_UPSTREAM ?? '').replace(/\/$/, '');
    if (umami && pathname === '/s.js') {
      const upstream = await fetch(`${umami}/script.js`, {
        cf: { cacheTtl: 3600, cacheEverything: true },
      } as RequestInit);
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          'content-type': 'application/javascript; charset=utf-8',
          'cache-control': 'public, max-age=3600',
        },
      });
    }
    if (umami && pathname === '/api/send') {
      // The collector hop. Forward the client context so every visitor does
      // not resolve to this worker's own address.
      const headers = new Headers(request.headers);
      const ip = request.headers.get('cf-connecting-ip') ?? '';
      if (ip) {
        headers.set('x-forwarded-for', ip);
        headers.set('x-real-ip', ip);
      }
      return fetch(`${umami}/api/send`, {
        method: request.method,
        headers,
        body: request.body,
      });
    }

    // ── 3. /hi/<code> — attribution rewrite ──────────────────────────────
    if (HI_RE.test(pathname)) {
      // A rewrite, never a redirect: the URL in the address bar IS the data.
      const page = await env.ASSETS.fetch(new URL('/contact', url).toString());
      const h = new Headers(page.headers);
      // These URLs are per-recipient; they must never appear in a search
      // result. Header-level noindex because the HTML is the contact page's.
      h.set('x-robots-tag', 'noindex, nofollow');
      return new Response(page.body, { status: page.status, headers: h });
    }

    // ── 4. Markdown twins — Accept negotiation on content routes ─────────
    const isTwinRoute = TWIN_PREFIXES.some((p) => pathname.startsWith(p));
    // HEAD included: crawlers and link-checkers probe with HEAD, and a HEAD
    // answer whose headers disagree with the GET answer (no Vary, wrong
    // Content-Type) poisons caches and misleads audits.
    if (isTwinRoute && (request.method === 'GET' || request.method === 'HEAD')) {
      const accept = request.headers.get('accept') ?? '';
      if (/text\/markdown/i.test(accept)) {
        const twin = await env.ASSETS.fetch(new URL(`${pathname}.md`, url).toString());
        if (twin.ok) {
          return new Response(twin.body, {
            status: 200,
            headers: {
              'content-type': 'text/markdown; charset=utf-8',
              'cache-control': 'public, max-age=300, must-revalidate',
              // Same URL, two bodies — caches must key on Accept.
              vary: 'Accept',
              'x-content-type-options': 'nosniff',
            },
          });
        }
        // No twin on disk (index pages, or the generator has not run):
        // fall through to HTML — present-on-disk-or-fall-back, never a 404
        // for a page that exists.
      }
      const page = await env.ASSETS.fetch(request);
      const h = new Headers(page.headers);
      h.set('vary', 'Accept'); // the HTML answer varies too, or caches mix bodies
      return new Response(page.body, { status: page.status, headers: h });
    }

    // ── Everything else: the free, unmetered path ────────────────────────
    // (Only reachable for routes in run_worker_first that matched nothing
    // above, e.g. /s.js with the proxy disabled — serve assets normally.)
    return env.ASSETS.fetch(request);
  },
};
