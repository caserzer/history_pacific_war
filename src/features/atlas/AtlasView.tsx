/**
 * 地图入口（Atlas）
 *
 * WEB-01 的职责：提供**契约稳定**的挂载点与地点数据展示，交互式地图由 MAP-01 实现。
 * 挂载契约见 ./mountApi.ts（含硬性规则：无外部瓦片依赖、示意必须可见、双方对称等）。
 *
 * 本视图在 MAP-01 交付前提供：
 * - 地点列表（真实地理节点，历史地名 + 现代地名 + 国家 + 坐标精度）；
 * - 选中地点详情，并展示「这个地点出现在哪些事件/战役/问题中」；
 * - 一个语义化的地图挂载容器（`data-atlas-mount`），MAP-01 直接在其中渲染画布。
 */

import { useMemo } from 'react';
import { useApp } from '../AppContext';
import { CitationList } from '../../components/CitationList';
import { EmptyState, MetaRow, PageHead, RelatedLinks } from '../../components/primitives';
import type { PlaceEntity } from '../../data/types';
import { buildHref } from '../../router/route';
import { PLACE_TYPE_LABELS, SIDE_LABELS } from '../../content/labels';
import { ATLAS_LEGEND, type AtlasMountProps } from './mountApi';
import { useReadingProgress } from '../../a11y/readingProgress';

export function AtlasView({ placeId }: { placeId: string | null }) {
  const { index } = useApp();
  const places = useMemo(
    () => [...index.places.values()].sort((a, b) => a.historicalName.localeCompare(b.historicalName, 'zh-Hans-CN')),
    [index],
  );
  const selected = placeId ? index.places.get(placeId) ?? null : null;

  if (places.length === 0) {
    return (
      <div>
        <PageHead
          eyebrow="入口 04 / Atlas"
          title="地图"
          description="从地理空间理解行动：历史地名与现代地名并列，坐标精度与示意标记可见。"
        />
        <EmptyState
          title="地理节点尚未加载"
          body="本入口已经就绪，但共享内容文件 content/history.json 还没有交付任何真实地理节点。地图与地点不会用虚构坐标或外部瓦片服务填充 —— 核心功能必须离线可用。"
          details={[
            { text: '契约要求：places 只存真实地点，schematic 必须为 false，并给出坐标精度', contract: 'contracts/README.md §4.4' },
            { text: '地图阶段位置来自 battles[].phases[].positions 且必须标记 schematic', contract: 'contracts/README.md §4.2' },
            { text: '不得依赖外部瓦片或商业 Key', contract: '架构政策 v1 / 需求 MAP-OFFLINE' },
          ]}
        />
      </div>
    );
  }

  // 给 MAP-01 的挂载 props（编译期校验字段完整性；MAP-01 直接消费）。
  const mountProps: AtlasMountProps = {
    view: 'places',
    places,
    selectedPlaceId: selected?.id ?? null,
    onSelectPlace: (nextPlaceId: string) => {
      window.location.hash = buildHref('atlas', { id: nextPlaceId }).slice(1);
    },
  };
  void mountProps;

  return (
    <div>
      <PageHead
        eyebrow="入口 04 / Atlas"
        title="地图"
        description="从地理空间理解行动：历史地名与现代地名并列，坐标精度与示意标记可见。地点是真实已知的地理节点，舰队位置与航线只出现在战役的地图阶段里，并且一律标记为示意。"
      />

      <div className="pw-atlas">
        <div
          className="pw-atlas__mount"
          data-atlas-mount="places"
          role="region"
          aria-label="地图挂载区域（交互式地图由 MAP-01 实现）"
        >
          <p style={{ margin: '0 0 var(--pw-space-2)', fontFamily: 'var(--pw-font-mono)', fontSize: 'var(--pw-size-xs)', letterSpacing: '0.1em', color: 'var(--pw-brass-text)' }}>
            地图挂载点 · ATLAS-MOUNT
          </p>
          <p style={{ margin: '0 0 var(--pw-space-3)', fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-sm)', color: 'var(--pw-ink-soft)' }}>
            交互式地图（缩放、平移、图层切换、阶段联动）由后续地图任务（MAP-01）在此容器中实现，
            使用同一份 places 与 battles[].phases 数据。当前任务只保证挂载契约、数据与图例一致。
          </p>
          <ul className="pw-table" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {ATLAS_LEGEND.map((entry) => (
              <li key={entry.kind} style={{ display: 'flex', gap: 'var(--pw-space-3)', padding: 'var(--pw-space-2) 0', borderBottom: '1px dashed color-mix(in srgb, var(--pw-ink) 20%, transparent)' }}>
                <span style={{ fontFamily: 'var(--pw-font-mono)', fontSize: 'var(--pw-size-xs)', color: 'var(--pw-brass-text)', minWidth: '6em' }}>{entry.kind}</span>
                <span style={{ fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-sm)' }}>
                  {entry.label}
                  <span style={{ display: 'block', color: 'var(--pw-ink-muted)', fontSize: 'var(--pw-size-xs)' }}>编码方式：{entry.style}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <aside aria-label="地点列表" className="pw-card" style={{ padding: 'var(--pw-space-3)' }}>
          <p style={{ margin: '0 0 var(--pw-space-2)', fontFamily: 'var(--pw-font-mono)', fontSize: 'var(--pw-size-xs)', letterSpacing: '0.1em', color: 'var(--pw-brass-text)' }}>
            地点（{places.length}）
          </p>
          <ul className="pw-list" style={{ borderTop: 0 }}>
            {places.map((place) => (
              <li className="pw-list__item" key={place.id}>
                <a
                  className="pw-list__link"
                  href={buildHref('atlas', { id: place.id })}
                  aria-current={selected?.id === place.id ? 'true' : undefined}
                  style={{ gridTemplateColumns: '1fr' }}
                >
                  <span>
                    <span className="pw-list__title" style={{ fontSize: 'var(--pw-size-base)' }}>{place.historicalName}</span>
                    <span style={{ display: 'block', fontFamily: 'var(--pw-font-mono)', fontSize: 'var(--pw-size-xs)', color: 'var(--pw-ink-muted)' }}>
                      {place.modernName} · {place.modernCountry}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {selected ? <PlaceDetail place={selected} /> : (
        <p style={{ marginTop: 'var(--pw-space-4)', fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-sm)', color: 'var(--pw-ink-soft)' }}>
          从左侧列表选择一个地点，查看它的历史地名、现代地名、坐标精度，以及出现在哪些事件、战役与问题中。
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
