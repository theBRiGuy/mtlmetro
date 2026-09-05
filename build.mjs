/* Build a single self-contained index.html into dist/.
 *
 * Why this exists: the modular source is the right shape for a repo, but some
 * viewers only ever load one file and can't fetch siblings — a file:// double
 * click, an emailed attachment, an artifact preview. This inlines the CSS and
 * bundles the ES modules so the whole app travels as one document.
 *
 * The deployed GitHub Pages site does NOT need this. It serves the modular
 * source directly, which caches better and gives readable stack traces.
 *
 *   node build.mjs          ->  dist/index.html
 *
 * Needs Node and (on first run) network access; it fetches esbuild via npx.
 * No `npm install`, no package.json.
 */

import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const here = new URL('./', import.meta.url).pathname;
const p = rel => here + rel;

for(const required of ['index.html', 'css/styles.css', 'js/main.js']){
  if(!existsSync(p(required))){
    console.error(`Missing ${required} — run this from the repo root.`);
    process.exit(1);
  }
}

console.log('Bundling modules (first run downloads esbuild via npx)...');
try{
  execFileSync('npx', [
    '--yes', 'esbuild@0.28.2',
    p('js/main.js'),
    '--bundle',
    '--format=iife',
    '--target=es2020',
    '--legal-comments=none',
    '--outfile=' + p('.bundle.tmp.js')
  ], { stdio:['ignore', 'ignore', 'inherit'] });
}catch(e){
  console.error('\nesbuild failed. Is Node installed and the network reachable?');
  process.exit(1);
}

const js   = await readFile(p('.bundle.tmp.js'), 'utf8');
const css  = await readFile(p('css/styles.css'), 'utf8');
let   html = await readFile(p('index.html'), 'utf8');

html = html.replace('<link rel="stylesheet" href="css/styles.css">',
                    `<style>\n${css.trim()}\n</style>`);
html = html.replace('<script type="module" src="js/main.js"></script>',
                    `<script>\n${js.trim()}\n</script>`);

if(html.includes('href="css/') || html.includes('src="js/')){
  console.error('An external reference survived inlining — is index.html the modular version?');
  process.exit(1);
}

await mkdir(p('dist'), { recursive:true });
await writeFile(p('dist/index.html'), html);
await rm(p('.bundle.tmp.js'), { force:true });

const kb = n => (n / 1024).toFixed(1) + ' kB';
console.log(`dist/index.html  ${kb(html.length)}  (css ${kb(css.length)}, js ${kb(js.length)})`);
