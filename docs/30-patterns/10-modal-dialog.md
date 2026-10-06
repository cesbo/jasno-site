# Modal dialog

A modal dialog is a native `<dialog>`. This page shows a dialog that a button opens, and a dialog that a branch opens.

## Open from a button

Open the dialog with `showModal()`. A form with `method: 'dialog'` closes it, and the value of the pressed button becomes the `returnValue`.

```ts
export const DeleteContact = component(function DeleteContact(p: { onDelete: () => Promise<void> }): Node {
  const dialog = h.dialog({
    'aria-labelledby': 'del-title',
    onclose: (e) => { if (e.currentTarget.returnValue === 'yes') return p.onDelete(); },
  },
    h.form({ method: 'dialog' },
      h.h2({ id: 'del-title' }, 'Delete this contact?'),
      h.button({ value: 'no', autofocus: true }, 'Cancel'),
      h.button({ value: 'yes' }, 'Delete'),
    ),
  );
  return h.div(null,
    h.button({ type: 'button', onclick: () => { dialog.returnValue = ''; dialog.showModal(); } }, 'Delete…'),
    dialog,
  );
});
```

Notice these details:

- A dialog needs an accessible name. Here `aria-labelledby` points to the heading.
- `autofocus` works inside a dialog that you open with `showModal()`. The Cancel button gets the focus.
- `close()` returns the focus to the element that opened the dialog.
- Firefox and WebKit keep the last `returnValue` when the user presses Escape. Reset it before each `showModal()`.
- Never use the `open` prop. It makes a non-modal dialog.

## Open from a branch

If the dialog lives in a branch, it opens and closes itself. Removing an open dialog fires no `close` event, and the focus is lost.

```ts
export const Confirm = component(function Confirm(): Node {
  const d = h.dialog({ 'aria-label': 'Confirm' }, h.form({ method: 'dialog' }, h.button(null, 'OK')));
  onMount(() => { d.showModal(); return () => d.close(); });
  return d;
});
```
