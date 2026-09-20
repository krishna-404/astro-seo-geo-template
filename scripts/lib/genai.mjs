/**
 * genai.mjs — the generative-AI half of the measurement picture, which the
 * Search Console API does not carry.
 *
 * THE CONSTRAINT THIS FILE IS BUILT AROUND. Since June 2026 Search Console has
 * a "Generative AI" performance report (Performance → Generative AI): how often
 * the site's URLs were shown inside AI Overviews and AI Mode, by page, country,
 * device and date. It carries impressions only — no clicks, no queries — and
 * as of Sep 2026 it is UI-only: the Search Analytics API rejects every
 * generative-AI `type` value ("Invalid value at 'type'") and the BigQuery
 * export does not include it. So the daily runs read it through the ONE door
 * that exists: the report's Export button, which downloads a zip of CSVs. The
 * owner drops that zip (or its unzipped folder) into marketing/insights/genai/
 * and this module reads the newest one. Everything else here is a PROXY for
 * the parts the report withholds:
 *
 *   - AI-shaped queries: the Search Console web rows whose phrasing is a
 *     prompt rather than a keyword (eight-plus words, a question, a follow-up
 *     verb). Google's own report hides the queries; the prompt-shaped rows in
 *     the ordinary report are the nearest visible thing.
 *   - AI-assistant referrals: visits Umami attributes to chatgpt.com,
 *     perplexity.ai, gemini.google.com, copilot.microsoft.com, claude.ai and
 *     the rest — the only place a CITATION that was clicked shows up.
 *
 * Read-only, like everything under scripts/. Nothing here becomes site copy.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { inflateRawSync } from 'node:zlib';

/** Where the owner drops the export. One zip or folder per pull; the newest wins. */
export const GENAI_DIR = 'marketing/insights/genai';

/* ---------------------------------------------------------------- zip + csv */

/**
 * Minimal zip reader: walks local file headers, supports stored (0) and
 * deflate (8) entries — which is all a Search Console export uses. Kept here
 * so the export can be dropped in as downloaded, without a dependency.
 */
export function readZip(buf) {
  const files = {};
  let off = 0;
  while (off + 30 <= buf.length && buf.readUInt32LE(off) === 0x04034b50) {
    const flags = buf.readUInt16LE(off + 6);
    const method = buf.readUInt16LE(off + 8);
    let csize = buf.readUInt32LE(off + 18);
    let usize = buf.readUInt32LE(off + 22);
    const nlen = buf.readUInt16LE(off + 26);
    const xlen = buf.readUInt16LE(off + 28);
    const name = buf.slice(off + 30, off + 30 + nlen).toString('utf8');
    let data = off + 30 + nlen + xlen;
    // Data-descriptor flag: sizes follow the data. Locate the next header.
    if (flags & 0x08 && csize === 0) {
      let p = data;
      while (p + 4 <= buf.length && buf.readUInt32LE(p) !== 0x08074b50) p += 1;
      csize = buf.readUInt32LE(p + 8);
      usize = buf.readUInt32LE(p + 12);
      const raw = buf.slice(data, data + csize);
      files[name] = method === 8 ? inflateRawSync(raw) : raw;
      off = p + 16;
      continue;
    }
    const raw = buf.slice(data, data + csize);
    if (!name.endsWith('/')) files[name] = method === 8 ? inflateRawSync(raw) : raw;
    off = data + csize;
    void usize;
  }
  return files;
}

/** RFC-4180-ish CSV: quoted fields, doubled quotes, CRLF. Returns rows of strings. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let q = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 1; } else q = false;
      } else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); if (row.some((f) => f !== '')) rows.push(row); }
  return rows;
}

const num = (v) => Number(String(v ?? '').replace(/[,%\s]/g, '')) || 0;

/**
 * One CSV table → [{ key, impressions, clicks? }]. The first column is the key
 * (page URL, country, device, date); the Impressions column is found by
 * header, so a future column reshuffle does not silently read the wrong one.
 */
function table(rows) {
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const imp = header.findIndex((h) => h.startsWith('impression'));
  const clk = header.findIndex((h) => h.startsWith('click'));
  if (imp === -1) return [];
  return rows.slice(1).map((r) => ({
    key: r[0]?.trim() ?? '',
    impressions: num(r[imp]),
    ...(clk > -1 && { clicks: num(r[clk]) }),
  })).filter((r) => r.key);
}

/* ---------------------------------------------------------------- exports */

/** YYYY-MM-DD from a filename if it carries one, else the file's mtime. */
function dateOf(path) {
  const m = /(\d{4}-\d{2}-\d{2})/.exec(basename(path));
  return m ? m[1] : statSync(path).mtime.toISOString().slice(0, 10);
}

function readExportFiles(path) {
  const out = {};
  if (statSync(path).isDirectory()) {
    for (const f of readdirSync(path)) if (extname(f).toLowerCase() === '.csv') out[f] = readFileSync(join(path, f));
  } else if (extname(path).toLowerCase() === '.zip') {
    Object.assign(out, readZip(readFileSync(path)));
  }
  return out;
}

/**
 * Every export in the drop folder, newest first. Each is
 * { date, path, pages, countries, devices, dates, total } where `total` is the
 * sum over the Dates table (the chart total) when present, else over pages.
 */
export function readGenAiExports(dir = GENAI_DIR) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir)
    .filter((f) => !f.startsWith('.') && !/\.md$/i.test(f))
    .map((f) => join(dir, f))
    .filter((p) => statSync(p).isDirectory() || extname(p).toLowerCase() === '.zip');
  const parsed = [];
  for (const path of entries) {
    const files = readExportFiles(path);
    const pick = (re) => {
      const name = Object.keys(files).find((n) => re.test(basename(n)));
      return name ? table(parseCsv(files[name].toString('utf8'))) : [];
    };
    const pages = pick(/^pages?\.csv$/i);
    const countries = pick(/^countr(y|ies)\.csv$/i);
    const devices = pick(/^devices?\.csv$/i);
    const dates = pick(/^(dates?|chart)\.csv$/i);
    if (!pages.length && !dates.length) continue; // not a Search Console export
    const total = (dates.length ? dates : pages).reduce((n, r) => n + r.impressions, 0);
    parsed.push({ date: dateOf(path), path, pages, countries, devices, dates, total });
  }
  return parsed.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* ---------------------------------------------------------------- proxies */

/**
 * A query typed as a PROMPT rather than a keyword. Three tells, any one
 * enough: eight or more words; a question shape (who/what/why/how/can/should
 * … with a verb and five-plus words); a conversational marker (please, tell
 * me, explain, compare, versus, for my, in my). English only — the rows this
 * site earns are English — and deliberately generous: it is a shortlist to
 * read, not a metric to publish.
 */
export function isPromptShaped(query) {
  const q = String(query).toLowerCase().trim();
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length >= 8) return true;
  if (/\?$/.test(q)) return true;
  if (words.length >= 5 && /^(who|what|why|how|when|where|which|can|could|should|does|do|is|are|will)\b/.test(q)) return true;
  if (/\b(please|tell me|explain|compare|versus|for my|in my|help me|i need|i want|what if)\b/.test(q)) return true;
  return false;
}

/** Referrer hosts that are AI assistants, not search engines or social. */
export const AI_REFERRERS = [
  [/(^|\.)chatgpt\.com$|(^|\.)openai\.com$|com\.openai\.chatgpt/, 'ChatGPT'],
  [/(^|\.)perplexity\.ai$|ai\.perplexity/, 'Perplexity'],
  [/(^|\.)gemini\.google\.com$|(^|\.)bard\.google\.com$/, 'Gemini'],
  [/(^|\.)copilot\.microsoft\.com$|(^|\.)copilot\.cloud\.microsoft$/, 'Copilot'],
  [/(^|\.)claude\.ai$|(^|\.)anthropic\.com$/, 'Claude'],
  [/(^|\.)you\.com$/, 'You.com'],
  [/(^|\.)meta\.ai$/, 'Meta AI'],
  [/(^|\.)grok\.com$|(^|\.)x\.ai$/, 'Grok'],
  [/(^|\.)poe\.com$/, 'Poe'],
  [/(^|\.)mistral\.ai$/, 'Le Chat'],
  [/(^|\.)deepseek\.com$/, 'DeepSeek'],
  [/(^|\.)kimi\.com$|(^|\.)moonshot\.cn$/, 'Kimi'],
];

/** Umami referrer rows ([{x: host, y: visitors}]) → those that are AI assistants. */
export function aiReferrals(referrers = []) {
  const out = [];
  for (const r of referrers) {
    const host = String(r.x ?? '').toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    const hit = AI_REFERRERS.find(([re]) => re.test(host));
    if (hit) out.push({ assistant: hit[1], referrer: r.x, visitors: r.y });
  }
  return out.sort((a, b) => b.visitors - a.visitors);
}

/* ---------------------------------------------------------------- the block */

const strip = (site, url) => String(url).replace(`https://${site}`, '').replace(/\/$/, '') || '/';

/**
 * Join the newest export with the ordinary Search Console page rows so each
 * page reads: AI impressions · web impressions · AI share. Pages that earn web
 * impressions in the same window but ZERO AI impressions are the "uncited"
 * list — the pages to give an answer-shaped opening, a FAQ block and sources.
 *
 * @param {object} o
 * @param {string} o.site            the bare host, e.g. 'example.com'
 * @param {Array}  o.exports         readGenAiExports() output
 * @param {Array}  [o.gscPages]      searchConsole.pages rows ({keys:[url], impressions, clicks})
 * @param {Array}  [o.gscQueries]    searchConsole.queries rows ({keys:[q], impressions, clicks, position})
 * @param {Array}  [o.referrers]     umami.referrers rows ({x, y})
 * @param {number} [o.now]           ms
 */
export function genAiReport({ site, exports: exps, gscPages = [], gscQueries = [], referrers = [], now = Date.now() }) {
  const latest = exps[0] ?? null;
  const previous = exps[1] ?? null;
  const webByPage = new Map(gscPages.map((r) => [strip(site, r.keys[0]), r]));
  const promptShaped = gscQueries
    .filter((r) => isPromptShaped(r.keys[0]))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 25)
    .map((r) => ({ query: r.keys[0], impressions: r.impressions, clicks: r.clicks, position: r.position }));
  const referrals = aiReferrals(referrers);

  if (!latest) {
    return {
      exportDate: null, ageDays: null, stale: true,
      note: `No Search Console Generative AI export in ${GENAI_DIR}/. Search Console → Performance → Generative AI → Export → Download CSV, drop the zip in that folder (name it with the date), commit.`,
      promptShaped, referrals,
    };
  }

  const ageDays = Math.round((now - new Date(latest.date).getTime()) / 864e5);
  const aiByPage = new Map(latest.pages.map((r) => [strip(site, r.key), r.impressions]));
  const topPages = latest.pages
    .map((r) => {
      const path = strip(site, r.key);
      const web = webByPage.get(path);
      return {
        page: path, ai: r.impressions, web: web?.impressions ?? null,
        share: web?.impressions ? r.impressions / web.impressions : null,
      };
    })
    .sort((a, b) => b.ai - a.ai);
  const uncited = gscPages
    .map((r) => ({ page: strip(site, r.keys[0]), web: r.impressions, position: r.position }))
    .filter((r) => r.web >= 10 && !aiByPage.has(r.page))
    .sort((a, b) => b.web - a.web)
    .slice(0, 15);
  const prevByPage = new Map((previous?.pages ?? []).map((r) => [strip(site, r.key), r.impressions]));
  const movers = topPages.map((p) => ({ ...p, previous: prevByPage.get(p.page) ?? 0 }))
    .filter((p) => p.ai !== p.previous)
    .sort((a, b) => (b.ai - b.previous) - (a.ai - a.previous))
    .slice(0, 10);

  return {
    exportDate: latest.date, ageDays, stale: ageDays > 7, source: latest.path,
    total: latest.total, previousTotal: previous?.total ?? null, previousDate: previous?.date ?? null,
    pagesCited: latest.pages.length,
    topPages: topPages.slice(0, 20),
    movers,
    uncited,
    countries: latest.countries.slice(0, 10),
    devices: latest.devices,
    promptShaped,
    referrals,
  };
}
