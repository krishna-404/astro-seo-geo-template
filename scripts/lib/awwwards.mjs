/**
 * Reading awwwards listings — the parsers behind `npm run design:refs`.
 *
 * Two listing shapes, one card format. awwwards embeds one JSON object per
 * card in `data-collectable-model-value`; a /websites/ card carries its own
 * `slug` (the /sites/<slug> page), an /elements/ card does not — its
 * inspiration slug and the live page it was cut from sit in the anchors of
 * the same `<li>`, so an element card is read from the whole list item.
 *
 * THE TRAP THIS FILE NAMES (28 Sep 2026): `/elements/<x>/` is a category
 * only when `<x>` is one of the ~47 slugs awwwards knows (hero_image,
 * about_us, pricing_page, FAQ, CTA, stats, team, contact, footer…).
 * Any other word — `services`, a typo — is silently a TEXT SEARCH: the
 * page answers 200 with a full grid, and its filter links carry `?text=<x>`
 * instead of `?category=<x>`. A sweep that trusted the status would file a
 * search under a category name. `elementMode` reads the page's own filter
 * links and says which one it got, and the sheet prints it.
 *
 * Pure functions, no network: the sweep script fetches, these read.
 */
import { decode } from './html.mjs';

const CARD_RE = /data-collectable-model-value="([^"]+)"/g;

/** One JSON card, or null when it cannot be read — skipped, never guessed. */
function parseCard(attr) {
  try {
    const o = JSON.parse(decode(attr));
    return {
      title: decode(String(o.title ?? o.collectableTitle ?? o.slug ?? '')).trim(),
      slug: o.slug ?? '',
      tags: Array.isArray(o.tags) ? o.tags.map((t) => decode(String(t))) : [],
      date: o.createdAt ? new Date(o.createdAt * 1000).toISOString().slice(0, 10) : '',
      by: decode(String(o.user?.displayName ?? o.user?.username ?? '')).trim(),
    };
  } catch {
    return null;
  }
}

/** /websites/<category>/ and /websites/sites_of_the_day/ — one card per site, keyed by slug. */
export function siteCards(html) {
  const out = [];
  const seen = new Set();
  for (const m of html.matchAll(CARD_RE)) {
    const c = parseCard(m[1]);
    if (!c || !c.slug || seen.has(c.slug)) continue;
    seen.add(c.slug);
    out.push(c);
  }
  return out;
}

/**
 * /elements/<category>/ — one card per element. The inspiration slug
 * (`/inspiration/<slug>`) and the live page (the external `figure-rollover__bt`
 * anchor) are read from the card's own `<li>`; a card with neither is a card
 * the reader cannot open, so it is dropped.
 */
export function elementCards(html) {
  const out = [];
  const seen = new Set();
  for (const li of html.matchAll(/<li\b[^>]*\bjs-collectable\b[^>]*>([\s\S]*?)<\/li>/g)) {
    const attr = /data-collectable-model-value="([^"]+)"/.exec(li[0]);
    if (!attr) continue;
    const c = parseCard(attr[1]);
    if (!c) continue;
    const inspiration = /href="\/inspiration\/([^"/?#]+)/.exec(li[1])?.[1] ?? '';
    const live =
      /class="figure-rollover__bt"[^>]*href="(https?:\/\/(?!(?:www\.)?awwwards\.com)[^"]+)"/.exec(
        li[1],
      )?.[1] ??
      /href="(https?:\/\/(?!(?:www\.)?awwwards\.com)[^"]+)"[^>]*target="_blank"/.exec(li[1])?.[1] ??
      '';
    if (!inspiration && !live) continue;
    const key = inspiration || live;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...c, slug: inspiration, url: decode(live) });
  }
  return out;
}

/** The category slugs the page's own filter links name — the only list awwwards publishes. */
export function elementCategories(html) {
  const set = new Set();
  for (const m of html.matchAll(/href="\/elements\/\?[^"]*?\bcategory=([A-Za-z0-9_]+)/g))
    set.add(m[1]);
  return set;
}

/**
 * What awwwards did with `/elements/<slug>/`:
 *   'category' — a real category (its filter links carry `category=<slug>`);
 *   'text'     — a text search (the links carry `text=<slug>`);
 *   'unknown'  — neither — a page that is not the elements grid (a wall, an
 *                error page, a redesign); read in a browser, never filed.
 */
export function elementMode(html, slug) {
  if (!html) return 'unknown';
  const cats = elementCategories(html);
  if (cats.has(slug)) return 'category';
  if (/href="\/elements\/\?[^"]*?\btext=/.test(html)) return 'text';
  return cats.size ? 'text' : 'unknown';
}

/**
 * Tech tags are the warning signal: a look that needs a runtime is a look
 * this template cannot hold. Anything else counts as register — what the
 * category is doing and what the template can borrow at zero JS.
 */
export const TECH =
  /^(gsap|gsap animation|three\.?js|webgl|react|react[- ]three[- ]fiber|next\.?js|nuxt|vue|svelte|webflow|framer|framer motion|lottie|spline|shopify|wordpress|wix|squarespace|readymag|barba|lenis|locomotive|unity|unreal|blender|3d|vev)$/i;

export function countTags(cards) {
  const reg = new Map();
  const tech = new Map();
  for (const c of cards)
    for (const t of c.tags) {
      const m = TECH.test(t) ? tech : reg;
      m.set(t, (m.get(t) ?? 0) + 1);
    }
  const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]);
  return { register: top(reg), tech: top(tech) };
}
