# HIST-04 中途岛章节研究来源记录（attempt 1）

状态：本文件是 HIST-04「中途岛深度档案、尼米兹/斯普鲁恩斯档案、第 5 部分问题与教材全量门禁」的来源与证据日志。它记录本任务**实际读取过**的来源与定位、每条来源支撑的 claims、失败检索、两份交付档案的要素、第 5 部分问题的 ID 与关联、其余三位指挥官的现状与归属（DOC-02），以及下游输入（QQUEST-01 / DOC-02 / MEDIA-02）。

- 任务：HIST-04（模块 knowledge，角色 content_creator），attempt 1
- 工作单：`.cache/orders/HIST-04-a1.md`，sha256 = `6fdd8fbe61edb56897d32668f84dd357c48bd5f2582b040fbde92e582140b15a`（只读输入，未编辑）
- 候选：已接受集成（含 HIST-00..HIST-03）`f898fb5` + 本任务只在 `content/history.json` 与 `docs/research/midway-sources.md` 内的 delta
- 记录检查：`node scripts/validate-content.mjs --stage full`（不读媒体，见 §7）

---

## 1. 本任务实际读取的来源（2026-11-05 取回，HTTP 200）

| ID | 标题 | 作者/发布机构 | 年份 | URL | 访问状态 |
|---|---|---|---|---|---|
| `source-oni-midway-combat-narrative` | USN Combat Narrative: The Battle of Midway, June 3-6, 1942 | Office of Naval Intelligence, U.S. Navy | 1943 | https://www.ibiblio.org/hyperwar/USN/USN-CN-Midway/index.html | **READ**（索引页与以下章节：`The Battle of Midway, background` pp.1–5；`First contact with the enemy, June 3` pp.9–11；`The enemy attack on Midway, June 4` pp.11–16；`End of the Yorktown, June 6-7` pp.51–55，含 `Summary of enemy losses in the Battle of Midway` p.54 与 `Summary of our losses` p.55） |
| `source-nww2m-battle-midway` | The Battle of Midway | The National WWII Museum | 2026 页 | https://www.nationalww2museum.org/war/articles/battle-midway | **READ**（HTTP 200；`Breaking the Code` 与 `The Battle` 小节，用于密码分析与战果概述） |

复用的既有来源（此前任务已读并接受；本任务不声称重新抓取正文，只复用其 claims 与定位）：

| ID | 来源 | 本任务使用方式 |
|---|---|---|
| `source-nww2m-operation-vengeance` | Operation Vengeance: The Killing of Isoroku Yamamoto | 复用 `claim-codebreaking-frupac-*` 等密码分析 claims（仅作为概念/背景关联） |
| `source-ussbs-pto-campaigns` | Campaigns of the Pacific War（USSBS） | 复用 `claim-nagumo-kido-butai-command` 等编成 claims |
| `source-ussbs-pto-ch2` | USSBS Pearl Harbor 章 | 复用山本五十六身份/计划 claims |
| `source-dmn-king-nimitz` | Defense Media Network：King 与 Nimitz 特写 | 复用尼米兹接任与评估 claims（二手，已标注） |

本任务新增 `place-midway`（中途岛环礁，真实地理坐标 28.21°N、177.37°W），并为它挂接 `claim-midway-june3-contact`（ONI 6 月 3 日首次接触的日期与方位记载）。

---

## 2. 新增 claims 与来源定位（本任务新增 6 条）

| Claim ID | 类型 | 支撑来源与定位 | 支撑内容 |
|---|---|---|---|
| `claim-midway-june3-contact` | fact | ONI `First contact with the enemy, June 3, pp. 9-11` | 6 月 3 日 09:04 首次发现日军水面舰艇、09:25 报告“主力”、B-17 与 PBY 的后续攻击；日军航母当天未被发现 |
| `claim-midway-midway-attack` | fact | ONI `The enemy attack on Midway, June 4, pp. 11-16` | 6 月 4 日 05:45 报告机群、05:52 发现两艘航母、06:30 第一枚炸弹；中途岛设施受损；美军战斗机损失与战果 |
| `claim-midway-japanese-losses` | fact | ONI `Summary of enemy losses in the Battle of Midway, p. 54` | 四艘航母沉没；估计 275 架飞机、2,400 人；战列舰/巡洋舰/驱逐舰损失；总人员损失估计约 4,800 人 |
| `claim-midway-us-losses` | fact | ONI `End of the Yorktown, June 6-7, pp. 51-55` | 约克城号与哈曼号沉没；约 150 架飞机；92 名军官与 215 名士兵（307 人） |
| `claim-midway-yorktown-loss` | fact | ONI `End of the Yorktown, June 6-7, pp. 51-53` | 6 月 4 日重创弃舰、6 月 6 日被潜艇鱼雷命中、6 月 7 日 05:01 沉没；哈曼号同时被击沉 |
| `claim-midway-failure-cause-disputed` | **disputed** | NWW2M `Breaking the Code, paragraph 1`；ONI `Our carrier attack on the enemy carriers, June 4, p. 23` | 日本失败主因的两种侧重：美国破译设伏 vs 日军侦察/整备时间差与防御机动阻碍起飞；不归结为单一原因 |

复用的既有 Midway claims（不重复列出文本）：`claim-midway-codebreaking`、`claim-codebreaking-af-confirmed`、`claim-codebreaking-station-hypo-scope`、`claim-codebreaking-limit-not-omniscient`、`claim-nimitz-midway-air-control`、`claim-nimitz-midway-assessment-quote`、`claim-spruance-task-force-sugar`、`claim-spruance-launch-timing`、`claim-spruance-search-turn`、`claim-spruance-reserve-hornets-bombers`、`claim-spruance-hiryu-retaliation`、`claim-spruance-usn-cinpac-directive`、`claim-radar-midway-detected`、`claim-radar-midway-plot-log`、`claim-nagumo-carriers-turned-north`、`claim-nagumo-defensive-maneuver-blocked-launch`、`claim-nagumo-no-visible-damage-at-contact`、`claim-nagumo-attack-timing-squeeze`、`claim-nagumo-four-carriers-lost`、`claim-nagumo-kido-butai-command`、`claim-yamamoto-us-industrial-might`、`claim-fletcher-combined-command`、`claim-aircraft-role-split`、`claim-coral-midway-carrier-list`、`claim-coral-midway-shift`、`claim-coral-yorktown-repair`。

**定位约定**：ONI 网页有真实章节标题与印刷页号，locator 一律写成「章节标题 + 印刷页号」；NWW2M 页面使用其真实小节标题（`Breaking the Code` / `The Battle`）+ 段序。没有为任何来源编造页码或小节。

---

## 3. 地图阶段数据（5 个阶段，全部示意）

`battle-midway.phases` 共 **5** 个阶段；每阶段都有 `time`（带时区 ISO + display + uncertainty）、双方 `positions`（placeIds、示意坐标、`schematic: true`、`uncertaintyRadiusKm`、`uncertaintyNote`）、双方 `knownEnemy`/`unknownEnemy`、双方 `decision`/`consequence`、`certainty`、双方 `viewpoints`（各自 sourceIds/claimIds）、至少一条 `schematic: true` 且起终点不同的 `routes`、`eventIds`/`sourceIds`/`claimIds`：

| 阶段 ID | sequence | 时间（当地时间 +12） | 内容 | certainty |
|---|---:|---|---|---|
| `phase-midway-1-contact` | 1 | 1942-06-03 09:04–23:59 | 中途岛巡逻机首次接触日军水面编队 | documented |
| `phase-midway-2-midway-attack` | 2 | 1942-06-04 04:15–07:15 | 日军航母空袭中途岛 | documented |
| `phase-midway-3-carrier-attack` | 3 | 1942-06-04 07:20–12:00 | 美军航母攻击群攻击日军航母 | documented |
| `phase-midway-4-hiryu` | 4 | 1942-06-04 12:00–21:00 | 飞龙号反击与四艘日军航母损失 | documented |
| `phase-midway-5-pursuit` | 5 | 1942-06-05–06-07 05:01 | 追击、撤退与约克城号沉没 | estimated |

所有舰位与航线均为教学示意，并各自带 `uncertaintyNote`；本教材不把任何示意折线当作精确历史航迹。

---

## 4. 第 5 部分问题（本任务唯一负责）

| 项 | 值 |
|---|---|
| Question ID | `question-did-midway-change-initiative` |
| historicalPart | `part-5-midway` |
| prompt | 中途岛海战是否真正改变了太平洋战争的战略主动权？ |
| answer | 249 汉字（≥160），基于损失与长期趋势的比较：1942 年 6 月的航母兵力对比 vs 整场战争的长期趋势 |
| 关联实体 entityIds | `battle-midway`、`event-overview-part-5-midway`、`person-nimitz-chester`、`person-spruance-raymond` |
| 关联来源 sourceIds | `source-oni-midway-combat-narrative`、`source-nww2m-battle-midway` |
| 关联 claims claimIds | `claim-midway-japanese-losses`、`claim-midway-us-losses`、`claim-midway-failure-cause-disputed`、`claim-midway-codebreaking`、`claim-nimitz-midway-assessment-quote` |

验证器按 `question.historicalPart === 'part-5-midway'` 且 `questionMeetsCoverage()`（answer ≥160 汉字、≥2 个实体、≥1 来源、≥1 claim，且所引 ID 都存在）判定该部分已满足；`--stage full` 的真实输出见 §7。

---

## 5. 本任务交付的两份决策型档案（唯一写作属主）

### 5.1 `person-nimitz-chester`

- 现有档案：525 汉字 profile、**4** 个决策卡、3 个独立来源、10 条 claims（最低 500/3/3/3，达标）。
- 本任务新增第 4 张决策卡 `decision-nimitz-commit-carriers-midway`（把三艘航母投入中途岛）：写明当时**知道**什么（破译情报指向中途岛）、**不知道**什么（日军兵力与确切时间）、**可选方案**（集中设伏 vs 保留/分散）、**约束**（仅三艘航母、约克城号未完成大修、情报有不确定性）、**实际选择**与**后果**（得以在中途岛东北设伏），并附 claim/来源定位（`claim-midway-codebreaking`、`claim-nimitz-midway-air-control`、`claim-coral-yorktown-repair`）。
- 同时把 `battle-midway`、`event-overview-part-5-midway` 加入关联，并把 `claim-midway-codebreaking`、`claim-midway-failure-cause-disputed` 等 claims 挂入；未删除或改写原有内容。

### 5.2 `person-spruance-raymond`

- 现有档案：606 汉字 profile、**4** 个决策卡、3 个独立来源、7 条 claims（达标）。
- 原有 3 张决策卡已覆盖“提前在远距离出动全部攻击兵力”“保留部分俯冲轰炸机等待第五艘敌航母确认”“下午对飞龙号发起决定性攻击”，均写出选项、约束、后果与来源。本任务新增第 4 张决策卡 `decision-spruance-turn-to-intercept`（6 月 4 日清晨转向迎击）：写明当时知道/不知道、选项、约束与实际选择，并附 `claim-spruance-search-turn`、`claim-spruance-task-force-sugar` 定位。
- 同时把 `battle-midway`、`event-overview-part-5-midway` 加入关联；未删除或改写原有内容。

### 5.3 其余三位指挥官（本任务不写、不改，只记录现状；归属 DOC-02）

| 人物 | 当前要素状态（实测） | 归属 |
|---|---|---|
| `person-yamamoto-isoroku` | 573 汉字 profile、3 个决策卡、4 个来源、8 条 claims；HIST-00 交付，HIST-02 审计时删除了一条无定位支撑的旧 claim（对马负伤细节） | 既有档案由 HIST-00/HIST-02 所有；后续以 content-rubric 复核的缺口归 **DOC-02** |
| `person-nagumo-chuichi` | 666 汉字 profile、3 个决策卡、4 个来源、9 条 claims；HIST-00 交付、HIST-02 审计 | 同上，归 **DOC-02** |
| `person-fletcher-frank-jack` | 609 汉字 profile、4 个决策卡、3 个来源、13 条 claims；HIST-00 交付、HIST-03 审计并补充第 4 张决策卡 | 同上，归 **DOC-02** |

本任务**没有**补写、改写或删除上述三份档案；也未新增任何关于这三位人物的 claims。

### 5.4 `concept-logistics`

已存在 894 汉字、3 层、4 个 related entities（最低 650/3/…，达标）。本任务只在 `relatedEntityIds` 追加 `battle-midway` 与 `event-overview-part-5-midway`，使补给专题与本任务内容互链；未改写正文。

---

## 6. 失败检索与环境限制（如实记录）

- 美国海军历史与遗产司令部 `history.navy.mil`、美国陆军军事历史中心 `history.army.mil`：此前多次 DNS 解析失败（`EAI_AGAIN`），本任务未改用其它域名绕过。
- 澳大利亚国家档案馆 `naa.gov.au`、英国帝国战争博物馆 `iwm.org.uk`、`ww2db.com`、美国海军学会 `usni.org`：此前返回 403。
- 本任务**没有**逐页读取 ONI 中途岛叙事的第 2、3、6、7、8、9、10、11、12、14 章；相关事实与定位使用已接受的既有 claims（其 locator 指向这些章节的具体页），或第 4、5、13 章中本任务实际读到的内容。凡本任务新增的 claim，只引用本任务实际读过的章节页。
- 未取得日方原始档案或日文一手材料；日方视角与损失主要依据 ONI 战史与博物馆文章转述。

---

## 7. 记录检查的真实输出

```text
$ node scripts/validate-content.mjs --stage full
阶段：full（最终硬门禁）
提示：本次未运行 --media；发布前必须单独运行素材门禁。
实体：91；来源：30；claim：270；问题：7；素材：0

警告：
- $.media: history.json 仍含空的 legacy media 数组（过渡窗口内仅警告）。迁移映射：把 history.json 顶层 media[] 原样搬到 content/media.json 的 { "version": 1, "media": [...] } 中（条目形状完全不变，articleIds 仍是文章关联），并删除 history.json 的 media 字段。 由 MEDIA-02 写入 content/media.json；HIST-04 不写；QA-01 运行 --media 校验；WEB-01/MAP-01 只读。

结果：PASS
说明：结构验证通过不等于可读性评审通过；可读性证据须见 tests/evidence/pedagogy.md。
退出码：0
```

补充检查（证明没有回归）：

```text
$ node scripts/validate-content.mjs --stage coral    → 结果：PASS，退出码 0
$ node scripts/validate-content.mjs --check-contracts → 结果：PASS（契约文件一致；这不代表 content/history.json 已交付），退出码 0
```

说明：`--stage full` 的唯一警告是既有 `history.json` 顶层空 `media` 数组的迁移提示，不影响退出码；该警告与 `content/media.json` 的首次交付由 **MEDIA-02** 负责。本任务**未运行** `--media`（工作单要求 `--stage full` 且不读媒体；发布前须单独运行素材门禁）。全量门禁对第 1—4 部分的问题覆盖与关键条目深度未报告缺口。

---

## 8. 交付内容与本任务边界

- 新增 `battle-midway`：14 个固定小节（每节 ≥160 汉字，实际 160–187 汉字），**5** 个地图阶段，5 位人物、3 个地点、5 个来源、32 条 claims（含 1 条 disputed：`claim-midway-failure-cause-disputed`）。
- 新增 `event-overview-part-5-midway`：**8** 个精确标题小节（每节 ≥100 汉字，实际 127–178；合计 1201 汉字），5 个来源、20 条 claims、3 个 placeIds。
- 新增 `question-did-midway-change-initiative`（part-5，见 §4）。
- 新增地点 `place-midway`；新增 6 条 claims；交付/加强尼米兹与斯普鲁恩斯档案（见 §5）；`concept-logistics` 仅追加关联。
- 新增来源替身说明：本任务没有新增 source 记录（ONI 中途岛、NWW2M 中途岛、USSBS、DMN 等均已在既有注册表中）。
- **未**修改契约、验证器、`src`、`tests`、`public`、`content/media.json` 或 `history` 的媒体字段；**未**改写第 1—4 部分既有问题与既有正文；**未** commit/merge/push。

---

## 9. 下游输入（登记，不写成已交付）

| 任务 | 内容 | 状态 |
|---|---|---|
| **QQUEST-01** | 在 HIST-00..HIST-04 之后补问题集的真实缺口并做跨部分计数核对 | 未交付；本任务只新增第 5 部分问题，未做终稿计数核对 |
| **DOC-02** | 以 content-rubric 复核五位指挥官与六大核心专题，只补真实缺口 | 未交付；山本/南云/弗莱彻档案的后续修改权归 DOC-02 |
| **MEDIA-02** | 首次交付 `content/media.json` 与素材注册，迁移 `history.json` 顶层空 `media` 数组 | 未交付；全量门禁的媒体警告由它消除 |

---

## 10. 已知限制

1. 损失数字采用 ONI 战时/战后初期统计口径（日军估计 275 架飞机、2,400 名舰载机人员、总人员损失约 4,800 人；美军约 150 架飞机、307 人）；本教材明确标注为估计/当时统计，不与后来的研究合并成精确数字。
2. 中途岛是否“真正改变战略主动权”是评价问题：本教材把它作为第 5 部分问题呈现，列出短期航母兵力对比与长期战争趋势两种尺子，不给出单一结论。
3. 日本失败主因是历史争议；`claim-midway-failure-cause-disputed` 并列情报设伏与侦察/整备时间差两种侧重，不静默选边。
4. 第 5 部分地图阶段全部为示意；真实航迹无法逐点重建，本教材不把示意数据包装成精确轨迹。
5. 本任务只读取了 ONI 中途岛叙事的第 1、4、5、13 章；其余章节的事实依赖既有已接受 claims 的定位。
6. `--stage full` PASS 只证明结构、覆盖与引用完整性；可读性/教学效果须由人工评审并记录 `tests/evidence/pedagogy.md`（尚不存在），本任务不声称通过可读性评审。
7. 本任务不运行 `--media`；素材门禁与媒体注册由 MEDIA-02 后续交付。
