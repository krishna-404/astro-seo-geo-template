/**
 * Figure helpers for the page templates: resolve `bars` values from
 * facts.json, and build the figure a collection gets for free when an entry
 * declares none (a glossary term among its related terms, a post's sections
 * as a path).
 *
 * The rule the fallbacks serve: every content page carries at least one
 * figure, so every social card can carry the page's own visual
 * (check-invariants enforces both). An author who wants something better
 * than the fallback declares `figures:` in frontmatter — see AGENTS.md and
 * /write-content § Every piece carries a figure. A site that adds a
 * collection with structured frontmatter (a tariff, a document set, a job
 * list) adds its own builder here, the way the ancestor site did for its
 * ports, industries and comparison pages.
 */
import facts from '../data/facts.json';
import type { BarsFigure, Figure } from '../data/figureSchema';
import type { BarItem } from './figureSvg';

type Node = Record<string, unknown>;

function walk(path: string): { node: unknown; verifiedFalse: boolean } {
  let node: unknown = facts;
  let verifiedFalse = false;
  for (const key of path.split('.')) {
    if (typeof node !== 'object' || node === null || !(key in (node as Node))) {
      throw new Error(`bars fact "${path}": no such path in facts.json (stopped at "${key}")`);
    }
    node = (node as Node)[key];
    if (typeof node === 'object' && node !== null && (node as Node).verified === false) verifiedFalse = true;
  }
  return { node, verifiedFalse };
}

function humanise(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

/**
 * Two shapes of facts.json are chartable:
 *  - an array of {label|task, low, high | value} rows → range or value bars;
 *  - an object of {value, unit, label?} entries → one bar each.
 * A node marked verified:false anywhere on the path is refused — the site
 * does not chart a number it will not print.
 */
export function resolveBars(f: BarsFigure): { items: BarItem[]; unit?: string } {
  if (f.items) return { items: f.items, unit: f.unit };
  const { node, verifiedFalse } = walk(f.fact!);
  if (verifiedFalse) throw new Error(`bars fact "${f.fact}" is marked verified:false in facts.json — not chartable`);

  if (Array.isArray(node)) {
    const items: BarItem[] = node.map((row) => {
      const r = row as Node;
      const label = String(r.task ?? r.label ?? '');
      if (r.minutesLow !== undefined) return { label, low: Number(r.minutesLow), high: Number(r.minutesHigh) };
      if (r.low !== undefined) return { label, low: Number(r.low), high: Number(r.high) };
      return { label, value: Number(r.value) };
    });
    const first = node[0] as Node;
    const unit = f.unit ?? (first.minutesLow !== undefined ? 'minutes' : first.unit ? String(first.unit) : undefined);
    return { items, unit };
  }

  if (typeof node === 'object' && node !== null) {
    const entries = Object.entries(node as Node).filter(
      ([k, v]) => !k.startsWith('$') && typeof v === 'object' && v !== null && typeof (v as Node).value === 'number'
    );
    if (entries.length === 0) throw new Error(`bars fact "${f.fact}": nothing chartable under that path`);
    const units = new Set(entries.map(([, v]) => String((v as Node).unit ?? '')));
    const items: BarItem[] = entries.map(([k, v]) => {
      const n = v as Node;
      return { label: String(n.label ?? humanise(k)), value: Number(n.value) };
    });
    return { items, unit: f.unit ?? (units.size === 1 ? [...units][0] || undefined : undefined) };
  }
  throw new Error(`bars fact "${f.fact}": not an array or object`);
}

/** A glossary term and the terms it is defined against. */
export function relatedWebFigure(term: string, related: string[]): Figure | null {
  if (related.length < 2) return null;
  return {
    kind: 'web',
    place: 'lead',
    title: `${term} and the terms around it`,
    centre: term,
    around: related.slice(0, 8),
  };
}

/** A post's sections as a numbered path — the fallback when a post declares no figure. */
export function outlineFigure(title: string, headings: { depth: number; text: string }[]): Figure | null {
  const h2 = headings.filter((h) => h.depth === 2).map((h) => h.text.replace(/\s+/g, ' ').trim());
  if (h2.length < 2) return null;
  return {
    kind: 'outline',
    place: 'lead',
    title: `What this piece covers: ${title}`,
    items: h2.slice(0, 8).map((t) => (t.length > 64 ? `${t.slice(0, 61).replace(/\s+\S*$/, '')}…` : t)),
  };
}

/** The lead figure for a page: the declared one, else the collection's auto figure. */
export function leadFigure(declared: Figure[], fallback: () => Figure | null): Figure | null {
  return declared.find((f) => f.place === 'lead') ?? fallback();
}
