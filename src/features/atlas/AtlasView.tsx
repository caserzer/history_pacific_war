/**
 * 地图入口（Atlas）
 *
 * 实现状态（MAP-00 更新）：交互式地图**已实现**，由 `src/Atlas.tsx`（入口组件，内部使用
 * `src/atlas/mapEngine` 的 SVG 引擎与 `src/atlas/controls` 控件）渲染；
 * 本视图负责页面级排版、地点列表与地点详情。
 * 挂载契约见 ./mountApi.ts（含硬性规则：无外部瓦片依赖、示意必须可见、双方对称等）。
 *
 * 本视图提供：
 * - 地点列表（真实地理节点，历史地名 + 现代地名 + 国家 + 坐标精度）；
 * - 选中地点详情，并展示「这个地点出现在哪些事件/战役/问题中」；
 * - 交互式 SVG 地图（由 `src/Atlas.tsx` 渲染，替代早期的 `data-atlas-mount` 占位容器）。
 */

import { useMemo } from 'react';
import { useApp } from '../AppContext';
import { CitationList } from '../../components/CitationList';
import { EmptyState, MetaRow, PageHead, RelatedLinks } from '../../components/primitives';
import type { PlaceEntity } from '../../data/types';
import { buildHref } from '../../router/route';
import { PLACE_TYPE_LABELS, SIDE_LABELS } from '../../content/labels';
import { Atlas } from '../../Atlas';
import { useReadingProgress } from '../../a11y/readingProgress';

export function AtlasView({ placeId }: { placeId: string | null }) {
  const { index } = useApp();
  const places = useMemo(
    () => [...index.places.values()].sort((a, b) => a.historicalName.localeCompare(b.historicalName, 'zh-Hans-CN')),
    [index],
  );
  const battles = useMemo(() => [...index.battles.values()], [index]);
  const selected = placeId ? index.places.get(placeId) ?? null : null;

  const navigateToPlace = (nextPlaceId: string) => {
    window.location.hash = buildHref('atlas', { id: nextPlaceId }).slice(1);
  };

  return (
    <div>
      <PageHead
        eyebrow="入口 04 / Atlas"
        title="地图"
        description="从地理空间理解行动：历史地名与现代地名并列，坐标精度与示意标记可见。地点是真实已知的地理节点，舰队位置与航线只出现在战役的地图阶段里，并且一律标记为示意。"
      />

      {/* 交互式 SVG 地图引擎（离线自绘，无瓦片依赖）。数据来自同一份 content/history.json。 */}
      <Atlas
        places={places}
        battles={battles}
        selectedPlaceId={selected?.id ?? null}
        onSelectPlace={navigateToPlace}
      />

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
