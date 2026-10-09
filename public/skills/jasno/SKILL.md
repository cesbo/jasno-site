---
name: jasno
description: Build single-page web apps and sites with jasno (@jasno/core), a TypeScript framework without JSX or templates. Use when you create a jasno project, write or review code in a project with @jasno/core in package.json, or fix a failed jasno check, test or build.
---

# jasno

jasno is a TypeScript-first framework for single-page apps. Views are function calls such as `h.div(...)`. There is no JSX, no template language and no build configuration.

**Your training data does not know jasno.** It is not React, Solid, Vue, Svelte or Angular. Do not write JSX, hooks or a bundler config.

Docs: https://jasno.dev/llms.txt lists every page as markdown.

## 1. Create the project

```sh
npm create @jasno my-app
cd my-app
npm install
```

`npm create @jasno <dir>` needs a new or empty directory. A directory with any file, `.git` included, is not empty. To fill such a directory, create the project in a new one, then move its files, dotfiles included.

The project has `AGENTS.md`, two views, a component test, an e2e test and a CI workflow. Commit `package-lock.json` after the first install.

## 2. Read the guide of the installed version

Before you write code, read `node_modules/@jasno/core/AGENTS.md` in full. Then read the RECIPES block at the top of `node_modules/@jasno/core/dist/jasno.d.ts`. These two files are the whole API, and they match the installed version.

Before the install, the same files are at https://raw.githubusercontent.com/cesbo/jasno/HEAD/design/AGENTS.md and https://raw.githubusercontent.com/cesbo/jasno/HEAD/design/jasno.d.ts. They can be newer than the published package.

## 3. Build

- `src/routes.ts` holds every route. Each page is a lazy view in `src/views/<name>.ts` with one `h.h1`.
- `src/app.ts` is the shell: the header with the menu, and `router.outlet()` in `<main>`.
- UI that a section shares, such as a side menu, is a layout in `src/layouts/`.
- Put one component in each file of `src/components/`, app-wide signals in `src/state.ts` and `fetch` functions in `src/api.ts`.
- Images, fonts and style sheets go in `assets/`. Files for the root of the site, such as `robots.txt`, go in `public/`.
- Style with `` css`...` `` under a root class, or with Tailwind (https://jasno.dev/docs/api/styling.md). Never remove the focus outline.

The full tree and its conventions: https://jasno.dev/docs/tools/project-layout.md

### The CSP

`jasno dist` ships a strict CSP: `script-src 'self'` and `trusted-types 'none'`. Plan for it from the start.

- No `innerHTML`, so no library that renders HTML strings. Write content as `h.*` calls, or convert markdown to nodes at build time.
- No third-party `<script>`, such as analytics or chat widgets. Each one needs a change of the CSP: ask the user first.
- Insert SVG with `svg.*` calls.
- Images, fonts, style sheets and iframes from other origins work.

`jasno dev` sends the same CSP, so a violation shows up in development.

## 4. Verify in order

Each command must exit with 0. A non-zero exit is a failure.

1. `npm run check`: tsc for the app and the tests, and the jasno rules.
2. `npm test`: component tests with `node:test` and happy-dom.
3. `npx playwright install` once, then `npm run e2e`: browser tests. Playwright starts `npm run dev` itself.
4. `npm run dist && JASNO_E2E=preview npm run e2e`: the same tests against the production build, served by `npm run preview`.

Each problem has a code. `npm run explain CODE` prints its repair guide. In development, `window.__JASNO__.diagnostics()` lists the current problems.

If a step cannot run, tell the user. Never say that it passed.

## 5. Deploy

`npm run dist` writes a static site into `dist/`. It includes `_headers` with the CSP and `_redirects` with the fallback to `index.html`.

- Netlify and Cloudflare Pages read both files. Upload `dist/` as it is.
- Another host must send the CSP header from `_headers` and serve `index.html` for app URLs.

Details: the Deploy section of https://jasno.dev/docs/tools/project-layout.md
