import { h } from '@jasno/core';
import { createRouter, route } from '@jasno/core/router';
import { docs } from './docs.ts';
import DocView from './views/doc.ts';
import HomeView from './views/home.ts';

// Views are imported statically: the prerendered page is replaced in the same task the entry runs, without a flash.
export const router = createRouter([
  route('/', { view: async () => ({ default: HomeView }), title: 'jasno' }),
  route('/docs/:slug', {
    loader: async ({ params }) => docs[params.slug] ?? null, // only for the title; the view reads docs itself
    view: async () => ({ default: DocView }),
    title: (d) => d?.title ?? 'Page not found',
  }),
], {
  error: (error, retry) => h.section(null, h.h1(null, 'Something went wrong'),
    h.p(null, error instanceof Error ? error.message : 'Unknown error'),
    h.button({ type: 'button', onclick: retry }, 'Try again')),
  notFound: () => h.h1(null, 'Page not found'),
});
