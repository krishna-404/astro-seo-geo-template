---
title: 'Writing content that answer engines actually cite'
description: 'The three evidence-backed GEO levers — citations, quotable definitions and front-loaded answers — and how this template''s schemas force you to use them.'
tldr: 'Cited sources, quotations from authorities and statistics measurably improve how often generative engines cite a page; keyword stuffing measurably hurts. This template hard-codes those findings: every entry requires a front-loaded tldr, and glossary entries will not build without at least one source.'
published: 2026-08-11
author:
  name: 'TODO Founder Name'
  title: 'Founder'
  sameAs:
    - 'https://www.linkedin.com/in/TODO'
tags:
  - template
  - geo
  - content
proprietary: first-hand-experience
sources:
  - label: 'Aggarwal et al., "GEO: Generative Engine Optimization", KDD 2024'
    url: 'https://arxiv.org/abs/2311.09735'
    retrieved: 2026-08-11
  - label: 'Google Search Central — Creating helpful, reliable, people-first content'
    url: 'https://developers.google.com/search/docs/fundamentals/creating-helpful-content'
    retrieved: 2026-08-11
  - label: 'llms.txt proposal'
    url: 'https://llmstxt.org/'
    retrieved: 2026-08-11
---

## The levers with evidence behind them

Most GEO advice is folklore. The one controlled study worth reading (Aggarwal et al.,
KDD 2024) found three interventions that raised a page's visibility in generative
engine answers: **citing sources**, **quoting authorities**, and **adding statistics**.
The same study found keyword stuffing *reduced* visibility. This template turns those
findings into schema requirements rather than advice:

- Every blog post and glossary entry requires a `tldr` — the front-loaded answer that
  sits in the first 30% of the page, styled as the lift target.
- Glossary entries require `sources` with at least one entry. No source, no page — the
  build fails.
- Blog posts require a `proprietary` field naming what in the post an LLM could not
  have produced: original data, first-hand experience, original analysis, an expert
  interview, or a case study.

## Write the 40-word answer first

The glossary schema caps `shortDefinition` at 300 characters for a reason: that string
is what an answer engine lifts, what the index page shows, and what the `DefinedTerm`
JSON-LD carries. Write it as a complete, quotable sentence that survives being read
with no page around it. Then let the body add the depth.

## A named human author, everywhere

Every post carries an author with a real, linkable profile (`sameAs` is required and
must contain at least one URL). E-E-A-T and answer engines both key on a verifiable
human being behind the byline. The template renders the byline, feeds it into the
`BlogPosting` node, and emits a site-wide `Person` node for the founder that other
pages reference by `@id`.

## What to do with this template

Replace this post. Seriously — it exists to show a valid frontmatter block, a working
Sources section, and the tldr treatment. Your first real post should say something only
you can say, and the `proprietary` field is where you declare what that is.
