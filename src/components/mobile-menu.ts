import { component, h, onMount, show, type Read } from '@jasno/core';
import type { Doc } from '../md.ts';
import { DocNav } from './doc-nav.ts';
import { Toc } from './toc.ts';

export interface MobileMenuProps {
  /** What the bar says about the page on screen: its section and title. */
  label: Read<string>;
  /** The key of the page on screen. */
  current: Read<string>;
  toc: Read<Doc['toc']>;
}

/** Below md: a bar under the 3.5rem header that names the page on screen. A tap opens the table of contents and the
 *  page list in a full-screen dialog (the native one: Escape, focus trap and focus return come with it). */
export const MobileMenu = component(function MobileMenu(p: MobileMenuProps): Node {
  const dialog = h.dialog({
    'aria-label': 'Menu',
    class: 'fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-y-auto overscroll-contain bg-white p-4 pt-0 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100',
    // A followed link closes the menu first, so the focus is on the bar before the router moves it to the heading.
    onclick: (e) => { if (e.target instanceof Element && e.target.closest('a')) { e.currentTarget.close(); bar.focus(); } },
    // Escape and Close. close() returns the focus only to what had it when the menu opened, and Safari does not focus a
    // button on a tap: then the focus stays on the hidden dialog (FOCUS_LOST) or falls to <body>. Hand it to the bar.
    onclose: (e) => {
      const a = document.activeElement;
      if (!a || a === document.body || e.currentTarget.contains(a)) bar.focus();
    },
  },
    h.form({ method: 'dialog', class: 'sticky top-0 -mx-4 mb-6 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950' },
      h.span({ class: 'font-semibold' }, 'Menu'), h.button(null, 'Close')),
    h.div({ class: 'space-y-6 pb-8 [&_a]:py-2', },
      show(() => p.toc().length > 1, () => Toc({ items: p.toc })),
      DocNav({ current: p.current })));
  const bar = h.button({
    type: 'button',
    'aria-haspopup': 'dialog',
    class: 'flex w-full items-center gap-3 rounded-none border-0 px-4 py-3 text-left hover:bg-transparent dark:hover:bg-transparent',
    onclick: () => dialog.showModal(),
  }, h.span({ class: 'font-medium' }, 'Menu'), h.span({ class: 'min-w-0 truncate text-neutral-500 dark:text-neutral-400' }, p.label));
  // The bar is hidden from md up. A dialog left open there would keep the page behind it inert.
  onMount(({ abortSignal }) => {
    window.matchMedia('(min-width: 48rem)').addEventListener('change', (e) => { if (e.matches) dialog.close(); }, { signal: abortSignal });
  });
  return h.div({ class: 'sticky top-14 z-[9] -mx-4 border-b border-neutral-200 bg-white md:hidden dark:border-neutral-800 dark:bg-neutral-950' },
    bar,
    dialog);
});
