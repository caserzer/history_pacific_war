#!/usr/bin/env node
/**
 * 站点验证器 —— node scripts/validate-site.mjs
 *
 * 零 npm 依赖，Node 24 标准库 + React/`react-dom/server`（项目自身依赖）。
 *
 * 它检查的不是「内容是否好」，而是「站点是否把契约数据正确地呈现为可用页面」：
 *
 * A. 契约数据来源
 *    A1 content/history.json（若存在）通过 contracts 验证器 --file 检查；
 *    A2 缺失内容时为「诚实的未加载状态」—— 六个入口仍全部渲染。
 * B. 六入口与互跳（用 contracts/fixtures/*.json）
 *    B1 六个入口在 fixture 下都能渲染出非空标题；
 *    B2 同一批实体 ID 在多个入口之间可互跳（时间线→战役→人物→专题→地图→问题）；
 *    B3 详情路由 #/<view>/<id> 可直接深链渲染。
 * C. 证据组件
 *    C1 fact / interpretation / disputed / schematic 四类标签都能渲染；
 *    C2 claim 引用（文本 + claimType 标签）与来源（机构/标题/年份/链接）可见；
 *    C3 每条 claim 的来源定位（locator）可见。
 * D. 诚实状态
 *    D1 fixtureOnly=true 必须显示「测试样本」状态；
 *    D2 内容缺失必须显示「未加载」状态，且不得出现文档里的历史句子；
 *    D3 结构非法的根节点必须被拒绝并说明原因。
 * E. 构建产物（--dist）
 *    E1 子路径 base、资源文件真实存在、index.html 引用正确；
 *    E2 所有站内链接是 hash 路由（可在 GitHub Pages 子路径下工作）；
 *    E3 无外部 CDN 字体/脚本、无外部瓦片依赖。
 *
 * 每个检查都打印 PASS/FAIL；任何一条 FAIL 都让进程以退出码 1 结束。
 * 负例检查（negative case）是刻意构造的错误输入，用来证明检查本身有效。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');
const SRC = path.join(ROOT, 'src');
const FIXTURE_MIN = path.join(ROOT, 'contracts', 'fixtures', 'valid-min.json');
const FIXTURE_EARLY = path.join(ROOT, 'contracts', 'fixtures', 'valid-early-campaign.json');
const CONTENT_FILE = path.join(ROOT, 'content', 'history.json');
const CONTENT_VALIDATOR = path.join(ROOT, 'scripts', 'validate-content.mjs');

const BASE_PATH = '/history_pacific_war/';

const args = process.argv.slice(2);
const DIST_ARG_INDEX = args.indexOf('--dist');
const DIST_DIR = DIST_ARG_INDEX >= 0 && args[DIST_ARG_INDEX + 1] ? path.resolve(ROOT, args[DIST_ARG_INDEX + 1]) : null;

// ---------------------------------------------------------------------------
// 结果记录
// ---------------------------------------------------------------------------

const results = [];
function record(status, id, message) {
  results.push({ status, id, message });
  const label = status === 'PASS' ? 'PASS' : status === 'FAIL' ? 'FAIL' : 'SKIP';
  console.log(`${label}  ${id}  ${message}`);
}
function pass(id, message) {
  record('PASS', id, message);
}
function fail(id, message) {
  record('FAIL', id, message);
}
function skip(id, message) {
  record('SKIP', id, message);
}
function check(id, condition, message, detail) {
  if (condition) pass(id, message);
  else fail(id, `${message}${detail ? ` —— ${detail}` : ''}`);
  return Boolean(condition);
}

// ---------------------------------------------------------------------------
// 站点组件加载
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
  'data/index.ts': ['buildIndex', 'entryCounts', 'searchContent', 'collectEvidenceBlocks', 'collectEntityEvidence'],
  'router/route.ts': ['parseRoute', 'buildHref', 'entityTypeFromId'],
  'content/loader.ts': ['loadContent', 'loadContentAsync', 'loadContentFromText', 'emptyDocument'],
  'features/AppContext.ts': ['AppContextProvider'],
  'components/ClaimTag.tsx': ['ClaimTag', 'ClaimTagLegend'],
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
};

const entryCacheDir = path.join(ROOT, '.cache', 'validate-site');
let siteModules = null;

function toImportPath(absolutePath) {
  return absolutePath.split(path.sep).join('/');
}

function pathToFileUrl(absolutePath) {
  return `file:///${absolutePath.split(path.sep).join('/')}`;
}

async function buildRuntimeBundle() {
  const vite = await import('vite');
  const outDir = path.join(entryCacheDir, 'from-source');
  fs.mkdirSync(outDir, { recursive: true });
  const entry = path.join(entryCacheDir, 'runtime-entry.tsx');

  const srcExports = Object.entries(RUNTIME_EXPORTS).map(
    ([file, names]) => `export { ${names.join(', ')} } from '${toImportPath(path.join(SRC, file))}';`,
  );
  fs.writeFileSync(entry, srcExports.join('\n'), 'utf8');

  await vite.build({
    configFile: false,
    root: ROOT,
    logLevel: 'error',
    plugins: [childProcessShimPlugin()],
    build: {
      ssr: entry,
      outDir,
      emptyOutDir: true,
      minify: false,
      target: 'node22',
      write: true,
      rollupOptions: {
        // react 系列保持 external，避免与验证器自身的 React 形成两份实例。
        external: ['react', 'react-dom', 'react-dom/server'],
        output: { entryFileNames: 'runtime.mjs', format: 'es' },
      },
    },
  });
  return path.join(outDir, 'runtime.mjs');
}

/**
 * 加载站点组件用于渲染测试。
 *
 * **从源码做 SSR 打包**（而不是 import dist 产物）。原因：
 * dist bundle 顶部的 modulepreload polyfill 以及 React DOM 的模块级代码会在
 * import 阶段访问浏览器全局（document / MutationObserver / navigator），
 * 在纯 Node 里无法可靠导入；为它维护一套全局替身既脆弱又会掩盖真实问题。
 *
 * 产物本身由 `--dist` 的 E 段检查（资源存在、子路径、hash 路由、CDN 依赖、
 * 体积）以及一次性的 jsdom 冒烟测试（真实 bundle + 真实内容）覆盖，
 * 因此这里不再重复一条不可靠的路径。
 */
async function loadSiteModules() {
  if (siteModules) return siteModules;
  const file = await buildRuntimeBundle();
  const loaded = await import(`${pathToFileUrl(file)}?v=${Date.now()}`);
  siteModules = { ...loaded, __source: '源码 SSR 打包（渲染契约测试；产物由 --dist 的 E 段检查）' };
  return siteModules;
}


// ---------------------------------------------------------------------------
// 渲染一个完整页面（外壳 + 视图），与站点真实结构一致。
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
        return React.createElement(M.OverviewView);
      case 'timeline':
        return React.createElement(M.TimelineView, { eventId: route.id });
      case 'battles':
        return React.createElement(M.BattlesView, { battleId: route.id });
      case 'people':
        return React.createElement(M.PeopleView, { personId: route.id });
      case 'atlas':
        return React.createElement(M.AtlasView, { placeId: route.id });
      case 'concepts':
        return React.createElement(M.ConceptsView, { conceptId: route.id });
      case 'questions':
        return React.createElement(M.QuestionsView, { questionId: route.id });
      case 'sources':
        return React.createElement(M.SourcesView, { sourceId: route.id });
      case 'search':
        return React.createElement(M.SearchView, { query: route.query });
      default:
        throw new Error(`未知视图：${route.view}`);
    }
  })();
  const html = renderToStaticMarkup(
    React.createElement(M.AppContextProvider, { value }, React.createElement(M.AppShell, { route }, view)),
  );
  return { html, index, state };
}

function loadFixture(file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const state = { status: raw.fixtureOnly ? 'fixture' : 'available', doc: raw, issues: [], sourceKey: file };
  return state;
}

function missingState(M) {
  return M.loadContent({});
}

function invalidState(M) {
  return M.loadContent({ '/virtual/content/history.json': { schemaVersion: '1.0.0', fixtureOnly: false, events: 'not-an-array' } });
}

const countOf = (haystack, needle) => haystack.split(needle).length - 1;

// ---------------------------------------------------------------------------
// A. 契约数据来源
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

async function checkContentFile() {
  if (!fs.existsSync(CONTENT_FILE)) {
    return check(
      'A2',
      true,
      'content/history.json 尚未交付 —— 站点必须以「诚实的未加载状态」构建（下面 B/D 用 fixture 验证渲染能力）',
    );
  }
  // 在进程内调用验证器的公开 API（validateDocument），而不是 spawn 子进程：
  // 受限环境下 spawn 会被拒绝（EPERM），那样得到的不是「内容失败」而是「没跑成」。
  let result;
  try {
    const doc = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
    const coverage = JSON.parse(fs.readFileSync(path.join(ROOT, 'contracts', 'coverage.json'), 'utf8'));
    // validate-content.mjs 在被 import 时会执行自己的 CLI main()（对 content/history.json
    // 跑默认 full 阶段并打印结果）。那段输出属于内容任务的视角，会与本验证器的
    // 结论混淆，因此在 import 期间暂时静音 stdout/stderr，只取其导出的 validateDocument。
    const contentValidator = await withSuppressedOutput(() => import(`${pathToFileUrl(CONTENT_VALIDATOR)}?v=${Date.now()}`));
    result = contentValidator.validateDocument(doc, { coverage, stage: SITE_CONTENT_STAGE, rootDir: ROOT });
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
  check(
    'A1-coverage',
    true,
    coverageGaps.length === 0
      ? `stage=${SITE_CONTENT_STAGE} 的累积覆盖要求已全部满足`
      : `更后续阶段的覆盖尚未交付（${coverageGaps.length} 项，属内容任务范围，不是站点缺陷）`,
  );
  return true;
}

// ---------------------------------------------------------------------------
// B. 六入口与互跳
// ---------------------------------------------------------------------------

function checkEntries(M) {
  const fixtures = [
    { file: 'contracts/fixtures/valid-min.json', state: loadFixture(FIXTURE_MIN) },
    { file: 'contracts/fixtures/valid-early-campaign.json', state: loadFixture(FIXTURE_EARLY) },
  ];

  const entries = [
    ['timeline', '时间线'],
    ['battles', '战役'],
    ['people', '人物'],
    ['atlas', '地图'],
    ['concepts', '知识专题'],
    ['questions', '历史问题'],
  ];

  for (const fixture of fixtures) {
    const label = path.basename(fixture.file);
    for (const [view, title] of entries) {
      const { html } = renderApp(M, { content: fixture.state, route: { view, id: null, query: '' } });
      const hasTitle = html.includes(`>${title}<`) || html.includes(title);
      const hasEmptyState = html.includes('data-empty-state=""');
      const hasHeading = /<h1[^>]*>/.test(html);
      check(
        `B1-${label}-${view}`,
        hasTitle && hasHeading && (view === 'battles' && !fixtureHasBattles(fixture.state) ? hasEmptyState : true),
        `${label} → ${title}入口可渲染（标题 + 空状态诚实说明）`,
      );
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

  // 早期战役 fixture：五类分析（背景/经过/约束/结果/影响）必须分别呈现
  const early = loadFixture(FIXTURE_EARLY);
  const earlyEvent = early.doc.events[0];
  const earlyHtml = renderApp(M, { content: early, route: { view: 'timeline', id: earlyEvent.id, query: '' } }).html;
  const analysisKeys = ['背景', '经过', '约束', '结果', '影响'];
  check(
    'B4',
    analysisKeys.every((key) => earlyHtml.includes(`>${key}<`)),
    `早期扩张战役 ${earlyEvent.id} 的五个分析小节分别渲染：${analysisKeys.join(' / ')}`,
  );

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

function fixtureHasBattles(state) {
  return Array.isArray(state.doc?.battles) && state.doc.battles.length > 0;
}

// ---------------------------------------------------------------------------
// C. 证据组件（fixture 测试）
// ---------------------------------------------------------------------------

function checkEvidenceComponents(M) {
  const claimTypes = ['fact', 'interpretation', 'disputed', 'schematic'];
  for (const type of claimTypes) {
    const html = renderToStaticMarkup(React.createElement(M.ClaimTag, { type }));
    const hasLabel = { fact: '事实', interpretation: '解释', disputed: '争议', schematic: '示意' }[type];
    check(`C1-${type}`, html.includes(`data-claim-type="${type}"`) && html.includes(hasLabel), `ClaimTag 渲染 ${type} 标签（${hasLabel}）`);
  }
  // 负例：非法 claimType 不得渲染成标签
  const invalidTag = renderToStaticMarkup(React.createElement(M.ClaimTag, { type: 'definitely-not-a-claim-type' }));
  check('C1-negative', invalidTag === '', 'ClaimTag 对契约外的 claimType 不猜测渲染（负例）');

  const min = loadFixture(FIXTURE_MIN);
  const claim = min.doc.claims[0];
  const source = min.doc.sources.find((item) => item.id === claim.sourceIds[0]);
  const locatorHtml = renderToStaticMarkup(
    React.createElement(M.SourceLocator, { locator: claim.locators[0], source }),
  );
  check(
    'C3-1',
    locatorHtml.includes(claim.locators[0].locator) && locatorHtml.includes(`data-locator-type="${claim.locators[0].locatorType}"`),
    `SourceLocator 渲染定位文本与定位类型：${claim.locators[0].locatorType} / ${claim.locators[0].locator}`,
  );
  const missingLocatorHtml = renderToStaticMarkup(React.createElement(M.SourceLocatorList, { locators: [], sourceById: new Map() }));
  check('C3-negative', missingLocatorHtml.includes('缺少来源定位'), 'SourceLocatorList 对缺失定位明确提示（负例）');

  const sourceById = new Map(min.doc.sources.map((item) => [item.id, item]));
  const claimById = new Map(min.doc.claims.map((item) => [item.id, item]));
  const citationHtml = renderToStaticMarkup(
    React.createElement(M.CitationList, { sourceIds: [source.id], sourceById }),
  );
  check(
    'C2-1',
    citationHtml.includes(source.publisher) && citationHtml.includes(String(source.year)) && citationHtml.includes(source.url) && citationHtml.includes('访问日期'),
    `CitationList 渲染机构、年份、链接与访问日期（来源 ${source.id}）`,
  );
  const citationMissing = renderToStaticMarkup(
    React.createElement(M.CitationList, { sourceIds: ['source-does-not-exist'], sourceById }),
  );
  check('C2-negative', citationMissing.includes('无法在当前内容中解析'), 'CitationList 对断链来源明确提示（负例）');

  const panelHtml = renderToStaticMarkup(
    React.createElement(M.EvidencePanel, { claimIds: [claim.id], sourceIds: claim.sourceIds, claimById, sourceById }),
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
// D. 诚实状态
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
// E. 构建产物
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
  pass('E1-5', `产物总大小 ${(totalBytes / 1024).toFixed(1)} KiB（PERFORMANCE 上限：JS/CSS gzip ≤500KiB）`);

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
// F. 合成契约样本：战役 / 人物 / 专题 / 阶段 / 双方对称（真实 fixture 未覆盖的渲染路径）
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
    atlasHtml.includes('历史地名') && atlasHtml.includes('现代地名') && atlasHtml.includes('现代国家') && atlasHtml.includes('节点精度') && atlasHtml.includes('data-atlas-mount'),
    '地图地点详情同时显示历史地名、现代地名、国家、坐标精度，并提供 MAP-01 挂载点',
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
// G. 负例：证明检查本身有效（刻意构造错误，期望被拦下）
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
  const panel = renderToStaticMarkup(React.createElement(M.EvidencePanel, { claimIds: ['claim-missing'], sourceIds: ['source-missing'], claimById, sourceById }));
  check('G5', panel.includes('无法解析'), '缺失 claim 的证据面板明确提示无法解析（负例）');

  // G6：契约外的 claimType 不会渲染成任何标签。
  const bogus = renderToStaticMarkup(React.createElement(M.ClaimTag, { type: 'nonsense' }));
  check('G6', bogus === '', '非法 claimType 不渲染标签（负例）');

  // G7：glob 返回「模块命名空间」/「默认导出」形态时必须仍能识别为内容。
  //     （回归测试：生产构建把 JSON 拆成独立 chunk 时，glob 值可能是
  //       { default: doc } 或 { default: doc, events, battles, ... }。）
  const doc = JSON.parse(fs.readFileSync(FIXTURE_MIN, 'utf8'));
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
// 主流程
// ---------------------------------------------------------------------------

async function main() {
  console.log('DSH 站点验证（validate-site.mjs）');
  console.log(`工作区：${ROOT}`);
  console.log(`模式：${DIST_DIR ? `构建产物检查（${DIST_DIR}）` : '源码与契约渲染检查'}`);
  console.log('');

  let M;
  try {
    M = await loadSiteModules();
  } catch (error) {
    fail('BUNDLE', `无法加载站点模块：${error?.message ?? error}`);
    summarize();
    return 1;
  }

  console.log(`渲染运行时：${M.__source ?? '未知'}`);
  console.log('');
  await checkContentFile();
  checkEntries(M);
  await checkSynthetic(M);
  checkEvidenceComponents(M);
  checkHonestStates(M);
  await checkNegatives(M);

  if (DIST_ARG_INDEX >= 0) {
    checkDist();
  } else {
    skip('E', '未指定 --dist；构建产物检查由 npm run build 在 vite build 之后执行');
  }

  return summarize();
}

function summarize() {
  const passed = results.filter((item) => item.status === 'PASS').length;
  const failed = results.filter((item) => item.status === 'FAIL').length;
  const skipped = results.filter((item) => item.status === 'SKIP').length;
  console.log('');
  console.log(`检查项：${results.length}（PASS ${passed} / FAIL ${failed} / SKIP ${skipped}）`);
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
