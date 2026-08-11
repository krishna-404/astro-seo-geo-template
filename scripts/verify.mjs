#!/usr/bin/env node
/**
 * The full local battery — everything CI checks, runnable before anything
 * leaves the machine. Wired to the pre-push hook (.githooks/pre-push); also
 * just `npm run verify` whenever you want the answer.
 *
 * Mirrors ci.yml step for step. Where CI and this script share logic they
 * call the SAME scripts (check-parity, check-source-rules, check-invariants,
 * smoke-worker, check-contrast, check-a11y) so the two cannot drift; the few
 * CI-only wrappers (lastmod temp-copy dance, tool installs) are reproduced
 * here.
 *
 * Takes a few minutes (build + wrangler + two browser sweeps). That is the
 * point: it runs at push time, not commit time — the pre-commit hook runs
 * only the fast source-level tier. Escape hatch for both: --no-verify.
 */

import { execSync, spawnSync } from 'node:child_process';
import { copyFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const t0 = Date.now();
let step = 0;

function run(title, cmd) {
  step += 1;
  console.log(`\n[verify ${step}] ${title}`);
  const r = spawnSync(cmd, { shell: true, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\nverify FAILED at: ${title}`);
    process.exit(1);
  }
}

/** Browser/validator tooling is deliberately not in package.json (CHECKLIST
 *  §6) — install on demand, --no-save, same as CI does. */
function ensure(pkg) {
  try {
    require.resolve(pkg);
  } catch {
    console.log(`   (installing ${pkg} --no-save)`);
    execSync(`npm install --no-save ${pkg}`, { stdio: 'inherit' });
  }
}

// ── fast source tier (same as the pre-commit hook) ─────────────────────────
run('config parity + source rules', 'node scripts/check-parity.mjs && node scripts/check-source-rules.mjs');
run('collection routes exist', `node -e "
  const fs = require('fs');
  let fail = 0;
  for (const dir of fs.readdirSync('src/content', { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    if (!fs.existsSync('src/pages/' + dir.name + '/[...slug].astro')) {
      console.log('FAIL: collection ' + dir.name + ' has no route');
      fail = 1;
    }
  }
  process.exit(fail);
"`);
run('content image references', 'node scripts/check-content-images.mjs');
run('types + worker + lint', 'npm run check');

// ── build ──────────────────────────────────────────────────────────────────
run('full build (includes CSP generation)', 'npm run build');

// lastmod freshness — CI's temp-copy dance, with the committed file restored
// afterwards so verify never leaves the tree dirty.
step += 1;
console.log(`\n[verify ${step}] committed lastmod map is current`);
const LASTMOD = 'src/data/lastmod.json';
const committed = readFileSync(LASTMOD, 'utf8');
copyFileSync(LASTMOD, `${LASTMOD}.committed`);
try {
  execSync('npm run lastmod', { stdio: 'pipe' });
  const r = spawnSync('node', ['scripts/check-lastmod.mjs', `${LASTMOD}.committed`], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('\nverify FAILED at: lastmod freshness — run `npm run lastmod` and commit the result');
    process.exit(1);
  }
} finally {
  writeFileSync(LASTMOD, committed);
  if (existsSync(`${LASTMOD}.committed`)) execSync(`rm ${LASTMOD}.committed`);
}

run('committed worker CSP is current', 'git diff --exit-code worker/csp.generated.json');

// ── built-output tier ──────────────────────────────────────────────────────
run('site invariants (shared with CI)', 'node scripts/check-invariants.mjs');
run('worker behavioral smoke test', 'npm run smoke:worker');
ensure('html-validate');
run('built HTML validates', 'npx html-validate "dist/**/*.html"');
ensure('playwright');
execSync('npx playwright install chromium', { stdio: 'ignore' }); // no-op when cached
run('WCAG AA contrast sweep', 'npm run check:contrast');
ensure('axe-core');
run('axe-core accessibility scan', 'npm run check:a11y');

console.log(`\nverify: all ${step} steps green in ${Math.round((Date.now() - t0) / 1000)}s.`);
