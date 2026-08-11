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

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * @param {string} collection folder name under src/content/
 * @returns {Array<{slug: string, data: Record<string, unknown>, body: string}>}
 *   Published entries only (draft: true is excluded), sorted by slug.
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
    .filter((entry) => !entry.data.draft);

  entries.sort((a, b) => a.slug.localeCompare(b.slug));
  return entries;
}
