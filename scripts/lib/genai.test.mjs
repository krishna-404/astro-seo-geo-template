/**
 * The CSV reader and the prompt-shape proxy. The CSV parser is the whole door
 * the Generative AI report comes through — Search Console's export quotes
 * fields, doubles quotes inside them, uses CRLF and leads with a BOM, and a
 * parser that mishandles any of those reports fewer impressions than the site
 * actually earned, silently.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, isPromptShaped } from './genai.mjs';

test('parseCsv reads plain rows', () => {
  assert.deepEqual(parseCsv('a,b\nc,d'), [['a', 'b'], ['c', 'd']]);
});

test('parseCsv keeps a comma inside a quoted field', () => {
  assert.deepEqual(parseCsv('"Smith, John",2'), [['Smith, John', '2']]);
});

test('parseCsv reads a doubled quote as one quote', () => {
  assert.deepEqual(parseCsv('"say ""hi""",1'), [['say "hi"', '1']]);
});

test('parseCsv handles CRLF line endings', () => {
  assert.deepEqual(parseCsv('a,b\r\nc,d\r\n'), [['a', 'b'], ['c', 'd']]);
});

test('parseCsv strips a leading BOM from the first field', () => {
  const rows = parseCsv('﻿Page,Impressions\n/x,4');
  assert.equal(rows[0][0], 'Page', 'a BOM left in place makes the header unmatchable');
});

test('parseCsv drops entirely empty rows', () => {
  assert.deepEqual(parseCsv('a,b\n\n,\nc,d'), [['a', 'b'], ['c', 'd']]);
});

test('parseCsv keeps an empty trailing field', () => {
  assert.deepEqual(parseCsv('a,'), [['a', '']]);
});

test('isPromptShaped: eight or more words is a prompt', () => {
  assert.ok(isPromptShaped('how do i work out what a container costs per day'));
});

test('isPromptShaped: a question mark is a prompt at any length', () => {
  assert.ok(isPromptShaped('what is demurrage?'));
});

test('isPromptShaped: a five-word question word opening is a prompt', () => {
  assert.ok(isPromptShaped('how does demurrage billing actually work'));
});

test('isPromptShaped: a conversational marker is a prompt', () => {
  assert.ok(isPromptShaped('compare the two cheapest options'));
  assert.ok(isPromptShaped('best tracker for my fleet'));
});

test('isPromptShaped: a short keyword query is not a prompt', () => {
  assert.equal(isPromptShaped('demurrage calculator'), false);
  assert.equal(isPromptShaped('freight software pricing'), false);
});

test('isPromptShaped: a four-word question opening is still a keyword', () => {
  assert.equal(isPromptShaped('what is demurrage'), false, 'under five words, no question mark');
});
