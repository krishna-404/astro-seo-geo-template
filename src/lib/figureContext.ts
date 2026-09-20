import type { Figure } from '../data/figureSchema';

/**
 * Hands a page's declared figures to the <Figure id="…" /> tags in its body.
 *
 * MDX bodies get their `Figure` component from the layout's
 * `<Content components={{ Figure: BodyFigure }} />`, and BodyFigure has no
 * way to see the entry's frontmatter — so the layout registers the figures
 * here before rendering the body, and BodyFigure looks its id up.
 *
 * This is module state, which is safe only because Astro renders pages one
 * at a time (`build.concurrency` defaults to 1 and astro.config.mjs must not
 * raise it — check-parity guards that). Each layout calls setFigures() again
 * for its own page, so nothing leaks between pages.
 */
let current: Figure[] = [];
let route = '';

export function setFigures(figs: Figure[], forRoute: string): void {
  current = figs;
  route = forRoute;
}

export function getBodyFigure(id: string): Figure {
  const f = current.find((x) => x.id === id && x.place === 'body');
  if (!f) {
    const have = current.filter((x) => x.place === 'body').map((x) => x.id).join(', ') || 'none';
    throw new Error(
      `<Figure id="${id}" /> in the body of ${route}: no body figure with that id in frontmatter (declared: ${have})`
    );
  }
  return f;
}
