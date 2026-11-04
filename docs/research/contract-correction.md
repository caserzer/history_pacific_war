# 契约修正记录（ARCH-02 attempt 5）

状态：**本文件记录 ARCH-02 对 ARCH-01 契约的修正与本次 attempt 5 的处置**。这不是实现声明：没有任何文章、地图阶段或素材因本任务而交付。本任务**不编辑** `content/history.json`、**不创建** `content/media.json`、**不改** `public/`；`content/media.json` 由 MEDIA-02 写入。

## 0. 候选基座与实测环境（先看这一节）

| 项目 | 值 |
|---|---|
| 已接受集成（候选基线） | `df6ae36`（ARCH-01 契约 + HIST-00 内容） |
| 工作树上下文提交 | `60af4d2`（本任务工作树起点；本任务 delta 以未提交改动留在工作树，按开发政策不由本任务 commit/merge/push） |
| 候选内容事实 | `content/history.json`：4 个 strategy 事件（`event-japan-expansion-china`、`event-us-oil-embargo-1941`、`event-japan-war-decision-1941`、`event-overview-part-1-why-war`）、2 个问题、22 个来源、110 条 claim、空 `media: []`、`fixtureOnly=false`。**没有**早期扩张/战役/地图阶段内容；**没有** `event-darwin-air-raid-1942`；**没有** `event-doolittle-raid-1942` |
| `content/media.json` | **不存在**（由 MEDIA-02 首次交付） |
| 本轮验证器 | `scripts/validate-content.mjs`，Node 24，无 npm 依赖 |

**本候选上的真实命令输出（2026 实测，逐字/退出码）**：

| 命令 | 结果 | 退出码 |
|---|---|---:|
| `node scripts/validate-content.mjs --self-test` | `自测结果：151/151 通过` | **0** |
| `node scripts/validate-content.mjs --check-contracts` | `PASS 文档声明的自测项数与实际一致（151 项…）` … `结果：PASS（契约文件一致；这不代表 content/history.json 已交付）` | **0** |
| `node scripts/validate-content.mjs --stage strategy` | `结果：PASS`（仅含 history 空 media 的迁移提示） | **0** |
| `node scripts/validate-content.mjs --stage background` | `结果：FAIL（11 个错误）`（缺 9 个 background 事件 + part-3 导读 + part-3 问题；HIST-01 未交付） | **1**（预期，不是契约缺陷） |
| `node scripts/validate-content.mjs --media` | `[media] 素材注册表不存在：content/media.json …`（并打印期望结构、迁移映射、MEDIA-02 负责写入；`--stage` 门禁不受影响） | **1**（预期，MEDIA-02 未交付） |

**自测纯度实测（F1 的直接证据）**：把 `contracts/` 与 `scripts/` 复制到一个**没有 `content/`、没有 `docs/`、没有 `public/`** 的隔离目录后运行 `node scripts/validate-content.mjs --self-test`，仍为 `自测结果：151/151 通过`、exit 0。同一隔离目录里 `--check-contracts` 因缺少 `docs/research/coverage.md` 而按设计报 `self-test-count-drift`（exit 1），说明真实文档同步检查只存在于 `--check-contracts`，不在 `--self-test`。隔离目录用完即删除，不在工作树留下产物。

## 1. 本轮（attempt 5）被否决缺陷 F1–F5 的处置

| 缺陷 | 问题 | 本轮处置 | 证据 |
|---|---|---|---|
| **F1（高）** 自测依赖真实内容/文档 | `--self-test` 的 5 个旧项读取 `content/history.json` 与 `docs/research/*.md`，结果随 `content/` 变化，违背 coverage.md 的声明 | **逐项删除**下列 9 个旧自测项（见 §2）；新增证据全部来自**构造的内存文档**（夹具克隆 + 内存文件系统）；D7 真实文档同步检查移入 `--check-contracts` | §0 纯度实测：无 `content/`、无 `docs/`、无 `public/` 时 151/151、exit 0；`grep` 审计：自测代码只读 `contracts/fixtures/*`、`contracts/coverage.json`、`contracts/requirements.json`、验证器自身源码 |
| **F2（高）** `researchStatus` 从未被强制 | `researchStatusErrors` 只在字段存在时校验枚举；`--real-content` 的 researchStatus/矛盾分桶永不失败，“自 HIST-01 起生效”没有真实运行支撑 | ① `researchStatus` 改为**严格规则**：早期战役事件缺少该字段即具名错误（`coverage.earlyCampaign.researchStatus` 声明，自 HIST-01 起生效）；② 删除依赖真实内容的 `--real-content` 诊断模式与“在真实内容事件上触发”的正向探针；③ 新增**构造文档**正向探针与缺失负例 | 自测 `ARCH-02 R3 researchStatus 在早期战役事件上被强制要求（F2 具名负例）`、`ARCH-02 R3 研究过程措辞正向探针：构造合规文档注入措辞后被具名拒绝（构造内存文档）` |
| **F3（高）** 文档把 HIST-01 输出写成事实 | 候选没有 HIST-01 内容，README/coverage.md/本文件却声称 8 个旧五键、达尔文矛盾、`内容待 HIST-00` 等 | 重写 README §0/§0.1/§4.1/§8/§9.5/§11、coverage.md §0/§1/§4/§9/§10/§12、本文件全篇：只写本候选实测事实；HIST-00 已交付战略背景、HIST-01 才交付扩张内容；不再声称达尔文矛盾在候选/已集成内容中真实存在 | 文档与本文件 §0 表格；`--stage strategy`=0、`--stage background`=1 的真实退出码 |
| **F4（高）** 过渡豁免仍在门禁中生效、`requiredElements` 未检查正文、`legacyDisabledBy` 错误 | `earlyCampaignDepthErrors` 在 `enforcement==='transition'` 时接受旧五键；`requiredElements` 只在契约里声明；`legacyDisabledBy=ARCH-02-flip` | ① `legacyAnalysis.enforcement` 恒为 `off`、`legacyDisabledBy` 改为 **`HIST-01`**，契约检查拒绝任何其它值；验证器**始终**拒绝旧五键（保留逐键迁移诊断）；② 新增 `elementMarkers`：`requiredElements` **逐键逐要素检查正文**；③ 跨章节矛盾改为始终严格（`crossChapterContradiction.enforcement='strict'`），删除 warn 过渡；④ 移除 `contentTransition` 与 `earlyCampaign.analysisKeys`（旧五键兼容只由 `legacyAnalysis` 开关表达） | 自测：旧五键逐阶段被拒、enforcement/legacyDisabledBy/elementMarkers 负例、必含要素逐键负例；`--check-contracts` 打印 `旧五键开关=off，legacyDisabledBy=HIST-01，门禁无过渡豁免` |
| **F5（中）** 本文件列不出删除项、还声称 “--real-content 8 处可复现”、计数自相矛盾（135 vs 153） | 见 attempt 4 的文档 | **重写本文件**：逐项列出删除的自测项（§2）；不再出现 `--real-content` 的“8 处违规可复现”断言；全文只有一个计数（`SELFTEST_COUNT=151`）；记录实际输出、退出码、基线提交、首次生效任务与已落地/未落地项（§3–§7） | 本文件；`--check-contracts` 的 D7 同步 PASS |

## 2. 删除/改写的自测项（逐项）

### 2.1 删除（9 项，全部因“依赖真实内容/文档/已删除模式”或“transition 豁免必须移除”）

| # | 自测项（原文） | 删除原因 |
|---:|---|---|
| 1 | `TEAM-PILOT 证据存档存在且 planHash 与工单一致` | 读取 `docs/research/team-pilot-evidence.json`；自测不读 `docs/`（验收 1）。工单证据存档仍保留在仓库，需要审计时直接读 |
| 2 | `ARCH-02 a3 早期战役与 researchStatus 检查不依赖 stage（五阶段对照，基座自适应）` | 读取 `content/history.json`（验收 1/2 明确要求删除“五阶段对照”） |
| 3 | `ARCH-02 a3 --real-content 验收阶段是 background 而非 strategy` | 针对已删除的 `--real-content` 模式（验收 2 要求删除 a3 的 `--real-content` 阶段对照自测） |
| 4 | `ARCH-02 a3 researchStatus 正向探针在真实内容事件上触发（D3）` | 读取 `content/history.json`；改为构造文档探针（见 2.2） |
| 5 | `ARCH-02 a3 文档中的达尔文案例存在性表述与当前基座一致（D1 防再次错报）` | 读取 `docs/research/contract-correction.md` 与 `content/history.json`；自测不读 docs/、content/（验收 1） |
| 6 | `ARCH-02 a4 阶段无关性测试在无 HIST-01 的基座上也运行且标注 SYNTHETIC` | 读取 `content/history.json`；其目标由构造文档版阶段无关性测试取代 |
| 7 | `ARCH-02 a4 无早期战役内容时 --real-content 判定为 not-verifiable（不得空洞 PASS）` | 针对已删除的 `--real-content` 三态模式 |
| 8 | `ARCH-02 a4 缺少早期战役内容时逐规则标签为 NV 而不是 PASS` | 针对已删除的 `--real-content` 分桶输出 |
| 9 | `ARCH-02 跨章节矛盾在过渡期只警告不失败（不回归 HIST-01）` | 验收 4 要求“不存在可在门禁中触发的 transition 豁免”；跨章节矛盾改为始终严格（由构造事件的严格负例取代） |

### 2.2 新增（8 项，全部只用构造的内存文档/契约数据）

| # | 新增自测项 | 对应验收 |
|---:|---|---|
| 1 | `ARCH-02 阶段无关性：构造的早期战役文档在五个阶段命中数一致（构造内存文档）` | 验收 4（规则不依赖 `--stage`）；替代删除项 #2 |
| 2 | `ARCH-02 R3 researchStatus 在早期战役事件上被强制要求（F2 具名负例）` | 验收 4（researchStatus 严格） |
| 3 | `ARCH-02 R3 研究过程措辞正向探针：构造合规文档注入措辞后被具名拒绝（构造内存文档）` | 验收 5（研究过程措辞负例）；替代删除项 #4 |
| 4 | `ARCH-02 R2 旧五键在门禁中始终被具名拒绝（无过渡豁免，构造事件）` | 验收 4（无 transition 豁免） |
| 5 | `ARCH-02 R2/F4 契约禁止过渡豁免：enforcement/legacyDisabledBy/elementMarkers 不合规被拒绝（具名负例）` | 验收 4 |
| 6 | `ARCH-02 R2 analysisProfiles 必含要素缺失被拒绝（逐键不连带，具名负例）` | 验收 4（必含要素强制） |
| 7 | `ARCH-02 跨章节矛盾在门禁中为错误（无过渡豁免，构造事件）` | 验收 5；替代删除项 #9 |
| 8 | `ARCH-02 契约声明跨章节矛盾为严格规则且参考案例仅用于构造式负例` | 验收 5（不得声称矛盾在候选/集成内容中真实存在） |

### 2.3 改写（保留并加强，不计入删除）

| 旧项 | 新项 | 原因 |
|---|---|---|
| `D7 文档声明的自测项数与实际一致（应为 153）` | `D7 文档项数漂移检查在内存文件系统上生效（应为 151 项，真实文档同步由 --check-contracts 校验）` | 自测不读 `docs/`；真实 `SELFTEST_COUNT` 同步移入 `--check-contracts` |
| `D2 合规的早期战役五类分析通过（正向对照）` | `D2 合规的早期战役分析（analysisProfiles 十键）在 background 阶段通过（正向对照）` | 目标结构改为 `analysisProfiles` |
| `D2 早期战役 fixture 通过结构检查（无 earlyCampaignAnalysis 错误）` | `D2 早期战役 fixture 通过结构检查（analysisProfiles 十键 + researchStatus）` | 同上 |
| `D2 coverage.earlyCampaign 缺键或漏登记事件会被契约检查发现（负例）` | 同名（子用例改为“重新声明 analysisKeys 被拒绝 + 最小篇幅阈值过低被拒绝”） | 契约移除 `analysisKeys` 后等价覆盖 |
| `ARCH-02 R2 旧五键在过渡窗口内仍被接受（不回归 HIST-01 内容）` | `ARCH-02 R2 旧五键在门禁中被具名拒绝（无过渡豁免，逐阶段负例）` | 验收 4 |
| `ARCH-02 R2 过渡窗口被关闭后旧五键被具名拒绝（负例）` | `ARCH-02 R2 旧五键的逐键迁移诊断仍保留（便于 HIST-01 定位）` | 该“开关关闭”动作已无意义；改为断言迁移诊断仍存在 |
| `ARCH-02 R2 契约必须声明 analysisProfiles 与过渡窗口字段` | `ARCH-02 R2 契约必须声明 analysisProfiles、旧五键开关与 researchStatus 严格规则` | 增加 researchStatus 严格声明断言 |
| `ARCH-02 跨章节矛盾检查精确指出事件与章节（具名负例）` / `ARCH-02 跨章节矛盾错误真的输出 eventId（具名断言）` | 同名，改为使用真实 coverage（不再克隆 transition 字段） | transition 字段已移除 |

**计数核对**：旧 153 项 − 删除 9 项 + 新增 8 项 − 另有 1 项因“过渡期矛盾警告”删除后由“严格矛盾”新增项取代（已计入上面的删除/新增表）= **151 项**；`--self-test` 实跑 `151/151`，`docs/research/coverage.md` 的 canonical 标记 `SELFTEST_COUNT=151`，`--check-contracts` 的 D7 同步检查 PASS。

## 3. 一项删除决策：移除 `--real-content` 诊断模式

attempt 1–4 保留了 `--real-content`（读取真实 `content/history.json`，用严格 coverage 跑一遍）。本轮评审 F2 指出：该模式的分桶在“没有早期战役内容”的基座上永远只能输出 `NV`，所以“规则自 HIST-01 起生效”没有真实运行支撑；而且它诱使文档把某基座的实测数字写成事实。

处置：**删除 `--real-content` 全部代码与 CLI 参数**。理由：
1. 验收列表没有要求保留它；工单 [步骤 6] 也只说“**若保留**……”，明确允许移除；
2. 保留它就必须在文档里解释“它证明了什么”，而本候选没有可证明的早期战役内容，任何“已证明”表述都会再次变成 F2/F3 类缺陷；
3. 新严格规则的证据改为 `--self-test` 的构造式负例/正例，这是验收 1/4/5 明确要求的证据形式。

因此本文件、README、coverage.md 中**不再有任何 `--real-content` 的“8 处违规可复现”或“三态退出码”断言**。真实内容的严格检查由 HIST-01 交付后用 `--stage background` 门禁执行（本任务记录其当前退出码 1，作为内容未交付的证据，而不是契约失败）。

## 4. 阶段归属与 HIST-01 机器可读接口（R1）

- **唯一来源**：`coverage.stageOwnership.<stage>.{keyArticles, events}`。`requiredEvents[].stage` 只用于交叉一致性检查（不一致即具名错误）。
- `stageOwnership.background.events` 含 **9 个**事件，包括 `event-doolittle-raid-1942`；`backgroundGate` 由 `backgroundGateEventIds(coverage)` 从该列表派生（`--check-contracts` 会打印这 9 个 ID）。
- 事件 `historicalPart` 按 `stageOwnership` 派生允许集合（background 事件可落 `part-3-expansion` 或 `part-4-turning-point`）；不再有硬编码 `background→part-3-expansion`。
- 具名负例（互不连带）：`requiredEvents`/`stageOwnership` 交叉不一致、必需事件未登记、`stageOwnership.events` 引用未登记事件、同一事件重复归属、事件落在不允许的历史部分、构造 background 文档缺杜立特（只由该事件缺失触发）。

## 5. 严格分析/研究规则（R2/R3）

**`analysisProfiles` 十键**（`coverage.earlyCampaign.analysisProfiles.keys`，与 `contracts/README.md` 完全一致）：`background / geography / participants / objectivesAndForces / constraints / course / options / resultsAndLosses / impact / uncertainty`。每键强制：

- 键存在、标题逐字匹配、正文 ≥80 汉字、至少 1 个来源与 1 个 claim；
- **每个 `requiredElements` 必含要素都必须在正文命中 `elementMarkers` 中至少一个表述**（F4 修复）；
- `options` 必须同时有真实选项与排除它的约束；`uncertainty` 必须同时有证据支持与争议/无法确定。

**旧五键** `earlyCampaignAnalysis`：`legacyAnalysis.enforcement = "off"`、`legacyDisabledBy = "HIST-01"`。验证器**始终**报 `旧五键结构已被停用`（并保留逐键诊断便于迁移）；`validateAnalysisProfilesContract` 拒绝 `enforcement !== "off"`、`legacyDisabledBy !== "HIST-01"` 或缺失 `elementMarkers` 的契约。门禁中不存在 transition 豁免。

**`researchStatus`**（枚举 `not-started | sources-identified | sources-retrieved | cross-checked | final`）：早期战役事件**必须声明**；正文/summary/claim 出现研究过程措辞即具名错误（带 `自 HIST-01 起生效`）。负例与正向探针全部使用构造内存文档。

**跨章节数值/类别矛盾**：`coverage.crossChapterContradiction.enforcement = "strict"`；门禁中始终报错并点名事件 ID、章节标题/claim ID 与两侧原文。参考案例 `event-darwin-air-raid-1942`（正文“十八架重型轰炸机” vs claim“18 架俯冲轰炸机”）**只用于构造式负例**：`referenceCaseIsConstructedOnly=true`，**不表示该矛盾存在于本候选或任何已集成内容中**（本候选根本没有该事件）。

## 6. 媒体注册迁移（R4）

| 项目 | 迁移前 | 迁移后 |
|---|---|---|
| 文件 | `content/history.json` 顶层 `media: [...]` | `content/media.json` |
| 根结构 | 数组 | `{ "version": 1, "media": [...] }` |
| 条目形状 | `{id,title,mediaType,path,author,license,rightsStatement,sourceId,creditLine,alt,caption,articleIds,...}` | **完全不变**（复用 `$defs.media`；`articleIds` 仍是文章关联） |
| schema | `properties.media`（已废弃，迁移提示） | `$defs.mediaRegistry`（`required: version, media`；`version.const = 1`） |

- `history.json` 顶层 `media` **含条目** → 拒绝 + 迁移映射；**空的** legacy 数组（本候选现状）只产生迁移提示，因为本任务不编辑 `content/history.json`；该提示**不是**任何严格规则的豁免。
- `--media` 同时读取 `content/history.json` 与 `content/media.json`，两份缺失**分别精确报错**（含期望结构与迁移映射）；`--stage` 门禁**不因** `media.json` 缺失而失败（`stageGateUnaffectedWhenMissing=true`，自测有契约断言）。
- 两份缺失分支的 CLI 实测（本候选，真实输出）：

```text
$ node scripts/validate-content.mjs --media
[media] 素材注册表不存在：content/media.json（...\content\media.json）
[media] 期望结构：{ "version": 1, "media": [ ... ] }，条目形状与 history.json 旧 media 条目完全一致。
[media] 迁移映射：把 history.json 顶层 media[] 原样搬到 content/media.json 的 media[] 中，然后删除 history 的 media 字段。
[media] 由 MEDIA-02 负责写入 content/media.json；--stage 门禁不受本文件缺失影响。
exit 1

$ node scripts/validate-content.mjs --media --file .cache/does-not-exist-history.json
[media] 内容文件不存在：content/history.json（...\.cache\does-not-exist-history.json）
[media] --media 需要同时读取 content/history.json 与 content/media.json；当前 history.json 缺失。
exit 1
```
- 消费方：**MEDIA-02 写**（唯一写入方）；**HIST-01..04 不写**；**QA-01 运行 `--media`**；**WEB-01 / MAP-01 只读**。

## 7. 新负例的首次生效任务

| 负例 | 首次生效任务 | 当前状态 |
|---|---|---|
| R1 交叉不一致 / 未登记事件 / 重复归属 / 孤立 ID / 历史部分错配 | ARCH-02（本任务，契约层） | 代码与自测已落地并可复现 |
| R1 构造 background 文档缺杜立特（只由该事件缺失触发） | HIST-01（内容交付后才有该事件） | 负例已落地（构造夹具）；真实内容仍缺该事件 |
| R2 `analysisProfiles` 缺键 / 过浅 / 必含要素缺失 / options 不全 / uncertainty 不全 | HIST-01（新写早期战役必须满足） | 规则与构造负例已落地；真实内容尚无早期战役 |
| R2 旧五键被拒绝（含逐阶段、逐键诊断） | **HIST-01**（`legacyDisabledBy=HIST-01`，迁移责任在 HIST-01） | 规则已落地，门禁中无过渡豁免 |
| R2/R3 契约声明检查（enforcement/legacyDisabledBy/elementMarkers/researchStatus 声明） | ARCH-02（本任务） | 已落地 |
| R3 `researchStatus` 缺失 / 非法枚举 / 正文或 summary 或 claim 出现研究过程措辞 | HIST-01 | 规则与构造负例已落地；真实内容尚无早期战役 |
| R4 history 顶层 media 含条目 / 注册表结构或条目 schema 错误 | MEDIA-02（迁移时） | 规则与构造负例已落地；`content/media.json` 尚不存在 |
| R4 `--media` 两份文件缺失分别报错 | QA-01（运行 `--media` 时） | 分支与自测已落地；当前实测 `content/media.json` 缺失分支 exit 1 |
| 跨章节矛盾严格报错 | HIST-01（内容不得含该矛盾） | 严格规则与构造负例已落地；参考案例仅构造式 |
| 地图阶段夹具缺失情报/后果/未标示意 | MAP-00（阶段引擎） | 夹具为已存在输入；本任务未新建/改写 |

## 8. 已落地 / 未落地（如实）

**已落地（本任务 delta）**：

- `contracts/coverage.json`：严格 `legacyAnalysis`（off / HIST-01）、`analysisProfiles.keys[].elementMarkers`、`earlyCampaign.researchStatus` 严格声明、`crossChapterContradiction` strict 声明；移除 `contentTransition` 与 `earlyCampaign.analysisKeys`。
- `contracts/content.schema.json`：`analysisProfiles` 十键、`researchStatus` 枚举、`mediaRegistry` 已在前序 attempt 落地；本轮只同步了描述性文字（无结构削弱）。
- `scripts/validate-content.mjs`：旧五键始终拒绝 + 逐键诊断；`requiredElements` 正文强制；`researchStatus` 必填；跨章节矛盾始终报错；删除 `--real-content`；自测删除 9 项、新增 8 项、改写若干项；自测不再读 `content/`、`docs/`。
- `contracts/fixtures/valid-early-campaign.json`：香港（合规）与达尔文（迁移目标）两个事件保留 `fixtureOnly=true`，十键 + `researchStatus` 齐全；正文补充必含要素表述以通过新的 `elementMarkers` 检查（**仅在测试夹具内**，不是历史内容）。
- `contracts/README.md`、`docs/research/coverage.md`、本文件：与代码实际行为一致；MEDIA-01 已全部改为 MEDIA-02；不再断言背景内容“待 HIST-00”，改述为 HIST-00 已交付战略背景、HIST-01 交付扩张内容。
- `contracts/fixtures/map-phases.json`：**未创建、未改写**（按验收 8 只作校验输入；已存在，三战役各 2 阶段）。

**未落地（不由本任务负责，且不得伪造）**：

- HIST-01 的真实扩张内容（9 个 background 事件、`analysisProfiles`、`researchStatus`、part-3 导读与问题）——因此 `--stage background` 当前 exit 1。
- `content/media.json` 素材注册表与真实素材——MEDIA-02/素材任务负责。
- 真实内容上的严格规则验证：本候选没有早期战役事件，**不能**声称严格规则已在真实内容上生效；证据只来自构造文档。
- 地图阶段真实战役内容、UI/浏览器/构建/部署与可读性评审——其他模块或后续任务。
- 本任务 delta 未 commit（开发政策：Git 由中央集成服务负责）。

## 9. 与 Acceptance 的逐条对应

| 验收项 | 证据 |
|---|---|
| 1 自测纯度与 exit 0 | §0（151/151、exit 0；无 content/docs/public 的隔离目录复跑同样 151/151、exit 0） |
| 2 删除真实内容自测并逐项列出 | §2.1（9 项逐项列出）；计数 151 = coverage.md `SELFTEST_COUNT=151`；README/coverage.md 两处声明计数口径 |
| 3 HIST-01 机器可读接口 | §4（`stageOwnership.background.events` 9 个含杜立特；`--check-contracts` 打印 backgroundGate） |
| 4 严格 analysisProfiles/researchStatus、无门禁 transition 豁免、具名负例 | §5；自测新增项 2/4/5/6 |
| 5 historicalPart 派生、杜立特构造负例、researchStatus 措辞负例、矛盾严格且构造式 | §4/§5；自测新增项 1/3/7/8 |
| 6 媒体注册规则 | §6；`--media` 实测输出与退出码 |
| 7 权威文档一致（MEDIA-02、HIST-00 已交付） | README/coverage.md 已改；本文件 §1.F3 |
| 8 `map-phases.json` 仅输入、fixtureOnly 通过 | §8（未创建/未改写）；自测中 map-phases 正/负例均通过 |
| 9 窄变更、不伪造内容 | §0/§8；`content/`、`public/` 未改动 |
| 10 记录实际输出/退出码/基线/删除项/首次生效/落地状态 | §0、§2、§3、§7、§8 |

## 10. 限制与诚实说明

- 结构验证通过不等于历史准确、适龄或可读；可读性需 `tests/evidence/pedagogy.md` 的人工评审。
- 本候选没有 HIST-01 内容，因此“严格规则在真实内容上生效”在本轮**不可验证**；任何相反说法都不成立。本任务用构造文档证明规则会失败/通过，而不是用真实内容回放。
- `--stage background` 的 exit 1 是内容未交付的预期状态，不是契约缺陷，也不是内容已交付的证据。
- 来源核验限制见 `docs/research/sources.md`：NHHC/CMH 曾 DNS 失败、NAA/IWM 403，三场战役的官方战斗叙事与页码未读到；后续内容不得声称“已全文核实”。
- 本文件记录的退出码来自 2026 年本工作树的真实运行；中央审查环境会独立复跑，若输出不同以中央为准。
