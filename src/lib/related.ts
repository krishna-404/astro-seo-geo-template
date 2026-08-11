/**
 * Build-time related-content scoring — the contextual internal links that keep
 * every entry reachable from its topical neighbours (no orphan pages, cheap
 * crawl paths, and the cluster signal answer engines use to judge topical
 * coverage). Pure computation, zero dependencies, zero client JS.
 *
 * Scoring (normalised weights):
 *   1.0 × Jaccard over topics (tags / category+aliases)
 *   1.0 × Jaccard over title word-tokens (Intl.Segmenter — built into Node 22
 *         and every modern runtime; no dependency)
 *   0.3 × recency decay, half-life 365 days (undated entries score 0 here —
 *         reference material is not penalised for having no date)
 *   0.15 same-collection bonus — low on purpose: blog↔glossary cross-links
 *         are the point of having both collections, so the bonus breaks ties
 *         without walling the collections off.
 *
 * Curated beats correlation: `seeds` (the glossary's hand-picked `related`
 * frontmatter) rank first in their curated order; the scorer only fills the
 * remaining slots. Deterministic throughout — score desc, then published
 * desc (undated last), then id — so a rebuild without content changes cannot
 * reshuffle links (which would churn lastmod-adjacent diffs for no reason).
 *
 * Candidates must be pre-filtered through isPublished() at the call site; a
 * draft or scheduled entry must never be linkable (the broken-internal-links
 * CI check is the second net — a draft has no built page).
 */

export interface RelatedCandidate {
  /** Collection entry id (the slug). */
  id: string;
  collection: string;
  /** Display title for the link. */
  title: string;
  /** One-line summary shown after the link (description / shortDefinition). */
  summary: string;
  /** Topical labels: blog tags, or glossary [category, ...aliases]. */
  topics: string[];
  published?: Date;
}

const segmenter = new Intl.Segmenter('en', { granularity: 'word' });

function titleTokens(title: string): Set<string> {
  const tokens = new Set<string>();
  for (const seg of segmenter.segment(title.toLowerCase())) {
    if (seg.isWordLike && seg.segment.length > 2) tokens.add(seg.segment);
  }
  return tokens;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

const HALF_LIFE_DAYS = 365;

export function relatedFor(
  current: RelatedCandidate,
  candidates: RelatedCandidate[],
  { limit = 3, seeds = [] as string[], now = Date.now() } = {}
): RelatedCandidate[] {
  const pool = candidates.filter(
    (c) => !(c.id === current.id && c.collection === current.collection)
  );

  const seeded = seeds
    .map((id) => pool.find((c) => c.id === id))
    .filter((c): c is RelatedCandidate => c !== undefined);

  const currentTopics = new Set(current.topics.map((t) => t.toLowerCase()));
  const currentTitle = titleTokens(current.title);

  const scored = pool
    .filter((c) => !seeded.includes(c))
    .map((c) => {
      const topicScore = jaccard(currentTopics, new Set(c.topics.map((t) => t.toLowerCase())));
      const titleScore = jaccard(currentTitle, titleTokens(c.title));
      const ageDays = c.published ? (now - c.published.valueOf()) / 86_400_000 : Infinity;
      const recency = Number.isFinite(ageDays)
        ? 0.3 * Math.exp((-Math.LN2 * Math.max(0, ageDays)) / HALF_LIFE_DAYS)
        : 0;
      const sameCollection = c.collection === current.collection ? 0.15 : 0;
      return { c, score: topicScore + titleScore + recency + sameCollection };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aTime = a.c.published?.valueOf() ?? -1;
      const bTime = b.c.published?.valueOf() ?? -1;
      if (bTime !== aTime) return bTime - aTime;
      return a.c.id.localeCompare(b.c.id);
    })
    .map((s) => s.c);

  return [...seeded, ...scored].slice(0, limit);
}
