/**
 * The glossary's closed category vocabulary — the single source for the zod
 * enum in content.config.ts AND the group order on the glossary index.
 *
 * Closed on purpose: with a free string, a typo'd category ships as a
 * one-entry group on the index page and nobody notices. With this enum, the
 * typo fails the build at the entry that carries it — that is the feature.
 * Adding a category is a one-line edit here; the schema and the index pick it
 * up automatically.
 *
 * ORDER IS MEANINGFUL: the index renders groups in the order declared here —
 * the order a reader would learn the domain in, not the alphabet's.
 */
export const GLOSSARY_CATEGORIES = [
  { key: 'machine-readability', label: 'Machine readability' },
  { key: 'performance', label: 'Performance' },
] as const;

export const GLOSSARY_CATEGORY_KEYS = GLOSSARY_CATEGORIES.map((c) => c.key) as [
  (typeof GLOSSARY_CATEGORIES)[number]['key'],
  ...(typeof GLOSSARY_CATEGORIES)[number]['key'][],
];
