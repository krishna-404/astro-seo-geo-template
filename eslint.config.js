// The a11y lint gate — the one defect class the CI battery's built-HTML checks
// structurally cannot see: malformed or misapplied ARIA in the templates
// (invalid aria-* names/values, roles on elements that don't support them,
// non-interactive elements given handlers or tabindex, labels without
// controls). jsx-a11y-strict covers ~35 such rules; the runtime checks
// (contrast, one-h1, link integrity) stay in ci.yml where they measure the
// rendered result.
//
// devDependency-only, per the template policy: dev-time dependencies are
// acceptable; nothing here ships to the live site.
import eslintPluginAstro from 'eslint-plugin-astro';
import tsParser from '@typescript-eslint/parser';

export default [
  ...eslintPluginAstro.configs['flat/recommended'],
  ...eslintPluginAstro.configs['flat/jsx-a11y-strict'],
  {
    // .astro frontmatter is TypeScript; astro-eslint-parser delegates it to
    // the TS parser or chokes on the first `interface`.
    files: ['**/*.astro'],
    languageOptions: { parserOptions: { parser: tsParser } },
    rules: {
      // The one deliberate exception: `tabindex="0"` on role="region" is the
      // REQUIRED pattern for keyboard-scrollable containers (.table-scroll —
      // axe's scrollable-region-focusable demands it; our CI enforces it on
      // built HTML). The rule's default treats every non-interactive role as
      // a violation; scroll regions are the documented carve-out.
      'astro/jsx-a11y/no-noninteractive-tabindex': ['error', { roles: ['region'] }],
    },
  },
  {
    ignores: ['dist/**', '.astro/**', 'node_modules/**', '.wrangler/**'],
  },
];
