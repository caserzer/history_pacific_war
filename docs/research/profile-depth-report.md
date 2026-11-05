# DOC-02 档案深度增量收口报告（profile-depth-report）

> 任务：DOC-02「档案深度的增量收口（五位指挥官决策型档案与六大核心专题三层解释）」。
> 候选基座：已接受集成 HEAD `338dc2a`（ARCH-02 + HIST-00..HIST-04 + MEDIA-02 + QQUEST-01），工作树在任务开始时干净。
> 本任务范围：只编辑 `content/history.json` 与 `docs/research/profile-depth-report.md`。**没有**改写 HIST-00/HIST-02/HIST-03 已接受的叙述段落、既有问题答案，未新建/删除杜立特事件，未改契约、验证器、`src`、`tests`、`public/` 或 `content/media.json`。
>
> **结论摘要**：HIST-00 的四项遗留点在已接受集成中已有三项被后续任务关闭、一项（山本 claims 定位）经逐条核对为**可核查**；“警戒不到一小时”已由 HIST-02 修正为 44 分钟口径。本任务**唯一按先前接受日志移交的真实缺口**是山本档案缺“当时不知道什么”要素——已用既有 claim、以日方/联合舰队视角补写（与 claim 主语一致）。另按订单/验收措辞裁定：六大专题的第三层应落脚到“如何影响中途岛决策”，其中 4 篇此前只落到珍珠港/珊瑚海，本任务**仅追加**与中途岛决策相连的段落（不动第 1、2 层）；另 2 篇已达标，只核对不改。后续 task-34 又按验收“并互链”要求，为这 2 篇已达标专题追加 `battle-midway` 互链（见 §5.2 的互链一致性更正）。共修改 **7 个实体**（山本 + 6 个专题），未新增/删除任何 claim 或 source，未改任何既有 claim 文本。

## 1. 第 0 步：只读核对（真实命令与输出）

在候选基线上执行：

```text
$ node scripts/validate-content.mjs --stage full
DSH 太平洋战争教材内容验证
文件：C:\Users\caser\code\dsh-team\.state\worktrees\knowledge\content\history.json
根目录：C:\Users\caser\code\dsh-team\.state\worktrees\knowledge
阶段：full（最终硬门禁）
提示：本次未运行 --media；发布前必须单独运行素材门禁。
实体：93；来源：31；claim：282；问题：7；素材：0

警告：
- $.media: history.json 仍含空的 legacy media 数组（过渡窗口内仅警告）。迁移映射：…（MEDIA-02 迁移期提示，非失败条件）

结果：PASS
说明：结构验证通过不等于可读性评审通过；可读性证据须见 tests/evidence/pedagogy.md。
退出码：0
```

- 真实退出码：**0**。任务开始时 `--stage full`、`--stage coral`、`--media` 均为 0（结构性门禁无回归）。
- 本报告所依据的“基线”数据均由只读脚本从 `content/history.json` / `contracts/coverage.json` / `content.schema.json` 重新计算，不复制旧账本。

## 2. HIST-00 遗留项：当前状态与处理

| 遗留项（HIST-00 评审时） | 在已接受集成中的当前状态（本任务实测） | 处理 |
|---|---|---|
| 六大核心专题仅 3/6 | 现为 **6/6**：`concept-aircraft-carrier`、`concept-carrier-aircraft`、`concept-naval-aviation`、`concept-radar`、`concept-codebreaking`、`concept-logistics` 均存在，且各有 3 层、`relatedEntityIds` 非空 | HIST-00 之后的任务已补齐，本任务只核对；另按订单裁定补第三层“中途岛决策”落点（见 §5.2），未重写第 1、2 层 |
| 五位指挥官仅 1/5 | 现为 **5/5**：山本五十六、南云忠一、尼米兹、斯普鲁恩斯、弗莱彻均有决策型档案（profile + 3–4 张决策卡 + 来源 + claims） | 已补齐；本任务逐卡复核 rubric，只补山本“当时不知道什么”这一个已登记缺口（见 §5.1） |
| 山本 claims 定位“不可核查” | 9 条 claims 的 locator 逐条核对，**全部指向真实存在的章节/页**（详见 §4.3） | 不需修复；记录核对证据 |
| “警戒不到一小时”与 NPS 7:06→7:50 的 44 分钟不符 | `content/history.json` 中 **“不到一小时”出现 0 次**；“四十四分钟”出现 **2 次**（第 2 部分导读小节、第 1 部分问题答案）；7:06/7:50 时刻均在 | HIST-02 已按 44 分钟口径修正；本任务只核对，不改 |
| 杜立特事件归属（核对项，非缺口） | `event-doolittle-raid-1942.historicalPart = part-3-expansion`；`stageOwnership.background.events` 含该事件；`eventPartPolicy.crossStageArticles.background = ["event-overview-part-4-turning-point"]` | 三者一致：事件归属 background 阶段，且允许跨写到第 4 部分导读。**未创建/删除/改写该事件** |

### 2.1 五项遗留项与 11 个实体的覆盖

- 五位指挥官：`person-yamamoto-isoroku`、`person-nagumo-chuichi`、`person-nimitz-chester`、`person-spruance-raymond`、`person-fletcher-frank-jack`（5/5）。
- 六大专题：`concept-aircraft-carrier`、`concept-carrier-aircraft`、`concept-naval-aviation`、`concept-radar`、`concept-codebreaking`、`concept-logistics`（6/6）。
- 本报告 §4、§5 对上述 **11/11 实体**逐一给出复核结论。

## 3. 五位指挥官：概况（基线实测）

| 人物 ID | profile 汉字 | 决策卡 | 来源 | claims | 决策卡结构（context/options≥2/constraints≥2/choice/consequence/sourceIds/claimIds） |
|---|---:|---:|---:|---:|---|
| `person-yamamoto-isoroku` | 573（本任务后 857） | 3 | 4 | 8（本任务后 9） | 3/3 卡齐全 |
| `person-nagumo-chuichi` | 666 | 3 | 4 | 9 | 3/3 卡齐全 |
| `person-nimitz-chester` | 525 | 4 | 4 | 11 | 4/4 卡齐全 |
| `person-spruance-raymond` | 606 | 4 | 3 | 6 | 4/4 卡齐全 |
| `person-fletcher-frank-jack` | 609 | 4 | 3 | 13 | 4/4 卡齐全 |

## 4. 五位指挥官：按 content-rubric 复核

rubric §2.1 要求每个重要决策回答五问：(1) 当时知道/不知道什么、信息来源是否可靠；(2) 硬约束；(3) 至少两个现实备选方案及未被选原因；(4) 选择后的计划外变化；(5) 哪些结果当时可预见、哪些只有事后才知道。

图例：**●** 明确写出；**◐** 由上下文/约束/后果或档案整体覆盖（隐含，未单列）；**○** 本卡未单独展开。这是细读评估，不是关键词扫描——**“未被单列”不等于缺陷**（本任务明确避免为让指标变绿而改写已符合要求的卡片）。

### 4.1 逐卡五问复核（17 张决策卡）

| 人物 | 决策卡 | (1) 知道/不知道 | (2) 硬约束 | (3) ≥2 方案+理由 | (4) 计划外变化 | (5) 可预见/事后 |
|---|---|---|---|---|---|---|
| 山本 | `propose-pearl-harbor` | ●已知 / ○未知（由档案 profile 新增段整体覆盖） | ●3 | ●3 | ◐（袭击未摧毁航母与工业，结果偏离目标） | ◐（区分战术胜利与政治结果） |
| 山本 | `accept-long-war-risk` | ●已知 / ○未知（同上） | ●3 | ●3 | ○（后果是困境综述） | ●（明确“知道什么、不知道什么”的评估要求） |
| 山本 | `timing-8-december` | ●已知 / ○未知（同上） | ●3 | ●3 | ◐（决定在外交结果明朗前作出） | ●（区分“当时已决定”与“当时仍可中止”） |
| 南云 | `execute-hit-and-run-order` | ●已知 / ●未知（战机位置不明） | ●2 | ●2 | ○ | ●（区分“他选择”与“命令要求”） |
| 南云 | `rearm-vs-strike` | ●已知 / ◐（侦察报告不断、敌情在变） | ●2 | ●2 | ●（整备被打断、出击推迟） | ●（“不是某一个人犹豫的结果”） |
| 南云 | `no-visible-damage-turn` | ●已知 / ●未知（敌航母位置不确定） | ●2 | ●2 | ●（几分钟后三艘航母失去作战能力） | ●（“外部完好”≠“实际安全”） |
| 尼米兹 | `retain-staff` | ●已知 / ○ | ●2 | ●2 | ◐（指挥链连续运转） | ◐（时间压力下的取舍） |
| 尼米兹 | `midway-unified-air-control` | ●已知 / ○ | ●2 | ●2 | ◐ | ●（“事先的组织工作，而非临场发挥”） |
| 尼米兹 | `coral-lessons` | ●已知 / ○ | ●2 | ●2 | ◐（一个月后中途岛表现有别，部分原因在此） | ●（说明修正生效，非事后倒推） |
| 尼米兹 | `commit-carriers-midway` | ●已知 / ●未知（不等于掌握全部计划） | ●2 | ●2 | ◐ | ◐ |
| 斯普鲁恩斯 | `launch-at-range` | ●已知 / ◐ | ●2 | ●2 | ◐（在窗口前到达） | ◐（时机是少数可决定的变量） |
| 斯普鲁恩斯 | `hold-reserve` | ●已知 / ●未知（是否还有第五艘航母） | ●2 | ●2 | ●（保留应对意外的手段） | ◐ |
| 斯普鲁恩斯 | `strike-hiryu` | ●已知 / ◐ | ●2 | ●2 | ◐ | ◐ |
| 斯普鲁恩斯 | `turn-to-intercept` | ●已知 / ◐ | ●2 | ●2 | ◐ | ◐ |
| 弗莱彻 | `fuel-before-battle` | ●已知 / ◐ | ●2 | ●2 | ◐ | ◐ |
| 弗莱彻 | `rush-tulagi` | ●已知 / ◐（编队未齐、其余舰分散） | ●2 | ●2 | ◐ | ◐ |
| 弗莱彻 | `night-retirement` | ●已知 / ●未知（夜间侦察与敌主力位置） | ●2 | ●2 | ◐（5/8 正面交锋） | ●（“真正约束不是勇气，而是夜间侦察缺失”） |
| 弗莱彻 | `retire-may8` | ●已知 / ◐ | ●2 | ●2 | ◐ | ◐ |

### 4.2 结论

- 验收所要求的**六要素**（当时知道/不知道什么、可选方案、约束、实际选择、后果与来源定位）在 5 份档案的**每张决策卡**上都以结构性字段存在（`context/options/constraints/choice/consequence/sourceIds/claimIds`）。
- 逐卡细读后，**没有发现需要重写的卡片**：现有 context 已交代信息位置，options 都在 2–3 个且由 constraints 说明代价，consequence 多数已写出时间挤压、计划偏离或“不能以结果倒推”的提醒。
- 唯一有**先前接受日志明确登记**的缺口是山本档案的“当时不知道什么”要素（`docs/research/midway-sources.md` §5.3 约 L118/L122 归 DOC-02）。本任务已在 §5.1 用 claim 支撑补写，未改写既有段落。
- 其余卡片中个别 rubric 子问（(4)/(5)）属于隐含覆盖，**刻意不改写**：订单/验收要求的是六要素结构，且多次评审明确警告不得为“显得有改动”而给已达标卡片注水。

### 4.3 山本 9 条 claims 的 locator 核对（“不可核查”遗留项）

核对方式：用 HTTP 取回来源页面（本沙箱 HTTPS TLS 失败，故用 `http://www.ibiblio.org/...`；仅用于核对既有 locator，未新增 claim），检查 locator 指向的章节标题/页码确实存在。

| claim | locator | 核对结果 |
|---|---|---|
| `claim-yamamoto-us-industrial-might` | USSBS Ch.2, section **Introduction** | ✅ 该章存在 “Introduction” 小节 |
| `claim-ussbs-attack-purpose` | USSBS Ch.2, section **Introduction** | ✅ 同上 |
| `claim-ussbs-decision-1941-11-03` | USSBS Ch.2, section **The Attack Plans**（naval decision clause） | ✅ 该章存在 “The Attack Plans” 小节 |
| `claim-ussbs-carriers-absent` | USSBS Ch.2, section **The Attack** | ✅ 该章存在 “The Attack” 小节 |
| `claim-ussbs-date-choice` | USSBS Ch.2, section **Selection of Date and Time of Attack** | ✅ 该章节标题存在 |
| `claim-y-day-8-december-1941-11-07` | JM 97, **p. 4** | ✅ 该页含“Combined Fleet Operations Order No. 2, 7 November 1941 … Y Day 8 December” |
| `claim-yamamoto-18-months` | JM 147 App.3, **pp. A3-i to A3-ii** | ✅ 该附录页含 A3-i / A3-ii 页码标记 |
| `claim-nagano-long-war-risk` | JM 147 App.3, **pp. A3-i to A3-ii** | ✅ 同上 |
| `claim-ussbs-why-no-second-attack` | USSBS Ch.2, section **General Information** | ✅ 该章存在 “General Information” 小节；该节记日军未继续追击/快速撤退的三项理由，其中一项即“美军航母位置不明且空中搜索难以找到” |

结论：山本 **9 条** claims **定位均可核查**，HIST-00 的该项担忧在已接受集成中已不成立；无需修复、无需新增来源。

## 5. 本任务所做的修改（before → after）

修改**仅**涉及 `content/history.json` 中 **1 位人物 + 6 个专题**（4 个专题为第三层中途岛落点；另 2 个专题见 §5.2 的 task-34 互链追加）。主任务阶段为 33 个叶子路径（deep-diff 实测），task-34 再增加 2 个 `relatedEntityIds` 叶子；集合计数不变（people 14、concepts 6、claims 282、sources 31、questions 7）。

### 5.1 山本档案：补“当时不知道什么”要素（已登记缺口）

- **位置**：`person-yamamoto-isoroku.profile` 末尾**追加**一段（不改写原有任何句子）；`person.claimIds` 增加 `claim-ussbs-why-no-second-attack`。
- **before → after**：profile 汉字 **573 → 857**（+284）；`claimIds` **8 → 9**。
- **追加文本**（全文）：

> 还可以补上一个容易被忽略的问题：山本提出并推动的这份袭击计划，还带着一个日方当时无法消除的未知——美国航母在哪里。美国战略轰炸调查处的报告记载，日方估计夏威夷海域有四到五艘美军航母，并把它们列为攻击目标；但攻击当天这些航母并不在锚地，机群只能把重点转向战列舰。同一报告在解释日军为何没有继续追击、而是选择快速撤退时也写道：美军航母位置不明，靠空中搜索找到它们的可能性很小。对日方而言，这意味着计划里最关键的目标之一带着无法消除的不确定性——他们能确定的是必须让美国太平洋舰队失效，不能确定的是这一击能不能碰到对方真正的航母力量。把这一层写出来，才能解释为什么一场战术上成功的袭击，没有带来日方真正想要的政治结果。

- **claim 支撑**（均为既有 claim，未新增/未改写文本）：
  - `claim-ussbs-carriers-absent`（locator：USSBS Ch.2, section *The Attack*）——日方估计夏威夷有 4–5 艘美军航母、攻击当天航母不在锚地、机群转向战列舰。
  - `claim-ussbs-why-no-second-attack`（locator：USSBS Ch.2, section *General Information*）——报告记日军未继续追击/持续攻击、选择快速撤退，三项理由之一是“美军航母位置不明且空中搜索难以找到”。
- 说明：这一段回答的是“日方当时**不能确定**什么”，与既有段落“山本清楚风险”形成互补；主体写成日方/联合舰队，是因为两条 claim 的主语都是日方，而不是山本个人心理。
- **归属与转述更正（attempt 2）**：把 USSBS 的因果含义恢复为“日军没有继续追击、而是选择快速撤退”（原先写成“不继续搜索”，改变了原意）；未知主体从“对山本来说”改为“对日方而言”，不再把日方层面的未知写成山本个人状态。

### 5.2 六大专题：第三层“如何影响中途岛决策”落点

**裁定（记录 rubric 与订单措辞的调和）**：rubric §1.2 只要求第三层“放回**具体战役/决策**”；但本任务订单与验收的措辞更强，明确写“是什么→如何运作→**如何影响中途岛决策**”。订单/验收是本任务的权威标准，因此：
- 第三层已明确落到中途岛决策的 2 篇（`concept-naval-aviation`、`concept-codebreaking`）→ **只核对，不改**。
- 第三层只落到珍珠港/珊瑚海的 4 篇（`concept-aircraft-carrier`、`concept-carrier-aircraft`、`concept-radar`、`concept-logistics`）→ 判定为**真实缺口**，在**不改写第 1、2 层与既有第 3 层文字**的前提下，**追加**一段把结论连到中途岛的具体决策，并补挂既有中途岛 claims 与 source。

| 专题 | 三层是否递进 | 第三层战例（前） | 第三层战例（后） | totalHan 前→后 | 第 3 层 claims 数 前→后 | 新增 relatedEntityIds |
|---|---|---|---|---|---|---|
| `concept-aircraft-carrier` | ✅（定义→流程→历史影响） | 珍珠港 | 珍珠港 + **中途岛决策** | 856 → 949 | 3 → 6 | +`battle-midway` |
| `concept-carrier-aircraft` | ✅ | 珍珠港 | 珍珠港 + **中途岛决策** | 848 → 923 | 3 → 5 | +`battle-midway` |
| `concept-naval-aviation` | ✅ | 中途岛 | 中途岛（已达标，未改） | 1125 → 1125 | 3 → 3 | 无 |
| `concept-radar` | ✅ | 珊瑚海 | 珊瑚海 + **中途岛决策** | 969 → 1076 | 3 → 5 | +`battle-midway` |
| `concept-codebreaking` | ✅ | 中途岛 | 中途岛（已达标，未改） | 926 → 926 | 3 → 3 | 无 |
| `concept-logistics` | ✅ | 珍珠港/日本扩张 | 珍珠港/扩张 + **中途岛决策** | 894 → 979 | 4 → 7 | 无（已有 `battle-midway`） |

**追加文本与依据**（均只追加，不删改原句）：

1. `concept-aircraft-carrier` 第 3 层追加：*“把这三点放到 1942 年 6 月 4 日的中途岛，就能看出它们如何影响决策：美军航母在中途岛以北海域等待，希望先发现日军；日军则要在先压制中途岛与迎击可能出现的美国航母之间分配兵力，而当天击沉日军航母的正是舰载机的攻击。”*
   - 新挂 claims：`claim-midway-tf-positions`、`claim-nagumo-attack-timing-squeeze`、`claim-nagumo-four-carriers-lost`；source：`source-oni-midway-combat-narrative`。
2. `concept-carrier-aircraft` 第 3 层追加：*“中途岛当天，这个时间差直接改变了结果：美军鱼雷机损失惨重，却迫使日军航母不断规避、无法起飞自己的轰炸机，又把日军战斗机吸引到低空，为随后到达的俯冲轰炸机创造了窗口。”*
   - 新挂 claims：`claim-naval-aviation-torpedo-attack-indirect-effect`、`claim-nagumo-defensive-maneuver-blocked-launch`；source：`source-oni-midway-combat-narrative`。
3. `concept-radar` 第 3 层追加：*“中途岛当天也能看到雷达的作用与边界：雷达在接到巡逻机报告后约五分钟、约九万米外发现来袭编队，守备部队的逐时记录里留下了‘许多不明飞机’这样的通报——雷达给出了距离与方位，但‘不明’两个字说明，从发现到判断敌我、再到下令迎击，仍然要靠人和流程。”*
   - 新挂 claims：`claim-radar-midway-detected`、`claim-radar-midway-plot-log`（source 已在第 3 层）。
4. `concept-logistics` 第 3 层追加：*“中途岛作战也能看到后勤与多线行动的影响：日军在同一时期还发动了阿留申方向的行动，ONI 判断这次行动可能是对中途岛作战的牵制、更可能是掩护基斯卡与阿图岛的占领；美军则依靠珍珠港的抢修能力，让受损的约克城号在三天内恢复作战状态，才凑出三艘航母投入决战。”*（attempt 2 更正：删去无 claim 支撑的“兵力与时间因此分散”，按 `claim-midway-aleutian-role` 的谨慎措辞改写为“可能是牵制、更可能是掩护占领”。）
   - 新挂 claims：`claim-midway-aleutian-role`、`claim-coral-yorktown-repair`、`claim-nimitz-carrier-commitment`；source：`source-oni-midway-combat-narrative`。

**互链**：上述 3 篇在 `relatedEntityIds` 增加 `battle-midway`（`concept-logistics` 原本已有），使专题→战役可双向浏览；第 1、2 层的既有 `sourceIds`/`claimIds` 与正文一律未动。

**互链一致性更正（task-34 后续小修）**：事后核对发现，第三层**已经**落到中途岛决策的两篇专题——`concept-codebreaking` 与 `concept-naval-aviation`——此前却没有任何中途岛内容链接，形成“最直接讲中途岛的专题反而没连到中途岛”的图内不一致。本任务在不改动正文、层、claim 与 source 的前提下，仅向这两个 `relatedEntityIds` **追加** `battle-midway`（未删除任何既有链接）：

- `concept-codebreaking`：更正后 `["concept-radar","event-japan-war-decision-1941","concept-aircraft-carrier","battle-coral-sea","event-overview-part-4-turning-point","event-us-carrier-raids-early-1942","battle-midway"]`
- `concept-naval-aviation`：更正后 `["concept-aircraft-carrier","concept-carrier-aircraft","concept-radar","concept-codebreaking","battle-coral-sea","event-overview-part-4-turning-point","event-us-carrier-raids-early-1942","battle-midway"]`

现在六个专题的 `relatedEntityIds` **都包含 `battle-midway`**，互链约定统一（`concept-logistics` 另含 `event-overview-part-5-midway`，属其原有链接，保留不动；本次未向其余专题新增 `event-overview-part-5-midway`，以保持最小改动）。

## 6. 刻意未改动的项与理由

| 未改动项 | 理由 |
|---|---|
| 17 张决策卡正文（除山本 profile 的追加段） | 逐卡细读后未发现 rubric 六要素缺口；多次评审警告不得为“显得有改动”而改写已达标卡片（避免注水）。 |
| 南云/尼米兹/斯普鲁恩斯/弗莱彻的 profile 与卡片 | 验收要求的六要素结构均具备，且各自已有明确“未知”或不确定性表述；只核对。 |
| `concept-naval-aviation` 与 `concept-codebreaking` 第 3 层 | 已明确落到中途岛决策，符合订单口径，无需改动。 |
| 四个专题的第 1、2 层正文与既有第 3 层文字 | 订单要求“不重写既有三层解释”，只补真实缺口；本任务只做追加。 |
| 杜立特事件 | 订单明令不得新建/删除/改写；只核对 `historicalPart` 与 `stageOwnership`、`eventPartPolicy` 的一致性（§2）。 |
| HIST-00/HIST-02/HIST-03 的叙事段落与既有问题答案 | 订单与验收禁止改写；“44 分钟”等已由 HIST-02 修正的项只核对。 |
| claims 文本、sources、契约、验证器、`src`、`tests`、`public/`、`content/media.json` | 本任务未新增/删除/改写任何 claim 或 source 文本，也未触碰契约与代码；所有新增引用都是**既有** claim/source。 |

## 7. 记录检查（真实输出 + 退出码）

```text
$ node scripts/validate-content.mjs --stage full
… 实体：93；来源：31；claim：282；问题：7；素材：0
结果：PASS
退出码：0

$ node scripts/validate-content.mjs --media
… 素材注册表：content/media.json（22 个条目）
结果：PASS
素材门禁：通过；重点文章 19/19 具有所需类型素材。
退出码：0

$ node scripts/validate-content.mjs --check-contracts
结果：PASS（契约文件一致；这不代表 content/history.json 已交付）
退出码：0
```

- `--stage full`：真实退出码 **0**（唯一警告为既有 history 顶层空 `media` 迁移提示，非失败条件）。
- `--media`、`--check-contracts`：均 **exit 0**，证明无跨模块回归。
- 变更范围：相对 DOC-02 前的已接受集成 `338dc2a`，deep-diff 得到 `people:person-yamamoto-isoroku`、`concepts:concept-aircraft-carrier`、`concepts:concept-carrier-aircraft`、`concepts:concept-radar`、`concepts:concept-logistics`、`concepts:concept-naval-aviation`、`concepts:concept-codebreaking` 共 7 组；attempt 2 只改写其中 `person-yamamoto-isoroku.profile` 与 `concept-logistics` 第 3 层两处文字，不新增实体/字段。`git status --porcelain` 只显示 `content/history.json`（M）与本报告（新增），顶层 `media`/`fixtureOnly`/`schemaVersion` 均未变。

## 8. 已知限制

- rubric 是**人工评审标准**；本报告记录本任务的逐项审计与证据，最终“深度/适龄/可读性”签署仍归 content-lead。`tests/evidence/pedagogy.md` 尚不存在，本任务**不声称**可读性评审通过。
- 本任务只复用既有 claim/source；未新增来源。为核对既有 locator，用 HTTP（HTTPS TLS 在本沙箱失败）取回 USSBS Ch.2 / JM 97 / JM 147 App.3 页面检查标题与页码——仅作核对，未据未验证材料新增断言。
- 山本档案的“未知”要素以日方/联合舰队视角补写，聚焦“美军航母位置不明”这一可核查的未知；更深的人员/政治判断仍可能被后续研究细化，本任务不把单一未知写成完整解释。
- 概念第 3 层的“中途岛落点”是按订单/验收措辞所作的裁定；若内容负责人认为 rubric §1.2 的宽松口径足够，可保留追加段而不视为必需——本记录已说明理由，便于复核。
