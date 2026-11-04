# HIST-00 战略背景研究来源记录

状态：本文件记录 HIST-00（`--stage strategy`）内容撰写时**实际读取过**的来源，以及每条来源支撑的具体事实与定位。所有访问均在 **2026-11-04** 由本任务发起。

本文件不是全站参考书目，也不是“历史结论已核实”的声明。它只回答三个问题：读了什么、读到哪一句、这句话能支持什么。未读取的页面一律标注为不可用，**不得据此引用页码、小节标题或引文**。

通用规则（与 `docs/research/sources.md` §4 一致）：

- 定位必须是可复查的最小单位：网页用**实际存在的小节标题 + 段序**，档案用**馆藏号/条目号**，书籍/报告用**页码**。
- 不使用搜索摘要作为证据；搜索结果只用于发现来源。
- 来源等级高不等于内容正确；每条日期、数字与判断仍需定位到具体位置。
- 本文件不登记任何未实测的小节标题或页码。

## 1. 来源登记表

访问状态定义：

| 状态 | 含义 |
|---|---|
| `READ` | 返回 200 且本次获得正文，可据其建立 claim 与 locator |
| `directory only` | 返回 200 但只是索引/检索入口，不能单独作为事实依据 |
| `DNS failed` | 本环境无法解析域名（与站点本身无关） |
| `403` | 拒绝访问/机器人防护，正文未获得 |
| `404` | 该 URL 不存在（可能是路径变更） |

### 1.1 一手文件与档案

| ID | 标题 | 作者/发布机构 | 年份 | URL | 状态 |
|---|---|---|---|---|---|
| `source-frus-1941-v04-d602` | *FRUS 1941, The Far East, Vol. IV*, Document 602（Hornbeck 备忘录，1941-01-11） | U.S. Department of State, Office of the Historian | 1956 | https://history.state.gov/historicaldocuments/frus1941v04/d602 | `READ` |
| `source-frus-1941-v04-d603` | 同上 Vol. IV, Document 603（Hamilton 备忘录，1941-01-13） | 同上 | 1956 | https://history.state.gov/historicaldocuments/frus1941v04/d603 | `READ` |
| `source-frus-1941-v04-d266` | 同上 Vol. IV, Document 266（Hull 致 Grew，1941-08-18） | 同上 | 1956 | https://history.state.gov/historicaldocuments/frus1941v04/d266 | `READ` |
| `source-jacar-imperial-conference-1941` | December 1, 1941 Outbreak of war against the U.S., Britain and the Netherlands，Ref. C12120240100 | Imperial Conference（creator）；JACAR / 日本国立公文书馆；藏于防卫研究所 | 1941 | https://www.jacar.archives.go.jp/das/meta-en/C12120240100 | `READ` |
| `source-jm-097` | Japanese Monograph No. 97, *Pearl Harbor Operations: General Outline of Orders and Plans* | Military History Section, HQ Army Forces Far East；Office of the Chief of Military History, Dept. of the Army 发行 | 1953 | https://www.ibiblio.org/pha/monos/097/index.html | `READ` |
| `source-jm-147` | Japanese Monograph No. 147, *Political Strategy Prior to the Outbreak of War (Part III)* | 同上 | 1953 | https://www.ibiblio.org/pha/monos/147/index.html | `READ` |
| `source-jm-147-appx3` | 同上，Appendix No. 3：海相军令部总长永野修身 1941-09-06 御前会议说明 | 同上 | 1953 | https://www.ibiblio.org/pha/monos/147/147app03.html | `READ` |
| `source-jm-147-appx4` | 同上，Appendix No. 4：参谋总长杉山元 1941-09-06 御前会议说明 | 同上 | 1953 | https://www.ibiblio.org/pha/monos/147/147app04.html | `READ` |
| `source-ussbs-pto-ch2` | *Campaigns of the Pacific War*, Chapter 2, “The Japanese Attack on Pearl Harbor, Planning and Execution” | United States Strategic Bombing Survey；HyperWar Foundation 转录（P. Clancey） | 1946 | https://www.ibiblio.org/hyperwar/AAF/USSBS/PTO-Campaigns/USSBS-PTO-2.html | `READ` |

### 1.2 官方历史、档案与博物馆

| ID | 标题 | 作者/发布机构 | 年份 | URL | 状态 |
|---|---|---|---|---|---|
| `source-nara-infamy` | 'A Date Which Will Live in Infamy': The First Typed Draft of Franklin D. Roosevelt's War Address | U.S. National Archives and Records Administration | 2019（页面标注 last reviewed 2019-12-12） | https://www.archives.gov/education/lessons/day-of-infamy | `READ` |
| `source-nara-eo9066` | Executive Order 9066: Resulting in Japanese-American Incarceration (1942) | U.S. National Archives and Records Administration | 2026（页面标注 last reviewed 2026-02-09） | https://www.archives.gov/milestone-documents/executive-order-9066 | `READ` |
| `source-nps-opana-radar` | Opana Mobile Radar Site | U.S. National Park Service, Pearl Harbor National Memorial | 2024（last updated 2024-09-25） | https://www.nps.gov/perl/learn/historyculture/opana-mobile-radar-site.htm | `READ` |
| `source-nps-uss-arizona` | USS Arizona | U.S. National Park Service, Pearl Harbor National Memorial | 2024（last updated 2024-08-28） | https://www.nps.gov/perl/learn/historyculture/uss-arizona.htm | `READ` |
| `source-nww2m-path-pearl-harbor` | The Path to Pearl Harbor | The National WWII Museum（New Orleans） | 2026 | https://www.nationalww2museum.org/war/articles/path-pearl-harbor | `READ` |
| `source-nww2m-pacific-strategy` | The Pacific Strategy, 1941-1944 | 同上 | 2026 | https://www.nationalww2museum.org/war/articles/pacific-strategy-1941-1944 | `READ` |
| `source-nww2m-battle-midway` | The Battle of Midway | 同上 | 2026 | https://www.nationalww2museum.org/war/articles/battle-midway | `READ` |
| `source-nww2m-operation-vengeance` | Operation Vengeance: The Killing of Isoroku Yamamoto（John Curatola, PhD） | 同上 | 2023 | https://www.nationalww2museum.org/war/articles/operation-vengeance-killing-isoroku-yamamoto | `READ` |

### 1.3 只读到目录/索引的页面

| 页面 | 状态 | 说明 |
|---|---|---|
| `https://history.state.gov/historicaldocuments/frus1941v04/comp3` | `directory only` | 制裁与资产冻结编章索引。确认了文档编号范围（599–726）与标题，但**不用于任何事实 claim**。 |
| `https://history.state.gov/historicaldocuments/frus1941v04/ch3` | `directory only` | 1941-06-22 至 08-21 编章索引，含各文档日期与标题摘要。仅用于确认该编章存在，**不用于事实 claim**。 |

## 2. 每条来源支撑什么

### 2.1 FRUS 1941 Vol. IV

- **`source-frus-1941-v04-d602`**（Hornbeck 备忘录，1941-01-11，`page-range: Document 602, pp. 777–779`）：美国国务院内部如何权衡对日石油出口限制；原文 “to the Japanese petroleum is an essential import”；日本当时储备估计 “nine months to a year”；对日限制当时只到 “87 octane” 航空汽油；日本仍在 “continuing in their effort to conquer China”；荷属东印度谈判中日本要求 3,150,000 吨/年 × 5 年，最终为 1,800,000 吨/年。**支撑**：资源依赖、禁运的内部逻辑、美国自身的两难。
- **`source-frus-1941-v04-d603`**（Hamilton 备忘录，1941-01-13，`page-range: Document 603, pp. 780–781`）：国务院远东司预判 “it would seem almost certain that the time will come when Japan will take the situation into its own hands by attempting to meet its needs through attack and seizure—presumably in the first instance on the Netherlands East Indies”；并警告压力可能 “touch off an explosion in southern Asiatic waters”。**支撑**：美国决策者当时已知“压力可能引发战争”，不是事后才发现。
- **`source-frus-1941-v04-d266`**（Hull 致 Grew，1941-08-18，`page-range: Document 266, p. 379`）：罗斯福 1941-08-17 接见日本大使时警告，若日本继续 “movement of conquest”，美国将被迫采取必要措施。**支撑**：1941 年 8 月的警告时间点与措辞层级。

### 2.2 日方档案与日方战后官方整理

- **`source-jacar-imperial-conference-1941`**（`archival-item: Reference Code C12120240100, item Contents`）：1941-12-01 御前会议议题与结论的日文原文，明确记载基于 11-05「帝国国策遂行要领」的对美交涉 “遂ニ成立スルニ至ラス”，帝国对米英兰开战。**支撑**：开战决定的日期与日方一手文本。**限制**：英文页面是目录与提要，`Contents` 为日文原文；正式引用须注明语种与翻译。
- **`source-jm-097`**（`page` 定位，可读到印刷第 1–31 页）：日本海军 1941 年 11–12 月的实际命令序列——Naval General Staff Navy Order No. 1（11-05）、Combined Fleet Operations Order No. 2（11-07，“Y Day 8 December”）、Navy Directive No. 5（11-21，谈判成功即召回部队）、Carrier Striking Task Force Operations Order No. 1 与 No. 3（11-23，署名南云忠一）、Navy Order No. 9（12-01）、Navy Order No. 12（12-02）。**支撑**：袭击计划如何被写成命令、计划中保留了哪些中止条件、日军对时机的计算方式。**限制**：该汇编自述“原始命令在战前多已销毁，由当事人凭笔记与记忆重建”，因此日期与措辞基本可信，逐字细节不应被当成原件转录。
- **`source-jm-147`**（`page` 定位，可读到印刷第 1–7、12–53 页附近）：日方对 1941 年决策过程的官方整理——1940-07 第二次近卫内阁「世界情势推移ニ伴フ时局处理要纲」、日荷属东印度石油交涉 1941-06-18 完全破裂、1941-07-02 御前会议「情势の推移に伴う帝国国策要纲」、1941-07-26 美英冻结日本资产与 08-01 航空汽油禁运、1941-09-06 御前会议「帝国国策遂行要纲」全文及其“最小要求/可接受限度”、1941-09-24 军方要求以 10-15 为交涉期限、1941-11-27 联络会议对美方 11-26 提案的结论、1941-12-01 御前会议开战决定、以及近卫与东条内阁更替的过程。**支撑**：日方决策链的时间、文本与其**自述理由**。**使用限制（重要）**：该文屡次以 “self-existence and self-defense”（自卫自存）表述日本的战争理由，这是**日方决策者的自我叙述，不是史学研究认可的正当理由**。教材只能把它呈现为“当时日本领导人这样解释自己的行为”，并同时呈现侵略事实。
- **`source-jm-147-appx3`**（永野修身 1941-09-06 御前会议说明，全文可读）：海军军令部总长在会上明说石油与重要物资储备 “being depleted day by day”；美国军备扩充 “at a fantastic tempo”，到次年下半年日本将难以对抗；且 **“Our Empire has not means by which to subjugate the enemy by invasion operations or to break his will to fight”**、**“even when the Empire gains a victory in this decisive battle, such a victory alone would not end the war”**、**“a long war is what we least desire because of the meagerness of our domestic resources”**，同时又说 “We must avoid any war which can be avoided.” **支撑**：日本海军最高层在开战前就公开认知到长期战争风险——这是“当时可见信息”的最强证据，可用于避免事后诸葛亮。
- **`source-jm-147-appx4`**（杉山元 1941-09-06 御前会议说明，全文可读）：“if we should play into the hands of the United States and Great Britain by being driven into the prolonging of diplomatic negotiations … the potentiality of the Empire's national defense strength would gradually decrease while … the armament of the United States, and Britain would gradually increase”。**支撑**：军令系统对“时间对日本不利”的判断，解释了为什么 1941 年秋天被当作“窗口期”。
- **`source-ussbs-pto-ch2`**（`chapter-section` 定位，可读到页面内 `--13--` 至 `--25--` 的印刷页标记）：以战后对日方军官（含源田实、富冈定俊、渡边安次等）访谈为基础，说明袭击目的（“To render impotent the United States Pacific Fleet in order to gain time”）、计划提出者为山本五十六、北方航线/中央/南方三条航线的取舍（“if either failed, the operation would have been impossible”）、日期选择（12-10 月相最宜但取 “Sunday attack”）、浅水鱼雷的技术问题、11-03 与 12-01 的决定节点、航渡中“被发现即返航”的规则、以及“美军航母不在港，机群遂集中于战列舰”的事实。**支撑**：计划逻辑、约束与中止条件。**限制**：来源为战后回忆，编者自述 “supplied from memory … may be subject to minor corrections”。

### 2.3 美国政府与官方纪念地

- **`source-nara-infamy`**（`section-paragraph: Background, paragraphs 1–4`）：罗斯福得知袭击经过、12-08 12:30 对国会两院联席会议演说、参议院全票、众议院仅 Jeanette Rankin 反对、当日 16:00 签署宣战；讲稿首句原为 “a date which will live in world history”。**支撑**：美国参战的时间与程序性事实。
- **`source-nara-eo9066`**：1942-02-19 行政命令 9066 的授权文本；约 122,000 人被强制迁移至 “assembly centers”；其中近 70,000 人为美国公民；政府未提出指控、亦无申诉渠道；1988 年 Public Law 100-383 正式道歉并作出部分赔偿。**支撑**：盟军一方的人权问题，用于体现“双方都有代价、侵略责任不被抵消”的写法。
- **`source-nps-opana-radar`**（`section-paragraph`，四个小节标题均实际读到）：7:02 首次发现（137 英里）、7:06 报告（113 英里）、7:15（92 英里/180 mph）、7:23、7:45/7:39 失去接触、7:50 惠勒机场受袭；值班军官 Tyler 处于 “second day of training as an observer”，把回波判断为从西海岸飞来的 B-17。**支撑**：预警链条（发现—识别—判断—传递）为何断裂。**限制**：这是官方纪念地对过程的概述，不等于完整的指挥与通信调查结论。
- **`source-nps-uss-arizona`**（`section-paragraph: The USS Arizona Memorial, paragraphs 1–2`）：亚利桑那号 1,177 名舰员中 “over 900” 长眠于此；纪念堂跨 184 英尺；1958 年批准、1961 年完工、1962 年落成；设计者 Alfred Preis。**支撑**：伤亡口径与纪念设施的史实。**限制**：只用于这一艘舰的数字，不外推为珍珠港全部伤亡。

### 2.4 国家二战博物馆（普及性综述，用于叙事与对照）

- **`source-nww2m-path-pearl-harbor`**（`section-paragraph`，已读到 “The Roots of the Conflict” / “The Impending Crisis” / “The Attack” 三个小节）：1931 年侵占满洲并扶植满洲国；史汀生主义只作原则性否认、缺乏实际后果；直到 1937 年全面战争后美国企业仍在供应钢铁与石油；1940-07 切断废钢、钢铁与航空燃料但石油继续流动；1941-07 日军进入南印支后，07-26 冻结日本在美资产并 “effectively cut off Japan's access to US oil”；11-26 六艘航母、414 架飞机出航，3,500 英里无无线电静默航行；日军未能摧毁修理厂与油库，且 “no American aircraft carriers were at Pearl Harbor that day”；华盛顿有解密电报警告但 “a communications delay prevented a warning from reaching Pearl Harbor in time”。**支撑**：因果链的通俗串联与若干具体数字。**限制**：博物馆综述，不替代官方战斗叙事；其中 “Tora! Tora! Tora!” 的细节属于长期被质疑的转述，本教材不作为事实使用。
- **`source-nww2m-pacific-strategy`**：日本“以决定性胜利迫使美国谈判”的目标表述；美军在战列舰受创后转向航母与潜艇两个“surviving assets”。**支撑**：战略目标的表述方式。
- **`source-nww2m-battle-midway`**（`section-paragraph: Breaking the Code` / `The Battle`）：美军 1942 年初开始破译日军通信、以“淡水”假情报确认 “AF” 即中途岛、Station Hypo 给出日期与战斗序列；双方损失对照。**支撑**：后续阶段的中途岛基础事实。**限制**：与本文件 §4 记录的伤亡口径冲突需并列说明。
- **`source-nww2m-operation-vengeance`**：山本五十六在 1904 年对马海战中负伤（失去两指）；长期在美国任职、清楚美国工业潜力，判断日本难以承受长期消耗战；当被告知日本只能支撑约 18 个月时回应 “It's the same as my own studies”；1943-04-18 于布干维尔上空被 P-38 击落身亡。**支撑**：山本人物档案中“如何判断日美差距”的核心段落。**限制**：博物馆文章转引 Agawa《The Reluctant Admiral》，不是一手文件；引语只能按二手转引标注。

## 3. 定位（locator）约定本轮实际使用的形态

| locatorType | 本轮实例 | 来源 |
|---|---|---|
| `page-range` | `Document 602, pp. 777–779` | FRUS |
| `section-paragraph` | `Background, paragraphs 1–2` | NARA、NPS、National WWII Museum |
| `archival-item` | `Reference Code C12120240100, item Contents` | JACAR |
| `chapter-section` | `Selection of Track`（USSBS 各斜体小节标题） | USSBS |
| `page` | `p. 7`（日文专档印刷页号，页面内以 `[Page 7]` 标记） | Japanese Monographs 97 / 147 |

`page` 定位用于日本专档，是因为该转录在每个印刷页开头保留了 `[Page N]` 标记；这是本轮**实际看到**的页号，不是推测。若后续再版改变分页，需重新核对。

## 4. 研究缺口与使用限制（必须写进交付说明）

1. **NHHC（`www.history.navy.mil`）与 CMH（`history.army.mil`）在本环境 DNS 解析失败**（`getaddrinfo EAI_AGAIN`，本次以 `node:dns` 独立复核）。因此美国海军与美国陆军的官方战斗叙事、官方统计表与官方页码**本轮全部未读到**。任何“已据官方战斗叙事核实”的说法都不成立。
2. **`naa.gov.au` 与 `iwm.org.uk` 此前返回 403**（记录于 `docs/research/sources.md`），本轮未重新尝试；因此达尔文空袭与新加坡华人屠杀等议题的该两处馆藏正文仍不可用，**不得凭标题扩写细节**。
3. **`ww2db.com` 本轮返回 403**（Cloudflare 挑战页）。该站原本是最直接的尼米兹、南云、斯普鲁恩斯、弗莱彻人物条目来源。缺失后果：**本轮没有为这四人取得足以支撑重点人物档案深度的传记来源**。处理方式见 §5。
4. **未取得任何中文语种档案来源**。本轮唯一的东亚一手来源是 JACAR（日本国立公文书馆）。中国方面的官方史料（如抗战档案、纪念馆出版物）本轮未获得正文，这是侵华章节的**实质性缺口**：教材可以依据 FRUS（美国国务院同时代文件）与博物馆综述描述日本侵华的事实与规模，但缺少中方视角的一手文本。
5. **南京大屠杀死亡人数存在实质分歧**。本轮读到的 National WWII Museum 页面给的是 “between 100,000 and 200,000”；中文与部分学界研究常用的范围为 200,000–300,000 以上。教材必须将这一数字登记为 `disputed`，并列主要说法、注明各自口径，**不得取单一数字冒充定论**。
6. **中途岛美军伤亡数字在同一来源内部冲突**：`docs/research/sources.md` 记录的博物馆 `/war/topics/battle-of-midway` 页面给出 307 人；本轮读到的 `/war/articles/battle-midway` 页面给出 **362** 人。两个都是博物馆汇总口径。后续 `battle-midway` 必须注明采用哪一页、为何，并以 `disputed` claim 记录另一说法。
7. **日本专档（JM 97 / JM 147）是战后重建**，不是原件转录。JM 97 前言明言原始命令多已销毁、凭笔记与记忆重编。因此其日期与命令序列可用于叙事，但**不得当作逐字原文**；用词需写“据日方战后整理的专档记载”。
8. **USSBS 第 2 章是战后访谈**，编者自述 “supplied from memory”。适合说明计划逻辑与日方自我理解，不适合逐分钟的行动时间线。
9. **本教材没有可用的官方战斗叙事来核对分钟级时间**，所以任何“精确到分钟”的表述只能来自本轮实际读到的时间（如 NPS 的 07:02/07:06/07:45/07:50），其余一律不写分钟数。
10. **本文件不代表可读性评审**。11 岁适龄与证据呈现的人工评审证据属于 `tests/evidence/pedagogy.md`，由后续任务提交；在该文件存在前，不得声称内容“已达到可读性标准”。

## 5. 因来源不足而做出的取舍

- **只由实际读到的来源支撑的内容才写入 `content/history.json`。** 凡是无法定位到本轮读到的正文的判断，一律不写。
- **五位指挥官中，本轮只写入山本五十六一人。** 理由：只有山本在本次读到的来源中有足够的、带定位的实质材料（USSBS 的计划归属、JM 97 的命令署名链、National WWII Museum 关于其经历与判断的段落）。南云忠一在 JM 97 中只以“命令署名者”出现，尼米兹、斯普鲁恩斯、弗莱彻本轮**没有取得任何传记来源**。为凑字数而编写他们的生平将违反内容政策，故**本轮省略这四人的人物档案**，留待后续阶段在取得 NHHC/传记来源后再建。这意味着 `PEOPLE-DEPTH` 在本阶段**未完成**，且这是有意为之的诚实状态，而非遗漏。
- **六篇核心专题同样受此约束**：只有在能对三层结构（是什么—怎么运作—为什么影响决策）各给出有来源的实质解释时才建立。无法达到 `coverage.json` 名目要求的最低深度者不建立，避免留下“半成品重点文章”导致后续阶段验证失败。
- 上述取舍不影响 `--stage strategy` 的门禁：该阶段只要求 part 1 导读、三个战略基础事件与至少一个 part 1 实质问题。
