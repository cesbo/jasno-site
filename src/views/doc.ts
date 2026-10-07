import { component, h, match, untracked, type Read } from '@jasno/core';
import { DocNav } from '../components/doc-nav.ts';
import { Pager } from '../components/pager.ts';
import { Toc } from '../components/toc.ts';
import { pages } from '../docs.ts';
import { render, type Doc } from '../md.ts';
import { router } from '../routes.ts';

const prose = 'prose max-w-none pt-8 pb-16 dark:prose-invert md:pl-10 xl:pr-10';

// Route '/docs/:section/:slug?' renders this view with the page as loader data: the page list, the page, its table of
// contents. The view stays mounted between pages, so everything but the list is per URL.
export default component(function DocView(p: { readonly data: Read<Doc | null> }): Node {
  const path = (): string => router.url().pathname.replace(/^\/docs\/|\/$/g, '');
  // The page list and the table of contents are full-height columns stuck below the 3.5rem header (h-14 in app.ts) and
  // level with the bottom of the window; the grid is never shorter than a column, so a column never slides under the
  // header at the end of the page.
  return h.div({ class: 'grid min-h-[calc(100vh-3.5rem)] md:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_12rem]' },
    DocNav({ current: path }),
    match(path, (key) => {
      const d = untracked(p.data); // resolved before the view renders, replaced together with the URL
      if (!d) return h.article({ class: prose }, h.h1(null, 'Page not found'));
      const i = pages.findIndex((e) => e.key === key);
      const prev = i > 0 ? pages[i - 1] : undefined;
      const next = i >= 0 ? pages[i + 1] : undefined;
      return [
        h.article({ class: prose }, ...render(d.nodes), (prev || next) && Pager({ prev, next })),
        d.toc.length > 1 && Toc({ items: () => d.toc }),
      ];
    }),
  );
});
