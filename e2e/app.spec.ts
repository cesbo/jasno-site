import { expect, test } from '@playwright/test';
import type {} from '@jasno/core'; // types for window.__JASNO__

// Every test fails on a page error or a jasno dev warning (FOCUS_LOST, VIEW_NO_HEADING, KEY_ACTIVATES_NEW_FOCUS, ...).
// The production build (JASNO_E2E=preview) has no window.__JASNO__, so there only page errors count.
const preview = process.env['JASNO_E2E'] === 'preview';
const errors: string[] = [];
test.beforeEach(({ page }) => {
  errors.length = 0;
  page.on('pageerror', (e) => errors.push(String(e)));
});
test.afterEach(async ({ page }) => {
  const warnings = await page.evaluate(() => window.__JASNO__?.diagnostics().map((d) => d.message) ?? null);
  if (!preview) expect(warnings, 'window.__JASNO__ exists under jasno dev').not.toBeNull();
  expect([...errors, ...(warnings ?? [])]).toEqual([]);
});

test('the landing shows its heading, title and a live counter', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'jasno' })).toBeVisible();
  await expect(page).toHaveTitle('jasno');
  const counter = page.getByRole('button', { name: /^Clicked \d+ times$/ });
  await counter.click();
  await expect(counter).toHaveText('Clicked 1 times');
});

test('the Docs link moves focus to the page heading', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Docs' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Getting started' })).toBeFocused();
  await expect(page).toHaveTitle('Getting started');
});

test('a doc URL opened directly renders the page', async ({ page }) => {
  await page.goto('/docs/guide/why');
  await expect(page.getByRole('heading', { level: 1, name: 'Why another framework' })).toBeVisible();
});

test('an unknown URL shows the not-found page', async ({ page }) => {
  await page.goto('/nope');
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
});

test('a table-of-contents link scrolls to its section', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 500 }); // the table of contents shows from 72rem
  await page.goto('/docs/guide/why');
  await page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: 'Where it cost' }).click();
  await expect(page).toHaveURL(/#where-it-cost$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Where it cost' })).toBeInViewport();
});
