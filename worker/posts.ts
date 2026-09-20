/**
 * The posts API — the one door through which external automation adds a blog
 * post, and the only route on this worker that writes anything.
 *
 *   POST /api/posts        validate a post, write it to a branch, open a PR
 *   GET  /api/posts/<n>    where that PR is: queued · published · cancelled
 *
 * WHAT IT DOES NOT DO, AND WHY. A Worker has no Node, no filesystem and no
 * browser, so it cannot run the build, the verify battery or the deploy.
 * Everything that needs those is done by the daily cadence run's PR inbox on
 * the branch this route creates: lastmod, inventory and the OG card are
 * regenerated, `npm run verify` is the gate, a green branch is squash-merged
 * and deployed, and the live smoke runs. The caller therefore gets a 202 and
 * a status URL, never "published" — the truthful answer takes three to five
 * minutes and lives in GitHub. AGENTS.md § Content rules: the daily
 * cadence run then does the judgement half on what landed (interlinks,
 * glossary upkeep, the keyword map) — the API does only what is mechanical.
 *
 * WHAT IT VALIDATES, AND WHY HERE. Everything the build would reject that can
 * be checked without a build: the blog schema's shape (mirrored from
 * src/content.config.ts — change one, change both), the author registry
 * (imported at build time, so a byline that links nowhere is refused before a
 * branch exists), the SERP title clamp, the description band, the two in-body
 * links, no second <h1>, no MDX imports (the markdown twin ships the raw
 * body). Mirror of the blog schema in src/content.config.ts — a site that
 * adds a frontmatter field adds it here too. A rejection is a 400 with every failure named, so the caller fixes
 * them in one round instead of one per build.
 *
 * SECRETS. POSTS_API_TOKEN (the caller's bearer) and GITHUB_POSTS_TOKEN (a
 * fine-grained PAT: Contents and Pull requests read/write on this repo only).
 * Either unset = the API answers 503 and the site is unaffected — the
 * empty-default rule every other feature on this worker follows.
 */

import authorsRegistry from '../src/data/authors.json';

export interface PostsEnv {
  /** Bearer token callers present. Secret. Unset = posts API off (503). */
  POSTS_API_TOKEN?: string;
  /** Fine-grained GitHub PAT, Contents + Pull requests read/write on GITHUB_REPO. Secret. */
  GITHUB_POSTS_TOKEN?: string;
  /** owner/repo — wrangler.jsonc var. */
  GITHUB_REPO?: string;
  /** Base branch — wrangler.jsonc var, default main. */
  GITHUB_BASE?: string;
  /** Rate-limit binding (wrangler.jsonc `ratelimits`); optional. */
  POSTS_RATE?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

type Headerize = (h: Headers) => Headers;

const PROPRIETARY = ['proprietary-numbers', 'product-screenshots', 'practitioner-quote', 'hs-code-walkthrough'];
const UPSTREAM_TIMEOUT_MS = 15_000;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Constant-time string compare — a bearer check must not leak length or prefix. */
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

function json(status: number, body: unknown, headerize: Headerize, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: headerize(
      new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra })
    ),
  });
}

/* ------------------------------------------------------------------ input */

export interface PostInput {
  slug?: string;
  title: string;
  description: string;
  tldr: string;
  published?: string;
  updated?: string;
  author: { name: string; title: string; sameAs: string[] };
  tags?: string[];
  proprietary: string;
  sources?: { label: string; url?: string; retrieved?: string }[];
  faq?: { q: string; a: string }[];
  /** Figure declarations (src/data/figureSchema.ts). Validated in full by the build; shape-checked here. */
  figures?: Record<string, unknown>[];
  body: string;
}

const isStr = (v: unknown): v is string => typeof v === 'string';
const isUrl = (v: unknown): boolean => isStr(v) && /^https?:\/\/\S+$/.test(v);

export function slugify(title: string): string {
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
 * Mirrors src/lib/clampTitle.ts: a title passes if it fits 60 characters, or
 * if it carries a trailing " — clause" or " | clause" that the clamp can drop
 * whole with the remainder inside 60. Anything else would be HARD-CUT on the
 * one line a searcher reads (check-source-rules enforces the same rule).
 */
export function survivesClamp(title: string): boolean {
  if (title.length <= 60) return true;
  for (const sep of [' — ', ' | ']) {
    const i = title.lastIndexOf(sep);
    if (i > 0 && i <= 60) return true;
  }
  return false;
}

export function validatePost(raw: unknown): { errors: string[]; post: PostInput | null } {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { errors: ['body must be a JSON object'], post: null };
  const r = raw as Record<string, unknown>;
  const need = (k: string, ok: boolean, why: string) => { if (!ok) errors.push(`${k}: ${why}`); };

  need('title', isStr(r.title) && r.title.trim().length >= 10 && r.title.length <= 70, 'string, 10–70 characters');
  if (isStr(r.title) && !survivesClamp(r.title)) errors.push('title: over 60 characters with no " — " or " | " clause the SERP clamp can drop — it would be cut mid-phrase');
  need('description', isStr(r.description) && r.description.length >= 70 && r.description.length <= 165, 'string, 70–165 characters (the SERP snippet band)');
  need('tldr', isStr(r.tldr) && r.tldr.length >= 40 && r.tldr.length <= 400, 'string, 40–400 characters — the front-loaded answer');
  need('proprietary', isStr(r.proprietary) && PROPRIETARY.includes(r.proprietary), `one of ${PROPRIETARY.join(', ')}`);
  need('body', isStr(r.body) && r.body.trim().length >= 800, 'markdown string, at least 800 characters');

  let slug = isStr(r.slug) ? r.slug : isStr(r.title) ? slugify(r.title) : '';
  need('slug', SLUG_RE.test(slug) && slug.length >= 3 && slug.length <= 80, 'lowercase letters, digits and single hyphens, 3–80 characters');

  if (r.published !== undefined) need('published', isStr(r.published) && DATE_RE.test(r.published) && !Number.isNaN(Date.parse(r.published)), 'YYYY-MM-DD');
  if (r.updated !== undefined) need('updated', isStr(r.updated) && DATE_RE.test(r.updated), 'YYYY-MM-DD');
  if (r.tags !== undefined) need('tags', Array.isArray(r.tags) && r.tags.every(isStr), 'array of strings');

  const a = r.author as Record<string, unknown> | undefined;
  need('author', !!a && typeof a === 'object', 'object { name, title, sameAs[] }');
  if (a && typeof a === 'object') {
    need('author.name', isStr(a.name) && a.name.length > 1, 'string');
    need('author.title', isStr(a.title) && a.title.length > 1, 'string');
    need('author.sameAs', Array.isArray(a.sameAs) && a.sameAs.length >= 1 && a.sameAs.every(isUrl), 'array of at least one https profile URL');
    // The registry: a byline that links nowhere is a name, not a credential.
    const reg = (authorsRegistry as { authors: { name: string; sameAs?: string[] }[] }).authors ?? [];
    const profiles = Array.isArray(a.sameAs) ? (a.sameAs as string[]) : [];
    const known = reg.some((e) => e.name === a.name || (e.sameAs ?? []).some((u) => profiles.includes(u)));
    need('author', known, `not in src/data/authors.json — register the author (with a real profile and an /author page) before publishing under that name`);
  }

  if (r.sources !== undefined) {
    const ok = Array.isArray(r.sources) && r.sources.every((s) => s && typeof s === 'object' && isStr((s as Record<string, unknown>).label)
      && ((s as Record<string, unknown>).url === undefined || isUrl((s as Record<string, unknown>).url))
      && ((s as Record<string, unknown>).retrieved === undefined || (isStr((s as Record<string, unknown>).retrieved) && DATE_RE.test((s as Record<string, unknown>).retrieved as string))));
    need('sources', ok, 'array of { label, url?, retrieved? (YYYY-MM-DD) }');
  }
  if (r.figures !== undefined) {
    const kinds = ['timeline', 'flow', 'steps', 'bars', 'tiles', 'compare', 'web', 'outline'];
    const ok =
      Array.isArray(r.figures) &&
      r.figures.length <= 6 &&
      r.figures.every((f) => {
        if (!f || typeof f !== 'object') return false;
        const g = f as Record<string, unknown>;
        return isStr(g.kind) && kinds.includes(g.kind) && isStr(g.title) && g.title.length >= 8 && g.title.length <= 120;
      });
    need('figures', ok, `array (≤6) of figure declarations, each with kind (${kinds.join(', ')}) and a title of 8–120 chars — see AGENTS § Figures; the build validates the full shape`);
    if (ok && (r.figures as Record<string, unknown>[]).filter((g) => g.place === undefined || g.place === 'lead').length > 1) {
      need('figures', false, 'at most one figure may lead (place omitted or "lead"); the rest need place: "body" and an id');
    }
  }
  if (r.faq !== undefined) {
    need('faq', Array.isArray(r.faq) && r.faq.every((f) => f && typeof f === 'object' && isStr((f as Record<string, unknown>).q) && isStr((f as Record<string, unknown>).a)), 'array of { q, a }');
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
      title: (r.title as string).trim(),
      description: r.description as string,
      tldr: r.tldr as string,
      published: (r.published as string | undefined) ?? new Date().toISOString().slice(0, 10),
      updated: r.updated as string | undefined,
      author: { name: a!.name as string, title: a!.title as string, sameAs: a!.sameAs as string[] },
      tags: (r.tags as string[] | undefined) ?? [],
      proprietary: r.proprietary as string,
      sources: (r.sources as PostInput['sources']) ?? [],
      faq: (r.faq as PostInput['faq']) ?? [],
      figures: r.figures as PostInput['figures'],
      body: (r.body as string).trim(),
    },
  };
}

/* -------------------------------------------------------------- the file */

/** YAML scalar via JSON — a double-quoted JSON string is valid YAML. */
const y = (v: string) => JSON.stringify(v);

export function toMdx(p: PostInput): string {
  const lines: string[] = ['---'];
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
  lines.push('via: posts-api');
  lines.push('---', '', p.body, '');
  return lines.join('\n');
}

/* ---------------------------------------------------------------- github */

function ghClient(token: string) {
  return async (path: string, init: RequestInit & { json?: unknown } = {}) => {
    const headers = new Headers(init.headers ?? {});
    headers.set('authorization', `Bearer ${token}`);
    headers.set('accept', 'application/vnd.github+json');
    headers.set('x-github-api-version', '2022-11-28');
    headers.set('user-agent', 'astro-seo-geo-template-posts-api');
    let body = init.body;
    if (init.json !== undefined) {
      headers.set('content-type', 'application/json');
      body = JSON.stringify(init.json);
    }
    const r = await fetch(`https://api.github.com${path}`, { ...init, headers, body, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    const text = await r.text();
    let data: unknown = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { ok: r.ok, status: r.status, data: (data && typeof data === 'object' ? (data as Record<string, unknown>) : null) };
  };
}

function b64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/* --------------------------------------------------------------- handler */

export async function handlePosts(request: Request, env: PostsEnv, url: URL, headerize: Headerize): Promise<Response> {
  const m = /^\/api\/posts(?:\/(\d+))?$/.exec(url.pathname);
  if (!m) return json(404, { error: 'not found' }, headerize);
  const id = m[1];

  if (!env.POSTS_API_TOKEN) {
    return json(503, { error: 'posts API is not configured on this deployment (POSTS_API_TOKEN unset) — SETUP.md Phase 4' }, headerize);
  }
  if (id ? request.method !== 'GET' : request.method !== 'POST') {
    return json(405, { error: 'method not allowed' }, headerize, { allow: id ? 'GET' : 'POST' });
  }

  const auth = request.headers.get('authorization') ?? '';
  const presented = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!presented || !safeEqual(presented, env.POSTS_API_TOKEN)) {
    return json(401, { error: 'unauthorised — send Authorization: Bearer <POSTS_API_TOKEN>' }, headerize, { 'www-authenticate': 'Bearer' });
  }

  if (env.POSTS_RATE) {
    const { success } = await env.POSTS_RATE.limit({ key: request.headers.get('cf-connecting-ip') ?? 'unknown' });
    if (!success) return json(429, { error: 'too many requests' }, headerize, { 'retry-after': '60' });
  }

  const repo = env.GITHUB_REPO ?? '';
  const base = env.GITHUB_BASE ?? 'main';
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return json(503, { error: 'GITHUB_REPO is not configured (wrangler.jsonc vars)' }, headerize);

  // ── GET /api/posts/<n> — where is it ──────────────────────────────────
  if (id) {
    if (!env.GITHUB_POSTS_TOKEN) return json(503, { error: 'GITHUB_POSTS_TOKEN unset — the status cannot be read' }, headerize);
    const gh = ghClient(env.GITHUB_POSTS_TOKEN);
    const pr = await gh(`/repos/${repo}/pulls/${id}`);
    if (!pr.ok || !pr.data) return json(pr.status === 404 ? 404 : 502, { error: `GitHub answered ${pr.status} for pull request ${id}` }, headerize);
    const head = (pr.data.head as { sha: string; ref: string } | undefined);
    if (!head?.ref?.startsWith('api/post/')) return json(404, { error: `pull request ${id} was not created by the posts API` }, headerize);
    // Status is read off the pull request alone. There is no publish
    // workflow (the template ships no automatic GitHub Actions — metered
    // minutes; SETUP Phase 3): the daily cadence run reviews the PR in its
    // PR inbox, merges it when it clears the bar under STRATEGY.md's merge
    // model, and ships. open → queued; merged → published; closed → cancelled.
    const merged = Boolean(pr.data.merged);
    const slug = head.ref.replace(/^api\/post\//, '').replace(/-\d{12}$/, '');
    const status: 'queued' | 'published' | 'cancelled' = merged ? 'published' : pr.data.state === 'closed' ? 'cancelled' : 'queued';
    return json(200, {
      id: Number(id), status, slug,
      url: status === 'published' ? `${url.origin}/blog/${slug}` : null,
      pr: pr.data.html_url, merged, mergedAt: pr.data.merged_at ?? null,
      note:
        status === 'queued'
          ? 'waiting for the daily cadence run, which reviews the post, merges it and deploys — or leaves a review comment on the PR saying why not'
          : status === 'cancelled'
            ? 'closed without merging — the reason is on the pull request'
            : undefined,
    }, headerize);
  }

  // ── POST /api/posts — validate, write, open the PR ────────────────────
  let raw: unknown;
  try { raw = await request.json(); } catch { return json(400, { error: 'body must be JSON' }, headerize); }
  const { errors, post } = validatePost(raw);
  if (!post) return json(400, { error: 'validation failed', errors }, headerize);

  if (!env.GITHUB_POSTS_TOKEN) {
    return json(503, { error: 'validated, but GITHUB_POSTS_TOKEN is unset so nothing can be written — SETUP.md Phase 4', slug: post.slug }, headerize);
  }
  const gh = ghClient(env.GITHUB_POSTS_TOKEN);
  const path = `src/content/blog/${post.slug}.mdx`;

  const existing = await gh(`/repos/${repo}/contents/${path}?ref=${encodeURIComponent(base)}`);
  if (existing.ok) return json(409, { error: `slug "${post.slug}" already exists on ${base}`, slug: post.slug }, headerize);
  if (existing.status !== 404) return json(502, { error: `GitHub answered ${existing.status} checking the slug` }, headerize);

  const ref = await gh(`/repos/${repo}/git/ref/heads/${encodeURIComponent(base)}`);
  const baseSha = (ref.data?.object as { sha?: string } | undefined)?.sha;
  if (!ref.ok || !baseSha) return json(502, { error: `GitHub answered ${ref.status} reading ${base}` }, headerize);

  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const branch = `api/post/${post.slug}-${stamp}`;
  const created = await gh(`/repos/${repo}/git/refs`, { method: 'POST', json: { ref: `refs/heads/${branch}`, sha: baseSha } });
  if (!created.ok) return json(502, { error: `GitHub answered ${created.status} creating the branch`, detail: created.data?.message }, headerize);

  const put = await gh(`/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    json: {
      message: `Post via API: ${post.title}\n\nSubmitted through POST /api/posts. The publish workflow regenerates lastmod, inventory and the OG card, runs the verify battery, and squash-merges on green.`,
      content: b64(toMdx(post)),
      branch,
    },
  });
  if (!put.ok) return json(502, { error: `GitHub answered ${put.status} writing the file`, detail: put.data?.message }, headerize);

  const pr = await gh(`/repos/${repo}/pulls`, {
    method: 'POST',
    json: {
      title: `Post via API: ${post.title}`,
      head: branch,
      base,
      body: [
        `Submitted through \`POST /api/posts\`.`, '',
        `- URL when live: ${url.origin}/blog/${post.slug}`,
        `- Published date: ${post.published}`,
        `- Author: ${post.author.name}`,
        `- Proprietary: ${post.proprietary}`,
        `- Sources: ${post.sources?.length ?? 0}`, '',
        'The daily cadence run picks this PR up in its PR inbox: it regenerates lastmod, inventory and the social card, runs `npm run verify`, does the judgement half (in-body links, glossary, keyword map, voice), and merges and deploys when the post clears the bar — or leaves a review comment here saying exactly why not.',
      ].join('\n'),
    },
  });
  if (!pr.ok || !pr.data) return json(502, { error: `GitHub answered ${pr.status} opening the pull request`, detail: pr.data?.message, branch }, headerize);
  const number = pr.data.number as number;
  // Label is a courtesy for humans reading the PR list; a missing label must not fail the call.
  await gh(`/repos/${repo}/issues/${number}/labels`, { method: 'POST', json: { labels: ['api-post'] } }).catch(() => undefined);

  return json(202, {
    id: number,
    status: 'queued',
    slug: post.slug,
    published: post.published,
    branch,
    pr: pr.data.html_url,
    url: `${url.origin}/blog/${post.slug}`,
    statusUrl: `${url.origin}/api/posts/${number}`,
    note: 'The daily cadence run reviews, merges and deploys API posts; poll statusUrl. Expect it after the next run, not in minutes.',
  }, headerize, { location: `${url.origin}/api/posts/${number}` });
}
