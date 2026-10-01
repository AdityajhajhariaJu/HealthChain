// Local audit server: serve the built application with the text compression
// used by production hosting, without downloading another server package.
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';

const root = path.resolve('dist');
const compress = promisify(gzip);
const cache = new Map();
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
};

createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = path.resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end();
      return;
    }
    const info = await stat(file).catch(() => null);
    if (!info?.isFile()) {
      if (path.extname(pathname)) {
        response.writeHead(404).end();
        return;
      }
      file = path.join(root, 'index.html');
    }
    const type = types[path.extname(file)] || 'application/octet-stream';
    const acceptsGzip = (request.headers['accept-encoding'] || '').split(',').some((value) => {
      const [encoding, quality] = value.trim().split(';');
      return encoding === 'gzip' && !/^q=0(?:\.0*)?$/.test(quality?.trim() || '');
    });
    const encoded = acceptsGzip && /text\/|application\/json|image\/svg/.test(type);
    const key = `${file}:${encoded}`;
    if (!cache.has(key)) {
      cache.set(
        key,
        readFile(file)
          .then((data) => (encoded ? compress(data) : data))
          .catch((error) => {
            cache.delete(key);
            throw error;
          })
      );
    }
    const body = await cache.get(key);
    response.writeHead(200, {
      'Content-Type': type,
      'Content-Length': body.length,
      'Cache-Control': file.endsWith('index.html')
        ? 'no-cache'
        : 'public, max-age=31536000, immutable',
      Vary: 'Accept-Encoding',
      ...(encoded ? { 'Content-Encoding': 'gzip' } : {}),
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    console.error('Audit server request failed:', error.message);
    response.writeHead(500).end();
  }
}).listen(8080, '127.0.0.1', () => console.log('Lighthouse server ready on http://localhost:8080'));
