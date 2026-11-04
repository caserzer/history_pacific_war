# 契约修正记录（ARCH-02）

状态：**本文件记录 ARCH-02 对 ARCH-01 契约的修正**。这不是实现声明：没有任何文章、地图阶段或素材因本任务而交付。本任务**不编辑** `content/history.json`；`content/media.json` 由 MEDIA-02 写入，本任务**不创建**它。

## 0. attempt 3 对三项阻断缺陷的处置

attempt 2 被否决的三项缺陷与本次处置：

| 缺陷 | attempt 2 的问题 | attempt 3 的修复 | 如何复现 |
|---|---|---|---|
| **1（高）** 达尔文案例在基座上不可复现 | 文档无条件写“真实存在”，而补丁基座 `df6ae36` 没有 HIST-01 | §8.0 改为**基座条件式**表述，并列明 `df6ae36`（无案例）与 `054dc36`（有案例）两种基座；新增自测断言文档不得再出现无条件“真实存在”，且必须写明基座标识 | `--self-test` 的 `ARCH-02 a3 文档中的达尔文案例存在性表述与当前基座一致` |
| **2（高）** `--real-content` 用 `stage: 'strategy'`，早期战役规则不作用于验收数据 | 固定 strategy；被判定“0 background 事件被检查” | 验收阶段改为 **`background`**（HIST-01 交付早期扩张的阶段）；新增**逐阶段对照表**，打印五个阶段各自的 analysisProfiles / researchStatus / 跨章节矛盾命中数；新增早期战役覆盖度行（契约 9 个 vs 真实 8 个，缺 Doolittle） | `--real-content` 输出里的「阶段对照」与「早期战役覆盖」两段；`--self-test` 的 `a3 早期战役与 researchStatus 检查不依赖 stage` 与 `a3 验收阶段是 background` |
| **3（中）** `researchStatus` 在真实内容上没有正向用例 | 只有手写夹具，正文扫描 0 命中 | 新增 `runResearchStatusPositiveProbe`：从**真实** `content/history.json` 取一个早期战役事件，在**内存副本**上注入过程措辞，验证规则报错且标注「自 HIST-01 起生效」；自测断言探针成功且不改磁盘 | `--real-content` 输出里的 `PASS researchStatus 正向探针…`；`--self-test` 的 `a3 researchStatus 正向探针在真实内容事件上触发` |

### 一个必须说清的复现结论：评审对缺陷 2 的**机制**描述不成立

评审说「strategy 下 0 个 background 事件被检查」。我在当前树（`d0f8ccb`，含 HIST-01）实测**五个阶段命中数完全相同**：

```
strategy    analysisProfiles=8  researchStatus=0  跨章节矛盾=1
background  analysisProfiles=8  researchStatus=0  跨章节矛盾=1
pearl       analysisProfiles=8  researchStatus=0  跨章节矛盾=1
coral       analysisProfiles=8  researchStatus=0  跨章节矛盾=1
full        analysisProfiles=8  researchStatus=0  跨章节矛盾=1
```

原因：早期战役分析检查与 `researchStatusErrors` 都在 `events` 循环里**无条件执行**，不受 `stage` 门控（只有 `isEarlyCampaignEvent` 决定是否处理某个事件）。所以“strategy 下不检查早期战役”并不成立。

**但这不改变修复的必要性**：把验收阶段写成 `strategy` 在语义上仍是错的（HIST-01 的验收阶段是 `background`），而且旧输出没有留下任何可分阶段核对的证据。这两点都已修复。我保留这条说明，是因为“照单全收一个错误诊断”会让后来者以为验证器真的有 stage 门控缺陷。

## 0.1 attempt 2 的处置（历史记录）

上一版被否决的四项缺陷与本次处置（**均已修复**，可复现）：

| 缺陷 | 上一版的问题 | 本次修复 | 如何复现 |
|---|---|---|---|
| **1（高）** 达尔文跨章节案例被指为不存在；数字解析不认全角与 >18 中文数字 | 严格模式只在我手写的夹具上被验证 | ①数字解析重写：支持全角（１８）、中文数字（十八/二十四/七十二/一百四十/两百/一千）；②新增 `--real-content` 严格模式，对**真实** `content/history.json` 执行并打印真实统计。本树中达尔文案例**真实存在**（reviewer 的 base `df6ae36` 早于 HIST-01，故他那侧看不到） | `--real-content` → 实测报出 events[10] 的真实矛盾；`--self-test` 含全角与 >99 数字用例 |
| **2（高）** `analysisProfiles`/`researchStatus` 只在"为通过而写"的夹具上生效 | 真实内容从未触发这些规则 | `--real-content` 用严格 coverage 跑真实内容：实测 **0** 个事件含 `analysisProfiles`、**8** 个仍是旧五键、**0** 个含 `researchStatus` → 如实报出 8 处旧五键违规 | `--real-content` 退出码 1，并打印「13 个事件，0 含 analysisProfiles，8 含旧五键，0 含 researchStatus」 |
| **3（中）** 地图阶段"双方位置"未被专门测试 | 负例只删 knownEnemy/consequence，靠 schema 顺手失败 | 新增 `validateMapPhasesForBattle`：逐阶段独立断言 `positions.japan` **与** `positions.allies` 同时存在、有坐标、标 schematic；接入 battles 循环。新增 4 条具名负例（缺 allies / 缺 japan / 缺整个 positions / 合规 6 阶段正向） | `--self-test` 的 `ARCH-02 D3 阶段缺 positions.*` 用例 |
| **4（中）** README 多处断言评审候选不支持的事实 | 断言"已交付"而未给可复现证据 | 重写 §0/§0.1/§5/§9.5：把每条断言改成**命令 + 实测退出码**表格，明确 `--stage background` = 1 且原因是 HIST-01 未交付杜立特（非契约缺陷）；background 行补上杜立特 | 见 README §9.5 的实测表 |

### 非阻断项处置

| 项目 | 处置 |
|---|---|
| 注册表条目未按 media schema 校验 | **已修复**：`validateMediaRegistry` 对每个条目跑 `schemaValidate($defs.media)`，新增缺字段/非法许可负例 |
| deprecated stub 未被拒绝 | **已修复**：schema 中 `properties.media` 移除 `items`（不再等于仍接受数组），保留 `deprecated: true` 迁移说明；新增断言 |
| `--media` 缺文件分支未测 | **已修复**：新增分支测试断言两份文件各自的专属错误文本存在且不同 |
| 某测试名声称输出 eventId 但未测 | **已修复**：改名如实描述，并新增一条真正断言错误信息含 eventId + claim ID + 小节标题的测试 |
| README 多余反引号 | **已修复** |
| coverage.md 引用陈旧的 71/72 | **已修复**：改为"历史记录"表述，避免被误读为当前值 |
| 消费方映射不一致（杜立特一边归 HIST-01、一边在 part-4） | **已修复**：README 阶段表与 §9.5 一致声明杜立特归属 `background`（HIST-01 交付）、`historicalPart` 可落 part-3 **或** part-4（两件事不冲突，已明确写出） |

## 1. 六项修正的落地位置

| # | 修正 | 契约位置 | 验证器位置 | 负例数 |
|---|---|---|---|---:|
| R1 | 阶段归属单一来源 + 杜立特迁入 background | `coverage.stageOwnership.<stage>.{keyArticles,events}`、`requiredEvents[].stage` | `validateStageOwnershipContract`、`ownershipStageForEvent`、`allowedPartsForStage`、`backgroundGateEventIds` | 9 |
| R2 | 早期战役十键具名分析 | `coverage.earlyCampaign.analysisProfiles`、`legacyAnalysis`；`content.schema.json#/$defs/analysisProfiles` | `earlyCampaignDepthErrors`、`validateAnalysisProfilesContract` | 11 |
| R3 | 研究过程状态只写 `researchStatus` | `content.schema.json#/$defs/researchStatus`（枚举） | `researchStatusErrors`、`findResearchProcessWording` | 6 |
| R4 | 媒体注册表迁移到 `content/media.json` | `content.schema.json#/$defs/mediaRegistry`、`coverage.mediaRegistry` | `validateMediaRegistry`、`historyMediaMigrationHint`、CLI `--media` 双文件读取 | 11 |
| R5 | 自测计数与夹具 | `docs/research/coverage.md` 的 `SELFTEST_COUNT`、计数口径表 | `selfTestCountDriftErrors` | 1 + 1 |
| R6 | 地图阶段契约夹具 | `contracts/fixtures/map-phases.json` | 阶段结构断言 + 结构负例 | 6 |

另有**跨章节数值/类别矛盾检查**（达尔文 18 架飞机参考案例）：`crossChapterContradictionErrors`、`extractAircraftClaims`、`relatedClaimEntries`，执行模式由 `coverage.contentTransition` 控制；负例 4 项。

## 2. R1：阶段归属单一来源

**唯一来源**：`coverage.stageOwnership.<stage>.events`。不存在第二套归属表、别名或硬编码映射。

迁移前 → 迁移后：

| 项目 | ARCH-01 | ARCH-02 |
|---|---|---|
| stageOwnership 形状 | `<stage>: [keyArticleId, ...]` | `<stage>: { keyArticles: [...], events: [...] }` |
| 事件阶段来源 | `requiredEvents[].stage`（兼作归属） | `stageOwnership.<stage>.events`（唯一来源）；`requiredEvents[].stage` 只做交叉一致性 |
| 事件历史部分 | 硬编码 `background → part-3-expansion` | 按 `stageOwnership` 派生允许集合（background 事件可落 part-3 或 part-4） |
| `event-doolittle-raid-1942` | `coral` | **`background`** |

**backgroundGate** 只引用 `stageOwnership.background.events`，当前 9 个事件（顺序即契约顺序）：

```
event-hong-kong-1941, event-malaya-singapore-1942, event-philippines-bataan-corregidor-1942,
event-dutch-east-indies-1942, event-wake-island-1941, event-guam-1941,
event-darwin-air-raid-1942, event-indian-ocean-raid-1942, event-doolittle-raid-1942
```

`--check-contracts` 会打印这份列表，便于审查。

**杜立特缺失负例只由该事件缺失触发**：自测断言该场景下所有点名 `event-doolittle-raid-1942` 的错误都必须是“缺少必需事件”，不得被历史部分或阶段归属问题连带触发。

## 3. R2：早期战役十键具名分析（analysisProfiles）

键名在两处必须完全一致：`contracts/README.md` 与 `contracts/coverage.json#/earlyCampaign/analysisProfiles/keys`。

| 键 | 标题 | 必含要素 | 最小汉字 |
|---|---|---|---:|
| `background` | 背景 | 此前局势、起因 | 80 |
| `geography` | 地理环境 | 地点、距离或地形、战略意义 | 80 |
| `participants` | 参与方与指挥 | 双方阵营、参战部队或军种、指挥关系 | 80 |
| `objectivesAndForces` | 双方目标与军力 | 日方目标、盟方目标、兵力或装备对比 | 80 |
| `constraints` | 约束条件 | 具体限制、限制如何影响行动 | 80 |
| `course` | 阶段经过 | 时间顺序、转折点及原因 | 80 |
| `options` | 可选方案与被排除它的约束 | **真实选项** 与 **排除它的约束** | 80 |
| `resultsAndLosses` | 结果与损失口径 | 结果、损失数字的口径 | 80 |
| `impact` | 后续影响 | 对后续战局的影响 | 80 |
| `uncertainty` | 不确定性 | **有证据支持的内容** 与 **争议或无法确定的内容** | 80 |

额外断言：`options` 必须同时命中“选项类”表述与“约束类”表述；`uncertainty` 必须同时命中“有证据”与“争议/无法确定”表述。每键独立带 `sourceIds` 与 `claimIds`。

### 3.1 过渡规则（重要）

HIST-01 已交付的 8 个早期战役事件携带**旧五键** `earlyCampaignAnalysis`（background/course/constraints/results/impact）。本任务**不编辑** `content/history.json`，因此：

- **过渡期内验证器同时接受两种形状**：有 `analysisProfiles` 就按十键全面强制；只有旧 `earlyCampaignAnalysis` 就按旧规则校验五键深度；两者都没有 → 具名错误。
- `analysisProfiles` 是**目标结构**；HIST-01 之后新写的早期战役必须用它。
- 过渡窗口由 `coverage.earlyCampaign.legacyAnalysis.enforcement` 控制，当前为 `transition`。
- **由 `ARCH-02-flip` 关闭过渡窗口**（届时 `enforcement` 改为 `off`，旧五键报具名错误 `旧五键结构已被停用`）。
- 自测同时覆盖：旧五键在过渡期被接受、过渡窗口关闭后被具名拒绝。

## 4. R3：研究过程状态只写 researchStatus

枚举（`content.schema.json#/$defs/researchStatus`）：`not-started` | `sources-identified` | `sources-retrieved` | `cross-checked` | `final`。

**自 HIST-01 起生效**：以下位置出现“研究/检索过程措辞”就是错误，过程状态只能写 `researchStatus`：

- 事件正文各小节（`article[].body`）
- 事件 `summary`
- `claims[].text`

被拦截的措辞模式（节选）：`本文仍在检索`、`尚待查证`、`本节资料不足/待补`、`检索中/调研中`、`尚未找到可靠来源`、`TODO/FIXME/占位/placeholder`。负例的错误信息带 `自 HIST-01 起生效` 标注。识别器另有“不误伤正常历史叙述”的正向对照。

## 5. R4：媒体注册表迁移

### 5.1 迁移映射

| 项目 | 迁移前 | 迁移后 |
|---|---|---|
| 文件 | `content/history.json` 顶层 `media: [...]` | `content/media.json` |
| 根结构 | 数组 | `{ "version": 1, "media": [...] }` |
| 条目形状 | `{id,title,mediaType,path,author,license,rightsStatement,sourceId,creditLine,alt,caption,articleIds,...}` | **完全不变**（复用 `$defs.media`） |
| 文章关联 | `articleIds` | **同一个 `articleIds`**，语义不变 |
| schema | `properties.media`（已废弃） | `$defs.mediaRegistry` |

迁移动作：把 `history.json` 的 `media[]` **原样**搬到 `content/media.json` 的 `media[]`，加上 `version: 1`，然后删除 `history.json` 的 `media` 字段。

### 5.2 消费方

| 任务 | 角色 |
|---|---|
| **MEDIA-02** | **写入** `content/media.json`（唯一写入方） |
| **HIST-04** | **不写** `content/media.json`（内容任务只写 `history.json`） |
| **QA-01** | **运行** `node scripts/validate-content.mjs --media` 校验注册表与文件存在性 |
| **WEB-01** | **只读**消费 `content/media.json` |
| **MAP-01** | **只读**消费 `content/media.json` |

### 5.3 规则

- `history.json` 顶层 `media` **含条目** → 具名拒绝 + 迁移映射提示。
- **过渡期**：`history.json` 里**空的** `media` 数组（HIST-01 现状）只产生**警告**，不失败；否则本任务会追溯破坏已接受集成。`coverage.mediaRegistry.legacyHistoryMediaEnforcement = "transition"`；`MEDIA-02` 完成迁移后由 `ARCH-02-flip` 改为 `off`（届时空数组也报错）。
- `--media` **同时读取两份文件**，两份缺失**分别精确报错**：
  - `content/history.json` 缺失 → `[media] 内容文件不存在：content/history.json …`
  - `content/media.json` 缺失 → `[media] 素材注册表不存在：content/media.json …` + 期望结构 + 迁移映射 + 由谁写入
- **`--stage` 门禁不因 `content/media.json` 缺失而失败**（`coverage.mediaRegistry.stageGateUnaffectedWhenMissing = true`）。

## 6. R5：自测计数与夹具

- `--self-test` 当前 **135 项**，与 `docs/research/coverage.md` 的 `SELFTEST_COUNT=135` 逐字一致；`--self-test` 与 `--check-contracts` 都会读取文档校验该数字，不一致即失败（D7 防漂移）。
- 计数口径（现有自测 / 含导读的完整内容自测 / 契约夹具自测）在 README 与 coverage.md **两处**声明，不复用同一数字。
- `--self-test` 不使用跳过模式，没有 skip 计入通过。
- `valid-min.json`（fixtureOnly）与 `valid-early-campaign.json`（fixtureOnly）都整体通过自测。
- `valid-early-campaign.json` 含：
  - **合规早期战役**：`event-hong-kong-1941`，十键 `analysisProfiles` 齐全，`researchStatus` 已填。
  - **迁移目标**：`event-darwin-air-raid-1942`，同样十键齐全（旧五键 → 新十键的迁移样例）。
  - 两者都有可定位的 `sourceIds` 与 `claimIds`。

## 7. R6：地图阶段契约夹具

`contracts/fixtures/map-phases.json`（`fixtureOnly: true`）：

- 珍珠港、珊瑚海、中途岛各 **2 个阶段**（共 6 个）。
- 每阶段满足：`time`（start/end/display/uncertainty）、双方 `positions`、`knownEnemy`/`unknownEnemy`、`decision`/`consequence`、`certainty`、`schematic`、`viewpoints`、`routes`。
- **纯教学示意**：所有位置 `schematic: true`、所有航线 `schematic: true`、所有阶段 `certainty: "schematic"`；文件内所有文字标明“夹具”，不假装史实。
- 供 **MAP-00** 在没有真实战役内容时复验阶段引擎。
- `--self-test` 覆盖结构负例：缺 `knownEnemy`、缺 `consequence`、缺 `unknownEnemy`、阶段未标 `schematic`。

## 8. 跨章节数值/类别矛盾检查

参考案例：`event-darwin-air-raid-1942`
- 正文 `article[0]『一次没有预警的空袭』` 写 “十八架重型轰炸机”
- claim `claim-darwin-carrier-identity-disputed` 写 “18 架俯冲轰炸机”

同一个数字 18 被归为不同机种。检查会输出事件 ID、数字、两侧章节/claim 与原文片段。

### 8.0 这个案例的存在性是**基座条件**，不是无条件事实

该案例只存在于**包含 HIST-01 的基座**（`054dc36` 及之后）。attempt 2 被否决的直接原因之一是：补丁基座是 `df6ae36`（仅 HIST-00），其中**没有** `event-darwin-air-raid-1942`，也没有 `claim-darwin-carrier-identity-disputed`，于是本文档里“真实存在”的说法在评审基座上无法复现。

因此本文档的表述改为**条件式**，并且验证器自己会做基座判定：

| 基座 | 达尔文事件是否存在 | `--real-content` 对矛盾项的输出 |
|---|---|---|
| `df6ae36`（仅 HIST-00，4 个 strategy 事件） | **不存在** | 不触发该检查项；输出「真实内容未触发该规则」，**不得**据此声称有 8 处违规 |
| `054dc36` 及之后（含 HIST-01，13 个事件） | 存在（`events[10]`） | 触发 1 处，精确点名事件、小节与两侧 claim |

`--real-content` 会打印真实事件数、含旧五键的事件数等**可自行核对的数字**；文档里的具体数字只是某一基座的实测值，必须与当次运行的输出一致才算数。

**数字解析（attempt 2 修复）**：支持半角（18）、**全角（１８）**、中文数字（十八 / 二十四 / 七十二 / **一百四十** / **两百** / **一千**）。旧实现只有一张到 72 为止的查表且不认全角数字，会静默漏检大量真实写法。

**如何验证它真的在真实内容上生效**（而不是只在我写的夹具上）：

```bash
node scripts/validate-content.mjs --real-content
```

该命令对真实 `content/history.json` 用**严格 coverage**（跨章节矛盾从 warn 升级为 error）跑一遍，并输出真实统计。attempt 2 的实测输出见 §10。

**过渡执行**：`coverage.contentTransition.crossChapterContradictionEnforcement = "warn"`。默认 `--stage` 模式下只警告；`--real-content` 严格模式下升级为错误。修正由 HIST-01 修订完成，之后 `ARCH-02-flip` 把默认模式也改为 `off`。`warn` 仍然报告问题，不是静默跳过。

## 8.1 真实内容严格模式 `--real-content`（attempt 2 新增）

上一版被否决的核心原因是：`analysisProfiles` / `researchStatus` / 跨章节矛盾**只在为通过而写的夹具上被检查**，真实内容从未触发，门禁实际空转。`--real-content` 直接解决这一点：

- 读取真实 `content/history.json`（若不存在则明确输出 SKIP 并返回非 0，**不谎报通过**）；
- 用严格 coverage（旧五键过渡窗口 `off`、跨章节矛盾 `off`）跑完整验证；
- 把结果分成四类打印：`analysisProfiles`（失败）、`researchStatus`（失败）、跨章节矛盾（失败）、其它内容错误（仅报告）；
- 打印真实统计：多少事件含 `analysisProfiles` / 旧五键 / `researchStatus`。

退出码：0 = 真实内容满足全部新增严格规则；1 = 有新规则违规或在真实内容上无法证明。

## 9. 新增负例的首次生效任务

| 负例 | 首次生效 |
|---|---|
| R1 事件与 stageOwnership 交叉不一致 / 未登记 / 重复拥有 / 孤立 ID | ARCH-02（本任务，契约层） |
| R1 杜立特缺失（`--stage background`） | HIST-01（内容交付后才会有该事件；当前如实缺报） |
| R1 事件落在不允许的历史部分 | HIST-01 |
| R2 十键缺失 / 篇幅不足 / options 缺项 / uncertainty 缺项 | HIST-01（新写早期战役必须用 analysisProfiles） |
| R2 旧五键被拒绝（默认模式） | ARCH-02-flip（关闭过渡窗口后） |
| R2 旧五键被拒绝（严格模式 `--real-content`） | **ARCH-02 attempt 2 起即可复现**（真实内容 8 个事件报错） |
| R3 正文/summary/claim 出现研究过程措辞 | **HIST-01**（错误信息已标注） |
| R4 history 顶层 media 含条目 | MEDIA-02（迁移时） |
| R4 history 空 legacy media 被拒绝 | ARCH-02-flip |
| R4 注册表 version/结构/条目 schema 错误 | MEDIA-02 |
| R4 `--media` 双文件缺失分别报错 | QA-01（运行 --media 时） |
| D3 地图阶段缺 positions.japan / positions.allies / 整个 positions | MAP-00（阶段引擎） |
| R6 地图阶段结构负例 | MAP-00 |
| 跨章节矛盾严格报错 | HIST-01 修订后由 ARCH-02-flip 开启（`--real-content` 已可复现） |
| 全角数字 / >99 中文数字解析 | ARCH-02 attempt 2（自测） |

## 10. 未完成 / 限制

- 本任务**不创建** `content/media.json`，**不编辑** `content/history.json`，**不改** `public/`。
- 本任务本身**不满足 `--stage background`**：杜立特事件与十键分析内容尚未由 HIST-01 交付；这是预期状态，不是阻塞。
- **`--real-content` 在 attempt 3 的实测输出**（基座 `d0f8ccb`，含 HIST-01；真实退出码 **1**）：

| 检查 | 结果 |
|---|---|
| analysisProfiles 十键强制（真实内容） | FAIL 8 处 —— 8 个早期战役仍是旧五键 |
| researchStatus 过程状态规则（真实内容） | PASS —— 真实内容本身未触发（正文无过程措辞） |
| **researchStatus 正向探针** | **PASS** —— 在真实事件上注入过程措辞后被拒绝，标签有真实运行支撑 |
| 跨章节数值/类别矛盾（真实内容，严格模式） | FAIL 1 处 —— 达尔文 18 架飞机类别冲突，精确指出 events[10]、小节标题与 claim |
| 真实统计 | 13 个事件，0 个含 analysisProfiles，8 个含旧五键，0 个含 researchStatus |
| 早期战役覆盖 | 契约要求 9 个，真实内容存在 8 个，缺 `event-doolittle-raid-1942` |
| 验收阶段 | `background`（不是 `strategy`） |

  这个退出码 1 **正是规则在真实内容上生效的证据**，不是契约缺陷。HIST-01 修订后应归零。

  **在 `df6ae36` 基座（仅 HIST-00）上**：真实内容只有 4 个 strategy 事件，上述 8 处与 1 处**都不会出现**，`--real-content` 会输出「真实内容未触发该规则」。这是正确行为，不是通过——它如实反映该基座没有早期战役内容可供检查。文档不得把 `d0f8ccb` 的实测数字说成任何基座都成立。
- 过渡窗口内的两个 `warn` 项（空 legacy media、跨章节矛盾）**是真实问题**，只是默认 `--stage` 模式不把它们当门禁失败；`--real-content` 会把它们如实报出。它们必须在 HIST-01 修订 / MEDIA-02 / ARCH-02-flip 中被真正解决。
- `--check-contracts` **不读** `content/history.json`，因此它对内容规则不作任何断言；内容规则的证据只来自 `--real-content` 与 `--stage`。这是设计上的分工，不要用 `--check-contracts` 的 PASS 推断内容合规。
- 结构验证通过不等于历史准确、适龄或可读；那些仍需 `tests/evidence/pedagogy.md` 的人工评审。
