/**
 * Hash 路由
 *
 * 为什么用 hash：工单要求「GitHub Pages /history_pacific_war/ 子路径与 hash 路由可用」。
 * GitHub Pages 是静态托管，没有服务器端 rewrite；只有 hash 路由才能在
 * `/history_pacific_war/#/battles/battle-midway` 这样的深链上直接打开而无需 404 回退。
 *
 * 路由表（全部是六入口内的视图，不存在孤立页面）：
 *   #/                      → 总览（六入口索引）
 *   #/timeline[/<eventId>][?date=YYYY-MM-DD]      ← 可选日期筛选（MAP-01）
 *   #/battles[/<battleId>]
 *   #/people[/<personId>]
 *   #/atlas[/<placeId>][?battle=<battleId>&phase=<phaseId>]  ← 深链定位战役阶段（MAP-01）
 *   #/concepts[/<conceptId>]
 *   #/questions[/<questionId>]
 *   #/search?q=<query>
 *   #/sources[/<sourceId>]   ← 证据总表：从任意 claim/locator 跳转过来
 *
 * 链接生成一律走 buildHref()，绝不手写 URL，保证 base 子路径无关。
 */

export const VIEWS = ['overview', 'timeline', 'battles', 'people', 'atlas', 'concepts', 'questions', 'search', 'sources', 'midway'] as const;

export type ViewId = (typeof VIEWS)[number];

export interface Route {
  view: ViewId;
  /** 详情视图中的实体/问题/来源 ID；列表视图为 null。 */
  id: string | null;
  /** #/search?q=... 的查询词。 */
  query: string;
  /** 可选：#/atlas?battle=<battleId> —— 地图要定位的战役（MAP-01 深链）。 */
  battle?: string;
  /** 可选：#/atlas?...&phase=<phaseId> —— 地图要定位的阶段（MAP-01 深链）。 */
  phase?: string;
  /** 可选：#/timeline?date=YYYY-MM-DD —— 时间线日期筛选（MAP-01）。 */
  date?: string;
}

export const DEFAULT_ROUTE: Route = { view: 'overview', id: null, query: '' };

export function isViewId(value: string): value is ViewId {
  return (VIEWS as readonly string[]).includes(value);
}

/**
 * 解析 `location.hash`。对任何畸形输入都返回安全的路由（不抛异常），
 * 因为读者可能手改地址栏或使用旧链接。
 */
export function parseRoute(hash: string): Route {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (raw.length === 0 || raw === '/') return DEFAULT_ROUTE;
  const [pathPart = '', searchPart = ''] = raw.split('?', 2);
  const segments = pathPart.split('/').filter((segment) => segment.length > 0);
  const [viewSegment, ...rest] = segments;
  if (!viewSegment) return DEFAULT_ROUTE;
  let view = decodeSegment(viewSegment);
  const params = new URLSearchParams(searchPart);
  const extras = routeExtras(params);
  if (!isViewId(view)) return { ...DEFAULT_ROUTE, ...extras };
  const id = rest.length > 0 ? decodeSegment(rest.join('/')) : null;
  const query = params.get('q') ?? '';
  // 列表视图不接受 id，保持 URL 与视图一致。
  const detailViews: ViewId[] = ['timeline', 'battles', 'people', 'atlas', 'concepts', 'questions', 'sources'];
  if (id !== null && !detailViews.includes(view)) {
    return { view, id: null, query, ...extras };
  }
  return { view, id: id === '' ? null : id, query, ...extras };
}

/** 查询串里 MAP-01 用到的可选参数（空串按「未提供」处理）。 */
function routeExtras(params: URLSearchParams): Pick<Route, 'battle' | 'phase' | 'date'> {
  const battle = params.get('battle') || undefined;
  const phase = params.get('phase') || undefined;
  const date = params.get('date') || undefined;
  return { battle, phase, date };
}


function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export interface HrefOptions {
  id?: string | null;
  query?: string;
  /** MAP-01：地图深链要定位的战役。 */
  battle?: string | null;
  /** MAP-01：地图深链要定位的阶段。 */
  phase?: string | null;
  /** MAP-01：时间线日期筛选。 */
  date?: string | null;
}

/**
 * 生成站内链接（只返回 hash 部分，因此与 base 子路径无关）。
 * 用 `<a href="#/timeline/...">` 即可让浏览器原生处理历史记录，无需 JS 拦截。
 */
export function buildHref(view: ViewId, options: HrefOptions = {}): string {
  const { id, query, battle, phase, date } = options;
  let href = view === 'overview' ? '#/' : `#/${view}`;
  if (id) href += `/${encodeURIComponent(id)}`;
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (battle) params.set('battle', battle);
  if (phase) params.set('phase', phase);
  if (date) params.set('date', date);
  const searchPart = params.toString();
  if (searchPart) href += `?${searchPart}`;
  return href;
}

/** 链接一个实体：按实体类型选择所属入口。 */
export function hrefForEntity(entityId: string, type: EntityTypeForHref): string {
  return buildHref(entityView(type), { id: entityId });
}

export type EntityTypeForHref = 'event' | 'battle' | 'person' | 'place' | 'concept';

export function entityView(type: EntityTypeForHref): ViewId {
  switch (type) {
    case 'event':
      return 'timeline';
    case 'battle':
      return 'battles';
    case 'person':
      return 'people';
    case 'place':
      return 'atlas';
    case 'concept':
      return 'concepts';
  }
}

/**
 * 从任意实体 ID 前缀推断入口。契约 §3.1 固定了 ID 前缀，
 * 因此 `unit-*` / `equipment-*` 这类没有独立入口的实体，
 * 归入它们最接近的阅读路径（编制→战役，装备→知识专题）由调用方决定；
 * 本函数只处理有独立入口的五类。
 */
export function entityTypeFromId(id: string): EntityTypeForHref | null {
  if (id.startsWith('event-')) return 'event';
  if (id.startsWith('battle-')) return 'battle';
  if (id.startsWith('person-')) return 'person';
  if (id.startsWith('place-')) return 'place';
  if (id.startsWith('concept-')) return 'concept';
  return null;
}

/** 只返回 # 之后的部分；用于选中态比较，避免受 base 路径影响。 */
export function normalizeHash(hash: string): string {
  return hash.startsWith('#') ? hash.slice(1) : hash;
}

/** 当前路由是否等于给定视图（用于导航高亮）。 */
export function isActiveView(current: Route, view: ViewId): boolean {
  if (view === 'overview') return current.view === 'overview';
  return current.view === view;
}
