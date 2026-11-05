/**
 * 内容加载器 —— 全站**唯一**的历史数据入口。
 *
 * 规则（契约 README §2、§9，工单 WEB-01）：
 * 1. 历史内容只来自 `content/history.json`，通过 Vite glob eager import 加载；
 * 2. `content/history.json` 由 HIST 模块交付，可能在构建 WEB-01 时**不存在** ——
 *    构建仍必须成功，并给出诚实的「未加载」状态；
 * 3. 绝不把示例/占位历史叙述写进代码；
 * 4. `fixtureOnly=true` 的数据是测试样本，必须显式标记，不能作为正式历史发布。
 *
 * 工程事实（已在 Vite 8.3.5 实测）：对不存在的目录做 `import.meta.glob` 不会失败，
 * 返回空对象 `{}`。因此缺失内容在构建期是「空集」而不是构建错误。
 *
 * MAP-01 attempt 2（post-merge check failure 修正）：glob 从 `../../content/*.json`
 * 收窄为**唯一内容源** `../../content/history.json`。原因：
 * - 站点运行时只消费 `content/history.json`（本文件 CONTENT_PATH，唯一数据入口）；
 * - 集成中新增的 `content/media.json` 属于媒体注册表（媒体门禁/其它任务用），
 *   站点不读取它，宽 glob 却会把它打进渲染 bundle（约 29 KB 死重量），
 *   并使验证器的渲染图把「未来任何新增 content/*.json」误判为异常模块；
 * - 收窄后：站点 bundle 只含业务模块 + 唯一内容源；新增内容文件不会被动进入渲染图。
 *   「内容缺失 → 诚实未加载状态」路径不变（glob 只匹配一个文件，缺失时仍返回 `{}`）。
 */

import type { ContentDocument } from '../data/types';

// 只打包站点真正使用的唯一内容源（不是 content/*.json：媒体注册表等由其它门禁消费）。
const CONTENT_GLOB = import.meta.glob('../../content/history.json') as Record<string, unknown>;

export const CONTENT_PATH = 'content/history.json';

export type ContentStatusKind =
  /** 正式内容，fixtureOnly=false */
  | 'available'
  /** 内容存在但被显式标记为测试样本 */
  | 'fixture'
  /** 内容文件尚未交付（HIST 模块未完成或尚未合入） */
  | 'missing'
  /** 内容文件存在但结构不符合契约根节点 */
  | 'invalid'
  /**
   * 内容模块正在异步加载中（例如构建产物把 JSON 拆成独立 chunk，
   * 或 loadContent 是从 Promise 形式调用的）。
   */
  | 'loading'
  /** 内容模块加载失败（网络/产物缺失/chunk 404） */
  | 'error';

export interface ContentIssue {
  message: string;
  /** 契约依据，便于读者/审查者定位 */
  contract: string;
}

export interface ContentState {
  status: ContentStatusKind;
  /** 仅在 available / fixture 时非空。 */
  doc: ContentDocument | null;
  issues: ContentIssue[];
  /** 该内容文件在 glob 中的实际键（调试与诊断用，不展示给读者历史信息）。 */
  sourceKey: string | null;
}

const ROOT_ARRAYS = [
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
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 只校验「根节点契约」：schemaVersion、fixtureOnly、11 个顶层数组。
 * 深层字段由 scripts/validate-content.mjs（契约验证器）负责；
 * UI 只做防御性降级，不重复实现 schema 校验。
 */
export function inspectDocument(raw: unknown): { doc: ContentDocument | null; issues: ContentIssue[] } {
  const issues: ContentIssue[] = [];
  if (!isPlainObject(raw)) {
    issues.push({ message: '内容根节点必须是 JSON 对象。', contract: 'contracts/content.schema.json#/type' });
    return { doc: null, issues };
  }
  if (typeof raw.schemaVersion !== 'string') {
    issues.push({ message: '缺少 schemaVersion 字段。', contract: 'contracts/README.md §2' });
  }
  if (typeof raw.fixtureOnly !== 'boolean') {
    issues.push({ message: '缺少 fixtureOnly 布尔字段（不得靠文件名猜测是否测试样本）。', contract: 'contracts/README.md §9.9' });
  }
  for (const key of ROOT_ARRAYS) {
    if (!Array.isArray(raw[key])) {
      issues.push({ message: `缺少顶层数组 ${key}。`, contract: 'contracts/content.schema.json 顶层数组' });
    }
  }
  if (issues.length > 0) return { doc: null, issues };
  return { doc: raw as unknown as ContentDocument, issues };
}

/**
 * 把 glob 的返回值归一化成契约根节点。
 *
 * 为什么需要：同一个 `import.meta.glob` 在不同构建形态下返回不同形状 ——
 * - 开发/测试（eager）：直接是解析好的 JSON 对象；
 * - 某些生产构建：可能被拆成独立 chunk，返回 **模块命名空间**
 *   （`{ default: {...}, events, battles, ... }`）或 `{ default: {...} }`。
 * 若不处理，就会把命名空间误判成「结构不符合契约」并在页面上显示为错误内容。
 * 这里逐层剥到真正的文档对象。
 */
export function unwrapGlobValue(value: unknown): unknown {
  let current = value;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!isPlainObject(current)) return current;
    const candidate = current as Record<string, unknown>;
    const isDocument = typeof candidate.schemaVersion === 'string' && Array.isArray(candidate.events);
    if (isDocument) return current;
    const next = candidate.default ?? candidate.doc ?? candidate.content;
    if (next === undefined || next === current) return current;
    current = next;
  }
  return current;
}

/** glob 的条目可能是「对象」，也可能是「() => Promise<对象>」形式的惰性加载器。 */
function isLazyLoader(value: unknown): value is () => Promise<unknown> {
  return typeof value === 'function';
}

/** 同步读取内容状态（内容已内联在构建产物中时使用）。 */
export function loadContent(modules: Record<string, unknown> = CONTENT_GLOB): ContentState {
  const key = Object.keys(modules).find((candidate) => candidate.endsWith('/history.json')) ?? null;
  if (key === null) {
    return {
      status: 'missing',
      doc: null,
      issues: [
        {
          message: `${CONTENT_PATH} 尚未交付：本任务（WEB-01）只建立外壳与契约消费。`,
          contract: 'contracts/README.md §11（content/history.json 不存在）',
        },
      ],
      sourceKey: null,
    };
  }
  const raw = modules[key];
  if (isLazyLoader(raw)) {
    // 惰性加载：交给异步版本处理，这里先返回 loading，避免误判为 invalid。
    return { status: 'loading', doc: null, issues: [], sourceKey: key };
  }
  const { doc, issues } = inspectDocument(unwrapGlobValue(raw));
  if (doc === null) {
    return { status: 'invalid', doc: null, issues, sourceKey: key };
  }
  return {
    status: doc.fixtureOnly ? 'fixture' : 'available',
    doc,
    issues,
    sourceKey: key,
  };
}

/**
 * 异步读取内容状态：同时支持「已内联的对象」与「惰性/模块化加载」两种 glob 形态。
 * 站点在渲染前 await 它，因此既能显示 loading，也能在加载失败时诚实报错。
 */
export async function loadContentAsync(modules: Record<string, unknown> = CONTENT_GLOB): Promise<ContentState> {
  const key = Object.keys(modules).find((candidate) => candidate.endsWith('/history.json')) ?? null;
  if (key === null) return loadContent({});
  const raw = modules[key];
  if (!isLazyLoader(raw)) return loadContent(modules);
  try {
    const loaded: unknown = await raw();
    const { doc, issues } = inspectDocument(unwrapGlobValue(loaded));
    if (doc === null) return { status: 'invalid', doc: null, issues, sourceKey: key };
    return { status: doc.fixtureOnly ? 'fixture' : 'available', doc, issues, sourceKey: key };
  } catch (error) {
    return {
      status: 'error',
      doc: null,
      issues: [
        {
          message: `内容模块加载失败：${(error as Error)?.message ?? String(error)}`,
          contract: 'contracts/README.md §2',
        },
      ],
      sourceKey: key,
    };
  }
}


/** 测试用：把任意 JSON 注入加载器，走完全相同的根节点契约检查。 */
export function loadContentFromText(text: string): ContentState {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch (error) {
    return {
      status: 'invalid',
      doc: null,
      issues: [
        {
          message: `内容文件不是合法 JSON：${(error as Error).message}`,
          contract: 'contracts/content.schema.json',
        },
      ],
      sourceKey: null,
    };
  }
  const { doc, issues } = inspectDocument(raw);
  if (doc === null) return { status: 'invalid', doc: null, issues, sourceKey: null };
  return { status: doc.fixtureOnly ? 'fixture' : 'available', doc, issues, sourceKey: null };
}

/** 空的内容集（未加载状态下的安全占位，不包含任何历史数据）。 */
export function emptyDocument(): ContentDocument {
  return {
    schemaVersion: '1.0.0',
    fixtureOnly: false,
    events: [],
    battles: [],
    people: [],
    places: [],
    units: [],
    equipment: [],
    concepts: [],
    sources: [],
    media: [],
    questions: [],
    claims: [],
  };
}
