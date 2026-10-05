import { component, h } from '@jasno/core';
import { docs } from './docs.ts';
import { router } from './routes.ts';

const firstDoc = Object.keys(docs)[0] ?? '';

export const App = component(function App(): Node {
  return h.div({ class: 'site' },
    h.header(null, h.nav({ 'aria-label': 'Main' },
      h.a({ href: router.href('/') }, 'jasno'),
      h.a({ href: router.href('/docs/:slug', { slug: firstDoc }) }, 'Docs'),
      h.a({ href: 'https://github.com/cesbo/jasno' }, 'GitHub'))),
    h.main(null, router.outlet()));
});
