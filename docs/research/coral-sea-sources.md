# HIST-03 珊瑚海章节研究来源记录（attempt 1）

状态：本文件是 HIST-03「珊瑚海深度档案、第 4 部分证据型问题与阶段地图」的来源与证据日志。它记录本任务**实际读取过**的来源与定位、每条来源支撑的 claims、失败检索，以及第 4 部分问题的 ID、所属部分、关联实体与 claims，便于验收评审用 `node scripts/validate-content.mjs --stage coral` 的真实输出核对。

- 任务：HIST-03（模块 knowledge，角色 content_creator），attempt 1
- 工作单：`.cache/orders/HIST-03-a1.md`，sha256 = `32792cd00bb8e33660aeaec62d798c81774a03c95d9ac008b847440c38ac552a`（只读输入，未编辑）
- 候选：已接受集成（含 HIST-00、ARCH-02、HIST-01、HIST-02）`acd893b` + 本任务只在 `content/history.json` 与 `docs/research/coral-sea-sources.md` 内的 delta
- 记录检查：`node scripts/validate-content.mjs --stage coral`（见 §6）；`--stage full` 按工作单不由本任务运行

---

## 1. 本任务实际读取的来源（2026-11-05 取回）

| ID | 标题 | 作者/发布机构 | 年份 | URL | 访问状态 |
|---|---|---|---|---|---|
| `source-oni-coral-sea-combat-narrative` | USN Combat Narrative: The Battle of the Coral Sea, May 4-8, 1942 | Office of Naval Intelligence, U.S. Navy | 1943 | https://www.ibiblio.org/hyperwar/USN/USN-CN-Coral/index.html | **READ**（HTTP 200：索引页与第 1–5 章正文，含 `The Battle of the Coral Sea` p.1、`Our forces joined` p.2、`The action at Tulagi` p.5、`Observations` p.9、`Events between Tulagi and Misima` p.9、`The action off Misima, May 7th` p.13、`Combat air patrol on the 7th` p.17、`Results of the 7th` p.20、`The action of May 8th` p.21、`Air attack on our task force` p.25、`Combat air patrol on the 8th` p.26、`Attack on the Yorktown` p.29、`Sinking of the Lexington` p.39、`Conclusions` p.46；附录 pp.47–55 未逐页读取） |
| `source-oni-midway-combat-narrative` | USN Combat Narrative: The Battle of Midway, June 3-6, 1942 | Office of Naval Intelligence, U.S. Navy | 1943 | https://www.ibiblio.org/hyperwar/USN/USN-CN-Midway/index.html | **READ**（HTTP 200：索引页与 `The Battle of Midway, background` pp.1–5；用于珊瑚海之后日军转向中太平洋、中途岛航母编成与约克城号抢修） |
| `source-nww2m-battle-midway` | The Battle of Midway | The National WWII Museum | 2026 页 | https://www.nationalww2museum.org/war/articles/battle-midway | **READ**（HTTP 200；只用于既有的中途岛密码分析 claim 的关联，不用于珊瑚海事实） |
| `source-wikipedia-takagi`（本任务新增） | Takeo Takagi (Wikipedia article, revision 1379846610) | Wikipedia contributors | 2026 | https://en.wikipedia.org/wiki/Takeo_Takagi | **READ**（HTTP 200；低权重参考，仅用于高木武雄的职务信息） |

复用的既有来源（此前任务已读并接受；本任务不声称重新抓取正文，只复用其 claims 与定位）：

| ID | 来源 | 本任务使用方式 |
|---|---|---|
| `source-doolittle-after-action-report` | General Doolittle's Report on Japanese Raid | 复用杜立特空袭的原始报告 claims（第 4 部分导读的杜立特小节、carrier-raids 事件） |
| `source-ussbs-pto-ch2` / `source-jm-097` 等 | 既有珍珠港/背景来源 | 未在本任务引用 |

---

## 2. 新增 claims 与来源定位（本任务新增 20 条）

| Claim ID | 类型 | 支撑来源与定位 | 支撑内容 |
|---|---|---|---|
| `claim-coral-lae-salamaua-raid` | fact | ONI 珊瑚海 `The Battle of the Coral Sea, p. 1` | 3 月 10 日空袭莱城与萨拉马瓦：削弱但未阻止日军南下 |
| `claim-coral-tulagi-attack` | fact | ONI 珊瑚海 `The action at Tulagi on May 4th, pp. 5-8` | 5 月 4 日约克城号三波空袭图拉吉及双方损失 |
| `claim-coral-tulagi-cost` | fact | ONI 珊瑚海 `Observations, p. 9` | 图拉吉行动弹药消耗与战果之比令人失望；CINCPAC 的训练教训 |
| `claim-coral-shoho-sunk` | fact | ONI 珊瑚海 `The action off Misima, May 7th, pp. 13-20`；`Results of the 7th, p. 20` | 5 月 7 日约 92 架合并攻击群击沉祥凤号与轻巡；双方飞机损失 |
| `claim-coral-fighter-direction-criticism` | fact | ONI 珊瑚海 `Combat air patrol on the 8th, pp. 26-28` | 5 月 8 日 17 架战斗机仅 3 架有效拦截；脚注中的战斗机引导批评 |
| `claim-coral-may8-exchange` | fact | ONI 珊瑚海 `The action of May 8th, pp. 21-25`；`Attack on the Yorktown, pp. 29-30`；`Sinking of the Lexington, pp. 39-45` | 5 月 8 日双方几乎同时攻击；约克城号中弹 37 人阵亡、列克星敦号最终被放弃 |
| `claim-coral-losses-summary` | fact | ONI 珊瑚海 `Summary of Enemy Damage and Summary of our losses, p. 45` | 双方损失汇总（当时口径）：祥凤沉、翔鹤重创；列克星敦沉、尼奥肖与西姆斯沉、约克城伤；美机 66 架、人员 543；日军人员 2,000–5,000+ 估计 |
| `claim-coral-neosho-sims` | fact | ONI 珊瑚海 `The action of May 8th, p. 21`；`Summary ... p. 45` | 5 月 7 日尼奥肖号与西姆斯号被日军飞机击沉 |
| `claim-coral-moresby-threat` | fact | ONI 珊瑚海 `The Battle of the Coral Sea, p. 1` | 日军据点可威胁美拉尼西亚与澳大利亚；目标之一是海上入侵莫尔兹比港 |
| `claim-coral-mo-operation` | fact | ONI 珊瑚海 `Events between Tulagi and Misima, pp. 10-11` | 5 月 6 日下午判断日军将经约马德海峡进攻莫尔兹比港；预计 7 或 8 日 |
| `claim-coral-us-objective` | fact | ONI 珊瑚海 `Events between Tulagi and Misima, p. 10` | 弗莱彻 5 月 6 日作战命令：抓住有利机会摧毁敌舰船与飞机以阻止日军推进 |
| `claim-coral-outcome-disputed` | **disputed** | ONI 珊瑚海 `Conclusions, p. 46`；ONI 中途岛 `The Battle of Midway, background, p. 1` | 美方结论称“决定性且影响深远”的胜利 vs 日军并未停止进攻、转向中太平洋；两种评价角度 |
| `claim-coral-midway-carrier-list` | fact | ONI 中途岛 `The Battle of Midway, background, p. 1` | 中途岛日军打击部队只有赤城、加贺、苍龙、飞龙四艘；参加珊瑚海的翔鹤与瑞鹤不在其中 |
| `claim-coral-midway-shift` | fact | ONI 中途岛 `The Battle of Midway, background, pp. 1-3` | 珊瑚海后平静不代表日本放弃进攻；日军把中太平洋重击视为战略时机 |
| `claim-coral-yorktown-repair` | fact | ONI 中途岛 `The Battle of Midway, background, p. 3` | 约克城号在珍珠港三天抢修后参加中途岛 |
| `claim-coral-moresby-postponed` | interpretation | ONI 珊瑚海 `The action of May 8th, p. 21`；ONI 中途岛 `The Battle of Midway, background, p. 1` | 综合两部战史：登陆船团北撤、西南太平洋停顿、主攻转向中太平洋，莫尔兹比港登陆未按原计划发生 |
| `claim-coral-fitch-command` | fact | ONI 珊瑚海 `Our forces joined, p. 2`；`The action of May 8th, p. 21` | 菲奇 4 月 2 日接掌航母编队、5 月 1 日会合后由弗莱彻统一指挥、5 月 8 日 09:07 移交战术指挥 |
| `claim-coral-fletcher-retire` | fact | ONI 珊瑚海 `Sinking of the Lexington, p. 39` | 5 月 8 日下午放弃再战、向南撤退；该决定使列克星敦号约 92% 舰员获救 |
| `claim-coral-shokaku-not-sunk` | fact | ONI 珊瑚海 `The action of May 8th, p. 25` | 美军内部对日军损失判断不一；后续表明翔鹤重创、瑞鹤仅轻伤，两舰均未沉没 |
| `claim-coral-takagi-command` | fact | Wikipedia 高木武雄条目 `Biography, paragraph 5`（低权重） | 高木指挥第 5 航空战队参加 MO 作战、为珊瑚海日方现场高级指挥官 |

复用的既有 claims（不重复列出文本）：`claim-naval-aviation-coral-simultaneous`、`claim-radar-coral-bogey-problem`、`claim-radar-carriers-should-have-two`、`claim-nimitz-coral-evaluation`、`claim-fletcher-combined-command`、`claim-fletcher-fuel-constraint`、`claim-fletcher-fuel-limited-reach`、`claim-fletcher-tulagi-chance`、`claim-fletcher-tulagi-risked-dispersion`、`claim-fletcher-false-report`、`claim-fletcher-night-risk-tradeoff`、`claim-fletcher-coral-outcome`、`claim-fletcher-cincpac-praise`、`claim-aircraft-role-split`、`claim-doolittle-purpose-and-plan`、`claim-doolittle-forced-early-launch`、`claim-doolittle-launch-position`、`claim-doolittle-crew-fates`、`claim-doolittle-significance-limits`、`claim-midway-codebreaking`。

**定位约定**：ONI 两部战史在网页上有真实章节标题与印刷页号，locator 一律写成「章节标题 + 印刷页号」；Wikipedia 页面使用真实小节标题（`Biography`）+ 段序。没有为任何来源编造页码。

---

## 3. 地图阶段数据（4 个阶段，全部示意）

`battle-coral-sea.phases` 共 **4** 个阶段；每阶段都有 `time`（带时区 ISO + display + uncertainty）、双方 `positions`（placeIds、示意坐标、`schematic: true`、`uncertaintyRadiusKm`、`uncertaintyNote`）、双方 `knownEnemy`/`unknownEnemy`、双方 `decision`/`consequence`、`certainty`、双方 `viewpoints`（各自 sourceIds/claimIds）、至少一条 `schematic: true` 且起终点不同的 `routes`、`eventIds`/`sourceIds`/`claimIds`：

| 阶段 ID | sequence | 时间（当地时间） | 示意位置 | certainty |
|---|---:|---|---|---|
| `phase-coral-1-tulagi` | 1 | 1942-05-04 08:45–17:02 | 图拉吉泊地 / 约克城号编队（示意） | documented |
| `phase-coral-2-search-fuel` | 2 | 1942-05-05 08:46–05-06 18:00 | 美军会合加油海域 / 日军 MO 部队（示意） | estimated |
| `phase-coral-3-misima` | 3 | 1942-05-07 06:00–20:00 | 米西马岛以北日军掩护群 / 美军航母与攻击群（示意） | documented |
| `phase-coral-4-may8` | 4 | 1942-05-08 08:00–19:52 | 珊瑚海中部美军航母 / 东北方向日军航母（示意） | documented |

所有舰位与航线均为教学示意，并各自带 `uncertaintyNote`；本教材不把任何示意折线当作精确历史航迹。

---

## 4. 第 4 部分问题（本任务唯一负责）

| 项 | 值 |
|---|---|
| Question ID | `question-why-coral-sea-judged-differently` |
| historicalPart | `part-4-turning-point` |
| prompt | 珊瑚海海战为什么可以从不同角度评价胜负？ |
| answer | 254 汉字（≥160），基于比较方案与证据分析：当天舰艇交换 vs 战略目标（登陆是否被阻止、后续战局是否改变） |
| 关联实体 entityIds | `battle-coral-sea`、`event-overview-part-4-turning-point`、`person-fletcher-frank-jack`、`place-port-moresby` |
| 关联来源 sourceIds | `source-oni-coral-sea-combat-narrative`、`source-oni-midway-combat-narrative` |
| 关联 claims claimIds | `claim-coral-outcome-disputed`、`claim-coral-losses-summary`、`claim-coral-may8-exchange`、`claim-coral-moresby-postponed`、`claim-coral-midway-shift`、`claim-coral-midway-carrier-list` |

验证器按 `question.historicalPart === 'part-4-turning-point'` 且 `questionMeetsCoverage()`（answer ≥160 汉字、≥2 个实体、≥1 来源、≥1 claim，且所引 ID 都存在）判定该部分已满足；`--stage coral` 的真实输出见 §6。

---

## 5. 失败检索与环境限制（如实记录）

- 美国海军历史与遗产司令部 `history.navy.mil`、美国陆军军事历史中心 `history.army.mil`：此前多次 DNS 解析失败（`EAI_AGAIN`），本任务未改用其它域名绕过。
- 澳大利亚国家档案馆 `naa.gov.au`、英国帝国战争博物馆 `iwm.org.uk`、`ww2db.com`、美国海军学会 `usni.org`：此前返回 403。
- 本任务**没有读取** ONI 珊瑚海叙事的附录（pp.47–55，关于约克城号中弹细节、尼奥肖/西姆斯被攻击经过等），因此正文对相关细节只作概括，不引用附录页码。
- 本任务没有取得日方原始档案或日文一手材料；日方视角与损失主要经由 ONI 战史与二手条目转述，凡涉及日方内部判断的表述都标注为来源记载或解释。
- 高木武雄的职务信息来自 Wikipedia（低权重参考），已在来源 `reliabilityNote` 中标注，不用于战斗过程、数字或因果判断。

---

## 6. 记录检查的真实输出

```text
$ node scripts/validate-content.mjs --stage coral
阶段：coral（累积部分门禁）
实体：88；来源：30；claim：261；问题：6；素材：0
结果：PASS
说明：结构验证通过不等于可读性评审通过；可读性证据须见 tests/evidence/pedagogy.md。
退出码：0
```

补充检查（证明没有回归）：

```text
$ node scripts/validate-content.mjs --stage pearl    → 结果：PASS，退出码 0
$ node scripts/validate-content.mjs --check-contracts → 结果：PASS（契约文件一致；这不代表 content/history.json 已交付），退出码 0
```

`--stage coral` 的唯一警告是既有 `history.json` 顶层空 `media` 数组的迁移提示，不影响退出码（MEDIA-02 迁移后自然消失；本任务不创建 `content/media.json`，不改写媒体实体）。按工作单，本任务**未运行** `--stage full` 作为记录检查。

---

## 7. 审计记录（Fletcher 与三大专题）

- **`person-fletcher-frank-jack`**：审计后为 609 汉字 profile、**4** 个决策卡、3 个独立来源、13 条 claims（最低要求 500/3/3/3，达标）。原有 3 张决策卡覆盖珊瑚海期间的燃油取舍、图拉吉出击与 5 月 7 日夜战取舍；本任务**新增**第 4 张决策卡「5 月 8 日下午：再战还是撤退」（依据 ONI `Sinking of the Lexington, p. 39`），并把 `battle-coral-sea` 加入其 `battleIds`、把 `claim-coral-fletcher-retire` / `claim-coral-fitch-command` / `claim-nimitz-coral-evaluation` 加入其 claims。未删除或改写其它内容，未回退既有深度。
- **`concept-radar`**（3 层：无线电波探测 / 强项与做不到的事 / 为什么改变舰队决策）、**`concept-codebreaking`**（3 层：加密与破译 / 破译后还要验证 / 情报优势的能与不能）、**`concept-naval-aviation`**（3 层：搜索侦察 / 组织一波攻击 / 时间差为什么决定胜负）：三层顺序均符合「是什么→如何运作→如何影响决策/中途岛」的递进，深度均高于 coverage 最低要求（`--stage coral` 通过）。本任务**只**把 `battle-coral-sea`、`event-overview-part-4-turning-point`、`event-us-carrier-raids-early-1942` 追加进三个专题的 `relatedEntityIds`，使它们与本任务内容互链；**未改写**任何专题正文。
- **既有陈述冲突检查**：检索既有 canvas 中与珊瑚海相关的 claims（均为 HIST-00 已接受、ONI 来源的雷达/海军航空/弗莱彻/尼米兹评价 claims），未发现与本任务新增内容直接冲突的陈述，因此本任务没有需要更正的既有陈述。

---

## 8. 交付内容与本任务边界

- 新增 `battle-coral-sea`：14 个固定小节（每节 ≥160 汉字，实际 164–201 汉字），**4** 个地图阶段，3 位人物、4 个地点、4 个来源、35 条 claims（含 1 条 disputed：`claim-coral-outcome-disputed`）。
- 新增 `event-overview-part-4-turning-point`：5 个精确标题小节（每节 ≥100 汉字，实际 152–207；合计 874 汉字），4 个来源、18 条 claims、4 个 placeIds。
- 新增 `event-us-carrier-raids-early-1942`：2 节、247 汉字、2 个来源、4 条 claims。
- 新增 `question-why-coral-sea-judged-differently`（part-4，见 §4）。
- 新增地点 `place-tulagi`、`place-port-moresby`、`place-misima`；新增人物 `person-fitch-aubrey`、`person-takagi-takeo`；新增来源 `source-wikipedia-takagi`；新增 20 条 claims；更新 Fletcher 档案与三个专题的关联（见 §7）。
- **未**修改契约、验证器、`src`、`tests`、`public`、媒体；**未**创建 `content/media.json`；**未**改写第 1、2、3 部分既有问题与既有正文；**未** commit/merge/push。

---

## 9. 已知限制

1. 双方损失数字采用 ONI 战时估计口径（美机 66 架、人员 543；日军人员 2,000–5,000+ 估计）；本教材明确标注为当时估计，不与战后统计合并成精确数字。
2. 翔鹤与瑞鹤均未沉没：翔鹤重创、瑞鹤仅轻伤；当时美军内部对日军损失的判断并不一致，本教材以 `claim-coral-shokaku-not-sunk` 与 disputed claim 分开呈现。
3. 战斗机引导批评来自 ONI 脚注中的军官意见，属当时参与者的评价，不等同于官方调查结论。
4. 日方现场指挥官的职务信息只有低权重参考来源支撑；日方战斗过程与损失主要依据美方官方战史转述。
5. 珊瑚海是否“阻止”了莫尔兹比港登陆属解释性判断：日军登陆船团北撤、行动停顿与转向中太平洋均有 ONI 战史支撑，但“登陆未按原计划发生”是由两部战史综合推出的解释，已在 `claim-coral-moresby-postponed` 中标为 interpretation。
6. 地图阶段全部为示意；真实航迹无法逐点重建，本教材不把示意数据包装成精确轨迹。
7. 可读性与教学效果须由人工评审并记录 `tests/evidence/pedagogy.md`；该中央交付物尚不存在，本任务不声称内容已通过可读性评审。
8. 本任务不运行 `--stage full`；第 5 部分问题由 HIST-04 交付，问题集终稿计数核对归 QQUEST-01。
