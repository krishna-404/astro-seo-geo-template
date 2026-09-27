#!/usr/bin/env node
/**
 * Render the cadence report (markdown) as an email-safe HTML body.
 *
 *   node scripts/report-html.mjs report.md > report.html
 *
 * Why this exists: the Apps Script report channel (SETUP § Services,
 * marketing/apps-script/contact-form.gs → handleReport) mails whatever `body`
 * it receives as plain text, so a markdown report arrives as raw `#` and `|`
 * characters. The cadence run sends this file's output as a second `html`
 * field; the script uses it as the HTML body and keeps the markdown as the
 * plain-text fallback.
 *
 * There was a `--text` mode here that rendered the markdown into aligned
 * plain text, for the window before the Apps Script took `htmlBody`. It takes
 * it (marketing/apps-script/contact-form.gs → handleReport), so the markdown
 * itself is the plain-text half and the mode was dead code with a comment
 * saying "until". Removed 27 Sep 2026.
 *
 * Email clients run no JavaScript, so a "copy" button is impossible. What IS
 * possible is a link that opens Search Console's URL inspection with the URL
 * already filled in — one click, then "Request indexing". Every list item
 * that is a bare URL on this site gets that link.
 *
 * The unified/remark/rehype packages are declared devDependencies at the
 * versions Astro's own tree already carries — they used to resolve only
 * transitively through Astro, which works until Astro reorganises its
 * dependencies and this script breaks for a reason nothing here explains
 * (CHECKLIST § 10, the dev-dependency policy). Colour literals here are
 * email-only chrome, outside the contrast sweep's scope (check-source-rules
 * scans src/ and worker/).
 */

import { readFileSync } from 'node:fs';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { SITE_URL } from '../src/data/origin.mjs';

const ORIGIN = SITE_URL.replace(/\/$/, '');
const SITE = new URL(ORIGIN).host;
const GSC_PROPERTY = `sc-domain:${SITE}`;

const src = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!src) {
  console.error('usage: node scripts/report-html.mjs <report.md>');
  process.exit(2);
}
const markdown = readFileSync(src, 'utf8');

const html = String(
  await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown),
);

/** Search Console URL-inspection deep link for one page. */
const inspectUrl = (url) =>
  `https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(GSC_PROPERTY)}&id=${encodeURIComponent(url)}`;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const originRe = escapeRe(ORIGIN);

const font = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
const btn =
  `display:inline-block;padding:6px 12px;border-radius:6px;background:#1f2937;color:#ffffff;` +
  `text-decoration:none;font-weight:600;font-size:13px;line-height:1.2;margin-left:8px;white-space:nowrap;`;

let out = html
  // List items that are just a site URL → the URL plus an "Inspect" button.
  .replace(
    new RegExp(`<li>\\s*(?:<a href="(${originRe}\\/[^"]*)"[^>]*>[^<]*<\\/a>|(${originRe}\\/\\S*?))\\s*<\\/li>`, 'g'),
    (_m, a, b) => {
      const url = a ?? b;
      return (
        `<li style="margin:6px 0;">` +
        `<a href="${url}" style="color:#1d4ed8;">${url.replace(ORIGIN, '')}</a>` +
        `<a href="${inspectUrl(url)}" style="${btn}">Inspect in Search Console →</a>` +
        `</li>`
      );
    },
  )
  .replace(/<h1>/g, `<h1 style="${font}font-size:22px;margin:0 0 12px;color:#111827;">`)
  .replace(/<h2>/g, `<h2 style="${font}font-size:18px;margin:28px 0 8px;color:#111827;border-bottom:1px solid #e5e7eb;padding-bottom:4px;">`)
  .replace(/<h3>/g, `<h3 style="${font}font-size:15px;margin:18px 0 6px;color:#111827;">`)
  .replace(/<p>/g, `<p style="${font}font-size:15px;line-height:1.5;margin:8px 0;color:#1f2937;">`)
  .replace(/<ul>/g, `<ul style="${font}font-size:15px;line-height:1.5;margin:8px 0 8px 20px;padding:0;color:#1f2937;">`)
  .replace(/<ol>/g, `<ol style="${font}font-size:15px;line-height:1.5;margin:8px 0 8px 20px;padding:0;color:#1f2937;">`)
  .replace(/<table>/g, `<table cellpadding="0" cellspacing="0" style="${font}border-collapse:collapse;font-size:13px;margin:8px 0 16px;">`)
  .replace(/<th>/g, `<th style="text-align:left;padding:6px 10px;border:1px solid #e5e7eb;background:#f3f4f6;color:#111827;">`)
  .replace(/<td>/g, `<td style="padding:6px 10px;border:1px solid #e5e7eb;color:#1f2937;vertical-align:top;">`)
  .replace(/<code>/g, `<code style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;background:#f3f4f6;padding:1px 4px;border-radius:3px;">`)
  .replace(/<blockquote>/g, `<blockquote style="margin:8px 0;padding:8px 12px;border-left:3px solid #1f2937;background:#f9fafb;color:#1f2937;">`)
  .replace(/<a href="(?!https:\/\/search\.google)/g, `<a style="color:#1d4ed8;" href="`);

process.stdout.write(
  `<div style="${font}max-width:720px;margin:0 auto;padding:16px;background:#ffffff;">${out}</div>\n`,
);
