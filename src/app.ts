import { component, h } from '@jasno/core';
import { router } from './routes.ts';

export const App = component(function App(): Node {
  return h.div({ class: 'site' },
    h.header(null, h.nav({ 'aria-label': 'Main' },
      h.a({ href: router.href('/') }, 'jasno'),
      h.a({ href: router.href('/docs/:section/:slug?', { section: 'guide', slug: 'getting-started' }) }, 'Docs'),
      h.a({ href: 'https://github.com/cesbo/jasno' }, 'GitHub'))),
    h.main(null, router.outlet()));
});
