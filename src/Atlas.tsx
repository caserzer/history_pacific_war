/**
 * src/Atlas.tsx —— 必需交付物：契约驱动的本地 SVG Atlas 引擎与阶段控件
 *
 * 本文件把三部分组装成一个可直接挂载的组件：
 *   1. `AtlasMapEngine`（./atlas/mapEngine）—— 离线 SVG 地图：缩放/平移/图层/键盘/触摸
 *   2. `PhaseControls` / `DateSelector` / `LayersControl` / `CertaintyLegend`
 *      （./atlas/controls）—— 可复用控件：播放暂停、阶段切换、时间轴联动、图例
 *   3. 阶段情报面板 —— 双方 knownEnemy / unknownEnemy / decision / consequence /
 *      positions / time，全部来自契约字段，含 certainty 标签
 *
 * 硬性规则（见 src/features/atlas/mountApi.ts）：
 * - 不依赖外部瓦片/商业 Key：地图完全本地自绘（SVG），离线可用；
 * - `places[].coordinates` 是真实地理节点，**不是**舰队位置；
 * - 阶段位置只来自 `battle.phases[].positions[side]`，并显示「示意」与不确定半径；
 * - 航线是示意折线，界面写明「不是精确历史航迹」；
 * - 双方对称（形状 + 线型编码，不只靠颜色）；
 * - `prefers-reduced-motion` 时不自动播放、不做过渡动画；
 * - 不新建数据源：所有数据来自传入的 places / battles（同一份 content/history.json）。
 *
 * 关于 fixture：本组件**不读取任何 fixture 文件**。它只消费调用方传入的
 * `places` / `battles`。fixture 仅用于自动化测试（见 scripts/validate-site.mjs），
 * 且 fixture 数据在 UI 上必然带有 `fixtureOnly` 的「测试样本」横幅
 * （由外壳根据内容显式标志渲染），绝不会作为历史发布。
 */

import { useMemo, useState } from 'react';
import type { BattleEntity, Phase, PlaceEntity, Side } from './data/types';
import { buildHref } from './router/route';
import { EmptyState } from './components/primitives';
import { CertaintyTag } from './components/ClaimTag';
import { PLACE_TYPE_LABELS, SIDE_LABELS } from './content/labels';
import { ATLAS_LEGEND, type AtlasMountProps } from './features/atlas/mountApi';
import { AtlasMapEngine, DEFAULT_LAYERS, type MapLayers } from './atlas/mapEngine';
import {
  CertaintyLegend,
  DateSelector,
  LayersControl,
  PhaseControls,
  phasesUsable,
  prefersReducedMotion,
  usePhasePlayback,
} from './atlas/controls';
import { boundsForPlaces, PACIFIC_BOUNDS, SIDES, sideEncodingSummary } from './atlas/projection';

export type { MapLayers } from './atlas/mapEngine';
export { DEFAULT_LAYERS } from './atlas/mapEngine';
export { ATLAS_LEGEND } from './features/atlas/mountApi';

export interface AtlasProps extends Omit<AtlasMountProps, 'view' | 'phaseOptions'> {
  /** 初始图层（默认全开）。 */
  initialLayers?: MapLayers;
  /** 默认选中的战役（按 id）；不传则取第一个有阶段的战役。 */
  defaultBattleId?: string;
  /** 减少动态效果；不传则由 `prefers-reduced-motion` 决定。 */
  reducedMotion?: boolean;
}

/**
 * 选择一个可用战役：优先 `defaultBattleId`，否则第一个拥有非空 `phases[]` 的战役。
 * 没有可用战役时返回 null —— 调用方据此渲染诚实的空状态，绝不编造阶段数据。
 */
export function pickBattle(
  battles: readonly BattleEntity[] | undefined,
  defaultBattleId?: string,
): BattleEntity | null {
  const usable = (battles ?? []).filter((battle) => Boolean(battle) && phasesUsable(battle.phases).length > 0);
  if (usable.length === 0) return null;
  if (defaultBattleId) {
    const match = usable.find((battle) => battle.id === defaultBattleId);
    if (match) return match;
  }
  return usable[0] ?? null;
}

/** 阶段情报面板：双方已知/未知、决策、后果、位置、时间、certainty。 */
function PhaseIntelligencePanel({ phase, placeById }: { phase: Phase; placeById: ReadonlyMap<string, PlaceEntity> }) {
  return (
    <section className="pw-phaseinfo" aria-labelledby="phase-intel-heading" data-phase-panel="" data-phase-id={phase.id}>
      <header className="pw-phaseinfo__head">
        <h3 id="phase-intel-heading" style={{ margin: 0 }}>
          阶段 {phase.sequence}：{phase.title}
        </h3>
        <CertaintyTag type={phase.certainty} />
        {phase.schematic ? <CertaintyTag type="schematic" /> : null}
      </header>

      <p className="pw-phaseinfo__time" data-phase-time="">
        <span className="pw-phaseinfo__key">时间</span>
        {phase.time.display}
        <span className="pw-phaseinfo__sub">（时间不确定说明：{phase.time.uncertainty}）</span>
      </p>

      <div className="pw-phaseinfo__grid" data-phase-table="">
        <div className="pw-phaseinfo__row pw-phaseinfo__row--head" aria-hidden="true">
          <span />
          {SIDES.map((side) => (
            <span key={side}>
              {SIDE_LABELS[side]}
              <span className="pw-phaseinfo__encoding"> {sideEncodingSummary(side)}</span>
            </span>
          ))}
        </div>
        <PhaseRow label="位置（示意）" field="positions">
          {(side: Side) => {
            const position = phase.positions[side];
            const names = (position.placeIds ?? [])
              .map((id) => placeById.get(id)?.historicalName)
              .filter((name): name is string => Boolean(name));
            return (
              <>
                <strong>{position.label}</strong>
                <span className="pw-phaseinfo__desc">{position.description}</span>
                {names.length > 0 ? <span className="pw-phaseinfo__desc">涉及地点：{names.join('、')}</span> : null}
                <span className="pw-phaseinfo__flag" data-position-schematic={String(position.schematic)}>
                  {position.schematic ? '示意位置，不是精确坐标' : '位置'} · 不确定半径约 ±{position.uncertaintyRadiusKm} km
                </span>
                <span className="pw-phaseinfo__desc">{position.uncertaintyNote}</span>
              </>
            );
          }}
        </PhaseRow>
        <PhaseRow label="已知敌情" field="knownEnemy">
          {(side: Side) => phase.knownEnemy[side]}
        </PhaseRow>
        <PhaseRow label="未知敌情" field="unknownEnemy">
          {(side: Side) => phase.unknownEnemy[side]}
        </PhaseRow>
        <PhaseRow label="关键决策" field="decision">
          {(side: Side) => phase.decision[side]}
        </PhaseRow>
        <PhaseRow label="直接后果" field="consequence">
          {(side: Side) => phase.consequence[side]}
        </PhaseRow>
      </div>

      {phase.routes.length > 0 ? (
        <div className="pw-phaseinfo__routes">
          <p className="pw-phaseinfo__key">示意航线（不是精确历史航迹）</p>
          <ul>
            {phase.routes.map((route) => (
              <li key={route.id} data-route-id={route.id} data-route-side={route.side}>
                <strong>{SIDE_LABELS[route.side]}：{route.label}</strong>
                <span className="pw-phaseinfo__desc">{route.note}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <CertaintyLegend certainty={phase.certainty} schematic={phase.schematic} uncertaintyNote={phase.uncertaintyNote} />
    </section>
  );
}

function PhaseRow({ label, field, children }: { label: string; field: string; children: (side: Side) => React.ReactNode }) {
  return (
    <div className="pw-phaseinfo__row" data-phase-field={field}>
      <span className="pw-phaseinfo__label">{label}</span>
      {SIDES.map((side) => (
        <span key={side} className="pw-phaseinfo__cell" data-side={side}>
          {children(side)}
        </span>
      ))}
    </div>
  );
}

/**
 * Atlas —— 地图入口的主组件（必需交付物）。
 *
 * 真实站点（content/history.json 目前 battles[] 为 0）会走到「尚未交付阶段数据」的
 * 诚实空状态；地图本身仍然渲染真实地点，图层/缩放/平移全部可用。
 */
export function Atlas({
  places,
  battles,
  selectedPlaceId,
  onSelectPlace,
  initialLayers,
  defaultBattleId,
  reducedMotion,
}: AtlasProps) {
  const [layers, setLayers] = useState<MapLayers>(initialLayers ?? DEFAULT_LAYERS);
  const reduced = reducedMotion ?? prefersReducedMotion();

  const battle = useMemo(() => pickBattle(battles, defaultBattleId), [battles, defaultBattleId]);
  const phases = useMemo(() => phasesUsable(battle?.phases), [battle]);
  const playback = usePhasePlayback(phases.length, reduced);
  const activePhase = phases[playback.activeIndex] ?? null;

  const placeById = useMemo(() => new Map(places.map((place) => [place.id, place])), [places]);
  const bounds = useMemo(() => (places.length > 0 ? boundsForPlaces(places) : PACIFIC_BOUNDS), [places]);

  const narrativeHref = battle ? buildHref('battles', { id: battle.id }) : undefined;

  return (
    <div className="pw-atlasengine" data-atlas-root="">
      <LayersControl layers={layers} onChange={setLayers} />

      <div className="pw-atlasengine__layout">
        <AtlasMapEngine
          places={places}
          bounds={bounds}
          phase={activePhase}
          battleTitle={battle?.title}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={onSelectPlace}
          layers={layers}
          onLayersChange={setLayers}
          label={battle ? `战役「${battle.title}」的示意地图` : '太平洋战略节点示意地图'}
        />

        <aside className="pw-atlasengine__side" aria-label="阶段与情报">
          {phases.length > 0 ? (
            <>
              <DateSelector phases={phases} activeIndex={playback.activeIndex} onSelectIndex={playback.setActiveIndex} showStepButtons />
              <PhaseControls
                phases={phases}
                activeIndex={playback.activeIndex}
                playing={playback.playing}
                onTogglePlay={playback.togglePlay}
                onStep={playback.step}
                narrativeHref={narrativeHref}
                reducedMotion={reduced}
              />
              {activePhase ? <PhaseIntelligencePanel phase={activePhase} placeById={placeById} /> : null}
            </>
          ) : (
            <EmptyState
              title="地图阶段数据尚未交付"
              body={
                battle
                  ? '这场战役目前没有 phases[] 数据，因此不显示阶段推演。页面不会虚构阶段位置、航线或敌情。'
                  : '共享内容文件 content/history.json 目前没有任何战役（battles[] 为 0），所以没有可推演的地图阶段。地图仍可浏览真实地理节点；阶段推演会在内容交付后自动出现，不需要改代码。'
              }
              details={[
                { text: '契约要求：阶段位置来自 phases[].positions，且 schematic 必须为 true', contract: 'contracts/README.md §4.2' },
                { text: '禁止把不确定位置包装成精确历史轨迹', contract: '架构政策 v1' },
                { text: '战役与阶段内容的完整性由 MAP-01 验收', contract: '工单 MAP-00 Acceptance' },
              ]}
            />
          )}

          {places.length === 0 ? (
            <p className="pw-atlas__note">目前没有任何真实地理节点；地图只显示经纬网格。</p>
          ) : (
            <div className="pw-maplegend" aria-label="图例">
              <p className="pw-maplegend__row">
                <span className="pw-maplegend__key">图例</span>
                <span className="pw-maplegend__value">
                  {ATLAS_LEGEND.map((entry) => (
                    <span key={entry.kind} style={{ display: 'block' }} data-legend-kind={entry.kind}>
                      {entry.label}：{entry.style}
                    </span>
                  ))}
                </span>
              </p>
            </div>
          )}
        </aside>
      </div>

      {selectedPlaceId && placeById.has(selectedPlaceId) ? (
        <p className="pw-atlas__note" data-selected-place={selectedPlaceId}>
          已选地点：{placeById.get(selectedPlaceId)!.historicalName}（现代地名：
          {placeById.get(selectedPlaceId)!.modernName}，{placeById.get(selectedPlaceId)!.modernCountry}；类型：
          {PLACE_TYPE_LABELS[placeById.get(selectedPlaceId)!.placeType] ?? placeById.get(selectedPlaceId)!.placeType}）。
        </p>
      ) : null}
    </div>
  );
}

export default Atlas;
