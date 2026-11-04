/**
 * Atlas 可复用控件
 *
 * - `PhaseControls`：阶段选择、播放/暂停、前进/后退、跳到叙述
 * - `DateSelector`：时间轴联动（滑块 + 日期显示），把「时间」映射到阶段
 * - `LayersControl`：图层开关（与 mapEngine 的 MapLayers 共享同一模型）
 * - `CertaintyLegend`：certainty + 示意/不确定 的可见图例
 *
 * 无障碍要点：
 * - 播放/暂停按钮有 `aria-pressed` 与可读标签；
 * - 阶段选择既可点击也可用方向键（用真实按钮而不是自定义 listbox）；
 * - `prefers-reduced-motion` 时自动播放**不自动开始**，且不播放过渡动画。
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Certainty, Phase } from '../data/types';
import { CertaintyTag } from '../components/ClaimTag';
import { SIDE_ENCODING, SIDES } from './projection';
import { LAYER_LABELS, type MapLayers } from './mapEngine';
import {
  INITIAL_PLAYBACK,
  PHASE_PLAY_INTERVAL_MS as PHASE_PLAY_INTERVAL_MS_STATE,
  playInterval,
  selectPhase,
  stepPlayback,
  tickPlayback,
  togglePlayback,
  type PlaybackState as PlaybackSnapshot,
} from './stateMachines';

/** 播放间隔（毫秒）。仅用于「按阶段推进」的定时器，不驱动任何动画。 */
export const PHASE_PLAY_INTERVAL_MS = PHASE_PLAY_INTERVAL_MS_STATE;

/** 读取用户的 reduced-motion 偏好；SSR 下返回 false。 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** 阶段按 sequence 排序（契约要求：地图按 sequence 排序）。 */
export function sortPhases(phases: readonly Phase[]): Phase[] {
  return [...phases].sort((a, b) => a.sequence - b.sequence);
}

/** 阶段时间轴的可读标签：显示 display，并保留不确定说明的存在性。 */
export function phaseTimeLabel(phase: Phase): string {
  return phase.time?.display ?? '';
}

// ---------------------------------------------------------------------------
// 阶段控件
// ---------------------------------------------------------------------------

export interface PhaseControlsProps {
  phases: readonly Phase[];
  activeIndex: number;
  playing: boolean;
  onTogglePlay: () => void;
  onStep: (delta: number) => void;
  /** 跳转到战役叙述页（由调用方提供 href）。 */
  narrativeHref?: string;
  reducedMotion: boolean;
}

export function PhaseControls({
  phases,
  activeIndex,
  playing,
  onTogglePlay,
  onStep,
  narrativeHref,
  reducedMotion,
}: PhaseControlsProps) {
  if (phases.length === 0) return null;
  return (
    <div className="pw-phasecontrol" role="group" aria-label="战役阶段控制" data-phase-controls="">
      <div className="pw-phasecontrol__row">
        <button
          type="button"
          className="pw-btn"
          onClick={() => onStep(-1)}
          aria-label="上一个阶段"
          data-phase-action="prev"
          disabled={activeIndex <= 0}
        >
          ← 上一阶段
        </button>
        <button
          type="button"
          className="pw-btn"
          onClick={onTogglePlay}
          aria-pressed={playing}
          data-phase-action="playpause"
          aria-label={playing ? '暂停阶段播放' : '播放阶段'}
        >
          {playing ? '⏸ 暂停' : '▶ 播放'}
        </button>
        <button
          type="button"
          className="pw-btn"
          onClick={() => onStep(1)}
          aria-label="下一个阶段"
          data-phase-action="next"
          disabled={activeIndex >= phases.length - 1}
        >
          下一阶段 →
        </button>
        <span className="pw-phasecontrol__count" data-phase-counter="">
          阶段 {activeIndex + 1} / {phases.length}
        </span>
        {reducedMotion ? (
          <span className="pw-phasecontrol__note" data-reduced-motion="true">
            已按系统设置减少动态效果：播放会停顿而不做动画过渡。
          </span>
        ) : null}
        {narrativeHref ? (
          <a className="pw-btn" href={narrativeHref} data-phase-action="narrative">
            阅读战役全文 →
          </a>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 时间轴联动（日期选择）
// ---------------------------------------------------------------------------

export interface DateSelectorProps {
  phases: readonly Phase[];
  activeIndex: number;
  onSelectIndex: (index: number) => void;
  /**
   * 测试/受控场景：用数字按钮代替 range 滑块推进阶段。
   * range 的 `value` 是被控属性，自动化测试里无法用原生 setter 稳定触发 React 的 onChange
   * （受控 input 会忽略 DOM 直接赋值），提供按钮既便于测试，也是对键盘用户更友好的替代操作。
   */
  showStepButtons?: boolean;
}

/**
 * 日期选择：用滑块在阶段序列上移动，并显示该阶段的 `time.display`
 * 与 `time.uncertainty`。阶段时间是「不确定」的（契约允许），
 * 因此这里显示的是**阶段的时间标签**而不是伪造精确到分钟的时刻。
 */
export function DateSelector({ phases, activeIndex, onSelectIndex, showStepButtons = false }: DateSelectorProps) {
  const phase = phases[activeIndex] ?? null;
  const max = Math.max(0, phases.length - 1);
  return (
    <div className="pw-dateselect" data-date-selector="">
      <label htmlFor="pw-date-range" className="pw-dateselect__label">
        时间轴联动
      </label>
      <input
        id="pw-date-range"
        type="range"
        min={0}
        max={max}
        step={1}
        value={Math.min(activeIndex, max)}
        onChange={(event) => onSelectIndex(Number(event.target.value))}
        aria-valuetext={phase ? `第 ${activeIndex + 1} 阶段，${phase.time.display}` : '无阶段'}
        disabled={phases.length <= 1}
        data-date-range=""
      />
      {showStepButtons && phases.length > 1 ? (
        <div className="pw-dateselect__steps" role="group" aria-label="按时间点选择阶段">
          {phases.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className="pw-btn"
              aria-pressed={index === activeIndex}
              data-date-jump={index}
              onClick={() => onSelectIndex(index)}
            >
              第 {index + 1} 阶段
            </button>
          ))}
        </div>
      ) : null}
      {phase ? (
        <div className="pw-dateselect__readout">
          <span data-date-display="">{phase.time.display}</span>
          <span className="pw-dateselect__uncertainty" data-date-uncertainty="">
            时间不确定说明：{phase.time.uncertainty}
          </span>
        </div>
      ) : (
        <p className="pw-dateselect__uncertainty">本战役还没有地图阶段数据。</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 图层控件
// ---------------------------------------------------------------------------

export function LayersControl({
  layers,
  onChange,
}: {
  layers: MapLayers;
  onChange: (layers: MapLayers) => void;
}) {
  return (
    <div className="pw-filters" role="group" aria-label="地图图层" data-layers-control="">
      <span className="pw-filters__label">图层</span>
      {(Object.keys(LAYER_LABELS) as (keyof MapLayers)[]).map((key) => (
        <button
          key={key}
          type="button"
          className="pw-btn"
          aria-pressed={layers[key]}
          data-layer-button={key}
          onClick={() => onChange({ ...layers, [key]: !layers[key] })}
        >
          {LAYER_LABELS[key]}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 图例：certainty + 示意/不确定
// ---------------------------------------------------------------------------

export const CERTAINTY_LABELS: Record<Certainty, string> = {
  documented: '有记录',
  estimated: '估计',
  disputed: '有争议',
  schematic: '示意（教学简化）',
};

/** certainty 的取值集合是 documented|estimated|disputed|schematic，与 claimType 不同，
 * 因此用专门的 CertaintyTag 渲染（见 components/ClaimTag.tsx），不做有损映射。 */
export function CertaintyLegend({ certainty, schematic, uncertaintyNote }: {
  certainty: Certainty;
  schematic: boolean;
  uncertaintyNote: string;
}) {
  return (
    <div className="pw-maplegend" data-certainty-legend="">
      <p className="pw-maplegend__row">
        <span className="pw-maplegend__key">证据把握</span>
        <CertaintyTag type={certainty} />
        <span className="pw-maplegend__value">{CERTAINTY_LABELS[certainty] ?? certainty}</span>
        {schematic ? <CertaintyTag type="schematic" /> : null}
      </p>
      <p className="pw-maplegend__row">
        <span className="pw-maplegend__key">不确定说明</span>
        <span className="pw-maplegend__value" data-uncertainty-note="">
          {uncertaintyNote || '（该阶段未提供不确定说明）'}
        </span>
      </p>
      <p className="pw-maplegend__row">
        <span className="pw-maplegend__key">双方编码</span>
        <span className="pw-maplegend__value">
          {SIDES.map((side) => (
            <span key={side} data-side-encoding={side} style={{ marginRight: '1em' }}>
              {SIDE_ENCODING[side].label}：{SIDE_ENCODING[side].glyph} {SIDE_ENCODING[side].shape === 'square' ? '方形' : '三角形'}
              {' + '}{SIDE_ENCODING[side].lineStyle}
            </span>
          ))}
        </span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 播放驱动 hook
// ---------------------------------------------------------------------------

/** 播放控制器：状态机（PlaybackSnapshot）+ 命令。 */
export interface PlaybackState extends PlaybackSnapshot {
  setActiveIndex: (index: number) => void;
  togglePlay: () => void;
  step: (delta: number) => void;
  stop: () => void;
}

/**
 * 阶段播放状态机。播放到最后一个阶段自动停止（不回环），
 * 便于读者看清「推演结束」而不是无限循环。
 */
export function usePhasePlayback(phaseCount: number, reducedMotion: boolean): PlaybackState {
  // 状态迁移全部来自纯函数 stateMachines（验证器直接调用同一批函数做断言），
  // 这里只负责把它们接到 React state 与定时器上。
  const [state, setState] = useState<PlaybackSnapshot>(INITIAL_PLAYBACK);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const setActiveIndex = (index: number) => {
    setState(() => selectPhase(index, phaseCount));
  };

  const stop = () => {
    clearTimer();
    setState((current) => ({ ...current, playing: false }));
  };

  const togglePlay = () => {
    setState((current) => togglePlayback(current, phaseCount));
  };

  const step = (delta: number) => {
    clearTimer();
    setState((current) => stepPlayback(current, delta, phaseCount));
  };

  // 阶段数量变化时（切换战役）复位到第一阶段。
  useEffect(() => {
    setState(INITIAL_PLAYBACK);
    clearTimer();
    return clearTimer;
  }, [phaseCount]);

  useEffect(() => {
    if (!state.playing) {
      clearTimer();
      return;
    }
    // 定时器只是「节奏」：每次 tick 调用与测试相同的 tickPlayback 迁移。
    timerRef.current = setInterval(() => {
      setState((current) => {
        const next = tickPlayback(current, phaseCount);
        if (!next.playing && next.activeIndex === current.activeIndex) clearTimer();
        return next;
      });
    }, playInterval(reducedMotion));
    return clearTimer;
  }, [state.playing, phaseCount, reducedMotion]);

  return {
    activeIndex: state.activeIndex,
    playing: state.playing,
    setActiveIndex,
    togglePlay,
    step,
    stop,
  };
}

/** 校验阶段数据的最小可用性（缺失字段时降级显示而不是崩溃）。 */
export function phasesUsable(phases: readonly Phase[] | undefined): Phase[] {
  if (!Array.isArray(phases)) return [];
  return sortPhases(phases.filter((phase): phase is Phase => Boolean(phase) && typeof phase.id === 'string'));
}

/** 供测试使用的阶段摘要（不含任何历史内容，只有结构事实）。 */
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

export const memoHelpers = { useMemo };
