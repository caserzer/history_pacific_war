/**
 * 极简静态服务器：把 GitHub Pages 的子路径语义复刻到本地。
 *
 *   GET /history_pacific_war/<x>  →  dist/<x>
 *   GET /history_pacific_war/     →  dist/index.html
 *
 * 为什么不用现成包：`npm ci` 后必须零额外依赖即可运行（QA-01 不得引入远程服务）。
 * 只监听 127.0.0.1，不对外暴露。
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

function parseArgs(argv) {
  const out = { dist: 'dist', port: 4173, base: '/history_pacific_war/' };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === '--dist' && value) { out.dist = value; i += 1; }
    else if (key === '--port' && value) { out.port = Number(value); i += 1; }
    else if (key === '--base' && value) { out.base = value.endsWith('/') ? value : `${value}/`; i += 1; }
  }
  return out;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const { dist, port, base } = parseArgs(process.argv.slice(2));
const DIST_ROOT = path.resolve(dist);

if (!fs.existsSync(DIST_ROOT)) {
  console.error(`[serve-dist] dist 目录不存在：${DIST_ROOT}（请先运行 node --run build）`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const rawPath = decodeURIComponent((req.url ?? '/').split('?')[0]);

  if (rawPath === '/' || rawPath === '') {
    // 帮助：让根路径也给出站点入口，便于人工排查。
    res.writeHead(302, { location: base });
    res.end();
    return;
  }

  if (!rawPath.startsWith(base)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`outside base ${base}`);
    return;
  }

  const rel = rawPath.slice(base.length);
  const target = path.join(DIST_ROOT, rel || 'index.html');

  // 防止路径穿越：解析后必须仍在 dist 内。
  if (!target.startsWith(DIST_ROOT)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }

  let file = target;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');

  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
    return;
  }

  const type = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(fs.readFileSync(file));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[serve-dist] ${DIST_ROOT} → http://127.0.0.1:${port}${base}`);
});
