#!/usr/bin/env node
/*
 * actions.mjs — the owner's action checklist, verified on every run.
 *
 *   node scripts/actions.mjs              # what is open, grouped by phase
 *   node scripts/actions.mjs --update     # rewrite the status marks in ACTIONS.md
 *   node scripts/actions.mjs --markdown   # the block the cadence report embeds
 *   node scripts/actions.mjs --json
 *   node scripts/actions.mjs --phase weekly
 *
 * WHY. Most of what a content engine cannot do is a human's job — give a
 * script a key, click a dashboard, export a report, claim a listing — and a
 * to-do that lives in one report's email is forgotten by the next. So the
 * actions live in marketing/ACTIONS.md, every one that CAN be checked
 * mechanically is checked here on every run (a key that vanished from the
 * environment, an export that went stale, a panel that was not run this
 * month all flip back to open by themselves), and the ones that cannot are
 * ticked by the owner writing a date under **Done:**. `--update` writes the
 * marks back so the file is the ledger, not a person's memory.
 *
 * WHAT IT NEVER DOES. It never ticks a `manual` item — that is the owner's
 * word, not the script's. It never deletes an item. It exits 0 with open
 * items (the report carries them); it exits 2 only when ACTIONS.md is
 * malformed, because a checklist nobody can parse is worse than none.
 *
 * Check kinds (the `**Check:**` field):
 *   manual            owner ticks once (a date under Done)
 *   manual:N          owner re-ticks every N days; the Done date decides
 *   env:VAR[+VAR2]    every named variable is set in THIS environment
 *   origin            src/data/origin.mjs is not example.com
 *   placeholders      the SETUP placeholder grep is clean
 *   grep:<file>:<re>  the regex matches the file (case-insensitive)
 *   nogrep:<file>:<re> the regex does NOT match the file
 *   file:<path>       the file exists
 *   fresh:<dir>:<N>   newest file/folder named with YYYY-MM-DD in <dir> is ≤ N days old
 *   entries:<file>:<N> newest `## YYYY-MM-DD` heading in <file> is ≤ N days old
 *   snapshot:<N>      newest marketing/insights/YYYY-MM-DD.json is ≤ N days old
 *   panel:<N>         newest `## Run YYYY-MM-DD` in marketing/ai-panel.md is ≤ N days old
 *   securitytxt       public/.well-known/security.txt Expires is > 30 days away
 *   indexnow          a public/<32-hex>.txt whose body equals its name exists
 *   datasheet         no ⬜ question in marketing/DATA-SHEET.md
 *   linktargets       no `todo` row in marketing/link-targets.md
 *   social            no `status: unposted` entry in marketing/social-queue.md
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'marketing/ACTIONS.md');
const args = process.argv.slice(2);
const AS_JSON = args.includes('--json');
const AS_MD = args.includes('--markdown');
const UPDATE = args.includes('--update');
const phaseArg = args.indexOf('--phase');
const PHASE = phaseArg > -1 ? args[phaseArg + 1] : null;

const DAY = 864e5;
const today = new Date().toISOString().slice(0, 10);
const ageDays = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
const read = (p) => (existsSync(join(ROOT, p)) ? readFileSync(join(ROOT, p), 'utf8') : '');
const PHASES = ['launch', 'keys', 'daily', 'weekly', 'monthly', 'quarterly', 'annual'];

/* ------------------------------------------------------------------ parse */

function parse(md) {
  const items = [];
  const parts = md.split(/^(?=### A-)/m).slice(1);
  for (const part of parts) {
    const head = part.slice(0, part.indexOf('\n'));
    const m = head.match(/^### (A-[A-Za-z0-9]+)\s*·\s*(.*?)\s*(⬜|✅|🚫)\s*$/);
    if (!m) continue;
    const body = part.slice(head.length);
    const field = (name) => {
      const f = body.match(new RegExp(`\\*\\*${name}:\\*\\*[ \\t]*([^\\n]*)`));
      return f ? f[1].trim() : '';
    };
    items.push({
      id: m[1],
      title: m[2],
      mark: m[3],
      phase: field('Phase').toLowerCase() || 'launch',
      check: field('Check'),
      why: field('Why'),
      how: field('How'),
      done: field('Done'),
    });
  }
  return items;
}

/* ----------------------------------------------------------------- checks */

/** Newest YYYY-MM-DD found in file/folder names under dir (or mtime fallback). */
function newestDated(dir) {
  const p = join(ROOT, dir);
  if (!existsSync(p)) return null;
  let best = null;
  for (const name of readdirSync(p)) {
    if (name === 'README.md') continue;
    const d = name.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? statSync(join(p, name)).mtime.toISOString().slice(0, 10);
    if (!best || d > best) best = d;
  }
  return best;
}
const newestHeading = (file, re) => {
  const dates = [...read(file).matchAll(re)].map((m) => m[1]).sort();
  return dates.at(-1) ?? null;
};

/**
 * Returns { done: boolean|null, note: string }. `null` = the script cannot
 * tell (manual items) and the Done date decides.
 */
function evaluate(item) {
  const c = item.check;
  const [kind, ...rest] = c.split(':');
  const arg = rest.join(':');
  const doneDate = item.done.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
  const fresh = (date, days, what) => {
    if (!date) return { done: false, note: `${what}: none yet` };
    const age = ageDays(date);
    return { done: age <= days, note: `${what}: ${date} (${age} days ago, limit ${days})` };
  };
  switch (kind) {
    case 'manual': {
      const days = Number(arg) || null;
      if (!doneDate) return { done: false, note: days ? `owner ticks every ${days} days; never done` : 'owner ticks; not done yet' };
      if (!days) return { done: true, note: `done ${doneDate}` };
      return fresh(doneDate, days, 'last done');
    }
    case 'env': {
      const vars = arg.split('+').map((v) => v.trim()).filter(Boolean);
      const missing = vars.filter((v) => !process.env[v]);
      return { done: missing.length === 0, note: missing.length ? `not set in this environment: ${missing.join(', ')}` : `set: ${vars.join(', ')}` };
    }
    case 'origin': {
      const src = read('src/data/origin.mjs');
      const ok = !/example\.com/.test(src);
      return { done: ok, note: ok ? 'origin set' : 'src/data/origin.mjs still says example.com' };
    }
    case 'placeholders': {
      const roots = ['src', 'public', 'wrangler.jsonc', 'marketing'];
      const hits = [];
      const walk = (p) => {
        const full = join(ROOT, p);
        if (!existsSync(full)) return;
        if (statSync(full).isDirectory()) {
          for (const n of readdirSync(full)) {
            if (n === 'insights' && p === 'marketing') continue;
            walk(join(p, n));
          }
          return;
        }
        if (/\.(png|jpe?g|ico|woff2?|zip|json)$/.test(p) && !/privacy\.json|facts\.json|authors\.json/.test(p)) return;
        if (/privacy\.json$|productSchema\.example\.ts$|ACTIONS\.md$|playbook-intake\.md$/.test(p)) return;
        const text = readFileSync(full, 'utf8');
        if (/TODO|example\.com|Example Co/.test(text)) hits.push(p);
      };
      for (const r of roots) walk(r);
      return { done: hits.length === 0, note: hits.length ? `${hits.length} file(s) still carry placeholders, e.g. ${hits.slice(0, 3).join(', ')}` : 'placeholder grep clean' };
    }
    case 'grep':
    case 'nogrep': {
      const i = arg.indexOf(':');
      const file = arg.slice(0, i);
      const re = new RegExp(arg.slice(i + 1), 'i');
      const hit = re.test(read(file));
      const ok = kind === 'grep' ? hit : !hit;
      return { done: ok, note: `${file} ${hit ? 'matches' : 'does not match'} /${arg.slice(i + 1)}/` };
    }
    case 'file': return { done: existsSync(join(ROOT, arg)), note: existsSync(join(ROOT, arg)) ? `${arg} present` : `${arg} missing` };
    case 'fresh': {
      const i = arg.lastIndexOf(':');
      return fresh(newestDated(arg.slice(0, i)), Number(arg.slice(i + 1)), `newest in ${arg.slice(0, i)}`);
    }
    case 'entries': {
      const i = arg.lastIndexOf(':');
      return fresh(newestHeading(arg.slice(0, i), /^## (\d{4}-\d{2}-\d{2})/gm), Number(arg.slice(i + 1)), `newest entry in ${arg.slice(0, i)}`);
    }
    case 'snapshot': {
      const dir = join(ROOT, 'marketing/insights');
      const snaps = existsSync(dir) ? readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort() : [];
      return fresh(snaps.at(-1)?.slice(0, 10) ?? null, Number(arg), 'newest snapshot');
    }
    case 'panel': return fresh(newestHeading('marketing/ai-panel.md', /^## Run (\d{4}-\d{2}-\d{2})/gm), Number(arg), 'last panel run');
    case 'securitytxt': {
      const exp = read('public/.well-known/security.txt').match(/^Expires:\s*(\S+)/m)?.[1];
      if (!exp) return { done: false, note: 'no Expires line' };
      const left = Math.floor((new Date(exp).getTime() - Date.now()) / DAY);
      return { done: left > 30, note: `expires ${exp.slice(0, 10)} (${left} days left)` };
    }
    case 'indexnow': {
      const pub = join(ROOT, 'public');
      const keys = readdirSync(pub).filter((f) => /^[0-9a-f]{32}\.txt$/i.test(f) && readFileSync(join(pub, f), 'utf8').trim().toLowerCase() === f.slice(0, 32).toLowerCase());
      return { done: keys.length > 0, note: keys.length ? `key file ${keys[0]}` : 'no public/<key>.txt whose body equals its name' };
    }
    case 'datasheet': {
      const open = (read('marketing/DATA-SHEET.md').match(/^### Q-[^\n]*⬜/gm) ?? []).length;
      return { done: open === 0, note: open ? `${open} open question(s) — npm run ask` : 'no open questions' };
    }
    case 'linktargets': {
      const todo = (read('marketing/link-targets.md').match(/^\|[^\n]*\|\s*todo\s*\|[^\n]*$/gim) ?? []).length;
      return { done: todo === 0, note: todo ? `${todo} listing(s) still todo` : 'every listing claimed or skipped' };
    }
    case 'social': {
      const n = (read('marketing/social-queue.md').match(/^status:\s*unposted/gim) ?? []).length;
      return { done: n === 0, note: n ? `${n} social draft(s) unposted` : 'social queue empty' };
    }
    default:
      return { done: null, note: `unknown check kind "${kind}"` };
  }
}

/* ------------------------------------------------------------------- run */

const md = read('marketing/ACTIONS.md');
if (!md) {
  console.log('actions: marketing/ACTIONS.md missing — nothing to check.');
  process.exit(0);
}
const items = parse(md);
if (!items.length) {
  console.error('actions: marketing/ACTIONS.md has no parseable `### A-… · title ⬜` items.');
  process.exit(2);
}

const results = items.map((it) => {
  if (it.mark === '🚫') return { ...it, done: true, na: true, note: it.done || 'not applicable' };
  const r = evaluate(it);
  return { ...it, ...r, na: false, auto: !it.check.startsWith('manual') };
});

const open = results.filter((r) => !r.done && (!PHASE || r.phase === PHASE));
const done = results.filter((r) => r.done && !r.na);
const keysMissing = open.filter((r) => r.phase === 'keys');
const summary = {
  checked: today,
  total: results.length,
  doneCount: done.length,
  openCount: open.length,
  notApplicable: results.filter((r) => r.na).length,
  keysMissing: keysMissing.map((r) => ({ id: r.id, title: r.title, note: r.note })),
  open: open.map(({ id, title, phase, check, why, how, note, auto }) => ({ id, title, phase, check, why, how, note, auto })),
  done: done.map(({ id, title, phase, note }) => ({ id, title, phase, note })),
};

if (UPDATE) {
  let out = md;
  for (const r of results) {
    if (r.na) continue;
    const mark = r.done ? '✅' : '⬜';
    // `[ \t]*` not `\s*` after the mark: with the m flag `\s*$` swallows the
    // newline and deletes the blank line under the heading on every update.
    const headRe = new RegExp(`^(### ${r.id}[ \\t]*·[ \\t]*.*?)[ \\t]*(⬜|✅)[ \\t]*$`, 'm');
    out = out.replace(headRe, `$1 ${mark}`);
    if (r.auto) {
      // Auto items: the script owns the Done line — last verified date + note.
      const doneRe = new RegExp(`(### ${r.id}[\\s\\S]*?\\*\\*Done:\\*\\*)[^\\n]*`);
      out = out.replace(doneRe, `$1 ${r.done ? `verified ${today}` : `open as of ${today}`} — ${r.note}`);
    }
  }
  if (out !== md) writeFileSync(FILE, out);
}

if (AS_JSON) {
  console.log(JSON.stringify(summary, null, 2));
} else if (AS_MD) {
  const lines = ['### Actions — done and open', ''];
  lines.push(`${done.length} of ${results.length - summary.notApplicable} actions done (checked ${today}). Auto-verified items flip back by themselves; manual ones need a date under **Done:** in \`marketing/ACTIONS.md\`.`);
  if (keysMissing.length) {
    lines.push('', `**Keys the scripts are missing (${keysMissing.length}).** No API hands a script a credential; each stays dark until you set it in the Routine environment:`, '');
    for (const r of keysMissing) lines.push(`- **${r.id} ${r.title}** — ${r.how}`);
  }
  const rest = open.filter((r) => r.phase !== 'keys');
  if (rest.length) {
    lines.push('', `**Open (${rest.length}).**`, '');
    for (const p of PHASES.filter((p) => p !== 'keys')) {
      const rows = rest.filter((r) => r.phase === p);
      if (!rows.length) continue;
      lines.push(`_${p}_`);
      for (const r of rows) lines.push(`- **${r.id} ${r.title}** — ${r.note}. ${r.how}`);
      lines.push('');
    }
  } else if (!keysMissing.length) {
    lines.push('', 'Nothing open.');
  }
  console.log(lines.join('\n'));
} else {
  const bar = '─'.repeat(64);
  console.log(`\n${bar}\n  Actions — ${done.length} done · ${open.length} open · ${summary.notApplicable} n/a   marketing/ACTIONS.md\n${bar}`);
  if (keysMissing.length) {
    console.log('\n  Keys the scripts are missing:');
    for (const r of keysMissing) console.log(`    ${r.id} ${r.title}\n         ${r.note}`);
  }
  for (const p of PHASES.filter((p) => p !== 'keys')) {
    const rows = open.filter((r) => r.phase === p);
    if (!rows.length) continue;
    console.log(`\n  ${p}:`);
    for (const r of rows) console.log(`    ${r.id} ${r.title}\n         ${r.note}`);
  }
  if (!open.length) console.log('\n  Nothing open.');
  console.log(`\n${bar}\n`);
}
