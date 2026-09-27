/**
 * Reading `facts.json → company` on the one rule that matters: a value that is
 * still TODO does not exist.
 *
 * WHY A HELPER AND NOT `?? ''`. The About page is the entity source document an
 * engine resolves the brand from, and its Key Facts table is a list of claims.
 * A row rendering the literal string "TODO" is a claim that the company's legal
 * name is TODO; an empty string in the Organization node's `sameAs` is invalid
 * structured data, which the entity-hygiene invariant fails. So there is one
 * predicate — `filled()` — and every caller either gets a real value or nothing,
 * and omits the row. marketing/page-guidelines.md § 3: "a row the site cannot
 * fill honestly is omitted, never estimated."
 *
 * The TODO markers are meant to be here in the template and meant to be caught:
 * SETUP's placeholder grep and ACTIONS A-L02/A-L04/A-L13 all key on them.
 */
import facts from '../data/facts.json';

type Fact = { value?: unknown; source?: string };

const isTodo = (v: unknown): boolean =>
  v === undefined || v === null || (typeof v === 'string' && (v.trim() === '' || /^TODO\b/i.test(v.trim())));

/** The value of a `{ value, source }` leaf, or null while it is TODO or empty. */
export function filled(fact: Fact | undefined): string | null {
  if (!fact || isTodo(fact.value)) return null;
  if (typeof fact.value === 'number') return String(fact.value);
  return typeof fact.value === 'string' ? fact.value.trim() : null;
}

/**
 * The entries of a `{ value: [] }` leaf, with TODO strings dropped. The cast is
 * for the same reason as `notableClients` below: the shipped arrays are empty,
 * so TypeScript infers `never[]`.
 */
export function filledList(fact: Fact | undefined): string[] {
  const list = fact?.value as unknown[] | undefined;
  if (!Array.isArray(list)) return [];
  return list.filter((v) => typeof v === 'string' && !isTodo(v)).map((v) => String(v).trim());
}

/** Prose from about.json: the string, or null while it is TODO. */
export const prose = (v: unknown): string | null => (isTodo(v) ? null : String(v).trim());

/** Prose entries from about.json, TODO ones dropped. */
export const proseList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x) => !isTodo(x)).map((x) => String(x).trim()) : [];

export const company = facts.company;

/**
 * The city/region/country address, but ONLY when all three are filled. A
 * partial PostalAddress is a worse claim than none: an engine reading
 * `addressCountry` alone cannot place the company and may place it wrongly.
 */
export function address(): { city: string; region: string; country: string } | null {
  const hq = company.headquarters;
  const city = filled(hq?.city);
  const region = filled(hq?.region);
  const country = filled(hq?.country);
  return city && region && country ? { city, region, country } : null;
}

/**
 * Named clients the company has PERMISSION to name. Nothing else renders —
 * naming a customer who has not agreed is the fastest way to lose them, and a
 * template cannot make that call, so the flag is required rather than assumed.
 *
 * The cast is needed because the shipped list is EMPTY, so TypeScript infers
 * `never[]` for it. The shape is documented in facts.json's own $comment.
 */
type Client = { name?: unknown; permission?: unknown };

export function notableClients(): string[] {
  const list = company.notableClients?.value as Client[] | undefined;
  if (!Array.isArray(list)) return [];
  return list
    .filter((c) => c && typeof c === 'object' && c.permission === true && typeof c.name === 'string')
    .map((c) => String(c.name).trim())
    .filter((n) => !isTodo(n));
}
