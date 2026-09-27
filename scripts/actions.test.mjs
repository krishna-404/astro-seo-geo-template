/**
 * The ACTIONS check kinds. The format of marketing/ACTIONS.md is load-bearing
 * (the session-start hook, the cadence report and `--update` all read it), and
 * every check kind here is a claim about the world that flips an item back to
 * open by itself. A kind that silently answers "done" is worse than none: the
 * owner stops looking.
 *
 * The date-sensitive kinds are exercised through their own inputs (a Done line,
 * an Expires header) rather than by touching the repo, so the suite does not
 * depend on when it runs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluate, parse } from './actions.mjs';

const DAY = 864e5;
const daysAgo = (n) => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);
const item = (check, done = '') => ({ check, done });

/* ------------------------------------------------------------------ manual */

test('manual: never done until the owner writes a date', () => {
  assert.equal(evaluate(item('manual')).done, false);
  assert.equal(evaluate(item('manual', 'ticked 2026-09-01')).done, true);
});

test('manual:N goes stale on its own', () => {
  assert.equal(evaluate(item('manual:7', daysAgo(2))).done, true, 'fresh');
  assert.equal(evaluate(item('manual:7', daysAgo(30))).done, false, 'stale — it flips back by itself');
  assert.match(evaluate(item('manual:7', daysAgo(30))).note, /limit 7/);
});

test('manual:N with no date yet says how often it is due', () => {
  const r = evaluate(item('manual:31'));
  assert.equal(r.done, false);
  assert.match(r.note, /every 31 days/);
});

/* --------------------------------------------------------------------- env */

test('env: every named variable must be set', () => {
  assert.equal(evaluate(item('env:PATH')).done, true);
  assert.equal(evaluate(item('env:PATH+DEFINITELY_NOT_SET_XYZ')).done, false);
  assert.match(evaluate(item('env:DEFINITELY_NOT_SET_XYZ')).note, /DEFINITELY_NOT_SET_XYZ/);
});

test('env: the | form passes when either group is satisfied', () => {
  // A-K03: a bearer token, OR a username and password.
  assert.equal(evaluate(item('env:NOPE_A+NOPE_B|PATH')).done, true);
  assert.equal(evaluate(item('env:PATH|NOPE_A')).done, true);
  const r = evaluate(item('env:NOPE_A|NOPE_B+NOPE_C'));
  assert.equal(r.done, false);
  assert.match(r.note, /needs NOPE_A or NOPE_B \+ NOPE_C/, 'the note spells out the alternatives');
});

/* ----------------------------------------------------------- file and grep */

test('file: the file exists', () => {
  assert.equal(evaluate(item('file:package.json')).done, true);
  assert.equal(evaluate(item('file:no/such/file')).done, false);
});

test('grep and nogrep are exact opposites on the same input', () => {
  assert.equal(evaluate(item('grep:package.json:astro-website-template')).done, true);
  assert.equal(evaluate(item('nogrep:package.json:astro-website-template')).done, false);
  assert.equal(evaluate(item('grep:package.json:a-string-not-in-there-xyz')).done, false);
  assert.equal(evaluate(item('nogrep:package.json:a-string-not-in-there-xyz')).done, true);
});

test('grep on a missing file reads as no match, not a crash', () => {
  assert.equal(evaluate(item('grep:no/such/file:anything')).done, false);
});

/* ---------------------------------------------------------------- freshness */

test('entries: reads the newest ## YYYY-MM-DD heading in a file', () => {
  // marketing/field-notes.md ships with no dated entries.
  const r = evaluate(item('entries:marketing/field-notes.md:31'));
  assert.equal(r.done, false);
  assert.match(r.note, /none yet/);
});

test('fresh: a directory with no dated file is not fresh', () => {
  const r = evaluate(item('fresh:marketing/insights/genai:7'));
  assert.equal(r.done, false);
  assert.match(r.note, /none yet/);
});

test('snapshot and panel report "none yet" rather than zero days old', () => {
  for (const kind of ['snapshot:7', 'panel:35']) {
    const r = evaluate(item(kind));
    assert.equal(r.done, false);
    assert.match(r.note, /none yet/, kind);
  }
});

/* ------------------------------------------------------------ the one-offs */

test('securitytxt: more than 30 days left passes, less fails', () => {
  // Read from the shipped file, then reasoned about against its own Expires.
  const raw = readFileSync('public/.well-known/security.txt', 'utf8');
  const expires = raw.match(/^Expires:\s*(\S+)/m)?.[1];
  assert.ok(expires, 'the file carries an Expires line');
  const left = Math.floor((new Date(expires).getTime() - Date.now()) / DAY);
  assert.equal(evaluate(item('securitytxt')).done, left > 30);
  assert.match(evaluate(item('securitytxt')).note, /expires/);
});

test('origin: fails while the template still says example.com', () => {
  const r = evaluate(item('origin'));
  const isTemplate = readFileSync('src/data/origin.mjs', 'utf8').includes('example.com');
  assert.equal(r.done, !isTemplate);
});

test('indexnow: no key file whose body equals its name', () => {
  // public/llms-full.txt matches the filename pattern; its body does not match
  // its name, which is the real filter.
  const r = evaluate(item('indexnow'));
  assert.equal(r.done, false);
  assert.match(r.note, /body equals its name/);
});

test('datasheet, linktargets and social read their files', () => {
  assert.match(evaluate(item('datasheet')).note, /open question|no open questions/);
  assert.match(evaluate(item('linktargets')).note, /todo|claimed/);
  assert.match(evaluate(item('social')).note, /unposted|empty/);
});

test('placeholders: the template ships with placeholders, by design', () => {
  const r = evaluate(item('placeholders'));
  assert.equal(r.done, false);
  assert.match(r.note, /carry placeholders/);
});

test('an unknown check kind answers null, never true', () => {
  const r = evaluate(item('teleportation:3'));
  assert.equal(r.done, null);
  assert.match(r.note, /unknown check kind/);
});

/* ------------------------------------------------------------------- parse */

test('parse reads every item in the shipped ACTIONS.md', () => {
  const items = parse(readFileSync('marketing/ACTIONS.md', 'utf8'));
  assert.ok(items.length > 20, `${items.length} items parsed`);
  for (const it of items) {
    assert.match(it.id, /^A-[A-Za-z0-9]+$/);
    assert.ok(it.title.length > 3, `${it.id} has a title`);
    assert.ok(it.check.length > 0, `${it.id} declares a Check`);
    assert.ok(['launch', 'keys', 'daily', 'weekly', 'monthly', 'quarterly', 'annual'].includes(it.phase), `${it.id} phase: ${it.phase}`);
  }
});

test('every check kind in ACTIONS.md is one this script knows', () => {
  const items = parse(readFileSync('marketing/ACTIONS.md', 'utf8'));
  for (const it of items) {
    const r = evaluate(it);
    assert.ok(!/unknown check kind/.test(r.note), `${it.id} uses "${it.check}"`);
  }
});

test('ids are unique', () => {
  const ids = parse(readFileSync('marketing/ACTIONS.md', 'utf8')).map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
});
