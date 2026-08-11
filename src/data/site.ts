import facts from './facts.json';
import { SITE_URL } from './origin.mjs';

/**
 * ─── THE ONE FILE TO EDIT FOR A NEW SITE ─────────────────────────────────────
 * Everything brand- or deployment-specific lives here (plus origin.mjs for the
 * domain, facts.json for published numbers, and the tokens in global.css).
 * Nothing below is typed into markup anywhere — pages import from here.
 */

export { SITE_URL };

export const SITE = {
  name: 'Example Co',
  domain: new URL(SITE_URL).host,
  url: SITE_URL,
  tagline: 'A one-line description of what this company does',
  description:
    'A 150–200 character description used as the default meta description and in the Organization schema. Say what the company does, for whom, and the one thing that makes it different.',
  locale: 'en',
  themeColor: '#0f4c81',
  ogImage: '/og/default.png',
} as const;

/**
 * Analytics. Two supported providers, one hard rule each:
 *
 * UMAMI (default) — cookieless. Sets no cookies, stores nothing on the device,
 * so it needs NO consent banner — that is a real property worth protecting.
 * Self-host it (or use a cookieless-configured cloud instance) and the site
 * stays banner-free. Same-origin on purpose: worker/index.ts reverse-proxies
 * /s.js to the Umami host and /api/send to its collector, so a domain-level
 * blocker cannot drop it. Leave `websiteId` empty to disable entirely.
 *
 * GA4 — sets cookies, therefore REQUIRES the consent banner. Setting
 * `measurementId` here arms ConsentBanner.astro, which owns the gtag snippet
 * and injects it only on Accept. BaseLayout must never emit the GA tag
 * directly — that would make the banner decoration. CTA events still work:
 * the banner also installs a click forwarder that relays the same
 * `data-umami-event` attributes to gtag, so markup stays vendor-neutral.
 *
 * The website/measurement IDs are not secrets; they are visible in the page
 * source of every site that uses them. API keys never belong in git.
 */
export const ANALYTICS = {
  /** Umami: same-origin script path, site ID, and the host the worker proxies to. */
  umami: {
    src: '/s.js',
    websiteId: '', // empty = Umami disabled
    upstream: '', // e.g. 'https://umami.example.com' — worker proxy target
  },
  /** GA4: non-empty measurementId arms the consent banner, which owns the tag. */
  ga4: {
    measurementId: '', // e.g. 'G-XXXXXXXXXX' — empty = GA4 disabled, no banner
  },
} as const;

/**
 * Cookie consent. Only needed when a cookie-setting vendor (GA4 above, or any
 * other tracker you add) is enabled — with Umami alone the banner never
 * renders and the site needs no consent UI at all.
 *
 * Two buttons, not a preference centre: with a single optional vendor a
 * category matrix would be theatre. `maxAgeDays`: six months is the common
 * regulator expectation; longer gets criticised, shorter annoys.
 */
export const CONSENT = {
  cookieName: 'site_consent',
  maxAgeDays: 180,
  /** Cleared client-side when consent is withdrawn. First-party only — we
   *  cannot reach cookies on the vendor's own domain from here. */
  trackerCookies: ['_ga', '_ga_*'],
} as const;

/**
 * Search-console ownership tokens. Not secrets — a verification token is
 * public by design and grants nothing to anyone who copies it. Google is
 * better verified by DNS TXT (domain property), so it needs nothing here.
 */
export const VERIFICATION = {
  /** Bing Webmaster Tools. Emitted as <meta name="msvalidate.01"> when set. */
  bing: '',
} as const;

/** Feeds the site-wide Person node and every blog post's author.sameAs.
 *  A named human author with a real, linkable profile is non-negotiable for
 *  E-E-A-T and for answer engines. */
export const FOUNDER = {
  name: facts.company.founder.name,
  linkedin: facts.company.founder.linkedin,
} as const;

export const CONTACT = {
  email: 'hello@example.com',
  emailHref: 'mailto:hello@example.com',
  /** Optional extra channels — empty string hides the corresponding UI. */
  phone: '',
  phoneHref: '',
  whatsapp: '',
  /** Prefilled so an enquiry arrives already saying what it is about. */
  whatsappPrefilled: '',
} as const;

/** Header navigation. Keep it short — the header is the site's most valuable
 *  link position and it should sell. Everything else goes in the footer. */
export const NAV = [
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
] as const;

/** Grouped links for the footer. The footer is the site's real navigation on
 *  a phone, where the header keeps only the primary CTA. */
export const FOOTER_NAV = [
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    heading: 'Learn',
    links: [
      { label: 'Blog', href: '/blog' },
      { label: 'Glossary', href: '/glossary' },
      { label: 'For LLMs', href: '/for-llms' },
    ],
  },
] as const;

/**
 * Google Sheets data sources — the build-time half of the data layer.
 *
 * Each entry maps a name to a PUBLISHED-to-the-web CSV URL (File → Share →
 * Publish to web → select the tab → CSV). `scripts/fetch-sheets.mjs` pulls
 * every entry into src/data/sheets/<name>.json before each build; the worker
 * serves the same URLs live at /api/data/<name> for the client-side silent
 * refresh (see LiveData.astro).
 *
 * PRIVACY RULE (two-tab pattern): only ever publish a `public` tab that
 * SELECTS the public columns of approved rows via a QUERY formula. The
 * `master` tab with emails/phones stays unpublished — then the site cannot
 * leak contact fields even by mistake, because it can never see them.
 */
export const SHEETS: Record<string, { url: string }> = {
  // example: { url: 'https://docs.google.com/spreadsheets/d/e/2PACX-…/pub?gid=0&single=true&output=csv' },
};

export const FACTS = facts;
