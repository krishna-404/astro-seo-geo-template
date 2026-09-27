/**
 * The SERP clamp. One implementation, three callers (BaseLayout renders it,
 * the posts API refuses on it, check-source-rules refuses on it), so one test
 * covers all three — which is the whole reason src/lib/clamp.mjs exists.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampTitle, survivesClamp, CLAMP_MAX } from '../../src/lib/clamp.mjs';

test('CLAMP_MAX is the SERP budget', () => {
  assert.equal(CLAMP_MAX, 60);
});

test('a title inside the budget is untouched', () => {
  const t = 'Core Web Vitals: the three metrics and the budget';
  assert.equal(clampTitle(t), t);
  assert.ok(survivesClamp(t));
});

test('a title exactly at the budget is untouched', () => {
  const t = 'x'.repeat(60);
  assert.equal(clampTitle(t), t);
  assert.ok(survivesClamp(t));
});

test('an em-dash clause starting inside the budget is dropped whole', () => {
  const t = 'What demurrage costs an importer — the numbers, per day, per box';
  assert.ok(t.length > CLAMP_MAX);
  assert.equal(clampTitle(t), 'What demurrage costs an importer');
  assert.ok(survivesClamp(t), 'a droppable clause is not a hard cut');
});

test('a pipe clause starting inside the budget is dropped whole', () => {
  const t = 'About Example Co | freight forwarding software for mid-size forwarders';
  assert.ok(t.length > CLAMP_MAX);
  assert.equal(clampTitle(t), 'About Example Co');
  assert.ok(survivesClamp(t));
});

test('an em-dash clause starting AFTER the budget cannot save the title', () => {
  // The clause begins at 68, so dropping it still leaves 68 characters.
  const t = `${'a'.repeat(68)} — tail`;
  assert.ok(!survivesClamp(t));
  assert.ok(clampTitle(t).length <= CLAMP_MAX);
});

test('with no droppable clause the title is hard-cut at a word boundary', () => {
  const t = 'A promise about your shipments that runs well past the SERP budget line';
  assert.ok(!survivesClamp(t), 'this is the defect the check exists to catch');
  const cut = clampTitle(t);
  assert.ok(cut.length <= CLAMP_MAX);
  assert.ok(!cut.endsWith(' '), 'no trailing space');
  assert.ok(t.startsWith(cut), 'the cut is a prefix of the original');
  assert.ok(!cut.includes('…'), 'never adds an ellipsis — Google adds its own');
});

test('a single word longer than the budget is cut without a boundary', () => {
  const t = 'z'.repeat(80);
  assert.equal(clampTitle(t), 'z'.repeat(60));
});
