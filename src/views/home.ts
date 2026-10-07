import { component, h, signal } from '@jasno/core';
import { Link } from '../components/link.ts';
import { docHref } from '../routes.ts';

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
  return h.section({ class: 'max-w-3xl py-16' },
    h.h1({ class: 'text-5xl font-bold tracking-tight text-sky-700 dark:text-sky-400' }, 'jasno'),
    h.p({ class: 'mt-6 text-xl text-neutral-700 dark:text-neutral-300' }, 'A TypeScript-first framework for single-page apps. Plain TypeScript: no JSX, no template language, no build configuration.'),
    h.p({ class: 'mt-4 text-neutral-600 dark:text-neutral-400' }, 'Made for coding agents: the whole API is one file, and mistakes become type errors or diagnostics with the fix in the message.'),
    h.div({ class: 'mt-8 flex flex-wrap gap-3' },
      Link({ kind: 'primary', href: docHref('guide/getting-started'), label: 'Get started' }),
      Link({ kind: 'secondary', href: docHref('guide/why'), label: 'Why another framework?' }),
      Link({ kind: 'secondary', href: 'https://github.com/cesbo/jasno', label: 'Source on GitHub' })),
    h.div({ class: 'prose mt-12 max-w-none dark:prose-invert' },
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
      h.p(null, 'Coding agents: ', h.a({ href: '/llms.txt' }, 'llms.txt'), ' and the AGENTS.md that every new project gets.')),
  );
});
