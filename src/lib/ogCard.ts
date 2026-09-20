import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Resolves a page's social card, for every route that has one.
 *
 * Cards are rendered by marketing/og/render-pages.mjs into public/og/, one
 * per built page, at the path that mirrors the route: /blog/x → /og/blog/x.jpg,
 * /about → /og/about.jpg, /blog → /og/blog.jpg. This is the read side of that
 * scheme and the only other place that knows it — change one, change both.
 *
 * THE CONTRACT: point at a card ONLY if the file is on disk. A card that has
 * not been generated yet falls back to the site default rather than sending a
 * scraper to a 404 — a scraper caches whatever it first fetched and keeps
 * serving it long after the fix. check-invariants then fails the build for
 * any indexable page without its own card, so the fallback is a safety net,
 * never the steady state.
 *
 * The homepage never gets a page card: index.astro passes SITE.ogImage (the
 * brand card) explicitly, and render-pages skips '/'.
 *
 * WHY process.cwd() AND NOT import.meta.url: at build time this module is
 * bundled and `import.meta.url` points at the emitted chunk under dist/, where
 * public/ does not exist. cwd is the project root for `astro build` and
 * `astro dev` alike.
 */
export function ogCardFor(route: string): string | undefined {
  const clean = route.replace(/\/$/, '') || '/';
  if (clean === '/') return undefined;
  const card = `/og${clean}.jpg`;
  return existsSync(resolve(process.cwd(), `public${card}`)) ? card : undefined;
}
