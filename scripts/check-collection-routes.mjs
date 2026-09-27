#!/usr/bin/env node
/**
 * A route for every content collection — checked at source level, before any
 * build: a collection with entries and no route renders nowhere,
 * indefinitely, without any error. The ancestor site shipped its glossary
 * that way for weeks.
 *
 * The collection list and its route directory come from
 * src/data/collections.json — the one config. A folder under src/content/
 * with no entry there is its own failure: nothing generates it, nothing
 * routes it, and no other check can see it, so it would sit invisible.
 *
 * A collection whose every entry is draft is a documented deliberate state,
 * not a failure — seed entries can land ahead of the data that makes the
 * route worth building. A collection with NO entries needs its route too:
 * the route file ships with the collection (an empty getStaticPaths builds
 * nothing), and shipping the schema without it is the defect this catches.
 *
 * One script for all three rungs (pre-commit hook, npm run verify, CI) so
 * the mapping below can never drift between copies.
 */

import { existsSync } from 'node:fs';
import { collections, routeOfCollection, undeclaredCollections } from './lib/routes.mjs';
import { readCollection } from './lib/content.mjs';

let fail = 0;

for (const name of undeclaredCollections()) {
  console.log(`FAIL: src/content/${name}/ is not in src/data/collections.json — it renders nowhere and no generated surface can see it`);
  fail = 1;
}

for (const name of Object.keys(collections())) {
  const all = readCollection(name, { include: 'all' });
  const live = all.filter((e) => e.status !== 'draft');
  if (all.length > 0 && live.length === 0) {
    console.log(
      `skip: collection '${name}' is all-draft (${all.length} entr${all.length === 1 ? 'y' : 'ies'}) — deliberate, no route required`
    );
    continue;
  }
  const route = `src/pages${routeOfCollection(name)}/[...slug].astro`;
  if (!existsSync(route)) {
    console.log(`FAIL: collection '${name}' declares ${routeOfCollection(name)} but ${route} does not exist`);
    fail = 1;
  }
}

if (!fail) console.log('ok: every declared collection has a route, and every content folder is declared');
process.exit(fail);
