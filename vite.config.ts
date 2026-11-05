/**
 * Vite 配置 —— 构建配置的**单一事实来源**。
 *
 * 任何构建路径（`vite build` CLI、`vite dev`、`src/tools/build.mjs`）都从这里读取
 * base / 插件 / build / server 设置，不允许任何脚本再复制一份配置。
 *
 * 关于 `npm run build`：它调用 `node src/tools/build.mjs`，而不是直接 `vite build`。
 * 该脚本用 Node 原生 ESM 静态导入本文件，**绕过 Vite 的配置文件打包步骤**
 * （见下方「为什么」），并把同一份配置传给 Vite API。原因：
 *   Vite 8 在 Windows 上解析配置时会先执行一次 `net use`（内部
 *   optimizeSafeRealPathSync），随后才打包配置文件；在禁止启动子进程的受限环境里
 *   这一步抛 `spawn EPERM`，表现为「failed to load config」。这是环境限制，
 *   与配置内容无关 —— 本文件本身是标准、可直接被 `vite build` 使用的配置。
 *
 * 因此：在允许子进程的环境（正常的 CI）中，`vite build` 与本文件的语义完全一致；
 * 在受限沙箱中则由 build.mjs 用同一份配置完成同一次构建。
 */

import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** GitHub Pages 仓库子路径。资源路径与 hash 路由都必须工作在这个 base 之下。 */
export const BASE_PATH = '/history_pacific_war/';

/**
 * 站点构建配置（被 src/tools/build.mjs 直接导入复用）。
 * 显式标注为 UserConfig，使 build.mjs 与本文件共用同一份类型约束。
 */
export const siteConfig: UserConfig = {
  base: BASE_PATH,
  plugins: [react()],
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
    assetsInlineLimit: 2048,
  },
  server: {
    port: 5173,
  },
};

export default defineConfig(siteConfig);
