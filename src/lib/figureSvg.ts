/**
 * Draws a figure declaration as an SVG string. Pure functions, no DOM.
 *
 * Conventions (the dataviz rules this site follows, kept here so every kind
 * agrees): thin marks, 4px rounded data-ends on bars, 2px lines, text always
 * in the ink tokens and never in a series colour, one hue for magnitude,
 * fixed hue order for identity (--viz-1, --viz-2, --viz-3), a 2px surface gap
 * between touching marks, no gridlines a label can replace. Colours are CSS
 * custom properties so the SVG is painted by the page's own tokens on the
 * page and by the card template's mirror of them on the social card.
 *
 * Width is a fixed 800 viewBox; height is computed per kind. The consumer
 * sizes it with CSS (width: 100%).
 */
import type {
  BarsFigure,
  CompareFigure,
  Figure,
  FlowFigure,
  OutlineFigure,
  StepsFigure,
  TilesFigure,
  TimelineFigure,
  WebFigure,
} from '../data/figureSchema';

export const W = 800;
const FONT = 'var(--font-sans)';
const INK = 'var(--ink)';
const INK2 = 'var(--ink-2)';
const INK3 = 'var(--ink-3)';
const LINE = 'var(--line-2)';
const SURFACE = 'var(--white)';
const TONE: Record<string, string> = {
  '1': 'var(--viz-1)',
  '2': 'var(--viz-2)',
  '3': 'var(--viz-3)',
  muted: 'var(--viz-muted)',
};

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Greedy word wrap by an approximate character budget. */
export function wrap(text: string, maxChars: number, maxLines = 2): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    const last = kept[maxLines - 1] ?? '';
    const trimmed = last.includes(' ') ? last.replace(/[,;:]?\s*\S*$/, '') : last;
    kept[maxLines - 1] = `${trimmed}…`;
    return kept;
  }
  return lines;
}

/** Font size that lets the longest unbreakable word fit `width` at ~0.58em per character. */
function fitSize(labels: string[], width: number, base: number, min = 11): number {
  const longest = Math.max(...labels.flatMap((l) => l.split(/\s+/)).map((w) => w.length), 1);
  return Math.max(min, Math.min(base, Math.floor(width / (longest * 0.58))));
}

function text(
  x: number,
  y: number,
  lines: string[],
  opts: { size?: number; weight?: number; fill?: string; anchor?: 'start' | 'middle' | 'end'; lineHeight?: number; mono?: boolean } = {}
): string {
  const { size = 16, weight = 400, fill = INK, anchor = 'start', lineHeight = 1.25, mono = false } = opts;
  const lh = size * lineHeight;
  const spans = lines
    .map((l, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lh}">${esc(l)}</tspan>`)
    .join('');
  return `<text x="${x}" y="${y}" font-family="${mono ? 'var(--font-mono)' : FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${spans}</text>`;
}

function svgOpen(height: number, id: string, title: string, desc: string, kind: string, lead: boolean): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${height}" width="${W}" height="${height}" role="img" aria-labelledby="${id}-t ${id}-d" data-figure="${kind}"${lead ? ' data-og-figure=""' : ''}>` +
    `<title id="${id}-t">${esc(title)}</title><desc id="${id}-d">${esc(desc)}</desc>`
  );
}

/* ── timeline ─────────────────────────────────────────────────────────── */

function timeline(f: TimelineFigure, id: string, lead: boolean): string {
  const n = f.phases.length;
  const x0 = 40;
  const x1 = W - 40;
  const gap = 3;
  const seg = (x1 - x0 - gap * (n - 1)) / n;
  const twoLine = f.markers.some((m) => m.label.length > 26);
  const barY = (f.markers.length > 2 ? 122 : 96) + (twoLine ? 17 : 0);
  const barH = 26;
  const hasMarkers = f.markers.length > 0;
  const height = barY + barH + 24 + 22 + 22 + 16;
  const parts: string[] = [];
  const boundary = (i: number) => x0 + i * (seg + gap) - (i > 0 ? gap / 2 : 0) + (i === n ? gap / 2 : 0);

  // phases
  f.phases.forEach((p, i) => {
    const x = x0 + i * (seg + gap);
    const tone = TONE[p.tone ?? String((i % 3) + 1)] ?? TONE['1'];
    const rx = 4;
    parts.push(`<rect x="${x}" y="${barY}" width="${seg}" height="${barH}" rx="${rx}" fill="${tone}"/>`);
    const cx = x + seg / 2;
    const budget = Math.max(8, Math.floor(seg / 8.6));
    parts.push(text(cx, barY + barH + 24, wrap(p.label, budget, 1), { size: 16, weight: 600, anchor: 'middle', fill: INK }));
    if (p.note) parts.push(text(cx, barY + barH + 46, wrap(p.note, budget + 2, 2), { size: 13, anchor: 'middle', fill: INK3 }));
  });

  // markers: ticks at boundaries with labels above. A label that would run
  // into its neighbour's is lifted to a second row with a longer tick.
  if (hasMarkers) {
    const sorted = [...f.markers].sort((a, b) => a.at - b.at);
    let prevEnd = -Infinity;
    let prevRow = 0;
    sorted.forEach((m) => {
      const at = Math.min(m.at, n);
      const x = boundary(at);
      const anchor = at === 0 ? 'start' : at === n ? 'end' : 'middle';
      const tx = at === 0 ? x0 : at === n ? x1 : x;
      const lines = wrap(m.label, 26, 2);
      const width = Math.min(Math.max(...lines.map((l) => l.length)), 26) * 8;
      const start = anchor === 'start' ? tx : anchor === 'end' ? tx - width : tx - width / 2;
      const row = start < prevEnd + 12 && prevRow === 0 ? 1 : 0;
      const top = barY - 30 - row * 26;
      parts.push(`<line x1="${x}" y1="${top}" x2="${x}" y2="${barY + barH + 4}" stroke="${INK2}" stroke-width="2" stroke-linecap="round"/>`);
      parts.push(`<circle cx="${x}" cy="${top}" r="4" fill="${INK2}" stroke="${SURFACE}" stroke-width="2"/>`);
      parts.push(text(tx, top - 12 - (lines.length - 1) * 17, lines, { size: 14, weight: 600, anchor, fill: INK2 }));
      prevEnd = start + width;
      prevRow = row;
    });
  }

  const desc = `${f.phases.map((p) => p.label).join(', then ')}.${f.markers.length ? ' Marked: ' + f.markers.map((m) => m.label).join('; ') + '.' : ''}`;
  return svgOpen(height, id, f.title, desc, 'timeline', lead) + parts.join('') + '</svg>';
}

/* ── flow ─────────────────────────────────────────────────────────────── */

function flow(f: FlowFigure, id: string, lead: boolean): string {
  const n = f.nodes.length;
  const x0 = 24;
  const x1 = W - 24;
  const arrowGap = 44;
  const boxW = (x1 - x0 - arrowGap * (n - 1)) / n;
  const boxH = 64;
  const arcs = f.edges.filter((e) => Math.abs(e.to - e.from) !== 1);
  const top = arcs.length ? 70 : 28;
  const boxY = top;
  const hasNotes = f.nodes.some((nd) => nd.note);
  const height = boxY + boxH + (hasNotes ? 74 : 24);
  const parts: string[] = [];
  const cx = (i: number) => x0 + i * (boxW + arrowGap) + boxW / 2;

  const labelSize = fitSize(f.nodes.map((nd) => nd.label), boxW - 16, 16);
  f.nodes.forEach((nd, i) => {
    const x = x0 + i * (boxW + arrowGap);
    parts.push(`<rect x="${x}" y="${boxY}" width="${boxW}" height="${boxH}" rx="10" fill="${SURFACE}" stroke="${LINE}" stroke-width="1.5"/>`);
    const lines = wrap(nd.label, Math.max(8, Math.floor((boxW - 16) / (labelSize * 0.55))), 2);
    const y = boxY + boxH / 2 + (lines.length === 1 ? labelSize * 0.36 : -2);
    parts.push(text(cx(i), y, lines, { size: labelSize, weight: 600, anchor: 'middle', fill: INK }));
    if (nd.note) parts.push(text(cx(i), boxY + boxH + 22, wrap(nd.note, Math.max(10, Math.floor(boxW / 6.4)), 3), { size: 12, anchor: 'middle', fill: INK3 }));
  });

  const edges = f.edges.length ? f.edges : Array.from({ length: n - 1 }, (_, i) => ({ from: i, to: i + 1, label: undefined as string | undefined }));
  const midY = boxY + boxH / 2;
  edges.forEach((e) => {
    const a = Math.min(e.from, e.to);
    const b = Math.max(e.from, e.to);
    const dir = e.to > e.from ? 1 : -1;
    if (b - a === 1) {
      const xa = x0 + a * (boxW + arrowGap) + boxW + 3;
      const xb = xa + arrowGap - 6;
      const [sx, ex] = dir === 1 ? [xa, xb] : [xb, xa];
      parts.push(`<line x1="${sx}" y1="${midY}" x2="${ex}" y2="${midY}" stroke="${INK2}" stroke-width="2" stroke-linecap="round" marker-end="url(#${id}-arrow)"/>`);
      if (e.label) parts.push(text((xa + xb) / 2, midY - 12, wrap(e.label, 12, 1), { size: 12, weight: 600, anchor: 'middle', fill: INK2 }));
    } else {
      const xa = cx(e.from);
      const xb = cx(e.to);
      const yTop = boxY - 40;
      parts.push(`<path d="M ${xa} ${boxY - 2} C ${xa} ${yTop}, ${xb} ${yTop}, ${xb} ${boxY - 2}" fill="none" stroke="${INK2}" stroke-width="2" stroke-linecap="round" marker-end="url(#${id}-arrow)"/>`);
      if (e.label) parts.push(text((xa + xb) / 2, yTop + 2, wrap(e.label, 30, 1), { size: 12, weight: 600, anchor: 'middle', fill: INK2 }));
    }
  });

  const defs = `<defs><marker id="${id}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${INK2}"/></marker></defs>`;
  const desc = f.nodes.map((nd) => nd.label).join(' → ');
  return svgOpen(height, id, f.title, desc, 'flow', lead) + defs + parts.join('') + '</svg>';
}

/* ── steps ────────────────────────────────────────────────────────────── */

function steps(f: StepsFigure, id: string, lead: boolean): string {
  const n = f.steps.length;
  const perRow = n <= 4 ? n : Math.ceil(n / 2);
  const rows = Math.ceil(n / perRow);
  const x0 = 40;
  const x1 = W - 40;
  const slot = (x1 - x0) / perRow;
  const rowH = 132;
  const height = rows * rowH + 8;
  const parts: string[] = [];
  const r = 18;

  f.steps.forEach((s, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const cx = x0 + slot * col + slot / 2;
    const cy = row * rowH + 34;
    if (col < perRow - 1 && i < n - 1) {
      parts.push(`<line x1="${cx + r + 4}" y1="${cy}" x2="${cx + slot - r - 4}" y2="${cy}" stroke="${LINE}" stroke-width="2"/>`);
    }
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${TONE['1']}"/>`);
    parts.push(text(cx, cy + 6, [String(i + 1)], { size: 16, weight: 700, anchor: 'middle', fill: SURFACE }));
    if (s.when) {
      parts.push(`<rect x="${cx + r + 6}" y="${cy - 11}" width="${s.when.length * 7.4 + 14}" height="22" rx="11" fill="var(--viz-1-soft)"/>`);
      parts.push(text(cx + r + 13, cy + 5, [s.when], { size: 12, weight: 700, fill: 'var(--viz-strong)', mono: true }));
    }
    const budget = Math.max(8, Math.floor(slot / 8.6));
    parts.push(text(cx, cy + r + 26, wrap(s.label, budget, 2), { size: 16, weight: 600, anchor: 'middle', fill: INK }));
    if (s.note) parts.push(text(cx, cy + r + 26 + 22 * Math.min(2, wrap(s.label, budget, 2).length) + 2, wrap(s.note, budget + 3, 2), { size: 13, anchor: 'middle', fill: INK3 }));
  });

  const desc = f.steps.map((s, i) => `${i + 1}. ${s.label}${s.when ? ` (${s.when})` : ''}`).join('; ');
  return svgOpen(height, id, f.title, desc, 'steps', lead) + parts.join('') + '</svg>';
}

/* ── bars ─────────────────────────────────────────────────────────────── */

export interface BarItem {
  label: string;
  value?: number;
  low?: number;
  high?: number;
  note?: string;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

function bars(f: BarsFigure, items: BarItem[], unit: string | undefined, id: string, lead: boolean): string {
  const labelW = 230;
  const x0 = labelW + 16;
  const x1 = W - 120;
  const max = Math.max(...items.map((i) => i.high ?? i.value ?? 0), 1);
  const scale = (v: number) => x0 + ((x1 - x0) * v) / max;
  const rowH = 38;
  const top = 18;
  const height = top + items.length * rowH + (unit ? 26 : 10);
  const parts: string[] = [];
  parts.push(`<line x1="${x0}" y1="${top - 6}" x2="${x0}" y2="${top + items.length * rowH - 10}" stroke="${LINE}" stroke-width="1"/>`);
  items.forEach((it, i) => {
    const y = top + i * rowH;
    const barY = y + 4;
    const h = 20;
    parts.push(text(labelW, barY + 15, wrap(it.label, 30, 1), { size: 15, weight: 600, anchor: 'end', fill: INK }));
    let tipX: number;
    let tip: string;
    if (it.value !== undefined) {
      const xEnd = scale(it.value);
      parts.push(`<path d="M ${x0} ${barY} H ${xEnd - 4} a 4 4 0 0 1 4 4 v ${h - 8} a 4 4 0 0 1 -4 4 H ${x0} Z" fill="${TONE['1']}"/>`);
      tipX = xEnd;
      tip = fmt(it.value);
    } else {
      const xa = scale(it.low ?? 0);
      const xb = scale(it.high ?? 0);
      parts.push(`<line x1="${x0}" y1="${barY + h / 2}" x2="${xa}" y2="${barY + h / 2}" stroke="var(--viz-1-soft)" stroke-width="${h}"/>`);
      parts.push(`<path d="M ${xa} ${barY} H ${xb - 4} a 4 4 0 0 1 4 4 v ${h - 8} a 4 4 0 0 1 -4 4 H ${xa} Z" fill="${TONE['1']}"/>`);
      tipX = xb;
      tip = `${fmt(it.low ?? 0)}–${fmt(it.high ?? 0)}`;
    }
    parts.push(text(tipX + 10, barY + 15, [tip], { size: 14, weight: 600, fill: INK2, mono: true }));
    if (it.note) parts.push(text(labelW, barY + 31, wrap(it.note, 34, 1), { size: 12, anchor: 'end', fill: INK3 }));
  });
  if (unit) parts.push(text(x1, height - 8, [unit], { size: 13, anchor: 'end', fill: INK3 }));
  const desc = items.map((i) => `${i.label}: ${i.value !== undefined ? fmt(i.value) : `${fmt(i.low ?? 0)}–${fmt(i.high ?? 0)}`}${unit ? ' ' + unit : ''}`).join('; ');
  return svgOpen(height, id, f.title, desc, 'bars', lead) + parts.join('') + '</svg>';
}

/* ── tiles ────────────────────────────────────────────────────────────── */

function tiles(f: TilesFigure, id: string, lead: boolean): string {
  const n = f.items.length;
  const longest = Math.max(...f.items.map((i) => i.label.length));
  const perRow = Math.min(n, longest > 34 ? 2 : longest > 20 ? 3 : 4);
  const gap = 16;
  const x0 = 16;
  const tileW = (W - x0 * 2 - gap * (perRow - 1)) / perRow;
  const hasNotes = f.items.some((i) => i.note);
  const tileH = hasNotes ? 100 : 84;
  const rows = Math.ceil(n / perRow);
  const height = rows * (tileH + gap) + 8;
  const parts: string[] = [];
  const fold = 14;
  f.items.forEach((it, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const x = x0 + col * (tileW + gap);
    const y = 8 + row * (tileH + gap);
    const stroke = it.state === 'missing' ? 'var(--viz-bad)' : it.state === 'ok' ? TONE['3'] : LINE;
    const fill = it.state === 'replaced' ? 'var(--viz-muted)' : SURFACE;
    const dash = it.state === 'missing' ? ' stroke-dasharray="5 4"' : '';
    // document silhouette: a rect with a folded top-right corner
    parts.push(
      `<path d="M ${x + 8} ${y} H ${x + tileW - fold} L ${x + tileW} ${y + fold} V ${y + tileH - 8} a 8 8 0 0 1 -8 8 H ${x + 8} a 8 8 0 0 1 -8 -8 V ${y + 8} a 8 8 0 0 1 8 -8 Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5"${dash}/>`
    );
    parts.push(`<path d="M ${x + tileW - fold} ${y} V ${y + fold} H ${x + tileW}" fill="none" stroke="${stroke}" stroke-width="1.5"/>`);
    // state mark, top-right inside the fold's shadow
    const mx = x + tileW - 26;
    const my = y + 26;
    if (it.state === 'ok') parts.push(`<path d="M ${mx - 6} ${my} l 4 4 l 8 -9" fill="none" stroke="${TONE['3']}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`);
    if (it.state === 'missing') parts.push(`<path d="M ${mx - 5} ${my - 5} l 10 10 M ${mx + 5} ${my - 5} l -10 10" fill="none" stroke="var(--viz-bad)" stroke-width="2.5" stroke-linecap="round"/>`);
    const marked = it.state === 'ok' || it.state === 'missing';
    const budget = Math.max(8, Math.floor((tileW - 40 - (marked ? 26 : 0)) / 8.2));
    const lines = wrap(it.label, budget, it.note ? 2 : 3);
    const ty = y + (it.note ? 30 : lines.length === 1 ? 48 : lines.length === 2 ? 38 : 28);
    const decoration = it.state === 'replaced' ? ' text-decoration="line-through"' : '';
    parts.push(
      text(x + 14, ty, lines, { size: 15, weight: 600, fill: it.state === 'replaced' ? INK3 : INK }).replace('<text ', `<text${decoration} `)
    );
    if (it.note) {
      const noteLines = wrap(it.note, Math.floor((tileW - 28) / 6.6), lines.length === 1 ? 2 : 1);
      parts.push(text(x + 14, y + tileH - 14 - (noteLines.length - 1) * 15, noteLines, { size: 12, fill: INK3 }));
    }
  });
  const desc = f.items.map((i) => `${i.label}${i.state !== 'neutral' ? ` (${i.state})` : ''}`).join(', ');
  return svgOpen(height, id, f.title, desc, 'tiles', lead) + parts.join('') + '</svg>';
}

/* ── compare ──────────────────────────────────────────────────────────── */

function mark(v: string, x: number, y: number): string | null {
  const t = v.trim().toLowerCase();
  if (t === 'yes') return `<circle cx="${x}" cy="${y}" r="12" fill="${TONE['3']}"/><path d="M ${x - 6} ${y} l 4 4 l 8 -9" fill="none" stroke="${SURFACE}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (t === 'no') return `<circle cx="${x}" cy="${y}" r="12" fill="var(--viz-muted)"/><path d="M ${x - 5} ${y - 5} l 10 10 M ${x + 5} ${y - 5} l -10 10" fill="none" stroke="${INK2}" stroke-width="2.5" stroke-linecap="round"/>`;
  if (t === 'partly') return `<circle cx="${x}" cy="${y}" r="12" fill="var(--viz-warn-soft)" stroke="var(--viz-warn)" stroke-width="2"/><path d="M ${x - 6} ${y} h 12" fill="none" stroke="${INK2}" stroke-width="2.5" stroke-linecap="round"/>`;
  return null;
}

function compare(f: CompareFigure, id: string, lead: boolean): string {
  const labelW = 210;
  const colW = (W - labelW - 32) / 2;
  const xa = labelW + 16;
  const xb = xa + colW;
  const budget = Math.floor((colW - 32) / 8.4);
  const aHead = wrap(f.aLabel, budget, 2);
  const bHead = wrap(f.bLabel, budget, 2);
  const headLines = Math.max(aHead.length, bHead.length);
  const headH = 26 + headLines * 20;
  const rowH = 66;
  const height = headH + f.rows.length * rowH + 8;
  const parts: string[] = [];
  parts.push(`<rect x="${xb}" y="0" width="${colW}" height="${height - 4}" rx="10" fill="var(--viz-1-soft)"/>`);
  parts.push(text(xa + 16, 28, aHead, { size: 15, weight: 700, fill: INK2 }));
  parts.push(text(xb + 16, 28, bHead, { size: 15, weight: 700, fill: 'var(--viz-strong)' }));
  f.rows.forEach((r, i) => {
    const y = headH + i * rowH;
    parts.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${LINE}" stroke-width="1"/>`);
    parts.push(text(0, y + 28, wrap(r.label, 24, 2), { size: 15, weight: 600, fill: INK }));
    for (const [v, x] of [
      [r.a, xa],
      [r.b, xb],
    ] as const) {
      const m = mark(v, x + 28, y + rowH / 2);
      if (m) parts.push(m);
      else parts.push(text(x + 16, y + 28, wrap(v, Math.floor((colW - 24) / 7.6), 2), { size: 14, fill: INK2 }));
    }
  });
  const desc = f.rows.map((r) => `${r.label}: ${f.aLabel} — ${r.a}; ${f.bLabel} — ${r.b}`).join('. ');
  return svgOpen(height, id, f.title, desc, 'compare', lead) + parts.join('') + '</svg>';
}

/* ── web ──────────────────────────────────────────────────────────────── */

function web(f: WebFigure, id: string, lead: boolean): string {
  const height = 300;
  const cx = W / 2;
  const cy = height / 2;
  const rx = 300;
  const ry = 105;
  const parts: string[] = [];
  const n = f.around.length;
  const pos = f.around.map((_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });
  pos.forEach((p) => parts.push(`<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="${LINE}" stroke-width="1.5"/>`));
  pos.forEach((p, i) => {
    const lbl = f.around[i] ?? '';
    const w = Math.min(190, lbl.length * 8.4 + 28);
    parts.push(`<rect x="${p.x - w / 2}" y="${p.y - 16}" width="${w}" height="32" rx="16" fill="${SURFACE}" stroke="${LINE}" stroke-width="1.5"/>`);
    parts.push(text(p.x, p.y + 5, wrap(lbl, 22, 1), { size: 14, weight: 600, anchor: 'middle', fill: INK2 }));
  });
  const cw = Math.min(260, f.centre.length * 11 + 40);
  parts.push(`<rect x="${cx - cw / 2}" y="${cy - 24}" width="${cw}" height="48" rx="24" fill="${TONE['1']}"/>`);
  parts.push(text(cx, cy + 7, wrap(f.centre, 24, 1), { size: 18, weight: 700, anchor: 'middle', fill: SURFACE }));
  const desc = `${f.centre}, related to ${f.around.join(', ')}`;
  return svgOpen(height, id, f.title, desc, 'web', lead) + parts.join('') + '</svg>';
}

/* ── outline ──────────────────────────────────────────────────────────── */

function outline(f: OutlineFigure, id: string, lead: boolean): string {
  const rowH = 46;
  const height = 16 + f.items.length * rowH;
  const x = 40;
  const parts: string[] = [];
  parts.push(`<line x1="${x}" y1="${24}" x2="${x}" y2="${height - 24}" stroke="${LINE}" stroke-width="2"/>`);
  f.items.forEach((it, i) => {
    const y = 24 + i * rowH;
    parts.push(`<circle cx="${x}" cy="${y}" r="14" fill="${TONE['1']}" stroke="${SURFACE}" stroke-width="2"/>`);
    parts.push(text(x, y + 5, [String(i + 1)], { size: 13, weight: 700, anchor: 'middle', fill: SURFACE }));
    parts.push(text(x + 30, y + 6, wrap(it, 78, 1), { size: 16, weight: 600, fill: INK }));
  });
  const desc = f.items.map((it, i) => `${i + 1}. ${it}`).join('; ');
  return svgOpen(height, id, f.title, desc, 'outline', lead) + parts.join('') + '</svg>';
}

/* ── dispatch ─────────────────────────────────────────────────────────── */

export function figureId(f: Figure): string {
  let h = 0;
  const s = JSON.stringify(f);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `fig-${h.toString(36)}`;
}

export function drawFigure(f: Figure, resolvedBars: { items: BarItem[]; unit?: string } | null, lead: boolean): string {
  const id = figureId(f);
  switch (f.kind) {
    case 'timeline':
      return timeline(f, id, lead);
    case 'flow':
      return flow(f, id, lead);
    case 'steps':
      return steps(f, id, lead);
    case 'bars':
      if (!resolvedBars) throw new Error(`bars figure "${f.title}" has no resolved items`);
      return bars(f, resolvedBars.items, resolvedBars.unit, id, lead);
    case 'tiles':
      return tiles(f, id, lead);
    case 'compare':
      return compare(f, id, lead);
    case 'web':
      return web(f, id, lead);
    case 'outline':
      return outline(f, id, lead);
  }
}
