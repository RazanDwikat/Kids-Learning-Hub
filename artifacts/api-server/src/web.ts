import express, { type Express } from 'express';
import path from 'node:path';
import { existsSync } from 'node:fs';
import http from 'node:http';

// Resolve from the bundled server, not the caller's working directory.
const artifactsRoot = path.resolve(import.meta.dirname, '../..');
export function mountWeb(app: Express) {
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'API route not found' }); });
  if (process.env.NODE_ENV !== 'production' && process.env.EXPO_DEV_ORIGIN) {
    const target = new URL(process.env.EXPO_DEV_ORIGIN);
    app.use((req, res) => {
      const upstream = http.request(new URL(req.originalUrl, target), {
        method: req.method, headers: { ...req.headers, host: target.host },
      }, response => {
        res.writeHead(response.statusCode || 502, response.headers);
        response.pipe(res);
      });
      upstream.on('error', () => { if (!res.headersSent) res.status(502).send('Expo is starting. Please retry.'); else res.end(); });
      req.pipe(upstream);
    });
    return;
  }
  if (process.env.SERVE_WEB !== 'true') return;
  const web = path.join(artifactsRoot, 'little-sprout/dist');
  if (!existsSync(path.join(web, 'index.html'))) throw new Error('Web build missing. Run pnpm build first.');
  for (const [prefix, relative] of [
    ['/little-sprout-demo', 'little-sprout-demo/dist/public'],
    ['/__mockup', 'mockup-sandbox/dist'],
  ]) {
    const dir = path.join(artifactsRoot, relative);
    app.use(prefix, express.static(dir));
    app.use(prefix, (req, res) => {
      if (path.extname(req.path) || !existsSync(path.join(dir, 'index.html'))) { res.sendStatus(404); return; }
      res.sendFile(path.join(dir, 'index.html'));
    });
  }
  // Expo exports pnpm fonts under assets/__node_modules/.pnpm. These are
  // public build assets, not repository dotfiles; Express otherwise hides them.
  app.use('/assets', express.static(path.join(web, 'assets'), { dotfiles: 'allow' }));
  app.use(express.static(web));
  app.use((req, res) => {
    if (req.method !== 'GET' || path.extname(req.path)) { res.sendStatus(404); return; }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(web, 'index.html'));
  });
}
