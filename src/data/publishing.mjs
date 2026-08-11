/**
 * The ONE publish filter, as plain ESM so both the Astro pipeline (pages, RSS,
 * for-llms) and the zero-dependency node scripts (generate-llms, markdown-twins
 * via readContent.mjs, lastmod) share it — same pattern as origin.mjs, and for
 * the same reason: this predicate used to be copied as `!data.draft` in eight
 * places, which is how lastmod.mjs shipped without any filter at all.
 *
 * An entry is published when it is not a draft AND its `published` date (if it
 * has one) is not in the future. That second clause is scheduled publishing:
 * give a post `published: 2026-09-01` and it stays off every surface — pages,
 * sitemap, RSS, llms.txt, twins, lastmod — until a build runs on or after that
 * date. A static site has no runtime clock, so the post appears on the FIRST
 * BUILD after the instant passes, not at the instant itself (PLAYBOOK covers
 * scheduling a rebuild). Date-only YAML like `2026-09-01` parses as UTC
 * midnight — the post goes out at 00:00 UTC, not local time.
 *
 * No margin on the comparison, deliberately: a margin that publishes early
 * misstates the date, and one that publishes late is surprising. The 5-minute
 * page cache already blurs more than any margin would fix.
 */

/**
 * @param {{ draft?: boolean, published?: Date | string }} data
 *   Frontmatter — zod-coerced Dates from Astro, or raw YAML values (string or
 *   Date) when called from the plain-node scripts.
 * @param {number} [now] Epoch ms; injectable for tests.
 * @returns {boolean}
 */
export function isPublished(data, now = Date.now()) {
  if (data.draft) return false;
  if (data.published == null) return true;
  const t = new Date(data.published).getTime();
  // An unparseable date is a schema bug, not a scheduling decision — treat it
  // as unpublished so the mistake is visible (a missing page) rather than a
  // page with a garbage date on every machine-readable surface.
  if (Number.isNaN(t)) return false;
  return t <= now;
}
