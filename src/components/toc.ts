import { component, each, h, type Read } from '@jasno/core';
import type { Doc } from '../md.ts';
import { Link } from './link.ts';

export interface TocProps {
  items: Read<Doc['toc']>;
}

/** The headings of the page: a full-height column below the 3.5rem header, from xl up. */
export const Toc = component(function Toc(p: TocProps): Node {
  return h.nav({ 'aria-label': 'On this page', class: 'hidden self-start text-sm xl:sticky xl:top-14 xl:block xl:h-[calc(100vh-3.5rem)] xl:overflow-y-auto xl:py-8' },
    h.p({ class: 'font-semibold' }, 'On this page'),
    h.ul({ class: 'mt-2 border-l border-neutral-200 dark:border-neutral-800' }, each(p.items, {
      key: (t) => t.id,
      render: (t) => h.li(null, Link({ kind: 'side', href: () => `#${t().id}`, label: () => t().text })),
    })));
});
