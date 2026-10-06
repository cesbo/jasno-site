# Library widget

Create the widget in `onMount`, update it in an effect, and destroy it in the cleanup.

<!-- ts: declare function makeChart(el: HTMLElement): { update(data: readonly number[]): void; destroy(): void }; -->

```ts
export const Chart = component(function Chart(p: { data: Read<readonly number[]> }): Node {
  const el = h.div({ class: 'chart' });
  onMount(() => {
    const chart = makeChart(el);
    effect(() => chart.update(p.data()));
    return () => chart.destroy();
  });
  return el;
});
```

The effect belongs to the component, because `onMount` runs with the component as the owner. jasno disposes the effect and calls the cleanup when the component leaves the page.
