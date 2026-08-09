/* Build a single self-contained index.html into dist/.
 *
 * Why this exists: the modular source is the right shape for a repo, but some
 * viewers (the Claude artifact preview, a file:// double-click, an emailed
 * attachment) only ever load one file and can't fetch siblings. This inlines
 * the CSS and bundles the ES modules so the whole app travels as one document.
 *
 * The deployed GitHub Pages site does NOT need this — it serves the modular
 * source directly. This is for previewing and sharing.
 *
 *   npm install esbuild
 *   node build.mjs
 *   -> dist/index.html
 */

import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const SRC = new URL('./', import.meta.url);
const p = rel => new URL(rel, SRC).pathname;

// 1. Bundle the module graph down to one classic script.
const result = await build({
  entryPoints: [p('js/main.js')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  write: false,
  legalComments: 'none'
});
const js = result.outputFiles[0].text;

// 2. Read the markup and styles.
let html = await readFile(p('index.html'), 'utf8');
const css = await readFile(p('css/styles.css'), 'utf8');

// 3. Swap the external references for inline blocks.
html = html.replace(
  '<link rel="stylesheet" href="css/styles.css">',
  `<style>\n${css.trim()}\n</style>`
);
html = html.replace(
  '<script type="module" src="js/main.js"></script>',
  `<script>\n${js.trim()}\n</script>`
);

if(html.includes('href="css/') || html.includes('src="js/')){
  throw new Error('An external reference survived the inlining step.');
}

await mkdir(p('dist'), { recursive: true });
await writeFile(p('dist/index.html'), html);

const kb = n => (n / 1024).toFixed(1) + ' kB';
console.log(`dist/index.html  ${kb(html.length)}  (css ${kb(css.length)}, js ${kb(js.length)})`);
