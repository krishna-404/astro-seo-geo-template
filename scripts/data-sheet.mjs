#!/usr/bin/env node
/*
 * data-sheet.mjs — surface what the engine is waiting on a human for.
 *
 *   node scripts/data-sheet.mjs              # human-readable, for a session
 *   node scripts/data-sheet.mjs --markdown   # the block the cadence report embeds
 *   node scripts/data-sheet.mjs --json       # machine-readable
 *   node scripts/data-sheet.mjs --limit 3    # how many of each to show
 *
 * Two sources, both hand-edited markdown so the owner can answer in place:
 *
 *   marketing/DATA-SHEET.md    open questions   (### Q-xx · title ⬜)
 *   marketing/link-targets.md  listing targets  (table rows with a status cell)
 *
 * WHY. A content engine that runs unattended hits things only a human knows —
 * a rate, a permission, whether an account exists — and "blocked on X" said
 * in one run's report is lost by the next. The data sheet is where those
 * questions live, ranked by what they unblock; this script prints the open
 * ones at session start (.claude/settings.json SessionStart hook) and inside
 * the cadence report, so the ask is answerable from an email without opening
 * the repo.
 *
 * Read-only. It never edits either file — an answer is moved to facts.json or
 * the relevant data file by a human or a session, deliberately, with a source.
 * This script only asks. It exits 0 even when both files are missing, so a
 * fresh clone is never red for lack of questions.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_URL } from '../src/data/origin.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHEET = join(ROOT, 'marketing/DATA-SHEET.md');
const TARGETS = join(ROOT, 'marketing/link-targets.md');
const SITE = new URL(SITE_URL).host;

const args = process.argv.slice(2);
const AS_JSON = args.includes('--json');
const AS_MD = args.includes('--markdown');
const limitArg = args.indexOf('--limit');
const LIMIT = limitArg > -1 ? Number(args[limitArg + 1]) || 3 : 3;

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function read(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

/** Parse `### Q-A1 · Title ⬜` blocks out of the data sheet. */
function parseQuestions(md) {
  const out = [];
  // Split on the question headings, keeping each heading with its body.
  const parts = md.split(/^### (?=Q-)/m).slice(1);
  for (const part of parts) {
    const firstLine = part.slice(0, part.indexOf('\n'));
    const m = firstLine.match(/^(Q-[A-Za-z0-9]+)\s*·\s*(.*?)\s*(⬜|✅|🚫)\s*$/);
    if (!m) continue;
    const [, id, title, mark] = m;
    const body = part.slice(firstLine.length);
    const field = (name) => {
      const f = body.match(new RegExp(`\\*\\*${name}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*|\\n---|$)`));
      return f ? f[1].trim().replace(/\s+/g, ' ') : '';
    };
    const priorityRaw = field('Priority').toLowerCase();
    const priority = ['high', 'medium', 'low'].find((p) => priorityRaw.startsWith(p)) ?? 'medium';
    out.push({
      id,
      title,
      status: mark === '⬜' ? 'open' : mark === '✅' ? 'answered' : 'n/a',
      priority,
      unblocks: field('Unblocks'),
      ask: field('Ask'),
      answered: field('Answer').length > 0,
    });
  }
  return out;
}

/** Parse the link-target tables. Any row whose status cell is a known state. */
function parseTargets(md) {
  const out = [];
  const STATES = new Set(['todo', 'doing', 'live', 'skip']);
  for (const line of md.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 6) continue;
    const [num, platform, why, cost, status, note] = cells;
    if (!STATES.has((status ?? '').toLowerCase())) continue;
    out.push({
      n: Number(num) || 0,
      platform: platform ?? '',
      why: why ?? '',
      cost: cost ?? '',
      status: (status ?? '').toLowerCase(),
      note: note ?? '',
    });
  }
  return out;
}

const questions = parseQuestions(read(SHEET));
const targets = parseTargets(read(TARGETS));

const open = questions
  .filter((q) => q.status === 'open')
  .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.id.localeCompare(b.id));
const todo = targets.filter((t) => t.status === 'todo').sort((a, b) => a.n - b.n);
const live = targets.filter((t) => t.status === 'live');

const summary = {
  questions: { total: questions.length, open: open.length, answered: questions.length - open.length },
  linkTargets: { total: targets.length, todo: todo.length, live: live.length },
  nextQuestions: open.slice(0, LIMIT),
  nextTargets: todo.slice(0, LIMIT),
};

if (AS_JSON) {
  console.log(JSON.stringify(summary, null, 2));
} else if (AS_MD) {
  const lines = [];
  lines.push('### What I need from you');
  lines.push('');
  if (open.length === 0) {
    lines.push('Nothing open in the data sheet. Every question has an answer.');
  } else {
    lines.push(
      `${open.length} open question${open.length === 1 ? '' : 's'} in \`marketing/DATA-SHEET.md\`. ` +
        `The ${Math.min(LIMIT, open.length)} that unblock the most:`
    );
    lines.push('');
    for (const q of summary.nextQuestions) {
      lines.push(`**${q.id} — ${q.title}**  `);
      lines.push(`${q.ask}  `);
      lines.push(`_Unblocks: ${q.unblocks}_`);
      lines.push('');
    }
  }
  lines.push('### Where to list the site next');
  lines.push('');
  if (todo.length === 0) {
    lines.push('Every target in `marketing/link-targets.md` is claimed or deliberately skipped.');
  } else {
    lines.push(
      `${live.length} of ${targets.length} claimed. Next ${Math.min(LIMIT, todo.length)}, in order:`
    );
    lines.push('');
    for (const t of summary.nextTargets) {
      lines.push(`${t.n}. **${t.platform}** (${t.cost}) — ${t.why}`);
    }
    lines.push('');
    lines.push(
      'Each is a human job: an account, an email and usually a phone number. ' +
        'Tick a row off in `marketing/link-targets.md` and this list stops asking.'
    );
  }
  console.log(lines.join('\n'));
} else {
  const bar = '─'.repeat(64);
  console.log(`\n${bar}`);
  console.log(`  ${SITE} — what the engine is waiting on`);
  console.log(bar);
  console.log(
    `\n  Data sheet:    ${open.length} open of ${questions.length}` +
      `      marketing/DATA-SHEET.md`
  );
  console.log(
    `  Link targets:  ${todo.length} to claim of ${targets.length}` +
      `   marketing/link-targets.md`
  );
  if (open.length) {
    console.log('\n  Top open questions:');
    for (const q of summary.nextQuestions) {
      console.log(`    ${q.id} [${q.priority}] ${q.title}`);
      console.log(`         unblocks: ${q.unblocks.slice(0, 90)}`);
    }
  }
  if (todo.length) {
    console.log('\n  Next to list on:');
    for (const t of summary.nextTargets) console.log(`    ${t.n}. ${t.platform} — ${t.cost}`);
  }
  console.log(`\n${bar}\n`);
}
