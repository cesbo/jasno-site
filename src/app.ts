import { component, computed, h, show } from '@jasno/core';
import { DocNav } from './components/doc-nav.ts';
import { Link } from './components/link.ts';
import { docHref, router } from './routes.ts';

const isDocs = computed(() => router.url().pathname.startsWith('/docs/'));
/** The key of the docs page on screen: "section/slug" or "section". */
const docKey = (): string => router.url().pathname.replace(/^\/docs\/|\/$/g, '');

export const App = component(function App(): Node {
  return h.div(null,
    h.header({ class: 'sticky top-0 z-10 h-14 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80' },
      h.nav({ 'aria-label': 'Main', class: 'mx-auto flex h-full max-w-7xl items-center gap-6 px-4 text-sm' },
        Link({ kind: 'brand', href: router.href('/'), label: 'jasno' }),
        Link({ kind: 'nav', href: docHref('guide/getting-started'), label: 'Docs',
          current: () => (router.url().pathname.startsWith('/docs/') ? 'true' : null) }),
        Link({ kind: 'nav', href: 'https://github.com/cesbo/jasno', label: 'GitHub', class: 'ml-auto' }))),
    // The page list outlives a docs page, so it is App's, beside the one outlet: it keeps its scroll from page to page.
    // From md up it is a full-height column stuck below the 3.5rem header; the grid is never shorter than the column,
    // so the column never slides under the header at the end of a page. On a phone it is in the page's menu.
    h.div({ class: () => (isDocs() ? 'mx-auto max-w-7xl px-4 md:grid md:min-h-[calc(100vh-3.5rem)] md:grid-cols-[15rem_minmax(0,1fr)]' : 'mx-auto max-w-7xl px-4') },
      show(isDocs, () => h.div({ class: 'hidden self-start border-r border-neutral-200 py-8 pr-6 text-sm md:sticky md:top-14 md:block md:h-[calc(100vh-3.5rem)] md:overflow-y-auto dark:border-neutral-800' },
        DocNav({ current: docKey }))),
      h.main({ class: 'min-w-0' }, router.outlet())));
});
