// After jasno dist: renders every route in happy-dom and writes dist/<path>/index.html, so crawlers, agents and link
// previews get the page without JavaScript. A docs page's HTML also carries its content as a JSON data block: the
// route loader reads it on a direct load instead of fetching /docs/<key>.json, so the client mounts over the
// prerendered page with the same data and nothing flashes (by analysis of the router's microtask chain, not measured).
// Run: node --conditions=development --import @jasno/core/testing/happy-dom scripts/prerender.mjs
import { appendFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, sep } from 'node:path';
import { mount } from '@jasno/core';
import { settled } from '@jasno/core/testing';
import { App } from '../src/app.ts';

const template = readFileSync('dist/index.html', 'utf8');
if (!template.includes('<div id="app"></div>')) throw new Error('prerender: dist/index.html has no <div id="app"></div>');
const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

// The docs pages are whatever jasno dist copied from public/docs/: one JSON per page.
const docPages = readdirSync('dist/docs', { recursive: true }).map(String).filter((f) => f.endsWith('.json')).sort()
  .map((f) => { const key = f.slice(0, -5).split(sep).join('/'); return [`/docs/${key}`, `dist/docs/${key}/index.html`, key]; });
const pages = [
  ['/', 'dist/index.html'],
  ...docPages,
  ['/404', 'dist/404.html'], // the not-found page, served by static hosts for unknown URLs
];
for (const [path, file, key] of pages) {
  history.replaceState(null, '', path);
  const target = document.createElement('div');
  target.id = 'app';
  let data;
  if (key) {
    // "<" is escaped inside the JSON so that no value can close the element; JSON.parse reads < back as "<".
    data = document.createElement('script');
    data.type = 'application/json';
    data.id = 'doc';
    data.dataset.key = key;
    data.textContent = readFileSync(`dist/docs/${key}.json`, 'utf8').replaceAll('<', '\\u003c');
  }
  document.body.replaceChildren(...(data ? [data] : []), target);
  const unmount = mount(App, target);
  await settled();
  let html = template
    .replace(/<title>.*?<\/title>/, () => `<title>${escape(document.title)}</title>`)
    .replace('<div id="app"></div>', () => (data ? `${data.outerHTML}\n  ` : '') + target.outerHTML);
  const description = data && JSON.parse(data.textContent).description;
  if (description) html = html.replace(/<meta name="description" content="[^"]*">/, () => `<meta name="description" content="${escape(description)}">`);
  unmount();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}
appendFileSync('dist/_headers', '/docs/*\n  Cache-Control: no-cache\n'); // like dist's rule for index.html
// Every route has its file now, so the SPA catch-all would only turn unknown URLs into a 200 with the landing page;
// without it, hosts serve 404.html (the not-found page above) with a real 404.
writeFileSync('dist/_redirects', readFileSync('dist/_redirects', 'utf8').replace('/* /index.html 200\n', ''));
console.log(`prerender: ${pages.length} pages`);
