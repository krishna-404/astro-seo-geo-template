/**
 * pageText.mjs — the words a page actually says, read from its SOURCE.
 *
 * WHY. Two playbooks the engine runs need to know whether a page already
 * says a phrase: the quick-win loop ("a query at position ≤5 the page does
 * not say → add it to a heading or FAQ") and the page audit. Reading dist/
 * would need a build; reading the source is instant and runs at every rung.
 *
 * Route → file: a content collection route (/blog/<slug>, /glossary/<slug>)
 * maps to src/content/<collection>/<slug>.md(x); a static route (/about, /)
 * maps to src/pages/<route>.astro. For markdown the frontmatter prose fields
 * (title, description, tldr, term, shortDefinition, faq q/a, keywords) join
 * the body; for .astro the component script is dropped and tags stripped.
 *
 * Crude on purpose: it answers "does this page say these words", not "how
 * well". Read-only. Nothing here is site copy.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Normalise for comparison: lower-case, letters/digits only, single spaces. */
export const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Source file for a site-relative route, or null. */
export function sourceFor(route) {
  const path = (route.replace(/^https?:\/\/[^/]+/, '').split(/[?#]/)[0] || '/').replace(/\/$/, '') || '/';
  if (path === '/') return existsSync(join(root, 'src/pages/index.astro')) ? 'src/pages/index.astro' : null;
  const parts = path.slice(1).split('/');
  if (parts.length === 2 && existsSync(join(root, 'src/content', parts[0]))) {
    for (const ext of ['.md', '.mdx']) {
      const p = `src/content/${parts[0]}/${parts[1]}${ext}`;
      if (existsSync(join(root, p))) return p;
    }
  }
  for (const p of [`src/pages/${path.slice(1)}.astro`, `src/pages/${path.slice(1)}/index.astro`]) {
    if (existsSync(join(root, p))) return p;
  }
  return null;
}

/** Plain text of a source file (frontmatter prose + body, tags stripped). */
export function textOf(file) {
  const raw = readFileSync(join(root, file), 'utf8');
  if (/\.mdx?$/.test(file)) {
    const fm = raw.match(/^---\n([\s\S]*?)\n---\n?/);
    const body = fm ? raw.slice(fm[0].length) : raw;
    let head = '';
    if (fm) {
      for (const m of fm[1].matchAll(/^\s*(?:-\s+)?(?:title|description|tldr|term|shortDefinition|q|a|primaryKeyword|label|caption)\s*:\s*(['"]?)([\s\S]*?)\1\s*$/gm)) head += m[2] + '\n';
      for (const m of fm[1].matchAll(/^\s+-\s+(['"]?)([^\n'"]+)\1\s*$/gm)) head += m[2] + '\n';
    }
    return head + body.replace(/```[\s\S]*?```/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  }
  // .astro: drop the component script, keep string literals from it (titles,
  // descriptions, FAQ arrays are usually consts), then strip markup.
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  const script = fm ? fm[1] : '';
  const template = fm ? raw.slice(fm[0].length) : raw;
  const literals = [...script.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)].map((m) => m[2]).filter((s) => /\s/.test(s)).join('\n');
  return literals + '\n' + template.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/\{[^{}]*\}/g, ' ').replace(/<[^>]+>/g, ' ');
}

/**
 * Does the page say the phrase? Returns 'phrase' (verbatim, normalised),
 * 'words' (every word present, not as a phrase), or 'missing' (with the words
 * it lacks).
 */
export function saysPhrase(route, phrase) {
  const file = sourceFor(route);
  if (!file) return { file: null, has: 'unknown', missing: [] };
  const text = ' ' + norm(textOf(file)) + ' ';
  const q = norm(phrase);
  if (!q) return { file, has: 'phrase', missing: [] };
  if (text.includes(' ' + q + ' ')) return { file, has: 'phrase', missing: [] };
  const STOP = new Set(['a', 'an', 'the', 'of', 'for', 'to', 'in', 'on', 'and', 'or', 'is', 'are', 'what', 'how', 'do', 'does', 'i', 'my', 'vs']);
  const words = q.split(' ').filter((w) => !STOP.has(w));
  const missing = words.filter((w) => !text.includes(' ' + w + ' ') && !text.includes(' ' + w));
  return { file, has: missing.length ? 'missing' : 'words', missing };
}
