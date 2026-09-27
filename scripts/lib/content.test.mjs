/**
 * The content reader, and the three-value status that replaced three different
 * answers to "is this live". The drift this test guards: a SCHEDULED post (a
 * real `published` date in the future) counted as live in four checks and not in
 * three, so a post could go live having never been voice-checked.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statusOf, readEntry, readCollection, readAll, entryFiles, prose, bodyAsText, leadFigureLine } from './content.mjs';

const NOW = Date.parse('2026-09-27T00:00:00Z');

test('statusOf: a draft is a draft whatever its date', () => {
  assert.equal(statusOf({ draft: true }, NOW), 'draft');
  assert.equal(statusOf({ draft: true, published: '2020-01-01' }, NOW), 'draft');
  assert.equal(statusOf({ draft: true, published: '2099-01-01' }, NOW), 'draft');
});

test('statusOf: a future date is scheduled, a past date is published', () => {
  assert.equal(statusOf({ published: '2026-09-28' }, NOW), 'scheduled');
  assert.equal(statusOf({ published: '2026-09-26' }, NOW), 'published');
});

test('statusOf: an entry with no date is published', () => {
  assert.equal(statusOf({}, NOW), 'published');
});

test('statusOf: today’s date is published, not scheduled', () => {
  // Date-only YAML is UTC midnight, which has passed by the time NOW is reached.
  assert.equal(statusOf({ published: '2026-09-27' }, NOW), 'published');
});

test('statusOf: an unparseable date is scheduled, so the mistake is visible', () => {
  // Never "published": a garbage date must not reach every machine-readable
  // surface. It shows up as a missing page instead.
  assert.equal(statusOf({ published: 'last tuesday' }, NOW), 'scheduled');
});

test('readCollection defaults to published only', () => {
  const entries = readCollection('blog');
  assert.ok(entries.length > 0);
  for (const e of entries) assert.equal(e.status, 'published');
});

test('readCollection opts in to the other statuses explicitly', () => {
  const all = readCollection('blog', { include: 'all' });
  const explicit = readCollection('blog', { include: ['published', 'scheduled', 'draft'] });
  assert.deepEqual(all.map((e) => e.slug), explicit.map((e) => e.slug));
  assert.ok(all.length >= readCollection('blog').length);
});

test('readCollection on a folder that does not exist is empty, not a throw', () => {
  assert.deepEqual(readCollection('no-such-collection'), []);
});

test('readCollection sorts by slug, so output is stable across machines', () => {
  const slugs = readAll({ include: 'all' }).filter((e) => e.collection === 'blog').map((e) => e.slug);
  assert.deepEqual(slugs, [...slugs].sort());
});

test('readEntry carries the route, the collection and the parsed frontmatter', () => {
  const e = readEntry('src/content/glossary/llms-txt.md');
  assert.equal(e.slug, 'llms-txt');
  assert.equal(e.collection, 'glossary');
  assert.equal(e.route, '/glossary/llms-txt');
  assert.equal(typeof e.data.title, 'string');
  assert.ok(Array.isArray(e.data.sources), 'sources parsed as YAML, not as text');
  assert.ok(e.body.length > 100);
  assert.ok(!e.body.startsWith('---'), 'the frontmatter block is not in the body');
});

test('readEntry throws on a file with no frontmatter, rather than guessing', () => {
  assert.throws(() => readEntry('package.json'), /no frontmatter block/);
});

test('entryFiles lists every entry on disk whatever its status', () => {
  const files = entryFiles();
  assert.ok(files.length >= readAll({ include: 'all' }).length);
  for (const f of files) assert.match(f, /^src\/content\/[^/]+\/.+\.mdx?$/);
});

test('prose joins the frontmatter fields a reader sees with the body', () => {
  const e = readEntry('src/content/blog/how-the-seo-machinery-works.md');
  const { prose: p } = prose(e);
  assert.ok(p.includes(e.data.title), 'the title is prose a SERP shows');
  assert.ok(p.includes(e.data.tldr.slice(0, 30)), 'so is the tldr');
});

test('prose strips code fences and URLs before the voice check sees them', () => {
  const e = { data: {}, body: '```js\nconst banned = "leverage";\n```\nSee https://example.com/leverage for more.' };
  const { prose: p } = prose(e);
  assert.ok(!p.includes('const banned'), 'a code sample is not prose');
  assert.ok(!p.includes('example.com'), 'nor is a URL');
});

test('bodyAsText replaces a <Figure id> tag with the figure’s own line', () => {
  const entry = {
    body: 'Before.\n\n<Figure id="the-flow" />\n\nAfter.',
    data: { figures: [{ id: 'the-flow', place: 'body', title: 'How it flows', caption: 'A caption.' }] },
  };
  const text = bodyAsText(entry);
  assert.ok(!text.includes('<Figure'), 'no component tag survives into the markdown twin');
  assert.ok(text.includes('*Figure — How it flows. A caption.*'));
});

test('bodyAsText drops a tag whose figure was deleted', () => {
  const text = bodyAsText({ body: 'a <Figure id="gone" /> b', data: { figures: [] } });
  assert.ok(!text.includes('<Figure'));
});

test('leadFigureLine picks the lead figure, and place defaults to lead', () => {
  assert.equal(
    leadFigureLine({ figures: [{ title: 'Implicit lead' }, { id: 'x', place: 'body', title: 'A body one' }] }),
    '*Figure — Implicit lead*'
  );
  assert.equal(leadFigureLine({ figures: [{ id: 'x', place: 'body', title: 'Only a body one' }] }), '');
  assert.equal(leadFigureLine({}), '');
});
