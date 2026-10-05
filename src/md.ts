import { h, type Child } from '@jasno/core';

/** One markdown node as scripts/build-docs.mjs emits it: text, or [tag, props, children]. */
export type MdNode = string | readonly [tag: string, props: Readonly<Record<string, string | number>> | null, children: readonly MdNode[]];
export interface Doc { readonly title: string; readonly nodes: readonly MdNode[] }

// h's prop table is closed per tag; the tags and props come from build-docs, which emits only plain DOM properties.
const tags = h as unknown as Readonly<Record<string, (props: Record<string, string | number> | null, ...children: Child[]) => Node>>;

/** Static DOM for markdown nodes: the content never changes, so nothing is live. */
export function render(nodes: readonly MdNode[]): Child[] {
  return nodes.map((n) => (typeof n === 'string' ? n : tags[n[0]]!({ ...n[1] }, ...render(n[2]))));
}
