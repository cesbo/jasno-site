import { component, h, match, untracked, type Read } from '@jasno/core';
import { pages } from '../docs.ts';
import { render, type Doc } from '../md.ts';
import { router } from '../routes.ts';

const hrefOf = (key: string): string => {
  const [section = '', slug] = key.split('/');
  return router.href('/docs/:section/:slug?', slug ? { section, slug } : { section });
};

/** Pages in reading order, grouped by section; generated reference pages are reached from their catalogue instead. */
const sections = Map.groupBy(pages, (e) => e.sectionTitle);

// Route '/docs/:section/:slug?' renders this view with the page as loader data: the page list, the page, its table of
// contents. The view stays mounted between pages, so everything but the list is per URL.
export default component(function DocView(p: { readonly data: Read<Doc | null> }): Node {
  const current = (): string => router.url().pathname.replace(/^\/docs\/|\/$/g, '');
  return h.div({ class: 'doc' },
    h.nav({ 'aria-label': 'Docs' }, h.ul(null, ...[...sections].map(([title, entries]) =>
      h.li(null, title, h.ul(null, ...entries.map((e) =>
        h.li(null, h.a({ href: hrefOf(e.key), 'aria-current': () => (current() === e.key ? 'page' : null) }, e.title)))))))),
    match(current, (key) => {
      const d = untracked(p.data); // resolved before the view renders, replaced together with the URL
      if (!d) return h.article(null, h.h1(null, 'Page not found'));
      const i = pages.findIndex((e) => e.key === key);
      const prev = i > 0 ? pages[i - 1] : undefined;
      const next = i >= 0 ? pages[i + 1] : undefined;
      return [
        h.article(null, ...render(d.nodes),
          (prev || next) && h.nav({ 'aria-label': 'Pages', class: 'pager' },
            prev && h.a({ href: hrefOf(prev.key) }, `Previous: ${prev.title}`),
            next && h.a({ href: hrefOf(next.key), class: 'next' }, `Next: ${next.title}`))),
        d.toc.length > 1 && h.nav({ 'aria-label': 'On this page', class: 'toc' },
          h.ul(null, ...d.toc.map((t) => h.li(null, h.a({ href: `#${t.id}` }, t.text))))),
      ];
    }),
  );
});
