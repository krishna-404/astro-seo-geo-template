#!/usr/bin/env node
/**
 * Render the cadence report (markdown) as an email-safe HTML body.
 *
 *   node scripts/report-html.mjs report.md > report.html
 *   node scripts/report-html.mjs --text report.md > report.txt
 *
 * Why this exists: the Apps Script report channel (SETUP § Services,
 * marketing/apps-script/contact-form.gs → handleReport) mails whatever `body`
 * it receives as plain text, so a markdown report arrives as raw `#` and `|`
 * characters. The cadence run sends this file's output as a second `html`
 * field; the script uses it as the HTML body and keeps the markdown as the
 * plain-text fallback.
 *
 * Email clients run no JavaScript, so a "copy" button is impossible. What IS
 * possible is a link that opens Search Console's URL inspection with the URL
 * already filled in — one click, then "Request indexing". Every list item
 * that is a bare URL on this site gets that link.
 *
 * Uses the unified/remark/rehype packages Astro already installs; nothing is
 * added to package.json. Colour literals here are email-only chrome, outside
 * the contrast sweep's scope (check-source-rules scans src/ and worker/).
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

const args = process.argv.slice(2);
const textMode = args.includes('--text');
const src = args.find((a) => !a.startsWith('--'));
if (!src) {
  console.error('usage: node scripts/report-html.mjs [--text] <report.md>');
  process.exit(2);
}
const markdown = readFileSync(src, 'utf8');

/**
 * --text: the plain-text twin for the `body` field. Until the Apps Script is
 * deployed with htmlBody support the mail shows `body` verbatim, and raw
 * markdown (`#`, `**`, `|---|`) is what the owner reads. This strips the
 * syntax into something a mail client renders decently: headings as
 * upper-case lines, tables as aligned columns, links as "text (url)".
 */
if (textMode) {
  const lines = markdown.split('\n');
  const out = [];
  let table = [];
  const flushTable = () => {
    if (!table.length) return;
    const rows = table.filter((r) => !/^\|?\s*:?-{2,}/.test(r)).map((r) =>
      r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
    const width = rows[0].map((_, i) => Math.max(...rows.map((r) => (r[i] ?? '').length)));
    for (const r of rows) out.push('  ' + r.map((c, i) => c.padEnd(width[i])).join('   ').trimEnd());
    out.push('');
    table = [];
  };
  const inline = (t) =>
    t.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
  for (const line of lines) {
    if (/^\s*\|/.test(line)) { table.push(line.trim()); continue; }
    flushTable();
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const text = inline(h[2]);
      out.push('', h[1].length === 1 ? text.toUpperCase() : text, h[1].length === 1 ? '='.repeat(text.length) : '-'.repeat(text.length));
      continue;
    }
    out.push(inline(line));
  }
  flushTable();
  process.stdout.write(out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n');
  process.exit(0);
}

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
