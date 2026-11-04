# 史料来源策略与来源登记（v2）

状态：**来源策略与 URL 核验记录已交付；`content/history.json` 尚未创建**。本文不声称任何文章、数字或图片已经完成，也不把“URL 可打开”当作“历史结论已核实”。

本文件服务于 HIST-00 至 HIST-04 的后续内容任务。后续文章必须把实际使用的来源登记进 `content/history.json.sources`，把判断写成 `claims`，并在 claim 中给出 `locators`。本文件只提供可核查的起点、证据规则和已实测的访问状态，不是已完成的全站参考书目。

## 1. 证据优先级

1. **同时代官方文件**：外交文件、作战报告、行动报告、会议记录、档案目录。用于日期、决定、命令与统计口径。
2. **官方军事历史与博物馆研究**：美国海军历史与遗产司令部（NHHC）、美国陆军军事历史中心（CMH）、美国国家档案馆（NARA）、美国国家公园管理局（NPS）、美国国务院历史文献办公室（FRUS）、澳大利亚战争纪念馆（AWM）、澳大利亚国家档案馆（NAA）、英国帝国战争博物馆（IWM）、日本防卫研究所（NIDS）、亚洲历史资料中心（JACAR）、美国国家二战博物馆。
3. **同行评审学术著作与学术出版社专著**：用于解释、争议与方法反思。
4. **可靠的普及性参考**：只能在有原始来源支撑时辅助叙事，不作为唯一依据。

不接受：无作者或机构的百科转述、影视剧情、论坛帖子、AI 生成的历史摘要、无日期的“历史趣闻”、精确到分钟但没有档案依据的航迹。

原则：来源等级高不等于内容自动正确。每一条日期、兵力、损失和判断仍要定位到具体页面、章节、表格或档案条目。

## 2. 本版复核结论（2026-11-04 实测）

本版对来源逐条重新发起 HTTP 请求，记录**实际结果**。访问状态只有两种被当作可用：`已读取`（返回 200 且获得正文）与 `目录已读取`（返回 200 但只是检索入口）。其余状态一律标为 `未读取`，后续文章不得据此声称“已据全文核实”。

| 状态 | 含义 |
|---|---|
| `已读取` | HTTP 200，且本次获得正文/说明文本，可据此建立 claim 与 locator |
| `目录已读取` | HTTP 200，但页面是索引/检索入口，需要再点进具体条目 |
| `DNS 失败` | 本环境无法解析域名（与站点本身无关），不能推断页面失效 |
| `拒绝访问` | 403/机器人防护，本次无法读取正文 |
| `未读取` | 本次未发起请求 |

## 3. 来源登记表

### 3.1 已读取（可直接建立 claim 与 locator）

| source ID | 来源 | URL | 类型 | 用途 | 本次状态与可用定位 |
|---|---|---|---|---|---|
| `source-frus-1941-v04` | U.S. Department of State, *Foreign Relations of the United States, Diplomatic Papers, 1941, The Far East, Vol. IV*, Document 602（Hornbeck 备忘录，1941-01-11） | https://history.state.gov/historicaldocuments/frus1941v04/d602 | primary-document | 日本石油依赖、美国出口限制的内部权衡、日本储备估计 | **已读取**。正文标注 `[Page 777]`–`[Page 779]`；原文 “to the Japanese petroleum is an essential import”；日本储备估计“nine months to a year”。可用 `page-range` 定位到 `pp. 777–779`。 |
| `source-nara-infamy` | U.S. National Archives, “'A Date Which Will Live in Infamy'” | https://www.archives.gov/education/lessons/day-of-infamy | archive | 1941-12-07 袭击、罗斯福演说稿修改、1941-12-08 对日宣战 | **已读取**。含 `Background` 小节：12-07 下午得知袭击、12-08 12:30 对国会演说、参议院一致通过、众议院仅 Jeanette Rankin 反对、16:00 签署宣战。可用 `section-paragraph` 定位到 `Background, paragraphs 1–2`。 |
| `source-jacar-imperial-conference-1941` | JACAR, “December 1, 1941 Outbreak of war against the U.S., Britain and the Netherlands”, Ref. C12120240100 | https://www.jacar.archives.go.jp/das/meta-en/C12120240100 | archive | 1941-12-01 御前会议开战决定；日方一手档案目录 | **已读取**。`Contents` 字段为日文原文：“対米英蘭開戦ノ件 昭和十六年十二月一日 御前会議議題 十一月五日決定ノ「帝国国策遂行要領」ニ基ク対米交渉ハ遂ニ成立スルニ至ラス 帝国ハ米英蘭ニ対シ開戦ス”。Creator=`Imperial Conference`；Date of Document Creation=`Showa16年12月1日～Showa16年12月1日`；Call Number=`中央-戦争指導重要国策文書-1118`。可用 `archival-item` 定位到 `Reference Code C12120240100, item Contents`。 |
| `source-nps-opana-radar` | U.S. National Park Service, Pearl Harbor National Memorial, “Opana Mobile Radar Site” | https://www.nps.gov/perl/learn/historyculture/opana-mobile-radar-site.htm | official-history | 珍珠港预警链条、雷达发现与误判的分钟序列 | **已读取**（最后更新 2024-09-25）。含小节 `Radar Operations on O‘ahu`、`Tracking the Japanese Planes`、`The Missed Warning at Opana Radar Site`、`The Opana Radar Plot`；时间序列 07:02 / 07:06 / 07:15 / 07:23 / 07:45 / 07:50；Tyler 为“second day of training as an observer”。⚠ 站点已把内容迁到 `/valr/` 前缀，旧 `/perl/` URL 仍可用但后续核对应以实际打开的小节标题为准。 |
| `source-nps-uss-arizona` | U.S. National Park Service, Pearl Harbor National Memorial, “USS Arizona” | https://www.nps.gov/perl/learn/historyculture/uss-arizona.htm | official-history | 亚利桑那号阵亡人数与纪念设施的史实 | **已读取**（最后更新 2024-08-28）。原文：纪念地是 “1,177 crewmen” 中 “over 900” 的安息处；纪念堂 184 英尺；1958 年艾森豪威尔批准、1962 年落成；设计者 Alfred Preis。可用 `section-paragraph` 定位到 `The USS Arizona Memorial, paragraphs 1–2`。 |
| `source-awm-fall-singapore` | Lachlan Grant, “Remembering the fall of Singapore”, Australian War Memorial | https://www.awm.gov.au/articles/blog/fall-of-singapore | museum | 马来亚—新加坡战役、1942-02-15 投降、战俘与平民苦难 | **已读取**（作者为 AWM 军事史部门 Senior Historian；最后更新 2021-03-30）。含：日军 1941-12-08 在马来亚登陆；1942-01-14 Gemenceh 伏击；1942-01-31 最后一批英帝国部队撤过堤道；1942-02-08/09 夜登陆新加坡；1942-02-15 Percival 接受无条件投降；澳军阵亡 1,789、伤 1,306；约 130,000 名英军成为战俘（含第 8 师 15,000 人）；被俘澳洲人三分之一未存活。引用必须保留其统计口径（仅澳大利亚）。 |
| `source-nww2m-midway` | The National WWII Museum, “Battle of Midway” | https://www.nationalww2museum.org/war/topics/battle-of-midway | museum | 中途岛经过、双方兵力与伤亡对照、“AF” 确认过程 | **已读取**。含 `Overview`、`Breaking the Code`、`Opening Strikes`、`The Battle`、`Importance of the US Victory at Midway`、`US Forces at Midway`、`US Casualties at Midway`、`Japanese Forces at Midway`、`Japanese Casualties at Midway` 等小节。给出美军 3 航母/8 巡洋舰/15 驱逐舰/约 360 架飞机、伤亡 307 人；日军 4 航母/2 战列舰/2 巡洋舰/12 驱逐舰/约 276 架飞机、伤亡 3,057 人。可用 `section-paragraph` 或 `table` 定位；这是博物馆汇总口径，与官方战斗叙事可能存在差异，须写成 `fact` 并注明口径。 |
| `source-nara-ww2-records` | U.S. National Archives, “World War II Records” | https://www.archives.gov/research/military/ww2 | 目录已读取 | NARA 二战馆藏索引：伤亡名单、海军指挥档案、照片、战时拘禁记录 | **目录已读取**（最后复核 2022-08-23）。适合作为“去哪里找档案”的入口，不能单独作为战斗数字的证据。页面列出 `Missing Air Crew Reports`、`World War II Honor List of Dead and Missing`、`State Summary of War Casualties`、`Internment Records`、`World War II, Photographs` 等。 |

### 3.2 未读取（保留 URL，但正文未核实；使用前必须补读）

这些官方来源对本项目仍然必要，尤其 NHHC 的战斗叙事与 CMH 的《菲律宾陷落》。本次环境无法取得正文，因此**不得据其虚构任何内容或页码**。

| source ID | 来源 | URL | 类型 | 计划用途 | 本次状态 |
|---|---|---|---|---|---|
| `source-nhhc-pearl-harbor` | Naval History and Heritage Command, “Pearl Harbor Attack” | https://www.history.navy.mil/browse-by-topic/wars-conflicts-and-operations/world-war-ii/1941/pearl-harbor.html | official-history | 珍珠港官方概览与图像入口 | **DNS 失败**（`getaddrinfo EAI_AGAIN www.history.navy.mil`）。 |
| `source-nhhc-coral-sea` | Naval History and Heritage Command, “Battle of the Coral Sea Combat Narrative” | https://www.history.navy.mil/research/library/online-reading-room/title-list-alphabetically/b/battle-of-the-coral-sea-combat-narrative.html | official-history | 珊瑚海战斗经过、双方损失与行动时间 | **DNS 失败**（同上）。 |
| `source-nhhc-midway` | Naval History and Heritage Command, “Battle of Midway: 3–6 June 1942 Combat Narrative” | https://www.history.navy.mil/research/library/online-reading-room/title-list-alphabetically/b/battle-of-midway-3-6-june-1942-combat-narrative.html | official-history | 中途岛战斗经过、搜索/侦察/攻击时间线 | **DNS 失败**（同上）。珊瑚海/中途岛数字需与 `source-nww2m-midway` 交叉核对并说明口径。 |
| `source-nhhc-java-sea` | Naval History and Heritage Command, “1942: February 27: Battle of the Java Sea” | https://www.history.navy.mil/content/history/museums/nmusn/explore/photography/wwii/wwii-pacific/us-entry-into-wwii-japanese-offensive/1942-January-15-abda-japanese-octopus/1942-february-27-battle-java-sea.html | official-history | 荷属东印度与爪哇海战斗背景 | **DNS 失败**（同上）。 |
| `source-nhhc-wake` | Naval History and Heritage Command, “Narrative of Captain W.S. Cunningham ... Wake Island ... December 1941” | https://www.history.navy.mil/research/library/online-reading-room/title-list-alphabetically/n/narrative-of-captain-ws-cunningham-us-navy-relative-to-events-o-wake-island-in-december-1941-and-subsequent-related-events.html | primary-document | 威克岛防御、投降与战俘经历的一手叙述 | **DNS 失败**（同上）。个人叙述须与官方战斗记录互证。 |
| `source-cmh-philippines` | U.S. Army Center of Military History, Louis Morton, *The Fall of the Philippines* | https://history.army.mil/Publications/Publications-Catalog/The-Fall-of-The-Philippines/ | official-history | 菲律宾、巴丹、科雷希多尔战役 | **DNS 失败**（`getaddrinfo EAI_AGAIN history.army.mil`）。引用时必须区分印刷页码与 PDF 页序。 |
| `source-naa-darwin` | National Archives of Australia, “The bombing of Darwin” fact sheet | https://www.naa.gov.au/help-your-research/fact-sheets/bombing-darwin | archive | 1942-02-19 达尔文空袭与澳大利亚本土战争经验 | **拒绝访问**（HTTP 403，站点防护）。 |
| `source-iwm-singapore-massacre` | Imperial War Museums, “The Singapore Chinese Massacre, 18 February to 4 March 1942” | https://www.iwm.org.uk/collections/item/object/1500110886 | museum | 新加坡沦陷后的平民苦难与战争罪行 | **拒绝访问**（HTTP 403，Cloudflare 挑战）。**不得凭标题扩写细节**；须改用可读取的档案或学术来源。 |
| `source-nids-pacific-war` | National Institute for Defense Studies (Japan), Digital Archives, Pacific War materials | https://www.nids.mod.go.jp/military_archives/digital_siryo/pacificwar80th/ | archive | 日本防卫研究所馆藏与日方视角资料入口 | **未读取**。条目多为日文，需要翻译与版本说明。 |
| `source-loc-imtfe` | International Military Tribunal for the Far East, Judgment（Library of Congress digitized copy） | https://tile.loc.gov/storage-services/service/ll/llmlp/Judgment-IMTFE-Vol-II-PartB-cont/Judgment-IMTFE-Vol-II-PartB-cont.pdf | primary-document | 侵略战争规划、战争罪行与责任判断 | **未读取**（PDF 类型本次未解析）。仅用于有明确章节定位的有限陈述，不用作战斗损失数字的唯一来源。 |
| `source-nhhc-doolittle` | Naval History and Heritage Command, “A Look at the Doolittle Raid” infographic (PDF) | https://www.history.navy.mil/content/dam/nhhc/news-and-events/multimedia%20gallery/Infographics/doolittle-raid-_19421591.pdf | official-history | 杜立特空袭的日期、兵力与政治影响概览 | **DNS 失败**。图表型来源，数字须回到文字报告或作战报告核对。 |

### 3.3 访问与使用限制（必须写进交付说明）

- NHHC 与 CMH 在本次环境 DNS 解析失败，NAA/IWM 返回 403。**不能把“官方 URL 存在”当作“内容已读完”**。三场重点战役的官方战斗叙事本次均未读到，因此任何分钟级时间、精确舰队位置与官方页码**目前都不具备可引用依据**。
- 已在本次读到的官方/博物馆来源（FRUS、NARA、NPS、AWM、JACAR、National WWII Museum）足以支撑 HIST-00/HIST-01 的背景与部分节点；珊瑚海与中途岛的细节仍需补读 NHHC/CMH 或使用可核查的学术专著。
- `source-nww2m-midway` 是博物馆汇总口径，与官方战斗叙事的舰艇/飞机损失统计可能不同（例如“受损/沉没”的定义）。文章必须在 `results` 中写明采用的口径，并把冲突写成 `disputed` claim。
- JACAR 的英文页面是**目录与内容提要**，不是完整英译。本次读到的 `Contents` 字段是日文原文；引用时必须注明语种、翻译者与版本。
- NPS 站点已把 `/perl/` 路径迁移到 `/valr/`；旧链接仍返回 200，但后续核对应以实际正文小节标题为准，不要凭记忆写页码。
- 不用网页搜索结果摘要作为证据。搜索结果只用于发现来源。

## 4. 定位（locator）标准

`claims[].locators[]` 支持以下类型；每一处日期、数字或判断至少对应一个精确定位。每个 `sourceId` 都必须有自己的 locator，且 locator 的 `sourceId` 必须出现在同一 claim 的 `sourceIds` 里。

| locatorType | 适用来源 | 合格示例（须与实际页面一致） | 不合格示例 |
|---|---|---|---|
| `page` | 书籍/报告单页 | `p. 214` | “书里” |
| `page-range` | 连续页码 | `Document 602, pp. 777–779`（FRUS 已实测存在这三个页码标记） | “第 3 章” |
| `chapter-section` | 书籍章节 | `Chapter 4, section "The Decisive Day"` | “第四章附近” |
| `section-paragraph` | 网页/网页 PDF | `Background, paragraphs 1–2`（NARA 已实测存在该小节） | “整个网页” |
| `table` | 统计表 | `Table 3, "Aircraft Losses"` | “表格” |
| `figure` | 图表/地图 | `Figure 7, track chart` | “地图上” |
| `archival-item` | 档案条目 | `Reference Code C12120240100, item Contents`（JACAR 已实测存在该字段） | “日本档案” |
| `timecode` | 音视频 | `00:12:40–00:13:15` | “纪录片中间” |
| `transcript-line` | 口述史转写 | `lines 120–135` | “访谈里” |

规则：

1. 先写“能复查的最小单位”（页码、段号、表号、档案号），再写解释。
2. 网页没有页码时，用**实际存在的小节标题 + 段序**；不得用“全文”“网页”作为定位。验证器会拒绝 `整个网页`、`全文`、`同上` 等泛定位。
3. PDF 必须区分印刷页码和 PDF 页序，在 `locator` 或 `note` 中说明。
4. 数字必须同时记录：口径、时间点/时段、来源；若来源间冲突，另写 `disputed` claim，不取平均值冒充确定数字。
5. 对“为什么这样决定”的解释，定位到支持该解释的史料段落；不能只引用事件发生日期。
6. **不得引用本文件未实测过的小节标题或页码**。补读后再写 locator。

## 5. 数字与争议的处理

- **日期**：同一事件采用一个明确时区/历法口径。跨国际日期变更线时写出“当地时间/日期”。例如 AWM 明确写出日军在马来亚登陆是 1941-12-08，而“另一侧国际日期变更线”的珍珠港是 12-07；这就是必须保留的口径说明。
- **兵力/损失**：优先使用官方战斗叙事或档案汇总，写清统计时点；舰艇“沉没/重创/受损”、飞机“被击毁/损失/无法修复”不可混用。博物馆汇总（如 `source-nww2m-midway` 的 3,057 人）与官方战斗叙事可能不同，必须注明。
- **人物判断**：把“他说过/他决定”与“历史学者认为他为何这样做”分开；禁止编造对话或内心独白。本次读到的 Tyler（“second day of training as an observer”）与 Preis 的引语都出自官方页面原文，可以引用，但不得改写或扩写。
- **争议**：`claimType: "disputed"` 至少给出两种解释及其证据，不把争议包装成确定事实。珊瑚海“胜负”、中途岛“转折点”评价、南云换弹决策都应由争议 claim 支持。
- **教学简化**：`claimType: "schematic"` 或 `certainty: "schematic"`，并在正文说明“这是为了理解而画出的示意”。示意图不能反向充当证据。

## 6. 双方视角与平民苦难

- 同时使用日方与盟方档案。本版实测可用的日方一手来源只有 `source-jacar-imperial-conference-1941`（开战决定）。日方来源并非天然更“客观”，盟方来源也非天然完整；关键是让读者看见双方的**信息、约束与选择**。
- 写侵略和战争罪行时明确责任主体（日本帝国政府/军部/具体部队），不把责任扩展为“所有日本人”。
- 写平民苦难与战俘经历时，使用非血腥、可核查的语言；不展示尸体特写，不把受害者的痛苦当作戏剧效果。参见 `docs/research/content-rubric.md`。
- 对新加坡华人屠杀、巴丹死亡行军、战俘虐待等议题：本次 IWM 页面 403，**不能在正文中凭空补写细节**。可用的替代起点是 AWM 关于战俘死亡率的口径（`source-awm-fall-singapore`：被俘澳洲人三分之一未存活），以及后续补读的官方档案。
- 对中国、朝鲜半岛、东南亚平民的苦难同样要纳入背景，不把叙事缩成“美日海军对决”。

## 7. 图像与许可策略

1. 优先使用美国政府作品（NARA、NHHC、NPS 等）中**逐件确认**为公共领域的素材。
2. AWM、IWM 等馆藏一般有逐件权利声明；不得把“可在线查看”当作“可自由转载”。必须记录作者、机构、许可/授权、署名和来源页。
3. 无法获得清晰授权的历史照片，改用原创示意图、地图或时间线图；原创图也必须有作者、许可与来源记录。
4. 每件素材在 `media` 中必须有：`author`、`license`、`rightsStatement`、`sourceId`、`creditLine`、`alt`、`caption`、`articleIds`。
5. 许可白名单见 schema：`public-domain`、`cc0-1.0`、`cc-by-4.0`、`cc-by-sa-4.0`、`original-work`、`permission-granted`。`permission-granted` 必须提供授权 URL。禁止 `all-rights-reserved` 等不可复用状态进入站点。
6. 图片路径必须位于 `public/media/` 下；`--media` 会检查实际文件存在且非空。
7. 本文件登记的 NPS 图片（如 George Elliott、Joseph Lockard 的官方照片）在页面中标注来源机构；具体是否属于公共领域，必须在 MEDIA-01 逐件确认，不能由本文件推定。

## 8. 研究缺口（不得用编造填补）

- 日本官方战史《戦史叢書》未完整数字化/英译，本项目只能使用可核查的 JACAR/NIDS 条目与学术转引。
- **NHHC 与 CMH 本次全部 DNS 失败**，三场战役的官方战斗叙事、官方页码与官方统计表都尚未读到。这是当前最大缺口。
- 中途岛与珊瑚海的分钟级时间、舰队精确位置、日军损失数字存在来源差异；地图阶段只能使用带不确定说明的示意位置/航线。
- 珍珠港未被摧毁设施、美国预警失败、南云决策等问题有大量争议性研究。文章应把“事实”“解释”“争议”分开，不把某一种解释写成定论。
- 本契约不判断历史真相；验证器只检查引用结构、定位精度与覆盖门槛。历史准确性和可读性仍需人工审查。

## 9. 后续内容任务的最低动作

1. 为每篇文章建立 source 记录与至少一个可复查 locator；**locator 必须对应本轮实际读到的页面内容**。
2. 为日期、兵力、损失、人物判断写 claim；数字/判断不得只存在于正文而没有 claim。
3. 在 `sections`/`article` 中链接 claim 与 source。
4. 对地图阶段写明 `knownEnemy`、`unknownEnemy`、`decision`、`consequence`、双方 viewpoint、`schematic` 与不确定性。
5. 媒体先登记再关联重点文章，最后由 `--media` 验证精确集合和真实文件。
6. 可读性评审另存于 `tests/evidence/pedagogy.md`；结构验证通过不能替代该证据。
7. 补读 NHHC/CMH/NAA/IWM 后，更新本表第 3.1/3.2 节的状态，并在 `content/history.json.sources[].accessedDate` 记录实际访问日期。

## 10. 契约层可执行检查（与来源相关的部分）

```bash
# 契约文件一致性与重点集合精确性（不需要 content/history.json）
node scripts/validate-content.mjs --check-contracts

# 验证器自测（含 locator 精度、数字 claim 定位、无效许可等负例）
node scripts/validate-content.mjs --self-test
```

契约只保证“有来源、有精确定位、有覆盖”。它**无法**判断某个 locator 指向的页面内容是否真的支持该 claim——那是内容与评审任务的责任。
