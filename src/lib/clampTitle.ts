/**
 * Clamps a page <title> to `max` characters for SERP display.
 *
 * Order of sacrifice, each tried only if it actually gets under the limit:
 * drop a trailing " — clause" (an em-dash clause is almost always the
 * elaboration, not the subject), then a trailing " | clause", then hard-cut
 * at the last word boundary. Never adds "…" — Google truncates with its own
 * ellipsis in the SERP, and appending one here would just count against the
 * budget twice.
 */
export function clampTitle(title: string, max = 60): string {
  if (title.length <= max) return title;

  const emDash = title.lastIndexOf(' — ');
  if (emDash > 0 && emDash <= max) return title.slice(0, emDash);

  const pipe = title.lastIndexOf(' | ');
  if (pipe > 0 && pipe <= max) return title.slice(0, pipe);

  const cut = title.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd();
}
