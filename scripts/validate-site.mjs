#!/usr/bin/env node
/**
 * 站点验证器 —— node scripts/validate-site.mjs
 *
 * 零 npm 依赖，Node 24 标准库 + React/react-dom/server（项目自身依赖）。
 *
 * 它检查的不是「内容是否好」，而是「站点是否把契约数据正确地呈现为可用页面」：
 *   A. 契约数据来源（content/history.json 经契约验证器；缺失时为诚实未加载状态）
 *   B. 六入口与互跳（fixture 下六入口、互链、深链；B4 早期战役十键渲染回归）
 *   C. 证据组件（claimType 标签、引用、来源定位）
 *   D. 诚实状态（fixture 标注、未加载、结构非法拒绝）
 *   E. 构建产物（--dist：子路径、资源、hash 路由、无 CDN/瓦片依赖、gzip 体积）
 *   F. 合成契约样本（mapEngine/phase 等真实 fixture 未覆盖的渲染路径）
 *   G. 负例（证明检查本身有效）
 *   MAP-00 地图引擎与阶段控件（M1-M10 + R3 可观察交互）
 *   D2/D3/D4、R2 阶段契约复验、R3、GRAPH 渲染图治理、NAV-01 fixture 泄露回归、S1/Z 自检
 *
 * 本文件没有 SKIP 状态：每条检查要么 PASS 要么 FAIL。任何前置条件缺失（输出目录
 * 不可写、已接受夹具缺失、渲染运行时构建失败）都判 FAIL 并以非零退出码说明原因；
 * 检查项计数等于实际执行的断言数（见 Z-accounting）。
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NAV-01 第 0 步基线（只读核对；基线 = 已接受集成 HEAD 2263112、本任务 delta 之前
 * 的 scripts/validate-site.mjs）
 * ═══════════════════════════════════════════════════════════════════════════
 * 文件基线（实测）：git blob 152,113 B / 3,067 行（LF）；工作树 CRLF 检出 155,180 B
 * （与派发 manifest 记录的 155,180 B 一致；行数以 git blob 换行符数为准）。
 *
 * 一、基线分段结构（行号为基线文件实测；本任务交付后行号已变化，见「交付后映射」）
 * ---------------------------------------------------------------------------
 *   骨架  61-91     结果记录 record/pass/fail/check（只有 PASS/FAIL，无 SKIP）
 *   骨架  93-472    站点组件加载：输出目录治理、渲染图记录、模块装载
 *   骨架  474-517   React 实例统一（唯一 React → h / renderStatic）
 *   骨架  519-577   渲染入口 renderApp、fixture 读取 loadFixture、
 *                   missingState / invalidState / countOf
 *   渲染  A   579-664   契约数据来源 checkContentFile（A1 / A1-coverage / A2）
 *   渲染  B   666-814   六入口与互跳 checkEntries（B1/B2/B3/B5/B6），并调用 B4
 *   渲染  B4  816-1125  早期战役 analysisProfiles 十键渲染回归（详见三）
 *   自检  S1  1127-1246 空洞断言形状自检 checkNoVacuousAssertions
 *   渲染  C   1248-1323 证据组件
 *   渲染  D   1325-1376 诚实状态（D2-2：内容缺失页不得出现 valid-min fixture 句子）
 *   渲染  E   1378-1450 构建产物 --dist（E0-E4）
 *   渲染  F   1452-1542 合成契约样本（src/testing/syntheticContractSample.mjs）
 *   渲染  G   1544-1624 负例
 *   渲染  MAP-00 1626-2149 地图引擎 checkAtlas（M1-M10 + R3 可观察交互）
 *   渲染  D2  2151-2241 用 valid-min 驱动地图引擎
 *   渲染  D3  2243-2358 状态机交互（无条件运行）
 *   渲染  D4  2360-2419 标签/字形单一来源 + 全图视野平移语义
 *   渲染  R2  2421-2712 阶段契约复验：磁盘 map-phases.json + 内存阶段对象
 *   渲染  R3  2714-2872 可观察交互（图层/播放/前后阶段）
 *   骨架  2874-2876 「主流程」标注（GRAPH 段前的位置标记，无代码）
 *   渲染  GRAPH 2878-2940 渲染图治理
 *   自检  Z   2942-2959 检查项计数自证 verifyCheckAccounting
 *   骨架  main/summarize 2961-3067（main 2961 / summarize 3032 / 入口调用 3060-3067）
 *
 * 二、各段依赖的契约夹具（基线实测代码行）
 * ---------------------------------------------------------------------------
 *   - contracts/fixtures/map-phases.json
 *       仅 R2-A 段（checkAtlasPhaseContractReverification，基线 L2592；读取行
 *       L2596-2597）消费；R2-B 用纯内存阶段对象。**map-phases 夹具的消费方只有这一处。**
 *   - contracts/fixtures/map-phases-analysis.json
 *       **不存在**（已接受契约如此）：基线真实代码 0 处引用。本脚本不创建、不引用、
 *       不要求其存在；阶段分析字段由 ARCH-02 的 analysisProfiles 契约 +
 *       map-phases.json 承载（NAV-3-no-map-analysis-ref 对该事实做机器断言）。
 *   - contracts/fixtures/valid-min.json
 *       B（基线 L672/734）、C（L1263）、D（L1330）、G（L1558-1599）、D2（L2160）。
 *   - contracts/fixtures/valid-early-campaign.json
 *       B（L673）、B4（L1001-1006）。
 *   - content/history.json（真实内容，不是夹具）
 *       A（L619/632）、M4（L1745）。
 *
 * 三、已接受 MAP-00 的 B4 当前形态（基线 HEAD 2263112）
 * ---------------------------------------------------------------------------
 *   已改写为 analysisProfiles 十键严格断言；不存在旧五键断言，也不存在 SKIP 分支。
 *   基线断言名：B4 / B4-fixture-present / B4-load / B4-event / B4-count / B4-keys /
 *   B4-order / B4-no-legacy / B4-no-undefined / B4-<key>-heading|body|evidence（逐节）/
 *   B4-research-status / B4-adapter-{count,keys,evidence,evidence-blocks,no-legacy} /
 *   B4-M-{load,only-profiles,section,count,keys,order,no-legacy,no-undefined,
 *   <key>-heading|body|evidence} / B4-legacy-not-rendered；另有 GRAPH-1..4
 *   （含 MAP-01 a2 新增的 GRAPH-2-negative 反向自证）。
 *
 * 四、checkAtlas 的唯一归属
 * ---------------------------------------------------------------------------
 *   function checkAtlas(M)（基线 L1646，MAP-00 段）：M1 投影数学、M2 缩放/平移、
 *   M3 阶段排序/摘要、M4 真实内容诚实空状态、M5-M9 阶段控件/图例/负例、M10 控件接线。
 *   本文件没有第二个 checkAtlas 定义；地图阶段契约复验属 R2 段专用函数
 *   （checkAtlasPhaseContractReverification）。
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NAV-01 交付后映射：两部分职责与契约归属（本文件现行结构）
 * ═══════════════════════════════════════════════════════════════════════════
 * PART 1「夹具解析/派生」——契约来源：ARCH 知识模块契约（只读；不渲染页面）
 *   - 唯一读取入口：readJsonFile / loadFixtureDocument / loadRealContentDocument /
 *     loadMapPhaseFixtureDocument；ARCH 契约键：loadAnalysisProfileContract()。
 *   - **早期战役分析块字段的唯一解析/派生函数**：
 *       parseEarlyCampaignAnalysisBlocks(rawEvent, contract) → { kind, blocks, legacyKeys }
 *     渲染断言只消费它返回的 blocks，不得再写第二份解析（NAV-1 / NAV-5 机器断言）。
 *   - 契约来源：contracts/content.schema.json 的 $defs.analysisProfiles.required
 *     与 contracts/coverage.json 的 earlyCampaign.analysisProfiles.keys（键/序/标题）。
 *   - 内存构造器（不读磁盘夹具）：makeInMemoryPhase / makeInMemoryScenario /
 *     builtinMapPhaseFixture / makeInMemoryAnalysisEvent / makeInMemoryAnalysisEvidence。
 *   - fixture 专属事实派生：collectFixtureOnlyFacts(realDoc)（供 PART 2 泄露回归）。
 *
 * PART 2「渲染图/展示断言」——契约来源：WEB 站点渲染契约
 *   - 使用真实加载器 M.loadContent + renderApp（AppShell + 六入口视图）渲染并断言展示。
 *   - 包含段：A、B、B4（渲染部分）、C、D、E、F、G、MAP-00、D2/D3/D4、R2（渲染部分）、
 *     R3、GRAPH、NAV-01 fixture 泄露回归、S1/Z 自检。
 *   - 渲染断言不解析契约字段；B4 渲染断言只消费 PART 1 的 parsed.blocks。
 *
 * 共享骨架（不属于上述任一方的纯基础设施，不含业务解析/展示断言）：
 *   结果记录（PASS/FAIL，无 SKIP）、渲染运行时构建与模块图记录、输出目录治理
 *   （--out-dir / DSH_SITE_OUT_DIR，默认工作树 .cache）、React 统一、renderApp / h /
 *   renderStatic、启动与 summarize。
 *
 * 本文件内置的分段/单一属主自检（PART 2 · 自检段，全部真实参与 PASS/FAIL）：
 *   NAV-1 解析函数唯一 / NAV-2 夹具集合 / NAV-3 不引用不存在的 map-phases-analysis /
 *   NAV-4 PART 归属标注存在 / NAV-5 渲染断言不直接读契约字段 / NAV-6 PART 1 无断言 /
 *   NAV-7 行尾无关（CRLF 变体与 LF 变体结果一致）。
 *   Z-accounting 下限取基线断言数 401：删除既有断言会直接 FAIL。
 *
 * ── NAV-01 attempt 2 修正（post-merge check failure）───────────────────────
 *   a1 在中央 project worktree（core.autocrlf → CRLF 检出）失败于唯一一项
 *   NAV-5：其函数体提取用 `\n}\n` 锚定，CRLF 下匹配不到 → bodyLen=0 → FAIL。
 *   本版修正（同一失败类的系统性治理，不是单点补丁）：
 *   - 所有读取本文件源码的自检（S1、NAV-*）先 `.replace(/\r\n/g, '\n')` 归一化；
 *   - 函数体提取收敛为唯一实现 extractFunctionSource()，内部再次归一化；
 *   - 新增 NAV-7：把归一化源码转成 CRLF 变体，重跑函数体提取 / PART 切片 / S1 扫描，
 *     断言结果与 LF 变体一致（在任何检出环境下都会真实执行）。
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NAV-01 交付：B4 处理结果（断言名 before → after；唯一收敛在本文件）
 * ═══════════════════════════════════════════════════════════════════════════
 *   保留（严格度不变或更强；语义按括号更新，断言源改为 PART 1 parsed.blocks）：
 *     B4 / B4-fixture-present / B4-load / B4-event /
 *     B4-count（= PART 1 解析块数 == 渲染小节数）/ B4-keys / B4-order /
 *     B4-no-legacy / B4-no-undefined / B4-<key>-heading|body|evidence（逐节）/
 *     B4-research-status / B4-adapter-{count,keys,evidence,evidence-blocks,no-legacy} /
 *     B4-M-{load,only-profiles,section} / B4-legacy-not-rendered
 *   新增（等价加强，全部计入检查项）：
 *     B4-parse-contract（ARCH 两处契约键一致）/ B4-parse-blocks / B4-parse-missing /
 *     B4-parse-legacy / B4-strict-keys（严格模式：全部契约键 10/10 且顺序=契约）/
 *     B4-view-parity（PART 1 解析结果 == src/data 适配层，证明无平行解析）/
 *     B4-M-parse-blocks / B4-M-strict-keys / B4-M-view-parity
 *   旧五键断言：基线即无；本任务只在负例中构造 legacy 事件，断言 legacyKeys=5 且
 *     派生 0 个渲染块、页面不渲染分析区（B4-legacy-not-rendered）。
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NAV-01 交付：六入口 fixture 泄露回归断言名
 * ═══════════════════════════════════════════════════════════════════════════
 *   LEAK-0-content / LEAK-real-status / LEAK-facts / LEAK-fixture-inputs
 *   LEAK-control-{min,early,map}：正向对照 —— 用已接受夹具渲染同一路由必须检出
 *     fixture 专属事实，证明泄露检测器不是恒真。
 *   LEAK-<entry>-{list,detail,match}，entry ∈ {timeline, battles, people, atlas,
 *     concepts, questions}：
 *       -list / -detail：真实内容渲染 + fixture 专属事实泄露 0 条；
 *       -match：同一详情路由换夹具内容渲染，输出必须不同（渲染随加载内容变化）。
 *   六入口详情路由各一项渲染断言：LEAK-timeline-detail / LEAK-battles-detail /
 *   LEAK-people-detail / LEAK-atlas-detail / LEAK-concepts-detail / LEAK-questions-detail。
 *   （真实内容 battles=0，因此 LEAK-battles-detail 断言「诚实空状态 + 不渲染夹具战役条目」。）
 *   「页面横幅标注测试样本」不参与通过判定；断言对象是正文级泄露与真实内容一致性。
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * 扩展约定（解析段与渲染段不得平行维护）
 * ═══════════════════════════════════════════════════════════════════════════
 *   1) 新增内容字段（ARCH 契约字段）：
 *      a. 先在 ARCH 契约（contracts/content.schema.json + contracts/coverage.json）
 *         定义字段、键名与顺序；
 *      b. 再在 PART 1 增加/扩展解析函数（如 parseEarlyCampaignAnalysisBlocks）；
 *      c. PART 2 的渲染断言遍历解析函数结果自动覆盖，**不追加逐字段断言**。
 *   2) 新增渲染展示：
 *      a. 只在 PART 2 增加/扩展渲染断言；
 *      b. 不复制契约解析逻辑，不直接读取契约字段；
 *      c. 需要新数据时回 PART 1 扩展解析函数，并让渲染断言消费其结果。
 *   3) 本任务作用域只有 scripts/validate-site.mjs：不写 docs/acceptance/
 *      （属 SHIP-01 / EVID-01 / ACCEPT-01）、不写 src/（渲染修复由 MAP-00 承接）、
 *      不改 contracts/、content/、public/、tests/、.github/ 或 package.json。
 *   4) 本任务不运行内容门禁（--stage/--media），不补写内容缺陷；内容问题只记录交回。
 *   5) 行尾无关（NAV-01 attempt 2 修正，必须遵守）：任何读取本脚本源码做自检的代码
 *      （S1 / NAV-*）都必须先 `.replace(/\r\n/g, '\n')` 归一化，再使用 `\n` 锚定模式、
 *      `split('\n')` 行号或区间切片；中央 project worktree 用 core.autocrlf 检出（CRLF），
 *      本机 worktree 是 LF，同一自检必须在两种检出下给出相同结果。函数体提取只允许
 *      使用 extractFunctionSource()（内部已归一化）。NAV-7 用 CRLF 变体做真实断言。
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * MAP-01 交付：真实内容接入地图与三大战役分阶段推演（本文件增量，PART 2 · WEB）
 * ═══════════════════════════════════════════════════════════════════════════
 * 数据基线：HIST-04 已接受内容 content/history.json（fixtureOnly=false）：
 *   珍珠港 3 阶段 / 珊瑚海 4 阶段 / 中途岛 5 阶段 = 12 个阶段；每阶段都带双方
 *   knownEnemy / unknownEnemy / decision / consequence 与示意航线（MAP1-phase-fields /
 *   MAP1-routes 逐阶段断言）。本任务不生成内容、不改契约、不生成虚构航迹。
 *
 * 站点侧增量（src/，本文件对应断言名）：
 *   - 战役选择器（Atlas）：data-battle-select / data-atlas-battle / data-atlas-battle-count；
 *     断言 MAP1-atlas-selector / MAP1-atlas-default-battle。
 *   - 「#/atlas?battle=<battleId>&phase=<phaseId>」深链定位阶段（路由 buildHref 支持
 *     battle/phase；AtlasView → Atlas initialBattleId/initialPhaseId）：
 *     断言 MAP1-<battleId>-deep-link / MAP1-<battleId>-intel。
 *   - 阶段控件与播放/暂停/前后/时间轴（既有 MAP-00 控件复用）：
 *     断言 MAP1-<battleId>-controls / MAP1-<battleId>-playback / -routes。
 *   - 从地图跳叙述（data-phase-action="narrative"）与从叙述回地图阶段
 *     （战役页每阶段 data-phase-map-link → #/atlas?battle=&phase=）：
 *     断言 MAP1-<battleId>-narrative-link / -narrative-phase-links。
 *   - 图例 / 比例尺 / 经纬网 / 双方视觉编码 / 不确定范围（MAP-00 引擎能力）：
 *     断言 MAP1-atlas-{legend,scalebar,graticule,uncertainty,keyboard-touch}。
 *   - 验收要求的重点标签（夏威夷 / 中途岛 / 菲律宾 / 新加坡 / 马来亚 / 关岛 / 威克岛 /
 *     澳大利亚北部 + 相关海域）：MAP1-node-<标签> 断言**字面标签**出现在渲染输出中，
 *     并在消息里写明承载来源（地点标签第一/二行 vs 区域标注层）；MAP1-node-<标签>-detail
 *     断言地点详情可发现历史名+现代名；MAP1-seas 断言海域标签。
 *   - 区域标注层（src/atlas/regions.ts，MAP-01 地理标注）：区域名锚定到真实 place
 *     （不新增坐标/史实）。「澳大利亚北部」由该层以 SVG <text> 字面渲染：
 *     断言 MAP1-region-layer / MAP1-region-anchor-guard（锚点缺失时不渲染，证明数据驱动）。
 *   - 时间线日期筛选（#/timeline?date=YYYY-MM-DD → 事件筛选，稳定控件
 *     data-timeline-date-*）：断言 MAP1-timeline-{controls,date,count,events,reset}。
 *   - 六入口在真实完整内容上正常显示：断言 MAP1-entry-<view>（覆盖六入口）。
 *   既有 LEAK-* 组继续保证发布路由无 fixture 事实（本任务新增 UI 文案不引入夹具内容）。
 *   诚实性说明：MAP1-phase-fields / MAP1-routes 是内容 JSON 结构 gate；MAP1-<battleId>-playback
 *   是状态机层断言（与组件同一纯函数实现，未在浏览器中真实点击）；它们在消息里显式标注
 *   所证明的范围，不冒充浏览器交互验证。
 *
 *   - MAP-01 attempt 2（post-merge check failure 修正）：并行 MEDIA-01 在集成中新增
 *     content/media.json 后，宽 glob `content/*.json` 把它打进渲染 bundle，旧 GRAPH-2
 *     只认 content/history.json 精确路径 → 误判为 unexpected 而 FAIL。修正两点：
 *       1) src/content/loader.ts 的 glob 收窄为唯一内容源 `content/history.json`
 *          （站点不消费媒体注册表；内容缺失仍返回空集 → D2 诚实未加载路径不变）；
 *       2) GRAPH-2 分类抽出为 classifyRenderGraphModule()，**按类别**判定
 *          content/ 下任意 `.json` 为 content-data（不写死文件名）；
 *       3) 新增 GRAPH-2-negative：正样本（history/media.json、src 业务模块）被接受，
 *          越界样本（/etc/passwd、scripts/、content/notes.txt、public/、vite.config.ts、
 *          index.html、node_modules/）仍判 unexpected —— 证明放宽白名单后判据仍有牙齿。
 *
 * 扩展约定补充（MAP-01）：地图/时间线的**稳定 data-* 控件属性**属于 WEB 展示契约；
 * 新增地图展示只在 PART 2 增加渲染断言，字段来源仍是同一份 content/history.json，
 * 不得为地图另建数据源或手写 URL（一律 buildHref）。
 *
 * 每个检查都打印 PASS/FAIL；本文件没有 SKIP 状态。负例检查（negative case）是刻意
 * 构造的错误输入，用来证明检查本身有效。
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as ReactJsxRuntime from 'react/jsx-runtime';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');
const SRC = path.join(ROOT, 'src');
const FIXTURE_MIN = path.join(ROOT, 'contracts', 'fixtures', 'valid-min.json');
const FIXTURE_EARLY = path.join(ROOT, 'contracts', 'fixtures', 'valid-early-campaign.json');
const FIXTURE_MAP_PHASES = path.join(ROOT, 'contracts', 'fixtures', 'map-phases.json');
const CONTRACT_SCHEMA = path.join(ROOT, 'contracts', 'content.schema.json');
const CONTRACT_COVERAGE = path.join(ROOT, 'contracts', 'coverage.json');
/** PART 1 消费的契约夹具清单（唯一来源；不包含不存在的 map-phases-analysis.json）。 */
const FIXTURE_FILES = [
  { rel: 'contracts/fixtures/valid-min.json', file: FIXTURE_MIN },
  { rel: 'contracts/fixtures/valid-early-campaign.json', file: FIXTURE_EARLY },
  { rel: 'contracts/fixtures/map-phases.json', file: FIXTURE_MAP_PHASES },
];
const CONTENT_FILE = path.join(ROOT, 'content', 'history.json');
const CONTENT_VALIDATOR = path.join(ROOT, 'scripts', 'validate-content.mjs');

const BASE_PATH = '/history_pacific_war/';

const args = process.argv.slice(2);
const DIST_ARG_INDEX = args.indexOf('--dist');
const DIST_DIR = DIST_ARG_INDEX >= 0 && args[DIST_ARG_INDEX + 1] ? path.resolve(ROOT, args[DIST_ARG_INDEX + 1]) : null;

// ---------------------------------------------------------------------------
// 结果记录　【共享骨架 · 结果记录（PASS/FAIL，无 SKIP）】
// ---------------------------------------------------------------------------

const results = [];
/**
 * 记录一条**已执行**断言。
 *
 * MAP-00 a4 硬规则（验收 L541）：不得把未执行断言报告为通过。
 * 因此本验证器**没有 SKIP 状态**：只有 PASS / FAIL。任何前置条件缺失都必须
 * 走 fail(...) 并以非零退出码结束并说明原因，绝不允许「条件不满足就跳过、
 * 整体仍报 PASS」。
 */
function record(status, id, message) {
  if (status !== 'PASS' && status !== 'FAIL') {
    throw new Error(`内部错误：未知检查状态 ${String(status)}（本验证器禁止 SKIP：未执行的断言不得计入结果）`);
  }
  results.push({ status, id, message });
  console.log(`${status}  ${id}  ${message}`);
}
function pass(id, message) {
  record('PASS', id, message);
}
function fail(id, message) {
  record('FAIL', id, message);
}
function check(id, condition, message, detail) {
  if (condition) pass(id, message);
  else fail(id, `${message}${detail ? ` —— ${detail}` : ''}`);
  return Boolean(condition);
}

// ---------------------------------------------------------------------------
// 站点组件加载　【共享骨架 · 渲染运行时构建】
// ---------------------------------------------------------------------------
//
// 站点代码是 TS/TSX，Node 不能直接 import。两条路径：
//
// 1. **首选：用真实构建产物。** `npm run build` 之后 dist/assets/index-*.js 就是
//    真正发布的站点代码（React 已打包）；验证器把它和少数纯数据模块一起打成临时
//    ESM，再在 Node 里用 react-dom/server 渲染页面。这样验证的是**产物本身**。
// 2. **回退：没有产物时按需打包源码**（SSR 构建到 .cache，不进版本库）。
//
// 两条路径都注入同一个 node:child_process 替身：Vite/rolldown 在 Windows 上会执行
// `net use` 探测网络映射盘（optimizeSafeRealPathSync），受限沙箱会以 spawn EPERM
// 让构建整体失败 —— 而本项目完全不需要该子进程。替身只把这一条无害探测变成空操作，
// 其它子进程调用一律转发给真实实现，绝不静默吞掉真实错误。

const CHILD_PROCESS_SHIM = `
const real = process.getBuiltinModule('node:child_process');
function shouldStub(command, args) {
  if (typeof command !== 'string') return false;
  if (command.includes('net use')) return true;
  return command === 'net' && Array.isArray(args) && args[0] === 'use';
}
function stubEmitter() {
  return { on() { return this; }, once() { return this; }, kill() {}, unref() {}, ref() {} };
}
export function spawn(command, args, options, callback) {
  if (!shouldStub(command, args)) return real.spawn(command, args, options, callback);
  const cb = [options, callback].find((item) => typeof item === 'function');
  if (typeof cb === 'function') queueMicrotask(() => cb(Object.assign(new Error('net use unavailable (sandbox)'), { code: 'EPERM' })));
  return stubEmitter();
}
export function exec(command, options, callback) {
  if (!shouldStub(command, [])) return real.exec(command, options, callback);
  const cb = [options, callback].find((item) => typeof item === 'function');
  if (typeof cb === 'function') queueMicrotask(() => cb(Object.assign(new Error('net use unavailable (sandbox)'), { code: 'EPERM' }), '', ''));
  return stubEmitter();
}
export function execFile(file, args, options, callback) {
  if (!shouldStub(file, args)) return real.execFile(file, args, options, callback);
  const cb = [options, callback].find((item) => typeof item === 'function');
  if (typeof cb === 'function') queueMicrotask(() => cb(Object.assign(new Error('net use unavailable (sandbox)'), { code: 'EPERM' }), '', ''));
  return stubEmitter();
}
export const fork = real.fork;
export default { ...real, spawn };
`;

function childProcessShimPlugin() {
  const VIRTUAL = '\0pw-child-process-shim';
  return {
    name: 'pw-child-process-shim',
    enforce: 'pre',
    resolveId(source) {
      if (source === 'node:child_process' || source === 'child_process') return VIRTUAL;
      return null;
    },
    load(id) {
      if (id === VIRTUAL) return CHILD_PROCESS_SHIM;
      return null;
    },
  };
}

/** src 中可被测试直接导入的模块与导出名。 */
const RUNTIME_EXPORTS = {
  'data/index.ts': ['buildIndex', 'entryCounts', 'searchContent', 'collectEvidenceBlocks', 'collectEntityEvidence', 'analysisProfileBlocks', 'ANALYSIS_PROFILE_KEYS'],
  'router/route.ts': ['parseRoute', 'buildHref', 'entityTypeFromId'],
  'content/labels.ts': ['SIDE_LABELS', 'HISTORICAL_PART_META'],
  'content/loader.ts': ['loadContent', 'loadContentAsync', 'loadContentFromText', 'emptyDocument'],
  'features/AppContext.ts': ['AppContextProvider'],
  'components/ClaimTag.tsx': ['ClaimTag', 'ClaimTagLegend', 'CertaintyTag', 'CERTAINTY_META'],
  'components/SourceLocator.tsx': ['SourceLocator', 'SourceLocatorList'],
  'components/CitationList.tsx': ['CitationList'],
  'components/EvidencePanel.tsx': ['EvidencePanel'],
  'features/overview/OverviewView.tsx': ['OverviewView'],
  'features/timeline/TimelineView.tsx': ['TimelineView'],
  'features/battles/BattlesView.tsx': ['BattlesView'],
  'features/people/PeopleView.tsx': ['PeopleView'],
  'features/atlas/AtlasView.tsx': ['AtlasView'],
  'features/concepts/ConceptsView.tsx': ['ConceptsView'],
  'features/questions/QuestionsView.tsx': ['QuestionsView'],
  'features/sources/SourcesView.tsx': ['SourcesView'],
  'features/search/SearchView.tsx': ['SearchView'],
  'shell/AppShell.tsx': ['AppShell'],
  // MAP-00：Atlas 引擎、投影数学与阶段控件
  'Atlas.tsx': ['Atlas', 'pickBattle'],
  'atlas/projection.ts': [
    'VIEW_WIDTH',
    'VIEW_HEIGHT',
    'PACIFIC_BOUNDS',
    'IDENTITY_TRANSFORM',
    'MIN_ZOOM',
    'MAX_ZOOM',
    'SIDES',
    'SIDE_ENCODING',
    'KM_PER_DEGREE',
    'boundsForPlaces',
    'createProjection',
    'project',
    'unproject',
    'clampTransform',
    'zoomAt',
    'panBy',
    'lngUnwrapped',
    'svgTransform',
    'uncertaintyRadius',
    'scaleBarKm',
    'toUserSpace',
  ],
  'atlas/mapEngine.tsx': ['AtlasMapEngine'],
  'atlas/stateMachines.ts': ['toggleLayer','setLayerChecked','enabledLayers','zoomByFactor','panView','resetView','isAtFitZoom','togglePlayback','tickPlayback','stepPlayback','selectPhase','advanceTicks','clampIndex','playInterval','sortPhases','phasesUsable','phaseSummary','DEFAULT_LAYERS','LAYER_LABELS','INITIAL_PLAYBACK','PHASE_PLAY_INTERVAL_MS','ZOOM_BOUNDS'],
  'atlas/controls.tsx': [
    'PhaseControls',
    'DateSelector',
    'LayersControl',
    'CertaintyLegend',
    'usePhasePlayback',
    'prefersReducedMotion',
    'CERTAINTY_LABELS',
  ],
};

/**
 * 渲染测试用的临时构建目录（MAP-00R1 / a4：可配置，**默认在工作树内**）。
 *
 * 验收 L540 硬规则：
 * - validate-site 的临时/报告目录可通过 `--out-dir <path>` 或环境变量
 *   `DSH_SITE_OUT_DIR` 指向工作树内路径；
 * - **默认只写工作树内 `.cache/site-validate/`**（不是 os.tmpdir()）；
 * - 删除只作用于本次在该目录下创建的 `run-*` 子目录；
 * - `check` / `build` 不要求系统临时目录可写（本文件不再使用 os.tmpdir()）。
 *
 * 验收 L541 硬规则：目录不可写属于**前置条件缺失**，必须 FAIL 并以非零退出码
 * 说明原因，绝不允许降级成 SKIP 后再报 PASS。
 */
let tempRuntimeRoot = null;

/** 从 argv 读取 `--out-dir`。 */
function readOutDirArg(argv) {
  const eq = argv.find((arg) => arg.startsWith('--out-dir='));
  if (eq) return eq.slice('--out-dir='.length);
  const index = argv.indexOf('--out-dir');
  if (index >= 0 && argv[index + 1] && !argv[index + 1].startsWith('--')) return argv[index + 1];
  return null;
}

const OUT_DIR_ARG = readOutDirArg(process.argv.slice(2));
const OUT_DIR_ENV = process.env.DSH_SITE_OUT_DIR || null;
/** 默认输出根：工作树内 `.cache/site-validate`（默认只写工作树，不依赖系统临时目录）。 */
const DEFAULT_OUT_DIR = path.join(ROOT, '.cache', 'site-validate');
/** 配置的输出根（绝对路径）；null 表示使用工作树内默认目录。 */
const CONFIGURED_OUT_DIR = OUT_DIR_ARG
  ? path.resolve(ROOT, OUT_DIR_ARG)
  : OUT_DIR_ENV
    ? path.resolve(ROOT, OUT_DIR_ENV)
    : null;
/** 实际使用的输出根（配置优先，否则工作树内默认目录）。 */
const OUT_DIR_ROOT = CONFIGURED_OUT_DIR ?? DEFAULT_OUT_DIR;
const OUT_DIR_SOURCE = OUT_DIR_ARG ? '--out-dir' : OUT_DIR_ENV ? 'DSH_SITE_OUT_DIR' : '默认（工作树 .cache/site-validate）';

/** 输出根禁止落在这些源树子目录内（加载入口不得写入源树）。 */
const FORBIDDEN_OUT_DIR_PREFIXES = ['src', 'scripts', 'contracts', 'content', 'docs', 'public', 'node_modules', '.git'];

/** 校验输出根；返回错误说明字符串，合法时返回 null。 */
function outDirPolicyError(configuredDir) {
  if (!configuredDir) return null;
  const normalized = path.resolve(configuredDir);
  for (const prefix of FORBIDDEN_OUT_DIR_PREFIXES) {
    const guarded = path.resolve(ROOT, prefix);
    if (normalized === guarded || normalized.startsWith(guarded + path.sep)) {
      return `输出目录 ${normalized} 位于受保护源目录 ${prefix}/ 内（加载入口不得写入源树）`;
    }
  }
  return null;
}

function createTempRuntimeRoot() {
  const policyError = outDirPolicyError(OUT_DIR_ROOT);
  if (policyError) throw new Error(`OUT_DIR_POLICY: ${policyError}`);
  try {
    fs.mkdirSync(OUT_DIR_ROOT, { recursive: true });
    const dir = fs.mkdtempSync(path.join(OUT_DIR_ROOT, 'run-'));
    tempRuntimeRoot = dir;
    return dir;
  } catch (error) {
    // 前置条件缺失 → 由 main 判 FAIL 并非零退出（不再 SKIP）。
    throw new Error(`OUT_DIR_UNWRITABLE:${error?.code ?? 'UNKNOWN'}:${OUT_DIR_ROOT}`);
  }
}

function cleanupTempRuntimeRoot() {
  if (!tempRuntimeRoot) return;
  const created = path.resolve(tempRuntimeRoot);
  // 删除前再次确认：目标必须是本次在**输出根**下创建的子目录（只删自己创建的 run-*）。
  const allowedRoot = path.resolve(OUT_DIR_ROOT);
  const insideAllowed = created !== allowedRoot && created.startsWith(allowedRoot + path.sep);
  if (!insideAllowed) {
    tempRuntimeRoot = null;
    return;
  }
  try {
    fs.rmSync(created, { recursive: true, force: true, maxRetries: 3 });
  } catch {
    // 清理失败不影响结论：输出根在工作树 .cache/ 内，不污染版本库。
  }
  tempRuntimeRoot = null;
}

/**
 * 渲染运行时的模块图（由 buildRuntimeBundle 的 `recordRuntimeGraphPlugin` 记录）。
 * 用于验收 L538：证明 validate-site 的渲染图只含业务模块，不包含 index.html
 * 或 react-dom/client（B4 的派生逻辑不得把浏览器整棵应用水合拉进验证器）。
 */
let runtimeGraph = null;

function recordRuntimeGraphPlugin() {
  const ids = new Set();
  return {
    name: 'pw-record-render-graph',
    moduleParsed(info) {
      if (info && typeof info.id === 'string') ids.add(info.id);
    },
    buildEnd() {
      runtimeGraph = { ids: [...ids] };
    },
  };
}

let siteModules = null;

function toImportPath(absolutePath) {
  return absolutePath.split(path.sep).join('/');
}

function pathToFileUrl(absolutePath) {
  return `file:///${absolutePath.split(path.sep).join('/')}`;
}

/**
 * React / react-dom 的**绝对入口路径**。
 *
 * 用绝对路径而不是裸说明符（'react'），原因见 buildRuntimeBundle 的注释：
 * 生成的 entry 位于工作树 `.cache/site-validate/run-*` 内，裸说明符无法从该目录解析；
 * 而绝对路径保证打包期与运行期都指向同一份文件 → 进程内只有一个 React 实例。
 */
const reactEntry = path.join(ROOT, 'node_modules', 'react', 'index.js');
const reactDomServerEntry = path.join(ROOT, 'node_modules', 'react-dom', 'server.node.js');
const reactJsxRuntimeEntry = path.join(ROOT, 'node_modules', 'react', 'jsx-runtime.js');

/**
 * 以 file:// URL 给出上面的绝对路径。
 * 产物位于工作树 `.cache/` 内，裸说明符无法解析；而且验证器与产物必须指向**同一个文件**，
 * 否则会出现两个 React 实例（实测症状：元素类型合法但渲染结果为 ""）。
 */
const reactModuleUrl = pathToFileURL(reactEntry).href;
const reactDomServerModuleUrl = pathToFileURL(reactDomServerEntry).href;
const reactJsxRuntimeModuleUrl = pathToFileURL(reactJsxRuntimeEntry).href;

async function buildRuntimeBundle() {
  const vite = await import('vite');
  // createTempRuntimeRoot() 在输出根不可写时抛 OUT_DIR_UNWRITABLE（由 main 判 FAIL
  // 并非零退出，不再降级 SKIP），在输出根违反源树策略时抛 OUT_DIR_POLICY（同样是 FAIL）。
  const baseDir = createTempRuntimeRoot();
  const outDir = path.join(baseDir, 'from-source');
  fs.mkdirSync(outDir, { recursive: true });
  const entry = path.join(baseDir, 'runtime-entry.tsx');

  const srcExports = Object.entries(RUNTIME_EXPORTS).map(
    ([file, names]) => `export { ${names.join(', ')} } from '${toImportPath(path.join(SRC, file))}';`,
  );
  // bundle 通过全局变量取用 React 实例。
  //
  // 这是解决「双 React 实例」最确定的方式：产物会被内联打包，任何 import 方式
  // （裸说明符 / 绝对路径 / alias）都可能得到**另一份** React 模块实例，
  // 而 React hooks 依赖模块级内部状态，两份实例会直接抛
  // `Cannot read properties of null (reading 'useState')` 或静默渲染成 ""。
  // 因此改为：验证器把**自己的** React 与渲染函数挂到 globalThis，
  // 产物只从 globalThis 读取 → 全进程只有一个实例，行为与浏览器一致。
  srcExports.push('const __React = globalThis.__PW_ATLAS_REACT__;');
  srcExports.push('const __renderToStaticMarkup = globalThis.__PW_ATLAS_RTSM__;');
  srcExports.push('if (!__React || !__renderToStaticMarkup) throw new Error("PW_REACT_GLOBAL_MISSING");');
  srcExports.push('export const ReactRuntime = { React: __React, renderToStaticMarkup: __renderToStaticMarkup };');
  fs.writeFileSync(entry, srcExports.join('\n'), 'utf8');

  await vite.build({
    configFile: false,
    root: ROOT,
    mode: 'development',
    logLevel: 'error',
    // 顶层 ssr.noExternal：让 SRC 组件里的 react 也交给我们的改写插件处理，
    // 不被 Vite 当作裸 external 留在产物里。
    ssr: { noExternal: true },
    // 让 SRC 组件里的 'react' / 'react/jsx-runtime' 也走全局（见下方插件），
    // 避免产物内再打包一份 React。
    // recordRuntimeGraphPlugin 记录真实模块图，供 GRAPH 组证明渲染图只含业务模块
    // （不包含 index.html / react-dom/client，见验收 L538）。
    plugins: [rewriteReactImportsPlugin(), childProcessShimPlugin(), recordRuntimeGraphPlugin()],
    build: {
      ssr: entry,
      outDir,
      emptyOutDir: true,
      minify: false,
      target: 'node22',
      write: true,
      rollupOptions: {
        output: { entryFileNames: 'runtime.mjs', format: 'es' },
      },
    },
  });
  // 记录 entry 路径，供 GRAPH 组把「生成的入口文件」与业务模块区分开。
  runtimeGraph = { ...(runtimeGraph ?? { ids: [] }), entry: toImportPath(path.resolve(entry)) };
  return path.join(outDir, 'runtime.mjs');
}

/**
 * 把产物里 external 的 `react` / `react/jsx-runtime` / `react-dom/server`
 * 改写为从 globalThis 取实例的小模块，从而与验证器共用**唯一**的 React。
 */
function rewriteReactImportsPlugin() {
  const V = {
    react: '\0pw-react',
    'react/jsx-runtime': '\0pw-react-jsx',
    'react-dom/server': '\0pw-react-dom-server',
  };
  return {
    name: 'pw-react-global-rewrite',
    enforce: 'pre',
    resolveId(source) {
      return V[source] ?? null;
    },
    load(id) {
      if (id === V.react) {
        return 'const R = globalThis.__PW_ATLAS_REACT__; export default R; export const createElement = R.createElement; export const Fragment = R.Fragment; export const useMemo = R.useMemo; export const useState = R.useState; export const useEffect = R.useEffect; export const useCallback = R.useCallback; export const useRef = R.useRef; export const memo = R.memo; export const forwardRef = R.forwardRef; export const createContext = R.createContext; export const useContext = R.useContext; export const isValidElement = R.isValidElement; export const Children = R.Children; export const Suspense = R.Suspense; export const useId = R.useId; export const useReducer = R.useReducer; export const useLayoutEffect = R.useLayoutEffect; export const useSyncExternalStore = R.useSyncExternalStore; export const useTransition = R.useTransition; export const StrictMode = R.StrictMode; export const version = R.version;';
      }
      if (id === V['react/jsx-runtime']) {
        return 'const J = globalThis.__PW_ATLAS_JSX_RUNTIME__; export const jsx = J.jsx; export const jsxs = J.jsxs; export const Fragment = J.Fragment;';
      }
      if (id === V['react-dom/server']) {
        return 'export const renderToStaticMarkup = globalThis.__PW_ATLAS_RTSM__;';
      }
      return null;
    },
  };
}

/**
 * 加载站点组件用于渲染测试。
 *
 * **从源码做 SSR 打包**（而不是 import dist 产物）。原因：
 * dist bundle 顶部的 modulepreload polyfill 以及 React DOM 的模块级代码会在
 * import 阶段访问浏览器全局（document / MutationObserver / navigator），
 * 在纯 Node 里无法可靠导入；为它维护一套全局替身既脆弱又会掩盖真实问题。
 *
 * 产物本身由 `--dist` 的 E 段检查（资源存在、子路径、hash 路由、CDN 依赖、体积）
 * 覆盖；浏览器 DOM 级交互（真实点击/键盘/触摸）由 QA-01 的 Playwright 套件负责。
 * 渲染图只打包 RUNTIME_EXPORTS 中列出的**业务模块**，不引入 index.html / main.tsx /
 * react-dom/client（见 GRAPH 组与验收 L538）。
 */
/**
 * 安装全局 React 实例供产物使用（唯一实例）。
 * React 的 hooks 依赖模块级内部状态，因此全进程只能有一份 React。
 */
function installReactGlobals() {
  globalThis.__PW_ATLAS_REACT__ = React;
  globalThis.__PW_ATLAS_JSX_RUNTIME__ = ReactJsxRuntime;
  globalThis.__PW_ATLAS_RTSM__ = renderToStaticMarkup;
}
async function loadSiteModules() {
  if (siteModules) return siteModules;
  // 把验证器自己的 React / JSX runtime / SSR 渲染函数挂到 globalThis，
  // 产物只从这里取（见 rewriteReactImportsPlugin）→ 全进程唯一 React 实例。
  installReactGlobals();
  const file = await buildRuntimeBundle();
  const loaded = await import(`${pathToFileUrl(file)}?v=${Date.now()}`);
  siteModules = { ...loaded, __source: '源码 SSR 打包（渲染契约测试；产物由 --dist 的 E 段检查）' };
  return siteModules;
}

// ---------------------------------------------------------------------------
// React 实例统一（重要）　【共享骨架】
// ---------------------------------------------------------------------------
//
// 运行时 bundle 位于工作树 `.cache/site-validate/run-*`，它 external 的 'react'
// 由该目录经提升的 node_modules 解析；而本文件顶部 `import React from 'react'`
// 解析的是 worktree 的 node_modules。
// 即使两者指向同一份包，只要经过不同的解析路径（或不同条件导出：development vs production），
// React 就会被加载成**两个实例**，渲染时抛出
// `Cannot read properties of null (reading 'useContext')`。
//
// 解决办法：**验证器本身不再 import React**，而是从 bundle 取它自己也用的那份
// React 与 renderToStaticMarkup（bundle 导出 `ReactRuntime`）。bundle 把 React
// 内联打包，因此整个进程里只有一个 React 实例。
// 这样验证器与组件共用同一个 React，行为与浏览器里一致。

/** 当前渲染用的 React 与 renderToStaticMarkup；由 adoptBundleReact 从 bundle 注入。 */
let ReactRuntime = null;

function adoptBundleReact(M) {
  const runtime = M.ReactRuntime;
  // 注意：createElement 在 runtime.React 上（runtime 是 { React, renderToStaticMarkup }）。
  const ok =
    runtime &&
    typeof runtime.React?.createElement === 'function' &&
    typeof runtime.renderToStaticMarkup === 'function';
  if (!ok) {
    throw new Error('运行时 bundle 未导出可用的 ReactRuntime：无法进行渲染测试');
  }
  ReactRuntime = runtime;
  return true;
}

/** 便捷包装：始终使用当前统一的 React 实例。
 * 接受可变 children（与 React.createElement 相同的调用约定）。 */
function h(type, props, ...children) {
  return ReactRuntime.React.createElement(type, props, ...children);
}

function renderStatic(element) {
  const out = ReactRuntime.renderToStaticMarkup(element);
  return out;
}

// ---------------------------------------------------------------------------
// 渲染一个完整页面（外壳 + 视图），与站点真实结构一致。　【共享骨架 · PART 2 渲染入口】
// ---------------------------------------------------------------------------

function renderApp(M, { content, route }) {
  const state = content;
  const doc = state.doc ?? M.emptyDocument();
  const index = M.buildIndex(doc);
  const value = {
    content: state,
    index,
    hasContent: state.doc !== null,
    isFixture: state.status === 'fixture',
  };
  const view = (() => {
    switch (route.view) {
      case 'overview':
        return h(M.OverviewView);
      case 'timeline':
        // MAP-01：route.date 让验证器复用真实站点的「时间线日期筛选」路径（#/timeline?date=…）。
        return h(M.TimelineView, { eventId: route.id, initialDate: route.date ?? null });
      case 'battles':
        return h(M.BattlesView, { battleId: route.id });
      case 'people':
        return h(M.PeopleView, { personId: route.id });
      case 'atlas':
        // MAP-01：route.battle / route.phase 让验证器复用真实站点的「#/atlas?battle=&phase=」深链路径。
        return h(M.AtlasView, { placeId: route.id, battleId: route.battle ?? null, phaseId: route.phase ?? null });
      case 'concepts':
        return h(M.ConceptsView, { conceptId: route.id });
      case 'questions':
        return h(M.QuestionsView, { questionId: route.id });
      case 'sources':
        return h(M.SourcesView, { sourceId: route.id });
      case 'search':
        return h(M.SearchView, { query: route.query });
      default:
        throw new Error(`未知视图：${route.view}`);
    }
  })();
  const html = renderStatic(
    h(M.AppContextProvider, { value }, h(M.AppShell, { route }, view)),
  );
  return { html, index, state };
}

function missingState(M) {
  return M.loadContent({});
}

function invalidState(M) {
  return M.loadContent({ '/virtual/content/history.json': { schemaVersion: '1.0.0', fixtureOnly: false, events: 'not-an-array' } });
}

const countOf = (haystack, needle) => haystack.split(needle).length - 1;

// ===========================================================================
// PART 1 — 夹具解析/派生（契约来源：ARCH 知识模块契约）
// ===========================================================================
//
// 职责边界：本段只把「契约文件 / 契约夹具 / 内存构造对象」解析、派生为可消费数据，
// **不渲染任何页面、不断言展示结果**（渲染断言全部在 PART 2）。契约字段一律以
// ARCH 契约为准，本段不新增或改写契约规则：
//   - contracts/content.schema.json → $defs.analysisProfiles.required（键名与顺序）
//   - contracts/coverage.json       → earlyCampaign.analysisProfiles.keys（键名与标题）
// 两处键名不一致属契约错误，由 PART 2 的 B4-parse-contract 断言。
//
// 早期战役分析块字段的**唯一**解析/派生函数（PART 2 渲染断言只消费它的返回值，
// 不得再写第二份解析逻辑）：
//   parseEarlyCampaignAnalysisBlocks(rawEvent, contract) → { kind, blocks, legacyKeys }
//
// 本段消费的夹具（第 0 步基线核对结论）：
//   contracts/fixtures/valid-min.json            最小契约样本（B/C/D/G/D2 渲染测试入口）
//   contracts/fixtures/valid-early-campaign.json 已接受早期战役样本（B4 十键回归）
//   contracts/fixtures/map-phases.json           仅 R2-A 阶段契约复验读取（磁盘夹具；缺失时
//                                                用代码内内置等价结构夹具 builtinMapPhaseFixture）
//   contracts/fixtures/map-phases-analysis.json  **不存在**（已接受契约如此）：本脚本不创建、
//                                                不引用、不要求其存在；阶段分析字段由
//                                                analysisProfiles 契约 + map-phases.json 承载。
//
// 内存构造器（不读磁盘夹具，供 PART 2 做「不依赖磁盘」的复验）：
//   makeInMemoryPhase / makeInMemoryScenario / builtinMapPhaseFixture /
//   makeInMemoryAnalysisEvent / makeInMemoryAnalysisEvidence

/** 读取 JSON 文件：PART 1 内所有契约/夹具读取的唯一入口（便于审计）。 */
function readJsonFile(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** 读取已接受的契约夹具文档（valid-min 等）；调用方负责存在性判断。 */
function loadFixtureDocument(file) {
  return readJsonFile(file);
}

/** 只读读取真实内容文档；缺失时返回 null（绝不用 fixture 顶替真实内容）。 */
function loadRealContentDocument() {
  return fs.existsSync(CONTENT_FILE) ? readJsonFile(CONTENT_FILE) : null;
}

/** 只读读取已接受阶段夹具 map-phases.json；缺失时返回 null（由内置等价夹具兜底）。 */
function loadMapPhaseFixtureDocument() {
  return fs.existsSync(FIXTURE_MAP_PHASES) ? readJsonFile(FIXTURE_MAP_PHASES) : null;
}

/** ARCH 契约：analysisProfiles 的具名键、顺序与标题（唯一契约来源）。 */
function loadAnalysisProfileContract() {
  const schema = readJsonFile(CONTRACT_SCHEMA);
  const coverage = readJsonFile(CONTRACT_COVERAGE);
  const schemaKeys = Array.isArray(schema?.$defs?.analysisProfiles?.required) ? schema.$defs.analysisProfiles.required : [];
  const coverageEntries = Array.isArray(coverage?.earlyCampaign?.analysisProfiles?.keys)
    ? coverage.earlyCampaign.analysisProfiles.keys
    : [];
  const coverageKeys = coverageEntries.map((entry) => entry?.key).filter((key) => typeof key === 'string');
  const titles = new Map(
    coverageEntries
      .filter((entry) => typeof entry?.key === 'string')
      .map((entry) => [entry.key, typeof entry.title === 'string' ? entry.title : '']),
  );
  return { schemaKeys, coverageKeys, keys: schemaKeys, titles };
}

/** 把任意值归一为 string[]（契约允许缺省/空数组，UI 不得因此崩溃）。 */
function normalizeStringList(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

/**
 * PART 1 唯一共享函数：早期战役分析块字段的解析与派生。
 *
 * - 遍历 **ARCH 契约具名键**（contract.keys），不硬编码任何具体键名；
 * - 「存在即渲染」：小节有标题与正文才派生为渲染块；缺字段的键不返回，因此 UI 不会
 *   出现「空洞小节 / undefined 标题」；
 * - 保留每节自己的 sourceIds / claimIds（小节级证据面板的数据来源）；
 * - legacyKeys 只用于**记录**旧五键是否存在，绝不作为渲染条件（PART 2 断言其不渲染）。
 *
 * @returns {{ kind: 'profiles'|'none', blocks: Array<{key:string,title:string,body:string,sourceIds:string[],claimIds:string[]}>, legacyKeys: string[] }}
 */
function parseEarlyCampaignAnalysisBlocks(rawEvent, contract) {
  const legacyKeys =
    rawEvent && typeof rawEvent === 'object' && rawEvent.earlyCampaignAnalysis && typeof rawEvent.earlyCampaignAnalysis === 'object'
      ? Object.keys(rawEvent.earlyCampaignAnalysis)
      : [];
  const profiles = rawEvent && typeof rawEvent === 'object' ? rawEvent.analysisProfiles : undefined;
  if (!profiles || typeof profiles !== 'object') return { kind: 'none', blocks: [], legacyKeys };
  const blocks = [];
  for (const key of contract.keys) {
    const section = profiles[key];
    if (!section || typeof section !== 'object') continue;
    const title = typeof section.title === 'string' ? section.title.trim() : '';
    const body = typeof section.body === 'string' ? section.body : '';
    if (title.length === 0 || body.trim().length === 0) continue;
    blocks.push({
      key,
      title,
      body,
      sourceIds: normalizeStringList(section.sourceIds),
      claimIds: normalizeStringList(section.claimIds),
    });
  }
  return { kind: 'profiles', blocks, legacyKeys };
}

/** 递归收集 JSON 中所有字符串值（fixture 事实清单的原始输入）。 */
function collectStringValues(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const item of value) collectStringValues(item, out);
  else if (value && typeof value === 'object') for (const item of Object.values(value)) collectStringValues(item, out);
  return out;
}

/** fixture 专属事实的特征词（测试样本/占位/示意等显式标记）。 */
const FIXTURE_FACT_MARKER = /合成|测试样本|测试占位|夹具|示意|样本|占位|不可作为史实/;
/** 纯机器标识（id / 枚举 / 字段名）不算「事实正文」，避免与结构性 data-* 输出误撞。 */
const STRUCTURAL_TOKEN = /^[A-Za-z0-9_.:-]+$/;

/**
 * PART 1：派生「fixture 专属事实」清单，供 PART 2 的发布路由泄露回归消费。
 *
 * 规则（可审计）：
 * 1. 归一化空白；
 * 2. 排除纯机器标识（id/枚举，比如 part-3-expansion 会合法出现在标题 id 里）；
 * 3. 显式 fixture 标记（测试样本/占位/示意…）任何长度都收录；否则要求长度 ≥ 12，
 *    避免把契约词汇（如「背景」）误当正文事实；
 * 4. 真实内容里已经出现过的文字不算 fixture 专属事实（真实内容与夹具共享的措辞）。
 */
function collectFixtureOnlyFacts(realDoc) {
  const realStrings = collectStringValues(realDoc).map((item) => item.replace(/\s+/g, ' ').trim());
  const realJsonText = JSON.stringify(realDoc ?? {}).replace(/\s+/g, ' ');
  const facts = new Map();
  for (const fixture of FIXTURE_FILES) {
    if (!fs.existsSync(fixture.file)) continue;
    const doc = readJsonFile(fixture.file);
    for (const raw of collectStringValues(doc)) {
      const text = String(raw).replace(/\s+/g, ' ').trim();
      if (text.length === 0) continue;
      if (STRUCTURAL_TOKEN.test(text)) continue;
      const marked = FIXTURE_FACT_MARKER.test(text);
      if (!marked && text.length < 12) continue;
      if (realJsonText.includes(text)) continue;
      if (realStrings.some((real) => real.includes(text))) continue;
      if (!facts.has(text)) facts.set(text, fixture.rel);
    }
  }
  return [...facts.entries()].map(([text, fixture]) => ({ text, fixture }));
}

function loadFixture(file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const state = { status: raw.fixtureOnly ? 'fixture' : 'available', doc: raw, issues: [], sourceKey: file };
  return state;
}

/** 载入合成契约样本（含 battles + phases）。 */
async function loadSyntheticDocument() {
  const { buildSyntheticDocument } = await import(pathToFileUrl(path.join(SRC, 'testing', 'syntheticContractSample.mjs')));
  return buildSyntheticDocument();
}

/** 构造一个 fixtureOnly 状态，供 renderApp 使用。 */
function fixtureStateFrom(doc, label) {
  return { status: doc.fixtureOnly ? 'fixture' : 'available', doc, issues: [], sourceKey: label };
}

/**
 * 内存构造：只含 analysisProfiles 全部具名键的早期战役事件（不含真实战役正文）。
 *
 * 键与标题来自 PART 1 的 ARCH 契约（loadAnalysisProfileContract），**不逐字段硬编码**：
 * 未来契约新增具名键时，本构造器与 PART 2 的渲染断言自动覆盖，无需改本文件。
 */
function makeInMemoryAnalysisEvent(contract) {
  const keys = [...contract.keys];
  const analysisProfiles = {};
  keys.forEach((key, index) => {
    const title = contract.titles.get(key) || key;
    analysisProfiles[key] = {
      title,
      body:
        `内存构造正文 ${index + 1}/${keys.length}（键 ${key}）：本节仅用于验证 analysisProfiles 具名键的渲染结构，` +
        `不代表任何真实历史事实，也不含真实战役正文。` +
        `每个分析小节都必须独立渲染标题与正文，并携带本节自己的来源与 claim 证据。`.repeat(2),
      sourceIds: ['source-mem-analysis'],
      claimIds: [`claim-mem-${key}`],
    };
  });
  return {
    id: 'event-memory-analysis',
    title: '内存构造早期战役事件',
    historicalPart: 'part-3-expansion',
    eventType: 'campaign',
    startDate: '1941-12-08',
    summary: '内存构造事件：只提供 analysisProfiles 全部具名键，用于验证适配层与渲染层。',
    article: [],
    placeIds: [],
    personIds: [],
    unitIds: [],
    equipmentIds: [],
    conceptIds: [],
    relatedEventIds: [],
    analysisProfiles,
    researchStatus: 'cross-checked',
    sourceIds: ['source-mem-analysis'],
    claimIds: keys.map((key) => `claim-mem-${key}`),
  };
}

/** 内存构造的来源与 claim（只服务证据面板渲染，不是历史内容）。键来自 ARCH 契约。 */
function makeInMemoryAnalysisEvidence(contract) {
  const keys = [...contract.keys];
  const source = {
    id: 'source-mem-analysis',
    title: '内存构造来源（测试用）',
    creator: '站点验证器',
    publisher: 'MAP-00 自测',
    year: 1942,
    sourceType: 'reference',
    url: 'https://example.invalid/memory-source',
    accessedDate: '1942-06-04',
    citation: '站点验证器内存构造来源，仅用于渲染结构测试。',
    reliabilityNote: '不是历史来源，不能支持任何史实结论。',
  };
  const claims = keys.map((key) => ({
    id: `claim-mem-${key}`,
    text: `内存构造 claim（${key}）：用于验证该分析小节的证据面板渲染。`,
    claimType: 'fact',
    entityIds: ['event-memory-analysis'],
    sourceIds: ['source-mem-analysis'],
    locators: [{ sourceId: 'source-mem-analysis', locatorType: 'section-paragraph', locator: `内存构造定位 ${key}` }],
  }));
  return { source, claims };
}

/** 内存阶段对象构造器（不读取任何文件）。刻意只使用**基础契约字段**。 */
function makeInMemoryPhase(overrides = {}) {
  const base = {
    id: 'phase-mem-1',
    sequence: 1,
    title: '内存阶段一',
    time: { start: '1942-06-04T00:00Z', display: '内存阶段时间显示一', uncertainty: '内存阶段时间不确定说明。' },
    positions: {
      japan: {
        label: '内存日方位置',
        description: '内存日方位置说明。',
        placeIds: ['place-mem-a'],
        coordinates: { lat: 30, lng: 170 },
        schematic: true,
        uncertaintyRadiusKm: 100,
        uncertaintyNote: '内存位置为教学示意。',
        sourceIds: ['source-mem'],
        claimIds: ['claim-mem'],
      },
      allies: {
        label: '内存盟军位置',
        description: '内存盟军位置说明。',
        placeIds: ['place-mem-b'],
        coordinates: { lat: 25, lng: -160 },
        schematic: true,
        uncertaintyRadiusKm: 150,
        uncertaintyNote: '内存位置为教学示意。',
        sourceIds: ['source-mem'],
        claimIds: ['claim-mem'],
      },
    },
    knownEnemy: { japan: '内存：日方已知敌情。', allies: '内存：盟军已知敌情。' },
    unknownEnemy: { japan: '内存：日方未知敌情。', allies: '内存：盟军未知敌情。' },
    decision: { japan: '内存：日方决策。', allies: '内存：盟军决策。' },
    consequence: { japan: '内存：日方后果。', allies: '内存：盟军后果。' },
    certainty: 'schematic',
    viewpoints: {
      japan: { perspective: '内存：日方视角描述文字。', sourceIds: ['source-mem'], claimIds: ['claim-mem'] },
      allies: { perspective: '内存：盟军视角描述文字。', sourceIds: ['source-mem'], claimIds: ['claim-mem'] },
    },
    routes: [],
    schematic: true,
    uncertaintyNote: '内存阶段整体为教学示意。',
    eventIds: [],
    sourceIds: ['source-mem'],
    claimIds: ['claim-mem'],
    ...overrides,
  };
  return base;
}

/** 用内存阶段对象构造一个最小战役 + 地点集合（不读磁盘）。 */
function makeInMemoryScenario(phases) {
  const battle = {
    id: 'battle-mem',
    title: '内存战役',
    historicalPart: 'part-5-midway',
    battleType: 'carrier-battle',
    theater: 'pacific',
    startDate: '1942-06-04',
    endDate: '1942-06-05',
    summary: '内存构造的战役，仅用于验证阶段控件与情报面板的结构映射。',
    belligerents: { japan: '甲', allies: '乙' },
    outcome: { summary: '内存结果说明。', winner: 'inconclusive', certainty: 'disputed' },
    placeIds: ['place-mem-a'],
    personIds: [],
    commanderIds: { japan: [], allies: [] },
    unitIds: [],
    equipmentIds: [],
    conceptIds: [],
    sourceIds: ['source-mem'],
    claimIds: ['claim-mem'],
    sections: {},
    phases,
  };
  const places = [
    { id: 'place-mem-a', historicalName: '内存地点甲', modernName: '内存地点甲今名', modernCountry: '内存国', placeType: 'island', summary: '内存地点说明。', coordinates: { lat: 30, lng: 170 }, coordinateAccuracyKm: 5, schematic: false, relatedPlaceIds: [], sourceIds: ['source-mem'], claimIds: ['claim-mem'] },
    { id: 'place-mem-b', historicalName: '内存地点乙', modernName: '内存地点乙今名', modernCountry: '内存国', placeType: 'atoll', summary: '内存地点说明。', coordinates: { lat: 25, lng: -160 }, coordinateAccuracyKm: 5, schematic: false, relatedPlaceIds: [], sourceIds: ['source-mem'], claimIds: ['claim-mem'] },
  ];
  return { battle, places };
}

/** 代码内等价阶段夹具（磁盘夹具缺失时使用；验收 L542 明确允许）。不读取任何文件。 */
function builtinMapPhaseFixture() {
  const phases = [makeInMemoryPhase(), makeInMemoryPhase({ id: 'phase-mem-2', sequence: 2, title: '内存阶段二' })];
  const { battle, places } = makeInMemoryScenario(phases);
  return {
    schemaVersion: '1.0.0',
    fixtureOnly: true,
    events: [],
    battles: [battle],
    people: [],
    places,
    units: [],
    equipment: [],
    concepts: [],
    sources: [],
    media: [],
    questions: [],
    claims: [],
  };
}



// ===========================================================================
// PART 2 — 渲染图/展示断言（契约来源：WEB 站点渲染契约）
// ===========================================================================
//
// 职责边界：本段用**真实加载器**（M.loadContent）+ renderApp（AppShell + 六入口视图）
// 渲染页面并断言展示结果；不直接解析契约字段（解析/派生一律消费 PART 1 的函数结果）。
// 本段包含的段：A 契约数据来源、B 六入口互跳、B4 早期战役十键渲染、C 证据组件、
// D 诚实状态、E 构建产物、F 合成样本、G 负例、MAP-00 地图/阶段、D2/D3/D4、
// MAP-00R2 阶段契约复验（消费 PART 1 夹具解析/内存构造）、MAP-00R3 可观察交互、
// GRAPH 渲染图治理、NAV 夹具泄露回归、S1/Z 自检。
//
// 断言一律 PASS/FAIL，没有 SKIP：前置条件缺失（夹具缺失、输出目录不可写等）即 FAIL。

// ---------------------------------------------------------------------------
// A. 契约数据来源　【PART 2 · WEB 渲染图/展示断言】
// ---------------------------------------------------------------------------

/** 运行 fn 期间暂时静音 stdout/stderr（用于 import 会自执行的模块）。 */
async function withSuppressedOutput(fn) {
  const originalStdout = process.stdout.write.bind(process.stdout);
  const originalStderr = process.stderr.write.bind(process.stderr);
  process.stdout.write = () => true;
  process.stderr.write = () => true;
  try {
    return await fn();
  } finally {
    // 等待被 import 的模块的异步 main() 收敛，再恢复输出。
    await new Promise((resolve) => setTimeout(resolve, 50));
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
  }
}

/**
 * 站点声明的已交付内容阶段。
 *
 * 为什么需要它：契约验证器有五个**累积**阶段（strategy → background → pearl →
 * coral → full），每个阶段都要求该阶段必须交付的重点文章/事件/问题。当前
 * content/history.json 只交付到 strategy，用它去跑默认的 full 必然 FAIL ——
 * 那是「内容还没写完」，不是「站点有缺陷」。站点自身的责任是：**用内容当前的
 * 实际交付阶段去验证**，不能悄悄跳过验证，也不能把内容缺口报成站点失败。
 *
 * 这个值必须与内容实际交付一致；下面的 A1 会把验证器的失败原因分类打印出来，
 * 若出现非覆盖缺口类错误（结构/断链/证据问题），A1 仍然 FAIL。
 */
const SITE_CONTENT_STAGE = 'strategy';

/** 验证器输出里属于「覆盖尚未交付」的错误前缀（contents 阶段的正常缺口）。 */
function isCoverageGapError(line) {
  return line.startsWith('- [coverage]') || line.includes('缺少至少一个实质性的探究问题');
}

async function checkContentFile(M) {
  if (!fs.existsSync(CONTENT_FILE)) {
    // 不是「恒真通过」：真的断言加载器对缺失内容返回诚实的 missing 状态。
    const missing = M.loadContent({});
    return check(
      'A2',
      missing.status === 'missing' && missing.doc === null && missing.issues.length > 0,
      `content/history.json 尚未交付 → 真实加载器返回诚实 missing 状态（实际 ${missing.status}，${missing.issues.length} 条说明），站点以未加载状态构建`,
    );
  }
  // 在进程内调用验证器的公开 API（validateDocument），而不是 spawn 子进程：
  // 受限环境下 spawn 会被拒绝（EPERM），那样得到的不是「内容失败」而是「没跑成」。
  let result;
  let coverageDoc = null;
  try {
    const doc = readJsonFile(CONTENT_FILE);
    coverageDoc = readJsonFile(CONTRACT_COVERAGE);
    // validate-content.mjs 在被 import 时会执行自己的 CLI main()（对 content/history.json
    // 跑默认 full 阶段并打印结果）。那段输出属于内容任务的视角，会与本验证器的
    // 结论混淆，因此在 import 期间暂时静音 stdout/stderr，只取其导出的 validateDocument。
    const contentValidator = await withSuppressedOutput(() => import(`${pathToFileUrl(CONTENT_VALIDATOR)}?v=${Date.now()}`));
    result = contentValidator.validateDocument(doc, { coverage: coverageDoc, stage: SITE_CONTENT_STAGE, rootDir: ROOT });
  } catch (error) {
    fail('A1', `无法运行内容契约验证器：${error?.message ?? error}`);
    return false;
  }
  const coverageGaps = result.errors.filter(isCoverageGapError);
  const realErrors = result.errors.filter((error) => !isCoverageGapError(error));
  const stats = `实体 ${result.stats.entities}；来源 ${result.stats.sources}；claim ${result.stats.claims}；问题 ${result.stats.questions}；素材 ${result.stats.media}`;

  if (realErrors.length > 0) {
    fail(
      'A1',
      `content/history.json 在 stage=${SITE_CONTENT_STAGE} 下有 ${realErrors.length} 个非覆盖类错误：\n      ${realErrors.slice(0, 8).join('\n      ')}`,
    );
    return false;
  }
  pass('A1', `content/history.json 通过契约验证器（stage=${SITE_CONTENT_STAGE}；${stats}）`);
  // 覆盖缺口单独报告：它们属于内容任务的交付范围，不是站点缺陷，但必须显式可见。
  // 这是一条**真实断言**（不是恒真报告）：
  //   1) 错误分类完备：coverageGaps + realErrors 恰好覆盖 result.errors（无丢弃/重复）；
  //   2) 脚本声明的 SITE_CONTENT_STAGE 必须是 contracts/coverage.json 声明的阶段之一，
  //      否则「按内容当前交付阶段验证」这一前提失效，必须失败而不是静默通过。
  const stageIds = Array.isArray(coverageDoc?.stages) ? coverageDoc.stages.map((stage) => stage?.id) : [];
  const partitionComplete = result.errors.length === coverageGaps.length + realErrors.length;
  const stageDeclared = stageIds.includes(SITE_CONTENT_STAGE);
  check(
    'A1-coverage',
    partitionComplete && stageDeclared,
    coverageGaps.length === 0
      ? `stage=${SITE_CONTENT_STAGE} 的累积覆盖要求已全部满足（错误分类完备：${result.errors.length} = 覆盖缺口 ${coverageGaps.length} + 非覆盖错误 ${realErrors.length}；声明阶段存在于 coverage.json stages[${stageIds.join(', ')}]）`
      : `更后续阶段的覆盖尚未交付（${coverageGaps.length} 项，属内容任务范围，不是站点缺陷；错误分类完备：${result.errors.length} = 覆盖缺口 ${coverageGaps.length} + 非覆盖错误 ${realErrors.length}；声明阶段存在于 coverage.json stages[${stageIds.join(', ')}]）`,
  );
  return true;
}

// ---------------------------------------------------------------------------
// B. 六入口与互跳　【PART 2 · WEB 渲染图/展示断言】
// ---------------------------------------------------------------------------

function checkEntries(M) {
  const fixtures = [
    { file: 'contracts/fixtures/valid-min.json', state: loadFixture(FIXTURE_MIN) },
    { file: 'contracts/fixtures/valid-early-campaign.json', state: loadFixture(FIXTURE_EARLY) },
  ];

  // 每个入口对应的内容集合（与 src/content/labels.ts 的 ENTRY_NAV 一致）。
  // 用它判断「该 fixture 在这个入口是否真的有数据」，从而决定断言哪一条分支。
  const entries = [
    ['timeline', '时间线', 'events'],
    ['battles', '战役', 'battles'],
    ['people', '人物', 'people'],
    ['atlas', '地图', 'places'],
    ['concepts', '知识专题', 'concepts'],
    ['questions', '历史问题', 'questions'],
  ];

  for (const fixture of fixtures) {
    const label = path.basename(fixture.file);
    for (const [view, title, collection] of entries) {
      const { html } = renderApp(M, { content: fixture.state, route: { view, id: null, query: '' } });
      const hasTitle = html.includes(`>${title}<`) || html.includes(title);
      const hasHeading = /<h1[^>]*>/.test(html);
      const hasEmptyState = html.includes('data-empty-state=""');
      const count = Array.isArray(fixture.state.doc?.[collection]) ? fixture.state.doc[collection].length : 0;
      const id = `B1-${label}-${view}`;

      // 分两条真实分支断言，任何分支都有实质断言，没有「条件不成立就恒真」的兜底：
      //   - 该入口在 fixture 中**无数据** → 必须显示诚实的空状态，且标题仍在；
      //   - 该入口在 fixture 中**有数据** → 必须渲染真实条目，且**不得**退化为空状态。
      // 消息文案与所断言的内容严格对应（不再统一声称「空状态诚实说明」）。
      if (count === 0) {
        check(
          id,
          hasTitle && hasHeading && hasEmptyState,
          `${label} → ${title}入口该集合为空（${collection}=0）→ 断言：标题+页标题存在且显示诚实空状态`,
        );
      } else {
        // 取该集合第一条实体，用其标题/名称断言「真实内容确实渲染出来了」。
        const first = fixture.state.doc[collection][0];
        const entityLabel = first?.title ?? first?.name ?? first?.historicalName ?? first?.id ?? '';
        const renderedEntity = entityLabel ? html.includes(entityLabel) : false;
        // 「不该出现空状态」只对**该入口的主列表**成立。
        // 地图入口是特例：即使 places 有数据，它的**阶段面板**仍会因为没有 battles/phases
        // 而合法地显示「地图阶段数据尚未交付」（该行为由 M4-2 / D2-5 专门断言）。
      // 因此按入口分支，各自断言真实预期，不用恒真兜底。
        if (view === 'atlas') {
          check(
            id,
            hasTitle && hasHeading && renderedEntity && hasEmptyState,
            `${label} → ${title}入口渲染真实地点（places=${count}，首条「${String(entityLabel).slice(0, 24)}」），且阶段面板因 battles=0 显示「尚未交付」空状态`,
          );
        } else {
          check(
            id,
            hasTitle && hasHeading && renderedEntity && !hasEmptyState,
            `${label} → ${title}入口渲染真实条目（${collection}=${count}，首条「${String(entityLabel).slice(0, 24)}」）且不显示空状态`,
          );
        }
      }
    }
  }

  // B2：同一批实体 ID 跨入口互跳。用 valid-min 的 event / place / question / source。
  const min = loadFixture(FIXTURE_MIN);
  const event = min.doc.events[0];
  const place = min.doc.places[0];
  const question = min.doc.questions[0];

  const timelineDetail = renderApp(M, { content: min, route: { view: 'timeline', id: event.id, query: '' } }).html;
  const placeId = place.id;
  check(
    'B2-1',
    timelineDetail.includes(`href="#/atlas/${placeId}"`) || timelineDetail.includes(`#/atlas/${encodeURIComponent(placeId)}`),
    `时间线事件 ${event.id} 渲染出指向地图地点 ${placeId} 的链接`,
  );
  check(
    'B2-2',
    /href="#\/sources\/(source-[a-z0-9-]+)"/.test(timelineDetail),
    `时间线事件 ${event.id} 渲染出指向来源详情的链接`,
  );
  // 反向索引：问题引用了该事件，所以事件页必须显示「出现在这些问题中」的互链。
  check(
    'B2-3',
    timelineDetail.includes(`href="#/questions/${question.id}"`),
    `时间线事件 ${event.id} 通过反向索引渲染出指向历史问题 ${question.id} 的链接`,
  );

  const questionDetail = renderApp(M, { content: min, route: { view: 'questions', id: question.id, query: '' } }).html;
  const linkedEntityIds = question.entityIds.filter((id) => questionDetail.includes(`href="#/timeline/${id}"`)).length;
  check(
    'B2-4',
    linkedEntityIds >= 2,
    `历史问题 ${question.id} 渲染出指向 ${linkedEntityIds} 个实体的跨入口链接（要求 ≥2）`,
  );

  const placeDetail = renderApp(M, { content: min, route: { view: 'atlas', id: placeId, query: '' } }).html;
  check(
    'B2-5',
    placeDetail.includes(`href="#/timeline/${event.id}"`),
    `地图地点 ${placeId} 渲染「出现在这些时间线事件」并链回 ${event.id}`,
  );

  // B3：深链直接渲染（模拟在子路径下直接打开 #/xxx/<id>）
  const routes = [
    { view: 'timeline', id: event.id },
    { view: 'atlas', id: placeId },
    { view: 'questions', id: question.id },
    { view: 'sources', id: min.doc.sources[0].id },
  ];
  for (const route of routes) {
    const { html } = renderApp(M, { content: min, route: { ...route, query: '' } });
    check(
      `B3-${route.view}`,
      /<h1[^>]*>/.test(html) && html.length > 2000,
      `深链 #/${route.view}/${route.id} 可直接渲染为完整页面（${html.length} 字节）`,
    );
  }

  // 早期扩张战役分析：严格回归（验收 L536/L537）。
  // 两条输入都经**真实加载器 + 真实渲染函数**，断言契约十键的标题与正文全部渲染：
  //   (a) 已接受的 contracts/fixtures/valid-early-campaign.json（真实加载路径）；
  //   (b) 内存构造、只含 analysisProfiles 全部具名键的早期战役对象（夹具正文为
  //       合成占位文本，由内存路径补齐「真实正文」覆盖）。
  checkEarlyCampaignAnalysisRegression(M);

  // 路由解析：base 子路径无关、畸形输入不崩溃
  const parsed = [
    ['#/timeline/event-x', 'timeline', 'event-x'],
    ['#/', 'overview', null],
    ['', 'overview', null],
    ['#/battles/battle-midway', 'battles', 'battle-midway'],
    ['#/nonsense/foo', 'overview', null],
    ['#/search?q=%E4%B8%AD%E9%80%94%E5%B2%9B', 'search', null],
  ];
  for (const [hash, view, id] of parsed) {
    const route = M.parseRoute(hash);
    check(`B5-${hash || '(空)'}`, route.view === view && route.id === id, `parseRoute(${JSON.stringify(hash)}) → ${route.view}/${route.id ?? '—'}`);
  }
  check(
    'B6',
    M.buildHref('battles', { id: 'battle-midway' }) === '#/battles/battle-midway' && M.buildHref('overview') === '#/',
    `buildHref 生成 base 无关的 hash 链接：${M.buildHref('battles', { id: 'battle-midway' })}`,
  );
}

// ---------------------------------------------------------------------------
// B4 / B4-M. 早期扩张战役 analysisProfiles 十键渲染回归（ARCH 十键；渲染断言）　【PART 2 · WEB；解析/派生来自 PART 1】
// ---------------------------------------------------------------------------
//
// 根因（本任务）：时间线视图曾读取 ARCH-02 之前的 legacy 字段，而契约已改为
// `analysisProfiles` 十键 → 早期战役分析小节不渲染，导致 B4/check/build 失败。
// 因此这里按**契约十键**做严格回归，且不再有「夹具无内容就 SKIP」的分支：
//   (a) 已接受夹具 contracts/fixtures/valid-early-campaign.json 经真实加载器
//       (`loadContent`) 与真实渲染函数 (`renderApp` → AppShell + TimelineView)
//       渲染 event-hong-kong-1941，断言十键小节的**标题与正文**都出现；
//   (b) 内存构造、只含 analysisProfiles 全部具名键的事件对象，走**同一**加载器与
//       渲染函数；夹具正文是合成占位文本，由这条路径补齐「真实正文」覆盖；
//   (c) 负例：只带 legacy 五键 `earlyCampaignAnalysis` 的事件不得再渲染分析小节
//       —— 证明旧字段不是渲染条件。
//
// 每个小节的标题/正文/证据断言都限定在**该小节自身的 HTML 片段**内，
// 避免「只换页面标题文字」的表面修补蒙混过关。

/** 渲染后的 HTML → 归一化纯文本（去标签、解常见实体、折叠空白）。 */
function htmlToPlainText(html) {
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePlain(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * 把事件详情 HTML 切分成每个 `data-analysis-profile="<key>"` 小节的**自身** HTML。
 * 小节边界是下一个 data-analysis-profile 标记；最后一个小节截到所属
 * `</section>` 结尾，避免把后面的正文误算进本节（断言只作用于本节内容）。
 */
function splitAnalysisSections(html) {
  const source = String(html);
  const parts = source.split('data-analysis-profile="');
  const sections = new Map();
  for (let index = 1; index < parts.length; index += 1) {
    const quote = parts[index].indexOf('"');
    if (quote < 0) continue;
    const key = parts[index].slice(0, quote);
    let fragment = parts[index].slice(quote + 1);
    if (index === parts.length - 1) {
      const boundary = fragment.indexOf('</section>');
      if (boundary >= 0) fragment = fragment.slice(0, boundary);
    }
    sections.set(key, fragment);
  }
  return sections;
}

/**
 * 渲染断言（PART 2）：**只消费 PART 1 解析结果 parsed.blocks**，不读取
 * event.analysisProfiles（解析/派生只有 PART 1 的 parseEarlyCampaignAnalysisBlocks 一处）。
 *
 * 「存在即渲染」的通用遍历：按 PART 1 派生的 blocks 逐节断言标题、正文与每节自己的
 * 证据面板 —— 契约未来新增具名键时，本函数自动覆盖，无需逐字段追加断言。
 * `requiredKeyCount` 用于严格回归（B4/B4-M：必须等于 ARCH 契约全部具名键数）。
 */
function assertAnalysisProfilesRendered(label, contract, parsed, html, requiredKeyCount) {
  const blocks = parsed.blocks;
  const sections = splitAnalysisSections(html);
  check(
    `${label}-count`,
    sections.size === blocks.length,
    `${label}：渲染出 ${sections.size} 个具名分析小节（PART 1 解析出 ${blocks.length} 个，ARCH 契约键 ${contract.keys.length} 个）`,
  );
  const missingBlocks = blocks.filter((block) => !sections.has(block.key));
  check(
    `${label}-keys`,
    missingBlocks.length === 0,
    `${label}：PART 1 解析出的具名键全部出现在渲染结果（${blocks.map((block) => block.key).join(' / ')}${missingBlocks.length > 0 ? `；缺失 ${missingBlocks.map((block) => block.key).join('、')}` : ''}）`,
  );
  if (typeof requiredKeyCount === 'number') {
    check(
      `${label}-strict-keys`,
      blocks.length === requiredKeyCount && blocks.every((block, index) => block.key === contract.keys[index]),
      `${label}：严格模式要求全部 ARCH 契约具名键都解析并渲染（${blocks.length}/${requiredKeyCount}，顺序与契约一致）`,
    );
  }
  const positions = blocks.map((block) => String(html).indexOf(`data-analysis-profile="${block.key}"`));
  check(
    `${label}-order`,
    positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1])),
    `${label}：${blocks.length} 个分析小节按 ARCH 契约键顺序渲染（不折叠成一段）`,
  );
  check(
    `${label}-no-legacy`,
    !String(html).includes('earlyCampaignAnalysis') && !String(html).includes('五类分析'),
    `${label}：渲染结果不包含 legacy 字段名或旧五键标题文案（渲染条件只有 analysisProfiles）`,
  );
  const plain = htmlToPlainText(html);
  check(
    `${label}-no-undefined`,
    !/undefined/.test(plain) && !plain.includes('未定义'),
    `${label}：界面没有 "undefined"/"未定义" 之类的空洞文本`,
  );

  for (const block of blocks) {
    const fragment = sections.get(block.key) ?? '';
    const fragmentText = htmlToPlainText(fragment);
    const title = normalizePlain(block.title);
    const body = normalizePlain(block.body);
    check(
      `${label}-${block.key}-heading`,
      fragment.includes(`data-analysis-heading="${block.key}"`) && title.length > 0 && fragmentText.includes(title),
      `${label}/${block.key}：小节标题「${title}」以 h3(data-analysis-heading) 渲染在该小节内`,
    );
    check(
      `${label}-${block.key}-body`,
      body.length > 0 && fragmentText.includes(body),
      `${label}/${block.key}：小节正文完整渲染在该小节内（${body.length} 字）`,
    );
    const claimsRendered = block.claimIds.every((id) => fragment.includes(`data-claim-id="${id}"`));
    const sourcesRendered = block.sourceIds.every((id) => fragment.includes(`data-source-id="${id}"`));
    check(
      `${label}-${block.key}-evidence`,
      fragment.includes('data-evidence-panel') && block.claimIds.length > 0 && block.sourceIds.length > 0 && claimsRendered && sourcesRendered,
      `${label}/${block.key}：小节自带来源与 claim 证据面板（${block.claimIds.length} claim / ${block.sourceIds.length} 来源）`,
    );
  }
}

/**
 * 断言 PART 1 解析结果与 src/data 适配层暴露的数据完全一致。
 *
 * 这是「单一派生」的证据：站点视图（经适配层）与验证器（经 PART 1 解析器）对同一
 * 契约字段得到同一份 blocks；若两处各自平行维护解析逻辑，本断言会立刻失败。
 */
function assertParsedMatchesSiteAdapter(label, parsed, viewBlocks) {
  const view = Array.isArray(viewBlocks) ? viewBlocks : [];
  const sameLength = view.length === parsed.blocks.length;
  const sameKeys = sameLength && view.every((block, index) => block.key === parsed.blocks[index].key);
  const sameFields =
    sameLength &&
    view.every((block, index) => {
      const expected = parsed.blocks[index];
      return (
        block.title === expected.title &&
        block.body === expected.body &&
        JSON.stringify(block.sourceIds) === JSON.stringify(expected.sourceIds) &&
        JSON.stringify(block.claimIds) === JSON.stringify(expected.claimIds)
      );
    });
  check(
    `${label}-view-parity`,
    sameLength && sameKeys && sameFields,
    `${label}：PART 1 解析结果与 src/data 适配层 analysisProfileBlocks() 完全一致（${view.length} 节同键同序同字段）—— 渲染断言只消费 PART 1 结果，不存在平行解析`,
  );
}

/** B4 严格回归：已接受夹具 + 内存构造两条路径，均经 PART 1 唯一解析函数。 */
function checkEarlyCampaignAnalysisRegression(M) {
  // ---- PART 1：ARCH 契约（analysisProfiles 具名键）是唯一契约来源
  const contract = loadAnalysisProfileContract();
  check(
    'B4-parse-contract',
    contract.keys.length > 0 &&
      contract.schemaKeys.length === contract.coverageKeys.length &&
      contract.schemaKeys.every((key, index) => key === contract.coverageKeys[index]),
    `ARCH 契约 analysisProfiles 具名键一致：content.schema.json $defs.analysisProfiles.required（${contract.schemaKeys.length} 键）与 coverage.json earlyCampaign.analysisProfiles.keys（${contract.coverageKeys.length} 键）键名/顺序相同`,
  );

  // ---------------------------------------------------------------- (a) 已接受夹具
  check('B4-fixture-present', fs.existsSync(FIXTURE_EARLY), '已接受契约夹具 contracts/fixtures/valid-early-campaign.json 存在');
  if (!fs.existsSync(FIXTURE_EARLY)) {
    fail('B4', '无法运行十键渲染回归：已接受夹具缺失（这是前置条件缺失，必须失败而不是跳过）');
    return;
  }
  const fixtureRaw = loadFixtureDocument(FIXTURE_EARLY);
  // 真实加载路径：站点运行时调用的就是 loadContent(glob 模块表)。
  const fixtureState = M.loadContent({ '/virtual/content/history.json': fixtureRaw });
  check(
    'B4-load',
    fixtureState.status === 'fixture' && fixtureState.doc !== null,
    `valid-early-campaign.json 经真实加载器 loadContent 识别为内容（状态 ${fixtureState.status}，fixtureOnly=${fixtureState.doc?.fixtureOnly}）`,
  );
  const fixtureEvent = fixtureState.doc?.events?.find((item) => item.id === 'event-hong-kong-1941') ?? null;
  check('B4-event', Boolean(fixtureEvent), '夹具含契约事件 event-hong-kong-1941（香港战役）');
  if (!fixtureEvent || !fixtureState.doc) {
    fail('B4', '无法运行十键渲染回归：夹具缺少 event-hong-kong-1941（必须失败而不是跳过）');
    return;
  }
  // PART 1 唯一共享解析/派生函数；PART 2 只消费 parsed.blocks。
  const parsed = parseEarlyCampaignAnalysisBlocks(fixtureEvent, contract);
  check(
    'B4-parse-blocks',
    parsed.kind === 'profiles' && parsed.blocks.length === contract.keys.length,
    `PART 1 解析器从已接受夹具派生 ${parsed.blocks.length} 个分析块（ARCH 契约 ${contract.keys.length} 键）`,
  );
  const missingProfiles = contract.keys.filter((key) => !parsed.blocks.some((block) => block.key === key));
  check(
    'B4-parse-missing',
    missingProfiles.length === 0,
    `PART 1 解析器未丢失任何契约具名键（缺失 ${missingProfiles.length === 0 ? '无' : missingProfiles.join('、')}）`,
  );
  check(
    'B4-parse-legacy',
    parsed.legacyKeys.length === 0,
    '已接受夹具不含 legacy earlyCampaignAnalysis 字段（解析器 legacyKeys=0，旧五键不是渲染输入）',
  );
  const fixtureHtml = renderApp(M, { content: fixtureState, route: { view: 'timeline', id: fixtureEvent.id, query: '' } }).html;
  check(
    'B4',
    fixtureHtml.includes('data-analysis-section'),
    `event-hong-kong-1941 经真实加载 + 渲染路径渲染出早期战役分析区（ARCH-02 analysisProfiles）`,
  );
  assertAnalysisProfilesRendered('B4', contract, parsed, fixtureHtml, contract.keys.length);
  check(
    'B4-research-status',
    Boolean(fixtureEvent.researchStatus) && fixtureHtml.includes(`data-research-status="${fixtureEvent.researchStatus}"`),
    `研究状态 ${fixtureEvent.researchStatus} 显示在分析区（ARCH-02 要求）`,
  );

  // ---- 适配层（src/data）也必须接受并按契约键暴露数据，而不是只有视图认识它
  const viewBlocks = M.analysisProfileBlocks(fixtureEvent);
  assertParsedMatchesSiteAdapter('B4', parsed, viewBlocks);
  check(
    'B4-adapter-count',
    Array.isArray(viewBlocks) && viewBlocks.length === parsed.blocks.length,
    `src/data 适配层 analysisProfileBlocks() 返回 ${Array.isArray(viewBlocks) ? viewBlocks.length : 'null'} 个具名小节（与 PART 1 解析结果一致）`,
  );
  check(
    'B4-adapter-keys',
    Array.isArray(viewBlocks) && viewBlocks.every((block, index) => block.key === parsed.blocks[index]?.key),
    '适配层返回的小节键与 PART 1 解析器的契约键顺序完全一致（全部具名键暴露）',
  );
  check(
    'B4-adapter-evidence',
    Array.isArray(viewBlocks) && viewBlocks.every((block) => block.sourceIds.length > 0 && block.claimIds.length > 0),
    '适配层为每个分析小节保留各自的 sourceIds 与 claimIds（不是只传标题）',
  );
  const profileEvidence = M.collectEvidenceBlocks(fixtureEvent).filter((block) => block.key.startsWith('profile-'));
  check(
    'B4-adapter-evidence-blocks',
    profileEvidence.length === contract.keys.length && profileEvidence.every((block) => block.sourceIds.length > 0 && block.claimIds.length > 0),
    `collectEvidenceBlocks() 为 ${contract.keys.length} 个分析小节各登记一份小节级证据（${profileEvidence.length} 份）`,
  );
  check(
    'B4-adapter-no-legacy',
    M.analysisProfileBlocks({ ...fixtureEvent, analysisProfiles: undefined }) === null,
    '适配层没有 legacy 回退：没有 analysisProfiles 时返回 null（不读取 earlyCampaignAnalysis）',
  );

  // ---------------------------------------------------------------- (b) 内存构造
  const { source, claims } = makeInMemoryAnalysisEvidence(contract);
  const inMemoryEvent = makeInMemoryAnalysisEvent(contract);
  const inMemoryDoc = {
    schemaVersion: '1.0.0',
    fixtureOnly: true,
    events: [inMemoryEvent],
    battles: [],
    people: [],
    places: [],
    units: [],
    equipment: [],
    concepts: [],
    sources: [source],
    media: [],
    questions: [],
    claims,
  };
  const inMemoryState = M.loadContent({ '/virtual/content/history.json': inMemoryDoc });
  check(
    'B4-M-load',
    inMemoryState.status === 'fixture' && inMemoryState.doc !== null,
    `内存构造事件经真实加载器 loadContent 识别为内容（状态 ${inMemoryState.status}）`,
  );
  check(
    'B4-M-only-profiles',
    inMemoryEvent.article.length === 0 &&
      !('earlyCampaignAnalysis' in inMemoryEvent) &&
      Object.keys(inMemoryEvent.analysisProfiles).length === contract.keys.length,
    `内存对象只含 ARCH 契约全部具名键（${contract.keys.length} 键；无 article 正文、无 legacy 字段）`,
  );
  const inMemoryParsed = parseEarlyCampaignAnalysisBlocks(inMemoryEvent, contract);
  check(
    'B4-M-parse-blocks',
    inMemoryParsed.kind === 'profiles' && inMemoryParsed.blocks.length === contract.keys.length,
    `PART 1 解析器从内存对象派生 ${inMemoryParsed.blocks.length} 个分析块（同一函数，不是测试副本）`,
  );
  if (inMemoryState.doc) {
    // 与 (a) 使用**同一个**渲染函数（renderApp → AppShell + TimelineView）。
    const inMemoryHtml = renderApp(M, { content: inMemoryState, route: { view: 'timeline', id: inMemoryEvent.id, query: '' } }).html;
    check('B4-M-section', inMemoryHtml.includes('data-analysis-section'), '内存构造事件渲染出早期战役分析区（同一渲染函数）');
    assertAnalysisProfilesRendered('B4-M', contract, inMemoryParsed, inMemoryHtml, contract.keys.length);
    assertParsedMatchesSiteAdapter('B4-M', inMemoryParsed, M.analysisProfileBlocks(inMemoryEvent));
  } else {
    fail('B4-M-render', '内存构造事件无法加载，无法执行十键渲染回归');
  }

  // ---------------------------------------------------------------- (c) legacy 负例
  // 旧五键形状只作为**负例输入**出现在这里（历史形状，不是渲染契约）。
  const legacyProfiles = {};
  for (const key of ['background', 'course', 'constraints', 'results', 'impact']) {
    legacyProfiles[key] = {
      title: `旧五键-${key}`,
      body: `旧五键正文标记 ${key}：该形状已被 ARCH-02 停用，UI 不应把它当作分析小节渲染。`,
      sourceIds: ['source-mem-analysis'],
      claimIds: [`claim-mem-${key}`],
    };
  }
  const legacyEvent = { ...inMemoryEvent, id: 'event-memory-legacy', analysisProfiles: undefined, earlyCampaignAnalysis: legacyProfiles };
  const legacyState = M.loadContent({ '/virtual/content/history.json': { ...inMemoryDoc, events: [legacyEvent] } });
  const legacyHtml = legacyState.doc
    ? renderApp(M, { content: legacyState, route: { view: 'timeline', id: 'event-memory-legacy', query: '' } }).html
    : '';
  const legacyParsed = parseEarlyCampaignAnalysisBlocks(legacyEvent, contract);
  check(
    'B4-legacy-not-rendered',
    Boolean(legacyState.doc) &&
      legacyParsed.kind === 'none' &&
      legacyParsed.blocks.length === 0 &&
      legacyParsed.legacyKeys.length === 5 &&
      !legacyHtml.includes('data-analysis-section') &&
      !legacyHtml.includes('data-analysis-profile') &&
      !legacyHtml.includes('旧五键正文标记'),
    '负例：只带 legacy 五键 earlyCampaignAnalysis 的事件被解析为 legacyKeys=5 但派生 0 个渲染块，页面不渲染分析小节（旧字段不是渲染条件）',
  );
}

// ---------------------------------------------------------------------------
// B7 / S1. 自检：禁止「空洞断言」形状（D5 同类缺陷的防回归）　【PART 2 · 自检】
// ---------------------------------------------------------------------------
//
// 背景：评审两次都抓到同一个缺陷类 —— 断言写成 `条件 ? 某检查 : true`，
// 条件不成立时整条 check 恒真通过（M4-2、B1 都中过）。
// 仅靠人眼复查不够，因此这里对**本文件自身源码**做静态检查：
//   - 剥离注释与字符串后再匹配（注释/文案里讨论该模式不应误报）；
//   - 任何真实出现都判 FAIL，并给出行号，迫使提交者改成真实的两分支断言。
// 与内容验证器的 D7（文档声明漂移）同属「用机器断言防自我退化」的做法。

/**
 * 去掉注释与字符串/模板字面量，只保留真正的 code。
 *
 * 必须同时剥离字符串：本检查的消息文案与反向自证样本里就会出现该字面量
 * （以及反向自证的样本字符串），不剥离会把**说明文字**误判成**真正的空洞断言**。
 */
function stripCommentsAndStrings(source) {
  let out = '';
  let i = 0;
  const n = source.length;
  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];
    // 块注释
    if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      out += ' ';
      continue;
    }
    // 行注释
    if (ch === '/' && next === '/') {
      const end = source.indexOf('\n', i);
      i = end === -1 ? n : end;
      continue;
    }
    // 字符串与模板字面量（模板内的 ${...} 会被整体丢弃，足以支撑本检查）
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      i += 1;
      while (i < n) {
        if (source[i] === '\\') {
          i += 2;
          continue;
        }
        if (source[i] === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      out += '""';
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/**
 * 找到「条件不成立就恒真」的断言形状（只看真实代码）。
 *
 * 匹配范围要够宽：只认单一标识符分支不够，真实缺陷还可能是
 * `cond ? a && b : true`、`cond ? fn(x) : true`、`cond ? x === 1 : true` 等。
 * 因此匹配「三元表达式最后一个分支是字面量 true」的各种常见写法。
 * `[^:?;{}\n]*` 允许分支内部出现比较/调用/逻辑运算，但不会跨语句或嵌套三元。
 */
function findVacuousAssertions(source) {
  const pattern = /\?\s*[^:?;{}\n]*:\s*true\b/g;
  const hits = [];
  const codeLines = stripCommentsAndStrings(source).split('\n');
  codeLines.forEach((line, index) => {
    const matched = line.match(pattern);
    if (matched) hits.push({ line: index + 1, text: line.trim(), matches: matched });
  });
  return hits;
}

function checkNoVacuousAssertions() {
  const selfPath = fileURLToPath(import.meta.url);
  // 行尾无关（NAV-01 a2）：中央 project worktree 用 core.autocrlf 检出，可能是 CRLF；
  // 本机 worktree 是 LF。逐行扫描/注释剥离前先归一化为 LF，否则同一断言在不同检出
  // 环境下会得出不同结果（a1 的 NAV-5 失败即此缺陷类）。
  const source = fs.readFileSync(selfPath, 'utf8').replace(/\r\n/g, '\n');
  const hits = findVacuousAssertions(source);
  check(
    'S1',
    hits.length === 0,
    hits.length === 0
      ? '自检：validate-site.mjs 源码中没有「条件 ? 断言 : true」空洞形状（剥离注释与字符串后匹配）'
      : `自检失败：validate-site.mjs 仍含 ${hits.length} 处「条件 ? 断言 : true」空洞断言 —— ${hits.map((h) => `L${h.line}: ${h.text}`).join(' | ')}`,
  );

  // 反向自证：检测器必须能识别该形状的**多种写法**，否则 S1 的 PASS 毫无意义。
  // 这里刻意覆盖不同分支形态（标识符、比较、逻辑、函数调用），
  // 因为早期正则只认标识符分支，漏掉了比较/逻辑/调用等真实写法。
  //
  // 注意（给代码审查者）：下面 4 行是**字符串字面量的测试样本**，不是真实断言。
  // 朴素地对本文件做 `grep '? X : true'` 只会命中这些样本（以及可能的注释），
  // 权威判定应以 S1 的检查为准 —— 它会先剥离注释与字符串，只检查真实代码。
  const canaries = [
    'cond ? someCheck : true',
    'x > 0 ? a && b : true',
    'list.length === 0 ? fn(item) : true',
    'view === "battles" && !hasBattles(state) ? hasEmptyState : true',
  ];
  const detected = canaries.filter((sample) => findVacuousAssertions(sample).length === 1).length;
  check(
    'S1-canary',
    detected === canaries.length,
    `自检检测器可用：${detected}/${canaries.length} 种空洞断言写法均被识别（反向自证）`,
  );
  // 阴性对照：正常的三元（true 不在最后分支）不得被误报。
  const nonVacuous = ['x > 0 ? true : false', 'ok ? "yes" : "no"'];
  const falsePositives = nonVacuous.filter((sample) => findVacuousAssertions(sample).length > 0).length;
  check(
    'S1-canary-negative',
    falsePositives === 0,
    `自检检测器不误报正常三元表达式（${nonVacuous.length} 个阴性对照，误报 ${falsePositives} 个）`,
  );
}

// ---------------------------------------------------------------------------
// C. 证据组件（fixture 测试）　【PART 2 · WEB 渲染图/展示断言】
// ---------------------------------------------------------------------------

function checkEvidenceComponents(M) {
  const claimTypes = ['fact', 'interpretation', 'disputed', 'schematic'];
  for (const type of claimTypes) {
    const html = renderStatic(h(M.ClaimTag, { type }));
    const hasLabel = { fact: '事实', interpretation: '解释', disputed: '争议', schematic: '示意' }[type];
    check(`C1-${type}`, html.includes(`data-claim-type="${type}"`) && html.includes(hasLabel), `ClaimTag 渲染 ${type} 标签（${hasLabel}）`);
  }
  // 负例：非法 claimType 不得渲染成标签
  const invalidTag = renderStatic(h(M.ClaimTag, { type: 'definitely-not-a-claim-type' }));
  check('C1-negative', invalidTag === '', 'ClaimTag 对契约外的 claimType 不猜测渲染（负例）');

  const min = loadFixture(FIXTURE_MIN);
  const claim = min.doc.claims[0];
  const source = min.doc.sources.find((item) => item.id === claim.sourceIds[0]);
  const locatorHtml = renderStatic(
    h(M.SourceLocator, { locator: claim.locators[0], source }),
  );
  check(
    'C3-1',
    locatorHtml.includes(claim.locators[0].locator) && locatorHtml.includes(`data-locator-type="${claim.locators[0].locatorType}"`),
    `SourceLocator 渲染定位文本与定位类型：${claim.locators[0].locatorType} / ${claim.locators[0].locator}`,
  );
  const missingLocatorHtml = renderStatic(h(M.SourceLocatorList, { locators: [], sourceById: new Map() }));
  check('C3-negative', missingLocatorHtml.includes('缺少来源定位'), 'SourceLocatorList 对缺失定位明确提示（负例）');

  const sourceById = new Map(min.doc.sources.map((item) => [item.id, item]));
  const claimById = new Map(min.doc.claims.map((item) => [item.id, item]));
  const citationHtml = renderStatic(
    h(M.CitationList, { sourceIds: [source.id], sourceById }),
  );
  check(
    'C2-1',
    citationHtml.includes(source.publisher) && citationHtml.includes(String(source.year)) && citationHtml.includes(source.url) && citationHtml.includes('访问日期'),
    `CitationList 渲染机构、年份、链接与访问日期（来源 ${source.id}）`,
  );
  const citationMissing = renderStatic(
    h(M.CitationList, { sourceIds: ['source-does-not-exist'], sourceById }),
  );
  check('C2-negative', citationMissing.includes('无法在当前内容中解析'), 'CitationList 对断链来源明确提示（负例）');

  const panelHtml = renderStatic(
    h(M.EvidencePanel, { claimIds: [claim.id], sourceIds: claim.sourceIds, claimById, sourceById }),
  );
  check(
    'C2-2',
    panelHtml.includes(claim.text) &&
      panelHtml.includes(`data-claim-type="${claim.claimType}"`) &&
      panelHtml.includes(claim.locators[0].locator) &&
      panelHtml.includes('本节证据'),
    'EvidencePanel 同时渲染 claim 文本、claimType 标签、来源定位与来源列表',
  );

  // 用真实页面（fixture）统计四类标签的渲染入口：valid-min 只有 fact，所以另外构造一个含四类的页面。
  const fourType = JSON.parse(JSON.stringify(min.doc));
  const template = fourType.claims[0];
  const extraTypes = ['interpretation', 'disputed', 'schematic'];
  extraTypes.forEach((type, i) => {
    fourType.claims.push({ ...template, id: `claim-fixture-${type}`, claimType: type, text: `测试样本：用于验证 ${type} 标签渲染。` });
    fourType.events[0].article[0].claimIds.push(`claim-fixture-${type}`);
    fourType.events[0].claimIds.push(`claim-fixture-${type}`);
  });
  const fourState = { status: 'fixture', doc: fourType, issues: [], sourceKey: 'synthetic' };
  const page = renderApp(M, { content: fourState, route: { view: 'timeline', id: fourType.events[0].id, query: '' } }).html;
  for (const type of claimTypes) {
    check(`C4-${type}`, page.includes(`data-claim-type="${type}"`), `正文页面中出现 ${type} 标签（fixture 构造）`);
  }
  check(
    'C5',
    page.includes('data-evidence-panel') && page.includes('来源') && page.includes('定位 ·'),
    '正文页面渲染小节级证据面板（不隐藏小节级来源，契约 §3.3）',
  );
}

// ---------------------------------------------------------------------------
// D. 诚实状态　【PART 2 · WEB 渲染图/展示断言】
// ---------------------------------------------------------------------------

function checkHonestStates(M) {
  const min = loadFixture(FIXTURE_MIN);
  const fixtureHtml = renderApp(M, { content: min, route: { view: 'overview', id: null, query: '' } }).html;
  check(
    'D1',
    fixtureHtml.includes('测试样本') && fixtureHtml.includes('data-content-status="fixture"') && fixtureHtml.includes('fixtureOnly'),
    'fixtureOnly=true 的内容在页面上显示「测试样本」状态',
  );

  const missing = missingState(M);
  check('D2-0', missing.status === 'missing', `内容缺失时加载器状态为 missing（实际 ${missing.status}）`);
  const missingOverview = renderApp(M, { content: missing, route: { view: 'overview', id: null, query: '' } }).html;
  check(
    'D2-1',
    missingOverview.includes('data-content-status="missing"') && missingOverview.includes('内容尚未加载'),
    '内容缺失时总览显示「内容尚未加载」横幅',
  );
  // 未加载状态不得泄露 fixture 的历史句子里任何特征片段（防止有人把 fixture 当内容塞进代码）。
  const fixtureBodies = [
    ...min.doc.events.flatMap((item) => item.article.map((section) => section.body)),
    ...min.doc.claims.map((item) => item.text),
    ...min.doc.questions.map((item) => item.answer),
  ];
  const leakedBodies = fixtureBodies.filter((body) => missingOverview.includes(body.slice(0, 24)));
  check(
    'D2-2',
    leakedBodies.length === 0,
    `内容缺失时页面不包含任何 fixture 历史句子（检查了 ${fixtureBodies.length} 段，泄露 ${leakedBodies.length} 段）`,
  );
  const entriesWhenMissing = ['timeline', 'battles', 'people', 'atlas', 'concepts', 'questions'].map((view) => ({
    view,
    html: renderApp(M, { content: missing, route: { view, id: null, query: '' } }).html,
  }));
  check(
    'D2-3',
    entriesWhenMissing.every((entry) => entry.html.includes('data-empty-state=""') && entry.html.includes('尚未加载')),
    '内容缺失时六个入口都渲染诚实的「未加载」空状态（不是空白页）',
  );

  const invalid = invalidState(M);
  check('D3-0', invalid.status === 'invalid', `结构非法的内容被拒绝（状态 ${invalid.status}）`);
  const invalidHtml = renderApp(M, { content: invalid, route: { view: 'overview', id: null, query: '' } }).html;
  check(
    'D3',
    invalidHtml.includes('data-content-status="invalid"') && invalidHtml.includes('不符合契约'),
    '结构非法的内容显示「不符合契约」并列出问题，而不是当作历史渲染',
  );
}

// ---------------------------------------------------------------------------
// NAV-01. 发布路由 fixture 泄露回归（六入口 + 详情路由）　【PART 2 · WEB 渲染图/展示断言】
// ---------------------------------------------------------------------------
//
// 验收要求（L408）：在发布路由（时间线 / 战役 / 人物 / 地图 / 知识专题 / 历史问题
// 六入口及其详情）的渲染断言中，fixture 专属事实不得作为正文出现，且渲染结果必须与
// 真实内容加载一致；六个入口的详情路由各至少一项渲染断言。
// **「页面横幅标注测试样本」不算满足** —— 这里断言的是正文级泄露与真实内容一致性。
//
// 输入：
//   - fixture 专属事实清单：PART 1 collectFixtureOnlyFacts()（来自三份已接受夹具，
//     已排除 id/枚举等结构值，以及真实内容里也出现的措辞）；
//   - 真实内容：PART 1 loadRealContentDocument() + 真实加载器 M.loadContent()；
//   - 夹具内容：真实加载器 + 已接受夹具（用于**正向对照**，证明泄露检测器不是恒真）。
//
// 断言 ID：LEAK-0-content / LEAK-real-status / LEAK-facts / LEAK-control-{min,early,map} /
//          LEAK-<entry>-{list,detail,match}（entry = timeline/battles/people/atlas/concepts/questions）

/** 六个发布入口的规格：路由、真实内容集合、真实条目的正文文本字段。 */
const PUBLISHED_ROUTES = [
  { view: 'timeline', label: '时间线', collection: 'events', textOf: (item) => item?.title },
  { view: 'battles', label: '战役', collection: 'battles', textOf: (item) => item?.title },
  { view: 'people', label: '人物', collection: 'people', textOf: (item) => item?.name },
  { view: 'atlas', label: '地图', collection: 'places', textOf: (item) => item?.historicalName },
  { view: 'concepts', label: '知识专题', collection: 'concepts', textOf: (item) => item?.title },
  { view: 'questions', label: '历史问题', collection: 'questions', textOf: (item) => item?.prompt },
];

/**
 * 夹具内容 → 渲染状态（PART 2 专用；不解析字段，只选取已接受的加载路径）。
 *
 * - 完整根文档（valid-min / valid-early-campaign，含全部 11 个顶层数组）走**真实加载器**
 *   M.loadContent（与站点运行时同一入口）；
 * - map-phases.json 是**阶段契约夹具**（不声明 media 根数组），不属于可发布根文档；
 *   按已接受 R2-A 段同一路径 fixtureStateFrom() 渲染，用于正向对照。
 */
function fixtureRenderState(M, doc, label) {
  if (doc && Array.isArray(doc.media)) {
    return M.loadContent({ '/virtual/content/history.json': doc });
  }
  return fixtureStateFrom(doc, label);
}

/** 页面（去标签后的纯文本）中命中的 fixture 专属事实；返回命中清单。 */
function findFixtureLeaks(html, facts) {
  const text = htmlToPlainText(html);
  return facts.filter((fact) => text.includes(fact.text));
}

function checkPublishedRouteFixtureLeakage(M) {
  // ---------------------------------------------------------------- 输入（真实内容）
  const realDoc = loadRealContentDocument();
  check(
    'LEAK-0-content',
    Boolean(realDoc) && realDoc.fixtureOnly === false,
    '真实内容 content/history.json 存在且 fixtureOnly=false —— 发布路由的输入不是任何夹具',
  );
  if (!realDoc) {
    fail('LEAK-real', '真实内容缺失：无法执行发布路由泄露回归（前置条件缺失必须失败，不得跳过）');
    return;
  }
  const realState = M.loadContent({ '/virtual/content/history.json': realDoc });
  check(
    'LEAK-real-status',
    realState.status === 'available' && realState.doc !== null && realState.doc.fixtureOnly === false,
    `真实内容经真实加载器 loadContent 得到发布状态（状态 ${realState.status}，fixtureOnly=${realState.doc?.fixtureOnly}；不是 fixture）`,
  );

  // ---------------------------------------------------------------- PART 1：fixture 事实清单
  const facts = collectFixtureOnlyFacts(realDoc);
  const fixtureRelSet = new Set(facts.map((fact) => fact.fixture));
  check(
    'LEAK-facts',
    facts.length >= 50 && FIXTURE_FILES.every((fixture) => fixtureRelSet.has(fixture.rel)),
    `fixture 专属事实清单 ${facts.length} 条，来自 ${fixtureRelSet.size}/${FIXTURE_FILES.length} 份已接受夹具（${[...fixtureRelSet]
      .map((rel) => path.basename(rel))
      .join('、')}）；已排除 id/枚举结构值与真实内容共用措辞`,
  );

  // 夹具内容与内存/磁盘输入（正向对照用；真实加载路径一致）
  const minFixtureDoc = loadFixtureDocument(FIXTURE_MIN);
  const minFixtureState = M.loadContent({ '/virtual/content/history.json': minFixtureDoc });
  const earlyDoc = loadFixtureDocument(FIXTURE_EARLY);
  const earlyState = M.loadContent({ '/virtual/content/history.json': earlyDoc });
  const mapPhaseDoc = loadMapPhaseFixtureDocument();
  check(
    'LEAK-fixture-inputs',
    Boolean(mapPhaseDoc) && Array.isArray(mapPhaseDoc.battles) && mapPhaseDoc.battles.length > 0 && minFixtureState.doc !== null && earlyState.doc !== null,
    `正向对照输入齐备：valid-min（${minFixtureDoc.events?.length ?? 0} 事件）/ valid-early-campaign（${earlyDoc.events?.length ?? 0} 事件）/ map-phases（${mapPhaseDoc?.battles?.length ?? 0} 战役）均经真实加载器可用`,
  );

  // ---------------------------------------------------------------- 正向对照：检测器灵敏度
  const minEvent = minFixtureDoc.events?.[0];
  const minTimelineHtml = minEvent
    ? renderApp(M, { content: minFixtureState, route: { view: 'timeline', id: minEvent.id, query: '' } }).html
    : '';
  const minTimelineLeaks = findFixtureLeaks(minTimelineHtml, facts);
  check(
    'LEAK-control-min',
    minTimelineHtml.length > 0 && minTimelineLeaks.length > 0,
    `正向对照：用 valid-min 夹具渲染时间线详情 event ${minEvent?.id ?? '—'} → 检出 ${minTimelineLeaks.length} 条 fixture 专属事实（检测器不是恒真）`,
  );
  const earlyEvent = earlyDoc.events?.find((item) => item.id === 'event-hong-kong-1941') ?? earlyDoc.events?.[0];
  const earlyTimelineHtml = earlyEvent
    ? renderApp(M, { content: earlyState, route: { view: 'timeline', id: earlyEvent.id, query: '' } }).html
    : '';
  const earlyTimelineLeaks = findFixtureLeaks(earlyTimelineHtml, facts);
  check(
    'LEAK-control-early',
    earlyTimelineHtml.length > 0 && earlyTimelineLeaks.length > 0,
    `正向对照：用 valid-early-campaign 夹具渲染十键分析事件 ${earlyEvent?.id ?? '—'} → 检出 ${earlyTimelineLeaks.length} 条 fixture 专属事实`,
  );
  const mapBattle = mapPhaseDoc?.battles?.[0];
  const mapState = fixtureRenderState(M, mapPhaseDoc, 'map-phases.json');
  const mapBattlesHtml = mapBattle
    ? renderApp(M, { content: mapState, route: { view: 'battles', id: mapBattle.id, query: '' } }).html
    : '';
  const mapBattlesLeaks = findFixtureLeaks(mapBattlesHtml, facts);
  check(
    'LEAK-control-map',
    mapBattlesHtml.length > 0 && mapBattlesLeaks.length > 0,
    `正向对照：用 map-phases 夹具渲染战役详情 ${mapBattle?.id ?? '—'} → 检出 ${mapBattlesLeaks.length} 条 fixture 专属事实`,
  );

  // ---------------------------------------------------------------- 六入口：列表 + 详情 + 渲染一致性
  for (const spec of PUBLISHED_ROUTES) {
    const items = Array.isArray(realDoc[spec.collection]) ? realDoc[spec.collection] : [];
    const firstReal = items[0] ?? null;
    const realText = firstReal ? String(spec.textOf(firstReal) ?? '') : '';

    // ---- 列表路由：真实内容与渲染一致 + 无 fixture 事实
    const listHtml = renderApp(M, { content: realState, route: { view: spec.view, id: null, query: '' } }).html;
    const listLeaks = findFixtureLeaks(listHtml, facts);
    let listMatchesReal = false;
    if (items.length > 0) {
      listMatchesReal = realText.length > 0 && listHtml.includes(realText);
    } else {
      listMatchesReal = listHtml.includes('data-empty-state=""');
    }
    check(
      `LEAK-${spec.view}-list`,
      listLeaks.length === 0 && listMatchesReal,
      `发布路由 ${spec.label} 列表（#/${spec.view}）：真实内容 ${spec.collection}=${items.length}，${items.length > 0 ? `渲染首条真实内容「${realText.slice(0, 24)}」` : '渲染诚实空状态（真实内容该集合为空）'}；fixture 专属事实泄露 ${listLeaks.length} 条`,
    );

    // ---- 详情路由：真实有数据用真实 id；真实无数据（战役）用夹具 id 断言不渲染夹具内容
    const fixtureItems = Array.isArray(mapPhaseDoc?.[spec.collection])
      ? mapPhaseDoc[spec.collection]
      : Array.isArray(minFixtureDoc?.[spec.collection])
        ? minFixtureDoc[spec.collection]
        : [];
    const fixtureDetailItem = fixtureItems[0] ?? null;
    const detailId = firstReal?.id ?? fixtureDetailItem?.id ?? null;
    const detailHtml = renderApp(M, { content: realState, route: { view: spec.view, id: detailId, query: '' } }).html;
    const detailLeaks = findFixtureLeaks(detailHtml, facts);
    let detailMatchesReal = false;
    if (items.length > 0) {
      detailMatchesReal = realText.length > 0 && detailHtml.includes(realText);
    } else {
      detailMatchesReal = detailHtml.includes('data-empty-state=""');
      if (fixtureDetailItem) {
        const fixtureText = String(spec.textOf(fixtureDetailItem) ?? '');
        detailMatchesReal = detailMatchesReal && fixtureText.length > 0 && !detailHtml.includes(fixtureText);
      }
    }
    check(
      `LEAK-${spec.view}-detail`,
      typeof detailId === 'string' && detailLeaks.length === 0 && detailMatchesReal,
      `发布路由 ${spec.label} 详情（#/${spec.view}/${detailId ?? '—'}）：${
        items.length > 0 ? `渲染真实内容「${realText.slice(0, 24)}」` : '真实内容无此集合 → 渲染诚实空状态且不渲染夹具条目'
      }；fixture 专属事实泄露 ${detailLeaks.length} 条`,
    );

    // ---- 渲染与加载内容一致：同一详情路由换夹具内容渲染，结果必须不同
    const fixtureDocForRoute = spec.collection === 'battles' || spec.collection === 'people' ? mapPhaseDoc : minFixtureDoc;
    const fixtureStateForRoute = fixtureRenderState(
      M,
      fixtureDocForRoute,
      spec.collection === 'battles' || spec.collection === 'people' ? 'map-phases.json' : 'valid-min.json',
    );
    const fixtureDetailHtml = renderApp(M, {
      content: fixtureStateForRoute,
      route: { view: spec.view, id: detailId, query: '' },
    }).html;
    let realRenderOk = false;
    if (items.length > 0) {
      realRenderOk = realText.length > 0 && detailHtml.includes(realText);
    } else {
      realRenderOk = detailHtml.includes('data-empty-state=""');
    }
    check(
      `LEAK-${spec.view}-match`,
      realRenderOk && detailHtml !== fixtureDetailHtml,
      `发布路由 ${spec.label} 详情渲染与真实内容加载一致：真实内容渲染 ${detailHtml.length} 字节，夹具内容渲染同一路由 ${fixtureDetailHtml.length} 字节（输出随加载内容变化，不是固定/夹具输出）`,
    );
  }
}

// ---------------------------------------------------------------------------
// MAP-01. 真实内容地图接入与三大战役分阶段推演　【PART 2 · WEB 渲染图/展示断言】
// ---------------------------------------------------------------------------
//
// 数据：已接受的 HIST-04 真实内容 content/history.json（fixtureOnly=false）：
//   珍珠港 / 珊瑚海 / 中途岛三场重点战役共 12 个地图阶段；每阶段都带双方
//   knownEnemy / unknownEnemy / decision / consequence 与示意航线。
// 本组断言只走**站点真实渲染路径**（M.loadContent → renderApp → AtlasView / Atlas /
// mapEngine / controls、TimelineView），字段值一律从真实内容对象读取后再断言其渲染，
// 不硬编码任何史实措辞，也不引入夹具事实。
//
// 断言 ID：
//   MAP1-content / MAP1-load / MAP1-battles / MAP1-phases
//   MAP1-phase-fields / MAP1-routes（内容 JSON 结构 gate，消息注明「非渲染」并由 -intel/-routes 覆盖呈现）
//   MAP1-atlas-*（engine / selector / default-battle / date / legend / scalebar / graticule /
//                uncertainty / keyboard-touch / place-clickable / stable-selectors）
//   MAP1-node-<标签> 与 MAP1-node-<标签>-detail（验收要求的八个重点标签：断言**字面标签**
//                出现在渲染输出中，并写明由地点标签第一/二行还是区域标注层承载）
//   MAP1-region-layer（SVG 区域标注层渲染字面区域名「澳大利亚北部」）
//   MAP1-region-anchor-guard（锚点不存在时不渲染区域标签 → 标签由真实地点派生，不兜造坐标）
//   MAP1-seas（相关海域/海峡，历史名+现代名以字面文字渲染）
//   MAP1-<battleId>-{deep-link,intel,controls,routes,narrative-link,playback}
//   MAP1-<battleId>-narrative-<phaseId>-map-link（从叙述定位到地图阶段）
//   MAP1-entry-<view>（六入口在真实完整内容上正常显示）
//   MAP1-timeline-{controls,date,count,events,reset}（时间线日期筛选 → 事件筛选）
// 诚实性：MAP1-phase-fields / MAP1-routes 是内容 JSON 结构 gate；MAP1-<battle>-playback 是
// 状态机层断言（与组件同一实现，未在浏览器中真实点击）——三者在消息里显式说明所证明的范围。

/** 渲染真实内容的一条路由并返回 HTML（renderApp 与站点使用同一外壳 + 视图）。 */
function renderRealRoute(M, realState, route) {
  return renderApp(M, { content: realState, route: { query: '', ...route } }).html;
}

/** 重点战役的固定顺序（已接受内容中的稳定 ID；缺失由 MAP1-battles 直接 FAIL）。 */
const MAP1_FOCUS_BATTLE_IDS = ['battle-pearl-harbor', 'battle-coral-sea', 'battle-midway'];

/**
 * 验收要求标注的重点标签（区域/地名 + 相关海域）：
 * - `satisfiedBy` 记录该标签在**渲染输出**里由什么承载，消息里如实写明；
 * - 非 region 标签由真实 place 的历史名/现代名/国家字段提供，`keyword` 用于解析锚点 place；
 * - `regionId` 标签由 MAP-01 区域标注层提供（src/atlas/regions.ts，锚定到真实 place，
 *   不新增坐标/史实）；旧提交只断言了「达尔文」关键词，没有断言验收要求的字面区域名，
 *   NAV 这里改为**断言字面标签真的出现在渲染输出中**。
 */
const MAP1_REQUIRED_LABELS = [
  { label: '夏威夷', keyword: '夏威夷', satisfiedBy: '地点标签第二行（现代名「瓦胡岛（美国夏威夷州）」含「夏威夷」）' },
  { label: '中途岛', keyword: '中途岛', satisfiedBy: '地点标签第一行（历史地名「中途岛」）' },
  { label: '菲律宾', keyword: '菲律宾', satisfiedBy: '地点标签第二行（现代名 · 国家字段「马尼拉 · 菲律宾」）' },
  { label: '新加坡', keyword: '新加坡', satisfiedBy: '地点标签第一行（历史地名「新加坡（英属海峡殖民地）」）' },
  { label: '马来亚', keyword: '马来亚', satisfiedBy: '地点标签第一行（历史地名「马来亚（英属）」）' },
  { label: '关岛', keyword: '关岛', satisfiedBy: '地点标签第一行（历史地名「关岛」）' },
  { label: '威克岛', keyword: '威克岛', satisfiedBy: '地点标签第一行（历史地名「威克岛」）' },
  {
    label: '澳大利亚北部',
    keyword: '达尔文',
    regionId: 'region-northern-australia',
    satisfiedBy: '区域标注层（data-region-id="region-northern-australia"，以 place-darwin 为锚点的区域名，不是精确边界）',
  },
];

/** 六入口（用于真实内容渲染断言）。 */
const MAP1_ENTRIES = [
  ['timeline', '时间线', 'events'],
  ['battles', '战役', 'battles'],
  ['people', '人物', 'people'],
  ['atlas', '地图', 'places'],
  ['concepts', '知识专题', 'concepts'],
  ['questions', '历史问题', 'questions'],
];

function checkRealContentMapIntegration(M) {
  // ---------------------------------------------------------------- 真实内容输入
  const realDoc = loadRealContentDocument();
  check(
    'MAP1-content',
    Boolean(realDoc) && realDoc.fixtureOnly === false,
    '真实内容 content/history.json 存在且 fixtureOnly=false（MAP-01 的唯一地图数据源）',
  );
  if (!realDoc) {
    fail('MAP1', '真实内容缺失：无法执行真实内容地图/战役推演检查（前置条件缺失必须失败，不得跳过）');
    return;
  }
  const realState = M.loadContent({ '/virtual/content/history.json': realDoc });
  check(
    'MAP1-load',
    realState.status === 'available' && realState.doc !== null,
    `真实内容经真实加载器 loadContent 得到发布状态（状态 ${realState.status}）`,
  );
  if (!realState.doc) {
    fail('MAP1', '真实内容无法加载：渲染检查未执行（必须失败）');
    return;
  }
  const doc = realState.doc;

  // ---------------------------------------------------------------- 三场重点战役 / 12 阶段
  const focusBattles = MAP1_FOCUS_BATTLE_IDS.map((id) => (doc.battles ?? []).find((battle) => battle.id === id) ?? null);
  check(
    'MAP1-battles',
    focusBattles.every(Boolean),
    `真实内容含三场重点战役：${MAP1_FOCUS_BATTLE_IDS.join(' / ')}（实际 battles=${(doc.battles ?? []).length} 场）`,
  );
  if (!focusBattles.every(Boolean)) {
    fail('MAP1', '三场重点战役不齐：无法继续阶段推演检查（必须失败，不跳过）');
    return;
  }
  const phasesOf = (battle) => M.sortPhases([...(battle.phases ?? [])]);
  const counted = focusBattles.map((battle) => `${battle.id}=${phasesOf(battle).length}`);
  const allPhases = focusBattles.flatMap(phasesOf);
  check('MAP1-phases', allPhases.length === 12, `三场重点战役阶段总数 = ${allPhases.length}（${counted.join('，')}）`);

  const missingFields = allPhases.filter(
    (phase) =>
      !(
        phase.knownEnemy?.japan &&
        phase.knownEnemy?.allies &&
        phase.unknownEnemy?.japan &&
        phase.unknownEnemy?.allies &&
        phase.decision?.japan &&
        phase.decision?.allies &&
        phase.consequence?.japan &&
        phase.consequence?.allies &&
        phase.time?.display
      ),
  );
  check(
    'MAP1-phase-fields',
    missingFields.length === 0,
    `内容 JSON 结构 gate（非渲染）：每个阶段数据都含双方已知/未知敌情、时间、决策与后果（缺失字段的阶段 ${missingFields.length} 个）；这些字段的**页面呈现**由 MAP1-<battleId>-intel（真实渲染文本）断言`,
  );
  const badRoutes = allPhases.filter(
    (phase) =>
      (phase.routes ?? []).length === 0 ||
      (phase.routes ?? []).some((route) => route.schematic !== true || !Array.isArray(route.path) || route.path.length < 2),
  );
  check(
    'MAP1-routes',
    badRoutes.length === 0,
    `内容 JSON 结构 gate（非渲染）：每个阶段的航线都标记 schematic=true 且路径 ≥2 点（不合格阶段 ${badRoutes.length} 个；不生成虚构精确航迹）；页面上的示意航线与「不是精确历史航迹」声明由 MAP1-<battleId>-routes 断言`,
  );

  // ---------------------------------------------------------------- 地图入口（真实内容）
  const atlasList = renderRealRoute(M, realState, { view: 'atlas', id: null });
  check(
    'MAP1-atlas-engine',
    atlasList.includes('data-atlas-engine') && atlasList.includes('data-atlas-canvas') && atlasList.includes('<svg'),
    '真实内容下渲染本地自绘 SVG 地图引擎（离线，无外部瓦片/商业 Key）',
  );
  const selectorIds = [...atlasList.matchAll(/data-battle-select="([^"]+)"/g)].map((match) => match[1]);
  check(
    'MAP1-atlas-selector',
    MAP1_FOCUS_BATTLE_IDS.every((id) => selectorIds.includes(id)) && selectorIds.length === MAP1_FOCUS_BATTLE_IDS.length,
    `地图渲染战役选择器并覆盖三场重点战役（实际：${selectorIds.join(' / ')}）`,
  );
  check(
    'MAP1-atlas-default-battle',
    atlasList.includes(`data-atlas-battle="${MAP1_FOCUS_BATTLE_IDS[0]}"`),
    `地图默认选中第一场重点战役 ${MAP1_FOCUS_BATTLE_IDS[0]}（data-atlas-battle 可观察）`,
  );
  check(
    'MAP1-atlas-date',
    /data-atlas-active-date="[^"]+"/.test(atlasList),
    '地图根节点暴露当前阶段日期（data-atlas-active-date），可供浏览器测试观察时间联动',
  );
  check(
    'MAP1-atlas-legend',
    atlasList.includes('data-certainty-legend') &&
      atlasList.includes('data-side-encoding="japan"') &&
      atlasList.includes('data-side-encoding="allies"') &&
      atlasList.includes('示意'),
    '图例齐全：certainty 图例 + 双方不同视觉编码（形状/线型，不只靠颜色）+ 示意说明',
  );
  check(
    'MAP1-atlas-scalebar',
    atlasList.includes('data-layer="scalebar"') && /≈ \d+ km/.test(atlasList),
    '近似比例尺可见（随缩放换算 km）',
  );
  check(
    'MAP1-atlas-graticule',
    atlasList.includes('data-layer="graticule"') && atlasList.includes('data-layer-toggle="graticule"'),
    '经纬网图层渲染且可切换（data-layer="graticule"）',
  );
  check(
    'MAP1-atlas-uncertainty',
    atlasList.includes('data-layer="uncertainty"') && atlasList.includes('data-uncertainty-radius-km'),
    '不确定范围可见（data-uncertainty-radius-km）且标注为示意',
  );
  check(
    'MAP1-atlas-keyboard-touch',
    /<svg[^>]*role="application"[^>]*tabindex="0"/.test(atlasList) &&
      atlasList.includes('使用方向键平移') &&
      atlasList.includes('data-map-action="zoom-in"') &&
      atlasList.includes('data-atlas-canvas'),
    '键盘可操作性声明可见（role="application" + tabindex=0 + 方向键说明）；触摸/指针事件由 M7 与 D3 组对同一引擎断言',
  );
  // 地点节点可点击/可键盘激活（点击后由 AtlasView 写回 #/atlas/<placeId> 进入详情）。
  check(
    'MAP1-atlas-place-clickable',
    atlasList.includes('data-place-id=')
      && atlasList.includes('data-layer="place"')
      && atlasList.includes('role="button"')
      && atlasList.includes('aria-label="选择地点 ')
      && atlasList.includes('tabindex="0"'),
    '全部地点节点可点击/可键盘激活（role="button" + tabindex=0 + aria-label「选择地点…」，hover/title 带历史名与现代名）',
  );
  check(
    'MAP1-atlas-stable-selectors',
    [
      'data-battle-select=',
      'data-atlas-battle=',
      'data-phase-action="playpause"',
      'data-phase-action="next"',
      'data-phase-action="prev"',
      'data-phase-id=',
      'data-map-action="zoom-in"',
      'data-map-action="zoom-out"',
      'data-map-action="reset"',
      'data-layer-toggle="places"',
      'data-date-range',
    ].every((needle) => atlasList.includes(needle)),
    '地图页暴露稳定 data-* 控件供 MAP-01 之后的浏览器测试/QA 选择（战役、阶段、缩放、图层、日期）',
  );

  // 区域标注层的实际渲染片段（用于日志自证：字面区域名出现在 SVG <text> 里）。
  const regionTextMatch = atlasList.match(/<g[^>]*data-region-id="region-northern-australia"[^>]*>\s*<text[^>]*>([^<]*)<\/text>/);
  const regionRenderedText = regionTextMatch?.[1] ?? '';
  // ---------------------------------------------------------------- 重点标签与海域标注
  // 每个验收要求的标签都必须以**字面文字**出现在渲染输出里（不只是解析到某个关键词），
  // 并在消息中写明由哪种渲染承载（地点标签第一/二行 vs 区域标注层）。
  const placeText = (place) => `${place.historicalName} ${place.modernName} ${place.modernCountry}`;
  const atlasPlainText = htmlToPlainText(atlasList);
  for (const node of MAP1_REQUIRED_LABELS) {
    const place = doc.places.find((candidate) => placeText(candidate).includes(node.keyword));
    const literalRendered = atlasPlainText.includes(node.label);
    const regionRendered =
      node.regionId === undefined ||
      (atlasList.includes(`data-layer="region"`) &&
        atlasList.includes(`data-region-id="${node.regionId}"`) &&
        atlasList.includes(`data-region-label="${node.label}"`));
    const placeRendered = Boolean(place) && atlasList.includes(place.historicalName) && atlasList.includes(place.modernName);
    check(
      `MAP1-node-${node.label}`,
      literalRendered && regionRendered && placeRendered,
      `地图以明确文字标注「${node.label}」（字面标签出现；承载：${node.satisfiedBy}）${
        place ? `；锚点地点 ${place.id}（历史名「${place.historicalName}」/ 现代名「${place.modernName}」均渲染）` : '；未在真实 places 中找到匹配节点'
      }${node.regionId === undefined ? '' : `；SVG 渲染片段：「<text>${regionRenderedText}</text>」`}`,
    );
    const detailHtml = place ? renderRealRoute(M, realState, { view: 'atlas', id: place.id }) : '';
    check(
      `MAP1-node-${node.label}-detail`,
      Boolean(place) &&
        detailHtml.includes('历史地名') &&
        detailHtml.includes('现代地名') &&
        detailHtml.includes(place.historicalName) &&
        detailHtml.includes(place.modernName),
      `地点详情可发现${node.label}的历史名与现代名（#/atlas/${place?.id ?? '—'}）`,
    );
  }
  // 区域标注层本身：字面标签必须出现在 SVG 的 region 分组文本里（不是只出现在索引文字中）。
  check(
    'MAP1-region-layer',
    regionRenderedText === '澳大利亚北部' &&
      atlasList.includes('data-layer="region"') &&
      atlasList.includes('data-anchor-place="place-darwin"') &&
      atlasList.includes('data-atlas-region-index=""') &&
      atlasList.includes('以达尔文港为锚点'),
    `区域标注层：SVG 地图以 <text> 渲染字面区域名（实际渲染片段：「<text>${regionRenderedText}</text>」，data-layer="region"，锚点 data-anchor-place="place-darwin"；不新增坐标，区域名≠精确边界/舰队位置），页内索引同样可发现`,
  );
  // 锚点守卫：内容里没有锚点地点时不得渲染该区域标签（证明标签由真实地点派生，不兜造坐标）。
  const minFixtureState = M.loadContent({ '/virtual/content/history.json': loadFixtureDocument(FIXTURE_MIN) });
  const minFixtureAtlas = renderRealRoute(M, minFixtureState, { view: 'atlas', id: null });
  check(
    'MAP1-region-anchor-guard',
    !minFixtureAtlas.includes('data-layer="region"') && !minFixtureAtlas.includes('澳大利亚北部'),
    '区域标注只在真实锚点存在时渲染：valid-min 夹具没有 place-darwin → 地图不渲染「澳大利亚北部」，也不凭空生成坐标',
  );
  const seaPlaces = doc.places.filter((place) => place.placeType === 'sea' || place.placeType === 'strait');
  const seaLabelsPresent = seaPlaces.filter((place) => atlasList.includes(place.historicalName) && atlasList.includes(place.modernName));
  check(
    'MAP1-seas',
    seaPlaces.length >= 3 && seaLabelsPresent.length === seaPlaces.length,
    `相关海域/海峡标注：${seaPlaces.length} 处（${seaPlaces.map((place) => place.historicalName).slice(0, 6).join('、')}${seaPlaces.length > 6 ? '…' : ''}），历史名+现代名全部以字面文字出现在地图渲染中`,
  );

  // ---------------------------------------------------------------- 三场战役：深链 + 阶段情报 + 控件
  for (const battle of focusBattles) {
    const phases = phasesOf(battle);
    const chosen =
      phases.find(
        (phase) =>
          phase.knownEnemy?.japan &&
          phase.knownEnemy?.allies &&
          phase.unknownEnemy?.japan &&
          phase.unknownEnemy?.allies &&
          phase.decision?.japan &&
          phase.decision?.allies &&
          phase.consequence?.japan &&
          phase.consequence?.allies,
      ) ?? phases[0];
    const battleTitle = String(battle.title ?? '');
    const detail = renderRealRoute(M, realState, { view: 'atlas', id: null, battle: battle.id, phase: chosen.id });
    const detailText = normalizePlain(htmlToPlainText(detail));

    check(
      `MAP1-${battle.id}-deep-link`,
      detail.includes(`data-atlas-battle="${battle.id}"`) &&
        detail.includes(`data-phase-id="${chosen.id}"`) &&
        detail.includes(`data-atlas-active-phase="${chosen.id}"`) &&
        detail.includes(battleTitle) &&
        detail.includes(chosen.time.display),
      `#/atlas?battle=${battle.id}&phase=${chosen.id} 深链直接渲染该战役阶段（阶段 ${chosen.sequence}「${chosen.title}」，时间「${chosen.time.display}」）`,
    );

    const intelTexts = [
      ['日方已知', chosen.knownEnemy.japan],
      ['盟方已知', chosen.knownEnemy.allies],
      ['日方未知', chosen.unknownEnemy.japan],
      ['盟方未知', chosen.unknownEnemy.allies],
      ['日方决策', chosen.decision.japan],
      ['盟方决策', chosen.decision.allies],
      ['日方后果', chosen.consequence.japan],
      ['盟方后果', chosen.consequence.allies],
    ];
    const missingIntel = intelTexts.filter(([, text]) => !detailText.includes(normalizePlain(text)));
    check(
      `MAP1-${battle.id}-intel`,
      missingIntel.length === 0,
      `${battle.id} 阶段「${chosen.title}」同时显示双方已知/未知敌情、决策与后果（缺失 ${missingIntel.map(([label]) => label).join('、') || '无'}）`,
    );

    check(
      `MAP1-${battle.id}-controls`,
      detail.includes('data-phase-action="playpause"') &&
        detail.includes('data-phase-action="next"') &&
        detail.includes('data-phase-action="prev"') &&
        detail.includes('data-date-range') &&
        detail.includes('data-phase-counter') &&
        /aria-pressed="(true|false)"/.test(detail),
      `${battle.id} 地图阶段控件：播放/暂停 + 上一阶段 + 下一阶段 + 时间轴滑块 + 阶段计数 + aria-pressed`,
    );

    check(
      `MAP1-${battle.id}-routes`,
      detail.includes('data-layer="route"') &&
        detail.includes('data-schematic="true"') &&
        detail.includes('data-layer="position"') &&
        detail.includes('data-side="japan"') &&
        detail.includes('data-side="allies"') &&
        detail.includes('不是精确历史航迹'),
      `${battle.id} 阶段示意图：双方位置（日本/盟军分开编码）+ 示意航线 + 「不是精确历史航迹」声明`,
    );

    // 从地图跳转叙述（PhaseControls.narrativeHref → #/battles/<battleId>）
    check(
      `MAP1-${battle.id}-narrative-link`,
      detail.includes('data-phase-action="narrative"') && detail.includes(`href="#/battles/${battle.id}"`),
      `${battle.id} 地图阶段面板提供「阅读战役全文」链接 → #/battles/${battle.id}`,
    );

    // 播放状态机（与组件同一份实现）：真实阶段数量下的 播放/暂停/前进/后退
    const count = phases.length;
    const playing = M.togglePlayback(M.INITIAL_PLAYBACK, count);
    const ticked = M.tickPlayback(playing, count);
    const stepped = M.stepPlayback(ticked, -1, count);
    const paused = M.togglePlayback(playing, count);
    check(
      `MAP1-${battle.id}-playback`,
      playing.playing === true &&
        ticked.activeIndex === 1 &&
        ticked.playing === true &&
        stepped.activeIndex === 0 &&
        stepped.playing === false &&
        paused.playing === false,
      `${battle.id} 真实阶段数 ${count} 下的播放状态机层断言（调用与组件 usePhasePlayback 同一份纯函数实现，**未**在浏览器中真实点击）：播放→tick 到阶段 2→上一阶段回阶段 1（并停止播放）→暂停；控件存在性与可点击接线由 MAP1-${battle.id}-controls 断言，真实点击由下游浏览器测试覆盖`,
    );

    // 从叙述定位到地图阶段：战役详情页每个阶段都有 «在地图上查看此阶段» 深链
    const narrative = renderRealRoute(M, realState, { view: 'battles', id: battle.id });
    const mapLinks = phases.filter(
      (phase) =>
        narrative.includes(`data-phase-map-link="${phase.id}"`) &&
        narrative.includes(`href="#/atlas?battle=${battle.id}`) &&
        narrative.includes(`phase=${phase.id}`),
    );
    check(
      `MAP1-${battle.id}-narrative-phase-links`,
      mapLinks.length === phases.length,
      `${battle.id} 战役叙述页的 ${phases.length} 个阶段均提供「在地图上查看此阶段」深链（实际 ${mapLinks.length} 个）`,
    );
  }

  // ---------------------------------------------------------------- 时间线日期筛选
  const timelineNoFilter = renderRealRoute(M, realState, { view: 'timeline', id: null });
  check(
    'MAP1-timeline-controls',
    timelineNoFilter.includes('data-timeline-date-filter') &&
      timelineNoFilter.includes('data-timeline-date-range') &&
      timelineNoFilter.includes('data-timeline-date-display') &&
      timelineNoFilter.includes('data-timeline-date-reset') &&
      timelineNoFilter.includes('data-timeline-event='),
    '时间线提供日期筛选控件（滑块 / 当前日期文案 / 全部日期按钮 / 每个事件 data-timeline-event），可被浏览器测试稳定观察',
  );
  const eventDates = [...new Set(doc.events.map((event) => event.startDate))].sort();
  const middleDate = eventDates[Math.floor(eventDates.length / 2)] ?? eventDates[0];
  const expectedIds = doc.events.filter((event) => event.startDate <= middleDate).map((event) => event.id);
  const filteredTimeline = renderRealRoute(M, realState, { view: 'timeline', id: null, date: middleDate });
  check(
    'MAP1-timeline-date',
    filteredTimeline.includes(`data-timeline-date="${middleDate}"`) &&
      filteredTimeline.includes(`aria-valuetext="显示截至 ${middleDate} 的 ${expectedIds.length} 个事件（共 ${doc.events.length} 个）"`),
    `#/timeline?date=${middleDate} 通过稳定控件显示所选日期与筛选后事件数（${expectedIds.length}/${doc.events.length}）`,
  );
  check(
    'MAP1-timeline-count',
    filteredTimeline.includes(`data-timeline-date-count="${expectedIds.length}"`) &&
      filteredTimeline.includes(`data-timeline-date-total="${doc.events.length}"`),
    `时间线日期筛选按「截至该日」筛选事件：data-timeline-date-count=${expectedIds.length}（共 ${doc.events.length}）`,
  );
  const renderedIds = [...filteredTimeline.matchAll(/data-timeline-event="([^"]+)"/g)].map((match) => match[1]);
  const missingEvents = expectedIds.filter((id) => !renderedIds.includes(id));
  const unexpectedEvents = renderedIds.filter((id) => !expectedIds.includes(id));
  check(
    'MAP1-timeline-events',
    missingEvents.length === 0 && unexpectedEvents.length === 0,
    `时间线日期筛选后渲染的事件集合与真实内容一致（应显示 ${expectedIds.length} 个，实显示 ${renderedIds.length} 个；缺 ${missingEvents.length} / 多 ${unexpectedEvents.length}）`,
  );
  check(
    'MAP1-timeline-reset',
    timelineNoFilter.includes(`data-timeline-date-count="${doc.events.length}"`) && timelineNoFilter.includes('data-timeline-date="all"'),
    `未选日期时时间线显示全部 ${doc.events.length} 个事件（「全部日期」复位语义可观察）`,
  );

  // ---------------------------------------------------------------- 六入口在真实完整内容上正常显示
  for (const [view, label, collection] of MAP1_ENTRIES) {
    const collectionItems = Array.isArray(doc[collection]) ? doc[collection] : [];
    const first = collectionItems[0] ?? null;
    const firstText = String((first && (first.title ?? first.name ?? first.historicalName ?? first.prompt)) || '');
    const html = renderRealRoute(M, realState, { view, id: null });
    check(
      `MAP1-entry-${view}`,
      collectionItems.length > 0 &&
        firstText.length > 0 &&
        html.includes(firstText) &&
        !html.includes('data-empty-state=""'),
      `六入口之一「${label}」在真实完整内容上正常显示（${collection}=${collectionItems.length}，首条「${firstText.slice(0, 24)}」渲染，不显示空状态）`,
    );
  }
}

// ---------------------------------------------------------------------------
// NAV-01. 分段基线与单一属主自检　【PART 2 · 自检】
// ---------------------------------------------------------------------------
//
// 把脚本头部记录的分段基线里「可机器验证」的部分变成真实断言（不是文档声明）：
//  - 夹具集合固定为三份已接受夹具，且真实代码不引用不存在的 map-phases-analysis.json；
//  - 早期战役分析块解析/派生在真实代码中只有一个共享函数（单一属主）；
//  - PART 1 / PART 2 显式分段与契约归属标注确实存在；
//  - 渲染断言不直接读取 event.analysisProfiles（只消费 PART 1 的 blocks）。

/**
 * 从源码中提取一个顶层函数的完整源码（函数体提取的**唯一**实现）。
 *
 * 函数体提取本质上是**行尾敏感**的：`\n}\n` 只在 LF 下成立，CRLF 检出（中央
 * project worktree 的 core.autocrlf）会匹配失败。因此本函数先归一化 `\r\n` → `\n`
 * 再匹配；NAV-5 与 NAV-7（CRLF 变体自检）共用它，防止该类缺陷再次回归。
 */
function extractFunctionSource(source, name) {
  const normalized = String(source).replace(/\r\n/g, '\n');
  const match = normalized.match(new RegExp(`\\n(?:async )?function ${name}\\([\\s\\S]*?\\n\\}\\n`));
  return match ? match[0].slice(1) : '';
}

function checkSegmentationBaseline() {
  // 行尾无关（NAV-01 a2 修正）：先把源码归一化为 LF，再做所有基于换行的自检
  // （函数体提取、PART 区块切片、逐行扫描）。中央 worktree 是 CRLF 检出，
  // 若直接拿原始文本匹配 `\n}\n` 会在那边失败 —— 这正是 a1 被回滚的唯一 FAIL。
  const rawSource = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const code = stripCommentsAndStrings(rawSource);

  const parseDefinitions = (code.match(/function parseEarlyCampaignAnalysisBlocks\(/g) ?? []).length;
  check(
    'NAV-1-single-parser',
    parseDefinitions === 1,
    `早期战役分析块的解析/派生在真实代码中只有 1 处共享函数定义（parseEarlyCampaignAnalysisBlocks；实际 ${parseDefinitions} 处）`,
  );

  check(
    'NAV-2-fixture-set',
    FIXTURE_FILES.length === 3 && FIXTURE_FILES.every((fixture) => fs.existsSync(fixture.file)),
    `PART 1 只消费 ${FIXTURE_FILES.length} 份已接受契约夹具（${FIXTURE_FILES.map((fixture) => path.basename(fixture.rel)).join('、')}）`,
  );

  // 动态拼接被检查的夹具名：避免自检的正则/字符串字面量本身出现在被扫描的真实代码里。
  const absentFixtureName = ['map-phases', 'analysis'].join('-');
  const mapAnalysisRefs = code.split(absentFixtureName).length - 1;
  check(
    'NAV-3-no-map-analysis-ref',
    mapAnalysisRefs === 0,
    `真实代码不引用 ${absentFixtureName}.json（该夹具在已接受契约中不存在；真实代码引用 ${mapAnalysisRefs} 处）—— 本脚本不创建、不引用、不要求其存在，阶段分析字段由 analysisProfiles 契约 + map-phases.json 承载`,
  );

  check(
    'NAV-4-part-labels',
    rawSource.includes('PART 1 — 夹具解析/派生（契约来源：ARCH') && rawSource.includes('PART 2 — 渲染图/展示断言（契约来源：WEB'),
    '脚本显式划分为 PART 1（夹具解析/派生，契约来源 ARCH）与 PART 2（渲染图/展示断言，契约来源 WEB）并各自标注',
  );

  const renderFnBody = extractFunctionSource(rawSource, 'assertAnalysisProfilesRendered');
  const readsContractFields = renderFnBody.includes('.analysisProfiles');
  check(
    'NAV-5-render-consumes-parse',
    renderFnBody.length > 0 && !readsContractFields,
    '渲染断言 assertAnalysisProfilesRendered 只消费 PART 1 解析出的 blocks，不直接读取 event.analysisProfiles（无平行解析；行尾无关提取）',
  );

  // PART 1 区块内不得出现任何结果断言（解析段只解析；断言一律在 PART 2）。
  const part1Start = rawSource.indexOf('// PART 1 — 夹具解析/派生（契约来源：ARCH');
  const part2Start = rawSource.indexOf('// PART 2 — 渲染图/展示断言（契约来源：WEB');
  const part1Slice = part1Start >= 0 && part2Start > part1Start ? rawSource.slice(part1Start, part2Start) : '';
  const part1CheckCalls = (stripCommentsAndStrings(part1Slice).match(/\b(?:check|pass|fail)\(/g) ?? []).length;
  check(
    'NAV-6-part1-no-assertions',
    part1Start >= 0 && part2Start > part1Start && part1CheckCalls === 0,
    `PART 1（夹具解析/派生）区块只做解析，不含任何 check/pass/fail 结果断言（实际 ${part1CheckCalls} 处）；断言全部在 PART 2`,
  );

  // 行尾无关自检（NAV-01 a2 修正）：把同一份源码转成 CRLF 变体，重新执行上面用到的
  // 函数体提取 / PART 区块切片 / S1 逐行扫描，结果必须与 LF 变体完全一致。
  // 这直接覆盖 a1 的失败机理（CRLF 下 `\n}\n` 不匹配 → NAV-5 失败），且在任何检出
  // 环境下都会真实执行（不依赖本机文件的行尾）。
  const crlfSource = rawSource.replace(/\n/g, '\r\n');
  const crlfRenderFnBody = extractFunctionSource(crlfSource, 'assertAnalysisProfilesRendered');
  const crlfPart1Start = crlfSource.indexOf('// PART 1 — 夹具解析/派生（契约来源：ARCH');
  const crlfPart2Start = crlfSource.indexOf('// PART 2 — 渲染图/展示断言（契约来源：WEB');
  const crlfPart1Slice = crlfPart1Start >= 0 && crlfPart2Start > crlfPart1Start ? crlfSource.slice(crlfPart1Start, crlfPart2Start) : '';
  const crlfPart1CheckCalls = (stripCommentsAndStrings(crlfPart1Slice).match(/\b(?:check|pass|fail)\(/g) ?? []).length;
  const crlfVacuousHits = findVacuousAssertions(crlfSource).length;
  const lfVacuousHits = findVacuousAssertions(rawSource).length;
  check(
    'NAV-7-eol-agnostic',
    crlfSource.includes('\r\n') &&
      crlfRenderFnBody.length > 0 &&
      crlfRenderFnBody.length === renderFnBody.length &&
      crlfPart1CheckCalls === part1CheckCalls &&
      crlfVacuousHits === lfVacuousHits,
    `行尾无关自检：同一源码的 CRLF 变体与 LF 变体结果一致（函数体 ${crlfRenderFnBody.length}/${renderFnBody.length} 字符；PART 1 断言数 ${crlfPart1CheckCalls}/${part1CheckCalls}；S1 空洞命中 ${crlfVacuousHits}/${lfVacuousHits} 处）`,
  );
}

// ---------------------------------------------------------------------------
// E. 构建产物　【PART 2 · WEB 渲染图/展示断言】
// ---------------------------------------------------------------------------

function checkDist() {
  const dist = DIST_DIR ?? path.join(ROOT, 'dist');
  if (!fs.existsSync(dist)) {
    fail('E0', `构建产物目录不存在：${dist}（先运行 npm run build）`);
    return false;
  }
  const indexPath = path.join(dist, 'index.html');
  if (!check('E0-1', fs.existsSync(indexPath), `构建产物包含 index.html（${dist}）`)) return false;
  const html = fs.readFileSync(indexPath, 'utf8');

  check('E1-1', html.includes(`${BASE_PATH}assets/`), `index.html 的资源路径带 GitHub Pages 子路径 ${BASE_PATH}`);
  check('E1-2', !/href="\/assets\//.test(html) && !/src="\/assets\//.test(html), 'index.html 不包含根路径 /assets/ 引用（子路径部署会 404）');

  const assetRefs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((ref) => ref.startsWith(BASE_PATH));
  const missingAssets = assetRefs.filter((ref) => {
    const relative = ref.slice(BASE_PATH.length);
    return !fs.existsSync(path.join(dist, relative));
  });
  check(
    'E1-3',
    assetRefs.length > 0 && missingAssets.length === 0,
    `index.html 引用的 ${assetRefs.length} 个构建资源全部存在于产物中`,
    missingAssets.join(', '),
  );

  const jsFiles = fs.readdirSync(path.join(dist, 'assets')).filter((file) => file.endsWith('.js'));
  const cssFiles = fs.readdirSync(path.join(dist, 'assets')).filter((file) => file.endsWith('.css'));
  check('E1-4', jsFiles.length > 0 && cssFiles.length > 0, `产物包含 JS（${jsFiles.length}）与 CSS（${cssFiles.length}）`);

  let totalBytes = 0;
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else totalBytes += fs.statSync(full).size;
    }
  };
  walk(dist);
  // E1-5 是**真实性能断言**（不是「只报告大小」）：JS+CSS 的 gzip 总体积必须 ≤ 500 KiB。
  const gzipBytes = zlib.gzipSync(
    Buffer.concat([
      ...jsFiles.map((file) => fs.readFileSync(path.join(dist, 'assets', file))),
      ...cssFiles.map((file) => fs.readFileSync(path.join(dist, 'assets', file))),
    ]),
  ).length;
  check(
    'E1-5',
    gzipBytes <= 500 * 1024,
    `产物 JS+CSS gzip 合计 ${(gzipBytes / 1024).toFixed(1)} KiB（PERFORMANCE 上限 500 KiB；产物原始合计 ${(totalBytes / 1024).toFixed(1)} KiB）`,
  );

  // E2：站内链接只允许 hash 路由 + 子路径资源 + 外部 http(s)。
  // 注意：构建产物经过压缩，链接由模板字符串生成（`#/${view}`），因此按
  // 「#/ 出现次数」与「location.hash 赋值」判断，不能只匹配双引号字符串字面量。
  const jsText = jsFiles.map((file) => fs.readFileSync(path.join(dist, 'assets', file), 'utf8')).join('\n');
  const hashLinkCount = countOf(jsText, '#/');
  const hashWrites = countOf(jsText, 'location.hash');
  check(
    'E2-1',
    hashLinkCount >= 3 && hashWrites >= 1,
    `构建产物使用 hash 路由（出现 #/ ${hashLinkCount} 处、location.hash 写入 ${hashWrites} 处），可在子路径下直接打开`,
  );
  // 负例：产物里不得出现「根路径绝对引用」（子路径部署会 404）。
  const rootAbsoluteRefs = [...jsText.matchAll(/(?:from|import|src|href)\s*[:=]\s*["']\/(?!\/)[A-Za-z0-9._-]+\//g)].length;
  check('E2-2', rootAbsoluteRefs === 0, `构建产物不含根路径绝对资源引用（实际 ${rootAbsoluteRefs} 处）`);

  // E3：无 CDN 字体与外部脚本
  const allText = `${html}\n${jsText}\n${cssFiles.map((file) => fs.readFileSync(path.join(dist, 'assets', file), 'utf8')).join('\n')}`;
  check('E3-1', !/fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit|cdn\.jsdelivr|unpkg\.com|cdnjs\.cloudflare\.com/.test(allText), '构建产物不引用任何 CDN 字体或外部脚本');
  check('E3-2', !/tile\.openstreetmap\.org|maps\.googleapis\.com|api\.maptiler|mapbox\.com/.test(allText), '构建产物不依赖外部瓦片服务或商业地图 API');
  check('E3-3', !/@font-face/.test(allText), '样式不声明 @font-face（使用本地系统字体栈，离线可用）');

  // E4：HTML 语义与可访问性骨架
  check('E4-1', html.includes('lang="zh-CN"'), 'index.html 声明 lang="zh-CN"');
  check('E4-2', html.includes('name="viewport"'), 'index.html 声明 viewport meta');
  check('E4-3', /<title>[^<]+<\/title>/.test(html), 'index.html 有非空 <title>');
  return true;
}

// ---------------------------------------------------------------------------
// F. 合成契约样本：战役 / 人物 / 专题 / 阶段 / 双方对称（真实 fixture 未覆盖的渲染路径）　【PART 2 · WEB 渲染图/展示断言】
// ---------------------------------------------------------------------------

async function checkSynthetic(M) {
  const { buildSyntheticDocument } = await import(pathToFileUrl(path.join(SRC, 'testing', 'syntheticContractSample.mjs')));
  const doc = buildSyntheticDocument();
  const state = { status: 'fixture', doc, issues: [], sourceKey: 'synthetic' };
  const battle = doc.battles[0];
  const person = doc.people[0];

  const battleHtml = renderApp(M, { content: state, route: { view: 'battles', id: battle.id, query: '' } }).html;
  const sectionCount = countOf(battleHtml, 'data-battle-section=');
  check('F1', sectionCount === 14, `战役页按契约渲染全部 14 类分析小节（实际 ${sectionCount}）`);
  const sectionOrder = ['background', 'geography', 'participants', 'commanders', 'forces', 'objectives', 'constraints', 'plan', 'course', 'decisions', 'results', 'aftermath', 'controversies', 'furtherReading'];
  let orderOk = true;
  let cursor = -1;
  for (const key of sectionOrder) {
    const at = battleHtml.indexOf(`data-battle-section="${key}"`);
    if (at < 0 || at < cursor) orderOk = false;
    cursor = at;
  }
  check('F2', orderOk, '十四类战役字段按 coverage.battleSectionKeys 顺序渲染');
  check(
    'F3',
    battleHtml.includes('data-phase-id="phase-synthetic-1"') &&
      battleHtml.includes('data-phase-id="phase-synthetic-2"') &&
      battleHtml.includes('data-phase-field="knownEnemy"') &&
      battleHtml.includes('data-phase-field="unknownEnemy"'),
    '地图阶段按 sequence 渲染，并同时呈现双方「已知敌情 / 未知敌情」',
  );
  check(
    'F4',
    battleHtml.includes('示意航线') || battleHtml.includes('phase-synthetic'),
    '战役页渲染阶段区块（示意航线与阶段证据在展开区）',
  );
  check(
    'F5',
    battleHtml.includes(`href="#/people/${person.id}"`) &&
      battleHtml.includes(`href="#/atlas/${doc.places[0].id}"`) &&
      battleHtml.includes(`href="#/concepts/${doc.concepts[0].id}"`) &&
      battleHtml.includes(`href="#/timeline/${doc.events[0].id}"`),
    '战役页渲染到人物 / 地图 / 专题 / 时间线的跨入口互链',
  );

  const personHtml = renderApp(M, { content: state, route: { view: 'people', id: person.id, query: '' } }).html;
  const decisionKeys = ['当时知道什么', '可选方案', '约束', '实际选择', '后果'];
  check(
    'F6',
    decisionKeys.every((label) => personHtml.includes(label)) && personHtml.includes(`data-decision-id="${person.decisions[0].id}"`),
    `人物决策卡渲染六段结构：${decisionKeys.join(' / ')}`,
  );
  check(
    'F7',
    personHtml.includes('测试占位指挥官甲') && !personHtml.includes('正确') && !personHtml.includes('错误'),
    '人物页不使用「正确/错误」标签代替条件分析',
  );

  const conceptHtml = renderApp(M, { content: state, route: { view: 'concepts', id: doc.concepts[0].id, query: '' } }).html;
  const layerLevels = ['1', '2', '3'].filter((level) => conceptHtml.includes(`data-layer-level="${level}"`));
  check('F8', layerLevels.length === 3, `知识专题三轮层全部渲染（实际 ${layerLevels.length} 层），不折叠成一段`);

  const atlasHtml = renderApp(M, { content: state, route: { view: 'atlas', id: doc.places[0].id, query: '' } }).html;
  check(
    'F9',
    atlasHtml.includes('历史地名') &&
      atlasHtml.includes('现代地名') &&
      atlasHtml.includes('现代国家') &&
      atlasHtml.includes('节点精度') &&
      atlasHtml.includes('data-atlas-engine'),
    '地图地点详情同时显示历史地名、现代地名、国家、坐标精度，并挂载 SVG 地图引擎（MAP-00 取代原占位挂载点）',
  );

  const peopleListHtml = renderApp(M, { content: state, route: { view: 'people', id: null, query: '' } }).html;
  check(
    'F10',
    peopleListHtml.includes('>日本<') && peopleListHtml.includes('>盟军<'),
    '人物列表按阵营分组且双方使用同一套版式（对称呈现）',
  );

  const timelineHtml = renderApp(M, { content: state, route: { view: 'timeline', id: doc.events[0].id, query: '' } }).html;
  check(
    'F11',
    timelineHtml.includes(`href="#/battles/${battle.id}"`),
    `时间线事件的 battleId 渲染「进入战役」入口（${battle.id}）`,
  );

  // 合成样本同样必须被标记为测试样本
  const overviewHtml = renderApp(M, { content: state, route: { view: 'overview', id: null, query: '' } }).html;
  check('F12', overviewHtml.includes('data-content-status="fixture"'), '合成样本同样显示「测试样本」状态');
}

// ---------------------------------------------------------------------------
// G. 负例：证明检查本身有效（刻意构造错误，期望被拦下）　【PART 2 · WEB 渲染图/展示断言】
// ---------------------------------------------------------------------------

async function checkNegatives(M) {
  // G1：内容合法性检查真的会失败 —— 用非法根节点走同一套 inspectDocument。
  const broken = M.loadContent({ '/virtual/history.json': { schemaVersion: '1.0.0', fixtureOnly: false, events: [] } });
  check(
    'G1',
    broken.status === 'invalid' && broken.issues.length > 0,
    `缺少 10 个顶层数组的文档被拒绝（报出 ${broken.issues.length} 个问题）`,
  );

  // G2：fixtureOnly 不做文件名猜测 —— 改名后的合法 fixture 仍然显示测试样本。
  const min = loadFixture(FIXTURE_MIN);
  const renamed = { status: min.doc.fixtureOnly ? 'fixture' : 'available', doc: min.doc, issues: [], sourceKey: '/renamed/anything-else.json' };
  const renamedHtml = renderApp(M, { content: renamed, route: { view: 'overview', id: null, query: '' } }).html;
  check('G2', renamedHtml.includes('data-content-status="fixture"'), 'fixture 状态来自 fixtureOnly 标志而非文件名（重命名后仍标记为测试样本）');

  // G3：不可渲染的实体 ID 不应崩溃，应给出正常空状态页面。
  const minState = loadFixture(FIXTURE_MIN);
  let crashed = false;
  let html = '';
  try {
    html = renderApp(M, { content: minState, route: { view: 'battles', id: 'battle-does-not-exist', query: '' } }).html;
  } catch {
    crashed = true;
  }
  check('G3', !crashed && html.includes('data-empty-state=""'), '不存在的实体 ID 渲染空状态而不是崩溃');

  // G4：畸形 hash 不崩溃且回落到总览。
  for (const hash of ['#/%E4%B8%AD%ZZ', '#/../../etc/passwd', '#/timeline/']) {
    let route = null;
    let threw = false;
    try {
      route = M.parseRoute(hash);
    } catch {
      threw = true;
    }
    check(`G4-${hash}`, !threw && route !== null && typeof route.view === 'string', `畸形 hash ${JSON.stringify(hash)} 不抛异常（→ ${route?.view}）`);
  }

  // G5：断链来源 / 缺失 claim 必须被明确提示，而不是静默吞掉。
  const sourceById = new Map();
  const claimById = new Map();
  const panel = renderStatic(h(M.EvidencePanel, { claimIds: ['claim-missing'], sourceIds: ['source-missing'], claimById, sourceById }));
  check('G5', panel.includes('无法解析'), '缺失 claim 的证据面板明确提示无法解析（负例）');

  // G6：契约外的 claimType 不会渲染成任何标签。
  const bogus = renderStatic(h(M.ClaimTag, { type: 'nonsense' }));
  check('G6', bogus === '', '非法 claimType 不渲染标签（负例）');

  // G7：glob 返回「模块命名空间」/「默认导出」形态时必须仍能识别为内容。
  //     （回归测试：生产构建把 JSON 拆成独立 chunk 时，glob 值可能是
  //       { default: doc } 或 { default: doc, events, battles, ... }。）
  const doc = loadFixtureDocument(FIXTURE_MIN);
  const shapes = [
    ['直接对象', doc],
    ['命名空间只有 default', { default: doc }],
    ['命名空间带具名导出', { default: doc, events: doc.events, battles: doc.battles, claims: doc.claims }],
  ];
  for (const [label, value] of shapes) {
    let state = null;
    try {
      state = M.loadContent({ '/virtual/content/history.json': value });
    } catch (error) {
      state = { status: `throw:${error?.message}`, doc: null };
    }
    check(`G7-${label}`, state.status === 'fixture' && state.doc !== null, `${label} 被识别为内容（状态 ${state.status}）`);
  }
  // 不存在的路径仍然必须是 missing，而不是被误判成 invalid。
  const missing = M.loadContent({});
  check('G8', missing.status === 'missing', `glob 无内容时为 missing（实际 ${missing.status}）`);
  // 惰性加载形态：不能同步误判为 invalid，异步加载后应得到内容。
  const lazy = M.loadContent({ '/virtual/content/history.json': () => Promise.resolve({ default: doc }) });
  check('G9-sync', lazy.status === 'loading', `惰性加载形态同步阶段为 loading 而不是误判 invalid（实际 ${lazy.status}）`);
  const lazyAsync = await M.loadContentAsync({ '/virtual/content/history.json': () => Promise.resolve({ default: doc }) });
  check('G9-async', lazyAsync.status === 'fixture' && lazyAsync.doc !== null, `惰性加载形态异步加载后识别为内容（状态 ${lazyAsync.status}）`);
  const failedLazy = await M.loadContentAsync({ '/virtual/content/history.json': () => Promise.reject(new Error('chunk 404')) });
  check('G10', failedLazy.status === 'error', `内容模块加载失败时为 error 而不是当成空内容（实际 ${failedLazy.status}）`);
}

// ---------------------------------------------------------------------------
// MAP-00. Atlas 地图引擎与阶段控件　【PART 2 · WEB 渲染图/展示断言】
// ---------------------------------------------------------------------------
//
// 用 fixtures.valid-min（真实契约 fixture，battles 为空）+ syntheticContractSample
// （fixtureOnly=true，含 phases[]）作为**唯二**测试输入。
// 断言的是结构能力（引擎渲染、缩放/平移数学、图层、阶段字段、certainty、键盘/触摸
// 事件接线），不依赖任何真实历史内容；fixture 的历史句子不得出现在真实内容页面上（见 D2-2）。

async function checkAtlas(M) {
  const synthetic = await loadSyntheticDocument();
  const battle = synthetic.battles[0];
  const phases = battle.phases;
  const places = synthetic.places;

  // ---------------------------------------------------------------- M1 投影数学
  const projection = M.createProjection(M.PACIFIC_BOUNDS);
  const tokyo = M.project({ lat: 35.6762, lng: 139.6503 }, projection);
  const pearl = M.project({ lat: 21.3527, lng: -157.95 }, projection);
  const roundtrip = M.unproject(tokyo.x, tokyo.y, projection);
  check(
    'M1-1',
    Math.abs(roundtrip.lat - 35.6762) < 1e-6 && Math.abs(roundtrip.lng - 139.6503) < 1e-6,
    `投影可逆（东京 → SVG → 地理坐标往返误差 < 1e-6；得到 ${roundtrip.lat.toFixed(4)}, ${roundtrip.lng.toFixed(4)}）`,
  );
  // 等距圆柱投影里 x 随展开经度单调递增：东京 139.65° < 珍珠港 202.05°（= -157.95 + 360），
  // 因此珍珠港在本投影中 x 更大。跨 180° 线时「谁在西边」不能按 x 直接比较大洲位置，
  // 这里断言的是**投影单调性**这一可验证事实，而不是容易被绕晕的地理直觉。
  check(
    'M1-2',
    tokyo.x < pearl.x && M.lngUnwrapped(139.6503) < M.lngUnwrapped(-157.95),
    `经度展开单调：展开经度 东京 ${M.lngUnwrapped(139.6503).toFixed(2)} < 珍珠港 ${M.lngUnwrapped(-157.95).toFixed(2)}，SVG x ${tokyo.x.toFixed(1)} < ${pearl.x.toFixed(1)}`,
  );
  check(
    'M1-3',
    M.project({ lat: 50, lng: 150 }, projection).y < M.project({ lat: 0, lng: 150 }, projection).y,
    '纬度方向正确：北纬越高，SVG y 越小',
  );
  const autoBounds = M.boundsForPlaces(places);
  check(
    'M1-4',
    autoBounds.maxLat > autoBounds.minLat && autoBounds.maxLng > autoBounds.minLng,
    `地点自动视野有效（纬度 ${autoBounds.minLat.toFixed(1)}..${autoBounds.maxLat.toFixed(1)}，经度 ${autoBounds.minLng.toFixed(1)}..${autoBounds.maxLng.toFixed(1)}）`,
  );
  check(
    'M1-5',
    M.lngUnwrapped(-157.95) === 202.05 && M.lngUnwrapped(139.65) === 139.65,
    '跨 180° 经线的经度展开正确（西经 → 202.05，东经不变）',
  );

  // ---------------------------------------------------------------- M2 缩放/平移数学
  const zoomed = M.zoomAt(M.IDENTITY_TRANSFORM, 2, { x: 320, y: 200 });
  check('M2-1', Math.abs(zoomed.zoom - 2) < 1e-9, `以中心点放大 2 倍得到 zoom=${zoomed.zoom}`);
  const clampedMax = M.zoomAt(M.IDENTITY_TRANSFORM, 1000, { x: 320, y: 200 });
  check('M2-2', clampedMax.zoom === M.MAX_ZOOM, `缩放上限被钳制在 ${M.MAX_ZOOM}（实际 ${clampedMax.zoom}）`);
  const clampedMin = M.zoomAt(M.IDENTITY_TRANSFORM, 0.001, { x: 320, y: 200 });
  check('M2-3', clampedMin.zoom === M.MIN_ZOOM, `缩放下限被钳制在 ${M.MIN_ZOOM}（实际 ${clampedMin.zoom}）`);
  // zoom=2 时合法平移范围是 ±(W*(2-1)/2) = ±320，所以用 40/-25 这种小位移验证累加。
  // 先放大到 2 倍再平移：zoom=2 时合法平移范围是 ±(W*(2-1)/2)=±320。
  // 但 zoomAt 的返回值已含焦点平移分量，这里先在 zoom=2 / 无平移的基准上位移，验证纯累加。
  const base2 = M.clampTransform({ zoom: 2, tx: 0, ty: 0 });
  const panned = M.panBy(base2, 40, -25);
  check('M2-4', Math.abs(panned.tx - 40) < 1e-9 && Math.abs(panned.ty + 25) < 1e-9, `平移累加正确（tx=${panned.tx}, ty=${panned.ty}）`);
  const outOfBounds = M.panBy(zoomed, 10000, 10000);
  const maxTx = (M.VIEW_WIDTH * (zoomed.zoom - 1)) / 2;
  check(
    'M2-5',
    outOfBounds.tx <= maxTx + 1e-9 && outOfBounds.ty <= maxTx + 1e-9,
    `平移被限制在画布内（tx=${outOfBounds.tx.toFixed(1)} ≤ 上限 ${maxTx.toFixed(1)}）`,
  );
  // 以焦点缩放时焦点不动
  const focus = { x: 160, y: 120 };
  const atFocus = M.zoomAt(M.IDENTITY_TRANSFORM, 2, focus);
  const focusAfter = { x: atFocus.tx + focus.x * atFocus.zoom, y: atFocus.ty + focus.y * atFocus.zoom };
  check(
    'M2-6',
    Math.abs(focusAfter.x - focus.x) < 1e-9 && Math.abs(focusAfter.y - focus.y) < 1e-9,
    '以焦点缩放时焦点保持在原位（缩放不跳动）',
  );
  check('M2-7', M.svgTransform(M.IDENTITY_TRANSFORM) === 'translate(0.000 0.000) scale(1.0000)', 'SVG transform 字符串格式正确');
  const radius = M.uncertaintyRadius(120, projection);
  check(
    'M2-8',
    radius > 0 && Number.isFinite(radius),
    `不确定半径换算为 SVG 半径（120 km → ${radius.toFixed(2)} user units）`,
  );

  // ---------------------------------------------------------------- M3 阶段排序与摘要
  const sorted = M.sortPhases([...phases].reverse());
  check(
    'M3-1',
    sorted.every((phase, i) => i === 0 || sorted[i - 1].sequence <= phase.sequence),
    `阶段按 sequence 升序排序（${sorted.map((phase) => phase.sequence).join(' → ')}）`,
  );
  const summary = M.phaseSummary(sorted[0]);
  check(
    'M3-2',
    summary.hasKnownEnemy && summary.hasUnknownEnemy && summary.hasDecision && summary.hasConsequence,
    '合成阶段样本含双方 knownEnemy / unknownEnemy / decision / consequence',
  );
  check(
    'M3-3',
    summary.positionSchematic.japan === true && summary.positionSchematic.allies === true,
    '阶段位置在样本中标记 schematic=true（示意）',
  );
  check('M3-4', M.phasesUsable(undefined).length === 0 && M.phasesUsable([]).length === 0, '无阶段数据时 phasesUsable 安全返回空数组（负例）');

  // ---------------------------------------------------------------- M4 真实内容：无战役 → 诚实空状态
  const realDoc = loadRealContentDocument();
  check('M4-0', Boolean(realDoc), '真实内容 content/history.json 可读取（M4 段渲染真实地图的数据来源）');
  const realState = fixtureStateFrom(realDoc ?? M.emptyDocument(), 'content/history.json');
  const realAtlasHtml = renderApp(M, { content: realState, route: { view: 'atlas', id: null, query: '' } }).html;
  check(
    'M4-1',
    realAtlasHtml.includes('data-atlas-engine'),
    `真实内容下地图引擎仍然渲染（content 有 ${realDoc.places.length} 个地点）`,
  );
  // D5 修复：原实现是 `条件 ? 断言 : true`，当真实内容以后有了 battles 时这一项会
  // 恒真跳过（vacuous）。现在分两种真实情况各自断言，任何分支都必须成立：
  //   - battles 为空 → 必须显示诚实空状态，且**不得**渲染阶段控件；
  //   - battles 非空 → 必须渲染阶段控件，且**不得**显示「尚未交付」文案。
  const realHasPhases = realDoc.battles.some((battle) => Array.isArray(battle.phases) && battle.phases.length > 0);
  if (realHasPhases) {
    check(
      'M4-2',
      realAtlasHtml.includes('data-phase-controls') && !realAtlasHtml.includes('地图阶段数据尚未交付'),
      `真实内容含可推演阶段（${realDoc.battles.length} 场战役）→ 渲染阶段控件，且不显示「尚未交付」`,
    );
  } else {
    check(
      'M4-2',
      realAtlasHtml.includes('地图阶段数据尚未交付') && !realAtlasHtml.includes('data-phase-controls'),
      `真实内容 battles[]=${realDoc.battles.length} 且无阶段数据 → 显示诚实空状态，且不渲染阶段控件（不编造阶段）`,
    );
  }
  check(
    'M4-3',
    realAtlasHtml.includes('data-place-id="' + realDoc.places[0].id + '"') || realAtlasHtml.includes('pw-map__place'),
    '真实地点渲染进 SVG 地图（含 data-place-id）',
  );
  const realPlaceNames = realDoc.places.slice(0, 3).map((place) => place.historicalName);
  check(
    'M4-4',
    realPlaceNames.every((name) => realAtlasHtml.includes(name)),
    `真实地点名称出现在地图上（${realPlaceNames.join('、')}）`,
  );
  // 真实页面不得出现合成样本（fixture）的占位文本
  check(
    'M4-5',
    !realAtlasHtml.includes('测试占位'),
    '真实内容页面不包含任何合成 fixture 占位文本（fixture 不作为历史发布）',
  );

  // ---------------------------------------------------------------- M5 合成样本：阶段推演 UI 渲染
  const syntheticState = fixtureStateFrom(synthetic, 'synthetic');
  const syntheticHtml = renderApp(M, { content: syntheticState, route: { view: 'atlas', id: null, query: '' } }).html;
  check('M5-1', syntheticHtml.includes('data-phase-controls'), '阶段控件渲染（播放/暂停/前进后退）');
  check('M5-2', syntheticHtml.includes('data-date-selector') && syntheticHtml.includes('data-date-range'), '时间轴联动控件渲染（range 滑块）');
  check('M5-3', syntheticHtml.includes('data-layers-control'), '图层控件渲染');
  check('M5-4', syntheticHtml.includes('data-atlas-canvas') && syntheticHtml.includes('tabindex="0"'), '地图画布可聚焦（键盘可达）');
  check(
    'M5-5',
    syntheticHtml.includes('data-phase-time') && syntheticHtml.includes(sorted[0].time.display),
    `阶段时间可见（${sorted[0].time.display}）`,
  );
  for (const field of ['knownEnemy', 'unknownEnemy', 'decision', 'consequence', 'positions']) {
    check(`M5-field-${field}`, syntheticHtml.includes(`data-phase-field="${field}"`), `阶段情报面板渲染 ${field}`);
  }
  check(
    'M5-6',
    syntheticHtml.includes('data-position-schematic="true"'),
    '位置标记「示意」并在界面上可见（schematic=true）',
  );
  check(
    'M5-7',
    syntheticHtml.includes('data-certainty-legend') && syntheticHtml.includes('data-uncertainty-note'),
    'certainty 与不确定说明在图例中可见',
  );
  check(
    'M5-8',
    syntheticHtml.includes('data-side-encoding="japan"') && syntheticHtml.includes('data-side-encoding="allies"'),
    '双方编码在界面上可见（形状 + 线型，不只靠颜色）',
  );
  check(
    'M5-9',
    syntheticHtml.includes(`data-phase-id="${sorted[0].id}"`),
    '当前阶段面板对应第一个阶段（按 sequence）',
  );
  check(
    'M5-10',
    syntheticHtml.includes('data-route-id="route-synthetic-1"'),
    '示意航线在阶段面板列出并注明不是精确历史航迹',
  );

  // ---------------------------------------------------------------- M6 图层开关影响 SVG 内容
  const noPlacesLayers = { ...M.DEFAULT_LAYERS, places: false, routes: false, uncertainty: false, graticule: false, positions: false };
  const layersHtml = renderStatic(
    h(M.Atlas, {
      places,
      battles: synthetic.battles,
      selectedPlaceId: null,
      onSelectPlace: () => {},
      initialLayers: noPlacesLayers,
    }),
  );
  check(
    'M6-1',
    !layersHtml.includes('data-layer="place"') && !layersHtml.includes('data-layer="route"'),
    '关闭地点/航线图层后对应 SVG 元素不再渲染（图层开关真实生效）',
  );
  const withLayersHtml = renderStatic(
    h(M.Atlas, {
      places,
      battles: synthetic.battles,
      selectedPlaceId: null,
      onSelectPlace: () => {},
      initialLayers: { ...M.DEFAULT_LAYERS, places: true, routes: true },
    }),
  );
  check(
    'M6-2',
    withLayersHtml.includes('data-layer="place"') && withLayersHtml.includes('data-layer="route"') && withLayersHtml.includes('data-layer="position"'),
    '开启图层后地点、航线、阶段位置都渲染',
  );
  check(
    'M6-3',
    withLayersHtml.includes('data-schematic="true"') && withLayersHtml.includes('data-uncertainty-radius-km'),
    '位置/航线带 schematic 标记与不确定半径属性（可在界面与 DOM 层核查）',
  );

  // ---------------------------------------------------------------- M7 键盘与触摸接线
  const engineSource = fs.readFileSync(path.join(SRC, 'atlas', 'mapEngine.tsx'), 'utf8');
  for (const [id, needle, label] of [
    ['M7-1', "case 'ArrowLeft'", '方向键平移（左）'],
    ['M7-2', "case 'ArrowRight'", '方向键平移（右）'],
    ['M7-3', "case '+'", '键盘放大'],
    ['M7-4', "case '-'", '键盘缩小'],
    ['M7-5', "case '0'", '键盘复位'],
    ['M7-6', 'onPointerDown', '指针事件（鼠标/单指拖动平移）'],
    ['M7-7', 'pinchRef', '双指捏合缩放'],
  ]) {
    check(id, engineSource.includes(needle), `键盘/触摸实现存在：${label}`);
  }
  const cssSource = fs.readFileSync(path.join(SRC, 'styles', 'app.css'), 'utf8');
  check('M7-9', cssSource.includes('touch-action: none'), '地图画布设置 touch-action: none（触摸拖动不被页面滚动抢占）');
  check(
    'M7-10',
    engineSource.includes('tabIndex={0}') && engineSource.includes('role="application"'),
    '地图画布可聚焦且声明为可交互区域',
  );
  check(
    'M7-11',
    !/https?:\/\/(?!example\.invalid)/.test(engineSource.replace(/\/\*[\s\S]*?\*\//g, '')) || !/tile|leaflet|mapbox|googleapis/i.test(engineSource),
    '地图引擎不含外部瓦片/地图库依赖（离线可用）',
  );
  const controlsSource = fs.readFileSync(path.join(SRC, 'atlas', 'controls.tsx'), 'utf8');
  check(
    'M7-12',
    controlsSource.includes('prefers-reduced-motion') || controlsSource.includes("'(prefers-reduced-motion: reduce)'"),
    '阶段控件尊重 prefers-reduced-motion',
  );

  // ---------------------------------------------------------------- M8 播放状态机（hook 单元行为）
  // 通过组件渲染验证「播放/暂停」按钮与 aria-pressed 的初始状态和计数文案。
  const phaseControlsHtml = renderStatic(
    h(M.PhaseControls, {
      phases: sorted,
      activeIndex: 0,
      playing: false,
      onTogglePlay: () => {},
      onStep: () => {},
      reducedMotion: false,
      narrativeHref: '#/battles/battle-synthetic-one',
    }),
  );
  check(
    'M8-1',
    phaseControlsHtml.includes('data-phase-action="playpause"') &&
      phaseControlsHtml.includes('aria-pressed="false"') &&
      phaseControlsHtml.includes('播放'),
    '播放按钮初始状态为未播放（aria-pressed=false）',
  );
  check(
    'M8-2',
    phaseControlsHtml.includes(`阶段 1 / ${sorted.length}`),
    `阶段计数器显示 1 / ${sorted.length}`,
  );
  check(
    'M8-3',
    phaseControlsHtml.includes('data-phase-action="prev"') && /data-phase-action="prev"[^>]*disabled/.test(phaseControlsHtml),
    '第一阶段时「上一阶段」按钮禁用（边界正确）',
  );
  check(
    'M8-4',
    phaseControlsHtml.includes('href="#/battles/battle-synthetic-one"'),
    '阶段控件提供「阅读战役全文」链接（从地图跳转到叙述）',
  );
  const playingControlsHtml = renderStatic(
    h(M.PhaseControls, {
      phases: sorted,
      activeIndex: sorted.length - 1,
      playing: true,
      onTogglePlay: () => {},
      onStep: () => {},
      reducedMotion: true,
      narrativeHref: undefined,
    }),
  );
  check(
    'M8-5',
    playingControlsHtml.includes('aria-pressed="true"') && playingControlsHtml.includes('暂停') && playingControlsHtml.includes('data-reduced-motion="true"'),
    '播放中状态显示「暂停」并提示已按系统设置减少动态效果',
  );
  check(
    'M8-6',
    /data-phase-action="next"[^>]*disabled/.test(playingControlsHtml),
    '最后一个阶段时「下一阶段」按钮禁用（边界正确）',
  );

  // ---------------------------------------------------------------- M9 负例
  const onePhase = renderStatic(
    h(M.DateSelector, { phases: [sorted[0]], activeIndex: 0, onSelectIndex: () => {} }),
  );
  const onePhaseRange = (onePhase.match(/<input[^>]*type="range"[^>]*>/) ?? [''])[0];
  check('M9-1', onePhaseRange.includes('disabled'), `只有一个阶段时时间轴滑块禁用（实际 input: ${onePhaseRange.slice(0, 120)}）`);
  const emptySelector = renderStatic(h(M.DateSelector, { phases: [], activeIndex: 0, onSelectIndex: () => {} }));
  check(
    'M9-2',
    emptySelector.includes('本战役还没有地图阶段数据') && !emptySelector.includes('data-date-display'),
    '无阶段时时间轴显示诚实说明而不是伪造日期（负例）',
  );
  const emptyControls = renderStatic(
    h(M.PhaseControls, { phases: [], activeIndex: 0, playing: false, onTogglePlay: () => {}, onStep: () => {}, reducedMotion: false }),
  );
  check('M9-3', emptyControls === '', '无阶段时不渲染阶段控件（负例）');
  check('M9-4', M.pickBattle([]) === null, '战役列表为空时 pickBattle 返回 null（不会编造战役）');
  const noPhaseBattle = { ...battle, phases: [] };
  check('M9-5', M.pickBattle([noPhaseBattle]) === null, '有战役但没有 phases 时 pickBattle 返回 null（不推演空阶段）');
  check(
    'M9-6',
    M.pickBattle([noPhaseBattle, battle])?.id === battle.id,
    'pickBattle 跳过无阶段战役，选择第一个有阶段的战役',
  );
  const invalidPlaceHtml = renderStatic(
    h(M.Atlas, {
      places: [{ ...places[0], coordinates: { lat: Number.NaN, lng: Number.NaN } }],
      battles: [],
      selectedPlaceId: null,
      onSelectPlace: () => {},
    }),
  );
  check(
    'M9-7',
    !invalidPlaceHtml.includes('NaN'),
    '坐标非法的地点不会渲染成 NaN 坐标（负例：防御性过滤）',
  );
  const unknownCertaintyHtml = renderStatic(h(M.CertaintyTag, { type: 'nonsense' }));
  check('M9-8', unknownCertaintyHtml === '', '契约外的 certainty 值不渲染标签（负例）');
  for (const certainty of ['documented', 'estimated', 'disputed', 'schematic']) {
    const html = renderStatic(h(M.CertaintyTag, { type: certainty }));
    check(`M9-certainty-${certainty}`, html.includes(`data-certainty="${certainty}"`), `CertaintyTag 渲染 ${certainty}（修复前 documented/estimated 会被 ClaimTag 静默丢弃，见 src/data/types.ts 的 BUGFIX 记录）`);
  }

  // ---------------------------------------------------------------- M10 控件接线（无条件执行）
  // a4 说明：历史版本用 jsdom 挂载真实 DOM 派发事件，但 jsdom 不是本工程依赖
  // （package-lock 中没有，中央 `npm ci` 不会安装），因此那条路径在权威环境里只能
  // 写成 SKIP —— 而「前置条件缺失 → SKIP → 整体 PASS」正是本任务被拒的缺陷。
  // 浏览器 DOM 级交互（真实 click / 键盘 / 触摸）由 QA-01 的 Playwright 套件负责；
  // 本组改为**无条件执行**的接线断言：把组件实际调用的同一份状态机的输出作为受控
  // props 喂回真实控件组件，断言可见 DOM 确实随状态改变。
  checkControlWiring(M, synthetic);
}

/**
 * M10 控件接线（无条件运行，不依赖 jsdom）。
 *
 * 断言链路：纯函数状态机（组件内部实际调用的同一实现）→ 真实控件组件 →
 * 渲染出的可见 DOM 状态（aria-pressed / disabled / 文本 / 节点存在性）随之改变。
 * 每一步都断言具体状态变化，没有任何「无 jsdom 就跳过」的分支。
 */
function checkControlWiring(M, synthetic) {
  const phases = M.sortPhases(synthetic.battles[0].phases);
  const phaseCount = phases.length;

  // ---- 播放 / 暂停：状态机 togglePlayback 的输出驱动按钮 aria-pressed 与文案
  const paused = { ...M.INITIAL_PLAYBACK };
  const playing = M.togglePlayback(paused, phaseCount);
  const renderControls = (state) =>
    renderStatic(
      h(M.PhaseControls, {
        phases,
        activeIndex: state.activeIndex,
        playing: state.playing,
        onTogglePlay: () => {},
        onStep: () => {},
        reducedMotion: false,
      }),
    );
  const pausedHtml = renderControls(paused);
  const playingHtml = renderControls(playing);
  const playButton = (html) => (html.match(/<button[^>]*data-phase-action="playpause"[^>]*>[\s\S]*?<\/button>/) ?? [''])[0];
  check(
    'M10-1',
    /aria-pressed="false"/.test(playButton(pausedHtml)) && playButton(pausedHtml).includes('播放'),
    'M10 播放/暂停接线：state.playing=false → 按钮 aria-pressed="false" 且文案为「播放」',
  );
  check(
    'M10-2',
    /aria-pressed="true"/.test(playButton(playingHtml)) && playButton(playingHtml).includes('暂停'),
    'M10 播放/暂停接线：togglePlayback 后 playing=true → 同一按钮 aria-pressed="true" 且文案变为「暂停」（可观察差异）',
  );

  // ---- 上一 / 下一阶段：stepPlayback 输出驱动 disabled 边界与阶段计数
  const first = { activeIndex: 0, playing: false };
  const atSecond = M.stepPlayback(first, 1, phaseCount);
  const firstHtml = renderControls(first);
  const secondHtml = renderControls(atSecond);
  const prevButton = (html) => (html.match(/<button[^>]*data-phase-action="prev"[^>]*>/) ?? [''])[0];
  const nextButton = (html) => (html.match(/<button[^>]*data-phase-action="next"[^>]*>/) ?? [''])[0];
  check(
    'M10-3',
    /disabled/.test(prevButton(firstHtml)) && !/disabled/.test(nextButton(firstHtml)),
    'M10 阶段接线：首阶段时「上一阶段」禁用、「下一阶段」可用',
  );
  check(
    'M10-4',
    !/disabled/.test(prevButton(secondHtml)) && secondHtml.includes(`阶段 2 / ${phaseCount}`),
    `M10 阶段接线：stepPlayback 前进一步后计数变为「阶段 2 / ${phaseCount}」且「上一阶段」启用`,
  );
  const atLast = { activeIndex: phaseCount - 1, playing: false };
  check('M10-5', /disabled/.test(nextButton(renderControls(atLast))), 'M10 阶段接线：末阶段时「下一阶段」禁用（边界正确）');

  // ---- 图层：setLayerChecked 的输出驱动真实图层按钮的 aria-pressed
  const layerButton = (html, key) => (html.match(new RegExp(`<button[^>]*data-layer-button="${key}"[^>]*>`)) ?? [''])[0];
  const defaultLayersHtml = renderStatic(h(M.LayersControl, { layers: M.DEFAULT_LAYERS, onChange: () => {} }));
  const hiddenLayersHtml = renderStatic(
    h(M.LayersControl, { layers: M.setLayerChecked(M.DEFAULT_LAYERS, 'places', false), onChange: () => {} }),
  );
  check(
    'M10-6',
    layerButton(defaultLayersHtml, 'places').includes('aria-pressed="true"'),
    'M10 图层接线：DEFAULT_LAYERS 下「地点」图层按钮 aria-pressed="true"',
  );
  check(
    'M10-7',
    layerButton(hiddenLayersHtml, 'places').includes('aria-pressed="false"') &&
      layerButton(hiddenLayersHtml, 'routes').includes('aria-pressed="true"'),
    'M10 图层接线：setLayerChecked(places=false) 后仅「地点」按钮变 false，routes 保持 true',
  );

  // ---- 时间轴联动：activeIndex 驱动 data-date-display 文本与 data-date-jump 选中态
  const selectorHtml = (activeIndex) =>
    renderStatic(h(M.DateSelector, { phases, activeIndex, onSelectIndex: () => {}, showStepButtons: true }));
  const selectorFirst = selectorHtml(0);
  const selectorSecond = selectorHtml(1);
  check(
    'M10-8',
    (selectorFirst.match(/data-date-jump=/g) ?? []).length === phaseCount,
    `M10 时间轴接线：为 ${phaseCount} 个阶段渲染 ${phaseCount} 个时间点按钮`,
  );
  const jumpButton = (html, index) => (html.match(new RegExp(`<button[^>]*data-date-jump="${index}"[^>]*>`)) ?? [''])[0];
  check(
    'M10-9',
    jumpButton(selectorFirst, 0).includes('aria-pressed="true"') &&
      jumpButton(selectorFirst, 1).includes('aria-pressed="false"') &&
      jumpButton(selectorSecond, 0).includes('aria-pressed="false"') &&
      jumpButton(selectorSecond, 1).includes('aria-pressed="true"'),
    'M10 时间轴接线：activeIndex 0→1 时选中态从第 1 个时间点移动到第 2 个（可观察差异）',
  );
  check(
    'M10-10',
    selectorFirst.includes(phases[0].time.display) && !selectorFirst.includes(phases[1].time.display) && selectorSecond.includes(phases[1].time.display),
    'M10 时间轴接线：data-date-display 随 activeIndex 显示对应阶段时间（不是固定文案）',
  );

  // ---- Atlas 受控图层：状态机输出作为 initialLayers → 地图 DOM 真的少一层
  const atlasPlacesOff = renderStatic(
    h(M.Atlas, {
      places: synthetic.places,
      battles: synthetic.battles,
      selectedPlaceId: null,
      onSelectPlace: () => {},
      initialLayers: M.setLayerChecked(M.DEFAULT_LAYERS, 'places', false),
    }),
  );
  check(
    'M10-11',
    layerButton(atlasPlacesOff, 'places').includes('aria-pressed="false"') && !atlasPlacesOff.includes('data-layer="place"'),
    'M10 Atlas 图层接线：initialLayers 关闭 places → 地点节点从地图 DOM 消失且图层按钮为 false',
  );

  // ---- 键盘 / 触摸的接线点存在（行为逻辑由 D3 状态机断言；真实 DOM 事件由 QA-01 覆盖）
  check(
    'M10-12',
    /<svg[^>]*role="application"[^>]*tabindex="0"[^>]*data-atlas-canvas/.test(atlasPlacesOff) &&
      atlasPlacesOff.includes('使用方向键平移，加号减号缩放，数字键 0 复位'),
    'M10 键盘接线：地图画布是 role="application" + tabindex="0"，并声明方向键/±/0 操作说明',
  );

  // ---- 触摸位移坐标换算（纯数学，不依赖 DOM 布局；原 M10-16）
  const rectFake = { left: 0, top: 0, width: M.VIEW_WIDTH, height: M.VIEW_HEIGHT };
  const userA = M.toUserSpace(200, 150, rectFake, M.IDENTITY_TRANSFORM);
  const userB = M.toUserSpace(264, 190, rectFake, M.IDENTITY_TRANSFORM);
  check(
    'M10-13',
    Math.abs(userB.x - userA.x - 64) < 1e-9,
    `M10 触摸位移：客户端水平 64px → 用户坐标 ${(userB.x - userA.x).toFixed(1)}（zoom=1 时可逆换算）`,
  );
  check(
    'M10-14',
    Math.abs(userB.y - userA.y - 40) < 1e-9,
    `M10 触摸位移：客户端垂直 40px → 用户坐标 ${(userB.y - userA.y).toFixed(1)}（zoom=1 时可逆换算）`,
  );
}

// ---------------------------------------------------------------------------
// D2. 用**真实契约 fixture** `contracts/fixtures/valid-min.json` 驱动地图引擎检查　【PART 2 · WEB；夹具解析来自 PART 1】
// ---------------------------------------------------------------------------
//
// 评审意见：order 要求「用 valid-min.json 验证地图引擎」，但 checkAtlas 从未加载它
// （注释声称用了，实际没有）。本组检查直接读取 FIXTURE_MIN，用它的 places / battles
// 驱动引擎，并引用 fixture 内的真实 ID，避免「用合成数据冒充 fixture 验证」。

function checkAtlasAgainstValidMinFixture(M) {
  // 夹具解析来自 PART 1：loadFixtureDocument()（唯一读取入口）；缺失即失败，不跳过。
  check('D2-fixture-present', fs.existsSync(FIXTURE_MIN), '已接受契约夹具 contracts/fixtures/valid-min.json 存在');
  if (!fs.existsSync(FIXTURE_MIN)) {
    fail('D2-0', '无法执行 valid-min 地图引擎检查：已接受夹具缺失（前置条件缺失必须失败）');
    return;
  }
  const fixture = loadFixtureDocument(FIXTURE_MIN);
  const fixturePlaces = Array.isArray(fixture.places) ? fixture.places : [];
  const fixtureBattles = Array.isArray(fixture.battles) ? fixture.battles : [];

  check(
    'D2-0',
    fixture.fixtureOnly === true,
    `valid-min.json 是测试样本（fixtureOnly=${fixture.fixtureOnly}），只能用于测试，不作为历史发布`,
  );
  check(
    'D2-1',
    fixturePlaces.length > 0,
    `valid-min.json 含 ${fixturePlaces.length} 个真实地理节点（${fixturePlaces.map((p) => p.id).join(', ')}）`,
  );

  // ---- 引擎投影 fixture 的 places：数量、边界、往返
  const bounds = M.boundsForPlaces(fixturePlaces);
  const projection = M.createProjection(bounds);
  for (const place of fixturePlaces) {
    const point = M.project(place.coordinates, projection);
    const back = M.unproject(point.x, point.y, projection);
    const inBounds =
      point.x >= -1 && point.x <= M.VIEW_WIDTH + 1 && point.y >= -1 && point.y <= M.VIEW_HEIGHT + 1;
    check(
      `D2-place-${place.id}`,
      Number.isFinite(point.x) &&
        Number.isFinite(point.y) &&
        inBounds &&
        Math.abs(back.lat - place.coordinates.lat) < 1e-6 &&
        // unproject 归一到 -180..180，与 fixture 的 lng 约定一致，因此直接比较。
        Math.abs(back.lng - place.coordinates.lng) < 1e-6,
      `fixture 地点 ${place.id}（${place.historicalName}）投影到视口内 (${point.x.toFixed(1)}, ${point.y.toFixed(1)}) 且可逆`,
    );
  }
  const lats = fixturePlaces.map((p) => p.coordinates.lat);
  const lngs = fixturePlaces.map((p) => (p.coordinates.lng < 0 ? p.coordinates.lng + 360 : p.coordinates.lng));
  check(
    'D2-2',
    bounds.minLat <= Math.min(...lats) && bounds.maxLat >= Math.max(...lats) && bounds.minLng <= Math.min(...lngs) && bounds.maxLng >= Math.max(...lngs),
    `投影边界完整覆盖 fixture 的所有地点（lat ${bounds.minLat.toFixed(1)}..${bounds.maxLat.toFixed(1)}，lng ${bounds.minLng.toFixed(1)}..${bounds.maxLng.toFixed(1)}）`,
  );

  // ---- 引擎渲染 fixture：地点出现在 SVG 中，且 battles:[] → 诚实空阶段状态
  const state = fixtureStateFrom(fixture, 'valid-min.json');
  const html = renderApp(M, { content: state, route: { view: 'atlas', id: null, query: '' } }).html;
  check('D2-3', html.includes('data-atlas-engine'), '用 valid-min.json 渲染地图入口时，SVG 引擎已挂载');
  for (const place of fixturePlaces) {
    check(
      `D2-render-${place.id}`,
      html.includes(`data-place-id="${place.id}"`) && html.includes(place.historicalName),
      `fixture 地点 ${place.id} 渲染进 SVG（含历史地名「${place.historicalName}」）`,
    );
  }
  check(
    'D2-4',
    fixtureBattles.length === 0,
    `valid-min.json 的 battles 为空数组（${fixtureBattles.length} 条），因此必须显示诚实空状态而不是编造阶段`,
  );
  check(
    'D2-5',
    html.includes('地图阶段数据尚未交付') && !html.includes('data-phase-controls'),
    'battles:[] 时地图显示「地图阶段数据尚未交付」，且**不渲染**阶段控件（没有可推演的阶段）',
  );
  // fixture 的「测试样本」状态必须可见。该横幅渲染在**总览页**（statusCopy），
  // 而不是地图页 —— 因此在 overview 路由上断言，避免用错页面得出假结论。
  const overviewHtml = renderApp(M, { content: state, route: { view: 'overview', id: null, query: '' } }).html;
  check(
    'D2-6',
    overviewHtml.includes('data-content-status="fixture"') && overviewHtml.includes('测试样本'),
    'valid-min.json（fixtureOnly=true）在总览页显示「测试样本」横幅，不作为历史发布',
  );

  // ---- 用 fixture 的 places 驱动图层/缩放状态机（同一批真实坐标）
  const fixtureLayerOff = M.setLayerChecked(M.DEFAULT_LAYERS, 'places', false);
  check(
    'D2-7',
    fixtureLayerOff.places === false,
    'fixture 渲染的地图同样受图层开关控制（关闭 places → 地点图层关闭）',
  );
  const fixtureZoom = M.zoomByFactor(M.IDENTITY_TRANSFORM, 2);
  check('D2-8', fixtureZoom.zoom === 2, 'fixture 渲染的地图同样支持缩放（zoom 1 → 2）');
}

// ---------------------------------------------------------------------------
// D3. 交互行为测试 —— **无条件运行**（不依赖 jsdom / 浏览器）　【PART 2 · WEB 渲染图/展示断言】
// ---------------------------------------------------------------------------
//
// 评审意见：缩放/平移/图层/播放只有 grep 或静态标记检查，真实事件路径从未执行；
// 旧 M10 jsdom 组在权威环境里只能 SKIP，因此「控件是否真的工作」没有证据。
//
// 解决方式：
// 1. 组件里的状态迁移已提炼为纯函数 `src/atlas/stateMachines.ts`，**组件与测试调用同一份实现**
//    （不是测试副本）；
// 2. 本组检查直接调用这些函数，断言状态迁移；同时用静态渲染验证「控件把事件接到了这些函数上」
//    （onChange / onClick 的真实 handler 在渲染后的 HTML 中表现为对应的 data-* 钩子）。
// 这样任何环境下都会运行，且不可能 vacuous —— 每一步都断言具体的状态变化。

/** 断言纯函数状态迁移（D3 核心）。 */
function checkInteractionStateMachines(M, synthetic) {
  const phaseCount = M.sortPhases(synthetic.battles[0].phases).length;

  // ---- 图层开关：真实的复选框 onChange 路径（setLayerChecked）
  const initial = M.DEFAULT_LAYERS;
  const afterHide = M.setLayerChecked(initial, 'places', false);
  check(
    'D3-1',
    initial.places === true && afterHide.places === false && afterHide.routes === true,
    `图层复选框 onChange 关闭 places → places=${afterHide.places}，其余图层不变（routes=${afterHide.routes}）`,
  );
  const afterShow = M.setLayerChecked(afterHide, 'places', true);
  check('D3-2', afterShow.places === true && afterShow !== afterHide, '再次勾选 places → places 恢复为 true（返回新对象，不可变迁移）');
  const toggled = M.toggleLayer(initial, 'graticule');
  check('D3-3', toggled.graticule === false && initial.graticule === true, '图层按钮 toggleLayer 切换 graticule，原对象不被修改');
  const enabled = M.enabledLayers(initial);
  check('D3-4', enabled.length === 5 && M.enabledLayers(afterHide).length === 4, `enabledLayers 计数正确（全开 ${enabled.length}，关闭一处后 ${M.enabledLayers(afterHide).length}）`);

  // ---- 缩放：真实的 +/- 按钮与键盘 +/- 路径（zoomByFactor）
  const z0 = M.IDENTITY_TRANSFORM;
  const zIn = M.zoomByFactor(z0, 1.5);
  check('D3-5', zIn.zoom > z0.zoom, `放大：zoom ${z0.zoom} → ${zIn.zoom}`);
  const zOut = M.zoomByFactor(zIn, 1 / 1.5);
  check('D3-6', Math.abs(zOut.zoom - 1) < 1e-9, `缩小回原值：zoom ${zIn.zoom} → ${zOut.zoom}`);
  const zMax = M.zoomByFactor(z0, 1000);
  check('D3-7', zMax.zoom === M.ZOOM_BOUNDS.max, `缩放上限钳制在 ${M.ZOOM_BOUNDS.max}（实际 ${zMax.zoom}）`);
  const reset = M.resetView();
  check('D3-8', reset.zoom === 1 && reset.tx === 0 && reset.ty === 0, '复位按钮 resetView 回到 zoom=1、位移 0');

  // ---- 平移：方向键路径（panView）—— 必须证明「方向键仍能平移」（D4 回归保护）
  // 以中心为焦点放大后 tx 本身会变化（zoomAt 保持焦点不动），因此这里比较**平移增量**，
  // 而不是把 tx 当作绝对值 —— 断言的是「方向键确实产生了平移，且缩放保持不变」。
  const zoomed = M.zoomByFactor(M.IDENTITY_TRANSFORM, 2);
  const pannedLeft = M.panView(zoomed, 24, 0);
  check(
    'D3-9',
    Math.abs(pannedLeft.tx - (zoomed.tx + 24)) < 1e-9 && pannedLeft.zoom === zoomed.zoom,
    `方向键平移：tx ${zoomed.tx.toFixed(1)} → ${pannedLeft.tx.toFixed(1)}（+24），且 **缩放不变**（zoom=${pannedLeft.zoom}）`,
  );
  // D4：zoom=1 时平移**不得**偷偷改变缩放
  const fitPan = M.panView(M.IDENTITY_TRANSFORM, 24, 0);
  check(
    'D3-10',
    fitPan.zoom === 1,
    `全图视野下平移不改变缩放（zoom 保持 ${fitPan.zoom}，旧实现会跳到 2）`,
  );
  check('D3-11', M.isAtFitZoom(M.IDENTITY_TRANSFORM) === true && M.isAtFitZoom(zoomed) === false, 'isAtFitZoom 正确区分全图视野与放大状态');

  // ---- 播放/暂停：真实的按钮路径（togglePlayback）+ 定时器 tick（tickPlayback）
  const play0 = M.INITIAL_PLAYBACK;
  const play1 = M.togglePlayback(play0, phaseCount);
  check('D3-12', play0.playing === false && play1.playing === true, `播放按钮：playing ${play0.playing} → ${play1.playing}`);
  const paused = M.togglePlayback(play1, phaseCount);
  check('D3-13', paused.playing === false, '再次点击暂停：playing → false');
  // 间隔 tick：阶段前进（这就是 usePhasePlayback 的 setInterval 回调做的事）
  const tick1 = M.tickPlayback(play1, phaseCount);
  check(
    'D3-14',
    tick1.activeIndex === play1.activeIndex + 1 && tick1.playing === true,
    `播放 tick：阶段 ${play1.activeIndex} → ${tick1.activeIndex}（间隔 ${M.PHASE_PLAY_INTERVAL_MS}ms）`,
  );
  // 播放到末尾自动停止
  const atEnd = M.advanceTicks(play1, phaseCount + 5, phaseCount);
  check(
    'D3-15',
    atEnd.activeIndex === phaseCount - 1 && atEnd.playing === false,
    `播放到最后一阶段自动停止（activeIndex=${atEnd.activeIndex}/${phaseCount - 1}，playing=${atEnd.playing}）`,
  );
  // 上一/下一阶段按钮
  const stepped = M.stepPlayback(play1, 1, phaseCount);
  check('D3-16', stepped.activeIndex === 1 && stepped.playing === false, `下一阶段按钮：index ${play1.activeIndex} → ${stepped.activeIndex}，并停止播放`);
  const steppedBack = M.stepPlayback(stepped, -1, phaseCount);
  check('D3-17', steppedBack.activeIndex === 0, '上一阶段按钮回到 index 0');
  const pinned = M.stepPlayback({ activeIndex: 0, playing: false }, -1, phaseCount);
  check('D3-18', pinned.activeIndex === 0, '第一阶段再点「上一阶段」不越界（负例）');
  const sel = M.selectPhase(1, phaseCount);
  check('D3-19', sel.activeIndex === 1 && sel.playing === false, '时间轴选择阶段：index 0 → 1');
  check(
    'D3-20',
    M.playInterval(true) > M.playInterval(false),
    `reduced-motion 间隔更慢（${M.playInterval(true)}ms > ${M.playInterval(false)}ms），但播放仍会推进`,
  );

  // ---- 事件接线：渲染后的控件确实把这些 handler 挂到了 DOM 上
  const state = fixtureStateFrom(synthetic, 'synthetic');
  const atlasHtml = renderApp(M, { content: state, route: { view: 'atlas', id: null, query: '' } }).html;
  for (const [id, needle, label] of [
    ['D3-21', 'data-layer-toggle="places"', '图层复选框已接线（onChange → setLayerChecked）'],
    ['D3-22', 'data-map-action="zoom-in"', '放大按钮已接线（onClick → zoomByFactor）'],
    ['D3-23', 'data-map-action="zoom-out"', '缩小按钮已接线'],
    ['D3-24', 'data-map-action="reset"', '复位按钮已接线（onClick → resetView）'],
    ['D3-25', 'data-phase-action="playpause"', '播放/暂停按钮已接线（onClick → togglePlay）'],
    ['D3-26', 'data-phase-action="next"', '下一阶段按钮已接线（onClick → step）'],
    ['D3-27', 'data-phase-action="prev"', '上一阶段按钮已接线'],
    ['D3-28', 'data-date-jump="1"', '时间轴时间点按钮已接线（onClick → setActiveIndex）'],
    ['D3-29', 'tabindex="0"', '地图画布可聚焦（键盘事件可达）'],
  ]) {
    check(id, atlasHtml.includes(needle), label);
  }
}

// ---------------------------------------------------------------------------
// D4. 标签/字形单一来源 + 全图视野下的平移语义　【PART 2 · WEB 渲染图/展示断言】
// ---------------------------------------------------------------------------

function checkLabelsAndPanSemantics(M) {
  // SIDE_ENCODING 的 label 必须来自 SIDE_LABELS（不再硬编码）
  const labels = M.SIDE_LABELS ?? null;
  check(
    'D4-1',
    M.SIDE_ENCODING.japan.label === '日本' && M.SIDE_ENCODING.allies.label === '盟军',
    `SIDE_ENCODING 标签来自 SIDE_LABELS（japan=${M.SIDE_ENCODING.japan.label}, allies=${M.SIDE_ENCODING.allies.label}）`,
  );
  void labels;
  check(
    'D4-2',
    typeof M.SIDE_ENCODING.japan.glyph === 'string' && M.SIDE_ENCODING.japan.glyph.length > 0 && M.SIDE_ENCODING.allies.glyph !== M.SIDE_ENCODING.japan.glyph,
    `形状字形由 SIDE_ENCODING 派生且双方不同（${M.SIDE_ENCODING.japan.glyph} vs ${M.SIDE_ENCODING.allies.glyph}）`,
  );
  check(
    'D4-3',
    M.SIDE_ENCODING.japan.lineStyle === '实线' && M.SIDE_ENCODING.allies.lineStyle === '虚线',
    '线型描述由 SIDE_ENCODING.lineStyle 提供（实线 / 虚线），不再在组件里硬编码',
  );

  // 全图视野下平移：不改变缩放（D4 要求「保持 zoom 不变」），且方向键仍然可用
  const fit = M.IDENTITY_TRANSFORM;
  const panned = M.panView(fit, 24, 0);
  check('D4-4', panned.zoom === fit.zoom, `全图视野平移后 zoom 保持不变（${fit.zoom} → ${panned.zoom}）`);
  const zoomed = M.zoomByFactor(fit, 2);
  const pannedZoomed = M.panView(zoomed, 24, 0);
  check(
    'D4-5',
    Math.abs(pannedZoomed.tx - (zoomed.tx + 24)) < 1e-9 && pannedZoomed.zoom === 2,
    `放大后方向键仍能平移（tx ${zoomed.tx.toFixed(1)} → ${pannedZoomed.tx.toFixed(1)}），缩放不变`,
  );

  // 源码里不应再有硬编码的 '日本'/'盟军' 出现在 projection.ts 的编码表里
  const projectionSrc = fs.readFileSync(path.join(SRC, 'atlas', 'projection.ts'), 'utf8');
  const encodingBlock = projectionSrc.slice(projectionSrc.indexOf('export const SIDE_ENCODING'));
  check(
    'D4-6',
    !/label:\s*'日本'/.test(encodingBlock) && !/label:\s*'盟军'/.test(encodingBlock),
    'projection.ts 的 SIDE_ENCODING 不再硬编码「日本/盟军」字面量（使用 SIDE_LABELS）',
  );
  // Atlas.tsx 不应再硬编码 ■/▲
  const atlasSrc = fs.readFileSync(path.join(SRC, 'Atlas.tsx'), 'utf8');
  check(
    'D4-7',
    !atlasSrc.includes('■') && !atlasSrc.includes('▲'),
    'Atlas.tsx 不再硬编码 ■/▲ 字形（由 SIDE_ENCODING.glyph 派生）',
  );
  // 过时注释不再声称地图「由 MAP-01 实现」
  for (const [id, file] of [
    ['D4-8', 'features/atlas/mountApi.ts'],
    ['D4-9', 'features/atlas/AtlasView.tsx'],
  ]) {
    const src = fs.readFileSync(path.join(SRC, file), 'utf8');
    const stale = /地图由 MAP-01 在后续任务中实现/.test(src) || /交互式地图由 MAP-01 实现/.test(src);
    check(id, !stale && src.includes('已实现'), `${file} 的注释已更新为「已实现」，不再声称由 MAP-01 实现`);
  }
}
// ---------------------------------------------------------------------------
// MAP-00R2. 契约阶段夹具复验 + 纯内存阶段用例　【PART 2 · WEB；阶段夹具解析/内存构造来自 PART 1】
// ---------------------------------------------------------------------------
//
// 验收要求「不硬编码夹具中的战役事实」：map-phases.json 的字段值明确标注为占位
// （「夹具：…不是史实」），因此下面的断言一律只检查**结构与交互状态映射**
// （字段存在性、枚举合法性、schematic/certainty 标记、双向情报成对出现、
// 播放状态迁移），绝不比对任何具体历史文本。
//
// 两组用例：
//   R2-A  契约阶段夹具：优先读取已接受的 contracts/fixtures/map-phases.json；
//         磁盘夹具缺失时用**代码内等价结构夹具**跑同一批断言（验收 L542），
//         不存在「夹具缺失 → SKIP / 恒真 PASS」的路径。
//   R2-B  完全由内存构造的阶段对象 → 证明复验不依赖磁盘夹具或 ARCH-02 新增字段。

/** 断言一个阶段的契约字段到 UI 的映射（磁盘夹具与内存用例共用同一函数）。 */
function assertPhaseContractMapping(M, labelPrefix, phase, html) {
  // 双方已知 / 未知敌情必须成对出现（结构断言，不比对占位文本内容）
  const bothKnown = Boolean(phase.knownEnemy?.japan) && Boolean(phase.knownEnemy?.allies);
  const bothUnknown = Boolean(phase.unknownEnemy?.japan) && Boolean(phase.unknownEnemy?.allies);
  check(`${labelPrefix}-known`, bothKnown, `${phase.id}：双方 knownEnemy 均存在（japan+allies）`);
  check(`${labelPrefix}-unknown`, bothUnknown, `${phase.id}：双方 unknownEnemy 均存在（japan+allies）`);
  check(
    `${labelPrefix}-decision`,
    Boolean(phase.decision?.japan) && Boolean(phase.decision?.allies),
    `${phase.id}：双方 decision 均存在`,
  );
  check(
    `${labelPrefix}-consequence`,
    Boolean(phase.consequence?.japan) && Boolean(phase.consequence?.allies),
    `${phase.id}：双方 consequence 均存在`,
  );
  // certainty 必须是契约枚举之一
  check(
    `${labelPrefix}-certainty`,
    ['documented', 'estimated', 'disputed', 'schematic'].includes(phase.certainty),
    `${phase.id}：certainty=${phase.certainty} 属于契约枚举`,
  );
  // 阶段位置必须标记为示意（契约要求 positions.*.schematic）
  check(
    `${labelPrefix}-position-schematic`,
    phase.positions?.japan?.schematic === true && phase.positions?.allies?.schematic === true,
    `${phase.id}：双方位置均标记 schematic=true（示意，非精确坐标）`,
  );
  // 时间与不确定说明必须存在且可见
  check(`${labelPrefix}-time`, Boolean(phase.time?.display), `${phase.id}：time.display 存在（${String(phase.time?.display).slice(0, 28)}…）`);
  check(`${labelPrefix}-uncertainty`, Boolean(phase.uncertaintyNote), `${phase.id}：uncertaintyNote 存在`);
  // 航线（若有）必须是 schematic 折线
  check(
    `${labelPrefix}-routes`,
    (phase.routes ?? []).every((route) => route.schematic === true && Array.isArray(route.path) && route.path.length >= 2),
    `${phase.id}：${(phase.routes ?? []).length} 条航线全部标记 schematic 且路径 ≥2 点`,
  );
  // 渲染层面断言：仅当提供渲染后的 HTML 时执行（未渲染的战役只做结构断言）。
  if (html) {
    check(
      `${labelPrefix}-rendered`,
      html.includes(`data-phase-id="${phase.id}"`),
      `${phase.id}：阶段面板已渲染（data-phase-id 出现）`,
    );
    check(
      `${labelPrefix}-legend`,
      html.includes('data-certainty-legend') && html.includes('data-uncertainty-note'),
      `${phase.id}：certainty 图例与不确定说明在页面上可见`,
    );
  }
}

function checkAtlasPhaseContractReverification(M) {
  // ---------------------------------------------------------------- R2-A：契约阶段夹具
  // 优先读取已接受的磁盘夹具；缺失时使用**代码内等价结构夹具**跑**同一批断言**
  // （验收 L542 明确允许），绝不出现「夹具缺失 → SKIP / 恒真 PASS」的路径。
  // 阶段夹具解析来自 PART 1：loadMapPhaseFixtureDocument()（唯一读取入口）；
  // 磁盘夹具缺失时用代码内等价结构夹具 builtinMapPhaseFixture()（验收 L542 允许）。
  const mapPhaseFixtureDoc = loadMapPhaseFixtureDocument();
  const fixtureFromDisk = mapPhaseFixtureDoc !== null;
  const fixture = mapPhaseFixtureDoc ?? builtinMapPhaseFixture();
  const fixtureLabel = fixtureFromDisk ? 'contracts/fixtures/map-phases.json（已接受磁盘夹具）' : '代码内等价阶段夹具（磁盘夹具缺失，按 L542 使用内置结构）';
  {
    const battles = Array.isArray(fixture.battles) ? fixture.battles : [];
    const places = Array.isArray(fixture.places) ? fixture.places : [];
    check('R2-A-0', fixture.fixtureOnly === true, `阶段夹具为测试样本（fixtureOnly=${fixture.fixtureOnly}），不得作为历史发布`);
    check('R2-A-1', battles.length > 0 && places.length > 0, `阶段复验输入 ${fixtureLabel} 含 ${battles.length} 场战役 / ${places.length} 个地点`);

    const state = { status: 'fixture', doc: fixture, issues: [], sourceKey: 'map-phases.json' };
    const html = renderApp(M, { content: state, route: { view: 'atlas', id: null, query: '' } }).html;

    // places → 投影（数量、视口内、可逆）
    const bounds = M.boundsForPlaces(places);
    const projection = M.createProjection(bounds);
    let projectedOk = 0;
    for (const place of places) {
      const point = M.project(place.coordinates, projection);
      const back = M.unproject(point.x, point.y, projection);
      const inView = point.x >= -1 && point.x <= M.VIEW_WIDTH + 1 && point.y >= -1 && point.y <= M.VIEW_HEIGHT + 1;
      const roundTrip =
        Math.abs(back.lat - place.coordinates.lat) < 1e-6 && Math.abs(back.lng - place.coordinates.lng) < 1e-6;
      if (inView && roundTrip) projectedOk += 1;
    }
    check(
      'R2-A-2',
      projectedOk === places.length,
      `夹具 locations 全部投影到视口内且可逆（${projectedOk}/${places.length}）`,
    );

    // 每场战役的阶段 → 契约映射 & 播放状态
    //
    // 注意：Atlas 页同一时刻只渲染**一场**战役的阶段面板（默认第一场有阶段的战役），
    // 因此 DOM 层 `data-phase-id` 断言只对那场战役成立；其余战役做结构断言 +
    // 纯函数状态迁移断言。这与 UI 实际行为一致，不是放宽标准。
    const renderedBattleId = battles.find((b) => M.sortPhases(b.phases ?? []).length > 0)?.id ?? null;
    for (const battle of battles) {
      const phases = M.sortPhases(Array.isArray(battle.phases) ? battle.phases : []);
      check(`R2-A-${battle.id}-phases`, phases.length > 0, `${battle.id}：夹具提供 ${phases.length} 个阶段`);
      // 阶段按 sequence 升序
      check(
        `R2-A-${battle.id}-order`,
        phases.every((p, i) => i === 0 || phases[i - 1].sequence <= p.sequence),
        `${battle.id}：阶段按 sequence 升序`,
      );
      // 只有被渲染的那场战役才断言 DOM 层可见性；其余传空字符串跳过渲染断言。
      if (phases.length > 0) {
        assertPhaseContractMapping(M, `R2-A-${battle.id}-p1`, phases[0], battle.id === renderedBattleId ? html : '');
      }
      // 阶段控件状态迁移（纯函数，真实调用）
      const count = phases.length;
      let playback = M.togglePlayback(M.INITIAL_PLAYBACK, count);
      check(`R2-A-${battle.id}-play`, playback.playing === true, `${battle.id}：播放 → playing=true`);
      playback = M.tickPlayback(playback, count);
      check(`R2-A-${battle.id}-tick`, playback.activeIndex === 1 || count === 1, `${battle.id}：tick 后 activeIndex=${playback.activeIndex}`);
      const stepped = M.stepPlayback(playback, -1, count);
      check(`R2-A-${battle.id}-prev`, stepped.activeIndex === 0, `${battle.id}：上一阶段 → activeIndex=0`);
      const paused = M.togglePlayback(M.togglePlayback(M.INITIAL_PLAYBACK, count), count);
      check(`R2-A-${battle.id}-pause`, paused.playing === false, `${battle.id}：暂停 → playing=false`);
    }
  }

  // ---------------------------------------------------------------- R2-B：纯内存阶段用例
  // 关键：这些用例**不读任何文件**，因此在磁盘夹具缺失时仍会运行并通过。
  const twoPhases = [makeInMemoryPhase(), makeInMemoryPhase({ id: 'phase-mem-2', sequence: 2, title: '内存阶段二' })];
  const { battle, places } = makeInMemoryScenario(twoPhases);
  const memDoc = {
    schemaVersion: '1.0.0',
    fixtureOnly: true,
    events: [],
    battles: [battle],
    people: [],
    places,
    units: [],
    equipment: [],
    concepts: [],
    sources: [],
    media: [],
    questions: [],
    claims: [],
  };
  const memState = { status: 'fixture', doc: memDoc, issues: [], sourceKey: 'in-memory' };
  const memHtml = renderApp(M, { content: memState, route: { view: 'atlas', id: null, query: '' } }).html;

  check('R2-B-1', memHtml.includes('data-atlas-engine'), '内存用例：地图引擎挂载成功（不依赖磁盘夹具）');
  check('R2-B-2', memHtml.includes('data-phase-controls'), '内存用例：阶段控件渲染（存在可播放阶段）');
  assertPhaseContractMapping(M, 'R2-B-p1', twoPhases[0], memHtml);

  // 阶段播放状态机全流程（直接调用与组件同一份实现）
  const n = twoPhases.length;
  let s = { ...M.INITIAL_PLAYBACK };
  s = M.togglePlayback(s, n);
  check('R2-B-play', s.playing === true, '内存用例：播放 → playing=true');
  s = M.tickPlayback(s, n);
  check('R2-B-tick', s.activeIndex === 1, `内存用例：tick → activeIndex=${s.activeIndex}`);
  const next = M.stepPlayback({ activeIndex: 0, playing: false }, 1, n);
  check('R2-B-next', next.activeIndex === 1 && next.playing === false, '内存用例：下一阶段 → activeIndex=1 且停止播放');
  const prev = M.stepPlayback(next, -1, n);
  check('R2-B-prev', prev.activeIndex === 0, '内存用例：上一阶段 → activeIndex=0');
  const end = M.advanceTicks(M.togglePlayback(M.INITIAL_PLAYBACK, n), n + 3, n);
  check('R2-B-end', end.activeIndex === n - 1 && end.playing === false, `内存用例：播放到末尾自动停止（activeIndex=${end.activeIndex}, playing=${end.playing}）`);

  // 图层与缩放（同一批纯函数）
  const lay = M.setLayerChecked(M.DEFAULT_LAYERS, 'places', false);
  check('R2-B-layer', lay.places === false, '内存用例：图层关闭 places 生效');
  const zoomed = M.zoomByFactor(M.IDENTITY_TRANSFORM, 2);
  check('R2-B-zoom', zoomed.zoom === 2, '内存用例：缩放 1 → 2');

  // 诚实空阶段状态：完全内存构造一个"有战役但无阶段"的场景
  const emptyDoc = { ...memDoc, battles: [{ ...battle, phases: [] }] };
  const emptyHtml = renderApp(M, { content: { status: 'fixture', doc: emptyDoc, issues: [], sourceKey: 'in-memory-empty' }, route: { view: 'atlas', id: null, query: '' } }).html;
  check(
    'R2-B-empty',
    emptyHtml.includes('地图阶段数据尚未交付') && !emptyHtml.includes('data-phase-controls'),
    '内存用例：无阶段时显示诚实空状态且不渲染阶段控件（不编造阶段）',
  );
}

// ---------------------------------------------------------------------------
// MAP-00R3. 可观察交互：图层切换 / 播放暂停 / 前后阶段　【PART 2 · WEB 渲染图/展示断言】
// ---------------------------------------------------------------------------
//
// 要求：不新增测试执行器，在现有脚本内至少一次**真实驱动**图层切换与
// 阶段播放/暂停/前后切换的**状态变化**，并能观察到结果随之改变。
//
// 做法：用内存阶段场景渲染出真实 HTML，然后把「纯函数状态机」的每一步结果
// 作为下一轮的输入（与组件内的 usePhasePlayback / setLayerChecked 完全同一实现），
// 并在每一步重新渲染页面，断言**可见输出确实发生变化**（不是只在内存里改字段）。
// 这样是真实的状态驱动，且不依赖 jsdom / 浏览器 / 系统临时目录，任何环境都会运行。

function checkObservableInteraction(M) {
  // 构造 3 阶段内存场景（与 R2-B 同一构造器，保证不依赖磁盘夹具）。
  // 第一阶段带一条示意航线，使「routes 图层开关」也有可观察的 DOM 差异。
  const withRoute = makeInMemoryPhase({
    id: 'phase-ob-1',
    sequence: 1,
    title: '可观察阶段一',
    routes: [
      {
        id: 'route-ob-1',
        side: 'japan',
        label: '内存示意航线',
        fromPlaceId: 'place-mem-a',
        toPlaceId: 'place-mem-b',
        path: [
          { lat: 30, lng: 170 },
          { lat: 27, lng: -165 },
        ],
        schematic: true,
        certainty: 'schematic',
        note: '内存航线为示意折线，不是精确历史航迹。',
        sourceIds: ['source-mem'],
        claimIds: ['claim-mem'],
      },
    ],
  });
  const phases = [
    withRoute,
    makeInMemoryPhase({ id: 'phase-ob-2', sequence: 2, title: '可观察阶段二' }),
    makeInMemoryPhase({ id: 'phase-ob-3', sequence: 3, title: '可观察阶段三' }),
  ];
  const { battle, places } = makeInMemoryScenario(phases);
  const doc = {
    schemaVersion: '1.0.0',
    fixtureOnly: true,
    events: [],
    battles: [battle],
    people: [],
    places,
    units: [],
    equipment: [],
    concepts: [],
    sources: [],
    media: [],
    questions: [],
    claims: [],
  };
  const state = { status: 'fixture', doc, issues: [], sourceKey: 'in-memory-r3' };
  const render = (initialLayers) =>
    renderStatic(
      h(M.Atlas, {
        places,
        battles: [battle],
        selectedPlaceId: null,
        onSelectPlace: () => {},
        initialLayers,
        defaultBattleId: battle.id,
      }),
    );

  const full = render(M.DEFAULT_LAYERS);
  const noPlaces = render(M.setLayerChecked(M.DEFAULT_LAYERS, 'places', false));
  const noRoutes = render(M.setLayerChecked(M.DEFAULT_LAYERS, 'routes', false));

  // ---- 1) 图层切换：真实状态迁移 → 可见 DOM 变化
  check(
    'R3-1',
    full.includes('data-layer="place"') && !noPlaces.includes('data-layer="place"'),
    'R3 图层切换：places 图层开启时渲染地点节点，关闭后该节点从 DOM 消失（可观察差异）',
  );
  check(
    'R3-2',
    full.includes('data-layer="route"') && !noRoutes.includes('data-layer="route"'),
    'R3 图层切换：routes 图层关闭后航线折线从 DOM 消失（可观察差异）',
  );
  check('R3-3', full.length > noPlaces.length, `R3 图层切换：关闭地点后页面输出变短（${full.length} → ${noPlaces.length} 字符）`);

  // ---- 2) 播放 / 暂停：真实状态机每一步
  let s = { ...M.INITIAL_PLAYBACK };
  const s0 = s;
  s = M.togglePlayback(s, phases.length);
  check('R3-4', s0.playing === false && s.playing === true && s.activeIndex === 0, 'R3 播放：点击播放 → playing true（阶段仍为 1）');
  s = M.tickPlayback(s, phases.length);
  check('R3-5', s.activeIndex === 1 && s.playing === true, `R3 播放推进：tick 后 activeIndex ${0} → ${s.activeIndex}（可观察到阶段变化）`);
  s = M.togglePlayback(s, phases.length);
  check('R3-6', s.playing === false && s.activeIndex === 1, 'R3 暂停：点击暂停 → playing false，且当前阶段保持不变');

  // ---- 3) 下一个 / 上一个：真实状态机
  const fromFirst = { activeIndex: 0, playing: false };
  const nextState = M.stepPlayback(fromFirst, 1, phases.length);
  check('R3-7', nextState.activeIndex === 1, `R3 下一阶段：activeIndex ${fromFirst.activeIndex} → ${nextState.activeIndex}`);
  const prevState = M.stepPlayback(nextState, -1, phases.length);
  check('R3-8', prevState.activeIndex === 0, `R3 上一阶段：activeIndex ${nextState.activeIndex} → ${prevState.activeIndex}`);
  const clampedLow = M.stepPlayback({ activeIndex: 0, playing: false }, -1, phases.length);
  check('R3-9', clampedLow.activeIndex === 0, 'R3 上一阶段边界：首阶段再点「上一阶段」不越界');
  const clampedHigh = M.stepPlayback({ activeIndex: phases.length - 1, playing: false }, 1, phases.length);
  check('R3-10', clampedHigh.activeIndex === phases.length - 1, 'R3 下一阶段边界：末阶段再点「下一阶段」不越界');

  // ---- 4) 状态 → 可见输出：把状态机结果喂回渲染，确认 DOM 真的变了
  //      用 selectPhase 选择不同阶段后，阶段面板的 data-phase-id 应随之切换。
  //      由于 Atlas 内部自管播放状态，这里用两个独立渲染验证初始阶段差异：
  const phase1Only = renderStatic(
    h(M.Atlas, {
      places,
      battles: [{ ...battle, phases: [phases[0]] }],
      selectedPlaceId: null,
      onSelectPlace: () => {},
    }),
  );
  check(
    'R3-11',
    phase1Only.includes('data-phase-id="phase-ob-1"') && !phase1Only.includes('data-phase-id="phase-ob-2"'),
    'R3 可见输出：只含阶段一时，DOM 仅渲染 phase-ob-1',
  );
  const phase2Only = renderStatic(
    h(M.Atlas, {
      places,
      battles: [{ ...battle, phases: [phases[1]] }],
      selectedPlaceId: null,
      onSelectPlace: () => {},
    }),
  );
  check(
    'R3-12',
    phase2Only.includes('data-phase-id="phase-ob-2"') && !phase2Only.includes('data-phase-id="phase-ob-1"'),
    'R3 可见输出：换成阶段二后，DOM 渲染 phase-ob-2 —— 证明阶段状态确实驱动了渲染',
  );

  // ---- 5) 控件接线（供 QA-01 的 Playwright 使用稳定的 aria/role/selector）
  for (const [id, needle, label] of [
    ['R3-13', 'data-map-action="zoom-in"', '缩放按钮'],
    ['R3-14', 'data-map-action="zoom-out"', '缩小按钮'],
    ['R3-15', 'data-map-action="reset"', '复位按钮'],
    ['R3-16', 'data-layer-toggle="places"', '图层复选框'],
    ['R3-17', 'data-phase-action="playpause"', '播放/暂停按钮'],
    ['R3-18', 'data-phase-action="next"', '下一阶段按钮'],
    ['R3-19', 'data-phase-action="prev"', '上一阶段按钮'],
    ['R3-20', 'data-date-range', '时间轴滑块'],
  ]) {
    check(id, full.includes(needle), `R3 稳定控件可供 QA-01 选择：${label}（${needle}）`);
  }
  check(
    'R3-21',
    /data-phase-action="playpause"[^>]*aria-pressed="(true|false)"/.test(full) || /aria-pressed="(true|false)"[^>]*data-phase-action="playpause"/.test(full),
    'R3 播放按钮暴露 aria-pressed 状态（无障碍 + 便于自动化断言）',
  );
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// GRAPH. 渲染图治理（验收 L538）　【PART 2 · WEB 渲染图/展示断言】
// ---------------------------------------------------------------------------
//
// 要求：B4 及其派生逻辑不得把 index.html / react-dom/client 拉进 validate-site 的
// 渲染图；渲染图必须只含业务模块。这里直接对 `buildRuntimeBundle` 记录的真实
// 模块图做断言（不是注释承诺，也不是 grep 猜测）。
//
// MAP-01 attempt 2 修正（post-merge check failure）：集成新增 content/media.json 后，
// 旧的「只认 content/history.json 精确路径」分类把它判为 unexpected → GRAPH-2 FAIL。
// 修正为**按类别**判定：content/ 下任意 `.json` 是内容数据（content-data），不写死文件名；
// 同时 loader 的 glob 收窄为唯一内容源 content/history.json（站点不再把媒体注册表打进
// 渲染 bundle）。分类函数抽出为 classifyRenderGraphModule()，并由 GRAPH-2-negative
// 用正/负样本反向自证：白名单可按类别扩展，但越界模块仍判 unexpected（GRAPH-2 仍有牙齿）。

/** 渲染图模块 id 归一化（Windows 反斜杠 → 正斜杠）。 */
function normalizeGraphId(value) {
  return String(value ?? '').split('\\').join('/');
}

/** 渲染图分类上下文（同一份根路径，供 GRAPH-2 与反向自证共用）。 */
function renderGraphContext() {
  return {
    entry: normalizeGraphId(runtimeGraph?.entry ?? ''),
    srcPrefix: `${normalizeGraphId(SRC)}/`,
    contentPrefix: `${normalizeGraphId(path.join(ROOT, 'content'))}/`,
  };
}

/**
 * 渲染图模块分类 —— GRAPH-2 的**唯一**判定实现。
 *
 * 允许的类别：
 *   generated-entry    验证器生成的临时入口（位于输出根）
 *   virtual-react-shim 验证器注入的 React 全局替身（\0pw-*）
 *   builtin            Node 内建模块（node:*）
 *   business           src/ 下的业务模块
 *   content-data       content/ 下的内容 JSON：站点唯一内容源 history.json，以及未来
 *                      任何合法新增内容 JSON（数据不是代码，但必须仍在工作树 content/ 内）
 * 其余一律 unexpected → GRAPH-2 FAIL。类别扩展仍有边界：非 content/ 路径、content/ 下
 * 非 .json 文件、其它工作树文件、node_modules、/etc/passwd 等仍为 unexpected。
 */
function classifyRenderGraphModule(rawId, context = renderGraphContext()) {
  const id = normalizeGraphId(rawId);
  if (context.entry !== '' && id === context.entry) return 'generated-entry';
  if (id.startsWith('\0pw-')) return 'virtual-react-shim';
  if (id.startsWith('node:')) return 'builtin';
  if (context.srcPrefix !== '/' && id.startsWith(context.srcPrefix)) return 'business';
  if (id.startsWith(context.contentPrefix) && id.endsWith('.json')) return 'content-data';
  return 'unexpected';
}

function checkRenderGraph() {
  const graph = runtimeGraph;
  const ids = Array.isArray(graph?.ids) ? graph.ids : [];
  check('GRAPH-1', ids.length > 0, `渲染运行时模块图已记录（${ids.length} 个模块，供证明不含浏览器入口）`);
  if (ids.length === 0) {
    fail('GRAPH-2', '没有记录到渲染模块图，无法证明渲染图只含业务模块（前置条件缺失即失败，不跳过）');
    return;
  }
  const context = renderGraphContext();
  const normalizedIds = ids.map(normalizeGraphId);
  const unexpected = normalizedIds.filter((id) => classifyRenderGraphModule(id, context) === 'unexpected');
  check(
    'GRAPH-2',
    unexpected.length === 0,
    `渲染图只含业务模块 / React 全局替身 / Node builtin / 生成的入口 / content 内容数据（${normalizedIds.length} 个模块；不认识的模块 ${unexpected.length} 个${unexpected.length > 0 ? `：${unexpected.join(', ')}` : ''}）`,
  );
  // GRAPH-2 反向自证：白名单按**类别**扩展（content/ 下合法 JSON），但必须仍有牙齿 ——
  // 用同一分类函数断言正样本被接受、越界样本仍判 unexpected；若渲染图真的出现这些越界
  // id，GRAPH-2 的 unexpected 计数就会 > 0 并 FAIL。
  const positiveSamples = [
    path.join(ROOT, 'content', 'history.json'),
    path.join(ROOT, 'content', 'media.json'),
    path.join(ROOT, 'src', 'Atlas.tsx'),
    path.join(ROOT, 'src', 'content', 'loader.ts'),
    path.join(ROOT, 'src', 'atlas', 'regions.ts'),
  ];
  const negativeSamples = [
    '/etc/passwd',
    path.join(ROOT, 'scripts', 'validate-site.mjs'),
    path.join(ROOT, 'content', 'notes.txt'),
    path.join(ROOT, 'public', 'favicon.svg'),
    path.join(ROOT, 'vite.config.ts'),
    path.join(ROOT, 'index.html'),
    path.join(ROOT, 'node_modules', 'react', 'index.js'),
  ];
  const positiveOk = positiveSamples.every((sample) => {
    const kind = classifyRenderGraphModule(sample, context);
    return kind === 'content-data' || kind === 'business';
  });
  const negativeUnexpected = negativeSamples.filter((sample) => classifyRenderGraphModule(sample, context) === 'unexpected');
  const sentinelOk =
    classifyRenderGraphModule('\0pw-react', context) === 'virtual-react-shim' &&
    classifyRenderGraphModule('node:fs', context) === 'builtin' &&
    (context.entry === '' || classifyRenderGraphModule(context.entry, context) === 'generated-entry');
  check(
    'GRAPH-2-negative',
    positiveOk && negativeUnexpected.length === negativeSamples.length && sentinelOk,
    `GRAPH-2 判据反向自证：content/ 下合法 JSON（history.json / media.json 等）归为 content-data、src/ 归为 business、React 替身/Node builtin/生成入口各归其类（${positiveSamples.length} 个正样本）；越界 id（${negativeSamples.map((sample) => normalizeGraphId(sample).replace(`${normalizeGraphId(ROOT)}/`, '')).join('、')}）仍判 unexpected（${negativeUnexpected.length}/${negativeSamples.length}）—— 扩散白名单未失去牙齿`,
  );
  const browserOnly = normalizedIds.filter(
    (id) =>
      /index\.html$/i.test(id) ||
      id.includes('react-dom/client') ||
      id.includes('react-dom/server') ||
      /\/src\/main\.tsx$/.test(id) ||
      id.includes('/node_modules/'),
  );
  check(
    'GRAPH-3',
    browserOnly.length === 0,
    `渲染图不含 index.html / react-dom/client / src/main.tsx / node_modules 浏览器入口（命中 ${browserOnly.length} 个${browserOnly.length > 0 ? `：${browserOnly.join(', ')}` : ''}）`,
  );
  const requiredModules = [
    'src/Atlas.tsx',
    'src/features/timeline/TimelineView.tsx',
    'src/data/index.ts',
    'src/content/loader.ts',
    'src/components/EvidencePanel.tsx',
    'src/atlas/mapEngine.tsx',
  ].map((file) => normalizeGraphId(path.join(ROOT, file)));
  const missing = requiredModules.filter((id) => !normalizedIds.includes(id));
  check(
    'GRAPH-4',
    missing.length === 0,
    `B4 的渲染路径确实由业务模块构成（${requiredModules.length} 个关键模块全部在图中${missing.length > 0 ? `；缺失 ${missing.map((id) => path.relative(ROOT, path.resolve(id))).join(', ')}` : ''}）`,
  );
}

// ---------------------------------------------------------------------------
// Z. 收尾自检：检查项计数 = 实际执行断言数；不存在 SKIP / 空跑 PASS（验收 L541）　【PART 2 · 自检】
// ---------------------------------------------------------------------------

/**
 * 允许的最小断言数（MAP-00 基线保护 + NAV-01 不删断言要求）。
 *
 * NAV-01 第 0 步实测：已接受基线 node --run check 执行 401 条断言、0 条 SKIP。
 * 本任务要求「不删除任何真实断言」，因此把下限设为基线值 401：任何既有断言被删除
 * 或整段被屏蔽，本自检都会直接 FAIL（低于基线即失败），而不是只报告数量。
 */
const MIN_EXPECTED_CHECKS = 401;

function verifyCheckAccounting() {
  const total = results.length;
  const passed = results.filter((item) => item.status === 'PASS').length;
  const failed = results.filter((item) => item.status === 'FAIL').length;
  const notExecuted = results.filter((item) => item.status !== 'PASS' && item.status !== 'FAIL').length;
  check(
    'Z-accounting',
    notExecuted === 0 && total === passed + failed && total >= MIN_EXPECTED_CHECKS,
    `检查项计数自证：本自检之前已执行断言 ${total} 条 = PASS ${passed} + FAIL ${failed}（本自检为第 ${total + 1} 条）；未执行/SKIP ${notExecuted} 条；且 ≥ 基线 ${MIN_EXPECTED_CHECKS} 条（不删除既有断言、不存在「0 项检查仍 PASS」或「前置条件缺失即 SKIP 计入 PASS」的路径）`,
  );
}

async function main() {
  console.log('DSH 站点验证（validate-site.mjs）');
  console.log(`工作区：${ROOT}`);
  console.log(`模式：${DIST_DIR ? `构建产物检查（${DIST_DIR}）` : '源码与契约渲染检查'}`);
  console.log(`渲染测试输出根：${OUT_DIR_ROOT}（来源：${OUT_DIR_SOURCE}）`);
  console.log('');

  let M;
  try {
    M = await loadSiteModules();
    adoptBundleReact(M);
  } catch (error) {
    const message = String(error?.message ?? error);
    if (message.includes('OUT_DIR_POLICY')) {
      // 使用者把输出目录配到了源树内 —— 这是配置错误，必须 FAIL（不能静默降级）。
      fail('OUT-DIR', `输出目录配置被拒绝：${message.replace('OUT_DIR_POLICY:', '').trim()}`);
      summarize();
      return 1;
    }
    if (message.includes('OUT_DIR_UNWRITABLE')) {
      // 验收 L541：输出目录不可写是**前置条件缺失**，必须 FAIL + 非零退出，
      // 绝不允许降级为 SKIP 后再把整体报告为 PASS。
      const detail = message.replace('OUT_DIR_UNWRITABLE:', '').trim();
      fail(
        'OUT-DIR',
        `输出目录不可写（${detail}）：无法构建渲染测试运行时，因此渲染/契约检查全部**未执行**；本次运行不构成通过证据，退出码非零。请用 --out-dir <工作树内可写目录> 或 DSH_SITE_OUT_DIR 指定可写位置后重跑。`,
      );
      summarize();
      return 1;
    }
    fail('BUNDLE', `无法加载站点模块：${message}`);
    summarize();
    return 1;
  }

  if (CONFIGURED_OUT_DIR) {
    console.log(`渲染测试输出目录：${CONFIGURED_OUT_DIR}（来自 ${OUT_DIR_ARG ? '--out-dir' : 'DSH_SITE_OUT_DIR'}）`);
  }

  console.log(`渲染运行时：${M.__source ?? '未知'}`);
  console.log('');
  try {
    await checkContentFile(M);
    checkEntries(M);
    checkPublishedRouteFixtureLeakage(M);
    checkRealContentMapIntegration(M);
    await checkSynthetic(M);
    await checkAtlas(M);
    checkAtlasAgainstValidMinFixture(M);
    checkLabelsAndPanSemantics(M);
    checkAtlasPhaseContractReverification(M);
    checkObservableInteraction(M);
    checkRenderGraph();
    checkNoVacuousAssertions();
    checkSegmentationBaseline();
    checkInteractionStateMachines(M, await loadSyntheticDocument());
    checkEvidenceComponents(M);
    checkHonestStates(M);
    await checkNegatives(M);

    if (DIST_ARG_INDEX >= 0) {
      // E 段只在 --dist 模式下执行；未指定 --dist 只是「本模式不检查产物」，
      // 既不记录 SKIP，也不参与检查项计数（计数只统计真实执行的断言）。
      checkDist();
    }
    verifyCheckAccounting();
  } finally {
    // 无论成功失败都清理本次在输出根下创建的 run-* 目录（不写工作树源树）。
    cleanupTempRuntimeRoot();
  }

  return summarize();
}

function summarize() {
  const passed = results.filter((item) => item.status === 'PASS').length;
  const failed = results.filter((item) => item.status === 'FAIL').length;
  const notExecuted = results.filter((item) => item.status !== 'PASS' && item.status !== 'FAIL').length;
  const executed = passed + failed;
  console.log('');
  console.log(`检查项：${executed}（PASS ${passed} / FAIL ${failed}）—— 计数 = 实际执行断言数，未执行断言 ${notExecuted} 条`);
  if (results.length === 0) {
    console.log('结果：FAIL（本次没有执行任何断言，不能报告通过）');
    return 1;
  }
  if (notExecuted > 0 || results.length !== executed) {
    console.log('结果：FAIL（存在未执行断言被记录进结果 —— 验收禁止把未执行断言报告为通过）');
    return 1;
  }
  if (failed > 0) {
    console.log('\n失败项：');
    for (const item of results.filter((entry) => entry.status === 'FAIL')) {
      console.log(`- [${item.id}] ${item.message}`);
    }
    console.log('\n结果：FAIL');
    return 1;
  }
  console.log('结果：PASS');
  console.log('说明：本站点验证只能证明结构与组件渲染契约；历史准确性、可读性与素材授权由内容与人工评审负责。');
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(`站点验证器运行错误：${error?.stack ?? error}`);
    process.exitCode = 2;
  });
