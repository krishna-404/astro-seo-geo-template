#!/usr/bin/env node
/**
 * Build every favicon Google and the platforms actually want, from the one SVG.
 *
 *   node marketing/favicon.mjs
 *
 * WHY THIS EXISTS. The site this template came from shipped an SVG favicon and
 * nothing else, and Google showed the grey globe placeholder next to the
 * domain in search results rather than the mark. Google's favicon crawler
 * wants a raster file it can scale — its guidance is a square that is a
 * multiple of 48px — and it also probes /favicon.ico at the site root
 * regardless of what the HTML declares. That site was serving a 404 there.
 *
 * The SVG stays, and modern browsers still prefer it: it is sharp at any size
 * and a tenth of the bytes. This only adds the raster fallbacks that the
 * crawlers and the mobile platforms need.
 *
 * ONE SOURCE. Everything here is generated from public/favicon.svg, so the mark
 * cannot drift between formats. Re-run it if the logo or the brand colour
 * changes — nothing checks this for you, and a favicon that still shows the old
 * brand colour is the kind of thing nobody notices for a year.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

/** Backing colour for the opaque apple-touch-icon — keep in step with the
 *  brand colour in public/favicon.svg / site.ts. */
const BRAND_BG = '#0f4c81';

const SRC = resolve(process.cwd(), 'public/favicon.svg');
const out = (name) => resolve(process.cwd(), 'public', name);

/** Density high enough that the 512px render is not upscaled from 32px. */
const render = (size) => sharp(readFileSync(SRC), { density: 512 }).resize(size, size).png();

/**
 * Minimal ICO container. The format is a 6-byte header, then one 16-byte entry
 * per image, then the image payloads.
 *
 * The payloads are PNGs rather than BMPs. PNG-in-ICO has been valid since
 * Windows Vista and is what every current browser, crawler and OS reads; BMP
 * would only buy compatibility with software that cannot render this site
 * anyway, at several times the size.
 */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = [];
  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // 0 means 256
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2); // palette count
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

// /favicon.ico — 16 and 32 for browser tabs and bookmarks, 48 because that is
// the size Google's guidance names.
const icoSizes = [16, 32, 48];
const icoImages = [];
for (const size of icoSizes) {
  icoImages.push({ size, data: await render(size).toBuffer() });
}
writeFileSync(out('favicon.ico'), ico(icoImages));

// Standalone PNGs. 96 is Google's next multiple of 48; 180 is what iOS uses for
// a home-screen bookmark, and it must be opaque — iOS composites transparency
// onto black, which would put the mark on a black tile.
const pngs = [
  ['favicon-48.png', 48],
  ['favicon-96.png', 96],
  ['apple-touch-icon.png', 180],
];
for (const [name, size] of pngs) {
  await render(size)
    .flatten({ background: BRAND_BG })
    .toFile(out(name));
}

const { statSync } = await import('node:fs');
console.log('written to public/:');
for (const f of ['favicon.ico', ...pngs.map(([n]) => n)]) {
  console.log(`  ${f.padEnd(22)} ${statSync(out(f)).size} bytes`);
}
console.log(`  favicon.svg            ${statSync(SRC).size} bytes (source, unchanged)`);
