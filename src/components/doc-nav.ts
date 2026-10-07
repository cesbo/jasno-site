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

/** The page list. The parent places it: a column from md up, the menu on a phone. */
export const DocNav = component(function DocNav(p: DocNavProps): Node {
  return h.nav({ 'aria-label': 'Docs' },
    h.ul(null, ...[...sections].map(([title, entries]) =>
      h.li({ class: 'mb-6' }, h.span({ class: 'font-semibold' }, title),
        h.ul({ class: 'mt-2 border-l border-neutral-200 dark:border-neutral-800' }, ...entries.map((e) =>
          h.li(null, Link({ kind: 'side', href: docHref(e.key), label: e.title, current: () => (p.current() === e.key ? 'page' : p.current().startsWith(`${e.key}/`) ? 'true' : null) }))))))));
});
