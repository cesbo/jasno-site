import { component, h, signal } from '@jasno/core';
import { router } from '../routes.ts';

// The README example, live: the site runs on jasno.
const Counter = component(function Counter(): Node {
  const count = signal(0);
  return h.button(
    {
      type: 'button',
      onclick: () => count.update((n) => n + 1),
    },
    'Clicked ', count, ' times',
  );
});

export default component(function HomeView(): Node {
  return h.section({ class: 'home' },
    h.h1(null, 'jasno'),
    h.p({ class: 'tagline' }, 'A TypeScript-first framework for single-page apps. Plain TypeScript: no JSX, no template language, no build configuration.'),
    h.pre(null, h.code(null, 'npm create @jasno my-app\ncd my-app\nnpm install\nnpm run dev')),
    h.p(null, 'Views are function calls that TypeScript checks like any other code:'),
    h.pre(null, h.code(null, [
      'const Counter = component(function Counter(): Node {',
      '  const count = signal(0);',
      '  return h.button(',
      '    {',
      "      type: 'button',",
      '      onclick: () => count.update((n) => n + 1),',
      '    },',
      "    'Clicked ', count, ' times',",
      '  );',
      '});',
    ].join('\n'))),
    h.p(null, Counter()),
    h.p(null,
      h.a({ href: router.href('/docs/:section/:slug?', { section: 'guide', slug: 'getting-started' }) }, 'Get started'), ' · ',
      h.a({ href: router.href('/docs/:section/:slug?', { section: 'guide', slug: 'why' }) }, 'Why another framework?'), ' · ',
      h.a({ href: 'https://github.com/cesbo/jasno' }, 'Source on GitHub')),
    h.p(null, 'Coding agents: ', h.a({ href: '/llms.txt' }, 'llms.txt'), ' and the AGENTS.md that every new project gets.'),
  );
});
