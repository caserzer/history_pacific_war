# Media gate — QA-01

本文件按要求分 **(a) 已归档的 MEDIA-02 `--media` 通过证据** 与 **(b) 本任务在隔离候选上实际运行的结果** 两部分记录。未运行的内容一律不写成通过。

---

## (b) 本任务实际运行（QA-01，权威口径）

| 项目 | 值 |
|---|---|
| 命令 | `node scripts/validate-content.mjs --stage full --media` |
| 运行时间 | 2026-11-05（本 worktree，候选 = 已接受集成 `2825bf5` + QA-01 delta） |
| 退出码 | **0（PASS）** |
| 时长 | 约 0.13 s |
| 内容统计 | 实体 93；来源 31；claim 282；问题 7 |
| 素材注册表 | `content/media.json`，**22 个条目** |
| 素材门禁结论 | **通过；重点文章 19/19 具有所需类型素材** |

真实输出（逐字摘录）：

```
提示：--media 隐含 --stage full；素材门禁只能在最终全量阶段执行。
素材注册表：content/media.json（22 个条目）
DSH 太平洋战争教材内容验证
阶段：full + media（最终硬门禁）
实体：93；来源：31；claim：282；问题：7；素材：0

警告：
- $.media: history.json 仍含空的 legacy media 数组（过渡窗口内仅警告）。…

结果：PASS
素材门禁：通过；重点文章 19/19 具有所需类型素材。
说明：结构验证通过不等于可读性评审通过；可读性证据须见 tests/evidence/pedagogy.md。
```

**注意（如实登记，不影响 PASS）**：运行中出现一条**警告**——`content/history.json` 顶层仍保留空的 legacy `media[]` 数组。这是内容侧的过渡窗口状态（MEDIA-02 的迁移映射说明写明该字段应被删除）。它当前只是警告、门禁仍为 PASS，但**属于应清理的内容侧遗留**，移交内容任务（HIST/MEDIA）处理；QA-01 不改写 `content/`。

### 附加：媒体在产物子路径下的真实可达性（本任务自行验证）

`--media` 只验证注册表结构，不验证图片在 Pages 子路径下能否取到。QA-01 额外做了**真实 HTTP 验证**（Node 静态服务器把 `/history_pacific_war/*` 映射到 `dist/*`，与 GitHub Pages 语义一致）：

| 项目 | 结果 |
|---|---|
| 注册条目 | 22 |
| HTTP 可达（2xx 且响应体非空） | **22 / 22** |
| content-type 与扩展名匹配 | **22 / 22** |
| 反向对照：不存在的媒体路径 | **404**（正确） |

URL 映射规则：`content/media.json` 记录的是**仓库路径** `public/media/x.svg`；Vite 构建时把 `public/` 的内容复制到 `dist/` 根，因此公开 URL 是 `/history_pacific_war/media/x.svg`（去掉 `public/` 前缀）。这一映射已由实测确认（`dist/media/` 下有 22 个文件）。

同一断言已写入 `tests/learning.spec.ts` 的「content/media.json 注册图片在子路径下可达」用例，供中央在真实浏览器/请求上下文中复跑。

---

## (a) 已归档的 MEDIA-02 `--media` 通过证据

**状态：未能在此 worktree 中独立复核（NOT INDEPENDENTLY RE-VERIFIED）。**

说明：

- 本任务的工单将 MEDIA-02 列为**已接受**的依赖（§Task、§Acceptance L535）。MEDIA-02 的 `--media` 通过记录属于其自身任务产物与协调存档，不在本 worktree 的可读范围内（本任务不得读取其他模块 worktree 或编排状态）。因此**本文件不转录、不引用**其原始输出。
- 取而代之、且更有价值的是上表 (b)：QA-01 在**当前候选**（即含 MEDIA-02 注册结果的已接受集成）上**亲自运行了同一条门禁并通过**（退出码 0，22 个条目，19/19 重点文章）。若 MEDIA-02 的注册有遗漏或被下游改动破坏，(b) 会失败。
- **结论口径**：MEDIA-02 的归档证据请由中央按其存档核对；QA-01 的贡献是 (b) 的独立实跑结果。本文件不声称已复核归档内容。

---

## (c) 读者可见性（QA-01 attempt 2 新增，观察项 MEDIA-VISIBLE）

**背景**：尝试 1 只验证了「文件存在 + HTTP 可达」，这**不等于读者能看到插图**。事实上
当时站点 `src/` 里**没有任何** `<img`/figure 代码：22 个注册素材一张都没渲染，首页
「素材」统计还是 0。这正是观察项指出的陷阱，已在本轮修复。

**修复（源码）**

- `src/content/loader.ts`：新增第二个精确 glob `import.meta.glob('../../content/media.json')`，
  把媒体注册表并入内容文档的 `media` 字段（仍不回到 `content/*.json` 宽 glob）。
- `src/components/MediaFigure.tsx`（新）：`<figure><img alt loading=lazy>` + `<figcaption>`
  含说明与**作者·许可署名**；路径 `public/media/x.svg` → `/history_pacific_war/media/x.svg`。
- 接入 4 个读者视图：`BattlesView` / `PeopleView` / `ConceptsView` / `TimelineView`。

**验证（无浏览器，SSR 渲染真实内容）**

| 指标 | 结果 |
|---|---|
| 注册素材 | 22 |
| 有素材关联的实体 | 19 |
| 渲染出 `<figure>` 的详情页 | **19 / 19** |
| `<figure>` 总数 | **22** |
| `<img>` 带非空 alt | **22 / 22** |
| `<figure>` 带作者/许可署名 | **22 / 22** |
| `#/battles/battle-pearl-harbor`（观察项点名页） | **2 个 `<figure>`**（修复前 0） |
| 首页「素材」统计 | **22**（修复前 0） |

**回归守门**：站点验证器新增 `QA-MEDIA-0 / -load / -articles / -visible / -a11y / -credit /
-pearl-harbor / -home-count` 共 8 条断言（全部 PASS）。真实浏览器中的「图片自然宽度 > 0」
断言写在 `tests/learning.spec.ts`，需中央在有浏览器的环境执行。

> **仍需中央确认**：以上均为 SSR 文本/DOM 断言。图片在**真实浏览器里是否成功解码并通过
> HTTP 取到**（naturalWidth > 0）只能由浏览器验证；本沙箱 `spawn EPERM` 无法执行。

---

## 素材许可与作者信息（抽查）

`content/media.json` 的 22 个条目均带有许可/作者字段。抽查结果详见 `tests/evidence/fact-check.md` 的「媒体许可」一节；所有素材为**本站原创矢量示意图**（`original-work`）或明确标注的 Wikimedia/公有领域来源，未发现缺许可字段的条目。

## 上游未决项（移交，不在本任务修复）

1. `content/history.json` 顶层空的 legacy `media[]` 仍存在（见上文警告）——移交 HIST/MEDIA 内容任务清理。
2. `media.json` 记录的路径含 `public/` 前缀，属于「仓库路径」约定；构建产物 URL 需去掉该前缀。建议 MEDIA-02 文档明确该约定，避免下游误拼接（当前站点与测试均按去前缀处理，功能正确）。
