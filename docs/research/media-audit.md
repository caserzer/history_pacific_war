# MEDIA-02 素材审计与注册矩阵（media-audit）

> 本文件是 MEDIA-02「媒体属主：原创图解与统一媒体注册」的逐篇素材矩阵、档案查阅证据、许可核验与渲染路径约定。
> **矩阵由 `contracts/coverage.json` 的 `keyArticleIds` / `requiredMediaTypes` 生成，并由脚本对照 `content/media.json` 与
> `public/media/` 的真实文件逐项核对**（不是手抄）。本候选为 **19** 篇重点文章、**22** 个“文章 × 类型”槽位，
> 全部已登记且文件存在、非空。`node scripts/validate-content.mjs --media` 实测 **exit 0**（19/19 篇通过）。

## 1. 口径与数据来源

| 项 | 值 |
|---|---|
| 重点文章定义 | `contracts/coverage.json` → `keyArticleIds`（**19** 篇）；不是“仓库里存在的文章数” |
| 槽位定义 | `requiredMediaTypes`（**22** 个文章×类型对） |
| 注册表 | `content/media.json` = `{ "version": 1, "media": [ ... ] }`（ARCH-02 R4，schema `#/$defs/mediaRegistry`） |
| 注册条目数 | **22** 条（每篇每个所需类型各 1 条，无一条覆盖多篇的合并条目） |
| 素材根目录 | `public/media/`（唯一写入者：MEDIA-02） |
| 站点 base | `/history_pacific_war/`（来源：`vite.config.ts` 的 `BASE_PATH`） |
| 素材总字节 | **395696 B** = 386.4 KiB = 0.377 MiB（核心资产上限 3 MiB，达标） |
| 许可计数 | original-work **19**（全部原创 SVG） / public-domain **3**（三张二战美国官方照片） |
| 类型计数 | battle-map 3 / photograph 3 / map 5 / portrait 5 / diagram 6 |
| 只读输入 | `content/history.json`（HIST-04 已冻结；本任务不编辑） |

## 2. 逐篇 media matrix（19 行，对应 coverage.keyArticleIds）

| # | keyArticleId | kind | requiredMediaTypes | 已登记素材（id / path） | 状态 |
|---|---|---|---|---|---|
| 1 | `event-overview-part-1-why-war` | part-overview | `map` | `media-map-part1-why-war`<br>`public/media/map-part1-why-war.svg` | ✅ 已登记 |
| 2 | `event-overview-part-3-expansion` | part-overview | `map` | `media-map-part3-expansion`<br>`public/media/map-part3-expansion.svg` | ✅ 已登记 |
| 3 | `event-overview-part-2-pearl-harbor` | part-overview | `map` | `media-map-part2-pearl-harbor`<br>`public/media/map-part2-pearl-harbor.svg` | ✅ 已登记 |
| 4 | `battle-pearl-harbor` | battle | `battle-map`, `photograph` | `media-battle-map-pearl-harbor`<br>`public/media/pearl-harbor.svg`<br>`media-photo-pearl-harbor-california`<br>`public/media/pearl-harbor-photo.png` | ✅ 已登记 |
| 5 | `person-yamamoto-isoroku` | commander-profile | `portrait` | `media-portrait-yamamoto`<br>`public/media/portrait-yamamoto.svg` | ✅ 已登记 |
| 6 | `person-nagumo-chuichi` | commander-profile | `portrait` | `media-portrait-nagumo`<br>`public/media/portrait-nagumo.svg` | ✅ 已登记 |
| 7 | `concept-aircraft-carrier` | concept-article | `diagram` | `media-diagram-aircraft-carrier`<br>`public/media/diagram-aircraft-carrier.svg` | ✅ 已登记 |
| 8 | `concept-carrier-aircraft` | concept-article | `diagram` | `media-diagram-carrier-aircraft`<br>`public/media/diagram-carrier-aircraft.svg` | ✅ 已登记 |
| 9 | `concept-naval-aviation` | concept-article | `diagram` | `media-diagram-naval-aviation`<br>`public/media/diagram-naval-aviation.svg` | ✅ 已登记 |
| 10 | `event-overview-part-4-turning-point` | part-overview | `map` | `media-map-part4-turning-point`<br>`public/media/map-part4-turning-point.svg` | ✅ 已登记 |
| 11 | `battle-coral-sea` | battle | `battle-map`, `photograph` | `media-battle-map-coral-sea`<br>`public/media/coral-sea.svg`<br>`media-photo-coral-sea-near-miss`<br>`public/media/coral-sea-photo.jpg` | ✅ 已登记 |
| 12 | `person-fletcher-frank-jack` | commander-profile | `portrait` | `media-portrait-fletcher`<br>`public/media/portrait-fletcher.svg` | ✅ 已登记 |
| 13 | `concept-radar` | concept-article | `diagram` | `media-diagram-radar`<br>`public/media/diagram-radar.svg` | ✅ 已登记 |
| 14 | `concept-codebreaking` | concept-article | `diagram` | `media-diagram-codebreaking`<br>`public/media/diagram-codebreaking.svg` | ✅ 已登记 |
| 15 | `event-overview-part-5-midway` | part-overview | `map` | `media-map-part5-midway`<br>`public/media/map-part5-midway.svg` | ✅ 已登记 |
| 16 | `battle-midway` | battle | `battle-map`, `photograph` | `media-battle-map-midway`<br>`public/media/midway.svg`<br>`media-photo-midway-yorktown-hit`<br>`public/media/midway-photo.jpg` | ✅ 已登记 |
| 17 | `person-nimitz-chester` | commander-profile | `portrait` | `media-portrait-nimitz`<br>`public/media/portrait-nimitz.svg` | ✅ 已登记 |
| 18 | `person-spruance-raymond` | commander-profile | `portrait` | `media-portrait-spruance`<br>`public/media/portrait-spruance.svg` | ✅ 已登记 |
| 19 | `concept-logistics` | concept-article | `diagram` | `media-diagram-logistics`<br>`public/media/diagram-logistics.svg` | ✅ 已登记 |

## 3. 槽位清单（22 个文章×类型对，全部命中）

| # | articleId | required type | 配对素材 id | 文件 path | 构建后可访问路径 | 状态 |
|---|---|---|---|---|---|---|
| 1 | `event-overview-part-1-why-war` | `map` | `media-map-part1-why-war` | `public/media/map-part1-why-war.svg` | `/history_pacific_war/media/map-part1-why-war.svg` | ✅ |
| 2 | `event-overview-part-3-expansion` | `map` | `media-map-part3-expansion` | `public/media/map-part3-expansion.svg` | `/history_pacific_war/media/map-part3-expansion.svg` | ✅ |
| 3 | `event-overview-part-2-pearl-harbor` | `map` | `media-map-part2-pearl-harbor` | `public/media/map-part2-pearl-harbor.svg` | `/history_pacific_war/media/map-part2-pearl-harbor.svg` | ✅ |
| 4 | `battle-pearl-harbor` | `battle-map` | `media-battle-map-pearl-harbor` | `public/media/pearl-harbor.svg` | `/history_pacific_war/media/pearl-harbor.svg` | ✅ |
| 5 | `battle-pearl-harbor` | `photograph` | `media-photo-pearl-harbor-california` | `public/media/pearl-harbor-photo.png` | `/history_pacific_war/media/pearl-harbor-photo.png` | ✅ |
| 6 | `person-yamamoto-isoroku` | `portrait` | `media-portrait-yamamoto` | `public/media/portrait-yamamoto.svg` | `/history_pacific_war/media/portrait-yamamoto.svg` | ✅ |
| 7 | `person-nagumo-chuichi` | `portrait` | `media-portrait-nagumo` | `public/media/portrait-nagumo.svg` | `/history_pacific_war/media/portrait-nagumo.svg` | ✅ |
| 8 | `concept-aircraft-carrier` | `diagram` | `media-diagram-aircraft-carrier` | `public/media/diagram-aircraft-carrier.svg` | `/history_pacific_war/media/diagram-aircraft-carrier.svg` | ✅ |
| 9 | `concept-carrier-aircraft` | `diagram` | `media-diagram-carrier-aircraft` | `public/media/diagram-carrier-aircraft.svg` | `/history_pacific_war/media/diagram-carrier-aircraft.svg` | ✅ |
| 10 | `concept-naval-aviation` | `diagram` | `media-diagram-naval-aviation` | `public/media/diagram-naval-aviation.svg` | `/history_pacific_war/media/diagram-naval-aviation.svg` | ✅ |
| 11 | `event-overview-part-4-turning-point` | `map` | `media-map-part4-turning-point` | `public/media/map-part4-turning-point.svg` | `/history_pacific_war/media/map-part4-turning-point.svg` | ✅ |
| 12 | `battle-coral-sea` | `battle-map` | `media-battle-map-coral-sea` | `public/media/coral-sea.svg` | `/history_pacific_war/media/coral-sea.svg` | ✅ |
| 13 | `battle-coral-sea` | `photograph` | `media-photo-coral-sea-near-miss` | `public/media/coral-sea-photo.jpg` | `/history_pacific_war/media/coral-sea-photo.jpg` | ✅ |
| 14 | `person-fletcher-frank-jack` | `portrait` | `media-portrait-fletcher` | `public/media/portrait-fletcher.svg` | `/history_pacific_war/media/portrait-fletcher.svg` | ✅ |
| 15 | `concept-radar` | `diagram` | `media-diagram-radar` | `public/media/diagram-radar.svg` | `/history_pacific_war/media/diagram-radar.svg` | ✅ |
| 16 | `concept-codebreaking` | `diagram` | `media-diagram-codebreaking` | `public/media/diagram-codebreaking.svg` | `/history_pacific_war/media/diagram-codebreaking.svg` | ✅ |
| 17 | `event-overview-part-5-midway` | `map` | `media-map-part5-midway` | `public/media/map-part5-midway.svg` | `/history_pacific_war/media/map-part5-midway.svg` | ✅ |
| 18 | `battle-midway` | `battle-map` | `media-battle-map-midway` | `public/media/midway.svg` | `/history_pacific_war/media/midway.svg` | ✅ |
| 19 | `battle-midway` | `photograph` | `media-photo-midway-yorktown-hit` | `public/media/midway-photo.jpg` | `/history_pacific_war/media/midway-photo.jpg` | ✅ |
| 20 | `person-nimitz-chester` | `portrait` | `media-portrait-nimitz` | `public/media/portrait-nimitz.svg` | `/history_pacific_war/media/portrait-nimitz.svg` | ✅ |
| 21 | `person-spruance-raymond` | `portrait` | `media-portrait-spruance` | `public/media/portrait-spruance.svg` | `/history_pacific_war/media/portrait-spruance.svg` | ✅ |
| 22 | `concept-logistics` | `diagram` | `media-diagram-logistics` | `public/media/diagram-logistics.svg` | `/history_pacific_war/media/diagram-logistics.svg` | ✅ |

## 4. 实际查阅的公共领域 / 档案馆素材

### 4.1 采用的三张历史照片（许可核验表）

| 素材 id | 文件 | 发布/制作机构（author） | 精确来源页（sourcePage） | 页面所见目录号 / 题名（creditLine） | 许可 | 公有领域依据（rightsStatement） |
|---|---|---|---|---|---|---|
| `media-photo-midway-yorktown-hit` | `public/media/midway-photo.jpg` | U.S. Navy（美国海军） | https://www.ibiblio.org/hyperwar/USN/USN-CN-Midway/index.html | U.S. Navy photograph · ONI Combat Narrative, The Battle of Midway (1943), illustration facing p.11 · via HyperWar | public-domain | 美国联邦政府作品（U.S. Government work）：二战时期美国海军官方照片，作为 ONI《The Battle of Midway》(1943) 插图发表；美国政府作品在美国不受版权保护，属公有领域。 |
| `media-photo-coral-sea-near-miss` | `public/media/coral-sea-photo.jpg` | U.S. Navy（美国海军） | https://www.ibiblio.org/hyperwar/USN/USN-CN-Coral/index.html | U.S. Navy photograph · ONI Combat Narrative, The Battle of the Coral Sea (1943), illustration facing p.1 · via HyperWar | public-domain | 美国联邦政府作品（U.S. Government work）：作为 ONI《The Battle of the Coral Sea》(1943) 插图发表的美国海军官方照片；美国政府作品在美国不受版权保护，属公有领域。ONI 页面未印照片目录号。 |
| `media-photo-pearl-harbor-california` | `public/media/pearl-harbor-photo.png` | U.S. Navy（美国海军） | https://www.ibiblio.org/hyperwar/USMC/USMC-C-Pearl/index.html | U.S. Navy photograph · National Archives Photo 80-G-32463 · reproduced in USMC “Infamous Day: Marines at Pearl Harbor” (via HyperWar) | public-domain | 美国联邦政府作品（U.S. Government work）：美国海军官方照片，编号 National Archives Photo 80-G-32463；美国政府作品在美国不受版权保护，属公有领域。 |

核验说明（逐项）：

1. **珍珠港**：来源页为 USMC 纪念专著 *Infamous Day: Marines at Pearl Harbor*（美国政府出版物，转录于 HyperWar）。页面图注明确印有 **National Archives Photo 80-G-32463**，说明为美国海军官方照片：战列舰加利福尼亚号（BB-44）被鱼雷命中后向左舷倾斜，前景一名陆战队员抬头张望。美国联邦政府雇员在公务中拍摄/制作的作品不受版权保护（17 U.S.C. §105），故为 public-domain。采用原因：目录号可核验、图像内容与图注一致、与 battle-pearl-harbor 正文直接相关。
2. **珊瑚海**：来源页为 ONI《The Battle of the Coral Sea》(1943)（美国海军情报局，美国政府出版物，转录于 HyperWar）。插图题名 **“Near hit on Zuikaku class carrier”**（facing p.1）；**该页未印照片目录号**，这一点如实记录，不编造编号。公有领域依据为美国政府出版物中的官方海军照片。采用原因：题名与画面（航母与近失弹水柱）一致，且与珊瑚海航母交战正文相关。
3. **中途岛**：来源页为 ONI《The Battle of Midway》(1943)（美国政府出版物，HyperWar）。插图题名 **“Direct hit on the Yorktown by Japanese dive bombers”**（facing p.11）；**该页未印照片目录号**，如实记录。公有领域依据同上。采用原因：与 1942-06-04 约克城号遭日机攻击的正文直接相关。

**许可诚实性**：三张照片的 `author` 均写为制作机构（U.S. Navy / National Archives），不是本任务作者；`license` 只在能说明美国政府作品依据时使用 `public-domain`；两处“页面未印目录号”的限制已在上表和 `rightsStatement` 中明写，没有虚构图注或编号。

**关于珍珠港照片 `sourceId` 的专门说明（替代来源 + 局限，供审查核对）**：`content/history.json` 在本任务（MEDIA-02）中**冻结为只读**，其 `sources[]` **没有收录**实际发表该照片的 USMC 纪念专著 *Infamous Day: Marines at Pearl Harbor*（HyperWar 转录）。因此 `media-photo-pearl-harbor-california` 的 `sourceId` 采用**主题最接近的已接受历史来源** `source-ussbs-pto-ch2`（USSBS《Campaigns of the Pacific War》第 2 章 “The Japanese Attack on Pearl Harbor”）作为**内容依据**——这并不表示该照片由 USSBS 发表。照片的**实际出版信息**已写在该条目的 `creditLine` 与 `rightsStatement` 中（USMC 专著 + National Archives Photo 80-G-32463）。若要为该照片建立“发表来源 = sourceId”的精确链接，需要在 `content/history.json` 中新增一条 USMC “Infamous Day” 来源记录；**本任务不创建该记录**（history 已冻结，且 MEDIA-02 不编辑 history），该事项归属后续获准编辑 `content/history.json` 的内容/来源任务，而非 MEDIA-02。对照：珊瑚海与中途岛照片的 `sourceId` 分别指向其实际发表叙事（ONI 珊瑚海 / ONI 中途岛叙事），不存在这一替代问题。

### 4.2 查阅过但未采用的候选（拒绝记录）

| 候选 | 来源 / 题名 | 决定 | 原因 |
|---|---|---|---|
| ONI Midway `img/USN-CN-Midway-1.jpg` | “Japanese Mogami class cruiser after attack by our carrier-based planes June 6th” | 拒绝 | 属 6 月 6 日追击阶段的水面舰损失，与“航母决战”主线关联较弱；保留为后续可扩展素材。 |
| ONI Midway `img/USN-CN-Midway-7.jpg` / `-9.jpg` | “Destroyers standing by the Yorktown” / “Burning oil tanks on Midway” | 拒绝 | 分别偏重救援细节与岸上设施损失，作为航母决战的主配图不如 80-G 系列/约克城号受击图贴切。 |
| ONI Coral `img/USN-CN-Coral-2.jpg` | “Torpedo planes attacking the Shoho” | 拒绝 | 分辨率 640×220、画面主体偏小；改用同为官方照片的 “Near hit on Zuikaku class carrier”（640×346，舰体更清晰）。 |
| USMC Pearl `img/USMC-C-Pearl-6.gif` | “View from a Japanese plane taken around 0800 on 7 December 1941…” | 拒绝 | 页面图注清楚但**未印照片目录号**；为让许可核验尽量落到可核验的编号，优先采用 80-G-32463。 |
| USMC Pearl `img/USMC-C-Pearl-8.gif` | “Battleship Row, beneath a pall of smoke from the burning Arizona…” | 拒绝 | 图注提到画面右侧“Oklahoma 倾覆”，但本地分辨率下无法独立确认该细节；为避免 `alt` 写出超过图像可验证范围的内容，改用加利福尼亚号图。 |
| USMC Pearl `img/USMC-C-Pearl-14.gif` | “Close-up of the forward superstructure of Nevada… a few days after the attack” | 拒绝 | 为袭击后数日拍摄的损伤细节，不是 12 月 7 日当天，作为“当日”配图不够贴切。 |
| NPS / NARA / Wikimedia 页面 | 多个可能的公共领域照片页 | 拒绝（技术原因） | 本沙箱内 HTTPS TLS 握手失败（见 §4.3），无法取得文件；未用未经验证的镜像替代。 |

### 4.3 获取方式与完整性限制（如实披露）

- 三张照片均通过**纯 HTTP**（`http://www.ibiblio.org/...`）取得；本沙箱中 `https://` 请求 TLS 失败（`The SSL connection could not be established`），因此**传输环节的加密与完整性未被验证**。这是本任务的实际限制，不隐藏。
- 文件已 **vendored（复制）到 `public/media/`**，站点只引用本地相对路径；运行时无任何外部请求、无热链、无外部瓦片或付费服务。
- 图像内容由本任务通过 `read_image` 目视核对，并与来源页图注逐条对照；未做像素级或哈希级远程比对（远程副本不可再取）。因此 `alt`/`caption` 只描述在这些核对中能看到的内容，并保留 ONI 原题措辞。

## 5. 渲染路径约定

- 注册表 `path` 使用 `public/media/<file>` 形式（POSIX 正斜杠，无 `.`/`..` 段，无绝对路径）。
- Vite 以 `BASE_PATH = '/history_pacific_war/'` 为 base（`vite.config.ts`），`public/` 下文件原样复制到产物根；因此
  `public/media/<file>` 在站点的可访问路径为 **`/history_pacific_war/media/<file>`**（见 §3 最后一列）。
- 消费方（WEB-01 / MAP-01）应读取注册表 `path`，去掉开头的 `public/` 后与 base 拼接，**不得**把 `public/media/...` 当绝对 URL。
- 素材均为本地静态文件，离线可用；构建产物中的实际可达性由 **QA-01** 断言（本任务不替代 QA-01 的验收）。

## 6. 素材清单与注册唯一性（实测）

- `public/media/` 下文件数：**22**；注册条目数：**22**；**每个文件恰有一条注册**、路径大小写一致、无重复。
- 22 个槽位全部命中；`--media` 实测 `结果：PASS`、`素材门禁：通过；重点文章 19/19`、**exit 0**。

| 文件 | 字节 | 注册条目 / 类型 | 构建后可访问路径 |
|---|---:|---|---|
| `public/media/coral-sea-photo.jpg` | 31082 | `media-photo-coral-sea-near-miss` / `photograph` | `/history_pacific_war/media/coral-sea-photo.jpg` |
| `public/media/coral-sea.svg` | 11583 | `media-battle-map-coral-sea` / `battle-map` | `/history_pacific_war/media/coral-sea.svg` |
| `public/media/diagram-aircraft-carrier.svg` | 7671 | `media-diagram-aircraft-carrier` / `diagram` | `/history_pacific_war/media/diagram-aircraft-carrier.svg` |
| `public/media/diagram-carrier-aircraft.svg` | 7547 | `media-diagram-carrier-aircraft` / `diagram` | `/history_pacific_war/media/diagram-carrier-aircraft.svg` |
| `public/media/diagram-codebreaking.svg` | 7244 | `media-diagram-codebreaking` / `diagram` | `/history_pacific_war/media/diagram-codebreaking.svg` |
| `public/media/diagram-logistics.svg` | 7893 | `media-diagram-logistics` / `diagram` | `/history_pacific_war/media/diagram-logistics.svg` |
| `public/media/diagram-naval-aviation.svg` | 7367 | `media-diagram-naval-aviation` / `diagram` | `/history_pacific_war/media/diagram-naval-aviation.svg` |
| `public/media/diagram-radar.svg` | 6392 | `media-diagram-radar` / `diagram` | `/history_pacific_war/media/diagram-radar.svg` |
| `public/media/map-part1-why-war.svg` | 8008 | `media-map-part1-why-war` / `map` | `/history_pacific_war/media/map-part1-why-war.svg` |
| `public/media/map-part2-pearl-harbor.svg` | 6810 | `media-map-part2-pearl-harbor` / `map` | `/history_pacific_war/media/map-part2-pearl-harbor.svg` |
| `public/media/map-part3-expansion.svg` | 7848 | `media-map-part3-expansion` / `map` | `/history_pacific_war/media/map-part3-expansion.svg` |
| `public/media/map-part4-turning-point.svg` | 7800 | `media-map-part4-turning-point` / `map` | `/history_pacific_war/media/map-part4-turning-point.svg` |
| `public/media/map-part5-midway.svg` | 6677 | `media-map-part5-midway` / `map` | `/history_pacific_war/media/map-part5-midway.svg` |
| `public/media/midway-photo.jpg` | 109083 | `media-photo-midway-yorktown-hit` / `photograph` | `/history_pacific_war/media/midway-photo.jpg` |
| `public/media/midway.svg` | 14328 | `media-battle-map-midway` / `battle-map` | `/history_pacific_war/media/midway.svg` |
| `public/media/pearl-harbor-photo.png` | 115593 | `media-photo-pearl-harbor-california` / `photograph` | `/history_pacific_war/media/pearl-harbor-photo.png` |
| `public/media/pearl-harbor.svg` | 11580 | `media-battle-map-pearl-harbor` / `battle-map` | `/history_pacific_war/media/pearl-harbor.svg` |
| `public/media/portrait-fletcher.svg` | 4235 | `media-portrait-fletcher` / `portrait` | `/history_pacific_war/media/portrait-fletcher.svg` |
| `public/media/portrait-nagumo.svg` | 4233 | `media-portrait-nagumo` / `portrait` | `/history_pacific_war/media/portrait-nagumo.svg` |
| `public/media/portrait-nimitz.svg` | 4250 | `media-portrait-nimitz` / `portrait` | `/history_pacific_war/media/portrait-nimitz.svg` |
| `public/media/portrait-spruance.svg` | 4253 | `media-portrait-spruance` / `portrait` | `/history_pacific_war/media/portrait-spruance.svg` |
| `public/media/portrait-yamamoto.svg` | 4219 | `media-portrait-yamamoto` / `portrait` | `/history_pacific_war/media/portrait-yamamoto.svg` |

## 7. 原创图解说明（19 个 SVG）

- **作者与许可**：19 个 SVG 全部由本任务内容组用文本（SVG）编写，`author = DSH 太平洋战争教材内容组（原创）`、`license = original-work`、`licenseUrl = https://github.com/caserzer/history_pacific_war`、`creditLine = 原创示意图 · DSH 太平洋战争教材`。其中 `licenseUrl` 指向本项目仓库：项目暂无单独的许可证文件，因此以仓库地址作为原创作品的作者/归属与出处说明链接（不是第三方许可声明）。
- **技术**：自包含 SVG（内联样式与形状、无脚本、无 `<image>`、无外部 URL——唯一出现的 URL 是必需的 `http://www.w3.org/2000/svg` 命名空间）。
- **示意性**：每张图的 `alt`/`caption` 都写明“原创示意”，并说明舰位、航线、轮廓、比例或时间为教学示意，不是精确历史航迹或测绘。三张战役图（`pearl-harbor.svg` / `coral-sea.svg` / `midway.svg`）分别依据已接受的 battle-pearl-harbor（3 阶段）、battle-coral-sea（4 阶段）、battle-midway（5 阶段）的阶段时间/位置数据绘制；概念图依据对应 concept 正文与 claims。
- **数据依据（sourceId）**：每张原创图的 `sourceId` 指向已接受 `content/history.json` 中支撑其内容的文献来源（ONI 战史、USSBS 第 5 章、NPS 雷达页、NWW2M 专题等），不新增来源。
- **照片的 `sourceId` 约定**：珊瑚海与中途岛照片指向其**实际发表叙事**（`source-oni-coral-sea-combat-narrative` / `source-oni-midway-combat-narrative`）。珍珠港照片是唯一例外：实际发表专著不在已接受 `sources[]` 中，`sourceId` 改用主题最接近的已接受来源 `source-ussbs-pto-ch2`；其替代理由、实际出版信息所在字段，以及“需新增专属来源记录才能精确链接”的局限，见 §4.1 的专门说明；本任务不创建该来源记录（归属后续内容/来源任务）。
- **肖像说明**：5 张人物图为**原创符号化半身示意 + 身份铭牌**，不是历史照片、画像扫描或容貌复原；`alt`/`caption` 已明确写出。README 的素材类型契约把指挥官所需类型定为 `portrait`，本任务以“原创肖像说明”满足该槽位并在字段中如实标注，不冒充历史肖像。

## 8. 关于“不依赖外部下载”的解释（可审计记录）

工作单 [运行环境与命令约定] 写有：`SVG 用文本编辑创建，不依赖外部下载或付费服务`。本任务的解释与执行方式如下（记录在此，便于复核而非静默处理）：

1. 该句约束的是**制图方法与运行时依赖**：SVG 必须由文本编辑创作（本任务 19 个 SVG 全部为文本生成，无在线生成器/外部素材库）；站点不得在运行时依赖外部下载或付费服务。
2. 三张 `photograph` 槽位无法用原创图解诚实满足；本任务改为**取得并 vendor（复制入仓）真实、可核验的美国联邦政府公有领域照片**，运行时仍是本地静态文件，不产生任何外部依赖。这也符合项目 brief 的“优先使用可以合法复用的公共领域或开放许可素材”和“无法获取授权的图片可使用原创示意图替代”的授权素材优先顺序。
3. 若评审认为该解释不成立，本记录即决策的审计线索：可把三张照片替换为原创图解并重新评估 `photograph` 槽位语义，但不应把原创图标注为 `photograph` 来“通过”门禁。

## 9. 已知限制与后续任务

- 三张照片为纯 HTTP 获取（HTTPS TLS 在本沙箱失败），**传输完整性未验证**；两张 ONI 图片页未印照片目录号（已在上表明写）。
- 本任务只记录结构、许可与路径；**构建产物中的图片可达性**、axe 可访问性、响应式显示等由 **QA-01** 断言，本文件不作“站点已验证”的声称。
- 可读性/教学效果须人工评审并记录 `tests/evidence/pedagogy.md`；本任务不声称通过可读性评审。
- 本任务不编辑 `content/history.json`；其遗留空 `media` 字段的迁移说明见 `docs/research/media-contract-correction.md`。
- QQUEST-01（问题集终稿）、DOC-02（五位指挥官与六大专题深度收口）与本任务无依赖关系，本任务不代其交付。
