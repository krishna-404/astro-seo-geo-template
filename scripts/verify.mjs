#!/usr/bin/env node
/**
 * The full local battery — everything CI checks, runnable before anything
 * leaves the machine. Wired to the pre-push hook (.githooks/pre-push); also
 * just `npm run verify` whenever you want the answer.
 *
 * ci.yml mirrors this when dispatched by hand (Actions are opt-in). Where CI and this script share logic they
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
 *  §6, the dependency policy) — install on demand, --no-save, same as CI does.
 *
 *  ONE install of THE WHOLE LIST, whenever any of it is missing. `npm install
 *  --no-save X` reconciles against the lockfile and PRUNES every package
 *  previously installed with --no-save, so installing only what is missing
 *  removes what is already there: the first real CI run died this way, and so
 *  did a verify run on 27 Sep 2026 after a developer had installed playwright
 *  by hand (html-validate's install pruned playwright, the retry pruned
 *  html-validate, and the battery reported html-validate "unresolvable after
 *  two installs"). Passing all three every time is the only spelling that
 *  converges. */
function ensureAll(pkgs) {
  const missing = (list) =>
    list.filter((p) => {
      try {
        require.resolve(p);
        return false;
      } catch {
        return true;
      }
    });
  // Post-condition asserted, install retried once: npm has been observed to
  // exit 0 from a --no-save batch with one package silently absent. Trust
  // the filesystem, not the exit code.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!missing(pkgs).length) return;
    console.log(`   (installing ${pkgs.join(' ')} --no-save${attempt ? ', retry' : ''})`);
    execSync(`npm install --no-save ${pkgs.join(' ')}`, { stdio: 'inherit' });
  }
  const still = missing(pkgs);
  if (still.length) {
    console.error(`verify FAILED: ${still.join(', ')} still unresolvable after two installs — install manually and re-run`);
    process.exit(1);
  }
}

// ── fast source tier (same as the pre-commit hook) ─────────────────────────
run('config parity + source rules', 'node scripts/check-parity.mjs && node scripts/check-source-rules.mjs');
run('unit tests (node --test)', 'npm test');
run('mechanical voice check (anti-AI rules)', 'node scripts/check-voice.mjs');
run('site-wide link graph (orphans, dead links, junk anchors)', 'node scripts/check-link-graph.mjs');
run('content inventory is current', 'node scripts/content-inventory.mjs --check');
run('collection routes exist', 'node scripts/check-collection-routes.mjs');
run('content image references', 'node scripts/check-content-images.mjs');
// `npm run build` below runs `astro check` and `check:worker` as its first two
// steps, so calling `npm run check` here would type-check the whole tree twice
// for no extra coverage. Lint is NOT part of the build, so it stays its own
// step — and it stays before the build, where a failure costs seconds.
run('lint', 'npm run lint');

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
ensureAll(['html-validate', 'playwright', 'axe-core']);
run('built HTML validates', 'npx html-validate "dist/**/*.html"');
execSync('npx playwright install chromium', { stdio: 'ignore' }); // no-op when cached
run('WCAG AA contrast sweep', 'npm run check:contrast');
run('axe-core accessibility scan', 'npm run check:a11y');
run('design-smell sweep (375 + 1440, measured)', 'npm run check:design');

console.log(`\nverify: all ${step} steps green in ${Math.round((Date.now() - t0) / 1000)}s.`);
