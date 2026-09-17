const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const root = __dirname;
const port = Number(process.env.PORT) || 3000;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/* =========================
   RATE LIMIT
   ========================= */

const RATE_LIMIT = 180;
const RATE_WINDOW = 60 * 1000;

const requestsByIp = new Map();

setInterval(() => {
  const now = Date.now();

  for (const [ip, timestamps] of requestsByIp) {
    const recent = timestamps.filter(
      timestamp => now - timestamp < RATE_WINDOW
    );

    if (recent.length === 0) {
      requestsByIp.delete(ip);
    } else {
      requestsByIp.set(ip, recent);
    }
  }
}, RATE_WINDOW).unref();


function getClientIp(request) {
  return request.socket.remoteAddress || 'unknown';
}


function rateLimitExceeded(ip) {
  const now = Date.now();

  let timestamps = requestsByIp.get(ip);

  if (!timestamps) {
    timestamps = [];
    requestsByIp.set(ip, timestamps);
  }

  timestamps = timestamps.filter(
    timestamp => now - timestamp < RATE_WINDOW
  );

  if (timestamps.length >= RATE_LIMIT) {
    requestsByIp.set(ip, timestamps);
    return true;
  }

  timestamps.push(now);
  requestsByIp.set(ip, timestamps);

  return false;
}


/* =========================
   RESPONSE HELPERS
   ========================= */

function sendText(response, statusCode, text, headers = {}) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });

  response.end(text);
}


/* =========================
   BLOCKED PATHS
   ========================= */

function isBlockedPath(pathname) {
  const lower = pathname.toLowerCase();

  const blockedExact = new Set([
    '/.env',
    '/.env.local',
    '/.env.production',
    '/.env.development',
    '/.git',
    '/.git/config',
    '/.git/head',
    '/.git/index',
    '/composer.json',
    '/composer.lock',
    '/package-lock.json',
    '/yarn.lock',
  ]);

  if (blockedExact.has(lower)) {
    return true;
  }

  const blockedPrefixes = [
    '/.git/',
    '/.env.',
    '/node_modules/',
  ];

  if (
    blockedPrefixes.some(prefix => lower.startsWith(prefix))
  ) {
    return true;
  }

  const blockedFiles = [
    '/wp-admin',
    '/wp-login.php',
    '/xmlrpc.php',
    '/phpmyadmin',
    '/administrator',
    '/admin.php',
    '/shell.php',
    '/config.php',
  ];

  if (
    blockedFiles.some(
      file => lower === file || lower.startsWith(file + '/')
    )
  ) {
    return true;
  }

  return false;
}


/* =========================
   FILE RESOLUTION
   ========================= */

function resolveFile(requestUrl) {
  let pathname;

  try {
    pathname = decodeURIComponent(
      new URL(requestUrl, 'http://localhost').pathname
    );
  } catch {
    return null;
  }

  const requested = path.resolve(root, `.${pathname}`);

  /* Path traversal protection */
  if (
    !requested.startsWith(root + path.sep) &&
    requested !== root
  ) {
    return null;
  }

  const archiveAliases = {
    '/articles': 'archive/articles/index.html',
    '/articles/': 'archive/articles/index.html',

    '/interviews': 'archive/interviews/index.html',
    '/interviews/': 'archive/interviews/index.html',

    '/playlists': 'archive/playlists/index.html',
    '/playlists/': 'archive/playlists/index.html',
  };

  if (archiveAliases[pathname]) {
    return path.join(root, archiveAliases[pathname]);
  }

  /*
   * Existing article/interview routes
   */
  if (/^\/(articles|interviews)\/[^/]+\/?$/.test(pathname)) {
    const section = pathname.split('/')[1];

    return path.join(
      root,
      'archive',
      section,
      section === 'articles'
        ? 'article.html'
        : 'interview.html'
    );
  }

  const candidates = [
    requested,
    path.join(requested, 'index.html'),
  ];

  for (const candidate of candidates) {
    try {
      if (
        fs.existsSync(candidate) &&
        fs.statSync(candidate).isFile()
      ) {
        return candidate;
      }
    } catch {
      return null;
    }
  }

  return null;
}


/* =========================
   SERVER
   ========================= */

const server = http.createServer((request, response) => {
  const ip = getClientIp(request);
  const requestUrl = request.url || '/';

  /* URL too long */
  if (requestUrl.length > 2048) {
    return sendText(response, 414, 'URI Too Long');
  }

  /* Static site: only GET and HEAD */
  if (
    request.method !== 'GET' &&
    request.method !== 'HEAD'
  ) {
    return sendText(response, 405, 'Method Not Allowed', {
      Allow: 'GET, HEAD',
    });
  }

  let pathname;

  try {
    pathname = decodeURIComponent(
      new URL(requestUrl, 'http://localhost').pathname
    );
  } catch {
    return sendText(response, 400, 'Bad Request');
  }

  /* Security probes */
  if (isBlockedPath(pathname)) {
    console.log(
      `[BLOCKED] ${ip} ${request.method} ${pathname}`
    );

    return sendText(response, 404, 'Not found');
  }

  /* Rate limit */
  if (rateLimitExceeded(ip)) {
    console.log(
      `[RATE_LIMIT] ${ip} ${request.method} ${pathname}`
    );

    return sendText(response, 429, 'Too Many Requests', {
      'Retry-After': '60',
    });
  }

  const segments = pathname
    .split('/')
    .filter(Boolean);

  const filePath = resolveFile(requestUrl);

  /*
   * Very deep non-existent URL
   */
  if (!filePath && segments.length > 12) {
    console.log(
      `[DEEP_404] ${ip} ${request.method} ${pathname}`
    );

    return sendText(response, 404, 'Not found');
  }

  /* Normal 404 */
  if (!filePath) {
    return sendText(response, 404, 'Not found');
  }

  const extension = path.extname(filePath).toLowerCase();

  response.writeHead(200, {
    'Content-Type':
      mimeTypes[extension] ||
      'application/octet-stream',

    'Cache-Control': 'no-cache',
  });

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  fs.createReadStream(filePath)
    .on('error', () => {
      if (!response.headersSent) {
        sendText(response, 500, 'Internal Server Error');
      } else {
        response.destroy();
      }
    })
    .pipe(response);
});


server.on('clientError', (error, socket) => {
  socket.end(
    'HTTP/1.1 400 Bad Request\r\n' +
    'Connection: close\r\n' +
    '\r\n'
  );
});


server.listen(port, '0.0.0.0', () => {
  console.log(
    `Clure is running on port ${port}`
  );
});
```
