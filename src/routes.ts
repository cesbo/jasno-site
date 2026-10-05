import { h } from '@jasno/core';
import { createRouter, route } from '@jasno/core/router';
import { docs } from './docs.ts';
import { keyOf } from './md.ts';
import DocView from './views/doc.ts';
import HomeView from './views/home.ts';

// Views are imported statically: the prerendered page is replaced in the same task the entry runs, without a flash.
// The diagnostics pages are the exception: their module outweighs the rest of the site, so it loads with the route.
export const router = createRouter([
  route('/', { view: async () => ({ default: HomeView }), title: 'jasno' }),
  route('/docs/diagnostics/:code', {
    loader: async ({ params }) => (await import('./diagnostics.ts')).diagnostics[params.code] ?? null,
    view: async () => ({ default: DocView }),
    title: (d) => d?.title ?? 'Page not found',
  }),
  route('/docs/:section/:slug?', {
    loader: async ({ params }) => docs[keyOf(params)] ?? null,
    view: async () => ({ default: DocView }),
    title: (d) => d?.title ?? 'Page not found',
  }),
], {
  error: (error, retry) => h.section(null, h.h1(null, 'Something went wrong'),
    h.p(null, error instanceof Error ? error.message : 'Unknown error'),
    h.button({ type: 'button', onclick: retry }, 'Try again')),
  notFound: () => h.h1(null, 'Page not found'),
});
