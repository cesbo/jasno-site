// After jasno dist: renders every route in happy-dom and writes dist/<path>/index.html, so crawlers, agents and link
// previews get the page without JavaScript. The client mounts over it (mount() replaces the target's children);
// every view is imported statically, so that render completes in the entry's own task, before a paint (by analysis
// of the router's microtask chain, not measured).
// Run: node --conditions=development --import @jasno/core/testing/happy-dom scripts/prerender.mjs
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { mount } from '@jasno/core';
import { settled } from '@jasno/core/testing';
import { App } from '../src/app.ts';
import { docs } from '../src/docs.ts';

const template = readFileSync('dist/index.html', 'utf8');
if (!template.includes('<div id="app"></div>')) throw new Error('prerender: dist/index.html has no <div id="app"></div>');
const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;');

const pages = [
  ['/', 'dist/index.html'],
  ...Object.keys(docs).map((slug) => [`/docs/${slug}`, `dist/docs/${slug}/index.html`]),
  ['/404', 'dist/404.html'], // the not-found page, served by static hosts for unknown URLs
];
for (const [path, file] of pages) {
  history.replaceState(null, '', path);
  const target = document.createElement('div');
  target.id = 'app';
  document.body.replaceChildren(target);
  const unmount = mount(App, target);
  await settled();
  const html = template
    .replace(/<title>.*?<\/title>/, () => `<title>${escape(document.title)}</title>`)
    .replace('<div id="app"></div>', () => target.outerHTML);
  unmount();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}
appendFileSync('dist/_headers', '/docs/*\n  Cache-Control: no-cache\n'); // like dist's rule for index.html
// Every route has its file now, so the SPA catch-all would only turn unknown URLs into a 200 with the landing page;
// without it, hosts serve 404.html (the not-found page above) with a real 404.
writeFileSync('dist/_redirects', readFileSync('dist/_redirects', 'utf8').replace('/* /index.html 200\n', ''));
console.log(`prerender: ${pages.length} pages`);
