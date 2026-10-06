# Dev tools

In the development build, `window.__JASNO__` shows what jasno does at run time: warnings, the reactive graph, and the state of the router. It has no UI. You call its functions from the browser console, from a Playwright script or from a tool.

In the production build, `window.__JASNO__` is `undefined`.

## Members

Results are plain JSON values. A preview of a value is cut to 80 characters.

| Member | Returns |
|---|---|
| `version` | the version of jasno |
| `diagnostics(filter?)` | the warnings since the page loaded, or since `clearDiagnostics()` |
| `clearDiagnostics()` | nothing. It clears the list. |
| `graph(filter?)` | the nodes of the reactive graph and the edges between them |
| `inspect(target)` | one node, or one DOM element: its sources, observers, runs and bindings |
| `why(target)` | the chain of causes of the last run of a node |
| `router()` | the state of the router |

## Diagnostics

`diagnostics()` returns the warnings of the development build. An error throws instead, so it appears as a page error.

Each item has a `code`, a `severity`, a `message`, a `hint` and a `docs` path. It also has the `ownerPath` where the problem happened, the `loc` of the first line of your code, and a `count`. jasno groups repeated events, and `count` is the number of occurrences.

To filter, pass a `code` or a `severity`. Both must match exactly.

```ts
const dev = window.__JASNO__;
const warnings = dev?.diagnostics({ severity: 'warn' }) ?? [];
for (const d of warnings) console.log(d.code, d.ownerPath, d.loc, d.count);
dev?.clearDiagnostics();
```

To read the repair guide for a code, run `npm run explain CODE`. The `docs` field of a diagnostic is the path of the same guide inside the package.

Playwright tests use `diagnostics()` to fail on any warning. The [testing](/docs/api/testing) page shows the `afterEach` hook.

## The reactive graph

`graph()` returns `{ nodes, edges }`. A node is a signal, a computed, a linked signal, an effect, a binding, a resource or a selector. Each node has an `id`, a `kind`, a `name` and an `ownerPath`. It can also have a `value` preview, the number of `runs` and a `loc`.

An edge is `{ consumer, producer }`. It says that the consumer node reads the producer node.

A node gets its `name` from the `debugName` option. Without it, the name is `<kind>#<id>`. Name the nodes that you want to find.

```ts
const query = signal('', { debugName: 'query' });
const shown = computed(() => query().toUpperCase(), { debugName: 'shown' });
```

To narrow the graph, filter by `ownerPath`, which matches a prefix from the root, such as `'<App> › <Board>'`, or by `name`, which matches a `debugName` exactly.

```ts
const graph = window.__JASNO__?.graph({ ownerPath: '<App> › <UserList>' });
console.log(graph?.nodes.length, graph?.edges.length);
```

## inspect and why

`inspect(target)` describes one node. The target is the id of a node, a `debugName`, or a DOM element. For a node, it returns the `sources` that the node reads, the `observers` that read it, the `runs` and the `loc`. For an element, it returns the owner path and the live bindings as `"prop ← node"` strings.

`why(target)` answers the question "why did this run?" It returns a chain. The chain starts at the write that began the run and ends at the node that ran. Example: `["query.set at src/a.ts:9:5", "shown", "binding p#text"]`. The target is an id or a `debugName`.

```ts
console.log(window.__JASNO__?.why('shown'));
```

## router

`router()` returns the state of the router: `url`, the matching `route` pattern, `isLoading` and the `error`. In hash mode, `url` is the address-bar URL.

```ts
console.log(window.__JASNO__?.router());
```
