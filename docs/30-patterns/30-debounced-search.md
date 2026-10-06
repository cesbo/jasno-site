# Debounced search

Wait in the loader before the request. A new value of `params` aborts the wait, and an abort never becomes an error.

<!-- ts: declare function search(q: string, signal: AbortSignal): Promise<readonly string[]>; -->

```ts
const delay = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });

export const Results = component(function Results(p: {
  query: Read<string>;
}): Node {
  const results = resource({
    params: () => p.query() || undefined, // an empty query is idle
    loader: async ({ params, abortSignal }) => {
      await delay(300, abortSignal);
      return search(params, abortSignal);
    },
  });
  return h.ul(null, each(() => (results.hasValue() ? results.value() : []), {
    key: (r) => r,
    render: (r) => h.li(null, r),
  }));
});
```
