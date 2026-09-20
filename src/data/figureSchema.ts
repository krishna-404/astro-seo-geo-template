import { z } from 'zod';

/**
 * Figures: the pictographs and infographics a page carries, declared in
 * frontmatter and drawn at build time as inline SVG by `Figure.astro`.
 *
 * Why declarations and not image files: a figure declared as data is drawn
 * from the same tokens as the page (so it is on-brand and AA by construction),
 * costs no bytes beyond its own markup, is readable by a screen reader through
 * its <title>/<desc>, and — the point that matters for sharing — the social
 * card renderer (`marketing/og/render-pages.mjs`) lifts the very same SVG off
 * the built page, so a link preview shows the thing the page explains.
 *
 * Numbers. A `bars` figure states figures, and figures on this site come from
 * `facts.json` (AGENTS.md § Verified numbers). So `bars` takes either `fact`
 * (a path into facts.json, resolved by src/lib/figures.ts, refusing anything
 * marked verified:false) or inline `items` PLUS a `source` label — and
 * check-source-rules fails an inline figure whose source label is not one of
 * the entry's own `sources`. No third way.
 *
 * Every other kind carries labels only: the shape of a process, a timeline, a
 * document set, a comparison. Labels are short on purpose — a figure is read
 * at 500px in a feed and at 44rem on the page.
 */

const label = z.string().min(1).max(64);
const note = z.string().min(1).max(90).optional();

const common = {
  /** Referenced from the body as <Figure id="…" /> when place is `body`. */
  id: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'figure id: lowercase letters, digits and hyphens')
    .optional(),
  /** Becomes the SVG <title> and the visible figcaption. */
  title: z.string().min(8).max(120),
  /** One sentence under the figure. Optional; the title often suffices. */
  caption: z.string().min(8).max(240).optional(),
  /**
   * `lead` — rendered after the TL;DR and lifted onto the social card.
   * `body` — rendered where the body says <Figure id="…" />.
   * At most one lead figure per page.
   */
  place: z.enum(['lead', 'body']).default('lead'),
};

/** Phases along one clock, with markers at the boundaries between them. */
export const timelineFigure = z.object({
  ...common,
  kind: z.literal('timeline'),
  phases: z
    .array(
      z.object({
        label,
        note,
        /** Which categorical hue the phase wears; `muted` for a free or idle span. */
        tone: z.enum(['1', '2', '3', 'muted']).optional(),
      })
    )
    .min(2)
    .max(6),
  /** `at` is a boundary index: 0 is the start of the first phase, N the end of the last. */
  markers: z.array(z.object({ at: z.number().int().min(0).max(6), label })).max(7).default([]),
});

/** Parties or systems in a row, with what passes between them on the arrows. */
export const flowFigure = z.object({
  ...common,
  kind: z.literal('flow'),
  nodes: z.array(z.object({ label, note })).min(2).max(6),
  /** Indexes into `nodes`. Consecutive edges draw as arrows; others as arcs above. */
  edges: z
    .array(z.object({ from: z.number().int().min(0), to: z.number().int().min(0), label: z.string().max(40).optional() }))
    .max(8)
    .default([]),
});

/** A numbered sequence — a process, a ladder, a checklist in order. */
export const stepsFigure = z.object({
  ...common,
  kind: z.literal('steps'),
  steps: z
    .array(z.object({ label, note, /** Small timing or condition tag, e.g. "24h". */ when: z.string().max(24).optional() }))
    .min(2)
    .max(8),
});

/** Horizontal bars, one series. Values from facts.json or from sourced inline items. */
export const barsFigure = z
  .object({
    ...common,
    kind: z.literal('bars'),
    /** Dotted path into facts.json, e.g. "time.deskHoursPerContainerBreakdown". */
    fact: z.string().regex(/^[a-zA-Z0-9_.$-]+$/).optional(),
    items: z
      .array(
        z.object({
          label,
          value: z.number().nonnegative().optional(),
          low: z.number().nonnegative().optional(),
          high: z.number().nonnegative().optional(),
          note,
        })
      )
      .min(1)
      .max(8)
      .optional(),
    unit: z.string().max(40).optional(),
    /** Required with inline items: must be one of the entry's `sources` labels (they run long). */
    source: z.string().max(600).optional(),
  })
  .refine((f) => Boolean(f.fact) !== Boolean(f.items), {
    message: 'bars: give either `fact` or `items`, not both and not neither',
  })
  .refine((f) => !f.items || Boolean(f.source), {
    message: 'bars: inline `items` need a `source` (one of the entry’s sources labels)',
  })
  .refine((f) => !f.items || f.items.every((i) => i.value !== undefined || (i.low !== undefined && i.high !== undefined)), {
    message: 'bars: every item needs `value`, or both `low` and `high`',
  });

/** A set of things — documents, signals, jobs — as tiles, each with a state. */
export const tilesFigure = z.object({
  ...common,
  kind: z.literal('tiles'),
  items: z
    .array(
      z.object({
        label,
        note,
        /** ok — present/verified · missing — absent · replaced — struck through · neutral — plain. */
        state: z.enum(['ok', 'missing', 'replaced', 'neutral']).default('neutral'),
      })
    )
    .min(2)
    .max(12),
});

/** Two columns compared row by row. Cells are text; "yes"/"no" render as marks. */
export const compareFigure = z.object({
  ...common,
  kind: z.literal('compare'),
  aLabel: label,
  bLabel: label,
  rows: z.array(z.object({ label, a: z.string().max(90), b: z.string().max(90) })).min(2).max(6),
});

/** One term in the centre, the terms around it on a ring. */
export const webFigure = z.object({
  ...common,
  kind: z.literal('web'),
  centre: label,
  around: z.array(label).min(2).max(8),
});

/** The sections of a piece as a numbered path. */
export const outlineFigure = z.object({
  ...common,
  kind: z.literal('outline'),
  items: z.array(label).min(2).max(8),
});

export const figureSchema = z.discriminatedUnion('kind', [
  timelineFigure,
  flowFigure,
  stepsFigure,
  barsFigure,
  tilesFigure,
  compareFigure,
  webFigure,
  outlineFigure,
]);

/** The frontmatter field: a list, at most one of which leads. */
export const figuresField = z
  .array(figureSchema)
  .default([])
  .refine((figs) => figs.filter((f) => f.place === 'lead').length <= 1, {
    message: 'figures: at most one figure may have place: lead',
  })
  .refine(
    (figs) => figs.filter((f) => f.place === 'body').every((f) => f.id),
    { message: 'figures: a body figure needs an id so the body can place it' }
  );

export type Figure = z.infer<typeof figureSchema>;
export type TimelineFigure = z.infer<typeof timelineFigure>;
export type FlowFigure = z.infer<typeof flowFigure>;
export type StepsFigure = z.infer<typeof stepsFigure>;
export type BarsFigure = z.infer<typeof barsFigure>;
export type TilesFigure = z.infer<typeof tilesFigure>;
export type CompareFigure = z.infer<typeof compareFigure>;
export type WebFigure = z.infer<typeof webFigure>;
export type OutlineFigure = z.infer<typeof outlineFigure>;
