#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const portArgIndex = process.argv.indexOf('--port');
const port = Number(portArgIndex === -1 ? process.env.PORT || 5173 : process.argv[portArgIndex + 1]) || 5173;
const noticePath = join(root, 'NOTICE.json');

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
]);

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
}

async function readBody(req, maxBytes = 64 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error('payload too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function resolveStaticPath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]);
  const relative = cleanPath === '/' ? 'index.html' : cleanPath.replace(/^\/+/, '');
  const full = resolve(root, normalize(relative));
  if (!full.startsWith(root)) return null;
  return full;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'POST' && url.pathname === '/__dev/notice') {
      const body = await readBody(req);
      const parsed = JSON.parse(body);
      await writeFile(noticePath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
      return sendJson(res, 200, { status: 'ok' });
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD, POST' });
      return res.end('Method Not Allowed');
    }

    const full = resolveStaticPath(url.pathname);
    if (!full) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    const contentType = mimeTypes.get(extname(full)) || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
    if (req.method === 'HEAD') return res.end();
    createReadStream(full).on('error', () => {
      if (!res.headersSent) res.writeHead(404);
      res.end('Not Found');
    }).pipe(res);
  } catch (error) {
    sendJson(res, 400, { status: 'error', error: error.message });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Freecell dev server: http://127.0.0.1:${port}/`);
  console.log('NOTICE editor endpoint: POST /__dev/notice');
});
