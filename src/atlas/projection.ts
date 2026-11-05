/**
 * Atlas 投影与视口数学 —— 纯函数，无 React / DOM 依赖，可直接单元测试。
 *
 * 设计约束（来自 contracts/README.md §4.2/§4.4 与 mountApi.ts 的硬性规则）：
 * - `places[].coordinates` 是**真实地理节点**，不是舰队位置；
 * - 阶段位置来自 `battle.phases[].positions[side]`，且 `schematic` 必须为 true；
 * - 地图必须离线可用，因此这里只用等距圆柱（equirectangular）投影自绘，
 *   不依赖任何瓦片服务、商业 Key 或外部地理数据。
 *
 * 为什么用等距圆柱：太平洋跨越东西半球与赤道，等距圆柱在纬度上会拉伸，
 * 但对「理解相对位置与航程方向」足够，且实现简单、完全可预测、无依赖。
 * 我们在界面上明确标注这是**示意性的等距圆柱投影**，不冒充精确测绘地图。
 */

import type { Coordinates, PlaceEntity, Side } from '../data/types';
import { SIDE_LABELS } from '../content/labels';

/** SVG 视口尺寸（用户单位）。宽高比约 16:9，便于阅读。 */
export const VIEW_WIDTH = 640;
export const VIEW_HEIGHT = 400;

/** 太平洋范围（含夏威夷至东南亚，及北至日本、南至珊瑚海）。 */
export interface GeoBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * 太平洋默认视野。
 *
 * 经度使用「东经为正、西经为负」的常规约定；从 -180（夏威夷以西）到 200
 * 会跨越 180° 经线。为避免跨线带来的坐标回绕问题，这里用 0..360 的展开经度：
 * 西经 -157.95 记为 202.05。`lngUnwrapped` 负责换算。
 */
export const PACIFIC_BOUNDS: GeoBounds = {
  minLat: -30,
  maxLat: 55,
  minLng: 90,
  maxLng: 250,
};

/** 把 -180..180 的经度换算到本投影使用的展开区间。 */
export function lngUnwrapped(lng: number): number {
  return lng < 0 ? lng + 360 : lng;
}

/** 计算一组地点的紧凑视野（带最小跨度，避免单点或同点导致除零）。 */
export function boundsForPlaces(places: readonly PlaceEntity[], paddingRatio = 0.18): GeoBounds {
  const usable = places.filter(
    (place) => place.coordinates && Number.isFinite(place.coordinates.lat) && Number.isFinite(place.coordinates.lng),
  );
  if (usable.length === 0) return { ...PACIFIC_BOUNDS };
  const lats = usable.map((place) => place.coordinates.lat);
  const lngs = usable.map((place) => lngUnwrapped(place.coordinates.lng));
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  // 最小跨度：至少 12° 纬度 / 16° 经度，避免几个近距离地点被放大到失去地理背景。
  const spanLat = Math.max(maxLat - minLat, 12);
  const spanLng = Math.max(maxLng - minLng, 16);
  const padLat = spanLat * paddingRatio;
  const padLng = spanLng * paddingRatio;
  return {
    minLat: Math.max(-85, minLat - padLat),
    maxLat: Math.min(85, maxLat + padLat),
    // 经度不夹紧到 360 之外：允许稍超出，投影仍单调
    minLng: minLng - padLng,
    maxLng: maxLng + padLng,
  };
}

export interface Projection {
  bounds: GeoBounds;
  width: number;
  height: number;
  /** 纬度方向每度对应的 user unit（x 方向由该值决定，保持等距圆柱的纵横比一致）。 */
  scale: number;
  /** 视口中心的展开经度。 */
  centerLng: number;
  centerLat: number;
}

/**
 * 建立投影。等距圆柱：x 与 y 使用同一个「每度像素」比例尺，
 * 因此经度跨度超出视口时会横向留白/裁切 —— 这是有意的：保住真实比例，
 * 不为了让内容填满而扭曲地理。
 */
export function createProjection(
  bounds: GeoBounds,
  width = VIEW_WIDTH,
  height = VIEW_HEIGHT,
): Projection {
  const spanLat = Math.max(1e-6, bounds.maxLat - bounds.minLat);
  const spanLng = Math.max(1e-6, bounds.maxLng - bounds.minLng);
  const scale = Math.min(width / spanLng, height / spanLat);
  return {
    bounds,
    width,
    height,
    scale,
    centerLng: (bounds.minLng + bounds.maxLng) / 2,
    centerLat: (bounds.minLat + bounds.maxLat) / 2,
  };
}

/** 地理坐标 → SVG 用户坐标（未应用缩放/平移）。 */
export function project(point: Coordinates, projection: Projection): { x: number; y: number } {
  const lng = lngUnwrapped(point.lng);
  const x = projection.width / 2 + (lng - projection.centerLng) * projection.scale;
  const y = projection.height / 2 - (point.lat - projection.centerLat) * projection.scale;
  return { x, y };
}

/**
 * SVG 用户坐标 → 地理坐标（用于键盘/触摸反查与测试）。
 *
 * 经度归一化：投影内部使用 0..360 的「展开经度」，这里统一归一到 **-180..180**
 * （与 `Coordinates` / 契约里的 `lng` 约定一致）。
 * 早期版本只做一次 `lng > 180 ? lng - 360`，当展开经度 > 540 时会返回 282.96
 * 这类非法经度，导致往返不一致（由 MAP-00 D2 的 fixture 往返测试发现）。
 */
export function unproject(x: number, y: number, projection: Projection): Coordinates {
  const lng = projection.centerLng + (x - projection.width / 2) / projection.scale;
  const lat = projection.centerLat - (y - projection.height / 2) / projection.scale;
  return { lat, lng: normalizeLngToSigned(lng) };
}

/** 把任意经度归一到 [-180, 180)。 */
export function normalizeLngToSigned(lng: number): number {
  const wrapped = ((lng % 360) + 360) % 360; // [0, 360)
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

/** 视图变换：缩放 + 平移（以未变换的 SVG 用户坐标为单位）。 */
export interface ViewTransform {
  /** 缩放倍数；1 = 视野全貌。 */
  zoom: number;
  /** 平移量（用户单位），先缩放后平移。 */
  tx: number;
  ty: number;
}

export const IDENTITY_TRANSFORM: ViewTransform = { zoom: 1, tx: 0, ty: 0 };

/** 缩放范围。上限避免放大到无意义的空白，下限即全貌。 */
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;
export const ZOOM_STEP = 1.5;

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return MIN_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/**
 * 把平移限制在「不把视野拉出画布过多」的范围内。
 * 允许少量越界（zoom=1 时居中），避免用户以为地图卡住。
 */
export function clampTransform(transform: ViewTransform, width = VIEW_WIDTH, height = VIEW_HEIGHT): ViewTransform {
  const zoom = clampZoom(transform.zoom);
  const maxTx = (width * (zoom - 1)) / 2;
  const maxTy = (height * (zoom - 1)) / 2;
  const clamp = (value: number, limit: number) => Math.min(limit, Math.max(-limit, Number.isFinite(value) ? value : 0));
  return { zoom, tx: clamp(transform.tx, maxTx), ty: clamp(transform.ty, maxTy) };
}

/** 以某个 SVG 用户坐标为中心缩放（滚轮/按钮/双指缩放都走这里）。 */
export function zoomAt(
  transform: ViewTransform,
  factor: number,
  focus: { x: number; y: number },
  width = VIEW_WIDTH,
  height = VIEW_HEIGHT,
): ViewTransform {
  const nextZoom = clampZoom(transform.zoom * factor);
  const applied = nextZoom / transform.zoom;
  // 保持 focus 点在屏幕上的位置不动：tx' = (tx - fx) * applied + fx
  const tx = (transform.tx - focus.x) * applied + focus.x;
  const ty = (transform.ty - focus.y) * applied + focus.y;
  return clampTransform({ zoom: nextZoom, tx, ty }, width, height);
}

export function panBy(
  transform: ViewTransform,
  dx: number,
  dy: number,
  width = VIEW_WIDTH,
  height = VIEW_HEIGHT,
): ViewTransform {
  return clampTransform({ ...transform, tx: transform.tx + dx, ty: transform.ty + dy }, width, height);
}

/** 生成 SVG transform 属性值。 */
export function svgTransform(transform: ViewTransform): string {
  return `translate(${transform.tx.toFixed(3)} ${transform.ty.toFixed(3)}) scale(${transform.zoom.toFixed(4)})`;
}

/** 屏幕（含缩放平移）坐标 → 未变换的用户坐标，用于指针事件的缩放焦点。 */
export function toUserSpace(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  transform: ViewTransform,
  width = VIEW_WIDTH,
  height = VIEW_HEIGHT,
): { x: number; y: number } {
  // 先换算到 SVG 用户坐标（viewBox 拉伸到元素大小）
  const sx = rect.width === 0 ? 0 : ((clientX - rect.left) / rect.width) * width;
  const sy = rect.height === 0 ? 0 : ((clientY - rect.top) / rect.height) * height;
  // 再反解变换：user = (screen - t) / zoom
  return { x: (sx - transform.tx) / transform.zoom, y: (sy - transform.ty) / transform.zoom };
}

/** 等距圆柱下 1° 纬度 ≈ 111.32 km；用于把 uncertaintyRadiusKm 换算成 SVG 半径。 */
export const KM_PER_DEGREE = 111.32;

export function uncertaintyRadius(radiusKm: number, projection: Projection): number {
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) return 0;
  return (radiusKm / KM_PER_DEGREE) * projection.scale;
}

/**
 * 比例尺：给定**屏幕**目标宽度与当前缩放，返回该宽度覆盖的公里数（等距圆柱，纬度比例）。
 *
 * MAP-01 attempt 3 修正：旧实现只按 zoom=1 计算，组件再错误地把公里数当 user unit 用。
 * 现在把 zoom 纳入计算（`zoom` 默认 1，兼容旧调用），供 scaleBarGeometry() 统一使用。
 */
export function scaleBarKm(targetPx: number, projection: Projection, zoom = 1): number {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const rawKm = (targetPx / (projection.scale * safeZoom)) * KM_PER_DEGREE;
  const nice = [50, 100, 200, 250, 500, 1000, 2000, 4000];
  return nice.reduce((best, candidate) => (Math.abs(candidate - rawKm) < Math.abs(best - rawKm) ? candidate : best), nice[0]!);
}

/** 比例尺几何：标签（km）与屏幕线段长度（user unit）**成对**返回，保证二者永远描述同一距离。 */
export interface ScaleBarGeometry {
  /** 比例尺代表的公里数（「好读」值：50/100/…/4000）。 */
  km: number;
  /** 屏幕上的线段长度（SVG user unit）。比例尺位于缩放组之外，故不再乘 zoom。 */
  screenLength: number;
  /** 计算所用的缩放（审计用）。 */
  zoom: number;
  /** 每公里对应的屏幕 user unit（含 zoom；只用于审计/断言，不用于渲染决策）。 */
  screenUnitsPerKm: number;
}

/**
 * 比例尺几何（MAP-01 attempt 3 修正）—— 线长与标签的**唯一**来源。
 *
 * 单位链（比例尺位于 `<svg>` 直接子节点、在缩放组之外）：
 *   屏幕 user unit → 度：1 / (projection.scale * zoom)
 *   度 → 公里：× KM_PER_DEGREE
 * 因此 1 个屏幕 user unit = KM_PER_DEGREE / (projection.scale * zoom) km。
 *
 * 做法：以 targetPx（默认 110）为期望屏幕长度 → 反算公里数 → 取「好读」的 km →
 * 再反算**精确** screenLength = km * projection.scale * zoom / KM_PER_DEGREE。
 * 于是 x2 与标签由同一个 km 派生：屏幕上 x2 长度恰好代表标签的 km；取整「好读」值
 * 带来的误差被吸收到线段长度上（≈targetPx 附近），而不是让标签与长度互相矛盾。
 *
 * 例（真实内容，projection.scale≈2.56，zoom=1）：km=4000 → screenLength≈92；
 * zoom=4 时 km=1000 → screenLength≈92；zoom=8 时 km=500 → screenLength≈92。
 */
export function scaleBarGeometry(projection: Projection, zoom = 1, targetPx = 110): ScaleBarGeometry {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const safeTarget = Number.isFinite(targetPx) && targetPx > 0 ? targetPx : 110;
  const screenUnitsPerKm = (projection.scale * safeZoom) / KM_PER_DEGREE;
  const km = scaleBarKm(safeTarget, projection, safeZoom);
  return { km, screenLength: km * screenUnitsPerKm, zoom: safeZoom, screenUnitsPerKm };
}

export const SIDES: readonly Side[] = ['japan', 'allies'];

/**
 * 双方视觉编码：形状 + 线型，颜色仅辅助（mountApi 硬性规则 6）。
 *
 * D4 修复：`label` 不再硬编码「日本 / 盟军」，而是引用 `SIDE_LABELS`，
 * 避免同一文案在两处维护、改一处忘另一处。
 * 新增 `glyph`：把形状渲染成文字符号，供表格/图例直接复用，
 * 避免组件里再手写 '■' / '▲'（Atlas.tsx 之前就是硬编码的）。
 */
export interface SideEncoding {
  shape: 'square' | 'triangle';
  dash: string;
  /** 线型的中文描述（实线 / 虚线），供图例使用。 */
  lineStyle: string;
  /** 形状的文字符号，由 shape 派生，组件不得自行硬编码。 */
  glyph: string;
  label: string;
}

const SHAPE_GLYPHS: Record<SideEncoding['shape'], string> = {
  square: '■',
  triangle: '▲',
};

export const SIDE_ENCODING: Record<Side, SideEncoding> = {
  japan: {
    shape: 'square',
    dash: 'none',
    lineStyle: '实线',
    glyph: SHAPE_GLYPHS.square,
    label: SIDE_LABELS.japan,
  },
  allies: {
    shape: 'triangle',
    dash: '7 4',
    lineStyle: '虚线',
    glyph: SHAPE_GLYPHS.triangle,
    label: SIDE_LABELS.allies,
  },
};

/** 组合出「形状 + 线型」的简短说明，供表格表头使用（单一来源）。 */
export function sideEncodingSummary(side: Side): string {
  const encoding = SIDE_ENCODING[side];
  return `${encoding.glyph} ${encoding.lineStyle}`;
}
