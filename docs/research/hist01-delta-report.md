# HIST-01 有界修正 Delta 报告（attempt 7）

状态：本文件是 HIST-01 attempt 7「早期扩张内容的有界根因修正」的提交绑定报告。它由 attempt 6 在开工时按 [第 0 步] 以第一个编辑建立；attempt 7 在其上更新，并更正 attempt 6 报告中不成立的自证结论（见 §3.3）。

- 任务：HIST-01（模块 knowledge，角色 content_creator），attempt 7
- 工作单：`.cache/orders/HIST-01-a7.md`，sha256 = `f5230429fcbabf80e6e03924efa6974700ba6bcdc362dc3392745c7c6d4e630c`（只读操作性输入，本任务未编辑）
- 本次上下文：`sourceBase=8b0ca6a`、`contextCommit=79dd583`、`resumedSource=fc7c9b9`、`integrationAtDispatch=22631123`
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
| `b6fb659000804239384c8584515d57de874d3ece` | **attempt 6 开工 HEAD**（"Checkpoint unfinished HIST-01 source before context preparation"），父提交 = `b920075` | `b920075` + 未完成 HIST-01 的检查点：`M content/history.json`、`M docs/research/background-sources.md` |
| `fc7c9b90b6c4f4c8dc399d98929cbd14595b6b32` | HIST-01 attempt 6 的提交（`resumedSource`） | `b6fb659` + attempt 6 修正 |
| `22631123d1099b2b40a8294579a35a594626bc08` | 集成服务合并树（`integrationAtDispatch`；含尚未接受的 MAP-00） | 集成基线 |
| `79dd583238e3de3fc99f60d479943076a325cb17` | **attempt 7 开工 HEAD / `contextCommit`**（"Merge 2263112 into matrix/knowledge"） | `22631123` + HIST-01 attempt 6（`fc7c9b9`） |

结论：

1. `8b0ca6a` 是 `b920075` 的父提交，`b920075` 是 `b6fb659` 的父提交；`8b0ca6a` 已被确认为 HEAD 的祖先（`git merge-base --is-ancestor 8b0ca6a HEAD` 为真）。
2. 从 `8b0ca6a` 到 `b920075` 的差异**只有** HIST-01 的来源文件（`content/history.json` 修改、`docs/research/background-sources.md` 新增），没有混入其它模块的改动。
3. 从 `b920075` 到 `b6fb659` 的差异同样**只有**这两个文件，属"检查点"性质的未完成 HIST-01 来源。
4. attempt 6 开工时工作树对 `b6fb659` 是**干净**的；本文件的基线行与 §1 计数是 attempt 6 开工时的实测值，attempt 7 复核保持一致（唯一变化是 HEAD 前进到 `79dd583`）。
5. attempt 7 开工时工作树对 `79dd583` 是**干净**的（`git status --porcelain` 无输出）。**候选仍按订单 = 已接受集成 head `8b0ca6a` + 本任务的 `content/`、`docs/research/` delta**；HEAD `79dd583` 中另有尚未接受的 MAP-00 对 `src/`、`scripts/validate-site.mjs` 的修改（`git diff --name-status fc7c9b9 79dd583` 可见），它们**不属于本任务候选，本任务不依赖、不修改**。
6. `docs/research/hist01-delta-report.md` 在 attempt 6 开工时**不存在**，按 [第 0 步] 由 attempt 6 以第一个编辑建立；**attempt 7 开工时该报告已存在**（`Test-Path` 为 True），本文件在其上更新。
7. 本任务**不**修改 `contracts/`、`scripts/`、`src/`、`public/`；**未**创建 `content/media.json`；**未**做 git commit/merge/push（Git 由集成服务拥有）。

候选的契约基线（来自已接受 ARCH-02 `cb4ae59` / 集成 head `8b0ca6a`）：`contracts/coverage.json` 的 `stageOwnership`、`eventPartPolicy`、`earlyCampaign.analysisProfiles`、`earlyCampaign.researchStatus`、`crossChapterContradiction`、`mediaRegistry`；`contracts/content.schema.json` 的 `event.analysisProfiles` / `event.researchStatus` / `source.reliabilityNote`（`person` 为 `additionalProperties: false` 且**没有** `reliabilityNote`）。

---

## 1. 第 0 步只读核对结果（attempt 6 开工实测，attempt 7 复核）

| 核对项 | 实测 |
|---|---|
| `content/history.json` 计数 | events 14 / battles 0 / people 10 / places 37 / units 2 / equipment 3 / concepts 6 / sources 28 / media **0** / questions 4 / claims 228 |
| 早期战役 `analysisProfiles` | 9 个事件带 `analysisProfiles`（8 场早期战役 + 杜立特空袭），每个 10 键；`earlyCampaignAnalysis`（旧五键）**0** 个 |
| `researchStatus` | 上述 9 个事件均声明（取值 `sources-retrieved`） |
| 第 3 部分问题（既有，保留） | `question-why-allies-lost-early`、`question-why-japan-overextended`（均 `part-3-expansion`），本任务不新增/不改写/不删除 |
| 杜立特事件（既有，保留） | `event-doolittle-raid-1942` 存在：`historicalPart=part-3-expansion`、5 个 article 小节、10 个 analysisProfiles 键、11 条 claim、2 个来源、`researchStatus=sources-retrieved` |
| media 遗留字段 | `history.json` 顶层 `media: []`（0 条），是迁移输入；`content/media.json` 不存在 |
| 本报告 | attempt 6 开工时不存在 → 第一个编辑创建；attempt 7 开工时已存在（本次更新） |

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

1. 验证器的研究过程措辞规则（ARCH-02 R3，`researchStatus` 规则自 HIST-01 起生效）覆盖 `event.summary`、`event.article[].body`、`claims[].text` 三处。**attempt 6 曾在本节声称这三处为 0 命中——该声明不成立**（见第 3 条更正）；验证器通过只说明它没有命中自己的黑名单，不等于正文没有取得过程/编辑口吻。
2. **验证器未覆盖的位置仍有残留**：5 位早期战役指挥官档案的 `people[].profile` 正文写有「本教材未取得××本人的回忆录/作战报告」一类取得过程措辞，7 条 claim 的 `note` 字段写有「未取得××统计/记录」一类措辞。这些虽不触发门禁（门禁只查 claim 正文与事件正文/summary），但违反 [修正项] 3 对"正文、claims"的要求，本次已逐条改写：
   - `person-percival-arthur`、`person-wavell-archibald`、`person-hart-thomas`、`person-macarthur-douglas`、`person-maltby-christopher` 的 `profile`：删除「本教材未取得/取得……」的过程陈述，只保留可核实的来源归属（美方官方战史、澳方纪念文章、加方报告转引等）。
   - 另有 7 条 claim 的 `note` 字段写有取得过程措辞，已逐条改写为史料状态表述：`claim-malaya-forces-both-sides`、`claim-singapore-civilian-siege`、`claim-philippines-civilian-path`、`claim-nei-forces-both-sides`、`claim-nei-civilian-oil-plantations`、`claim-indian-ocean-civilian-shipping`、`claim-guam-staging-ogasawara`（把「本节未取得××」改写为史料状态表述；attempt 7 又把其中残留的「可定位」改为「现有史料中」，见第 3 条）。
3. **attempt 6 报告的 0 命中声明不成立（attempt 7 更正）**：attempt 6 第 1、3 条使用的是验证器黑名单式模式，没有覆盖「本节取得的是……」「因此正文不给出」「材料上有……」「本节最需要坦白的是……」「凡属……都应以这种并列的形式呈现」这类取得过程口吻与写作说明，也没有覆盖「可定位」式检索表述；因此这些句子在 attempt 7 复审时仍可读到。本报告**删除**「全库 0 命中」的声明。
4. **attempt 7 的扫描模式与范围**：范围 = 9 个 early-expansion 事件（`historicalPart=part-3-expansion`：8 场早期战役 + 杜立特 + 第 3 部分导读）及其关联 claims（`event.claimIds` ∪ `entityIds` 含该事件 ID 的 claims）；字段 = `event.summary`、`event.article[].body`、`event.analysisProfiles.*.body`、`claims[].text`。两组模式：取得/检索过程 `/(本节取得|本教材未|未取得|检索|查证|可定位|材料上|坦白)/`；编辑/写作说明口吻 `/(本节|本教材|本文|正文|教材|读者|提醒读者|并列的形式)/`。
5. **实际残余命中（attempt 7 已逐条修正）**：
   - 4 个 `article[].body`「不确定与争议之处」整段改写为历史分析：`event-malaya-singapore-1942`（教材必须把……说清楚 / 因此正文只写）、`event-philippines-bataan-corregidor-1942`（本节取得的是…… / 因此正文不给出 / 没有可定位的专门记述 / 本节并列这两种看法）、`event-dutch-east-indies-1942`（材料上有几点必须说清楚 / 本节取得的主要 / 因此正文只能写到 / 教材不给出）、`event-indian-ocean-raid-1942`（本节最需要坦白 / 读者可以自己判断 / 教材不替读者下结论 / 都应以这种并列的形式呈现 / 缺少可定位的记述 / 正文中已提示）。
   - 同一范围内另有编辑口吻与「可定位」式表述：`event-malaya-singapore-1942`（article[5]「因此这里不列出」、uncertainty「缺乏可定位的统计」）、`event-philippines-bataan-corregidor-1942`（uncertainty）、`event-dutch-east-indies-1942`（article[7]「现有记载没有给出……所以这里只写……而不是替这段历史编一个数字」、uncertainty）、`event-hong-kong-1941`（uncertainty）、`event-wake-island-1941`（article[2]「本节照此转述」）、`event-guam-1941`（article[1] 与 geography/participants/objectivesAndForces/course/options）、`event-darwin-air-raid-1942`（resultsAndLosses）、`event-indian-ocean-raid-1942`（article[0]「教材在这里必须守住这条界线」、article[2]「这里只写」、article[4]「需要提醒读者 / 因此这里不列」、article[5]「缺少可定位」、article[6]「提醒读者」、analysisProfiles participants/objectivesAndForces/options/impact/uncertainty）——逐条改写为「日方文件译文与美方战后报告 / 现有史料」等史料表述，或删除写作说明。
   - claims 文本：`claim-guam-uncertainty`（在目前可定位的记载中 / 正文不作叙述）、`claim-philippines-uncertainty`（缺少可定位的专门记载）、`claim-nei-uncertainty`（目前可定位的只有）、`claim-indian-ocean-uncertainty`（在目前可定位的材料中 / 列为开放问题）——改写为基于史料的历史不确定性表述。
   - claim `note` 元数据中 7 处「可定位」表述（`claim-malaya-forces-both-sides`、`claim-singapore-civilian-siege`、`claim-philippines-civilian-path`、`claim-nei-forces-both-sides`、`claim-nei-civilian-oil-plantations`、`claim-indian-ocean-civilian-shipping`、`claim-guam-staging-ogasawara`）改为「现有史料中」。
6. **修正后的扫描结果**：用第 4 条的两组模式在**同一范围与字段**上重跑，命中数为 **0**。该结果只对上述范围成立：`sources[].reliabilityNote`（来源元数据）、`claims[].note`（审计元数据中仍保留少量历史措辞）以及 **HIST-00 已接受内容**（第 1 部分事件、人物、专题、问题及其 claims 中的教学性「教材/读者」等表述）**不在**声明范围内；按 [职责边界] 本任务不改写 HIST-00 已接受内容。`--stage background` 只强制验证器黑名单，不覆盖上述编辑口吻，这正是 attempt 6 误报 0 的原因。
7. 过程状态仍在合法位置保留：9 个事件 `researchStatus`（均为 `sources-retrieved`）+ `docs/research/background-sources.md` §3（检索失败记录）。

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
7. **（attempt 7）USAF 研究编号核对**：见下方偏差说明。**未**把「USAF Historical Study 109」或其任何页码写进 claim/正文/`sources[]`。

**与验收字面的一处偏差（attempt 7 已查清原因，如实记录，不掩盖）**：验收行要求 claim「同时引出 ONI 与 USAF HS-109 的来源定位」。attempt 7 核对了 AFHRA《Numbered USAF Historical Studies》编号索引（GPO 永久存档，HTTP 200，2026-11-05 读取：https://permanent.access.gpo.gov/websites/dodandmilitaryejournals/www.au.af.mil/au/afhra/wwwroot/numbered_studies/studies3.php.htm ）：**No. 109 =《(U) The Fourteenth Air Force to 1 October 1943》, by Herbert Weaver and Marvin A. Rapp (1945), 169 pages——一部中国战区第十四航空队研究，与达尔文空袭无关**。与菲律宾/荷属东印度战场真正相关的是 **No. 111 =《(U) Army Air Action in the Philippines and Netherlands East Indies, 1941-1942》, by Richard L. Watson, Jr. (1945), 300 pages**（IRIS 00467695 / 467695.pdf）。因此「USAF HS-109 记为俯冲轰炸机」在来源层面是**编号误指**：引用它来支撑达尔文机种会构成对来源的误归属，违反内容政策「不得虚构来源/定位」。

对 HS-111 的取用尝试（attempt 7）：GPO 的 `467695.pdf` 经 `web_fetch` 返回 `unsupported content type "application/pdf"`；文本代理 `r.jina.ai` 返回空正文（无 OCR 文本）；Internet Archive 检索无该研究副本——**因此 HS-111 也未能读取、不能引用、不能给页码**。本任务据此**不**为 HS-109 或其他未读的 USAF 研究建立 source/claim/locator；争议只由实际读过的 ONI p.36/p.38 与 USSBS p.30 承载。

**结论**：这不是一处可以靠「补一个 locator」解决的遗漏，而是**验收前提的编号错误**。建议评审/契约所有权方把验收行改为「ONI + 与该战场相关的 USAF 研究（HS-111）」，并允许在取得 HS-111 前保持本 documented deviation；本任务已把它登记为未解决项（§6 第 9 条）与升级项。虚构引用比未满足一条验收标准糟糕得多，因此本任务选择后者并留下证据。

### 3.5 [修正项] 5 — `docs/research/background-sources.md` 审计与更正

按"只列实际查阅且能映射到 claims 的来源与定位；不声称不存在的 `reliabilityNote`；不声称 `--stage background` 提供字数/深度门禁；§0.2 与 §3/§5 一致；只描述真实存在的检查命令"逐条审计，发现并更正：

1. **`reliabilityNote` 表述**：确认 `contracts/content.schema.json` 中 `person` 为 `additionalProperties: false` 且没有 `reliabilityNote`（10 条 people 记录均无该字段）；`sources[]` 定义**有** `reliabilityNote`（当前 28/28 条来源均写有）。文档原句「只有 `sources[]` 记录才有该字段」属实，增加"当前 28 条来源均写有"的实测限定，避免被误读为 person 也存在该字段。
2. **"档案正文里明说未取得本人回忆录"是错误记录**：实测 5 位指挥官 `profile` 正文在本次修正前确有该类措辞（见 §3.3），本次已从正文删除。文档改为如实说明：来源限制记录在**本文件 §5** 与 `sources[].reliabilityNote` / `researchStatus`，**不写进档案正文**（正文禁止研究过程措辞）。
3. **§0.2 与 §3/§5 一致**：修正 §0.2 中指向不存在小节「§5.1」的交叉引用；把"本次"标注从 attempt 5 更新为 attempt 5 历史记录 + attempt 6 有界修正记录；使 §0.2 对"研究过程措辞已移除"的陈述覆盖本次对 person 正文与 claim note 的清理，与 §3/§5 一致。
4. **门禁深度表述**：确认 §7 明确写出 `--stage background` **没有**引入比 `--stage strategy` 更高的篇幅门槛（同一批实体同一组 `minimumDepth`；`--stage strategy` 在当前内容上同样 PASS），并把它精确化为：background 新增的强制项是"哪些实体必须存在"、契约的十键 `analysisProfiles` 结构/最小篇幅规则与 `researchStatus` 规则（这些是契约规则与人工评审核对的范围，不是额外的"深度门禁"）；空 `media` 数组只产生迁移警告，不影响退出码。
5. **站点消费链路更正**：原先写"站点消费 `earlyCampaignAnalysis` 字段"的表述会误导为站点已展示本次迁移后的 `analysisProfiles`。实测 `src/data/index.ts` / `types.ts` / `TimelineView.tsx` 仍只读取旧字段 `earlyCampaignAnalysis`，而本任务内容已按已接受契约迁移到 `analysisProfiles`；因此站点当前**不会**渲染这批早期战役分析块。这是消费者侧待更新项（不在本任务 `src/` 写权限内），已在 §6 登记为后续任务输入，不作为本任务已修复项。
6. **来源/定位映射**：保留 §1（本轮实际读取并引用）、§2（HIST-00 读过、本轮未重新打开，`previously verified, NOT re-verified this attempt`）、§3（检索失败）、§4/§4.2（材料缺口与达尔文分歧）、§5（指挥官档案取材）。把 §1.6 与 §4.2 更新为本次达尔文处置后的实际状态：内容不再用不点名的"另一份战后航空研究"指代未读来源，争议完全由 ONI + USSBS 承载。
7. **只描述真实存在的检查命令**：§7 仅描述实际运行的 `node scripts/validate-content.mjs --stage strategy|background`、`--check-contracts`、`--self-test`（以及存在的 `--media`/`--stage full` 关系）；不虚构命令或检查项。
8. **（attempt 7）§4.2 自相矛盾已消除**：原文一处称「attempt 6 已删除对未读研究的间接提及」，另一处仍称「正文只以不点名说法概括」。attempt 7 统一为：该提及已在 attempt 6 删除，attempt 7 复核 `content/history.json` 中 0 处指代；并补入 AFHRA 编号证据（No.109 ≠ 达尔文；相关为 No.111，未读未引用）。
9. **（attempt 7）删除对自身核验的夸大**：`background-sources.md` 不再声称任何一轮实现全库「0 命中」，改为引用本报告 §3.3 的实际扫描模式、范围与残余命中清单；同时新增 §1.9 的 AFHRA 书目核对记录（明确它是书目工具、不是 claim 来源）。
10. **（attempt 7）站点消费者状态更新**：区分「已接受基线 8b0ca6a 上站点读旧字段」与「当前工作树 HEAD 含未接受 MAP-00、其 src 已改为读 analysisProfiles」；本任务不依赖 MAP-00。

### 3.6 [修正项] 6 — 媒体迁移登记（0 条，属主 MEDIA-02）

- `content/history.json` 顶层 `media` 当前为**空数组（0 条）**；它是 ARCH-02 迁移契约的**输入**，不是本任务要补建的注册表。
- 本任务**未创建** `content/media.json`，**未**新增/改写任何媒体实体，**未**写 `public/`；`media` 迁移清单 0 条，见 §5。
- 已接受验证器对该遗留字段只给出**迁移提示（警告）**，不影响 `--stage background` 退出码；本任务不把该警告当作失败条件，也不为使警告消失而改写媒体实体。
- `content/media.json` 与素材注册由 **MEDIA-02 首次交付**；HIST-04 不写该文件；QA-01 运行 `--media` 校验；WEB-01/MAP-01 只读消费。

### 3.7 [修正项] 7 — 本报告与前置

本报告由 attempt 6 按 [第 0 步] 在开工时以**第一个编辑**建立；attempt 7 在其上更新并回填全部门禁的真实输出与退出码（见 §4），在提交前保持完整存在。

### 3.8 attempt 7 复审修正清单（本次提交）

| # | 复审项（attempt 6 → 7） | 处置 |
|---:|---|---|
| 1 | 4 个战役「不确定与争议之处」的取得过程/写作说明口吻 | 整段改写为历史分析（史料确认了什么 / 说法在哪里分歧 / 什么仍无法确定 + 来源归属），见 §3.3 第 5 条 |
| 2 | `claim-guam-uncertainty` / `claim-philippines-uncertainty` | 改写为基于史料的历史不确定性；同类改写 `claim-nei-uncertainty` / `claim-indian-ocean-uncertainty` |
| 3 | 同一范围 12 处「可定位」/编辑口吻 | 逐条改写或删除（完整清单见 §3.3 第 5 条） |
| 4 | delta 报告 §3.3 / background-sources §0.2 的「0 命中」误报 | 更正为实际扫描模式、范围、残余命中与修正后 0；并披露未覆盖范围（见 §3.3 第 3–6 条） |
| 5 | `background-sources.md` §4.2 自相矛盾与自证夸大 | 统一表述、补 AFHRA 编号证据、删除全库 0 命中声明（见 §3.5 第 8–9 条） |
| 6 | HS-109 验收前提 | 查清 No.109 = 第十四航空队研究；相关的研究是 No.111（未读未引用）；登记为验收前提编号错误 + 未解决项（§3.4、§6 第 9/12 条） |
| 7 | 杜立特事件 | 未改动（与 HEAD 版本逐字节一致，见 §4.5） |

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

### 4.5 其它核对命令（attempt 7 实测）

- `git status --porcelain`：只有本任务三个文件（见 §7）。
- `Test-Path content/media.json` → `False`（本任务未创建）。
- 杜立特事件保留核对：`event-doolittle-raid-1942` 的 JSON 与 `git show HEAD:content/history.json` 中该事件逐字节等价（`JSON.stringify` 比较为 true）。
- 计数核对：`events 14 / battles 0 / people 10 / places 37 / units 2 / equipment 3 / concepts 6 / sources 28 / media 0 / questions 4 / claims 228`；门禁 `实体：72` = 14+10+37+2+3+6。
- 未读 USAF 研究核对：对 `content/history.json` grep `HS-109` / `109` / `Historical Study` / `USAF` /「空军历史研究」→ 均为 **0** 处。
- attempt 7 编辑口吻扫描（模式与范围见 §3.3 第 4 条）：命中 **0**。
- `--stage full`/`--media` 未运行：`battles=0` 且媒体由 MEDIA-02 交付，不属于本任务范围（不声称通过）。

### 4.6 attempt 7 外部书目核对（不作为 claim 来源）

- `web_fetch https://permanent.access.gpo.gov/websites/dodandmilitaryejournals/www.au.af.mil/au/afhra/wwwroot/numbered_studies/studies3.php.htm` → **HTTP 200**；读出 No.109（The Fourteenth Air Force to 1 October 1943, Weaver & Rapp 1945, 169 pp）与 No.111（Army Air Action in the Philippines and Netherlands East Indies 1941-1942, Watson 1945, 300 pp）。
- 取用 HS-111 正文：GPO `467695.pdf` → `unsupported content type "application/pdf"`；`r.jina.ai` 文本代理 → 空正文；Internet Archive 检索 → 无副本。**未读取，未引用，未给页码。**

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
| 8 | 站点消费者状态：已接受基线 8b0ca6a 上站点读取旧字段 `earlyCampaignAnalysis`、不渲染 `analysisProfiles`；当前工作树 HEAD 含未接受的 MAP-00，其 `src/` 已改为读十键 `analysisProfiles`（本任务不依赖） | WEB 侧消费者任务 / MAP-00 集成（契约消费方） |
| 9 | 验收行所称「USAF HS-109」是编号误指：AFHRA No.109 = 第十四航空队研究；与达尔文相关的是 No.111（Watson 1945），本任务未能取得正文，未引用、无页码（见 §3.4） | 评审/契约所有权方修正验收措辞；后续任务取得 HS-111 后建立真实页码来源 |
| 10 | 杜立特事件当前 `historicalPart=part-3-expansion`（在契约允许集合内）；其内容主题属第 4 部分，是否需要改挂第 4 部分导读是内容设计问题，本任务不重写 | HIST-04 / 第 4 部分内容任务 |
| 11 | 可读性/教学效果须由人工评审并记录 `tests/evidence/pedagogy.md`；该中央交付物尚不存在 | 中央 QA / 评审 |
| 12 | 验收前提编号错误需要 review / contract amendment；本任务选择不虚构 locator 的 documented deviation（见 §3.4） | Module Lead 评审 + 契约所有权方 |
| 13 | attempt 7 编辑口吻清理只覆盖本任务承认范围（9 个 early-expansion 事件及其 claims）；HIST-00 已接受内容（含其 claims）与 `claims[].note` 审计元数据不在 0 命中声明范围（见 §3.3 第 6 条） | 后续内容维护任务（若要求全库统一） |

---

## 7. 变更文件与提交范围

本任务允许编辑且实际编辑的三个文件（工作单 [窄范围]）：

1. `content/history.json` — 早期战役分析文本修正、达尔文争议一致化、研究过程措辞清理（不含结构/ID 变更；不新增/删除实体）。
2. `docs/research/background-sources.md` — 按 §3.5 更正记录。
3. `docs/research/hist01-delta-report.md` — 本报告（attempt 6 新建；attempt 7 更新）。

提交前核对：`git status --porcelain` 只显示上述三个路径；无 `contracts/`、`scripts/`、`src/`、`public/`、`content/media.json` 改动；无 commit/merge/push。

最终状态（提交前）：

| 文件 | 状态 | SHA-256 |
|---|---|---|
| `content/history.json` | 修改 | `FD3D92E6EFA44B80C97DE116ABC436BF284E0C78E3EB2AE788A067E652AA69CD` |
| `docs/research/background-sources.md` | 修改 | `5F27052CB2A966D62CF8A2106191D66ABAF75E887B6B2F4B9790DF15E6334DD6` |
| `docs/research/hist01-delta-report.md` | 修改（attempt 6 新建） | 本文件为最终提交版本；其自身哈希由集成服务在提交时记录，不在此自引用。 |

`git status --porcelain`：

```text
 M content/history.json
 M docs/research/background-sources.md
 M docs/research/hist01-delta-report.md
```

无 `contracts/`、`scripts/`、`src/`、`public/`、`content/media.json` 改动；本任务未 commit/merge/push。

---

## 8. 提交性质与限制

1. 本任务只交付并修正**内容与来源记录**；不改写契约、验证器、`coverage.json` 或 `src`。
2. 本报告的计数与门禁结果来自本工作树实际运行；中央会在提交后独立重跑 `task.checks`。
3. 结构性 PASS 不等于可读性/教学效果通过；后者须由人工评审与 `tests/evidence/pedagogy.md` 证明。
4. 板卡完成 = 提交，不是 central verified/done。
