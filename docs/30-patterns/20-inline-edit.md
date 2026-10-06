# Inline edit

A title shows as a button, and a click turns it into a field. Enter saves, Escape cancels, and leaving the field saves.

```ts
export const EditableTitle = component(function EditableTitle(p: {
  title: Read<string>;
  onRename: (title: string) => Promise<void>;
}): Node {
  const editing = signal(false);
  let refocus = false; // set on the Enter and Escape paths only, so tabbing away never pulls the focus back

  return show(editing, () => {
    const commit = (again: boolean): Promise<void> | undefined => {
      refocus = again;
      editing.set(false);
      const title = input.value.trim();
      if (title && title !== p.title()) return p.onRename(title);
      return undefined;
    };
    const input = h.input({
      value: untracked(p.title),
      'aria-label': 'Title',
      onkeydown: (e) => { if (e.key === 'Escape') { e.preventDefault(); refocus = true; editing.set(false); } },
      onblur: () => { if (editing()) void commit(false); }, // Chromium also fires blur when the field is removed
    });
    onMount(() => { input.focus(); input.select(); });
    return h.form({ onsubmit: (e) => { e.preventDefault(); return commit(true); } }, input);
  }, () => {
    const title = h.button({ type: 'button', onclick: () => editing.set(true) }, () => p.title());
    if (refocus) { refocus = false; onMount(() => title.focus()); }
    return title;
  });
});
```

Notice these details:

- Enter saves through a form. Implicit submission ignores IME composition, and it cannot activate the element that gets the focus next.
- The new element gets the focus in `onMount`, inside its own branch. Never focus it right after `set()`.
- `refocus` is a plain variable, not a signal. Only the Enter and Escape paths set it.
- The field starts from `untracked(p.title)`. The editor keeps its own draft from then on.
