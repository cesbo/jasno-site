import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mountTest, settled } from '@jasno/core/testing';
import { App } from './app.ts';
import { router } from './routes.ts';

test('the landing renders; a doc page renders its markdown, navigation and table of contents, and focuses its heading', async (t) => {
  history.replaceState(null, '', '/');
  const view = mountTest(t, () => App());
  await settled();
  assert.equal(view.root.querySelector('h1')?.textContent, 'jasno');
  await router.navigate('/docs/guide/getting-started');
  const h1 = view.root.querySelector('article h1');
  assert.equal(h1?.textContent, 'Getting started');
  assert.ok(document.activeElement === h1, 'the router focuses the new page heading'); // compare nodes with ===
  assert.equal(document.title, 'Getting started');
  assert.equal(h1?.id, 'getting-started');
  assert.match(view.root.querySelector('article pre code')?.textContent ?? '', /npm create @jasno/);
  assert.equal(view.root.querySelector('article table th')?.textContent, 'Command');
  const nav = view.root.querySelector('nav[aria-label="Docs"]');
  assert.equal(nav?.querySelector('a[aria-current="page"]')?.textContent, 'Getting started');
  assert.match(nav?.querySelector('li')?.firstChild?.textContent ?? '', /^Guide$/, 'pages are grouped by section');
  assert.equal(view.root.querySelector('nav[aria-label="On this page"] a')?.getAttribute('href'), '#install');
  assert.equal(view.root.querySelector('.pager a')?.textContent, 'Next: Why another framework');
  await router.navigate('/docs/guide/why'); // same route, the view stays mounted: the article follows the loader data
  assert.equal(view.root.querySelector('article h1')?.textContent, 'Why another framework');
  assert.equal(document.title, 'Why another framework');
  assert.equal(view.root.querySelector('.pager a')?.textContent, 'Previous: Getting started');
});

test('an unknown doc page renders not found', async (t) => {
  history.replaceState(null, '', '/docs/guide/nope');
  const view = mountTest(t, () => App());
  await settled();
  assert.equal(view.root.querySelector('h1')?.textContent, 'Page not found');
  assert.equal(document.title, 'Page not found');
});

test('a doc URL with a trailing slash (a static host directory redirect) still matches', async (t) => {
  history.replaceState(null, '', '/docs/guide/why/');
  const view = mountTest(t, () => App());
  await settled();
  assert.equal(view.root.querySelector('h1')?.textContent, 'Why another framework');
});

test('diagnostics pages come from the guides @jasno/core ships', async (t) => {
  history.replaceState(null, '', '/docs/diagnostics');
  const view = mountTest(t, () => App());
  await settled();
  assert.equal(view.root.querySelector('article h1')?.textContent, 'Diagnostics');
  assert.ok(view.root.querySelector('article a[href="/docs/diagnostics/FOCUS_LOST"]'), 'the catalogue links every code');
  await router.navigate('/docs/diagnostics/FOCUS_LOST');
  assert.equal(view.root.querySelector('article h1')?.textContent, 'FOCUS_LOST');
  assert.ok(view.root.querySelector('article h2#fix'));
  assert.equal(view.root.querySelector('article h2#fixture'), null, 'the Fixture section names jasno-internal tests');
  assert.equal(view.root.querySelector('nav[aria-label="Docs"] a[aria-current="page"]'), null, 'generated pages are not in the navigation');
});
