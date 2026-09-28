/**
 * The awwwards parsers behind `npm run design:refs`. The fixtures are cut
 * from the live pages of 28 Sep 2026; the one that matters is the last: an
 * Elements slug awwwards does not know answers 200 with a full grid and is a
 * text search, which the sheet must say rather than file under a category.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  siteCards,
  elementCards,
  elementCategories,
  elementMode,
  countTags,
  TECH,
} from './awwwards.mjs';

const card = (o) =>
  `data-collectable-model-value="${JSON.stringify(o).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`;

const SITES = `
<li class="js-collectable" ${card({ slug: 'mind-robotics', title: 'Mind Robotics', tags: ['clean', 'gsap'], createdAt: 1790000000 })}></li>
<li class="js-collectable" ${card({ slug: 'mind-robotics', title: 'dup', tags: [] })}></li>
<li class="js-collectable" ${card({ title: 'no slug', tags: [] })}></li>
<li class="js-collectable" data-collectable-model-value="{not json"></li>`;

test('site cards: one per slug, unreadable and slugless cards skipped', () => {
  const cards = siteCards(SITES);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].title, 'Mind Robotics');
  assert.deepEqual(cards[0].tags, ['clean', 'gsap']);
  assert.match(cards[0].date, /^\d{4}-\d{2}-\d{2}$/);
});

const li = (o, inner) =>
  `<li class="col-3 js-collectable" data-controller="collectable" ${card(o)}>${inner}</li>`;
const ELEMENTS = `
<ul class="grid-cards js-ajax-entries">
${li(
  {
    title: 'Services',
    tags: ['services'],
    createdAt: 1784305306,
    user: { displayName: 'Phenomenon Studio' },
    type: 'element',
  },
  `<a class="figure-rollover__link" href="/inspiration/services-vita-travels">x</a>
   <a class="figure-rollover__bt" href="https://vita-travel.webflow.io" target="_blank" rel="noopener nofollow">↗</a>
   <strong><a href="/inspiration/services-vita-travels">Services</a></strong>`,
)}
${li(
  {
    title: 'Our &amp; Pricing',
    tags: ['pricing', 'webgl'],
    createdAt: 1784305306,
    user: { username: 'someone' },
  },
  `<a class="figure-rollover__link" href="/inspiration/pricing-x/content">x</a>
   <a class="figure-rollover__bt" href="https://www.awwwards.com/assets/sprite.svg#copy">copy</a>
   <a class="figure-rollover__bt" href="https://example.com/pricing?utm=1" target="_blank">↗</a>`,
)}
${li({ title: 'No links', tags: [] }, `<span>nothing to open</span>`)}
</ul>
<a href="/elements/?category=hero_image&amp;palette=%231981C8">blue</a>
<a href="/elements/?category=FAQ">FAQ</a>`;

test('element cards: inspiration slug, live page and author read from the list item', () => {
  const cards = elementCards(ELEMENTS);
  assert.equal(cards.length, 2, 'a card with nothing to open is dropped');
  assert.equal(cards[0].slug, 'services-vita-travels');
  assert.equal(cards[0].url, 'https://vita-travel.webflow.io');
  assert.equal(cards[0].by, 'Phenomenon Studio');
  assert.equal(
    cards[1].title,
    'Our & Pricing',
    'entities decoded twice: attribute, then JSON string',
  );
  assert.equal(
    cards[1].url,
    'https://example.com/pricing?utm=1',
    'an awwwards asset link is never the live page',
  );
  assert.equal(cards[1].by, 'someone');
});

test('the category list is read from the filter links, and a known slug is a category', () => {
  assert.deepEqual([...elementCategories(ELEMENTS)].sort(), ['FAQ', 'hero_image']);
  assert.equal(elementMode(ELEMENTS, 'hero_image'), 'category');
  assert.equal(elementMode(ELEMENTS, 'FAQ'), 'category');
});

test('an unknown slug is a text search (200, full grid, links carry text=), never a category', () => {
  const search = ELEMENTS.replace(/\?category=/g, '?text=services&amp;category=');
  assert.equal(elementMode(search, 'services'), 'text');
  assert.equal(
    elementMode(search, 'hero_image'),
    'category',
    'the filter links still name the real categories',
  );
});

test('a page that is not the elements grid is unknown, not filed', () => {
  assert.equal(elementMode('', 'hero_image'), 'unknown');
  assert.equal(elementMode('<html><body>Access denied</body></html>', 'hero_image'), 'unknown');
});

test('tech tags are the warning signal, everything else is register', () => {
  const { register, tech } = countTags([
    { tags: ['clean', 'gsap', 'typography'] },
    { tags: ['clean', 'React Three Fiber', 'WebGL'] },
  ]);
  assert.deepEqual(register, [
    ['clean', 2],
    ['typography', 1],
  ]);
  assert.deepEqual(
    tech.map(([t]) => t),
    ['gsap', 'React Three Fiber', 'WebGL'],
  );
  assert.ok(TECH.test('vev') && !TECH.test('minimal'));
});
