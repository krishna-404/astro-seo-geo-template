/**
 * The crawler registry. Two properties matter and both are invisible in
 * review: the ORDER of the array (a reordering silently reclassifies live
 * fetches as training, because the vendor tokens are substrings of each other),
 * and the fact that a robots OPT-OUT TOKEN must never match a user-agent — it
 * never appears as one, so a match would invent traffic that does not exist.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, CRAWLERS, ROBOTS_AGENTS, SMOKE_AGENTS, ANSWERING_ROLES } from './crawlers.mjs';

test('the specific token wins over the general one', () => {
  // ClaudeBot is training; Claude-SearchBot builds the index Claude answers
  // from. Sorting the array alphabetically would swap these two answers.
  assert.equal(classify('Mozilla/5.0 (compatible; Claude-SearchBot/1.0)').role, 'index');
  assert.equal(classify('Mozilla/5.0 (compatible; Claude-User/1.0)').role, 'live');
  assert.equal(classify('Mozilla/5.0 (compatible; ClaudeBot/1.0)').role, 'train');
});

test('OpenAI’s three agents classify to three different roles', () => {
  assert.equal(classify('OAI-SearchBot/1.0').role, 'index');
  assert.equal(classify('ChatGPT-User/1.0').role, 'live');
  assert.equal(classify('GPTBot/1.2').role, 'train');
});

test('a robots opt-out token never matches a user-agent', () => {
  for (const c of CRAWLERS.filter((x) => x.token)) {
    assert.equal(classify(`Mozilla/5.0 (compatible; ${c.agent}/1.0)`), null, `${c.agent} is a token, not a crawler`);
  }
});

test('Google-Extended is a token and Googlebot is not', () => {
  assert.equal(classify('Google-Extended'), null);
  assert.equal(classify('Googlebot/2.1').engine, 'Google');
});

test('an ordinary browser is not a crawler', () => {
  assert.equal(classify('Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Safari/605.1.15'), null);
  assert.equal(classify(''), null);
  assert.equal(classify(undefined), null);
});

test('every row carries the fields the readers use', () => {
  for (const c of CRAWLERS) {
    assert.ok(c.re instanceof RegExp, `${c.agent} has a regex`);
    assert.equal(typeof c.agent, 'string');
    assert.equal(typeof c.engine, 'string');
    assert.ok(['index', 'live', 'train'].includes(c.role), `${c.agent} role is one of the three`);
  }
});

test('ROBOTS_AGENTS names every row, tokens included', () => {
  assert.equal(ROBOTS_AGENTS.length, CRAWLERS.length);
  assert.ok(ROBOTS_AGENTS.includes('Google-Extended'), 'the opt-out tokens belong in robots.txt');
});

test('SMOKE_AGENTS covers only answering agents, with a real user-agent each', () => {
  for (const [agent, ua] of Object.entries(SMOKE_AGENTS)) {
    const row = CRAWLERS.find((c) => c.agent === agent);
    assert.ok(row, `${agent} is in the registry`);
    assert.ok(ANSWERING_ROLES.has(row.role), `${agent} can put the site inside an answer`);
    assert.equal(row.token, undefined, `${agent} is a crawler, not a token`);
    assert.ok(ua.includes(agent) || ua.toLowerCase().includes(agent.toLowerCase()), `${agent}'s string names it`);
    assert.ok(/\+(https?:\/\/|\S+@)/.test(ua), `${agent}'s string is identifiable`);
    assert.equal(classify(ua).agent, agent, `${agent}'s own string classifies back to it`);
  }
});

test('the five load-bearing indexes have a live edge check', () => {
  for (const agent of ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot']) {
    assert.ok(SMOKE_AGENTS[agent], `${agent} is checked at the edge`);
  }
});
