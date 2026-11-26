const http = require('http');
const fs = require('fs');
const path = require('path');

const STATIC_ROOT = path.resolve(__dirname, '..', 'dist');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.map': 'application/json',
};

function send(res, status, message) {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(message);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('allow', 'GET, HEAD');
    return send(res, 405, 'Method Not Allowed');
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
  } catch {
    return send(res, 400, 'Bad Request');
  }

  const filePath = path.resolve(STATIC_ROOT, `.${pathname}`);
  if (
    filePath !== STATIC_ROOT &&
    !filePath.startsWith(`${STATIC_ROOT}${path.sep}`)
  ) {
    return send(res, 403, 'Forbidden');
  }

  let targetPath = filePath;
  try {
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
      targetPath = path.join(targetPath, 'index.html');
    }
    if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
      if (req.headers.accept?.includes('text/html')) {
        targetPath = path.join(STATIC_ROOT, 'index.html');
      } else {
        return send(res, 404, 'Not Found');
      }
    }
  } catch {
    return send(res, 404, 'Not Found');
  }

  const contentType =
    MIME_TYPES[path.extname(targetPath).toLowerCase()] ||
    'application/octet-stream';
  res.writeHead(200, { 'content-type': contentType });
  if (req.method === 'HEAD') return res.end();

  const stream = fs.createReadStream(targetPath);
  stream.on('error', () => {
    if (!res.headersSent) send(res, 404, 'Not Found');
    else res.destroy();
  });
  stream.pipe(res);
});

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

server.listen(port, '0.0.0.0', () => {
  console.log(`Serving static app on port ${port}`);
});
