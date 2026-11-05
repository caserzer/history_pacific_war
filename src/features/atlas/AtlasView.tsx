/**
 * 地图入口（Atlas）
 *
 * 实现状态（MAP-00 更新 + MAP-01 真实内容接入）：交互式地图**已实现**，由
 * `src/Atlas.tsx`（入口组件，内部使用 `src/atlas/mapEngine` 的 SVG 引擎与
 * `src/atlas/controls` 控件）渲染；本视图负责页面级排版、地点列表与地点详情。
 * 挂载契约见 ./mountApi.ts（含硬性规则：无外部瓦片依赖、示意必须可见、双方对称等）。
 *
 * 本视图提供：
 * - 地点列表（真实地理节点，历史地名 + 现代地名 + 国家 + 坐标精度）；
 * - 选中地点详情，并展示「这个地点出现在哪些事件/战役/问题中」；
 * - 交互式 SVG 地图（由 `src/Atlas.tsx` 渲染）；
 * - MAP-01：三场重点战役的阶段推演（战役选择器 + 播放/暂停/前后 + 双方情报），
 *   支持 `#/atlas?battle=<battleId>&phase=<phaseId>` 深链从战役叙述定位到地图阶段；
 * - MAP-01：战略节点与海域索引（历史地名 + 现代地名并列，可从地图跳到地点详情）；
 * - MAP-01：区域标注索引（区域名锚定到真实地点，例如以达尔文港为锚点的「澳大利亚北部」）。
 */

import { useMemo } from 'react';
import { useApp } from '../AppContext';
import { CitationList } from '../../components/CitationList';
import { EmptyState, MetaRow, PageHead, RelatedLinks } from '../../components/primitives';
import type { PlaceEntity } from '../../data/types';
import { buildHref } from '../../router/route';
import { PLACE_TYPE_LABELS, SIDE_LABELS } from '../../content/labels';
import { Atlas } from '../../Atlas';
import { MAP_REGION_LABELS, type RegionLabel } from '../../atlas/regions';
import { useReadingProgress } from '../../a11y/readingProgress';

export function AtlasView({
  placeId,
  battleId = null,
  phaseId = null,
}: {
  placeId: string | null;
  /** MAP-01：来自 `#/atlas?battle=` 的深链目标战役。 */
  battleId?: string | null;
  /** MAP-01：来自 `#/atlas?...&phase=` 的深链目标阶段。 */
  phaseId?: string | null;
}) {
  const { index } = useApp();
  const places = useMemo(
    () => [...index.places.values()].sort((a, b) => a.historicalName.localeCompare(b.historicalName, 'zh-Hans-CN')),
    [index],
  );
  const battles = useMemo(() => [...index.battles.values()], [index]);
  const selected = placeId ? index.places.get(placeId) ?? null : null;

  // MAP-01：战略节点索引的数据来源是**同一份内容 JSON**（战役阶段与事件引用的地点 + 海域），
  // 不另建地图数据源。历史地名与现代地名并列可发现（不硬编码内容 ID）。
  const referencedPlaceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const battle of battles) {
      for (const id of battle.placeIds ?? []) ids.add(id);
      for (const phase of battle.phases ?? []) {
        for (const side of ['japan', 'allies'] as const) {
          for (const id of phase.positions?.[side]?.placeIds ?? []) ids.add(id);
        }
        for (const route of phase.routes ?? []) {
          ids.add(route.fromPlaceId);
          ids.add(route.toPlaceId);
        }
      }
    }
    for (const event of index.events.values()) {
      for (const id of event.placeIds ?? []) ids.add(id);
    }
    return ids;
  }, [battles, index]);
  const strategicPlaces = useMemo(
    () =>
      [...referencedPlaceIds]
        .map((id) => index.places.get(id))
        .filter((place): place is PlaceEntity => Boolean(place))
        .sort((a, b) => a.historicalName.localeCompare(b.historicalName, 'zh-Hans-CN')),
    [referencedPlaceIds, index],
  );
  const seaPlaces = useMemo(
    () => places.filter((place) => place.placeType === 'sea' || place.placeType === 'strait'),
    [places],
  );
  // MAP-01 区域标注（地理区域名，锚定到真实地点；不新增坐标/史实）。
  const regionEntries = useMemo(
    () =>
      MAP_REGION_LABELS.map((region) => ({ region, place: index.places.get(region.anchorPlaceId) })).filter(
        (entry): entry is { region: RegionLabel; place: PlaceEntity } => Boolean(entry.place),
      ),
    [index],
  );

  const navigateToPlace = (nextPlaceId: string) => {
    window.location.hash = buildHref('atlas', { id: nextPlaceId }).slice(1);
  };
  const navigateToBattle = (nextBattleId: string) => {
    // 写回 hash：战役选择可深链、可后退；同时保留当前地点详情。
    window.location.hash = buildHref('atlas', { id: selected?.id ?? null, battle: nextBattleId }).slice(1);
  };

  return (
    <div>
      <PageHead
        eyebrow="入口 04 / Atlas"
        title="地图"
        description="从地理空间理解行动：历史地名与现代地名并列，坐标精度与示意标记可见。选择一场重点战役即可按阶段推演：双方当时知道什么、不知道什么、做了什么决定、带来什么后果。地点是真实已知的地理节点，舰队位置与航线只出现在战役的地图阶段里，并且一律标记为示意。"
      />

      {/* 交互式 SVG 地图引擎（离线自绘，无瓦片依赖）。数据来自同一份 content/history.json。 */}
      <div data-atlas-mount="" data-atlas-initial-battle={battleId ?? ''} data-atlas-initial-phase={phaseId ?? ''}>
        <Atlas
          key={`${battleId ?? ''}:${phaseId ?? ''}`}
          places={places}
          battles={battles}
          selectedPlaceId={selected?.id ?? null}
          onSelectPlace={navigateToPlace}
          initialBattleId={battleId}
          initialPhaseId={phaseId}
          onSelectBattle={navigateToBattle}
        />
      </div>

      <section className="pw-section" style={{ marginTop: 'var(--pw-space-5)' }} aria-labelledby="atlas-node-index" data-atlas-node-index="">
        <h2 className="pw-section__heading" id="atlas-node-index">
          <span className="pw-section__index">索引</span>
          战略节点与海域（历史地名 / 现代地名）
        </h2>
        <p style={{ fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-sm)', color: 'var(--pw-ink-soft)' }}>
          地图上每个节点都同时标注历史地名与现代地名；下面是战役阶段与时间线事件引用到的地点
          （{strategicPlaces.length} 个）以及全部海域/海峡（{seaPlaces.length} 处）。点选任一名称可在地点详情中核对历史地名、现代地名与坐标精度。
        </p>
        <RelatedLinks
          groups={[
            {
              title: '战役与事件涉及的地点',
              links: strategicPlaces.map((place) => ({
                href: buildHref('atlas', { id: place.id }),
                label: place.historicalName,
                hint: place.modernName,
              })),
            },
            {
              title: '海域与海峡',
              links: seaPlaces.map((place) => ({
                href: buildHref('atlas', { id: place.id }),
                label: place.historicalName,
                hint: place.modernName,
              })),
            },
          ]}
        />
        {regionEntries.length > 0 ? (
          <p data-atlas-region-index="" style={{ fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-sm)', color: 'var(--pw-ink-soft)' }}>
            <strong>区域标注：</strong>
            {regionEntries.map(({ region, place }, indexOfRegion) => (
              <span key={region.id} data-region-index-id={region.id} style={{ marginRight: '0.75em' }}>
                {indexOfRegion > 0 ? '、' : null}
                <a href={buildHref('atlas', { id: place.id })}>{region.label}</a>
                <span style={{ color: 'var(--pw-ink-muted)' }}>
                  （以{place.historicalName}为锚点 · {place.modernName}）
                </span>
              </span>
            ))}
            <span style={{ display: 'block', color: 'var(--pw-ink-muted)', fontSize: 'var(--pw-size-xs)' }}>
              区域名只是地理描述，不是精确边界，也不代表舰队位置或历史航迹。
            </span>
          </p>
        ) : null}
      </section>

      <div style={{ marginTop: 'var(--pw-space-5)' }}>
        <h2 className="pw-section__heading">地点列表（{places.length}）</h2>
        {places.length === 0 ? (
          <EmptyState
            title="地理节点尚未加载"
            body="共享内容文件 content/history.json 还没有交付真实地理节点。地图不会用虚构坐标或外部瓦片服务填充 —— 核心功能必须离线可用。"
            details={[
              { text: '契约要求：places 只存真实地点，schematic 必须为 false，并给出坐标精度', contract: 'contracts/README.md §4.4' },
            ]}
          />
        ) : (
          <ul className="pw-list">
            {places.map((place) => (
              <li className="pw-list__item" key={place.id}>
                <a
                  className="pw-list__link"
                  href={buildHref('atlas', { id: place.id })}
                  aria-current={selected?.id === place.id ? 'true' : undefined}
                >
                  <span className="pw-list__date">
                    {place.coordinates.lat.toFixed(2)}, {place.coordinates.lng.toFixed(2)}
                  </span>
                  <span>
                    <span className="pw-list__title">{place.historicalName}</span>
                    <span className="pw-list__summary">
                      {place.modernName} · {place.modernCountry} · {PLACE_TYPE_LABELS[place.placeType] ?? place.placeType}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected ? <PlaceDetail place={selected} /> : (
        <p style={{ marginTop: 'var(--pw-space-4)', fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-sm)', color: 'var(--pw-ink-soft)' }}>
          在地图上点选一个地点，或从上面的列表选择，查看它的历史地名、现代地名、坐标精度，以及出现在哪些事件、战役与问题中。
        </p>
      )}
    </div>
  );
}

function PlaceDetail({ place }: { place: PlaceEntity }) {
  const { index } = useApp();
  useReadingProgress(`place-${place.id}`);
  const events = index.eventsByEntity.get(place.id) ?? [];
  const battles = index.battlesByEntity.get(place.id) ?? [];
  const questions = index.questionsByEntity.get(place.id) ?? [];
  const people = index.peopleByEntity.get(place.id) ?? [];

  return (
    <section style={{ marginTop: 'var(--pw-space-5)' }} aria-labelledby="place-heading">
      <div className="pw-card">
        <p className="pw-page-head__eyebrow">地点详情</p>
        <h2 id="place-heading" style={{ fontSize: 'var(--pw-size-xl)' }}>{place.historicalName}</h2>
        <MetaRow
          items={[
            { key: '历史地名', value: place.historicalName },
            { key: '现代地名', value: place.modernName },
            { key: '现代国家', value: place.modernCountry },
            { key: '类型', value: PLACE_TYPE_LABELS[place.placeType] ?? place.placeType },
            { key: '坐标', value: `${place.coordinates.lat.toFixed(4)}, ${place.coordinates.lng.toFixed(4)}` },
            { key: '节点精度', value: `约 ±${place.coordinateAccuracyKm} km（节点精度，不代表舰队位置精度）` },
          ]}
        />
        <p style={{ fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-sm)', color: 'var(--pw-ink-soft)' }}>{place.summary}</p>
      </div>

      <RelatedLinks
        groups={[
          {
            title: '出现在这些时间线事件',
            links: events.map((event) => ({ href: buildHref('timeline', { id: event.id }), label: event.title })),
          },
          {
            title: '出现在这些战役',
            links: battles.map((battle) => ({ href: buildHref('battles', { id: battle.id }), label: battle.title })),
          },
          {
            title: '相关人物',
            links: people.map((person) => ({ href: buildHref('people', { id: person.id }), label: person.name, hint: SIDE_LABELS[person.side] ?? undefined })),
          },
          {
            title: '邻近或战略相关地点',
            links: place.relatedPlaceIds
              .map((id) => index.places.get(id))
              .filter((other) => Boolean(other))
              .map((other) => ({ href: buildHref('atlas', { id: other!.id }), label: other!.historicalName, hint: other!.modernName })),
          },
          {
            title: '出现在这些问题中',
            links: questions.map((question) => ({ href: buildHref('questions', { id: question.id }), label: question.prompt })),
          },
        ]}
      />

      <div style={{ marginTop: 'var(--pw-space-4)' }}>
        <h3 style={{ fontSize: 'var(--pw-size-md)' }}>本地点使用的来源</h3>
        <CitationList sourceIds={place.sourceIds} sourceById={index.sources} heading="来源" />
      </div>
    </section>
  );
}
