import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
// Imported directly rather than via astro:content — the re-export is deprecated in Astro 7.
import { z } from 'zod';
import { figuresField } from './data/figureSchema';
import { GLOSSARY_CATEGORY_KEYS } from './data/taxonomy';
import { survivesClamp, CLAMP_MAX } from './lib/clamp.mjs';

/**
 * Content collections for the template.
 *
 * Two classes of content, with different rules:
 *
 *   blog       — reviewed posts with a named human author who has real
 *                credentials. Every post must contain something no LLM could
 *                produce — the `proprietary` field forces that question.
 *   glossary   — reference entries that may be published quickly, BUT every
 *                entry must carry real sourced data. A programmatic page with
 *                no unique data is exactly what Google's scaled-content-abuse
 *                policy penalises, so `sources` is required.
 *   solutions  — MONEY PAGES: one page per thing the company sells, one
 *                primary query each. `primaryKeyword` is REQUIRED here, not
 *                optional: a money page that does not declare the query it
 *                claims cannot be held to it (scripts/lib/intent.mjs reads the
 *                collections named in src/data/intent.json → claimFrom to
 *                decide which page CLAIMS a high-intent Search Console row).
 *                Ships empty; a site adds its own.
 *   comparison — head-to-head pages under /vs. The one page class that
 *                generates a letter if it is wrong, so EVERY CELL carries its
 *                own `source` and `retrieved` date, schema-enforced, and
 *                check-source-rules fails a cell checked more than 90 days ago.
 *                Ships empty.
 *
 * A new collection needs three things and CI checks all three: an entry in
 * src/data/collections.json (the route, whether twins are served, the social
 * card's eyebrow), a schema here, and a route file — a collection with entries
 * and no route renders nowhere, silently, which the ancestor site did for weeks.
 */

/** A citation. Required on programmatic pages — no source, no page. */
const source = z.object({
  label: z.string(),
  url: z.url().optional(),
  /** When the underlying figure was last checked against the source. */
  retrieved: z.coerce.date().optional(),
});

/** Named human author with real credentials. Non-negotiable on blog posts. */
const author = z.object({
  name: z.string(),
  title: z.string(),
  /** Feeds JSON-LD author.sameAs — must be a real profile. */
  sameAs: z.array(z.url()).min(1),
});

/**
 * Fields every page type shares, mapped onto <head> and JSON-LD.
 *
 * The bands here are the SAME numbers the rest of the battery uses, on purpose
 * — they were looser (title 70, description 50–200) while check-source-rules
 * enforced the clamp rule and check-invariants enforced 70–165, so the schema
 * accepted a page two other checks would reject and the failure arrived later
 * than it had to. One number, one place.
 */
const seo = {
  /**
   * BaseLayout renders this through the SERP clamp (src/lib/clamp.mjs). It may
   * exceed 60 characters only when it carries a trailing " — clause" or
   * " | clause" that STARTS inside 60, which the clamp drops whole; anything
   * else would be hard-cut mid-phrase on the one line a searcher reads.
   * check-source-rules enforces the same rule at commit time, from the same
   * function.
   */
  title: z
    .string()
    .max(70)
    .refine(survivesClamp, {
      message: `over ${CLAMP_MAX} characters with no " — " or " | " clause the SERP clamp can drop — it would be hard-cut mid-phrase`,
    }),
  /** The SERP snippet band, the same one check-invariants measures on the built page. */
  description: z.string().min(70).max(165),
  /** Front-loaded answer. GEO evidence says put it in the first 30% of the page. */
  tldr: z.string().min(40).max(400),
  draft: z.boolean().default(false),
  canonical: z.url().optional(),
  ogImage: z.string().optional(),
  /**
   * Alt text for a CUSTOM ogImage. The generated cards render the page title
   * as text, so for them the title IS an accurate description and BaseLayout
   * falls back to it. An entry that points `ogImage` at something else — a
   * screenshot, a photo — describes it here, or og:image:alt claims the title
   * describes a picture it does not.
   */
  ogImageAlt: z.string().min(4).max(180).optional(),
  updated: z.coerce.date().optional(),
  /** Renders <Faq /> AND the FAQPage JSON-LD from one array (src/lib/faqSchema.ts). */
  faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  /** Opt-in "On this page" anchor list for long entries (4+ h2s is the guideline). */
  toc: z.boolean().default(false),
  /**
   * The one query this page is meant to win (one page = one primary query =
   * one intent, AGENTS § Content rules). Optional on reference entries; a
   * money-page collection should make it required. scripts/lib/intent.mjs
   * reads these two fields from the collections named in
   * src/data/intent.json → claimFrom to decide which page CLAIMS a
   * high-intent Search Console query.
   */
  primaryKeyword: z.string().optional(),
  secondaryKeywords: z.array(z.string()).default([]),
  /**
   * The page's pictographs and infographics, drawn at build time as inline
   * SVG (`src/data/figureSchema.ts`, `Figure.astro`). One `lead` figure sits
   * after the TL;DR and is lifted onto the social card; `body` figures are
   * placed with <Figure id="…" /> in the MDX. A page that declares none gets
   * its collection's automatic figure (src/lib/figures.ts) — every content
   * page carries a visual, and check-invariants fails one that does not.
   */
  figures: figuresField,
};

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    ...seo,
    published: z.coerce.date(),
    author,
    tags: z.array(z.string()).default([]),
    /**
     * What makes this post un-generatable by an LLM. Required — if you can't
     * fill it in, the post doesn't clear the bar: a post that any model could
     * have written adds nothing to the corpus and nothing worth citing.
     */
    proprietary: z.enum([
      'original-data',
      'first-hand-experience',
      'original-analysis',
      'expert-interview',
      'case-study',
    ]),
    /**
     * WHICH piece of fuel, by name. `proprietary` is a closed enum — it says
     * what KIND of thing backs the post, which is all a check can verify. The
     * fuel rule (marketing/content-guidelines.md § 2) asks the writer to name
     * the thing itself: a field-note id, a news-log date, the insights finding
     * or the social-sweep post. Optional, because a year of entries predates
     * it; /write-content fills it on everything it drafts, and a post that
     * cannot fill it has not cleared the fuel rule.
     */
    fuel: z.string().min(4).max(200).optional(),
    sources: z.array(source).default([]),
    /**
     * How the post arrived. `posts-api` marks one the posts API opened a PR
     * for — the daily run's PR inbox identifies API posts by this key, and
     * without the field zod would reject the frontmatter the worker writes.
     * Absent means a human or a skill wrote it in the repo.
     */
    via: z.string().optional(),
  }),
});

const glossary = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/glossary' }),
  schema: z.object({
    ...seo,
    term: z.string(),
    aliases: z.array(z.string()).default([]),
    /**
     * Closed vocabulary from src/data/taxonomy.ts — a typo'd category fails
     * the build at the entry that carries it instead of shipping a one-entry
     * group on the index page. Add categories THERE (one line); this enum and
     * the index's group order both follow.
     */
    category: z.enum(GLOSSARY_CATEGORY_KEYS),
    /** The 40-word answer an LLM will lift. Keep it correct and quotable. */
    shortDefinition: z.string().min(40).max(300),
    related: z.array(z.string()).default([]),
    sources: z.array(source).min(1),
  }),
});

/**
 * A money page. One offering, one primary query, one primary action.
 *
 * WHY THE FIELDS ARE STRUCTURED RATHER THAN PROSE. A money page has to answer
 * the same six things every time — what you get, how it is delivered, what it
 * costs, what changes for the buyer, who it suits, what to do next — and a
 * template that renders them from data cannot ship a page that quietly omits
 * the price or the process. marketing/site-blueprint.md § 1 is the source of
 * that list; marketing/page-guidelines.md § 2 is how each is written.
 */
const solutions = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/solutions' }),
  schema: z.object({
    ...seo,
    /** REQUIRED here: a money page that claims no query cannot be held to one. */
    primaryKeyword: z.string().min(2),
    /** What the customer gets, one line. Becomes the About page's "Core offering" row. */
    offering: z.string().min(20).max(200),
    /**
     * Which schema.org type the offering is. A Service is work performed, a
     * Product is a thing sold, a SoftwareApplication is software — an engine
     * reads these differently and guessing on the site's behalf would be
     * worse than asking.
     */
    schemaType: z.enum(['Service', 'Product', 'SoftwareApplication']),
    /**
     * `published` pricing emits an `offers` node; `on-request` and `free` do
     * not. A price in JSON-LD that the page does not show is a claim nobody
     * can check, and Google's structured-data policy asks for the two to agree.
     */
    pricing: z.object({
      model: z.enum(['published', 'on-request', 'free']),
      from: z.number().positive().optional(),
      currency: z.string().length(3).default('USD'),
      note: z.string().max(200).optional(),
    }),
    /** How it is delivered. Renders as the process list, and as a `steps` figure. */
    process: z.array(z.object({ step: z.string().min(3).max(64), detail: z.string().min(10).max(240) })).default([]),
    /** What changes for the buyer. Not features — outcomes. */
    outcomes: z.array(z.string().min(10).max(200)).default([]),
    /** The ONE primary action. Measured: data-umami-event is derived from the slug. */
    cta: z.object({ label: z.string().min(2).max(40), href: z.string().min(1) }),
    /**
     * Optional comparison rows, for a solution whose buyer is choosing between
     * named options. Absent means the page renders no table — an empty table
     * is worse than none.
     */
    compare: z
      .object({
        aLabel: z.string().min(1).max(64),
        bLabel: z.string().min(1).max(64),
        rows: z.array(z.object({ label: z.string().min(1).max(64), a: z.string().max(90), b: z.string().max(90) })).min(2),
      })
      .optional(),
    sources: z.array(source).default([]),
  }),
});

/**
 * A comparison page. `/vs/<rival>` and "alternatives" queries are the highest
 * commercial intent a content page can carry, and the one page class that
 * generates a letter when it is wrong.
 *
 * So the schema makes honesty structural rather than editorial: every row
 * carries the source it was read from and the date it was read, `min(3)` rows
 * so the page is a comparison rather than a claim, `bestFor` with at least two
 * options so it names a case where the rival wins, and a `verdict` that has to
 * be written. `updated` is required and check-source-rules fails a row whose
 * `retrieved` is more than 90 days old — a verified cell that is no longer
 * verified is a false claim with a date on it.
 */
const comparison = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/comparison' }),
  schema: z.object({
    ...seo,
    primaryKeyword: z.string().min(2),
    /** Our product, as the table names it. */
    us: z.string().min(1).max(64),
    rivals: z
      .array(z.object({ name: z.string().min(1).max(64), url: z.url(), pricingUrl: z.url().optional() }))
      .min(1),
    rows: z
      .array(
        z.object({
          criterion: z.string().min(3).max(90),
          us: z.string().min(1).max(200),
          /** One cell per rival, in `rivals` order. */
          them: z.array(z.string().min(1).max(200)).min(1),
          /** Where this row was read. Required: a comparison cell is a claim about someone else. */
          source: z.url(),
          /** When it was read. check-source-rules fails a row older than 90 days. */
          retrieved: z.coerce.date(),
        })
      )
      .min(3),
    /** Who each option suits — the line an assistant lifts. At least two, so the rival wins somewhere. */
    bestFor: z.array(z.object({ option: z.string().min(1).max(64), audience: z.string().min(10).max(240) })).min(2),
    /** Never "best for everyone". */
    verdict: z.string().min(40).max(600),
    /** Required: page-audit holds a comparison to 30 days, not 90. */
    updated: z.coerce.date(),
    sources: z.array(source).min(1),
  }),
});

export const collections = { blog, glossary, solutions, comparison };
