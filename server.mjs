import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const publicRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2' };
export const contentSecurityPolicy = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self'; img-src 'self' data: blob:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'";
const within = (root, filename) => {
  const relative = path.relative(root, filename);
  return relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
};
export function createStaticServer(root = publicRoot) {
  const resolvedRoot = realpath(root);
  return http.createServer(async (req, res) => {
    const headers = {
      'Cache-Control': 'no-cache', 'Content-Security-Policy': contentSecurityPolicy,
      'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer', 'Cross-Origin-Resource-Policy': 'same-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    };
    const end = (code, message = '') => { res.writeHead(code, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' }); res.end(req.method === 'HEAD' ? undefined : message); };
    const host = req.headers.host || '';
    if (!/^(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/i.test(host)) return end(403, 'Local host required');
    if (req.headers['sec-fetch-site'] === 'cross-site') return end(403, 'Cross-site request denied');
    if (req.headers.origin && req.headers.origin !== `http://${host}`) return end(403, 'Origin denied');
    if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); return end(405); }
    try {
      if (!req.url?.startsWith('/') || req.url.startsWith('//')) return end(400);
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (/[\\\x00-\x1f:]/.test(pathname)) return end(400, 'Invalid path');
      if (pathname.split('/').some(segment => segment.startsWith('.') || /[. ]$/.test(segment))) return end(403);
      const rootReal = await resolvedRoot;
      const filename = path.resolve(rootReal, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!within(rootReal, filename)) return end(403);
      if (!Object.hasOwn(types, path.extname(filename))) return end(404);
      const canonical = await realpath(filename);
      if (!within(rootReal, canonical)) return end(403);
      const info = await stat(canonical);
      if (!info.isFile()) return end(404);
      if (req.method === 'HEAD') {
        res.writeHead(200, { ...headers, 'Content-Type': types[path.extname(filename)], 'Content-Length': info.size });
        return res.end();
      }
      const body = await readFile(canonical);
      res.writeHead(200, { ...headers, 'Content-Type': types[path.extname(filename)], 'Content-Length': body.length });
      res.end(body);
    } catch (error) {
      if (error instanceof URIError || error.code === 'ERR_INVALID_URL') return end(400, 'Invalid URL');
      end(['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500, 'File unavailable');
    }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535');
  const server = createStaticServer();
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE' ? `Port ${port} is busy. Open http://localhost:${port} or set PORT.` : error.message);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => console.log(`Loadout Editor: http://localhost:${port}\nCtrl+C to stop.`));
}
