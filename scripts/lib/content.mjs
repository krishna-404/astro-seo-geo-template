/**
 * content.mjs — the one reader for content entries off disk.
 *
 * WHY. Six scripts parsed frontmatter with their own regex, and three shapes of
 * "is this live" coexisted: `isPublished()` (draft OR future date), a bare
 * `/^draft:\s*true$/m` test, and `!data.draft`. The Sep 2026 audit found the
 * consequence: a SCHEDULED post (a real `published` date in the future) counted
 * as live in four checks and not in three. A link to one read as dead in the
 * link graph while the voice check skipped it, so a post could go live
 * unchecked. The regex also could not see a quoted or a commented-out `draft`.
 *
 * So the status is a THREE-VALUE enum, computed once from the parsed YAML, and
 * every caller states which statuses it wants:
 *   draft      — `draft: true`; renders nowhere, ever
 *   scheduled  — not a draft, `published` is in the future; queued to go live
 *   published  — live now
 *
 * Who wants what (recorded here because it is a decision, not a default):
 *   link graph            published + scheduled (a link to a queued post is
 *                         not dead, and it still needs an inbound link)
 *   voice, source rules   published + scheduled (they go live unattended —
 *                         the build that releases them runs no author)
 *   inventory             all three, with the status column
 *   twins, llms, lastmod, sitemap, RSS   published only
 *
 * This is a second, independent read of the same files the zod schema in
 * content.config.ts validates at build time — not a replacement for it.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { isPublished } from '../../src/data/publishing.mjs';
import { collectionNames, routeOfCollection } from './routes.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** @typedef {'draft'|'scheduled'|'published'} Status */

/** The three-value status of a parsed frontmatter object. */
export function statusOf(data, now = Date.now()) {
  if (data?.draft) return 'draft';
  return isPublished(data, now) ? 'published' : 'scheduled';
}

/**
 * Read one entry.
 * @param {string} file repo-relative path under src/content/
 * @returns {{slug: string, collection: string, route: string|null, file: string,
 *   data: Record<string, unknown>, body: string, raw: string, status: Status}}
 */
export function readEntry(file, now = Date.now()) {
  const rel = file.replace(/\\/g, '/');
  const m = rel.match(/^(?:.*\/)?src\/content\/([^/]+)\/(.+)\.mdx?$/);
  const collection = m ? m[1] : '';
  const slug = m ? m[2] : rel.replace(/^.*\//, '').replace(/\.mdx?$/, '');
  const raw = readFileSync(resolve(root, rel), 'utf8');
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!fm) throw new Error(`${rel}: no frontmatter block found`);
  const data = parseYaml(fm[1]) ?? {};
  const routeDir = routeOfCollection(collection);
  return {
    slug,
    collection,
    route: routeDir ? `${routeDir}/${slug}` : null,
    file: rel,
    data,
    body: fm[2].trim(),
    raw,
    status: statusOf(data, now),
  };
}

const STATUSES = ['draft', 'scheduled', 'published'];

/**
 * Read a collection.
 * @param {string} collection folder name under src/content/
 * @param {{include?: Status[]}} [opts] statuses to keep; default published only
 * @returns entries sorted by slug
 */
export function readCollection(collection, { include = ['published'] } = {}) {
  const dir = resolve(root, 'src/content', collection);
  if (!existsSync(dir)) return [];
  const want = new Set(include === 'all' ? STATUSES : include);
  return readdirSync(dir)
    .filter((f) => /\.mdx?$/.test(f))
    .map((f) => readEntry(join('src/content', collection, f).split('\\').join('/')))
    .filter((e) => want.has(e.status))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Every declared collection's entries, flat. */
export function readAll({ include = ['published'] } = {}) {
  return collectionNames().flatMap((c) => readCollection(c, { include }));
}

/** Every entry file on disk, whatever its status — for the file-level checks. */
export function entryFiles() {
  return collectionNames().flatMap((c) => {
    const dir = resolve(root, 'src/content', c);
    if (!existsSync(dir)) return [];
    return readdirSync(dir).filter((f) => /\.mdx?$/.test(f)).sort()
      .map((f) => `src/content/${c}/${f}`);
  });
}

/**
 * The figures a page carries, as text — for the surfaces that ship the body as
 * markdown (the twins, llms-full.txt). The HTML draws them as inline SVG; here
 * each becomes one italic line, its title and caption, which is exactly what
 * the SVG's <title>/<desc> say.
 */
const figureLine = (f) => (f ? `*Figure — ${f.title}${f.caption ? `. ${f.caption}` : ''}*` : '');

export function leadFigureLine(data) {
  const figs = Array.isArray(data.figures) ? data.figures : [];
  return figureLine(figs.find((f) => (f.place ?? 'lead') === 'lead'));
}

export function bodyAsText(entry) {
  const figs = Array.isArray(entry.data.figures) ? entry.data.figures : [];
  return entry.body.replace(/<Figure\s+id="([a-z0-9-]+)"\s*\/>/g, (_, id) => {
    const f = figs.find((x) => x.id === id);
    return f ? figureLine(f) : '';
  });
}

/**
 * Prose only, for the voice check: the frontmatter prose fields a reader and a
 * SERP see, plus the body with code fences and URLs removed.
 */
export function prose(entry, fields = ['title', 'description', 'tldr']) {
  const head = fields
    .map((k) => entry.data[k])
    .filter((v) => typeof v === 'string')
    .join('\n');
  const noCode = entry.body.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]*`/g, ' ');
  const noUrls = noCode.replace(/\(https?:\/\/[^)]*\)/g, '()').replace(/https?:\/\/\S+/g, ' ');
  return { body: entry.body, prose: `${head}\n${noUrls}` };
}
