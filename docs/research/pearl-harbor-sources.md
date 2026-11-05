# HIST-02 珍珠港章节研究来源记录（attempt 1）

状态：本文件是 HIST-02「珍珠港深度档案、第 2 部分证据型问题与阶段地图」的来源与证据日志。它记录本任务**实际读取过**的来源与定位、每条来源支撑的 claims、失败检索，以及第 2 部分问题的 ID、所属部分、关联实体与 claims，便于验收评审用 `node scripts/validate-content.mjs --stage pearl` 的真实输出核对。

- 任务：HIST-02（模块 knowledge，角色 content_creator），attempt 1
- 工作单：`.cache/orders/HIST-02-a1.md`，sha256 = `4b4d3a71030b2624d32b28fc66b5c7eaf142291d74d710d92bf0fbeeaa9d823c`（只读输入，未编辑）
- 候选：已接受集成（含已接受 HIST-00、ARCH-02、HIST-01）`269801d` + 本任务只在 `content/history.json` 与 `docs/research/pearl-harbor-sources.md` 内的 delta
- 记录检查：`node scripts/validate-content.mjs --stage pearl`（见 §7）；`--stage full` 按工作单不由本任务运行

---

## 1. 本任务实际读取的来源（2026-11-05 取回）

| ID | 标题 | 作者/发布机构 | 年份 | URL | 访问状态 |
|---|---|---|---|---|---|
| `source-ussbs-pto-ch2` | *Campaigns of the Pacific War*, Chapter 2: The Japanese Attack on Pearl Harbor, Planning and Execution | United States Strategic Bombing Survey | 1946 | https://www.ibiblio.org/hyperwar/AAF/USSBS/PTO-Campaigns/USSBS-PTO-2.html | **READ**（HTTP 200，全文重读，含 Appendix 1–4） |
| `source-nps-opana-radar` | Opana Mobile Radar Site | U.S. National Park Service, Pearl Harbor National Memorial | 2024 | https://www.nps.gov/perl/learn/historyculture/opana-mobile-radar-site.htm | **READ**（HTTP 200） |
| `source-nps-uss-arizona` | USS Arizona | U.S. National Park Service, Pearl Harbor National Memorial | 2024 | https://www.nps.gov/perl/learn/historyculture/uss-arizona.htm | **READ**（HTTP 200） |
| `source-nara-infamy` | 'A Date Which Will Live in Infamy': The First Typed Draft of Franklin D. Roosevelt's War Address | U.S. National Archives and Records Administration | 2019 页 | https://www.archives.gov/education/lessons/day-of-infamy | **READ**（HTTP 200） |
| `source-nww2m-pearl-missed-warnings`（本任务新增） | The Three Missed Tactical Warnings That Could Have Made a Difference at Pearl Harbor | Richard B. Frank / The National WWII Museum | 2021 | https://www.nationalww2museum.org/war/articles/pearl-harbor-missed-tactical-warnings | **READ**（HTTP 200；用于指挥关系、战备状态与三次战术预警） |

这些页面上的具体定位见 §3。USSBS 第 2 章的章节标题（本任务引用的真实小节）：`Foreword`、`Introduction`、`Organization of the Task Force`、`Selection of Track`、`Selection of Date and Time of Attack`、`The Attack Plans`、`Preparation for the Operation`、`Orders Placing Plan Into Effect`、`Movement of Pearl Harbor Task Force`、`The Attack`、`Execution of Attack`、`Losses`、`General Information`，以及 `Appendix 1`–`Appendix 5`。

---

## 2. 复用已接受来源（此前任务已读，本任务未重新抓取正文）

下列来源与对应 claims 已随 HIST-00 / HIST-01 被接受并入候选；本任务复用其 claim 与定位，不声称本轮重新读取全文，只核对 claim 与 locator 仍存在且指向真实小节/页：

| ID | 来源 | 本任务使用方式 |
|---|---|---|
| `source-jm-097` | *Japanese Monograph No. 97: Pearl Harbor Operations* | 复用命令序列 claims（p.4、p.7、p.13 等） |
| `source-jm-147` / `-appx3` / `-appx4` | *Japanese Monograph No. 147*（含 1941-09-06 御前会议说明） | 复用开战决策与山本「长期战争风险」claims |
| `source-nww2m-path-pearl-harbor` | The National WWII Museum, *The Path to Pearl Harbor* | 复用 1931–1941 背景 claims |
| `source-jacar-imperial-conference-1941` | JACAR C12120240100 御前会议目录 | 复用 1941-12-01 开战决定 claim |
| `source-jm-147-appx3` / `source-ussbs-pto-ch2`（Yamamoto 部分） | 同上 | Yamamoto 档案 9 条 claims 的来源与定位见 §8 |

---

## 3. 新增 claims 与来源定位（本任务新增 14 条）

| Claim ID | 类型 | 支撑来源与定位 | 支撑内容 |
|---|---|---|---|
| `claim-pearl-force-composition` | fact | USSBS `Organization of the Task Force`；`Movement of Pearl Harbor Task Force`；`Appendix 1` | 六航母为核心的编成、两艘战列舰、巡洋舰/驱逐舰/八艘补给油船、11-26 出航、12-07 07:30 抵达放飞点 |
| `claim-pearl-route-choice` | fact | USSBS `Selection of Track` | 三条航线取舍、北方航线的利弊、突然性与海上加油两个决定性因素 |
| `claim-pearl-date-takeoff` | fact | USSBS `Selection of Date and Time of Attack`；`Execution of Attack` | 12-10 月相 vs 12-08 X 日；06:00 第一攻击队起飞、第二队约晚一小时十五分；07:40 到达、07:50 攻击 |
| `claim-pearl-air-organization` | fact | USSBS `The Attack Plans`；`Appendix 3` | 第一攻击队 189 架、第二队 171 架及机种分配；航母不在锚地故集中于战列舰 |
| `claim-pearl-japanese-losses` | fact | USSBS `Losses`；`Japanese Submarines` | 日机损失 29 架；1 艘舰队潜艇与五艘搭载小型潜艇、均未回收 |
| `claim-pearl-us-damage-estimate` | fact | USSBS `Losses` | 当时估计：沉 4 战列舰/1 巡洋舰/2 油船，重创 4 战列舰，轻伤 1；击落 10 架、地面毁约 250 架；无立即侦察评估 |
| `claim-pearl-no-landing` | fact | USSBS `General Information` | 无登陆计划的原因（准备时间、舰速与后勤） |
| `claim-pearl-third-wave-assessment-disputed` | **disputed** | JM 97 `p. 7`；USSBS `General Information` | 撤收是既定命令 vs 不继续攻击的三条理由（目标有限/航母位置不明/陆基飞机反击）；「撤收是否过早」评价分歧 |
| `claim-pearl-oahu-and-launch` | fact | NPS Opana `The Opana Radar Plot, paragraphs 1-2`；USSBS `Movement of Pearl Harbor Task Force` | 瓦胡岛与欧帕纳雷达位置；放飞海域在瓦胡岛以北约二百英里 |
| `claim-pearl-airfield-targets` | fact | USSBS `The Attack Plans`；`Appendix 3` | 俯冲轰炸目标福特岛、惠勒机场机库与停放飞机；战斗机压制 |
| `claim-pearl-us-command-split` | fact | NWW2M Frank 文 `Article body, paragraphs 3-5` | 肖特指挥陆军（约 234 架飞机、152 架战斗机）、金梅尔指挥太平洋舰队、无统一指挥；高射炮未展开/弹药上锁 |
| `claim-pearl-three-tactical-warnings` | fact | NWW2M Frank 文 `Article body, paragraphs 7-14` | 06:45 侦察机、06:30–06:37 沃德号、07:02 欧帕纳三次预警未转成警报；作者对 20 分钟余量的判断 |
| `claim-pearl-ward-submarine-report` | fact | NWW2M Frank 文 `Article body, paragraphs 8-10` | 沃德号攻击小型潜艇与报告未被升级 |
| `claim-pearl-warning-context` | fact | NWW2M Frank 文 `Article body, paragraphs 4-6` | 海军情报在 11-17 后失去航母位置、未告知陆军；战争警告与陆军回复 |

复用的既有 claims（不重复列出文本）：`claim-ussbs-attack-purpose`、`claim-ussbs-norther-route-tradeoff`、`claim-ussbs-date-choice`、`claim-ussbs-055-shallow-water`、`claim-ussbs-decision-1941-11-03`、`claim-ussbs-recall-rules`、`claim-ussbs-carriers-absent`、`claim-ussbs-why-no-second-attack`、`claim-kido-butai-order-1941-11-23`、`claim-kido-butai-rearm-plan`、`claim-opana-radar-detected`、`claim-opana-warning-dismissed`、`claim-arizona-crew-losses`、`claim-us-declares-war-1941-12-08`、`claim-roosevelt-draft-first-line`、`claim-yamamoto-us-industrial-might`、`claim-nagumo-signed-kido-butai-orders`、`claim-ussbs-refuel-critical`、`claim-aircraft-role-split`、`claim-us-fleet-trains-refuel`、`claim-nagumo-kido-butai-command`、`claim-nagumo-strike-doctrine-order`、`claim-nagumo-rearm-in-plan`。

---

## 4. 地图阶段数据（3 个阶段，全部示意）

`battle-pearl-harbor.phases` 共 3 个阶段；每阶段都有 `time`（带时区 ISO + display + uncertainty）、双方 `positions`（placeIds、示意坐标、`schematic: true`、`uncertaintyRadiusKm`、`uncertaintyNote`）、双方 `knownEnemy`/`unknownEnemy`、双方 `decision`/`consequence`、`certainty`、双方 `viewpoints`（各自 sourceIds/claimIds）、至少一条 `schematic: true` 的 `routes`（起终点不同）、`eventIds`/`sourceIds`/`claimIds`：

| 阶段 ID | sequence | 时间（夏威夷时间） | 示意位置 | certainty |
|---|---:|---|---|---|
| `phase-pearl-1-launch` | 1 | 1941-12-07 06:00–07:45 | 放飞海域（`place-north-pacific-launch`）/ 珍珠港与瓦胡岛 | schematic |
| `phase-pearl-2-first-wave` | 2 | 1941-12-07 07:50–08:40 | 第一攻击队（瓦胡岛上空/港区示意）/ 珍珠港泊地与福特岛 | estimated |
| `phase-pearl-3-second-wave-withdraw` | 3 | 1941-12-07 08:55–11:30 | 第二波与返航编队（示意）/ 珍珠港残余守备 | estimated |

所有舰队/飞机位置与航线均为教学示意，并各自带 `uncertaintyNote`；本教材不把任何示意折线当作精确历史航迹。

---

## 5. 第 2 部分问题（本任务唯一负责）

| 项 | 值 |
|---|---|
| Question ID | `question-why-pearl-tactical-strategic` |
| historicalPart | `part-2-pearl-harbor` |
| prompt | 为什么战术上成功的珍珠港袭击，没有带来日本想要的战略结果？ |
| answer | 281 汉字（≥160），基于因果与证据分析：目标有限、航母与设施幸存、美国参战、战术时间换不来战略结果 |
| 关联实体 entityIds | `battle-pearl-harbor`、`event-overview-part-2-pearl-harbor`、`event-us-declares-war-1941`、`person-yamamoto-isoroku` |
| 关联来源 sourceIds | `source-ussbs-pto-ch2`、`source-nara-infamy` |
| 关联 claims claimIds | `claim-ussbs-attack-purpose`、`claim-ussbs-carriers-absent`、`claim-ussbs-why-no-second-attack`、`claim-us-declares-war-1941-12-08`、`claim-pearl-us-damage-estimate` |

验证器按 `question.historicalPart === 'part-2-pearl-harbor'` 且 `questionMeetsCoverage()`（answer ≥160 汉字、≥2 个实体、≥1 来源、≥1 claim，且所引 ID 都存在）判定该部分已满足；`--stage pearl` 的真实输出见 §7。

---

## 6. 失败检索与环境限制（如实记录）

以下限制来自本任务环境与此前已记录的环境状况；本任务没有改用其它域名绕过，也没有把无法读取的页面写成事实：

- 美国海军历史与遗产司令部 `history.navy.mil`：此前多次 DNS 解析失败（`EAI_AGAIN`），本任务未重试成功。
- 美国陆军军事历史中心 `history.army.mil`：此前 DNS 解析失败。
- 澳大利亚国家档案馆 `naa.gov.au`、英国帝国战争博物馆 `iwm.org.uk`、`ww2db.com`、美国海军学会 `usni.org`：此前返回 403。
- ONI《USN Combat Narratives》的 Pearl Harbor 专卷索引 `https://www.ibiblio.org/hyperwar/USN/USN-CN/index.html`：Module Lead 在本任务环境实测 **HTTP 404**，因此本任务没有假设存在该专卷，也没有引用它。
- 本任务新增的博物馆文章属二手分析，用于指挥关系与战术预警，不用于精确伤亡总数或逐分钟舰位。

---

## 7. 记录检查的真实输出

```text
$ node scripts/validate-content.mjs --stage pearl
阶段：pearl（累积部分门禁）
实体：80；来源：29；claim：242；问题：5；素材：0
结果：PASS
说明：结构验证通过不等于可读性评审通过；可读性证据须见 tests/evidence/pedagogy.md。
退出码：0
```

补充检查（证明没有回归）：

```text
$ node scripts/validate-content.mjs --stage strategy   → 结果：PASS，退出码 0
$ node scripts/validate-content.mjs --check-contracts  → 结果：PASS（契约文件一致；这不代表 content/history.json 已交付），退出码 0
```

`--stage pearl` 的唯一警告是既有 `history.json` 顶层空 `media` 数组的迁移提示，不影响退出码（MEDIA-02 迁移后自然消失；本任务不创建 `content/media.json`，不改写媒体实体）。按工作单，本任务**未运行** `--stage full` 作为记录检查。

---

## 8. Yamamoto / Nagumo 审计记录

- **`person-yamamoto-isoroku`**：583 汉字 profile、3 个决策卡、4 个独立来源、9 条 claims（≥500/3/3/4，达标）。9 条 claims 的 locators 均指向真实存在的章节/页：USSBS `Introduction`、`Selection of Date and Time of Attack`、`The Attack Plans`（含 naval decision clause 小节）、`The Attack`，以及 JM 147 App.3 `pp. A3-i to A3-ii`、JM 97 `p. 4`。全库检索「不到一小时」为 **0 处**；警戒间隔在 part-1 导读与 part-1 问题中表述为「从报告到攻击开始也只有大约四十四分钟」，与 NPS 的 7:06 报告 → 7:50 攻击开始口径一致。未发现需要修改的缺陷，本任务未改写该档案。
- **`person-nagumo-chuichi`**：666 汉字 profile、3 个决策卡、4 个独立来源、9 条 claims（达标）。决策卡均写出至少两个真实选项、至少两个约束与信息条件（奇袭后撤收命令；返航整备 vs 立即出击；无可见损伤时的判断）。本任务只审计、未改写；其 Pearl Harbor 相关决策与 `battle-pearl-harbor` 的 `decisions`/`controversies` 小节一致。

---

## 9. 交付内容与本任务边界

- 新增 `battle-pearl-harbor`：14 个固定小节（每节 ≥160 汉字，实际 164–212 汉字），3 个地图阶段，4 位人物、4 个地点、8 个来源、37 条 claims（含 1 条 disputed：`claim-pearl-third-wave-assessment-disputed`）。
- 新增 `event-overview-part-2-pearl-harbor`：5 个精确标题小节（每节 ≥100 汉字，实际 164–221；合计 929 汉字），≥4 来源、≥5 claims、≥2 placeIds。
- 新增 `event-us-declares-war-1941`：2 节、311 汉字、来源与 claims 齐全。
- 新增 `question-why-pearl-tactical-strategic`（part-2，见 §5）。
- 新增地点 `place-oahu`、`place-ford-island`、`place-north-pacific-launch`；新增人物 `person-kimmel-husband`、`person-short-walter`；新增来源 `source-nww2m-pearl-missed-warnings`；新增 14 条 claims。
- **未**修改契约、验证器、`src`、`tests`、`public`、媒体；**未**创建 `content/media.json`；**未**改写第 1、3 部分既有问题与既有正文；**未** commit/merge/push。

---

## 10. 已知限制

1. 美方人员总伤亡与舰艇损伤存在不同统计口径；本教材把 USSBS 的**当时估计**（基于飞行员报告与照片）与 NPS 的**单舰可核实数字**（亚利桑那号 1,177 名舰员、900 余人死亡）分开呈现，没有合并成一个看似精确的总数。
2. 南云撤收评价、预警体系责任归属属历史争议，已在 `controversies` 与 disputed claim 中并列说明，不静默选边。
3. 地图阶段的舰位与航线全部为教学示意；真实航迹无法逐点重建，本教材不把示意数据包装成精确轨迹。
4. 博物馆文章为二手分析；USSBS 与日方专档均有「战后回忆/整理」的可靠性限制，已在来源 `reliabilityNote` 中说明。
5. 可读性与教学效果须由人工评审并记录 `tests/evidence/pedagogy.md`；该中央交付物尚不存在，本任务不声称内容已通过可读性评审。
6. 本任务不运行 `--stage full`；第 2 部分之外的剩余问题（第 4、5 部分）由 HIST-03、HIST-04 交付，问题集终稿计数核对归 QQUEST-01。
