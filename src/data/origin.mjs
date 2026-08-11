// The canonical origin, as plain ESM so both the Astro config (TS-aware) and
// the zero-dependency node scripts (generate-llms, markdown-twins, indexnow)
// can import the same constant. One source: change the domain here and nowhere
// else. site.ts re-exports it for component use.
export const SITE_URL = 'https://example.com';
