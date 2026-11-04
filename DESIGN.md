# DESIGN.md —— 档案馆风格六入口阅读站点设计记录（WEB-01）

本文件是**实现开始前**的设计记录：先写方法与决策，再写代码。它记录设计 skill 的检查过程、
借鉴的成熟方法、视觉语言、信息架构、交互与无障碍决策，以及刻意的取舍。
工单要求「在开始实现前」记录，因此第 1–9 节在 §10 的实现对照之前完成；
后续（MAP-01 等）追加决策时不得删除本节已有内容，只追加带日期的小节。

---

## 1. 设计 skill 检查（实际执行，不是假设）

| 检查目标 | 实际结果 |
|---|---|
| 会话 skill 目录 | 仅有 `diagnose-windows-sandbox-acl`（Windows 沙箱修复），与前端/设计无关 |
| `~/.claude/skills` | 不存在 |
| `~/.codex/skills` | 只有 `.system`：`imagegen`、`openai-docs`、`review-agent`、`skill-creator`、`skill-installer` —— 没有任何 Frontend Design / UI-UX / Design System / Accessibility skill |
| 本机 npm 全局设计工具链 | 无 |

结论：**本环境没有可直接加载的设计类 skill**。因此按工单「研究主流的 Frontend Design、UI/UX、
Design System、Web Accessibility 相关 skill，优先借鉴成熟的设计方法」的要求，
采用 §2 的方法来源，并**不复制**任何 skill 的页面样式。

## 2. 借鉴的成熟方法（只借方法，不借皮肤）

1. **WCAG 2.2 AA 作为可验证底线**：正文对比度 ≥4.5:1、大字 ≥3:1、非文本 UI 边界 ≥3:1、
   全部功能可键盘完成、焦点可见、`prefers-reduced-motion` 尊重、目标尺寸 ≥24px。
   不引用「无障碍通过了」这种无法执行的说法——对比度数值在 §4 逐对列出并可复算。
2. **Editorial / Museum Web Design 的排版优先**：内容先于装饰；用字号级差、行高、栏宽
   （中文每行 28–34 字）建立层级；用编号、图例、说明文字（caption）承担「档案馆元数据」的
   信息密度，而不是用卡片阴影和渐变堆砌。
3. **Design Tokens 分层**：`--pw-*` CSS 自定义属性分为「色板」「字体」「间距/节奏」「圆角/边框」
   「阅读字号」五组；组件只消费 token，不写裸色值。这样后续地图（MAP-01）可以复用同一套色板。
4. **Progressive enhancement / 诚实降级**：内容缺失时不造假数据，显示明确的未加载状态；
   非关键视觉效果（纹理、航线动画）在丢失时不影响阅读。
5. **双视角设计（Historian's perspective）**：日本/盟军使用同一视觉权重与同一证据组件，
   不把一方做成「图例外的颜色」。地图颜色编码在契约里就有 `japan`/`allies` 两种，UI 必须对称呈现。
6. **证据分层设计（Evidence-first UI）**：`fact / interpretation / disputed / schematic`
   四类标签使用**形状 + 文字 + 颜色**三重编码，不单靠颜色区分（色盲可用）。

## 3. 视觉语言：历史档案馆 × 海军作战地图 × 数字博物馆

### 3.1 色板（与 WCAG 实测对比度）

| Token | 值 | 用途 | 实测对比度 |
|---|---|---|---|
| `--pw-paper` | `#f2e8d5` | 旧纸底色（页面主背景） | 正文 `#1c2530` on paper = **12.74:1** |
| `--pw-paper-2` | `#e8dcc3` | 旧纸次级底（侧栏/表头） | `#1c2530` on paper-2 = **11.39:1** |
| `--pw-paper-card` | `#fbf5e9` | 档案卡片 | `#1c2530` = **14.25:1** |
| `--pw-navy-950` | `#141c26` | 深海军蓝（页眉、重点块、深底文字） | paper on navy = **14.12:1** |
| `--pw-navy-800` | `#1c2530` | 正文墨色 | — |
| `--pw-map-green` | `#1f5c4a` | 旧地图绿（活动态、地图绿区） | paper on green = **6.43:1** |
| `--pw-map-green-soft` | `#7fb49c` | 深底上的地图绿 | on navy = **7.28:1** |
| `--pw-brass` | `#7a4e0c` / `#8a5a14` | 黄铜/暗金（强调、编号、分隔） | on paper = **5.91:1 / 4.86:1** |
| `--pw-brass-light` | `#d9b45a` | 深底上的黄铜 | on navy = **8.68:1** |
| `--pw-alert-red` | `#9c2f22` | 克制的红色（争议/警示，仅此用途） | on paper = **6.08:1**；white on red = **7.39:1** |
| `--pw-ink-muted` | `#4a5561` | 次级文字 | on paper = **6.25:1** |
| `--pw-ink-soft` | `#3f4954` | 元数据文字 | on paper = **7.54:1** |

**红绿不混用**：地图绿只表示「地理/基地/地图类语境」与「当前选中」；红只表示「争议」与
「高风险/未解决」。不做「日本=红、盟军=蓝」的常见但带倾向的编码，改用
日本 = 深海军蓝 + 实线；盟军 = 地图绿 + 虚线（形状编码，颜色仅辅助）。

### 3.2 字体（无 CDN，全部系统字体栈）

- 中文正文：`"Noto Serif SC", "Source Han Serif SC", "Songti SC", SimSun, serif` —— 衬线体承担长文阅读。
- UI/元数据/编号：`ui-monospace, "SFMono-Regular", Consolas, monospace` 只用于档案编号、日期、坐标。
- **不引入任何 CDN 字体**（工单硬性要求「no CDN fonts」），因此不写 `@font-face` 外部 URL；
  中文衬线优先本地系统字体，退化为通用 `serif`。这是可读性与离线性之间的取舍，记录在 §8.2。

### 3.3 排版层级

| 层级 | 用法 |
|---|---|
| `.pw-display` | 封面/入口页主标题，最大字号，窄字距 |
| `h2` | 文章/章节标题，带黄铜色编号 `§ 01` |
| `h3` | 小节标题，衬线、稍小 |
| `.pw-lede` | 导语，比正文大 1 档、行高更松 |
| 正文 | `--pw-reading-size`（默认 17px，可调） |
| `.pw-meta` | 档案元数据：ID、日期、来源编号，等宽、小号、次级色 |

### 3.4 装饰（意义优先）

- 页眉用 1px 黄铜分隔线 + 档案编号；不用阴影堆叠。
- 条目编号 `01 / 时间线` 之类来自数据顺序，不是装饰数字。
- 地图网格/经纬刻线仅出现在「地图语境」组件（Atlas 占位、示意图），不铺满整页。

## 4. 信息架构：六入口共享一份数据

六个入口全部是 `content/history.json` 的投影，不各自持有数据：

| 路由 | 数据来源 | 互跳方式 |
|---|---|---|
| `#/timeline` | `events[]`（按 `startDate` 排序） | `relatedEventIds`、`battleId`、`placeIds`、`personIds` |
| `#/battles` | `battles[]`（列表 + 十四类 `sections`） | `commanderIds`、`unitIds`、`equipmentIds`、`conceptIds`、`phases[].eventIds` |
| `#/people` | `people[]`（`profile` + `decisions[]`） | `relatedPersonIds`、`eventIds`、`battleIds`、`placeIds` |
| `#/atlas` | `places[]` + 地图挂载 API | `relatedPlaceIds`、`placeIds` 反向索引 |
| `#/concepts` | `concepts[]`（三层 `layers`） | `relatedEntityIds`（至少 2 个实体） |
| `#/questions` | `questions[]`（按 `historicalPart` 分组） | `entityIds`、`sourceIds`、`claimIds` |

**关键设计决策**：

1. **单一路由解析器** `parseRoute(hash)` → `{ view, id, filter, query }`，所有链接都经由
   `#/<view>[/<entityId>]` 形式生成。页面之间不允许出现「手写 URL」。
2. **反向索引**：为了做到「知道自己在读什么、与什么相关」，渲染前构建从实体 ID 到
   「引用它的时间线事件/战役/人物/问题」的反向索引，实体详情面板底部显示
   「出现在这些时间线/战役/问题中」。
3. **详情面板 = 页面内路由**：`#/battles/battle-midway` 打开同一战役页的详情视图，
   `#/timeline/event-...` 打开事件详情，返回按钮使用 `history.back()` 但不依赖它（也有显式链接）。
4. **当前上下文条**：详情页顶部常驻「时间 / 地点 / 所属部分 / 证据摘要」四个字段，
   满足「用户应始终知道正在读哪个事件、什么时间、什么地点」。
5. **fixture 状态**：`fixtureOnly === true` 时全站顶部常驻高对比横幅，且每个实体标题旁带
   `测试样本` 徽标；数据来源是显式标志，不做文件名猜测。测试样本永远不显示为正式历史。

### 4.1 Atlas 挂载 API（给 MAP-01 的契约）

Atlas 入口**不**自行绘制交互地图，而是提供稳定的挂载点与 props 契约（见 §7 与
`src/features/atlas/mountApi.ts` 的 JSDoc）：

```
<AtlasMount
  containerRef={ref}      // DOM 宿主，地图库在其内部创建画布
  places={places}         // 仅 place-* 真实地理节点，带坐标与精度
  selectedPlaceId={id}    // 选中地点（由路由 #/atlas/<placeId> 决定）
  onSelectPlace={fn}      // 选中回调，由路由层写入 hash
  mediaNote={...}         // 素材/许可说明位置（MEDIA-01 提供前不占位造假）
  // 未来的 phases / timeline 由 MAP-01 扩展，不改变上述字段语义
/>
```

约定：`places` 只来自 contract 的 `places[]`（`schematic` 必须为 `false`）；地图组件
**不得**把 `coordinates` 包装成「舰队精确位置」；阶段位置必须带 `schematic` 与
`uncertaintyNote` 并在 UI 可见（契约 §4.2）。

## 5. 证据与引用组件（本任务核心验收项）

统一组件族：

- `ClaimTag`：`fact`=事实（方形/蓝灰）、`interpretation`=解释（圆角/绿）、
  `disputed`=争议（菱形边框/红）、`schematic`=示意（虚线/黄铜）。**同时**输出中文文字，
  不只用颜色。
- `CitationList`：来源列表，显示机构、标题、年份、访问日期、`sourceType` 徽标、外部链接
  （`rel="noopener noreferrer"`），以及 `reliabilityNote`（「这个来源能/不能支持什么」）。
- `SourceLocator`：每条 claim 的 `locators[]` → 「来源机构 · 定位类型 · 定位文本」，
  定位类型（page / archival-item / section-paragraph …）中文化显示。
- `EvidencePanel`：一节的 `claimIds` + `sourceIds` 合并渲染：「本节证据」逐条 claim
  （带 `ClaimTag`）+ 每条 claim 的 locator + 争议说明（`note`）。
- **小节级证据必须可见**：契约 §3.3 要求 UI 不得只显示页面级来源而隐藏小节级证据，
  所以每一节（文章小节、战役十四类、专题三层、问题答案）都自带 `EvidencePanel`，
  页面级来源只是汇总。

## 6. 交互

- 搜索框（`/` 聚焦）跨六个入口检索标题、摘要、正文、ID；结果分组显示并可直接跳转。
- 筛选：按 `historicalPart`、`claimType`、实体类型。
- 键盘：所有可点元素是真实 `<button>`/`<a>`；详情面板可 `Esc` 关闭；Skip link 直达主内容；
  路由切换后焦点移到页面主标题（`tabIndex=-1`）。
- **阅读字号**：`--pw-reading-size` 由页头按钮调整（14/17/20px 三档），存 `localStorage`，
  同时写回 `document.documentElement`；纯 CSS 变量驱动，不重排结构。
- **可选阅读进度**：`localStorage` 记录每篇文章滚动百分比，时间线/战役列表显示「已读」标记。
- **reduced-motion**：`@media (prefers-reduced-motion: reduce)` 关闭过渡与动画；
  所有动画只用于「状态变化提示」，不承担信息传递。
- 触摸/窄屏：页头导航在 ≤720px 变为可横向滚动的分段导航；正文最大宽度 68ch。

## 7. 目录结构

```
index.html
vite.config.ts            base: '/history_pacific_war/'
tsconfig.json
src/
  main.tsx                入口（React 根）
  styles/tokens.css       设计 token
  styles/app.css          版式与组件样式
  content/
    glob.d.ts             import.meta.glob 的类型声明
    loader.ts             唯一的内容入口：glob eager import content/history.json
    status.ts             ContentStatus: available | missing | invalid | fixture
  data/
    index.ts              索引/反向索引/搜索/分组（纯函数）
    types.ts              契约类型（与 content.schema.json 对齐）
  router/
    route.ts              parseRoute / buildHref / useHashRoute
  components/             ClaimTag / CitationList / SourceLocator / EvidencePanel / …
  features/
    timeline/ battles/ people/ atlas/ concepts/ questions/ search/
  diagrams/               原创 SVG 示意图（内联组件 + 元数据）
  a11y/
    readingSize.ts        阅读字号控制
```

## 8. 取舍记录

### 8.1 为什么不用 UI 框架/CSS 框架

- 工单要求 dependency-light、静态、可长期维护。React + 自写 token CSS 足以表达档案馆风格；
  引入 Tailwind/MUI 会带来「通用卡片模板」的外观与构建体积，正是工单明确不要的。
- 依赖只有 `react`、`react-dom`；构建工具为 Vite + TypeScript。

### 8.2 不引 CDN 字体

中文衬线字体文件通常 1–10MB，且会违反「no CDN fonts」。改用系统字体栈 + 版式结构承担
「档案馆」气质；代价是不同操作系统字形略有差异（记录为已知限制）。

### 8.3 内容缺失时不做假数据

`content/history.json` 由 HIST 模块交付，WEB-01 交付时尚不存在。因此：

- 构建必须成功；
- 六入口必须可导航；
- 页面必须显示**诚实的未加载状态**（说明「内容尚未交付，这不是空白页面」），
  而不是塞入示例历史叙述。fixtures 只用于自动化测试，且必须显示 `测试样本` 状态。

### 8.4 原创示意图放在 `src/`

`public/media` 与媒体登记表由 knowledge 模块 MEDIA-01 拥有，本任务不创建该目录。
本任务需要的示意图（如「证据类型四分类」「六入口共享同一数据集」）是**界面说明性**图形，
直接以 React + inline SVG 写在 `src/diagrams/`，带 `role="img"`、`aria-label`、
可见 图注 与许可说明（原创作品，CC BY-SA 4.0 / 本仓储原创，由本模块自署）。
它们不是历史照片，也不冒充历史照片。

## 9. 验收自检清单（实现后逐条对照）

- [x] 六入口非孤立、共享 ID、可互跳（fixture 与真实内容两种数据都验证）
- [x] 深链 `#/battles/<id>` 在 `/history_pacific_war/` 子路径下可直接打开
- [x] 正文可见 fact/interpretation/disputed/schematic 标签、claim、来源、定位
- [x] 缺内容时诚实未加载状态
- [x] 键盘 / 窄屏 / 阅读字号 / 对比度 / reduced-motion
- [x] `npm run check`（typecheck + 站点验证）与 `npm run build` 真实通过

---

## 10. 实现对照（实现完成后追加）

（见文末「实现记录」；本节在实现完成后补充，不修改上文决策。）

## 11. 实现记录（WEB-01 完成时填写）

### 11.1 实际交付的文件

| 路径 | 作用 |
|---|---|
| `package.json` / `package-lock.json` | 依赖仅 react、react-dom；devDeps：vite 8.3.5、typescript 6.0.3、@vitejs/plugin-react 6.2.1、@types/* |
| `src/main.tsx` | 入口：异步加载内容 → 构建索引 → hash 路由 → 六入口外壳；无内容时渲染 loading/未加载状态 |
| `src/content/loader.ts` | **唯一**历史数据入口；glob eager import `content/history.json`，兼容对象/命名空间/惰性加载三种形态 |
| `src/content/labels.ts` | 契约枚举的界面文案（不是历史内容） |
| `src/data/types.ts` | 与 `content.schema.json` 对齐的类型 |
| `src/data/index.ts` | 索引、**反向索引**、搜索、分组（纯函数，可直接测试） |
| `src/router/route.ts` / `useHashRoute.ts` | hash 路由解析与 `buildHref`（base 无关） |
| `src/components/` | ClaimTag、SourceLocator、CitationList、EvidencePanel、通用排版组件 |
| `src/features/{overview,timeline,battles,people,atlas,concepts,questions,search,sources}/` | 六入口 + 证据总表 + 搜索 |
| `src/features/atlas/mountApi.ts` | **MAP-01 挂载契约**（含硬性规则与路由约定） |
| `src/diagrams/` | 原创 inline SVG 示意图 + 许可元数据 |
| `src/a11y/readingSize.ts`、`readingProgress.ts` | 阅读字号（三档、localStorage）与可选阅读进度 |
| `src/shell/AppShell.tsx` | 页眉/导航/页脚、skip link、路由切换后焦点管理 |
| `src/styles/tokens.css`、`app.css` | 设计 token 与版式；`--pw-reading-size` 由 `[data-reading-size]` 切换 |
| `src/testing/syntheticContractSample.mjs` | 仅测试用的合成契约样本（fixtureOnly=true，全部为「测试占位」文字） |
| `src/tools/build.mjs` | 构建入口（**直接 import `vite.config.ts` 的 `siteConfig`**，不复制任何配置；见 11.5） |
| `vite.config.ts` | 构建配置的**单一事实来源**：`base: '/history_pacific_war/'`、react 插件、build target/outDir/assetsInlineLimit、server port（11.5 记录了曾被误用为 `.mts` 并已纠正） |
| `tsconfig.json`、`index.html`、`.gitignore` | 类型检查配置（**确实覆盖 `vite.config.ts`**）、页面骨架（内联 SVG favicon，不创建 public/ 资产）、忽略 node_modules/dist/.cache/reports |
| `scripts/validate-site.mjs` | 站点验证器：**81 项**（PASS 80 / SKIP 1，其中 10 项为负例）；带 `--dist` 时共 **94 项**（另 13 项构建产物检查） |
| `DESIGN.md` | 本文件 |

### 11.2 与设计阶段的偏差（诚实记录）

1. **构建入口从 `vite build` 改为 `node src/tools/build.mjs`。**
   原因：Vite 8 在 Windows 上解析配置前会执行 `net use`（`optimizeSafeRealPathSync`）。
   本执行环境禁止启动子进程，该调用抛 `spawn EPERM`，导致「failed to load config」
   ——与项目代码无关。构建脚本用同一套 Vite API（`createBuilder` + `buildApp`）内联配置，
   并注入只拦截 `net use` 的 `node:child_process` 替身；其它子进程调用照常转发/报错。
   **在允许子进程的 CI 环境里行为与 `vite build` 等价；但 `npm run build` 本身没有在那种环境下实跑过**，
   这一点记录为限制，不能声称已验证。
2. **配置文件曾用 `.mts` —— 已纠正为 `.ts`（见 11.5）。**
   最初为绕开 Vite 的配置文件打包步骤（该步骤同样触发上述 `net use`）而改用 `.mts`，
   但那超出了工单授权的写入范围（只授权 `vite.config.ts`），属于中央审查标记的
   「preserved out-of-scope untracked file」。恢复轮已改为 `vite.config.ts` 并删除 `.mts`。
3. **`scripts/` 下只新增了 `validate-site.mjs`。** 构建脚本放在 `src/tools/build.mjs`、
   合成样本放在 `src/testing/`，因为本任务的写入范围包含 `src` 但 `scripts/` 只授权了
   `scripts/validate-site.mjs` 一个文件。
4. **额外增加 `#/sources` 证据总表入口（导航第 07 项）。** 六入口本身保持工单规定的六个；
   证据总表不是第七种阅读路径，而是引用/定位的集中呈现（从任意 claim 的 locator 可跳入）。
5. **内容加载改为异步。** 理论上 eager glob 应当内联，但实测生产构建会把 JSON 拆成独立
   chunk 并返回模块命名空间；若按同步对象处理，会把真实内容误判为「结构不符合契约」。
   现在 `main.tsx` 先渲染 loading，再 `await loadContentAsync()`，并同时兼容对象/命名空间/
   惰性加载三种形态（验证器 G7–G10 是这四个分支的回归测试）。
6. **示意图不是历史地图。** 本任务只画界面说明性图形（证据四分类、六入口数据关系、三层解释），
   均标注作者/许可并声明「不是历史照片、历史地图或史料原件」。

### 11.3 实际执行的检查（真实输出摘要）

恢复轮（a2）重新执行，命令与退出码均为真实结果：

```
npm run check   → tsc --noEmit 通过；validate-site.mjs 81 项（PASS 80 / FAIL 0 / SKIP 1）→ 退出码 0
npm run build   → typecheck 通过；vite 8.3.5 构建 46 个模块（含真实内容 chunk）；
                  validate-site.mjs --dist dist 94 项（PASS 94 / FAIL 0）→ 退出码 0
content 契约验证  → --stage strategy：PASS，退出码 0
                    （实体 30；来源 22；claim 110；问题 2；素材 0）
                  默认 full 阶段：FAIL，退出码 1 —— 全部是「后续阶段内容尚未交付」的覆盖缺口，
                  不是结构/断链/证据缺陷（见 11.5）。
```

首轮（a1）另有 jsdom 对真实产物的两组 DOM 冒烟测试（临时脚本，未提交）：无内容时 8 项全过
（含点击「大」字号后 `data-reading-size=large`、hash 导航）；临时放入 fixture 后 12 项全过。

### 11.4 已知限制（不可声称已验收的部分）

- **内容只交付到 strategy 阶段。** `content/history.json` 现在存在且 `fixtureOnly=false`，
  但 `battles[]` 为 0，且 background/pearl/coral/full 阶段的重点文章、必需事件与问题尚未交付，
  因此默认 `full` 阶段验证仍是 FAIL。六入口的非空完整性由 MAP-01 / QA-01 / ACCEPT-01 验收。
- **没有浏览器级测试。** 未安装 Playwright；键盘/触摸/窄屏的真实浏览器回归属于 QA-01。
  jsdom 冒烟测试只能证明挂载与交互逻辑，不能证明视觉布局。
- **对比度是计算值**，不是 axe 实测；axe 严重缺陷为零属于 A11Y-AUDIT 任务。
- **地图只有挂载点与契约**，交互式地图、阶段推演、时间线联动属于 MAP-01。
- **纯 `vite build` 在本受限环境仍然失败**（`spawn EPERM`，见 11.2 第 1 条），
  因此 `npm run build` 走 `src/tools/build.mjs`；该脚本与 CLI 读取**同一份** `vite.config.ts`。
  在标准 CI 中 `vite build` 应当可用，但**本次未在那种环境验证**，不声称已验证。

### 11.5 恢复轮变更（a2）

针对中央审查的 blocker 与本轮新到位的真实内容，本轮的改动与结论：

1. **`vite.config.mts` 已删除，改为授权的 `vite.config.ts`。**
   审查标记的 sha256 `c73af021…8133` 与本地文件一致（已核对）。
   新 `vite.config.ts` 内容等价（base `/history_pacific_war/`、react 插件、
   build target/outDir/assetsInlineLimit、server port），并额外导出 `BASE_PATH` 与
   `siteConfig`，使构建脚本可以复用同一份配置。
2. **配置成为单一事实来源。** `src/tools/build.mjs` 现在 `import { BASE_PATH, siteConfig }
   from '../../vite.config.ts'`，base / plugins / build / server 全部取自该文件，
   不再复制任何设置。改了配置，CLI 构建与 `npm run build` 会同步改变。
   构建日志会打印「配置来源：vite.config.ts」。
3. **`tsconfig.json` 的 `include` 真正覆盖该配置文件。** 这一条立刻生效并抓到一个真实类型错误：
   最初把 `siteConfig` 写成 `as const`，导致 `plugins` 变成 readonly 元组而无法赋给 Vite 的
   `UserConfig`（`TS2769`）。已改为显式标注 `UserConfig`，`tsc` 通过。
   —— 这证明类型检查确实在检查 `vite.config.ts`，而不是只把它列在 include 里。
4. **站点验证器改为在进程内调用内容验证器的公开 API**（`validateDocument`），
   不再 `spawn` 子进程：受限环境里 `spawn` 被拒绝，会让检查报成「内容失败」而不是「没跑成」。
   同时按**内容实际交付阶段**（`SITE_CONTENT_STAGE = 'strategy'`）验证，并把
   非覆盖类错误（结构/断链/证据）与覆盖缺口分开判定：前者判 FAIL，后者作为内容任务范围单独报告。
   在 import 期间静音了验证器自身 CLI 的输出，避免与本验证器的结论混淆。
5. **删除了「import dist 产物做渲染」的不可靠路径。** 该路径在真实内容下无法稳定工作：
   `dist` bundle 顶部的 modulepreload polyfill 与 React DOM 的模块级代码在 import 阶段
   访问浏览器全局（`document` / `MutationObserver` / `navigator`）。与其维护一套脆弱的全局替身，
   改为：渲染契约测试一律从源码做 SSR 打包；产物本身由 `--dist` 的 E 段检查
   （资源存在、子路径、hash 路由、CDN 依赖、体积）与一次性 jsdom 冒烟测试覆盖。
   这是**取舍**，不是修复：产物级渲染没有常驻的自动化回归。

#### 真实内容渲染证据（本轮）

用 `content/history.json`（`fixtureOnly=false`）通过站点真实视图渲染，16 项检查全部 PASS：

```
PASS R1  真实内容不显示测试样本横幅
PASS R2  真实内容不显示未加载状态
PASS R3  时间线渲染真实事件「日本扩大侵华战争：从满洲到全面战争」
PASS R4  人物入口渲染真实人物「山本五十六」
PASS R5  地图入口渲染真实地点「東京（日本帝国首都）」
PASS R6  知识专题渲染真实专题「航空母舰是什么：一座会移动的机场」
PASS R7  历史问题渲染真实问题「日本在 1941 年为什么选择对…」
PASS R8  battles[] 为 0 时诚实显示空状态（非缺陷）
PASS R9  事件详情渲染真实小节标题「从满洲到全面侵华」
PASS R10 事件详情渲染真实 claim（claim-manchuria-1931）
PASS R11 事件详情渲染 claimType 标签
PASS R12 事件详情渲染跨入口互链
PASS R13 人物详情渲染真实决策卡「提出以航母突袭珍珠港，而不是等待美国海军西进」
PASS R14 知识专题详情渲染真实三层
PASS R15 历史问题详情渲染真实答案正文
PASS R16 证据总表渲染真实来源「Foreign Relations of…」
```

另确认构建产物内含真实内容：`dist/assets/history-*.js` 为 112.1 KiB，
含 `fixtureOnly:!1`（即 `false`），且包含 `claim-` / `concept-` / `person-` / `place-` 等真实 ID 前缀。

