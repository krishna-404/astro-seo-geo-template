/**
 * The high-intent and BOFU classifiers. These decide what a cadence run works
 * FIRST, so a misclassification does not produce a wrong number — it produces a
 * week spent on the wrong page.
 *
 * The rows are synthetic: real Search Console rows would tie the test to
 * whatever the site happened to rank for that week.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isHighIntent, bofuLabel, playbookBlocks, shownOnMap, claimedKeywords } from './intent.mjs';

const row = (query, position, impressions = 10, clicks = 0) => ({ keys: [query], position, impressions, clicks });

test('a buying signal makes a query high-intent', () => {
  assert.ok(isHighIntent('freight forwarding software'));
  assert.ok(isHighIntent('demurrage calculator'));
  assert.ok(isHighIntent('how much does customs clearance cost'));
});

test('an informational query is not high-intent', () => {
  assert.equal(isHighIntent('what is a bill of lading'), false);
  assert.equal(isHighIntent('container shipping history'), false);
});

test('bofuLabel names the shape a buyer types', () => {
  assert.equal(bofuLabel('acme vs beta'), 'x vs y');
  assert.equal(bofuLabel('best freight software for forwarders'), 'best <product> for <who>');
  assert.equal(bofuLabel('widget alternatives'), 'alternatives (any)');
  assert.equal(bofuLabel('customs software pricing'), 'pricing / cost');
  assert.equal(bofuLabel('crm for freight brokers'), '<software> for <role>');
});

test('bofuLabel returns null for a query with no buying shape', () => {
  assert.equal(bofuLabel('what is demurrage'), null);
  assert.equal(bofuLabel('best freight software'), null, '"best" without "for" is not the pattern');
});

test('a competitor pattern is dropped when no competitor is configured', () => {
  // intent.json ships `competitors: []`. A pattern containing <competitor>
  // would compile to an empty alternation that matches EVERYTHING, so those
  // rows are filtered out rather than left to match every query.
  const { competitorQueries, competitorsConfigured } = playbookBlocks([row('acme review', 6)], {}, 'example.com');
  assert.equal(competitorsConfigured, 0);
  assert.deepEqual(competitorQueries, [], 'no competitor named, no competitor rows');
  // The generic `review` pattern still fires — it needs no competitor list.
  // The <competitor>-shaped ones must not, or an empty alternation would make
  // them match every query on the site.
  assert.equal(bofuLabel('acme review'), 'review');
  assert.equal(bofuLabel('export from acme'), null, 'the <competitor> migration pattern is dropped');
});

test('BOFU splits at position 4: 4–20 is the shortlist, 1–3 is already winning', () => {
  const { bofu, winning } = playbookBlocks(
    [row('a vs b', 7.2), row('c vs d', 2.1), row('e vs f', 25)],
    {},
    'example.com'
  );
  assert.deepEqual(bofu.map((r) => r.query), ['a vs b']);
  assert.deepEqual(winning.map((r) => r.query), ['c vs d']);
});

test('BOFU rows sort by position, then by impressions', () => {
  const { bofu } = playbookBlocks(
    [row('far vs x', 18, 500), row('near vs y', 5, 1), row('tie vs z', 5, 99)],
    {},
    'example.com'
  );
  assert.equal(bofu[0].position, 5);
  assert.equal(bofu[0].impressions, 99, 'at equal position the bigger query comes first');
  assert.equal(bofu.at(-1).query, 'far vs x');
});

test('a quick win is a ranking page whose source does not say the phrase', () => {
  const { quickWins } = playbookBlocks(
    [],
    { 'https://example.com/glossary/llms-txt': [{ query: 'entirely unrelated marzipan phrasing', impressions: 9, position: 3 }] },
    'example.com'
  );
  assert.equal(quickWins.length, 1);
  assert.equal(quickWins[0].page, '/glossary/llms-txt');
  assert.equal(quickWins[0].status, 'missing');
  assert.ok(quickWins[0].missing.includes('marzipan'), 'it names the words to add');
  assert.ok(quickWins[0].file.startsWith('src/content/glossary/'), 'and the file to add them to');
});

test('a phrase the page already says is not a quick win', () => {
  const { quickWins } = playbookBlocks(
    [],
    { 'https://example.com/glossary/llms-txt': [{ query: 'llms.txt', impressions: 40, position: 2 }] },
    'example.com'
  );
  assert.deepEqual(quickWins, [], 'nothing to add — the page says it');
});

test('a page below the position bar is not a quick win', () => {
  const { quickWins } = playbookBlocks(
    [],
    { 'https://example.com/glossary/llms-txt': [{ query: 'unrelated marzipan phrasing', impressions: 9, position: 40 }] },
    'example.com'
  );
  assert.deepEqual(quickWins, [], 'position 40 is not one edit from page one');
});

test('shownOnMap keeps the page with the most impressions per query', () => {
  const map = shownOnMap(
    {
      'https://example.com/a': [{ query: 'Same Query', impressions: 3 }],
      'https://example.com/b': [{ query: 'same query', impressions: 30 }],
    },
    'example.com'
  );
  assert.equal(map['same query'].page, '/b');
});

test('shownOnMap strips the site prefix and normalises the query', () => {
  const map = shownOnMap({ 'https://example.com/x/y': [{ query: "What's THIS?", impressions: 1 }] }, 'example.com');
  assert.deepEqual(Object.keys(map), ['what s this']);
  assert.equal(map['what s this'].page, '/x/y');
});

test('claimedKeywords reads only the collections intent.json names', () => {
  // Asserted as a RULE, not as a count: the template ships the two commercial
  // collections empty, and a test that hard-coded `[]` went red the moment a
  // site added its first money page — which is the test failing on correct
  // behaviour. What must hold is that every claim comes from a claimFrom
  // collection, carries a normalised primary keyword, and lists it among `all`.
  const intent = JSON.parse(readFileSync('src/data/intent.json', 'utf8'));
  const routes = (intent.claimFrom ?? []).map((c) => c.route.replace(/\/$/, ''));
  for (const claim of claimedKeywords()) {
    assert.ok(
      routes.some((r) => claim.page.startsWith(`${r}/`)),
      `${claim.page} is served under one of ${routes.join(', ')}`
    );
    assert.equal(claim.primary, claim.primary.toLowerCase(), 'the primary keyword is normalised');
    assert.ok(claim.all.includes(claim.primary), 'the primary is among the page’s keywords');
  }
});
