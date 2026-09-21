/**
 * crawlers.mjs — the answer-engine crawler registry: which non-browser agent
 * belongs to which assistant, and WHAT IT DOES WITH THE PAGE once it has it.
 *
 * Why the roles matter more than the names. "AI bot traffic" as one number is
 * useless: three very different things wear a bot user-agent, and only two of
 * them can ever put this site inside an answer.
 *
 *   index  builds a standing index that the assistant answers FROM. A visit
 *          here is the thing that makes citation possible at all — no index
 *          entry, no citation, however good the page is. This is the role to
 *          watch, and the role a WAF block silently destroys.
 *   live   fetches the page AT ANSWER TIME, because a user asked something
 *          that named us or a link was pasted. A visit here means the page is
 *          already in play in somebody's conversation — the strongest signal
 *          on this list, and the rarest.
 *   train  takes the page into a training corpus. It does not affect any
 *          answer given today, and a site can rationally allow or block it on
 *          grounds that have nothing to do with measurement. Counted, kept
 *          separate, never added to the score.
 *
 * Two entries are deliberately not crawlers and are marked `token: true`:
 * Google-Extended and Applebot-Extended are robots.txt OPT-OUT TOKENS, obeyed
 * by Googlebot and Applebot respectively. Neither ever appears as a
 * user-agent at the edge, so "zero hits from Google-Extended" is the expected
 * reading, not a finding — the registry says so, so nothing downstream has to
 * rediscover it.
 *
 * Kept as data, in one file, because three things need the same list and had
 * been keeping three copies: the robots.txt allow-list, the smoke test's
 * user-agent fetches, and the edge read-back in insights.mjs.
 */

/**
 * @typedef {object} Crawler
 * @property {RegExp} re       matches the user-agent string
 * @property {string} agent    the token as robots.txt spells it
 * @property {string} engine   the company
 * @property {string} product  the assistant a visit here can reach
 * @property {'index'|'live'|'train'} role
 * @property {boolean} [token] true when it is a robots token, not a crawler
 */

/** @type {Crawler[]} */
export const CRAWLERS = [
  // OpenAI — three agents, three different jobs, routinely conflated.
  { re: /OAI-SearchBot/i, agent: 'OAI-SearchBot', engine: 'OpenAI', product: 'ChatGPT search', role: 'index' },
  { re: /ChatGPT-User/i, agent: 'ChatGPT-User', engine: 'OpenAI', product: 'ChatGPT (browsing)', role: 'live' },
  { re: /GPTBot/i, agent: 'GPTBot', engine: 'OpenAI', product: 'model training', role: 'train' },

  // Anthropic.
  { re: /Claude-SearchBot/i, agent: 'Claude-SearchBot', engine: 'Anthropic', product: 'Claude search', role: 'index' },
  { re: /Claude-User/i, agent: 'Claude-User', engine: 'Anthropic', product: 'Claude (browsing)', role: 'live' },
  { re: /ClaudeBot/i, agent: 'ClaudeBot', engine: 'Anthropic', product: 'model training', role: 'train' },

  // Perplexity.
  { re: /Perplexity-User/i, agent: 'Perplexity-User', engine: 'Perplexity', product: 'Perplexity (answering)', role: 'live' },
  { re: /PerplexityBot/i, agent: 'PerplexityBot', engine: 'Perplexity', product: 'Perplexity index', role: 'index' },

  // Microsoft. Bingbot is the load-bearing one on this list: Bing's index is
  // what Copilot answers from and what ChatGPT's web results lean on, so a
  // site can be invisible in two assistants for a reason that is pure
  // classic-SEO indexing and has nothing to do with "AI".
  { re: /bingbot/i, agent: 'Bingbot', engine: 'Microsoft', product: 'Bing → Copilot, ChatGPT search', role: 'index' },

  // Google. Googlebot's crawl is what AI Overviews and AI Mode draw on;
  // Google-Extended is a token it obeys, not an agent that calls.
  { re: /Googlebot/i, agent: 'Googlebot', engine: 'Google', product: 'Search → AI Overviews, AI Mode', role: 'index' },
  { re: /Google-Extended/i, agent: 'Google-Extended', engine: 'Google', product: 'Gemini training', role: 'train', token: true },

  // Apple.
  { re: /Applebot-Extended/i, agent: 'Applebot-Extended', engine: 'Apple', product: 'Apple Intelligence training', role: 'train', token: true },
  { re: /Applebot/i, agent: 'Applebot', engine: 'Apple', product: 'Siri, Spotlight', role: 'index' },

  // The rest, in rough order of how often they turn up on a small site.
  { re: /DuckAssistBot/i, agent: 'DuckAssistBot', engine: 'DuckDuckGo', product: 'DuckAssist', role: 'index' },
  { re: /Amazonbot/i, agent: 'Amazonbot', engine: 'Amazon', product: 'Alexa, Rufus', role: 'index' },
  { re: /YouBot/i, agent: 'YouBot', engine: 'You.com', product: 'You.com', role: 'index' },
  { re: /MistralAI-User/i, agent: 'MistralAI-User', engine: 'Mistral', product: 'Le Chat (browsing)', role: 'live' },
  { re: /meta-externalagent/i, agent: 'meta-externalagent', engine: 'Meta', product: 'Meta AI', role: 'train' },
  { re: /Bytespider/i, agent: 'Bytespider', engine: 'ByteDance', product: 'Doubao', role: 'train' },
  { re: /cohere-(ai|training-data-crawler)/i, agent: 'cohere-ai', engine: 'Cohere', product: 'model training', role: 'train' },
  { re: /CCBot/i, agent: 'CCBot', engine: 'Common Crawl', product: 'the corpus most others train on', role: 'train' },
];

/** The agents that can actually put this site inside an answer. */
export const ANSWERING_ROLES = new Set(['index', 'live']);

/**
 * Classify one user-agent string.
 * Order matters: Claude-SearchBot and Claude-User must be tested before
 * ClaudeBot, ChatGPT-User before GPTBot — the shorter token is a substring of
 * neither, but the vendor strings are close enough that a reordering of this
 * array would quietly reclassify live fetches as training. The array above is
 * ordered so the specific token always wins; do not sort it.
 *
 * @param {string} ua
 * @returns {Crawler|null}
 */
export function classify(ua) {
  if (!ua) return null;
  return CRAWLERS.find((c) => !c.token && c.re.test(ua)) ?? null;
}

/** Every agent that should be named in robots.txt, tokens included. */
export const ROBOTS_AGENTS = CRAWLERS.map((c) => c.agent);
