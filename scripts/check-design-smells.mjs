#!/usr/bin/env node
/**
 * Design-smell sweep over the built site — the machine-checkable half of
 * /design-direction § 3's smell pass, at the built-output rung.
 *
 *   npm run build && npm run check:design
 *
 * WHY THIS EXISTS. The smell pass was a prose list ("a page reads as
 * generated when it has…") consulted by eye on two screenshots. Prose guards
 * nothing against generated markup, and every item below is a RULE CLASS
 * (AGENTS rule 18): it recurs on the next page, the next component, the
 * next site built from the template, and nobody notices because each
 * instance looks fine on its own. So the half a browser can measure is
 * measured here, over every page, at a phone width and a desktop width;
 * the half that needs judgement (a bland hero, a stock photograph, centred
 * text everywhere) stays in the skill and in `npm run design:shoot`'s
 * contact sheets.
 *
 * Every check reads the RENDERED result (computed style, layout boxes), not
 * the source: a `transition: all` from a scoped style, a gradient headline
 * from a one-off class, an overflow from a long word — all invisible to a
 * grep, all visible here. Mirrors check-contrast.mjs: a tiny static server,
 * playwright chromium installed ad hoc (never a devDependency, CHECKLIST §6),
 * every <details> forced open so collapsed content is measured too.
 *
 * The checks, each with the WHY that stops the next editor deleting it:
 *
 *  overflow      No horizontal page scroll at 375 or 1440 (AGENTS rule 2 —
 *                the rule was prose; a wide table, a long URL or a 100vw
 *                band recreates it silently).
 *  spill         No visible element sticks out past the viewport edge without
 *                a scroll container around it. Catches what `overflow: clip`
 *                hides from the scrollWidth test.
 *  enlarged      The desktop page still has no horizontal scroll with the
 *                root font size at 200% (WCAG 1.4.4 — the playbook's "keep
 *                the layout intact when the text is enlarged"; a fixed-px
 *                width or a flex row that cannot wrap fails it).
 *  targets       Buttons, form controls, summaries and header links are ≥44px
 *                tall and wide at the phone width (AGENTS rule 2; inline
 *                text links are exempt, as WCAG exempts them).
 *  fold          On a page with a hero, the hero's first CTA finishes inside
 *                a 375×667 viewport — the check /design-direction § 3 asked
 *                for by eye.
 *  gradient-text A headline painted with `background-clip: text` — the
 *                first item on the generated-page tell list.
 *  glass         `backdrop-filter` anywhere but the sticky header — frosted
 *                cards are the second.
 *  transition    `transition-property: all` with a real duration: it
 *                animates layout properties (jank) and is the lazy default a
 *                generated stylesheet reaches for.
 *  emoji         A pictographic glyph in a heading, eyebrow, button or
 *                summary — sparkle-as-icon.
 *  eyebrows      More than max(1, ⌈sections/3⌉) `.eyebrow` labels on a page
 *                (the eyebrow-above-every-heading tell; the #1 rule
 *                generated pages break), or an eyebrow that is a section
 *                number ("01", "001 ·", "03 / 06").
 *  cards         Three or more consecutive sibling cards with the same
 *                child structure, background and width — the identical
 *                icon-title-blurb row. The bento passes because the lead
 *                card differs; a `.grid--3` of clones does not.
 *  repeat        Two adjacent `.band` sections with the identical class
 *                list — the same band, the same layout family, back to back.
 *  black         Pure #000 as a text or background colour on a visible
 *                element — every source agrees off-black is the floor.
 *
 * Thresholds are the ones the sources agree on (marketing/playbook-intake.md,
 * 2026-09-27: scroll-craft's taste floor, taste-skill's pre-flight, the
 * owner's playbook). Loosen one only with a dated line in CHECKLIST §9.
 */
import { walkHtml } from './lib/html.mjs';
import { join, relative, sep } from 'node:path';
import { chromium } from 'playwright';

const DIST = 'dist';
const PORT = 4327; // 4319 contrast · 4323 a11y · 4321 astro dev

const pages = () => walkHtml(DIST).map((p) => '/' + relative(DIST, p).split(sep).join('/'));

/** Runs in the page. `phone` is true at the 375 viewport. Returns findings. */
const AUDIT = (phone) => {
  const out = [];
  const bad = (check, sel, detail) => out.push({ check, sel, detail });
  const path = (el) => {
    const parts = [];
    for (let e = el; e && e.nodeType === 1 && parts.length < 4; e = e.parentElement) {
      const cls = [...e.classList].slice(0, 2).join('.');
      parts.unshift(e.tagName.toLowerCase() + (cls ? `.${cls}` : ''));
    }
    return parts.join(' > ');
  };
  const vw = document.documentElement.clientWidth;
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const scrollable = (el) => {
    for (let e = el.parentElement; e; e = e.parentElement) {
      const o = getComputedStyle(e).overflowX;
      if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true;
    }
    return false;
  };

  // overflow / spill
  if (document.documentElement.scrollWidth > vw + 1)
    bad('overflow', 'html', `page scrolls sideways: ${document.documentElement.scrollWidth}px wide in a ${vw}px viewport`);
  for (const el of document.body.querySelectorAll('*')) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.position === 'absolute' || cs.position === 'fixed') continue; // off-screen techniques (.skip, .sr-only, the honeypot)
    const r = el.getBoundingClientRect();
    if ((r.right > vw + 1 || r.left < -1) && !scrollable(el))
      bad('spill', path(el), `spans ${Math.round(r.left)}–${Math.round(r.right)}px in a ${vw}px viewport`);
  }

  // targets (phone only)
  if (phone) {
    const sel = '.btn, button, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea, summary, header a, .hdr a';
    for (const el of document.querySelectorAll(sel)) {
      if (!visible(el) || el.closest('[aria-hidden="true"]') || el.tabIndex < 0) continue; // the honeypot is not a target
      const r = el.getBoundingClientRect();
      if (r.height < 43.5 || r.width < 43.5) // half a pixel of sub-pixel tolerance
        bad('targets', path(el), `${Math.round(r.width)}×${Math.round(r.height)}px — touch targets are ≥44px`);
    }
  }

  // fold (phone only)
  if (phone) {
    const cta = document.querySelector('.hero .btn');
    if (cta) {
      const r = cta.getBoundingClientRect();
      if (r.bottom + window.scrollY > 667)
        bad('fold', path(cta), `hero CTA ends at ${Math.round(r.bottom + window.scrollY)}px — below a 667px phone fold`);
    }
  }

  // gradient-text / glass / transition / black
  for (const el of document.body.querySelectorAll('*')) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    if ((cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') && cs.backgroundImage !== 'none')
      bad('gradient-text', path(el), 'text painted with background-clip: text');
    if (cs.backdropFilter && cs.backdropFilter !== 'none' && !el.closest('header'))
      bad('glass', path(el), `backdrop-filter: ${cs.backdropFilter} outside the header`);
    // `transition-property` computes to "all" on every element by default;
    // only a declared duration makes it a transition (the reduced-motion
    // clamp's 0.01ms would otherwise flag the whole page).
    if (cs.transitionProperty.split(',').some((p) => p.trim() === 'all') && parseFloat(cs.transitionDuration) >= 0.05)
      bad('transition', path(el), 'transition: all — name the properties (transform, opacity, colour)');
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
    if (hasText && cs.color === 'rgb(0, 0, 0)') bad('black', path(el), 'pure #000 text — use the ink tokens');
    if (cs.backgroundColor === 'rgb(0, 0, 0)') bad('black', path(el), 'pure #000 background — use --band-ink');
  }

  // emoji
  const pict = /\p{Extended_Pictographic}/u;
  for (const el of document.querySelectorAll('h1, h2, h3, h4, .eyebrow, .btn, summary')) {
    const t = el.textContent ?? '';
    if (pict.test(t)) bad('emoji', path(el), `"${t.trim().slice(0, 40)}"`);
  }

  // eyebrows
  const sections = document.querySelectorAll('main section, main article').length;
  const eyebrows = [...document.querySelectorAll('.eyebrow')].filter(visible);
  const allowed = Math.max(1, Math.ceil(sections / 3));
  if (eyebrows.length > allowed)
    bad('eyebrows', 'main', `${eyebrows.length} eyebrow labels over ${sections} sections — at most ${allowed} (one per three sections; an eyebrow above every heading is the tell)`);
  for (const e of eyebrows) {
    const t = (e.textContent ?? '').trim();
    if (/^(0\d\b|\d{1,3}\s*[/·.—-]\s*\S)/.test(t)) bad('eyebrows', path(e), `"${t}" — a section number is not a label`);
  }

  // cards (desktop only — phones stack everything into one column)
  if (!phone) {
    const sig = (c) =>
      [...c.children].map((k) => k.tagName + (k.classList.contains('eyebrow') ? '.eyebrow' : '')).join('>');
    for (const parent of document.querySelectorAll('main *')) {
      const kids = [...parent.children];
      if (kids.length < 3 || !kids.every((k) => k.classList.contains('card'))) continue;
      let run = 1;
      for (let i = 1; i < kids.length; i++) {
        const a = kids[i - 1];
        const b = kids[i];
        const same =
          sig(a) === sig(b) &&
          getComputedStyle(a).backgroundColor === getComputedStyle(b).backgroundColor &&
          Math.abs(a.getBoundingClientRect().width - b.getBoundingClientRect().width) < 2;
        run = same ? run + 1 : 1;
        if (run === 3) {
          bad('cards', path(parent), 'three identical cards in a row — vary the lead (span, band, a figure) or drop the cards');
          break;
        }
      }
    }
  }

  // repeat — bands only: a glossary grouped by letter repeats its section
  // class by nature; two marketing bands with the same class back to back
  // is the same band with the same layout family, which is the tell.
  const secs = [...document.querySelectorAll('main section.band')];
  for (let i = 1; i < secs.length; i++) {
    const a = secs[i - 1].className.trim();
    const b = secs[i].className.trim();
    if (a === b && secs[i - 1].nextElementSibling === secs[i])
      bad('repeat', path(secs[i]), `two adjacent bands with the same class list "${a}" — alternate the band or the layout`);
  }

  return out;
};

const routes = pages().sort();
const server = (await import('node:http')).createServer(async (req, res) => {
  const { readFile } = await import('node:fs/promises');
  try {
    const body = await readFile(join(DIST, decodeURIComponent(req.url.split('?')[0])));
    res.writeHead(200, { 'content-type': req.url.endsWith('.css') ? 'text/css' : 'text/html' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);

const openDetails = () =>
  document.querySelectorAll('details').forEach((d) => {
    d.removeAttribute('name');
    d.open = true;
  });

const failures = new Map(); // dedup by check+selector+detail, list the routes
const record = (route, list) => {
  for (const f of list) {
    const key = `${f.check}|${f.sel}|${f.detail}`;
    if (!failures.has(key)) failures.set(key, { ...f, routes: [] });
    failures.get(key).routes.push(route);
  }
};

for (const [width, height, phone] of [
  [375, 667, true],
  [1440, 900, false],
]) {
  const page = await browser.newPage({ viewport: { width, height } });
  // Motion ON, as a default visitor sees it — the reduced-motion clamp would
  // zero every duration and hide a `transition: all` from the sweep.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const route of routes) {
    await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'networkidle' });
    await page.evaluate(openDetails);
    await page.waitForTimeout(250); // the ::details-content transitions (150 ms) settle before anything is measured
    record(`${route} @${width}`, await page.evaluate(AUDIT, phone));
    // enlarged: 200% root font size, then the overflow test again. Desktop
    // only — WCAG 1.4.4 is judged at 200% browser zoom on a desktop width
    // (1280 at 200% is a 640px viewport); doubling text at 375 is a ~187px
    // viewport nobody ships to.
    if (phone) continue;
    const wide = await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
      const w = document.documentElement.scrollWidth;
      document.documentElement.style.fontSize = '';
      return w;
    });
    if (wide > width + 1)
      record(`${route} @${width}`, [
        { check: 'enlarged', sel: 'html', detail: `page scrolls sideways (${wide}px) once text is at 200% — a fixed width is not scaling with the text` },
      ]);
  }
  await page.close();
}

await browser.close();
server.close();

if (!failures.size) {
  console.log(`   ok — ${routes.length} pages at 375 and 1440, no design smell the sweep can measure`);
  process.exit(0);
}

const rows = [...failures.values()].sort((a, b) => a.check.localeCompare(b.check));
console.error(`   FAIL: ${rows.length} design smell(s) over ${routes.length} pages\n`);
for (const r of rows) {
  console.error(`   [${r.check}] ${r.sel}`);
  console.error(`         ${r.detail}`);
  console.error(`         ${r.routes.length} page(s), e.g. ${r.routes[0]}\n`);
}
process.exit(1);
