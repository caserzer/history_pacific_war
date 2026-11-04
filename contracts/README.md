# 统一内容契约（v6 / ARCH-02 attempt 2）

状态：契约与验证器已交付，来源 URL 已逐条实测复核。本文件描述格式与门禁，**不声称任何历史文章已达到验收**。

**如何核实本文件里的事实（不要凭本文件自我证明）**：

```bash
node scripts/validate-content.mjs --self-test        # 合同自测（不读真实内容）
node scripts/validate-content.mjs --check-contracts  # 只读契约文件
node scripts/validate-content.mjs --real-content     # 新规则对真实 content/history.json 生效
node scripts/validate-content.mjs --stage strategy   # 真实内容 + 阶段门禁
```

`--real-content` 是 ARCH-02 a2 新增：它读取当前 `content/history.json`，用**严格 coverage**（旧五键过渡窗口关闭、跨章节矛盾升级为错误）跑一遍，并打印真实内容里有多少事件含 `analysisProfiles` / 旧五键 / `researchStatus`。规则是否真的在真实内容上生效，以它的输出为准，而不是以夹具为准。

ARCH-02 的完整修正记录见 **`docs/research/contract-correction.md`**（迁移映射、消费方、每个新负例的首次生效任务）。

## 0. ARCH-02 六项修正速览

| # | 修正 | 一句话 | 在真实内容上的状态 |
|---|---|---|---|
| R1 | 阶段归属单一来源 | `stageOwnership.<stage>.{keyArticles,events}` 是唯一来源；杜立特登记在 `background.events`；删除硬编码 `background→part-3`，事件可落 part-3 或 part-4 | 契约已生效；`--stage background` 因杜立特**事件尚未交付**而报缺失（见 §9.5） |
| R2 | 早期战役十键具名分析 | `analysisProfiles`（背景/地理环境/参与方与指挥/双方目标与军力/约束条件/阶段经过/可选方案与被排除它的约束/结果与损失口径/后续影响/不确定性）；旧五键在过渡期仍接受 | `--real-content` 实测：真实内容 **0** 个事件含 `analysisProfiles`、**8** 个仍含旧五键 → 严格模式如实报 8 处违规 |
| R3 | 研究过程状态 | 只能写 `researchStatus`（枚举）；正文/summary/claim 出现研究过程措辞即错误，**自 HIST-01 起生效** | `--real-content` 实测：真实内容 **0** 个事件含 `researchStatus`；当前正文无过程措辞 |
| R4 | 媒体注册表迁移 | `content/media.json` = `{version:1, media:[...]}`；history 顶层 `media` 被拒绝并给迁移映射；`--media` 读两份文件，缺失分别报错 | `content/media.json` 尚未创建（由 MEDIA-02 负责）；history 仍含空 legacy `media`（过渡期仅警告） |
| R5 | 自测计数与夹具 | `--self-test` 项数 = `SELFTEST_COUNT`；三种计数口径分别声明；`valid-early-campaign.json` 含香港+达尔文 | 自测不读真实内容，只验证契约与夹具 |
| R6 | 地图阶段夹具 | `contracts/fixtures/map-phases.json`：三战役 × 2 阶段，纯示意，供 MAP-00 复验 | 夹具结构由**专用阶段校验**逐阶段断言双方位置 |

## 0.1 过渡窗口（重要）

本任务不编辑 `content/history.json`。HIST-01 已交付内容的形状与新增严格检查存在冲突，因此三处规则带**过渡窗口**：

| 规则 | 过渡行为（默认模式） | 严格模式行为 | 关闭者 |
|---|---|---|---|
| 早期战役旧五键 `earlyCampaignAnalysis` | 仍被接受（`legacyAnalysis.enforcement = transition`） | `--real-content` 关闭过渡窗口 → 逐条报错 | `ARCH-02-flip` |
| history 顶层**空** `media` 数组 | 仅警告（`legacyHistoryMediaEnforcement = transition`） | 同样升级为错误 | `ARCH-02-flip` |
| 跨章节数值/类别矛盾 | 仅警告（`crossChapterContradictionEnforcement = warn`） | `--real-content` 升级为错误 | HIST-01 修订后由 `ARCH-02-flip` 收紧 |

**这些仍然是真实问题**。默认 `--stage` 模式不把它们当门禁失败，以免本任务追溯破坏已接受集成；但 `--real-content` 会如实把它们全部报出（exit 1），所以「规则没生效」不能被掩盖。`warn` 照常报告，不是静默跳过。

## 0. 已修复的阻断缺陷（对应中央审查）

### 0.1 v3：D1–D4（已验收）

| 缺陷 | 问题 | 修复 |
|---|---|---|
| **D1** | `phase.time.end` 与 `end >= start` 完全没有校验；6/4–6/5 战役可以接受 6/10 的阶段结束时间 | 验证器现在校验 `time.end` 的格式（带时区 ISO 8601）、是否落在战役窗口内、是否 `>= time.start`；并新增阶段按 `sequence` 的时间单调性与区间不重叠检查。9 个负例（含审查者用的 6/10 案例）。 |
| **D2** | 早期扩张战役的「背景/经过/约束/结果/影响」只在散文里，不是机器断言 | `coverage.json` 新增 `earlyCampaign` 块（8 个事件 × 5 类分析键，每类 ≥80 汉字，独立来源/claim）；schema 新增 `earlyCampaignAnalysis`；验证器逐事件强制。“盟军为何连续失败”“日本的补给与防御压力”正式锁定为 part 3 导读的强制小节。12 个负例。 |
| **D3** | 素材类型与阶段归属没有契约锁定 | `coverage.json` 新增 `stageOwnership`（5 阶段精确归属 19 篇，不重不漏）；验证器新增不变式：每篇有且仅有一个 owner、owner 与 `keyArticles[].stage` 一致、无孤立 ID、每个阶段都拥有文章、每篇都有素材类型且与文章种类相符。11 个负例。 |
| **D4** | `--self-test` 依赖 OS 临时目录，只读沙箱下 EPERM（35/38） | 引入可注入的文件系统层（`createRealFileSystem` / `createMemoryFileSystem`）；自测全部改为内存克隆与内存文件系统，零临时目录、零工作区写入。只读模拟下 150/150 通过、0 跳过。 |

### 0.2 v4：D5–D7（本轮）

| 缺陷 | 问题 | 修复 |
|---|---|---|
| **D5** | `overviewTopics.minHanCharsPerHeading=120` 从未施加到 part 3 强制小节：一个 51 汉字的「盟军为何连续失败」只要全篇超过 1200 汉字就通过 | 验证器现在**逐小节测量正文汉字数**：`overviewTopics.requiredHeadings` 两节各 ≥120 汉字，其余强制小节各 ≥100 汉字（`minimumDepth.requiredHeadingHanChars`）。6 个负例/边界，含“全篇远超门槛但小节过短仍被拒绝”和“恰好 120 通过 / 119 拒绝”。 |
| **D6** | 导读的 `historicalPart` 未与部分 ID 绑定 | 5 篇导读新增 `historicalPart` 字段；契约级断言“声明部分 == ID 编码部分且属于五部分枚举”，实体级断言“`entity.historicalPart` == `entry.historicalPart`”。7 个负例/正例。 |
| **D7** | 文档声明的自测项数曾与实际不符（历史记录：文档写 71 而实际为 72） | `docs/research/coverage.md` 写入 canonical 标记 `SELFTEST_COUNT=<N>`；`--self-test` 与 `--check-contracts` 都读取文档、提取声明并与真实项数比对，任何不一致即失败。已用“真实注入漂移”验证过会失败。 |

#### D5 的作用域决定

`minHanCharsPerHeading` **只**用于 `earlyCampaign.overviewTopics.requiredHeadings`（盟军为何连续失败 / 日本的补给与防御压力，≥120 汉字）。其余 `requiredArticleHeadings` 用另一档 `minimumDepth.requiredHeadingHanChars`（≥100 汉字）。两档都是契约字段，`--check-contracts` 断言其存在且 ≥40；详见 `docs/research/coverage.md` §2.1.1。

## 1. 契约文件

| 文件 | 作用 |
|---|---|
| `contracts/content.schema.json` | `content/history.json` 的 Draft 2020-12 JSON Schema；所有结构字段的规范来源 |
| `contracts/coverage.json` | 阶段、十九篇重点文章、`stageOwnership`、`requiredMediaTypes`、`earlyCampaign`、十四类战役字段、必需事件、问题部分覆盖和素材矩阵的机器合同 |
| `contracts/requirements.json` | 工单提供的 36 条 canonical requirements 原样副本，不得增删改；`--check-contracts` 与 `--self-test` 都会逐字比对 |
| `contracts/fixtures/valid-min.json` | 仅用于 schema/UI/验证器测试的最小 `strategy` 阶段样本，`fixtureOnly=true`，不是教材内容 |
| `contracts/fixtures/valid-early-campaign.json` | 仅用于测试的早期扩张战役样本，演示 `earlyCampaignAnalysis` 五类结构（D2），`fixtureOnly=true` |
| `scripts/validate-content.mjs` | 无 npm 依赖的 Node 24 验证器，含 150 项自测与纯契约检查；只读可用 |
| `docs/research/coverage.md` | 覆盖矩阵、逐项需求映射、阶段与最终门禁说明 |
| `docs/research/content-rubric.md` | 11 岁可读性、证据类型、侵略/平民苦难/战争罪行的适龄评审标准 |
| `docs/research/sources.md` | 官方来源策略、逐条实测的 URL 访问状态、定位方式与调研限制 |
| `docs/research/team-pilot-evidence.json` | 工单提供的 central engine 组织/门禁证据逐字存档（planHash、6 个 agent、approvalMatrix），供 TEAM-PILOT 审计引用；不是本模块成果 |

`coverage.json` 与 `content.schema.json` 都是契约文件；只能同时修改。任何影响字段含义、ID、阶段或覆盖的变更，须由首席架构师审查并触发依赖任务重评（架构政策 v1）。

## 2. 数据顶层

`content/history.json` 的根节点是对象，包含且仅包含：

```json
{
  "schemaVersion": "1.0.0",
  "fixtureOnly": false,
  "events": [],
  "battles": [],
  "people": [],
  "places": [],
  "units": [],
  "equipment": [],
  "concepts": [],
  "sources": [],
  "media": [],
  "questions": [],
  "claims": []
}
```

- 十一个数组是 flat top-level arrays；不得把战役、人物等嵌成树。
- `fixtureOnly` 为 `true` 时只能在部分阶段做结构测试；`--stage full` 会拒绝。
- 正式内容必须把 `fixtureOnly` 设为 `false`。

## 3. ID 与引用语义

### 3.1 稳定 ID

所有实体 ID 全局唯一，使用小写 kebab-case，前缀固定：

| 集合 | 前缀 | 示例 |
|---|---|---|
| events | `event-` | `event-overview-part-1-why-war` |
| battles | `battle-` | `battle-midway` |
| people | `person-` | `person-nimitz-chester` |
| places | `place-` | `place-pearl-harbor` |
| units | `unit-` | `unit-kido-butai` |
| equipment | `equipment-` | `equipment-zero-fighter` |
| concepts | `concept-` | `concept-codebreaking` |
| sources | `source-` | `source-nhhc-midway` |
| media | `media-` | `media-midway-map-01` |
| questions | `question-` | `question-why-midway` |
| claims | `claim-` | `claim-midway-carrier-losses` |

内嵌对象也有稳定 ID，并参与全局唯一性检查：

- 人物决策：`decision-*`
- 战役阶段：`phase-*`
- 阶段航线：`route-*`

发布后不得重命名 ID 来“整理”URL；需要更名时保留旧 ID 并增加 alias 属于破坏性变更，必须由架构审查。

### 3.2 引用字段

| 字段 | 目标 | 含义 |
|---|---|---|
| `sourceIds` | sources | 可追溯来源；每个内容实体至少一个 |
| `claimIds` | claims | 该实体/小节依赖的判断；至少一个 |
| `placeIds` | places | 真实地理节点，不是舰队位置 |
| `personIds` | people | 相关人物 |
| `unitIds` | units | 编制单位 |
| `equipmentIds` | equipment | 装备/舰艇/飞机类型 |
| `conceptIds` | concepts | 解释性专题 |
| `battleId` | battles | 时间线事件指向的战役文章 |
| `relatedEventIds` | events | 同一条时间线/文章互链 |
| `relatedPersonIds` | people | 人物互链 |
| `relatedPlaceIds` | places | 地理邻近/战略关联 |
| `relatedEntityIds` | 任一内容实体（event/battle/person/place/unit/equipment/concept） | 概念/问题的通用交叉链接 |
| `articleIds`（media） | coverage keyArticleIds | 素材关联的重点文章；只允许重点文章 ID |
| `entityIds`（question/claim） | 任一内容实体 | 问题/判断涉及的对象 |

所有引用都会解析；断链是错误。数组不得重复（schema `uniqueItems`）。

### 3.3 UI 解析规则

UI 不应假定引用一定非空，除非 schema 规定 `minItems: 1`。渲染前按类型索引：

- `events` → 时间线/文章
- `battles` → 战役页 + 战役地图
- `people` → 人物页
- `places` → Atlas 地点
- `units` / `equipment` → 编制与装备解释
- `concepts` → 知识专题
- `questions` → 探究问题
- `sources` / `claims` → 引用抽屉、证据标签

文章正文里的每一节都携带自己的 `sourceIds` 与 `claimIds`；UI 不得只显示页面级来源而隐藏小节级证据。

## 4. 实体字段

以下列出所有必填字段。完整约束（类型、枚举、长度、模式）以 `contracts/content.schema.json` 为准；验证器还执行 schema 无法表达的语义检查。

### 4.1 Event（事件/文章）

适用：时间线事件、背景事件、五个“历史部分导读”。`event-overview-part-*` 同时是 `coverage.json` 的重点文章。

必填：

- `id`, `title`, `historicalPart`, `eventType`, `startDate`
- `summary`（短摘要，不是文章全文）
- `article`: 数组，每节 `{heading, body, sourceIds, claimIds}`
- `placeIds`（至少 1）、`personIds`、`unitIds`、`equipmentIds`、`conceptIds`、`relatedEventIds`
- `sourceIds`、`claimIds`

可选：`endDate`、`battleId`。

语义：

- `historicalPart` 必须是五部分之一。
- 历史日期允许 `1931-09-18` 至 `1942-06-30`；结束日期不得早于开始日期。这个范围允许 1931 年起的战前背景和 1942-06-07 之后的直接后果，不把后期战争当作主体。
- `article` 可以为空（纯时间线条目），但重点导读必须满足 `coverage.json` 的小节数、标题和汉字深度。
- 事件不能复制另一份完整战役叙述；战役详情应放在 `battles`。
- `battleId` 是时间线到战役页的单向链接，不是第二份战斗数据。

UI：可先渲染 `title`/`startDate`/`summary`/`placeIds`，再按 `article` 顺序渲染小节和证据。`battleId` 存在时显示“进入战役”入口。

#### 早期扩张战役：十键具名分析 `analysisProfiles`（ARCH-02 R2，目标结构）

HIST-01 之后新写的早期战役**必须**使用 `analysisProfiles`。键名在**本文件与 `contracts/coverage.json#/earlyCampaign/analysisProfiles/keys` 两处必须完全一致**：

| 键 | 标题（验证器强制） | 必须含的要素 | 最小汉字 |
|---|---|---|---:|
| `background` | 背景 | 此前局势、起因 | 80 |
| `geography` | 地理环境 | 地点、距离或地形、战略意义 | 80 |
| `participants` | 参与方与指挥 | 双方阵营、参战部队或军种、指挥关系 | 80 |
| `objectivesAndForces` | 双方目标与军力 | 日方目标、盟方目标、兵力或装备对比 | 80 |
| `constraints` | 约束条件 | 具体限制、限制如何影响行动 | 80 |
| `course` | 阶段经过 | 时间顺序、转折点及原因 | 80 |
| `options` | 可选方案与被排除它的约束 | **真实可选方案** + **排除它的约束** | 80 |
| `resultsAndLosses` | 结果与损失口径 | 结果、损失数字的统计口径 | 80 |
| `impact` | 后续影响 | 对后续战局（含平民）的影响 | 80 |
| `uncertainty` | 不确定性 | **有证据支持的** + **争议或无法确定的** | 80 |

每键为 `{title, body, sourceIds, claimIds}`，独立带来源与 claim。两条额外断言：

- `options` 必须同时写出真实选项与**排除它的约束**（只说“受到限制”不算）；
- `uncertainty` 必须同时区分**有证据支持**与**争议/无法确定**（只写其一不算）。

##### 过渡窗口：旧五键 `earlyCampaignAnalysis` 仍被接受

`coverage.earlyCampaign.eventIds` 列出的 8 个已交付事件携带**旧五键**（`background`/`course`/`constraints`/`results`/`impact`）。本任务不编辑 `content/history.json`，因此验证器在过渡窗口内**两种形状都接受**：

| 事件具备 | 验证行为 |
|---|---|
| `analysisProfiles` | 按十键全面强制（目标结构） |
| 仅 `earlyCampaignAnalysis` | 按旧规则校验五键深度（过渡期容忍） |
| 两者都没有 | 具名错误 |

`coverage.earlyCampaign.legacyAnalysis.enforcement = "transition"`；**`ARCH-02-flip` 会把它改为 `off`**，届时旧五键报 `旧五键结构已被停用`。

#### 研究过程状态 `researchStatus`（ARCH-02 R3，自 HIST-01 起生效）

研究/检索过程状态**只能**写在 `researchStatus` 字段里，枚举与语义：

| 枚举值 | 语义 |
|---|---|
| `not-started` | 尚未开始检索 |
| `sources-identified` | 已找到候选来源，尚未取得内容 |
| `sources-retrieved` | 已取得来源内容，尚未交叉核对 |
| `cross-checked` | 已完成交叉核对 |
| `final` | 定稿，过程状态不再变化 |

**禁止位置**：事件正文 `article[].body`、事件 `summary`、`claims[].text`。这些位置出现“本文仍在检索/尚待查证/资料不足待补/检索中/尚未找到可靠来源/TODO/占位”即报错，错误信息带 `自 HIST-01 起生效`。

#### 导读强制小节的最低深度（D5）

光有标题不算覆盖。验证器**逐小节测量正文汉字数**（`validateArticleSections` 返回 `hanByHeading`），两档阈值：

| 小节类别 | 阈值字段 | 当前值 |
|---|---|---:|
| `overviewTopics` 分析主题小节（盟军为何连续失败 / 日本的补给与防御压力） | `coverage.earlyCampaign.overviewTopics.minHanCharsPerHeading` | **120 汉字** |
| 其它所有 `requiredArticleHeadings` | `coverage.keyArticles[].minimumDepth.requiredHeadingHanChars` | **100 汉字** |

要点：

- 计量对象是**该标题那一节的 `body`**，不是全篇总字数——51 汉字的分析小节即使全篇 1451 汉字也会失败；
- 恰好等于阈值通过，差一个汉字即失败；
- 两档阈值是契约字段，`--check-contracts` 断言其存在且 ≥40。

#### 导读的历史部分绑定（D6）

每篇 `part-overview` 都必须声明 `historicalPart`，且必须同时满足：

1. 属于五部分枚举（`part-1-why-war` … `part-5-midway`）；
2. 等于它 ID 编码的部分（`event-overview-part-3-expansion` → `part-3-expansion`，由 `historicalPartFromArticleId` 解析）；
3. 实体自身的 `historicalPart` 与 coverage 声明一致（覆盖率门禁逐实体检查）。

这样把 part 3 的导读误挂到 part 1 会在契约检查与实体检查两处分别失败。

#### 阶段归属与素材类型（D3）

- `coverage.stageOwnership` 把 19 篇重点文章**精确**归属到 5 个阶段（strategy 1 / background 1 / pearl 7 / coral 5 / full 5），不重不漏。`keyArticles[].stage` 必须与之一致。
- `coverage.requiredMediaTypes` 为每篇重点文章声明所需素材类型；战役必须含 `battle-map`、指挥官含 `portrait`、专题含 `diagram`、导读含 `map`，且不允许孤立 ID 或空数组。
- 两者都由验证器的契约不变式与 `--check-contracts` 强制，不是文档约定。

### 4.2 Battle（战役）

必填：

- `id`, `title`, `historicalPart`, `battleType`, `theater`（固定 `pacific`）
- `startDate`, `endDate`, `summary`
- `belligerents: {japan, allies}`
- `outcome: {summary, winner, certainty}`
- `placeIds`, `personIds`, `commanderIds: {japan[], allies[]}`
- `unitIds`, `equipmentIds`, `conceptIds`
- `sourceIds`, `claimIds`
- `sections`（恰好十四个固定键）
- `phases`（地图阶段数组，可为空；三场重点战役有最低数量）

`commanderIds` 中的人物必须同时出现在 `personIds`。`winner` 为 `japan|allies|inconclusive`；`certainty` 为 `documented|estimated|disputed|schematic`。

#### 十四类战役字段

| `sections` 键 | 中文标题（验证器强制） | 必须回答 |
|---|---|---|
| `background` | 背景 | 为什么发生？此前局势？ |
| `geography` | 地理环境 | 位置、距离、地形/海域、战略意义 |
| `participants` | 主要参与方 | 国家、军种、部队、指挥体系 |
| `commanders` | 主要指挥官 | 职责、能力、当时掌握的信息 |
| `forces` | 双方军力对比 | 舰艇、飞机、兵员、基地、补给、装备 |
| `objectives` | 各自战略目标 | 双方希望取得什么结果 |
| `constraints` | 决策约束 | 情报、燃油、弹药、航程、天气、时间、通信、指挥链 |
| `plan` | 作战计划 | 战前判断与部署 |
| `course` | 战斗经过 | 按阶段解释行动、转折点及原因 |
| `decisions` | 关键决策 | 有哪些选项？为何选其一？ |
| `results` | 结果与损失 | 明确统计口径和来源 |
| `aftermath` | 后续影响 | 对下一场战斗、战略与战争进程的影响 |
| `controversies` | 历史争议 | 哪些观点有分歧？证据支持到什么程度？ |
| `furtherReading` | 延伸阅读 | 相关事件、人物、地图、概念、来源 |

每一节均为 `{title, body, sourceIds, claimIds}`。验证器要求标题精确匹配上表，正文不少于 40 个汉字；三场重点战役每节不少于 `coverage.battleSectionMinHanChars = 160` 个汉字，并且每节至少一个来源与 claim。

#### 地图阶段 `phases[]`

必填：

- `id`, `sequence`, `title`
- `time`: `{start, end?, display, uncertainty}`；`start` 必填，`end` 可选但**一旦出现就必须合法**；两者都是带时区 ISO 时间，`display` 给读者看，`uncertainty` 解释时间差异
- `positions: {japan, allies}`，每方 `{label, description, placeIds, coordinates: {lat,lng}, schematic, uncertaintyRadiusKm, uncertaintyNote, sourceIds, claimIds}`
- `knownEnemy: {japan, allies}`，双方当时已知的敌情
- `unknownEnemy: {japan, allies}`，双方当时不知道/无法确认的敌情
- `decision: {japan, allies}`，该阶段的关键选择
- `consequence: {japan, allies}`，选择造成的直接后果
- `certainty`：`documented|estimated|disputed|schematic`，阶段重建整体的证据把握
- `viewpoints: {japan, allies}`，每方 `{perspective, sourceIds, claimIds}`；这是“当时视角”，不得用全知视角改写
- `routes`: 示意航线数组；每条 `{id, side, label, fromPlaceId, toPlaceId, path, schematic, certainty, note, sourceIds, claimIds}`
- `schematic`, `uncertaintyNote`
- `eventIds`, `sourceIds`, `claimIds`

规则：

- `positions.*.schematic` 必须为 `true`；位置是教学示意，不得伪装成精确历史位置。
- 每条 `route.schematic` 必须为 `true`，`path` 至少两个点；航线不代表真实航迹。
- 三场重点战役每个阶段至少一条示意航线；每个重点阶段 `schematic=true`。
- 阶段时间必须落在战役开始/结束日期内。
- **阶段时间窗口（D1）**：`time.start` 与 `time.end` 都必须带时区且是合法 ISO 8601；`end` 的日期必须落在战役 `startDate`–`endDate` 内；`end >= start`。提供 `end` 却写成空字符串是错误（不确定就直接省略该字段）。
- **阶段时间顺序（D1）**：按 `sequence` 排序后，后一阶段的 `start` 不得早于前一阶段的 `start`；若前一阶段声明了 `end`，其 `end` 不得晚于后一阶段的 `start`（区间不可逆序重叠）。这与地图播放/前后切换直接相关。
- 每个阶段必须同时有双方 `knownEnemy`、`unknownEnemy`、`decision`、`consequence`；缺一即错误。
- 双方 viewpoint 必须有来源和 claim 链接。只写“日军不知道美军位置”而不写双方各自知道什么，不合格。
- `knownEnemy` 和 `unknownEnemy` 的区分是教学核心：不能把战后才知道的结论塞回阶段叙事。

UI：地图选择按 `sequence` 排序；播放/暂停/前后切换由阶段序列驱动。选中地点应高亮 `placeIds`，阶段信息面板显示时间、双方位置、已知/未知敌情、决策、后果、视角、证据标签和“示意”声明。不能把 `coordinates` 用于声称历史精确位置。

### 4.3 Person（人物）与 decision（决策卡）

必填：

- `id`, `name`, `side`, `role`, `summary`, `profile`
- `decisions`（至少 1，重点档案至少 3）
- `relatedPersonIds`, `placeIds`, `eventIds`, `battleIds`, `conceptIds`
- `sourceIds`, `claimIds`

可选：`originalName`, `service`, `birthDate`, `deathDate`。

每个 decision 必填：

- `id` (`decision-*`), `title`, `context`
- `options`（至少 2 个具体备选方案）
- `choice`, `constraints`（至少 2 个限制）
- `consequence`, `certainty`
- `sourceIds`, `claimIds`

语义：`context` 说明当时可见的信息；`options` 不是装饰性列表，必须给出真实可选路径；`constraints` 包括时间、燃料、情报、政治压力等；`consequence` 区分直接后果与长期影响。禁止用“正确/错误”标签代替条件分析。

UI：人物页先给角色与一句话摘要，再按时间/主题排列 decision 卡；每卡显示“当时知道什么—选项—约束—选择—后果—证据”。五位重点人物由 `coverage.json` 强制最低深度。

### 4.4 Place（真实地理节点）

必填：

- `id`, `historicalName`, `modernName`
- `modernCountry`, `placeType`, `summary`
- `coordinates: {lat, lng}`
- `coordinateAccuracyKm`
- `schematic`（必须为 `false`）
- `relatedPlaceIds`
- `sourceIds`, `claimIds`

语义：places 只存真实地点；`historicalName` 与 `modernName` 都必须可显示，不能只写“珍珠港”而跳过现代地名要求。`coordinateAccuracyKm` 表示节点精度，不表示舰队位置精度。`placeType` 包含 city/island/atoll/base/naval-base/capital/sea/strait/region/port/airfield/other。

UI：Atlas 显示历史名 + 现代名 + 国家；坐标用于基础地理渲染，缺失即断链。不要把阶段位置写进 places。

### 4.5 Unit（编制单位）

必填：

- `id`, `name`, `side`, `service`, `echelon`
- `description`
- `eventIds`, `personIds`, `equipmentIds`
- `sourceIds`, `claimIds`

可选：`parentUnitId`。

语义：`parentUnitId` 必须存在、同阵营、无自指/循环；`echelon` 包含 fleet/task-force/squadron/division/brigade/regiment/battalion/air-group/other。UI 可据此显示层级，但不得自动推断缺失的上级。

### 4.6 Equipment（装备）

必填：

- `id`, `name`, `category`, `side`
- `summary`, `limitations`
- `conceptIds`
- `sourceIds`, `claimIds`

`category` 包含 aircraft-carrier/battleship/cruiser/destroyer/submarine/aircraft/radar/weapon/other。`limitations` 不是可选宣传语；必须说明该装备的局限，尤其是对战役决策的影响。

### 4.7 Concept（分层专题）

必填：

- `id`, `title`, `summary`
- `layers`（恰好 3 层，每层 `{level, title, body, sourceIds, claimIds}`）
- `whyItMatters`
- `relatedEntityIds`（至少 2 个内容实体）
- `sourceIds`, `claimIds`

规则：`level` 必须恰好为 1、2、3；三层依次解释“是什么—怎样运作—为什么影响决策/理解”，不能重复。每个 layer 独立带来源和 claim。六篇重点专题由 coverage 强制总汉字数、来源和 claim 最低值。

UI：用三级展开/分栏呈现，不要只显示第一层；`relatedEntityIds` 用于把专题接入时间线、战役和人物。

### 4.8 Source（来源）

必填：

- `id`, `title`, `creator`, `publisher`, `year`
- `sourceType`, `url`, `accessedDate`
- `citation`, `reliabilityNote`

可选：`language`, `archiveCollectionId`。

`sourceType`：official-history/archive/museum/academic/primary-document/reference/other。`year` 是出版/发布年；档案原件如另有形成年，在 `citation` 中注明。`url` 必须为 http(s)。`reliabilityNote` 要说明该来源能支持什么、不能支持什么；不要把“官方网站”当作无限权威。UI 显示机构、标题、年份、链接和访问日期。

### 4.9 Media（素材）

必填：

- `id`, `title`, `mediaType`
- `path`（必须在 `public/media/`，正斜杠，无路径穿越）
- `author`, `license`, `rightsStatement`, `sourceId`
- `creditLine`, `alt`, `caption`
- `articleIds`（至少一个重点文章 ID）

可选：`licenseUrl`, `sourcePage`, `width`, `height`。

`mediaType`：photograph/portrait/battle-map/map/diagram/illustration/timeline-diagram。许可白名单：`public-domain`、`cc0-1.0`、`cc-by-4.0`、`cc-by-sa-4.0`、`original-work`、`permission-granted`；`permission-granted` 必须带授权 URL。`all-rights-reserved` 等状态被拒绝。

`articleIds` 只能引用 `contracts/coverage.json` 的 `keyArticleIds`。媒体登记在 MEDIA-01 前可以为空；任何已登记条目都必须通过元数据验证。`--media` 会额外检查每个重点文章所要求的类型在登记中至少出现一次，并验证文件确实存在于 `public/media/` 且非空。

### 4.10 Question（探究问题）

必填：

- `id`, `historicalPart`
- `prompt`（以问号结尾）
- `answer`（实质性解释，不是关键词列表）
- `entityIds`（至少 2 个内容实体）
- `sourceIds`, `claimIds`

`historicalPart` 必须是五部分之一。full 阶段每篇回答至少 `coverage.questionMinimumAnswerHanChars = 160` 个汉字；所有阶段的问题都按同一把尺子检查，部分阶段不允许用空泛答案占位。

UI：显示问题、完整答案、相关实体跳转和证据。答案不能只链接来源而不解释；检验标准是 11 岁读者能理解“为什么”，不是能背出结论。

### 4.11 Claim（判断/证据单元）

必填：

- `id`, `text`
- `claimType`（`fact|interpretation|disputed|schematic`）
- `entityIds`（至少 1 个内容实体）
- `sourceIds`（至少 1）
- `locators`（至少 1）

每个 locator 为 `{sourceId, locatorType, locator}`；`locatorType` 为 page/page-range/chapter-section/section-paragraph/table/figure/archival-item/timecode/transcript-line。

规则：

- 每个 `sourceIds` 中的来源都必须有自己的 locator；locator 的 `sourceId` 必须在 `sourceIds` 中。
- 拒绝“整个网页/全文/来源页”等泛定位。
- 含日期、数字、数量的 claim 必须有精确 locator；所有 claim 实际上都必须有 locator。
- `fact` 与 `interpretation` 不得混用；`disputed` 要能看出争议；`schematic` 用于教学简化，不能反过来冒充事实。
- UI 显示证据类型标签、来源机构、定位和必要时争议说明。

## 5. 阶段语义

验证器接受五个值，默认 `full`。命名与服务架构的 HIST 任务对应如下：

| 验证器 stage | 覆盖任务 | 新增重点文章 | 新增必需事件/问题门禁 |
|---|---|---|---|
| `strategy` | HIST-00 战略背景与基础 | `event-overview-part-1-why-war` | 3 个基础事件；问题部分 1 |
| `background` | HIST-01 日本快速扩张 | `event-overview-part-3-expansion` | **9 个事件**：香港、马来亚与新加坡、菲律宾/巴丹/科雷希多尔、荷属东印度、威克岛、关岛、达尔文、印度洋，**以及杜立特空袭 `event-doolittle-raid-1942`**；问题部分 3 |
| `pearl` | HIST-02 珍珠港 | part 2 导读、`battle-pearl-harbor`、山本、南云、3 个海军航空/航母专题 | 美国宣战事件；问题部分 2 |
| `coral` | HIST-03 战局变化 | part 4 导读、`battle-coral-sea`、弗莱彻、雷达、密码分析 | 早期航母行动（杜立特已按 ARCH-02 移入 background）；问题部分 4 |
| `full` | HIST-04 中途岛与全量交付 | part 5 导读、`battle-midway`、尼米兹、斯普鲁恩斯、补给 | 五部分问题全部覆盖；最终硬门禁 |

> **ARCH-02 R1 变更**：`event-doolittle-raid-1942` 的阶段归属是 `background`（`stageOwnership.background.events` 是唯一来源），因此它属于 HIST-01 的交付范围。`requiredEvents` 与 `stageOwnership` 必须一致；`--check-contracts` 会打印 `backgroundGate` 实际引用的 9 个事件 ID。

累积原则：

1. **只允许未来阶段尚未计划交付的覆盖缺失。** 当前阶段已要求或已存在的实体，不得以“稍后补”为由绕过断链、弱 claim 或深度不足。
2. 任何已存在实体（包括提前写了一半的未来重点文章）仍要通过完整字段/链接/深度检查。
3. 部分阶段不能把 `fixtureOnly=true` 的样本当作交付；full 直接拒绝。
4. `--media` 隐含 `--stage full`，不能借部分阶段跳过素材门禁。
5. 最终验收以默认 `full` + `--media` 为准；可读性还需 `tests/evidence/pedagogy.md`，不由结构验证推断。

`docs/research/coverage.md` 给出精确文章清单、十四类字段、必需事件、问题部分和媒体类型矩阵。

## 6. 素材矩阵

`coverage.json` 的 `requiredMediaTypes` 对十九篇重点文章逐一规定：

- 五篇部分导读：`map`
- 三场重点战役：`battle-map` + `photograph`（每篇两种各至少一件）
- 五篇指挥官档案：`portrait`
- 六篇核心专题：`diagram`

合计至少 22 个“文章 × 类型”匹配（同一素材可被多篇文章关联，所以唯一文件数可能少于 22；但每个“文章 × 类型”都必须命中）。`--media` 不接受“只要已有素材都合法”这种弱检查：它要求 coverage 的精确重点集合全部被覆盖，且文件真实存在。许可、作者、来源、署名、alt、caption 全部通过才算“suitable licensed asset”。

### 6.1 媒体注册表迁移到 `content/media.json`（ARCH-02 R4）

素材条目**不再**放在 `content/history.json` 的顶层 `media`，而是独立的 `content/media.json`：

```json
{
  "version": 1,
  "media": [
    {
      "id": "media-...", "title": "...", "mediaType": "map",
      "path": "public/media/...", "author": "...", "license": "public-domain",
      "rightsStatement": "...", "sourceId": "source-...", "creditLine": "...",
      "alt": "...", "caption": "...", "articleIds": ["battle-midway"]
    }
  ]
}
```

- 条目形状与 ARCH-01 的 `$defs.media` **完全一致**；`articleIds` 仍是文章关联。
- schema：`content.schema.json#/$defs/mediaRegistry`。
- `history.json` 顶层 `media` **含条目**即被拒绝，错误信息给出迁移映射。
- **过渡窗口**：`history.json` 里**空的** `media` 数组（HIST-01 现状）只产生警告；由 MEDIA-02 迁移后 `ARCH-02-flip` 收紧为错误。
- `--media` **同时读取两份文件**：`content/history.json`（正文与来源）与 `content/media.json`（素材）。两份缺失**分别精确报错**。
- **`--stage` 门禁不因 `content/media.json` 缺失而失败。**

消费方：**MEDIA-02 写**；**HIST-04 不写**；**QA-01 运行 `--media`**；**WEB-01 / MAP-01 只读**。

## 7. Fixture 警告

`contracts/fixtures/valid-min.json`：

- 是 **测试样本**，`fixtureOnly=true`，不是可发布内容。
- 只覆盖 `strategy` 阶段；默认 `full` 验证会失败且必须失败。
- 其中的历史句子用于触发结构与证据字段，不可当作已交付文章、数字或结论。
- UI 测试可以使用其形状，但界面必须显示“测试样本”状态，不能把它渲染成正式教材页面。

`contracts/fixtures/valid-early-campaign.json`：

- 同样是 **测试样本**，`fixtureOnly=true`。
- 演示 `earlyCampaignAnalysis` 五类分析结构的正确形状（D2），供 schema 与 UI 测试使用。
- 只含一个 early-campaign 事件，因此 `background` 阶段的其他覆盖仍会缺失；它只能用来验证结构，不能当作交付。

自测和 fixture 验证命令：

```bash
node scripts/validate-content.mjs --self-test
node scripts/validate-content.mjs --check-contracts
node scripts/validate-content.mjs --file contracts/fixtures/valid-min.json --stage strategy
node scripts/validate-content.mjs --file contracts/fixtures/valid-early-campaign.json --stage background
```

## 8. 验证器行为

```bash
node scripts/validate-content.mjs
node scripts/validate-content.mjs --stage strategy
node scripts/validate-content.mjs --stage background
node scripts/validate-content.mjs --stage pearl
node scripts/validate-content.mjs --stage coral
node scripts/validate-content.mjs --media
node scripts/validate-content.mjs --self-test
node scripts/validate-content.mjs --check-contracts
node scripts/validate-content.mjs --file path/to/history.json --stage coral
```

检查内容：

- JSON Schema 结构、必填字段、枚举、模式、唯一 ID
- 全局断链、来源缺失、claim/media 关联、person/commander 一致性
- 战役十四类字段、标题、正文汉字深度、双方指挥官
- 阶段数据：双方位置、已知/未知敌情、决策/后果、双方视角、时间、示意标记、航线目的地
- 日期有效性与允许历史范围
- **阶段时间完整性（D1）**：`time.start` 与 `time.end` 都必须是带时区的合法 ISO 8601；两者都落在战役 `startDate`–`endDate` 内；`end >= start`；阶段按 `sequence` 时间递增、显式区间不重叠
- claim 的 locator 精度与每个来源的定位覆盖；数字/日期 claim 的定位
- 阅读问题五部分覆盖、答案深度、实体/来源/claim 关联
- coverage 的重点文章深度、必需事件、阶段问题门禁
- **早期扩张战役结构（D2）**：每个 early-campaign 事件必须有 `earlyCampaignAnalysis` 的 background/course/constraints/results/impact 五节，标题固定、每节 ≥80 汉字、各自带来源与 claim；part 3 导读必须包含“盟军为何连续失败”“日本的补给与防御压力”
- **阶段归属与素材类型不变式（D3）**：`stageOwnership` 不重不漏覆盖 19 篇、与 `keyArticles[].stage` 一致、无孤立 ID、每阶段都有 owner；`requiredMediaTypes` 每篇至少一种类型且与文章种类相符
- `--media`：精确重点集合、所需媒体类型、许可、文件存在且非空
- `--self-test`：独立于 `content/history.json` 的 **150 项**真实正例/负例/边界；**只读可用**（无临时目录、无工作区写入）
- `--real-content`：对真实 `content/history.json` 以**严格模式**跑新增规则（旧五键过渡窗口关闭、跨章节矛盾升级为错误），打印真实内容里含 `analysisProfiles`/旧五键/`researchStatus` 的事件数
- `--check-contracts`：不需要内容文件，检查 `requirements.json` 与工单 canonical 清单逐字一致、`coverage.json` 重点集合精确为 3 战役 + 5 指挥官 + 6 专题 + 5 导读、earlyCampaign 结构、**导读小节深度阈值（D5）**、**导读 historicalPart 绑定（D6）**、**文档自测项数同步（D7）**、stageOwnership 不变式、素材类型契约，以及 schema 的顶层数组/十四类键/阶段关键字段/phaseTime/earlyCampaignAnalysis

退出码：`0` PASS，`1` 验证失败，`2` 参数或运行错误。验证器没有 npm 依赖，Node 24 下运行。

## 9. 消费者/UI 契约

为了让 UI 不靠猜测渲染：

1. 所有文章型实体（event.article、battle.sections、concept.layers、person.profile/decisions）都提供可直接显示的标题/正文，不在 UI 端拼接历史正文。
2. 所有引用先按类型解析为实体；显示前检查目标存在。验证器已保证引用完整，UI 仍应对缺字段防御性降级。
3. 每个显示中的事实/判断应能找到 `claimIds` 与 `sourceIds`；UI 提供证据面板，展示 `claimType`、来源、locator 与争议说明。
4. 地图使用 `phases`，不把 `places` 当舰队位置；`schematic=true` 或路线 `note` 必须在界面上可见。
5. 日期显示按实体字段：事件用 `startDate/endDate`，阶段用 `time.display`；不要自行猜测时区。
6. `historicalName` 与 `modernName` 同时显示（Atlas 详情）；`modernCountry` 和 `coordinateAccuracyKm` 也可见。
7. 六个阅读入口共享同一批实体 ID；链接由 `relatedEventIds`、`personIds`、`placeIds`、`conceptIds`、`battleId`、`entityIds` 建立，不另建孤立页面数据。
8. `media.path` 是站点根相对路径（`public/media/...`），但构建/UI 必须按 GitHub Pages 子路径拼接；不能把它当作绝对 URL。
9. UI 不得把 `fixtureOnly=true` 的数据发布；显示状态必须来自显式标志，而不是文件名猜测。

## 9.5 HIST-01…HIST-04 消费接口（ARCH-02）

内容任务在提交前必须使用本契约，并按以下接口自检。

**候选定义**：候选 = 已接受集成（含 ARCH-01 契约 + HIST-00/HIST-01 内容）**+ 仅本任务（ARCH-02）的 delta**。不得在候选里混入其它未接受任务的内容。

**提交前必做**：

```bash
node scripts/validate-content.mjs --check-contracts   # 契约一致性（不需内容）
node scripts/validate-content.mjs --self-test         # 135 项，只读，exit 0
node scripts/validate-content.mjs --stage <本阶段>     # 预跑本阶段门禁，记录真实退出码
```

**各内容任务的契约要求**：

| 任务 | 必须使用 | 不得做 | 门禁预期 |
|---|---|---|---|
| **HIST-01** | 把已交付的 8 个早期战役从旧五键迁移到 `analysisProfiles` 十键；补 `researchStatus`；交付 `event-doolittle-raid-1942`（阶段归属已在 `stageOwnership.background.events`，因此属 HIST-01 范围） | 不写 `content/media.json`；不在正文写研究过程措辞；不把 `historicalPart` 写错（background 事件可落 part-3 或 part-4） | `--stage background` 通过；`--real-content` 的 analysisProfiles 违规归零 |
| **HIST-02** | 沿用本契约；珍珠港深度分析 | 不写 `content/media.json` | `--stage pearl` 通过 |
| **HIST-03** | 沿用本契约；珊瑚海深度分析 | 不写 `content/media.json` | `--stage coral` 通过 |
| **HIST-04** | 沿用本契约；中途岛深度分析；完成全部五部分问题 | **不写** `content/media.json` | 默认 `--stage full` 通过 |
| **MEDIA-02** | 写 `content/media.json`（`{version:1, media:[...]}`），迁移 `history.json` 的 `media` 并删除该字段 | 不改历史正文 | `--media` 通过 |
| **QA-01** | 运行 `--media` 与 `--real-content` 校验两份文件、素材文件与新增严格规则 | — | 两者均通过 |

**本任务（ARCH-02 attempt 3）的实测状态**（真实输出；数字随基座变化，以当次运行为准）：

| 命令 | 退出码 | 说明 |
|---|---:|---|
| `--self-test` | 0 | 项数与 `SELFTEST_COUNT` 一致；只读；不读真实内容 |
| `--check-contracts` | 0 | 只读契约文件；**不读** `content/history.json`，故对内容规则不作断言 |
| `--stage strategy` | **0** | 真实 HIST-00 内容通过策略阶段门禁 |
| `--stage background` | **1** | 缺 `event-doolittle-raid-1942`（HIST-01 尚未交付该事件）；**不是**契约缺陷 |
| `--real-content` | **1** | 验收阶段 `background`；严格模式下 8 个旧五键事件 + 真实达尔文矛盾被报出；并运行 researchStatus 正向探针 |

**`--real-content` 的验收阶段是 `background`**（HIST-01 交付早期扩张的阶段），不是 `strategy`。它会打印**逐阶段对照表**（五个阶段的 analysisProfiles / researchStatus / 跨章节矛盾命中数）与**早期战役覆盖度**（契约 9 个 vs 真实存在数），使“规则是否真在真实内容上执行”可自行核对。

**基座条件**：上述 8 处 / 1 处只出现在**含 HIST-01 的基座**（`054dc36` 及之后）。在仅含 HIST-00 的基座（如 `df6ae36`）上，真实内容没有早期战役事件，`--real-content` 会输出「真实内容未触发该规则」——这是如实反映该基座无可检查内容，**不是**“通过”。详见 `docs/research/contract-correction.md` §8.0。

**`--stage background` 未通过是预期状态**：杜立特事件与十键分析内容由 HIST-01 交付，本任务不负责内容。不得把该退出码 1 当作 ARCH-02 契约失败的证据，也不得把它当作内容已交付的证据。

**记录要求**：预跑阶段门禁时必须记录真实退出码与所用依赖提交（dependency commits），不得只写结论。

## 10. 变更、审查与维护

- 修改 schema/coverage 会改变所有内容与 UI 的契约，须由首席架构师审查，并通知 development/content/QA 重新评估。
- 新增实体类型或嵌套字段属于破坏性变更；先用新 schema 版本，不静默扩展。
- 新增重点文章必须同时更新 `coverage.keyArticleIds`、`requiredMediaTypes`、`keyArticles` 与文档；三者的集合必须精确相等。
- 来源 URL 失效时保留来源记录并在 `reliabilityNote`/维护记录说明；不要悄悄替换而不更新 claim 定位。
- 媒体许可变化时立即下架相关 `media` 条目并重跑 `--media`。
- 本模块不负责最终浏览器测试、TypeScript、构建、GitHub Pages 部署或可读性人工评审；这些仍由依赖任务和全站 Definition of Done 约束。

## 11. 当前限制

- `content/history.json` 不存在；没有任何文章、地图阶段、重点人物/专题或媒体已经交付。
- 验证器只证明结构/覆盖/引用条件，不证明历史叙述真实、准确、适龄或可读。
- `docs/research/sources.md` 逐条记录了本次实测结果：FRUS、NARA、NPS、JACAR、AWM、National WWII Museum 已读取正文；**NHHC 与 CMH 本次 DNS 解析失败**，NAA/IWM 返回 403，因此三场战役的官方战斗叙事尚未读到。后续内容不得据此声称“已全文核实”，也不得引用未实测的页码。
- `contracts/fixtures/valid-min.json` 与 `contracts/fixtures/valid-early-campaign.json` 都是测试样本，不是历史成果。
- `--self-test` 的只读可用性是**在把 TMP/TEMP 指向不可用路径的条件下实测**的（150/150、0 跳过）；它不能替代中央审查环境中的独立验证。
- 阶段时间校验（D1）在语义上只能保证“格式合法、落在战役窗口内、先后一致”。它**无法**判断某个历史时刻本身是否准确——那需要 claim + locator + 人工评审。
