/**
 * QA-01 Playwright 配置 —— 真实浏览器 / 可访问性 / 交互回归。
 *
 * 设计要点（对应 QA-01 验收）：
 * 1. **Pages 子路径**：站点以 `/history_pacific_war/` 为 base 构建，因此测试通过
 *    `page.goto('/history_pacific_war/…')` 访问；本地由 `webServer` 静态托管 `dist`，
 *    并把 `/history_pacific_war/*` 映射到 `dist/*`，与 GitHub Pages 的路径语义一致。
 * 2. **多视口**：桌面 / 平板 / 手机各一个项目；Chromium 与 WebKit 都要跑（至少一个
 *    WebKit 项目必须真实执行）。
 * 3. **无外部网络**：只依赖 `dist` 静态服务；不启动任何远程头像 / IP 服务。
 * 4. **测试只读**：测试不写 `content/`、`public/`、`contracts/`。
 *
 * 关于浏览器二进制：本沙箱禁止创建子进程（`spawn EPERM`），浏览器无法启动；
 * 中央环境安装 Chromium/WebKit 后由记录检查 `npm.cmd run test:e2e` 执行。
 */
import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

/** GitHub Pages 仓库子路径（与 vite.config.ts 的 base 一致）。 */
export const BASE_PATH = '/history_pacific_war/';

/** 本地静态服务端口（仅本地；中央可用 PLAYWRIGHT_BASE_URL 覆盖）。 */
const PORT = Number(process.env.PW_STATIC_PORT ?? 4173);

/**
 * `dist` 静态服务：把 `/history_pacific_war/<x>` 映射到 `dist/<x>`。
 * 内置实现（Node http）而不是依赖额外包，保证 `npm ci` 后即可运行。
 */
const STATIC_SERVER = path.join(ROOT, 'tests', 'support', 'serve-dist.mjs');

export default defineConfig({
  testDir: path.join(ROOT, 'tests'),
  // 证据用：失败时保留 trace/screenshot，便于中央审阅。
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['json', { outputFile: path.join(ROOT, 'test-results', 'results.json') }],
  ],
  outputDir: path.join(ROOT, 'test-results'),
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}${BASE_PATH}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    // 站点无外部依赖；任何对外请求都应被视为缺陷（见 tests 中的网络断言）。
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    // ---------------------------------------------------------------- 桌面（Chromium）
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    // ---------------------------------------------------------------- 平板（Chromium）
    {
      name: 'chromium-tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 834, height: 1112 }, hasTouch: true },
    },
    // ---------------------------------------------------------------- 手机（Chromium）
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 7'] },
    },
    // ---------------------------------------------------------------- WebKit（桌面）
    // 验收要求「至少一个 WebKit 项目实际执行」。若运行环境缺少 WebKit 二进制，
    // Playwright 会以「浏览器未安装」失败；测试侧用 tests/learning.spec.ts 中的
    // WebKit 探针记录实际是否执行（见 tests/evidence/browser-matrix.json）。
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } },
    },
    // ---------------------------------------------------------------- WebKit（手机）
    {
      name: 'webkit-mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `node "${STATIC_SERVER}" --dist dist --port ${PORT} --base ${BASE_PATH}`,
        url: `http://127.0.0.1:${PORT}${BASE_PATH}`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
