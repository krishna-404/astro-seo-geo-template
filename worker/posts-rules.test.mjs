/**
 * The posts API's shape rules. This suite exists because of one incident: on
 * 27 Sep 2026 the worker's `proprietary` list disagreed with the zod enum in
 * src/content.config.ts, so the API accepted four values the build had never
 * had — every post it accepted then failed the build, and every schema-valid
 * value got a 400. check-parity now compares the two lists; these tests cover
 * the rest of the door.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validatePost, toMdx, slugify, PROPRIETARY, DESCRIPTION_MIN, DESCRIPTION_MAX } from './posts-rules.mjs';
import { parse as parseYaml } from 'yaml';
import { CLAMP_MAX } from '../src/lib/clamp.mjs';

const AUTHORS = JSON.parse(readFileSync(new URL('../src/data/authors.json', import.meta.url), 'utf8')).authors;
const AUTHOR = { name: AUTHORS[0].name, title: AUTHORS[0].title ?? 'Founder', sameAs: AUTHORS[0].sameAs };

const BODY = `## A heading

A paragraph that links to [a glossary entry](/glossary/llms-txt) and to
[the blog index](/blog/how-the-seo-machinery-works), so the in-body link rule
passes on its own terms rather than by counting the footer. `.repeat(6);

const good = (over = {}) => ({
  title: 'A title that fits the SERP budget exactly',
  description: 'A description inside the SERP snippet band, long enough to be a real sentence and short enough not to be cut.',
  tldr: 'The front-loaded answer, in one sentence a machine can lift whole.',
  proprietary: 'original-analysis',
  author: AUTHOR,
  body: BODY,
  ...over,
});

const errorsFor = (input) => validatePost(input, AUTHORS).errors;
const fieldErrors = (input, field) => errorsFor(input).filter((e) => e.startsWith(`${field}:`));

test('a well-formed post passes', () => {
  const { errors, post } = validatePost(good(), AUTHORS);
  assert.deepEqual(errors, []);
  assert.ok(post);
  assert.equal(post.slug, 'a-title-that-fits-the-serp-budget-exactly');
});

test('every schema-valid proprietary value is accepted', () => {
  for (const value of PROPRIETARY) {
    assert.deepEqual(fieldErrors(good({ proprietary: value }), 'proprietary'), [], value);
  }
});

test('a proprietary value the schema does not have is refused', () => {
  // This is the incident, in four lines.
  for (const bad of ['original-research', 'proprietary-data', 'experience', '']) {
    assert.equal(fieldErrors(good({ proprietary: bad }), 'proprietary').length, 1, bad);
  }
});

test('the proprietary list matches the zod enum in src/content.config.ts', () => {
  const schema = readFileSync(new URL('../src/content.config.ts', import.meta.url), 'utf8');
  const listed = [...(schema.match(/proprietary:\s*z\.enum\(\[([\s\S]*?)\]\)/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(PROPRIETARY, listed, 'the API and the build must accept the same words');
});

test('a title the SERP clamp would hard-cut is refused', () => {
  // 66 characters: inside the schema's 70-character ceiling, past the SERP's
  // 60, and with no clause the clamp can drop — so the ONLY complaint must be
  // the hard cut.
  const t = 'A promise about your shipments that runs past the SERP budget line';
  assert.equal(t.length, 66);
  assert.equal(fieldErrors(good({ title: t }), 'title').length, 1);
});

test('a long title with a droppable em-dash clause is accepted', () => {
  const t = 'What demurrage costs an importer — the numbers, per day, per box';
  assert.ok(t.length > CLAMP_MAX);
  assert.deepEqual(fieldErrors(good({ title: t }), 'title'), []);
});

test('the description band is the build’s band, not a looser one', () => {
  assert.equal(DESCRIPTION_MIN, 70);
  assert.equal(DESCRIPTION_MAX, 165);
  assert.equal(fieldErrors(good({ description: 'x'.repeat(69) }), 'description').length, 1);
  assert.deepEqual(fieldErrors(good({ description: 'x'.repeat(70) }), 'description'), []);
  assert.deepEqual(fieldErrors(good({ description: 'x'.repeat(165) }), 'description'), []);
  assert.equal(fieldErrors(good({ description: 'x'.repeat(166) }), 'description').length, 1);
});

test('fewer than two in-body internal links is refused', () => {
  const one = `## H\n\nOne link to [a glossary entry](/glossary/llms-txt). ${'Filler prose. '.repeat(80)}`;
  assert.equal(errorsFor(good({ body: one })).filter((e) => /in-body internal link/.test(e)).length, 1);
});

test('a body with its own h1 is refused — the template renders the title', () => {
  assert.ok(errorsFor(good({ body: `# Mine\n${BODY}` })).some((e) => /"# " heading/.test(e)));
});

test('an author outside the registry is refused', () => {
  const stranger = { name: 'Nobody At All', title: 'Writer', sameAs: ['https://example.org/nobody'] };
  assert.ok(errorsFor(good({ author: stranger })).some((e) => /authors\.json/.test(e)));
});

test('an empty registry refuses every byline', () => {
  assert.ok(validatePost(good(), []).errors.some((e) => /authors\.json/.test(e)));
});

test('a non-object body is refused without throwing', () => {
  for (const junk of [null, undefined, 'a string', 42, []]) {
    const { errors, post } = validatePost(junk, AUTHORS);
    assert.equal(post, null);
    assert.ok(errors.length);
  }
});

test('slugify handles accents, ampersands and punctuation', () => {
  assert.equal(slugify('Crème & Brûlée: the Guide!'), 'creme-and-brulee-the-guide');
  assert.equal(slugify('  Trailing --- hyphens  '), 'trailing-hyphens');
  assert.ok(slugify('x'.repeat(200)).length <= 80);
});

test('toMdx writes frontmatter that the YAML reader parses back', () => {
  const { post } = validatePost(good({ tags: ['one', 'two'], toc: true, primaryKeyword: 'demurrage calculator' }), AUTHORS);
  const mdx = toMdx(post);
  const fm = mdx.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(fm, 'the file opens with a frontmatter block');
  const data = parseYaml(fm[1]);
  assert.equal(data.title, post.title);
  assert.equal(data.description, post.description);
  assert.deepEqual(data.tags, ['one', 'two']);
  assert.equal(data.author.name, AUTHOR.name);
  assert.deepEqual(data.author.sameAs, AUTHOR.sameAs);
  assert.equal(data.toc, true);
  assert.equal(data.primaryKeyword, 'demurrage calculator');
  assert.equal(data.via, 'posts-api', 'the key the daily run identifies an API post by');
  assert.ok(mdx.endsWith('\n'));
});

test('toMdx round-trips a title containing quotes and a colon', () => {
  const tricky = 'It\'s "quoted": a title';
  const { post } = validatePost(good({ title: tricky }), AUTHORS);
  const data = parseYaml(toMdx(post).match(/^---\n([\s\S]*?)\n---\n/)[1]);
  assert.equal(data.title, tricky);
});

test('toMdx omits the optional fields a post did not send', () => {
  const { post } = validatePost(good(), AUTHORS);
  const mdx = toMdx(post);
  for (const key of ['toc:', 'canonical:', 'ogImage:', 'draft:', 'primaryKeyword:']) {
    assert.ok(!mdx.includes(`\n${key}`), `${key} is absent, not empty`);
  }
});

test('the fields the blog schema carries are validated, not silently dropped', () => {
  // Each of these was accepted and thrown away before 27 Sep 2026.
  assert.equal(fieldErrors(good({ toc: 'yes' }), 'toc').length, 1);
  assert.equal(fieldErrors(good({ canonical: '/relative' }), 'canonical').length, 1);
  assert.equal(fieldErrors(good({ ogImage: 'og/x.jpg' }), 'ogImage').length, 1);
  assert.equal(fieldErrors(good({ secondaryKeywords: 'one' }), 'secondaryKeywords').length, 1);
  assert.deepEqual(fieldErrors(good({ draft: true }), 'draft'), []);
});

test('at most one figure may lead', () => {
  const two = [
    { kind: 'steps', title: 'The first figure title' },
    { kind: 'bars', title: 'The second figure title' },
  ];
  assert.ok(errorsFor(good({ figures: two })).some((e) => /at most one figure may lead/.test(e)));
});

test('a figure kind the build does not know is refused', () => {
  assert.equal(fieldErrors(good({ figures: [{ kind: 'pie', title: 'A pie chart title' }] }), 'figures').length, 1);
});
