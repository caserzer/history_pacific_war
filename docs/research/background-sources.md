# HIST-01 背景与早期扩张研究来源记录（attempt 7 有界修正）

状态：本文件记录 HIST-01（`--stage background`）内容撰写时**实际读取过**的来源、每条来源支撑的具体论断、检索失败的情况，以及材料自身的缺口。最初的外部访问均在 **2026-11-04** 由本任务发起；**attempt 6/7（2026-11-05）是有界修正**，没有发起新的内容来源访问。attempt 7 为核对「USAF Historical Study 109」的真实身份，另行查阅了 AFHRA 的编号研究索引（书目核对，不作为历史 claim 来源，见 §1.9 与 §4.2）。

本文件不是全站参考书目，也不声称任何历史判断已被中央核验。它只回答三件事：读了什么、读到哪一句、还有什么读不到。

## 0. 记录沿革

### 0.1 attempt 2 的修订（历史内容工作）

上一版被审查指出三处记录不实或不清，attempt 2 逐条更正：

1. **把复用来源写成了「本轮已核验」**。把 FRUS、JACAR、JM 97/147、USSBS 第 2 章、NARA、NPS 与本周新读的来源并列，容易被理解为全部重新读过。现分开：§1 是**本轮实际重新读取并引用**的来源；§2 是 **HIST-00 期间读过、本轮未重新打开**的来源（标注 `previously verified, NOT re-verified this attempt`）。
2. **把检索失败写进了正文**。曾把「某页面 404／无法解析域名」写成一条历史论断。那是检索状态，不是历史事实。现全部集中到 §3。
3. **定位约定的说明不准确**。现按实际操作写明，见 §8。

### 0.2 attempt 5 的内容修订（历史记录）与 attempt 6/7 的有界修正

attempt 5 不是纯记录任务，而是**实质内容修订**：它改动了 `content/history.json` 本身。这里先如实列出 attempt 5 的改动（历史记录），再在 §0.4/§0.5 列出 attempt 6/7 在其之上的有界修正，三者不混为一次：

1. **契约迁移（影响最大）**：契约任务 ARCH-02 已并入主线，旧的五键 `earlyCampaignAnalysis` 在门禁中被停用（`legacyAnalysis.enforcement=off`，`legacyDisabledBy=HIST-01`）。因此把 **8 个早期战役事件**全部迁移到新的十键 `analysisProfiles`：background / geography / participants / objectivesAndForces / constraints / course / options / resultsAndLosses / impact / uncertainty。每个键都满足 `minHanCharsPerKey`（80 汉字）与 `requiredElements` 标记，并各自带 `sourceIds` 与 `claimIds`。同时为每个事件声明了 `researchStatus` 字段。
2. **补上阶段归属要求的 `event-doolittle-raid-1942`（杜立特空袭）**，来源与取材见 §1.6。其契约归属由 ARCH-02 的 `stageOwnership.background.events` 与 `eventPartPolicy` 定义；attempt 6 **只保留并核对**该事件及其既有正文，不新增、不改写、不删除、不另建第二份。
3. **补齐 D1 的实质内容**：迁移过程中为每个战役真正写出了「可选方案与被排除它的约束」（`options`）与「不确定性」（`uncertainty`），而不是把旧五键原样搬家。
4. **达尔文机种争议改写**：把此前当作确定事实的「十八架重型轰炸机」改为开放分歧（详见 §4.2）；attempt 6 进一步把争议收束到实际读过的 ONI 与 USSBS。
5. **移除研究过程措辞**：正文、摘要与 claim 文本中此前出现的「本教材未取得……」一类收集过程叙述已改写为历史表述。attempt 6 清理了人物档案正文与部分 claim note；attempt 7 又发现并清理了 4 个战役正文「不确定与争议之处」中的取得过程/写作说明口吻，以及早期战役 claims 与 `analysisProfiles` 中的「可定位」式检索表述（见 §0.5 与 delta 报告 §3.3）。**本文件不再声称任何一轮已实现全库「0 命中」**；实际扫描模式与残余命中见 `docs/research/hist01-delta-report.md` §3.3。
6. **补充中国侵略与平民受难**：在第 1 部分导读的「日本扩张与资源依赖」一节内增写一段关于 1931 年侵占东北、1937 年全面侵华与南京暴行的叙述（相关材料缺口见 §4 第 5 条）。

attempt 5 **未**新增人物档案、未新增专题、未新增媒体、未创建任何战役条目（`battles` 仍为 0）。计数变化见 §6.1。

### 0.3 内容与站点构建的关系（合并后）

`content/history.json` 现在是**唯一一份经过验证的内容源**，同时被两条消费链路使用：

1. **内容验证器**：`node scripts/validate-content.mjs --stage strategy|background|full` 与 `--check-contracts` 检查结构、覆盖、引用完整性与最低深度。
2. **WEB-01 站点构建**：已合并的 React + Vite + TypeScript 站点直接读取同一份文件构建时间线、战役、人物、地图、专题、问题与来源入口。站点侧的数据契约（`src/data/index.ts` / `types.ts` / `TimelineView.tsx`）在已接受基线 8b0ca6a 上消费以下字段：`earlyCampaignAnalysis`、`historicalPart`、`placeIds`、`personIds`、`relatedPlaceIds`、`relatedPersonIds`、`phases`、`concepts`、`questions`。**注意（attempt 6 更正、attempt 7 复核）**：本任务内容已按已接受 ARCH-02 契约从旧五键 `earlyCampaignAnalysis` 迁移到十键 `analysisProfiles`。在**已接受集成基线 8b0ca6a** 上，站点代码只读取旧字段，因此不会渲染这批早期战役的分析块；当前工作树 HEAD 另含**尚未被本任务候选接受**的 MAP-00（它把渲染改为十键 `analysisProfiles`），本任务不依赖 MAP-00、也不把它作为验收依据。该消费者状态已登记在 `docs/research/hist01-delta-report.md` 的未解决项中。

attempt 5 同步时实测：`npm run typecheck` 退出码 0；`npm run build` 全部 94 项检查通过（含子路径资源、hash 路由、无 CDN、无外部瓦片、`lang="zh-CN"`、viewport、标题、产物大小）。**这说明站点能构建；它不说明站点已展示本次迁移后的分析块（见上一条注意），也不说明历史准确性、可读性或素材授权已经通过审查。**

内容同时供养叙述、阅读入口与地图导航，正是架构政策要求的「共享内容是叙述、地图与导航的单一来源」。任何一条历史内容只需要在一处修订，站点与验证器会同时看到。

### 0.4 attempt 6 的有界修正（历史记录）

attempt 6 不是重建，也不是新增内容，只在已接受基线上做有界根因修正：

1. **关岛分析块**：`analysisProfiles.uncertainty` 去掉「资料不足，无法确定的部分是……」式表述，改写为关于史料沉默、记录分布与开放问题的历史分析；正文「不确定与争议之处」与 `resultsAndLosses` 中相应的取得过程式措辞同步改写。
2. **达尔文 18 架类别争议**：删除对未取得、无可核实页码的审查意见所称「USAF Historical Study 109」的间接引用（原先写作「另一份战后航空研究」）；争议改由实际读过的 ONI p.36 / p.38 与 USSBS p.30 承载，并统一区分「全次空袭合计约 72 + 18 架」与「09:55 第一波 18 架」两个口径；第 3 部分导读与问题文本同步一致。
3. **研究过程措辞清理**：人物档案正文（5 位早期战役指挥官）与 7 条 claim note 中残留的「本教材未取得……」式措辞改写为史料状态表述；`sources[].reliabilityNote` 属来源可靠性元数据，保留原样。
4. **本文件记录更正**：§0.2/§0.3/§5/§7/§9 的记录偏差按 attempt 6 实测更正（含站点消费者仍读旧字段、`--stage background` 实际强制项、`reliabilityNote` 只存在于 `sources[]`）。
5. **新建** `docs/research/hist01-delta-report.md`（本任务提交绑定报告，逐项记录基线与门禁）。

attempt 6 **未**新增来源、未改契约/验证器/`src`/`public`、未创建 `content/media.json`、未 commit/merge/push。

### 0.5 attempt 7 的有界修正（本次提交）

attempt 7 仍是有界修正，不重建、不新增实体：

1. **正文去编辑口吻**：把 4 个早期战役「不确定与争议之处」小节（马来亚与新加坡、菲律宾与巴丹/科雷希多、荷属东印度、印度洋）改写为历史分析：写史料确认了什么、说法在哪里分歧、哪些仍无法确定，并保留来源归属；删除「本节取得的是……」「因此正文不给出」「材料上有……」「本节最需要坦白的是……」「凡属……都应以这种并列的形式呈现」等取得过程与写作说明。
2. **扩大清理范围**：同一轮清理了早期扩张事件正文、`analysisProfiles` 与相关 claims 文本中残留的「可定位/正文/本节/教材/读者/提醒读者」等检索-可定位与编辑口吻（详见 `docs/research/hist01-delta-report.md` §3.3，含实际扫描模式与残余命中清单）；`claim-guam-uncertainty`、`claim-philippines-uncertainty`、`claim-nei-uncertainty`、`claim-indian-ocean-uncertainty` 改写为基于史料的历史不确定性表述。
3. **达尔文编号核实**：核对 AFHRA 索引后确认「USAF Historical Study 109」实为《The Fourteenth Air Force to 1 October 1943》（中国战区），与达尔文无关；真正相关的是 No. 111《Army Air Action in the Philippines and Netherlands East Indies, 1941-1942》。HS-111 未能取得正文，因此**不引用、不给页码**；达尔文争议仍由已读的 ONI p.36/p.38 与 USSBS p.30 承载（见 §4.2）。
4. **本文件更正**：修正 §4.2 自相矛盾（一处称间接提及已删、另一处仍称正文以不点名说法概括）与对自身核验的夸大；更新 §0.3 站点消费者状态、§9 未解决项。

attempt 7 **未**新增来源、未改契约/验证器/`src`/`public`、未创建 `content/media.json`、未改写杜立特事件、未 commit/merge/push。

## 1. attempt 5 实际重新读取并引用的来源（attempt 6 重核）

| ID | 标题 | 作者/发布机构 | 年份 | URL | 访问状态 |
|---|---|---|---|---|---|
| `source-ussbs-pto-ch3` | *Campaigns of the Pacific War*, Chapter 3（含 Appendices 10–14） | United States Strategic Bombing Survey | 1946 | https://www.ibiblio.org/hyperwar/AAF/USSBS/PTO-Campaigns/USSBS-PTO-3.html | **READ**（本轮完整重读，含附录 12–14 全文） |
| `source-oni-java-sea-combat-narrative` | ONI Combat Narratives: The Java Sea Campaign | Office of Naval Intelligence, U.S. Navy | 1943 | https://www.ibiblio.org/hyperwar/USN/USN-CN-Java/index.html | **READ**（ch.3 pp.6–9、ch.5 pp.11–16、ch.11 pp.36–40） |
| `source-cmhq-hong-kong-1941` | Canadian Participation in the Defence of Hong Kong（Report No. 163） | Historical Section, Canadian Military Headquarters | 1946 | https://www.ibiblio.org/hyperwar/UN/Canada/CA/163-HongKong/index.html | **READ** |
| `source-usmc-defence-of-wake` | The Defense of Wake（Historical Monograph） | Lt. Col. R.D. Heinl, Jr., USMC / HQ USMC | 1947 | https://www.ibiblio.org/hyperwar/USMC/USMC-M-Wake.html | **READ**（ch.4 pp.40–59） |
| `source-awm-fall-singapore` | Remembering the fall of Singapore | Lachlan Grant（Senior Historian）/ Australian War Memorial | 2021 | https://www.awm.gov.au/articles/blog/fall-of-singapore | **READ** |
| `source-dmn-king-nimitz` | Admirals Ernest J. King and Chester W. Nimitz | Dwight Jon Zimmerman / Defense Media Network | 2012 | https://www.defensemedianetwork.com/stories/admirals-ernest-j-king-chester-w-nimitz/ | **READ**（本轮为撰写尼米兹档案重读） |

### 1.1 USSBS 第 3 章支撑的论断

**可用定位**：正文 p.26–31 的斜体小节标题，以及 Appendix 12（pp.43–46）、Appendix 13（pp.47–48）、Appendix 14（pp.49–51）。

- **日方作战顺序**：X 日先空袭菲律宾、登陆马来亚；马来亚登陆与空袭、以及对美国的第一击完成之后，才启动香港与关岛（`claim-japan-planned-landings-order`、`claim-guam-seizure-planned-after-pearl-harbor`）。
- **《中央协定》的占领范围与任务分工**：关岛/香港/马来亚/缅甸/爪哇/苏门答腊/婆罗洲/西里伯斯/帝汶（`claim-guam-in-japanese-occupation-scope`）；关岛由南海支队与第 4 舰队夺取、另派地面部队接替驻防（`claim-guam-joint-force-assignment`）；关岛集结地小笠原（`claim-guam-staging-ogasawara`）；「G」作战代号（`claim-guam-operation-designation`）；南海支队编成（`claim-guam-south-seas-detachment-scale`）。
- **Appendix 13 第 4 舰队任务**：防守南洋群岛、巡逻、维持海上交通、攻取威克岛、与陆军协作攻取关岛、再取俾斯麦（`claim-guam-fourth-fleet-mission`）。
- **Appendix 13 交通线任务**：「摧毁敌人在太平洋与印度洋的交通线」（pp.47、48 两处）（`claim-japan-cut-indian-ocean-communications`、`claim-indian-ocean-documented-purpose`）。
- **盟军战略困境**：守势待援、普遍低估日军、未就最高司令达成协议（`claim-allied-preplanned-strategy-defensive`、`claim-no-supreme-commander-pre-war`）。
- **ABDACOM 的失灵**：「从未超出纸面组织」、各国各自控制部队、护航挤占战斗舰艇（`claim-abdacom-paper-organization`）。
- **菲律宾**：远东航空队首日损失、日方因台湾大雾推迟至 10:15（`claim-philippine-air-power-destroyed`）；X+14 登陆仁牙因（`claim-philippine-planned-stage-bases`）。
- **马来亚**：第 22 航空战队依潜艇情报、仅损失 4 架飞机击沉「威尔士亲王」号与「反击」号（`claim-repulse-sinking-1941-12-10`）。
- **荷属东印度**：逐点前推战术、万鸦老与打拉根 1 月 11 日、巨港 2 月 14 日、巴厘巴板驱逐舰夜袭、爪哇海 2 月 27–28 日、3 月 1 日有组织抵抗结束（`claim-tarakan-menado-1942-01-11`、`claim-palembang-falls-1942-02-14`、`claim-balikpapan-destroyer-attack`、`claim-java-sea-battle-1942-02-27`、`claim-allied-java-resistance-end-1942-03-01`）。
- **达尔文**：2 月 19 日以「四艘航母的舰载机」空袭（`claim-darwin-carrier-identity-disputed` —— 与 ONI 的说法冲突，见 §4）；2 月 20 日伞兵夺取古邦（`claim-koepang-occupied-1942-02-20`）。
- **印度洋**：4 月 5 日科伦坡、4 月 9 日亭可马里、4 月 18 日返抵本土（`claim-colombo-strike-1942-04-05`、`claim-trincomalee-strike-1942-04-09`、`claim-colombo-trincomalee-strikes-1942-04`）；打击编队规模「四艘战列舰、六艘大型航空母舰」（`claim-indian-ocean-carrier-force-sizing`）；珍珠港至锡兰的合计损失口径（`claim-indian-ocean-strike-outcome-scope`）；整段期间该部队未损失一舰（`claim-kido-butai-unscathed-reach`）。

### 1.2 ONI 战史叙事《爪哇海战役》支撑的论断

**可用定位**（页面内真实存在的章节标题 + 印刷页号）：`Withdrawal from the Philippines` p.6；`Establishment in the Netherlands East Indies` p.11；`Japanese attack on Darwin, February 19` p.36。

- 甲米地船厂 12-10 被毁、日军掌握马尼拉上空（`claim-cavite-navy-yard-destroyed-1941-12-10`）。
- 吕宋三处登陆与仁牙因主登陆、潜艇只击沉 1 艘（`claim-philippine-landings-sequence`、`claim-lingayen-main-landing-1941-12-21`）。
- 麦克阿瑟撤往巴丹与科雷希多尔、马尼拉不设防、1 月 2 日日军入城（`claim-withdrawal-to-bataan-ordered-1941-12-23`、`claim-manila-open-city-japan-enters-1942-01-02`）。
- 哈特南撤与 12-26 乘「鲨鱼」号离开（`claim-hart-orders-south`）；ABDAFLOAT 指挥关系（`claim-hart-abdafloat-command`）。
- **哈特关于 ABDACOM 的引语**（四个陆军/四个海军/六个空军组织、「始终没有达到能确保信息与清晰指令被迅速传达的状态」、看不懂荷兰语航海图）（`claim-abdacom-hart-quote`）。
- 荷兰与英国的优先目标分歧（`claim-abdacom-national-priorities-split`）。
- 日军「先压机场、再送登陆船、再修机场」的循环（`claim-japanese-leapfrog-tactics`）；群岛内部交通线极少（`claim-nei-geography-favored-attacker`）；空中力量决定性、只有夜间才有成功的水面战（`claim-air-power-decisive-nei`）。
- 巴丹防守的价值与极限（`claim-bataan-holds-out-months`）。
- 科雷希多尔由麦克阿瑟统一指挥（`claim-macarthur-corregidor-unified-command`）。
- 达尔文空袭：09:55 的 18 架重型轰炸机、无预警、皮里号被命中五次、运输船损失、机枪扫射与医院被击中、当晚全城撤离（`claim-darwin-no-warning`、`claim-darwin-peary-loss`、`claim-darwin-ships-lost`、`claim-darwin-civilian-harm`、`claim-darwin-evacuation-ordered`）。

### 1.3 加拿大军方历史处 Report No. 163（香港）支撑的论断

**可用定位**：报告自带的章节标题 + 页号（`Canada's Decision to Send a Force to Hong Kong` p.4；`Hong Kong and its Defences` p.15；`The Plan of Defence` p.19；`The Outbreak of War` p.22；`Wpg Gren Operations--(5) The Final Defence Line (23-25 Dec 41)` p.51；`Canadians in Japanese Hands, 1941-45` p.60）。

- 香港「前哨」定位与约 14,000 人的守军、约三分之一为印度部队（`claim-hong-kong-outpost-policy`、`claim-hong-kong-garrison-14000`）。
- 无空中支援（最近英军机场在哥打巴鲁，1,500 英里）（`claim-hong-kong-no-air-support`）；20 门高炮中 4 门 3.7 英寸、无雷达（`claim-hong-kong-aa-no-radar`）。
- 情报误判：「日军只有约 5,000 人、装备差、不擅夜战」（`claim-hong-kong-intel-underestimated`）。
- 马尔特比自述的三条原因（`claim-hong-kong-maltby-factors`、`claim-maltby-command-and-decisions`）。
- 朝海防御的假设（`claim-hong-kong-seaward-assumption`）；醉酒湾防线未完工（`claim-gin-drinkers-line-incomplete`）；启德 07:45 被 45 架战斗机扫射（`claim-kai-tak-strafed-1941-12-08`）；12-25 投降（`claim-hong-kong-surrender-1941-12-25`）。

### 1.4 美国海军陆战队专著《威克岛防御》支撑的论断

**可用定位**：`Chapter 4, The Fall of Wake` 内的小节标题（`The Enemy Approach on Wake` p.41；`The Defense of Wake Island` pp.43–45；`The Fight on Wilkes` p.56；`The Surrender and After` pp.58–59；另有 p.43 脚注 9）。

- 12-11 首次登陆被击退（`claim-wake-first-landing-repulsed-1941-12-11`）。
- 12-22 梶冈编成（4 重巡、2 旧式轻巡、6 驱逐、1 水上机母舰、2 巡逻艇、3 中型运输船；苍龙/飞龙在北）（`claim-wake-second-attempt-1941-12-23`）。
- 登陆兵力约 1,000 突击 + 预备队约 1,500（`claim-wake-landing-force-size`）。
- 12-23 13:30 后不久投降（`claim-wake-falls-1941-12-23`）。
- 威尔克斯岛损失（日军 4 军官 90 兵；美方 9 陆战队员 2 平民阵亡、5 人负伤）（`claim-wake-wilkes-losses`）。
- 机动预备队 8 人 4 枪、中尉带 3 名平民操作 3 英寸炮（`claim-wake-hands-fighting`）。
- 日军接管医院后向病人开枪、伤员被电话线反绑（`claim-wake-treatment-of-wounded`）。
- 全程无有效补给、救援过迟（`claim-wake-supply-isolation`）。

### 1.5 澳大利亚战争纪念馆《Remembering the fall of Singapore》支撑的论断

**可用定位**：连续正文的段序（`Article body, paragraphs N`）。该页没有可用的分节小标题，故不使用章节定位。

- 1923 年起的「新加坡战略」与三个月派舰队（`claim-singapore-strategy-dependency`）。
- 英国最新装备投入欧洲（`claim-malaya-resources-diverted-europe`）。
- 12-08 登陆及其与国际日期变更线的关系（`claim-japan-lands-malaya-1941-12-08`）。
- 日军机动、制空、制海与迂回包抄（`claim-malaya-japanese-advantages`）。
- 1 月 31 日撤过新柔长堤（`claim-causeway-withdrawal-1942-01-31`）。
- 2 月 8/9 日夜间登陆、2 月 15 日水库失守与投降（`claim-singapore-battle-starts-1942-02-08`、`claim-singapore-surrender-1942-02-15`、`claim-percival-surrender-decision`）。
- 约 13 万战俘含第 8 师 15,000 人（`claim-singapore-pow-130000`）。
- **澳大利亚一方**伤亡 1,789 阵亡／1,306 负伤、岛上最后一周 880 余人死亡（`claim-australia-singapore-casualties`）。
- 七周内约 22,000 名澳大利亚人（含 71 名护士）被俘、三分之一未存活（`claim-australia-pow-mortality`）。

**统计口径**：该文的伤亡与战俘数字**只统计澳大利亚一方**。教材在 claim 的 `note` 与正文中均已声明，不得外推为全部盟军损失。

### 1.6 杜立特空袭（attempt 5 补入、attempt 6 只保留核对）的来源

| ID | 标题 | 作者/发布机构 | 年份 | URL | 访问状态 |
|---|---|---|---|---|---|
| `source-doolittle-after-action-report` | General Doolittle's Report on Japanese Raid（Halsey-Doolittle Raid, April 1942） | Col. James H. Doolittle；War Department, Headquarters of the Army Air Forces 印发 | 1942 | https://www.ibiblio.org/hyperwar/AAF/rep/Doolittle/Report.html | **READ**（全文） |
| 复用 | USSBS *Campaigns of the Pacific War* 第 3 章 | United States Strategic Bombing Survey | 1946 | 见 §1 | **READ**（attempt 5 重读） |

**为什么用一手报告而不是二手概述**：这份文件是杜立特本人呈交的战斗报告，由陆军航空队情报处印发（1942-07-09），是这次行动最直接的原始记录。内容支撑的 claim：

- 单程飞行的由来、航母降落困难、苏联符拉迪沃斯托克方案因交涉未果被放弃（`claim-doolittle-purpose-and-plan`）。
- 二十四架准备、十六架装舰；加装油箱至 1,141 加仑、拆除下炮塔与诺顿瞄准具、机尾木质假机枪（`claim-doolittle-aircraft-modification`）。
- 提前一天、提前近十小时起飞的原因：03:10 发现第一艘巡逻艇，天亮后又被第三艘发现并判断已发出无线电（`claim-doolittle-forced-early-launch`）。
- 起飞位置北纬 35°43′、东经 153°25′，东京以东约 824 英里（`claim-doolittle-launch-position`）。
- 08:20 至 09:19 的起飞序列（`claim-doolittle-takeoff-seq`）。
- 目标分配与五十英里正面展开、名古屋/大阪/神户小队（`claim-doolittle-targets-and-damage`）。
- 日本本土约五百架作战飞机、集中东京湾、飞行员缺乏经验（`claim-doolittle-japanese-home-defence`）。
- 中方未获通知、衢州无归航台与灯标、天气恶劣导致无法在预定机场降落（`claim-doolittle-china-landings`）。
- 各机去向：一架飞西伯利亚被苏方羁押、两架机组被日军俘获、一名机枪手跳伞后死亡（`claim-doolittle-crew-fates`）。

USSBS 第 3 章 p.31 提供**独立的日期印证**：日本航母打击部队于 1942 年 4 月 18 日、即「美军 B-25 空袭东京的当天」返回本土海域（`claim-doolittle-ussbs-carrier-return`）。

**attempt 5 尝试但未取得的杜立特相关来源**（属于检索状况，不是历史论断）：

| 目标 | URL | 结果 |
|---|---|---|
| National WWII Museum · Doolittle 专题页 | `nationalww2museum.org/war/articles/doolittle-raid` | **404** |
| U.S. Army 官方文章 | `army.mil/article/36934/from_shangri_la_to_tokyo_the_doolittle_raid_april_18_1942` | **DNS 解析失败**（`EAI_AGAIN`） |
| National Museum of the U.S. Air Force | `nationalmuseum.af.mil/Upcoming/Doolittle-Tokyo-Raid-75th-Anniversary/` | **403**（Akamai Access Denied） |
| *The Army Air Forces in WWII* Vol. I ch.6 / ch.12（HyperWar） | `ibiblio.org/hyperwar/AAF/I/AAF-I-6.html`、`AAF-I-12.html` | 返回 200 并读取，但**内容不涉及杜立特空袭**，故未用于本事件的实质叙述 |

因此杜立特事件的实质内容只依赖上表两份已读来源；没有用检索摘要或二手转述补写细节。

### 1.7 attempt 5 新增的地理节点

两处新地点，均为真实地理节点、`schematic: false`：

| place | 类型 | 精度 | 说明 |
|---|---|---|---|
| `place-hornet-carrier` | 海域节点（sea） | `coordinateAccuracyKm: 120` | 1942-04-18 起飞海域，位于东京以东约八百余英里。报告给出的是**当时的航位坐标**；本教材只把它标为约一百二十公里精度的海域节点，**不绘制精确航迹**（架构政策禁止编造精确航迹）。 |
| `place-chuchow` | 城市 | `coordinateAccuracyKm: 25` | 中国浙江衢州，多数机组跳伞或迫降后的主要着陆与集结区域。 |

`place-tokyo` 在 HIST-00 已建立，attempt 5 复用，未重复创建。

### 1.8 各事件的 researchStatus 取值

ARCH-02 规定：早期战役事件必须在事件级声明 `researchStatus`，枚举为 `not-started | sources-identified | sources-retrieved | cross-checked | final`；研究/检索过程状态**只能**写在这个字段里，正文、摘要与 claim 文本不得出现过程措辞。

attempt 5 交付的 9 个事件**全部取值为 `sources-retrieved`**（attempt 6 复核未改）。含义与理由：

- `sources-retrieved` = 已经实际取得并读取了支撑该事件的来源正文，据此建立了带定位的 claim；但尚未完成逐条交叉核对，也未经人工评审确认，因此不取 `cross-checked` 或 `final`。
- 为什么不取 `cross-checked`：多数战役存在只有单一来源支撑的关键数字（例如关岛只有计划层来源、印度洋两次打击没有逐次战果），达不到「每条论断都有两个以上来源互证」的程度。
- 为什么不取 `final`：`final` 需与人工评审结论一致，而 `tests/evidence/pedagogy.md` 尚不存在。

### 1.9 attempt 7 的文献编号核对（书目核对，不是历史 claim 来源）

attempt 7 为核对「USAF Historical Study 109」的真实身份，查阅了 AFHRA 的《Numbered USAF Historical Studies》编号索引（GPO 永久存档）：

- 索引 101–150：https://permanent.access.gpo.gov/websites/dodandmilitaryejournals/www.au.af.mil/au/afhra/wwwroot/numbered_studies/studies3.php.htm （HTTP 200，2026-11-05 读取）

核对结果：

| 编号 | 索引给出的标题 | 与达尔文的关系 |
|---|---|---|
| No. 109 | (U) The Fourteenth Air Force to 1 October 1943, by Herbert Weaver and Marvin A. Rapp (1945). 169 pages. | **无关**：中国战区第十四航空队研究 |
| No. 111 | (U) Army Air Action in the Philippines and Netherlands East Indies, 1941-1942, by Richard L. Watson, Jr. (1945). 300 pages. | **相关**：覆盖菲律宾与荷属东印度空中行动；未取得正文，未引用 |

该索引是**书目工具**，不是历史内容来源：它只用于核实编号与标题，不支撑任何日期、数字或因果 claim，因此不写入 `content/history.json` 的 `sources[]`。

## 2. HIST-00 期间读过、attempt 5 未重新打开、attempt 6 亦未重新打开的来源

以下来源在 HIST-00 中实际读取并建立了 claim 与定位，**本轮没有重新打开**。记录在此以免被误认为本轮复核过：`previously verified in HIST-00, NOT re-verified this attempt`。

| ID | 来源 | HIST-00 中的用途 |
|---|---|---|
| `source-frus-1941-v04-d602` / `-d603` / `-d266` | FRUS 1941 Vol. IV（美国国务院） | 石油依赖、禁运内部权衡、1941-08-17 警告 |
| `source-jacar-imperial-conference-1941` | JACAR C12120240100 | 1941-12-01 御前会议开战决定 |
| `source-jm-097` | Japanese Monograph No. 97 | 袭击珍珠港的命令序列；本轮**仅**引用其 p.2 关于印度洋准备位置的兵力配置 |
| `source-jm-147` / `-appx3` / `-appx4` | Japanese Monograph No. 147 | 1941 年政策节点、御前会议说明 |
| `source-ussbs-pto-ch2` | USSBS 第 2 章 | 珍珠港计划与执行 |
| `source-nara-infamy` / `-eo9066` | U.S. National Archives | 美国宣战程序、日裔拘禁 |
| `source-nps-opana-radar` / `-uss-arizona` | U.S. National Park Service | 珍珠港预警链条、亚利桑那号伤亡 |
| `source-nww2m-*`（四篇） | The National WWII Museum | 背景综述、中途岛、山本档案 |
| `source-oni-midway-combat-narrative` / `-coral-sea` | ONI 战史叙事（中途岛／珊瑚海） | 中途岛与珊瑚海的作战序列 |
| `source-wikipedia-nagumo` | Wikipedia（**低权重**，`sourceType: reference`） | 仅一条履历性 claim；不承担因果或评价 |
| `source-ussbs-pto-campaigns` | USSBS *Campaigns of the Pacific War* 总卷 | 计划逻辑 |

## 3. 检索失败记录（此前曾被误写成历史论断，现只记在此处）

下列失败属于**本环境或本任务的材料获取状况**，与历史事实无关，因此不出现在 `content/history.json` 的任何 claim 里，只记录于此：

| 目标 | URL | 实际结果 |
|---|---|---|
| 澳大利亚战争纪念馆 · 香港条目 | `awm.gov.au/articles/encyclopedia/hong_kong` | **404** |
| 澳大利亚战争纪念馆 · 印度洋条目 | `awm.gov.au/articles/encyclopedia/indian_ocean` | **404** |
| 美国国家公园管理局 · 关岛 | `nps.gov/wapa/learn/historyculture/guam.htm` | **404** |
| 美国海军历史与遗产司令部 | `history.navy.mil` | **DNS 解析失败**（`getaddrinfo EAI_AGAIN`） |
| 美国陆军军事历史中心 | `history.army.mil` | **DNS 解析失败** |
| 澳大利亚国家档案馆 | `naa.gov.au` | **403**（此前记录） |
| 英国帝国战争博物馆 | `iwm.org.uk` | **403**（此前记录） |
| ww2db | `ww2db.com` | **403**（Cloudflare） |
| 美国海军学会 | `usni.org` | **403** |
| HyperWar · UK Battle Summary No. 14（威尔士亲王号与反击号） | `ibiblio.org/hyperwar/UN/UK/RN/BS-14_POW+Repulse/index.html` | 返回 **200**，但页面内容**无法安全转换为可读文本**，故未使用 |
| 中文语种档案 | — | **未取得任何**中文学术或档案一手来源 |

**后果**：三场重点战役（珍珠港、珊瑚海、中途岛）的官方战斗叙事本轮仍未读到；关岛没有任何岛一级的战斗记录；印度洋两次打击没有逐次战果与伤亡数字。教材据此不编造页码、不虚构细节。

## 4. 已知的不确定性与材料缺口（与内容一一对应）

1. **关岛：有目标与顺序，无战斗细节。** 日方《中央协定》与《帝国海军作战方针》明确记载了谁去夺（南海支队 + 第 4 舰队）、谁去守（另派地面部队接替）、从哪里出发（小笠原）、在什么顺序上启动（马来亚登陆与珍珠港打击之后）、代号（「G」作战）。但**岛上守军兵力、登陆的具体时刻与地点、抵抗持续时间、双方伤亡**在日方文件译文与美方战后报告中都没有系统叙述，因此一律不写；attempt 6 已把这一界线改写为关于史料沉默与记录分布的历史表述，而不是「资料不足」式说明。`claim-guam-uncertainty` 与关岛正文「不确定与争议之处」记录这一史料边界。
2. **达尔文的投送平台身份存在来源冲突。** 规模（约 72 架水平轰炸机 + 18 架俯冲轰炸机）较可靠，但飞机来自哪里说法不一：USSBS p.30 称「四艘航母的舰载机」；ONI p.36 在同一段里既称 16 日攻击船队的飞机「据称是舰载机，但别处又被描述为重型轰炸机」，又就 19 日那 18 架写下「其体型表明它们是以航母或水上飞机母舰为基地」。教材以 `claimType: disputed` 的 `claim-darwin-carrier-identity-disputed` 并列两种说法，并在正文明确写出「两份美方官方来源说法并不一致」。
3. **印度洋：没有逐次战果。** USSBS 对两次打击的全部结语只有「都取得了成功」，没有沉船名单、吨位或伤亡。教材因此不列这两天的数字；报告另给出的「五艘战列舰／七艘驱逐舰」等是**珍珠港至锡兰的合计**，教材明确说不能分配给印度洋这两天。至于打击科伦坡与亭可马里的**战略意图**，两份文件都没写，教材把它列为开放问题而非解释。
4. **香港：双方总伤亡未列。** 该战役的伤亡数字位于报告附录 H，本轮未逐条提取，故不写数字。
5. **平民伤亡：新加坡、菲律宾、荷属东印度均未取得可定位的平民伤亡统计**，因此正文一律不引用平民死亡数字。已写成的内容限于可核实的结构性事实：新加坡岛上的战斗在居民密集的城市中进行、2 月 15 日失去的是全岛水库；马尼拉被宣布为不设防城市是出于平民考虑；巨港等产油地是当地生计与军事目标的同一处；印度洋的「打击交通线」直接承受者是商船与船员。
6. **南京大屠杀死亡人数存在实质分歧**，教材登记为 `disputed`（`claim-nanking-casualties-disputed`），并列主要口径而不取单一数字（该 claim 来自 HIST-00，本轮未重新核对）。
7. **日本专档（JM 97 / JM 147）是战后重建**，不是原件转录；JM 97 前言明言原始命令多已销毁、凭笔记与记忆重编。引用时一律写明「据日方战后整理的专档记载」。
8. **ONI 1943 年战史叙事是战时出版物**，前言自述「因资料仓促征集，个别细节可能不准确」；USSBS 编者注明内容源于战后访谈。两者适合说明计划逻辑与行动序列，不适合逐分钟时间线。
9. **USSBS「四艘战列舰、六艘大型航空母舰」是对整支支援部队的描述**，不等于对锡兰两天打击的出击兵力；**南海支队的编成表**同样覆盖关岛与俾斯麦两个方向，不等于关岛登陆兵力。这两处口径提示已分别写进对应 claim 的 `note` 与正文。

### 4.2 达尔文机种归属的来源分歧（attempt 5 改写、attempt 6 收束、attempt 7 编号核实）

此前版本把「十八架重型轰炸机」当作确定事实写入正文。这一表述掩盖了官方来源之间的分歧，attempt 5 已改为开放争议、attempt 6 进一步把争议收束到已读来源。可以确认的分歧形态：

| 来源 | 对该批十八架飞机的表述 | 是否直接读取（attempt 5 / attempt 6 / attempt 7 重核） |
|---|---|---|
| ONI 战史叙事《爪哇海战役》p.38 | 09:55 出现的编队是**第一波高空水平轰炸机**；同一段落又写这批飞机的「体型表明它们以航母或水上飞机母舰为基地」 | 是，已读 |
| ONI 同章 p.36 | 提到 2 月 16 日攻击船队的飞机「据称是舰载机，但别处又被描述为重型轰炸机」——**该来源自己就记录了描述不一致** | 是，已读 |
| USSBS 第 3 章 p.30 | 称这次空袭使用了**四艘航母的舰载机** | 是，已读 |

**处理方式（attempt 5 + attempt 6）**：`claim-darwin-carrier-identity-disputed` 保持 `claimType: disputed`，并列不同说法并注明各自出处（ONI p.38 / ONI p.36 / USSBS p.30）；`claim-darwin-no-warning` 收窄为可以确认的事实（首轮编队无预警到达），不再断言机种。正文、`course`、`uncertainty`、第 3 部分导读与第 3 部分问题均已同步改写；全库的「重型轰炸机」字样只出现在争议框架内（引用 ONI 原文或明确声明不作定论），不存在把「重型轰炸机」当定论的说法。attempt 6 另删除了对未读的第二手研究（审查意见所称「USAF Historical Study 109」）的间接引用，见下条。

**核对边界与编号更正（attempt 7，后续任务请勿重新引入）**：审查意见称「USAF Historical Study 109（1948）把这十八架归入俯冲轰炸机大队」。attempt 7 核对了 AFHRA《Numbered USAF Historical Studies》编号索引（GPO 永久存档，HTTP 200；见 §1.9）：**No. 109 是《(U) The Fourteenth Air Force to 1 October 1943》, by Herbert Weaver and Marvin A. Rapp (1945), 169 pages——一部中国战区第十四航空队研究，不是达尔文研究**。与该战区真正相关的是 **No. 111《(U) Army Air Action in the Philippines and Netherlands East Indies, 1941-1942》, by Richard L. Watson, Jr. (1945), 300 pages**（IRIS 00467695 / 467695.pdf）。因此审查意见中的「HS-109」是编号误指：若用它支撑达尔文机种，会构成对来源的误归属，违反内容政策「不得虚构来源/定位」。

对 HS-111 的取用尝试（attempt 7）：GPO 的 `467695.pdf` 经 `web_fetch` 返回 `unsupported content type "application/pdf"`；文本代理 `r.jina.ai` 返回空正文（无 OCR 文本）；Internet Archive 检索无该研究副本。**因此 HS-111 未能读取，不能引用、不能给页码。** 本任务**不**为「USAF Historical Study 109」或其他未读的 USAF 研究建立 claim、locator 或 `sources[]` 记录；达尔文争议只由实际读过的 ONI p.36/p.38 与 USSBS p.30 承载。

因此本教材确认的只有一件更有把握的事：**已读的两份官方来源对这批飞机的机种与平台存在实质分歧**——ONI p.38 称之为第一波高空水平轰炸机（同段又说其体型「表明以航母或水上飞机母舰为基地」），ONI p.36 自己记录了「别处又被描述为重型轰炸机」，USSBS p.30 则称使用四艘航母的舰载机。这是有据可查的分歧。

关于这份 USAF 研究：它在 attempt 6 之前曾以「另一份战后航空研究」的**不点名**说法出现在正文/claim 中；attempt 6 已删除该提及。attempt 7 复核 `content/history.json` 中不存在对它的任何指代，也没有为它建立 claim、引用页码或写入 `sources[]`：`109`、`HS-109`、`Historical Study`、`USAF`、「空军历史研究」均为 0 处（attempt 7 实际 grep 见 delta 报告 §4.5）。此前本文件一处写「已删除」、另一处仍写「正文以不点名说法概括」，是前后不一致的旧文本，attempt 7 已统一为本段表述。

**如果后续任务要引用 USAF 研究**：只能引用与达尔文/荷属东印度战场相关的 **HS-111**，且必须先取得其正文并建立带真实页码的 `source` 记录；**HS-109 与达尔文无关，不得引用**。审查意见中出现过的来源名称与编号，其本身不能当作已核实的依据。


## 5. 五位指挥官档案的取材说明

attempt 5 为四位在早期扩张战役中实际做决定的盟军指挥官与一位香港守军指挥官建立了决策型档案。**取材厚薄不同，本记录如实说明**：

| person | 档案汉字数 | 决策卡 | 独立来源 | 说明 |
|---|---:|---:|---:|---|
| `person-percival-arthur` | 496 | 3 | 2 | 未取得本人作战记述；事实来自 AWM 纪念文章与 USSBS |
| `person-wavell-archibald` | 512 | 3 | 2 | 未取得本人回忆录；判断来自 USSBS 与 ONI 对其指挥体系的记录 |
| `person-hart-thomas` | 401 | 3 | 2 | 其引语由美方官方战史转引，属二手转引 |
| `person-macarthur-douglas` | 433 | 3 | 2 | 未取得本人回忆录；事实来自 ONI 战斗叙事 |
| `person-maltby-christopher` | 519 | 3 | 2 | 呈报原文由加拿大军方历史处报告转引 |

五点共同说明：

- **全部只有 2 个独立来源，不是 3 个。** 本任务没有取得 NHHC／USNI 的官方传记或本人回忆录（见 §3），因此没有第三份可独立引用的来源。教材选择写短，也**不**把「未取得本人回忆录」这类取得过程写进档案正文（正文禁止研究过程措辞）；来源限制只记录在本文件 §5 与 `sources[].reliabilityNote` / `researchStatus` 中。
- 三份档案（Percival 496、Macarthur 433、Hart 401）**低于 500 汉字**的惯例长度，原因是可核实的决策情境只支持到这个程度。
- 这些实体不在 `coverage.json` 的重点文章清单内，因此验证器不对其强制 500 汉字深度；但教材仍按同一标准要求每一项事实有 claim 与定位。
- **这 10 个 person 记录都没有 `reliabilityNote` 字段，而且不存在这个字段**：`contracts/content.schema.json` 的 `person` 定义是 `additionalProperties: false`，其 `properties` 中没有 `reliabilityNote`（`sources[]` 定义才有该字段，当前 28 条来源均写有 `reliabilityNote`）。因此来源限制只能记录在本文件此处与来源元数据中，无法写成 person 级字段；档案正文不写取得过程措辞。上一版声称「每份档案的 reliabilityNote 都写明了来源限制」与「档案正文里明说未取得本人回忆录」都是**错误记录**，本版已更正。

## 6. 本阶段未交付的内容（明确声明）

### 6.1 attempt 7 提交前的实际内容状态

以下计数是 attempt 7 提交前的实测值（attempt 5 之后实体计数与 claims 结构未变）：

| 集合 | 数量 | 说明 |
|---|---:|---|
| events | 14 | 4 篇第 1 部分（战略背景）+ 1 篇第 3 部分导读 + 8 个早期扩张战役 + 1 个杜立特空袭 |
| **battles** | **0** | **三场重点战役均未创建**，详见 6.2 |
| places | 37 | 均为真实地理节点（`schematic: false`） |
| units / equipment | 2 / 3 | 联合舰队、机动部队；赤城号、九七式舰攻、欧帕纳雷达 |
| people | 10 | 5 位重点人物（HIST-00）+ 5 位早期扩张战役指挥官（HIST-01 前次提交） |
| concepts | 6 | 航母、舰载机、海军航空作战、雷达、密码分析、补给 |
| sources | 28 | 每条均有 URL 与访问日期 |
| claims | 228 | 分 fact / interpretation / disputed 三类，每条均有精确定位 |
| questions | 4 | 第 1 部分 2 个、第 3 部分 2 个 |
| **media** | **0** | **未登记任何素材**；`content/media.json` 未创建，详见 6.2 |

与 attempt 4 相比：events 13→14、places 35→37、sources 27→28、claims 217→228；people / concepts / questions 未变。

### 6.2 尚未交付的内容

- **三场重点战役的十四类分析尚未交付**：`battle-pearl-harbor`、`battle-coral-sea`、`battle-midway` 均**未被创建**（`battles` 为 0）。它们属于后续 HIST 任务。`battles` 数组为空，**没有建立任何占位战役、空壳实体或悬空引用**；站点在这三处不会有可渲染的战役页，这是真实状态，不是缺陷。
- **素材（media）尚未交付**：`media` 数组为空。登记素材、许可、署名与文件均属后续 MEDIA 任务；`content/media.json` 与素材注册由 **MEDIA-02 首次交付**（本任务不创建该文件）；`--media` 隐含 `--stage full`，本阶段必然失败。空 `media` 遗留数组只产生迁移警告，不影响 `--stage background` 退出码。
- **后续阶段的导读与问题**：part 2、part 4、part 5 的导读与五部分问题中的其余部分属于后续 HIST 任务。
- **本文件不声称站点或三场战役已完成**。合并后的站点能够构建并通过其自身检查，不等于教材内容已经完整交付。

## 7. 各门禁实际强制什么（准确表述）

此处刻意写准，因为上一版曾夸大本阶段的门禁深度：

| 命令 | 实际强制的检查 |
|---|---|
| `--stage strategy` | 第 1 部分导读、三个战略基础事件、第 1 部分问题；以及全部结构性检查（ID 唯一、引用无断链、来源定位精确、claim 类型合法等）。 |
| `--stage background` | 在 strategy 的全部检查之上，**只额外**要求：第 3 部分导读、`stageOwnership.background.events` 中的 9 个事件（含杜立特）、第 3 部分问题，以及契约对早期战役的十键 `analysisProfiles` 规则（键全、`minHanCharsPerKey=80`、必含要素、`options`/`uncertainty` 语义）与 `researchStatus` 规则。 |
| `--check-contracts` | 只检查契约文件之间的一致性（coverage / schema / requirements / 文档声明），**不读取** `content/history.json`。 |
| `--self-test` | 在内存构造的夹具上运行正负例（不读 `content/history.json`、不写系统临时目录），报告条数须等于 `docs/research/coverage.md` 的 SELFTEST_COUNT。 |

**需要明确指出的一点**：`--stage background` 并**没有**引入比 `--stage strategy` 更高的篇幅门槛。两个阶段对**同一批实体**检查的是同一组 `minimumDepth` 与结构规则——`--stage strategy` 在当前内容上同样 PASS，正是这一点的直接证据。本阶段新增的强制项只有「哪些实体必须存在」、契约的十键 `analysisProfiles` 结构/最小篇幅规则（`minHanCharsPerKey=80`，这是契约规则，不是额外的「深度门禁」）与 `researchStatus` 规则；它不是把 strategy 阶段的实体写得更长。文章深度与可读性最终只由契约规则与人工评审核对，门禁不评价文章质量。此外，`history.json` 顶层的空 `media` 数组只产生迁移警告，不影响任何阶段的退出码。

同样，这些门禁只证明结构、覆盖与引用完整性。它们**不能**证明文章对 11 岁读者可读、通顺、有吸引力，也不能证明「盟军为何连续失败」「日本补给压力何在」两节真的回答了问题而不只是达到了字数，更不能证明侵略、平民苦难与战争罪行的表述达到 rubric 要求的克制与准确。可读性必须由人工评审并记录在 `tests/evidence/pedagogy.md`；**该文件目前不存在，是后续中央交付物**。在它存在且经审阅之前，不得声称内容已达到可读性标准。

## 8. 定位约定（attempt 5 实际操作；attempt 6 沿用）

| locatorType | 实例 | 适用来源 | 说明 |
|---|---|---|---|
| `chapter-section` | `Introduction, p. 26` | USSBS 第 3 章 | 正文的斜体小节标题 + 印刷页号；附录用 `Appendix 12, p. 44` |
| `chapter-section` | `Withdrawal from the Philippines, pp. 6-7` | ONI 爪哇海战役 | 目录中真实存在的章标题 + 印刷页号 |
| `section-paragraph` | `Hong Kong and its Defences, paragraph 67 (p. 45)` | CMHQ Report 163 | **见下方说明** |
| `section-paragraph` | `Chapter 4, The Enemy Approach on Wake, p. 41` | USMC 威克岛专著 | 章号 + 小节标题 + 页号 |
| `section-paragraph` | `Article body, paragraphs 2-3` | AWM 新加坡 | 该页无分节小标题，故只有段序 |
| `page` | `p. 5 (footnote 4)` | Japanese Monograph 97 | 转录在每个印刷页开头保留 `[Page N]` 标记 |

**关于 CMHQ 的定位约定（此前说明不清，此处更正）**：加拿大军方历史处的报告在同一页内同时提供**章节标题**与**页号**，但正文段落本身没有逐段编号。因此本教材的处理是：`locatorType` 取 `section-paragraph`，`locator` 写成「章节标题 + 段序 + 印刷页号」三者的组合（例如 `The Plan of Defence, paragraph 70 (p. 49)`）。这里的「段序」指该章节标题之下可见正文自然段的大致次序，**不是原报告印刷的段号**——原报告并未提供段号。复查时应先按章节标题与页号定位，再在页内按段序找到相应内容。

## 9. 剩余已知限制（同步复核后仍然成立）

以下限制在 attempt 5 同步、attempt 6 修正与 attempt 7 修正中复核，均**未被解决**，后续任务不得把它们当作已完成：

1. **关岛只有计划层，没有岛级战斗细节**：守军兵力、登陆具体时刻与地点、抵抗持续时间、双方伤亡在日方文件译文与美方战后报告中均无系统记载，因此正文一律不写（正文以史料沉默的历史表述呈现，不用「资料不足」式说明）。有据可查的只有谁去夺、谁去守、从何出发、按何顺序、代号为何。
2. **达尔文的投送平台身份存在来源冲突**：USSBS 称「四艘航母的舰载机」，ONI 自身对同一批飞机既有「舰载机」又有「重型轰炸机」「航母或水上飞机母舰」的说法，登记为 `disputed`。
3. **新加坡、菲律宾、荷属东印度的平民伤亡数字未取得**，因此正文不引用任何平民死亡人数，只写可核实的结构性事实。
4. **南京大屠杀死亡人数登记为 `disputed`**，并列主要口径，不取单一数字。
5. **五位早期扩张战役指挥官档案均只有 2 个独立来源**（非 3 个）；其中 Percival 496、Macarthur 433、Hart 401 汉字，低于 500 汉字的惯例长度。未取得本人回忆录或官方传记，来源限制记录在本文件与来源元数据中，未把取得过程写进档案正文，也未用无法定位的材料凑数。
6. **NHHC（`history.navy.mil`）、CMH（`history.army.mil`）、USNI（`usni.org`）不可达**；`naa.gov.au`、`iwm.org.uk`、`ww2db.com` 返回 403。三场重点战役的官方战斗叙事仍未读到。
7. **未取得任何中文语种档案来源**；中国战场部分依据 FRUS 与博物馆综述。
8. **香港战役双方总伤亡未列**（报告附录 H 未逐条提取）。
9. **印度洋两次打击没有逐次战果**；报告仅记「都取得了成功」，合计数字不能分配给这两天；战略意图在现有材料中无法确认，已列为开放问题。
10. **审查意见所称「USAF Historical Study 109」是编号误指**：AFHRA 索引显示 No.109 是中国战区第十四航空队研究；真正相关的 No.111（Watson, 1945）未取得正文。本任务不引用、不建立 claim、不写页码；达尔文争议由已读的 ONI 与 USSBS 承载（见 §4.2、§1.9）。
11. **站点侧消费者状态**：在已接受集成基线 8b0ca6a 上，站点读取旧字段 `earlyCampaignAnalysis`，不渲染 `analysisProfiles`；当前工作树 HEAD 另含未接受的 MAP-00，把渲染改为十键 `analysisProfiles`。本任务不依赖 MAP-00，只登记状态（见 §0.3 与 delta 报告未解决项）。
12. **研究过程措辞的合法位置**：过程状态只允许写在 9 个事件的 `researchStatus` 与本文件；`sources[].reliabilityNote` 仍保留来源取舍的元数据说明（例如南云条目的低权重说明），它不属于正文/事件 summary/claim 文本。
13. **正文去编辑口吻的范围**：attempt 7 只清理了本任务承认范围（9 个早期扩张事件及其 claims）内的检索-可定位与编辑口吻；HIST-00 已接受内容（第 1 部分事件、人物、专题、问题**及其 claims**）中的教学性「教材/读者」等表述**未改写**（[职责边界] 禁止改写 HIST-00 已接受内容）。

## 10. 结构性验证 ≠ 可读性评审（重申）

`--stage strategy`、`--stage background`、`--check-contracts` 的 PASS，以及 `npm run typecheck`、`npm run build` 的成功，**都只能证明**结构、覆盖、引用完整性、最低篇幅与站点渲染契约。它们**都不能**证明：

- 文章对 11 岁读者真的可读、通顺、有吸引力；
- 「盟军为何连续失败」「日本补给压力何在」两节确实回答了问题，而不只是达到了字数；
- 侵略、平民苦难、战争罪行的表述达到 rubric 要求的克制与准确。

可读性必须由人工评审并记录在 `tests/evidence/pedagogy.md`；**该文件目前尚不存在，是后续中央交付物**。在它存在且经审阅之前，不得声称内容已达到可读性标准，也不得把本次提交视为内容验收通过。
