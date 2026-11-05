/**
 * Atlas 交互状态机 —— **纯函数**，无 React / DOM 依赖。
 *
 * 为什么单独成模块（MAP-00 D3 修复）：
 * 评审指出「缩放/平移/图层/播放」只有 grep 或静态标记检查，真正的事件路径
 * （`onChange` / `onClick` / 播放定时器）从未被执行过，而 jsdom 不在依赖里、
 * 不能作为证据。把状态迁移提炼成纯函数后：
 * - 组件调用它们（**唯一**实现，不存在测试用副本）；
 * - 验证器直接调用同一批函数并断言状态迁移，因此在任何环境都能跑，且不是 vacuous。
 *
 * 每个函数都返回**新对象**（不可变迁移），组件据此 setState。
 */

import type { Phase } from '../data/types';
import {
  IDENTITY_TRANSFORM,
  MAX_ZOOM,
  MIN_ZOOM,
  clampTransform,
  panBy,
  zoomAt,
  type ViewTransform,
} from './projection';

// ---------------------------------------------------------------------------
// 图层开关
// ---------------------------------------------------------------------------

export interface MapLayers {
  places: boolean;
  positions: boolean;
  routes: boolean;
  uncertainty: boolean;
  graticule: boolean;
}

export const DEFAULT_LAYERS: MapLayers = {
  places: true,
  positions: true,
  routes: true,
  uncertainty: true,
  graticule: true,
};

export const LAYER_LABELS: Record<keyof MapLayers, string> = {
  places: '地点与基地',
  positions: '阶段双方位置',
  routes: '示意航线',
  uncertainty: '不确定范围',
  graticule: '经纬网格',
};

/** 切换单个图层（对应复选框 onChange / 图层按钮 onClick）。 */
export function toggleLayer(layers: MapLayers, key: keyof MapLayers): MapLayers {
  return { ...layers, [key]: !layers[key] };
}

/** 由复选框的 checked 值设置图层（对应 `<input type=checkbox onChange>`）。 */
export function setLayerChecked(layers: MapLayers, key: keyof MapLayers, checked: boolean): MapLayers {
  return { ...layers, [key]: Boolean(checked) };
}

/** 当前处于开启状态的图层名列表（用于 UI 文案与测试断言）。 */
export function enabledLayers(layers: MapLayers): (keyof MapLayers)[] {
  return (Object.keys(LAYER_LABELS) as (keyof MapLayers)[]).filter((key) => layers[key]);
}

// ---------------------------------------------------------------------------
// 缩放 / 平移
// ---------------------------------------------------------------------------

/**
 * 按倍数缩放（对应 +/- 按钮与键盘 +/-）。
 * 以视口中心为焦点，保证缩放后画面不会被推到画面外。
 */
export function zoomByFactor(transform: ViewTransform, factor: number): ViewTransform {
  return zoomAt(transform, factor, { x: VIEW_CENTER.x, y: VIEW_CENTER.y });
}

export const VIEW_CENTER = { x: 320, y: 200 };

/** 复位视图（对应「复位」按钮与键盘 0）。 */
export function resetView(): ViewTransform {
  return { ...IDENTITY_TRANSFORM };
}

/**
 * 平移（对应方向键与拖拽）。
 *
 * D4 修复：旧实现在 zoom===1 时把 zoom 强行改为 2，理由是「全图可见时 clamp 会把
 * 平移归零，用户以为按键没反应」。但静默改变缩放更令人困惑。
 * 现在**保持当前 zoom 不变**，仅当确实无法平移时（zoom<=MIN_ZOOM）才不产生位移；
 * 界面上的「复位」按钮与缩放按钮让用户有明确手段，不再偷偷改缩放。
 */
export function panView(transform: ViewTransform, dx: number, dy: number): ViewTransform {
  return panBy(transform, dx, dy);
}

/** 是否处于「全图视野」（不能再平移）。用于 UI 提示，而不是偷偷改缩放。 */
export function isAtFitZoom(transform: ViewTransform): boolean {
  return transform.zoom <= MIN_ZOOM;
}

// ---------------------------------------------------------------------------
// 阶段播放状态机
// ---------------------------------------------------------------------------

export interface PlaybackState {
  /** 当前阶段下标（0 起）。 */
  activeIndex: number;
  /** 是否正在播放。 */
  playing: boolean;
}

export const INITIAL_PLAYBACK: PlaybackState = { activeIndex: 0, playing: false };

/** 把下标夹到合法范围。 */
export function clampIndex(index: number, phaseCount: number): number {
  if (phaseCount <= 0) return 0;
  return Math.min(phaseCount - 1, Math.max(0, Math.trunc(index)));
}

/** 点击「播放/暂停」按钮的迁移。 */
export function togglePlayback(state: PlaybackState, phaseCount: number): PlaybackState {
  if (phaseCount <= 1) return { ...state, playing: false };
  if (state.playing) return { ...state, playing: false };
  // 已在最后一阶段时，从头开始播放，避免「点了没反应」。
  const activeIndex = state.activeIndex >= phaseCount - 1 ? 0 : state.activeIndex;
  return { activeIndex, playing: true };
}

/**
 * 播放定时器每次 tick 的迁移（对应 `setInterval` 回调）。
 * 到达最后阶段自动停止（不回环），便于读者看清「推演结束」。
 */
export function tickPlayback(state: PlaybackState, phaseCount: number): PlaybackState {
  if (!state.playing || phaseCount <= 0) return state;
  if (state.activeIndex >= phaseCount - 1) {
    return { activeIndex: clampIndex(state.activeIndex, phaseCount), playing: false };
  }
  return { activeIndex: clampIndex(state.activeIndex + 1, phaseCount), playing: true };
}

/** 「上一阶段 / 下一阶段」按钮的迁移（会停止播放）。 */
export function stepPlayback(state: PlaybackState, delta: number, phaseCount: number): PlaybackState {
  return { activeIndex: clampIndex(state.activeIndex + delta, phaseCount), playing: false };
}

/** 直接选择某阶段（时间轴滑块 / 时间点按钮）。 */
export function selectPhase(index: number, phaseCount: number): PlaybackState {
  return { activeIndex: clampIndex(index, phaseCount), playing: false };
}

/**
 * 模拟 N 次 tick（**仅供测试**，避免测试里真的等待 2.6 秒）。
 * 与真实 `setInterval` 的行为一致：每次调用 tickPlayback。
 *
 * 只在「状态不再变化」时提前结束 —— 即 `next` 与上一次完全相同。
 * （早期版本用 `!after.playing && 索引不变` 作为结束条件，导致在落到最后一阶段、
 *   播放已停止的那一次 tick 上提前退出，返回 playing=true 的错误状态。）
 */
export function advanceTicks(state: PlaybackState, ticks: number, phaseCount: number): PlaybackState {
  let next = state;
  for (let i = 0; i < ticks; i += 1) {
    const after = tickPlayback(next, phaseCount);
    if (after.activeIndex === next.activeIndex && after.playing === next.playing) return after;
    next = after;
  }
  return next;
}

/** 播放间隔（毫秒）。reduced-motion 下放慢，但不会禁用推进。 */
export const PHASE_PLAY_INTERVAL_MS = 2600;

export function playInterval(reducedMotion: boolean): number {
  return reducedMotion ? Math.round(PHASE_PLAY_INTERVAL_MS * 1.6) : PHASE_PLAY_INTERVAL_MS;
}

// ---------------------------------------------------------------------------
// 阶段序列
// ---------------------------------------------------------------------------

/** 阶段按 sequence 排序（契约要求：地图按 sequence 排序）。 */
export function sortPhases(phases: readonly Phase[]): Phase[] {
  return [...phases].sort((a, b) => a.sequence - b.sequence);
}

/** 过滤掉缺失字段的阶段，返回可安全渲染的序列。 */
export function phasesUsable(phases: readonly Phase[] | undefined): Phase[] {
  if (!Array.isArray(phases)) return [];
  return sortPhases(phases.filter((phase): phase is Phase => Boolean(phase) && typeof phase.id === 'string'));
}

/** 阶段摘要（只含结构事实，不含历史内容）。 */
export function phaseSummary(phase: Phase) {
  return {
    id: phase.id,
    sequence: phase.sequence,
    timeDisplay: phase.time?.display ?? '',
    hasKnownEnemy: Boolean(phase.knownEnemy?.japan && phase.knownEnemy?.allies),
    hasUnknownEnemy: Boolean(phase.unknownEnemy?.japan && phase.unknownEnemy?.allies),
    hasDecision: Boolean(phase.decision?.japan && phase.decision?.allies),
    hasConsequence: Boolean(phase.consequence?.japan && phase.consequence?.allies),
    positionSchematic: {
      japan: phase.positions?.japan?.schematic ?? null,
      allies: phase.positions?.allies?.schematic ?? null,
    },
    routeCount: phase.routes?.length ?? 0,
    certainty: phase.certainty,
    schematic: phase.schematic,
  };
}

/** 缩放上下限（供 UI 与测试断言）。 */
export const ZOOM_BOUNDS = { min: MIN_ZOOM, max: MAX_ZOOM };

/** 归一化视图变换（供外部注入时使用）。 */
export function normalizeTransform(transform: ViewTransform): ViewTransform {
  return clampTransform(transform);
}
