# 契约修正记录（ARCH-02 attempt 6）

状态：**本文件记录 ARCH-02 对 ARCH-01 契约的修正、attempt 5 的遗留问题与 attempt 6 的处置**。这不是实现声明：没有任何文章、地图阶段或素材因本任务而交付。本任务**不编辑** `content/history.json`、**不创建** `content/media.json`、**不改** `public/`；`content/media.json` 由 MEDIA-02 写入。

## 0. 候选基座与实测环境（先看这一节）

| 项目 | 值 |
|---|---|
| 已接受集成（候选基线） | `df6ae36`（ARCH-01 契约 + HIST-00 内容） |
| attempt 5 的 delta | **已提交为 `bd2305a`**（attempt 6 派发时的 HEAD；其自测为 151/151） |
| attempt 6 的 delta | **本次工作树未提交改动**（开发政策：不 commit/merge/push；Git 由中央集成服务负责，提交后以中央记录为准） |
| 候选内容事实 | `content/history.json`：4 个 strategy 事件（HIST-00 已交付战略背景）、2 个问题、22 个来源、110 条 claim、空 `media: []`、`fixtureOnly=false`。**没有**早期扩张/战役/地图阶段内容；**没有** `event-darwin-air-raid-1942`；**没有** `event-doolittle-raid-1942` |
| `content/media.json` | **不存在**（由 MEDIA-02 首次交付） |
| 本轮验证器 | `scripts/validate-content.mjs`，Node 24，无 npm 依赖 |

**本候选上的真实命令输出（attempt 6 工作树，逐字/退出码）**：

| 命令 | 结果 | 退出码 |
|---|---|---:|
| `node scripts/validate-content.mjs --self-test` | `自测结果：153/153 通过` | **0** |
| `node scripts/validate-content.mjs --check-contracts` | `PASS 文档声明的自测项数与实际一致（153 项…）`；`eventPartPolicy（机器可读、唯一来源）：background→[event-overview-part-4-turning-point]`；`结果：PASS（契约文件一致；这不代表 content/history.json 已交付）` | **0** |
| `node scripts/validate-content.mjs --stage strategy` | `结果：PASS`（仅含 history 空 media 的迁移提示） | **0** |
| `node scripts/validate-content.mjs --stage background` | `结果：FAIL（11 个错误）`（缺 9 个 background 事件 + part-3 导读 + part-3 问题；HIST-01 未交付） | **1**（预期，不是契约缺陷） |
| `node scripts/validate-content.mjs --media` | `[media] 素材注册表不存在：content/media.json …` + 期望结构 + 迁移映射 + MEDIA-02 写入方说明；`--stage` 门禁不受影响 | **1**（预期，MEDIA-02 未交付） |

## 0.1 F2：隔离性的可复现实测（本轮补上的证据）

下面命令**逐字可重跑**；它与中央评审环境无关，只依赖本工作树的 `contracts/` 与 `scripts/`：

```powershell
$root = Join-Path (Get-Location) '.cache\cleanroom-self-test'
if (Test-Path $root) { Remove-Item -Recurse -Force $root }
New-Item -ItemType Directory -Path $root | Out-Null
Copy-Item -Recurse contracts (Join-Path $root 'contracts')
Copy-Item -Recurse scripts   (Join-Path $root 'scripts')
Get-ChildItem $root          # 仅 contracts、scripts —— 没有 content/、docs/、public/
node "$root\scripts\validate-content.mjs" --self-test
```

真实输出（2026 实测）：

```text
scratch contents:
contracts
scripts

DSH 内容验证器自测
fixture：...\.cache\cleanroom-self-test\contracts\fixtures\valid-min.json
coverage：...\.cache\cleanroom-self-test\contracts\coverage.json
...
自测结果：153/153 通过
注意：自测证明结构门禁可执行；它不证明历史准确性、可读性或素材授权已通过人工审查。
exit 0
```

同一隔离目录里 `--check-contracts` 会因缺少 `docs/research/coverage.md` 报 `FAIL 文档自测项数漂移（1 处）`、exit 1 —— 这正说明**只有 `--check-contracts` 读取 docs/**，`--self-test` 不读。另在本工作树（`content/history.json` 存在）运行 `--self-test` 同样是 `153/153`、exit 0；两条运行路径项数相同，说明结果不随 `content/` 是否存在而改变。

**历史对照（证明 attempt 4 的 F1 缺陷真实存在、现在已消除）**：用 `git archive 60af4d2 scripts contracts docs` 取 attempt 4 的代码到无 `content/` 的隔离目录运行其 `--self-test`，得到 `自测结果：151/153 通过`，失败项正是
`ARCH-02 a3 早期战役与 researchStatus 检查不依赖 stage（五阶段对照，基座自适应）` 与
`ARCH-02 a3 researchStatus 正向探针在真实内容事件上触发（D3）`。
attempt 6 的自测已删除这些读真实内容的项，改为构造内存文档，因此同样的隔离运行通过。

## 1. attempt 6 反馈 F1–F5 的处置

| 反馈 | 我实测到的状态 | 本轮处置 |
|---|---|---|
| **F1（高）计数/名称稳定性**：D7 用 `tests.length` 拼测试名、R5 用 allowlist 过滤夹具错误，可能使结果依赖文档/夹具完整度 | **项数不稳定未能复现**：本工作树（有 content/）153/153，隔离目录（无 content/、无 docs/）153/153；attempt 4 的旧代码在隔离目录才出现 151/153。但 **内核真实**：D7 名称嵌入运行期项数；R5 的 4 模式 allowlist 会放过其它错误 | ① D7 测试名改为**静态名称**，不再嵌入项数；② R5 改为**精确正向**：用夹具派生的 coverage 视图（不要求任何重点文章/必需事件/问题）整体校验 `valid-early-campaign.json`，要求 `errors.length === 0`，并把警告限定为“fixtureOnly 样本 + 空 legacy media 提示”两类，不再用 denylist 过滤；③ 在 docs 写明计数语义与 149→153 的展开公式（见 §2） |
| **F2（高）隔离性只声明、未记录可复现测量** | 真实 | §0.1 记录**逐字命令 + 真实输出/退出码**（无 content/docs/public 的隔离目录 → 153/153 exit 0；正常树 → 153/153；隔离目录 `--check-contracts` exit 1 证明它才读 docs） |
| **F3（高）coverage.md 声称的项与实际不符（“map-phases 负例”“a3 达尔文表述”）** | **部分不成立**：地图阶段负例**真实存在**且已被自测执行（`ARCH-02 R6 地图阶段夹具缺 knownEnemy/consequence/unknownEnemy/阶段未标示意` 4 个负例 + 2 个正向 + 4 个 D3 位置负例/正向 = 10 项）；“a3 达尔文表述”**确已删除**（attempt 5 §3.1 第 5 项），不应出现在“现行覆盖”里。真正的问题是 §9.2 旧摘要各组合计 93、与 151 不符，属于**文档不完整**而非“虚报测试” | coverage.md §9.2 重写为**完整逐项清单**：20 组、逐条列出全部 153 个运行时项，合计严格 = 153；并给出计数语义（源码 `tests.push([` 149 次，其中 1 处在 5 次循环内，实跑 149 − 1 + 5 = 153）。**没有删除任何真实测试**，只改名/加强 D7/R5 并新增 2 项 eventPartPolicy 负例 |
| **F4（高）代码侧 `DECLARED_EVENT_PART_CROSSINGS` 与单一来源矛盾** | **真实**：coverage.json 只有散文 `eventPartPolicy` 字符串，验证器另有硬编码表 | 把 `stageOwnership.eventPartPolicy` 改为**机器可读对象** `{ description, crossStageArticles: { background: [...] } }`；`allowedPartsForStage` **只从该数据派生**，删除 `DECLARED_EVENT_PART_CROSSINGS`；`validateStageOwnershipContract` 校验其存在/形状/阶段名/重点文章 ID；新增 2 个具名负例（缺失/字符串/未知阶段/未登记 ID；删除声明后 part-4 允许集合与实体级示例同时失效）。`--check-contracts` 打印实际 policy |
| **F5（中）记录陈旧** | **真实**：contract-correction 写“delta 未提交”但当时 HEAD 是 bd2305a；README 说夹具只含 1 个事件（实为 2 个）；coverage.json 的 `mediaRegistry.legacyDisabledBy` 提到 `ARCH-02-flip` 而 docs 只写 MEDIA-02；§2.3 计数对不上 | 本文件 §0 改为“attempt 5 delta = bd2305a，attempt 6 delta 未提交”；README 夹具说明改为**两个**事件；`mediaRegistry.legacyDisabledBy` 改为 **MEDIA-02**（迁移并删除 history 顶层 media 字段后提示随字段消失，不再需要 ARCH-02-flip），README/coverage/本文件同步；§2 给出精确的 153→151→153 逐项对账 |

**attempt 1–5 已确认落地的修复（本轮不回归）**：自测不读 content/docs（构造内存文档）；`researchStatus` 对每个早期战役事件必填且与 `--stage` 无关；旧五键在五个阶段都被具名拒绝；`legacyDisabledBy=HIST-01`、`enforcement=off`；`analysisProfiles` 的 `elementMarkers` 逐键检查正文；background 事件可落 part-4；跨章节矛盾严格报错且参考案例仅构造式；`--real-content` 已删除。

## 2. 计数与逐项对账（SELFTEST_COUNT=153）

- **attempt 4（60af4d2）**：153 项运行时自测（源码 `tests.push([` 出现 149 次，其中 1 处在 5 次循环内 → 149 − 1 + 5 = 153）。
- **attempt 5（bd2305a）**：删除/改名 16 个旧项（§3.1 列出的 9 个真实内容/过渡项 + 7 个改名/替换项），新增/改名 14 项（§3.2），净 −2 → **151 项**。
- **attempt 6（本工作树）**：新增 2 项 eventPartPolicy 负例；D7 改静态名、R5 加强均为**计数不变**的改写 → **153 项**。
- 因此当前与 attempt 4 的运行时项数同为 153，但**名称集合不同**：相对 attempt 4 删除 16、新增 16（14 + 2）。
- 当前源码 `tests.push([` = **149** 次；其中 1 处在 `for (const key of ['background','course','constraints','results','impact'])` 循环内展开 5 项，故实跑 = 149 − 1 + 5 = **153**。
- `--self-test` 实报 `153/153`；`docs/research/coverage.md` canonical 标记 `SELFTEST_COUNT=153`；`--check-contracts` 的 D7 同步检查 PASS。

## 3. 自测项变更清单

### 3.1 attempt 5 删除（9 项，验收 2 要求逐项列出；attempt 6 未再删除任何项）

| # | 被删除的自测项 | 原因 |
|---:|---|---|
| 1 | `TEAM-PILOT 证据存档存在且 planHash 与工单一致` | 读取 `docs/research/team-pilot-evidence.json`；自测不读 docs/ |
| 2 | `ARCH-02 a3 早期战役与 researchStatus 检查不依赖 stage（五阶段对照，基座自适应）` | 读取 `content/history.json`（验收 1/2 要求删除五阶段对照） |
| 3 | `ARCH-02 a3 --real-content 验收阶段是 background 而非 strategy` | 针对已删除的 `--real-content` 模式 |
| 4 | `ARCH-02 a3 researchStatus 正向探针在真实内容事件上触发（D3）` | 读取 `content/history.json`；由构造文档探针取代 |
| 5 | `ARCH-02 a3 文档中的达尔文案例存在性表述与当前基座一致（D1 防再次错报）` | 读取 `docs/research/contract-correction.md` 与 `content/history.json` |
| 6 | `ARCH-02 a4 阶段无关性测试在无 HIST-01 的基座上也运行且标注 SYNTHETIC` | 读取 `content/history.json`；由构造文档阶段无关性测试取代 |
| 7 | `ARCH-02 a4 无早期战役内容时 --real-content 判定为 not-verifiable（不得空洞 PASS）` | 针对已删除的 `--real-content` 三态模式 |
| 8 | `ARCH-02 a4 缺少早期战役内容时逐规则标签为 NV 而不是 PASS` | 针对已删除的 `--real-content` 分桶输出 |
| 9 | `ARCH-02 跨章节矛盾在过渡期只警告不失败（不回归 HIST-01）` | 验收 4 要求无门禁 transition 豁免；由严格报错负例取代 |

### 3.2 attempt 5 新增（8 项，全部构造内存文档）

1. `ARCH-02 阶段无关性：构造的早期战役文档在五个阶段命中数一致（构造内存文档）`
2. `ARCH-02 R3 researchStatus 在早期战役事件上被强制要求（F2 具名负例）`
3. `ARCH-02 R3 研究过程措辞正向探针：构造合规文档注入措辞后被具名拒绝（构造内存文档）`
4. `ARCH-02 R2 旧五键在门禁中始终被具名拒绝（无过渡豁免，构造事件）`
5. `ARCH-02 R2/F4 契约禁止过渡豁免：enforcement/legacyDisabledBy/elementMarkers 不合规被拒绝（具名负例）`
6. `ARCH-02 R2 analysisProfiles 必含要素缺失被拒绝（逐键不连带，具名负例）`
7. `ARCH-02 跨章节矛盾在门禁中为错误（无过渡豁免，构造事件）`
8. `ARCH-02 契约声明跨章节矛盾为严格规则且参考案例仅用于构造式负例`

### 3.3 attempt 6 变更（计数不变 + 新增 2 项）

| 变更 | 内容 | 计数影响 |
|---|---|---|
| 改名 | `D7 文档项数漂移检查在内存文件系统上生效（应为 151 项，…）` → `D7 文档项数漂移检查在内存文件系统上生效（真实文档同步由 --check-contracts 校验）`（名称不再嵌入运行期项数） | 0 |
| 加强 | `ARCH-02 R5 早期战役夹具…`：去掉 allowlist，改为“夹具派生 coverage 下 `errors.length === 0` + 警告只允许两类” | 0 |
| 新增 | `ARCH-02 R1 事件允许集合只来自 coverage.eventPartPolicy 数据（无代码侧第二份表）` | +1 |
| 新增 | `ARCH-02 R1 eventPartPolicy 缺失或畸形被契约检查拒绝（具名负例）` | +1 |

## 4. R1：阶段归属单一来源与 HIST-01 机器可读接口

- `stageOwnership.<stage>.{keyArticles, events}` 是**唯一**归属来源；`requiredEvents[].stage` 只做交叉一致性；`backgroundGate` 由 `stageOwnership.background.events` 派生（当前 9 个，含 `event-doolittle-raid-1942`，`--check-contracts` 逐字打印）。
- **事件 `historicalPart` 允许集合**只从 `stageOwnership.eventPartPolicy.crossStageArticles` 派生（机器可读对象，attempt 6 修复 F4）：
  - 本阶段拥有导读的 `historicalPart` 始终允许；
  - 另加 `crossStageArticles[stage]` 中显式声明的导读（background → `event-overview-part-4-turning-point`）。
  - 删除该声明后 part-4 立刻不再被允许（自测在契约数据层与实体层双重验证）；`eventPartPolicy` 缺失/字符串/未知阶段/未登记重点文章 ID 均被具名拒绝。
- 具名负例：交叉不一致、必需事件未登记、引用未登记事件、事件重复归属、事件落在不允许的历史部分、构造 background 文档缺杜立特（只由该事件缺失触发）、eventPartPolicy 缺失/畸形。

## 5. 严格分析/研究规则（attempt 5 已落地，本轮保持）

- `analysisProfiles` 十键：键存在、标题逐字、正文 ≥80 汉字、每键独立来源/claim、`requiredElements` 逐键命中 `elementMarkers`、options 写真实选项与被排除约束、uncertainty 写证据支持与争议/无法确定。
- 旧五键 `earlyCampaignAnalysis`：`enforcement="off"`、`legacyDisabledBy="HIST-01"`；验证器**始终**拒绝（保留逐键迁移诊断）；契约检查拒绝任何其它 enforcement/legacyDisabledBy 取值。
- `researchStatus`：早期战役事件必填；正文/summary/claim 出现研究过程措辞即具名错误（带 `自 HIST-01 起生效`）。
- 跨章节数值/类别矛盾：`crossChapterContradiction.enforcement="strict"`，门禁中始终报错并点名事件/章节/claim；参考案例（达尔文 18 架飞机）仅用于构造式负例，**不表示**该矛盾存在于本候选或任何已集成内容中。

## 6. 媒体注册迁移（R4）与 MEDIA-02 一致性

| 项目 | 迁移前 | 迁移后 |
|---|---|---|
| 文件 | `content/history.json` 顶层 `media: [...]` | `content/media.json` |
| 根结构 | 数组 | `{ "version": 1, "media": [...] }` |
| 条目形状 | `$defs.media` 形状 | **完全不变**（`articleIds` 仍是文章关联） |

- `history.json` 顶层 `media` **含条目** → 拒绝 + 迁移映射；**空的** legacy 数组（本候选现状）只产生迁移提示，因为本任务不编辑 `content/history.json`。
- **一致化（F5）**：`coverage.mediaRegistry.legacyDisabledBy` 现为 **MEDIA-02**（“迁移并删除 history 顶层 media 字段；字段消失后空数组提示自然不再出现，不需要额外的后置契约任务”）。README / coverage.md / 本文件统一使用同一说法，不再出现 `ARCH-02-flip` 作为媒体迁移的后续任务。
- `--media` 同时读取两份文件，两份缺失分别精确报错；`--stage` 门禁不因 `media.json` 缺失而失败。消费方：**MEDIA-02 写**；**HIST-01..04 不写**；**QA-01 运行 `--media`**；**WEB-01 / MAP-01 只读**。
- 两份缺失分支的 CLI 实测（本候选）：

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

## 7. 新负例的首次生效任务

| 负例 | 首次生效任务 | 当前状态 |
|---|---|---|
| R1 交叉不一致 / 未登记事件 / 重复归属 / 孤立 ID / 历史部分错配 | ARCH-02（契约层） | 已落地、可复现 |
| **R1 eventPartPolicy 缺失/畸形/删除声明后 part-4 失效** | **ARCH-02 attempt 6（本轮）** | 已落地、可复现（新增 2 项） |
| R1 构造 background 文档缺杜立特 | HIST-01（内容交付后） | 负例已落地（构造夹具）；真实内容仍缺该事件 |
| R2 analysisProfiles 缺键/过浅/必含要素/options/uncertainty | HIST-01（新写内容必须满足） | 规则与构造负例已落地；真实内容尚无早期战役 |
| R2 旧五键被拒绝（逐阶段 + 逐键诊断） | HIST-01（`legacyDisabledBy=HIST-01`） | 已落地，门禁无过渡豁免 |
| R3 researchStatus 必填/非法枚举/过程措辞 | HIST-01 | 规则与构造负例已落地 |
| R4 顶层 media 含条目 / 注册表结构或条目 schema 错误 | MEDIA-02（迁移时） | 规则与构造负例已落地；`content/media.json` 尚不存在 |
| R4 `--media` 两份缺失分别报错 | QA-01（运行 `--media` 时） | 分支与自测已落地；当前实测 media 缺失 exit 1 |
| 跨章节矛盾严格报错 | HIST-01（内容不得含该矛盾） | 严格规则与构造负例已落地；参考案例仅构造式 |
| 地图阶段夹具缺情报/后果/未标示意 | MAP-00（阶段引擎） | 夹具为已存在输入；自测 10 项已落地 |

## 8. 已落地 / 未落地（如实）

**已落地（本轮 delta）**：`coverage.json` 的机器可读 `eventPartPolicy` 与 MEDIA-02 一致的 `legacyDisabledBy`；验证器从契约数据派生允许集合、eventPartPolicy 契约校验、`--check-contracts` 打印 policy；D7 静态名称、R5 精确正向；新增 2 项负例；coverage.md 完整 153 项清单与计数语义；README/contract-correction 的陈旧表述修正（基底提交、夹具两个事件、MEDIA-02、eventPartPolicy）。

**未落地（不由本任务负责，且不得伪造）**：HIST-01 的真实扩张内容（9 个 background 事件、`analysisProfiles`、`researchStatus`、part-3 导读与问题）→ `--stage background` 当前 exit 1；`content/media.json` 与真实素材 → MEDIA-02；真实内容上的严格规则验证（本候选无早期战役事件，不能声称已验证）；地图阶段真实战役内容、UI/浏览器/构建/部署与可读性评审。

## 9. 与 Acceptance 的逐条对应

| 验收项 | 证据 |
|---|---|
| 1 自测纯度与 exit 0 | §0（153/153、exit 0；§0.1 无 content/docs/public 隔离目录复跑 153/153、exit 0） |
| 2 删除真实内容自测并逐项列出；其余保留并通过；项数 = SELFTEST_COUNT；计数口径两处声明 | §3.1（9 项逐项）；§2（153 = SELFTEST_COUNT）；README/coverage.md 两处声明口径 |
| 3 HIST-01 机器可读接口 | §4（`stageOwnership.background.events` 9 个含杜立特；`--check-contracts` 打印 backgroundGate 与 eventPartPolicy） |
| 4 严格 analysisProfiles/researchStatus、无门禁 transition 豁免、具名负例 | §5；对应自测全绿 |
| 5 historicalPart 派生 / 杜立特构造负例 / researchStatus 措辞负例 / 矛盾严格且构造式 | §4/§5；对应自测全绿 |
| 6 媒体注册规则 | §6；`--media` 实测输出与退出码 |
| 7 权威文档一致（MEDIA-02、HIST-00 已交付、eventPartPolicy） | README/coverage.md/§6 |
| 8 map-phases.json 仅输入、fixtureOnly 通过 | 未创建/未改写；§7 列出 10 项夹具相关自测 |
| 9 窄变更、不伪造内容 | §0/§8；`content/`、`public/` 未改动 |
| 10 记录实际输出/退出码/基线/删除项/首次生效/落地状态 | §0、§0.1、§2、§3、§7、§8 |

## 10. 限制与诚实说明

- 结构验证通过不等于历史准确、适龄或可读；可读性需 `tests/evidence/pedagogy.md` 的人工评审。
- 本候选没有 HIST-01 内容，因此“严格规则在真实内容上生效”在本轮**不可验证**；证据只来自构造文档。
- `--stage background` 的 exit 1 是内容未交付的预期状态，不是契约缺陷，也不是内容已交付的证据；不得伪造内容使其通过。
- `--self-test` 只依赖 `contracts/` 与 `scripts/`；`--check-contracts` 明确需要 `docs/`（D7 计数同步）。两者分工在 §0.1 有可复现实测。
- 本文件记录的退出码来自 2026 年本工作树的真实运行；中央审查环境会独立复跑，若输出不同以中央为准。
