// docs/<NN-section>/<NN-page>.md → src/docs.ts (one static module: every page is in the entry chunk, so a prerendered
// page never flashes while a view chunk loads), public/docs/<section>/<page>.md (the sources, for agents),
// public/llms.txt, and src/docs-samples/*.ts: every ```ts block of a page as a module that jasno check type-checks.
// Diagnostics pages are generated from the guides @jasno/core ships in errors/.
// The browser gets nodes, not HTML: the production CSP blocks innerHTML, so markdown is parsed here, once.
import { marked } from 'marked';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ORIGIN = 'https://jasno.dev';
const TAGLINE = 'A TypeScript-first framework for single-page apps. Plain TypeScript: no JSX, no template language, no build configuration.';
const SECTION_TITLES = { api: 'API', cli: 'CLI' };
const ERRORS_DIR = 'node_modules/@jasno/core/errors';
// Every sample starts with these imports (TypeScript ignores what a block does not use), unless the block imports the module itself.
const PRELUDE = [
  ['@jasno/core', "import { bindChecked, bindNumber, bindValue, catchError, component, computed, createContext, createRoot, css, each, effect, flush, h, linkedSignal, match, mount, onMount, provide, resource, selector, show, signal, svg, untracked, useContext, type Child, type MaybeRead, type Read, type Resource, type Signal, type WritableSignal } from '@jasno/core';"],
  ['@jasno/core/router', "import { createRouter, route, type Params, type ViewProps } from '@jasno/core/router';"],
];

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" };
const decode = (s) => s.replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ENTITIES[e]);
const plain = (tokens) => tokens.map((t) => (t.tokens ? plain(t.tokens) : t.text ?? '')).join('');
const anchor = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const stripOrder = (name) => name.replace(/^\d+-/, '');
const titleOf = (section) => SECTION_TITLES[section] ?? section[0].toUpperCase() + section.slice(1);
const excerpt = (s) => (s.length > 160 ? s.slice(0, 157).replace(/\s+\S*$/, '') + '…' : s);

/** marked tokens → nodes: a string, or [tag, props, children]. */
const conv = (tokens) => tokens.flatMap(node);
function node(t) {
  switch (t.type) {
    case 'space': case 'html': case 'def': return [];
    case 'text': return t.tokens ? conv(t.tokens) : [decode(t.text)];
    case 'escape': return [t.text];
    case 'heading': return [[`h${t.depth}`, { id: anchor(plain(t.tokens)) }, conv(t.tokens)]];
    case 'paragraph': return [['p', null, conv(t.tokens)]];
    case 'code': return [['pre', null, [['code', t.lang ? { class: `language-${t.lang.split(' ')[0]}` } : null, [t.text]]]]];
    case 'codespan': return [['code', null, [t.text]]];
    case 'blockquote': return [['blockquote', null, conv(t.tokens)]];
    case 'list': return [[t.ordered ? 'ol' : 'ul', t.ordered && t.start !== 1 ? { start: t.start } : null,
      t.items.map((i) => ['li', null, conv(i.tokens)])]];
    case 'hr': case 'br': return [[t.type, null, []]];
    case 'strong': case 'em': case 'del': return [[t.type, null, conv(t.tokens)]];
    case 'link': return [['a', { href: t.href }, conv(t.tokens)]];
    case 'image': return [['img', { src: t.href, alt: t.text }, []]];
    case 'table': return [['table', null, [
      ['thead', null, [['tr', null, t.header.map((c) => ['th', null, conv(c.tokens)])]]],
      ['tbody', null, t.rows.map((r) => ['tr', null, r.map((c) => ['td', null, conv(c.tokens)])])],
    ]]];
    default: throw new Error(`build-docs: unhandled markdown token "${t.type}"`);
  }
}

/** A page: title and description from the first h1 and paragraph, the h2 list as its table of contents. */
function page(md, section, slug, nav) {
  const tokens = marked.lexer(md);
  const h1 = tokens.find((t) => t.type === 'heading' && t.depth === 1);
  if (!h1) throw new Error(`build-docs: ${section}/${slug} has no "# Title"`);
  const first = tokens.find((t) => t.type === 'paragraph');
  const toc = tokens.filter((t) => t.type === 'heading' && t.depth === 2).map((t) => { const text = plain(t.tokens); return { id: anchor(text), text }; });
  return { title: plain(h1.tokens), description: first ? excerpt(decode(plain(first.tokens))) : '', section, sectionTitle: titleOf(section), nav, toc, nodes: conv(tokens) };
}

/** The ```ts blocks of a page as src/docs-samples/<name>-<n>.ts (```ts fragment is skipped). A <!-- ts: ... --> comment
 *  right before a block adds the declarations it relies on. */
function samples(md, file, name) {
  let n = 0;
  let declared = '';
  for (const t of marked.lexer(md)) {
    if (t.type === 'space') continue;
    const comment = t.type === 'html' && /^<!--\s*ts:\s*([\s\S]*?)-->$/.exec(t.text.trim());
    if (comment) { declared = comment[1].trim(); continue; }
    if (t.type === 'code' && t.lang === 'ts') {
      const prelude = PRELUDE.filter(([mod]) => !t.text.includes(`'${mod}'`)).map(([, line]) => line);
      writeFileSync(`src/docs-samples/${name}-${++n}.ts`,
        `// Generated by scripts/build-docs.mjs from ${file}, block ${n}; do not edit.\n${[...prelude, declared].filter(Boolean).join('\n')}\n\n${t.text}\n`);
    }
    declared = ''; // a declaration comment applies to the block right after it only
  }
}

/** One page per guide in @jasno/core's errors/ (without its Fixture section, which names jasno's own tests) and a catalogue.
 *  The code pages go to their own module, loaded only on those pages: together they outweigh the rest of the site. */
function diagnostics(docs) {
  const pages = {};
  if (!existsSync(ERRORS_DIR)) { console.warn(`build-docs: no ${ERRORS_DIR}; diagnostics pages skipped`); return { pages }; }
  const codes = [];
  for (const f of readdirSync(ERRORS_DIR).filter((f) => f.endsWith('.md')).sort()) {
    const code = f.slice(0, -3);
    const md = readFileSync(join(ERRORS_DIR, f), 'utf8').replace(/\n## Fixture\n[\s\S]*?(?=\n## |$)/, '\n');
    const m = /^\*\*(\w+)\*\*, ([^:]+):\s*(.*)$/m.exec(md);
    codes.push({ code, severity: m?.[1] ?? '', where: m?.[2] ?? 'other', summary: m?.[3] ?? '' });
    pages[code] = page(md, 'diagnostics', code, false);
  }
  const groups = Map.groupBy(codes, (c) => c.where);
  const catalogue = `# Diagnostics

Every code jasno can report, with what it means and how to fix it. In development the message carries the code, and \`npm run explain CODE\` prints the same guide in the terminal.

${[...groups].map(([where, list]) => `## ${where[0].toUpperCase()}${where.slice(1)}

${list.map((c) => `- [\`${c.code}\`](/docs/diagnostics/${c.code}), ${c.severity}: ${c.summary}`).join('\n')}`).join('\n\n')}
`;
  docs.diagnostics = page(catalogue, 'diagnostics', '', true);
  return { catalogue, pages };
}

const docs = {};
rmSync('public/docs', { recursive: true, force: true }); // a deleted page leaves no stale copy behind
rmSync('src/docs-samples', { recursive: true, force: true });
mkdirSync('src/docs-samples', { recursive: true });
for (const dir of readdirSync('docs', { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
  const section = stripOrder(dir);
  mkdirSync(`public/docs/${section}`, { recursive: true });
  for (const f of readdirSync(`docs/${dir}`).filter((f) => f.endsWith('.md')).sort()) {
    const slug = stripOrder(f.slice(0, -3));
    const md = readFileSync(`docs/${dir}/${f}`, 'utf8');
    docs[`${section}/${slug}`] = page(md, section, slug, true);
    samples(md, `docs/${dir}/${f}`, `${section}-${slug}`);
    writeFileSync(`public/docs/${section}/${slug}.md`, md);
  }
}
const { catalogue, pages } = diagnostics(docs);
if (catalogue) writeFileSync('public/docs/diagnostics.md', catalogue);

writeFileSync('src/docs.ts', `// Generated by scripts/build-docs.mjs from docs/; do not edit.
import type { Doc } from './md.ts';

export const docs: Readonly<Record<string, Doc>> = ${JSON.stringify(docs)};
`);
writeFileSync('src/diagnostics.ts', `// Generated by scripts/build-docs.mjs from @jasno/core's errors/; do not edit. Loaded only on /docs/diagnostics/:code.
import type { Doc } from './md.ts';

export const diagnostics: Readonly<Record<string, Doc>> = ${JSON.stringify(pages)};
`);
const listed = Object.entries(docs).filter(([, d]) => d.nav);
writeFileSync('public/llms.txt', `# jasno

> ${TAGLINE}

## Docs

${listed.map(([key, d]) => `- [${d.title}](${ORIGIN}/docs/${key}.md)`).join('\n')}

## API

- [AGENTS.md](https://raw.githubusercontent.com/cesbo/jasno/HEAD/design/AGENTS.md): the guide for coding agents, copied into every new project
- [jasno.d.ts](https://raw.githubusercontent.com/cesbo/jasno/HEAD/design/jasno.d.ts): the whole API with a RECIPES block of common patterns
`);
const n = readdirSync('src/docs-samples').length;
console.log(`build-docs: ${listed.length} pages, ${Object.keys(pages).length} diagnostics, ${n} samples → src/docs.ts, src/diagnostics.ts, src/docs-samples/, public/docs/, public/llms.txt`);
