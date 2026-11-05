# HIST-01 有界修正 Delta 报告（attempt 6）

状态：本文件是 HIST-01 attempt 6「早期扩张内容的有界根因修正」的提交绑定报告，由本任务在**开工时第一个编辑建立**（满足工作单 [第 0 步] 与 [修正项] 7 的要求：报告若不存在，第一个编辑就是创建它，不得先读取不存在的文件）。

- 任务：HIST-01（模块 knowledge，角色 content_creator），attempt 6
- 工作单：`.cache/orders/HIST-01-a6.md`，sha256 = `6eba45ef2160a93e880ba48cf09eb2699dcf5d92da09e2d7259b235842db7fec`（只读操作性输入，本任务未编辑）
- 候选定义：已接受集成 head `8b0ca6a`（含已接受 ARCH-02 契约钩子、HIST-00、WEB-01 产物；**不含**尚未接受的 MAP-00）+ 本任务只在 `content/`、`docs/research/` 内的 delta
- 工作树：`C:\Users\caser\code\dsh-team\.state\worktrees\knowledge`
- 状态声明：本报告是**提交材料**，不是中央核验结论。板卡完成 = 提交，不等于 central verified/done。

---

## 0. 基线核对（保留工作树 b920075 与已接受集成 head 8b0ca6a 的关系）

开工前实测（`git log` / `git diff --name-status` / `git status --porcelain`）：

| 提交 | 说明 | 与上一行的关系 |
|---|---|---|
| `8b0ca6a469d317944269f05905159967641a42ff` | **已接受集成 head**（`sourceBase` / `integrationAtDispatch`）；含已接受 ARCH-02 `cb4ae59`、HIST-00、WEB-01；不含 MAP-00 | 基线 |
| `b920075e002b0ce8fb08ec15924a96758014fe50` | **保留工作树集成树**（"Restore HIST-01 authored source on accepted integration"），父提交 = `8b0ca6a` | `8b0ca6a` + HIST-01 已撰写来源：`M content/history.json`、`A docs/research/background-sources.md` |
| `b6fb659000804239384c8584515d57de874d3ece` | **当前 HEAD / `contextCommit` / `resumedSource`**（"Checkpoint unfinished HIST-01 source before context preparation"），父提交 = `b920075` | `b920075` + 未完成 HIST-01 的检查点：`M content/history.json`、`M docs/research/background-sources.md` |

结论：

1. `8b0ca6a` 是 `b920075` 的父提交，`b920075` 是 `b6fb659` 的父提交；`8b0ca6a` 已被确认为 HEAD 的祖先（`git merge-base --is-ancestor 8b0ca6a HEAD` 为真）。
2. 从 `8b0ca6a` 到 `b920075` 的差异**只有** HIST-01 的来源文件（`content/history.json` 修改、`docs/research/background-sources.md` 新增），没有混入其它模块的改动。
3. 从 `b920075` 到 `b6fb659` 的差异同样**只有**这两个文件，属"检查点"性质的未完成 HIST-01 来源。
4. 开工时工作树对 `b6fb659` 是**干净**的（`git status --porcelain` 无输出），即本任务的候选 = `8b0ca6a` + 保留的 HIST-01 delta + 本次 attempt 6 在 `content/`、`docs/research/` 内的进一步 delta。
5. `docs/research/hist01-delta-report.md` 开工时**不存在**（`Test-Path` 为 False）；本文件即按 [第 0 步] 以第一个编辑建立。
6. 本任务**不**修改 `contracts/`、`scripts/`、`src/`、`public/`；**未**创建 `content/media.json`；**未**做 git commit/merge/push（Git 由集成服务拥有）。

候选的契约基线（来自已接受 ARCH-02 `cb4ae59` / 集成 head `8b0ca6a`）：`contracts/coverage.json` 的 `stageOwnership`、`eventPartPolicy`、`earlyCampaign.analysisProfiles`、`earlyCampaign.researchStatus`、`crossChapterContradiction`、`mediaRegistry`；`contracts/content.schema.json` 的 `event.analysisProfiles` / `event.researchStatus` / `source.reliabilityNote`（`person` 为 `additionalProperties: false` 且**没有** `reliabilityNote`）。

---

## 1. 第 0 步只读核对结果（开工时实测）

| 核对项 | 实测 |
|---|---|
| `content/history.json` 计数 | events 14 / battles 0 / people 10 / places 37 / units 2 / equipment 3 / concepts 6 / sources 28 / media **0** / questions 4 / claims 228 |
| 早期战役 `analysisProfiles` | 9 个事件带 `analysisProfiles`（8 场早期战役 + 杜立特空袭），每个 10 键；`earlyCampaignAnalysis`（旧五键）**0** 个 |
| `researchStatus` | 上述 9 个事件均声明（取值 `sources-retrieved`） |
| 第 3 部分问题（既有，保留） | `question-why-allies-lost-early`、`question-why-japan-overextended`（均 `part-3-expansion`），本任务不新增/不改写/不删除 |
| 杜立特事件（既有，保留） | `event-doolittle-raid-1942` 存在：`historicalPart=part-3-expansion`、5 个 article 小节、10 个 analysisProfiles 键、11 条 claim、2 个来源、`researchStatus=sources-retrieved` |
| media 遗留字段 | `history.json` 顶层 `media: []`（0 条），是迁移输入；`content/media.json` 不存在 |
| 本报告 | 开工时不存在 → 第一个编辑创建本文件 |

---

## 2. 本次使用的已接受契约接口（不改契约、验证器或 `src`）

| 契约接口 | 位置 | 本任务如何使用 |
|---|---|---|
| `earlyCampaign.analysisProfiles.keys`（十键：background / geography / participants / objectivesAndForces / constraints / course / options / resultsAndLosses / impact / uncertainty） | `contracts/coverage.json`（与 `contracts/README.md` 一致）；验证器 `ANALYSIS_PROFILE_KEYS` 镜像 | 8 场早期战役 + 杜立特均按十键交付；本任务只改写其中个别 `body` 文本，不增删键 |
| `analysisProfiles.minHanCharsPerKey` / `minSourceIds` / `minClaimIds` | 同上（80 汉字 / 1 / 1） | 逐键满足；见 §3.1 实测表 |
| `analysisProfiles.keys[].requiredElements` + `elementMarkers` | 同上 | 改写后逐键必含要素仍命中（`geography`/`uncertainty` 等未删关键词） |
| `earlyCampaign.researchStatus`（枚举，`enforcedFrom: HIST-01`） | `coverage.json` + `schema.$defs.researchStatus` | 9 个事件继续声明 `sources-retrieved`；研究过程措辞只留在该字段与 `background-sources.md` |
| `stageOwnership.background.events`（9 个事件，含 `event-doolittle-raid-1942`） | `coverage.json` | 单一阶段归属来源；杜立特在 background 事件清单第 9 位 |
| `stageOwnership.eventPartPolicy.crossStageArticles.background = [event-overview-part-4-turning-point]` | `coverage.json` | 验证器 `allowedPartsForStage()` 由该数据派生允许集合 |
| `crossChapterContradiction`（`enforcement: strict`，参考案例 = 达尔文 18 架类别） | `coverage.json` | 达尔文 18 架类别分歧按该规则在正文与 claim 显式呈现，不静默选边 |
| `mediaRegistry`（`content/media.json`；消费者 MEDIA-02 / HIST-04 / QA-01 / WEB-01 / MAP-01；`legacyHistoryMediaEnforcement: transition`） | `coverage.json` | 只登记迁移清单（0 条），不创建 `content/media.json` |
| 验证器 `--stage background|strategy`、`--check-contracts`、`--self-test` | `scripts/validate-content.mjs` | 只运行，不修改：不删除检查、不跳过断言、不使用 `--media`/`--file` |

依赖提交：`8b0ca6a`（已接受集成 head，含 ARCH-02 `cb4ae59`、HIST-00 `25c4bca`、WEB-01 `69e44a4`）；本任务不依赖尚未接受的 MAP-00。

---

## 3. 逐项处置（[修正项] 1–7）

### 3.1 [修正项] 1 — 8 场早期战役的分析块（可选方案 / 不确定性）

8 场战役（香港、马来亚与新加坡、菲律宾（含巴丹/科雷希多）、荷属东印度、威克岛、关岛、达尔文、印度洋）均已有已接受契约的**十键** `analysisProfiles`，各键带 `sourceIds`/`claimIds`。提交前实测（汉字数，逐键最小值 / 十键合计 / options / uncertainty）：

| 事件 | 十键最小汉字数 | 十键合计汉字数 | `options` 汉字数 | `uncertainty` 汉字数 |
|---|---:|---:|---:|---:|
| event-hong-kong-1941 | 120 | 2000 | 242 | 219 |
| event-malaya-singapore-1942 | 153 | 2131 | 267 | 309 |
| event-philippines-bataan-corregidor-1942 | 166 | 2085 | 252 | 252 |
| event-dutch-east-indies-1942 | 165 | 2083 | 244 | 249 |
| event-wake-island-1941 | 169 | 2048 | 230 | 218 |
| event-guam-1941 | 165 | 2109 | 257 | 348（改写后） |
| event-darwin-air-raid-1942 | 174 | 2171 | 221 | 393（改写后，见 §3.4） |
| event-indian-ocean-raid-1942 | 183 | 2139 | 239 | 258 |

全部满足 `minHanCharsPerKey=80` 与 `minSourceIds`/`minClaimIds`；每场 `options` 都写出真实备选方案 + 排除它的具体约束，每场 `uncertainty` 都写出证据支持范围 + 争议/无法确定部分。

**本次发现并修正的缺陷（根因修正，不是重建）：**

1. `event-guam-1941.analysisProfiles.uncertainty` 原文以「关于岛屿一级战斗的**资料不足**，无法确定的部分是……」开头，属于用"资料不足"代替历史分析（工作单 [修正项] 1 明确禁止）。改写为史料学表述：先写已确认的计划层事实与来源，再写日方文件译文与美方战后报告在岛级战斗细节上**保持沉默**、以及这种沉默的记录学解释，最后明确写出「这是一个史料缺口层面的开放问题，而不是关于历史的争议结论」。改写后仍命中 `uncertainty` 的两个必含要素（证据支持标记、争议/无法确定标记）。
2. `event-guam-1941` 的正文小节「不确定与争议之处」仍带上一轮评审点名的过程性元叙述（「本节能核实的只有……」「现有的可定位记载只到作战计划这一层」「读者如果想知道……需要查阅岛屿一级的官方战斗记录」）。改写为关于史料沉默及其原因的历史叙述，删去"本节/读者需要查阅"这类取得过程措辞；claim 引用保持不变（`claim-guam-uncertainty` 等）。
3. `event-guam-1941.analysisProfiles.resultsAndLosses` 中「现有可定位的记录只到作战计划层面」改为「日方文件译文与美方战后报告的记载止于作战计划与部队任务层面」——把陈述对象从"我们能找到的材料"改为"史料本身"，避免资料不足式替代。

其余 7 场事件的 `options`/`uncertainty` 扫描未发现「资料不足」「检索条件」等代替分析的模式；其对记载缺口/争议的表述本身即历史分析（例如"没有同一口径的完整统计""一种解释认为……另一种解释……现有史料不足以判定"），保留原样。

> 旧五键 `earlyCampaignAnalysis`：契约 `legacyAnalysis.enforcement=off`、`legacyDisabledBy=HIST-01`；当前内容 0 个旧形状事件，内容侧无需迁移动作。

### 3.2 [修正项] 2 — 杜立特空袭：只保留 / 核对，不重写

- `event-doolittle-raid-1942` **已存在**于保留工作树（随本任务 delta 进入候选），本次**未新增、未改写、未删除、未另建第二份**；本任务只做核对与登记。
- 契约归属：由已接受 ARCH-02 定义——`stageOwnership.background.events` 第 9 项 = `event-doolittle-raid-1942`；`eventPartPolicy.crossStageArticles.background = [event-overview-part-4-turning-point]`。
- `historicalPart` 与派生结果一致：验证器 `allowedPartsForStage(coverage, 'background')` 由契约数据派生出的允许集合 = {`part-3-expansion`, `part-4-turning-point`}；事件当前 `historicalPart = part-3-expansion`，属于允许集合，`--stage background` 通过（见 §4）。
- 当前内容状态（只登记，不修改）：`eventType=raid`、`startDate=1942-04-18`、5 个 article 小节、10 个 `analysisProfiles` 键、11 条 claim、来源 `source-doolittle-after-action-report` + `source-ussbs-pto-ch3`、`researchStatus=sources-retrieved`。
- 数量口径：本阶段共 9 个带分析档案的战役类事件 = **8 场早期战役 + 杜立特空袭（杜立特是第 9 个事件，不是第 8 个）**。
- 归属声明：契约归属由 ARCH-02 定义；既有内容由保留工作树/任务 delta 保留；**HIST-01 是保留/核对方而非重写方**；后续内容任务不得重建或删除该事件。

### 3.3 [修正项] 3 — 研究过程措辞

验收口径：正文、事件 summary 与 claims 不出现检索/取得过程陈述；研究过程只写入 `researchStatus` 字段与 `docs/research/background-sources.md`。

本次实测与修正：

1. 验证器的研究过程措辞规则（ARCH-02 R3，`researchStatus` 规则自 HIST-01 起生效）覆盖 `event.summary`、`event.article[].body`、`claims[].text` 三处；这些位置扫描均为 **0** 处命中（与门禁一致）。
2. **验证器未覆盖的位置仍有残留**：5 位早期战役指挥官档案的 `people[].profile` 正文写有「本教材未取得××本人的回忆录/作战报告」一类取得过程措辞，7 条 claim 的 `note` 字段写有「未取得××统计/记录」一类措辞。这些虽不触发门禁（门禁只查 claim 正文与事件正文/summary），但违反 [修正项] 3 对"正文、claims"的要求，本次已逐条改写：
   - `person-percival-arthur`、`person-wavell-archibald`、`person-hart-thomas`、`person-macarthur-douglas`、`person-maltby-christopher` 的 `profile`：删除「本教材未取得/取得……」的过程陈述，只保留可核实的来源归属（美方官方战史、澳方纪念文章、加方报告转引等）。
   - 另有 7 条 claim 的 `note` 字段写有取得过程措辞，已逐条改写为史料状态表述：`claim-malaya-forces-both-sides`、`claim-singapore-civilian-siege`、`claim-philippines-civilian-path`、`claim-nei-forces-both-sides`、`claim-nei-civilian-oil-plantations`、`claim-indian-ocean-civilian-shipping`、`claim-guam-staging-ogasawara`（把「本节未取得××」改为「××在现有可定位的记载中没有同一口径/没有系统叙述」等）。
3. 改写后全库扫描：`event.summary`、`event.article[].body`、`claims[].text`、`people[].profile`、`claims[].note` 中「检索/取得过程」措辞为 **0**（`sources[].reliabilityNote` 属来源可靠性元数据，含"本教材未取得南云官方传记"这类来源取舍说明，不属于正文/事件/claim 文本；仍按来源元数据保留并在 §3.5 说明）。
4. 过程状态仍在合法位置保留：9 个事件 `researchStatus`（均为 `sources-retrieved`）+ `docs/research/background-sources.md` §3（检索失败记录）。

### 3.4 [修正项] 4 — 达尔文 18 架飞机的类别争议

已读来源事实（本任务于 2026-11-05 重新取回 ONI 第 11 章原文核对：https://www.ibiblio.org/hyperwar/USN/USN-CN-Java/USN-CN-JavaSea-11.html ）：

- ONI《The Java Sea Campaign》（1943）印刷页 p.37：全次空袭「约 72 架水平轰炸机与 18 架俯冲轰炸机（A total of about 72 high-level bombers and 18 dive bombers）」。
- ONI 同章 p.37/38：**09:55 第一波**为「18 架重型轰炸机（18 heavy bombers）……其体型表明它们是以航母或水上飞机母舰为基地」。
- ONI 同章 p.36：敌方来袭飞机「据称是舰载机，但别处又被描述为重型轰炸机（described as carrier-based, though they are elsewhere described as heavy bombers）」——该来源**自己**记录了描述不一致。
- USSBS《Campaigns of the Pacific War》第 3 章 p.30：这次空袭使用了**四艘航母的舰载机**。

本次处置：

1. 保留**唯一**的 `claimType=disputed`：`claim-darwin-carrier-identity-disputed`，locators 同时引出 `source-ussbs-pto-ch3`（The Java Campaign, p. 30）与 `source-oni-java-sea-combat-narrative`（Japanese attack on Darwin, February 19, p. 36 / p. 38）。
2. 改写该 claim 与正文，把分歧表述为**已读来源之间**的分歧：ONI 把首波记为「重型轰炸机」并称高空水平投弹，同一来源又自述"舰载机/重型轰炸机"描述不一、并称其体型表明以航母或水上飞机母舰为基地；USSBS 则称航母舰载机。明确写出「日期、地点与首波十八架的数量可以确认，但这批飞机的机种归类与出发平台在现有官方记载中不能统一」。
3. 改写 `event-darwin-air-raid-1942` 的 summary、正文「一次没有预警的空袭」、`analysisProfiles.uncertainty`，以及第 3 部分导读「达尔文与印度洋」小节，统一区分两个"十八"：**全次空袭合计**约 72 架水平轰炸机 + 18 架俯冲轰炸机（ONI 合计口径）；**09:55 第一波** 18 架（其机种归类存在来源分歧）。日期统一 1942-02-19、地点统一达尔文。
4. 事实 claim `claim-darwin-raid-scale-1942-02-19` 增补「全次空袭合计」限定，避免与首波十八架混淆。
5. 第 3 部分导读文章 `event-overview-part-3-expansion` 的「达尔文与印度洋」小节与事件 `claimIds` 增加 `claim-darwin-carrier-identity-disputed`，使正文呈现争议时引用对应 disputed claim。
6. 「重型轰炸机」字样只出现在**争议框架内**：引用 ONI 原文、或明确声明「本条目不把重型轰炸机当作确定事实」；不存在把「重型轰炸机」当定论的表述。`event-overview-part-3-expansion` 的 `claimIds` 由 11 条增至 12 条（新增 `claim-darwin-carrier-identity-disputed`），其「达尔文与印度洋」小节的 `claimIds` 同步新增该 claim；`event-darwin-air-raid-1942` 的 `claimIds` 未变（原本已含该 disputed claim）。

**与验收字面的一处偏差（如实记录，不掩盖）**：验收行提到「claimType=disputed 且同时引出 ONI 与 USAF HS-109 的来源定位」。本任务**没有**引用 USAF Historical Study 109（1948）：该研究在本任务中**从未取得、从未读取、没有可核实的页码**。依据内容政策「不得虚构来源/定位」与工作单 [修正项] 4 要求"明确写出争议及各方来源定位"的可核查原则，本任务不为其建立 source/claim/页码；争议由**实际读取过的** ONI p.36/p.38 与 USSBS p.30 承载。若后续任务要引用该 1948 年研究，必须先取得其正文并建立带真实页码的来源记录。此偏差与上轮评审"不得重新引入未读来源"的结论一致。

### 3.5 [修正项] 5 — `docs/research/background-sources.md` 审计与更正

按"只列实际查阅且能映射到 claims 的来源与定位；不声称不存在的 `reliabilityNote`；不声称 `--stage background` 提供字数/深度门禁；§0.2 与 §3/§5 一致；只描述真实存在的检查命令"逐条审计，发现并更正：

1. **`reliabilityNote` 表述**：确认 `contracts/content.schema.json` 中 `person` 为 `additionalProperties: false` 且没有 `reliabilityNote`（10 条 people 记录均无该字段）；`sources[]` 定义**有** `reliabilityNote`（当前 28/28 条来源均写有）。文档原句「只有 `sources[]` 记录才有该字段」属实，增加"当前 28 条来源均写有"的实测限定，避免被误读为 person 也存在该字段。
2. **"档案正文里明说未取得本人回忆录"是错误记录**：实测 5 位指挥官 `profile` 正文在本次修正前确有该类措辞（见 §3.3），本次已从正文删除。文档改为如实说明：来源限制记录在**本文件 §5** 与 `sources[].reliabilityNote` / `researchStatus`，**不写进档案正文**（正文禁止研究过程措辞）。
3. **§0.2 与 §3/§5 一致**：修正 §0.2 中指向不存在小节「§5.1」的交叉引用；把"本次"标注从 attempt 5 更新为 attempt 5 历史记录 + attempt 6 有界修正记录；使 §0.2 对"研究过程措辞已移除"的陈述覆盖本次对 person 正文与 claim note 的清理，与 §3/§5 一致。
4. **门禁深度表述**：确认 §7 明确写出 `--stage background` **没有**引入比 `--stage strategy` 更高的篇幅门槛（同一批实体同一组 `minimumDepth`；`--stage strategy` 在当前内容上同样 PASS），并把它精确化为：background 新增的强制项是"哪些实体必须存在"、契约的十键 `analysisProfiles` 结构/最小篇幅规则与 `researchStatus` 规则（这些是契约规则与人工评审核对的范围，不是额外的"深度门禁"）；空 `media` 数组只产生迁移警告，不影响退出码。
5. **站点消费链路更正**：原先写"站点消费 `earlyCampaignAnalysis` 字段"的表述会误导为站点已展示本次迁移后的 `analysisProfiles`。实测 `src/data/index.ts` / `types.ts` / `TimelineView.tsx` 仍只读取旧字段 `earlyCampaignAnalysis`，而本任务内容已按已接受契约迁移到 `analysisProfiles`；因此站点当前**不会**渲染这批早期战役分析块。这是消费者侧待更新项（不在本任务 `src/` 写权限内），已在 §6 登记为后续任务输入，不作为本任务已修复项。
6. **来源/定位映射**：保留 §1（本轮实际读取并引用）、§2（HIST-00 读过、本轮未重新打开，`previously verified, NOT re-verified this attempt`）、§3（检索失败）、§4/§4.2（材料缺口与达尔文分歧）、§5（指挥官档案取材）。把 §1.6 与 §4.2 更新为本次达尔文处置后的实际状态：内容不再用不点名的"另一份战后航空研究"指代未读来源，争议完全由 ONI + USSBS 承载。
7. **只描述真实存在的检查命令**：§7 仅描述实际运行的 `node scripts/validate-content.mjs --stage strategy|background`、`--check-contracts`、`--self-test`（以及存在的 `--media`/`--stage full` 关系）；不虚构命令或检查项。

### 3.6 [修正项] 6 — 媒体迁移登记（0 条，属主 MEDIA-02）

- `content/history.json` 顶层 `media` 当前为**空数组（0 条）**；它是 ARCH-02 迁移契约的**输入**，不是本任务要补建的注册表。
- 本任务**未创建** `content/media.json`，**未**新增/改写任何媒体实体，**未**写 `public/`；`media` 迁移清单 0 条，见 §5。
- 已接受验证器对该遗留字段只给出**迁移提示（警告）**，不影响 `--stage background` 退出码；本任务不把该警告当作失败条件，也不为使警告消失而改写媒体实体。
- `content/media.json` 与素材注册由 **MEDIA-02 首次交付**；HIST-04 不写该文件；QA-01 运行 `--media` 校验；WEB-01/MAP-01 只读消费。

### 3.7 [修正项] 7 — 本报告与前置

本报告按 [第 0 步] 在开工时以**第一个编辑**建立（未先读取不存在的文件），并在运行全部门禁后回填真实输出与退出码（见 §4），在提交前保持完整存在。

---

## 4. 门禁实际命令、输出与退出码

以下为本任务在修正完成后、于本工作树实际运行的命令（`node` 直接执行，不依赖 `node_modules`，未使用 `--media`/`--file`，未修改契约/验证器/工作树历史）。输出见各条 tail。

### 4.1 `node scripts/validate-content.mjs --stage background`

退出码：**0**

```text
实体：72；来源：28；claim：228；问题：4；素材：0

警告：
- $.media: history.json 仍含空的 legacy media 数组（过渡窗口内仅警告）。迁移映射：把 history.json 顶层 media[] 原样搬到 content/media.json 的 { "version": 1, "media": [...] } 中（条目形状完全不变，articleIds 仍是文章关联），并删除 history.json 的 media 字段。 由 MEDIA-02 写入 content/media.json；HIST-04 不写；QA-01 运行 --media 校验；WEB-01/MAP-01 只读。

结果：PASS
说明：结构验证通过不等于可读性评审通过；可读性证据须见 tests/evidence/pedagogy.md。
```

该警告是 `media` 迁移提示（见 §5/[修正项] 6），不影响退出码，不当作失败。

### 4.2 `node scripts/validate-content.mjs --stage strategy`

退出码：**0**；结果行：`结果：PASS`（实体 72；来源 28；claim 228；问题 4；素材 0）。

### 4.3 `node scripts/validate-content.mjs --check-contracts`

退出码：**0**；结果行：`结果：PASS（契约文件一致；这不代表 content/history.json 已交付）`。tail 包含：`schema 的 analysisProfiles 恰好要求 10 个具名键`、`schema 的 researchStatus 枚举与 event 字段一致` 等 PASS 行。

### 4.4 `node scripts/validate-content.mjs --self-test`

退出码：**0**；结果行：`自测结果：153/153 通过`。

### 4.5 其它核对命令

- `git status --porcelain`：只列出本任务三个文件（见 §7）。
- `Get-FileHash -Algorithm SHA256 content/history.json, docs/research/background-sources.md, docs/research/hist01-delta-report.md`：见 §7。
- `Test-Path content/media.json` → `False`（本任务未创建）。
- 杜立特事件保留核对：`event-doolittle-raid-1942` 的 JSON 与 `git show HEAD:content/history.json` 中该事件逐字节等价（`JSON.stringify` 比较为 true）。
- 未运行 `--stage full`/`--media`：`battles=0` 且媒体由 MEDIA-02 交付，不属于本任务范围（不声称通过）。

---

## 5. media 迁移清单（0 条）

| # | 迁移条目 | 目标文件 | 属主 | 本任务处置 |
|---:|---|---|---|---|
| — | （无。`history.json` 顶层 `media` 为空数组，0 条） | `content/media.json`（`{version:1, media:[...]}`） | **MEDIA-02** | 只登记，不创建/不改写 |

说明：

1. 迁移映射：把 `history.json` 顶层 `media[]` 原样搬到 `content/media.json` 的 `{ "version": 1, "media": [...] }`，条目形状不变（`articleIds` 仍是文章关联），并删除 `history.json` 的 `media` 字段。
2. 验证器警告（`$.media: history.json 仍含空的 legacy media 数组（过渡窗口内仅警告）`）不影响 `--stage background` 退出码；不把该警告当失败。
3. 本任务**未创建** `content/media.json`（`Test-Path content/media.json` = False）。
4. 该空数组警告在每个阶段（strategy/background）都出现一次，属迁移提示，不是本任务失败条件。

---

## 6. 未解决项与所属后续任务（只登记，不写成已修复）

| # | 未解决项 | 归属后续任务 |
|---:|---|---|
| 1 | 三场重点战役档案（`battle-pearl-harbor`、`battle-coral-sea`、`battle-midway`）尚未创建（`battles=0`）；没有占位/空壳战役 | HIST-02 / HIST-03 / HIST-04 |
| 2 | 第 2、4、5 部分导读与其余部分问题未交付；问题集跨部分计数核对 | HIST-02..HIST-04、QQUEST-01 |
| 3 | 素材注册表 `content/media.json` 与 `--media` 校验未交付（本阶段必然失败，non-blocking） | MEDIA-02（写入；QA-01 运行 `--media`） |
| 4 | 五个指挥官档案均只有 2 个独立来源（非 3 个）；Percival 496 / Macarthur 433 / Hart 401 汉字低于 500 汉字惯例 | DOC-02（档案深度）及后续来源研究任务 |
| 5 | 部分来源（NHHC、CMH、USNI、IWM、NARA、AWM 部分条目等）在本环境不可达；三场重点战役官方战斗叙事仍未读到；无中文语种档案来源 | 后续来源研究任务（HIST-02..HIST-04 / DOC-02） |
| 6 | 关岛岛级战斗细节的史料缺口（守军兵力/编成、登陆时刻地点、抵抗时长、双方伤亡）仍存在；本任务只把这一缺口写成史料学表述，未虚构细节 | 后续档案/来源任务 |
| 7 | 印度洋两次打击的逐次战果与战略意图在已读材料中无法确认，已登记为开放问题 | 后续档案/来源任务 |
| 8 | 站点消费者仍读取旧字段 `earlyCampaignAnalysis`，未消费本内容已迁移的 `analysisProfiles`；当前站点侧不会渲染早期战役分析块（`src/` 不在本任务写权限内） | WEB 侧消费者更新任务（契约消费方），或由 ARCH 契约所有权方指定 |
| 9 | USAF Historical Study 109（1948）从未取得、无页码；本任务不引用（见 §3.4） | 后续取得该研究正文并建立真实页码来源的任务 |
| 10 | 杜立特事件当前 `historicalPart=part-3-expansion`（在契约允许集合内）；其内容主题属第 4 部分，是否需要改挂第 4 部分导读是内容设计问题，本任务不重写 | HIST-04 / 第 4 部分内容任务 |
| 11 | 可读性/教学效果须由人工评审并记录 `tests/evidence/pedagogy.md`；该中央交付物尚不存在 | 中央 QA / 评审 |

---

## 7. 变更文件与提交范围

本任务允许编辑且实际编辑的三个文件（工作单 [窄范围]）：

1. `content/history.json` — 早期战役分析文本修正、达尔文争议一致化、研究过程措辞清理（不含结构/ID 变更；不新增/删除实体）。
2. `docs/research/background-sources.md` — 按 §3.5 更正记录。
3. `docs/research/hist01-delta-report.md` — 本报告（新建）。

提交前核对：`git status --porcelain` 只显示上述三个路径及本报告新建；无 `contracts/`、`scripts/`、`src/`、`public/`、`content/media.json` 改动；无 commit/merge/push。

最终状态（提交前）：

| 文件 | 状态 | SHA-256 |
|---|---|---|
| `content/history.json` | 修改 | `220ED6B0B9C79D9C69A16EE3AA3372D858EA3EEB016A1F88489AB5A41148E1C9` |
| `docs/research/background-sources.md` | 修改 | `146A6C2976FD2E49E9D362D5CC7FCD75DF758F89E7D92FDAE4710F1AEA26F708` |
| `docs/research/hist01-delta-report.md` | 新建 | 本文件为最终提交版本；其自身哈希由集成服务在提交时记录，不在此自引用。 |

`git status --porcelain`：

```text
 M content/history.json
 M docs/research/background-sources.md
?? docs/research/hist01-delta-report.md
```

无 `contracts/`、`scripts/`、`src/`、`public/`、`content/media.json` 改动；本任务未 commit/merge/push。

---

## 8. 提交性质与限制

1. 本任务只交付并修正**内容与来源记录**；不改写契约、验证器、`coverage.json` 或 `src`。
2. 本报告的计数与门禁结果来自本工作树实际运行；中央会在提交后独立重跑 `task.checks`。
3. 结构性 PASS 不等于可读性/教学效果通过；后者须由人工评审与 `tests/evidence/pedagogy.md` 证明。
4. 板卡完成 = 提交，不是 central verified/done。
