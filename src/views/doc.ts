import { component, h, match, untracked, type Read } from '@jasno/core';
import { docs } from '../docs.ts';
import { render, type Doc } from '../md.ts';
import { router } from '../routes.ts';

const hrefOf = (key: string): string => {
  const [section = '', slug] = key.split('/');
  return router.href('/docs/:section/:slug?', slug ? { section, slug } : { section });
};

/** Pages in reading order, grouped by section; generated reference pages are reached from their catalogue instead. */
const listed = Object.entries(docs).filter(([, d]) => d.nav);
const sections = Map.groupBy(listed, ([, d]) => d.sectionTitle);

// Both docs routes render this view with the page as loader data: the page list, the page, its table of contents.
// The view stays mounted between pages, so everything but the list is per URL.
export default component(function DocView(p: { readonly data: Read<Doc | null> }): Node {
  const current = (): string => router.url().pathname.replace(/^\/docs\/|\/$/g, '');
  return h.div({ class: 'doc' },
    h.nav({ 'aria-label': 'Docs' }, h.ul(null, ...[...sections].map(([title, pages]) =>
      h.li(null, title, h.ul(null, ...pages.map(([key, d]) =>
        h.li(null, h.a({ href: hrefOf(key), 'aria-current': () => (current() === key ? 'page' : null) }, d.title)))))))),
    match(current, (key) => {
      const d = untracked(p.data); // resolved before the view renders, replaced together with the URL
      if (!d) return h.article(null, h.h1(null, 'Page not found'));
      const i = listed.findIndex(([k]) => k === key);
      const prev = i > 0 ? listed[i - 1] : undefined;
      const next = i >= 0 ? listed[i + 1] : undefined;
      return [
        h.article(null, ...render(d.nodes),
          (prev || next) && h.nav({ 'aria-label': 'Pages', class: 'pager' },
            prev && h.a({ href: hrefOf(prev[0]) }, `Previous: ${prev[1].title}`),
            next && h.a({ href: hrefOf(next[0]), class: 'next' }, `Next: ${next[1].title}`))),
        d.toc.length > 1 && h.nav({ 'aria-label': 'On this page', class: 'toc' },
          h.ul(null, ...d.toc.map((t) => h.li(null, h.a({ href: `#${t.id}` }, t.text))))),
      ];
    }),
  );
});
