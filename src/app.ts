import { component, h } from '@jasno/core';
import { Link } from './components/link.ts';
import { docHref, router } from './routes.ts';

export const App = component(function App(): Node {
  return h.div(null,
    h.header({ class: 'sticky top-0 z-10 h-14 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80' },
      h.nav({ 'aria-label': 'Main', class: 'mx-auto flex h-full max-w-7xl items-center gap-6 px-4 text-sm' },
        Link({ kind: 'brand', href: router.href('/'), label: 'jasno' }),
        Link({ kind: 'nav', href: docHref('guide/getting-started'), label: 'Docs',
          current: () => (router.url().pathname.startsWith('/docs/') ? 'true' : null) }),
        Link({ kind: 'nav', href: 'https://github.com/cesbo/jasno', label: 'GitHub', class: 'ml-auto' }))),
    h.main({ class: 'mx-auto max-w-7xl px-4' }, router.outlet()));
});
