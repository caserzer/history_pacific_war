#!/usr/bin/env node
/**
 * DSH 太平洋战争教材内容验证器
 *
 * 依赖：Node.js 24 标准库。无 npm 依赖。
 * 契约：contracts/content.schema.json + contracts/coverage.json
 *
 * 用法：
 *   node scripts/validate-content.mjs
 *   node scripts/validate-content.mjs --stage strategy
 *   node scripts/validate-content.mjs --stage pearl
 *   node scripts/validate-content.mjs --media
 *   node scripts/validate-content.mjs --self-test
 *   node scripts/validate-content.mjs --file contracts/fixtures/valid-min.json --stage strategy
 *   node scripts/validate-content.mjs --root /path/to/site --file content/history.json
 *
 * --media 隐含 --stage full。full 是最终硬门禁，不能用 --stage 部分阶段绕过。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const SCHEMA_PATH = path.join(REPO_ROOT, 'contracts', 'content.schema.json');
const COVERAGE_PATH = path.join(REPO_ROOT, 'contracts', 'coverage.json');
const REQUIREMENTS_PATH = path.join(REPO_ROOT, 'contracts', 'requirements.json');
const FIXTURE_PATH = path.join(REPO_ROOT, 'contracts', 'fixtures', 'valid-min.json');
const COVERAGE_MD_PATH = path.join(REPO_ROOT, 'docs', 'research', 'coverage.md');
const CONTRACTS_README_PATH = path.join(REPO_ROOT, 'contracts', 'README.md');

const STAGE_IDS = ['strategy', 'background', 'pearl', 'coral', 'full'];
const PART_IDS = [
  'part-1-why-war',
  'part-2-pearl-harbor',
  'part-3-expansion',
  'part-4-turning-point',
  'part-5-midway',
];
const MIN_HISTORICAL_DATE = '1931-09-18';
const MAX_HISTORICAL_DATE = '1942-06-30';
const ALLOWED_LICENSES = [
  'public-domain',
  'cc0-1.0',
  'cc-by-4.0',
  'cc-by-sa-4.0',
  'original-work',
  'permission-granted',
];
const MEDIA_TYPES = [
  'photograph',
  'portrait',
  'battle-map',
  'map',
  'diagram',
  'illustration',
  'timeline-diagram',
];
const LOCATOR_TYPES = [
  'page',
  'page-range',
  'chapter-section',
  'section-paragraph',
  'table',
  'figure',
  'archival-item',
  'timecode',
  'transcript-line',
];
const SECTION_KEYS = [
  'background',
  'geography',
  'participants',
  'commanders',
  'forces',
  'objectives',
  'constraints',
  'plan',
  'course',
  'decisions',
  'results',
  'aftermath',
  'controversies',
  'furtherReading',
];

/**
 * 旧版早期扩张战役的 5 类分析（D2 / ARCH-01）。ARCH-02 attempt 5 起该形状在门禁中
 * 一律被拒绝；键名只用于迁移诊断与旧夹具构造，契约里不再有第二套 analysisKeys 声明。
 * 目标结构是 ANALYSIS_PROFILE_KEYS（十键 analysisProfiles）。
 * 旧五键兼容只由 coverage.earlyCampaign.legacyAnalysis 开关表达（enforcement=off，
 * legacyDisabledBy=HIST-01），代码不使用该字段放行旧形状。
 */
const LEGACY_EARLY_CAMPAIGN_KEYS = ['background', 'course', 'constraints', 'results', 'impact'];
// 旧五键的固定中文标题：只用于迁移诊断（该形状在门禁中始终被拒绝）。
const LEGACY_ANALYSIS_TITLES = {
  background: '背景',
  course: '经过',
  constraints: '约束',
  results: '结果',
  impact: '影响',
};
// 向后兼容别名：既有规则、负例与 schema 断言仍用旧名。
const EARLY_CAMPAIGN_KEYS = LEGACY_EARLY_CAMPAIGN_KEYS;

/**
 * D6：从导读 ID 推断它代表的历史部分。
 * 约定：event-overview-part-<N>-... 映射到 PART_IDS[<N>-1]。
 * 返回 null 表示无法推断。
 */
function historicalPartFromArticleId(articleId) {
  if (typeof articleId !== 'string') return null;
  const match = /^event-overview-part-([1-5])-/.exec(articleId);
  if (!match) return null;
  return PART_IDS[Number(match[1]) - 1] || null;
}
const COLLECTIONS = [
  'events',
  'battles',
  'people',
  'places',
  'units',
  'equipment',
  'concepts',
  'sources',
  'media',
  'questions',
  'claims',
];
const COLLECTION_PREFIX = {
  events: 'event',
  battles: 'battle',
  people: 'person',
  places: 'place',
  units: 'unit',
  equipment: 'equipment',
  concepts: 'concept',
  sources: 'source',
  media: 'media',
  questions: 'question',
  claims: 'claim',
};

/**
 * 工单提供的 canonical requirements，逐字固化在验证器里。
 * contracts/requirements.json 必须与这份清单完全一致（ids、description、scope、
 * 顺序、条数都不能增删改）。任何偏离都会让自测失败。
 */
const CANONICAL_REQUIREMENTS = [
  { id: 'HIST-BACKGROUND', description: '战争背景、侵略、资源、禁运与双方决策', scope: 'local' },
  { id: 'HIST-EXPANSION', description: '全部早期扩张事件及补给限制', scope: 'local' },
  { id: 'BATTLE-PEARL', description: '珍珠港十四类深度分析', scope: 'local' },
  { id: 'BATTLE-CORAL', description: '珊瑚海十四类深度分析', scope: 'local' },
  { id: 'BATTLE-MIDWAY', description: '中途岛十四类深度分析及战略争议', scope: 'local' },
  { id: 'PEOPLE-DEPTH', description: '山本、南云、尼米兹、斯普鲁恩斯、弗莱彻的决策型人物档案', scope: 'local' },
  { id: 'CONCEPTS-DEPTH', description: '航母、舰载机、雷达、补给、密码分析、海军航空作战分层解释', scope: 'local' },
  { id: 'QUESTIONS-DEPTH', description: '五大历史部分均有证据支持的探究问题和答案', scope: 'local' },
  { id: 'CONTENT-AGE', description: '11 岁可读、术语分层、非血腥但不回避平民苦难与战争罪行', scope: 'local' },
  { id: 'CONTENT-EVIDENCE', description: '日期、数量、观点和判断可追溯到来源及定位', scope: 'local' },
  { id: 'CONTENT-UNCERTAINTY', description: '事实、解释、争议、教学简化明确区分', scope: 'local' },
  { id: 'MEDIA-COVERAGE', description: '每篇重点文章的适当图解及媒体矩阵', scope: 'local' },
  { id: 'MEDIA-LICENSE', description: '每个素材作者、来源、许可及署名', scope: 'local' },
  { id: 'ROUTES-SIX', description: '六种阅读入口共享内容并非空', scope: 'local' },
  { id: 'ROUTES-LINKS', description: '时间、地点、人物、事件互链和当前上下文', scope: 'local' },
  { id: 'UI-CITATIONS', description: '正文展示事实类型、来源、定位与争议信息', scope: 'local' },
  { id: 'MAP-OFFLINE', description: '本地无商业 Key 基础地图，无外部瓦片依赖', scope: 'local' },
  { id: 'MAP-NAVIGATION', description: '缩放、平移、键盘触摸、地点与图层', scope: 'local' },
  { id: 'MAP-GEOGRAPHY', description: '重要节点、历史现代地名、图例及近似比例尺', scope: 'local' },
  { id: 'MAP-TIMELINE', description: '时间线选择和地图联动', scope: 'local' },
  { id: 'MAP-PHASES', description: '三场关键战役的阶段、播放暂停与前后操作', scope: 'local' },
  { id: 'MAP-INTELLIGENCE', description: '阶段展示双方已知与未知敌情、情报约束', scope: 'local' },
  { id: 'MAP-DECISIONS', description: '阶段展示时间、双方位置、行动、决策与后果及不确定性', scope: 'local' },
  { id: 'VISUAL-DESIGN', description: '档案馆海军地图视觉、一致排版及响应式', scope: 'local' },
  { id: 'A11Y-DEVICES', description: '桌面、手机、平板、Chromium/WebKit、键盘触摸和 reduced-motion', scope: 'local' },
  { id: 'A11Y-AUDIT', description: 'axe 严重缺陷为零并核对对比度', scope: 'local' },
  { id: 'PERFORMANCE', description: 'JS/CSS gzip<=500KiB，历史 JSON<=1.5MiB，核心资产<=3MiB', scope: 'local' },
  { id: 'ENGINEERING-TYPES', description: 'TypeScript 检查、内容和组件分离', scope: 'local' },
  { id: 'ENGINEERING-CONTENT', description: '内容 schema、阶段验证与真实负例', scope: 'local' },
  { id: 'ENGINEERING-LINKS', description: '链接、资源、来源和许可校验', scope: 'local' },
  { id: 'ENGINEERING-BROWSER', description: '关键交互真实浏览器回归', scope: 'local' },
  { id: 'ENGINEERING-BUILD', description: 'Node24静态构建与仓库子路径', scope: 'local' },
  { id: 'MAINTENANCE', description: '内容维护、来源许可、部署、扩展与简化说明', scope: 'local' },
  { id: 'TEAM-PILOT', description: '双线管理、门禁、隔离、中断恢复与审查审计证据', scope: 'local' },
  { id: 'RELEASE-CI', description: '远程目标提交的构建与部署工作流实际成功', scope: 'release' },
  { id: 'RELEASE-PAGES', description: 'Pages URL 及子路径关键资产实际可访问', scope: 'release' },
];

/**
 * coverage.json 必须精确覆盖的重点集合构成。
 * 不是“至少”：多一个或少一个都算偏离工单。
 */
const REQUIRED_COVERAGE_COMPOSITION = {
  battle: ['battle-pearl-harbor', 'battle-coral-sea', 'battle-midway'],
  'commander-profile': [
    'person-yamamoto-isoroku',
    'person-nagumo-chuichi',
    'person-nimitz-chester',
    'person-spruance-raymond',
    'person-fletcher-frank-jack',
  ],
  'concept-article': [
    'concept-aircraft-carrier',
    'concept-carrier-aircraft',
    'concept-naval-aviation',
    'concept-radar',
    'concept-codebreaking',
    'concept-logistics',
  ],
  'part-overview': [
    'event-overview-part-1-why-war',
    'event-overview-part-2-pearl-harbor',
    'event-overview-part-3-expansion',
    'event-overview-part-4-turning-point',
    'event-overview-part-5-midway',
  ],
};
const ARTICLE_ENTITY_COLLECTIONS = [
  'events',
  'battles',
  'people',
  'places',
  'units',
  'equipment',
  'concepts',
];
const KEY_ENTITY_COLLECTION = {
  event: 'events',
  battle: 'battles',
  person: 'people',
  concept: 'concepts',
};

const REAL_FILE_SYSTEM = createRealFileSystem();

const CONTENT_SCHEMA = readJson(SCHEMA_PATH, 'content.schema.json', REAL_FILE_SYSTEM);

// ---------------------------------------------------------------------------
// 基础工具
// ---------------------------------------------------------------------------

/**
 * 可注入的文件系统层（D4）。
 *
 * 默认实现直接读写真实磁盘；自测会注入一个纯内存实现，因此
 * `--self-test` 在只读沙箱里不需要任何可写的 OS 临时目录，也不需要写工作区。
 * 只在需要时才接触真实磁盘，且从未在自测路径上创建文件。
 */
function createRealFileSystem() {
  // 真实文件系统接受“便携键”（POSIX 风格全路径），转成本机路径再访问磁盘。
  const toNative = (key) => (path.sep === '/' ? String(key) : String(key).replace(/\//g, path.sep));
  return {
    readText(filePath) {
      return fs.readFileSync(toNative(filePath), 'utf8');
    },
    exists(filePath) {
      return fs.existsSync(toNative(filePath));
    },
    stat(filePath) {
      const stat = fs.statSync(toNative(filePath));
      return { isFile: stat.isFile(), size: stat.size };
    },
  };
}

/**
 * 纯内存文件系统。用于自测：路径只是键，没有任何磁盘副作用。
 * `files` 是 Map<posixPath, string>；stat 返回的大小即内容字节长度。
 */
function createMemoryFileSystem(files = new Map()) {
  return {
    files,
    readText(filePath) {
      const key = String(filePath);
      if (!files.has(key)) {
        const error = new Error(`ENOENT: no such file or directory, open '${key}'`);
        error.code = 'ENOENT';
        throw error;
      }
      return files.get(key);
    },
    exists(filePath) {
      return files.has(String(filePath));
    },
    stat(filePath) {
      const key = String(filePath);
      if (!files.has(key)) {
        const error = new Error(`ENOENT: no such file or directory, stat '${key}'`);
        error.code = 'ENOENT';
        throw error;
      }
      return { isFile: true, size: Buffer.byteLength(files.get(key), 'utf8') };
    },
    set(filePath, content) {
      files.set(String(filePath), content);
      return this;
    },
  };
}

function readJson(filePath, label = filePath, fileSystem = REAL_FILE_SYSTEM) {
  try {
    return JSON.parse(fileSystem.readText(filePath));
  } catch (error) {
    throw new Error(`无法读取 ${label}: ${error.message}`);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter((v) => typeof v === 'string'))];
}

function hanCount(value) {
  if (typeof value !== 'string') return 0;
  const matches = value.match(/[\u3400-\u9fff\uf900-\ufaff]/g);
  return matches ? matches.length : 0;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

function validDateTimeString(value) {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
  if (!validDateString(value.slice(0, 10))) return false;
  return Number.isFinite(Date.parse(value));
}

function dateWithinHistoricalRange(dateString) {
  return dateString >= MIN_HISTORICAL_DATE && dateString <= MAX_HISTORICAL_DATE;
}

function comparableText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function addError(errors, message) {
  if (errors.length < 600) errors.push(message);
}

function dedupeMessages(messages) {
  return [...new Set(messages)];
}

function getObjectId(object) {
  return isPlainObject(object) && typeof object.id === 'string' ? object.id : null;
}

// ---------------------------------------------------------------------------
// 一个只覆盖本契约所用关键字的 JSON Schema 校验器
// 支持：$ref、type、required、properties、additionalProperties、items、
//       minItems、maxItems、uniqueItems、const、enum、pattern、minLength、
//       maxLength、minimum、maximum。
// 复杂语义（引用、汉字深度、日期范围、阶段覆盖、来源定位）由下文检查。
// ---------------------------------------------------------------------------

function resolveRef(ref, rootSchema) {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) return null;
  let cursor = rootSchema;
  for (const rawPart of ref.slice(2).split('/')) {
    const part = rawPart.replace(/~1/g, '/').replace(/~0/g, '~');
    if (!isPlainObject(cursor) || !hasOwn(cursor, part)) return null;
    cursor = cursor[part];
  }
  return cursor;
}

function valueMatchesType(value, type) {
  switch (type) {
    case 'object':
      return isPlainObject(value);
    case 'array':
      return Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    case 'integer':
      return Number.isInteger(value);
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'null':
      return value === null;
    default:
      return true;
  }
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function schemaValidate(value, schema, rootSchema, pointer = '$', errors = []) {
  if (!isPlainObject(schema)) return errors;

  if (typeof schema.$ref === 'string') {
    const resolved = resolveRef(schema.$ref, rootSchema);
    if (resolved) schemaValidate(value, resolved, rootSchema, pointer, errors);
    else addError(errors, `${pointer}: schema 内部 $ref 无法解析 (${schema.$ref})`);
  }

  if (hasOwn(schema, 'const') && canonicalJson(value) !== canonicalJson(schema.const)) {
    addError(errors, `${pointer}: 必须等于 ${JSON.stringify(schema.const)}`);
  }

  if (Array.isArray(schema.enum)) {
    const ok = schema.enum.some((item) => canonicalJson(item) === canonicalJson(value));
    if (!ok) {
      addError(errors, `${pointer}: 值 ${JSON.stringify(value)} 不在允许列表 ${JSON.stringify(schema.enum)} 中`);
    }
  }

  if (typeof schema.type === 'string' && !valueMatchesType(value, schema.type)) {
    addError(errors, `${pointer}: 类型必须是 ${schema.type}，实际为 ${Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value}`);
    return errors;
  }

  if (typeof value === 'string') {
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
      addError(errors, `${pointer}: 字符串长度 ${value.length} 小于最小长度 ${schema.minLength}`);
    }
    if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) {
      addError(errors, `${pointer}: 字符串长度 ${value.length} 大于最大长度 ${schema.maxLength}`);
    }
    if (typeof schema.pattern === 'string') {
      let regex = null;
      try {
        regex = new RegExp(schema.pattern, 'u');
      } catch {
        regex = null;
      }
      if (!regex) addError(errors, `${pointer}: schema 中的 pattern 无效`);
      else if (!regex.test(value)) addError(errors, `${pointer}: 字符串不符合格式 ${schema.pattern}`);
    }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      addError(errors, `${pointer}: 数值 ${value} 小于最小值 ${schema.minimum}`);
    }
    if (typeof schema.maximum === 'number' && value > schema.maximum) {
      addError(errors, `${pointer}: 数值 ${value} 大于最大值 ${schema.maximum}`);
    }
  }

  if (Array.isArray(value)) {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
      addError(errors, `${pointer}: 至少需要 ${schema.minItems} 项，实际 ${value.length} 项`);
    }
    if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) {
      addError(errors, `${pointer}: 最多允许 ${schema.maxItems} 项，实际 ${value.length} 项`);
    }
    if (schema.uniqueItems === true) {
      const seen = new Map();
      value.forEach((item, index) => {
        const key = canonicalJson(item);
        if (seen.has(key)) addError(errors, `${pointer}[${index}]: 与第 ${seen.get(key)} 项重复（uniqueItems）`);
        else seen.set(key, index);
      });
    }
    if (schema.items) {
      value.forEach((item, index) => schemaValidate(item, schema.items, rootSchema, `${pointer}[${index}]`, errors));
    }
  }

  if (isPlainObject(value)) {
    if (Array.isArray(schema.required)) {
      for (const requiredKey of schema.required) {
        if (!hasOwn(value, requiredKey)) addError(errors, `${pointer}: 缺少必填字段 '${requiredKey}'`);
      }
    }
    if (isPlainObject(schema.properties)) {
      for (const [key, childSchema] of Object.entries(schema.properties)) {
        if (hasOwn(value, key)) schemaValidate(value[key], childSchema, rootSchema, `${pointer}.${key}`, errors);
      }
    }
    if (schema.additionalProperties === false) {
      const allowed = isPlainObject(schema.properties) ? new Set(Object.keys(schema.properties)) : new Set();
      for (const key of Object.keys(value)) {
        if (!allowed.has(key)) addError(errors, `${pointer}: 不允许的字段 '${key}'`);
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// 契约与 CLI
// ---------------------------------------------------------------------------

function parseCli(argv) {
  const options = {
    stage: 'full',
    media: false,
    selfTest: false,
    checkContracts: false,
    file: null,
    mediaFile: null,
    root: null,
    help: false,
  };
  const errors = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const takeValue = (label) => {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        errors.push(`${label} 需要一个值`);
        return null;
      }
      index += 1;
      return value;
    };
    if (arg === '--stage') {
      const value = takeValue('--stage');
      if (value) {
        if (!STAGE_IDS.includes(value)) errors.push(`--stage 必须是 ${STAGE_IDS.join('|')}，收到 ${value}`);
        else options.stage = value;
      }
    } else if (arg.startsWith('--stage=')) {
      const value = arg.slice('--stage='.length);
      if (!STAGE_IDS.includes(value)) errors.push(`--stage 必须是 ${STAGE_IDS.join('|')}，收到 ${value}`);
      else options.stage = value;
    } else if (arg === '--media-file') {
      const value = takeValue('--media-file');
      if (value) options.mediaFile = value;
    } else if (arg.startsWith('--media-file=')) {
      options.mediaFile = arg.slice('--media-file='.length);
    } else if (arg === '--file') {
      const value = takeValue('--file');
      if (value) options.file = value;
    } else if (arg.startsWith('--file=')) {
      options.file = arg.slice('--file='.length);
    } else if (arg === '--root') {
      const value = takeValue('--root');
      if (value) options.root = value;
    } else if (arg.startsWith('--root=')) {
      options.root = arg.slice('--root='.length);
    } else if (arg === '--media') {
      options.media = true;
    } else if (arg === '--self-test') {
      options.selfTest = true;
    } else if (arg === '--check-contracts') {
      options.checkContracts = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      errors.push(`未知参数 ${arg}`);
    }
  }
  if (options.media && options.stage !== 'full') {
    options.requestedStage = options.stage;
    options.stage = 'full';
    options.mediaImpliedFull = true;
  }
  if (options.media) options.stage = 'full';
  return { options, errors };
}

function printHelp() {
  const text = `
太平洋战争中文教材内容验证器

用法：
  node scripts/validate-content.mjs [选项]

选项：
  --stage strategy|background|pearl|coral|full
      按累积阶段检查。默认 full。部分阶段只允许尚未交付的覆盖暂时缺失；
      任何已存在实体的断链、弱证据或深度不足仍然报错。
  --media
      最终素材门禁，隐含 --stage full。检查 coverage 指定的全部重点文章，
      每篇均须有符合 requiredMediaTypes 的已授权素材，且 public/media 下文件真实存在。
  --self-test
      独立运行负例自测；不需要 content/history.json。含重复 ID、断链、
      缺来源、战役十四类缺失、阶段缺少情报/决策/后果、数字 claim 无定位、
      无效许可、空泛问题及 full 覆盖绕过等负例。
  --check-contracts
      只检查契约文件本身（不需要 content/history.json）：requirements.json
      必须与工单 canonical 清单逐字一致；coverage.json 的重点集合必须恰好是
      3 场战役 + 5 位指挥官 + 6 篇专题 + 5 个历史部分导读。发布前 CI 可直接调用。
  --file <path>
      指定内容文件；默认 <root>/content/history.json。
  --root <path>
      项目根目录；默认本脚本上一级目录。
  -h, --help
      显示帮助。

退出码：0 通过；1 验证失败；2 参数或运行错误。

阶段语义（HIST-00 → HIST-04）：
  strategy   = HIST-00 战略背景与基础
  background = 增加 HIST-01 日本早期扩张
  pearl      = 增加 HIST-02 珍珠港
  coral      = 增加 HIST-03 珊瑚海与战局变化
  full       = 增加 HIST-04 中途岛与全部剩余覆盖，最终硬门禁

典型使用顺序（每个 HIST 阶段）：
  node scripts/validate-content.mjs --check-contracts
  node scripts/validate-content.mjs --stage strategy    # HIST-00 交付后
  node scripts/validate-content.mjs --stage background  # HIST-01 交付后
  node scripts/validate-content.mjs --stage pearl       # HIST-02 交付后
  node scripts/validate-content.mjs --stage coral       # HIST-03 交付后
  node scripts/validate-content.mjs                     # HIST-04 最终 full
  node scripts/validate-content.mjs --media             # 发布前素材门禁
`;
  console.log(text.trim());
}

function validateCoverageContract(coverage) {
  const errors = [];
  if (!isPlainObject(coverage)) return ['coverage.json 根节点必须是对象'];
  if (coverage.schemaVersion !== '1.0.0') addError(errors, 'coverage.schemaVersion 必须是 1.0.0');
  if (!Array.isArray(coverage.stageOrder) || canonicalJson(coverage.stageOrder) !== canonicalJson(STAGE_IDS)) {
    addError(errors, `coverage.stageOrder 必须严格为 ${STAGE_IDS.join(' → ')}`);
  }
  if (!Array.isArray(coverage.stages) || coverage.stages.length !== STAGE_IDS.length) {
    addError(errors, 'coverage.stages 必须覆盖五个阶段');
  } else {
    const stageIds = coverage.stages.map((stage) => stage && stage.id);
    if (canonicalJson(stageIds) !== canonicalJson(STAGE_IDS)) addError(errors, 'coverage.stages 顺序或 ID 与 stageOrder 不一致');
    for (const stage of coverage.stages) {
      if (!Array.isArray(stage.requiredQuestionParts) || stage.requiredQuestionParts.length < 1) {
        addError(errors, `coverage.stages ${stage.id}: requiredQuestionParts 不能为空`);
      }
      for (const part of stage.requiredQuestionParts || []) {
        if (!PART_IDS.includes(part)) addError(errors, `coverage.stages ${stage.id}: 未知历史部分 ${part}`);
      }
    }
  }

  if (!Array.isArray(coverage.historicalParts) || coverage.historicalParts.length !== PART_IDS.length) {
    addError(errors, 'coverage.historicalParts 必须包含五个历史部分');
  } else if (canonicalJson(coverage.historicalParts.map((part) => part.id)) !== canonicalJson(PART_IDS)) {
    addError(errors, 'coverage.historicalParts ID 必须严格等于五部分标准 ID');
  } else {
    for (const part of coverage.historicalParts) {
      if (!STAGE_IDS.includes(part.questionStage)) {
        addError(errors, `coverage.historicalParts.${part.id}: 未知 questionStage '${part.questionStage}'`);
      }
    }
    if (Array.isArray(coverage.stages)) {
      for (const [stageIndex, stage] of coverage.stages.entries()) {
        const expectedParts = coverage.historicalParts
          .filter((part) => STAGE_IDS.indexOf(part.questionStage) <= stageIndex)
          .map((part) => part.id);
        const actualParts = Array.isArray(stage.requiredQuestionParts) ? stage.requiredQuestionParts : [];
        if (
          canonicalJson([...expectedParts].sort()) !== canonicalJson([...actualParts].sort())
        ) {
          addError(
            errors,
            `coverage.stages.${stage.id}: requiredQuestionParts 必须等于 questionStage 已达到的历史部分（${expectedParts.join(', ') || '无'}）`,
          );
        }
      }
    }
  }

  if (
    !Array.isArray(coverage.battleSectionKeys) ||
    canonicalJson(coverage.battleSectionKeys.map((section) => section.key)) !== canonicalJson(SECTION_KEYS)
  ) {
    addError(errors, 'coverage.battleSectionKeys 必须与 schema 中十四类字段严格一致');
  }
  if (!Array.isArray(coverage.keyArticleIds) || coverage.keyArticleIds.length === 0) {
    addError(errors, 'coverage.keyArticleIds 不能为空');
  }
  if (!isPlainObject(coverage.requiredMediaTypes)) {
    addError(errors, 'coverage.requiredMediaTypes 必须是对象');
  }
  if (!Array.isArray(coverage.keyArticles) || coverage.keyArticles.length === 0) {
    addError(errors, 'coverage.keyArticles 不能为空');
  }

  const keyIds = Array.isArray(coverage.keyArticleIds) ? coverage.keyArticleIds : [];
  const keySet = new Set(keyIds);
  if (keySet.size !== keyIds.length) addError(errors, 'coverage.keyArticleIds 存在重复');
  const detailIds = Array.isArray(coverage.keyArticles) ? coverage.keyArticles.map((entry) => entry && entry.id) : [];
  if (canonicalJson([...detailIds].sort()) !== canonicalJson([...keyIds].sort())) {
    addError(errors, 'coverage.keyArticles 与 keyArticleIds 必须一一对应');
  }
  const mediaKeys = isPlainObject(coverage.requiredMediaTypes) ? Object.keys(coverage.requiredMediaTypes) : [];
  if (canonicalJson([...mediaKeys].sort()) !== canonicalJson([...keyIds].sort())) {
    addError(errors, 'coverage.requiredMediaTypes 必须精确覆盖 keyArticleIds，不能多也不能少');
  }
  if (isPlainObject(coverage.requiredMediaTypes)) {
    for (const [key, types] of Object.entries(coverage.requiredMediaTypes)) {
      if (!Array.isArray(types) || types.length < 1) {
        addError(errors, `coverage.requiredMediaTypes.${key}: 至少规定一种素材类型`);
      } else {
        for (const mediaType of types) {
          if (!MEDIA_TYPES.includes(mediaType)) addError(errors, `coverage.requiredMediaTypes.${key}: 未知素材类型 ${mediaType}`);
        }
      }
    }
  }

  const allowedKinds = new Set(['battle', 'commander-profile', 'concept-article', 'part-overview']);
  const seenArticleIds = new Set();
  for (const entry of Array.isArray(coverage.keyArticles) ? coverage.keyArticles : []) {
    if (!isPlainObject(entry)) {
      addError(errors, 'coverage.keyArticles 含非对象项');
      continue;
    }
    if (!keySet.has(entry.id)) addError(errors, `coverage.keyArticles 含未在 keyArticleIds 登记的 ${entry.id}`);
    if (seenArticleIds.has(entry.id)) addError(errors, `coverage.keyArticles 重复 ${entry.id}`);
    seenArticleIds.add(entry.id);
    if (!allowedKinds.has(entry.kind)) addError(errors, `${entry.id}: 未知重点文章 kind ${entry.kind}`);
    if (!STAGE_IDS.includes(entry.stage)) addError(errors, `${entry.id}: 未知阶段 ${entry.stage}`);
    if (!KEY_ENTITY_COLLECTION[entry.entityType]) addError(errors, `${entry.id}: 未知实体类型 ${entry.entityType}`);
    if (entry.kind === 'battle' && entry.entityType !== 'battle') addError(errors, `${entry.id}: battle 类型不匹配`);
    if (entry.kind === 'commander-profile' && entry.entityType !== 'person') addError(errors, `${entry.id}: 人物档案类型不匹配`);
    if (entry.kind === 'concept-article' && entry.entityType !== 'concept') addError(errors, `${entry.id}: 专题类型不匹配`);
    if (entry.kind === 'part-overview' && entry.entityType !== 'event') addError(errors, `${entry.id}: 导读类型不匹配`);
    if (!isPlainObject(entry.minimumDepth)) addError(errors, `${entry.id}: 缺少 minimumDepth`);
    if (entry.kind === 'part-overview') {
      if (!Array.isArray(entry.requiredArticleHeadings) || entry.requiredArticleHeadings.length < 1) {
        addError(errors, `${entry.id}: 导读必须声明 requiredArticleHeadings`);
      } else if (entry.minimumDepth && entry.minimumDepth.articleSections < entry.requiredArticleHeadings.length) {
        addError(errors, `${entry.id}: articleSections 不能小于必需要求标题数`);
      }
      // D6：导读必须显式绑定它所代表的五个历史部分之一，且必须与 ID 中编码的部分一致。
      if (!PART_IDS.includes(entry.historicalPart)) {
        addError(
          errors,
          `${entry.id}: part-overview 必须声明 historicalPart 且为五部分之一，实际 ${JSON.stringify(entry.historicalPart)}`,
        );
      } else {
        const encodedPart = historicalPartFromArticleId(entry.id);
        if (!encodedPart) {
          addError(errors, `${entry.id}: 无法从 ID 推断历史部分（应为 event-overview-part-N-...）`);
        } else if (encodedPart !== entry.historicalPart) {
          addError(
            errors,
            `${entry.id}: historicalPart '${entry.historicalPart}' 与 ID 编码的 '${encodedPart}' 不一致`,
          );
        }
      }
      // D5：必须声明每个强制小节的最低汉字深度阈值。
      const minDepth = isPlainObject(entry.minimumDepth) ? entry.minimumDepth : {};
      if (typeof minDepth.requiredHeadingHanChars !== 'number' || minDepth.requiredHeadingHanChars < 40) {
        addError(errors, `${entry.id}: minimumDepth.requiredHeadingHanChars 必须声明且 >=40`);
      }
    }
    if (entry.kind === 'battle' && isPlainObject(entry.minimumDepth) && entry.minimumDepth.sectionCount !== SECTION_KEYS.length) {
      addError(errors, `${entry.id}: 重点战役 sectionCount 必须是 ${SECTION_KEYS.length}`);
    }
  }

  if (!Array.isArray(coverage.requiredEvents) || coverage.requiredEvents.length < 1) {
    addError(errors, 'coverage.requiredEvents 不能为空');
  } else {
    const seenEvents = new Set();
    for (const entry of coverage.requiredEvents) {
      if (!isPlainObject(entry)) {
        addError(errors, 'coverage.requiredEvents 含非对象项');
        continue;
      }
      if (seenEvents.has(entry.id)) addError(errors, `coverage.requiredEvents 重复 ${entry.id}`);
      seenEvents.add(entry.id);
      if (keySet.has(entry.id)) addError(errors, `${entry.id}: 不能同时是重点文章和 requiredEvents`);
      if (!STAGE_IDS.includes(entry.stage)) addError(errors, `${entry.id}: 未知阶段 ${entry.stage}`);
      if (!isPlainObject(entry.minimumDepth)) addError(errors, `${entry.id}: 缺少 minimumDepth`);
    }
  }

  if (typeof coverage.battleSectionMinHanChars !== 'number' || coverage.battleSectionMinHanChars < 40) {
    addError(errors, 'battleSectionMinHanChars 必须是 >=40 的数字');
  }
  errors.push(...validateEarlyCampaignContract(coverage));
  errors.push(...validateAnalysisProfilesContract(coverage));
  errors.push(...validateStageOwnershipContract(coverage));
  errors.push(...validateMediaTypeContract(coverage));
  if (typeof coverage.questionMinimumAnswerHanChars !== 'number' || coverage.questionMinimumAnswerHanChars < 60) {
    addError(errors, 'questionMinimumAnswerHanChars 必须是 >=60 的数字');
  }
  if (typeof coverage.questionMinimumEntityRefs !== 'number' || coverage.questionMinimumEntityRefs < 2) {
    addError(errors, 'questionMinimumEntityRefs 必须是 >=2 的数字');
  }
  if (!isPlainObject(coverage.finalGate) || coverage.finalGate.stage !== 'full') {
    addError(errors, 'coverage.finalGate.stage 必须是 full');
  } else {
    if (coverage.finalGate.fixtureOnlyMustBeFalse !== true) addError(errors, 'finalGate.fixtureOnlyMustBeFalse 必须为 true');
    if (coverage.finalGate.allKeyArticlesRequired !== true) addError(errors, 'finalGate.allKeyArticlesRequired 必须为 true');
    if (coverage.finalGate.allQuestionPartsRequired !== true) addError(errors, 'finalGate.allQuestionPartsRequired 必须为 true');
    if (coverage.finalGate.mediaRequiresFullStage !== true) addError(errors, 'finalGate.mediaRequiresFullStage 必须为 true');
    if (coverage.finalGate.readabilityEvidenceIsStructuralCheck !== false) {
      addError(errors, 'finalGate 必须声明可读性证据不是结构检查');
    }
  }

  return errors;
}

/**
 * 早期扩张战役结构契约自检（D2）。
 * 保证 coverage.earlyCampaign 自身完整、与 section 键常量一致，
 * 并且它锁定的每个事件都确实在 requiredEvents 里注册、处于 background 阶段。
 */
function validateEarlyCampaignContract(coverage) {
  const errors = [];
  const block = coverage.earlyCampaign;
  if (!isPlainObject(block)) {
    return ['coverage.earlyCampaign 缺失：早期扩张战役必须声明 analysisProfiles 十键结构与 researchStatus 严格规则'];
  }

  // ARCH-02 attempt 5：旧五键的兼容只允许由 legacyAnalysis 开关表达；
  // coverage 不再声明第二套“旧五键分析结构”（原 analysisKeys 已移除）。
  if (hasOwn(block, 'analysisKeys')) {
    errors.push('coverage.earlyCampaign.analysisKeys 已被移除：旧五键兼容只允许通过 legacyAnalysis 开关表达');
  }

  if (typeof block.minHanCharsPerKey !== 'number' || block.minHanCharsPerKey < 40) {
    errors.push('coverage.earlyCampaign.minHanCharsPerKey 必须是 >=40 的数字');
  }
  if (typeof block.minSourceIds !== 'number' || block.minSourceIds < 1) {
    errors.push('coverage.earlyCampaign.minSourceIds 必须是 >=1 的数字');
  }
  if (typeof block.minClaimIds !== 'number' || block.minClaimIds < 1) {
    errors.push('coverage.earlyCampaign.minClaimIds 必须是 >=1 的数字');
  }

  if (!Array.isArray(block.eventIds) || block.eventIds.length < 1) {
    errors.push('coverage.earlyCampaign.eventIds 不能为空');
  } else {
    const seen = new Set();
    const requiredIds = new Set((Array.isArray(coverage.requiredEvents) ? coverage.requiredEvents : []).map((e) => e && e.id));
    const backgroundIds = new Set(
      (Array.isArray(coverage.requiredEvents) ? coverage.requiredEvents : [])
        .filter((entry) => entry && entry.stage === 'background')
        .map((entry) => entry.id),
    );
    for (const id of block.eventIds) {
      if (seen.has(id)) errors.push(`coverage.earlyCampaign.eventIds 重复 ${id}`);
      seen.add(id);
      if (!requiredIds.has(id)) {
        errors.push(`coverage.earlyCampaign.eventIds 中的 ${id} 没有在 requiredEvents 注册`);
      } else if (!backgroundIds.has(id)) {
        errors.push(`coverage.earlyCampaign.eventIds 中的 ${id} 不属于 background 阶段`);
      }
    }
    // 反向：background 阶段的每个必需事件都必须有早期战役分析，否则可以绕过结构。
    for (const id of backgroundIds) {
      if (!seen.has(id)) {
        errors.push(`background 阶段必需事件 ${id} 没有登记到 coverage.earlyCampaign.eventIds，早期战役分析结构会被绕过`);
      }
    }
  }

  const overview = block.overviewTopics;
  if (!isPlainObject(overview)) {
    errors.push('coverage.earlyCampaign.overviewTopics 缺失：盟军连败/补给压力必须由导读小节正式承担');
  } else {
    const keyIds = Array.isArray(coverage.keyArticleIds) ? coverage.keyArticleIds : [];
    if (!keyIds.includes(overview.overviewArticleId)) {
      errors.push(`coverage.earlyCampaign.overviewTopics.overviewArticleId '${overview.overviewArticleId}' 不是重点文章`);
    }
    if (!Array.isArray(overview.requiredHeadings) || overview.requiredHeadings.length < 1) {
      errors.push('coverage.earlyCampaign.overviewTopics.requiredHeadings 不能为空');
    }
    const detail = (Array.isArray(coverage.keyArticles) ? coverage.keyArticles : []).find(
      (entry) => entry && entry.id === overview.overviewArticleId,
    );
    if (detail && Array.isArray(overview.requiredHeadings)) {
      const declared = Array.isArray(detail.requiredArticleHeadings) ? detail.requiredArticleHeadings : [];
      for (const heading of overview.requiredHeadings) {
        if (!declared.includes(heading)) {
          errors.push(
            `coverage.earlyCampaign.overviewTopics 的标题 '${heading}' 未出现在 ${overview.overviewArticleId} 的 requiredArticleHeadings 中`,
          );
        }
      }
    }
    if (typeof overview.minHanCharsPerHeading !== 'number' || overview.minHanCharsPerHeading < 40) {
      errors.push('coverage.earlyCampaign.overviewTopics.minHanCharsPerHeading 必须是 >=40 的数字');
    }
  }

  return errors;
}

/**
 * 单个早期扩张事件的五类分析深度检查（D2）。
 */
function isEarlyCampaignEvent(event, coverage) {
  const block = coverage && coverage.earlyCampaign;
  if (!isPlainObject(block) || !Array.isArray(block.eventIds)) return false;
  return typeof event.id === 'string' && block.eventIds.includes(event.id);
}

/**
 * ARCH-02：analysisProfiles 的十键定义（代码侧镜像）。
 * 键名必须与 contracts/coverage.json 的 earlyCampaign.analysisProfiles.keys
 * 以及 contracts/README.md 完全一致；契约侧一致性由 validateAnalysisProfilesContract 校验。
 */
const ANALYSIS_PROFILE_KEYS = [
  'background',
  'geography',
  'participants',
  'objectivesAndForces',
  'constraints',
  'course',
  'options',
  'resultsAndLosses',
  'impact',
  'uncertainty',
];

/**
 * `options` 必须同时写明“真实可选方案”和“排除它的约束”。
 */
const OPTIONS_CONSTRAINT_MARKERS = /(因为|由于|受限于|无法|不能|缺乏|不足|没有足够|只有|被迫|否则|代价|风险|约束|限制)/;
const OPTIONS_CHOICE_MARKERS = /(可以|本来|原本|曾考虑|可选|另一个选择|方案|选项|要么|或者)/;

/**
 * `uncertainty` 必须同时区分“有证据支持”与“争议/无法确定”。
 */
const UNCERTAINTY_EVIDENCE_MARKERS = /(有证据|据.*记载|档案|史料|来源显示|可以确认|已有记录|文献)/;
const UNCERTAINTY_DISPUTE_MARKERS = /(争议|无法确定|不确定|存疑|不同说法|尚无定论|不能判定|资料不足|难以确认)/;

/**
 * ARCH-02 的研究过程措辞黑名单：这类内容只能写进 researchStatus，
 * 不得出现在正文、事件 summary 或 claim 文本里。自 HIST-01 起生效。
 */
const RESEARCH_PROCESS_PATTERNS = [
  /本文(?:作者|团队)?(?:仍在|正在|尚未)?(?:检索|查证|搜集|调研|整理资料)/,
  /(?:待|尚待|有待)(?:查证|核实|补充资料|进一步检索)/,
  /(?:本|此)(?:节|文|段)(?:资料|证据)(?:尚|仍)?(?:不足|待补)/,
  /(?:检索|调研|查证)(?:中|过程|状态|进度)/,
  /(?:尚未|还未)(?:找到|取得|获得)(?:可靠)?(?:来源|资料|证据)/,
  /TODO|FIXME|待补|占位|placeholder/i,
];

function findResearchProcessWording(text) {
  if (typeof text !== 'string' || text.length === 0) return null;
  for (const pattern of RESEARCH_PROCESS_PATTERNS) {
    if (pattern.test(text)) return pattern;
  }
  return null;
}

/**
 * ARCH-02 attempt 5 修复 F4：`requiredElements` 必须真正落到正文上。
 *
 * 契约在 `coverage.earlyCampaign.analysisProfiles.keys[].elementMarkers` 里为每个必含
 * 要素声明一组可接受表述；验证器逐键逐要素断言正文至少命中一个。缺失即具名错误，
 * 且错误只点名该键该要素，不连带其它键（每个键独立检查）。
 */
function analysisProfileElementErrors(key, section, entry, pointer, errors) {
  if (!isPlainObject(section) || typeof section.body !== 'string') return;
  const requiredElements = Array.isArray(entry.requiredElements) ? entry.requiredElements : [];
  const markers = isPlainObject(entry.elementMarkers) ? entry.elementMarkers : {};
  for (const element of requiredElements) {
    const accepted = Array.isArray(markers[element]) ? markers[element].filter((item) => isNonEmptyString(item)) : [];
    if (accepted.length === 0) continue; // 契约侧缺少 markers 由 validateAnalysisProfilesContract 报错
    const hit = accepted.some((marker) => section.body.includes(marker));
    if (!hit) {
      addError(
        errors,
        `${pointer}.analysisProfiles.${key}.body: 缺少必含要素「${element}」（正文需要出现以下表述之一：${accepted.join('、')}）`,
      );
    }
  }
}

/**
 * 单个早期扩张事件的分析结构检查（D2 → ARCH-02，attempt 5 起严格化）。
 *
 * 严格规则（不存在门禁过渡豁免）：
 *   · 目标结构是 `analysisProfiles` 十键：全部键必须存在、标题固定、达到最小篇幅、
 *     每个必含要素命中正文、options/uncertainty 语义齐全；
 *   · 只提供旧 `earlyCampaignAnalysis`（五键）→ **始终**报 `旧五键结构已被停用`，
 *     同时继续给出逐键诊断以便 HIST-01 迁移定位；
 *   · 两者都没有 → 具名错误。
 * `legacyAnalysis.enforcement` 恒为 `off`（legacyDisabledBy=HIST-01），代码不使用它放行旧形状。
 */
function earlyCampaignDepthErrors(event, coverage, maps, pointer, errors) {
  const block = coverage.earlyCampaign || {};
  if (!isPlainObject(event)) return;

  const profilesBlock = isPlainObject(block.analysisProfiles) ? block.analysisProfiles : {};
  const profileKeys = Array.isArray(profilesBlock.keys) && profilesBlock.keys.length > 0
    ? profilesBlock.keys
    : ANALYSIS_PROFILE_KEYS.map((key) => ({ key, title: null }));
  const minHan = profilesBlock.minHanCharsPerKey || block.minHanCharsPerKey || 80;

  const hasProfiles = isPlainObject(event.analysisProfiles);
  const legacy = isPlainObject(event.earlyCampaignAnalysis) ? event.earlyCampaignAnalysis : null;

  if (!hasProfiles && !legacy) {
    addError(
      errors,
      `${pointer}.analysisProfiles: 早期扩张战役必须提供 analysisProfiles（${profileKeys.map((k) => k.key).join('/')} 十键分析结构）；旧五键 earlyCampaignAnalysis 已被停用，不接受为替代`,
    );
    return;
  }

  if (hasProfiles) {
    // ---- 目标结构：十键全面强制 ----
    const profiles = event.analysisProfiles;
    const declaredByKey = new Map();
    for (const entry of profileKeys) {
      if (entry && entry.key) declaredByKey.set(entry.key, entry);
    }
    for (const key of ANALYSIS_PROFILE_KEYS) {
      if (!hasOwn(profiles, key)) {
        addError(errors, `${pointer}.analysisProfiles.${key}: 缺少必需的 '${key}' 分析小节（十键必须全部存在）`);
      }
    }
    for (const entry of profileKeys) {
      const key = entry && entry.key;
      if (!key) continue;
      const section = profiles[key];
      if (!isPlainObject(section)) continue; // 缺失已在上面的循环里报过
      const sectionPointer = `${pointer}.analysisProfiles.${key}`;
      if (entry.title && comparableText(section.title) !== entry.title) {
        addError(errors, `${sectionPointer}.title: 必须是 '${entry.title}'`);
      }
      const han = hanCount(section.body);
      if (han < minHan) {
        addError(errors, `${sectionPointer}.body: 只有 ${han} 个汉字，每键分析至少需要 ${minHan} 个`);
      }
      checkEvidence(section, sectionPointer, maps, errors);
      if (unionSets(section.sourceIds).size < (profilesBlock.minSourceIds || 1)) {
        addError(errors, `${sectionPointer}: 至少需要 ${profilesBlock.minSourceIds || 1} 个来源`);
      }
      if (unionSets(section.claimIds).size < (profilesBlock.minClaimIds || 1)) {
        addError(errors, `${sectionPointer}: 至少需要 ${profilesBlock.minClaimIds || 1} 个 claim`);
      }
      // F4：requiredElements 必须检查正文，不能只在契约里声明。
      analysisProfileElementErrors(key, section, entry, pointer, errors);
    }
    // options：必须同时写明真实选项与被排除它的约束
    const optionsSection = profiles.options;
    if (isPlainObject(optionsSection) && typeof optionsSection.body === 'string') {
      const body = optionsSection.body;
      if (!OPTIONS_CHOICE_MARKERS.test(body)) {
        addError(
          errors,
          `${pointer}.analysisProfiles.options: 没有写出真实可选方案（需要出现“可以/方案/选项/原本”等具体选项表述）`,
        );
      }
      if (!OPTIONS_CONSTRAINT_MARKERS.test(body)) {
        addError(
          errors,
          `${pointer}.analysisProfiles.options: 没有写出排除该方案的约束（需要说明为何做不到：补给/情报/时间/距离等）`,
        );
      }
    }
    // uncertainty：必须区分有证据支持 / 争议或无法确定
    const uncertaintySection = profiles.uncertainty;
    if (isPlainObject(uncertaintySection) && typeof uncertaintySection.body === 'string') {
      const body = uncertaintySection.body;
      if (!UNCERTAINTY_EVIDENCE_MARKERS.test(body)) {
        addError(errors, `${pointer}.analysisProfiles.uncertainty: 没有写明哪些内容有证据支持`);
      }
      if (!UNCERTAINTY_DISPUTE_MARKERS.test(body)) {
        addError(errors, `${pointer}.analysisProfiles.uncertainty: 没有写明哪些内容存在争议或无法确定`);
      }
    }
    return;
  }

  // ---- 旧五键：门禁中一律拒绝（不存在过渡豁免）----
  // F4：legacyAnalysis.enforcement 恒为 off（legacyDisabledBy=HIST-01）。
  // 这里先给出“已被停用”的具名错误，再保留逐键诊断，方便 HIST-01 迁移时定位缺哪一键；
  // 但任何一条都已是门禁错误，旧形状不可能在 --stage 门禁中通过。
  addError(
    errors,
    `${pointer}.earlyCampaignAnalysis: 旧五键结构已被停用（legacyAnalysis.enforcement=off，legacyDisabledBy=HIST-01；不存在可在门禁中触发的过渡豁免），必须迁移到 analysisProfiles`,
  );
  const legacyMin = block.minHanCharsPerKey || 80;
  for (const key of LEGACY_EARLY_CAMPAIGN_KEYS) {
    const section = legacy[key];
    if (!isPlainObject(section)) {
      addError(errors, `${pointer}.earlyCampaignAnalysis.${key}: 缺少必需的 '${key}' 分析小节（旧五键已被停用，此诊断仅用于迁移定位）`);
      continue;
    }
    const canonicalTitle = LEGACY_ANALYSIS_TITLES[key];
    if (canonicalTitle && comparableText(section.title) !== canonicalTitle) {
      addError(errors, `${pointer}.earlyCampaignAnalysis.${key}.title: 必须是 '${canonicalTitle}'（迁移诊断；该形状已被停用）`);
    }
    const han = hanCount(section.body);
    if (han < legacyMin) {
      addError(
        errors,
        `${pointer}.earlyCampaignAnalysis.${key}.body: 只有 ${han} 个汉字，旧五键每类分析至少需要 ${legacyMin} 个（该形状已被停用，此诊断仅用于迁移定位）`,
      );
    }
    checkEvidence(section, `${pointer}.earlyCampaignAnalysis.${key}`, maps, errors);
    if (unionSets(section.sourceIds).size < (block.minSourceIds || 1)) {
      addError(errors, `${pointer}.earlyCampaignAnalysis.${key}: 至少需要 ${block.minSourceIds || 1} 个来源`);
    }
    if (unionSets(section.claimIds).size < (block.minClaimIds || 1)) {
      addError(errors, `${pointer}.earlyCampaignAnalysis.${key}: 至少需要 ${block.minClaimIds || 1} 个 claim`);
    }
  }
}

/**
 * ARCH-02 R2：analysisProfiles 契约自检。
 * 保证键名集合、最小深度、必含要素在 coverage.json 中完整声明，
 * 并与代码侧 ANALYSIS_PROFILE_KEYS 一致（README 由 D7 式文档断言覆盖）。
 */
function validateAnalysisProfilesContract(coverage) {
  const errors = [];
  const block = coverage && coverage.earlyCampaign;
  if (!isPlainObject(block)) return ['coverage.earlyCampaign 缺失'];
  const profiles = block.analysisProfiles;
  if (!isPlainObject(profiles)) {
    return ['coverage.earlyCampaign.analysisProfiles 缺失：早期战役必须声明十键具名分析结构'];
  }
  const keys = Array.isArray(profiles.keys) ? profiles.keys.map((entry) => entry && entry.key) : [];
  if (canonicalJson(keys) !== canonicalJson(ANALYSIS_PROFILE_KEYS)) {
    errors.push(
      `coverage.earlyCampaign.analysisProfiles.keys 必须严格为 ${ANALYSIS_PROFILE_KEYS.join(', ')}，实际 ${keys.join(', ') || '空'}`,
    );
  }
  for (const entry of Array.isArray(profiles.keys) ? profiles.keys : []) {
    if (!isPlainObject(entry)) {
      errors.push('coverage.earlyCampaign.analysisProfiles.keys 含非对象项');
      continue;
    }
    if (!isNonEmptyString(entry.title)) errors.push(`analysisProfiles.${entry.key}: 缺少中文标题`);
    if (!isNonEmptyString(entry.question)) errors.push(`analysisProfiles.${entry.key}: 缺少分析问题描述`);
    if (!Array.isArray(entry.requiredElements) || entry.requiredElements.length === 0) {
      errors.push(`analysisProfiles.${entry.key}: 缺少 requiredElements（必含要素）`);
    } else {
      const markers = isPlainObject(entry.elementMarkers) ? entry.elementMarkers : null;
      if (!markers) {
        errors.push(`analysisProfiles.${entry.key}: 缺少 elementMarkers（必含要素的机器可判定表述）`);
      } else {
        for (const element of entry.requiredElements) {
          if (!Array.isArray(markers[element]) || markers[element].filter((item) => isNonEmptyString(item)).length === 0) {
            errors.push(`analysisProfiles.${entry.key}: 必含要素「${element}」缺少 elementMarkers 表述（正文无法被机器判定）`);
          }
        }
      }
    }
  }
  if (typeof profiles.minHanCharsPerKey !== 'number' || profiles.minHanCharsPerKey < 40) {
    errors.push('coverage.earlyCampaign.analysisProfiles.minHanCharsPerKey 必须是 >=40 的数字');
  }
  if (typeof profiles.minSourceIds !== 'number' || profiles.minSourceIds < 1) {
    errors.push('coverage.earlyCampaign.analysisProfiles.minSourceIds 必须是 >=1 的数字');
  }
  if (typeof profiles.minClaimIds !== 'number' || profiles.minClaimIds < 1) {
    errors.push('coverage.earlyCampaign.analysisProfiles.minClaimIds 必须是 >=1 的数字');
  }
  const legacy = block.legacyAnalysis;
  if (!isPlainObject(legacy)) {
    errors.push('coverage.earlyCampaign.legacyAnalysis 缺失：必须声明旧五键迁移映射与 legacyDisabledBy');
  } else {
    // F4：旧五键的兼容只能以 legacyAnalysis 开关表达，且必须由 HIST-01 关闭；
    // 不允许 transition/accept 之类可在门禁中生效的取值。
    if (legacy.enforcement !== 'off') {
      errors.push(
        `coverage.earlyCampaign.legacyAnalysis.enforcement 必须恒为 'off'（不存在可在门禁中触发的过渡豁免），实际 ${JSON.stringify(legacy.enforcement)}`,
      );
    }
    if (legacy.legacyDisabledBy !== 'HIST-01') {
      errors.push(
        `coverage.earlyCampaign.legacyAnalysis.legacyDisabledBy 必须严格为 'HIST-01'，实际 ${JSON.stringify(legacy.legacyDisabledBy)}`,
      );
    }
  }
  const research = block.researchStatus;
  if (!isPlainObject(research)) {
    errors.push('coverage.earlyCampaign.researchStatus 缺失：必须声明 researchStatus 严格规则');
  } else {
    if (research.requiredForEarlyCampaignEvents !== true) {
      errors.push('coverage.earlyCampaign.researchStatus.requiredForEarlyCampaignEvents 必须为 true（严格规则）');
    }
    if (research.enforcedFrom !== 'HIST-01') {
      errors.push(`coverage.earlyCampaign.researchStatus.enforcedFrom 必须为 'HIST-01'，实际 ${JSON.stringify(research.enforcedFrom)}`);
    }
    if (canonicalJson(research.enum) !== canonicalJson(RESEARCH_STATUS_ENUM)) {
      errors.push('coverage.earlyCampaign.researchStatus.enum 必须与验证器枚举完全一致');
    }
  }
  return errors;
}

/**
 * ARCH-02：跨章节数值/类别一致性检查。
 *
 * 参考案例（达尔文空袭）：正文写“十八架重型轰炸机出现”，而同一事件的 claim 写
 * “18 架俯冲轰炸机”。同一个数字 18 在不同章节被归到不同的机种类别，读者会得到
 * 矛盾信息。检查会精确指出事件 ID、数字与两侧章节。
 *
 * 严格规则（ARCH-02 attempt 5）：`coverage.crossChapterContradiction.enforcement = 'strict'`，
 * 门禁中始终作为错误报告，不存在 warn/transition 豁免。参考案例（达尔文 18 架飞机类别）
 * 只用于 --self-test 的**构造式**负例，不表示该矛盾存在于本候选或任何已集成内容中。
 */
const AIRCRAFT_CATEGORY_PATTERNS = [
  { category: 'dive-bomber', pattern: /(俯冲轰炸机|俯冲轰炸)/ },
  { category: 'level-bomber', pattern: /(水平轰炸机|重型轰炸机|陆基轰炸机|岸基轰炸机)/ },
  { category: 'fighter', pattern: /(战斗机|零式战斗机|歼击机)/ },
  { category: 'torpedo-bomber', pattern: /(鱼雷机|鱼雷轰炸机)/ },
  { category: 'floatplane', pattern: /(水上飞机|飞行艇)/ },
];

/**
 * 中文数字解析（ARCH-02 a2 修复 D1）。
 *
 * 覆盖：半角数字（18）、全角数字（１８）、中文数字（十八 / 二十四 / 七十二 /
 * 一百四十 / 两百 / 三千）以及「两百」「二百」等口语形式。
 * 旧实现只有一张到 72 为止的查表，既不能处理全角数字，也不能处理 >99 的数，
 * 因此「一百四十架俯冲轰炸机」这类写法会被静默漏检。
 */
const CN_DIGIT = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const CN_UNIT = { 十: 10, 百: 100, 千: 1000 };

/**
 * 把全角数字字符转成半角，便于统一处理。
 */
function normalizeFullWidthDigits(text) {
  if (typeof text !== 'string') return '';
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0);
    // 全角 ０-９ (U+FF10–U+FF19) → 半角
    if (code >= 0xff10 && code <= 0xff19) out += String.fromCharCode(code - 0xff10 + 0x30);
    else out += ch;
  }
  return out;
}

/**
 * 解析一个数字片段为整数；无法解析时返回 null。
 * 支持半角、全角与中文数字（含十/百/千）。
 */
function parseAircraftCount(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  const text = normalizeFullWidthDigits(raw).trim();
  if (/^[0-9]+$/u.test(text)) return Number(text);
  if (!/^[零〇一二两三四五六七八九十百千]+$/u.test(text)) return null;
  let section = 0;
  let digit = 0;
  let sawAny = false;
  for (const ch of text) {
    sawAny = true;
    if (hasOwn(CN_DIGIT, ch)) {
      digit = CN_DIGIT[ch];
    } else if (hasOwn(CN_UNIT, ch)) {
      const unit = CN_UNIT[ch];
      // 「十八」：十前面没有数字时视为 1
      if (digit === 0) digit = 1;
      section += digit * unit;
      digit = 0;
    } else {
      return null;
    }
  }
  if (!sawAny) return null;
  const total = section + digit;
  return total > 0 ? total : null;
}

/**
 * 抽取文本中所有的 (数量, 机种类别) 断言。
 */
function extractAircraftClaims(text) {
  const found = [];
  if (typeof text !== 'string' || text.length === 0) return found;
  // 先归一化全角数字，再匹配：
  //   “18 架俯冲轰炸机” / “十八架重型轰炸机” / “一百四十架水平轰炸机” / “两百架战斗机”
  const normalized = normalizeFullWidthDigits(text);
  const regex = /([0-9]{1,4}|[零〇一二两三四五六七八九十百千]+)\s*架\s*([\u4e00-\u9fff]{1,8})/gu;
  let match;
  while ((match = regex.exec(normalized)) !== null) {
    const count = parseAircraftCount(match[1]);
    if (count === null) continue;
    const tail = match[2];
    for (const { category, pattern } of AIRCRAFT_CATEGORY_PATTERNS) {
      if (pattern.test(tail)) {
        found.push({ count, category, raw: match[0] });
        break;
      }
    }
  }
  return found;
}

/**
 * 取出与某个事件关联的 claim 条目（事件自身 claimIds + 引用该事件的 claim）。
 * 用于跨章节一致性检查，把正文叙述与证据文本放在一起比较。
 */
function relatedClaimEntries(event, maps) {
  const entries = [];
  const seen = new Set();
  const push = (claimId) => {
    if (typeof claimId !== 'string' || seen.has(claimId)) return;
    const claim = maps.claims.get(claimId);
    if (!claim) return;
    seen.add(claimId);
    entries.push([claimId, claim]);
  };
  for (const claimId of Array.isArray(event.claimIds) ? event.claimIds : []) push(claimId);
  for (const [claimId, claim] of maps.claims.entries()) {
    if (Array.isArray(claim.entityIds) && claim.entityIds.includes(event.id)) push(claimId);
  }
  return entries;
}

/**
 * 检查单个事件的跨章节数值/类别矛盾。
 * @returns {string[]} 错误信息（空数组表示一致）
 */
function crossChapterContradictionErrors(event, pointer) {
  const errors = [];
  if (!isPlainObject(event)) return errors;
  // 收集每个数字在各处被赋予的类别
  const byCount = new Map(); // count -> { category -> [locations] }
  const record = (count, category, location) => {
    if (!byCount.has(count)) byCount.set(count, new Map());
    const cats = byCount.get(count);
    if (!cats.has(category)) cats.set(category, []);
    cats.get(category).push(location);
  };

  for (const [index, section] of (Array.isArray(event.article) ? event.article : []).entries()) {
    if (!isPlainObject(section)) continue;
    const heading = comparableText(section.heading);
    for (const item of extractAircraftClaims(section.body)) {
      record(item.count, item.category, `正文 article[${index}]（'${heading}'）: ${item.raw}`);
    }
  }
  if (typeof event.summary === 'string') {
    for (const item of extractAircraftClaims(event.summary)) {
      record(item.count, item.category, `事件 summary: ${item.raw}`);
    }
  }
  // claim 文本需要由调用方传入（claim 不内嵌在 event 里）
  for (const [claimId, claim] of Array.isArray(event.__relatedClaims) ? event.__relatedClaims : []) {
    for (const item of extractAircraftClaims(claim.text)) {
      record(item.count, item.category, `claim ${claimId}: ${item.raw}`);
    }
  }

  for (const [count, cats] of byCount.entries()) {
    if (cats.size <= 1) continue;
    const detail = [...cats.entries()]
      .map(([category, locations]) => `${category} ← ${locations.join('；')}`)
      .join(' ‖ ');
    errors.push(
      `${pointer}: 跨章节数值/类别矛盾 —— 同一个数字 ${count} 架在不同位置被归为不同机种：${detail}。` +
        ` 请统一类别，或在正文明确说明这是不同来源的分类差异（改写成 disputed claim）。`,
    );
  }
  return errors;
}

/**
 * ARCH-02 R3：研究/检索过程状态只能写在 `researchStatus` 字段里。
 *
 * 该负例**自 HIST-01 起生效**：HIST-01 起交付的事件必须把“还在检索/待补资料/
 * 尚未取得来源”这类过程状态放进 researchStatus（枚举），而正文、summary 与
 * claim 文本只写结论。研究过程措辞出现在这些位置就是错误。
 */
const RESEARCH_STATUS_ENUM = ['not-started', 'sources-identified', 'sources-retrieved', 'cross-checked', 'final'];

function researchStatusErrors(event, pointer, errors, { required = false } = {}) {
  if (!isPlainObject(event)) return;
  // 0) F2：早期战役事件必须声明 researchStatus（严格规则，不依赖 --stage）。
  //    此前只在字段存在时才校验枚举，等于永不强制；现在缺失即具名错误。
  if (required && (!hasOwn(event, 'researchStatus') || event.researchStatus === undefined || event.researchStatus === null)) {
    addError(
      errors,
      `${pointer}.researchStatus: 早期战役事件必须声明 researchStatus（${RESEARCH_STATUS_ENUM.join('|')} 之一），过程状态不得只写在正文里（自 HIST-01 起生效）`,
    );
  }
  // 1) researchStatus 本身必须是合法枚举
  if (hasOwn(event, 'researchStatus') && event.researchStatus !== undefined && event.researchStatus !== null) {
    if (!RESEARCH_STATUS_ENUM.includes(event.researchStatus)) {
      addError(
        errors,
        `${pointer}.researchStatus: 必须是 ${RESEARCH_STATUS_ENUM.join('|')} 之一，实际 ${JSON.stringify(event.researchStatus)}`,
      );
    }
  }
  // 2) 事件 summary 不得出现研究过程措辞
  if (typeof event.summary === 'string') {
    const matched = findResearchProcessWording(event.summary);
    if (matched) {
      addError(
        errors,
        `${pointer}.summary: 出现研究/检索过程措辞（/${matched.source}/）；过程状态只能写进 researchStatus 字段（自 HIST-01 起生效）`,
      );
    }
  }
  // 3) 正文各小节不得出现研究过程措辞
  for (const [articleIndex, section] of (Array.isArray(event.article) ? event.article : []).entries()) {
    if (!isPlainObject(section) || typeof section.body !== 'string') continue;
    const matched = findResearchProcessWording(section.body);
    if (matched) {
      addError(
        errors,
        `${pointer}.article[${articleIndex}] ('${comparableText(section.heading)}').body: 出现研究/检索过程措辞（/${matched.source}/）；过程状态只能写进 researchStatus 字段（自 HIST-01 起生效）`,
      );
    }
  }
}

const RESEARCH_STATUS_ENUM_KEYS = RESEARCH_STATUS_ENUM;

/**
 * 交付阶段归属契约自检（D3 + ARCH-02 单一来源）。
 *
 * ARCH-02 起，`stageOwnership.<stage>` 是对象 `{ keyArticles: [...], events: [...] }`，
 * 它是**唯一**的阶段归属来源：验证器只从这里派生交付阶段，requiredEvents[].stage
 * 必须与之交叉一致，不存在第二套归属表或别名。
 *
 * 不变式：
 *   1. stageOwnership 只包含合法阶段 id，五个阶段一个不缺；
 *   2. keyArticleIds 中每一篇都被恰好一个阶段拥有（不重不漏）；
 *   3. 每篇文章的 keyArticles[].stage 必须等于拥有它的阶段；
 *   4. 每个阶段都必须拥有至少一篇文章（否则该阶段门禁形同虚设）；
 *   5. [ARCH-02] requiredEvents 中每个事件必须恰好被一个阶段的 events 拥有；
 *   6. [ARCH-02] requiredEvents[].stage 必须等于拥有它的阶段（交叉一致性）。
 */
/**
 * ARCH-02：从 stageOwnership 单一来源派生查询。
 * 这些函数是验证器唯一的事件阶段归属来源；不存在第二套表或别名。
 */
function ownershipStageForEvent(coverage, eventId) {
  const ownership = coverage && coverage.stageOwnership;
  if (!isPlainObject(ownership)) return null;
  for (const stage of STAGE_IDS) {
    const value = ownership[stage];
    if (isPlainObject(value) && Array.isArray(value.events) && value.events.includes(eventId)) return stage;
  }
  return null;
}

function ownedEventIds(coverage, stage) {
  const value = coverage && coverage.stageOwnership ? coverage.stageOwnership[stage] : null;
  if (!isPlainObject(value) || !Array.isArray(value.events)) return [];
  return value.events.slice();
}

/**
 * ARCH-02 的 backgroundGate：**只**引用 stageOwnership.background.events。
 * 返回值用于 --check-contracts 打印实际引用的 ID 列表，便于审查。
 */
function backgroundGateEventIds(coverage) {
  return ownedEventIds(coverage, 'background');
}

/**
 * ARCH-02：事件允许的历史部分集合，按 stageOwnership 派生。
 *
 * 取代旧的硬编码 background→part-3-expansion。规则：
 *   · 事件所属阶段的**所有导读重点文章**的 historicalPart 都算合法；
 *   · 额外允许 `stageOwnership.eventPartPolicy` 中显式声明的跨阶段部分
 *     （background 事件可落在 part-3 或 part-4）。
 * 这样杜立特空袭（background 阶段、part-4 导读）合法，而错配仍然会被拒绝。
 */
function allowedPartsForStage(coverage, stage) {
  const parts = new Set();
  const ownership = coverage && coverage.stageOwnership;
  if (!isPlainObject(ownership)) return parts;
  const pushArticlePart = (articleId) => {
    const entry = (Array.isArray(coverage.keyArticles) ? coverage.keyArticles : []).find((item) => item && item.id === articleId);
    if (entry && PART_IDS.includes(entry.historicalPart)) parts.add(entry.historicalPart);
  };
  // 1) 本阶段拥有的导读文章所代表的历史部分
  const value = ownership[stage];
  if (isPlainObject(value) && Array.isArray(value.keyArticles)) {
    for (const articleId of value.keyArticles) pushArticlePart(articleId);
  }
  // 2) 事件可合法落在的其它导读（例如 background 事件也写进 part-4）
  const crossStage = DECLARED_EVENT_PART_CROSSINGS[stage];
  if (Array.isArray(crossStage)) {
    for (const articleId of crossStage) pushArticlePart(articleId);
  }
  return parts;
}

/**
 * 事件可跨导读写入的显式声明（ARCH-02 eventPartPolicy 的代码侧镜像）。
 * 与 coverage.stageOwnership.eventPartPolicy 文本一致：
 * background 阶段的事件可以合法落在 part-3-expansion 或 part-4-turning-point。
 * 这是“允许集合”，不是归属表——归属仍只来自 stageOwnership.events。
 */
const DECLARED_EVENT_PART_CROSSINGS = {
  background: ['event-overview-part-4-turning-point'],
};

function validateStageOwnershipContract(coverage) {
  const errors = [];
  const ownership = coverage.stageOwnership;
  if (!isPlainObject(ownership)) {
    return ['coverage.stageOwnership 缺失：重点文章与事件的交付阶段归属必须被契约锁定'];
  }
  const keyIds = Array.isArray(coverage.keyArticleIds) ? coverage.keyArticleIds : [];
  const keySet = new Set(keyIds);

  const metaKeys = new Set(['description', 'eventPartPolicy']);
  const ownershipStages = Object.keys(ownership).filter((key) => !metaKeys.has(key));
  for (const stage of ownershipStages) {
    if (!STAGE_IDS.includes(stage)) errors.push(`coverage.stageOwnership 含未知阶段 '${stage}'`);
  }
  for (const stage of STAGE_IDS) {
    if (!hasOwn(ownership, stage)) {
      errors.push(`coverage.stageOwnership 缺少阶段 '${stage}'`);
      continue;
    }
    const value = ownership[stage];
    if (!isPlainObject(value)) {
      errors.push(`coverage.stageOwnership.${stage} 必须是对象 { keyArticles, events }`);
      continue;
    }
    if (!Array.isArray(value.keyArticles)) errors.push(`coverage.stageOwnership.${stage}.keyArticles 必须是数组`);
    if (!Array.isArray(value.events)) errors.push(`coverage.stageOwnership.${stage}.events 必须是数组`);
    // 不允许遗留旧的裸数组形态或额外别名键
    for (const key of Object.keys(value)) {
      if (key !== 'keyArticles' && key !== 'events') {
        errors.push(`coverage.stageOwnership.${stage} 含未定义键 '${key}'（只允许 keyArticles 与 events）`);
      }
    }
  }

  const ownedCounts = new Map();
  for (const stage of STAGE_IDS) {
    const value = ownership[stage];
    const list = isPlainObject(value) && Array.isArray(value.keyArticles) ? value.keyArticles : [];
    if (list.length === 0) errors.push(`coverage.stageOwnership.${stage}: 该阶段没有拥有任何重点文章`);
    for (const id of list) {
      ownedCounts.set(id, (ownedCounts.get(id) || 0) + 1);
      if (!keySet.has(id)) {
        errors.push(`coverage.stageOwnership.${stage}.keyArticles: '${id}' 不是 keyArticleIds 中的重点文章（孤立 ID）`);
      }
    }
  }

  for (const [id, count] of ownedCounts.entries()) {
    if (count > 1) errors.push(`'${id}' 被 ${count} 个阶段重复拥有（每个重点文章必须只有一个交付阶段）`);
  }
  for (const id of keyIds) {
    if (!ownedCounts.has(id)) errors.push(`重点文章 '${id}' 没有 stageOwnership 阶段归属`);
  }

  // keyArticles[].stage 必须与 stageOwnership 一致
  for (const entry of Array.isArray(coverage.keyArticles) ? coverage.keyArticles : []) {
    if (!isPlainObject(entry)) continue;
    let declaredStage = null;
    for (const stage of STAGE_IDS) {
      const value = ownership[stage];
      if (isPlainObject(value) && Array.isArray(value.keyArticles) && value.keyArticles.includes(entry.id)) {
        declaredStage = stage;
      }
    }
    if (declaredStage && entry.stage !== declaredStage) {
      errors.push(
        `coverage.keyArticles ${entry.id}: stage='${entry.stage}' 与 stageOwnership 的 '${declaredStage}' 不一致`,
      );
    }
  }

  // --- ARCH-02：事件的单一归属与交叉一致性 ---
  const requiredEvents = Array.isArray(coverage.requiredEvents) ? coverage.requiredEvents : [];
  const eventStageById = new Map();
  for (const entry of requiredEvents) {
    if (isPlainObject(entry) && typeof entry.id === 'string') eventStageById.set(entry.id, entry.stage);
  }
  const ownedEventStages = new Map(); // id -> [stage,...]
  for (const stage of STAGE_IDS) {
    const value = ownership[stage];
    if (!isPlainObject(value) || !Array.isArray(value.events)) continue;
    for (const id of value.events) {
      if (!ownedEventStages.has(id)) ownedEventStages.set(id, []);
      ownedEventStages.get(id).push(stage);
      if (!eventStageById.has(id)) {
        errors.push(
          `coverage.stageOwnership.${stage}.events: '${id}' 不在 requiredEvents 中（events 归属必须引用已登记的必需事件）`,
        );
      }
    }
  }
  for (const [id, stages] of ownedEventStages.entries()) {
    if (stages.length > 1) {
      errors.push(`事件 '${id}' 被 ${stages.length} 个阶段重复拥有（${stages.join(', ')}）；每个事件必须只有一个交付阶段`);
    }
  }
  for (const [id, stage] of eventStageById.entries()) {
    const owned = ownedEventStages.get(id);
    if (!owned) {
      errors.push(`requiredEvents '${id}' 没有登记到 stageOwnership.<stage>.events（阶段归属必须单一来源）`);
      continue;
    }
    if (owned.length === 1 && owned[0] !== stage) {
      errors.push(
        `requiredEvents '${id}': stage='${stage}' 与 stageOwnership 事件归属 '${owned[0]}' 不一致（单一来源交叉一致性）`,
      );
    }
  }

  return errors;
}

/**
 * 每篇文章的素材类型契约自检（D3）。
 * 不变式：
 *   1. requiredMediaTypes 的键集合精确等于 keyArticleIds（不重不漏）；
 *   2. 每个重点文章至少声明一种素材类型，且类型都在白名单内、无重复；
 *   3. 媒体类型要求与文章种类相符（战役需 battle-map、指挥官需 portrait、专题需 diagram、导读需 map）。
 */
const MEDIA_TYPES_BY_KIND = {
  battle: 'battle-map',
  'commander-profile': 'portrait',
  'concept-article': 'diagram',
  'part-overview': 'map',
};

function validateMediaTypeContract(coverage) {
  const errors = [];
  const required = coverage.requiredMediaTypes;
  if (!isPlainObject(required)) return ['coverage.requiredMediaTypes 缺失'];
  const keyIds = Array.isArray(coverage.keyArticleIds) ? coverage.keyArticleIds : [];
  const keySet = new Set(keyIds);

  for (const key of Object.keys(required)) {
    if (!keySet.has(key)) errors.push(`coverage.requiredMediaTypes 含孤立 ID '${key}'（不是重点文章）`);
  }
  for (const id of keyIds) {
    if (!hasOwn(required, id)) {
      errors.push(`重点文章 '${id}' 没有 requiredMediaTypes 条目（每篇都必须声明所需素材类型）`);
    }
  }

  for (const entry of Array.isArray(coverage.keyArticles) ? coverage.keyArticles : []) {
    if (!isPlainObject(entry)) continue;
    const types = required[entry.id];
    if (!Array.isArray(types) || types.length === 0) {
      errors.push(`coverage.requiredMediaTypes.${entry.id}: 至少需要声明一种素材类型`);
      continue;
    }
    if (new Set(types).size !== types.length) {
      errors.push(`coverage.requiredMediaTypes.${entry.id}: 素材类型重复`);
    }
    for (const type of types) {
      if (!MEDIA_TYPES.includes(type)) errors.push(`coverage.requiredMediaTypes.${entry.id}: 未知素材类型 '${type}'`);
    }
    // 战役由 --media 另行要求 battle-map + photograph，这里只锁定最小必需类型。
    const expectedType = MEDIA_TYPES_BY_KIND[entry.kind];
    if (expectedType && !types.includes(expectedType)) {
      errors.push(
        `coverage.requiredMediaTypes.${entry.id}: ${entry.kind} 文章必须包含素材类型 '${expectedType}'，实际 [${types.join(', ')}]`,
      );
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// 索引与引用
// ---------------------------------------------------------------------------
function buildIndexes(doc, errors) {
  const maps = {};
  const globalIds = new Map();
  for (const collection of COLLECTIONS) {
    maps[collection] = new Map();
    const array = Array.isArray(doc[collection]) ? doc[collection] : [];
    array.forEach((entry, index) => {
      if (!isPlainObject(entry) || typeof entry.id !== 'string') return;
      const expectedPrefix = `${COLLECTION_PREFIX[collection]}-`;
      if (!entry.id.startsWith(expectedPrefix)) {
        addError(errors, `$.${collection}[${index}].id: '${entry.id}' 前缀必须是 '${expectedPrefix}'`);
      }
      if (globalIds.has(entry.id)) {
        addError(errors, `$.${collection}[${index}].id: 重复 ID '${entry.id}'（另见 ${globalIds.get(entry.id)}）`);
      } else {
        globalIds.set(entry.id, `$.${collection}[${index}]`);
      }
      if (!maps[collection].has(entry.id)) maps[collection].set(entry.id, entry);
    });
  }

  const allEntities = new Map();
  for (const collection of ARTICLE_ENTITY_COLLECTIONS) {
    for (const [id, entry] of maps[collection]) {
      if (!allEntities.has(id)) allEntities.set(id, { collection, entry });
    }
  }

  const registerEmbedded = (id, pointer) => {
    if (typeof id !== 'string') return;
    if (globalIds.has(id)) addError(errors, `${pointer}: 重复 ID '${id}'（另见 ${globalIds.get(id)}）`);
    else globalIds.set(id, pointer);
  };

  for (const person of maps.people.values()) {
    if (!Array.isArray(person.decisions)) continue;
    person.decisions.forEach((decision, index) => {
      if (isPlainObject(decision)) registerEmbedded(decision.id, `people.${person.id}.decisions[${index}]`);
    });
  }
  for (const battle of maps.battles.values()) {
    if (!Array.isArray(battle.phases)) continue;
    battle.phases.forEach((phase, phaseIndex) => {
      if (!isPlainObject(phase)) return;
      registerEmbedded(phase.id, `battles.${battle.id}.phases[${phaseIndex}]`);
      if (!Array.isArray(phase.routes)) return;
      phase.routes.forEach((route, routeIndex) => {
        if (isPlainObject(route)) registerEmbedded(route.id, `battles.${battle.id}.phases[${phaseIndex}].routes[${routeIndex}]`);
      });
    });
  }

  maps.allEntities = allEntities;
  maps.globalIds = globalIds;
  return maps;
}

function checkRefs(owner, field, map, label, pointer, errors) {
  if (!isPlainObject(owner) || !Array.isArray(owner[field])) return;
  owner[field].forEach((id, index) => {
    if (typeof id !== 'string') return;
    if (!map.has(id)) addError(errors, `${pointer}.${field}[${index}]: 断链：${label} '${id}' 不存在`);
  });
}

function checkEntityRefs(owner, field, maps, pointer, errors) {
  checkRefs(owner, field, maps.allEntities, '内容实体', pointer, errors);
}

function checkEvidence(owner, pointer, maps, errors) {
  checkRefs(owner, 'sourceIds', maps.sources, '来源', pointer, errors);
  checkRefs(owner, 'claimIds', maps.claims, 'claim', pointer, errors);
}

function checkPlaceRefs(owner, field, maps, pointer, errors) {
  checkRefs(owner, field, maps.places, '地点', pointer, errors);
}

function checkPersonRefs(owner, field, maps, pointer, errors) {
  checkRefs(owner, field, maps.people, '人物', pointer, errors);
}

function checkEventRefs(owner, field, maps, pointer, errors) {
  checkRefs(owner, field, maps.events, '事件', pointer, errors);
}

function checkBattleRefs(owner, field, maps, pointer, errors) {
  checkRefs(owner, field, maps.battles, '战役', pointer, errors);
}

function checkConceptRefs(owner, field, maps, pointer, errors) {
  checkRefs(owner, field, maps.concepts, '专题', pointer, errors);
}

function checkUnitRefs(owner, field, maps, pointer, errors) {
  checkRefs(owner, field, maps.units, '单位', pointer, errors);
}

function checkEquipmentRefs(owner, field, maps, pointer, errors) {
  checkRefs(owner, field, maps.equipment, '装备', pointer, errors);
}

function checkDateValue(value, pointer, errors, { range = false, optional = false } = {}) {
  if (value === undefined && optional) return true;
  if (!validDateString(value)) {
    addError(errors, `${pointer}: 不是有效日期 YYYY-MM-DD`);
    return false;
  }
  if (range && !dateWithinHistoricalRange(value)) {
    addError(errors, `${pointer}: 日期 ${value} 超出允许范围 ${MIN_HISTORICAL_DATE} 至 ${MAX_HISTORICAL_DATE}`);
    return false;
  }
  return true;
}

function locatorIsPrecise(locator, locatorType) {
  if (!isNonEmptyString(locator) || locator.trim().length < 4) return false;
  const text = locator.trim();
  if (/^(?:整个网页|整页|全文|网页|来源|同上|见上|unknown|n\/?a|na|无)$/i.test(text)) return false;
  switch (locatorType) {
    case 'page':
    case 'page-range':
      return /\d/.test(text);
    case 'chapter-section':
      return /(?:\d|章|节|chapter|section|§)/i.test(text);
    case 'section-paragraph':
      return /(?:\d|段|paragraph|para\.?|§|节)/i.test(text);
    case 'table':
    case 'figure':
      return /(?:\d|表|图|table|figure|fig\.)/i.test(text);
    case 'archival-item':
      return text.length >= 6 && /[A-Za-z0-9]/.test(text);
    case 'timecode':
      return /\b\d{1,2}:\d{2}\b/.test(text);
    case 'transcript-line':
      return /(?:\d|行|line)/i.test(text);
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// 实体语义检查
// ---------------------------------------------------------------------------

function validateSource(source, index, errors, maps) {
  const pointer = `$.sources[${index}]`;
  checkDateValue(source.accessedDate, `${pointer}.accessedDate`, errors);
  if (typeof source.url === 'string' && !/^https?:\/\//.test(source.url)) {
    addError(errors, `${pointer}.url: 必须是 http(s) URL`);
  }
  if (!Number.isInteger(source.year) || source.year < 1800 || source.year > 2100) {
    addError(errors, `${pointer}.year: 年份必须是 1800–2100 的整数`);
  }
  if (isNonEmptyString(source.url)) {
    const duplicate = [...maps.sources.values()].filter((item) => item !== source && item.url === source.url);
    if (duplicate.length > 0) addError(errors, `${pointer}.url: 与另一个 source 使用相同 URL，需合并或说明理由`);
  }
}

function validateClaim(claim, index, errors, maps) {
  const pointer = `$.claims[${index}]`;
  checkEntityRefs(claim, 'entityIds', maps, pointer, errors);
  checkRefs(claim, 'sourceIds', maps.sources, '来源', pointer, errors);
  if (!Array.isArray(claim.locators)) return;
  const sourceIds = uniqueStrings(claim.sourceIds);
  const coveredSources = new Set();
  claim.locators.forEach((locator, locatorIndex) => {
    const locatorPointer = `${pointer}.locators[${locatorIndex}]`;
    if (!isPlainObject(locator)) return;
    if (typeof locator.sourceId !== 'string' || !maps.sources.has(locator.sourceId)) {
      addError(errors, `${locatorPointer}.sourceId: 来源缺失或断链 '${locator.sourceId}'`);
    }
    if (!sourceIds.includes(locator.sourceId)) {
      addError(errors, `${locatorPointer}.sourceId: 定位来源 '${locator.sourceId}' 不在 claim.sourceIds 中`);
    }
    coveredSources.add(locator.sourceId);
    if (!LOCATOR_TYPES.includes(locator.locatorType)) {
      addError(errors, `${locatorPointer}.locatorType: 未知定位类型 '${locator.locatorType}'`);
    } else if (!locatorIsPrecise(locator.locator, locator.locatorType)) {
      addError(errors, `${locatorPointer}.locator: 定位不够精确，不接受“整个网页/全文”等泛定位`);
    }
  });
  for (const sourceId of sourceIds) {
    if (!coveredSources.has(sourceId)) {
      addError(errors, `${pointer}.locators: 来源 '${sourceId}' 缺少对应的精确 locator`);
    }
  }
  const hasQuantitativeContent = /\d|(?:[一二三四五六七八九十百千万亿两]+(?:年|月|日|艘|架|人|名|公里|海里|吨|小时|分钟|次|倍|个|万))/u.test(
    claim.text || '',
  );
  if (hasQuantitativeContent && (!Array.isArray(claim.locators) || claim.locators.length === 0)) {
    addError(errors, `${pointer}: 含有日期/数字的 claim 必须提供精确来源定位`);
  }
}

function validateQuestion(question, index, errors, maps, coverage) {
  const pointer = `$.questions[${index}]`;
  checkEntityRefs(question, 'entityIds', maps, pointer, errors);
  checkRefs(question, 'sourceIds', maps.sources, '来源', pointer, errors);
  checkRefs(question, 'claimIds', maps.claims, 'claim', pointer, errors);
  if (!PART_IDS.includes(question.historicalPart)) {
    addError(errors, `${pointer}.historicalPart: 必须是五部分之一`);
  }
  if (Array.isArray(question.entityIds) && question.entityIds.length < coverage.questionMinimumEntityRefs) {
    addError(errors, `${pointer}.entityIds: 至少关联 ${coverage.questionMinimumEntityRefs} 个内容实体`);
  }
  if (isNonEmptyString(question.prompt) && !/[?？]\s*$/.test(question.prompt.trim())) {
    addError(errors, `${pointer}.prompt: 问题必须以问号结尾`);
  }
  const answerHan = hanCount(question.answer);
  if (answerHan < coverage.questionMinimumAnswerHanChars) {
    addError(
      errors,
      `${pointer}.answer: 回答只有 ${answerHan} 个汉字，需至少 ${coverage.questionMinimumAnswerHanChars} 个；请提供解释、证据与关联，而不是关键词。`,
    );
  }
}

function validateArticleSections(sections, pointer, errors, maps, minPerSectionHan = 30) {
  if (!Array.isArray(sections)) return { sections: 0, han: 0, headings: [], hanByHeading: new Map() };
  let totalHan = 0;
  const headings = [];
  const seen = new Set();
  // D5：记录每个小节标题对应的汉字数，供“必需标题的最低深度”断言使用。
  const hanByHeading = new Map();
  sections.forEach((section, index) => {
    const sectionPointer = `${pointer}[${index}]`;
    if (!isPlainObject(section)) return;
    const heading = comparableText(section.heading);
    if (seen.has(heading)) addError(errors, `${sectionPointer}.heading: 标题重复 '${heading}'`);
    seen.add(heading);
    headings.push(heading);
    const sectionHan = hanCount(section.body);
    totalHan += sectionHan;
    hanByHeading.set(heading, sectionHan);
    if (sectionHan < minPerSectionHan) {
      addError(errors, `${sectionPointer}.body: 只有 ${sectionHan} 个汉字，单节至少 ${minPerSectionHan} 个`);
    }
    checkEvidence(section, sectionPointer, maps, errors);
  });
  return { sections: sections.length, han: totalHan, headings, hanByHeading };
}

function validateEvent(event, index, errors, maps) {
  const pointer = `$.events[${index}]`;
  const startOk = checkDateValue(event.startDate, `${pointer}.startDate`, errors, { range: true });
  checkDateValue(event.endDate, `${pointer}.endDate`, errors, { range: true, optional: true });
  if (startOk && isNonEmptyString(event.endDate) && event.endDate < event.startDate) {
    addError(errors, `${pointer}.endDate: 结束日期不能早于开始日期`);
  }
  checkPlaceRefs(event, 'placeIds', maps, pointer, errors);
  checkPersonRefs(event, 'personIds', maps, pointer, errors);
  checkUnitRefs(event, 'unitIds', maps, pointer, errors);
  checkEquipmentRefs(event, 'equipmentIds', maps, pointer, errors);
  checkConceptRefs(event, 'conceptIds', maps, pointer, errors);
  checkEventRefs(event, 'relatedEventIds', maps, pointer, errors);
  checkEvidence(event, pointer, maps, errors);
  if (typeof event.battleId === 'string' && !maps.battles.has(event.battleId)) {
    addError(errors, `${pointer}.battleId: 断链：战役 '${event.battleId}' 不存在`);
  }
  const articleStats = validateArticleSections(event.article, `${pointer}.article`, errors, maps, 40);
  return articleStats;
}

function validateSideTexts(views, pointer, errors, minHan = 8) {
  if (!isPlainObject(views)) return;
  for (const side of ['japan', 'allies']) {
    const text = views[side];
    if (typeof text === 'string' && hanCount(text) < minHan) {
      addError(errors, `${pointer}.${side}: 内容过短（${hanCount(text)} 个汉字，至少 ${minHan} 个）`);
    }
  }
}

function validateBattle(battle, index, errors, maps, coverage, keyEntry) {
  const pointer = `$.battles[${index}]`;
  const startOk = checkDateValue(battle.startDate, `${pointer}.startDate`, errors, { range: true });
  checkDateValue(battle.endDate, `${pointer}.endDate`, errors, { range: true, optional: true });
  if (startOk && isNonEmptyString(battle.endDate) && battle.endDate < battle.startDate) {
    addError(errors, `${pointer}.endDate: 结束日期不能早于开始日期`);
  }
  checkPlaceRefs(battle, 'placeIds', maps, pointer, errors);
  checkPersonRefs(battle, 'personIds', maps, pointer, errors);
  checkUnitRefs(battle, 'unitIds', maps, pointer, errors);
  checkEquipmentRefs(battle, 'equipmentIds', maps, pointer, errors);
  checkConceptRefs(battle, 'conceptIds', maps, pointer, errors);
  checkEvidence(battle, pointer, maps, errors);

  if (isPlainObject(battle.commanderIds)) {
    for (const side of ['japan', 'allies']) {
      checkPersonRefs(battle.commanderIds, side, maps, `${pointer}.commanderIds`, errors);
      for (const personId of uniqueStrings(battle.commanderIds[side])) {
        if (!uniqueStrings(battle.personIds).includes(personId)) {
          addError(errors, `${pointer}.commanderIds.${side}: '${personId}' 必须同时列入 personIds`);
        }
      }
    }
  }

  if (isPlainObject(battle.sections)) {
    for (const key of SECTION_KEYS) {
      const section = battle.sections[key];
      if (!isPlainObject(section)) continue;
      const canonicalTitle = coverage.battleSectionKeys.find((item) => item.key === key)?.title;
      if (canonicalTitle && comparableText(section.title) !== canonicalTitle) {
        addError(errors, `${pointer}.sections.${key}.title: 必须是 '${canonicalTitle}'`);
      }
      const sectionHan = hanCount(section.body);
      const minimum = keyEntry ? coverage.battleSectionMinHanChars : 40;
      if (sectionHan < minimum) {
        addError(errors, `${pointer}.sections.${key}.body: 只有 ${sectionHan} 个汉字，至少需要 ${minimum} 个`);
      }
      checkEvidence(section, `${pointer}.sections.${key}`, maps, errors);
    }
  }

  if (!Array.isArray(battle.phases)) return;
  const sequences = new Set();
  const phaseTimes = [];
  const battleStartDateOk = validDateString(battle.startDate);
  const battleEndDateOk = validDateString(battle.endDate);
  battle.phases.forEach((phase, phaseIndex) => {
    const phasePointer = `${pointer}.phases[${phaseIndex}]`;
    if (!isPlainObject(phase)) return;
    if (Number.isInteger(phase.sequence)) {
      if (sequences.has(phase.sequence)) addError(errors, `${phasePointer}.sequence: 阶段序号重复 ${phase.sequence}`);
      sequences.add(phase.sequence);
    }
    if (isPlainObject(phase.time)) {
      const timePointer = `${phasePointer}.time`;
      let startMs = null;
      let endMs = null;

      // --- time.start ---
      if (!isNonEmptyString(phase.time.start)) {
        addError(errors, `${timePointer}.start: 必须有带时区的 ISO 8601 开始时间`);
      } else if (!validDateTimeString(phase.time.start)) {
        addError(errors, `${timePointer}.start: 不是带时区的有效 ISO 8601 时间`);
      } else {
        startMs = Date.parse(phase.time.start);
        const phaseDate = phase.time.start.slice(0, 10);
        if (battleStartDateOk && battleEndDateOk && (phaseDate < battle.startDate || phaseDate > battle.endDate)) {
          addError(errors, `${timePointer}.start: 阶段开始日期 ${phaseDate} 不在战役 ${battle.startDate}–${battle.endDate} 范围内`);
        }
      }

      // --- time.end（D1：此前完全没有校验）---
      // end 为可选字段；一旦提供就必须是合法带时区时间，且落在战役窗口内、不早于 start。
      if (hasOwn(phase.time, 'end') && phase.time.end !== undefined && phase.time.end !== null) {
        if (!isNonEmptyString(phase.time.end)) {
          addError(errors, `${timePointer}.end: 提供了 end 就必须是带时区的 ISO 8601 时间（空值请直接省略该字段）`);
        } else if (!validDateTimeString(phase.time.end)) {
          addError(errors, `${timePointer}.end: 不是带时区的有效 ISO 8601 时间`);
        } else {
          endMs = Date.parse(phase.time.end);
          const endDate = phase.time.end.slice(0, 10);
          if (battleStartDateOk && battleEndDateOk && (endDate < battle.startDate || endDate > battle.endDate)) {
            addError(
              errors,
              `${timePointer}.end: 阶段结束日期 ${endDate} 不在战役 ${battle.startDate}–${battle.endDate} 范围内`,
            );
          }
          if (startMs !== null && endMs < startMs) {
            addError(errors, `${timePointer}.end: 阶段结束时间 ${phase.time.end} 早于开始时间 ${phase.time.start}`);
          }
        }
      }

      // --- display / uncertainty ---
      if (!isNonEmptyString(phase.time.display) || hanCount(phase.time.display) < 4) {
        addError(errors, `${timePointer}.display: 必须给出面向读者的时间显示文本`);
      }
      if (!isNonEmptyString(phase.time.uncertainty) || hanCount(phase.time.uncertainty) < 6) {
        addError(errors, `${timePointer}.uncertainty: 必须说明时间本身的不确定性`);
      }

      if (startMs !== null) {
        phaseTimes.push({
          phaseIndex,
          pointer: timePointer,
          sequence: Number.isInteger(phase.sequence) ? phase.sequence : null,
          startMs,
          startRaw: phase.time.start,
          endMs,
        });
      }
    }

    validateSideTexts(phase.knownEnemy, `${phasePointer}.knownEnemy`, errors, 6);
    validateSideTexts(phase.unknownEnemy, `${phasePointer}.unknownEnemy`, errors, 6);
    validateSideTexts(phase.decision, `${phasePointer}.decision`, errors, 8);
    validateSideTexts(phase.consequence, `${phasePointer}.consequence`, errors, 8);
    if (isPlainObject(phase.viewpoints)) {
      for (const side of ['japan', 'allies']) {
        const viewpoint = phase.viewpoints[side];
        if (!isPlainObject(viewpoint)) continue;
        if (hanCount(viewpoint.perspective) < 30) {
          addError(errors, `${phasePointer}.viewpoints.${side}.perspective: 双方视角至少 30 个汉字`);
        }
        checkEvidence(viewpoint, `${phasePointer}.viewpoints.${side}`, maps, errors);
      }
    }
    if (isPlainObject(phase.positions)) {
      for (const side of ['japan', 'allies']) {
        const position = phase.positions[side];
        if (!isPlainObject(position)) continue;
        checkPlaceRefs(position, 'placeIds', maps, `${phasePointer}.positions.${side}`, errors);
        checkEvidence(position, `${phasePointer}.positions.${side}`, maps, errors);
        if (position.schematic !== true) {
          addError(errors, `${phasePointer}.positions.${side}.schematic: 舰队位置必须标记为示意（true）`);
        }
        if (!isPlainObject(position.coordinates)) {
          addError(errors, `${phasePointer}.positions.${side}.coordinates: 缺少示意图坐标`);
        }
        if (!isNonEmptyString(position.uncertaintyNote) || position.uncertaintyNote.trim().length < 6) {
          addError(errors, `${phasePointer}.positions.${side}.uncertaintyNote: 必须说明位置不确定性`);
        }
      }
    }
    if (Array.isArray(phase.routes)) {
      if (keyEntry && phase.routes.length === 0) {
        addError(errors, `${phasePointer}.routes: 重点战役每个阶段至少需要一条示意航线`);
      }
      phase.routes.forEach((route, routeIndex) => {
        const routePointer = `${phasePointer}.routes[${routeIndex}]`;
        if (!isPlainObject(route)) return;
        if (route.schematic !== true) {
          addError(errors, `${routePointer}.schematic: 舰队/飞机航线必须明确标记为示意（true）`);
        }
        if (typeof route.fromPlaceId === 'string' && !maps.places.has(route.fromPlaceId)) {
          addError(errors, `${routePointer}.fromPlaceId: 航線起点地点 '${route.fromPlaceId}' 不存在`);
        }
        if (typeof route.toPlaceId === 'string' && !maps.places.has(route.toPlaceId)) {
          addError(errors, `${routePointer}.toPlaceId: 航线终点地点 '${route.toPlaceId}' 不存在`);
        }
        if (route.fromPlaceId === route.toPlaceId) {
          addError(errors, `${routePointer}: 航线起点与终点不能相同`);
        }
        if (Array.isArray(route.path)) {
          route.path.forEach((coordinate, coordinateIndex) => {
            if (
              !isPlainObject(coordinate) ||
              typeof coordinate.lat !== 'number' ||
              typeof coordinate.lng !== 'number' ||
              coordinate.lat < -90 ||
              coordinate.lat > 90 ||
              coordinate.lng < -180 ||
              coordinate.lng > 180
            ) {
              addError(errors, `${routePointer}.path[${coordinateIndex}]: 坐标必须是合法 lat/lng`);
            }
          });
        }
        checkEvidence(route, routePointer, maps, errors);
      });
    } else if (keyEntry) {
      addError(errors, `${phasePointer}.routes: 重点战役阶段必须提供 routes 数组（可为空仅限非移动阶段，但本项目要求至少一条）`);
    }
    checkEventRefs(phase, 'eventIds', maps, phasePointer, errors);
    checkEvidence(phase, phasePointer, maps, errors);
    if (keyEntry && phase.schematic !== true) {
      addError(errors, `${phasePointer}.schematic: 重点战役阶段必须明确标记示意（true）`);
    }
  });

  // --- 阶段时间轴单调性（D1 追加）---
  // 播放/暂停与前后切换依赖 sequence 顺序即时间顺序；两者矛盾会让地图回放出错。
  const ordered = phaseTimes
    .filter((entry) => entry.sequence !== null)
    .sort((a, b) => a.sequence - b.sequence);
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (current.startMs < previous.startMs) {
      addError(
        errors,
        `${current.pointer}.start: 阶段序号 ${current.sequence} 的开始时间 ${current.startRaw} 早于序号 ${previous.sequence} 的开始时间 ${previous.startRaw}；阶段应按 sequence 时间递增`,
      );
    }
    // 未声明 end 的阶段视为持续到下一个阶段开始；若显式 end 已越过下一阶段开始，说明数据自相矛盾。
    if (previous.endMs !== null && previous.endMs > current.startMs) {
      addError(
        errors,
        `${previous.pointer}.end: 阶段序号 ${previous.sequence} 的结束时间晚于下一阶段（序号 ${current.sequence}）的开始时间，时间区间不能重叠且逆序`,
      );
    }
  }

  // --- 战役窗口必须包含全部阶段 ---
  // 注意：阶段时间带各自时区偏移，“窗口”应以**日期字符串**比较（上面已逐项检查），
  // 不能把本地时间换算成 UTC 再与 T23:59:59Z 比较——否则 -11:00 时区的 06-05T20:00
  // 会越过 UTC 午夜，被误判为越界。
  if (battleStartDateOk && battleEndDateOk) {
    for (const entry of phaseTimes) {
      const startDate = entry.startRaw.slice(0, 10);
      if (startDate < battle.startDate) {
        addError(
          errors,
          `${entry.pointer}.start: 阶段开始日期 ${startDate} 早于战役开始 ${battle.startDate}（战役窗口必须完整包含全部阶段）`,
        );
      }
    }
  }
}

function validatePerson(person, index, errors, maps, coverage, keyEntry) {
  const pointer = `$.people[${index}]`;
  checkDateValue(person.birthDate, `${pointer}.birthDate`, errors, { optional: true });
  checkDateValue(person.deathDate, `${pointer}.deathDate`, errors, { optional: true });
  if (validDateString(person.birthDate) && validDateString(person.deathDate) && person.deathDate < person.birthDate) {
    addError(errors, `${pointer}.deathDate: 死亡日期不能早于出生日期`);
  }
  checkPersonRefs(person, 'relatedPersonIds', maps, pointer, errors);
  checkPlaceRefs(person, 'placeIds', maps, pointer, errors);
  checkEventRefs(person, 'eventIds', maps, pointer, errors);
  checkBattleRefs(person, 'battleIds', maps, pointer, errors);
  checkConceptRefs(person, 'conceptIds', maps, pointer, errors);
  checkEvidence(person, pointer, maps, errors);
  if (hanCount(person.profile) < 80) {
    addError(errors, `${pointer}.profile: 人物叙述至少 80 个汉字`);
  }
  if (Array.isArray(person.decisions)) {
    if (person.decisions.length < 1) addError(errors, `${pointer}.decisions: 至少一个决策卡`);
    person.decisions.forEach((decision, decisionIndex) => {
      const decisionPointer = `${pointer}.decisions[${decisionIndex}]`;
      if (!isPlainObject(decision)) return;
      if (Array.isArray(decision.options) && decision.options.length < 2) {
        addError(errors, `${decisionPointer}.options: 至少两个备选方案`);
      }
      if (Array.isArray(decision.constraints) && decision.constraints.length < 2) {
        addError(errors, `${decisionPointer}.constraints: 至少两个约束`);
      }
      if (hanCount(decision.context) < 20) addError(errors, `${decisionPointer}.context: 背景至少 20 个汉字`);
      if (hanCount(decision.consequence) < 15) addError(errors, `${decisionPointer}.consequence: 后果至少 15 个汉字`);
      checkEvidence(decision, decisionPointer, maps, errors);
    });
  }
}

function validatePlace(place, index, errors, maps) {
  const pointer = `$.places[${index}]`;
  if (!isNonEmptyString(place.historicalName)) addError(errors, `${pointer}.historicalName: 不能为空`);
  if (!isNonEmptyString(place.modernName)) addError(errors, `${pointer}.modernName: 不能为空`);
  if (!isPlainObject(place.coordinates)) {
    addError(errors, `${pointer}.coordinates: 必须是真实经纬度对象`);
  } else {
    if (typeof place.coordinates.lat !== 'number' || place.coordinates.lat < -90 || place.coordinates.lat > 90) {
      addError(errors, `${pointer}.coordinates.lat: 超出 -90..90`);
    }
    if (typeof place.coordinates.lng !== 'number' || place.coordinates.lng < -180 || place.coordinates.lng > 180) {
      addError(errors, `${pointer}.coordinates.lng: 超出 -180..180`);
    }
  }
  if (place.schematic !== false) addError(errors, `${pointer}.schematic: 地理节点必须是真实位置（false）`);
  if (hanCount(place.summary) < 10) addError(errors, `${pointer}.summary: 至少 10 个汉字`);
  checkPlaceRefs(place, 'relatedPlaceIds', maps, pointer, errors);
  checkEvidence(place, pointer, maps, errors);
}

function validateUnit(unit, index, errors, maps) {
  const pointer = `$.units[${index}]`;
  if (typeof unit.parentUnitId === 'string') {
    if (unit.parentUnitId === unit.id) {
      addError(errors, `${pointer}.parentUnitId: 不能指向自身`);
    } else {
      const parent = maps.units.get(unit.parentUnitId);
      if (!parent) addError(errors, `${pointer}.parentUnitId: 上级单位 '${unit.parentUnitId}' 不存在`);
      else if (parent.side !== unit.side) addError(errors, `${pointer}.parentUnitId: 上级单位阵营不同`);
    }
    const seen = new Set([unit.id]);
    let cursor = maps.units.get(unit.parentUnitId);
    while (cursor) {
      if (seen.has(cursor.id)) {
        addError(errors, `${pointer}.parentUnitId: 上级单位链存在循环`);
        break;
      }
      seen.add(cursor.id);
      cursor = typeof cursor.parentUnitId === 'string' ? maps.units.get(cursor.parentUnitId) : null;
    }
  }
  checkEventRefs(unit, 'eventIds', maps, pointer, errors);
  checkPersonRefs(unit, 'personIds', maps, pointer, errors);
  checkEquipmentRefs(unit, 'equipmentIds', maps, pointer, errors);
  checkEvidence(unit, pointer, maps, errors);
  if (hanCount(unit.description) < 20) addError(errors, `${pointer}.description: 至少 20 个汉字`);
}

function validateEquipment(equipment, index, errors, maps) {
  const pointer = `$.equipment[${index}]`;
  checkConceptRefs(equipment, 'conceptIds', maps, pointer, errors);
  checkEvidence(equipment, pointer, maps, errors);
  if (hanCount(equipment.summary) < 20) addError(errors, `${pointer}.summary: 至少 20 个汉字`);
  if (hanCount(equipment.limitations) < 20) addError(errors, `${pointer}.limitations: 至少 20 个汉字`);
}

function conceptStats(concept) {
  const layerHan = Array.isArray(concept.layers)
    ? concept.layers.reduce((total, layer) => total + (isPlainObject(layer) ? hanCount(layer.body) : 0), 0)
    : 0;
  return {
    totalHan: hanCount(concept.summary) + hanCount(concept.whyItMatters) + layerHan,
    layerHan,
  };
}

function validateConcept(concept, index, errors, maps) {
  const pointer = `$.concepts[${index}]`;
  checkRefs(concept, 'relatedEntityIds', maps.allEntities, '内容实体', pointer, errors);
  checkEvidence(concept, pointer, maps, errors);
  if (Array.isArray(concept.layers)) {
    const levels = [];
    concept.layers.forEach((layer, layerIndex) => {
      const layerPointer = `${pointer}.layers[${layerIndex}]`;
      if (!isPlainObject(layer)) return;
      levels.push(layer.level);
      if (hanCount(layer.body) < 30) addError(errors, `${layerPointer}.body: 每层至少 30 个汉字`);
      checkEvidence(layer, layerPointer, maps, errors);
    });
    if (canonicalJson([...levels].sort()) !== canonicalJson([1, 2, 3])) {
      addError(errors, `${pointer}.layers: 必须恰好包含 1、2、3 三层`);
    }
  }
  if (hanCount(concept.whyItMatters) < 40) addError(errors, `${pointer}.whyItMatters: 至少 40 个汉字`);
  conceptStats(concept);
}

function validateMedia(media, index, errors, maps, coverage, options) {
  const base = (options && options.mediaPointer) || '$.media';
  const pointer = `${base}[${index}]`;
  if (!ALLOWED_LICENSES.includes(media.license)) {
    addError(errors, `${pointer}.license: 无效或不可复用的许可 '${media.license}'；允许 ${ALLOWED_LICENSES.join(', ')}`);
  }
  if (media.license === 'permission-granted' && !isNonEmptyString(media.licenseUrl)) {
    addError(errors, `${pointer}.licenseUrl: permission-granted 必须提供授权文件 URL`);
  }
  if (Array.isArray(media.articleIds)) {
    for (const articleId of media.articleIds) {
      if (!coverage.keyArticleIds.includes(articleId)) {
        addError(errors, `${pointer}.articleIds: '${articleId}' 不在 coverage.keyArticleIds 中；媒体关联必须使用重点文章 ID`);
      }
    }
  }
  if (!maps.sources.has(media.sourceId)) {
    addError(errors, `${pointer}.sourceId: 来源缺失 '${media.sourceId}'`);
  }
  if (typeof media.path === 'string') {
    if (media.path.includes('\\')) addError(errors, `${pointer}.path: 必须使用正斜杠`);
    if (media.path.split('/').some((segment) => segment === '..' || segment === '.')) {
      addError(errors, `${pointer}.path: 不允许 . 或 .. 路径段`);
    }
    if (!media.path.startsWith('public/media/')) {
      addError(errors, `${pointer}.path: 必须位于 public/media/ 下`);
    }
  }
  if (options.media) {
    const fileSystem = options.fileSystem || REAL_FILE_SYSTEM;
    const resolved = resolveMediaPath(options.rootDir, media.path);
    if (resolved.error) {
      addError(errors, `${pointer}.path: ${resolved.error}`);
    } else if (!fileSystem.exists(resolved.portableKey)) {
      addError(errors, `${pointer}.path: 素材文件不存在 ${media.path}`);
    } else {
      try {
        const stat = fileSystem.stat(resolved.portableKey);
        // stat.isFile / stat.size 是属性（真实层与内存层返回同一形状）。
        if (stat.isFile !== true) addError(errors, `${pointer}.path: 路径不是文件 ${media.path}`);
        else if (stat.size === 0) addError(errors, `${pointer}.path: 素材文件为空 ${media.path}`);
      } catch (error) {
        addError(errors, `${pointer}.path: 无法读取素材文件 (${error.message})`);
      }
    }
  }
}

function resolveMediaPath(rootDir, relativePath) {
  if (!isNonEmptyString(relativePath)) return { error: '素材路径为空' };
  if (relativePath.includes('\\') || relativePath.startsWith('/') || /^[A-Za-z]:/.test(relativePath)) {
    return { error: '必须是 public/media 下的相对 POSIX 路径' };
  }
  const parts = relativePath.split('/');
  if (parts.some((part) => part === '..' || part === '')) return { error: '路径包含非法段' };
  if (!relativePath.startsWith('public/media/')) return { error: '必须位于 public/media/ 下' };
  const mediaRoot = path.resolve(rootDir, 'public', 'media');
  const filePath = path.resolve(rootDir, relativePath);
  const relativeToMedia = path.relative(mediaRoot, filePath);
  if (relativeToMedia.startsWith('..') || path.isAbsolute(relativeToMedia)) {
    return { error: '路径越出 public/media 根目录' };
  }
  // 便携键：真实文件系统与内存文件系统都按 POSIX 风格全路径定位，
  // 因此在任何平台上自测注入的文件系统都能命中同一键。
  const portableKey = `${rootDir.replace(/[\\/]+$/, '').replace(/\\/g, '/')}/${relativePath}`;
  return { filePath, mediaRoot, portableKey };
}

// ---------------------------------------------------------------------------
// 覆盖与深度门禁
// ---------------------------------------------------------------------------

function stageReached(currentStage, requiredStage) {
  return STAGE_IDS.indexOf(requiredStage) <= STAGE_IDS.indexOf(currentStage);
}

function unionCount(...arrays) {
  const set = new Set();
  for (const array of arrays) {
    for (const value of uniqueStrings(array)) set.add(value);
  }
  return set.size;
}

function unionSets(...arrays) {
  const set = new Set();
  for (const array of arrays) {
    for (const value of uniqueStrings(array)) set.add(value);
  }
  return set;
}

function keyDepthErrors(entry, entity, coverage, maps, errors) {
  if (!isPlainObject(entity)) return;
  const pointer = `coverage:${entry.id}`;
  const sourceSet = unionSets(entity.sourceIds);
  const claimSet = unionSets(entity.claimIds);

  if (entry.kind === 'battle') {
    const min = entry.minimumDepth || {};
    const sections = isPlainObject(entity.sections) ? Object.values(entity.sections) : [];
    for (const section of sections) {
      if (isPlainObject(section)) {
        for (const id of uniqueStrings(section.sourceIds)) sourceSet.add(id);
        for (const id of uniqueStrings(section.claimIds)) claimSet.add(id);
      }
    }
    const phaseSource = [];
    const phaseClaims = [];
    for (const phase of Array.isArray(entity.phases) ? entity.phases : []) {
      if (!isPlainObject(phase)) continue;
      phaseSource.push(...uniqueStrings(phase.sourceIds));
      phaseClaims.push(...uniqueStrings(phase.claimIds));
    }
    for (const id of phaseSource) sourceSet.add(id);
    for (const id of phaseClaims) claimSet.add(id);
    if (sections.length !== min.sectionCount) addError(errors, `${pointer}: 必须包含 ${min.sectionCount} 个十四类字段，实际 ${sections.length}`);
    if (!Array.isArray(entity.phases) || entity.phases.length < min.phases) {
      addError(errors, `${pointer}: 至少需要 ${min.phases} 个地图阶段，实际 ${Array.isArray(entity.phases) ? entity.phases.length : 0}`);
    }
    if (uniqueStrings(entity.personIds).length < min.personIds) {
      addError(errors, `${pointer}: 至少关联 ${min.personIds} 位人物`);
    }
    if (uniqueStrings(entity.placeIds).length < min.placeIds) {
      addError(errors, `${pointer}: 至少关联 ${min.placeIds} 个地点`);
    }
    if (sourceSet.size < min.sourceIds) addError(errors, `${pointer}: 至少需要 ${min.sourceIds} 个不同来源，实际 ${sourceSet.size}`);
    if (claimSet.size < min.claimIds) addError(errors, `${pointer}: 至少需要 ${min.claimIds} 个不同 claim，实际 ${claimSet.size}`);
    const disputed = [...claimSet].filter((claimId) => maps.claims.get(claimId)?.claimType === 'disputed');
    if (disputed.length < (min.disputedClaims || 0)) {
      addError(errors, `${pointer}: 至少需要 ${min.disputedClaims} 个有来源的争议 claim，实际 ${disputed.length}`);
    }
  } else if (entry.kind === 'commander-profile') {
    const min = entry.minimumDepth || {};
    if (hanCount(entity.profile) < min.profileHanChars) {
      addError(errors, `${pointer}: 人物叙述 ${hanCount(entity.profile)} 汉字，至少 ${min.profileHanChars}`);
    }
    const decisions = Array.isArray(entity.decisions) ? entity.decisions : [];
    if (decisions.length < min.decisions) addError(errors, `${pointer}: 至少 ${min.decisions} 个决策卡，实际 ${decisions.length}`);
    for (const decision of decisions) {
      if (isPlainObject(decision)) {
        for (const id of uniqueStrings(decision.sourceIds)) sourceSet.add(id);
        for (const id of uniqueStrings(decision.claimIds)) claimSet.add(id);
      }
    }
    if (sourceSet.size < min.sourceIds) addError(errors, `${pointer}: 至少需要 ${min.sourceIds} 个不同来源，实际 ${sourceSet.size}`);
    if (claimSet.size < min.claimIds) addError(errors, `${pointer}: 至少需要 ${min.claimIds} 个不同 claim，实际 ${claimSet.size}`);
  } else if (entry.kind === 'concept-article') {
    const min = entry.minimumDepth || {};
    const stats = conceptStats(entity);
    if (stats.totalHan < min.hanChars) addError(errors, `${pointer}: 专题总汉字数 ${stats.totalHan}，至少 ${min.hanChars}`);
    if (!Array.isArray(entity.layers) || entity.layers.length < min.layers) addError(errors, `${pointer}: 至少 ${min.layers} 层解释`);
    if (uniqueStrings(entity.relatedEntityIds).length < (min.relatedEntityIds || 0)) {
      addError(errors, `${pointer}: 至少关联 ${min.relatedEntityIds} 个内容实体`);
    }
    for (const layer of Array.isArray(entity.layers) ? entity.layers : []) {
      if (isPlainObject(layer)) {
        for (const id of uniqueStrings(layer.sourceIds)) sourceSet.add(id);
        for (const id of uniqueStrings(layer.claimIds)) claimSet.add(id);
      }
    }
    if (sourceSet.size < min.sourceIds) addError(errors, `${pointer}: 至少需要 ${min.sourceIds} 个不同来源，实际 ${sourceSet.size}`);
    if (claimSet.size < min.claimIds) addError(errors, `${pointer}: 至少需要 ${min.claimIds} 个不同 claim，实际 ${claimSet.size}`);
  } else if (entry.kind === 'part-overview') {
    const min = entry.minimumDepth || {};
    const article = Array.isArray(entity.article) ? entity.article : [];
    const stats = validateArticleSections(entity.article || [], `coverage:${entry.id}.article`, errors, maps, 40);
    if (stats.sections < min.articleSections) addError(errors, `${pointer}: 导读至少 ${min.articleSections} 节，实际 ${stats.sections}`);
    if (stats.han < min.hanChars) addError(errors, `${pointer}: 导读 ${stats.han} 汉字，至少 ${min.hanChars}`);

    // D5：必需标题不仅要在场，其**正文本身**还要达到最低汉字深度。
    // 否则一个 51 汉字的“盟军为何连续失败”可以靠其它小节的字数把总量撑过 1200 而蒙混过关。
    //
    // 深度标准分两档（见 docs/research/coverage.md §2.2）：
    //   1) overviewTopics.requiredHeadings —— 由 earlyCampaign 专项锁定的分析主题，
    //      使用 overviewTopics.minHanCharsPerHeading（当前 120）；
    //   2) 其余 requiredArticleHeadings —— 使用 min.requiredHeadingHanChars（当前 100），
    //      保证每个强制小节都不是标题+一句话。
    const overviewBlock = coverage.earlyCampaign && coverage.earlyCampaign.overviewTopics;
    const isOverviewArticle = Boolean(overviewBlock && overviewBlock.overviewArticleId === entry.id);
    const overviewHeadings = new Set(isOverviewArticle ? overviewBlock.requiredHeadings || [] : []);
    const overviewMin = isOverviewArticle ? overviewBlock.minHanCharsPerHeading : 0;
    const genericMin = typeof min.requiredHeadingHanChars === 'number' ? min.requiredHeadingHanChars : 0;

    for (const requiredHeading of entry.requiredArticleHeadings || []) {
      if (!stats.headings.includes(requiredHeading)) {
        addError(errors, `${pointer}: 缺少必需小节标题 '${requiredHeading}'`);
        continue;
      }
      const headingHan = stats.hanByHeading.get(requiredHeading) || 0;
      if (overviewHeadings.has(requiredHeading)) {
        if (typeof overviewMin === 'number' && headingHan < overviewMin) {
          addError(
            errors,
            `${pointer}.article['${requiredHeading}']: 该强制分析小节只有 ${headingHan} 个汉字，至少需要 ${overviewMin} 个（不能靠其它小节凑总字数）`,
          );
        }
      } else if (genericMin > 0 && headingHan < genericMin) {
        addError(
          errors,
          `${pointer}.article['${requiredHeading}']: 该强制小节只有 ${headingHan} 个汉字，至少需要 ${genericMin} 个`,
        );
      }
    }
    if (uniqueStrings(entity.placeIds).length < (min.placeIds || 0)) {
      addError(errors, `${pointer}: 至少关联 ${min.placeIds} 个地点`);
    }
    for (const section of article) {
      if (isPlainObject(section)) {
        for (const id of uniqueStrings(section.sourceIds)) sourceSet.add(id);
        for (const id of uniqueStrings(section.claimIds)) claimSet.add(id);
      }
    }
    if (sourceSet.size < min.sourceIds) addError(errors, `${pointer}: 至少需要 ${min.sourceIds} 个不同来源，实际 ${sourceSet.size}`);
    if (claimSet.size < min.claimIds) addError(errors, `${pointer}: 至少需要 ${min.claimIds} 个不同 claim，实际 ${claimSet.size}`);
  }
}

function requiredEventDepthErrors(entry, event, errors, maps) {
  const min = entry.minimumDepth || {};
  const stats = validateArticleSections(event.article || [], `coverage:${entry.id}.article`, errors, maps, 40);
  if (stats.sections < min.articleSections) addError(errors, `coverage:${entry.id}: 至少 ${min.articleSections} 节，实际 ${stats.sections}`);
  if (stats.han < min.hanChars) addError(errors, `coverage:${entry.id}: ${stats.han} 汉字，至少 ${min.hanChars}`);
  const sourceSet = unionSets(event.sourceIds);
  const claimSet = unionSets(event.claimIds);
  for (const section of Array.isArray(event.article) ? event.article : []) {
    if (isPlainObject(section)) {
      for (const id of uniqueStrings(section.sourceIds)) sourceSet.add(id);
      for (const id of uniqueStrings(section.claimIds)) claimSet.add(id);
    }
  }
  if (sourceSet.size < min.sourceIds) addError(errors, `coverage:${entry.id}: 至少 ${min.sourceIds} 个不同来源`);
  if (claimSet.size < min.claimIds) addError(errors, `coverage:${entry.id}: 至少 ${min.claimIds} 个不同 claim`);
}

function questionMeetsCoverage(question, maps, coverage) {
  if (!isPlainObject(question)) return false;
  if (hanCount(question.answer) < coverage.questionMinimumAnswerHanChars) return false;
  if (uniqueStrings(question.entityIds).length < coverage.questionMinimumEntityRefs) return false;
  if (uniqueStrings(question.sourceIds).length < 1) return false;
  if (uniqueStrings(question.claimIds).length < 1) return false;
  return (
    uniqueStrings(question.sourceIds).every((id) => maps.sources.has(id)) &&
    uniqueStrings(question.claimIds).every((id) => maps.claims.has(id)) &&
    uniqueStrings(question.entityIds).every((id) => maps.allEntities.has(id))
  );
}

function validateCoverageGate(doc, maps, coverage, stage, errors) {
  const currentIndex = STAGE_IDS.indexOf(stage);
  if (currentIndex < 0) {
    addError(errors, `未知阶段 '${stage}'`);
    return;
  }
  if (stage === 'full' && doc.fixtureOnly === true) {
    addError(errors, '$.fixtureOnly: full 最终门禁拒绝 fixtureOnly=true；示例数据不能冒充已交付历史内容');
  }

  for (const entry of coverage.keyArticles) {
    const collection = KEY_ENTITY_COLLECTION[entry.entityType];
    const entity = collection ? maps[collection].get(entry.id) : null;
    const reached = stageReached(stage, entry.stage);
    if (!entity) {
      if (reached) addError(errors, `[coverage] 阶段 '${stage}' 缺少重点文章 ${entry.id}（应在 ${entry.stage} 交付）`);
      continue;
    }
    // D6：导读实体的 historicalPart 必须与 coverage 声明一致（不能把 part 3 内容挂到 part 1）。
    if (entry.kind === 'part-overview' && PART_IDS.includes(entry.historicalPart)) {
      if (entity.historicalPart !== entry.historicalPart) {
        addError(
          errors,
          `[coverage] ${entry.id}: 实体 historicalPart '${entity.historicalPart}' 与 coverage 声明的 '${entry.historicalPart}' 不一致`,
        );
      }
    }
    keyDepthErrors(entry, entity, coverage, maps, errors);
  }

  for (const entry of coverage.requiredEvents) {
    const event = maps.events.get(entry.id);
    // ARCH-02：交付阶段只从 stageOwnership 单一来源派生，requiredEvents[].stage 仅作为
    // 契约自身的一致性项（由 validateStageOwnershipContract 交叉校验），不再作为归属来源。
    const ownedStage = ownershipStageForEvent(coverage, entry.id);
    const deliveryStage = ownedStage || entry.stage;
    const reached = stageReached(stage, deliveryStage);
    if (!event) {
      if (reached) addError(errors, `[coverage] 阶段 '${stage}' 缺少必需事件 ${entry.id}（应在 ${deliveryStage} 交付）`);
      continue;
    }
    // ARCH-02：历史部分按 stageOwnership 派生出的允许集合判定。
    // 不再硬编码 background→part-3-expansion，因此 background 事件可合法落在 part-3 或 part-4。
    const allowedParts = allowedPartsForStage(coverage, deliveryStage);
    if (allowedParts.size > 0 && !allowedParts.has(event.historicalPart)) {
      addError(
        errors,
        `[coverage] ${entry.id}: 历史部分 '${event.historicalPart}' 不在阶段 '${deliveryStage}' 允许的集合 {${[...allowedParts].join(', ')}} 内（按 stageOwnership 派生）`,
      );
    }
    requiredEventDepthErrors(entry, event, errors, maps);
  }

  const stageConfig = coverage.stages.find((item) => item.id === stage);
  const requiredParts = stageConfig ? stageConfig.requiredQuestionParts : [];
  for (const part of requiredParts) {
    const matching = (Array.isArray(doc.questions) ? doc.questions : []).filter(
      (question) => question.historicalPart === part && questionMeetsCoverage(question, maps, coverage),
    );
    if (matching.length === 0) {
      addError(errors, `[coverage] 历史部分 '${part}' 缺少至少一个实质性、有实体关联和证据的探究问题`);
    }
  }

  if (stage === 'full') {
    // full 的具体覆盖由上面的 keyArticles / requiredEvents / requiredQuestionParts 逐项断言。
    // 这里不再重复汇总，避免同一缺失产生多条噪声错误。
  }
}

/**
 * ARCH-02 R4：content/media.json 注册表结构校验。
 * 结构：{ version: 1, media: [...] }；media 条目复用既有形状。
 */
function validateMediaRegistry(registry, coverage) {
  const errors = [];
  if (!isPlainObject(registry)) return ['content/media.json 根节点必须是对象 { version, media }'];
  if (registry.version !== 1) {
    errors.push(`content/media.json: version 必须是 1，实际 ${JSON.stringify(registry.version)}`);
  }
  const allowedKeys = new Set(['version', 'media']);
  for (const key of Object.keys(registry)) {
    if (!allowedKeys.has(key)) errors.push(`content/media.json: 不允许的顶层字段 '${key}'（只允许 version 与 media）`);
  }
  if (!Array.isArray(registry.media)) {
    errors.push('content/media.json: media 必须是数组');
    return errors;
  }
  const seen = new Set();
  const mediaSchema = CONTENT_SCHEMA.$defs && CONTENT_SCHEMA.$defs.media;
  registry.media.forEach((item, index) => {
    if (!isPlainObject(item)) {
      errors.push(`content/media.json: media[${index}] 必须是对象`);
      return;
    }
    if (typeof item.id === 'string') {
      if (seen.has(item.id)) errors.push(`content/media.json: media[${index}].id 重复 '${item.id}'`);
      seen.add(item.id);
    } else {
      errors.push(`content/media.json: media[${index}].id 必须是字符串（稳定 ID）`);
    }
    // ARCH-02 a2 非阻断项：注册表条目必须逐条通过 media schema，而不只是"像对象"
    if (mediaSchema) {
      const itemErrors = [];
      schemaValidate(item, mediaSchema, CONTENT_SCHEMA, `content/media.json.media[${index}]`, itemErrors);
      for (const message of itemErrors) errors.push(message);
    }
  });
  return errors;
}

/**
 * ARCH-02 R4：历史文件顶层 media 的迁移提示（供 --check-contracts 与自测复用）。
 */
function historyMediaMigrationHint() {
  return (
    '迁移映射：把 history.json 顶层 media[] 原样搬到 content/media.json 的 ' +
    '{ "version": 1, "media": [...] } 中（条目形状完全不变，articleIds 仍是文章关联），并删除 history.json 的 media 字段。' +
    ' 由 MEDIA-02 写入 content/media.json；HIST-04 不写；QA-01 运行 --media 校验；WEB-01/MAP-01 只读。'
  );
}

/**
 * ARCH-02 R4：--media 两份输入文件缺失时的精确错误文本（CLI 与自测共用，
 * 避免自测只比较硬编码常量或只 grep 源码）。
 * @param {'history'|'media'} kind 缺失的文件类型
 * @param {string} filePath 解析后的目标路径
 * @returns {string[]} 逐行错误文本
 */
function mediaInputMissingMessages(kind, filePath) {
  if (kind === 'history') {
    return [
      `[media] 内容文件不存在：content/history.json（${filePath}）`,
      '[media] --media 需要同时读取 content/history.json 与 content/media.json；当前 history.json 缺失。',
    ];
  }
  if (kind === 'media') {
    return [
      `[media] 素材注册表不存在：content/media.json（${filePath}）`,
      '[media] 期望结构：{ "version": 1, "media": [ ... ] }，条目形状与 history.json 旧 media 条目完全一致。',
      '[media] 迁移映射：把 history.json 顶层 media[] 原样搬到 content/media.json 的 media[] 中，然后删除 history 的 media 字段。',
      '[media] 由 MEDIA-02 负责写入 content/media.json；--stage 门禁不受本文件缺失影响。',
    ];
  }
  throw new Error(`未知的缺失输入文件类型：${kind}`);
}

/**
 * ARCH-02 a2 修复 D3：**地图阶段专用校验**。
 *
 * 上一版的阶段负例只删 knownEnemy / consequence，靠 schema 层「缺少必填字段」失败，
 * 而从没有一条检查真正断言「双方位置」都在场。schema 允许 positions 只写一侧吗？
 * 不允许——但它只在 **validateBattle** 里被检查，而 validateBattle 只作用于
 * battles 数组中的战役。map-phases.json 是阶段引擎夹具，必须有一条独立、可定位的
 * 阶段校验，逐个阶段断言 positions.japan 与 positions.allies 同时存在且有内容。
 *
 * 该函数对任何「战役 → 阶段」结构生效，被 validateBattle 与地图夹具检查共同调用。
 *
 * @returns {string[]} 错误信息
 */
function validateMapPhasesForBattle(battle, battlePointer) {
  const errors = [];
  if (!isPlainObject(battle)) return errors;
  const phases = Array.isArray(battle.phases) ? battle.phases : [];
  if (phases.length === 0) {
    errors.push(`${battlePointer}.phases: 地图阶段引擎要求至少一个阶段（当前 0 个）`);
    return errors;
  }
  phases.forEach((phase, index) => {
    const p = `${battlePointer}.phases[${index}]`;
    if (!isPlainObject(phase)) {
      errors.push(`${p}: 阶段必须是对象`);
      return;
    }
    // 双方位置必须同时存在——这是 D3 的核心断言
    const positions = phase.positions;
    if (!isPlainObject(positions)) {
      errors.push(`${p}.positions: 阶段缺少双方位置对象（必须同时包含 japan 与 allies）`);
    } else {
      for (const side of ['japan', 'allies']) {
        const position = positions[side];
        if (!isPlainObject(position)) {
          errors.push(`${p}.positions.${side}: 缺少 ${side === 'japan' ? '日方' : '盟方'}位置`);
          continue;
        }
        if (!isPlainObject(position.coordinates)) {
          errors.push(`${p}.positions.${side}.coordinates: 缺少示意坐标`);
        }
        if (position.schematic !== true) {
          errors.push(`${p}.positions.${side}.schematic: 阶段位置必须标记为示意（true）`);
        }
        if (!isNonEmptyString(position.label)) {
          errors.push(`${p}.positions.${side}.label: 缺少位置标签`);
        }
      }
    }
    // 情报与决策：缺一即错（既有要求，这里作为阶段引擎契约的一部分显式复述）
    for (const field of ['knownEnemy', 'unknownEnemy', 'decision', 'consequence']) {
      const value = phase[field];
      if (!isPlainObject(value)) {
        errors.push(`${p}.${field}: 阶段缺少 ${field}（必须同时给出 japan 与 allies）`);
        continue;
      }
      for (const side of ['japan', 'allies']) {
        if (!isNonEmptyString(value[side])) {
          errors.push(`${p}.${field}.${side}: 缺少 ${field} 的 ${side} 文本`);
        }
      }
    }
    if (!hasOwn(phase, 'time') || !isPlainObject(phase.time)) {
      errors.push(`${p}.time: 阶段缺少时间`);
    }
    if (!hasOwn(phase, 'certainty')) errors.push(`${p}.certainty: 阶段缺少 certainty`);
    if (!hasOwn(phase, 'schematic')) errors.push(`${p}.schematic: 阶段缺少 schematic 标记`);
  });
  return errors;
}

function validateMediaGate(doc, maps, coverage, stage, options, errors) {
  if (stage !== 'full') addError(errors, '--media 必须隐含并执行 --stage full，不能以部分阶段验证素材门禁');
  // ARCH-02 R4：素材条目来自 content/media.json 注册表（options.mediaRows），
  // 过渡期内也兼容 history.json 内嵌的旧式 media。
  const media = Array.isArray(options.mediaRows)
    ? options.mediaRows
    : Array.isArray(doc.media)
      ? doc.media
      : [];
  const keys = coverage.keyArticleIds;
  for (const key of keys) {
    const requiredTypes = coverage.requiredMediaTypes[key] || [];
    for (const mediaType of requiredTypes) {
      const matches = media.filter(
        (item) =>
          isPlainObject(item) &&
          Array.isArray(item.articleIds) &&
          item.articleIds.includes(key) &&
          item.mediaType === mediaType,
      );
      if (matches.length === 0) {
        addError(errors, `[media] 重点文章 '${key}' 缺少类型为 '${mediaType}' 的已登记素材`);
      }
    }
  }
  for (const [mediaIndex, item] of media.entries()) {
    if (!isPlainObject(item)) continue;
    if (!Array.isArray(item.articleIds) || item.articleIds.length === 0) {
      addError(errors, `[media] $.media[${mediaIndex}]: 没有关联任何重点文章`);
      continue;
    }
    for (const articleId of item.articleIds) {
      if (!keys.includes(articleId)) addError(errors, `[media] $.media[${mediaIndex}]: articleId '${articleId}' 不是 coverage 重点文章`);
    }
    if (!ALLOWED_LICENSES.includes(item.license)) {
      addError(errors, `[media] $.media[${mediaIndex}]: 许可 '${item.license}' 不可用于发布`);
    }
    if (!maps.sources.has(item.sourceId)) addError(errors, `[media] $.media[${mediaIndex}]: sourceId '${item.sourceId}' 不存在`);
  }
  if (media.length === 0) addError(errors, '[media] 媒体登记为空；--media 要求每个重点文章至少有所需类型素材');
}

// ---------------------------------------------------------------------------
// 主验证
// ---------------------------------------------------------------------------

export function validateDocument(doc, options = {}) {
  const coverage = options.coverage || readJson(COVERAGE_PATH, 'coverage.json');
  const stage = options.media ? 'full' : options.stage || 'full';
  const rootDir = options.rootDir || REPO_ROOT;
  const errors = [];
  const warnings = [];
  const stats = { entities: 0, sources: 0, claims: 0, questions: 0, media: 0, keyArticles: 0, requiredEvents: 0 };

  if (!isPlainObject(doc)) return { errors: ['内容根节点必须是 JSON 对象'], warnings, stats };
  const schemaErrors = schemaValidate(doc, CONTENT_SCHEMA, CONTENT_SCHEMA, '$');
  for (const message of schemaErrors) addError(errors, message);

  const maps = buildIndexes(doc, errors);
  for (const collection of COLLECTIONS) stats[collection] = Array.isArray(doc[collection]) ? doc[collection].length : 0;
  stats.entities = ARTICLE_ENTITY_COLLECTIONS.reduce((total, collection) => total + (maps[collection]?.size || 0), 0);
  stats.keyArticles = coverage.keyArticleIds.filter((id) => {
    const entry = coverage.keyArticles.find((item) => item.id === id);
    return entry && maps[KEY_ENTITY_COLLECTION[entry.entityType]]?.has(id);
  }).length;

  for (const source of maps.sources.values()) {
    validateSource(source, [...maps.sources.values()].indexOf(source), errors, maps);
  }
  for (const [index, claim] of (Array.isArray(doc.claims) ? doc.claims : []).entries()) {
    if (isPlainObject(claim)) {
      validateClaim(claim, index, errors, maps);
      // ARCH-02 R3：claim 文本同样不得携带研究过程措辞（自 HIST-01 起生效）。
      if (typeof claim.text === 'string') {
        const matched = findResearchProcessWording(claim.text);
        if (matched) {
          addError(
            errors,
            `$.claims[${index}] (${claim.id}).text: 出现研究/检索过程措辞（/${matched.source}/）；过程状态只能写进 researchStatus 字段（自 HIST-01 起生效）`,
          );
        }
      }
    }
  }
  for (const [index, question] of (Array.isArray(doc.questions) ? doc.questions : []).entries()) {
    if (isPlainObject(question)) validateQuestion(question, index, errors, maps, coverage);
  }
  for (const [index, event] of (Array.isArray(doc.events) ? doc.events : []).entries()) {
    if (isPlainObject(event)) {
      validateEvent(event, index, errors, maps);
      // D2：早期扩张战役必须给出分析结构；只要事件存在，部分阶段也要满足。
      if (isEarlyCampaignEvent(event, coverage)) {
        earlyCampaignDepthErrors(event, coverage, maps, `$.events[${index}]`, errors);
      }
      // ARCH-02 R3：研究/检索过程状态只能写 researchStatus，正文/summary 不得出现研究过程措辞。
      // F2：早期战役事件必须声明 researchStatus（严格规则，不依赖 --stage）。
      researchStatusErrors(event, `$.events[${index}]`, errors, {
        required: isEarlyCampaignEvent(event, coverage),
      });
      // ARCH-02：跨章节数值/类别一致性（达尔文 18 架飞机参考案例）。
      // F4/验收 5：该规则是严格规则（coverage.crossChapterContradiction.enforcement =
      // 'strict'），在门禁中始终报错，不存在 warn/transition 豁免；参考案例只用于构造式负例。
      event.__relatedClaims = relatedClaimEntries(event, maps);
      for (const message of crossChapterContradictionErrors(event, `$.events[${index}] (${event.id})`)) {
        addError(errors, message);
      }
      delete event.__relatedClaims;
    }
  }
  for (const [index, battle] of (Array.isArray(doc.battles) ? doc.battles : []).entries()) {
    if (!isPlainObject(battle)) continue;
    const keyEntry = coverage.keyArticles.find((item) => item.id === battle.id) || null;
    validateBattle(battle, index, errors, maps, coverage, keyEntry);
    // ARCH-02 a2 修复 D3：阶段引擎专用校验（双方位置 + 情报 + 决策），
    // 独立于 schema 的「缺少必填字段」，对每个阶段的 japan/allies 逐项断言。
    for (const message of validateMapPhasesForBattle(battle, `$.battles[${index}] (${battle.id})`)) {
      addError(errors, message);
    }
  }
  for (const [index, person] of (Array.isArray(doc.people) ? doc.people : []).entries()) {
    if (!isPlainObject(person)) continue;
    const keyEntry = coverage.keyArticles.find((item) => item.id === person.id) || null;
    validatePerson(person, index, errors, maps, coverage, keyEntry);
  }
  for (const [index, place] of (Array.isArray(doc.places) ? doc.places : []).entries()) {
    if (isPlainObject(place)) validatePlace(place, index, errors, maps);
  }
  for (const [index, unit] of (Array.isArray(doc.units) ? doc.units : []).entries()) {
    if (isPlainObject(unit)) validateUnit(unit, index, errors, maps);
  }
  for (const [index, equipment] of (Array.isArray(doc.equipment) ? doc.equipment : []).entries()) {
    if (isPlainObject(equipment)) validateEquipment(equipment, index, errors, maps);
  }
  for (const [index, concept] of (Array.isArray(doc.concepts) ? doc.concepts : []).entries()) {
    if (isPlainObject(concept)) validateConcept(concept, index, errors, maps);
  }
  // --- ARCH-02 R4：媒体注册表迁移 ---
  // history.json 顶层不得再含 media；素材注册表在 content/media.json（{version:1, media:[...]}）。
  //
  // 过渡规则：HIST-01 已交付的 history.json 带有**空** media 数组。为了让已接受集成
  // 不被本任务追溯破坏（本任务不编辑 content/history.json），空的 legacy media 只产生
  // 警告；一旦它**含有条目**，就是真正的迁移违规，给出具名错误与迁移映射。
  // 由 MEDIA-02 完成迁移并从 history.json 删除该字段；ARCH-02-flip 之后空数组也报错。
  const historyMedia = doc.media;
  const legacyMediaEnforcement = coverage && coverage.mediaRegistry
    ? coverage.mediaRegistry.legacyHistoryMediaEnforcement
    : 'transition';
  if (historyMedia !== undefined) {
    const hasEntries = Array.isArray(historyMedia) && historyMedia.length > 0;
    const isIllegalShape = !Array.isArray(historyMedia);
    if (isIllegalShape || hasEntries || legacyMediaEnforcement === 'off') {
      addError(errors, `$.media: history.json 顶层 media 字段已废弃并被拒绝。${historyMediaMigrationHint()}`);
    } else {
      warnings.push(
        `$.media: history.json 仍含空的 legacy media 数组（过渡窗口内仅警告）。${historyMediaMigrationHint()}`,
      );
    }
  }
  // 素材条目来自注册表（content/media.json），或旧式文档内嵌（仅用于自测/过渡）。
  const mediaRows = Array.isArray(options.mediaRows)
    ? options.mediaRows
    : Array.isArray(historyMedia)
      ? historyMedia
      : [];
  for (const [index, media] of mediaRows.entries()) {
    if (isPlainObject(media)) {
      validateMedia(media, index, errors, maps, coverage, {
        media: options.media,
        rootDir,
        fileSystem: options.fileSystem,
        mediaPointer: options.mediaRows ? `$.media.media` : '$.media',
      });
    }
  }

  validateCoverageGate(doc, maps, coverage, stage, errors);
  if (options.media) {
    validateMediaGate(doc, maps, coverage, stage, { ...options, mediaRows }, errors);
  }

  if (stage !== 'full' && doc.fixtureOnly === true) {
    warnings.push(`当前使用 fixtureOnly=true 的测试样本，仅可在 ${stage} 阶段做结构检查；不得作为交付内容。`);
  }

  return { errors: dedupeMessages(errors), warnings, stats };
}

/**
 * D7：文档漂移防护。
 *
 * 两层断言：
 *   1) **canonical 声明**：`docs/research/coverage.md` 必须包含 `SELFTEST_COUNT=<N>`
 *      标记，且 N 必须等于运行时真实测试项数。缺失或不一致都报错。
 *   2) **附带提及**：文档里所有其它“N 项自测 / N/N”形式的声明也必须等于真实值，
 *      防止改了一处忘了另一处。
 *
 * 这样“文档写 71、实际 72”或任何后续漂移都会被 --self-test 与 --check-contracts 拦下。
 */
const SELF_TEST_COUNT_MARKER = 'SELFTEST_COUNT=';

function readDocTexts(fileSystem = REAL_FILE_SYSTEM) {
  const files = [COVERAGE_MD_PATH, CONTRACTS_README_PATH];
  const docs = [];
  for (const filePath of files) {
    if (!fileSystem.exists(filePath)) continue;
    try {
      docs.push({ filePath, text: fileSystem.readText(filePath) });
    } catch {
      /* 读不到就当缺失，由调用方报错 */
    }
  }
  return docs;
}

function documentedSelfTestCounts(fileSystem = REAL_FILE_SYSTEM) {
  const found = [];
  for (const { filePath, text } of readDocTexts(fileSystem)) {
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      const canonical = new RegExp(`${SELF_TEST_COUNT_MARKER}(\\d{1,4})`, 'g');
      let match;
      while ((match = canonical.exec(line)) !== null) {
        found.push({ file: filePath, count: Number(match[1]), line: index + 1, text: line.trim(), kind: 'canonical' });
      }
      // 附带的 “N 项自测 / N 项真实正例” 与 “N/N” 分数声明
      const incidental = [
        /\*\*(\d{1,4})\*\*\s*项(?:真实正例|自测)/g,
        /(\d{1,4})\s*项(?:自测|真实正例)/g,
        /(\d{1,4})\s*\/\s*(\d{1,4})/g,
      ];
      for (const pattern of incidental) {
        let m;
        while ((m = pattern.exec(line)) !== null) {
          const count = Number(m[1]);
          if (!Number.isFinite(count) || count < 10 || count > 1000) continue;
          // 历史的失败记录（如 “EPERM，35/38”）不是当前自测项数，不应算作漂移。
          if (/EPERM|曾经|此前|历史|上一轮|失败记录/.test(line)) continue;
          found.push({ file: filePath, count, line: index + 1, text: line.trim(), kind: 'incidental' });
        }
      }
    });
  }
  const seen = new Set();
  return found.filter((item) => {
    const key = `${item.file}:${item.line}:${item.count}:${item.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 把真实自测项数与文档声明比对。返回错误信息数组（空数组 = 一致）。
 */
function selfTestCountDriftErrors(actualCount, fileSystem = REAL_FILE_SYSTEM) {
  const errors = [];
  const docs = readDocTexts(fileSystem);
  if (docs.length === 0) {
    errors.push('无法读取契约文档，不能校验自测项数是否同步');
    return errors;
  }
  const coverageDoc = docs.find((doc) => doc.filePath === COVERAGE_MD_PATH);
  if (!coverageDoc) {
    errors.push(`缺少 ${path.basename(COVERAGE_MD_PATH)}，无法校验自测项数声明`);
  } else if (!new RegExp(`${SELF_TEST_COUNT_MARKER}\\d{1,4}`).test(coverageDoc.text)) {
    errors.push(
      `${path.basename(COVERAGE_MD_PATH)} 缺少 canonical 自测项数声明 '${SELF_TEST_COUNT_MARKER}<N>'；必须写明真实项数`,
    );
  }

  const declarations = documentedSelfTestCounts(fileSystem);
  for (const item of declarations) {
    if (item.count !== actualCount) {
      errors.push(
        `${path.basename(item.file)}:${item.line}（${item.kind}）写的是 ${item.count}，实际自测为 ${actualCount} 项 —— 文档已漂移，请同步（原文：${item.text.slice(0, 90)}）`,
      );
    }
  }
  return errors;
}

function loadCoverageOrThrow() {
  const coverage = readJson(COVERAGE_PATH, 'coverage.json');
  const coverageErrors = validateCoverageContract(coverage);
  if (coverageErrors.length > 0) {
    throw new Error(`coverage.json 契约错误：\n- ${coverageErrors.join('\n- ')}`);
  }
  return coverage;
}

/**
 * 校验 contracts/requirements.json 与工单 canonical 清单完全一致。
 * 顺序也要一致：工单要求“ids and scope verbatim, no additions/removals”。
 *
 * D4：既接受文件路径（默认契约路径），也接受内存中的数组，
 * 因此自测完全不需要创建临时文件。
 *
 * @param {string|Array|{path?:string, document?:Array, fileSystem?:object}} [source]
 *   - 省略：读取默认契约路径
 *   - 字符串：读取该路径
 *   - 数组：直接校验内存文档（自测用，绝不落盘）
 *   - 对象：{ path } 读文件，或 { document } 校验内存文档
 */
function requirementsFileErrors(source) {
  const errors = [];
  let actual;
  if (Array.isArray(source)) {
    actual = source; // 直接传入内存文档
  } else {
    let filePath = REQUIREMENTS_PATH;
    let fileSystem = REAL_FILE_SYSTEM;
    let document;
    if (typeof source === 'string') {
      filePath = source;
    } else if (isPlainObject(source)) {
      if (hasOwn(source, 'document')) document = source.document;
      if (typeof source.path === 'string') filePath = source.path;
      if (source.fileSystem) fileSystem = source.fileSystem;
    }
    if (document !== undefined) {
      actual = document;
    } else {
      try {
        actual = readJson(filePath, 'requirements.json', fileSystem);
      } catch (error) {
        return [String(error.message)];
      }
    }
  }
  if (!Array.isArray(actual)) return ['requirements.json 根节点必须是数组'];
  if (actual.length !== CANONICAL_REQUIREMENTS.length) {
    errors.push(`requirements.json 条数 ${actual.length}，工单要求 ${CANONICAL_REQUIREMENTS.length}`);
  }
  const max = Math.max(actual.length, CANONICAL_REQUIREMENTS.length);
  for (let index = 0; index < max; index += 1) {
    const got = actual[index];
    const want = CANONICAL_REQUIREMENTS[index];
    if (!want) {
      errors.push(`requirements.json[${index}]: 多出条目 ${JSON.stringify(got && got.id)}`);
      continue;
    }
    if (!isPlainObject(got)) {
      errors.push(`requirements.json[${index}]: 不是对象`);
      continue;
    }
    const extraKeys = Object.keys(got).filter((key) => !['id', 'description', 'scope'].includes(key));
    if (extraKeys.length > 0) {
      errors.push(`requirements.json[${index}] (${got.id}): 出现工单未提供的字段 ${extraKeys.join(', ')}`);
    }
    if (got.id !== want.id) errors.push(`requirements.json[${index}].id: '${got.id}' 应为 '${want.id}'`);
    if (got.description !== want.description) {
      errors.push(`requirements.json[${index}].description: '${got.description}' 应为 '${want.description}'`);
    }
    if (got.scope !== want.scope) errors.push(`requirements.json[${index}].scope: '${got.scope}' 应为 '${want.scope}'`);
  }
  const ids = actual.map((entry) => (isPlainObject(entry) ? entry.id : null));
  if (new Set(ids).size !== ids.length) errors.push('requirements.json 存在重复 id');
  return errors;
}

/**
 * 校验 coverage.json 的重点集合精确等于工单构成：
 * 3 场战役 + 5 位指挥官 + 6 篇专题 + 5 个历史部分导读 = 19。
 */
function coverageCompositionErrors(coverage) {
  const errors = [];
  if (!isPlainObject(coverage) || !Array.isArray(coverage.keyArticles)) return ['coverage.keyArticles 缺失'];
  const byKind = {};
  for (const entry of coverage.keyArticles) {
    if (!isPlainObject(entry)) continue;
    byKind[entry.kind] = byKind[entry.kind] || [];
    byKind[entry.kind].push(entry.id);
  }
  const expectedKinds = Object.keys(REQUIRED_COVERAGE_COMPOSITION).sort();
  const actualKinds = Object.keys(byKind).sort();
  if (canonicalJson(expectedKinds) !== canonicalJson(actualKinds)) {
    errors.push(`重点文章 kind 集合不符：实际 ${actualKinds.join(', ')}，应为 ${expectedKinds.join(', ')}`);
  }
  for (const [kind, expectedIds] of Object.entries(REQUIRED_COVERAGE_COMPOSITION)) {
    const actual = (byKind[kind] || []).slice().sort();
    const expected = expectedIds.slice().sort();
    if (canonicalJson(actual) !== canonicalJson(expected)) {
      const missing = expected.filter((id) => !actual.includes(id));
      const extra = actual.filter((id) => !expected.includes(id));
      errors.push(
        `${kind} 集合不符：缺 [${missing.join(', ') || '无'}]，多 [${extra.join(', ') || '无'}]`,
      );
    }
  }
  const totalExpected = Object.values(REQUIRED_COVERAGE_COMPOSITION).reduce((sum, ids) => sum + ids.length, 0);
  if (coverage.keyArticleIds.length !== totalExpected) {
    errors.push(`keyArticleIds 共 ${coverage.keyArticleIds.length} 篇，应为 ${totalExpected} 篇`);
  }
  return errors;
}

function printResult(result, { file, stage, media, rootDir }) {
  const mode = media ? 'full + media' : stage;
  console.log('DSH 太平洋战争教材内容验证');
  console.log(`文件：${file}`);
  console.log(`根目录：${rootDir}`);
  console.log(`阶段：${mode}${stage === 'full' ? '（最终硬门禁）' : '（累积部分门禁）'}`);
  if (stage === 'full' && !media) {
    console.log('提示：本次未运行 --media；发布前必须单独运行素材门禁。');
  }
  console.log(`实体：${result.stats.entities || 0}；来源：${result.stats.sources || 0}；claim：${result.stats.claims || 0}；问题：${result.stats.questions || 0}；素材：${result.stats.media || 0}`);
  if (result.warnings.length > 0) {
    console.log('\n警告：');
    for (const warning of result.warnings) console.log(`- ${warning}`);
  }
  if (result.errors.length === 0) {
    console.log('\n结果：PASS');
    if (media) console.log(`素材门禁：通过；重点文章 ${result.stats.keyArticles}/${result.stats.keyArticles} 具有所需类型素材。`);
    console.log('说明：结构验证通过不等于可读性评审通过；可读性证据须见 tests/evidence/pedagogy.md。');
    return true;
  }
  console.log(`\n结果：FAIL（${result.errors.length} 个错误）`);
  for (const error of result.errors) console.log(`- ${error}`);
  return false;
}

// ---------------------------------------------------------------------------
// 自测
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 纯契约检查（不需要 content/history.json）
// ---------------------------------------------------------------------------

/**
 * 纯契约检查（不需要 content/history.json）。
 *
 * ARCH-02 attempt 5：删除了 --real-content 真实内容诊断模式。原模式依赖真实
 * content/history.json，并在该基座没有早期战役内容时只能输出 NV —— 它没有证明
 * 任何新严格规则已在真实内容上生效。新规则的证据一律来自 --self-test 的**构造式**
 * 内存文档；真实内容由 HIST-01 交付后再由 --stage 门禁检查。
 */
function runContractChecks() {
  const failures = [];
  console.log('DSH 契约一致性检查（不需要 content/history.json）');
  console.log(`requirements：${REQUIREMENTS_PATH}`);
  console.log(`coverage：${COVERAGE_PATH}`);
  console.log(`schema：${SCHEMA_PATH}`);
  console.log('');
  const requirementErrors = requirementsFileErrors();
  if (requirementErrors.length === 0) {
    console.log(`PASS  requirements.json 与工单 canonical 清单逐字一致（${CANONICAL_REQUIREMENTS.length} 条）`);
  } else {
    failures.push('requirements.json');
    console.log(`FAIL  requirements.json（${requirementErrors.length} 个问题）`);
    for (const error of requirementErrors) console.log(`      - ${error}`);
  }

  // D5/D6/D7：导读深度阈值、historicalPart 绑定、文档自测项数同步。
  try {
    const selfTestTotal = getSelfTestCount();
    const driftErrors = selfTestCountDriftErrors(selfTestTotal);
    if (driftErrors.length === 0) {
      console.log(`PASS  文档声明的自测项数与实际一致（${selfTestTotal} 项，coverage.md 与 README 已同步）`);
    } else {
      failures.push('self-test-count-drift');
      console.log(`FAIL  文档自测项数漂移（${driftErrors.length} 处）`);
      for (const error of driftErrors) console.log(`      - ${error}`);
    }
  } catch (error) {
    failures.push('self-test-count');
    console.log(`FAIL  无法校验自测项数同步：${error.message}`);
  }

  let coverage = null;
  try {
    coverage = readJson(COVERAGE_PATH, 'coverage.json');
  } catch (error) {
    failures.push('coverage.json');
    console.log(`FAIL  coverage.json 无法读取：${error.message}`);
  }
  if (coverage) {
    const coverageErrors = validateCoverageContract(coverage);
    if (coverageErrors.length === 0) {
      console.log('PASS  coverage.json 满足契约结构（阶段、十四类字段、最终门禁声明）');
    } else {
      failures.push('coverage.json');
      console.log(`FAIL  coverage.json 契约结构（${coverageErrors.length} 个问题）`);
      for (const error of coverageErrors) console.log(`      - ${error}`);
    }
    const compositionErrors = coverageCompositionErrors(coverage);
    if (compositionErrors.length === 0) {
      const counts = Object.entries(REQUIRED_COVERAGE_COMPOSITION)
        .map(([kind, ids]) => `${kind} ${ids.length}`)
        .join(' + ');
      console.log(`PASS  coverage 重点集合精确（${counts} = ${coverage.keyArticleIds.length}）`);
    } else {
      failures.push('coverage-composition');
      console.log(`FAIL  coverage 重点集合（${compositionErrors.length} 个问题）`);
      for (const error of compositionErrors) console.log(`      - ${error}`);
    }

    // D2：早期战役五类分析结构
    const earlyErrors = validateEarlyCampaignContract(coverage);
    if (earlyErrors.length === 0) {
      const block = coverage.earlyCampaign;
      console.log(
        `PASS  早期战役结构锁定（${block.eventIds.length} 个事件；目标结构 ${ANALYSIS_PROFILE_KEYS.length} 键 analysisProfiles，旧五键仅保留迁移诊断；导读强制小节 ${block.overviewTopics.requiredHeadings.join('、')}）`,
      );
      // D5：强制小节必须按小节自身深度达标
      const overviewMin = block.overviewTopics.minHanCharsPerHeading;
      const overviewEntry = coverage.keyArticles.find((item) => item.id === block.overviewTopics.overviewArticleId);
      const genericMin = overviewEntry && overviewEntry.minimumDepth ? overviewEntry.minimumDepth.requiredHeadingHanChars : undefined;
      if (typeof overviewMin === 'number' && overviewMin >= 40 && typeof genericMin === 'number' && genericMin >= 40) {
        console.log(
          `PASS  导读小节深度锁定（overviewTopics 小节 >=${overviewMin} 汉字；其余强制小节 >=${genericMin} 汉字；按小节计量而非总字数）`,
        );
      } else {
        failures.push('overview-heading-depth');
        console.log('FAIL  导读小节深度阈值缺失或过小（overviewTopics.minHanCharsPerHeading / minimumDepth.requiredHeadingHanChars）');
      }
    } else {
      failures.push('early-campaign');
      console.log(`FAIL  早期战役结构（${earlyErrors.length} 个问题）`);
      for (const error of earlyErrors) console.log(`      - ${error}`);
    }

    // D6：导读 historicalPart 必须与 ID 编码的部分一致
    const partBindingErrors = coverage.keyArticles
      .filter((entry) => entry && entry.kind === 'part-overview')
      .flatMap((entry) => {
        const out = [];
        if (!PART_IDS.includes(entry.historicalPart)) {
          out.push(`${entry.id}: historicalPart 缺失或非法（${JSON.stringify(entry.historicalPart)}）`);
          return out;
        }
        const encoded = historicalPartFromArticleId(entry.id);
        if (encoded !== entry.historicalPart) {
          out.push(`${entry.id}: 声明 '${entry.historicalPart}' 与 ID 编码 '${encoded}' 不一致`);
        }
        return out;
      });
    if (partBindingErrors.length === 0) {
      const mapping = coverage.keyArticles
        .filter((entry) => entry && entry.kind === 'part-overview')
        .map((entry) => `${entry.id.replace('event-overview-', '')}→${entry.historicalPart}`)
        .join(', ');
      console.log(`PASS  导读历史部分绑定（${mapping}）`);
    } else {
      failures.push('part-overview-historicalPart');
      console.log(`FAIL  导读历史部分绑定（${partBindingErrors.length} 个问题）`);
      for (const error of partBindingErrors) console.log(`      - ${error}`);
    }

    // D3 + ARCH-02：阶段归属不变式（单一来源：keyArticles + events）
    const ownershipErrors = validateStageOwnershipContract(coverage);
    if (ownershipErrors.length === 0) {
      const shape = STAGE_IDS.map((stage) => {
        const value = coverage.stageOwnership[stage] || {};
        return `${stage} ${(value.keyArticles || []).length}+${(value.events || []).length}e`;
      }).join(' + ');
      const eventTotal = STAGE_IDS.reduce((sum, stage) => sum + ownedEventIds(coverage, stage).length, 0);
      console.log(
        `PASS  阶段归属锁定（单一来源；${shape} = ${coverage.keyArticleIds.length} 篇文章，无重复、无孤立、无未归属）`,
      );
      console.log(
        `      事件归属交叉一致：${eventTotal} 个必需事件全部登记到 stageOwnership.<stage>.events，requiredEvents[].stage 与之一致`,
      );
      const gateIds = backgroundGateEventIds(coverage);
      console.log(`      backgroundGate 只引用 stageOwnership.background.events（${gateIds.length} 个）：${gateIds.join(', ')}`);
    } else {
      failures.push('stage-ownership');
      console.log(`FAIL  阶段归属（${ownershipErrors.length} 个问题）`);
      for (const error of ownershipErrors) console.log(`      - ${error}`);
    }

    // D3：每篇文章的素材类型契约
    const mediaTypeErrors = validateMediaTypeContract(coverage);
    if (mediaTypeErrors.length === 0) {
      const totalTypes = coverage.keyArticleIds.reduce(
        (sum, id) => sum + (coverage.requiredMediaTypes[id] || []).length,
        0,
      );
      console.log(`PASS  素材类型锁定（${coverage.keyArticleIds.length} 篇文章共 ${totalTypes} 项“文章 × 类型”要求，无孤立 ID）`);
    } else {
      failures.push('media-types');
      console.log(`FAIL  素材类型契约（${mediaTypeErrors.length} 个问题）`);
      for (const error of mediaTypeErrors) console.log(`      - ${error}`);
    }

    // ARCH-02 R2：早期战役十键具名分析契约
    const profileErrors = validateAnalysisProfilesContract(coverage);
    if (profileErrors.length === 0) {
      const keys = coverage.earlyCampaign.analysisProfiles.keys.map((k) => k.key);
      const legacy = coverage.earlyCampaign.legacyAnalysis;
      const research = coverage.earlyCampaign.researchStatus;
      const cross = coverage.crossChapterContradiction;
      console.log(
        `PASS  早期战役十键分析锁定（${keys.join(' / ')}；每键 >=${coverage.earlyCampaign.analysisProfiles.minHanCharsPerKey} 汉字且必含要素逐键检查正文；旧五键开关=${legacy.enforcement}，legacyDisabledBy=${legacy.legacyDisabledBy}，门禁无过渡豁免）`,
      );
      console.log(
        `PASS  严格规则声明（researchStatus 对早期战役事件必填，自 ${research.enforcedFrom} 起生效；跨章节矛盾 enforcement=${cross.enforcement}，参考案例仅用于构造式负例=${cross.referenceCaseIsConstructedOnly}）`,
      );
    } else {
      failures.push('analysis-profiles');
      console.log(`FAIL  早期战役十键分析（${profileErrors.length} 个问题）`);
      for (const error of profileErrors) console.log(`      - ${error}`);
    }

    // ARCH-02 R4：媒体注册表迁移契约
    const reg = coverage.mediaRegistry;
    const regProblems = [];
    if (!isPlainObject(reg)) regProblems.push('coverage.mediaRegistry 缺失');
    else {
      if (reg.version !== 1) regProblems.push(`version 应为 1，实际 ${reg.version}`);
      if (reg.file !== 'content/media.json') regProblems.push(`file 应为 content/media.json，实际 ${reg.file}`);
      for (const consumer of ['MEDIA-02', 'HIST-04', 'QA-01', 'WEB-01', 'MAP-01']) {
        if (!reg.consumers || !reg.consumers[consumer]) regProblems.push(`缺少消费方 ${consumer}`);
      }
      if (reg.stageGateUnaffectedWhenMissing !== true) regProblems.push('stageGateUnaffectedWhenMissing 必须为 true');
    }
    if (regProblems.length === 0) {
      console.log(
        `PASS  媒体注册表迁移锁定（${reg.file} v${reg.version}；旧 history.media 过渡=${reg.legacyHistoryMediaEnforcement}；--stage 不受缺失影响）`,
      );
    } else {
      failures.push('media-registry-contract');
      console.log(`FAIL  媒体注册表迁移契约（${regProblems.length} 个问题）`);
      for (const error of regProblems) console.log(`      - ${error}`);
    }
  }

  // ARCH-02 R6：地图阶段契约夹具
  try {
    const mapPath = path.join(REPO_ROOT, 'contracts', 'fixtures', 'map-phases.json');
    if (!fs.existsSync(mapPath)) {
      failures.push('map-phases-fixture');
      console.log(`FAIL  地图阶段夹具缺失：contracts/fixtures/map-phases.json`);
    } else {
      const mapDoc = readJson(mapPath, 'map-phases.json');
      const problems = [];
      if (mapDoc.fixtureOnly !== true) problems.push('fixtureOnly 必须为 true');
      for (const battleId of ['battle-pearl-harbor', 'battle-coral-sea', 'battle-midway']) {
        const battle = (mapDoc.battles || []).find((b) => b && b.id === battleId);
        if (!battle) problems.push(`缺少战役 ${battleId}`);
        else if (!Array.isArray(battle.phases) || battle.phases.length < 2) {
          problems.push(`${battleId} 阶段数 ${(battle.phases || []).length} < 2`);
        } else {
          for (const phase of battle.phases) {
            for (const field of ['time', 'positions', 'knownEnemy', 'unknownEnemy', 'decision', 'consequence', 'certainty', 'schematic']) {
              if (!hasOwn(phase, field)) problems.push(`${battleId}/${phase.id} 缺 ${field}`);
            }
            if (phase.schematic !== true) problems.push(`${battleId}/${phase.id} 未标 schematic`);
          }
        }
      }
      if (problems.length === 0) {
        const total = (mapDoc.battles || []).reduce((sum, b) => sum + (b.phases || []).length, 0);
        console.log(`PASS  地图阶段夹具（3 战役 × 2 阶段 = ${total} 个教学示意阶段，字段齐全）`);
      } else {
        failures.push('map-phases-fixture');
        console.log(`FAIL  地图阶段夹具（${problems.length} 个问题）`);
        for (const error of problems.slice(0, 8)) console.log(`      - ${error}`);
      }
    }
  } catch (error) {
    failures.push('map-phases-fixture');
    console.log(`FAIL  地图阶段夹具无法解析：${error.message}`);
  }

  try {
    const schema = readJson(SCHEMA_PATH, 'content.schema.json');
    const requiredCollections = COLLECTIONS.slice().sort();
    const actualCollections = Object.keys(schema.properties || {}).sort();
    const missing = requiredCollections.filter((name) => !actualCollections.includes(name));
    if (missing.length === 0) {
      console.log(`PASS  content.schema.json 含全部 ${COLLECTIONS.length} 个顶层数组`);
    } else {
      failures.push('schema-collections');
      console.log(`FAIL  content.schema.json 缺少顶层数组：${missing.join(', ')}`);
    }
    const sectionDef = schema.$defs && schema.$defs.battleSections;
    const sectionKeys = sectionDef && sectionDef.required ? sectionDef.required.slice().sort() : [];
    if (canonicalJson(sectionKeys) === canonicalJson(SECTION_KEYS.slice().sort())) {
      console.log(`PASS  content.schema.json 的 battleSections 恰好 ${SECTION_KEYS.length} 个必填键`);
    } else {
      failures.push('schema-sections');
      console.log(`FAIL  battleSections 必填键与验证器不一致：schema=[${sectionKeys.join(',')}] validator=[${SECTION_KEYS.join(',')}]`);
    }
    const phaseDef = schema.$defs && schema.$defs.phase;
    const phaseRequired = phaseDef && Array.isArray(phaseDef.required) ? phaseDef.required : [];
    const requiredPhaseFields = [
      'time',
      'positions',
      'knownEnemy',
      'unknownEnemy',
      'decision',
      'consequence',
      'certainty',
      'viewpoints',
      'schematic',
    ];
    const missingPhase = requiredPhaseFields.filter((field) => !phaseRequired.includes(field));
    if (missingPhase.length === 0) {
      console.log(`PASS  schema 的 phase 要求全部关键字段（${requiredPhaseFields.join(', ')}）`);
    } else {
      failures.push('schema-phase');
      console.log(`FAIL  schema phase 缺少必填字段：${missingPhase.join(', ')}`);
    }

    // D1：phase.time 必须声明端到端时间字段
    const phaseTimeDef = schema.$defs && schema.$defs.phaseTime;
    const phaseTimeProps = phaseTimeDef && isPlainObject(phaseTimeDef.properties) ? Object.keys(phaseTimeDef.properties) : [];
    const phaseTimeRequired = phaseTimeDef && Array.isArray(phaseTimeDef.required) ? phaseTimeDef.required : [];
    const phaseTimeProblems = [];
    if (phaseTimeProps.length === 0) phaseTimeProblems.push('缺少 $defs.phaseTime');
    if (phaseTimeProps.length > 0 && !phaseTimeProps.includes('end')) phaseTimeProblems.push('phaseTime 缺少 end 属性');
    for (const field of ['start', 'display', 'uncertainty']) {
      if (phaseTimeProps.length > 0 && !phaseTimeRequired.includes(field)) phaseTimeProblems.push(`phaseTime 未要求 ${field}`);
    }
    if (phaseTimeProblems.length === 0) {
      console.log('PASS  schema 的 phaseTime 声明 start/end/display/uncertainty（end 由验证器做窗口与顺序校验）');
    } else {
      failures.push('schema-phase-time');
      console.log(`FAIL  schema phaseTime：${phaseTimeProblems.join('；')}`);
    }

    // D2：schema 必须定义早期战役五类分析
    const earlyDef = schema.$defs && schema.$defs.earlyCampaignAnalysis;
    const earlyRequired = earlyDef && Array.isArray(earlyDef.required) ? earlyDef.required : [];
    if (canonicalJson(earlyRequired) === canonicalJson(EARLY_CAMPAIGN_KEYS)) {
      console.log(`PASS  schema 的 earlyCampaignAnalysis 恰好要求 ${EARLY_CAMPAIGN_KEYS.join('/')}`);
    } else {
      failures.push('schema-early-campaign');
      console.log(
        `FAIL  schema earlyCampaignAnalysis 必填键 [${earlyRequired.join(',')}] 与验证器 [${EARLY_CAMPAIGN_KEYS.join(',')}] 不一致`,
      );
    }
    const eventProps = schema.$defs && schema.$defs.event && isPlainObject(schema.$defs.event.properties)
      ? schema.$defs.event.properties
      : {};
    if (hasOwn(eventProps, 'earlyCampaignAnalysis')) {
      console.log('PASS  schema 的 event 允许 earlyCampaignAnalysis 字段');
    } else {
      failures.push('schema-event-early');
      console.log('FAIL  schema event 未声明 earlyCampaignAnalysis 字段');
    }

    // ARCH-02 R2/R3/R4：schema 必须声明 analysisProfiles / researchStatus / mediaRegistry
    const profilesDef = schema.$defs && schema.$defs.analysisProfiles;
    const profilesRequired = profilesDef && Array.isArray(profilesDef.required) ? profilesDef.required : [];
    if (canonicalJson(profilesRequired) === canonicalJson(ANALYSIS_PROFILE_KEYS) && hasOwn(eventProps, 'analysisProfiles')) {
      console.log(`PASS  schema 的 analysisProfiles 恰好要求 ${ANALYSIS_PROFILE_KEYS.length} 个具名键，且 event 允许该字段`);
    } else {
      failures.push('schema-analysis-profiles');
      console.log(
        `FAIL  schema analysisProfiles 必填键 [${profilesRequired.join(',')}] 与验证器 [${ANALYSIS_PROFILE_KEYS.join(',')}] 不一致或 event 未声明`,
      );
    }

    const researchStatusDef = schema.$defs && schema.$defs.researchStatus;
    const researchEnum = researchStatusDef && Array.isArray(researchStatusDef.enum) ? researchStatusDef.enum : [];
    if (
      canonicalJson(researchEnum) === canonicalJson(RESEARCH_STATUS_ENUM) &&
      hasOwn(eventProps, 'researchStatus')
    ) {
      console.log(`PASS  schema 的 researchStatus 枚举与 event 字段一致（${researchEnum.join('|')}）`);
    } else {
      failures.push('schema-research-status');
      console.log(`FAIL  schema researchStatus 枚举 [${researchEnum.join(',')}] 与验证器 [${RESEARCH_STATUS_ENUM.join(',')}] 不一致或 event 未声明`);
    }

    const registryDef = schema.$defs && schema.$defs.mediaRegistry;
    const registryRequired = registryDef && Array.isArray(registryDef.required) ? registryDef.required : [];
    const registryVersionConst = registryDef && registryDef.properties && registryDef.properties.version
      ? registryDef.properties.version.const
      : undefined;
    const historyTopLevelMediaArray = schema.properties && schema.properties.media
      ? schema.properties.media.type !== undefined && schema.properties.media.items !== undefined
      : false;
    if (
      canonicalJson(registryRequired) === canonicalJson(['version', 'media']) &&
      registryVersionConst === 1 &&
      !historyTopLevelMediaArray
    ) {
      console.log('PASS  schema 定义 mediaRegistry {version:1, media}，且 history 顶层 media 不再是数组');
    } else {
      failures.push('schema-media-registry');
      console.log(
        `FAIL  schema mediaRegistry 不符（required=[${registryRequired.join(',')}], version.const=${registryVersionConst}, history.media 仍是数组=${historyTopLevelMediaArray}）`,
      );
    }
  } catch (error) {
    failures.push('content.schema.json');
    console.log(`FAIL  content.schema.json 无法读取：${error.message}`);
  }

  console.log('');
  if (failures.length === 0) {
    console.log('结果：PASS（契约文件一致；这不代表 content/history.json 已交付）');
    return true;
  }
  console.log(`结果：FAIL（${failures.length} 项：${failures.join(', ')}）`);
  return false;
}

function clone(value) {
  return structuredClone(value);
}

function loadSelfTestBase() {
  const coverage = loadCoverageOrThrow();
  const fixture = readJson(FIXTURE_PATH, 'contracts/fixtures/valid-min.json');
  return { coverage, fixture };
}

/**
 * D5/D6 自测用的 part 3 导读构造器。
 * 默认让所有强制小节都有充足汉字；`overrides` 可把指定标题的正文换成自定义长度，
 * 用于验证“按小节深度”断言而不是“总字数”断言。
 */
const PART3_OVERVIEW_ID = 'event-overview-part-3-expansion';

/**
 * part 3 导读的强制小节标题（与 coverage.keyArticles[PART3_OVERVIEW_ID].requiredArticleHeadings 一致）。
 * 自测构造器用它生成合成导读；若契约改变，下面的 D5 正向对照会失败并提示更新。
 */
const CONTRAST_PART_OVERVIEW_HEADINGS = [
  '香港',
  '马来亚与新加坡',
  '菲律宾、巴丹与科雷希多尔',
  '荷属东印度与石油',
  '威克岛与关岛',
  '达尔文与印度洋',
  '盟军为何连续失败',
  '日本的补给与防御压力',
];

function hanRepeat(count) {
  // 全是汉字，hanCount 结果正好等于 count。
  return '盟'.repeat(Math.max(0, count));
}

function makePartOverviewEvent(base, overrides = {}, defaultHan = 200) {
  const entry = CONTRAST_PART_OVERVIEW_HEADINGS;
  const sourceId = base.sources[0].id;
  const claimId = base.claims[0].id;
  const placeId = base.places[0].id;
  const article = entry.map((heading) => ({
    heading,
    body: Object.prototype.hasOwnProperty.call(overrides, heading) ? overrides[heading] : hanRepeat(defaultHan),
    sourceIds: [sourceId],
    claimIds: [claimId],
  }));
  return {
    id: PART3_OVERVIEW_ID,
    title: '合成 part 3 导读（仅供结构自测）',
    historicalPart: 'part-3-expansion',
    eventType: 'analysis',
    startDate: '1941-12-07',
    endDate: '1942-03-31',
    summary: '这是验证器自测使用的合成 part 3 导读，不对应真实历史内容，不得发布。',
    article,
    placeIds: [placeId],
    personIds: [],
    unitIds: [],
    equipmentIds: [],
    conceptIds: [],
    relatedEventIds: [],
    sourceIds: [sourceId],
    claimIds: [claimId],
  };
}

/**
 * 构造一个合规的“早期扩张战役”合成事件（D2 自测用）。
 * 使用已有 base 文档的来源/claim/地点，保证引用完整；内容明确标注为合成。
 */
function makeEarlyCampaignEvent(base, { omitAnalysis = false, id = 'event-hong-kong-1941' } = {}) {
  const sourceId = base.sources[0].id;
  const claimId = base.claims[0].id;
  const placeId = base.places[0].id;
  const body =
    '这是验证器自测使用的合成早期战役分析文字，不对应任何真实战役，也不得作为历史内容发布。它只用于让五类分析结构的深度检查发生，并确保每类分析都带有来源与 claim 引用。'.repeat(
      2,
    );
  const event = {
    id,
    title: '合成早期战役（仅供结构自测）',
    historicalPart: 'part-3-expansion',
    eventType: 'campaign',
    startDate: '1941-12-08',
    endDate: '1941-12-25',
    summary: '这是验证器自测使用的合成早期战役事件，不对应真实历史，不得发布。',
    article: [
      {
        heading: '合成导读',
        body: '这是验证器自测使用的合成导读小节，仅用于补齐事件的文章结构，不对应真实历史内容，也不得作为任何史实依据发布或引用。',
        sourceIds: [sourceId],
        claimIds: [claimId],
      },
    ],
    placeIds: [placeId],
    personIds: [],
    unitIds: [],
    equipmentIds: [],
    conceptIds: [],
    relatedEventIds: [],
    sourceIds: [sourceId],
    claimIds: [claimId],
  };
  if (!omitAnalysis) {
    const titleFor = {
      background: '背景',
      course: '经过',
      constraints: '约束',
      results: '结果',
      impact: '影响',
    };
    event.earlyCampaignAnalysis = {};
    for (const key of EARLY_CAMPAIGN_KEYS) {
      event.earlyCampaignAnalysis[key] = {
        title: titleFor[key],
        body,
        sourceIds: [sourceId],
        claimIds: [claimId],
      };
    }
  }
  return event;
}

/**
 * 构造一个带合规 analysisProfiles 十键的合成早期战役（ARCH-02 R2 自测用）。
 * 每种键写一句能同时满足“必含要素”与“最小汉字数”的合成文字；
 * 内容明确标注为合成，不代表任何真实历史。
 */
const ANALYSIS_PROFILE_TITLES = {
  background: '背景',
  geography: '地理环境',
  participants: '参与方与指挥',
  objectivesAndForces: '双方目标与军力',
  constraints: '约束条件',
  course: '阶段经过',
  options: '可选方案与被排除它的约束',
  resultsAndLosses: '结果与损失口径',
  impact: '后续影响',
  uncertainty: '不确定性',
};

const ANALYSIS_PROFILE_BODIES = {
  background:
    '合成文字：此处说明这场行动之前发生了什么、此前局势如何，以及日本为什么会在这个时间点对这里发动攻击，并把这件事放回更大的战争进程里去理解。本段只用于触发结构与篇幅检查，不对应任何真实战役，也不得作为历史内容发布，不得当作任何史实依据使用。',
  geography:
    '合成文字：此处说明战场在哪里、双方相距多远、地形或海域条件如何，包括港口、机场、海峡与补给线上的关键位置，以及这些地理条件对双方作战计划意味着什么，为什么距离和地形会直接改变可行的作战方式。本段只用于结构检查，不代表真实地理数据。',
  participants:
    '合成文字：此处说明日方与盟方各自有哪些国家、军种与部队参与，双方分别由哪一级司令部负责，指挥关系如何建立、由谁做出最终决定，以及陆海军之间的协调是怎样安排的。本段只用于结构检查，不对应任何真实编制与番号，也不代表真实的人事安排。',
  objectivesAndForces:
    '合成文字：此处说明日方想达到什么目标、盟方想达到什么目标，两者之间为什么会产生冲突，以及双方各自投入了多少兵力、舰艇与飞机，这些力量之间是怎么比较的。本段只用于结构检查，不包含真实数字，任何数量都必须由后续内容任务用可核查来源填写。',
  constraints:
    '合成文字：此处说明双方受哪些具体限制，例如情报不足、补给距离太远、天气恶劣、时间紧迫与通信不畅，并解释这些限制如何一步步影响到实际可选的行动，因此不能简单说成某一方指挥失误就导致失败。本段只用于结构检查与篇幅校验。',
  course:
    '合成文字：此处按时间顺序解释重要行动，先写清开始阶段双方的位置与意图，再指出转折点出现在什么时候、由什么事件触发，最后说明转折的原因是什么，避免只罗列日期而不解释因果。本段只用于结构检查，不对应任何真实作战序列与时序。',
  options:
    '合成文字：当时本来可以考虑另一个方案，即保持防御并等待增援到达，但受限于补给距离太远与可用兵力不足，无法同时守住两处据点，因此这个选项被排除，只能选择集中兵力先保一处。本段只用于结构检查，不对应真实的决策讨论，也不代表任何指挥官的内心想法。',
  resultsAndLosses:
    '合成文字：此处说明行动结果，并写明损失数字采用什么统计口径、统计时点与来源，区分阵亡、受伤、被俘与失踪，避免把不同口径的数字直接混用。本段只用于结构检查与篇幅校验，不给出任何真实数字，正式内容必须逐项引用官方来源。',
  impact:
    '合成文字：此处说明这场行动对后续战役、双方整体战略以及当地平民意味着什么，包括它对补给线与防御部署的长期影响，以及占领之后当地居民与战俘的处境。本段只用于结构检查，不对应任何真实历史评价，也不替代人工的可读性评审。',
  uncertainty:
    '合成文字：其中有证据支持的部分来自档案与二手研究，可以确认大致经过与主要参与部队；争议或无法确定的部分包括具体伤亡数字与某些关键时刻的顺序，不同说法尚未取得一致，资料也存在缺口。本段只用于结构检查与篇幅校验。',
};

function makeAnalysisProfiles(base, overrides = {}) {
  const sourceId = base.sources[0].id;
  const claimId = base.claims[0].id;
  const profiles = {};
  for (const key of ANALYSIS_PROFILE_KEYS) {
    profiles[key] = {
      title: ANALYSIS_PROFILE_TITLES[key],
      body: Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : ANALYSIS_PROFILE_BODIES[key],
      sourceIds: [sourceId],
      claimIds: [claimId],
    };
  }
  return profiles;
}

/**
 * 构造带 analysisProfiles 的合成早期战役事件。
 */
function makeProfiledEarlyCampaignEvent(base, opts = {}) {
  const event = makeEarlyCampaignEvent(base, { omitAnalysis: true, id: opts.id });
  event.analysisProfiles = makeAnalysisProfiles(base, opts.overrides || {});
  // F2：早期战役事件必须声明 researchStatus（严格规则，不依赖 --stage）。
  event.researchStatus = 'sources-retrieved';
  return event;
}

function makeSyntheticBattle(base) {
  const sourceId = base.sources[0].id;
  const claimId = base.claims[0].id;
  const placeId = base.places[0].id;
  const personId = 'person-fixture-commander';
  const person = {
    id: personId,
    name: '测试指挥官',
    side: 'allies',
    role: '验证器自测用合成人物',
    service: 'navy',
    summary: '这是仅供验证器自测使用的合成人物，不代表任何真实历史人物。',
    profile: '这是验证器自测使用的合成档案。它只用于检查结构规则，不代表真实历史事实，也不得进入正式内容。它需要足够长，以通过通用人物叙述的最低汉字要求。'.repeat(2),
    decisions: [
      {
        id: 'decision-fixture-order',
        title: '合成决策：是否转向',
        context: '这是验证器自测用的合成背景，不对应真实战斗，也不对应真实历史人物。',
        options: ['保持航向并等待侦察', '立即转向并派出攻击机'],
        choice: '立即转向并派出攻击机，这是合成本，不构成历史判断。',
        constraints: ['燃油有限且天气变化', '敌情信息仍然不完整'],
        consequence: '合成结果是编队改变位置，用于验证结构字段，不代表真实历史。',
        certainty: 'schematic',
        sourceIds: [sourceId],
        claimIds: [claimId],
      },
    ],
    relatedPersonIds: [],
    placeIds: [placeId],
    eventIds: [],
    battleIds: [],
    conceptIds: [],
    sourceIds: [sourceId],
    claimIds: [claimId],
  };
  const sectionTitles = {
    background: '背景',
    geography: '地理环境',
    participants: '主要参与方',
    commanders: '主要指挥官',
    forces: '双方军力对比',
    objectives: '各自战略目标',
    constraints: '决策约束',
    plan: '作战计划',
    course: '战斗经过',
    decisions: '关键决策',
    results: '结果与损失',
    aftermath: '后续影响',
    controversies: '历史争议',
    furtherReading: '延伸阅读',
  };
  const sections = {};
  const body =
    '这是验证器自测使用的合成长文，不对应真实事件，也不得作为历史内容发布。它只用于让结构检查发生，并确保每个小节都有足够的汉字来触发更深层的覆盖和链接检查。';
  for (const key of SECTION_KEYS) {
    sections[key] = { title: sectionTitles[key], body, sourceIds: [sourceId], claimIds: [claimId] };
  }
  const battle = {
    id: 'battle-fixture-structure',
    title: '合成结构测试战役',
    historicalPart: 'part-1-why-war',
    battleType: 'carrier-battle',
    theater: 'pacific',
    startDate: '1942-06-04',
    endDate: '1942-06-05',
    summary: '这是验证器自测使用的合成战役，不对应任何真实战斗，也不得作为内容交付。',
    belligerents: { japan: '合成一方', allies: '合成另一方' },
    outcome: { summary: '合成结构检查结果，不构成历史判断。', winner: 'inconclusive', certainty: 'schematic' },
    placeIds: [placeId],
    personIds: [personId],
    commanderIds: { japan: [personId], allies: [personId] },
    unitIds: [],
    equipmentIds: [],
    conceptIds: [],
    sourceIds: [sourceId],
    claimIds: [claimId],
    sections,
    phases: [
      {
        id: 'phase-fixture-one',
        sequence: 1,
        title: '合成阶段',
        time: {
          start: '1942-06-04T04:30:00-11:00',
          // D1：自带一个合法的 end，让基础样本覆盖 end 的正向路径。
          end: '1942-06-04T09:30:00-11:00',
          display: '1942年6月4日约04:30至09:30（合成测试时间）',
          uncertainty: '合成时间仅用于结构自测，不对应真实历史时刻。',
        },
        positions: {
          japan: {
            label: '合成日方位置',
            description: '合成示意位置，不对应真实舰队。',
            placeIds: [placeId],
            coordinates: { lat: 28.2, lng: -177.3 },
            schematic: true,
            uncertaintyRadiusKm: 300,
            uncertaintyNote: '合成位置，仅用于结构测试。',
            sourceIds: [sourceId],
            claimIds: [claimId],
          },
          allies: {
            label: '合成盟方位置',
            description: '合成示意位置，不对应真实舰队。',
            placeIds: [placeId],
            coordinates: { lat: 28.5, lng: -177.0 },
            schematic: true,
            uncertaintyRadiusKm: 300,
            uncertaintyNote: '合成位置，仅用于结构测试。',
            sourceIds: [sourceId],
            claimIds: [claimId],
          },
        },
        knownEnemy: { japan: '合成日方已知敌情，不构成历史事实。', allies: '合成盟方已知敌情，不构成历史事实。' },
        unknownEnemy: { japan: '合成日方未知敌情，不构成历史事实。', allies: '合成盟方未知敌情，不构成历史事实。' },
        decision: { japan: '合成日方决策用于结构验证，不是历史。', allies: '合成盟方决策用于结构验证，不是历史。' },
        consequence: { japan: '合成日方后果用于结构验证，不是历史。', allies: '合成盟方后果用于结构验证，不是历史。' },
        certainty: 'schematic',
        viewpoints: {
          japan: {
            perspective: '这是合成日方视角，仅用于验证结构字段是否存在，不代表真实历史人物的想法或判断。',
            sourceIds: [sourceId],
            claimIds: [claimId],
          },
          allies: {
            perspective: '这是合成盟方视角，仅用于验证结构字段是否存在，不代表真实历史人物的想法或判断。',
            sourceIds: [sourceId],
            claimIds: [claimId],
          },
        },
        routes: [
          {
            id: 'route-fixture-one',
            side: 'japan',
            label: '合成示意航线',
            fromPlaceId: placeId,
            toPlaceId: placeId,
            path: [
              { lat: 28.2, lng: -177.3 },
              { lat: 28.4, lng: -177.1 },
            ],
            schematic: true,
            certainty: 'schematic',
            note: '合成示意航线，不对应真实舰队轨迹。',
            sourceIds: [sourceId],
            claimIds: [claimId],
          },
        ],
        schematic: true,
        uncertaintyNote: '合成阶段，全部位置和时间均为结构测试示意。',
        eventIds: [],
        sourceIds: [sourceId],
        claimIds: [claimId],
      },
    ],
  };
  // 合成航线的起点/终点相同会被语义检查拒绝，因此改用另一个地点。
  battle.phases[0].routes[0].toPlaceId = base.places[1].id;
  return { person, battle };
}

function expectNoErrors(name, doc, coverage, options = {}) {
  const result = validateDocument(doc, {
    coverage,
    stage: options.stage || 'strategy',
    rootDir: options.rootDir || REPO_ROOT,
    media: Boolean(options.media),
    fileSystem: options.fileSystem,
  });
  if (result.errors.length > 0) {
    throw new Error(`${name}: 预期通过，实际有 ${result.errors.length} 个错误：\n${result.errors.slice(0, 5).join('\n')}`);
  }
  return result;
}

function expectErrors(name, doc, coverage, pattern, options = {}) {
  const result = validateDocument(doc, {
    coverage,
    stage: options.stage || 'strategy',
    rootDir: options.rootDir || REPO_ROOT,
    media: Boolean(options.media),
    fileSystem: options.fileSystem,
  });
  if (result.errors.length === 0) throw new Error(`${name}: 预期失败，实际通过`);
  if (pattern && !result.errors.some((error) => pattern.test(error))) {
    throw new Error(`${name}: 未找到预期错误 ${pattern}；实际问题：\n${result.errors.slice(0, 8).join('\n')}`);
  }
  return result;
}

/**
 * D7：自测项数的唯一真相来源。
 * 自测列表构建过程是纯函数式的（只构造闭包，不执行断言），
 * 因此 --check-contracts 也能在不运行整套测试的情况下得到真实项数。
 */
let selfTestCountCache = null;
function getSelfTestCount() {
  if (selfTestCountCache === null) {
    selfTestCountCache = buildSelfTests().length;
  }
  return selfTestCountCache;
}

function buildSelfTests() {
  const tests = [];
  const { coverage, fixture } = loadSelfTestBase();
  const base = clone(fixture);
  const synthetic = makeSyntheticBattle(base);
  base.people.push(synthetic.person);
  base.battles.push(synthetic.battle);

  tests.push(['fixture 结构在 strategy 阶段通过', () => expectNoErrors('fixture', base, coverage, { stage: 'strategy' })]);
  tests.push([
    'coverage 契约自身一致',
    () => {
      const errors = validateCoverageContract(coverage);
      if (errors.length > 0) throw new Error(errors.join('\n'));
    },
  ]);
  tests.push([
    'requirements.json 与工单 canonical 清单完全一致',
    () => {
      const errors = requirementsFileErrors();
      if (errors.length > 0) throw new Error(errors.join('\n'));
    },
  ]);
  tests.push([
    'requirements.json 偏离 canonical 清单会被发现（负例）',
    () => {
      // D4：全部在内存数组中构造，不创建任何临时文件。
      const extra = clone(CANONICAL_REQUIREMENTS);
      extra.push({ id: 'HIST-EXTRA', description: '工单没有的需求', scope: 'local' });
      if (requirementsFileErrors(extra).length === 0) throw new Error('多出条目没有被发现');

      const rewritten = clone(CANONICAL_REQUIREMENTS);
      rewritten[0].description = '改写过的描述';
      if (requirementsFileErrors(rewritten).length === 0) throw new Error('改写 description 没有被发现');

      const short = clone(CANONICAL_REQUIREMENTS);
      short.pop();
      if (requirementsFileErrors(short).length === 0) throw new Error('缺少条目没有被发现');

      const rescoped = clone(CANONICAL_REQUIREMENTS);
      rescoped[5].scope = 'release';
      if (requirementsFileErrors(rescoped).length === 0) throw new Error('改写 scope 没有被发现');

      const reordered = clone(CANONICAL_REQUIREMENTS);
      [reordered[0], reordered[1]] = [reordered[1], reordered[0]];
      if (requirementsFileErrors(reordered).length === 0) throw new Error('顺序颠倒没有被发现');

      const injected = clone(CANONICAL_REQUIREMENTS);
      injected[3].priority = 'high';
      if (requirementsFileErrors(injected).length === 0) throw new Error('额外字段没有被发现');
    },
  ]);
  tests.push([
    'coverage 重点集合 = 3 战役 + 5 指挥官 + 6 专题 + 5 导读',
    () => {
      const errors = coverageCompositionErrors(coverage);
      if (errors.length > 0) throw new Error(errors.join('\n'));
    },
  ]);
  tests.push([
    'coverage 少一篇重点文章会被发现（负例）',
    () => {
      const broken = clone(coverage);
      broken.keyArticles = broken.keyArticles.filter((entry) => entry.id !== 'battle-midway');
      broken.keyArticleIds = broken.keyArticleIds.filter((id) => id !== 'battle-midway');
      delete broken.requiredMediaTypes['battle-midway'];
      const errors = coverageCompositionErrors(broken);
      if (errors.length === 0) throw new Error('缺失 battle-midway 没有被发现');
      if (!errors.some((error) => /battle-midway/.test(error))) {
        throw new Error(`错误信息中没有指出 battle-midway：${errors.join('; ')}`);
      }
    },
  ]);
  tests.push([
    '重复 ID 被拒绝',
    () =>
      expectErrors(
        'duplicate',
        (() => {
          const doc = clone(base);
          doc.sources.push(clone(doc.sources[0]));
          return doc;
        })(),
        coverage,
        /重复 ID/,
      ),
  ]);
  tests.push([
    '未知实体引用被拒绝',
    () =>
      expectErrors(
        'unknown ref',
        (() => {
          const doc = clone(base);
          doc.events[0].placeIds.push('place-does-not-exist');
          return doc;
        })(),
        coverage,
        /断链|不存在/,
      ),
  ]);
  tests.push([
    '来源缺失被拒绝',
    () =>
      expectErrors(
        'missing source',
        (() => {
          const doc = clone(base);
          doc.events[0].sourceIds.push('source-does-not-exist');
          return doc;
        })(),
        coverage,
        /来源缺失|断链/,
      ),
  ]);
  tests.push([
    '战役缺十四类字段被拒绝',
    () =>
      expectErrors(
        'missing battle section',
        (() => {
          const doc = clone(base);
          delete doc.battles[0].sections.background;
          return doc;
        })(),
        coverage,
        /background|缺少必填字段/,
      ),
  ]);
  tests.push([
    '阶段缺 knownEnemy 被拒绝',
    () =>
      expectErrors(
        'missing knownEnemy',
        (() => {
          const doc = clone(base);
          delete doc.battles[0].phases[0].knownEnemy;
          return doc;
        })(),
        coverage,
        /knownEnemy|缺少必填字段/,
      ),
  ]);
  tests.push([
    '阶段缺 consequence 被拒绝',
    () =>
      expectErrors(
        'missing consequence',
        (() => {
          const doc = clone(base);
          delete doc.battles[0].phases[0].consequence;
          return doc;
        })(),
        coverage,
        /consequence|缺少必填字段/,
      ),
  ]);
  tests.push([
    '阶段缺 unknownEnemy 被拒绝',
    () =>
      expectErrors(
        'missing unknownEnemy',
        (() => {
          const doc = clone(base);
          delete doc.battles[0].phases[0].unknownEnemy;
          return doc;
        })(),
        coverage,
        /unknownEnemy|缺少必填字段/,
      ),
  ]);
  tests.push([
    '阶段缺 decision 被拒绝',
    () =>
      expectErrors(
        'missing decision',
        (() => {
          const doc = clone(base);
          delete doc.battles[0].phases[0].decision;
          return doc;
        })(),
        coverage,
        /decision|缺少必填字段/,
      ),
  ]);
  tests.push([
    '重点战役阶段缺双方位置被拒绝',
    () =>
      expectErrors(
        'missing positions side',
        (() => {
          const doc = clone(base);
          doc.battles[0].id = coverage.keyArticleIds.find((id) => id.startsWith('battle-')) || doc.battles[0].id;
          delete doc.battles[0].phases[0].positions.allies;
          return doc;
        })(),
        coverage,
        /positions|allies|缺少必填字段/,
      ),
  ]);
  tests.push([
    '阶段缺 viewpoints 被拒绝',
    () =>
      expectErrors(
        'missing viewpoints',
        (() => {
          const doc = clone(base);
          delete doc.battles[0].phases[0].viewpoints;
          return doc;
        })(),
        coverage,
        /viewpoints|缺少必填字段/,
      ),
  ]);
  tests.push([
    '阶段缺 certainty 被拒绝',
    () =>
      expectErrors(
        'missing certainty',
        (() => {
          const doc = clone(base);
          delete doc.battles[0].phases[0].certainty;
          return doc;
        })(),
        coverage,
        /certainty|缺少必填字段/,
      ),
  ]);
  tests.push([
    '阶段缺 schematic 标记被拒绝',
    () =>
      expectErrors(
        'missing phase schematic flag',
        (() => {
          const doc = clone(base);
          delete doc.battles[0].phases[0].schematic;
          return doc;
        })(),
        coverage,
        /schematic|缺少必填字段/,
      ),
  ]);
  tests.push([
    '阶段缺 time 被拒绝',
    () =>
      expectErrors(
        'missing phase time',
        (() => {
          const doc = clone(base);
          delete doc.battles[0].phases[0].time;
          return doc;
        })(),
        coverage,
        /time|缺少必填字段/,
      ),
  ]);
  // --- D1: phase.time.end 系列负例（审查者用 6/4–6/5 战役 + 6/10 结束时间命中过缺陷）---
  tests.push([
    'D1 阶段 time.end 超出战役窗口被拒绝（6/10 结尾于 6/4–6/5 战役）',
    () =>
      expectErrors(
        'phase time.end outside battle window',
        (() => {
          const doc = clone(base);
          doc.battles[0].startDate = '1942-06-04';
          doc.battles[0].endDate = '1942-06-05';
          doc.battles[0].phases[0].time.start = '1942-06-04T04:30:00-11:00';
          doc.battles[0].phases[0].time.end = '1942-06-10T04:30:00-11:00';
          return doc;
        })(),
        coverage,
        /time\.end.*不在战役|time\.end.*晚于战役结束/,
      ),
  ]);
  tests.push([
    'D1 阶段 time.end 早于 time.start 被拒绝',
    () =>
      expectErrors(
        'phase time.end before start',
        (() => {
          const doc = clone(base);
          doc.battles[0].phases[0].time.start = '1942-06-04T09:30:00-11:00';
          doc.battles[0].phases[0].time.end = '1942-06-04T04:30:00-11:00';
          return doc;
        })(),
        coverage,
        /time\.end.*早于开始时间/,
      ),
  ]);
  tests.push([
    'D1 阶段 time.end 格式非法被拒绝',
    () =>
      expectErrors(
        'phase time.end invalid format',
        (() => {
          const doc = clone(base);
          doc.battles[0].phases[0].time.end = '1942-06-04 09:30';
          return doc;
        })(),
        coverage,
        /time\.end.*不是带时区的有效 ISO 8601/,
      ),
  ]);
  tests.push([
    'D1 阶段 time.end 无时区被拒绝',
    () =>
      expectErrors(
        'phase time.end missing timezone',
        (() => {
          const doc = clone(base);
          doc.battles[0].phases[0].time.end = '1942-06-04T09:30:00';
          return doc;
        })(),
        coverage,
        /time\.end.*不是带时区的有效 ISO 8601/,
      ),
  ]);
  tests.push([
    'D1 阶段缺 time.start 被拒绝',
    () =>
      expectErrors(
        'phase missing time.start',
        (() => {
          const doc = clone(base);
          delete doc.battles[0].phases[0].time.start;
          return doc;
        })(),
        coverage,
        /time\.start.*必须有带时区的 ISO 8601 开始时间/,
      ),
  ]);
  tests.push([
    'D1 阶段 time.end 显式空值被拒绝（必须省略而不是留空）',
    () =>
      expectErrors(
        'phase time.end empty string',
        (() => {
          const doc = clone(base);
          doc.battles[0].phases[0].time.end = '';
          return doc;
        })(),
        coverage,
        /time\.end.*必须/,
      ),
  ]);
  tests.push([
    'D1 阶段序号与时间顺序矛盾被拒绝',
    () =>
      expectErrors(
        'phase sequence vs time order',
        (() => {
          const doc = clone(base);
          const first = clone(doc.battles[0].phases[0]);
          // 追加一个 sequence=2 但时间更早的阶段
          const second = clone(first);
          second.id = 'phase-fixture-two';
          second.sequence = 2;
          second.time.start = '1942-06-04T03:00:00-11:00';
          second.time.end = '1942-06-04T03:30:00-11:00';
          doc.battles[0].phases.push(second);
          return doc;
        })(),
        coverage,
        /早于序号 1|按 sequence 时间递增/,
      ),
  ]);
  tests.push([
    'D1 前一阶段 end 越过下一阶段 start 被拒绝',
    () =>
      expectErrors(
        'phase ranges overlap',
        (() => {
          const doc = clone(base);
          const second = clone(doc.battles[0].phases[0]);
          second.id = 'phase-fixture-three';
          second.sequence = 2;
          second.time.start = '1942-06-04T08:00:00-11:00';
          second.time.end = '1942-06-04T12:00:00-11:00';
          doc.battles[0].phases.push(second);
          return doc;
        })(),
        coverage,
        /结束时间晚于下一阶段/,
      ),
  ]);
  tests.push([
    'D1 合法 time.end 通过（正向对照）',
    () =>
      expectNoErrors(
        'phase time.end valid',
        (() => {
          const doc = clone(base);
          doc.battles[0].phases[0].time.end = '1942-06-04T20:00:00-11:00';
          return doc;
        })(),
        coverage,
        { stage: 'strategy' },
      ),
  ]);
  tests.push([
    'D1 时区不造成假阳性：战役末日 -11:00 晚间不越界',
    () => {
      // 回归防护：曾用 UTC 窗口比较，导致 1942-06-05T20:00-11:00 被误判越界。
      const doc = clone(base);
      doc.battles[0].startDate = '1942-06-04';
      doc.battles[0].endDate = '1942-06-05';
      doc.battles[0].phases[0].time.start = '1942-06-04T04:30:00-11:00';
      doc.battles[0].phases[0].time.end = '1942-06-05T20:00:00-11:00';
      const result = validateDocument(doc, { coverage, stage: 'strategy', rootDir: REPO_ROOT });
      const timeErrors = result.errors.filter((error) => /time\.(start|end)/.test(error));
      if (timeErrors.length > 0) {
        throw new Error(`合法时区时间被误判：${timeErrors.slice(0, 3).join('; ')}`);
      }
    },
  ]);
  // --- D2: 早期扩张战役五类分析结构 ---
  tests.push([
    'D2 早期战役缺整块分析结构被拒绝',
    () => {
      const doc = clone(base);
      doc.events.push(makeEarlyCampaignEvent(doc, { omitAnalysis: true }));
      // ARCH-02：缺结构时的具名错误现在指向 analysisProfiles（过渡期也接受旧 earlyCampaignAnalysis）。
      return expectErrors('early campaign missing analysis', doc, coverage, /analysisProfiles.*十键分析结构/);
    },
  ]);
  for (const key of ['background', 'course', 'constraints', 'results', 'impact']) {
    tests.push([
      `D2 早期战役缺 '${key}' 分析被拒绝`,
      () => {
        const doc = clone(base);
        const event = makeEarlyCampaignEvent(doc);
        delete event.earlyCampaignAnalysis[key];
        doc.events.push(event);
        return expectErrors(
          `early campaign missing ${key}`,
          doc,
          coverage,
          new RegExp(`earlyCampaignAnalysis\\.${key}|缺少必需的 '${key}'`),
        );
      },
    ]);
  }
  tests.push([
    'D2 早期战役某类分析正文过浅被拒绝',
    () => {
      const doc = clone(base);
      const event = makeEarlyCampaignEvent(doc);
      event.earlyCampaignAnalysis.course.body = '太短了。';
      doc.events.push(event);
      return expectErrors('early campaign shallow course', doc, coverage, /earlyCampaignAnalysis\.course\.body.*汉字/);
    },
  ]);
  tests.push([
    'D2 早期战役分析小节标题错误被拒绝',
    () => {
      const doc = clone(base);
      const event = makeEarlyCampaignEvent(doc);
      event.earlyCampaignAnalysis.impact.title = '随便写的标题';
      doc.events.push(event);
      return expectErrors('early campaign wrong title', doc, coverage, /earlyCampaignAnalysis\.impact\.title/);
    },
  ]);
  tests.push([
    'D2 早期战役分析小节缺来源被拒绝',
    () => {
      const doc = clone(base);
      const event = makeEarlyCampaignEvent(doc);
      event.earlyCampaignAnalysis.results.sourceIds = [];
      doc.events.push(event);
      return expectErrors('early campaign no sources', doc, coverage, /earlyCampaignAnalysis\.results|至少需要 1 个来源/);
    },
  ]);
  tests.push([
    'D2 合规的早期战役分析（analysisProfiles 十键）在 background 阶段通过（正向对照）',
    () => {
      const doc = clone(base);
      doc.events.push(makeProfiledEarlyCampaignEvent(doc));
      // background 阶段会因其它 coverage 缺失而失败，这里单独看这个事件条目没有分析类错误。
      const result = validateDocument(doc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const analysisErrors = result.errors.filter(
        (error) => /analysisProfiles|旧五键|researchStatus/.test(error) && !/缺少必需事件|缺少重点文章/.test(error),
      );
      if (analysisErrors.length > 0) {
        throw new Error(`合规 analysisProfiles 分析被误判：${analysisErrors.slice(0, 5).join('; ')}`);
      }
    },
  ]);
  tests.push([
    'D2 早期战役 fixture 通过结构检查（analysisProfiles 十键 + researchStatus）',
    () => {
      const earlyPath = path.join(REPO_ROOT, 'contracts', 'fixtures', 'valid-early-campaign.json');
      if (!fs.existsSync(earlyPath)) throw new Error(`早期战役 fixture 缺失：${earlyPath}`);
      const earlyDoc = readJson(earlyPath, 'valid-early-campaign.json');
      if (earlyDoc.fixtureOnly !== true) throw new Error('早期战役 fixture 必须 fixtureOnly=true');
      const result = validateDocument(earlyDoc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const analysisErrors = result.errors.filter(
        (error) => /analysisProfiles|旧五键|researchStatus/.test(error) && !/缺少必需事件|缺少重点文章/.test(error),
      );
      if (analysisErrors.length > 0) {
        throw new Error(`早期战役 fixture 未满足 analysisProfiles/researchStatus 结构：${analysisErrors.slice(0, 5).join('; ')}`);
      }
      const schemaErrors = result.errors.filter((error) => /不允许的字段|缺少必填字段/.test(error));
      if (schemaErrors.length > 0) {
        throw new Error(`早期战役 fixture 有 schema 错误：${schemaErrors.slice(0, 5).join('; ')}`);
      }
    },
  ]);

  // --- D5: 强制小节必须按小节自身深度达标，而不是靠其它小节凑总字数 ---
  const overviewEntry = coverage.keyArticles.find((entry) => entry.kind === 'part-overview' && entry.id === PART3_OVERVIEW_ID);
  const overviewMin = coverage.earlyCampaign.overviewTopics.minHanCharsPerHeading;
  const overviewHeading = coverage.earlyCampaign.overviewTopics.requiredHeadings[0];
  const overviewHeading2 = coverage.earlyCampaign.overviewTopics.requiredHeadings[1];

  tests.push([
    'D5 导读强制小节正文过短被拒绝（即使全篇总汉字数远超门槛）',
    () => {
      const doc = clone(base);
      const overview = makePartOverviewEvent(base, { [overviewHeading]: hanRepeat(overviewMin - 69) });
      doc.events.push(overview);
      const result = validateDocument(doc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const headingSpecific = result.errors.filter((error) => error.includes(overviewHeading) && /不能靠其它小节凑总字数/.test(error));
      if (headingSpecific.length === 0) {
        throw new Error(`短小节没有被按小节深度拒绝；实际错误：${result.errors.slice(0, 6).join(' | ')}`);
      }
      // 同时确认全篇总汉字数确实高于 minimumDepth.hanChars，证明不是被总字数拦住。
      const totalHan = (overview.article || []).reduce((sum, section) => sum + hanCount(section.body), 0);
      if (totalHan <= overviewEntry.minimumDepth.hanChars) {
        throw new Error(`测试构造有误：全篇 ${totalHan} 汉字未超过门槛 ${overviewEntry.minimumDepth.hanChars}`);
      }
    },
  ]);
  tests.push([
    'D5 第二个强制小节（日本的补给与防御压力）过短同样被拒绝',
    () => {
      const doc = clone(base);
      doc.events.push(makePartOverviewEvent(base, { [overviewHeading2]: hanRepeat(overviewMin - 40) }));
      const result = validateDocument(doc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const headingSpecific = result.errors.filter((error) => error.includes(overviewHeading2) && /不能靠其它小节凑总字数/.test(error));
      if (headingSpecific.length === 0) {
        throw new Error(`第二个强制小节过短未被拒绝；实际：${result.errors.slice(0, 6).join(' | ')}`);
      }
    },
  ]);
  tests.push([
    'D5 强制小节恰好达到阈值被接受（边界正例）',
    () => {
      const doc = clone(base);
      doc.events.push(makePartOverviewEvent(base, { [overviewHeading]: hanRepeat(overviewMin) }));
      const result = validateDocument(doc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const headingSpecific = result.errors.filter((error) => error.includes(overviewHeading) && /不能靠其它小节凑总字数/.test(error));
      if (headingSpecific.length > 0) {
        throw new Error(`恰好 ${overviewMin} 汉字的强制小节被误判为过短：${headingSpecific.join(' | ')}`);
      }
    },
  ]);
  tests.push([
    'D5 强制小节差一个汉字被拒绝（边界负例）',
    () => {
      const doc = clone(base);
      doc.events.push(makePartOverviewEvent(base, { [overviewHeading]: hanRepeat(overviewMin - 1) }));
      const result = validateDocument(doc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const headingSpecific = result.errors.filter((error) => error.includes(overviewHeading) && /不能靠其它小节凑总字数/.test(error));
      if (headingSpecific.length === 0) throw new Error(`差一个汉字（${overviewMin - 1}）未被拒绝`);
    },
  ]);
  tests.push([
    'D5 非 overviewTopics 的强制小节受 requiredHeadingHanChars 约束',
    () => {
      const otherHeading = overviewEntry.requiredArticleHeadings.find(
        (heading) => !coverage.earlyCampaign.overviewTopics.requiredHeadings.includes(heading),
      );
      const genericMin = overviewEntry.minimumDepth.requiredHeadingHanChars;
      const doc = clone(base);
      doc.events.push(makePartOverviewEvent(base, { [otherHeading]: hanRepeat(genericMin - 30) }));
      const result = validateDocument(doc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const headingSpecific = result.errors.filter((error) => error.includes(otherHeading) && /该强制小节只有/.test(error));
      if (headingSpecific.length === 0) {
        throw new Error(`普通强制小节 '${otherHeading}' 过短未被拒绝；实际：${result.errors.slice(0, 6).join(' | ')}`);
      }
    },
  ]);
  tests.push([
    'D5 契约必须声明 requiredHeadingHanChars 与 overview 阈值',
    () => {
      if (typeof overviewMin !== 'number' || overviewMin < 40) throw new Error('overviewTopics.minHanCharsPerHeading 未声明或过小');
      for (const entry of coverage.keyArticles.filter((item) => item.kind === 'part-overview')) {
        if (typeof entry.minimumDepth.requiredHeadingHanChars !== 'number') {
          throw new Error(`${entry.id}: 缺少 minimumDepth.requiredHeadingHanChars`);
        }
      }
      const broken = clone(coverage);
      const target = broken.keyArticles.find((item) => item.id === PART3_OVERVIEW_ID);
      delete target.minimumDepth.requiredHeadingHanChars;
      if (validateCoverageContract(broken).length === 0) {
        throw new Error('缺少 requiredHeadingHanChars 没有被契约检查发现');
      }
    },
  ]);

  // --- D6: 导读 historicalPart 必须与 ID 编码的部分一致 ---
  tests.push([
    'D6 每个 part-overview 都声明了与 ID 一致的历史部分（正向对照）',
    () => {
      const overviews = coverage.keyArticles.filter((entry) => entry.kind === 'part-overview');
      if (overviews.length !== PART_IDS.length) throw new Error(`导读数量应为 ${PART_IDS.length}，实际 ${overviews.length}`);
      for (const entry of overviews) {
        if (!PART_IDS.includes(entry.historicalPart)) throw new Error(`${entry.id}: historicalPart 缺失或非法`);
        const encoded = historicalPartFromArticleId(entry.id);
        if (encoded !== entry.historicalPart) {
          throw new Error(`${entry.id}: 声明 '${entry.historicalPart}' 但 ID 编码为 '${encoded}'`);
        }
      }
      if (validateCoverageContract(coverage).length > 0) {
        throw new Error(`真实 coverage 的 D6 绑定未通过：${validateCoverageContract(coverage).join('; ')}`);
      }
    },
  ]);
  tests.push([
    'D6 导读声明错误历史部分被拒绝（ID 与声明不一致）',
    () => {
      const broken = clone(coverage);
      broken.keyArticles.find((item) => item.id === PART3_OVERVIEW_ID).historicalPart = 'part-1-why-war';
      const errors = validateCoverageContract(broken);
      if (errors.length === 0) throw new Error('声明错误历史部分没有被发现');
      if (!errors.some((error) => error.includes(PART3_OVERVIEW_ID) && /不一致/.test(error))) {
        throw new Error(`错误未点名 ${PART3_OVERVIEW_ID}：${errors.join('; ')}`);
      }
    },
  ]);
  tests.push([
    'D6 导读缺少 historicalPart 被拒绝',
    () => {
      const broken = clone(coverage);
      delete broken.keyArticles.find((item) => item.id === PART3_OVERVIEW_ID).historicalPart;
      const errors = validateCoverageContract(broken);
      if (errors.length === 0) throw new Error('缺少 historicalPart 没有被发现');
      if (!errors.some((error) => error.includes(PART3_OVERVIEW_ID))) throw new Error(errors.join('; '));
    },
  ]);
  tests.push([
    'D6 导读 historicalPart 不在五部分内被拒绝',
    () => {
      const broken = clone(coverage);
      broken.keyArticles.find((item) => item.id === PART3_OVERVIEW_ID).historicalPart = 'part-9-nope';
      if (validateCoverageContract(broken).length === 0) throw new Error('非法 historicalPart 没有被发现');
    },
  ]);
  tests.push([
    'D6 实体自身 historicalPart 与 coverage 声明不一致被拒绝',
    () => {
      const doc = clone(base);
      const overview = makePartOverviewEvent(base, {});
      overview.historicalPart = 'part-1-why-war'; // schema 合法，但与 coverage 声明的 part-3-expansion 冲突
      doc.events.push(overview);
      const result = validateDocument(doc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const conflict = result.errors.filter(
        (error) => error.includes(PART3_OVERVIEW_ID) && /实体 historicalPart/.test(error),
      );
      if (conflict.length === 0) throw new Error(`实体/契约 historicalPart 冲突未被检出：${result.errors.slice(0, 6).join(' | ')}`);
    },
  ]);
  tests.push([
    'D6 实体与契约 historicalPart 一致时通过（正向对照）',
    () => {
      const doc = clone(base);
      doc.events.push(makePartOverviewEvent(base, {}));
      const result = validateDocument(doc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const conflict = result.errors.filter((error) => /实体 historicalPart/.test(error));
      if (conflict.length > 0) throw new Error(`一致的 historicalPart 被误判：${conflict.join(' | ')}`);
    },
  ]);
  tests.push([
    'D6 historicalPartFromArticleId 解析规则正确',
    () => {
      const cases = [
        ['event-overview-part-1-why-war', 'part-1-why-war'],
        ['event-overview-part-2-pearl-harbor', 'part-2-pearl-harbor'],
        ['event-overview-part-3-expansion', 'part-3-expansion'],
        ['event-overview-part-4-turning-point', 'part-4-turning-point'],
        ['event-overview-part-5-midway', 'part-5-midway'],
      ];
      for (const [id, expected] of cases) {
        const actual = historicalPartFromArticleId(id);
        if (actual !== expected) throw new Error(`${id} 解析为 '${actual}'，应为 '${expected}'`);
      }
      for (const bad of ['battle-midway', 'event-overview-part-6-x', 'event-overview-x', '', null]) {
        if (historicalPartFromArticleId(bad) !== null) throw new Error(`'${bad}' 不应解析出历史部分`);
      }
    },
  ]);
  tests.push([
    'D2 coverage.earlyCampaign 缺键或漏登记事件会被契约检查发现（负例）',
    () => {
      const noBlock = clone(coverage);
      delete noBlock.earlyCampaign;
      if (validateEarlyCampaignContract(noBlock).length === 0) throw new Error('缺少 earlyCampaign 块没有被发现');
      // ARCH-02 attempt 5：旧五键兼容只允许 legacyAnalysis 开关表达，第二套 analysisKeys 声明被拒绝。
      const legacyKeys = clone(coverage);
      legacyKeys.earlyCampaign.analysisKeys = [{ key: 'impact', title: '影响', question: '旧形状' }];
      if (!validateEarlyCampaignContract(legacyKeys).some((error) => /analysisKeys 已被移除/.test(error))) {
        throw new Error('重新声明 analysisKeys 没有被发现');
      }
      const shallowMin = clone(coverage);
      shallowMin.earlyCampaign.minHanCharsPerKey = 10;
      if (validateEarlyCampaignContract(shallowMin).length === 0) throw new Error('最小篇幅阈值过低没有被发现');

      const missingEvent = clone(coverage);
      missingEvent.earlyCampaign.eventIds = missingEvent.earlyCampaign.eventIds.filter((id) => id !== 'event-guam-1941');
      if (validateEarlyCampaignContract(missingEvent).length === 0) {
        throw new Error('background 阶段事件未登记到 earlyCampaign 没有被发现');
      }

      const badOverview = clone(coverage);
      badOverview.earlyCampaign.overviewTopics.requiredHeadings = ['不存在的标题'];
      if (validateEarlyCampaignContract(badOverview).length === 0) {
        throw new Error('导读缺强制标题没有被发现');
      }
    },
  ]);
  // --- D3: 阶段归属与素材类型契约不变式 ---
  tests.push([
    'D3 真实契约的阶段归属与素材类型不变式成立（正向对照）',
    () => {
      const ownershipErrors = validateStageOwnershipContract(coverage);
      if (ownershipErrors.length > 0) throw new Error(`stageOwnership: ${ownershipErrors.join('; ')}`);
      const mediaErrors = validateMediaTypeContract(coverage);
      if (mediaErrors.length > 0) throw new Error(`requiredMediaTypes: ${mediaErrors.join('; ')}`);
      const total = STAGE_IDS.reduce((sum, stage) => {
        const value = coverage.stageOwnership[stage];
        return sum + (isPlainObject(value) && Array.isArray(value.keyArticles) ? value.keyArticles.length : 0);
      }, 0);
      if (total !== coverage.keyArticleIds.length) {
        throw new Error(`阶段归属合计 ${total} 与重点文章数 ${coverage.keyArticleIds.length} 不一致`);
      }
    },
  ]);
  tests.push([
    'D3 阶段缺 owner（没有阶段拥有任何文章）被拒绝',
    () => {
      const broken = clone(coverage);
      broken.stageOwnership.coral = { keyArticles: [], events: [] };
      const errors = validateStageOwnershipContract(broken);
      if (errors.length === 0) throw new Error('空阶段归属没有被发现');
      if (!errors.some((error) => /coral/.test(error))) throw new Error(`错误未点名 coral：${errors.join('; ')}`);
    },
  ]);
  tests.push([
    'D3 重点文章缺少 stageOwnership 归属被拒绝',
    () => {
      const broken = clone(coverage);
      broken.keyArticleIds.push('battle-orphan-article');
      broken.keyArticles.push({
        id: 'battle-orphan-article',
        kind: 'battle',
        entityType: 'battle',
        stage: 'full',
        minimumDepth: { sectionCount: 14, phases: 3 },
      });
      broken.requiredMediaTypes['battle-orphan-article'] = ['battle-map'];
      const errors = validateStageOwnershipContract(broken);
      if (errors.length === 0) throw new Error('缺少阶段归属没有被发现');
      if (!errors.some((error) => /battle-orphan-article/.test(error))) {
        throw new Error(`错误未点名 battle-orphan-article：${errors.join('; ')}`);
      }
    },
  ]);
  tests.push([
    'D3 同一文章被两个阶段重复拥有被拒绝',
    () => {
      const broken = clone(coverage);
      broken.stageOwnership.full.keyArticles.push('event-overview-part-1-why-war');
      const errors = validateStageOwnershipContract(broken);
      if (errors.length === 0) throw new Error('重复归属没有被发现');
      if (!errors.some((error) => /重复拥有/.test(error))) throw new Error(`错误未指出重复拥有：${errors.join('; ')}`);
    },
  ]);
  tests.push([
    'D3 文章被归属到一个比它自身 stage 更早的阶段被拒绝',
    () => {
      const broken = clone(coverage);
      // battle-midway 属于 full；把它挪到 strategy 归属，与 keyArticles[].stage 冲突。
      broken.stageOwnership.full.keyArticles = broken.stageOwnership.full.keyArticles.filter((id) => id !== 'battle-midway');
      broken.stageOwnership.strategy.keyArticles.push('battle-midway');
      const errors = validateStageOwnershipContract(broken);
      if (errors.length === 0) throw new Error('阶段归属与 keyArticles.stage 冲突没有被发现');
      if (!errors.some((error) => /battle-midway/.test(error))) throw new Error(`错误未点名 battle-midway：${errors.join('; ')}`);
    },
  ]);
  tests.push([
    'D3 阶段归属含孤立 ID 被拒绝',    () => {
      const broken = clone(coverage);
      broken.stageOwnership.pearl.keyArticles.push('battle-does-not-exist');
      const errors = validateStageOwnershipContract(broken);
      if (errors.length === 0) throw new Error('孤立 ID 没有被发现');
      if (!errors.some((error) => /孤立 ID/.test(error))) throw new Error(`错误未指出孤立 ID：${errors.join('; ')}`);
    },
  ]);
  tests.push([
    'D3 阶段归属含未知阶段名被拒绝',
    () => {
      const broken = clone(coverage);
      broken.stageOwnership.midway = { keyArticles: [], events: [] };
      const errors = validateStageOwnershipContract(broken);
      if (errors.length === 0) throw new Error('未知阶段名没有被发现');
      if (!errors.some((error) => /midway/.test(error))) throw new Error(`错误未点名 midway：${errors.join('; ')}`);
    },
  ]);
  tests.push([
    'D3 重点文章缺 requiredMediaTypes 条目被拒绝',
    () => {
      const broken = clone(coverage);
      delete broken.requiredMediaTypes['battle-midway'];
      const errors = validateMediaTypeContract(broken);
      if (errors.length === 0) throw new Error('缺少素材类型条目没有被发现');
      if (!errors.some((error) => /battle-midway/.test(error))) throw new Error(`错误未点名 battle-midway：${errors.join('; ')}`);
    },
  ]);
  tests.push([
    'D3 文章种类与素材类型不符被拒绝（战役缺 battle-map）',
    () => {
      const broken = clone(coverage);
      broken.requiredMediaTypes['battle-midway'] = ['photograph'];
      const errors = validateMediaTypeContract(broken);
      if (errors.length === 0) throw new Error('战役缺 battle-map 没有被发现');
      if (!errors.some((error) => /battle-map/.test(error))) throw new Error(`错误未指出 battle-map：${errors.join('; ')}`);
    },
  ]);
  tests.push([
    'D3 requiredMediaTypes 出现孤立 ID 被拒绝',
    () => {
      const broken = clone(coverage);
      broken.requiredMediaTypes['concept-does-not-exist'] = ['diagram'];
      const errors = validateMediaTypeContract(broken);
      if (errors.length === 0) throw new Error('素材类型孤立 ID 没有被发现');
      if (!errors.some((error) => /孤立 ID/.test(error))) throw new Error(`错误未指出孤立 ID：${errors.join('; ')}`);
    },
  ]);
  tests.push([
    'D3 素材类型为空数组被拒绝',
    () => {
      const broken = clone(coverage);
      broken.requiredMediaTypes['person-nimitz-chester'] = [];
      const errors = validateMediaTypeContract(broken);
      if (errors.length === 0) throw new Error('空素材类型数组没有被发现');
      if (!errors.some((error) => /person-nimitz-chester/.test(error))) throw new Error(errors.join('; '));
    },
  ]);

  // ===== ARCH-02 R1：阶段归属单一来源、杜立特、backgroundGate =====
  tests.push([
    'ARCH-02 R1 杜立特空袭位于 stageOwnership.background.events（正向）',
    () => {
      const owned = ownedEventIds(coverage, 'background');
      if (!owned.includes('event-doolittle-raid-1942')) {
        throw new Error(`background 事件归属缺少杜立特：${owned.join(', ')}`);
      }
      const stage = ownershipStageForEvent(coverage, 'event-doolittle-raid-1942');
      if (stage !== 'background') throw new Error(`杜立特归属为 '${stage}'，应为 background`);
      const re = coverage.requiredEvents.find((e) => e.id === 'event-doolittle-raid-1942');
      if (!re || re.stage !== 'background') throw new Error(`requiredEvents 中杜立特 stage='${re && re.stage}'，应为 background`);
    },
  ]);
  tests.push([
    'ARCH-02 R1 requiredEvents 与 stageOwnership 交叉不一致被拒绝（具名负例）',
    () => {
      const broken = clone(coverage);
      // 只改 requiredEvents[].stage，不动 stageOwnership —— 应触发交叉一致性负例
      const target = broken.requiredEvents.find((e) => e.id === 'event-doolittle-raid-1942');
      target.stage = 'coral';
      const errors = validateStageOwnershipContract(broken);
      if (errors.length === 0) throw new Error('stage 交叉不一致没有被发现');
      if (!errors.some((error) => error.includes('event-doolittle-raid-1942') && /不一致/.test(error))) {
        throw new Error(`错误未点名杜立特且指出不一致：${errors.join('; ')}`);
      }
    },
  ]);
  tests.push([
    'ARCH-02 R1 必需事件未登记到 stageOwnership.events 被拒绝（具名负例）',
    () => {
      const broken = clone(coverage);
      broken.stageOwnership.background.events = broken.stageOwnership.background.events.filter(
        (id) => id !== 'event-doolittle-raid-1942',
      );
      const errors = validateStageOwnershipContract(broken);
      if (errors.length === 0) throw new Error('事件未登记没有被发现');
      if (!errors.some((error) => error.includes('event-doolittle-raid-1942') && /没有登记/.test(error))) {
        throw new Error(`错误未点名杜立特未登记：${errors.join('; ')}`);
      }
    },
  ]);
  tests.push([
    'ARCH-02 R1 stageOwnership.events 引用未登记事件被拒绝（具名负例）',
    () => {
      const broken = clone(coverage);
      broken.stageOwnership.background.events.push('event-never-registered');
      const errors = validateStageOwnershipContract(broken);
      if (errors.length === 0) throw new Error('未登记事件引用没有被发现');
      if (!errors.some((error) => error.includes('event-never-registered'))) {
        throw new Error(`错误未点名 event-never-registered：${errors.join('; ')}`);
      }
    },
  ]);
  tests.push([
    'ARCH-02 R1 同一事件被两个阶段重复归属被拒绝（具名负例）',
    () => {
      const broken = clone(coverage);
      broken.stageOwnership.coral.events.push('event-doolittle-raid-1942');
      const errors = validateStageOwnershipContract(broken);
      if (errors.length === 0) throw new Error('重复事件归属没有被发现');
      if (!errors.some((error) => error.includes('event-doolittle-raid-1942') && /重复拥有/.test(error))) {
        throw new Error(`错误未指出事件重复拥有：${errors.join('; ')}`);
      }
    },
  ]);
  tests.push([
    'ARCH-02 R1 验证器不再硬编码 background→part-3-expansion（background 事件可落 part-4）',
    () => {
      const allowed = allowedPartsForStage(coverage, 'background');
      if (!allowed.has('part-3-expansion')) throw new Error(`background 允许集合缺 part-3：${[...allowed]}`);
      if (!allowed.has('part-4-turning-point')) throw new Error(`background 允许集合缺 part-4（杜立特在 part 4）：${[...allowed]}`);
      if (allowed.has('part-1-why-war')) throw new Error('background 允许集合不应包含 part-1');
      // strategy 的事件仍只允许 part-1
      const strategyAllowed = allowedPartsForStage(coverage, 'strategy');
      if (!strategyAllowed.has('part-1-why-war')) throw new Error('strategy 允许集合缺 part-1');
      if (strategyAllowed.has('part-3-expansion')) throw new Error('strategy 允许集合不应包含 part-3');
    },
  ]);
  tests.push([
    'ARCH-02 R1 事件落在不允许的历史部分会被拒绝（按 stageOwnership 派生）',
    () => {
      const doc = clone(base);
      // 造一个 background 事件，但把它错放到 part-1（不在 background 允许集合内）
      const ev = makeEarlyCampaignEvent(doc, { id: 'event-hong-kong-1941' });
      ev.historicalPart = 'part-1-why-war';
      doc.events.push(ev);
      const result = validateDocument(doc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const partError = result.errors.filter(
        (error) => error.includes('event-hong-kong-1941') && /不在阶段 'background' 允许的集合/.test(error),
      );
      if (partError.length === 0) {
        throw new Error(`错配历史部分未被按 stageOwnership 派生拒绝：${result.errors.slice(0, 6).join(' | ')}`);
      }
    },
  ]);
  tests.push([
    'ARCH-02 R1 backgroundGate 只引用 stageOwnership.background.events',
    () => {
      const gateIds = backgroundGateEventIds(coverage);
      const owned = ownedEventIds(coverage, 'background');
      if (canonicalJson(gateIds) !== canonicalJson(owned)) {
        throw new Error(`backgroundGate 与 stageOwnership.background.events 不一致：${gateIds} vs ${owned}`);
      }
      if (!gateIds.includes('event-doolittle-raid-1942')) throw new Error('backgroundGate 未列出杜立特');
      // 负例：把背景事件从归属里去掉后，gate 必须随之变化（不存在第二套表）
      const broken = clone(coverage);
      broken.stageOwnership.background.events = [];
      if (backgroundGateEventIds(broken).length !== 0) {
        throw new Error('backgroundGate 没有跟随 stageOwnership（说明存在第二套归属来源）');
      }
    },
  ]);
  tests.push([
    'ARCH-02 R1 --stage background 缺杜立特时只由该事件缺失触发（具名负例）',
    () => {
      // 只在内存里移除杜立特事件，其余内容保持原样
      const doc = clone(base);
      doc.events = (doc.events || []).filter((e) => e && e.id !== 'event-doolittle-raid-1942');
      const result = validateDocument(doc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const doolittleErrors = result.errors.filter((error) => error.includes('event-doolittle-raid-1942'));
      if (doolittleErrors.length === 0) throw new Error('缺少杜立特没有被检出');
      // 该负例只由“该事件缺失”触发：错误信息必须是缺失事件，而不是历史部分或阶段归属问题
      for (const error of doolittleErrors) {
        if (!/缺少必需事件 event-doolittle-raid-1942/.test(error)) {
          throw new Error(`杜立特负例被其它原因连带触发：${error}`);
        }
      }
    },
  ]);

  // ===== ARCH-02 R2：analysisProfiles 十键具名分析 =====
  tests.push([
    'ARCH-02 R2 analysisProfiles 契约与代码十键一致（正向）',
    () => {
      const contractErrors = validateAnalysisProfilesContract(coverage);
      if (contractErrors.length > 0) throw new Error(contractErrors.join('; '));
      const declared = coverage.earlyCampaign.analysisProfiles.keys.map((entry) => entry.key);
      if (canonicalJson(declared) !== canonicalJson(ANALYSIS_PROFILE_KEYS)) {
        throw new Error(`契约键 ${declared.join(',')} 与代码键 ${ANALYSIS_PROFILE_KEYS.join(',')} 不一致`);
      }
    },
  ]);
  tests.push([
    'ARCH-02 R2 合规 analysisProfiles 十键通过（正向对照）',
    () => {
      const doc = clone(base);
      doc.events.push(makeProfiledEarlyCampaignEvent(doc));
      const result = validateDocument(doc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const profileErrors = result.errors.filter((error) => /analysisProfiles/.test(error));
      if (profileErrors.length > 0) {
        throw new Error(`合规十键分析被误判：${profileErrors.slice(0, 5).join(' | ')}`);
      }
    },
  ]);
  tests.push([
    'ARCH-02 R2 缺任意一个具名键被拒绝（逐键负例）',
    () => {
      for (const key of ANALYSIS_PROFILE_KEYS) {
        const doc = clone(base);
        const ev = makeProfiledEarlyCampaignEvent(doc);
        delete ev.analysisProfiles[key];
        doc.events.push(ev);
        const result = validateDocument(doc, { coverage, stage: 'background', rootDir: REPO_ROOT });
        const hit = result.errors.filter((error) => error.includes(`analysisProfiles.${key}`) && /缺少必需的/.test(error));
        if (hit.length === 0) throw new Error(`缺少键 '${key}' 没有被检出：${result.errors.slice(0, 5).join(' | ')}`);
      }
    },
  ]);
  tests.push([
    'ARCH-02 R2 某个键篇幅不足被拒绝（具名负例）',
    () => {
      const doc = clone(base);
      const ev = makeProfiledEarlyCampaignEvent(doc, { overrides: { geography: '太短。' } });
      doc.events.push(ev);
      const result = validateDocument(doc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const hit = result.errors.filter((error) => error.includes('analysisProfiles.geography.body') && /汉字/.test(error));
      if (hit.length === 0) throw new Error(`篇幅不足未被检出：${result.errors.slice(0, 5).join(' | ')}`);
    },
  ]);
  tests.push([
    'ARCH-02 R2 options 缺少真实选项被拒绝（具名负例）',
    () => {
      const doc = clone(base);
      const ev = makeProfiledEarlyCampaignEvent(doc, {
        overrides: {
          options:
            '合成文字：此处通篇陈述的是天气、距离与补给方面的困难，只罗列外部条件带来的压力，没有交代当时面对的是哪几条不同的路径，也没有写明有没有别的做法被讨论过。为了让篇幅规则先行通过、从而确保拦截确实来自缺少具体备选路径这一条，这里再补充若干说明性的句子把叙述铺满，但仍然不给出一条具体的路径描述。',
        },
      });
      doc.events.push(ev);
      const result = validateDocument(doc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const hit = result.errors.filter((error) => /analysisProfiles\.options/.test(error) && /真实可选方案/.test(error));
      if (hit.length === 0) throw new Error(`options 缺真实选项未被检出：${result.errors.slice(0, 6).join(' | ')}`);
    },
  ]);
  tests.push([
    'ARCH-02 R2 options 缺少排除它的约束被拒绝（具名负例）',
    () => {
      const doc = clone(base);
      const ev = makeProfiledEarlyCampaignEvent(doc, {
        overrides: {
          options:
            '合成文字：当时可以选择的方案有好几个，例如继续防守据点，或者主动出击寻找对方舰队，也可以等待增援到位再行动，这些方案都曾被认真考虑过并逐一讨论。',
        },
      });
      doc.events.push(ev);
      const result = validateDocument(doc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const hit = result.errors.filter((error) => /analysisProfiles\.options/.test(error) && /排除该方案的约束/.test(error));
      if (hit.length === 0) throw new Error(`options 缺约束未被检出：${result.errors.slice(0, 6).join(' | ')}`);
    },
  ]);
  tests.push([
    'ARCH-02 R2 uncertainty 缺少争议/无法确定被拒绝（具名负例）',
    () => {
      const doc = clone(base);
      const ev = makeProfiledEarlyCampaignEvent(doc, {
        overrides: {
          uncertainty:
            '合成文字：根据档案记载可以确认大致经过，史料中有证据支持的日期与部队番号都是清楚的，来源明确，可以放心写进正文，不需要额外说明其他情况。',
        },
      });
      doc.events.push(ev);
      const result = validateDocument(doc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const hit = result.errors.filter((error) => /analysisProfiles\.uncertainty/.test(error) && /争议或无法确定/.test(error));
      if (hit.length === 0) throw new Error(`uncertainty 缺争议表述未被检出：${result.errors.slice(0, 6).join(' | ')}`);
    },
  ]);
  tests.push([
    'ARCH-02 R2 uncertainty 缺少有证据支持的部分被拒绝（具名负例）',
    () => {
      const doc = clone(base);
      const ev = makeProfiledEarlyCampaignEvent(doc, {
        overrides: {
          uncertainty:
            '合成文字：这一部分存在争议，不同说法互不相同，具体伤亡数字无法确定，也有资料不足的地方，暂时不能判定谁对谁错，需要继续等待新的材料出现。',
        },
      });
      doc.events.push(ev);
      const result = validateDocument(doc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const hit = result.errors.filter((error) => /analysisProfiles\.uncertainty/.test(error) && /有证据支持/.test(error));
      if (hit.length === 0) throw new Error(`uncertainty 缺证据支持部分未被检出：${result.errors.slice(0, 6).join(' | ')}`);
    },
  ]);
  tests.push([
    'ARCH-02 R2 旧五键在门禁中被具名拒绝（无过渡豁免，逐阶段负例）',
    () => {
      const doc = clone(base);
      doc.events.push(makeEarlyCampaignEvent(doc)); // 只带旧 earlyCampaignAnalysis
      for (const stage of ['strategy', 'background', 'pearl', 'coral', 'full']) {
        const result = validateDocument(doc, { coverage, stage, rootDir: REPO_ROOT });
        const hit = result.errors.filter((error) => /旧五键结构已被停用/.test(error) && /analysisProfiles/.test(error));
        if (hit.length === 0) throw new Error(`stage=${stage}: 旧五键没有被拒绝`);
      }
    },
  ]);
  tests.push([
    'ARCH-02 R2 旧五键的逐键迁移诊断仍保留（便于 HIST-01 定位）',
    () => {
      const doc = clone(base);
      const legacyEvent = makeEarlyCampaignEvent(doc);
      delete legacyEvent.earlyCampaignAnalysis.course;
      doc.events.push(legacyEvent);
      const result = validateDocument(doc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const missingCourse = result.errors.filter(
        (error) => /earlyCampaignAnalysis\.course: 缺少必需的/.test(error) && /迁移定位/.test(error),
      );
      if (missingCourse.length === 0) {
        throw new Error(`旧五键缺失诊断没有保留：${result.errors.slice(0, 6).join(' | ')}`);
      }
    },
  ]);
  tests.push([
    'ARCH-02 R2 契约必须声明 analysisProfiles、旧五键开关与 researchStatus 严格规则',
    () => {
      const broken = clone(coverage);
      delete broken.earlyCampaign.analysisProfiles;
      if (validateAnalysisProfilesContract(broken).length === 0) throw new Error('缺少 analysisProfiles 未被发现');
      const broken2 = clone(coverage);
      delete broken2.earlyCampaign.legacyAnalysis;
      if (validateAnalysisProfilesContract(broken2).length === 0) throw new Error('缺少 legacyAnalysis 未被发现');
      const broken3 = clone(coverage);
      broken3.earlyCampaign.analysisProfiles.keys = broken3.earlyCampaign.analysisProfiles.keys.filter((k) => k.key !== 'uncertainty');
      const e3 = validateAnalysisProfilesContract(broken3);
      if (e3.length === 0) throw new Error('缺少 uncertainty 键未被发现');
      const broken4 = clone(coverage);
      delete broken4.earlyCampaign.researchStatus;
      if (validateAnalysisProfilesContract(broken4).length === 0) throw new Error('缺少 researchStatus 严格规则声明未被发现');
    },
  ]);

  // ===== ARCH-02 R3：研究过程状态只写 researchStatus（自 HIST-01 起生效）=====
  tests.push([
    'ARCH-02 R3 合法 researchStatus 枚举被接受（正向）',
    () => {
      const doc = clone(base);
      const ev = makeProfiledEarlyCampaignEvent(doc);
      ev.researchStatus = 'cross-checked';
      doc.events.push(ev);
      const result = validateDocument(doc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const rsErrors = result.errors.filter((error) => /researchStatus|研究\/检索过程措辞/.test(error));
      if (rsErrors.length > 0) throw new Error(`合法 researchStatus 被误判：${rsErrors.join(' | ')}`);
    },
  ]);
  tests.push([
    'ARCH-02 R3 非法 researchStatus 枚举值被拒绝（具名负例）',
    () => {
      const doc = clone(base);
      const ev = makeProfiledEarlyCampaignEvent(doc);
      ev.researchStatus = 'in-progress-ish';
      doc.events.push(ev);
      const result = validateDocument(doc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const hit = result.errors.filter((error) => /researchStatus/.test(error) && /必须是/.test(error));
      if (hit.length === 0) throw new Error(`非法枚举未被检出：${result.errors.slice(0, 5).join(' | ')}`);
    },
  ]);
  tests.push([
    'ARCH-02 R3 正文出现研究过程措辞被拒绝（具名负例，自 HIST-01 起生效）',
    () => {
      const doc = clone(base);
      const ev = makeProfiledEarlyCampaignEvent(doc);
      ev.article[0].body = `${ev.article[0].body}本文仍在检索相关资料，尚待查证具体数字。`;
      doc.events.push(ev);
      const result = validateDocument(doc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const hit = result.errors.filter((error) => /article\[0\].*研究\/检索过程措辞/.test(error));
      if (hit.length === 0) throw new Error(`正文研究措辞未被检出：${result.errors.slice(0, 6).join(' | ')}`);
      if (!hit.every((error) => /自 HIST-01 起生效/.test(error))) {
        throw new Error(`错误未标注生效任务：${hit.join(' | ')}`);
      }
    },
  ]);
  tests.push([
    'ARCH-02 R3 事件 summary 出现研究过程措辞被拒绝（具名负例）',
    () => {
      const doc = clone(base);
      const ev = makeProfiledEarlyCampaignEvent(doc);
      ev.summary = '这场行动的过程状态标记为调研中，详细资料有待查证，暂以摘要形式呈现。';
      doc.events.push(ev);
      const result = validateDocument(doc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const hit = result.errors.filter((error) => /\.summary:.*研究\/检索过程措辞/.test(error));
      if (hit.length === 0) throw new Error(`summary 研究措辞未被检出：${result.errors.slice(0, 6).join(' | ')}`);
    },
  ]);
  tests.push([
    'ARCH-02 R3 claim 文本出现研究过程措辞被拒绝（具名负例）',
    () => {
      const doc = clone(base);
      doc.claims.push({
        id: 'claim-selftest-research-wording',
        text: '合成测试：本段仍待查证，尚未找到可靠来源，因此只是占位说明。',
        claimType: 'schematic',
        entityIds: [doc.events[0].id],
        sourceIds: [doc.sources[0].id],
        locators: [{ sourceId: doc.sources[0].id, locatorType: 'page', locator: 'p. 1' }],
      });
      const result = validateDocument(doc, { coverage, stage: 'strategy', rootDir: REPO_ROOT });
      const hit = result.errors.filter((error) => /claims\[\d+\].*研究\/检索过程措辞/.test(error));
      if (hit.length === 0) throw new Error(`claim 研究措辞未被检出：${result.errors.slice(0, 6).join(' | ')}`);
    },
  ]);
  tests.push([
    'ARCH-02 R3 研究过程措辞识别器不误伤正常历史叙述',
    () => {
      const normal = [
        '1941年12月8日，日军开始进攻香港，防守方在人数与火力上都处于劣势，最终在12月25日投降。',
        '根据档案记载与官方战史，这场行动的日期与主要部队番号可以确认，具体伤亡数字存在不同口径。',
      ];
      for (const text of normal) {
        if (findResearchProcessWording(text)) throw new Error(`正常叙述被误判为研究措辞：${text}`);
      }
      const processTexts = [
        '本文仍在检索相关资料。',
        '尚待查证具体数字。',
        '本节资料不足，待补。',
        '检索过程中发现多个版本。',
        '尚未找到可靠来源。',
        'TODO: 补充数字',
      ];
      for (const text of processTexts) {
        if (!findResearchProcessWording(text)) throw new Error(`研究措辞未被识别：${text}`);
      }
    },
  ]);

  // ===== ARCH-02 R4：媒体注册表迁移 =====
  tests.push([
    'ARCH-02 R4 合法媒体注册表 {version:1, media:[...]} 通过（正向）',
    () => {
      const registry = {
        version: 1,
        media: [
          {
            id: 'media-selftest-registry-item',
            title: '合成测试素材',
            mediaType: 'map',
            path: 'public/media/selftest/x.svg',
            author: '验证器自测',
            license: 'original-work',
            rightsStatement: '验证器自测使用的原创示意图，不发布，不含真实历史主张。',
            sourceId: base.sources[0].id,
            creditLine: '验证器自测素材，不得发布。',
            alt: '验证器自测用合成地图，不代表真实地理。',
            caption: '验证器自测用合成地图，不对应真实历史。',
            articleIds: [coverage.keyArticleIds[0]],
          },
        ],
      };
      const errors = validateMediaRegistry(registry, coverage);
      if (errors.length > 0) throw new Error(`合法注册表被误判：${errors.join('; ')}`);
    },
  ]);
  tests.push([
    'ARCH-02 R4 注册表 version 不是 1 被拒绝（具名负例）',
    () => {
      const errors = validateMediaRegistry({ version: 2, media: [] }, coverage);
      if (errors.length === 0) throw new Error('version=2 没有被发现');
      if (!errors.some((error) => /version 必须是 1/.test(error))) throw new Error(errors.join('; '));
    },
  ]);
  tests.push([
    'ARCH-02 R4 注册表缺 media 数组被拒绝（具名负例）',
    () => {
      const errors = validateMediaRegistry({ version: 1 }, coverage);
      if (errors.length === 0) throw new Error('缺少 media 数组没有被发现');
      if (!errors.some((error) => /media 必须是数组/.test(error))) throw new Error(errors.join('; '));
    },
  ]);
  tests.push([
    'ARCH-02 R4 注册表含未定义顶层字段被拒绝（具名负例）',
    () => {
      const errors = validateMediaRegistry({ version: 1, media: [], extra: true }, coverage);
      if (errors.length === 0) throw new Error('未定义顶层字段没有被发现');
      if (!errors.some((error) => /不允许的顶层字段 'extra'/.test(error))) throw new Error(errors.join('; '));
    },
  ]);
  tests.push([
    'ARCH-02 R4 history 顶层 media 含条目被拒绝并给出迁移映射（具名负例）',
    () => {
      const doc = clone(base);
      doc.media = [
        {
          id: 'media-selftest-legacy',
          title: '旧式素材',
          mediaType: 'map',
          path: 'public/media/selftest/y.svg',
          author: '验证器自测',
          license: 'original-work',
          rightsStatement: '验证器自测使用的原创示意图，不发布，不含真实历史主张。',
          sourceId: doc.sources[0].id,
          creditLine: '验证器自测素材，不得发布。',
          alt: '验证器自测用合成地图，不代表真实地理。',
          caption: '验证器自测用合成地图，不对应真实历史。',
          articleIds: [coverage.keyArticleIds[0]],
        },
      ];
      const result = validateDocument(doc, { coverage, stage: 'strategy', rootDir: REPO_ROOT });
      const hit = result.errors.filter((error) => /\$\.media:.*已废弃并被拒绝/.test(error));
      if (hit.length === 0) throw new Error(`legacy media 没有被拒绝：${result.errors.slice(0, 6).join(' | ')}`);
      if (!hit.every((error) => /content\/media\.json/.test(error) && /迁移映射/.test(error))) {
        throw new Error(`拒绝信息缺少迁移映射：${hit.join(' | ')}`);
      }
    },
  ]);
  tests.push([
    'ARCH-02 R4 history 空 legacy media 在过渡期只警告不失败',
    () => {
      const doc = clone(base);
      doc.media = [];
      const result = validateDocument(doc, { coverage, stage: 'strategy', rootDir: REPO_ROOT });
      const mediaErrors = result.errors.filter((error) => /\$\.media:/.test(error));
      if (mediaErrors.length > 0) throw new Error(`空 legacy media 在过渡期不应报错：${mediaErrors.join(' | ')}`);
      if (!result.warnings.some((warning) => /\$\.media:.*过渡窗口内仅警告/.test(warning))) {
        throw new Error('空 legacy media 没有产生迁移警告');
      }
    },
  ]);
  tests.push([
    'ARCH-02 R4 关闭过渡窗口后空 legacy media 也被拒绝（负例）',
    () => {
      const doc = clone(base);
      doc.media = [];
      const strict = clone(coverage);
      strict.mediaRegistry.legacyHistoryMediaEnforcement = 'off';
      const result = validateDocument(doc, { coverage: strict, stage: 'strategy', rootDir: REPO_ROOT });
      const mediaErrors = result.errors.filter((error) => /\$\.media:.*已废弃并被拒绝/.test(error));
      if (mediaErrors.length === 0) throw new Error('过渡窗口关闭后空 legacy media 未被拒绝');
    },
  ]);
  tests.push([
    'ARCH-02 R4 --media 素材来自注册表而非 history.json（正向对照）',
    () => {
      const memoryFs = createMemoryFileSystem();
      const root = '/virtual-media-registry';
      const doc = clone(base);
      doc.media = []; // 过渡期的空 legacy
      const registryRow = {
        id: 'media-selftest-registry-ok',
        title: '合成测试地图',
        mediaType: 'map',
        path: 'public/media/selftest/ok-registry.svg',
        author: '验证器自测',
        license: 'original-work',
        rightsStatement: '验证器自测生成的原创示意图，不发布，不包含真实历史主张。',
        sourceId: doc.sources[0].id,
        creditLine: '验证器自测素材，不得发布。',
        alt: '验证器自测用合成地图，不代表真实地理。',
        caption: '验证器自测用合成地图，不对应真实历史。',
        articleIds: [coverage.keyArticleIds[0]],
      };
      const resolved = resolveMediaPath(root, registryRow.path);
      memoryFs.set(resolved.portableKey, '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
      const result = validateDocument(doc, {
        coverage,
        stage: 'strategy',
        media: true,
        mediaRows: [registryRow],
        rootDir: root,
        fileSystem: memoryFs,
      });
      const fileErrors = result.errors.filter((error) => /素材文件不存在|素材文件为空/.test(error));
      if (fileErrors.length > 0) throw new Error(`注册表素材被判为文件缺失：${fileErrors.join(' | ')}`);
    },
  ]);
  tests.push([
    'ARCH-02 R4 --media 在注册表缺条目时报素材门禁错误',
    () => {
      const doc = clone(base);
      doc.media = [];
      const result = validateDocument(doc, {
        coverage,
        stage: 'strategy',
        media: true,
        mediaRows: [],
        rootDir: '/virtual-media-registry-empty',
        fileSystem: createMemoryFileSystem(),
      });
      const hit = result.errors.filter((error) => /\[media\]/.test(error));
      if (hit.length === 0) throw new Error('空注册表没有触发素材门禁错误');
    },
  ]);
  tests.push([
    'ARCH-02 R4 --stage 门禁不因 media.json 缺失而失败（契约声明）',
    () => {
      if (!coverage.mediaRegistry || coverage.mediaRegistry.stageGateUnaffectedWhenMissing !== true) {
        throw new Error('coverage.mediaRegistry.stageGateUnaffectedWhenMissing 必须为 true');
      }
      // 空 mediaRows + 非 --media 的 stage 验证：不应产生任何 media 相关错误
      const doc = clone(base);
      doc.media = [];
      const result = validateDocument(doc, { coverage, stage: 'strategy', rootDir: REPO_ROOT });
      const mediaErrors = result.errors.filter((error) => /\[media\]|素材/.test(error));
      if (mediaErrors.length > 0) throw new Error(`--stage 被媒体缺失连带失败：${mediaErrors.join(' | ')}`);
    },
  ]);
  tests.push([
    'ARCH-02 R4 契约声明注册表消费方与版本',
    () => {
      const reg = coverage.mediaRegistry;
      if (!reg) throw new Error('coverage.mediaRegistry 缺失');
      if (reg.version !== 1) throw new Error(`mediaRegistry.version 应为 1，实际 ${reg.version}`);
      if (reg.file !== 'content/media.json') throw new Error(`mediaRegistry.file 应为 content/media.json，实际 ${reg.file}`);
      for (const consumer of ['MEDIA-02', 'HIST-04', 'QA-01', 'WEB-01', 'MAP-01']) {
        if (!reg.consumers || !reg.consumers[consumer]) throw new Error(`缺少消费方声明 ${consumer}`);
      }
      if (!isNonEmptyString(reg.consumers.HIST_04) && !/不写/.test(reg.consumers['HIST-04'])) {
        throw new Error('HIST-04 必须声明为不写 media.json');
      }
      if (!isNonEmptyString(reg.legacyDisabledBy)) throw new Error('必须声明 legacy media 何时关闭');
    },
  ]);

  // ===== ARCH-02 a2 非阻断项：注册表条目必须逐条通过 media schema =====
  tests.push([
    'ARCH-02 a2 注册表条目缺必需字段被 media schema 拒绝（具名负例）',
    () => {
      const registry = {
        version: 1,
        media: [{ id: 'media-selftest-incomplete', title: '缺字段素材' }],
      };
      const errors = validateMediaRegistry(registry, coverage);
      if (errors.length === 0) throw new Error('缺必需字段的条目没有被发现');
      const named = errors.filter((error) => /media\[0\]/.test(error) && /缺少必填字段/.test(error));
      if (named.length === 0) {
        throw new Error(`错误未定位到 media[0] 且说明缺必填字段：${errors.slice(0, 5).join(' | ')}`);
      }
    },
  ]);
  tests.push([
    'ARCH-02 a2 注册表条目非法许可被 media schema 拒绝（具名负例）',
    () => {
      const registry = {
        version: 1,
        media: [
          {
            id: 'media-selftest-bad-license',
            title: '非法许可素材',
            mediaType: 'map',
            path: 'public/media/selftest/z.svg',
            author: '验证器自测',
            license: 'all-rights-reserved',
            rightsStatement: '这是自测使用的非法许可声明，不应被接受。',
            sourceId: base.sources[0].id,
            creditLine: '验证器自测素材。',
            alt: '验证器自测用合成地图，不代表真实地理。',
            caption: '验证器自测用合成地图，不对应真实历史。',
            articleIds: [coverage.keyArticleIds[0]],
          },
        ],
      };
      const errors = validateMediaRegistry(registry, coverage);
      if (errors.length === 0) throw new Error('非法许可没有被发现');
      if (!errors.some((error) => /允许列表|license/.test(error))) {
        throw new Error(`错误未指出许可问题：${errors.slice(0, 5).join(' | ')}`);
      }
    },
  ]);
  tests.push([
    'ARCH-02 a2 合规注册表条目通过 media schema（正向对照）',
    () => {
      const registry = {
        version: 1,
        media: [
          {
            id: 'media-selftest-schema-ok',
            title: '合规素材',
            mediaType: 'map',
            path: 'public/media/selftest/ok2.svg',
            author: '验证器自测',
            license: 'original-work',
            rightsStatement: '验证器自测使用的原创示意图，不发布，不含真实历史主张。',
            sourceId: base.sources[0].id,
            creditLine: '验证器自测素材，不得发布。',
            alt: '验证器自测用合成地图，不代表真实地理。',
            caption: '验证器自测用合成地图，不对应真实历史。',
            articleIds: [coverage.keyArticleIds[0]],
          },
        ],
      };
      const errors = validateMediaRegistry(registry, coverage);
      if (errors.length > 0) throw new Error(`合规条目被误判：${errors.slice(0, 5).join(' | ')}`);
    },
  ]);
  tests.push([
    'ARCH-02 a2 history 顶层 media 废弃占位（deprecated stub）不被 schema 当作合法数组',
    () => {
      // schema 里 properties.media 只保留迁移说明，不能声明 item 形状（否则等于仍允许数组）
      const mediaProp = CONTENT_SCHEMA.properties && CONTENT_SCHEMA.properties.media;
      if (!isPlainObject(mediaProp)) throw new Error('schema 缺少 media 迁移占位声明');
      if (mediaProp.items !== undefined) {
        throw new Error('schema 的 media 占位仍声明了 items，等于仍接受数组条目');
      }
      if (mediaProp.deprecated !== true) throw new Error('schema 的 media 占位必须标记 deprecated: true');
    },
  ]);
  tests.push([
    'ARCH-02 a2 --media 两份文件缺失分别精确报错（分支覆盖）',
    () => {
      // 直接调用 CLI 实际使用的提示构造函数，而不是比较硬编码常量或只 grep 源码。
      const historyLines = mediaInputMissingMessages('history', 'C:\\scratch\\content\\history.json');
      const mediaLines = mediaInputMissingMessages('media', 'C:\\scratch\\content\\media.json');
      const historyText = historyLines.join('\n');
      const mediaText = mediaLines.join('\n');
      if (historyText === mediaText) throw new Error('两份文件的错误信息不应相同');
      if (!/内容文件不存在：content\/history\.json/.test(historyText)) {
        throw new Error(`history 缺失提示未精确点名文件：${historyText}`);
      }
      if (!/history\.json 缺失/.test(historyText)) throw new Error('history 缺失提示缺少后果说明');
      if (!/素材注册表不存在：content\/media\.json/.test(mediaText)) {
        throw new Error(`media 缺失提示未精确点名文件：${mediaText}`);
      }
      if (!/期望结构/.test(mediaText) || !/迁移映射/.test(mediaText) || !/MEDIA-02/.test(mediaText)) {
        throw new Error('media 缺失提示缺少期望结构/迁移映射/写入方说明');
      }
      if (!historyText.includes('C:\\scratch\\content\\history.json')) throw new Error('history 提示未包含实际路径');
      if (!mediaText.includes('C:\\scratch\\content\\media.json')) throw new Error('media 提示未包含实际路径');
      let threw = false;
      try {
        mediaInputMissingMessages('unknown', 'x');
      } catch {
        threw = true;
      }
      if (!threw) throw new Error('未知缺失类型没有被拒绝（分支函数不自洽）');
    },
  ]);

  // ===== ARCH-02 R6：地图阶段契约夹具 =====
  tests.push([
    'ARCH-02 R6 地图阶段夹具存在、fixtureOnly、三战役各 >=2 阶段（正向）',
    () => {
      const mapPath = path.join(REPO_ROOT, 'contracts', 'fixtures', 'map-phases.json');
      if (!fs.existsSync(mapPath)) throw new Error(`地图阶段夹具缺失：${mapPath}`);
      const mapDoc = readJson(mapPath, 'map-phases.json');
      if (mapDoc.fixtureOnly !== true) throw new Error('地图阶段夹具必须 fixtureOnly=true');
      for (const battleId of ['battle-pearl-harbor', 'battle-coral-sea', 'battle-midway']) {
        const battle = (mapDoc.battles || []).find((b) => b && b.id === battleId);
        if (!battle) throw new Error(`地图阶段夹具缺少战役 ${battleId}`);
        if (!Array.isArray(battle.phases) || battle.phases.length < 2) {
          throw new Error(`${battleId} 的阶段数 ${(battle.phases || []).length} < 2`);
        }
        for (const phase of battle.phases) {
          for (const field of ['time', 'positions', 'knownEnemy', 'unknownEnemy', 'decision', 'consequence', 'certainty', 'schematic']) {
            if (!hasOwn(phase, field)) throw new Error(`${battleId}/${phase.id} 缺少阶段字段 '${field}'`);
          }
          for (const side of ['japan', 'allies']) {
            if (!isPlainObject(phase.positions[side])) throw new Error(`${battleId}/${phase.id} 缺少 ${side} 位置`);
            if (!isNonEmptyString(phase.knownEnemy[side])) throw new Error(`${battleId}/${phase.id} 缺少 ${side} knownEnemy`);
            if (!isNonEmptyString(phase.unknownEnemy[side])) throw new Error(`${battleId}/${phase.id} 缺少 ${side} unknownEnemy`);
            if (!isNonEmptyString(phase.decision[side])) throw new Error(`${battleId}/${phase.id} 缺少 ${side} decision`);
            if (!isNonEmptyString(phase.consequence[side])) throw new Error(`${battleId}/${phase.id} 缺少 ${side} consequence`);
          }
          if (phase.schematic !== true) throw new Error(`${battleId}/${phase.id} 必须标记 schematic=true`);
        }
      }
    },
  ]);
  tests.push([
    'ARCH-02 R6 地图阶段夹具无结构性错误（不含 coverage 缺失）',
    () => {
      const mapPath = path.join(REPO_ROOT, 'contracts', 'fixtures', 'map-phases.json');
      const mapDoc = readJson(mapPath, 'map-phases.json');
      const result = validateDocument(mapDoc, { coverage, stage: 'strategy', rootDir: REPO_ROOT });
      const structural = result.errors.filter((error) => !/^\[coverage\]/.test(error) && !/^coverage:/.test(error));
      if (structural.length > 0) {
        throw new Error(`地图阶段夹具有结构错误：\n${structural.slice(0, 8).join('\n')}`);
      }
    },
  ]);
  // ===== ARCH-02 a2 修复 D3：地图阶段「双方位置」专用负例 =====
  tests.push([
    'ARCH-02 D3 阶段缺 positions.allies 被专用校验拒绝（具名负例）',
    () => {
      const mapPath = path.join(REPO_ROOT, 'contracts', 'fixtures', 'map-phases.json');
      const mapDoc = readJson(mapPath, 'map-phases.json');
      delete mapDoc.battles[0].phases[0].positions.allies;
      const result = validateDocument(mapDoc, { coverage, stage: 'strategy', rootDir: REPO_ROOT });
      // 必须由「地图阶段专用校验」指出缺失的盟方位置，而不是仅靠 schema 的必填字段
      const specific = result.errors.filter(
        (error) => /positions\.allies/.test(error) && /缺少\s*盟方位置/.test(error),
      );
      if (specific.length === 0) {
        throw new Error(`缺 positions.allies 未被专用校验检出：${result.errors.slice(0, 6).join(' | ')}`);
      }
    },
  ]);
  tests.push([
    'ARCH-02 D3 阶段缺 positions.japan 被专用校验拒绝（具名负例）',
    () => {
      const mapPath = path.join(REPO_ROOT, 'contracts', 'fixtures', 'map-phases.json');
      const mapDoc = readJson(mapPath, 'map-phases.json');
      delete mapDoc.battles[1].phases[1].positions.japan;
      const result = validateDocument(mapDoc, { coverage, stage: 'strategy', rootDir: REPO_ROOT });
      const specific = result.errors.filter(
        (error) => /positions\.japan/.test(error) && /缺少\s*日方位置/.test(error),
      );
      if (specific.length === 0) {
        throw new Error(`缺 positions.japan 未被专用校验检出：${result.errors.slice(0, 6).join(' | ')}`);
      }
    },
  ]);
  tests.push([
    'ARCH-02 D3 阶段整个 positions 对象缺失被专用校验拒绝（具名负例）',
    () => {
      const mapPath = path.join(REPO_ROOT, 'contracts', 'fixtures', 'map-phases.json');
      const mapDoc = readJson(mapPath, 'map-phases.json');
      delete mapDoc.battles[2].phases[0].positions;
      const result = validateDocument(mapDoc, { coverage, stage: 'strategy', rootDir: REPO_ROOT });
      const specific = result.errors.filter(
        (error) => /positions: 阶段缺少双方位置对象/.test(error),
      );
      if (specific.length === 0) {
        throw new Error(`缺整个 positions 未被专用校验检出：${result.errors.slice(0, 6).join(' | ')}`);
      }
    },
  ]);
  tests.push([
    'ARCH-02 D3 专用校验对合规夹具全部 6 个阶段通过（正向对照）',
    () => {
      const mapPath = path.join(REPO_ROOT, 'contracts', 'fixtures', 'map-phases.json');
      const mapDoc = readJson(mapPath, 'map-phases.json');
      let phaseCount = 0;
      for (const battle of mapDoc.battles) {
        const errs = validateMapPhasesForBattle(battle, `battles.${battle.id}`);
        if (errs.length > 0) throw new Error(`${battle.id} 专用校验失败：${errs.slice(0, 3).join(' | ')}`);
        phaseCount += battle.phases.length;
      }
      if (phaseCount !== 6) throw new Error(`期望 6 个阶段，实际 ${phaseCount}`);
    },
  ]);

  tests.push([
    'ARCH-02 R6 地图阶段夹具缺 knownEnemy 被拒绝（具名负例）',    () => {
      const mapPath = path.join(REPO_ROOT, 'contracts', 'fixtures', 'map-phases.json');
      const mapDoc = readJson(mapPath, 'map-phases.json');
      delete mapDoc.battles[0].phases[0].knownEnemy;
      const result = validateDocument(mapDoc, { coverage, stage: 'strategy', rootDir: REPO_ROOT });
      const hit = result.errors.filter((error) => /phases\[0\].*knownEnemy|缺少必填字段 'knownEnemy'/.test(error));
      if (hit.length === 0) throw new Error(`缺失 knownEnemy 未被检出：${result.errors.slice(0, 5).join(' | ')}`);
    },
  ]);
  tests.push([
    'ARCH-02 R6 地图阶段夹具缺 consequence 被拒绝（具名负例）',
    () => {
      const mapPath = path.join(REPO_ROOT, 'contracts', 'fixtures', 'map-phases.json');
      const mapDoc = readJson(mapPath, 'map-phases.json');
      delete mapDoc.battles[1].phases[0].consequence;
      const result = validateDocument(mapDoc, { coverage, stage: 'strategy', rootDir: REPO_ROOT });
      const hit = result.errors.filter((error) => /phases\[0\].*consequence|缺少必填字段 'consequence'/.test(error));
      if (hit.length === 0) throw new Error(`缺失 consequence 未被检出：${result.errors.slice(0, 5).join(' | ')}`);
    },
  ]);
  tests.push([
    'ARCH-02 R6 地图阶段夹具缺 unknownEnemy 被拒绝（具名负例）',
    () => {
      const mapPath = path.join(REPO_ROOT, 'contracts', 'fixtures', 'map-phases.json');
      const mapDoc = readJson(mapPath, 'map-phases.json');
      delete mapDoc.battles[2].phases[1].unknownEnemy;
      const result = validateDocument(mapDoc, { coverage, stage: 'strategy', rootDir: REPO_ROOT });
      const hit = result.errors.filter((error) => /phases\[1\].*unknownEnemy|缺少必填字段 'unknownEnemy'/.test(error));
      if (hit.length === 0) throw new Error(`缺失 unknownEnemy 未被检出：${result.errors.slice(0, 5).join(' | ')}`);
    },
  ]);
  tests.push([
    'ARCH-02 R6 地图阶段夹具阶段未标示意被拒绝（具名负例）',
    () => {
      const mapPath = path.join(REPO_ROOT, 'contracts', 'fixtures', 'map-phases.json');
      const mapDoc = readJson(mapPath, 'map-phases.json');
      mapDoc.battles[0].phases[0].schematic = false;
      const result = validateDocument(mapDoc, { coverage, stage: 'strategy', rootDir: REPO_ROOT });
      const hit = result.errors.filter((error) => /phases\[0\].*schematic/.test(error));
      if (hit.length === 0) throw new Error(`未标示意未被检出：${result.errors.slice(0, 5).join(' | ')}`);
    },
  ]);

  // ===== ARCH-02：跨章节数值/类别矛盾（达尔文 18 架飞机）=====
  tests.push([
    'ARCH-02 跨章节矛盾识别器能识别达尔文 18 架飞机的类别冲突（参考案例）',
    () => {
      const items = extractAircraftClaims('十八架重型轰炸机出现');
      if (items.length !== 1 || items[0].count !== 18 || items[0].category !== 'level-bomber') {
        throw new Error(`未能正确抽取『十八架重型轰炸机』：${JSON.stringify(items)}`);
      }
      const other = extractAircraftClaims('18 架俯冲轰炸机');
      if (other.length !== 1 || other[0].count !== 18 || other[0].category !== 'dive-bomber') {
        throw new Error(`未能正确抽取『18 架俯冲轰炸机』：${JSON.stringify(other)}`);
      }
    },
  ]);
  tests.push([
    'ARCH-02 D1 数字解析支持全角数字与超过 18 的中文数字',
    () => {
      // 全角数字（review 明确指出的缺口）
      const fullwidth = extractAircraftClaims('１８架俯冲轰炸机');
      if (fullwidth.length !== 1 || fullwidth[0].count !== 18 || fullwidth[0].category !== 'dive-bomber') {
        throw new Error(`全角数字未被识别：${JSON.stringify(fullwidth)}`);
      }
      // 中文数字 >18 且含十/百
      const cases = [
        ['二十四架战斗机', 24, 'fighter'],
        ['三十六架水平轰炸机', 36, 'level-bomber'],
        ['七十二架俯冲轰炸机', 72, 'dive-bomber'],
        ['一百架鱼雷机', 100, 'torpedo-bomber'],
        ['一百四十架水平轰炸机', 140, 'level-bomber'],
        ['两百架战斗机', 200, 'fighter'],
        ['二百架战斗机', 200, 'fighter'],
        ['一千架飞行艇', 1000, 'floatplane'],
      ];
      for (const [text, expectedCount, expectedCategory] of cases) {
        const items = extractAircraftClaims(text);
        if (items.length !== 1 || items[0].count !== expectedCount || items[0].category !== expectedCategory) {
          throw new Error(`『${text}』解析错误：期望 ${expectedCount}/${expectedCategory}，实际 ${JSON.stringify(items)}`);
        }
      }
      // 全角 + 中文混排仍能构成跨章节矛盾
      const mixed = extractAircraftClaims('正文写 一百四十架重型轰炸机');
      if (mixed.length !== 1 || mixed[0].count !== 140) throw new Error(`>99 中文数字未被识别：${JSON.stringify(mixed)}`);
    },
  ]);
  tests.push([
    'ARCH-02 跨章节矛盾检查精确指出事件与章节（具名负例）',
    () => {
      const doc = clone(base);
      const ev = makeEarlyCampaignEvent(doc, { id: 'event-darwin-air-raid-1942' });
      ev.article = [
        { heading: '一次没有预警的空袭', body: '十八架重型轰炸机出现，防守方没有任何预警。', sourceIds: [doc.sources[0].id], claimIds: [doc.claims[0].id] },
      ];
      doc.events.push(ev);
      doc.claims.push({
        id: 'claim-selftest-darwin-category',
        text: '约 72 架水平轰炸机与 18 架俯冲轰炸机参与了这次空袭。',
        claimType: 'fact',
        entityIds: ['event-darwin-air-raid-1942'],
        sourceIds: [doc.sources[0].id],
        locators: [{ sourceId: doc.sources[0].id, locatorType: 'page', locator: 'p. 12' }],
      });
      const result = validateDocument(doc, { coverage, stage: 'strategy', rootDir: REPO_ROOT });
      const hit = result.errors.filter((error) => /跨章节数值\/类别矛盾/.test(error));
      if (hit.length === 0) throw new Error(`矛盾未被检出：${result.errors.slice(0, 6).join(' | ')}`);
      const message = hit[0];
      if (!/event-darwin-air-raid-1942/.test(message)) throw new Error(`错误未点名事件：${message}`);
      if (!/一次没有预警的空袭/.test(message)) throw new Error(`错误未点名正文小节：${message}`);
      if (!/claim-selftest-darwin-category/.test(message)) throw new Error(`错误未点名 claim：${message}`);
    },
  ]);
  tests.push([
    'ARCH-02 数字抽取：无数量文本不误报，多机种各自归类',
    () => {
      // 无数字歧义时不报错
      const body = '轰炸机与战斗机都参与了行动，但没有给出具体数量。';
      if (extractAircraftClaims(body).length !== 0) throw new Error('无数字文本应当抽取为空');
      const consistent = '18 架俯冲轰炸机与 72 架水平轰炸机参与了行动。';
      const items = extractAircraftClaims(consistent);
      const byCount = new Map();
      for (const item of items) byCount.set(item.count, item.category);
      if (byCount.get(18) !== 'dive-bomber' || byCount.get(72) !== 'level-bomber') {
        throw new Error(`抽取结果不符：${JSON.stringify(items)}`);
      }
    },
  ]);
  tests.push([
    'ARCH-02 跨章节矛盾错误真的输出 eventId（具名断言）',
    () => {
      const doc = clone(base);
      const ev = makeEarlyCampaignEvent(doc, { id: 'event-darwin-air-raid-1942' });
      ev.article = [
        {
          heading: '一次没有预警的空袭',
          body: '十八架重型轰炸机出现。',
          sourceIds: [doc.sources[0].id],
          claimIds: [doc.claims[0].id],
        },
      ];
      doc.events.push(ev);
      doc.claims.push({
        id: 'claim-selftest-eventid-output',
        text: '这次空袭中有 18 架俯冲轰炸机参与。',
        claimType: 'fact',
        entityIds: ['event-darwin-air-raid-1942'],
        sourceIds: [doc.sources[0].id],
        locators: [{ sourceId: doc.sources[0].id, locatorType: 'page', locator: 'p. 12' }],
      });
      const result = validateDocument(doc, { coverage, stage: 'strategy', rootDir: REPO_ROOT });
      const hit = result.errors.filter((error) => /跨章节数值\/类别矛盾/.test(error));
      if (hit.length === 0) throw new Error('矛盾未被检出');
      const message = hit[0];
      // 这条断言就是测试名承诺的内容：错误信息里必须真的出现 eventId
      if (!message.includes('event-darwin-air-raid-1942')) {
        throw new Error(`错误信息没有输出 eventId：${message.slice(0, 200)}`);
      }
      if (!/claim-selftest-eventid-output/.test(message)) {
        throw new Error(`错误信息没有输出 claim ID：${message.slice(0, 200)}`);
      }
      if (!/一次没有预警的空袭/.test(message)) {
        throw new Error(`错误信息没有输出小节标题：${message.slice(0, 200)}`);
      }
    },
  ]);

  // ===== ARCH-02 attempt 3：新规则必须在真实内容上执行（D2/D3）=====
  // ===== ARCH-02 attempt 5：全部证据来自构造的内存文档（不读 content/、docs/）=====
  tests.push([
    'ARCH-02 阶段无关性：构造的早期战役文档在五个阶段命中数一致（构造内存文档）',
    () => {
      // F1 修复：不再读取 content/history.json，也不读 docs/。用夹具派生的内存文档构造一个
      // “必然命中三类严格规则”的早期战役事件：只有旧五键（旧五键在门禁中始终被拒绝）、
      // summary 注入研究过程措辞、正文与 claim 注入 18 架飞机类别矛盾。
      // 若任一检查被 stage 门控，命中数就会随阶段变化，本测试失败。
      const doc = clone(base);
      const ev = makeEarlyCampaignEvent(doc, { id: coverage.earlyCampaign.eventIds[0] });
      ev.summary = `${ev.summary}本文仍在检索相关资料，尚待查证。`;
      ev.article[0].body = `${ev.article[0].body}十八架重型轰炸机出现。`;
      doc.events.push(ev);
      doc.claims.push({
        id: 'claim-stage-independence-contradiction',
        text: '这次行动中有 18 架俯冲轰炸机参与。',
        claimType: 'fact',
        entityIds: [ev.id],
        sourceIds: [doc.sources[0].id],
        locators: [{ sourceId: doc.sources[0].id, locatorType: 'page', locator: 'p. 12' }],
      });
      const counts = STAGE_IDS.map((stage) => {
        const result = validateDocument(doc, { coverage, stage, rootDir: REPO_ROOT });
        const all = [...result.errors, ...result.warnings];
        return {
          stage,
          ap: all.filter((x) => /analysisProfiles|旧五键/.test(x)).length,
          rs: all.filter((x) => /researchStatus|研究\/检索过程措辞/.test(x)).length,
          cc: all.filter((x) => /跨章节数值\/类别矛盾/.test(x)).length,
        };
      });
      const first = counts[0];
      for (const row of counts) {
        if (row.ap !== first.ap || row.rs !== first.rs || row.cc !== first.cc) {
          throw new Error(
            `规则命中数随 stage 变化（说明检查被 stage 门控了）：${counts.map((c) => `${c.stage}:ap=${c.ap},rs=${c.rs},cc=${c.cc}`).join(' | ')}`,
          );
        }
      }
      // 三段命中都必须非 0，否则“五阶段相同”只是 0=0 的假证明。
      if (first.ap === 0) throw new Error('构造文档没有触发 analysisProfiles/旧五键 规则（0=0 假证明）');
      if (first.rs === 0) throw new Error('构造文档没有触发 researchStatus/过程措辞 规则（0=0 假证明）');
      if (first.cc === 0) throw new Error('构造文档没有触发跨章节矛盾规则（0=0 假证明）');
      console.log(`      （阶段无关性证据来源：构造的内存夹具文档；ap=${first.ap} rs=${first.rs} cc=${first.cc}）`);
    },
  ]);
  tests.push([
    'ARCH-02 R3 researchStatus 在早期战役事件上被强制要求（F2 具名负例）',
    () => {
      const doc = clone(base);
      const ev = makeProfiledEarlyCampaignEvent(doc);
      delete ev.researchStatus;
      doc.events.push(ev);
      const result = validateDocument(doc, { coverage, stage: 'strategy', rootDir: REPO_ROOT });
      const hit = result.errors.filter((error) => /researchStatus/.test(error) && /必须声明 researchStatus/.test(error));
      if (hit.length === 0) {
        throw new Error(`缺失 researchStatus 未被强制：${result.errors.slice(0, 6).join(' | ')}`);
      }
      // 只由“缺失”触发：不应同时出现“枚举非法”的错误
      const enumHit = result.errors.filter((error) => /researchStatus.*必须是/.test(error));
      if (enumHit.length > 0) throw new Error('缺失 researchStatus 的负例被枚举错误连带触发');
    },
  ]);
  tests.push([
    'ARCH-02 R3 研究过程措辞正向探针：构造合规文档注入措辞后被具名拒绝（构造内存文档）',
    () => {
      // 取代旧的“真实内容正向探针”：正向用例同样来自构造的内存文档。
      const doc = clone(base);
      const ev = makeProfiledEarlyCampaignEvent(doc);
      doc.events.push(ev);
      const clean = validateDocument(doc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const cleanRuleErrors = clean.errors.filter((error) => /研究\/检索过程措辞|researchStatus/.test(error));
      if (cleanRuleErrors.length > 0) {
        throw new Error(`构造的合规文档被误判：${cleanRuleErrors.slice(0, 4).join(' | ')}`);
      }
      const probe = clone(doc);
      probe.events.find((event) => event.id === ev.id).article[0].body += '本文仍在检索相关资料，尚待查证具体数字。';
      const result = validateDocument(probe, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const hits = result.errors.filter((error) => /研究\/检索过程措辞/.test(error));
      if (hits.length === 0) throw new Error('注入研究过程措辞后规则没有报错');
      if (!hits.every((error) => /自 HIST-01 起生效/.test(error))) {
        throw new Error(`错误未标注自 HIST-01 起生效：${hits[0]}`);
      }
    },
  ]);
  tests.push([
    'ARCH-02 R2 旧五键在门禁中始终被具名拒绝（无过渡豁免，构造事件）',
    () => {
      const doc = clone(base);
      const legacyEvent = makeEarlyCampaignEvent(doc); // 只带旧 earlyCampaignAnalysis
      doc.events.push(legacyEvent);
      for (const stage of ['strategy', 'background', 'full']) {
        const result = validateDocument(doc, { coverage, stage, rootDir: REPO_ROOT });
        const hit = result.errors.filter((error) => /旧五键结构已被停用/.test(error) && /analysisProfiles/.test(error));
        if (hit.length === 0) throw new Error(`stage=${stage}: 旧五键没有被具名拒绝`);
      }
    },
  ]);
  tests.push([
    'ARCH-02 R2/F4 契约禁止过渡豁免：enforcement/legacyDisabledBy/elementMarkers 不合规被拒绝（具名负例）',
    () => {
      const transitional = clone(coverage);
      transitional.earlyCampaign.legacyAnalysis.enforcement = 'transition';
      if (!validateAnalysisProfilesContract(transitional).some((error) => /enforcement 必须恒为 'off'/.test(error))) {
        throw new Error('enforcement=transition 没有被拒绝（门禁过渡豁免仍可能生效）');
      }
      const wrongDisabler = clone(coverage);
      wrongDisabler.earlyCampaign.legacyAnalysis.legacyDisabledBy = 'ARCH-02-flip';
      if (!validateAnalysisProfilesContract(wrongDisabler).some((error) => /legacyDisabledBy 必须严格为 'HIST-01'/.test(error))) {
        throw new Error("legacyDisabledBy 不是 'HIST-01' 时没有被拒绝");
      }
      const noMarkers = clone(coverage);
      delete noMarkers.earlyCampaign.analysisProfiles.keys[0].elementMarkers;
      if (!validateAnalysisProfilesContract(noMarkers).some((error) => /elementMarkers/.test(error))) {
        throw new Error('必含要素缺少机器可判定表述时没有被拒绝');
      }
    },
  ]);
  tests.push([
    'ARCH-02 R2 analysisProfiles 必含要素缺失被拒绝（逐键不连带，具名负例）',
    () => {
      // background 的必含要素是「此前局势」「起因」；正文只保留篇幅，不含任何对应表述。
      const doc = clone(base);
      const ev = makeProfiledEarlyCampaignEvent(doc, { overrides: { background: `合成文字：${'盟'.repeat(80)}` } });
      doc.events.push(ev);
      const result = validateDocument(doc, { coverage, stage: 'strategy', rootDir: REPO_ROOT });
      const hit = result.errors.filter(
        (error) => /analysisProfiles\.background\.body/.test(error) && /缺少必含要素/.test(error),
      );
      if (hit.length !== 2) {
        throw new Error(`background 应恰好报 2 个必含要素缺失，实际 ${hit.length}：${hit.join(' | ')}`);
      }
      if (!hit.some((error) => /「此前局势」/.test(error))) throw new Error('没有点名「此前局势」');
      if (!hit.some((error) => /「起因」/.test(error))) throw new Error('没有点名「起因」');
      // 只由 background 触发：其它键不得出现同类错误
      const collateral = result.errors.filter(
        (error) => /analysisProfiles\.(?!background)[a-zA-Z]+\.body: 缺少必含要素/.test(error),
      );
      if (collateral.length > 0) {
        throw new Error(`必含要素负例被其它键连带触发：${collateral.join(' | ')}`);
      }
    },
  ]);
  tests.push([
    'ARCH-02 跨章节矛盾在门禁中为错误（无过渡豁免，构造事件）',
    () => {
      const doc = clone(base);
      const ev = makeEarlyCampaignEvent(doc, { id: 'event-darwin-air-raid-1942' });
      ev.article = [
        {
          heading: '一次没有预警的空袭',
          body: '十八架重型轰炸机出现。',
          sourceIds: [doc.sources[0].id],
          claimIds: [doc.claims[0].id],
        },
      ];
      doc.events.push(ev);
      doc.claims.push({
        id: 'claim-selftest-darwin-strict',
        text: '这次空袭中有 18 架俯冲轰炸机参与。',
        claimType: 'fact',
        entityIds: ['event-darwin-air-raid-1942'],
        sourceIds: [doc.sources[0].id],
        locators: [{ sourceId: doc.sources[0].id, locatorType: 'page', locator: 'p. 12' }],
      });
      const result = validateDocument(doc, { coverage, stage: 'strategy', rootDir: REPO_ROOT });
      const errored = result.errors.filter((error) => /跨章节数值\/类别矛盾/.test(error));
      const warned = result.warnings.filter((warning) => /跨章节数值\/类别矛盾/.test(warning));
      if (errored.length === 0) throw new Error('门禁没有把跨章节矛盾作为错误报告');
      if (warned.length > 0) throw new Error('跨章节矛盾仍被降级为警告（transition 豁免未被移除）');
    },
  ]);
  tests.push([
    'ARCH-02 契约声明跨章节矛盾为严格规则且参考案例仅用于构造式负例',
    () => {
      const block = coverage.crossChapterContradiction;
      if (!isPlainObject(block)) throw new Error('coverage.crossChapterContradiction 缺失');
      if (block.enforcement !== 'strict') {
        throw new Error(`crossChapterContradiction.enforcement 必须为 'strict'，实际 ${JSON.stringify(block.enforcement)}`);
      }
      if (!/darwin/i.test(String(block.referenceCase || ''))) throw new Error('必须声明达尔文参考案例');
      if (block.referenceCaseIsConstructedOnly !== true) {
        throw new Error('必须声明参考案例只用于构造式负例（不得声称矛盾真实存在）');
      }
    },
  ]);
  tests.push([
    '航线未标示意被拒绝',
    () =>
      expectErrors(
        'route schematic',
        (() => {
          const doc = clone(base);
          doc.battles[0].phases[0].routes[0].schematic = false;
          return doc;
        })(),
        coverage,
        /schematic|必须明确标记|必须等于 true/,
      ),
  ]);
  tests.push([
    '数字 claim 无来源定位被拒绝',
    () =>
      expectErrors(
        'unlocated numeric claim',
        (() => {
          const doc = clone(base);
          doc.claims.push({
            id: 'claim-fixture-unlocated-number',
            text: '1941年12月7日发生了一次没有定位的数字断言。',
            claimType: 'fact',
            entityIds: [doc.events[0].id],
            sourceIds: [doc.sources[0].id],
            locators: [],
          });
          return doc;
        })(),
        coverage,
        /最少|至少需要 1|claim|定位/,
      ),
  ]);
  tests.push([
    '无效媒体许可被拒绝',
    () =>
      expectErrors(
        'invalid license',
        (() => {
          const doc = clone(base);
          doc.media.push({
            id: 'media-fixture-invalid-license',
            title: '合成测试素材',
            mediaType: 'map',
            path: 'public/media/fixture/invalid.png',
            author: '测试作者',
            license: 'all-rights-reserved',
            rightsStatement: '这是用于自测的无效许可声明，不应被发布。',
            sourceId: doc.sources[0].id,
            creditLine: '合成测试素材，不得发布。',
            alt: '合成测试地图，不代表任何真实历史地理。',
            caption: '合成测试地图，不对应真实历史。',
            articleIds: [coverage.keyArticleIds[0]],
          });
          return doc;
        })(),
        coverage,
        /license|许可/,
      ),
  ]);
  tests.push([
    '空泛 Questions 被拒绝',
    () =>
      expectErrors(
        'weak question',
        (() => {
          const doc = clone(base);
          doc.questions[0].answer = '因为很多原因。';
          return doc;
        })(),
        coverage,
        /回答|答案/,
      ),
  ]);
  tests.push([
    '地点缺现代名被拒绝',
    () =>
      expectErrors(
        'missing modernName',
        (() => {
          const doc = clone(base);
          delete doc.places[0].modernName;
          return doc;
        })(),
        coverage,
        /modernName|缺少必填字段/,
      ),
  ]);
  tests.push([
    '事件日期越界被拒绝',
    () =>
      expectErrors(
        'out of range date',
        (() => {
          const doc = clone(base);
          doc.events[0].startDate = '1943-01-01';
          doc.events[0].endDate = '1943-02-01';
          return doc;
        })(),
        coverage,
        /超出允许范围|1943/,
      ),
  ]);
  tests.push([
    '泛化来源定位被拒绝',
    () =>
      expectErrors(
        'generic locator',
        (() => {
          const doc = clone(base);
          doc.claims[0].locators[0].locator = '整个网页';
          return doc;
        })(),
        coverage,
        /定位不够精确/,
      ),
  ]);
  tests.push([
    'full 阶段不能用 fixtureOnly 与部分覆盖绕过',
    () => expectErrors('bypass full', base, coverage, /fixtureOnly|缺少重点文章|缺少历史部分问题/, { stage: 'full' }),
  ]);
  tests.push([
    '部分阶段允许未来覆盖缺失但拒绝已存在的断链',
    () => {
      const doc = clone(base);
      // strategy 阶段下，未来阶段的重点文章缺失是允许的（fixture 本就没有）。
      const ok = validateDocument(doc, { coverage, stage: 'strategy', rootDir: REPO_ROOT });
      if (ok.errors.length > 0) {
        throw new Error(`strategy 阶段不应因未来覆盖缺失而失败：\n${ok.errors.slice(0, 5).join('\n')}`);
      }
      // 但已存在实体的断链在部分阶段仍然是错误。
      const brokenDoc = clone(doc);
      brokenDoc.events[0].claimIds.push('claim-not-delivered');
      const broken = validateDocument(brokenDoc, { coverage, stage: 'strategy', rootDir: REPO_ROOT });
      if (broken.errors.length === 0) throw new Error('部分阶段放过了已存在实体的断链');
      if (!broken.errors.some((error) => /claim-not-delivered/.test(error))) {
        throw new Error(`断链没有被指出：${broken.errors.slice(0, 5).join('; ')}`);
      }
    },
  ]);
  tests.push([
    '部分阶段不能降低已有实体的深度要求',
    () => {
      const doc = clone(base);
      // 把 part 1 导读压成 2 节；即使 strategy 阶段也必须拒绝，因为导读是 strategy 的重点文章。
      doc.events[0].article = doc.events[0].article.slice(0, 2);
      const result = validateDocument(doc, { coverage, stage: 'strategy', rootDir: REPO_ROOT });
      if (result.errors.length === 0) throw new Error('部分阶段放过了重点导读的深度不足');
      if (!result.errors.some((error) => /event-overview-part-1-why-war|导读/.test(error))) {
        throw new Error(`深度不足没有被指出：${result.errors.slice(0, 5).join('; ')}`);
      }
    },
  ]);
  tests.push([
    '后续阶段的重点文章一旦存在就必须满足完整深度',
    () => {
      const doc = clone(base);
      // 造一篇“半成品”的未来阶段重点战役：存在但深度不足。
      const halfBattle = clone(synthetic.battle);
      halfBattle.id = 'battle-pearl-harbor';
      halfBattle.title = '合成半成品珍珠港';
      halfBattle.phases = [];
      for (const key of SECTION_KEYS) {
        if (key !== 'course') delete halfBattle.sections[key];
      }
      doc.battles = [halfBattle];
      const result = validateDocument(doc, { coverage, stage: 'strategy', rootDir: REPO_ROOT });
      if (result.errors.length === 0) throw new Error('未来阶段的半成品重点战役被放过');
      if (!result.errors.some((error) => /battle-pearl-harbor/.test(error))) {
        throw new Error(`半成品战役没有被指出：${result.errors.slice(0, 8).join('; ')}`);
      }
    },
  ]);
  tests.push([
    '阶段顺序单调：每提升一级都包含上一级的全部要求',
    () => {
      for (let index = 1; index < STAGE_IDS.length; index += 1) {
        const previous = coverage.stages[index - 1].requiredQuestionParts;
        const current = coverage.stages[index].requiredQuestionParts;
        for (const part of previous) {
          if (!current.includes(part)) throw new Error(`阶段 ${STAGE_IDS[index]} 丢失了 ${STAGE_IDS[index - 1]} 的问题部分 ${part}`);
        }
      }
      const reachedStages = new Set(coverage.keyArticles.map((entry) => entry.stage));
      for (const stage of STAGE_IDS.slice(0, -1)) {
        if (!reachedStages.has(stage)) throw new Error(`没有任何重点文章在 ${stage} 阶段交付，阶段门禁形同虚设`);
      }
    },
  ]);
  tests.push([
    '"暂时不做 --media" 不能被当成通过，CLI 会明确提示',
    () => {
      // 允许以不含 --media 的 full 验证跑结构，但输出必须提示素材门禁未运行。
      const { options } = parseCli(['--stage', 'full']);
      if (options.media) throw new Error('未请求 --media 却被标记为已运行素材门禁');
      if (options.stage !== 'full') throw new Error('默认阶段不是 full');
    },
  ]);
  tests.push([
    '关闭 fixtureOnly 也不能绕过 full 覆盖',
    () => {
      const doc = clone(base);
      doc.fixtureOnly = false;
      return expectErrors('bypass full coverage', doc, coverage, /缺少重点文章|缺少必需事件|缺少至少一个实质性/, { stage: 'full' });
    },
  ]);
  tests.push([
    '--media 隐含 full',
    () => {
      const { options, errors } = parseCli(['--media', '--stage', 'coral']);
      if (errors.length > 0) throw new Error(errors.join('; '));
      if (options.stage !== 'full') throw new Error(`--media 没有把阶段提升为 full，实际 ${options.stage}`);
      if (options.mediaImpliedFull !== true) throw new Error('没有记录 --media 隐含 full');
    },
  ]);
  tests.push([
    '媒体路径缺失被拒绝',
    () => {
      // D4：使用纯内存文件系统，不创建临时目录、不写工作区。
      const memoryFs = createMemoryFileSystem();
      const root = '/virtual-root';
      const good = resolveMediaPath(root, 'public/media/selftest/ok.svg');
      if (!good.filePath) throw new Error('合法路径被拒绝');

      memoryFs.set(good.portableKey, '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
      if (!memoryFs.exists(good.portableKey)) throw new Error('内存文件系统中素材文件未登记');
      if (memoryFs.stat(good.portableKey).size === 0) throw new Error('内存素材大小计算错误');

      const bad = resolveMediaPath(root, 'public/media/../secret.png');
      if (!bad.error) throw new Error('路径穿越未被拒绝');
      const outside = resolveMediaPath(root, 'assets/outside.png');
      if (!outside.error) throw new Error('public/media 之外的路径未被拒绝');

      // 真正走一次 --media 的文件存在性检查：缺失文件必须报错，存在文件必须通过。
      const missingDoc = clone(base);
      missingDoc.fixtureOnly = false;
      missingDoc.media = [
        {
          id: 'media-selftest-missing',
          title: '合成测试素材（缺失文件）',
          mediaType: 'map',
          path: 'public/media/selftest/definitely-missing.svg',
          author: '验证器自测',
          license: 'original-work',
          rightsStatement: '验证器自测使用的原创示意图，不发布，不含真实历史主张。',
          sourceId: missingDoc.sources[0].id,
          creditLine: '验证器自测素材，不得发布。',
          alt: '验证器自测用合成地图，不代表真实地理。',
          caption: '验证器自测用合成地图，不对应真实历史。',
          articleIds: [coverage.keyArticleIds[0]],
        },
      ];
      const missingResult = validateDocument(missingDoc, {
        coverage,
        stage: 'strategy',
        rootDir: root,
        media: true,
        fileSystem: memoryFs,
      });
      if (!missingResult.errors.some((error) => /素材文件不存在/.test(error))) {
        throw new Error(`内存文件系统下缺失素材未被检出：${missingResult.errors.slice(0, 5).join('; ')}`);
      }

      const presentDoc = clone(missingDoc);
      presentDoc.media[0].path = 'public/media/selftest/ok.svg';
      const presentResult = validateDocument(presentDoc, {
        coverage,
        stage: 'strategy',
        rootDir: root,
        media: true,
        fileSystem: memoryFs,
      });
      if (presentResult.errors.some((error) => /素材文件不存在|素材文件为空|无法读取素材文件/.test(error))) {
        throw new Error(`内存文件系统下已登记素材被误判为缺失：${presentResult.errors.slice(0, 5).join('; ')}`);
      }
    },
  ]);
  tests.push([
    '重点战役阶段缺情报/决策/后果的负例仍可解析',
    () => {
      const doc = clone(base);
      doc.battles[0].phases[0].knownEnemy.japan = '';
      doc.battles[0].phases[0].decision.allies = '';
      doc.battles[0].phases[0].consequence.japan = '';
      expectErrors('phase semantic empties', doc, coverage, /过短|至少/);
    },
  ]);
  tests.push([
    '媒体精确集合正例通过，缺项被拒绝',
    () => {
      const customCoverage = {
        schemaVersion: '1.0.0',
        stageOrder: STAGE_IDS,
        stages: [{ id: 'full', requiredQuestionParts: ['part-1-why-war'] }],
        keyArticleIds: [coverage.keyArticleIds[0]],
        requiredMediaTypes: { [coverage.keyArticleIds[0]]: ['map'] },
        keyArticles: [
          {
            id: coverage.keyArticleIds[0],
            kind: 'part-overview',
            entityType: 'event',
            stage: 'full',
            minimumDepth: { articleSections: 4, hanChars: 600, sourceIds: 3, claimIds: 3, placeIds: 2 },
            requiredArticleHeadings: ['日本扩张与资源依赖', '美国禁运与战略困境', '为什么选择袭击珍珠港', '美国为何没有及时防范'],
          },
        ],
        requiredEvents: [],
        battleSectionKeys: coverage.battleSectionKeys,
        battleSectionMinHanChars: 160,
        questionMinimumAnswerHanChars: 160,
        questionMinimumEntityRefs: 2,
        finalGate: { stage: 'full' },
      };
      // D4：纯内存文件系统，不创建临时目录。
      const memoryFs = createMemoryFileSystem();
      const root = '/virtual-media-gate-root';

      const doc = clone(base);
      doc.fixtureOnly = false;
      // ARCH-02 R4：素材现在来自注册表（mediaRows），history.json 不再持有 media 条目。
      const registryRows = [
        {
          id: 'media-fixture-selftest-map',
          title: '合成测试地图',
          mediaType: 'map',
          path: 'public/media/fixture/selftest-map.svg',
          author: '验证器自测',
          license: 'original-work',
          rightsStatement: '验证器自测生成的原创示意图，不发布，不包含真实历史主张。',
          sourceId: doc.sources[0].id,
          creditLine: '验证器自测素材，不得发布。',
          alt: '验证器自测用合成地图，不代表真实地理。',
          caption: '验证器自测用合成地图，不对应真实历史。',
          articleIds: [customCoverage.keyArticleIds[0]],
          width: 800,
          height: 600,
        },
      ];
      delete doc.media; // 迁移后 history.json 不含该字段
      const resolvedMedia = resolveMediaPath(root, 'public/media/fixture/selftest-map.svg');
      if (!resolvedMedia.portableKey) throw new Error('媒体便携键解析失败');
      memoryFs.set(
        resolvedMedia.portableKey,
        '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"></svg>',
      );

      const result = validateDocument(doc, {
        coverage: customCoverage,
        stage: 'full',
        media: true,
        mediaRows: registryRows,
        rootDir: root,
        fileSystem: memoryFs,
      });
      if (result.errors.length > 0) {
        throw new Error(`媒体精确集合正例失败：\n${result.errors.slice(0, 8).join('\n')}`);
      }
      const failed = validateDocument(clone(doc), {
        coverage: customCoverage,
        stage: 'full',
        media: true,
        mediaRows: [],
        rootDir: root,
        fileSystem: memoryFs,
      });
      if (!failed.errors.some((error) => /media|素材/.test(error))) {
        throw new Error('媒体缺项没有被拒绝');
      }
    },
  ]);
  tests.push([
    '自测全程不依赖可写临时目录（D4）',
    () => {
      // 断言自测代码路径与验证器默认路径都不要求写权限：
      // 1) 内存文件系统本身可读写且完全在内存中；
      // 2) 验证器在只读模式（不传 --media 文件检查所需之外的写操作）不会创建文件。
      const memoryFs = createMemoryFileSystem();
      memoryFs.set('public/media/x.svg', '<svg/>');
      if (!memoryFs.exists('public/media/x.svg')) throw new Error('内存文件系统读取失败');
      if (memoryFs.exists('public/media/missing.svg')) throw new Error('内存文件系统误报存在');
      if (typeof REAL_FILE_SYSTEM.readText !== 'function') throw new Error('真实文件系统层缺少 readText');
      // 真实文件系统层必须只暴露读接口，杜绝自测期写入磁盘。
      const writeyKeys = Object.keys(REAL_FILE_SYSTEM).filter((key) => /write|mkdtemp|mkdir|rm|unlink/i.test(key));
      if (writeyKeys.length > 0) throw new Error(`真实文件系统层暴露了写接口：${writeyKeys.join(', ')}`);
    },
  ]);

  tests.push([
    'ARCH-02 R5 早期战役夹具含香港（合规）与达尔文（迁移目标）且十键齐全',
    () => {
      const earlyPath = path.join(REPO_ROOT, 'contracts', 'fixtures', 'valid-early-campaign.json');
      if (!fs.existsSync(earlyPath)) throw new Error(`早期战役夹具缺失：${earlyPath}`);
      const earlyDoc = readJson(earlyPath, 'valid-early-campaign.json');
      if (earlyDoc.fixtureOnly !== true) throw new Error('早期战役夹具必须 fixtureOnly=true');
      const ids = (earlyDoc.events || []).map((e) => e && e.id);
      if (!ids.includes('event-hong-kong-1941')) throw new Error(`缺少合规早期战役 event-hong-kong-1941：${ids.join(', ')}`);
      if (!ids.includes('event-darwin-air-raid-1942')) throw new Error(`缺少迁移目标 event-darwin-air-raid-1942：${ids.join(', ')}`);
      for (const event of earlyDoc.events) {
        if (!isPlainObject(event.analysisProfiles)) throw new Error(`${event.id}: 缺少 analysisProfiles 迁移结构`);
        for (const key of ANALYSIS_PROFILE_KEYS) {
          if (!isPlainObject(event.analysisProfiles[key])) throw new Error(`${event.id}: analysisProfiles 缺少 '${key}'`);
        }
        if (!isNonEmptyString(event.researchStatus)) throw new Error(`${event.id}: 缺少 researchStatus`);
      }
      const result = validateDocument(earlyDoc, { coverage, stage: 'background', rootDir: REPO_ROOT });
      const owned = result.errors.filter(
        (error) =>
          /analysisProfiles/.test(error) ||
          /researchStatus/.test(error) ||
          /不允许的字段/.test(error) ||
          /缺少必填字段/.test(error),
      );
      if (owned.length > 0) throw new Error(`早期战役夹具有结构错误：${owned.slice(0, 6).join(' | ')}`);
    },
  ]);

  // --- D7: 自测项数漂移检查（纯内存；真实文档同步由 --check-contracts 负责）---
  // F1 修复：--self-test 不再读取 docs/。这里只验证 selfTestCountDriftErrors 这个
  // **纯函数**在注入的内存文件系统上的行为；真实 coverage.md/README 的同步检查
  // 放在 --check-contracts（它本来就需要读取文档）。
  const expectedTotal = tests.length + 1;
  tests.push([
    `D7 文档项数漂移检查在内存文件系统上生效（应为 ${expectedTotal} 项，真实文档同步由 --check-contracts 校验）`,
    () => {
      const cleanFs = createMemoryFileSystem();
      cleanFs.set(COVERAGE_MD_PATH, `覆盖 **${expectedTotal}** 项真实正例/负例/边界\n${SELF_TEST_COUNT_MARKER}${expectedTotal}\n`);
      cleanFs.set(CONTRACTS_README_PATH, `含 ${expectedTotal} 项自测`);
      const cleanErrors = selfTestCountDriftErrors(expectedTotal, cleanFs);
      if (cleanErrors.length > 0) throw new Error(`一致的声明被误判：${cleanErrors.join('; ')}`);
      // 反向自证：把一个错误的数字喂进同一个检查，必须被识别出来。
      const fakeDoc = `覆盖 **${expectedTotal + 1}** 项真实正例/负例/边界\n${SELF_TEST_COUNT_MARKER}${expectedTotal}\n`;
      const memoryFs = createMemoryFileSystem();
      memoryFs.set(COVERAGE_MD_PATH, fakeDoc);
      memoryFs.set(CONTRACTS_README_PATH, '无声明');
      const fakeErrors = selfTestCountDriftErrors(expectedTotal, memoryFs);
      if (fakeErrors.length === 0) {
        throw new Error('漂移检查对错误数字没有反应（检查本身失效）');
      }
      const missingMarkerFs = createMemoryFileSystem();
      missingMarkerFs.set(COVERAGE_MD_PATH, '没有任何声明');
      missingMarkerFs.set(CONTRACTS_README_PATH, '无声明');
      if (selfTestCountDriftErrors(expectedTotal, missingMarkerFs).length === 0) {
        throw new Error('缺少 canonical 声明没有被发现');
      }
    },
  ]);


  return tests;
}

function runSelfTests() {
  const tests = buildSelfTests();

  let passed = 0;
  const failures = [];
  console.log('DSH 内容验证器自测');
  console.log(`fixture：${FIXTURE_PATH}`);
  console.log(`coverage：${COVERAGE_PATH}`);
  console.log('');
  for (const [name, run] of tests) {
    try {
      run();
      passed += 1;
      console.log(`PASS  ${name}`);
    } catch (error) {
      failures.push({ name, error });
      console.log(`FAIL  ${name}`);
      console.log(`      ${String(error.message).split('\n').join('\n      ')}`);
    }
  }
  console.log('');
  console.log(`自测结果：${passed}/${tests.length} 通过`);
  if (failures.length > 0) {
    console.log('自测失败项：');
    for (const failure of failures) console.log(`- ${failure.name}: ${failure.error.message}`);
    return false;
  }
  console.log('注意：自测证明结构门禁可执行；它不证明历史准确性、可读性或素材授权已通过人工审查。');
  return true;
}

// ---------------------------------------------------------------------------
// CLI 入口
// ---------------------------------------------------------------------------

async function main() {
  const { options, errors: argErrors } = parseCli(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return 0;
  }
  if (argErrors.length > 0) {
    for (const error of argErrors) console.error(`参数错误：${error}`);
    console.error('使用 --help 查看用法。');
    return 2;
  }
  if (options.selfTest) {
    return runSelfTests() ? 0 : 1;
  }
  if (options.checkContracts) {
    return runContractChecks() ? 0 : 1;
  }

  let coverage;
  try {
    coverage = loadCoverageOrThrow();
  } catch (error) {
    console.error(String(error.message));
    return 2;
  }

  const rootDir = path.resolve(options.root || REPO_ROOT);
  const filePath = path.resolve(options.file || path.join(rootDir, 'content', 'history.json'));

  // 先声明 --media 隐含 full，再检查文件；否则文件缺失时读者看不到阶段语义。
  if (options.mediaImpliedFull) {
    console.log(`提示：--media 隐含 --stage full（忽略请求的 ${options.requestedStage} 阶段）；素材门禁不允许部分阶段绕过。`);
  } else if (options.media && options.stage === 'full') {
    console.log('提示：--media 隐含 --stage full；素材门禁只能在最终全量阶段执行。');
  }

  if (!fs.existsSync(filePath)) {
    if (options.media) {
      for (const line of mediaInputMissingMessages('history', filePath)) console.error(line);
    } else {
      console.error(`内容文件不存在：${filePath}`);
    }
    console.error('契约任务允许 content/history.json 尚未交付；请运行下面任一独立检查：');
    console.error('  node scripts/validate-content.mjs --self-test');
    console.error('  node scripts/validate-content.mjs --check-contracts');
    return 1;
  }
  let doc;
  try {
    doc = readJson(filePath, filePath);
  } catch (error) {
    console.error(String(error.message));
    return 2;
  }

  // --- ARCH-02 R4：--media 额外读取 content/media.json 注册表 ---
  // 注意：--stage 门禁**不**因 media.json 缺失而失败；只有 --media 才要求它存在。
  let mediaRows;
  if (options.media) {
    const mediaRegistryPath = path.resolve(options.mediaFile || path.join(rootDir, 'content', 'media.json'));
    if (!fs.existsSync(mediaRegistryPath)) {
      for (const line of mediaInputMissingMessages('media', mediaRegistryPath)) console.error(line);
      return 1;
    }
    let registry;
    try {
      registry = readJson(mediaRegistryPath, mediaRegistryPath);
    } catch (error) {
      console.error(`[media] 素材注册表无法解析：${error.message}`);
      return 2;
    }
    const registryErrors = validateMediaRegistry(registry, coverage);
    if (registryErrors.length > 0) {
      console.error('[media] 素材注册表违反契约（content/media.json）：');
      for (const error of registryErrors) console.error(`  - ${error}`);
      return 1;
    }
    mediaRows = registry.media;
    console.log(`素材注册表：content/media.json（${mediaRows.length} 个条目）`);
  }


  const result = validateDocument(doc, {
    coverage,
    stage: options.stage,
    media: options.media,
    mediaRows,
    rootDir,
  });
  const ok = printResult(result, {
    file: filePath,
    stage: options.stage,
    media: options.media,
    rootDir,
  });
  return ok ? 0 : 1;
}

// ARCH-02 attempt 3：仅当脚本被直接执行时才跑 main()。
// 被 import 时（自测探针、外部仪表化分析）不自动执行，便于对真实内容做阶段对比。
const IS_DIRECT_RUN = (() => {
  try {
    return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return true;
  }
})();

if (IS_DIRECT_RUN) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(`验证器运行错误：${error.stack || error.message}`);
      process.exitCode = 2;
    });
}
