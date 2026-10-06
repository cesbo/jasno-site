# Polling

Schedule the next reload after the last load has finished. When the tab becomes visible again, reload at once.

`reload()` aborts a load that is in flight.

<!-- ts: declare const metrics: Resource<readonly number[]>; -->

```ts
export const Metrics = component(function Metrics(): Node {
  const visible = signal(!document.hidden);

  onMount(({ abortSignal }) => document.addEventListener('visibilitychange', () => {
    visible.set(!document.hidden);
    if (!document.hidden && !metrics.isLoading()) metrics.reload();
  }, { signal: abortSignal }));

  effect(() => {
    if (!visible() || metrics.isLoading()) return;
    const timer = setTimeout(() => metrics.reload(), 5000);
    return () => clearTimeout(timer);
  });

  return h.p(null, () => (metrics.hasValue() ? metrics.value().join(', ') : 'Loading'));
});
```

The effect reads `isLoading()`. It runs again when a load finishes, and it starts the timer for the next one. The listener is in `onMount`, because its callback sets a signal.
