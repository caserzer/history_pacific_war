# 太平洋战争：从珍珠港到中途岛（站点模块）

面向 11 岁读者的中文交互历史教材站点（静态站点，GitHub Pages 子路径可用）。
本站点是 DSH 矩阵团队 `experience` 模块的交付物，内容来自同一份共享历史 JSON，
交互地图/时间线/战役/人物/专题/问题与来源证据相互链接。

本文件同时记录 **CI-BOOT-01** 建立的早期 GitHub CI 门禁（`.github/workflows/ci.yml`）
及其验证方式。

## 本地可执行检查

在本仓库根目录执行：

```sh
node --run check     # tsc 类型检查 + 站点契约/渲染校验（scripts/validate-site.mjs）
node --run build     # tsc + 构建站点 + 用构建产物执行 --dist 校验
```

内容门禁（与 CI 中相同，单独执行）：

```sh
node scripts/validate-content.mjs --stage full --media
```

工作流本身用字段级校验器检查（零依赖脚本）：

```sh
node scripts/validate-workflow.mjs            # 校验真实 .github/workflows/ci.yml 的字段/触发/作业/步骤/条件 e2e
node scripts/validate-workflow.mjs --self-test # 用内存对象验证负例（检查器本身有牙齿）
```

> 校验器不是「整文件子串匹配」：它把 YAML 解析成结构，再断言键、值、类型、步骤顺序与
> 条件表达式；缺失 `ci` 作业、错误触发、Node 非 24、缺 `npm ci`、缺内容门禁、
> 缺条件 e2e 的负例都会 FAIL。

## 早期 `ci` 门禁（本任务）

`.github/workflows/ci.yml` 的职责：

- 触发：`pull_request`，以及 `push` 到 `main`。
- 检查名：单个 job，**job id 与 name 都是 `ci`** → GitHub 上 `github-actions` 的检查名为 `ci`。
- 运行环境：`ubuntu-latest`；`actions/setup-node` 使用 **Node 24**（与 `engines.node >= 24` 一致）。
- 步骤顺序：`npm ci` → `node scripts/validate-content.mjs --stage full --media` →
  `node --run check` → `node --run build`。
- 条件 e2e：每次运行都从 `package.json` 检测是否登记 `test:e2e`：
  - **存在** → 安装 Playwright Chromium 与 WebKit（`npx playwright install --with-deps chromium webkit`）
    并运行 `npm run test:e2e`；该步骤失败会使 `ci` job 失败。
  - **不存在** → 输出明确的 `::notice` 与说明（显式、可审计，不是静默跳过），
    并声明不声称任何 e2e 结果。
  - 该条件在每次运行时重新判断，因此 QA-01 合并 `test:e2e` 后会**自动生效**，
    不需要再改工作流。
- 安全与边界：权限最小化为 `permissions: contents: read`；设置 `concurrency`
  （同分支新运行取消旧运行）；**不使用** `pull_request_target`；**不包含** Pages build/deploy、
  发布或验收步骤。

### 当前候选的事实

- 截至本任务候选，`package.json` **没有** `test:e2e`（QA-01 尚未合并），
  因此 CI 中实际执行的是「e2e 缺失」分支；工作流已按未来 `test:e2e` 存在的情形写好。
- 本地无法运行 GitHub Actions（无 runner、本任务不 push）；远程 CI 是否通过由中央集成服务
  在获得授权后执行并作为权威证据，本任务**不声称远程 CI 已通过**。

## 早期 ci 与后续 Pages 发布的职责分离

| 职责 | 归属 |
| --- | --- |
| 早期 CI 门禁（内容门禁 + `node --run check` + `node --run build` + 条件 e2e），检查名 `ci` | 本任务 **CI-BOOT-01**（`.github/workflows/ci.yml`） |
| Pages build/deploy 工作流、部署权限与环境、发布产物 | 后续 **SHIP-01**（本任务不创建 `pages.yml`，也不在 `ci.yml` 中部署） |
| 推送、创建/更新 PR、远程 CI 运行、合并 | 中央集成服务（worker 不执行 Git 写操作） |

## `.gitignore` 与工作流可提交性

`ci.yml`（以及后续 SHIP-01 的 Pages 工作流）必须能被 Git 提交。当前 `.gitignore`
没有任何忽略 `.github` 的规则，并额外加入防御性否定式，防止未来新增的通配忽略规则
（例如忽略所有点文件）连带忽略工作流。

验证方法（在仓库根目录执行）：

```sh
# 1) 不应被忽略：无输出且退出码 1（1 表示"未被忽略"）
git check-ignore -v .github/workflows/ci.yml

# 2) 应能在 git status 中看到工作流文件
git status --short -- .github/workflows/ci.yml
```

第一条命令若输出了 `.gitignore:行号:pattern`，说明 `.github` 又被忽略了，必须修正
`.gitignore` 后再提交。CI-BOOT-01 交付时实测：`git check-ignore -v` 无输出、
`git status` 可见 `.github/workflows/ci.yml`。

## 目录结构（摘要）

- `src/` — 站点组件、路由、数据索引、地图引擎、无障碍工具（内容与代码分离）
- `scripts/validate-site.mjs` — 站点契约与渲染校验器（PART 1 解析/派生、PART 2 渲染断言）
- `scripts/validate-content.mjs` — 内容契约门禁（`--stage`/`--media`）
- `scripts/validate-workflow.mjs` — CI 工作流字段级校验器（`--self-test` 负例自证）
- `content/history.json` — 共享历史内容（由内容模块交付）
- `contracts/` — 已接受的契约 schema、夹具与覆盖矩阵
- `.github/workflows/ci.yml` — 早期 CI 门禁（检查名 `ci`）
