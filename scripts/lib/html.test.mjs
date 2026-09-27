/**
 * Reading the built site. The entity decoder is the one with a history: a
 * 60-character title read as 64 because one of the two copies of this table did
 * not decode `&#39;` (20 Sep 2026). There is one copy now, so there is one test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decode, strip, ldNodes, ldBlocks, routeOf, norm, sitePath, sitemapUrls, sitemapEntries } from './html.mjs';

test('decode handles numeric, hex and the six named entities', () => {
  assert.equal(decode('B&#39;spoke'), "B'spoke");
  assert.equal(decode('&#x2014;'), '—');
  assert.equal(decode('a &amp; b'), 'a & b');
  assert.equal(decode('&quot;x&quot;'), '"x"');
  assert.equal(decode('&lt;p&gt;'), '<p>');
  assert.equal(decode('&apos;'), "'");
  assert.equal(decode('a&nbsp;b'), 'a b');
});

test('a decoded title is measured at its real length', () => {
  // The defect: five characters of entity for one character of apostrophe.
  const escaped = `${'x'.repeat(59)}&#39;`;
  assert.equal(escaped.length, 64);
  assert.equal(decode(escaped).length, 60);
});

test('decode leaves an unknown entity alone rather than mangling it', () => {
  assert.equal(decode('&unknownentity;'), '&unknownentity;');
});

test('strip removes scripts, styles and tags, and collapses whitespace', () => {
  const html = '<p>Hello</p><script>var x = 1;</script><style>p{color:red}</style>\n\n<p>  world  </p>';
  assert.equal(strip(html), 'Hello world');
});

test('strip decodes as it goes', () => {
  assert.equal(strip('<p>a &amp; b</p>'), 'a & b');
});

test('ldNodes flattens @graph and skips a block that does not parse', () => {
  const html =
    '<script type="application/ld+json">{"@graph":[{"@type":"Organization"},{"@type":"WebSite"}]}</script>' +
    '<script type="application/ld+json">{ not json }</script>' +
    '<script type="application/ld+json">{"@type":"FAQPage"}</script>';
  assert.deepEqual(ldNodes(html).map((n) => n['@type']), ['Organization', 'WebSite', 'FAQPage']);
  assert.equal(ldBlocks(html).length, 3, 'but every block is still visible to the parse check');
});

test('ldNodes on a page with no JSON-LD is an empty array', () => {
  assert.deepEqual(ldNodes('<p>nothing</p>'), []);
  assert.deepEqual(ldNodes(undefined), []);
});

test('routeOf maps a built file to the URL it serves', () => {
  assert.equal(routeOf('dist/index.html'), '/');
  assert.equal(routeOf('dist/about.html'), '/about');
  assert.equal(routeOf('dist/blog/index.html'), '/blog');
  assert.equal(routeOf('dist/blog/a-post.html'), '/blog/a-post');
  assert.equal(routeOf('dist/contact/thanks.html'), '/contact/thanks');
});

test('norm lowercases and keeps only letters, digits and single spaces', () => {
  assert.equal(norm('  LLMs.txt — What IS it? '), 'llms txt what is it');
});

test('sitePath strips the origin and the trailing slash', () => {
  assert.equal(sitePath('example.com', 'https://example.com/about/'), '/about');
  assert.equal(sitePath('example.com', 'https://example.com/'), '/');
  assert.equal(sitePath('example.com', '/already/a/path'), '/already/a/path');
  assert.equal(sitePath('example.com', undefined), '/');
});

test('sitemapUrls follows a sitemap index to its children', async () => {
  const docs = {
    'https://x/sitemap-index.xml': '<sitemapindex><sitemap><loc>https://x/sitemap-0.xml</loc></sitemap><sitemap><loc>https://x/sitemap-1.xml</loc></sitemap></sitemapindex>',
    'https://x/sitemap-0.xml': '<urlset><url><loc>https://x/a</loc></url></urlset>',
    'https://x/sitemap-1.xml': '<urlset><url><loc>https://x/b</loc></url></urlset>',
  };
  const urls = await sitemapUrls('https://x/sitemap-index.xml', async (u) => docs[u] ?? null);
  assert.deepEqual(urls, ['https://x/a', 'https://x/b'], 'a second sitemap file is not silently dropped');
});

test('sitemapUrls reads a plain urlset directly', async () => {
  const xml = '<urlset><url><loc>https://x/a</loc></url><url><loc>https://x/b</loc></url></urlset>';
  assert.deepEqual(await sitemapUrls('u', async () => xml), ['https://x/a', 'https://x/b']);
});

test('sitemapUrls on an unreachable sitemap is empty, not a throw', async () => {
  assert.deepEqual(await sitemapUrls('u', async () => null), []);
});

test('sitemapEntries pairs each loc with its lastmod', () => {
  const xml = '<urlset><url><loc>https://x/a</loc><lastmod>2026-09-01T00:00:00.000Z</lastmod></url><url><loc>https://x/b</loc></url></urlset>';
  assert.deepEqual(sitemapEntries(xml), [
    { loc: 'https://x/a', lastmod: '2026-09-01T00:00:00.000Z' },
    { loc: 'https://x/b', lastmod: null },
  ]);
});
