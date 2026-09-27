/**
 * The SERP title clamp — plain ESM so all three callers share ONE
 * implementation: BaseLayout (which renders the clamped title),
 * worker/posts.ts (which refuses a post the clamp would hard-cut) and
 * scripts/check-source-rules.mjs (which refuses the same at commit time).
 *
 * WHY ONE FILE. Until 27 Sep 2026 the rule existed three times: as
 * `clampTitle` in TypeScript, as `survivesClamp` in the worker, and as a
 * literal `60` plus two `lastIndexOf` calls in the source check. Three copies
 * of a threshold is three chances for the API to accept a title the build then
 * hard-cuts, which is the defect the check exists to prevent. Same pattern as
 * origin.mjs and publishing.mjs, for the same reason.
 *
 * Order of sacrifice, each tried only if it actually gets under the limit:
 * drop a trailing " — clause" (an em-dash clause is almost always the
 * elaboration, not the subject), then a trailing " | clause", then hard-cut at
 * the last word boundary. Never adds "…" — Google truncates with its own
 * ellipsis in the SERP, and appending one here would count against the budget
 * twice.
 */

/** The SERP budget. One number, one place. */
export const CLAMP_MAX = 60;

/**
 * @param {string} title
 * @param {number} [max]
 * @returns {string}
 */
export function clampTitle(title, max = CLAMP_MAX) {
  if (title.length <= max) return title;

  const emDash = title.lastIndexOf(' — ');
  if (emDash > 0 && emDash <= max) return title.slice(0, emDash);

  const pipe = title.lastIndexOf(' | ');
  if (pipe > 0 && pipe <= max) return title.slice(0, pipe);

  const cut = title.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd();
}

/**
 * Does the title survive the clamp with its meaning intact? True when it fits
 * the budget, or when it carries an em-dash or pipe clause that STARTS inside
 * the budget — the clamp drops such a clause whole, which reads fine. False
 * means a hard cut mid-phrase on the one line a searcher reads.
 *
 * @param {string} title
 * @param {number} [max]
 * @returns {boolean}
 */
export function survivesClamp(title, max = CLAMP_MAX) {
  if (title.length <= max) return true;
  const emDash = title.lastIndexOf(' — ');
  const pipe = title.lastIndexOf(' | ');
  return (emDash > 0 && emDash <= max) || (pipe > 0 && pipe <= max);
}
