/**
 * Content-Security-Policy, derived from the built site — never hand-listed.
 *
 * Runs post-build (`npm run csp`, part of `npm run build`). It reads every
 * built HTML file under dist/ and derives everything the policy must allow:
 *
 *   - a sha256 hash for every EXECUTABLE inline <script> (is:inline snippets:
 *     form attribution, LiveData refresh, the consent banner, /search).
 *     JSON-LD blocks are data, not scripts — CSP ignores them, so do we.
 *   - the origin of every external <script src> actually shipped (none by
 *     default — Umami is proxied same-origin at /s.js).
 *   - the Google origins, ONLY when the consent banner shipped (it injects
 *     the gtag script dynamically, so the src never appears in HTML — the
 *     banner's own inline code is the reliable marker).
 *
 * Because the allowlist derives from dist, a new inline script is admitted on
 * the next build automatically — and a script that stops shipping stops being
 * allowed. Nothing to maintain, nothing to drift.
 *
 * Two emitters, same value (the platform applies _headers only to responses
 * the static layer serves itself — worker responses need it in code):
 *   1. dist/_headers — replaces the `# @generated-csp` marker line.
 *   2. worker/csp.generated.json — COMMITTED, imported by worker/index.ts.
 *      CI diffs it after a build, so a stale committed value fails the run
 *      (same pattern as src/data/lastmod.json).
 *
 * Deliberate scope decisions, so nobody "tightens" this blind:
 *   - style-src keeps 'unsafe-inline': `inlineStylesheets: 'always'` puts a
 *     <style> element on every page and its content varies per page — hashing
 *     would mean a per-page policy for a minor vector (style injection needs
 *     an HTML injection first, at which point scripts matter more).
 *   - script-src carries 'wasm-unsafe-eval': Pagefind's search index is
 *     WebAssembly; without it /search silently breaks in Chromium.
 *   - frame-ancestors 'self' mirrors X-Frame-Options: SAMEORIGIN (the legacy
 *     backup header) — change them together or not at all.
 *   - Inline event handlers (onclick=…) are NOT allowed and the script FAILS
 *     if it finds one: hashes don't cover them, and the fix ('unsafe-hashes')
 *     weakens the policy for a pattern the codebase doesn't use.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const HEADERS_FILE = join(DIST, '_headers');
const WORKER_JSON = join('worker', 'csp.generated.json');
const MARKER = '# @generated-csp';

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : [];
  });
}

if (!existsSync(DIST)) {
  console.error('generate-csp: no dist/ — run the build first');
  process.exit(1);
}

const hashes = new Set();
const externalScriptOrigins = new Set();
let ga4Armed = false;
let fail = 0;

/** Executable inline script: no src, and type absent or a JS MIME. */
const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
const JS_TYPES = /^(module|text\/javascript|application\/javascript)$/i;

for (const file of walk(DIST)) {
  const html = readFileSync(file, 'utf8');

  for (const m of html.matchAll(SCRIPT_RE)) {
    const attrs = m[1];
    const body = m[2];
    const src = attrs.match(/\ssrc="([^"]+)"/);
    if (src) {
      // Same-origin scripts are covered by 'self'; foreign origins get listed.
      if (/^https?:\/\//.test(src[1])) externalScriptOrigins.add(new URL(src[1]).origin);
      continue;
    }
    const type = attrs.match(/\stype="([^"]+)"/);
    if (type && !JS_TYPES.test(type[1])) continue; // ld+json etc: data, not code
    if (!body.trim()) continue;
    hashes.add(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }

  // The banner injects gtag by createElement — this literal is the marker.
  if (html.includes('googletagmanager.com/gtag/js')) ga4Armed = true;

  // Hashes cannot allow inline handlers; the codebase must not grow any.
  for (const m of html.matchAll(/<[a-z][^>]*\son[a-z]+\s*=/gi)) {
    console.error(`FAIL: ${file} has an inline event handler (CSP-incompatible): ${m[0].slice(0, 100)}`);
    fail = 1;
  }
}

if (fail) process.exit(1);

const scriptSrc = [
  "'self'",
  "'wasm-unsafe-eval'", // Pagefind
  ...[...hashes].sort(),
  ...[...externalScriptOrigins].sort(),
  ...(ga4Armed ? ['https://www.googletagmanager.com'] : []),
];
const connectSrc = [
  "'self'",
  ...(ga4Armed
    ? [
        'https://*.google-analytics.com',
        'https://*.analytics.google.com',
        'https://*.googletagmanager.com',
      ]
    : []),
];
const imgSrc = [
  "'self'",
  'data:',
  ...(ga4Armed ? ['https://*.google-analytics.com', 'https://*.googletagmanager.com'] : []),
];

const csp = [
  `default-src 'self'`,
  `script-src ${scriptSrc.join(' ')}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src ${imgSrc.join(' ')}`,
  `connect-src ${connectSrc.join(' ')}`,
  `font-src 'self'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'self'`,
].join('; ');

// 1. dist/_headers — swap the marker line for the real header.
const headers = readFileSync(HEADERS_FILE, 'utf8');
const markerLine = headers.split('\n').find((l) => l.trim().startsWith(MARKER));
if (!markerLine) {
  console.error(`generate-csp: marker "${MARKER}" not found in ${HEADERS_FILE} — ` +
    'public/_headers must carry it inside the /* block');
  process.exit(1);
}
writeFileSync(
  HEADERS_FILE,
  headers.replace(markerLine, `${markerLine.match(/^\s*/)[0]}Content-Security-Policy: ${csp}`)
);

// 2. worker/csp.generated.json — committed; CI diffs it post-build.
const next = JSON.stringify({ '//': 'Generated by scripts/generate-csp.mjs — do not hand-edit.', csp }, null, 2) + '\n';
const prev = existsSync(WORKER_JSON) ? readFileSync(WORKER_JSON, 'utf8') : '';
if (prev !== next) {
  writeFileSync(WORKER_JSON, next);
  console.log(`generate-csp: ${WORKER_JSON} updated — commit it`);
}

console.log(
  `generate-csp: ${hashes.size} inline-script hash(es), ` +
  `${externalScriptOrigins.size} external script origin(s), GA4 ${ga4Armed ? 'armed' : 'off'}`
);
