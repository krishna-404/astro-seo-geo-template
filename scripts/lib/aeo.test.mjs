/**
 * The answer-engine funnel's scoring. Three properties are the whole reason
 * this module exists and every one of them is a judgement that would be easy to
 * "simplify" away:
 *
 *   an unmeasured stage scores null and never enters the mean (null is not zero)
 *   a REFUSED crawler caps stage 1 at 40, because a WAF block is the finding
 *   a proxy-scored stage 4 caps at 60, because a proxy may not read as STRONG
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aeoReport, band } from './aeo.mjs';

const at = (r, key) => r.stages.find((s) => s.key === key);

test('band draws the three lines, and null is n/a', () => {
  assert.equal(band(null), 'n/a');
  assert.equal(band(0), 'CRITICAL');
  assert.equal(band(39), 'CRITICAL');
  assert.equal(band(40), 'WEAK');
  assert.equal(band(74), 'WEAK');
  assert.equal(band(75), 'STRONG');
  assert.equal(band(100), 'STRONG');
});

test('with no data at all every stage is null and the overall is null', () => {
  const r = aeoReport({ site: 'example.com' });
  assert.equal(r.overall, null, 'no data is not a score of zero');
  for (const s of r.stages) assert.equal(s.score, null, `${s.key} is unmeasured`);
});

test('an unmeasured stage is excluded from the mean, not counted as zero', () => {
  // One stage measured at 100, the rest unmeasured. The mean must be 100.
  const r = aeoReport({
    site: 'example.com',
    generativeAi: { referrals: [{ assistant: 'chatgpt.com', visitors: 50 }] },
  });
  assert.equal(at(r, 'followed').score, 100);
  assert.equal(at(r, 'reachable').score, null);
  assert.equal(r.overall, 100, 'averaging over the nulls would have given 20');
});

test('a refused answering agent caps stage 1 at 40 and raises a blocker', () => {
  const r = aeoReport({
    site: 'example.com',
    cloudflare: {
      aiCrawlers: {
        daysCovered: 7,
        agents: [
          { agent: 'Googlebot', role: 'index', ok: 900, refused: 0, failed: 0, notFound: 0 },
          { agent: 'OAI-SearchBot', role: 'index', ok: 90, refused: 10, failed: 0, notFound: 0 },
        ],
      },
    },
  });
  const s = at(r, 'reachable');
  assert.ok(s.score <= 40, `capped at 40, got ${s.score}`);
  assert.equal(s.band, 'WEAK');
  // A refusal is a named blocker, not just a low number.
  assert.ok(r.blockers.some((b) => /OAI-SearchBot/.test(b)), r.blockers.join(' | '));
  assert.match(s.evidence, /REFUSED/);
});

test('with nothing refused stage 1 scores the served share', () => {
  const r = aeoReport({
    site: 'example.com',
    cloudflare: {
      aiCrawlers: { daysCovered: 7, agents: [{ agent: 'Googlebot', role: 'index', ok: 100, refused: 0, failed: 0, notFound: 0 }] },
    },
  });
  assert.equal(at(r, 'reachable').score, 100);
  assert.ok(!r.blockers.some((b) => /REFUS|refusing/i.test(b)), 'nothing refused, so no refusal blocker');
});

test('a 404 to a crawler is link rot, not a block: it does not drag stage 1 down', () => {
  const r = aeoReport({
    site: 'example.com',
    cloudflare: {
      aiCrawlers: { daysCovered: 7, agents: [{ agent: 'Googlebot', role: 'index', ok: 100, refused: 0, failed: 0, notFound: 40 }] },
    },
  });
  assert.equal(at(r, 'reachable').score, 100, 'a 404 costs one URL, not the site’s place in an index');
  assert.match(at(r, 'reachable').evidence, /404/, 'but it is still reported');
});

test('a training-only crawler does not count toward the answering stages', () => {
  const r = aeoReport({
    site: 'example.com',
    cloudflare: { aiCrawlers: { daysCovered: 7, agents: [{ agent: 'CCBot', role: 'train', ok: 500, refused: 0, failed: 0, notFound: 0 }] } },
  });
  assert.equal(at(r, 'reachable').score, null, 'no answering agent reached the edge');
});

test('stage 4 from the proxy alone is capped at 60 and says it is a proxy', () => {
  const r = aeoReport({
    site: 'example.com',
    // No exportDate: the module must fall back to the prompt-shaped proxy,
    // which it reads as an ARRAY of rows.
    generativeAi: {
      exportDate: null,
      total: 0,
      promptShaped: Array.from({ length: 40 }, (_, i) => ({ query: `how do i do the thing number ${i} exactly`, impressions: 900 })),
    },
    searchConsole: { queries: [] },
  });
  const s = at(r, 'shown');
  assert.notEqual(s.score, null, 'the proxy scored it');
  assert.ok(s.score <= 60, `a proxy may not read as STRONG, got ${s.score}`);
  assert.notEqual(s.band, 'STRONG');
  assert.match(s.evidence, /PROXY/, 'and it says so in the evidence');
  assert.notEqual(s.automatic, true, 'stage 4 is never fully automatic in Sep 2026');
  assert.ok(s.manual, 'and it names what a human has to do');
});

test('the focus is the HIGHEST stage under its bar, not the lowest score', () => {
  const r = aeoReport({
    site: 'example.com',
    // Stage 1 weak (a refusal), stage 5 at zero. Stage 1 must win.
    cloudflare: {
      aiCrawlers: { daysCovered: 7, agents: [{ agent: 'OAI-SearchBot', role: 'index', ok: 10, refused: 90, failed: 0, notFound: 0 }] },
    },
    generativeAi: { referrals: [] },
  });
  assert.equal(r.focus.stage, 'reachable', 'a blocked site does not need more content');
});

test('levers are carried but never enter the mean', () => {
  const r = aeoReport({
    site: 'example.com',
    generativeAi: { referrals: [{ assistant: 'chatgpt.com', visitors: 50 }] },
    levers: [{ name: 'Made-up lever', score: 0, evidence: 'zero on purpose', band: 'CRITICAL' }],
  });
  assert.equal(r.levers.length, 1);
  assert.equal(r.overall, 100, 'a lever at 0 must not move the funnel’s number');
});

test('manualSteps names every stage that is not fully automatic', () => {
  const r = aeoReport({ site: 'example.com' });
  const keys = r.manualSteps.map((m) => m.stage);
  for (const k of ['reachable', 'ingested', 'indexed', 'shown', 'followed']) {
    assert.ok(keys.includes(k), `${k} is unmeasured here, so it needs a human`);
  }
});
