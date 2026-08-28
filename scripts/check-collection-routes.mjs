#!/usr/bin/env node
/**
 * A route for every content collection — checked at source level, before any
 * build: a collection with entries and no route renders nowhere,
 * indefinitely, without any error. The ancestor site shipped its glossary
 * that way for weeks.
 *
 * A collection whose every entry is draft is a documented deliberate state,
 * not a failure — seed entries can land ahead of the data that makes the
 * route worth building.
 *
 * One script for all three rungs (pre-commit hook, npm run verify, CI) so
 * the mapping below can never drift between copies.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Collection name → route directory, where they differ (e.g. a 'solution'
// collection rendered under /solutions). Empty while every collection here
// maps 1:1.
const ROUTE_DIR = {};

let fail = 0;
for (const dir of readdirSync('src/content', { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const name = dir.name;
  const entries = readdirSync(join('src/content', name)).filter((f) => /\.(md|mdx)$/.test(f));
  const drafts = entries.filter((f) =>
    /^draft:\s*true/m.test(readFileSync(join('src/content', name, f), 'utf8'))
  );
  if (entries.length > 0 && entries.length === drafts.length) {
    console.log(
      `skip: collection '${name}' is all-draft (${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}) — deliberate, no route required`
    );
    continue;
  }
  const route = `src/pages/${ROUTE_DIR[name] ?? name}/[...slug].astro`;
  if (!existsSync(route)) {
    console.log(`FAIL: collection '${name}' has published entries but no ${route}`);
    fail = 1;
  }
}
if (!fail) console.log('ok: every published collection has a route');
process.exit(fail);
