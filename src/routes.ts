import { h } from '@jasno/core';
import { createRouter, route } from '@jasno/core/router';
import { keyOf, type Doc } from './md.ts';
import DocView from './views/doc.ts';
import HomeView from './views/home.ts';

/** A page's content. The prerender embeds it in the page's own HTML as a JSON data block, so a direct load reads it from
 *  there; after a client-side navigation it is fetched as /docs/<key>.json. */
async function loadDoc(key: string, abortSignal: AbortSignal): Promise<Doc | null> {
  const embedded = document.getElementById('doc');
  if (embedded instanceof HTMLScriptElement && embedded.dataset['key'] === key) return JSON.parse(embedded.textContent) as Doc;
  const res = await fetch(`/docs/${key}.json`, { signal: abortSignal });
  return res.ok ? ((await res.json()) as Doc) : null;
}

// Views are imported statically: the prerendered page is replaced in the same task the entry runs, without a flash.
export const router = createRouter([
  route('/', { view: async () => ({ default: HomeView }), title: 'jasno' }),
  route('/docs/:section/:slug?', {
    loader: ({ params, abortSignal }) => loadDoc(keyOf(params), abortSignal),
    view: async () => ({ default: DocView }),
    title: (d) => d?.title ?? 'Page not found',
  }),
], {
  error: (error, retry) => h.section({ class: 'py-16' }, h.h1({ class: 'text-3xl font-bold' }, 'Something went wrong'),
    h.p({ class: 'mt-4' }, error instanceof Error ? error.message : 'Unknown error'),
    h.button({ type: 'button', class: 'mt-4', onclick: retry }, 'Try again')),
  notFound: () => h.h1({ class: 'py-16 text-3xl font-bold' }, 'Page not found'),
});

/** The URL of a docs page from its key: "section/slug", or "section" for a section's own page (the inverse of keyOf). */
export const docHref = (key: string): string => {
  const [section = '', slug] = key.split('/');
  return router.href('/docs/:section/:slug?', slug ? { section, slug } : { section });
};
