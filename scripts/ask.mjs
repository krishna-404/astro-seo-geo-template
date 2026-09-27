#!/usr/bin/env node
/**
 * ask.mjs — everything the engine is waiting on a human for, in one command.
 *
 *   npm run ask                # the terminal view (also runs at session start)
 *   npm run ask -- --markdown  # the two blocks the cadence report embeds
 *
 * It runs scripts/data-sheet.mjs (the open questions in marketing/DATA-SHEET.md,
 * ranked by what they unblock, plus the next unclaimed rows of
 * marketing/link-targets.md) and then scripts/actions.mjs (marketing/ACTIONS.md:
 * how many items are done, the keys this environment is missing, the open items
 * by phase). Each script owns its own format; this only sequences them and
 * passes the flags through.
 *
 * WHY IT IS A SCRIPT AND NOT TWO CHAINED COMMANDS. `npm run ask -- --markdown`
 * on a chained `a && b` string appends the flag to the SECOND command only, so
 * the data-sheet half silently printed its terminal view into a markdown
 * report. Rather than document two commands and hope the right one is typed,
 * the npm entry is one process that forwards argv to both.
 *
 * Exit code: the first non-zero of the two, so a failing reader is not hidden
 * by a passing one.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const flags = process.argv.slice(2);

let code = 0;
for (const script of ['data-sheet.mjs', 'actions.mjs']) {
  const r = spawnSync(process.execPath, [resolve(here, script), ...flags], { stdio: 'inherit' });
  if (r.error) throw r.error;
  if (code === 0 && r.status) code = r.status;
}
process.exit(code);
