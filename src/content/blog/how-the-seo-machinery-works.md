---
title: 'How this template''s SEO machinery works'
description: 'A tour of the SEO plumbing this template ships with — canonical URLs, JSON-LD, sitemap, RSS and OG cards — and which file each piece lives in.'
tldr: 'Every page in this template gets a canonical URL, Open Graph tags and JSON-LD from BaseLayout automatically; the sitemap, RSS feed and llms.txt are generated at build time. You write content and frontmatter — the machinery is already wired.'
published: 2026-08-11
updated: 2026-08-11
toc: true
author:
  name: 'TODO Founder Name'
  title: 'Founder'
  sameAs:
    - 'https://www.linkedin.com/in/TODO'
tags:
  - template
  - seo
proprietary: original-analysis
sources:
  - label: 'Google Search Central — SEO Starter Guide'
    url: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide'
    retrieved: 2026-08-11
  - label: 'Google Search Central — Intro to structured data markup'
    url: 'https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data'
    retrieved: 2026-08-11
  - label: 'Google Search Central — Consolidate duplicate URLs (canonicalization)'
    url: 'https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls'
    retrieved: 2026-08-11
faq:
  - q: 'Do I need to add meta tags to each page myself?'
    a: 'No. Every page renders through BaseLayout, which emits the title, meta description, canonical URL, Open Graph tags and JSON-LD from the props the page passes. You supply a title and description per page; everything else is derived.'
  - q: 'Where do I change the site name, domain and default description?'
    a: 'In src/data/site.ts (and origin.mjs for the domain). Nothing brand-specific is typed into markup — pages import from that one file, so a rename is a one-file change.'
---

## One layout owns the head

Every page in this template renders through `src/layouts/BaseLayout.astro`, and that is
where all of the SEO plumbing lives. A page passes `title`, `description` and optionally
`schema`, `ogImage`, `canonical` or `noindex` — the layout does the rest:

- **Canonical URL** — derived from the route and `SITE.url`. Because the build emits
  `.html` files but the server serves extensionless URLs, the layout strips the suffix
  before building the canonical. Don't bypass it.
- **Open Graph and Twitter tags** — from the same title and description, with an image
  precedence of explicit prop → generated card for the route → site default.
- **JSON-LD** — a site-wide `Organization` node and a `Person` node for the founder
  (`#founder`) on every page, plus whatever page-specific nodes you pass via the
  `schema` prop. Blog and glossary templates already pass `BlogPosting`, `Article`,
  `DefinedTerm`, `BreadcrumbList` and `FAQPage` nodes for you.

## The collections enforce the boring parts

`src/content.config.ts` gives each collection a zod schema, and the schema is doing SEO
work: `title` is capped at 70 characters so it doesn't truncate in results, `description`
must be 50–200 characters so it works as a meta description, and `tldr` is required so
every content page front-loads its answer — the one GEO lever with real evidence behind
it. If frontmatter is wrong, the build fails. That is the feature.

## Generated surfaces

Three things are produced at build time and never hand-edited:

1. **The sitemap**, via `@astrojs/sitemap`, minus anything `noindex` or draft.
2. **The RSS feed** at `/rss.xml` — blog only, with each item's `tldr` as its
   description.
3. **[`llms.txt`](/glossary/llms-txt) and `llms-full.txt`**, an index and a
   full-corpus file for machine readers, plus the human-readable brief at
   [/for-llms](/for-llms).

Counts and lists on those surfaces come from `getCollection()` at build time, so they
cannot disagree with the site.

## What you actually do per page

Write the markdown, fill in the frontmatter, keep the body headings starting at `##`
(the template renders the frontmatter title as the page's single `<h1>`). That's it —
if it builds, the machinery is on.
