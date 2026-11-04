# HIST-01 背景与早期扩张研究来源记录（attempt 2 + 同步）

状态：本文件记录 HIST-01（`--stage background`）内容撰写时**实际读取过**的来源、每条来源支撑的具体论断、检索失败的情况，以及材料自身的缺口。所有访问均在 **2026-11-04** 由本任务发起。

本文件不是全站参考书目，也不声称任何历史判断已被中央核验。它只回答三件事：读了什么、读到哪一句、还有什么读不到。

## 0. 记录沿革

### 0.1 attempt 2 的修订（历史内容工作）

上一版被审查指出三处记录不实或不清，attempt 2 逐条更正：

1. **把复用来源写成了「本轮已核验」**。把 FRUS、JACAR、JM 97/147、USSBS 第 2 章、NARA、NPS 与本周新读的来源并列，容易被理解为全部重新读过。现分开：§1 是**本轮实际重新读取并引用**的来源；§2 是 **HIST-00 期间读过、本轮未重新打开**的来源（标注 `previously verified, NOT re-verified this attempt`）。
2. **把检索失败写进了正文**。曾把「某页面 404／无法解析域名」写成一条历史论断。那是检索状态，不是历史事实。现全部集中到 §3。
3. **定位约定的说明不准确**。现按实际操作写明，见 §8。

### 0.2 本次同步（attempt 4）做了什么、没做什么

本次是**同步（synchronization）任务**，不是内容重写。原因是模块基线与 `matrix/integration` 出现分歧后需要合并，`content/history.json` 与 `docs/research/background-sources.md` 曾是未提交的工作树改动。

- **没有改动任何历史内容**：本次未新增、删除或改写任何事件、人物、地点、单位、装备、专题、问题、来源或 claim 的正文与数量。实体与 claim 计数在本次前后一致（见 §6.1）。
- **没有修改** `src/`、`scripts/`、`contracts/`、`package.json`、`vite.config.ts`。
- **只做了一件事**：更新本文件的记录，使其与合并后的仓库状态一致（新增 §6.1 关于内容同时被站点构建消费的说明，并重申未交付范围）。

## 0.3 内容与站点构建的关系（合并后）

`content/history.json` 现在是**唯一一份经过验证的内容源**，同时被两条消费链路使用：

1. **内容验证器**：`node scripts/validate-content.mjs --stage strategy|background|full` 与 `--check-contracts` 检查结构、覆盖、引用完整性与最低深度。
2. **WEB-01 站点构建**：已合并的 React + Vite + TypeScript 站点直接读取同一份文件构建时间线、战役、人物、地图、专题、问题与来源入口。站点侧的数据契约（`src/data/index.ts`）消费以下字段：`earlyCampaignAnalysis`、`historicalPart`、`placeIds`、`personIds`、`relatedPlaceIds`、`relatedPersonIds`、`phases`、`concepts`、`questions`。

本次同步后实测：`npm run typecheck` 退出码 0；`npm run build` 全部 94 项检查通过（含子路径资源、hash 路由、无 CDN、无外部瓦片、`lang="zh-CN"`、viewport、标题、产物大小）。**这说明内容与站点的结构契约一致；它不说明历史准确性、可读性或素材授权已经通过审查。**

内容同时供养叙述、阅读入口与地图导航，正是架构政策要求的「共享内容是叙述、地图与导航的单一来源」。任何一条历史内容只需要在一处修订，站点与验证器会同时看到。

## 1. 本轮实际重新读取并引用的来源

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

## 2. HIST-00 期间读过、本轮未重新打开的来源

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

1. **关岛：有目标与顺序，无战斗细节。** 日方《中央协定》与《帝国海军作战方针》明确记载了谁去夺（南海支队 + 第 4 舰队）、谁去守（另派地面部队接替）、从哪里出发（小笠原）、在什么顺序上启动（马来亚登陆与珍珠港打击之后）、代号（「G」作战）。但**岛上守军兵力、登陆的具体时刻与地点、抵抗持续时间、双方伤亡，本教材一份可定位的战斗叙事都没有取得**，因此一律不写。`claim-guam-uncertainty` 把这一界线写成了内容的一部分。
2. **达尔文的投送平台身份存在来源冲突。** 规模（约 72 架水平轰炸机 + 18 架俯冲轰炸机）较可靠，但飞机来自哪里说法不一：USSBS p.30 称「四艘航母的舰载机」；ONI p.36 在同一段里既称 16 日攻击船队的飞机「据称是舰载机，但别处又被描述为重型轰炸机」，又就 19 日那 18 架写下「其体型表明它们是以航母或水上飞机母舰为基地」。教材以 `claimType: disputed` 的 `claim-darwin-carrier-identity-disputed` 并列两种说法，并在正文明确写出「两份美方官方来源说法并不一致」。
3. **印度洋：没有逐次战果。** USSBS 对两次打击的全部结语只有「都取得了成功」，没有沉船名单、吨位或伤亡。教材因此不列这两天的数字；报告另给出的「五艘战列舰／七艘驱逐舰」等是**珍珠港至锡兰的合计**，教材明确说不能分配给印度洋这两天。至于打击科伦坡与亭可马里的**战略意图**，两份文件都没写，教材把它列为开放问题而非解释。
4. **香港：双方总伤亡未列。** 该战役的伤亡数字位于报告附录 H，本轮未逐条提取，故不写数字。
5. **平民伤亡：新加坡、菲律宾、荷属东印度均未取得可定位的平民伤亡统计**，因此正文一律不引用平民死亡数字。已写成的内容限于可核实的结构性事实：新加坡岛上的战斗在居民密集的城市中进行、2 月 15 日失去的是全岛水库；马尼拉被宣布为不设防城市是出于平民考虑；巨港等产油地是当地生计与军事目标的同一处；印度洋的「打击交通线」直接承受者是商船与船员。
6. **南京大屠杀死亡人数存在实质分歧**，教材登记为 `disputed`（`claim-nanking-casualties-disputed`），并列主要口径而不取单一数字（该 claim 来自 HIST-00，本轮未重新核对）。
7. **日本专档（JM 97 / JM 147）是战后重建**，不是原件转录；JM 97 前言明言原始命令多已销毁、凭笔记与记忆重编。引用时一律写明「据日方战后整理的专档记载」。
8. **ONI 1943 年战史叙事是战时出版物**，前言自述「因资料仓促征集，个别细节可能不准确」；USSBS 编者注明内容源于战后访谈。两者适合说明计划逻辑与行动序列，不适合逐分钟时间线。
9. **USSBS「四艘战列舰、六艘大型航空母舰」是对整支支援部队的描述**，不等于对锡兰两天打击的出击兵力；**南海支队的编成表**同样覆盖关岛与俾斯麦两个方向，不等于关岛登陆兵力。这两处口径提示已分别写进对应 claim 的 `note` 与正文。

## 5. 五位指挥官档案的取材说明

本轮为四位在早期扩张战役中实际做决定的盟军指挥官与一位香港守军指挥官建立了决策型档案。**取材厚薄不同，本记录如实说明**：

| person | 档案汉字数 | 决策卡 | 独立来源 | 说明 |
|---|---:|---:|---:|---|
| `person-percival-arthur` | 496 | 3 | 2 | 未取得本人作战记述；事实来自 AWM 纪念文章与 USSBS |
| `person-wavell-archibald` | 512 | 3 | 2 | 未取得本人回忆录；判断来自 USSBS 与 ONI 对其指挥体系的记录 |
| `person-hart-thomas` | 401 | 3 | 2 | 其引语由美方官方战史转引，属二手转引 |
| `person-macarthur-douglas` | 433 | 3 | 2 | 未取得本人回忆录；事实来自 ONI 战斗叙事 |
| `person-maltby-christopher` | 519 | 3 | 2 | 呈报原文由加拿大军方历史处报告转引 |

五点共同说明：

- **全部只有 2 个独立来源，不是 3 个。** 本任务没有取得 NHHC／USNI 的官方传记或本人回忆录（见 §3），因此没有第三份可独立引用的来源。教材选择写短并在档案内明说「未取得本人回忆录」，而不是用无法定位的材料凑数。
- 三份档案（Percival 496、Macarthur 433、Hart 401）**低于 500 汉字**的惯例长度，原因是可核实的决策情境只支持到这个程度。
- 这些实体不在 `coverage.json` 的重点文章清单内，因此验证器不对其强制 500 汉字深度；但教材仍按同一标准要求每一项事实有 claim 与定位。
- 每份档案的 `reliabilityNote` 都写明了来源限制，供后续审查复核。

## 6. 本阶段未交付的内容（明确声明）

### 6.1 本次同步时的实际内容状态

以下计数是本次同步时对 `content/history.json` 的实测值，用于与后续任务的增量对比：

| 集合 | 数量 | 说明 |
|---|---:|---|
| events | 13 | 4 篇第 1 部分（战略背景）+ 1 篇第 3 部分导读 + 8 个早期扩张事件 |
| **battles** | **0** | **三场重点战役均未创建**，详见 6.2 |
| places | 35 | 均为真实地理节点（`schematic: false`） |
| units / equipment | 2 / 3 | 联合舰队、机动部队；赤城号、九七式舰攻、欧帕纳雷达 |
| people | 10 | 5 位重点人物（HIST-00）+ 5 位早期扩张战役指挥官（本次） |
| concepts | 6 | 航母、舰载机、海军航空作战、雷达、密码分析、补给 |
| sources | 27 | 每条均有 URL 与访问日期 |
| claims | 217 | 分 fact / interpretation / disputed 三类，每条均有精确定位 |
| questions | 4 | 第 1 部分 2 个、第 3 部分 2 个 |
| **media** | **0** | **未登记任何素材**，详见 6.2 |

### 6.2 尚未交付的内容

- **三场重点战役的十四类分析尚未交付**：`battle-pearl-harbor`、`battle-coral-sea`、`battle-midway` 均**未被创建**（`battles` 为 0）。它们属于后续 HIST 任务。`battles` 数组为空，**没有建立任何占位战役、空壳实体或悬空引用**；站点在这三处不会有可渲染的战役页，这是真实状态，不是缺陷。
- **素材（media）尚未交付**：`media` 数组为空。登记素材、许可、署名与文件均属后续 MEDIA 任务；`--media` 隐含 `--stage full`，本阶段必然失败。
- **后续阶段的导读与问题**：part 2、part 4、part 5 的导读与五部分问题中的其余部分属于后续 HIST 任务。
- **本文件不声称站点或三场战役已完成**。合并后的站点能够构建并通过其自身检查，不等于教材内容已经完整交付。

## 7. 结构性验证不等于可读性评审

`--stage background`、`--stage strategy` 与 `--check-contracts` 的 PASS 只证明结构、覆盖、引用完整性与最低篇幅。它**不能**证明：

- 文章对 11 岁读者真的可读、通顺、有吸引力；
- 文字确实回答了「盟军为何连续失败」「日本补给压力何在」，而不只是达到了字数；
- 术语分层、敏感内容（侵略、平民苦难、战争罪行）的表述达到 rubric 要求。

可读性必须由人工评审并记录在 `tests/evidence/pedagogy.md`；该文件是后续中央交付物。在它存在且经审阅之前，**不得声称内容已达到可读性标准**。

## 8. 定位约定（本轮实际操作）

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

以下限制在本次同步中复核，均**未被解决**，后续任务不得把它们当作已完成：

1. **关岛只有计划层，没有岛级战斗细节**：守军兵力、登陆具体时刻与地点、抵抗持续时间、双方伤亡均未取得，因此正文一律不写。有据可查的只有谁去夺、谁去守、从何出发、按何顺序、代号为何。
2. **达尔文的投送平台身份存在来源冲突**：USSBS 称「四艘航母的舰载机」，ONI 自身对同一批飞机既有「舰载机」又有「重型轰炸机」「航母或水上飞机母舰」的说法，登记为 `disputed`。
3. **新加坡、菲律宾、荷属东印度的平民伤亡数字未取得**，因此正文不引用任何平民死亡人数，只写可核实的结构性事实。
4. **南京大屠杀死亡人数登记为 `disputed`**，并列主要口径，不取单一数字。
5. **五位早期扩张战役指挥官档案均只有 2 个独立来源**（非 3 个）；其中 Percival 496、Macarthur 433、Hart 401 汉字，低于 500 汉字的惯例长度。未取得本人回忆录或官方传记，档案内已明说，未用无法定位的材料凑数。
6. **NHHC（`history.navy.mil`）、CMH（`history.army.mil`）、USNI（`usni.org`）不可达**；`naa.gov.au`、`iwm.org.uk`、`ww2db.com` 返回 403。三场重点战役的官方战斗叙事仍未读到。
7. **未取得任何中文语种档案来源**；中国战场部分依据 FRUS 与博物馆综述。
8. **香港战役双方总伤亡未列**（报告附录 H 未逐条提取）。
9. **印度洋两次打击没有逐次战果**；报告仅记「都取得了成功」，合计数字不能分配给这两天；战略意图在现有材料中无法确认，已列为开放问题。

## 10. 结构性验证 ≠ 可读性评审（重申）

`--stage strategy`、`--stage background`、`--check-contracts` 的 PASS，以及 `npm run typecheck`、`npm run build` 的成功，**都只能证明**结构、覆盖、引用完整性、最低篇幅与站点渲染契约。它们**都不能**证明：

- 文章对 11 岁读者真的可读、通顺、有吸引力；
- 「盟军为何连续失败」「日本补给压力何在」两节确实回答了问题，而不只是达到了字数；
- 侵略、平民苦难、战争罪行的表述达到 rubric 要求的克制与准确。

可读性必须由人工评审并记录在 `tests/evidence/pedagogy.md`；**该文件目前尚不存在，是后续中央交付物**。在它存在且经审阅之前，不得声称内容已达到可读性标准，也不得把本次同步视为内容验收通过。
