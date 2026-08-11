#!/usr/bin/env node
/**
 * Renders marketing/og/default.html to public/og/default.png at 1200x630.
 *
 *   node marketing/og/render.mjs
 *
 * Needs a Chromium that Playwright can drive. Playwright is not a project
 * dependency — this runs rarely, so install it ad hoc rather than carrying it
 * in package.json:
 *
 *   npx playwright@latest install chromium
 *   npx -p playwright@latest node marketing/og/render.mjs
 *
 * Re-run whenever the hero headline changes. The card repeats the headline, so
 * the two drift apart silently otherwise — that is the running cost of having
 * a social card at all, and it is the reason this is a template rather than a
 * screenshot somebody took once.
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, 'default.html');
const outDir = resolve(here, '../../public/og');
const out = resolve(outDir, 'default.png');

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await page.goto(`file://${src}`, { waitUntil: 'networkidle' });
await page.screenshot({ path: out, type: 'png' });
await browser.close();

console.log(`wrote ${out} (1200x630)`);
