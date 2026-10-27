import http from 'node:http';
import path from 'node:path';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf'
};

function loadEnvFile(filename) {
  const filePath = path.join(root, filename);
  if (!existsSync(filePath)) return;

  for (const rawLine of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

function createResponseShim(res) {
  let statusCode = 200;

  const shim = {
    setHeader(name, value) {
      res.setHeader(name, value);
      return shim;
    },
    getHeader(name) {
      return res.getHeader(name);
    },
    removeHeader(name) {
      res.removeHeader(name);
      return shim;
    },
    status(code) {
      statusCode = code;
      return shim;
    },
    json(payload) {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      res.statusCode = statusCode;
      res.end(JSON.stringify(payload));
      return shim;
    },
    send(payload) {
      if (payload && typeof payload === 'object' && !Buffer.isBuffer(payload)) {
        return shim.json(payload);
      }
      res.statusCode = statusCode;
      res.end(payload);
      return shim;
    },
    end(payload) {
      res.statusCode = statusCode;
      res.end(payload);
      return shim;
    }
  };

  return shim;
}

function readBody(req, limit = 15 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handleApi(req, res, pathname) {
  const route = pathname.replace(/^\/api\//, '').replace(/\/$/, '');

  if (!route || route.includes('..') || !/^[a-zA-Z0-9_-]+$/.test(route)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  const handlerPath = path.join(root, 'api', `${route}.js`);
  if (!existsSync(handlerPath)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  const body = await readBody(req);
  req.body = body ? JSON.parse(body) : {};

  const { default: handler } = await import(`${pathToFileURL(handlerPath).href}?t=${Date.now()}`);
  await handler(req, createResponseShim(res));
}

async function serveStatic(res, pathname) {
  const relativePath = pathname === '/' ? '/index.html' : pathname;
  const blocked =
    relativePath.startsWith('/.') ||
    relativePath.startsWith('/api/') ||
    relativePath.startsWith('/node_modules/') ||
    relativePath === '/package.json' ||
    relativePath === '/vercel.json' ||
    relativePath === '/server.js';

  if (blocked) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

  let filePath = path.resolve(root, `.${relativePath}`);

  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      await stat(filePath);
    }
  } catch {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-cache');

  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('end', resolve);
    stream.pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname);
    } else {
      await serveStatic(res, pathname);
    }
  } catch (error) {
    console.error('Dev server error:', error);
    if (!res.headersSent) {
      res.statusCode = error.message === 'Payload too large' ? 413 : 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: error.message || 'Internal server error' }));
    } else if (!res.writableEnded) {
      res.end();
    }
  }
});

server.listen(port, () => {
  console.log(`NovaChat is running at http://localhost:${port}`);
  if (!process.env.AI_API_KEY) {
    console.log('AI_API_KEY is not set - running in demo mode.');
  }
});
