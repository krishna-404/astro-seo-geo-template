import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Resolves a page's social card, for every route that has one.
 *
 * Cards are rendered by marketing/og/render-pages.mjs into public/og/. This is
 * the read side, and it is the only place that knows the naming scheme —
 * change one, change both.
 *
 * THE CONTRACT: point at a card ONLY if the file is on disk. A card that has
 * not been generated yet falls back to the site default rather than sending a
 * scraper to a 404 — which matters more than usual, because a scraper caches
 * whatever it first fetched and keeps serving it long after the fix.
 *
 * WHY process.cwd() AND NOT import.meta.url. At build time this module is
 * bundled, and `import.meta.url` points at the emitted chunk —
 * `dist/.prerender/chunks/<name>.mjs` — not at src/lib/. Resolving a relative
 * path against it therefore lands inside dist/, where public/ does not exist,
 * and every lookup silently returns undefined.
 *
 * The four collection templates used to do this check inline with
 * `../../../public`, written relative to src/pages/<collection>/. That worked,
 * but only because the emitted chunk happens to sit exactly three levels deep
 * too — the same arithmetic against a different base. If Astro ever changes
 * that layout, the paths keep resolving and simply stop matching, so every
 * card degrades to the default with no error and nothing to notice. cwd is the
 * project root for `astro build` and `astro dev` alike, which makes this
 * independent of where the bundler puts things.
 */
export function ogCardFor(route: string): string | undefined {
  const clean = route.replace(/\/$/, '') || '/';

  // Collection entries and /vs keep their folder; everything else is a page.
  const m = /^\/(blog|glossary|hs-code|solutions|vs)\/(.+)$/.exec(clean);
  const rel = m
    ? `${m[1]}/${m[2]}`
    : clean === '/'
      ? 'pages/home'
      : `pages/${clean.replace(/^\//, '').replace(/\//g, '-')}`;

  const card = `/og/${rel}.jpg`;
  return existsSync(resolve(process.cwd(), `public${card}`)) ? card : undefined;
}
