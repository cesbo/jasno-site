# Getting started

Create a jasno app and start the development server in four commands.

## Install

```sh
npm create @jasno my-app
cd my-app
npm install
npm run dev
```

## What you get

- **No build configuration.** `jasno dev` strips types and serves one module per file. `jasno dist` bundles with Rolldown. It makes hashed chunks, one for each lazy view. It also writes source maps, integrity hashes, the CSP, `_headers` and `_redirects`. Import npm packages by name. A stylesheet in `assets/` that imports tailwindcss is compiled by `@tailwindcss/cli` from your project.
- **Checks.** `jasno check` runs tsc on the browser program and the test program. It also runs the jasno rules. In development, each problem has a code. `npm run explain CODE` prints the repair guide.
- **Accessibility built in.** The router moves focus to the heading of each view. jasno reports lost focus, unnamed controls and a few other mistakes.
- **Testing.** `@jasno/core/testing` mounts components under `node:test` with happy-dom. The template adds Playwright for Chromium, Firefox and WebKit.
- **Small.** The production runtime with the router is about 16 KB gzipped.

## Commands

| Command | What it does |
|---|---|
| `npm run check` | Type-checks the application and tests, and runs jasno's rules |
| `npm test` | Runs component tests with `node:test` and happy-dom |
| `npm run dev` | Starts the development server |
| `npm run dist` | Bundles the application for production into `dist/` |
| `npm run preview` | Serves `dist/` as a static host would |
| `npm run explain CODE` | Prints the repair guide for a diagnostic code |

## Requirements

- Node `^24.12.0` or `>=26.0.0`
- TypeScript `~7.0.2`
- Browsers: Chrome and Edge 136+, Firefox 138+, Safari 18.4+
