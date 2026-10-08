# Project layout

`npm create @jasno my-app` creates a small working project. This page describes its files, the conventions, and where an app grows from there.

## The tree

```text
my-app/
  index.html            the page: <div id="app"> and the entry script
  package.json          "type": "module", dependencies, "imports", scripts
  tsconfig.json         the browser program
  tsconfig.test.json    the test program
  playwright.config.ts  browser tests
  src/
    main.ts             mount(App, document.getElementById('app'))
    app.ts              the shell: header, router.outlet() in <main>, providers
    routes.ts           the route table, and the error and notFound views
    state.ts            app-wide signals
    api.ts              typed fetch functions
    api.mock.ts         a stand-in for the backend, while there is none
    config.dev.ts       values for development
    config.prod.ts      values for production
    views/*.ts          one lazy module for each route
    layouts/*.ts        layouts that routes share
    components/*.ts     one exported component for each file
    **/*.test.ts        tests next to the code
  e2e/*.spec.ts         Playwright tests
  assets/               static files, published with the same names
  public/               files for the root of the site
```

The template creates `index.html`, `package.json`, both tsconfig files, `playwright.config.ts`, `src/main.ts`, `app.ts`, `routes.ts`, two views, one component test and one e2e test. It also creates `.gitignore`, `.gitattributes`, `.nvmrc`, a CI workflow and the `AGENTS.md` file. The other files in the tree are where an app grows.

## index.html

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>App</title>
  <!--jasno:head-->
</head>
<body>
  <div id="app"></div>
  <script type="module">import '/src/main.ts';</script>
</body>
</html>
```

`<!--jasno:head-->` is the slot where `jasno dev` and `jasno dist` write the import map. Never write an import map yourself. The `<title>` is the title that a route without a title restores.

## src

- `main.ts` mounts the app: `mount(App, document.getElementById('app'))`.
- `app.ts` is the shell: `h.header(null, nav)` and `h.main(null, router.outlet())`. Put providers and a toast region here too.
- `layouts/*.ts` hold the layouts that routes name. A layout places `p.view` once and has no `h1` or `main` of its own.
- `routes.ts` is the only place for route patterns. Build URLs with `router.href`, or with relative links such as `?q=x`.
- `state.ts` holds app-wide signals. Keep state out of component modules.
- `api.ts` holds typed `fetch` functions. Each takes an `AbortSignal`, and checks the payload before it returns it.

Everything under `src/` is public. Do not put secrets there.

### Conventions

- Write a component as `export const Name = component(function Name(p: NameProps): Node { ... })`, and export `NameProps`.
- Data props are `Read<T>`. Optional props are `?: Read<T> | undefined`. Callbacks are plain functions. Content that may not render is a `() => Child` prop.
- Use kebab-case file names. Write the `.ts` extension in relative imports, or jasno reports `TS_EXTENSION`. Use `import type` for types.
- Import packages by their bare name. Do not write barrel files.
- Put the styles of a component next to it, with `css`, under a root class that the component sets.
- Keep a detail over a list in a search param of the list route, and close it with `router.back()`.
- Put work that depends on a route param in a `match` body that is keyed on the param.

## assets and public

Files in `assets/` are published with the same names. Refer to them by the root path: `'/assets/logo.png'`. A style sheet in `assets/` can import Tailwind. The [styling](/docs/api/styling) page has the details.

Files in `public/` are copied to the root of the site: `robots.txt`, `favicon.ico`. A file in `public/` cannot have the name of a file that `jasno dist` generates.

## npm packages

Add a package to `dependencies` and import it by its bare name: `import { z } from 'zod'`. `jasno dev` serves each file of the package. `jasno dist` bundles the package into the chunks.

The package must ship ES modules for the browser. A package with CommonJS, with an unguarded `process.env` read, or with an import that does not resolve, fails with `DEP_NOT_BROWSER_ESM`. Use another version of the package, or another package.

jasno reports `IMPORT_NOT_MAPPED` for an import of a package that is not in `dependencies` (a package in `devDependencies` does not count).

## Config and mocks

The `imports` field of `package.json` can choose a module by condition. `jasno dev` and `npm test` use the `development` condition. `jasno dist` uses the `default` condition.

```json
{
  "imports": {
    "#config": {
      "development": "./src/config.dev.ts",
      "default": "./src/config.prod.ts"
    },
    "#api": { "development": "./src/api.mock.ts", "default": "./src/api.ts" }
  }
}
```

Import the values from the alias: `import config from '#config'`. `config.dev.ts` and `config.prod.ts` hold public values only.

`#api` lets you build the interface before the backend exists. The mock keeps the real types.

```ts fragment
import type * as Api from './api.ts';
export const listUsers: typeof Api.listUsers = async () => [
  { id: '1', name: 'Ada' },
];
```

Under `jasno dev`, the mock answers instead of `fetch`. A Playwright `page.route` stub, for example an error or a slow response, reaches only the real module. Run those browser tests against the production build: `JASNO_E2E=preview`.

To add a condition for your own aliases, use `jasno dist --condition <name>`.

## Deploy

`jasno dist` writes a static site into `dist/`. Upload it to a static host.

- A host that reads `_headers` and `_redirects`, such as Netlify and Cloudflare Pages, applies the CSP and the fallback for you.
- On another host, do two things yourself. Send the CSP header from `_headers`. Serve `index.html` for app URLs, and answer 404 for a missing file under `/src/*` and `/assets/*`.
- A server that sets its own CSP needs the nonce variant. Use `jasno dist --nonce`.
- A server that serves the files from one directory, and `index.html` from another path, needs `--prefix`.

The app is served at the root of the origin. For a server that has one fixed path and no fallback for other paths, use [hash mode](/docs/api/router) of the router.

Keep the previous deploys with `--keep N`. A tab that is open during a deploy can then still load its files.

## Mistakes this catches

| Code | When |
|---|---|
| [`TS_EXTENSION`](/docs/diagnostics/TS_EXTENSION) | a relative import without the `.ts` extension |
| [`IMPORT_NOT_MAPPED`](/docs/diagnostics/IMPORT_NOT_MAPPED) | an import of a package that is not in `dependencies` |
| [`DEP_NOT_BROWSER_ESM`](/docs/diagnostics/DEP_NOT_BROWSER_ESM) | a dependency that cannot run in the browser as installed |
