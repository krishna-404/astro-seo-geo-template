import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE, FOUNDER } from '../data/site';

/**
 * The blog feed, at /rss.xml.
 *
 * Blog only, on purpose. Glossary and solution entries are reference pages that
 * get revised in place rather than published on a date — pushing them through a
 * feed would re-notify subscribers every time a source was re-checked. Both are
 * covered for machines by the sitemap and by llms.txt.
 */
export async function GET(context: APIContext) {
  const posts = await getCollection('blog', ({ data }) => !data.draft);

  posts.sort((a, b) => b.data.published.valueOf() - a.data.published.valueOf());

  const site = context.site ?? new URL(SITE.url);
  const latest = posts[0]?.data.published;

  return rss({
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    site,
    trailingSlash: false,
    /* Declares the feed's own canonical URL inside the feed. Without it the
       feed is valid but incomplete: aggregators that find it by a copied link
       have no way to confirm where it really lives, and every RSS validator
       flags the omission. */
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    items: posts.map((post) => ({
      title: post.data.title,
      /* The tldr, not the meta description — a reader scanning the feed wants
         the front-loaded answer, not the search snippet. */
      description: post.data.tldr,
      pubDate: post.data.published,
      link: `/blog/${post.id}`,
      author: post.data.author.name,
      categories: post.data.tags,
    })),
    customData: [
      `<atom:link href="${new URL('/rss.xml', site).href}" rel="self" type="application/rss+xml"/>`,
      `<language>en</language>`,
      `<copyright>© ${new Date().getFullYear()} ${SITE.name}</copyright>`,
      `<managingEditor>${FOUNDER.name}</managingEditor>`,
      latest ? `<lastBuildDate>${latest.toUTCString()}</lastBuildDate>` : '',
      `<image><url>${new URL('/favicon.svg', site).href}</url><title>${SITE.name}</title><link>${site.href}</link></image>`,
    ]
      .filter(Boolean)
      .join(''),
  });
}
