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
 *   blog      — reviewed posts with a named human author who has real
 *               credentials. Every post must contain something no LLM could
 *               produce — the `proprietary` field forces that question.
 *   glossary  — reference entries that may be published quickly, BUT every
 *               entry must carry real sourced data. A programmatic page with
 *               no unique data is exactly what Google's scaled-content-abuse
 *               policy penalises, so `sources` is required.
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

export const collections = { blog, glossary };
