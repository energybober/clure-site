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
// Максимум запросов с одного IP за окно.
const RATE_LIMIT = 120;

// Окно rate limit: 60 секунд.
const RATE_WINDOW = 60 * 1000;

// Максимальная длина URL.
const MAX_URL_LENGTH = 2048;

// Максимальная глубина пути.
// Реальные страницы Clure с большей глубиной должны проходить
// через существующий файл/маршрут, поэтому это не жёсткий
// глобальный запрет.
const MAX_PATH_SEGMENTS = 12;

function isBlockedPath(pathname) {
  const lower = pathname.toLowerCase();

  /*
   * Никогда не отдаём потенциальные секреты /
   * служебные файлы.
   */
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

  /*
   * Любой путь, начинающийся с этих служебных директорий.
   */
  const blockedPrefixes = [
    '/.git/',
    '/.env.',
    '/node_modules/',
  ];

  if (blockedPrefixes.some(prefix => lower.startsWith(prefix))) {
    return true;
  }

  /*
   * Частые автоматические security probes.
   */
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

function resolveFile(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  const requested = path.resolve(root, `.${pathname}`);
  if (!requested.startsWith(root)) return null;

  const candidates = [
    requested,
    path.join(requested, 'index.html'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }

  return null;
}

const server = http.createServer((request, response) => {
  const filePath = resolveFile(request.url);

  if (!filePath) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    'Content-Type': mimeTypes[extension] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Clure is running on port ${port}`);
});
