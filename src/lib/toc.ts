/**
 * DOM-free table-of-contents computation from Astro's `headings` array
 * (returned by `render(entry)` — depth/slug/text per markdown heading).
 *
 * One pure function, deliberately separate from the component that renders
 * it: the logic that decides WHAT the TOC contains (depth window, min-depth
 * normalisation) must not live tangled in markup. Min-depth normalisation
 * means a body that starts at h3 still renders a flat list — levels are
 * relative to the shallowest heading present, not absolute.
 *
 * h1 never appears: the frontmatter title is the page's h1 (AGENTS rule 7)
 * and markdown bodies start at ##.
 */
export interface TocItem {
  slug: string;
  text: string;
  /** 0 = shallowest heading present, 1 = one deeper, … */
  level: number;
}

export function computeTocItems(
  headings: { depth: number; slug: string; text: string }[],
  maxDepth = 3
): TocItem[] {
  const inWindow = headings.filter((h) => h.depth >= 2 && h.depth <= maxDepth);
  if (inWindow.length === 0) return [];
  const minDepth = Math.min(...inWindow.map((h) => h.depth));
  return inWindow.map((h) => ({
    slug: h.slug,
    text: h.text,
    level: h.depth - minDepth,
  }));
}
