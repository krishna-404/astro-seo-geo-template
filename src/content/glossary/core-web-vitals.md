---
title: 'Core Web Vitals: the three metrics and this template''s budget'
description: 'What LCP, INP and CLS measure, the thresholds Google publishes for each, and the choices in this template that keep all three in the green by default.'
tldr: 'Core Web Vitals are Google''s three field metrics for page experience: Largest Contentful Paint (loading, good under 2.5s), Interaction to Next Paint (responsiveness, good under 200ms) and Cumulative Layout Shift (visual stability, good under 0.1). A static site with no client JS passes them almost by construction.'
updated: 2026-08-11
term: 'Core Web Vitals'
aliases:
  - 'CWV'
  - 'LCP'
  - 'INP'
  - 'CLS'
category: 'performance'
shortDefinition: 'Google''s three user-experience metrics measured on real visits: Largest Contentful Paint (loading speed), Interaction to Next Paint (responsiveness) and Cumulative Layout Shift (visual stability), each with published good/needs-improvement/poor thresholds.'
related:
  - llms-txt
sources:
  - label: 'web.dev — Core Web Vitals'
    url: 'https://web.dev/articles/vitals'
    retrieved: 2026-08-11
  - label: 'Google Search Central — Understanding Core Web Vitals and search results'
    url: 'https://developers.google.com/search/docs/appearance/core-web-vitals'
    retrieved: 2026-08-11
---

## The three metrics

- **LCP, Largest Contentful Paint.** How long until the biggest thing in the viewport
  is painted. Good is under 2.5 seconds at the 75th percentile of real visits.
- **INP, Interaction to Next Paint.** How quickly the page responds to a tap or
  keypress. Good is under 200 milliseconds. INP replaced FID in March 2024.
- **CLS, Cumulative Layout Shift.** How much the layout jumps around while loading.
  Good is under 0.1.

Google measures these in the field (Chrome UX Report), not in the lab, and uses them
as part of its page experience signals.

## Why this template passes by default

The template makes three structural choices that buy the metrics before any tuning:

1. **Static HTML, no client JavaScript on content pages.** Nothing to hydrate, so INP
   has almost nothing to measure.
2. **CSS inlined into each page.** No render-blocking stylesheet request, which is
   usually the LCP bottleneck on small sites.
3. **No layout-shifting embeds.** Images get intrinsic dimensions, and there are no
   late-loading banners pushing content down, so CLS stays near zero.

The way to lose this is to add things: a web font without `font-display`, a script in
`<head>`, an unsized hero image. Measure with real-user data before and after anything
you add.
