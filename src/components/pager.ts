import { component, h } from '@jasno/core';
import type { PageEntry } from '../md.ts';
import { docHref } from '../routes.ts';
import { Link } from './link.ts';

export interface PagerProps {
  // Plain entries: the page is the key of its view, so its neighbours are fixed for the life of the pager.
  prev?: PageEntry | undefined;
  next?: PageEntry | undefined;
}

/** Links to the pages before and after, at the end of an article; the caller renders it only when there is one. */
export const Pager = component(function Pager(p: PagerProps): Node {
  const { prev, next } = p;
  return h.nav({ 'aria-label': 'Pages', class: 'pager not-prose mt-12 grid grid-cols-2 gap-4' },
    prev && Link({ kind: 'card', href: docHref(prev.key), label: `Previous: ${prev.title}` }),
    next && Link({ kind: 'card', href: docHref(next.key), label: `Next: ${next.title}`, class: 'col-start-2 text-right' }));
});
