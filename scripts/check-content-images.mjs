#!/usr/bin/env node
/**
 * Fails when content references an image that does not exist.
 *
 * Frontmatter image STRINGS (`ogImage: /og/blog/x.jpg`) and markdown image
 * refs (`![alt](/img/x.png)`) are not imports — Astro never checks them, so a
 * typo'd path ships silently: the OG card 404s on LinkedIn, the hero renders
 * as its alt text, and nothing in the build says a word. This is the same
 * failure class as broken internal links, caught at the same place (CI),
 * before the page exists.
 *
 * Zero dependencies beyond the shared reader; runs pre-build (reads src, not
 * dist). External URLs are skipped — this checks files we own.
 */
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCollection } from './lib/readContent.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COLLECTIONS = ['blog', 'glossary'];

/** A root-relative ref must exist in public/ (served byte-for-byte). */
function existsInPublic(ref) {
  const clean = ref.replace(/[?#].*$/, '');
  return existsSync(resolve(root, 'public', clean.replace(/^\//, '')));
}

let failures = 0;

for (const collection of COLLECTIONS) {
  for (const entry of readCollection(collection)) {
    const refs = [];

    if (typeof entry.data.ogImage === 'string') {
      refs.push({ ref: entry.data.ogImage, where: 'frontmatter ogImage' });
    }

    for (const m of entry.body.matchAll(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)/g)) {
      refs.push({ ref: m[1], where: 'markdown image' });
    }

    for (const { ref, where } of refs) {
      if (/^https?:\/\//.test(ref)) continue; // external — not ours to verify
      if (!ref.startsWith('/')) {
        console.error(
          `FAIL: ${collection}/${entry.slug} — ${where} "${ref}" is relative; use a root-relative /path into public/ (relative paths resolve against the URL, not the file)`
        );
        failures += 1;
        continue;
      }
      if (!existsInPublic(ref)) {
        console.error(`FAIL: ${collection}/${entry.slug} — ${where} "${ref}" has no file in public/`);
        failures += 1;
      }
    }
  }
}

if (failures > 0) {
  console.error(`\ncheck-content-images: ${failures} broken image reference(s)`);
  process.exit(1);
}
console.log('check-content-images: every referenced image exists');
