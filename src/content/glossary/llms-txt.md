---
title: 'llms.txt: what it is and whether to ship one'
description: 'What an llms.txt file is, what goes in it, how this template generates one at build time, and what the evidence says about whether AI crawlers honour it.'
tldr: 'llms.txt is a proposed convention: a markdown file at the site root that gives LLM-based readers a curated index of the site''s important content. This template generates /llms.txt and /llms-full.txt at build time from the content collections, so they can never disagree with the site.'
updated: 2026-08-11
term: 'llms.txt'
aliases:
  - 'llms-full.txt'
category: 'machine-readability'
shortDefinition: 'A proposed web convention: a markdown file served at /llms.txt that gives large language models a curated, token-efficient index of a website''s content, analogous to robots.txt for crawl rules or sitemap.xml for URLs.'
related:
  - core-web-vitals
sources:
  - label: 'llms.txt proposal (Jeremy Howard, Answer.AI)'
    url: 'https://llmstxt.org/'
    retrieved: 2026-08-11
  - label: 'Google Search Central — robots.txt introduction (the convention llms.txt is modelled on)'
    url: 'https://developers.google.com/search/docs/crawling-indexing/robots/intro'
    retrieved: 2026-08-11
---

## What it is

`llms.txt` is a convention proposed in 2024: a plain-markdown file at the root of a
site that tells an LLM-based reader what the site is and where its substantive content
lives, without the reader having to crawl and parse every HTML page. The companion
`llms-full.txt` goes further and concatenates the full content, so a model can ingest
the whole corpus in one fetch.

## How this template handles it

Both files are **generated at build time** from the same content collections that
render the pages — never hand-maintained. That is the property that matters: a
hand-written brand summary drifts; a generated one cannot say something the site does
not. The human-readable companion is the [/for-llms](/for-llms) page, which carries
the same brief as a real, linked, indexable page.

## Should you rely on it?

No. The honest evidence as of 2026 is that few AI crawlers demonstrably honour
`llms.txt`, so do not build strategy around it. But generation costs minutes and the
downside is zero, which is why the template ships it anyway — as a cheap bet, not a
moat. The durable levers are on the pages themselves: sourced claims, quotable
definitions, and front-loaded answers.
