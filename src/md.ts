import { h, type Child } from '@jasno/core';

/** One markdown node as scripts/build-docs.mjs emits it: text, or [tag, props, children]. */
export type MdNode = string | readonly [tag: string, props: Readonly<Record<string, string | number>> | null, children: readonly MdNode[]];

/** A page's content, /docs/<key>.json: embedded in its prerendered HTML, fetched after a client-side navigation. */
export interface Doc {
  readonly title: string;
  /** The first paragraph, cut to about 160 characters: the meta description. */
  readonly description: string;
  /** The h2 headings: the on-page table of contents. */
  readonly toc: readonly { readonly id: string; readonly text: string }[];
  readonly nodes: readonly MdNode[];
}

/** A page in the docs navigation, in reading order (src/docs.ts); generated reference pages are not listed. */
export interface PageEntry {
  readonly key: string;
  readonly title: string;
  readonly section: string;
  readonly sectionTitle: string;
}

/** The key of a page: "section/slug", or "section" for a section's own page. */
export const keyOf = (p: { readonly section: string; readonly slug?: string | undefined }): string => (p.slug ? `${p.section}/${p.slug}` : p.section);

// h's prop table is closed per tag; the tags and props come from build-docs, which emits only plain DOM properties.
const tags = h as unknown as Readonly<Record<string, (props: Record<string, string | number> | null, ...children: Child[]) => Node>>;

/** Static DOM for markdown nodes: the content never changes, so nothing is live. */
export function render(nodes: readonly MdNode[]): Child[] {
  return nodes.map((n) => (typeof n === 'string' ? n : tags[n[0]]!({ ...n[1] }, ...render(n[2]))));
}
