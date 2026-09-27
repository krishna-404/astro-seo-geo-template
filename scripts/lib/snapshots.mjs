/**
 * snapshots.mjs — the marketing files that hold measurement and open asks.
 *
 * WHY. Five scripts each read these four files with their own regex, and they
 * disagreed: the data-sheet counter matched `### Q-…⬜` headings while the
 * printer parsed the full block; the link-target reader matched five columns in
 * one script and six in another; the snapshot lookup was spelled three ways.
 * When a count differs between two reports of the same file, both are suspect.
 * One reader, one answer.
 *
 * Read-only. Every function returns empty rather than throwing when a file is
 * missing, so a fresh clone is never red for lack of measurement.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const at = (p) => resolve(root, p);
const readIf = (p) => (existsSync(at(p)) ? readFileSync(at(p), 'utf8') : '');

export const SNAPSHOT_DIR = 'marketing/insights';

/** Every snapshot date, oldest first. */
export function snapshotDates() {
  const dir = at(SNAPSHOT_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().map((f) => f.slice(0, 10));
}

/**
 * The newest insights snapshot.
 * @returns {{date: string, data: object}|null}
 */
export function newestSnapshot() {
  const dates = snapshotDates();
  if (!dates.length) return null;
  const date = dates.at(-1);
  try {
    return { date, data: JSON.parse(readFileSync(join(at(SNAPSHOT_DIR), `${date}.json`), 'utf8')) };
  } catch {
    return null;
  }
}

/** Dates of the logged AI prompt-panel runs, oldest first. */
export function panelRuns() {
  return [...readIf('marketing/ai-panel.md').matchAll(/^## Run (\d{4}-\d{2}-\d{2})/gm)].map((m) => m[1]).sort();
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

/**
 * The open questions in marketing/DATA-SHEET.md.
 * @returns {{questions: Array, open: Array, answered: Array}} `open` sorted by
 *   priority then id — the order a session should ask them in.
 */
export function dataSheet(md = readIf('marketing/DATA-SHEET.md')) {
  const questions = [];
  for (const part of md.split(/^### (?=Q-)/m).slice(1)) {
    const firstLine = part.slice(0, part.indexOf('\n'));
    const m = firstLine.match(/^(Q-[A-Za-z0-9]+)\s*·\s*(.*?)\s*(⬜|✅|🚫)\s*$/);
    if (!m) continue;
    const [, id, title, mark] = m;
    const body = part.slice(firstLine.length);
    // `[ \t]*` after the marker, never `\s*`: with `\s*` an EMPTY field (the
    // shape of an unanswered question — `**Answer:**` on its own line) swallowed
    // the newline and then captured the `---` separator and everything after it,
    // so every open question read as answered. Found by
    // scripts/lib/snapshots.test.mjs on 27 Sep 2026.
    const field = (name) => {
      const f = body.match(new RegExp(`\\*\\*${name}:\\*\\*[ \\t]*([\\s\\S]*?)(?=\\n\\*\\*|\\n\\s*\\n|\\n---|$)`));
      return f ? f[1].trim().replace(/\s+/g, ' ') : '';
    };
    const priorityRaw = field('Priority').toLowerCase();
    questions.push({
      id,
      title,
      status: mark === '⬜' ? 'open' : mark === '✅' ? 'answered' : 'n/a',
      priority: ['high', 'medium', 'low'].find((p) => priorityRaw.startsWith(p)) ?? 'medium',
      unblocks: field('Unblocks'),
      ask: field('Ask'),
      answered: field('Answer').length > 0,
    });
  }
  const open = questions
    .filter((q) => q.status === 'open')
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.id.localeCompare(b.id));
  return { questions, open, answered: questions.filter((q) => q.status === 'answered') };
}

/**
 * The listing table in marketing/link-targets.md.
 * @returns {{rows: Array, todo: Array, live: Array}} `todo` in table order.
 */
export function linkTargets(md = readIf('marketing/link-targets.md')) {
  const STATES = new Set(['todo', 'doing', 'live', 'skip']);
  const rows = [];
  for (const line of md.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 6) continue;
    const [num, platform, why, cost, status, note] = cells;
    const state = (status ?? '').replace(/`/g, '').toLowerCase();
    if (!STATES.has(state)) continue;
    rows.push({ n: Number(num) || 0, platform: platform ?? '', why: why ?? '', cost: cost ?? '', status: state, note: note ?? '' });
  }
  return {
    rows,
    todo: rows.filter((r) => r.status === 'todo').sort((a, b) => a.n - b.n),
    live: rows.filter((r) => r.status === 'live'),
  };
}

/** Newest date in a `^## Run YYYY-MM-DD`-style heading, or null. */
export function newestHeading(path, re) {
  const dates = [...readIf(path).matchAll(re)].map((m) => m[1]).sort();
  return dates.at(-1) ?? null;
}

export { readIf };
