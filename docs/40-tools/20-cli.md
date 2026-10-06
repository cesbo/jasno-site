# CLI

The `jasno` command has five subcommands: `check`, `dev`, `dist`, `preview` and `explain`. Run them through the npm scripts of your project, such as `npm run check`.

All subcommands exit with 0 on success and with 1 on failure. They print one line for each problem, in the form `file:line:col CODE message`. With `--json`, they print one JSON object for each line.

| Script | Command | What it does |
|---|---|---|
| `npm run check` | `jasno check` | Type-checks the app and the tests, and runs the jasno rules |
| `npm run dev` | `jasno dev` | Starts the development server |
| `npm run dist` | `jasno dist` | Builds the app for production into `dist/` |
| `npm run preview` | `jasno preview` | Serves `dist/` as a static host does |
| `npm run explain CODE` | `jasno explain` | Prints the repair guide of a diagnostic code |

## check

`jasno check` checks two TypeScript programs. `tsconfig.json` is the browser program. `tsconfig.test.json` is the program for tests, end-to-end tests and config files. Then it runs the jasno rules: imports, components, focus styles, signal reads and more. Each problem has a code.

Warnings do not fail the command. Use `--strict` to make warnings fail too. They also fail when the `CI` environment variable is set.

```sh
npm run check -- --strict
```

## dev

`jasno dev` starts a local server at `http://127.0.0.1:5173`. Use `--port` to change the port. The server listens only on the local machine. `--host` opens another interface, and prints a warning. A request with a `Host` header that is not a local name gets a 403 response.

The server serves only an allowlist: `index.html`, the modules in `src/`, the files in `assets/` and `public/`, and the packages that your modules import. Other files give a 404 response.

- **Types.** The server strips the types of each `.ts` file when it serves the file. There is one module for each file, and there is no bundle.
- **Import map.** The server writes the import map at `<!--jasno:head-->` in `index.html`. Do not write an import map yourself. jasno reports `IMPORT_MAP_HANDWRITTEN`.
- **Security.** The server sends the production CSP as a header. A Trusted Types violation therefore appears in development.
- **Reload.** The page reloads when a served file changes.
- **Log.** The page sends uncaught errors, unhandled rejections and jasno warnings to the terminal.
- **Fallback.** A request for HTML without a file extension and without a matching file gets `index.html`.
- **Tailwind.** A style sheet in `assets/` that imports Tailwind is compiled on each request. The [styling](/docs/api/styling) page has the details.

If a second `jasno dev` starts in the same project, it reuses the running server.

## dist

`jasno dist` builds the app into `dist/`. It bundles with Rolldown. The bundle contains only what the entry reaches. A module that nothing imports does not ship.

The output has these parts:

- **Chunks.** The entry and each lazy view become files under `dist/src/`. Each name has a content hash. Code that chunks share goes to a shared chunk. Each chunk has a source map that points to your `.ts` files.
- **Import map and integrity.** `index.html` has one inline import map. It lists the integrity hash (sha384) of every chunk. `modulepreload` links load the chunks of the entry early.
- **CSP.** `index.html` has a CSP meta tag, and `_headers` has the same policy. Cache headers are set too: HTML and `assets/` revalidate, and hashed files are immutable.
- **Fallback.** `_redirects` and `404.html` make a static host serve `index.html` for app URLs. A missing file under `/src/*` or `/assets/*` still gives a 404 response.
- **Assets.** `assets/` is copied with the same names. A Tailwind style sheet is written compiled and minified. `public/` is copied to the root of `dist/`.

| Option | Meaning |
|---|---|
| `--list` | prints the exact list of files that `dist` writes |
| `--keep N` | keeps the hashed files of the last N deploys, so open tabs keep working |
| `--condition <name>` | adds a condition for the `imports` field of your `package.json` |
| `--nonce` | prints a CSP variant with a nonce, for servers that set the policy themselves |
| `--prefix /path/` | publishes `src/` and `assets/` under a URL path. `index.html` stays at the root. |

`dist` fails with `FILE_NOT_PUBLISHED` when browser code imports a file that it does not publish. It fails with `SECRET_FILE_IN_OUTPUT` when `src/`, `assets/` or `public/` contains a `.env*`, `.pem` or `.key` file.

## preview

`jasno preview` serves `dist/` at `http://127.0.0.1:4173`. Use `--port` to change the port. It applies `_headers`, `_redirects` and the CSP as a static host does. It does not serve `_headers`, `_redirects` or `.jasno/` as files.

Use it for the browser tests of the production build. The [testing](/docs/api/testing) page shows the commands.

## explain

`npm run explain CODE` prints the repair guide of a diagnostic code: what happened, why, the usual fix, and an example. It works offline.

```sh
npm run explain STRICT_READ_UNTRACKED
```

A code without a guide, such as a TypeScript `TS2322`, prints its rows from the catalogue. `--list` prints every code with a short summary. `--json` prints the whole catalogue for tools.

## Errors of the tools

| Code | When |
|---|---|
| [`IMPORT_MAP_HANDWRITTEN`](/docs/diagnostics/IMPORT_MAP_HANDWRITTEN) | `index.html` already contains an import map |
| [`FILE_NOT_PUBLISHED`](/docs/diagnostics/FILE_NOT_PUBLISHED) | browser code imports a file that `jasno dist` does not publish |
| [`SECRET_FILE_IN_OUTPUT`](/docs/diagnostics/SECRET_FILE_IN_OUTPUT) | a published directory contains a secret file |
| [`TSCONFIG_DRIFT`](/docs/diagnostics/TSCONFIG_DRIFT) | a TypeScript config differs from the setup that jasno requires |
