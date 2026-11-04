# 历史内容覆盖矩阵与交付门禁（v2）

状态：**契约/覆盖/验证器已交付；内容尚未交付**。`content/history.json` 在本任务中刻意不存在。本文件中的每一条“required”都是后续内容任务的验收条件，不是“已完成内容”的声明。

规范机器文件：`contracts/coverage.json`。本文解释其精确集合；两者冲突时以机器文件与 `contracts/content.schema.json` 为准，并须由架构审查修正。

## 1. 阶段与 HIST 任务

验证器接受五个累积阶段，默认 `full`：

| 验证器阶段 | HIST 任务 | 交付内容 | 机器强制 |
|---|---|---|---|
| `strategy` | HIST-00 战略背景与基础 | part 1 导读、3 个基础事件、part 1 问题 | 3 个事件各 ≥2 节/≥220 汉字；导读 4 节/≥600 汉字/4 个精确标题；part 1 至少一个实质问题 |
| `background` | HIST-01 日本快速扩张 | part 3 导读、8 个早期扩张事件、part 3 问题 | 导读 8 节/≥1200 汉字/8 个标题；每个事件 ≥2 节/≥220–260 汉字；part 3 至少一个实质问题 |
| `pearl` | HIST-02 珍珠港 | part 2 导读、珍珠港战役、山本/南云、三个航母/舰载机/海军航空专题、美国宣战事件、part 2 问题 | 珍珠港十四类/≥3 阶段；两篇人物档案；三篇专题；part 2 问题 |
| `coral` | HIST-03 战局变化 | part 4 导读、珊瑚海战役、弗莱彻、雷达/密码分析、杜立特与早期航母行动、part 4 问题 | 珊瑚海十四类/≥4 阶段；人物/专题深度；part 4 问题 |
| `full` | HIST-04 中途岛与全部剩余实体 | part 5 导读、中途岛战役、尼米兹/斯普鲁恩斯、补给专题、part 5 问题、全部重点文章 | 上文全部 + 全部 19 篇重点文章 + 14 个必需事件 + 五部分问题；`fixtureOnly=false`；默认最终硬门禁 |

阶段问题覆盖（`coverage.stages[].requiredQuestionParts`）：

| 阶段 | 要求的问题历史部分 |
|---|---|
| strategy | 1 |
| background | 1、3 |
| pearl | 1、2、3 |
| coral | 1、2、3、4 |
| full | 1、2、3、4、5 |

题目的 `historicalPart` 是固定枚举；`full` 对五个部分逐一断言“至少一个实质性、有实体关联和证据的问题”，不是只看总题数。答案最低 **160 个汉字**、至少 **2 个内容实体**、至少 1 个来源和 1 个 claim；所有已有问题都按同一阈值检查，不能先用短答案占位。

## 2. 十九篇重点文章（canonical keyArticleIds）

`coverage.keyArticleIds` 的顺序如下；`keyArticles[]` 与 `requiredMediaTypes` 必须与这 19 个 ID 精确一一对应。

| # | keyArticleId | 类型 | 阶段 | 最低深度摘要 | 所需媒体类型 |
|---:|---|---|---|---|---|
| 1 | `event-overview-part-1-why-war` | part-overview | strategy | 4 节；≥600 汉字；4 个标题；3 来源/3 claim；2 地点 | map |
| 2 | `event-overview-part-3-expansion` | part-overview | background | 8 节；≥1200 汉字；8 个标题；4 来源/6 claim；5 地点 | map |
| 3 | `event-overview-part-2-pearl-harbor` | part-overview | pearl | 5 节；≥900 汉字；5 个标题；4 来源/5 claim；2 地点 | map |
| 4 | `battle-pearl-harbor` | battle | pearl | 十四类；每节≥160 汉字；≥3 阶段；3 人物/2 地点；4 来源/6 claim；1 争议 claim | battle-map + photograph |
| 5 | `person-yamamoto-isoroku` | commander-profile | pearl | 档案≥500 汉字；≥3 决策卡；3 来源/4 claim | portrait |
| 6 | `person-nagumo-chuichi` | commander-profile | pearl | 档案≥500 汉字；≥3 决策卡；3 来源/3 claim | portrait |
| 7 | `concept-aircraft-carrier` | concept-article | pearl | 3 层；≥600 汉字；2 来源/3 claim；3 关联实体 | diagram |
| 8 | `concept-carrier-aircraft` | concept-article | pearl | 3 层；≥600 汉字；2 来源/3 claim；3 关联实体 | diagram |
| 9 | `concept-naval-aviation` | concept-article | pearl | 3 层；≥700 汉字；2 来源/3 claim；3 关联实体 | diagram |
| 10 | `event-overview-part-4-turning-point` | part-overview | coral | 5 节；≥850 汉字；5 个标题；4 来源/5 claim；3 地点 | map |
| 11 | `battle-coral-sea` | battle | coral | 十四类；每节≥160 汉字；≥4 阶段；3 人物/2 地点；4 来源/6 claim；1 争议 claim | battle-map + photograph |
| 12 | `person-fletcher-frank-jack` | commander-profile | coral | 档案≥500 汉字；≥3 决策卡；3 来源/3 claim | portrait |
| 13 | `concept-radar` | concept-article | coral | 3 层；≥550 汉字；2 来源/3 claim；3 关联实体 | diagram |
| 14 | `concept-codebreaking` | concept-article | coral | 3 层；≥650 汉字；2 来源/4 claim；3 关联实体 | diagram |
| 15 | `event-overview-part-5-midway` | part-overview | full | 8 节；≥1200 汉字；8 个标题；5 来源/6 claim；2 地点 | map |
| 16 | `battle-midway` | battle | full | 十四类；每节≥160 汉字；≥5 阶段；3 人物/2 地点；5 来源/7 claim；1 争议 claim | battle-map + photograph |
| 17 | `person-nimitz-chester` | commander-profile | full | 档案≥500 汉字；≥3 决策卡；3 来源/3 claim | portrait |
| 18 | `person-spruance-raymond` | commander-profile | full | 档案≥500 汉字；≥3 决策卡；3 来源/3 claim | portrait |
| 19 | `concept-logistics` | concept-article | full | 3 层；≥650 汉字；2 来源/3 claim；3 关联实体 | diagram |

“来源数/claim 数”是**去重后的最低值**；验证器会把实体级、各小节、阶段、决策卡、专题层中的来源/claim 合并去重。数量只是下限，不等于质量；每条数字/判断仍须精确 locator。

### 2.1 部分导读的强制标题

验证器要求这些标题逐字出现在 `article[].heading` 中（可额外增加小节）：

- part 1：`日本扩张与资源依赖`、`美国禁运与战略困境`、`为什么选择袭击珍珠港`、`美国为何没有及时防范`
- part 2：`战略目标与准备`、`袭击经过、损失与未毁设施`、`南云的决策限制`、`航母与战列舰的不同作用`、`美国参战及其后果`
- part 3：`香港`、`马来亚与新加坡`、`菲律宾、巴丹与科雷希多尔`、`荷属东印度与石油`、`威克岛与关岛`、`达尔文与印度洋`、`盟军为何连续失败`、`日本的补给与防御压力`
- part 4：`美国航母的早期行动`、`杜立特空袭`、`珊瑚海、莫尔兹比港与澳大利亚方向`、`航母作战方式的变化`、`日本为何转向中途岛`
- part 5：`日本的计划与内部假设`、`美国情报与密码分析`、`双方兵力、指挥官与盲区`、`搜索、侦察、攻击与整备的时间差`、`运气、情报、组织、指挥与战术`、`损失、失败原因与战略争议`、`中途岛是否真正改变战略主动权`、`长期影响`

这防止“有文章但漏掉某一历史主题”的假覆盖。标题存在仍需正文解释，不能只放标题和空话。

## 3. 三场必须完成十四类分析的战役

`battle-pearl-harbor`、`battle-coral-sea`、`battle-midway` 是重点文章；每篇必须包含以下 14 个键，标题逐字匹配，正文每节 **≥160 个汉字**，每节至少一个 `sourceId` 和一个 `claimId`：

| 键 | 中文标题 | 内容检查重点 |
|---|---|---|
| background | 背景 | 为什么会发生；此前局势 |
| geography | 地理环境 | 位置、距离、海域/地形及战略意义 |
| participants | 主要参与方 | 国家、军种、部队、指挥体系 |
| commanders | 主要指挥官 | 职责、能力、当时掌握的信息 |
| forces | 双方军力对比 | 舰艇、飞机、兵员、基地、补给与装备 |
| objectives | 各自战略目标 | 双方想取得的结果 |
| constraints | 决策约束 | 情报、燃油、弹药、航程、天气、时间、通信、指挥链 |
| plan | 作战计划 | 战前判断及部署 |
| course | 战斗经过 | 按阶段解释行动、转折点及原因 |
| decisions | 关键决策 | 选项、限制、选择与后果；禁止事后诸葛亮 |
| results | 结果与损失 | 明确统计口径、数字来源与时间点 |
| aftermath | 后续影响 | 对下一场战役、战略与战争进程的影响 |
| controversies | 历史争议 | 分歧观点、证据强弱、未解问题 |
| furtherReading | 延伸阅读 | 事件、人物、地图、概念、来源 |

所有 `battle` 实体在 schema 中也要有这 14 个键；三场重点战役额外受 `coverage.battleSectionMinHanChars=160`、最低阶段数、人物/地点数量、来源/claim 和至少一个 `disputed` claim 的硬约束。

### 3.1 阶段要求（battle.phases）

三场重点战役的最低阶段数：

| 战役 | 最少阶段 | 额外要求 |
|---|---:|---|
| 珍珠港 | 3 | 每阶段至少一条示意航线；每阶段 `schematic=true`；双方位置 `schematic=true` |
| 珊瑚海 | 4 | 同上 |
| 中途岛 | 5 | 同上 |

每个阶段必须同时包含：

- `time.start`（带时区 ISO 时间）、`time.display`、`time.uncertainty`，且日期在战役范围内；
- `positions.japan` 与 `positions.allies`（位置描述、真实地点 IDs、示意坐标、不确定半径、来源/claim）；
- `knownEnemy` 与 `unknownEnemy` 的**双方**文本；
- `decision` 与 `consequence` 的**双方**文本；
- `certainty`（documented/estimated/disputed/schematic）与 `schematic`；
- `viewpoints` 双方视角 + 来源/claim；
- `routes[]`（每条 `schematic=true`，有起终点地点 ID 与 path，说明“示意”）；
- `schematic=true`、`uncertaintyNote`、`eventIds`、`sourceIds`、`claimIds`。

“双方已知/未知”不是装饰：地图信息面板必须能显示某一阶段日本知道什么、盟军知道什么，以及各自不知道什么。不能把中途岛战后才确认的事实写成双方战前已知。

## 4. 早期扩张与战略基础的必需事件

`coverage.requiredEvents` 共 14 个；每一阶段只强制已达阶段的事件，full 强制全部。每个事件至少 **2 节**、每个事件至少 **220–260 汉字**、至少 1–2 个来源和 claim，并且 `historicalPart` 与阶段映射一致。

### 4.1 战略基础（strategy；part 1）

| 事件 ID | 主题 | 最低汉字 |
|---|---|---:|
| `event-japan-expansion-china` | 日本扩大侵华战争、资源与战略困境 | 220 |
| `event-us-oil-embargo-1941` | 美国经济压力、石油与谈判 | 220 |
| `event-japan-war-decision-1941` | 1941-12-01 御前会议开战决定 | 220 |

### 4.2 早期扩张（background；part 3）

| 事件 ID | 主题 | 最低汉字 |
|---|---|---:|
| `event-hong-kong-1941` | 香港战役 | 220 |
| `event-malaya-singapore-1942` | 马来亚战役、新加坡陷落与战俘/平民 | 260 |
| `event-philippines-bataan-corregidor-1942` | 菲律宾、巴丹、科雷希多尔 | 260 |
| `event-dutch-east-indies-1942` | 荷属东印度与石油资源 | 260 |
| `event-wake-island-1941` | 威克岛战役 | 220 |
| `event-guam-1941` | 关岛失守 | 200 |
| `event-darwin-air-raid-1942` | 1942-02-19 达尔文空袭 | 220 |
| `event-indian-ocean-raid-1942` | 印度洋空袭、英国东方舰队与日本补给压力 | 260 |

“盟军为何连续失败”和“日本扩张中的补给/防御压力”不各自造假事件，而由 part 3 导读的强制小节 `盟军为何连续失败` 与 `日本的补给与防御压力` 承担；导读总深度 ≥1200 汉字。其他早期事件（如香港、威克岛）同时纳入时间线互链。

### 4.3 珍珠港与战局变化节点

| 阶段 | 事件 ID | 主题 | 最低汉字 |
|---|---|---|---:|
| pearl | `event-us-declares-war-1941` | 美国对日宣战及其后果 | 220 |
| coral | `event-doolittle-raid-1942` | 杜立特空袭的政治、军事与心理影响 | 240 |
| coral | `event-us-carrier-raids-early-1942` | 美军航母早期行动与战术学习 | 220 |

### 4.4 重点导读承担的分析主题

| 导读 | 阶段 | 必须覆盖的分析主题 |
|---|---|---|
| part 1 | strategy | 侵略、资源、禁运、双方决策、美国为何未及时防范 |
| part 3 | background | 早期扩张全过程、盟军失败原因、日本补给与防御压力 |
| part 2 | pearl | 目标/准备、经过/损失/未毁设施、南云限制、美国参战 |
| part 4 | coral | 航母初战、杜立特、珊瑚海/莫尔兹比港、作战方式变化、日本转向中途岛 |
| part 5 | full | 日本计划与假设、美国情报、双方兵力/指挥官/盲区、搜索与时间差、运气/组织/指挥、损失与失败争议、战略主动权、长期影响 |

## 5. 五位决策型人物档案

| keyArticleId | 人物 | 最低档案 | 决策卡 | 必须回答的决策问题（内容要求，不要求固定标题） |
|---|---|---:|---:|---|
| `person-yamamoto-isoroku` | 山本五十六 | 500 汉字 | 3 | 如何判断日美实力差距；为什么支持先发打击；对战略结果的预期与实际差异 |
| `person-nagumo-chuichi` | 南云忠一 | 500 汉字 | 3 | 珍珠港/中途岛中在信息不完整、回收与整备压力下如何选择；不能只写“犹豫” |
| `person-nimitz-chester` | 尼米兹 | 500 汉字 | 3 | 在兵力有限和情报不确定下如何分配风险；如何理解“可接受风险” |
| `person-spruance-raymond` | 斯普鲁恩斯 | 500 汉字 | 3 | 首次指挥航母编队时如何依据不完全信息决策；与上级意图/现场判断的关系 |
| `person-fletcher-frank-jack` | 弗莱彻 | 500 汉字 | 3 | 珊瑚海中的风险权衡、燃油/损失/任务之间的取舍；从不同角度评价“胜负” |

每个人物档案的决策卡必须包含至少 2 个真实备选方案、至少 2 个限制、当时可见的信息、后果和 certainty；来源/claim 的去重最低值见 §2 表。人物页要关联事件、战役、地点和概念，不能成为孤立传记。

## 6. 六篇核心知识专题

| keyArticleId | 专题 | 三层解释的最低内容 | 最低汉字 | 媒体 |
|---|---|---|---:|---|
| `concept-aircraft-carrier` | 航空母舰是什么 | ①移动机场 ②起降/甲板/护航 ③为什么影响舰队决战 | 600 | diagram |
| `concept-carrier-aircraft` | 舰载机如何起飞、回收与整备 | ①机型与任务 ②起飞、返航、加油、装弹、甲板调度 ③时间差如何影响决策 | 600 | diagram |
| `concept-naval-aviation` | 海军航空作战：搜索、攻击与时间差 | ①搜索与侦察 ②攻击波组织/协调 ③发现、决策、打击的时间窗口 | 700 | diagram |
| `concept-radar` | 雷达：看见看不见的敌人 | ①电磁探测 ②距离/方位/识别限制 ③珍珠港预警与舰队防空 | 550 | diagram |
| `concept-codebreaking` | 密码分析：从碎片到判断 | ①加密/破译 ②情报整合与验证 ③中途岛情报优势与盲区；不得把破译说成全知 | 650 | diagram |
| `concept-logistics` | 补给：航程、油料与舰队的隐形边界 | ①补给链 ②油料/弹药/航程/海上加油 ③为什么限制日本扩张与中途岛计划 | 650 | diagram |

每篇恰好 3 层（layer 1/2/3），每层至少 30 汉字，层内自带来源/claim；全篇来源/claim 去重最低值见 §2。术语分层不是“三个同义复述”；第三层必须回到具体历史决策。

## 7. 五部分问题覆盖

| 历史部分 | 问题交付阶段 | 最低要求 | full 机器断言 |
|---|---|---|---|
| part 1 战争为什么爆发 | strategy | 至少 1 个 | 是 |
| part 2 珍珠港与战争爆发 | pearl | 至少 1 个 | 是 |
| part 3 日本快速扩张 | background | 至少 1 个 | 是 |
| part 4 战局开始变化 | coral | 至少 1 个 | 是 |
| part 5 中途岛海战 | full | 至少 1 个 | 是 |

每个问题：`prompt` 以问号结尾；答案 ≥160 汉字；关联 ≥2 个内容实体；至少有来源和 claim；答案必须解释因果/比较/证据，不得只是“因为日本指挥失误”这类空话。验证器在 full 阶段逐部分断言；仅堆很多 part 1 的问题不能通过。

## 8. 素材矩阵（`--media` 的精确集合）

`--media` 隐含 `--stage full`，要求 coverage 的 19 个 keyArticleIds 每一个都被覆盖；对同一篇文章还需命中其全部 `requiredMediaTypes`。这意味着：

| 重点文章类别 | 数量 | 每篇必需类型 | 小计 |
|---|---:|---|---:|
| 五部分导读 | 5 | map | 5 |
| 三场重点战役 | 3 | battle-map + photograph | 6 |
| 五位指挥官 | 5 | portrait | 5 |
| 六篇核心专题 | 6 | diagram | 6 |
| **合计** | **19** | — | **22 个“文章 × 类型”要求** |

- 同一素材可以关联多篇文章，但不能用一张 `diagram` 顶替 `battle-map`；类型必须匹配。
- 每件素材必须有作者、许可、来源、署名、alt、caption、`articleIds`，且 `articleIds` 只允许重点文章 ID。
- 许可必须属于白名单；`all-rights-reserved` 等被拒绝；`permission-granted` 必须有授权 URL。
- 文件必须真实存在于 `public/media/...`，非空，路径不得穿越。
- 仅有已有的合法素材不够；缺少精确集合中任何一项都失败。
- 媒体登记在 MEDIA-01 前可以为空，但任何已登记的条目仍要通过元数据检查；最终发布必须跑 `--media`。

## 9. 验证器的硬门禁与负例

### 9.1 阶段门禁

- 默认 `full`；不接受“没有指定阶段所以更宽松”。
- 部分阶段仅允许尚未达到交付阶段的覆盖缺失；已存在实体仍按完整 schema/深度/引用检查。
- 重点文章即使属于未来阶段，只要已经出现在 `history.json`，也必须满足完整最低深度；不能写半篇占位文章。
- full 额外拒绝 `fixtureOnly=true`；`--media` 不能通过 `--stage` 绕过。
- full 必须同时满足：19 篇重点文章、14 个必需事件、14 类字段、三场战役阶段门槛、五部分问题、所有 claim 的精确 locators、所有引用完整。
- 结构验证通过 + `--media` 通过 ≠ 可读性通过。`tests/evidence/pedagogy.md` 必须由人工评审提交；在该文件存在且已审阅前，不得声称内容达到“11 岁可读”。

### 9.2 自测负例

运行：

```bash
node scripts/validate-content.mjs --self-test
node scripts/validate-content.mjs --check-contracts
```

自测不读取 `content/history.json`，覆盖 **38** 项真实正例/负例/边界：

**契约一致性（7 项）**
- `requirements.json` 与工单 canonical 清单逐字一致（36 条，id/description/scope/顺序/条数）；
- 偏离 canonical 清单会被发现（多出条目、改写 description、缺少条目、改写 scope 四种负例）；
- `coverage` 重点集合精确为 3 战役 + 5 指挥官 + 6 专题 + 5 导读 = 19；
- 少一篇重点文章（去掉 `battle-midway`）会被发现且错误信息点名；
- `coverage` 契约自身一致；
- `docs/research/team-pilot-evidence.json` 存在、planHash 与工单一致、6 个 agent 与 5 项 approvalMatrix 齐全、且带“非本模块成果”免责说明。

**结构与引用（8 项）**
- 重复 ID；未知实体引用；来源缺失；
- 战役缺少十四类字段；
- 地点缺现代名；
- 泛化 locator；数字 claim 无 locator；
- 事件日期越界。

**阶段字段（10 项）**
- 缺 `knownEnemy`、缺 `unknownEnemy`、缺 `decision`、缺 `consequence`、缺 `certainty`、缺 `schematic`、缺 `time`、缺 `viewpoints`；
- 重点战役阶段缺双方位置（`positions.allies`）；
- 航线未标 `schematic`；
- 阶段字段为空值时仍能检出（语义空值负例）。

**阶段累积语义（5 项）**
- `strategy` 阶段允许未来覆盖缺失，但已存在实体的断链仍然报错；
- 部分阶段不能降低已有实体的深度要求（把 part 1 导读压成 2 节必须失败）；
- 后续阶段的重点文章一旦存在就必须满足完整深度（半成品 `battle-pearl-harbor` 必须失败）；
- 阶段顺序单调（后一阶段必须包含前一阶段的全部问题部分，且每个阶段都确有重点文章交付）；
- 默认阶段是 `full`，且未运行 `--media` 时不会被标记为已通过素材门禁。

**素材与绕过（8 项）**
- 无效媒体许可（`all-rights-reserved`）；
- 空泛 Questions；
- full 覆盖绕过（`fixtureOnly=true` + 缺失重点文章/问题）；
- 关闭 `fixtureOnly` 后仍缺覆盖；
- `--media` 隐含 `full`；
- 媒体路径穿越/越界/缺失；
- 媒体精确集合正例通过、缺项被拒绝；
- `fixture` 结构在 `strategy` 阶段真实通过。

若自测失败，内容验证不得被引用为通过。`--check-contracts` 是同一批契约断言的独立入口，不需要内容文件，可直接进 CI。

## 10. 36 条 canonical requirements 的逐项映射

状态说明：**契约=本模块已交付并可由验证器检查；内容=后续 HIST 任务交付；UI/工程/发布=其他模块或后续任务。** 任何“规划”都没有被当作实现。

| canonical ID | 覆盖位置与契约机制 | 当前状态 / 后续证据 |
|---|---|---|
| HIST-BACKGROUND | part 1 导读 + 3 个 strategy 必需事件；schema/coverage | 契约已交付；内容待 HIST-00 |
| HIST-EXPANSION | part 3 导读 + 8 个 background 必需事件，含补给/失败原因小节 | 契约已交付；内容待 HIST-01 |
| BATTLE-PEARL | `battle-pearl-harbor` 十四类、≥3 阶段、证据门槛 | 契约已交付；内容待 HIST-02 |
| BATTLE-CORAL | `battle-coral-sea` 十四类、≥4 阶段、证据门槛 | 契约已交付；内容待 HIST-03 |
| BATTLE-MIDWAY | `battle-midway` 十四类、≥5 阶段、争议 claim | 契约已交付；内容待 HIST-04 |
| PEOPLE-DEPTH | 五位重点人物的决策型档案与最低深度 | 契约已交付；内容待各阶段 |
| CONCEPTS-DEPTH | 六篇三层概念专题与最低深度 | 契约已交付；内容待各阶段 |
| QUESTIONS-DEPTH | 五部分 question 覆盖断言、答案/实体/来源/claim 门槛 | 契约已交付；题目内容待各阶段 |
| CONTENT-AGE | `docs/research/content-rubric.md` 的年龄/血腥度/叙事规则 | rubric 已交付；人工评审证据待 `tests/evidence/pedagogy.md` |
| CONTENT-EVIDENCE | claim + locator + source 引用；日期/数字/判断可追溯 | 契约与负例已交付；逐条证据待内容 |
| CONTENT-UNCERTAINTY | `claimType`、`certainty`、phase uncertainty、schematic 标记 | 契约已交付；内容标注待内容 |
| MEDIA-COVERAGE | coverage 19 篇/22 个类型要求 + `--media` 精确检查 | 契约已交付；素材待 MEDIA-01 |
| MEDIA-LICENSE | media 的 author/license/rights/source/credit/alt/articleIds；许可白名单 | 契约已交付；实际授权待 MEDIA-01 |
| ROUTES-SIX | 六入口共享 events/battles/people/places/concepts/questions 数组与稳定 ID | 数据结构已交付；页面/入口待 UI |
| ROUTES-LINKS | 引用字段（时间/地点/人物/事件/专题）与断链校验 | 引用契约已交付；渲染与当前上下文待 UI |
| UI-CITATIONS | 每节 source/claim、claimType、locator 暴露给 UI | 数据契约已交付；交互展示待 UI |
| MAP-OFFLINE | places 为真实本地地理节点，routes 为示意；无外部瓦片字段 | 数据契约已交付；本地底图/交互待 experience |
| MAP-NAVIGATION | 缩放/平移/键盘/触摸/图层由消费端实现 | 未在本模块实现 |
| MAP-GEOGRAPHY | place 的 historicalName/modernName/coordinates/accuracy/图例数据 | 字段已交付；地图渲染待 experience |
| MAP-TIMELINE | event 日期与 phase time 可驱动时间轴 | 字段已交付；联动待 UI |
| MAP-PHASES | battle.phases 与三场阶段门槛 | 字段与门禁已交付；播放/暂停按钮待 UI/浏览器测试 |
| MAP-INTELLIGENCE | phase.knownEnemy/unknownEnemy 双方字段 | 字段与负例已交付；地图面板待 UI |
| MAP-DECISIONS | phase decision/consequence/viewpoints/uncertainty | 字段与负例已交付；地图面板待 UI |
| VISUAL-DESIGN | 不属于本模块；本契约只固定内容语义 | 未实现 |
| A11Y-DEVICES | 不属于本模块；media 提供 alt/caption 基础 | 未实现/待 UI 与浏览器测试 |
| A11Y-AUDIT | axe、对比度、reduced-motion 由 QA/UI 执行 | 未实现 |
| PERFORMANCE | 本契约未提供大小门禁；需构建产物 gzip/JSON/资产测量 | 未实现 |
| ENGINEERING-TYPES | TypeScript 检查由前端构建承担 | 未实现 |
| ENGINEERING-CONTENT | schema、coverage、validator、自测、负例 | **已交付** |
| ENGINEERING-LINKS | 内容 ID/来源/许可/媒体路径校验；HTTP 链接存活另需构建检查 | 内容层已交付；外链探测/构建待工程 |
| ENGINEERING-BROWSER | 真实浏览器交互回归 | 未实现 |
| ENGINEERING-BUILD | Node24 静态构建与子路径 | 未实现 |
| MAINTENANCE | README、rubric、source strategy、阶段与变更说明 | 文档已交付；站点维护文档待工程 |
| TEAM-PILOT | 工单附带的 central engine 组织/门禁证据已逐字存档于 `docs/research/team-pilot-evidence.json`（含 planHash 与 approvalMatrix），供审计引用 | 本模块只存档引用，不伪造组织状态；central verified/done 由中央负责 |
| RELEASE-CI | 远程提交构建与部署 | 未实现/未验证 |
| RELEASE-PAGES | Pages URL 及子路径资产探测 | 未实现/未验证 |

## 11. 最终硬门禁清单

`node scripts/validate-content.mjs`（默认 full）必须 PASS，且满足：

- [ ] `content/history.json` 存在，`schemaVersion=1.0.0`，`fixtureOnly=false`。
- [ ] 19 篇重点文章全部存在，实体类型与 coverage 一致。
- [ ] 三场重点战役各有完整 14 节，每节 ≥160 汉字，均有来源/claim；分别 ≥3/4/5 阶段。
- [ ] 每个重点阶段有双方位置、known/unknown enemy、decision/consequence、双方 viewpoint、示意标记、至少一条示意航线、来源/claim。
- [ ] 14 个必需事件全部存在，达到最低节数/汉字/来源/claim，历史部分正确。
- [ ] 五个历史部分各至少一个 ≥160 汉字、≥2 实体、有来源/claim 的实质问题。
- [ ] 五位人物、六篇专题达到最低档案/层次/关联/证据深度。
- [ ] 所有 claim 有精确 locator；数字/日期/判断可追溯；无断链/无效 ID/无效日期。
- [ ] `node scripts/validate-content.mjs --media` 通过：22 个“文章 × 类型”全命中，素材许可和真实文件均有效。
- [ ] `tests/evidence/pedagogy.md` 已提交并通过人工适龄/可读性评审（**不由结构验证器推断**）。
- [ ] UI、地图、无障碍、浏览器、构建、部署、Pages 探测等其他模块的证据齐备；本模块不能代替它们。

## 12. 本任务未完成/限制

- 没有创建 `content/history.json`，没有历史文章、地图阶段、人物/专题、问题或媒体的实际交付。本文件中的每一条“最低深度”都是**后续内容的验收条件**，不是已完成实现。
- 没有执行浏览器、axe、性能、构建、部署或 Pages 探测；这些不在本模块范围。
- 来源核验结果（详见 `docs/research/sources.md` §2–§3）：FRUS 1941 vol. IV d602、NARA “Day of Infamy”、NPS Opana/USS Arizona、JACAR C12120240100、AWM “Remembering the fall of Singapore”、National WWII Museum “Battle of Midway” **本次已读取正文**；**NHHC 与 CMH 本次 DNS 解析失败**，NAA/IWM 返回 403。因此三场战役的官方战斗叙事、官方页码与官方统计表尚未读到，后续内容不得据此声称“全文核实”，也不得引用未实测的小节标题或页码。
- 验证器能阻止结构性和引用性绕过，但无法自动判断历史陈述是否准确、观点是否公允、答案是否真正适龄；必须有人工评审（`tests/evidence/pedagogy.md`）。
- 本任务提交后仅进入中央审查；**没有任何内容或契约被中央 verified/done**。
