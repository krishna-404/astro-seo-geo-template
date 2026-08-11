// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { lastmodFor } from './src/lib/lastmod.ts';
import privacy from './src/data/privacy.json' with { type: 'json' };
import { SITE_URL } from './src/data/origin.mjs';

/**
 * Wraps every markdown <table> in <div class="table-scroll">, so a wide table
 * scrolls inside its own box instead of scrolling the page. Written inline and
 * dependency-free — it walks the hast tree rather than pulling in unist-util-visit.
 *
 * The wrapper is a labelled, keyboard-scrollable region (WCAG 2.1.1): a
 * scrollable box that only a pointer can scroll locks keyboard users out of
 * whatever overflows. The generic label is deliberate — a build plugin cannot
 * know a table's subject; authors who want better add a <caption> in the
 * markdown. Hand-authored .table-scroll wrappers in .astro files must carry
 * the same three attributes, with a SPECIFIC aria-label (CI checks all of
 * them — see ci.yml).
 */
function rehypeWrapTables() {
  return (tree) => {
    const walk = (node) => {
      if (!Array.isArray(node.children)) return;
      node.children = node.children.map((child) => {
        walk(child);
        if (child.type === 'element' && child.tagName === 'table') {
          return {
            type: 'element',
            tagName: 'div',
            properties: {
              className: ['table-scroll'],
              tabIndex: 0,
              role: 'region',
              'aria-label': 'Table, scrolls horizontally',
            },
            children: [child],
          };
        }
        return child;
      });
    };
    walk(tree);
  };
}

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'never',
  build: {
    // Emit /pricing.html rather than /pricing/index.html. Cloudflare Workers
    // static assets serves it at /pricing with `html_handling:
    // "drop-trailing-slash"` (see wrangler.jsonc) — the two settings must agree.
    // If a site needs /page/index.html URLs instead (e.g. migrating a site whose
    // existing URLs must stay byte-identical), switch this to 'directory' AND
    // change html_handling — one without the other breaks every route.
    format: 'file',

    // Astro's default ('auto') inlines a stylesheet under 4kB and links the
    // rest, which leaves two render-blocking <link>s in <head>. Nothing can
    // paint until both arrive, and neither can start until the HTML has.
    // Measured on the original site this template derives from: inlining costs
    // 5.3kB gzipped per page and buys back a full round trip at 150ms RTT.
    //
    // The trade is real, so state it: an inlined stylesheet is not cached across
    // pages, so a visitor who reads three pages downloads it three times. That
    // is the right side of the trade for a marketing site most people reach
    // from search and leave after a page or two. Revisit if the CSS grows past
    // roughly 15kB gzipped, or if analytics ever show deep multi-page sessions.
    inlineStylesheets: 'always',
  },
  integrations: [
    mdx(),
    sitemap({
      // The privacy policy is excluded while it is a draft: it renders
      // `noindex`, and listing a noindex URL in the sitemap asks crawlers to
      // fetch a page we have just told them to ignore. Flipping
      // `privacy.json → status.draft` to false publishes it in both places at
      // once, so the two can never disagree.
      //
      // /contact/thanks is excluded for the same reason: it renders `noindex`.
      // It is also what keeps the lastmod coverage check honest — that check
      // measures the map against the sitemap, so a page deliberately absent
      // from one is correctly absent from the other.
      //
      // /search is a noindex tool page (client-rendered results have nothing
      // for a crawler; content is indexed at its real URLs) — same iron rule:
      // noindex ⇔ out of the sitemap, always both.
      filter: (page) =>
        !page.includes('/draft/') &&
        !page.includes('/contact/thanks') &&
        !page.includes('/search') &&
        !(privacy.status.draft && page.includes('/privacy-policy')),

      // <lastmod> from the commit that last touched each page's source, not
      // from the build clock — see src/lib/lastmod.ts for why that distinction
      // decides whether the signal is used or discarded. Pages whose date
      // cannot be established (shallow clone, no git) are emitted without a
      // lastmod rather than with a guessed one.
      serialize(item) {
        const { pathname } = new URL(item.url);
        const lastmod = lastmodFor(pathname);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
  markdown: {
    shikiConfig: { theme: 'github-light', wrap: true },
    // Markdown tables are authored as bare <table>, which scrolls the whole page
    // sideways on a phone. The rule is that wide tables live in .table-scroll,
    // so wrap every one of them at build time rather than asking each author
    // to remember.
    rehypePlugins: [rehypeWrapTables],
  },
});
