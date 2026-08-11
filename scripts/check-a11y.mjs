#!/usr/bin/env node
/**
 * axe-core accessibility scan over every built page.
 *
 *   npm run build && npm install --no-save playwright axe-core && npm run check:a11y
 *
 * WHY THIS EXISTS ALONGSIDE THE OTHER CHECKS. The template already has three
 * a11y layers: the eslint jsx-a11y-strict lint (source-level ARIA misuse),
 * the hand-rolled structural invariants in ci.yml (h1 count, alt presence,
 * table-scroll semantics, _blank announcements), and the contrast sweep
 * (colour measurement). axe-core covers the classes none of those can see in
 * BUILT output: broken ARIA references (aria-labelledby pointing at nothing),
 * accessible-name computation, landmark structure, list semantics, duplicate
 * ids — the ~57%-of-defects engine class. It complements, not replaces, the
 * manual keyboard/screen-reader pass in PLAYBOOK §8.
 *
 * Fails on `serious` and `critical` violations. `moderate`/`minor` are
 * printed but do not fail the build — review them when they appear; promote
 * any that recur to a structural invariant in ci.yml.
 *
 * Mirrors check-contrast.mjs: tiny static server + playwright chromium
 * (installed in CI ad hoc, never a devDependency — see CHECKLIST §6), with
 * every <details> forced open so collapsed content is scanned too.
 */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const DIST = 'dist';
const PORT = 4323; // 4319 is check-contrast's; 4321 is astro dev's

function pages(dir = DIST, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) pages(p, out);
    else if (name.endsWith('.html')) out.push('/' + relative(DIST, p).split(sep).join('/'));
  }
  return out;
}

const require = createRequire(import.meta.url);
const axeSource = readFileSync(
  join(dirname(require.resolve('axe-core')), 'axe.min.js'),
  'utf8'
);

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
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

let failCount = 0;
let warnCount = 0;
for (const route of routes) {
  await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    document.querySelectorAll('details').forEach((d) => {
      d.removeAttribute('name');
      d.open = true;
    });
  });
  await page.evaluate(axeSource);
  const result = await page.evaluate(async () => {
    // Colour contrast has its own dedicated sweep (check-contrast.mjs) which
    // composites translucent ancestors — axe's version is weaker; disable it
    // here so one defect never reports through two checks with two verdicts.
    return await window.axe.run(document, {
      rules: { 'color-contrast': { enabled: false } },
    });
  });
  for (const v of result.violations) {
    const fails = v.impact === 'serious' || v.impact === 'critical';
    if (fails) failCount += 1;
    else warnCount += 1;
    const label = fails ? 'FAIL' : 'warn';
    console.log(`   ${label}: ${route} — [${v.impact}] ${v.id}: ${v.help}`);
    for (const n of v.nodes.slice(0, 3)) {
      console.log(`         ${n.target.join(' ')} — ${n.html.slice(0, 100)}`);
    }
    if (v.nodes.length > 3) console.log(`         …and ${v.nodes.length - 3} more node(s)`);
  }
}

await browser.close();
server.close();

if (failCount) {
  console.log(`\n${failCount} serious/critical axe violation(s) across ${routes.length} pages.`);
  process.exit(1);
}
console.log(
  `   ok — ${routes.length} pages, no serious/critical axe violations` +
    (warnCount ? ` (${warnCount} moderate/minor warning(s) above — review them)` : '')
);
