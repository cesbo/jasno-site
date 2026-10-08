import { component, h } from '@jasno/core';
import type { ViewProps } from '@jasno/core/router';
import { MobileMenu } from '../components/mobile-menu.ts';
import { Pager } from '../components/pager.ts';
import { Toc } from '../components/toc.ts';
import { pages } from '../docs.ts';
import { keyOf, render, type Doc } from '../md.ts';

const prose = 'prose max-w-none pt-8 pb-16 dark:prose-invert md:pl-10 xl:pr-10';

// Route '/docs/:section/:slug?' renders one page with the page as loader data: the article, its table of contents and
// the phone menu. A new page is a new view; the page list beside it is App's. From xl up the table of contents is a
// column stuck below the 3.5rem header (h-14 in app.ts).
export default component(function DocView(p: ViewProps<'/docs/:section/:slug?', Doc | null>): Node {
  const key = keyOf(p.params());
  const d = p.data();
  const label = [pages.find((e) => e.key === key)?.sectionTitle, d?.title].filter(Boolean).join(' › ');
  const menu = MobileMenu({ label: () => label, current: () => key, toc: () => d?.toc ?? [] });
  if (!d) return h.div(null, menu, h.article({ class: prose }, h.h1(null, 'Page not found')));
  const i = pages.findIndex((e) => e.key === key);
  const prev = i > 0 ? pages[i - 1] : undefined;
  const next = i >= 0 ? pages[i + 1] : undefined;
  return h.div(null, menu,
    h.div({ class: 'xl:grid xl:grid-cols-[minmax(0,1fr)_12rem]' },
      h.article({ class: prose }, ...render(d.nodes), (prev || next) && Pager({ prev, next })),
      d.toc.length > 1 && h.div({ class: 'hidden self-start text-sm xl:sticky xl:top-14 xl:block xl:h-[calc(100vh-3.5rem)] xl:overflow-y-auto xl:py-8' },
        Toc({ items: () => d.toc }))));
});
