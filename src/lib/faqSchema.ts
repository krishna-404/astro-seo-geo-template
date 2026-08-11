/**
 * The FAQPage JSON-LD node, built from the same `faq` frontmatter array the
 * <Faq /> component renders — one source, so the schema can never claim a
 * question the page doesn't show (the drift Google's FAQ guidance penalises).
 * Templates append the result to their schema array only when faq is
 * non-empty; call sites guard, this function assumes a non-empty list.
 */
export function faqPageNode(url: string, faq: { q: string; a: string }[]) {
  return {
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}
