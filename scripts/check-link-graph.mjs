#!/usr/bin/env node
/**
 * check-link-graph.mjs — site-wide interlinking, checked as a graph.
 *
 * The per-post rule (≥2 in-body internal links, check-source-rules) guards
 * each page's outbound half. This script guards the half no single page can
 * see: the shape of the whole site. Internal link equity is how a content
 * page ranks; a page nothing points to gets none, however good it is.
 *
 * Edges counted as INTENTIONAL links: in-body markdown links between pages,
 * and glossary `related` frontmatter (curation renders first, per AGENTS
 * § Content). The build-time related-links scorer is deliberately NOT
 * counted — it back-fills automatically, so counting it would let every
 * page look linked while nobody chose any of the links.
 *
 * FAIL: a published content entry with zero intentional inbound links
 *       (orphan); an internal link whose target route does not exist (dead
 *       before it ships); junk anchor text ("here", "read more" — the anchor
 *       is a ranking signal and should carry the phrase a searcher types).
 * WARN: an entry carrying more than 8 in-body internal links (a link farm
 *       reads as one).
 *
 * Fast (markdown source only), so it runs at every rung via this one script.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROUTE_DIR = {}; // collection name → route dir, where they differ

let fail = 0;
const bad = (msg) => {
  console.log(`   FAIL: ${msg}`);
  fail = 1;
};

// ── collect nodes: content entries + static pages ──────────────────────────
const entries = []; // { route, path, body, related[] }
for (const dir of readdirSync('src/content', { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const coll = dir.name;
  for (const f of readdirSync(join('src/content', coll)).filter((n) => /\.mdx?$/.test(n))) {
    const p = join('src/content', coll, f);
    const raw = readFileSync(p, 'utf8');
    if (/^draft:\s*true$/m.test(raw)) continue;
    const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
    const relatedBlock = fm?.[1].match(/^related:\n((?:[ \t]+-[ \t]+.+\n)+)/m)?.[1] ?? '';
    const related = [...relatedBlock.matchAll(/-[ \t]+(.+)/g)].map(
      (m) => `/${ROUTE_DIR[coll] ?? coll}/${m[1].trim()}`
    );
    entries.push({
      route: `/${ROUTE_DIR[coll] ?? coll}/${f.replace(/\.mdx?$/, '')}`,
      path: p,
      body: raw.slice(fm ? fm[0].length : 0),
      related,
    });
  }
}

const staticRoutes = new Set(['/']);
(function walkPages(dir, prefix) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walkPages(join(dir, e.name), `${prefix}/${e.name}`);
    else if (e.name.endsWith('.astro') && !e.name.includes('[')) {
      const base = e.name.replace(/\.astro$/, '');
      staticRoutes.add(base === 'index' ? prefix || '/' : `${prefix}/${base}`);
    } else if (/\.(ts|xml\.ts)$/.test(e.name) && !e.name.includes('[')) {
      staticRoutes.add(`${prefix}/${e.name.replace(/\.ts$/, '')}`);
    }
  }
})('src/pages', '');

const contentRoutes = new Set(entries.map((e) => e.route));
const collectionIndexes = new Set(
  [...new Set(entries.map((e) => e.route.split('/')[1]))].map((c) => `/${c}`)
);
const known = new Set([...staticRoutes, ...contentRoutes, ...collectionIndexes]);

// ── edges + per-link checks ────────────────────────────────────────────────
const JUNK = /^(here|click here|this|this page|this post|this article|read more|link|see here|more)$/i;
const inbound = new Map(entries.map((e) => [e.route, 0]));

// Hand-written links from .astro pages and components are intentional
// curation too — a solutions page linked from the homepage's Jobs section is
// anything but an orphan. Only LITERAL href="/x/y" attributes count: a
// dynamically built href (a nav dropdown rendering a whole collection) is
// generated, not chosen, and must not mask a page nobody actually linked.
(function walkAstro(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkAstro(p);
    else if (e.name.endsWith('.astro')) {
      const src = readFileSync(p, 'utf8');
      for (const m of src.matchAll(/href="(\/[a-z0-9-]+\/[a-z0-9.-]+)"/g)) {
        const t = m[1].replace(/\/$/, '');
        if (inbound.has(t)) inbound.set(t, inbound.get(t) + 1);
        else if (!known.has(t)) bad(`${p} links to ${t} — no such route`);
      }
    }
  }
})('src/pages');
(function walkComponents(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkComponents(p);
    else if (e.name.endsWith('.astro')) {
      const src = readFileSync(p, 'utf8');
      for (const m of src.matchAll(/href="(\/[a-z0-9-]+\/[a-z0-9.-]+)"/g)) {
        const t = m[1].replace(/\/$/, '');
        if (inbound.has(t)) inbound.set(t, inbound.get(t) + 1);
      }
    }
  }
})('src/components');

for (const e of entries) {
  const links = [...e.body.matchAll(/\[([^\]]*)\]\((\/[^)#?\s]*)[^)]*\)/g)];
  let internal = 0;
  for (const [, anchor, target] of links) {
    const t = target.replace(/\/$/, '') || '/';
    internal += 1;
    if (!known.has(t)) bad(`${e.path} links to ${t} — no such route`);
    if (JUNK.test(anchor.trim()))
      bad(`${e.path} anchors "${t}" on "${anchor.trim()}" — anchor on the phrase a searcher types instead`);
    if (inbound.has(t) && t !== e.route) inbound.set(t, inbound.get(t) + 1);
  }
  for (const r of e.related) {
    if (!contentRoutes.has(r)) bad(`${e.path} lists related "${r.split('/').pop()}" — no such entry`);
    else if (r !== e.route) inbound.set(r, inbound.get(r) + 1);
  }
  if (internal > 8)
    console.log(`   warn: ${e.path} carries ${internal} internal links — 3–5 is the working band, a link farm reads as one`);
}

for (const [route, n] of inbound) {
  if (n === 0)
    bad(
      `${route} has no intentional inbound link from any other page — an orphan gets no link equity. Link it in-body from a related page (or via glossary \`related\`); the auto-scorer does not count`
    );
}

if (!fail) console.log(`ok: ${entries.length} entries, no orphans, no dead internal links, no junk anchors`);
process.exit(fail);
