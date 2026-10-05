import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mountTest, settled } from '@jasno/core/testing';
import { App } from './app.ts';
import { router } from './routes.ts';

test('the landing renders; a doc page renders its markdown and focuses its heading', async (t) => {
  history.replaceState(null, '', '/');
  const view = mountTest(t, () => App());
  await settled();
  assert.equal(view.root.querySelector('h1')?.textContent, 'jasno');
  await router.navigate('/docs/getting-started');
  const h1 = view.root.querySelector('article h1');
  assert.equal(h1?.textContent, 'Getting started');
  assert.ok(document.activeElement === h1, 'the router focuses the new page heading'); // compare nodes with ===
  assert.equal(document.title, 'Getting started');
  assert.equal(h1?.id, 'getting-started');
  assert.match(view.root.querySelector('article pre code')?.textContent ?? '', /npm create @jasno/);
  assert.equal(view.root.querySelector('article table th')?.textContent, 'Command');
  assert.equal(view.root.querySelector('nav[aria-label="Docs"] a[aria-current="page"]')?.textContent, 'Getting started');
});

test('an unknown doc slug renders not found', async (t) => {
  history.replaceState(null, '', '/docs/nope');
  const view = mountTest(t, () => App());
  await settled();
  assert.equal(view.root.querySelector('h1')?.textContent, 'Page not found');
  assert.equal(document.title, 'Page not found');
});

test('a doc URL with a trailing slash (a static host directory redirect) still matches', async (t) => {
  history.replaceState(null, '', '/docs/guide/');
  const view = mountTest(t, () => App());
  await settled();
  assert.equal(view.root.querySelector('h1')?.textContent, 'Agent guide');
});
