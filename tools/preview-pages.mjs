// Serve the generated artifact under the same URL prefix as GitHub Pages.
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createStaticServer } from '../server.mjs';
import { defaultBasePath, validateBasePath } from './build-pages.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function createPagesPreview({ directory = path.join(root, 'dist/pages'), basePath = defaultBasePath } = {}) {
  basePath = validateBasePath(basePath);
  const files = createStaticServer(directory);
  return http.createServer((req, res) => {
    const pathname = (req.url || '').split('?')[0];
    if (basePath && pathname === basePath) {
      res.writeHead(308, { Location: basePath + '/' + (req.url.slice(pathname.length) || '') });
      return res.end();
    }
    if (basePath && !pathname.startsWith(basePath + '/')) { res.writeHead(404); return res.end('Not found'); }
    req.url = req.url.slice(basePath.length);
    files.emit('request', req, res);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 4177), basePath = process.env.PAGES_BASE_PATH ?? defaultBasePath;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const server = createPagesPreview({ basePath });
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Pages preview: http://localhost:${port}${validateBasePath(basePath)}/`));
}
