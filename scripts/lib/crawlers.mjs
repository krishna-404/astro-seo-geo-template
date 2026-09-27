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
 * WHAT READS THIS, AND WHAT DELIBERATELY DOES NOT. The edge read-back in
 * insights.mjs classifies every user-agent against it, and
 * check-invariants.mjs derives its "robots.txt must not Disallow an answer
 * engine" watch list from ROBOTS_AGENTS — so an engine added here gets that
 * guard on the same commit instead of when somebody remembers.
 *
 * src/pages/robots.txt.ts keeps its own named groups on purpose and is NOT
 * generated from this file. The two answer different questions: this is the
 * measurement list (who arrived, and what are they doing with the page),
 * robots.txt is the policy list (what this site has decided to say out loud).
 * robots.txt opens with `User-agent: * / Allow: /`, so an agent it does not
 * name is already allowed — the named groups are emphasis and documentation,
 * and which engines earn that emphasis is the site owner's call, not a
 * consequence of adding a row here.
 *
 * scripts/smoke-live.mjs needs something these tokens are not: a REAL
 * user-agent string, because it is asking the live edge whether it would serve
 * that agent. It used to keep its own list of six, which is how an engine added
 * here could go untested at the edge — the one place a refusal is visible at
 * all. SMOKE_AGENTS below derives that list from these rows, so a new answering
 * engine gets its live check on the same commit.
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
 * The version-and-URL tail each vendor publishes for its agent, keyed by token.
 * An agent with no tail here gets no live check: inventing a plausible-looking
 * user-agent would test the edge against a string no vendor sends.
 */
const SMOKE_TAIL = {
  'OAI-SearchBot': 'OAI-SearchBot/1.0; +https://openai.com/searchbot',
  'ChatGPT-User': 'ChatGPT-User/1.0; +https://openai.com/bot',
  'Claude-SearchBot': 'Claude-SearchBot/1.0; +https://www.anthropic.com/searchbot',
  'Claude-User': 'Claude-User/1.0; +Claude-User@anthropic.com',
  PerplexityBot: 'PerplexityBot/1.0; +https://perplexity.ai/perplexitybot',
  'Perplexity-User': 'Perplexity-User/1.0; +https://perplexity.ai/perplexity-user',
  Bingbot: 'bingbot/2.0; +http://www.bing.com/bingbot.htm',
  Googlebot: 'Googlebot/2.1; +http://www.google.com/bot.html',
  Applebot: 'Applebot/0.1; +http://www.apple.com/go/applebot',
  DuckAssistBot: 'DuckAssistBot/1.0; +https://duckduckgo.com/duckassistbot.html',
};

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
  // A token is checked FIRST and answers null. Skipping the token rows and then
  // matching the crawler rows is not the same thing: "Applebot-Extended"
  // CONTAINS "Applebot", so /Applebot/i matched it and the opt-out token was
  // reported as an Apple crawler visit — traffic that cannot exist, since the
  // token never appears as a user-agent at all. Found by
  // scripts/lib/crawlers.test.mjs on 27 Sep 2026, which is the case the test
  // was written for.
  if (CRAWLERS.some((c) => c.token && c.re.test(ua))) return null;
  return CRAWLERS.find((c) => !c.token && c.re.test(ua)) ?? null;
}

/** Every agent that should be named in robots.txt, tokens included. */
export const ROBOTS_AGENTS = CRAWLERS.map((c) => c.agent);

/**
 * Realistic user-agent strings for the live edge check, built from the rows
 * above. Only the agents whose refusal costs a citation are worth a live
 * request (a `train` agent affects no answer today — crawlers.mjs § roles), and
 * only the ones a small site actually sees: the five engines whose indexes the
 * mainstream assistants answer from, plus the browsing agents. Each string is
 * shaped like the vendor's published one — token, version, and the +URL that
 * makes it identifiable — because a WAF matches on the whole string, not the
 * token.
 *
 * @type {Record<string, string>}
 */
export const SMOKE_AGENTS = Object.fromEntries(
  CRAWLERS.filter((c) => !c.token && ANSWERING_ROLES.has(c.role) && SMOKE_TAIL[c.agent])
    .map((c) => [c.agent, `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ${SMOKE_TAIL[c.agent]})`])
);
