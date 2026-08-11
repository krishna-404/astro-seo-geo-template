/**
 * Product + Offer JSON-LD for a site that sells a product — a documented
 * EXAMPLE, deliberately not imported anywhere.
 *
 * The template does not presume the site sells anything, so nothing wires
 * this in and the build never emits it. Until it is wired in, the file is
 * inert: plain TypeScript with exported consts, no imports — `astro check`
 * type-checks it and nothing more.
 *
 * WHEN THE SITE DOES SELL A PRODUCT:
 *
 *   1. Copy to `productSchema.ts` and replace the Example Co placeholders
 *      below with values imported from `site.ts` and the pricing data the
 *      pricing page itself renders (`facts.json` in the ancestor site).
 *      Deriving the Offers from the same file the page reads is what stops
 *      the schema and the visible page disagreeing.
 *   2. In `src/pages/index.astro`, append `productNode()` to the `schema`
 *      array passed to `<BaseLayout>` — BaseLayout merges it into the
 *      JSON-LD `@graph`. Do the same on the pricing page. ONE shared node,
 *      both pages: the ancestor site wrote the node out twice, and both
 *      copies carried the same two faults when Search Console checked them
 *      (no `image`, an Organization as `brand`). Fixing a fault twice is
 *      how it drifts.
 *
 * ── THE SEARCH CONSOLE TRAPS THIS FILE ENCODES ──────────────────────────
 *
 * DELIBERATELY ABSENT — do not add these to clear the warnings:
 *
 * - `hasMerchantReturnPolicy` and `shippingDetails`. Search Console asks
 *   for both on every Offer. They are merchant-listing fields for physical
 *   goods that get shipped and returned; for anything billed per use or
 *   per seat, inventing a returns policy to clear an *optional* warning
 *   would put a claim on the site that isn't true. Leave the warnings
 *   uncleared.
 * - `review` and `aggregateRating`. The Product snippets report asks for
 *   both on every crawl. Review markup a company writes about its own
 *   product is self-serving review markup, which Google's review-snippet
 *   policy prohibits — trading two cleared optional warnings for
 *   manual-action risk. Only mark up reviews collected independently and
 *   visible on the page.
 *
 * PRESENT for a specific reason:
 *
 * - The Offer nodes are how a deliberately-UNLINKED pricing page stays
 *   reachable. If `/pricing` carries no visible link anywhere on the site,
 *   an Offer per tier pointing `url` at the page is the machine-readable
 *   pointer that lets search and answer engines reach it. Structured data
 *   is a legitimate pointer; a hidden `<a>` would be cloaking.
 */

/* ── EXAMPLE VALUES — replace with imports from site.ts / pricing data ── */

const SITE_URL = 'https://www.example.com';
const SITE_NAME = 'Example Co';
const SITE_DESCRIPTION = 'What Example Co does, for whom, in one sentence.';

/** Keep in step with what the pricing page renders — same source file. */
const PRICING = {
  currency: 'USD',
  tiers: [
    { name: 'Starter', tagline: 'For getting going', volumeLabel: 'up to 50 units/mo', pricePerUnit: 10 },
    { name: 'Growth', tagline: 'The usual choice', volumeLabel: '51–300 units/mo', pricePerUnit: 8 },
    { name: 'Scale', tagline: 'The anchor tier', volumeLabel: '300+ units/mo', pricePerUnit: 6 },
  ],
} as const;

/** The Product node, in one place, called from `/` and the pricing page. */
export function productNode() {
  return {
    '@type': 'Product',
    '@id': `${SITE_URL}/#product`,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    /**
     * REQUIRED — without `image` the node is ineligible and Search Console
     * reports a critical error, not a warning. Point it at a screenshot of
     * the product, not the social card: the card is a headline, this is
     * the product. Generate the file with the site's own pipeline so it
     * cannot drift from what the site shows — and only emit the field when
     * the asset actually exists; an `image` pointing at a missing file is
     * worse than no `image`.
     */
    image: `${SITE_URL}/product/screenshot.png`,
    /**
     * A `Brand`, not a reference to the Organization node — Google reports
     * an Organization here as an invalid object type, though schema.org
     * permits it.
     */
    brand: { '@type': 'Brand', name: SITE_NAME },
    /** One Offer per tier — see the header for why these exist. */
    offers: PRICING.tiers.map((t) => ({
      '@type': 'Offer',
      name: t.name,
      description: `${t.tagline} — ${t.volumeLabel}`,
      price: t.pricePerUnit,
      priceCurrency: PRICING.currency,
      url: `${SITE_URL}/pricing`,
      availability: 'https://schema.org/InStock',
      /**
       * The billing unit ("per shipment", "per seat") belongs here — a bare
       * `unitText` on the Offer is not an Offer property, so the per-unit
       * part of the price gets dropped by anything reading this strictly.
       */
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: t.pricePerUnit,
        priceCurrency: PRICING.currency,
        referenceQuantity: {
          '@type': 'QuantitativeValue',
          value: 1,
          unitText: 'unit',
        },
      },
    })),
  };
}
