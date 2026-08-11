// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { lastmodFor } from './src/lib/lastmod.ts';
import privacy from './src/data/privacy.json' with { type: 'json' };

// Canonical domain. docket.shipmyapp.in 301s here — see CLAUDE.md § Domains.
const SITE = 'https://dodocket.com';

/**
 * Wraps every markdown <table> in <div class="table-scroll">, so a wide table
 * scrolls inside its own box instead of scrolling the page. Written inline and
 * dependency-free — it walks the hast tree rather than pulling in unist-util-visit.
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
            properties: { className: ['table-scroll'] },
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
  site: SITE,
  output: 'static',
  trailingSlash: 'never',
  build: {
    // Emit /pricing.html rather than /pricing/index.html so the nginx
    // `try_files $uri $uri.html` rule in the Docker image resolves cleanly.
    format: 'file',

    // Astro's default ('auto') inlines a stylesheet under 4kB and links the
    // rest, which left this site with two render-blocking <link>s in <head>.
    // Nothing can paint until both arrive, and neither can start until the HTML
    // has. Measured on the homepage: inlining costs 5.3kB gzipped and buys back
    // a full round trip — a clear win at 150ms RTT, and the whole site is 53kB.
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
      // /pricing IS listed here on purpose. It carries no visible navigation
      // link anywhere on the site, so the sitemap plus the Offer nodes in the
      // homepage JSON-LD are how search and answer engines reach it. Do not
      // "fix" the orphan by adding a hidden link — a crawler-only link is the
      // cloaking pattern Google penalises.
      //
      // The privacy policy is excluded while it is a draft: it renders
      // `noindex`, and listing a noindex URL in the sitemap asks crawlers to
      // fetch a page we have just told them to ignore. Flipping
      // `privacy.json → status.draft` to false publishes it in both places at
      // once, so the two can never disagree.
      // /contact/thanks is excluded alongside the drafts: it renders `noindex`,
      // and listing a noindex URL asks crawlers to fetch a page we have just
      // told them to ignore. It is also what keeps the lastmod coverage check
      // honest — that check measures the map against the sitemap, so a page
      // deliberately absent from one is correctly absent from the other.
      filter: (page) =>
        !page.includes('/draft/') &&
        !page.includes('/contact/thanks') &&
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
    // sideways on a phone. CLAUDE.md's rule is that wide tables live in
    // .table-scroll, so wrap every one of them at build time rather than asking
    // each author to remember.
    rehypePlugins: [rehypeWrapTables],
  },
});
