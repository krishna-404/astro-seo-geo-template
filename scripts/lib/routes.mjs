/**
 * routes.mjs — the collection registry, and the route ↔ file mapping.
 *
 * WHY. Eleven scripts each kept their own copy of "the collections are blog
 * and glossary", in five different shapes: a `COLLECTIONS` object of routes, a
 * `COLLECTIONS` object of labels, an `EYEBROW` map, a bare `['blog','glossary']`
 * array, and three regexes. Adding a collection meant finding all eleven, and
 * the Sep 2026 audit found that nobody ever had: some lists disagreed. This
 * module reads `src/data/collections.json` — the one config — and hands every
 * caller the shape it needs.
 *
 * Seven scripts also each mapped a route back to the file that renders it,
 * one of them only one directory deep. `routeFor` and `fileFor` are that
 * mapping, once. Read-only; no Astro runtime needed.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const CONFIG = JSON.parse(readFileSync(resolve(root, 'src/data/collections.json'), 'utf8'));

/**
 * @returns {Record<string, {route: string, twins: boolean, eyebrow: string, schema: string}>}
 *   Every declared collection, keyed by its folder name under src/content/.
 */
export function collections() {
  return CONFIG.collections;
}

/** Folder names, in config order. */
export const collectionNames = () => Object.keys(CONFIG.collections);

/** Folder names whose pages are served with a markdown twin. */
export const twinCollections = () => collectionNames().filter((c) => CONFIG.collections[c].twins);

/** Route prefixes the worker negotiates, e.g. ['/blog/', '/glossary/']. */
export const twinPrefixes = () => twinCollections().map((c) => `${CONFIG.collections[c].route}/`);

/** The route directory for a collection, e.g. 'blog' → '/blog'. */
export const routeOfCollection = (name) => CONFIG.collections[name]?.route ?? null;

/** Collection whose route directory is `/<dir>`, or null. */
export function collectionAtRoute(dir) {
  const want = dir.startsWith('/') ? dir : `/${dir}`;
  return collectionNames().find((c) => CONFIG.collections[c].route === want) ?? null;
}

/**
 * Content folders on disk that no config entry claims. A folder with no entry
 * renders nowhere and is invisible to every generated surface, so it is a
 * finding rather than a collection — check-collection-routes reports it.
 */
export function undeclaredCollections() {
  const dir = resolve(root, 'src/content');
  if (!existsSync(dir)) return [];
  const declared = new Set(collectionNames());
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !declared.has(e.name))
    .map((e) => e.name);
}

/** Site-relative path of a URL or path, no trailing slash, no query or hash. */
export function cleanRoute(input) {
  const path = String(input ?? '')
    .replace(/^https?:\/\/[^/]+/, '')
    .split(/[?#]/)[0] || '/';
  return path.replace(/\/+$/, '') || '/';
}

/** Route → the source file that renders it (repo-relative), or null. */
export function fileFor(input) {
  const path = cleanRoute(input);
  if (path === '/') return exists('src/pages/index.astro');
  const parts = path.slice(1).split('/');
  const collection = parts.length === 2 ? collectionAtRoute(`/${parts[0]}`) : null;
  if (collection) {
    for (const ext of ['.md', '.mdx']) {
      const p = `src/content/${collection}/${parts[1]}${ext}`;
      if (existsSync(join(root, p))) return p;
    }
  }
  return exists(`src/pages/${path.slice(1)}.astro`) ?? exists(`src/pages/${path.slice(1)}/index.astro`);
}

const exists = (p) => (existsSync(join(root, p)) ? p : null);

/** Source file (repo-relative) → the route it renders, or null. */
export function routeFor(file) {
  const f = String(file).split(sep).join('/');
  const content = f.match(/^src\/content\/([^/]+)\/(.+)\.mdx?$/);
  if (content) {
    const route = routeOfCollection(content[1]);
    return route ? `${route}/${content[2]}` : null;
  }
  const page = f.match(/^src\/pages\/(.+)\.astro$/);
  if (!page) return null;
  if (/[[\]]/.test(page[1])) return null; // dynamic route: slugs come from content
  const slug = page[1].replace(/\/index$/, '').replace(/^index$/, '');
  return slug ? `/${slug}` : '/';
}

/**
 * Every static route the site renders from `src/pages`, recursively.
 * Dynamic (`[...slug]`) routes are excluded: their slugs come from the
 * collections, not from a filename. Non-page endpoints (.ts, .xml.ts) too.
 */
export function staticRoutes() {
  const out = {};
  const base = resolve(root, 'src/pages');
  if (!existsSync(base)) return out;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) { walk(p); continue; }
      if (!entry.name.endsWith('.astro')) continue;
      const rel = relative(root, p).split(sep).join('/');
      const route = routeFor(rel);
      if (route) out[route] = rel;
    }
  };
  walk(base);
  return out;
}

/** True when the path is a directory on disk (repo-relative). */
export const isDir = (p) => existsSync(join(root, p)) && statSync(join(root, p)).isDirectory();

export { root as repoRoot };
