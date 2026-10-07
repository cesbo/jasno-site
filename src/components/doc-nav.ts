import { component, h, type Read } from '@jasno/core';
import { pages } from '../docs.ts';
import { docHref } from '../routes.ts';
import { Link } from './link.ts';

/** Pages in reading order, grouped by section; generated reference pages are reached from their catalogue instead. */
const sections = Map.groupBy(pages, (e) => e.sectionTitle);

export interface DocNavProps {
  /** The key of the page on screen. */
  current: Read<string>;
}

/** The page list: a full-height column below the 3.5rem header (md and up), the top of the page on a phone. */
export const DocNav = component(function DocNav(p: DocNavProps): Node {
  return h.nav({ 'aria-label': 'Docs', class: 'border-b border-neutral-200 py-4 text-sm md:sticky md:top-14 md:h-[calc(100vh-3.5rem)] md:self-start md:overflow-y-auto md:border-r md:border-b-0 md:py-8 md:pr-6 dark:border-neutral-800' },
    h.ul({ class: 'columns-2 gap-x-4 md:columns-1' }, ...[...sections].map(([title, entries]) =>
      h.li({ class: 'mb-6 break-inside-avoid' }, h.span({ class: 'font-semibold' }, title),
        h.ul({ class: 'mt-2 border-l border-neutral-200 dark:border-neutral-800' }, ...entries.map((e) =>
          h.li(null, Link({ kind: 'side', href: docHref(e.key), label: e.title, current: () => (p.current() === e.key ? 'page' : p.current().startsWith(`${e.key}/`) ? 'true' : null) }))))))));
});
