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
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const SCHEMA_PATH = path.join(REPO_ROOT, 'contracts', 'content.schema.json');
const COVERAGE_PATH = path.join(REPO_ROOT, 'contracts', 'coverage.json');
const REQUIREMENTS_PATH = path.join(REPO_ROOT, 'contracts', 'requirements.json');
const FIXTURE_PATH = path.join(REPO_ROOT, 'contracts', 'fixtures', 'valid-min.json');

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

const CONTENT_SCHEMA = readJson(SCHEMA_PATH, 'content.schema.json');

// ---------------------------------------------------------------------------
// 基础工具
// ---------------------------------------------------------------------------

function readJson(filePath, label = filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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
  if (!Array.isArray(sections)) return { sections: 0, han: 0, headings: [] };
  let totalHan = 0;
  const headings = [];
  const seen = new Set();
  sections.forEach((section, index) => {
    const sectionPointer = `${pointer}[${index}]`;
    if (!isPlainObject(section)) return;
    const heading = comparableText(section.heading);
    if (seen.has(heading)) addError(errors, `${sectionPointer}.heading: 标题重复 '${heading}'`);
    seen.add(heading);
    headings.push(heading);
    const sectionHan = hanCount(section.body);
    totalHan += sectionHan;
    if (sectionHan < minPerSectionHan) {
      addError(errors, `${sectionPointer}.body: 只有 ${sectionHan} 个汉字，单节至少 ${minPerSectionHan} 个`);
    }
    checkEvidence(section, sectionPointer, maps, errors);
  });
  return { sections: sections.length, han: totalHan, headings };
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
  battle.phases.forEach((phase, phaseIndex) => {
    const phasePointer = `${pointer}.phases[${phaseIndex}]`;
    if (!isPlainObject(phase)) return;
    if (Number.isInteger(phase.sequence)) {
      if (sequences.has(phase.sequence)) addError(errors, `${phasePointer}.sequence: 阶段序号重复 ${phase.sequence}`);
      sequences.add(phase.sequence);
    }
    if (isPlainObject(phase.time) && isNonEmptyString(phase.time.start)) {
      if (!validDateTimeString(phase.time.start)) {
        addError(errors, `${phasePointer}.time.start: 不是带时区的有效 ISO 8601 时间`);
      } else {
        const phaseDate = phase.time.start.slice(0, 10);
        if (
          validDateString(battle.startDate) &&
          validDateString(battle.endDate) &&
          (phaseDate < battle.startDate || phaseDate > battle.endDate)
        ) {
          addError(errors, `${phasePointer}.time.start: 阶段日期 ${phaseDate} 不在战役 ${battle.startDate}–${battle.endDate} 范围内`);
        }
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
  const pointer = `$.media[${index}]`;
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
    const resolved = resolveMediaPath(options.rootDir, media.path);
    if (resolved.error) {
      addError(errors, `${pointer}.path: ${resolved.error}`);
    } else if (!fs.existsSync(resolved.filePath)) {
      addError(errors, `${pointer}.path: 素材文件不存在 ${media.path}`);
    } else {
      try {
        const stat = fs.statSync(resolved.filePath);
        if (!stat.isFile()) addError(errors, `${pointer}.path: 路径不是文件 ${media.path}`);
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
  return { filePath, mediaRoot };
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
    for (const requiredHeading of entry.requiredArticleHeadings || []) {
      if (!stats.headings.includes(requiredHeading)) addError(errors, `${pointer}: 缺少必需小节标题 '${requiredHeading}'`);
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
    keyDepthErrors(entry, entity, coverage, maps, errors);
  }

  for (const entry of coverage.requiredEvents) {
    const event = maps.events.get(entry.id);
    const reached = stageReached(stage, entry.stage);
    if (!event) {
      if (reached) addError(errors, `[coverage] 阶段 '${stage}' 缺少必需事件 ${entry.id}（应在 ${entry.stage} 交付）`);
      continue;
    }
    const expectedPartByStage = {
      strategy: 'part-1-why-war',
      background: 'part-3-expansion',
      pearl: 'part-2-pearl-harbor',
      coral: 'part-4-turning-point',
    };
    const expectedPart = expectedPartByStage[entry.stage];
    if (expectedPart && event.historicalPart !== expectedPart) {
      addError(errors, `[coverage] ${entry.id}: 历史部分应为 ${expectedPart}，实际 ${event.historicalPart}`);
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

function validateMediaGate(doc, maps, coverage, stage, options, errors) {
  if (stage !== 'full') addError(errors, '--media 必须隐含并执行 --stage full，不能以部分阶段验证素材门禁');
  const media = Array.isArray(doc.media) ? doc.media : [];
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
    if (isPlainObject(claim)) validateClaim(claim, index, errors, maps);
  }
  for (const [index, question] of (Array.isArray(doc.questions) ? doc.questions : []).entries()) {
    if (isPlainObject(question)) validateQuestion(question, index, errors, maps, coverage);
  }
  for (const [index, event] of (Array.isArray(doc.events) ? doc.events : []).entries()) {
    if (isPlainObject(event)) validateEvent(event, index, errors, maps);
  }
  for (const [index, battle] of (Array.isArray(doc.battles) ? doc.battles : []).entries()) {
    if (!isPlainObject(battle)) continue;
    const keyEntry = coverage.keyArticles.find((item) => item.id === battle.id) || null;
    validateBattle(battle, index, errors, maps, coverage, keyEntry);
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
  for (const [index, media] of (Array.isArray(doc.media) ? doc.media : []).entries()) {
    if (isPlainObject(media)) validateMedia(media, index, errors, maps, coverage, { media: options.media, rootDir });
  }

  validateCoverageGate(doc, maps, coverage, stage, errors);
  if (options.media) validateMediaGate(doc, maps, coverage, stage, options, errors);

  if (stage !== 'full' && doc.fixtureOnly === true) {
    warnings.push(`当前使用 fixtureOnly=true 的测试样本，仅可在 ${stage} 阶段做结构检查；不得作为交付内容。`);
  }

  return { errors: dedupeMessages(errors), warnings, stats };
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
 */
function requirementsFileErrors(requirementsPath = REQUIREMENTS_PATH) {
  const errors = [];
  let actual;
  try {
    actual = readJson(requirementsPath, 'requirements.json');
  } catch (error) {
    return [String(error.message)];
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
          display: '1942年6月4日约04:30（合成测试时间）',
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
  });
  if (result.errors.length === 0) throw new Error(`${name}: 预期失败，实际通过`);
  if (pattern && !result.errors.some((error) => pattern.test(error))) {
    throw new Error(`${name}: 未找到预期错误 ${pattern}；实际问题：\n${result.errors.slice(0, 8).join('\n')}`);
  }
  return result;
}

function runSelfTests() {
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
      const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-req-'));
      try {
        const mutated = clone(CANONICAL_REQUIREMENTS);
        mutated.push({ id: 'HIST-EXTRA', description: '工单没有的需求', scope: 'local' });
        const p1 = path.join(temp, 'extra.json');
        fs.writeFileSync(p1, JSON.stringify(mutated));
        if (requirementsFileErrors(p1).length === 0) throw new Error('多出条目没有被发现');

        const mutated2 = clone(CANONICAL_REQUIREMENTS);
        mutated2[0].description = '改写过的描述';
        const p2 = path.join(temp, 'rewritten.json');
        fs.writeFileSync(p2, JSON.stringify(mutated2));
        if (requirementsFileErrors(p2).length === 0) throw new Error('改写 description 没有被发现');

        const mutated3 = clone(CANONICAL_REQUIREMENTS);
        mutated3.pop();
        const p3 = path.join(temp, 'short.json');
        fs.writeFileSync(p3, JSON.stringify(mutated3));
        if (requirementsFileErrors(p3).length === 0) throw new Error('缺少条目没有被发现');

        const mutated4 = clone(CANONICAL_REQUIREMENTS);
        mutated4[5].scope = 'release';
        const p4 = path.join(temp, 'scope.json');
        fs.writeFileSync(p4, JSON.stringify(mutated4));
        if (requirementsFileErrors(p4).length === 0) throw new Error('改写 scope 没有被发现');
      } finally {
        fs.rmSync(temp, { recursive: true, force: true });
      }
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
    'TEAM-PILOT 证据存档存在且 planHash 与工单一致',
    () => {
      const evidencePath = path.join(REPO_ROOT, 'docs', 'research', 'team-pilot-evidence.json');
      if (!fs.existsSync(evidencePath)) throw new Error(`证据存档缺失：${evidencePath}`);
      const evidence = readJson(evidencePath, 'team-pilot-evidence.json');
      const bundle = evidence && evidence.bundle;
      if (!isPlainObject(bundle)) throw new Error('证据存档缺少 bundle');
      const expectedHash = 'a61d094a43b2c9242b92d257373c06e14b08d81be394a9c8c87ba937b4005a7c';
      if (bundle.planHash !== expectedHash) throw new Error(`planHash 不一致：${bundle.planHash}`);
      const org = bundle.organization;
      if (!isPlainObject(org) || !Array.isArray(org.agents) || org.agents.length !== 6) {
        throw new Error('组织证据中的 agents 应为 6 个');
      }
      for (const role of ['project-director', 'knowledge-lead', 'knowledge-architect', 'knowledge-developer', 'knowledge-content_creator', 'knowledge-tester']) {
        if (!org.agents.some((agent) => agent && agent.id === role)) throw new Error(`缺少 agent ${role}`);
      }
      const matrix = org.approvalMatrix;
      for (const key of ['dispatch', 'moduleAcceptance', 'professionalReview', 'integrationAndVerification', 'exceptions']) {
        if (!isPlainObject(matrix) || typeof matrix[key] !== 'string' || !matrix[key]) {
          throw new Error(`approvalMatrix 缺少 ${key}`);
        }
      }
      if (!isNonEmptyString(evidence._note)) throw new Error('证据存档缺少“非本模块成果”的免责说明');
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
      const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-content-media-'));
      try {
        const good = resolveMediaPath(tempRoot, 'public/media/selftest/ok.svg');
        if (!good.filePath) throw new Error('合法路径被拒绝');
        fs.mkdirSync(path.dirname(good.filePath), { recursive: true });
        fs.writeFileSync(good.filePath, '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
        if (!fs.existsSync(good.filePath)) throw new Error('素材文件未写入');
        const bad = resolveMediaPath(tempRoot, 'public/media/../secret.png');
        if (!bad.error) throw new Error('路径穿越未被拒绝');
        const outside = resolveMediaPath(tempRoot, 'assets/outside.png');
        if (!outside.error) throw new Error('public/media 之外的路径未被拒绝');
      } finally {
        fs.rmSync(tempRoot, { recursive: true, force: true });
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
      const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-content-media-gate-'));
      try {
        const doc = clone(base);
        doc.fixtureOnly = false;
        doc.media = [
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
        const mediaPath = path.join(tempRoot, 'public', 'media', 'fixture', 'selftest-map.svg');
        fs.mkdirSync(path.dirname(mediaPath), { recursive: true });
        fs.writeFileSync(mediaPath, '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"></svg>');
        const result = validateDocument(doc, { coverage: customCoverage, stage: 'full', media: true, rootDir: tempRoot });
        if (result.errors.length > 0) {
          throw new Error(`媒体精确集合正例失败：\n${result.errors.slice(0, 8).join('\n')}`);
        }
        const missing = clone(doc);
        missing.media = [];
        const failed = validateDocument(missing, { coverage: customCoverage, stage: 'full', media: true, rootDir: tempRoot });
        if (!failed.errors.some((error) => /media|素材/.test(error))) {
          throw new Error('媒体缺项没有被拒绝');
        }
      } finally {
        fs.rmSync(tempRoot, { recursive: true, force: true });
      }
    },
  ]);

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
    console.error(`内容文件不存在：${filePath}`);
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


  const result = validateDocument(doc, {
    coverage,
    stage: options.stage,
    media: options.media,
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

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(`验证器运行错误：${error.stack || error.message}`);
    process.exitCode = 2;
  });
