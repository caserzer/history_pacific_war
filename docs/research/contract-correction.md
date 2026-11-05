# 契约修正记录（ARCH-02 attempt 7）

状态：**本文件记录 ARCH-02 对 ARCH-01 契约的修正、attempt 5–6 的遗留问题与 attempt 7 的处置**。这不是实现声明：没有任何文章、地图阶段或素材因本任务而交付。本任务**不编辑** `content/history.json`、**不创建** `content/media.json`、**不改** `public/`；`content/media.json` 由 MEDIA-02 写入。

## 0. 候选基座与实测环境（先看这一节）

| 项目 | 值 |
|---|---|
| 已接受集成（候选基线） | `df6ae36`（ARCH-01 契约 + HIST-00 内容） |
| attempt 5 的 delta | 已提交为 `bd2305a` |
| attempt 6 的 delta | 已提交为 `0feea5d`（attempt 7 派发时的 HEAD；其自测为 153/153） |
| attempt 7 的 delta | **本次工作树未提交改动**（开发政策：不 commit/merge/push；Git 由中央集成服务负责，提交后以中央记录为准） |
| 候选内容事实 | `content/history.json`：4 个 strategy 事件（HIST-00 已交付战略背景）、2 个问题、22 个来源、110 条 claim、空 `media: []`、`fixtureOnly=false`。**没有**早期扩张/战役/地图阶段内容；**没有** `event-darwin-air-raid-1942`；**没有** `event-doolittle-raid-1942` |
| `content/media.json` | **不存在**（由 MEDIA-02 首次交付） |
| 本轮验证器 | `scripts/validate-content.mjs`，Node 24，无 npm 依赖 |

**本候选上的真实命令输出（attempt 7 工作树，逐字/退出码）**：

| 命令 | 结果 | 退出码 |
|---|---|---:|
| `node scripts/validate-content.mjs --self-test` | `自测结果：153/153 通过` | **0** |
| `node scripts/validate-content.mjs --check-contracts` | `PASS 文档声明的自测项数与实际一致（153 项…）`；`eventPartPolicy（机器可读、唯一来源）：background→[event-overview-part-4-turning-point]`；`结果：PASS（契约文件一致；这不代表 content/history.json 已交付）` | **0** |
| `node scripts/validate-content.mjs --stage strategy` | `结果：PASS`（仅含 history 空 media 的迁移提示） | **0** |
| `node scripts/validate-content.mjs --stage background` | `结果：FAIL（11 个错误）`（缺 9 个 background 事件 + part-3 导读 + part-3 问题；HIST-01 未交付） | **1**（预期，不是契约缺陷） |
| `node scripts/validate-content.mjs --media` | `[media] 素材注册表不存在：content/media.json …` + 期望结构 + 迁移映射 + MEDIA-02 写入方说明；`--stage` 门禁不受影响 | **1**（预期，MEDIA-02 未交付） |

## 0.1 F2：隔离性的可复现实测（完整逐字 transcript，不再省略）

复现命令（只依赖本工作树的 `contracts/` 与 `scripts/`；scratch 中**没有** `content/`、`docs/`、`public/`）：

```powershell
$root = Join-Path (Get-Location) '.cache\cleanroom-self-test'
if (Test-Path $root) { Remove-Item -Recurse -Force $root }
New-Item -ItemType Directory -Path $root | Out-Null
Copy-Item -Recurse contracts (Join-Path $root 'contracts')
Copy-Item -Recurse scripts   (Join-Path $root 'scripts')
Get-ChildItem $root          # 仅 contracts、scripts
node "$root\scripts\validate-content.mjs" --self-test
"EXIT=$LASTEXITCODE"
```

完整逐字 stdout（161 行；scratch 目录内容为 `contracts, scripts`），真实退出码 **0**：

```text
DSH 内容验证器自测
fixture：C:\Users\caser\code\dsh-team\.state\worktrees\knowledge\.cache\cleanroom-self-test\contracts\fixtures\valid-min.json
coverage：C:\Users\caser\code\dsh-team\.state\worktrees\knowledge\.cache\cleanroom-self-test\contracts\coverage.json

PASS  fixture 结构在 strategy 阶段通过
PASS  coverage 契约自身一致
PASS  requirements.json 与工单 canonical 清单完全一致
PASS  requirements.json 偏离 canonical 清单会被发现（负例）
PASS  coverage 重点集合 = 3 战役 + 5 指挥官 + 6 专题 + 5 导读
PASS  coverage 少一篇重点文章会被发现（负例）
PASS  重复 ID 被拒绝
PASS  未知实体引用被拒绝
PASS  来源缺失被拒绝
PASS  战役缺十四类字段被拒绝
PASS  阶段缺 knownEnemy 被拒绝
PASS  阶段缺 consequence 被拒绝
PASS  阶段缺 unknownEnemy 被拒绝
PASS  阶段缺 decision 被拒绝
PASS  重点战役阶段缺双方位置被拒绝
PASS  阶段缺 viewpoints 被拒绝
PASS  阶段缺 certainty 被拒绝
PASS  阶段缺 schematic 标记被拒绝
PASS  阶段缺 time 被拒绝
PASS  D1 阶段 time.end 超出战役窗口被拒绝（6/10 结尾于 6/4–6/5 战役）
PASS  D1 阶段 time.end 早于 time.start 被拒绝
PASS  D1 阶段 time.end 格式非法被拒绝
PASS  D1 阶段 time.end 无时区被拒绝
PASS  D1 阶段缺 time.start 被拒绝
PASS  D1 阶段 time.end 显式空值被拒绝（必须省略而不是留空）
PASS  D1 阶段序号与时间顺序矛盾被拒绝
PASS  D1 前一阶段 end 越过下一阶段 start 被拒绝
PASS  D1 合法 time.end 通过（正向对照）
PASS  D1 时区不造成假阳性：战役末日 -11:00 晚间不越界
PASS  D2 早期战役缺整块分析结构被拒绝
PASS  D2 早期战役缺 'background' 分析被拒绝
PASS  D2 早期战役缺 'course' 分析被拒绝
PASS  D2 早期战役缺 'constraints' 分析被拒绝
PASS  D2 早期战役缺 'results' 分析被拒绝
PASS  D2 早期战役缺 'impact' 分析被拒绝
PASS  D2 早期战役某类分析正文过浅被拒绝
PASS  D2 早期战役分析小节标题错误被拒绝
PASS  D2 早期战役分析小节缺来源被拒绝
PASS  D2 合规的早期战役分析（analysisProfiles 十键）在 background 阶段通过（正向对照）
PASS  D2 早期战役 fixture 通过结构检查（analysisProfiles 十键 + researchStatus）
PASS  D5 导读强制小节正文过短被拒绝（即使全篇总汉字数远超门槛）
PASS  D5 第二个强制小节（日本的补给与防御压力）过短同样被拒绝
PASS  D5 强制小节恰好达到阈值被接受（边界正例）
PASS  D5 强制小节差一个汉字被拒绝（边界负例）
PASS  D5 非 overviewTopics 的强制小节受 requiredHeadingHanChars 约束
PASS  D5 契约必须声明 requiredHeadingHanChars 与 overview 阈值
PASS  D6 每个 part-overview 都声明了与 ID 一致的历史部分（正向对照）
PASS  D6 导读声明错误历史部分被拒绝（ID 与声明不一致）
PASS  D6 导读缺少 historicalPart 被拒绝
PASS  D6 导读 historicalPart 不在五部分内被拒绝
PASS  D6 实体自身 historicalPart 与 coverage 声明不一致被拒绝
PASS  D6 实体与契约 historicalPart 一致时通过（正向对照）
PASS  D6 historicalPartFromArticleId 解析规则正确
PASS  D2 coverage.earlyCampaign 缺键或漏登记事件会被契约检查发现（负例）
PASS  D3 真实契约的阶段归属与素材类型不变式成立（正向对照）
PASS  D3 阶段缺 owner（没有阶段拥有任何文章）被拒绝
PASS  D3 重点文章缺少 stageOwnership 归属被拒绝
PASS  D3 同一文章被两个阶段重复拥有被拒绝
PASS  D3 文章被归属到一个比它自身 stage 更早的阶段被拒绝
PASS  D3 阶段归属含孤立 ID 被拒绝
PASS  D3 阶段归属含未知阶段名被拒绝
PASS  D3 重点文章缺 requiredMediaTypes 条目被拒绝
PASS  D3 文章种类与素材类型不符被拒绝（战役缺 battle-map）
PASS  D3 requiredMediaTypes 出现孤立 ID 被拒绝
PASS  D3 素材类型为空数组被拒绝
PASS  ARCH-02 R1 杜立特空袭位于 stageOwnership.background.events（正向）
PASS  ARCH-02 R1 requiredEvents 与 stageOwnership 交叉不一致被拒绝（具名负例）
PASS  ARCH-02 R1 必需事件未登记到 stageOwnership.events 被拒绝（具名负例）
PASS  ARCH-02 R1 stageOwnership.events 引用未登记事件被拒绝（具名负例）
PASS  ARCH-02 R1 同一事件被两个阶段重复归属被拒绝（具名负例）
PASS  ARCH-02 R1 验证器不再硬编码 background→part-3-expansion（background 事件可落 part-4）
PASS  ARCH-02 R1 事件允许集合只来自 coverage.eventPartPolicy 数据（无代码侧第二份表）
PASS  ARCH-02 R1 eventPartPolicy 缺失或畸形被契约检查拒绝（具名负例）
PASS  ARCH-02 R1 事件落在不允许的历史部分会被拒绝（按 stageOwnership 派生）
PASS  ARCH-02 R1 backgroundGate 只引用 stageOwnership.background.events
PASS  ARCH-02 R1 --stage background 缺杜立特时只由该事件缺失触发（具名负例）
PASS  ARCH-02 R2 analysisProfiles 契约与代码十键一致（正向）
PASS  ARCH-02 R2 合规 analysisProfiles 十键通过（正向对照）
PASS  ARCH-02 R2 缺任意一个具名键被拒绝（逐键负例）
PASS  ARCH-02 R2 某个键篇幅不足被拒绝（具名负例）
PASS  ARCH-02 R2 options 缺少真实选项被拒绝（具名负例）
PASS  ARCH-02 R2 options 缺少排除它的约束被拒绝（具名负例）
PASS  ARCH-02 R2 uncertainty 缺少争议/无法确定被拒绝（具名负例）
PASS  ARCH-02 R2 uncertainty 缺少有证据支持的部分被拒绝（具名负例）
PASS  ARCH-02 R2 旧五键在门禁中被具名拒绝（无过渡豁免，逐阶段负例）
PASS  ARCH-02 R2 旧五键的逐键迁移诊断仍保留（便于 HIST-01 定位）
PASS  ARCH-02 R2 契约必须声明 analysisProfiles、旧五键开关与 researchStatus 严格规则
PASS  ARCH-02 R3 合法 researchStatus 枚举被接受（正向）
PASS  ARCH-02 R3 非法 researchStatus 枚举值被拒绝（具名负例）
PASS  ARCH-02 R3 正文出现研究过程措辞被拒绝（具名负例，自 HIST-01 起生效）
PASS  ARCH-02 R3 事件 summary 出现研究过程措辞被拒绝（具名负例）
PASS  ARCH-02 R3 claim 文本出现研究过程措辞被拒绝（具名负例）
PASS  ARCH-02 R3 研究过程措辞识别器不误伤正常历史叙述
PASS  ARCH-02 R4 合法媒体注册表 {version:1, media:[...]} 通过（正向）
PASS  ARCH-02 R4 注册表 version 不是 1 被拒绝（具名负例）
PASS  ARCH-02 R4 注册表缺 media 数组被拒绝（具名负例）
PASS  ARCH-02 R4 注册表含未定义顶层字段被拒绝（具名负例）
PASS  ARCH-02 R4 history 顶层 media 含条目被拒绝并给出迁移映射（具名负例）
PASS  ARCH-02 R4 history 空 legacy media 在过渡期只警告不失败
PASS  ARCH-02 R4 关闭过渡窗口后空 legacy media 也被拒绝（负例）
PASS  ARCH-02 R4 --media 素材来自注册表而非 history.json（正向对照）
PASS  ARCH-02 R4 --media 在注册表缺条目时报素材门禁错误
PASS  ARCH-02 R4 --stage 门禁不因 media.json 缺失而失败（契约声明）
PASS  ARCH-02 R4 契约声明注册表消费方与版本
PASS  ARCH-02 a2 注册表条目缺必需字段被 media schema 拒绝（具名负例）
PASS  ARCH-02 a2 注册表条目非法许可被 media schema 拒绝（具名负例）
PASS  ARCH-02 a2 合规注册表条目通过 media schema（正向对照）
PASS  ARCH-02 a2 history 顶层 media 废弃占位（deprecated stub）不被 schema 当作合法数组
PASS  ARCH-02 a2 --media 两份文件缺失分别精确报错（分支覆盖）
PASS  ARCH-02 R6 地图阶段夹具存在、fixtureOnly、三战役各 >=2 阶段（正向）
PASS  ARCH-02 R6 地图阶段夹具无结构性错误（不含 coverage 缺失）
PASS  ARCH-02 D3 阶段缺 positions.allies 被专用校验拒绝（具名负例）
PASS  ARCH-02 D3 阶段缺 positions.japan 被专用校验拒绝（具名负例）
PASS  ARCH-02 D3 阶段整个 positions 对象缺失被专用校验拒绝（具名负例）
PASS  ARCH-02 D3 专用校验对合规夹具全部 6 个阶段通过（正向对照）
PASS  ARCH-02 R6 地图阶段夹具缺 knownEnemy 被拒绝（具名负例）
PASS  ARCH-02 R6 地图阶段夹具缺 consequence 被拒绝（具名负例）
PASS  ARCH-02 R6 地图阶段夹具缺 unknownEnemy 被拒绝（具名负例）
PASS  ARCH-02 R6 地图阶段夹具阶段未标示意被拒绝（具名负例）
PASS  ARCH-02 跨章节机种分类抽取器：18 架两类别解析正确（抽取器单测，不调用检测器）
PASS  ARCH-02 D1 数字解析支持全角数字与超过 18 的中文数字
PASS  ARCH-02 跨章节矛盾端到端：干净基线为 0，注入 18 架类别冲突后恰好 1 条并点名事件/章节/claim（具名负例）
PASS  ARCH-02 数字抽取：无数量文本不误报，多机种各自归类
PASS  ARCH-02 跨章节矛盾错误恰好 1 条且 pointer 含 eventId（具名断言）
      （阶段无关性证据来源：构造的内存夹具文档；ap=1 rs=2 cc=1）
PASS  ARCH-02 阶段无关性：构造的早期战役文档在五个阶段命中数一致（构造内存文档）
PASS  ARCH-02 R3 researchStatus 在早期战役事件上被强制要求（F2 具名负例）
PASS  ARCH-02 R3 研究过程措辞正向探针：构造合规文档注入措辞后被具名拒绝（构造内存文档）
PASS  ARCH-02 R2 旧五键在门禁中始终被具名拒绝（无过渡豁免，构造事件）
PASS  ARCH-02 R2/F4 契约禁止过渡豁免：enforcement/legacyDisabledBy/elementMarkers 不合规被拒绝（具名负例）
PASS  ARCH-02 R2 analysisProfiles 必含要素缺失被拒绝（逐键不连带，具名负例）
PASS  ARCH-02 跨章节矛盾在门禁中为错误（无过渡豁免，构造事件）
PASS  ARCH-02 契约声明跨章节矛盾为严格规则且参考案例仅用于构造式负例
PASS  航线未标示意被拒绝
PASS  数字 claim 无来源定位被拒绝
PASS  无效媒体许可被拒绝
PASS  空泛 Questions 被拒绝
PASS  地点缺现代名被拒绝
PASS  事件日期越界被拒绝
PASS  泛化来源定位被拒绝
PASS  full 阶段不能用 fixtureOnly 与部分覆盖绕过
PASS  部分阶段允许未来覆盖缺失但拒绝已存在的断链
PASS  部分阶段不能降低已有实体的深度要求
PASS  后续阶段的重点文章一旦存在就必须满足完整深度
PASS  阶段顺序单调：每提升一级都包含上一级的全部要求
PASS  "暂时不做 --media" 不能被当成通过，CLI 会明确提示
PASS  关闭 fixtureOnly 也不能绕过 full 覆盖
PASS  --media 隐含 full
PASS  媒体路径缺失被拒绝
PASS  重点战役阶段缺情报/决策/后果的负例仍可解析
PASS  媒体精确集合正例通过，缺项被拒绝
PASS  自测全程不依赖可写临时目录（D4）
PASS  ARCH-02 R5 早期战役夹具含香港（合规）与达尔文（迁移目标）且十键齐全
PASS  D7 文档项数漂移检查在内存文件系统上生效（真实文档同步由 --check-contracts 校验）

自测结果：153/153 通过
注意：自测证明结构门禁可执行；它不证明历史准确性、可读性或素材授权已通过人工审查。

EXIT=0
```

同一隔离目录里 `--check-contracts` 会因缺少 `docs/research/coverage.md` 报 `FAIL 文档自测项数漂移`、exit 1 —— 这正说明**只有 `--check-contracts` 读取 docs/**，`--self-test` 不读。另在本工作树（`content/history.json` 存在）运行 `--self-test` 同样是 `153/153`、exit 0；两条运行路径项数相同，说明结果不随 `content/` 是否存在而改变。

**历史对照（证明 attempt 4 的 F1 缺陷真实存在、现在已消除）**：用 `git archive 60af4d2 scripts contracts docs` 取 attempt 4 的代码到无 `content/` 的隔离目录运行其 `--self-test`，实测为 **153 个运行时项、151 通过 / 2 失败**，失败项正是
`ARCH-02 a3 早期战役与 researchStatus 检查不依赖 stage（五阶段对照，基座自适应）` 与
`ARCH-02 a3 researchStatus 正向探针在真实内容事件上触发（D3）`。
attempt 7 的自测已删除这些读真实内容的项，改为构造内存文档，因此同样的隔离运行通过。

## 1. attempt 7 的阻断项与非阻断项处置

| 项目 | 我实测到的状态 | 本轮处置 |
|---|---|---|
| **阻断项（验收 5 参考案例）**：达尔文 18 架飞机类别冲突的“参考案例”没有证明检测器工作；`ARCH-02 跨章节矛盾识别器能识别…` 只断言抽取成功（hits/count/category），没有干净基线、没有精确注入误差断言 | **真实**：该测试只调用 `extractAircraftClaims`，从不调用 `validateDocument`/检测器；端到端测试只断言 `hit.length === 0 -> throw`，没有“注入前基线为 0”和“注入后恰好 1 条”的断言。**但“夹具正文已含类别标记”不成立**：夹具正文/claim 实测无 `架`/`轰炸机`/`战斗机`/`鱼雷机`/`水上飞机`/`飞行艇`/数量断言，基线本就是 0（R5 此前已断言整体 0 错误，但没有单独点名矛盾基线） | ① **中和夹具**：`valid-early-campaign.json` 的通用分析模板前缀改为类别/数量中性的 `…双方参战部队与指挥关系…`（去掉“军种”等易误读措辞，保留 requiredElements 命中词“双方/部队/指挥”）；② **抽取器测试改名**为 `ARCH-02 跨章节机种分类抽取器：18 架两类别解析正确（抽取器单测，不调用检测器）`，只声明它检查的解析规则（含 raw 片段与中性叙述抽取为 0），不再声称检测器工作；③ **端到端测试重写为**：构造达尔文中性文档 → 断言**干净基线 0 条矛盾** → 注入唯一冲突（正文“十八架重型轰炸机” vs claim“18 架俯冲轰炸机”）→ 断言**恰好 1 条**并逐字段点名 eventId、正文小节标题、claim id、数量 18、两侧类别 slug、两侧原文片段 → 反向对照把两侧改成一致类别后**回到 0 条**；④ `eventId` 测试加强为“恰好 1 条 + pointer 形如 `$.events[N] (eventId)`”；⑤ 严格门禁测试的命中数改为**恰好 1 条**；⑥ R5 增加夹具**矛盾基线为 0** 与“夹具正文/summary 无任何飞机数量断言”的显式断言 |
| 非阻断：`typeCountClaims` 未使用 | **未能复现**：`grep typeCountClaims scripts/validate-content.mjs` = **0 处**（attempt 5 已随实现移除），无可删除 | 不改（记录测量） |
| 非阻断：coverage.md §9.2 只有 150 个 `- ` bullet、三个组标签少 1 | **未能复现**：逐字测量见 §10 —— 153 条 PASS、§9.2 有 **153** 个 `- ` bullet、**20** 个组、每组声明数与 bullet 数**全部相等**、合计 **153**、与实跑名称集合**完全相等**（无缺/无多）。本轮只把 3 个改名的测试 bullet 同步更新，未按 150 的假设改动计数 | 记录测量命令；只同步改名 bullet |
| 非阻断：§0.1 clean-room transcript 被 `...` 省略 | **真实** | §0.1 改为**完整逐字 stdout（161 行）+ exit code**，不再省略 |
| 非阻断：attempt-4 对账写成 150/153 | 我的重建测量为 **153 项 / 151 通过**（失败 2 项即上述真实内容项）；起点与终点均为 153，不影响当前对账 | §2 采用实测重建值并说明 |

**attempt 1–6 已确认落地的修复（本轮不回归）**：自测不读 content/docs（构造内存文档，clean room 153/153）；`researchStatus` 对每个早期战役事件必填且与 `--stage` 无关；旧五键在五个阶段都被具名拒绝；`legacyDisabledBy=HIST-01`、`enforcement=off`；`analysisProfiles` 的 `elementMarkers` 逐键检查正文；background 事件可落 part-4（允许集合只来自 `stageOwnership.eventPartPolicy.crossStageArticles`，无代码侧表）；跨章节矛盾始终严格且参考案例仅构造式；`--real-content` 已删除；D7 静态名称、R5 精确零错误；MEDIA-02 一致化、夹具两个事件、计数对账。

## 2. 计数与逐项对账（SELFTEST_COUNT=153）

- **attempt 4（60af4d2）**：153 个运行时项；在无 `content/` 的隔离目录重跑为 **151 通过 / 2 失败**（失败项是读真实内容的 a3 五阶段对照与 a3 正向探针）。源码 `tests.push([` 出现 149 次，其中 1 处位于 5 次循环内 → 149 − 1 + 5 = 153。
- **attempt 5（bd2305a）**：删除/改名 16 个旧项、新增/改名 14 项 → **151 项**。
- **attempt 6（0feea5d）**：新增 2 项 eventPartPolicy 负例；D7 静态化、R5 加强为计数不变的改写 → **153 项**。
- **attempt 7（本工作树）**：只做**改名/加强**，无新增无删除 → 仍 **153 项**。改名 3 项：
  1. `ARCH-02 跨章节矛盾识别器能识别达尔文 18 架飞机的类别冲突（参考案例）` → `ARCH-02 跨章节机种分类抽取器：18 架两类别解析正确（抽取器单测，不调用检测器）`
  2. `ARCH-02 跨章节矛盾检查精确指出事件与章节（具名负例）` → `ARCH-02 跨章节矛盾端到端：干净基线为 0，注入 18 架类别冲突后恰好 1 条并点名事件/章节/claim（具名负例）`
  3. `ARCH-02 跨章节矛盾错误真的输出 eventId（具名断言）` → `ARCH-02 跨章节矛盾错误恰好 1 条且 pointer 含 eventId（具名断言）`
- 当前 `--self-test` 实报 `153/153`；`docs/research/coverage.md` canonical 标记 `SELFTEST_COUNT=153`；`--check-contracts` 的 D7 同步检查 PASS。

## 3. 自测项变更清单

### 3.1 attempt 5 删除（9 项，验收 2 要求逐项列出；attempt 6/7 未再删除任何项）

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
| 改名 | D7 名称去运行期项数 | 0 |
| 加强 | R5 改为夹具派生 coverage 的精确零错误校验 | 0 |
| 新增 | `ARCH-02 R1 事件允许集合只来自 coverage.eventPartPolicy 数据（无代码侧第二份表）` | +1 |
| 新增 | `ARCH-02 R1 eventPartPolicy 缺失或畸形被契约检查拒绝（具名负例）` | +1 |

### 3.4 attempt 7 变更（计数不变）

| 变更 | 内容 | 计数影响 |
|---|---|---|
| 改名 | 3 个跨章节矛盾测试改为如实名称（§2） | 0 |
| 加强 | 抽取器单测：精确 raw + 中性叙述抽取为 0；不再声称检测器工作 | 0 |
| 加强 | 端到端具名负例：干净基线 0 → 注入唯一冲突 → 恰好 1 条并点名 event/section/claim/数量/类别/原文 → 一致类别反向对照 0 | 0 |
| 加强 | eventId 测试：恰好 1 条 + pointer 形态；严格门禁测试：恰好 1 条 | 0 |
| 加强 | R5：夹具矛盾基线 0 + 夹具正文/summary 无飞机数量断言 | 0 |
| 夹具 | `valid-early-campaign.json` 通用模板前缀改为类别/数量中性（“双方参战部队与指挥关系”），不改变 fixtureOnly 与十键/researchStatus | 0 |

## 4. R1：阶段归属单一来源与 HIST-01 机器可读接口

- `stageOwnership.<stage>.{keyArticles, events}` 是**唯一**归属来源；`requiredEvents[].stage` 只做交叉一致性；`backgroundGate` 由 `stageOwnership.background.events` 派生（当前 9 个，含 `event-doolittle-raid-1942`，`--check-contracts` 逐字打印）。
- **事件 `historicalPart` 允许集合**只从 `stageOwnership.eventPartPolicy.crossStageArticles` 派生（机器可读对象）：
  - 本阶段拥有导读的 `historicalPart` 始终允许；
  - 另加 `crossStageArticles[stage]` 中显式声明的导读（background → `event-overview-part-4-turning-point`）。
  - 删除该声明后 part-4 立刻不再被允许（自测在契约数据层与实体层双重验证）；`eventPartPolicy` 缺失/字符串/未知阶段/未登记重点文章 ID 均被具名拒绝。
- 具名负例：交叉不一致、必需事件未登记、引用未登记事件、事件重复归属、事件落在不允许的历史部分、构造 background 文档缺杜立特（只由该事件缺失触发）、eventPartPolicy 缺失/畸形。

## 5. 严格分析/研究规则与跨章节矛盾参考案例

- `analysisProfiles` 十键：键存在、标题逐字、正文 ≥80 汉字、每键独立来源/claim、`requiredElements` 逐键命中 `elementMarkers`、options 写真实选项与被排除约束、uncertainty 写证据支持与争议/无法确定。
- 旧五键 `earlyCampaignAnalysis`：`enforcement="off"`、`legacyDisabledBy="HIST-01"`；验证器**始终**拒绝（保留逐键迁移诊断）；契约检查拒绝任何其它 enforcement/legacyDisabledBy 取值。
- `researchStatus`：早期战役事件必填；正文/summary/claim 出现研究过程措辞即具名错误（带 `自 HIST-01 起生效`）。
- **跨章节数值/类别矛盾（严格规则）**：`crossChapterContradiction.enforcement="strict"`，门禁中始终报错并点名事件/章节/claim。参考案例（18 架飞机类别冲突）的验证方式现在有**可归因的证明链**：夹具与构造文档的中性基线矛盾数 = 0（R5 与端到端测试均有显式断言）→ 注入唯一一处冲突 → 恰好 1 条错误，逐字段点名 `event-darwin-air-raid-1942`、正文小节标题、claim id、数量 18、`level-bomber`/`dive-bomber` 与两侧原文 → 把两侧改成一致类别后回到 0 条。该案例**不表示**矛盾存在于本候选或任何已集成内容中。

独立探针的真实输出（构造内存文档，不读 content/；用于证明上面的证明链）：

```text
BASELINE_CC_COUNT = 0
INJECTED_CC_COUNT = 1
INJECTED_MESSAGE = $.events[4] (event-darwin-air-raid-1942): 跨章节数值/类别矛盾 —— 同一个数字 18 架在不同位置被归为不同机种：level-bomber ← 正文 article[0]（'一次没有预警的空袭'）: 十八架重型轰炸机出现 ‖ dive-bomber ← claim claim-evidence-darwin: 18 架俯冲轰炸机参与。 请统一类别，或在正文明确说明这是不同来源的分类差异（改写成 disputed claim）。
CONSISTENT_CATEGORY_CC_COUNT = 0
```

## 6. 媒体注册迁移（R4）与 MEDIA-02 一致性

| 项目 | 迁移前 | 迁移后 |
|---|---|---|
| 文件 | `content/history.json` 顶层 `media: [...]` | `content/media.json` |
| 根结构 | 数组 | `{ "version": 1, "media": [...] }` |
| 条目形状 | `$defs.media` 形状 | **完全不变**（`articleIds` 仍是文章关联） |

- `history.json` 顶层 `media` **含条目** → 拒绝 + 迁移映射；**空的** legacy 数组（本候选现状）只产生迁移提示，因为本任务不编辑 `content/history.json`。
- `coverage.mediaRegistry.legacyDisabledBy` 为 **MEDIA-02**（迁移并删除 history 顶层 media 字段；字段消失后空数组提示自然不再出现，不需要额外的后置契约任务）。README / coverage.md / 本文件使用同一说法，不再出现 `ARCH-02-flip`。
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
| R1 eventPartPolicy 缺失/畸形/删除声明后 part-4 失效 | ARCH-02 attempt 6 | 已落地、可复现 |
| R1 构造 background 文档缺杜立特 | HIST-01（内容交付后） | 负例已落地（构造夹具）；真实内容仍缺该事件 |
| R2 analysisProfiles 缺键/过浅/必含要素/options/uncertainty | HIST-01（新写内容必须满足） | 规则与构造负例已落地；真实内容尚无早期战役 |
| R2 旧五键被拒绝（逐阶段 + 逐键诊断） | HIST-01（`legacyDisabledBy=HIST-01`） | 已落地，门禁无过渡豁免 |
| R3 researchStatus 必填/非法枚举/过程措辞 | HIST-01 | 规则与构造负例已落地 |
| R4 顶层 media 含条目 / 注册表结构或条目 schema 错误 | MEDIA-02（迁移时） | 规则与构造负例已落地；`content/media.json` 尚不存在 |
| R4 `--media` 两份缺失分别报错 | QA-01（运行 `--media` 时） | 分支与自测已落地；当前实测 media 缺失 exit 1 |
| 跨章节矛盾严格报错（含干净基线→注入→恰好 1 条→反向对照） | HIST-01（内容不得含该矛盾） | 严格规则与构造负例已落地；参考案例仅构造式 |
| 地图阶段夹具缺情报/后果/未标示意 | MAP-00（阶段引擎） | 夹具为已存在输入；相关自测已落地 |

## 8. 已落地 / 未落地（如实）

**已落地（本轮 delta）**：跨章节矛盾参考案例改为可归因证明链（夹具中性化 + R5 基线断言 + 抽取器测试改名 + 端到端“干净基线 0 → 恰好 1 条逐字段点名 → 一致类别反向 0” + eventId/严格门禁恰好 1 条断言）；coverage.md 同步 3 个改名项；§0.1 完整逐字 clean-room transcript；contract-correction/README 与此一致。

**未落地（不由本任务负责，且不得伪造）**：HIST-01 的真实扩张内容（9 个 background 事件、`analysisProfiles`、`researchStatus`、part-3 导读与问题）→ `--stage background` 当前 exit 1；`content/media.json` 与真实素材 → MEDIA-02；真实内容上的严格规则验证（本候选无早期战役事件，不能声称已验证）；地图阶段真实战役内容、UI/浏览器/构建/部署与可读性评审。

## 9. 与 Acceptance 的逐条对应

| 验收项 | 证据 |
|---|---|
| 1 自测纯度与 exit 0 | §0（153/153、exit 0）；§0.1（完整 transcript；仅 contracts+scripts 的 scratch → 153/153、exit 0） |
| 2 删除真实内容自测并逐项列出；其余保留并通过；项数 = SELFTEST_COUNT；计数口径两处声明 | §3.1（9 项逐项）；§2（153 = SELFTEST_COUNT）；README/coverage.md 两处声明口径 |
| 3 HIST-01 机器可读接口 | §4（`stageOwnership.background.events` 9 个含杜立特；`--check-contracts` 打印 backgroundGate 与 eventPartPolicy） |
| 4 严格 analysisProfiles/researchStatus、无门禁 transition 豁免、具名负例 | §5；对应自测全绿 |
| 5 historicalPart 派生 / 杜立特构造负例 / researchStatus 措辞负例 / 矛盾严格且构造式（含参考案例证明链） | §4/§5；端到端具名负例：干净基线 0 → 注入后恰好 1 条并点名事件/章节/claim → 反向 0 |
| 6 媒体注册规则 | §6；`--media` 实测输出与退出码 |
| 7 权威文档一致（MEDIA-02、HIST-00 已交付、eventPartPolicy） | README/coverage.md/§6 |
| 8 map-phases.json 仅输入、fixtureOnly 通过 | 未创建/未改写；R5 与地图阶段自测全绿 |
| 9 窄变更、不伪造内容 | §0/§8；`content/`、`public/` 未改动 |
| 10 记录实际输出/退出码/基线/删除项/首次生效/落地状态 | §0、§0.1、§2、§3、§7、§8、§10 |

## 10. 非阻断项的实测记录（reviewer 报告与我的测量）

- **coverage.md §9.2 计数**：reviewer 报告“只有 150 个 `- ` bullet、三个组标签各少 1”。我的逐字测量（attempt 7 工作树）：
  - `node scripts/validate-content.mjs --self-test` 输出 153 条 `PASS`；
  - §9.2（从“#### 逐项清单”到“若自测失败”之前）有 **153** 个 `- ` bullet；
  - **20** 个组标签，逐组“声明数 == bullet 数”（0 个不一致），声明数合计 **153**；
  - bullet 名称集合与实跑 `PASS` 名称集合**完全相等**（documented-not-actual = 0，actual-not-documented = 0）。
  - 该测量在 attempt 6 与 attempt 7 分别执行过，结果一致；attempt 7 仅把 3 个改名项同步进 bullet。因此未按“150/少 1”的假设修改计数。
- **`typeCountClaims`**：`grep typeCountClaims scripts/validate-content.mjs` → **0 处**，未使用符号不存在，无需处置。
- **attempt-4 计数重建**：`git archive 60af4d2 scripts contracts docs` 到无 `content/` 的隔离目录运行其 `--self-test`：**153 个运行时项，151 通过 / 2 失败**。reviewer 记录为 150/153，与我的重建不同；但 attempt 4 与 attempt 7 的起点/终点均为 153，不影响当前 `SELFTEST_COUNT` 对账（§2）。

## 11. 限制与诚实说明

- 结构验证通过不等于历史准确、适龄或可读；可读性需 `tests/evidence/pedagogy.md` 的人工评审。
- 本候选没有 HIST-01 内容，因此“严格规则在真实内容上生效”在本轮**不可验证**；证据只来自构造文档。
- `--stage background` 的 exit 1 是内容未交付的预期状态，不是契约缺陷，也不是内容已交付的证据；不得伪造内容使其通过。
- `--self-test` 只依赖 `contracts/` 与 `scripts/`；`--check-contracts` 明确需要 `docs/`（D7 计数同步）。两者分工在 §0.1 有完整逐字实测。
- 本文件记录的退出码来自本工作树的真实运行；中央审查环境会独立复跑，若输出不同以中央为准。
