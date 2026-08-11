import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
// Imported directly rather than via astro:content — the re-export is deprecated in Astro 7.
import { z } from 'zod';

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

/** Fields every page type shares, mapped onto <head> and JSON-LD. */
const seo = {
  title: z.string().max(70),
  description: z.string().min(50).max(200),
  /** Front-loaded answer. GEO evidence says put it in the first 30% of the page. */
  tldr: z.string().min(40).max(400),
  draft: z.boolean().default(false),
  canonical: z.url().optional(),
  ogImage: z.string().optional(),
  updated: z.coerce.date().optional(),
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
    faq: z
      .array(z.object({ q: z.string(), a: z.string() }))
      .default([]),
  }),
});

const glossary = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/glossary' }),
  schema: z.object({
    ...seo,
    term: z.string(),
    aliases: z.array(z.string()).default([]),
    /**
     * Free text here so the template builds with any vocabulary — tighten it
     * to an enum per site once the category list settles, so a typo fails the
     * build instead of creating a one-entry group on the index page.
     */
    category: z.string().min(2),
    /** The 40-word answer an LLM will lift. Keep it correct and quotable. */
    shortDefinition: z.string().min(40).max(300),
    related: z.array(z.string()).default([]),
    sources: z.array(source).min(1),
  }),
});

export const collections = { blog, glossary };
