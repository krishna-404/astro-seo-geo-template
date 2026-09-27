/**
 * saysPhrase decides the quick-win loop: a query the page ranks for but does
 * not SAY is one edit from page one. Three answers, and the difference between
 * them is the difference between "add this heading" and "leave it alone".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saysPhrase, norm, sourceFor, textOf } from './pageText.mjs';

test('norm keeps letters, digits and single spaces', () => {
  assert.equal(norm('  llms.txt — What IS it?  '), 'llms txt what is it');
  assert.equal(norm(null), '');
});

test('a phrase the page carries verbatim answers "phrase"', () => {
  assert.equal(saysPhrase('/glossary/llms-txt', 'llms.txt').has, 'phrase');
});

test('a phrase whose every word is present but not in order answers "words"', () => {
  const r = saysPhrase('/glossary/core-web-vitals', 'vitals core');
  assert.equal(r.has, 'words');
  assert.deepEqual(r.missing, []);
});

test('a phrase with a word the page never uses answers "missing" and names it', () => {
  const r = saysPhrase('/glossary/llms-txt', 'marzipan quotas');
  assert.equal(r.has, 'missing');
  assert.ok(r.missing.includes('marzipan'));
});

test('stop words do not count as missing', () => {
  // "the", "of", "a" are dropped before the comparison: a page that does not
  // contain the literal word "the" does not exist.
  const r = saysPhrase('/glossary/llms-txt', 'the marzipan of a quota');
  assert.deepEqual(r.missing, ['marzipan'], 'only the word the page genuinely lacks — it does use "quota"');
  for (const stop of ['the', 'of', 'a']) assert.ok(!r.missing.includes(stop));
});

test('an unknown route answers "unknown", never "missing"', () => {
  const r = saysPhrase('/no/such/page/at/all', 'anything');
  assert.equal(r.has, 'unknown');
  assert.equal(r.file, null);
});

test('sourceFor maps a route to the file that renders it', () => {
  assert.equal(sourceFor('/'), 'src/pages/index.astro');
  assert.equal(sourceFor('/about'), 'src/pages/about.astro');
  assert.equal(sourceFor('/glossary/llms-txt'), 'src/content/glossary/llms-txt.md');
  assert.equal(sourceFor('https://example.com/about?utm=x#frag'), 'src/pages/about.astro');
  assert.equal(sourceFor('/about/'), 'src/pages/about.astro', 'a trailing slash is the same page');
});

test('textOf a markdown entry includes the frontmatter prose a reader sees', () => {
  const text = norm(textOf('src/content/glossary/llms-txt.md'));
  assert.ok(text.includes('llms txt'), 'the title is prose');
  assert.ok(text.length > 200, 'and the body came with it');
});

test('textOf an astro page reads its string literals and its markup', () => {
  const text = norm(textOf('src/pages/about.astro'));
  assert.ok(text.length > 100);
});
