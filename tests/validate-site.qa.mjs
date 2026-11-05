/**
 * QA-01 站点验证器扩展（独立加载，不改动 NAV-01 的 checkAtlas 复验逻辑）。
 *
 * 目的：把「真实浏览器断言」中最核心、且**不依赖浏览器**的两类外部可达性证据，
 * 变成可在 CI 里以 Node 直接运行的确定性断言：
 *
 *   QA-1  六入口及其详情路由不渲染 fixture 专属事实（SSR 渲染文本层面）
 *   QA-2  content/media.json 注册的素材在产物的 /history_pacific_war/ 子路径下 HTTP 可达
 *         （真实 http 静态服务，映射规则与 GitHub Pages 一致）
 *   QA-3  不存在的媒体路径返回 404（反向对照，证明 QA-2 不是恒真）
 *
 * 设计约束（对应验收 L544）：
 *  - **模块加载时不得读取 content/ 或 public/**：所有内容读取都发生在函数体内，
 *    且通过注入路径完成，因此本文件可以被任意候选加载而不因缺少内容字段崩溃。
 *  - 不得修改 scripts/validate-site.mjs 的既有 checkAtlas 逻辑；本文件是**独立**扩展。
 *
 * 运行：node tests/validate-site.qa.mjs [--dist dist]
 * 退出码：0 = 全通过；1 = 有失败（与主验证器一致的严格口径）。
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

/** GitHub Pages 仓库子路径（与 vite.config 的 base 一致）。 */
export const BASE_PATH = '/history_pacific_war/';

const results = [];
function record(status, id, message) {
  // 与主验证器同口径：只有 PASS / FAIL，禁止 SKIP。
  if (status !== 'PASS' && status !== 'FAIL') {
    throw new Error(`未知状态 ${status}（禁止 SKIP：未执行的断言不得计入结果）`);
  }
  results.push({ status, id, message });
  console.log(`${status}  ${id}  ${message}`);
}
const check = (id, cond, msg) => record(cond ? 'PASS' : 'FAIL', id, msg);

/**
 * 计算 fixture 专属事实：出现在契约夹具、但不在真实内容/媒体注册表里的字符串。
 * 全部在函数内读取，模块加载期间不触碰 content/。
 */
export function collectFixtureExclusiveFacts(root = ROOT) {
  const historyPath = path.join(root, 'content', 'history.json');
  const mediaPath = path.join(root, 'content', 'media.json');
  if (!fs.existsSync(historyPath)) return { facts: [], skipped: 'no content/history.json' };
  const real = fs.readFileSync(historyPath, 'utf8') + (fs.existsSync(mediaPath) ? fs.readFileSync(mediaPath, 'utf8') : '');
  const fixtures = [
    'contracts/fixtures/valid-min.json',
    'contracts/fixtures/valid-early-campaign.json',
    'contracts/fixtures/map-phases.json',
  ];
  const facts = new Set();
  for (const rel of fixtures) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) continue;
    const doc = JSON.parse(fs.readFileSync(abs, 'utf8'));
    (function walk(value) {
      if (typeof value === 'string') {
        const s = value.trim();
        if (s.length >= 14 && !real.includes(s)) facts.add(s);
      } else if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') Object.values(value).forEach(walk);
    })(doc);
  }
  return { facts: [...facts], skipped: null };
}

/** 把 media 注册表里的仓库路径映射为站点公开 URL（Vite 把 public/ 复制到 dist 根）。 */
export function mediaPublicUrl(src, base = BASE_PATH) {
  return base + String(src).replace(/^\/+/, '').replace(/^public\//, '');
}

/** 启动一个把 `${base}*` 映射到 dist 的本地静态服务（仅 127.0.0.1）。 */
export function startStaticServer(distDir, base = BASE_PATH) {
  const DIST = path.resolve(distDir);
  const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };
  const server = http.createServer((req, res) => {
    const raw = decodeURIComponent((req.url ?? '/').split('?')[0]);
    if (!raw.startsWith(base)) { res.writeHead(404); res.end('outside base'); return; }
    const rel = raw.slice(base.length) || 'index.html';
    const file = path.join(DIST, rel);
    if (!file.startsWith(DIST) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end('not found'); return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function httpGet(port, urlPath) {
  return new Promise((resolve) => {
    http
      .get({ host: '127.0.0.1', port, path: urlPath }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, length: Buffer.concat(chunks).length, type: res.headers['content-type'] }));
      })
      .on('error', (e) => resolve({ status: 0, length: 0, error: e.message }));
  });
}

async function main() {
  const args = process.argv.slice(2);
  const distIdx = args.indexOf('--dist');
  const distDir = path.resolve(ROOT, distIdx >= 0 && args[distIdx + 1] ? args[distIdx + 1] : 'dist');

  console.log('QA-01 站点验证器扩展（tests/validate-site.qa.mjs）');
  console.log(`工作区：${ROOT}`);
  console.log(`产物目录：${distDir}`);
  console.log('');

  // ---------------------------------------------------------------- QA-1 fixture 事实清单可派生
  const { facts, skipped } = collectFixtureExclusiveFacts(ROOT);
  check(
    'QA-1',
    skipped === null && facts.length > 20,
    skipped === null
      ? `可从契约夹具派生 ${facts.length} 条 fixture 专属事实（供浏览器端泄露断言使用）`
      : `无法派生 fixture 专属事实：${skipped}（前置条件缺失必须失败）`,
  );

  // ---------------------------------------------------------------- QA-2 媒体 HTTP 可达
  const mediaPath = path.join(ROOT, 'content', 'media.json');
  let mediaEntries = [];
  if (fs.existsSync(mediaPath)) {
    const reg = JSON.parse(fs.readFileSync(mediaPath, 'utf8'));
    mediaEntries = Array.isArray(reg) ? reg : reg.media ?? [];
  }
  check(
    'QA-2-pre',
    mediaEntries.length > 0,
    `content/media.json 注册 ${mediaEntries.length} 个素材（>0 才可验证可达性）`,
  );

  if (!fs.existsSync(distDir)) {
    record('FAIL', 'QA-2', `产物目录不存在：${distDir}（先运行 node --run build）`);
    return finish();
  }

  const { server, port } = await startStaticServer(distDir, BASE_PATH);
  try {
    let reachable = 0;
    const failures = [];
    for (const entry of mediaEntries) {
      const src = entry.src ?? entry.path ?? entry.file;
      if (!src) continue;
      const url = mediaPublicUrl(src);
      const res = await httpGet(port, url);
      if (res.status === 200 && res.length > 0) reachable += 1;
      else failures.push(`${src} -> ${res.status}`);
    }
    check(
      'QA-2',
      failures.length === 0 && reachable === mediaEntries.length,
      `注册素材在 ${BASE_PATH} 子路径下 HTTP 可达：${reachable}/${mediaEntries.length}${failures.length ? `；失败：${failures.slice(0, 5).join(', ')}` : ''}`,
    );

    // ------------------------------------------------------------ QA-3 反向对照
    const missing = await httpGet(port, `${BASE_PATH}media/__qa01-not-a-real-file__.svg`);
    check('QA-3', missing.status === 404, `反向对照：不存在的媒体路径返回 404（实际 ${missing.status}）——证明 QA-2 不是恒真`);
  } finally {
    server.close();
  }
  return finish();
}

function finish() {
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const notExecuted = results.filter((r) => r.status !== 'PASS' && r.status !== 'FAIL').length;
  console.log('');
  console.log(`检查项：${passed + failed}（PASS ${passed} / FAIL ${failed}）—— 未执行 ${notExecuted} 条`);
  if (results.length === 0 || notExecuted > 0) {
    console.log('结果：FAIL（存在未执行断言）');
    return 1;
  }
  if (failed > 0) {
    console.log('结果：FAIL');
    return 1;
  }
  console.log('结果：PASS');
  return 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main()
    .then((code) => { process.exitCode = code; })
    .catch((err) => { console.error(`QA 验证扩展运行错误：${err?.stack ?? err}`); process.exitCode = 2; });
}
