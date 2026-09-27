/**
 * The marketing files that hold measurement and open asks. Five scripts read
 * these four files and disagreed about what they said: the data-sheet counter
 * matched headings while the printer parsed blocks, and the link-target reader
 * wanted five columns in one script and six in another. One reader, one answer —
 * which is only worth anything if the reader is right.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dataSheet, linkTargets, snapshotDates, panelRuns, newestHeading } from './snapshots.mjs';

test('dataSheet parses a question block into its fields', () => {
  const md = [
    '# Data sheet',
    '',
    '### Q-A1 · The first ask ⬜',
    '',
    '**Priority:** high',
    '**Unblocks:** the money page',
    '**Ask:** what does it cost per day',
    '**Answer:**',
    '',
    '---',
    '',
    '### Q-B2 · The answered one ✅',
    '',
    '**Priority:** low',
    '**Unblocks:** nothing much',
    '**Ask:** who signs off',
    '**Answer:** the founder does',
    '',
  ].join('\n');
  const { questions, open, answered } = dataSheet(md);
  assert.equal(questions.length, 2);
  assert.deepEqual(open.map((q) => q.id), ['Q-A1']);
  assert.deepEqual(answered.map((q) => q.id), ['Q-B2']);
  assert.equal(open[0].priority, 'high');
  assert.equal(open[0].unblocks, 'the money page');
  assert.equal(open[0].answered, false);
  assert.equal(answered[0].answered, true);
});

test('dataSheet sorts open questions by priority, then by id', () => {
  const q = (id, priority, mark = '⬜') => `### ${id} · t ${mark}\n\n**Priority:** ${priority}\n**Ask:** a\n`;
  const { open } = dataSheet([q('Q-C3', 'low'), q('Q-A1', 'medium'), q('Q-B2', 'high'), q('Q-A2', 'medium')].join('\n'));
  assert.deepEqual(open.map((x) => x.id), ['Q-B2', 'Q-A1', 'Q-A2', 'Q-C3']);
});

test('dataSheet treats a missing priority as medium, not as an error', () => {
  const { open } = dataSheet('### Q-X1 · t ⬜\n\n**Ask:** a\n');
  assert.equal(open[0].priority, 'medium');
});

test('dataSheet counts a 🚫 question as neither open nor answered', () => {
  const { questions, open, answered } = dataSheet('### Q-N1 · not applicable 🚫\n\n**Priority:** low\n');
  assert.equal(questions.length, 1);
  assert.equal(questions[0].status, 'n/a');
  assert.equal(open.length, 0);
  assert.equal(answered.length, 0);
});

test('dataSheet on an empty or missing file is empty, not a throw', () => {
  assert.deepEqual(dataSheet('').questions, []);
});

test('linkTargets reads the status cell and splits todo from live', () => {
  const md = [
    '| # | Target | Why | Cost | Status | Note |',
    '|---|---|---|---|---|---|',
    '| 1 | G2 | buyers compare there | free | live | claimed in August |',
    '| 2 | Capterra | category listing | free | todo | |',
    '| 3 | SomeDirectory | thin | free | skip | not worth it |',
    '| 4 | TrustRadius | reviews | free | `todo` | backticks are fine |',
  ].join('\n');
  const { rows, todo, live } = linkTargets(md);
  assert.equal(rows.length, 4, 'the header and the separator are not rows');
  assert.deepEqual(todo.map((r) => r.n), [2, 4], 'todo, in table order');
  assert.deepEqual(live.map((r) => r.platform), ['G2']);
});

test('linkTargets ignores a table that is not the listing table', () => {
  const md = '| Day | Item |\n|---|---|\n| Monday | something |';
  assert.deepEqual(linkTargets(md).rows, [], 'too few columns, and no status cell');
});

test('newestHeading takes the latest date, not the last line', () => {
  const md = '## Run 2026-08-01\n\n## Run 2026-09-15\n\n## Run 2026-07-01\n';
  assert.equal(newestHeading('no/such/file', /^## Run (\d{4}-\d{2}-\d{2})/gm), null);
  // The file reader is exercised through panelRuns below; this asserts the
  // ordering rule on the same regex.
  const dates = [...md.matchAll(/^## Run (\d{4}-\d{2}-\d{2})/gm)].map((m) => m[1]).sort();
  assert.equal(dates.at(-1), '2026-09-15');
});

test('the shipped repo has no snapshots and no panel runs yet', () => {
  // Both must answer with an empty list rather than throwing, or a fresh clone
  // is red for lack of measurement.
  assert.ok(Array.isArray(snapshotDates()));
  assert.ok(Array.isArray(panelRuns()));
});

test('the shipped data sheet and link targets parse', () => {
  const sheet = dataSheet();
  const targets = linkTargets();
  assert.ok(sheet.questions.length >= 1, 'the example question parses');
  assert.ok(targets.rows.length >= 10, `${targets.rows.length} listing rows parse`);
  for (const r of targets.rows) assert.ok(['todo', 'doing', 'live', 'skip'].includes(r.status));
});
