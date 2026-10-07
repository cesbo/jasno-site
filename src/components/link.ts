import { component, h, type MaybeRead, type Read } from '@jasno/core';

// Tailwind finds a class by reading the source text: write each name in full.
const kinds = {
  brand: 'text-lg font-bold tracking-tight text-sky-700 dark:text-sky-400',
  nav: 'text-neutral-600 hover:text-neutral-900 aria-[current]:font-medium aria-[current]:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 dark:aria-[current]:text-neutral-100',
  primary: 'rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 dark:bg-sky-400 dark:text-neutral-950 dark:hover:bg-sky-300',
  secondary: 'rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800',
  card: 'rounded-lg border border-neutral-200 px-4 py-3 text-sm font-medium text-sky-700 hover:border-sky-700 dark:border-neutral-800 dark:text-sky-400 dark:hover:border-sky-400',
  side: '-ml-px block border-l border-transparent py-1 pl-4 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 aria-[current]:border-sky-700 aria-[current]:font-medium aria-[current]:text-sky-700 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-neutral-100 dark:aria-[current]:border-sky-400 dark:aria-[current]:text-sky-400',
};

export interface LinkProps {
  href: MaybeRead<string>;
  label: MaybeRead<string>;
  /** The look: a header link, the logo, a filled or an outlined button, a pager card, or an entry of a side list. */
  kind: keyof typeof kinds;
  /** Layout of the parent (ml-auto, col-start-2), not look. */
  class?: string | undefined;
  /** aria-current: 'page' on the page the link leads to, 'true' on a page below it (a section link), else null. */
  current?: Read<'page' | 'true' | null> | undefined;
}

export const Link = component(function Link(p: LinkProps): Node {
  return h.a({
    href: p.href,
    class: p.class ? `${kinds[p.kind]} ${p.class}` : kinds[p.kind],
    'aria-current': p.current,
  }, p.label);
});
