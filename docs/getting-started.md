# Getting started

> **Status: 0.x.** The API may change before 1.0. jasno has been tried in agent-built apps and in a comparison with React and Solid. It has no production users yet, and its load times have not been measured on real phones.

## Install

```sh
npm create @jasno my-app
cd my-app
npm install
npm run dev
```

Before you run the Playwright tests (`npm run e2e`) for the first time, install the browsers: `npx playwright install`.

The npm package is `@jasno/core` (npm rejects `jasno` as too similar to other package names); it installs the `jasno` command.

## What you get

- **No build configuration.** `jasno dev` strips types as it serves, one module per file. `jasno dist` bundles with Rolldown into hashed chunks, one per lazy view, with source maps, integrity, the CSP, `_headers` and `_redirects`. npm packages are imported by name. A stylesheet in `assets/` that imports tailwindcss is compiled by the project's `@tailwindcss/cli`.
- **Checks.** `jasno check` runs tsc on the browser and test programs plus jasno's own rules. In development, problems are reported with a code; `npm run explain CODE` prints the repair guide.
- **Accessibility built in.** The router moves focus to each view's heading; lost focus, unnamed controls and a few other mistakes are reported.
- **Testing.** `@jasno/core/testing` mounts components under `node:test` with happy-dom; the template adds Playwright in Chromium, Firefox and WebKit.
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
