/**
 * posts-rules.mjs — what a post submitted to POST /api/posts must be, and the
 * MDX file it becomes. Plain ESM on purpose.
 *
 * WHY NOT TYPESCRIPT, WHERE THE REST OF THE WORKER LIVES. These rules are the
 * one piece of worker logic with no Request, no fetch and no binding in it:
 * pure functions over a JSON object. `node --test` can run them directly as
 * ESM, and the enum drift that broke every API post in Sep 2026 (the worker's
 * PROPRIETARY list disagreed with the zod enum in src/content.config.ts, so
 * the API accepted posts the build then rejected) would have been a ten-line
 * test. wrangler's esbuild and `tsc --noEmit -p worker` both read this file
 * through posts.ts, which imports it, so nothing about the deployed worker
 * changes — only what a test can reach.
 *
 * THE AUTHOR REGISTRY IS A PARAMETER, not an import. src/data/authors.json is
 * JSON, and a JSON import needs a different spelling in each of the three
 * toolchains that read this file (node's import attributes, tsc's
 * resolveJsonModule, esbuild's loader). Taking the registry as an argument
 * makes validatePost a pure function of its inputs — posts.ts passes the
 * imported registry, a test passes a fixture — and removes the build-tool
 * question entirely.
 *
 * MIRROR, NOT SOURCE. The shape below mirrors the blog schema in
 * src/content.config.ts: a site that adds a frontmatter field adds it in both
 * places, and check-parity fails a commit where the proprietary lists differ.
 * The numeric bands are deliberately the BUILD's bands, not looser ones — an
 * API that accepts a title the SERP clamp hard-cuts, or a description the
 * invariant battery rejects, has only moved the failure later.
 */

import { survivesClamp, CLAMP_MAX } from '../src/lib/clamp.mjs';

/**
 * Mirrors the `proprietary` z.enum in src/content.config.ts. check-parity
 * fails the commit when the two lists differ — they did once (27 Sep 2026),
 * and every post the API accepted then failed the build.
 */
export const PROPRIETARY = ['original-data', 'first-hand-experience', 'original-analysis', 'expert-interview', 'case-study'];

/** Mirrors figureSchema.ts's kinds. */
export const FIGURE_KINDS = ['timeline', 'flow', 'steps', 'bars', 'tiles', 'compare', 'web', 'outline'];

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The description band. The SERP snippet band, and the invariant battery's. */
export const DESCRIPTION_MIN = 70;
export const DESCRIPTION_MAX = 165;

/**
 * @typedef {object} PostInput
 * @property {string} [slug]
 * @property {string} title
 * @property {string} description
 * @property {string} tldr
 * @property {string} [published]
 * @property {string} [updated]
 * @property {{ name: string, title: string, sameAs: string[] }} author
 * @property {string[]} [tags]
 * @property {string} proprietary
 * @property {{ label: string, url?: string, retrieved?: string }[]} [sources]
 * @property {{ q: string, a: string }[]} [faq]
 * @property {Record<string, unknown>[]} [figures]
 * @property {boolean} [toc]
 * @property {string} [primaryKeyword]
 * @property {string[]} [secondaryKeywords]
 * @property {string} [canonical]
 * @property {string} [ogImage]
 * @property {boolean} [draft]
 * @property {string} body
 */

/** @param {unknown} v @returns {v is string} */
const isStr = (v) => typeof v === 'string';
/** @param {unknown} v */
const isUrl = (v) => isStr(v) && /^https?:\/\/\S+$/.test(v);

/** @param {string} title @returns {string} */
export function slugify(title) {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

/**
 * @param {unknown} raw the submitted JSON body
 * @param {{ name: string, sameAs?: string[] }[]} [authors]
 *   The author registry (src/data/authors.json → authors). An empty registry
 *   rejects every byline, which is the correct answer: a post whose author
 *   cannot be checked must not open a PR.
 * @returns {{ errors: string[], post: PostInput | null }}
 */
export function validatePost(raw, authors = []) {
  /** @type {string[]} */
  const errors = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { errors: ['body must be a JSON object'], post: null };
  const r = /** @type {Record<string, unknown>} */ (raw);
  /** @param {string} k @param {boolean} ok @param {string} why */
  const need = (k, ok, why) => { if (!ok) errors.push(`${k}: ${why}`); };

  need('title', isStr(r.title) && r.title.trim().length >= 10 && r.title.length <= 70, 'string, 10–70 characters');
  if (isStr(r.title) && !survivesClamp(r.title)) errors.push(`title: over ${CLAMP_MAX} characters with no " — " or " | " clause the SERP clamp can drop — it would be cut mid-phrase`);
  need('description', isStr(r.description) && r.description.length >= DESCRIPTION_MIN && r.description.length <= DESCRIPTION_MAX, `string, ${DESCRIPTION_MIN}–${DESCRIPTION_MAX} characters (the SERP snippet band)`);
  need('tldr', isStr(r.tldr) && r.tldr.length >= 40 && r.tldr.length <= 400, 'string, 40–400 characters — the front-loaded answer');
  need('proprietary', isStr(r.proprietary) && PROPRIETARY.includes(r.proprietary), `one of ${PROPRIETARY.join(', ')}`);
  need('body', isStr(r.body) && r.body.trim().length >= 800, 'markdown string, at least 800 characters');

  const slug = isStr(r.slug) ? r.slug : isStr(r.title) ? slugify(r.title) : '';
  need('slug', SLUG_RE.test(slug) && slug.length >= 3 && slug.length <= 80, 'lowercase letters, digits and single hyphens, 3–80 characters');

  if (r.published !== undefined) need('published', isStr(r.published) && DATE_RE.test(r.published) && !Number.isNaN(Date.parse(r.published)), 'YYYY-MM-DD');
  if (r.updated !== undefined) need('updated', isStr(r.updated) && DATE_RE.test(r.updated), 'YYYY-MM-DD');
  if (r.tags !== undefined) need('tags', Array.isArray(r.tags) && r.tags.every(isStr), 'array of strings');

  // Fields the blog schema carries that the API used to drop silently: a
  // caller could send them and watch them vanish from the PR.
  if (r.toc !== undefined) need('toc', typeof r.toc === 'boolean', 'boolean — the "On this page" list, for entries with 4+ h2s');
  if (r.draft !== undefined) need('draft', typeof r.draft === 'boolean', 'boolean — true keeps the post off every surface until it flips');
  if (r.primaryKeyword !== undefined) need('primaryKeyword', isStr(r.primaryKeyword) && r.primaryKeyword.length > 1, 'string — the one query this page claims');
  if (r.secondaryKeywords !== undefined) need('secondaryKeywords', Array.isArray(r.secondaryKeywords) && r.secondaryKeywords.every(isStr), 'array of strings');
  if (r.canonical !== undefined) need('canonical', isUrl(r.canonical), 'absolute https URL');
  if (r.ogImage !== undefined) need('ogImage', isStr(r.ogImage) && r.ogImage.startsWith('/'), 'root-relative path to an image in public/');

  const a = /** @type {Record<string, unknown> | undefined} */ (r.author);
  need('author', !!a && typeof a === 'object', 'object { name, title, sameAs[] }');
  if (a && typeof a === 'object') {
    need('author.name', isStr(a.name) && a.name.length > 1, 'string');
    need('author.title', isStr(a.title) && a.title.length > 1, 'string');
    need('author.sameAs', Array.isArray(a.sameAs) && a.sameAs.length >= 1 && a.sameAs.every(isUrl), 'array of at least one https profile URL');
    // The registry: a byline that links nowhere is a name, not a credential.
    const profiles = Array.isArray(a.sameAs) ? a.sameAs : [];
    const known = authors.some((e) => e.name === a.name || (e.sameAs ?? []).some((u) => profiles.includes(u)));
    need('author', known, 'not in src/data/authors.json — register the author (with a real profile and an /author page) before publishing under that name');
  }

  if (r.sources !== undefined) {
    const ok = Array.isArray(r.sources) && r.sources.every((s) => s && typeof s === 'object' && isStr(s.label)
      && (s.url === undefined || isUrl(s.url))
      && (s.retrieved === undefined || (isStr(s.retrieved) && DATE_RE.test(s.retrieved))));
    need('sources', ok, 'array of { label, url?, retrieved? (YYYY-MM-DD) }');
  }
  if (r.figures !== undefined) {
    const ok =
      Array.isArray(r.figures) &&
      r.figures.length <= 6 &&
      r.figures.every((f) => {
        if (!f || typeof f !== 'object') return false;
        const g = /** @type {Record<string, unknown>} */ (f);
        return isStr(g.kind) && FIGURE_KINDS.includes(g.kind) && isStr(g.title) && g.title.length >= 8 && g.title.length <= 120;
      });
    need('figures', ok, `array (≤6) of figure declarations, each with kind (${FIGURE_KINDS.join(', ')}) and a title of 8–120 chars — see AGENTS § Figures; the build validates the full shape`);
    if (ok && /** @type {Record<string, unknown>[]} */ (r.figures).filter((g) => g.place === undefined || g.place === 'lead').length > 1) {
      need('figures', false, 'at most one figure may lead (place omitted or "lead"); the rest need place: "body" and an id');
    }
  }
  if (r.faq !== undefined) {
    need('faq', Array.isArray(r.faq) && r.faq.every((f) => f && typeof f === 'object' && isStr(f.q) && isStr(f.a)), 'array of { q, a }');
  }

  if (isStr(r.body)) {
    const body = r.body;
    if (/^#\s/m.test(body)) errors.push('body: contains a "# " heading — the template renders the title as the h1; start at "##"');
    const links = (body.match(/\]\(\/[a-z]/g) ?? []).length;
    if (links < 2) errors.push(`body: ${links} in-body internal link(s) — at least 2, anchored on the phrase a searcher types`);
    if (/^import\s/m.test(body) || /^export\s/m.test(body)) errors.push('body: MDX import/export lines are not allowed — the markdown twin ships the raw body');
    if (/<script/i.test(body)) errors.push('body: <script> is not allowed');
    if (/^---\s*$/m.test(body.slice(0, 4))) errors.push('body: send frontmatter as JSON fields, not as a --- block');
  }

  if (errors.length) return { errors, post: null };
  return {
    errors,
    post: {
      slug,
      title: /** @type {string} */ (r.title).trim(),
      description: /** @type {string} */ (r.description),
      tldr: /** @type {string} */ (r.tldr),
      published: /** @type {string | undefined} */ (r.published) ?? new Date().toISOString().slice(0, 10),
      updated: /** @type {string | undefined} */ (r.updated),
      author: { name: /** @type {string} */ (a.name), title: /** @type {string} */ (a.title), sameAs: /** @type {string[]} */ (a.sameAs) },
      tags: /** @type {string[] | undefined} */ (r.tags) ?? [],
      proprietary: /** @type {string} */ (r.proprietary),
      sources: /** @type {PostInput['sources']} */ (r.sources) ?? [],
      faq: /** @type {PostInput['faq']} */ (r.faq) ?? [],
      figures: /** @type {PostInput['figures']} */ (r.figures),
      toc: /** @type {boolean | undefined} */ (r.toc),
      primaryKeyword: /** @type {string | undefined} */ (r.primaryKeyword),
      secondaryKeywords: /** @type {string[] | undefined} */ (r.secondaryKeywords),
      canonical: /** @type {string | undefined} */ (r.canonical),
      ogImage: /** @type {string | undefined} */ (r.ogImage),
      draft: /** @type {boolean | undefined} */ (r.draft),
      body: /** @type {string} */ (r.body).trim(),
    },
  };
}

/* -------------------------------------------------------------- the file */

/** YAML scalar via JSON — a double-quoted JSON string is valid YAML. @param {string} v */
const y = (v) => JSON.stringify(v);

/**
 * @param {PostInput} p
 * @returns {string} the MDX file, frontmatter first
 */
export function toMdx(p) {
  /** @type {string[]} */
  const lines = ['---'];
  lines.push(`title: ${y(p.title)}`);
  lines.push(`description: ${y(p.description)}`);
  lines.push(`tldr: ${y(p.tldr)}`);
  lines.push(`published: ${p.published}`);
  if (p.updated) lines.push(`updated: ${p.updated}`);
  lines.push('author:');
  lines.push(`  name: ${y(p.author.name)}`);
  lines.push(`  title: ${y(p.author.title)}`);
  lines.push('  sameAs:');
  for (const u of p.author.sameAs) lines.push(`    - ${y(u)}`);
  lines.push(`proprietary: ${p.proprietary}`);
  lines.push(p.tags && p.tags.length ? `tags: [${p.tags.map(y).join(', ')}]` : 'tags: []');
  if (p.sources && p.sources.length) {
    lines.push('sources:');
    for (const s of p.sources) {
      lines.push(`  - label: ${y(s.label)}`);
      if (s.url) lines.push(`    url: ${y(s.url)}`);
      if (s.retrieved) lines.push(`    retrieved: ${s.retrieved}`);
    }
  }
  // JSON is valid YAML flow syntax, so the nested declaration round-trips without a YAML emitter.
  if (p.figures && p.figures.length) lines.push(`figures: ${JSON.stringify(p.figures)}`);
  if (p.faq && p.faq.length) {
    lines.push('faq:');
    for (const f of p.faq) {
      lines.push(`  - q: ${y(f.q)}`);
      lines.push(`    a: ${y(f.a)}`);
    }
  }
  if (p.toc) lines.push('toc: true');
  if (p.draft) lines.push('draft: true');
  if (p.primaryKeyword) lines.push(`primaryKeyword: ${y(p.primaryKeyword)}`);
  if (p.secondaryKeywords && p.secondaryKeywords.length) lines.push(`secondaryKeywords: [${p.secondaryKeywords.map(y).join(', ')}]`);
  if (p.canonical) lines.push(`canonical: ${y(p.canonical)}`);
  if (p.ogImage) lines.push(`ogImage: ${y(p.ogImage)}`);
  // The key the daily run's PR inbox identifies an API post by (the blog
  // schema declares `via` so this survives zod).
  lines.push('via: posts-api');
  lines.push('---', '', p.body, '');
  return lines.join('\n');
}
