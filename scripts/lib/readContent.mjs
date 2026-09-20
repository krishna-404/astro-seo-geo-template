/**
 * Reads a content collection straight off disk — frontmatter + raw MDX body —
 * without going through Astro's content pipeline.
 *
 * WHY NOT `getCollection()`. That API only exists inside an Astro
 * build/render context. Both scripts that use this (generate-llms.mjs,
 * markdown-twins.mjs) run as plain Node scripts, one of them BEFORE
 * `astro build` even starts, so there is no Astro runtime to call into. The
 * zod schema in content.config.ts still validates every field at build time
 * in the normal Astro pipeline — this is a second, independent read of the
 * same files, not a replacement for that validation.
 *
 * No content entry in this repo uses an MDX import or a JSX component (checked
 * 12 Aug 2026 — every body is plain markdown), so reading the raw body text is
 * a faithful copy of what the page actually renders. If that ever changes, a
 * component tag will show up verbatim in the generated .md/.txt output, which
 * is a loud, visible failure rather than a silent one — not a reason to add an
 * MDX renderer here pre-emptively.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { isPublished } from '../../src/data/publishing.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * @param {string} collection folder name under src/content/
 * @returns {Array<{slug: string, data: Record<string, unknown>, body: string}>}
 *   Published entries only (drafts and future-dated `published` excluded via
 *   the shared isPublished filter — see src/data/publishing.mjs), sorted by slug.
 */
export function readCollection(collection) {
  const dir = resolve(root, 'src/content', collection);
  if (!existsSync(dir)) return [];

  const entries = readdirSync(dir)
    .filter((f) => /\.mdx?$/.test(f))
    .map((file) => {
      const slug = file.replace(/\.mdx?$/, '');
      const raw = readFileSync(resolve(dir, file), 'utf8');
      const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
      if (!match) {
        throw new Error(`${collection}/${file}: no frontmatter block found`);
      }
      const [, frontmatter, body] = match;
      const data = parseYaml(frontmatter) ?? {};
      return { slug, data, body: body.trim() };
    })
    .filter((entry) => isPublished(entry.data));

  entries.sort((a, b) => a.slug.localeCompare(b.slug));
  return entries;
}

/**
 * The figures a page carries, as text — for the surfaces that ship the body
 * as markdown (the twins, llms-full.txt). The HTML draws them as inline SVG;
 * here each becomes one italic line: its title and caption, which is exactly
 * what the SVG's <title>/<desc> say. A body's `<Figure id="…" />` tag is
 * replaced in place; the lead figure is returned separately so the caller can
 * put it where the page does — after the TL;DR.
 */
function figureLine(f) {
  if (!f) return '';
  return `*Figure — ${f.title}${f.caption ? `. ${f.caption}` : ''}*`;
}

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
