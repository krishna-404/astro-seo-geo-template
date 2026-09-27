/**
 * The collection registry and the route ↔ file mapping. Eleven scripts read
 * this; a wrong answer here is a page that renders nowhere, a twin the worker
 * never serves, or a lastmod row for a URL that does not exist.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  collections, collectionNames, twinCollections, twinPrefixes,
  routeOfCollection, collectionAtRoute, undeclaredCollections,
  cleanRoute, fileFor, routeFor, staticRoutes,
} from './routes.mjs';

test('every declared collection carries the four fields its readers need', () => {
  for (const [name, cfg] of Object.entries(collections())) {
    assert.match(cfg.route, /^\/[a-z0-9-]+$/, `${name} route is a single root-level directory`);
    assert.equal(typeof cfg.twins, 'boolean', `${name} declares twins`);
    assert.ok(cfg.eyebrow?.length, `${name} has a social-card eyebrow`);
    assert.ok(cfg.schema?.length, `${name} names a schema.org type`);
  }
});

test('no two collections claim the same route', () => {
  const routes = collectionNames().map(routeOfCollection);
  assert.equal(new Set(routes).size, routes.length);
});

test('every content folder on disk is declared', () => {
  // A folder with no config entry renders nowhere and no generated surface can
  // see it, so it is a finding rather than a collection.
  assert.deepEqual(undeclaredCollections(), []);
});

test('twin prefixes end in a slash, as the worker matches them', () => {
  for (const p of twinPrefixes()) assert.match(p, /^\/[a-z0-9-]+\/$/);
  assert.equal(twinPrefixes().length, twinCollections().length);
});

test('collectionAtRoute is the inverse of routeOfCollection', () => {
  for (const name of collectionNames()) {
    assert.equal(collectionAtRoute(routeOfCollection(name)), name);
    assert.equal(collectionAtRoute(routeOfCollection(name).slice(1)), name, 'with or without the leading slash');
  }
  assert.equal(collectionAtRoute('/not-a-collection'), null);
});

test('cleanRoute strips the origin, the query, the hash and trailing slashes', () => {
  assert.equal(cleanRoute('https://example.com/about/'), '/about');
  assert.equal(cleanRoute('/about?utm=x#frag'), '/about');
  assert.equal(cleanRoute('https://example.com/'), '/');
  assert.equal(cleanRoute(''), '/');
  assert.equal(cleanRoute(undefined), '/');
});

test('fileFor resolves a content route to its markdown file', () => {
  assert.equal(fileFor('/glossary/llms-txt'), 'src/content/glossary/llms-txt.md');
  assert.equal(fileFor('/blog/how-the-seo-machinery-works'), 'src/content/blog/how-the-seo-machinery-works.md');
});

test('fileFor resolves a static route to its astro page, index included', () => {
  assert.equal(fileFor('/'), 'src/pages/index.astro');
  assert.equal(fileFor('/about'), 'src/pages/about.astro');
  assert.equal(fileFor('/blog'), 'src/pages/blog/index.astro');
  assert.equal(fileFor('/contact/thanks'), 'src/pages/contact/thanks.astro');
  assert.equal(fileFor('/no/such/route'), null);
});

test('routeFor is the inverse of fileFor for the pages that have both', () => {
  for (const route of ['/', '/about', '/blog', '/contact/thanks', '/glossary/llms-txt']) {
    assert.equal(routeFor(fileFor(route)), route, route);
  }
});

test('routeFor refuses a dynamic route — its slugs come from the content', () => {
  assert.equal(routeFor('src/pages/blog/[...slug].astro'), null);
  assert.equal(routeFor('src/pages/author/[...slug].astro'), null);
});

test('routeFor returns null for a file that renders no page', () => {
  assert.equal(routeFor('scripts/verify.mjs'), null);
  assert.equal(routeFor('src/components/Faq.astro'), null);
});

test('staticRoutes walks src/pages recursively, not one level deep', () => {
  const routes = staticRoutes();
  // /contact/thanks is the case that caught it: a nested page carried no
  // lastmod for two months because the walk stopped at the top level.
  assert.ok(routes['/contact/thanks'], 'a nested page is found');
  assert.ok(routes['/']);
  assert.ok(routes['/404']);
  for (const [route, file] of Object.entries(routes)) {
    assert.match(route, /^\/(?:|[a-z0-9/-]+)$/, route);
    assert.match(file, /^src\/pages\/.+\.astro$/, file);
    assert.ok(!file.includes('['), 'no dynamic routes');
  }
});
