#!/usr/bin/env node
/**
 * check-voice.mjs — the quantitative rung of the anti-AI defence.
 *
 * Runs every mechanically checkable rule from src/data/voice.json over the
 * content collections: banned vocabulary (base + site, era tells included),
 * banned phrases and sentence openers, assistant residue, shape regexes, and
 * the quantitative thresholds (em-dash density, emoji, stacked bold lead-ins,
 * Title Case headings, heading-level skips, horizontal-rule count).
 *
 * It reports facts, not verdicts. Watch-listed words, hedges and crutch words
 * print as warnings — each has legitimate uses a grep cannot judge — and the
 * judgement items no script can check (compressibility, the close read aloud,
 * whether the piece could carry any company's logo) print at the end as
 * UNCHECKABLE, so a green run is never mistaken for a full pass. The full
 * standard lives in marketing/VOICE-GUIDE.md; the LLM-inference rung is the
 * ship checklist there and in the /write-content skill.
 *
 *   node scripts/check-voice.mjs                    # whole content corpus
 *   node scripts/check-voice.mjs src/content/blog/x.md   # one draft
 *
 * Fast (pure regex over markdown source), so it runs in the pre-commit hook;
 * also in npm run verify and CI, always via this one script.
 */

import { readFileSync } from 'node:fs';
import { readAll, readEntry, prose as prose_ } from './lib/content.mjs';

const V = JSON.parse(readFileSync('src/data/voice.json', 'utf8'));
const base = V.base;
const site = V.site ?? {};
const allowed = new Set((site.allowedExceptions ?? []).map((w) => (typeof w === 'string' ? w : w.word).toLowerCase()));
const quant = { ...base.quant, ...(site.quantOverrides ?? {}) };

const failWords = [
  ...base.bannedWords,
  ...Object.entries(base.eraWords ?? {}).flatMap(([k, v]) => (k.startsWith('$') ? [] : v)),
  ...(site.bannedWords ?? []),
].filter((w) => !allowed.has(w.toLowerCase()));
const failPhrases = [...base.bannedPhrases, ...(site.bannedPhrases ?? [])].filter(
  (p) => !allowed.has(p.toLowerCase())
);

/**
 * Files to check: named on the command line, else every content entry whose
 * status is published or scheduled. A SCHEDULED entry is checked because it
 * goes live on a build with nobody in the room — the drift the shared reader
 * exists to end (scripts/lib/content.mjs § who wants what). Drafts are
 * excluded: they render nowhere.
 */
const files = process.argv.length > 2
  ? process.argv.slice(2)
  : readAll({ include: ['published', 'scheduled'] }).map((e) => e.file);

let fail = 0;
let warned = 0;

for (const f of files) {
  const entry = readEntry(f);
  if (entry.status === 'draft') continue;
  const raw = entry.raw;
  // Frontmatter title/description/tldr are prose a reader (and a SERP) sees;
  // the parsed value, not the YAML, so a doubled apostrophe in a single-quoted
  // scalar is not read as two characters.
  const { body, prose } = prose_(entry);
  const lower = prose.toLowerCase();
  const words = (prose.match(/[A-Za-z’']+/g) ?? []).length;
  const problems = [];
  const warnings = [];

  // ── vocabulary and phrases (fail) ────────────────────────────────────────
  for (const w of failWords) {
    const re = new RegExp(`(?<![\\w-])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`, 'gi');
    const n = (lower.match(re) ?? []).length;
    if (n) problems.push(`banned word "${w}" ×${n}`);
  }
  for (const p of failPhrases) {
    const n = lower.split(p.toLowerCase()).length - 1;
    if (n) problems.push(`banned phrase "${p}" ×${n}`);
  }
  for (const o of base.bannedOpeners) {
    const re = new RegExp(`(?:^|[.!?]\\s+|\\n)${o.replace(',', ',?')}\\s`, 'g');
    const n = (prose.match(re) ?? []).length;
    if (n) problems.push(`banned opener "${o}" ×${n}`);
  }
  for (const r of base.assistantResidue) {
    if (raw.toLowerCase().includes(r)) problems.push(`assistant residue "${r}" — raw model output was pasted`);
  }
  for (const s of base.shapes.fail) {
    const n = (prose.match(new RegExp(s.re, 'gi')) ?? []).length;
    if (n) problems.push(`shape: ${s.label} ×${n}`);
  }

  // ── quantitative thresholds (fail) ───────────────────────────────────────
  const emDashes = (prose.match(/—/g) ?? []).length;
  // Density cap with an absolute floor of 1: a 250-word entry whose title
  // legitimately carries one em-dash (an HS heading, a compound name) must
  // not fail a per-1000 ratio that only makes sense at essay length.
  const emAllowed = Math.max(1, (words / 1000) * quant.emDashPer1000Words);
  if (emDashes > emAllowed)
    problems.push(`${emDashes} em-dashes in ${words} words (allowed ${emAllowed < 2 ? '1' : Math.floor(emAllowed)}; cap ${quant.emDashPer1000Words}/1000 with a floor of 1)`);
  const emoji = (prose.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu) ?? []).length;
  if (emoji > quant.maxEmoji) problems.push(`${emoji} emoji (cap ${quant.maxEmoji})`);

  const lines = body.split('\n');
  let run = 0;
  let maxRun = 0;
  for (const line of lines) {
    // Only the COLON shape counts: "**Clarity:** keep it clear" is the
    // machine tell. "**Applicant.** The importer." is a definition list — a
    // table in list form, bold as the scanning aid the voice guide sanctions.
    if (/^\s*(?:[-*+]|\d+\.)\s+\*\*[^*]+:\*\*/.test(line) || /^\s*(?:[-*+]|\d+\.)\s+\*\*[^*]+\*\*:/.test(line) || /^\*\*[^*]+:\*\*/.test(line)) {
      run += 1;
      maxRun = Math.max(maxRun, run);
    } else if (line.trim() !== '') run = 0;
  }
  if (maxRun > quant.maxConsecutiveBoldLeadIns)
    problems.push(`${maxRun} consecutive bold-lead-in list items (cap ${quant.maxConsecutiveBoldLeadIns}) — the loudest machine tell; write prose or a plain list`);

  const proseLines = lines.filter((l) => l.trim() && !/^#|^```|^\s*[-*+>|]|^\d+\./.test(l));
  const boldLines = proseLines.filter((l) => l.includes('**')).length;
  if (proseLines.length >= 10 && boldLines / proseLines.length > quant.maxBoldProseLineRatio)
    warnings.push(`bold on ${boldLines}/${proseLines.length} prose lines — bold is a scanning aid for the term a reader will search, not emphasis`);

  const hrs = lines.filter((l) => /^\s*(?:---+|\*\*\*+|___+)\s*$/.test(l)).length;
  if (hrs > quant.maxHorizontalRules) problems.push(`${hrs} horizontal rules (cap ${quant.maxHorizontalRules})`);

  const STOP = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'is', 'of', 'on', 'or', 'the', 'to', 'vs', 'with']);
  let prevLevel = 0;
  for (const line of lines) {
    const h = line.match(/^(#{2,6})\s+(.*)$/);
    if (!h) continue;
    const level = h[1].length;
    if (prevLevel && level > prevLevel + 1)
      problems.push(`heading level skips h${prevLevel} → h${level}: "${h[2].trim()}"`);
    prevLevel = level;
    if (!quant.allowTitleCaseHeadings) {
      const ws = h[2].replace(/[`*_]/g, '').split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
      const caps = ws.filter((w) => /^[A-Z]/.test(w) && !STOP.has(w.toLowerCase()));
      // >=4 capitalised non-stop words: a heading like "What is a Bill of
      // Entry?" carries a 3-word proper noun and is fine; real Title Case
      // capitalises everything and runs longer.
      if (ws.length >= 3 && caps.length === ws.filter((w) => !STOP.has(w.toLowerCase())).length && caps.length >= 4)
        problems.push(`Title Case heading "${h[2].trim()}" — sentence case below the h1`);
    }
  }

  // ── watch-tier (warn: legitimate uses exist; density is the signal) ──────
  for (const [label, list] of [['watch', base.watchWords], ['hedge', base.hedges], ['crutch', base.crutch]]) {
    const hits = [];
    for (const w of list) {
      if (allowed.has(w) || (site.keepWords ?? []).includes(w)) continue;
      const re = new RegExp(`(?<![\\w-])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`, 'g');
      const n = (lower.match(re) ?? []).length;
      if (n) hits.push(`${w}×${n}`);
    }
    if (hits.length) warnings.push(`${label} words: ${hits.join(', ')}`);
  }
  for (const s of base.shapes.warn) {
    const n = (prose.match(new RegExp(s.re, 'gi')) ?? []).length;
    if (n) warnings.push(`shape: ${s.label} ×${n}`);
  }

  if (problems.length) {
    fail = 1;
    console.log(`FAIL ${f}`);
    for (const p of problems) console.log(`   ${p}`);
  }
  if (warnings.length) {
    warned = 1;
    console.log(`warn ${f}`);
    for (const w of warnings) console.log(`   ${w}`);
  }
}

if (!fail) console.log(`ok: ${files.length} file(s), no mechanical voice failures${warned ? ' (warnings above are judgement calls, not passes)' : ''}`);
console.log(`
UNCHECKABLE by this script — the judgement half of the standard
(marketing/VOICE-GUIDE.md; a clean run here is NOT a full pass):
  - Could the close fit any company on earth? Read it aloud.
  - Blank a load-bearing word in any sentence: could a stranger guess it?
  - Does every number trace to a source in the Sources block?
  - Is the proprietary claim real — a field note, a finding, verified data?
  - Summarise each paragraph in one line; a paragraph you cannot, goes.`);
process.exit(fail);
