import { component, h, match } from '@jasno/core';
import type { ViewProps } from '@jasno/core/router';
import { docs } from '../docs.ts';
import { render, type Doc } from '../md.ts';
import { router } from '../routes.ts';

// Route '/docs/:slug': the page list, then the page. The view stays mounted between pages, so the article is per slug.
export default component(function DocView(p: ViewProps<'/docs/:slug', Doc | null>): Node {
  return h.div({ class: 'doc' },
    h.nav({ 'aria-label': 'Docs' }, h.ul(null, ...Object.entries(docs).map(([slug, d]) =>
      h.li(null, h.a({ href: router.href('/docs/:slug', { slug }), 'aria-current': () => (p.params().slug === slug ? 'page' : null) }, d.title))))),
    match(() => p.params().slug, (slug) => {
      const d = docs[slug];
      return h.article(null, ...(d ? render(d.nodes) : [h.h1(null, 'Page not found')]));
    }),
  );
});
