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
 * a status URL, never "published" — the truthful answer arrives with the
 * next daily run and lives in GitHub. AGENTS.md § Content rules: the daily
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
* WHERE THE RULES LIVE. The shape a post must have, and the MDX it becomes,
 * are in worker/posts-rules.mjs — plain ESM, so the test suite reaches them
 * directly. This file owns the HTTP: the bearer check, the rate limit, the
 * GitHub calls, the status lookup.
 *
 * SECRETS. POSTS_API_TOKEN (the caller's bearer) and GITHUB_POSTS_TOKEN (a
 * fine-grained PAT: Contents and Pull requests read/write on this repo only).
 * Either unset = the API answers 503 and the site is unaffected — the
 * empty-default rule every other feature on this worker follows.
 */

import authorsRegistry from '../src/data/authors.json';
// The shape rules and the MDX writer live in plain ESM so `node --test` can
// run them without a bundler (worker/posts-rules.mjs explains why).
import { validatePost, toMdx } from './posts-rules.mjs';

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

const UPSTREAM_TIMEOUT_MS = 15_000;

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
  const { errors, post } = validatePost(raw, authorsRegistry.authors ?? []);
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
      message: `Post via API: ${post.title}\n\nSubmitted through POST /api/posts. The daily cadence run's PR inbox regenerates lastmod, inventory and the OG card, runs the verify battery, and merges on green under the site's merge model.`,
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
