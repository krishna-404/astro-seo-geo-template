import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import committed from '../data/lastmod.json';

/**
 * `<lastmod>` for the sitemap, taken from git rather than the clock.
 *
 * WHY NOT THE BUILD TIME. Stamping every URL with "now" on every deploy says
 * the whole site changed whenever anything did. Google's documented position is
 * that it uses lastmod only while it stays consistent with reality and ignores
 * it otherwise, so a build-time stamp does not just fail to help — it spends
 * the signal. The commit that last touched a page's source is the honest
 * answer, and it is already recorded.
 *
 * WHY IT IS ALLOWED TO RETURN NOTHING. On a shallow clone — which is what a CI
 * or Dokploy checkout often is — `git log` can return an empty string for a
 * file whose history was not fetched. The right response is to omit lastmod for
 * that URL, not to substitute a date we cannot support. An absent lastmod is
 * simply no claim; a wrong one is a false claim that teaches crawlers to
 * discount every other one.
 *
 * AUDIT NOTE (12 Aug 2026): an external SEO/AEO/GEO parity review flagged this
 * site as carrying "@astrojs/sitemap but zero lastmod." That is not what ships
 * — every route's <lastmod> is derived here, from the real last-commit date,
 * with the CI-checked src/data/lastmod.json fallback below for the git-less
 * Docker build. Confirm with `curl -s https://dodocket.com/sitemap-0.xml | grep -c lastmod`
 * before treating that finding as live.
 */

/** Route path (no extension, leading slash) → source file, relative to repo root. */
function sourceCandidates(pathname: string): string[] {
  const clean = pathname.replace(/\/$/, '') || '/';

  if (clean === '/') return ['src/pages/index.astro'];

  // Collection entries: /blog/<slug>, /glossary/<slug>, /hs-code/<slug>,
  // /solutions/<slug>. The content file is the thing that actually changed;
  // the [slug] template is a fallback for when only the template moved.
  const m = clean.match(/^\/(blog|glossary|hs-code|solutions)\/(.+)$/);
  if (m) {
    const [, section, slug] = m;
    const collection = section === 'solutions' ? 'solution' : section;
    return [
      `src/content/${collection}/${slug}.mdx`,
      `src/content/${collection}/${slug}.md`,
      `src/pages/${section}/[...slug].astro`,
      `src/pages/${section}/[slug].astro`,
    ];
  }

  // /vs/<slug> is generated from site.ts data, not per-slug files, so the
  // template and the data are jointly what "changed".
  if (clean.startsWith('/vs/')) return ['src/pages/vs/[slug].astro', 'src/data/site.ts'];

  // Plain pages and collection indexes.
  return [
    `src/pages${clean}.astro`,
    `src/pages${clean}/index.astro`,
    `src/pages${clean}.ts`,
  ];
}

const cache = new Map<string, string | undefined>();

/** ISO-8601 date of the last commit touching a path, or undefined. */
function gitDate(file: string): string | undefined {
  if (cache.has(file)) return cache.get(file);
  let out: string | undefined;
  try {
    if (existsSync(file)) {
      const raw = execFileSync('git', ['log', '-1', '--format=%cI', '--', file], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      out = raw || undefined;
    }
  } catch {
    // No git, no history, or a shallow clone. Claim nothing.
    out = undefined;
  }
  cache.set(file, out);
  return out;
}

/**
 * Most recent commit timestamp across a page's sources, ISO-8601.
 *
 * The full timestamp, not a date: @astrojs/sitemap parses whatever it is given
 * into a Date, so handing it "2026-08-09" produces `2026-08-09T00:00:00.000Z` —
 * a precise-looking midnight that no commit actually happened at. Passing the
 * real commit time keeps the emitted value true at the precision it claims.
 */
export function lastmodFor(pathname: string): string | undefined {
  /**
   * The committed map first. The production build runs inside Docker with
   * `.git` excluded, so live git returns nothing there and every URL would
   * ship without a lastmod — which is what actually happened: 0 of 43 URLs
   * carried one. scripts/lastmod.mjs resolves the dates where full history
   * exists and commits the result, so the build needs no git at all.
   */
  const fromFile = (committed.routes as Record<string, string>)[pathname];
  if (fromFile) return fromFile;

  // Local fallback, for a route added since the map was last generated.
  const dates = sourceCandidates(pathname)
    .map(gitDate)
    .filter((d): d is string => Boolean(d))
    .map((d) => new Date(d).getTime())
    .sort((a, b) => a - b);
  const newest = dates.at(-1);
  return newest ? new Date(newest).toISOString() : undefined;
}
