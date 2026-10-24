// Build a static Pages artifact from public/. The local snapshot remains unchanged.
import { readFile, writeFile, readdir, mkdir, rm, realpath, lstat, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const defaultBasePath = '/mtc-custom-loadout-manager';
export function validateBasePath(value) {
  if (value === '' || value === '/') return '';
  if (typeof value !== 'string' || !/^\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*\/?$/.test(value)
    || value.split('/').some(part => part === '.' || part === '..')) throw new Error('Invalid Pages base path');
  return value.replace(/\/$/, '');
}

function patchRouter(code, basePath) {
  if (!basePath) return code;
  const literal = JSON.stringify(basePath);
  const replace = (from, to) => {
    if (code.split(from).length !== 2) throw new Error('Next.js Pages anchor changed: ' + from);
    code = code.replace(from, () => to);
  };
  replace('this.basePath=""', 'this.basePath=' + literal);
  replace('(0,n.addPathPrefix)(e,"")', '(0,n.addPathPrefix)(e,' + literal + ')');
  replace('(0,n.pathHasPrefix)(e,"")', '(0,n.pathHasPrefix)(e,' + literal + ')');
  replace('6731:(e,t,r)=>{"use strict";function n(e){return e}',
    '6731:(e,t,r)=>{"use strict";function n(e){return r(754).removePathPrefix(e,' + literal + ')}');
  // Keep internal /_next/data paths relative to the router: addBasePath prefixes them.
  // assetPrefix from __NEXT_DATA__ handles the dynamic chunk loader independently.
  return code;
}

function rewritePaths(text, basePath) {
  if (!basePath) return text;
  return text.replace(/(["'`(])\/(?=(?:_next|assets|data)(?:\/|["'`)])|(?:i18n\.js|loadout-io\.js|vehicle-hover\.(?:js|css))(?=["'`)?#]))/g,
    (_, delimiter) => delimiter + basePath + '/');
}

export async function buildPages({ projectRoot = root, basePath = defaultBasePath } = {}) {
  basePath = validateBasePath(basePath);
  projectRoot = await realpath(projectRoot);
  const source = path.join(projectRoot, 'public');
  if (await realpath(source) !== source) throw new Error('public/ must not be a symbolic link');
  const dist = path.join(projectRoot, 'dist');
  await mkdir(dist, { recursive: true });
  if (await realpath(dist) !== dist) throw new Error('dist/ must not be a symbolic link');
  const destination = path.resolve(dist, 'pages');
  // Only this exact generated directory may be removed; source and Git files are outside it.
  if (path.dirname(destination) !== dist || path.basename(destination) !== 'pages') throw new Error('Unsafe Pages output');
  if ((await lstat(destination).catch(() => null))?.isSymbolicLink()) throw new Error('Pages output must not be a symbolic link');
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination);
  const files = [];
  async function copy(relative = '') {
    for (const entry of await readdir(path.join(source, relative), { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error('Symlink excluded from Pages: ' + entry.name);
      if (entry.name.startsWith('.') || /\.(?:orig|bak|tmp|log|map|zip|rar|pem|key)$/i.test(entry.name)) continue;
      const name = path.join(relative, entry.name);
      const input = path.join(source, name), output = path.join(destination, name);
      if (entry.isDirectory()) { await mkdir(output); await copy(name); continue; }
      if (!entry.isFile()) continue;
      if (/\.(?:html|css|js|json|svg)$/i.test(name)) {
        let text = await readFile(input, 'utf8');
        if (/^main-[\w]+\.js$/.test(entry.name)) text = patchRouter(text, basePath);
        else text = rewritePaths(text, basePath);
        await writeFile(output, text);
      } else await copyFile(input, output);
      files.push(name.split(path.sep).join('/'));
    }
  }
  await copy();
  const htmlPath = path.join(destination, 'index.html');
  let html = await readFile(htmlPath, 'utf8');
  const pattern = /(<script id="__NEXT_DATA__"[^>]*>)([\s\S]*?)(<\/script>)/;
  const match = html.match(pattern);
  if (!match) throw new Error('Next.js page data missing');
  const data = JSON.parse(match[2]);
  if (data.page !== '/' || !/^[A-Za-z0-9_-]+$/.test(data.buildId)) throw new Error('Unexpected Next.js page');
  data.assetPrefix = basePath;
  html = html.replace(pattern, () => match[1] + JSON.stringify(data).replaceAll('<', '\\u003c') + match[3]);
  // Preconnect and Next metadata must refer to this project's site root too.
  html = html.replace('rel="preconnect" href="/"', 'rel="preconnect" href="' + basePath + '/"');
  await writeFile(htmlPath, html);
  const pageDataDirectory = path.join(destination, '_next/data', data.buildId);
  await mkdir(pageDataDirectory, { recursive: true });
  await writeFile(path.join(pageDataDirectory, 'index.json'), JSON.stringify(data.props).replaceAll('<', '\\u003c'));
  await writeFile(path.join(destination, '.nojekyll'), '');
  return { directory: destination, basePath, files: files.length + 2 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  let basePath = process.env.PAGES_BASE_PATH ?? defaultBasePath;
  const args = process.argv.slice(2);
  if (args.length) {
    if (args.length !== 2 || args[0] !== '--base-path') throw new Error('Usage: npm run build:pages -- --base-path /repository-name');
    basePath = args[1];
  }
  console.log(JSON.stringify(await buildPages({ basePath }), null, 2));
}
