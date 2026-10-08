import { component, h } from '@jasno/core';
import type { LayoutProps } from '@jasno/core/router';
import { DocNav } from '../components/doc-nav.ts';
import { router } from '../routes.ts';

/** The key of the docs page on screen: "section/slug" or "section". */
const docKey = (): string => router.url().pathname.replace(/^\/docs\/|\/$/g, '');

// The docs routes name this layout, so it stays from page to page: the page list keeps its scroll, and only the page
// (DocView) is built again. From md up the list is a full-height column stuck below the 3.5rem header; the grid is never
// shorter than the column, so the column never slides under the header at the end of a page. On a phone it is in the
// page's menu.
export default component(function DocsLayout(p: LayoutProps): Node {
  return h.div({ class: 'md:grid md:min-h-[calc(100vh-3.5rem)] md:grid-cols-[15rem_minmax(0,1fr)]' },
    h.div({ class: 'hidden self-start border-r border-neutral-200 py-8 pr-6 text-sm md:sticky md:top-14 md:block md:h-[calc(100vh-3.5rem)] md:overflow-y-auto dark:border-neutral-800' },
      DocNav({ current: docKey })),
    h.div({ class: 'min-w-0' }, p.view));
});
