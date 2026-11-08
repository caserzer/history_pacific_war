/**
 * 时间线入口（Timeline）
 *
 * 数据：content.events（按 startDate 排序）。
 * 互跳：relatedEventIds、battleId（→战役）、placeIds（→地图）、personIds（→人物）、
 *       conceptIds（→知识专题）、反向索引（此人/地点出现在哪些问题中）。
 */

import { useEffect, useMemo, useState } from 'react';
import { HISTORICAL_PART_IDS } from '../../data/types';
import { useApp } from '../AppContext';
import { EvidencePanel } from '../../components/EvidencePanel';
import { CitationList } from '../../components/CitationList';
import {
  ClaimTypeFilter,
  ContextBar,
  EmptyState,
  MetaRow,
  PageHead,
  Prose,
  RelatedLinks,
} from '../../components/primitives';
import { RESEARCH_STATUS_LABELS } from '../../data/types';
import { analysisProfileBlocks } from '../../data/index';
import type { ClaimType, EventEntity } from '../../data/types';
import { collectEntityEvidence, groupByPart, sortEvents } from '../../data/index';
import { HISTORICAL_PART_META } from '../../content/labels';
import { buildHref } from '../../router/route';
import { readProgress, useReadingProgress } from '../../a11y/readingProgress';

/**
 * MAP-01：时间线日期筛选。
 *
 * 日期选择只做「截至某日」的累积筛选（历史时间线的自然读法），并写回
 * `#/timeline?date=YYYY-MM-DD`，因此可深链、可后退，页面上暴露稳定属性供浏览器测试观察：
 *   [data-timeline-date-filter]  筛选器容器（含 data-timeline-date / data-timeline-date-count）
 *   [data-timeline-date-range]   滑块（aria-valuetext 带当前日期与事件数）
 *   [data-timeline-date-display] 当前日期与计数文案
 *   [data-timeline-date-reset]   「全部日期」按钮
 *   [data-timeline-event="<id>"] 每个被渲染的事件条目
 */
export function TimelineView({ eventId, initialDate = null }: { eventId: string | null; initialDate?: string | null }) {
  const { index } = useApp();
  const events = useMemo(() => sortEvents([...index.events.values()]), [index]);
  const eventDates = useMemo(() => [...new Set(events.map((event) => event.startDate))].sort(), [events]);
  const selected = eventId ? index.events.get(eventId) ?? null : null;
  const [filter, setFilter] = useState<string>('all');
  // null = 不过滤（全部日期）；否则是 eventDates 的下标（截至该日期）。
  const [dateIndex, setDateIndex] = useState<number | null>(() => {
    if (!initialDate) return null;
    // 找到「不晚于 initialDate」的最后一个事件日期（避免依赖 ES2023 findLastIndex）。
    for (let i = eventDates.length - 1; i >= 0; i -= 1) {
      const date = eventDates[i];
      if (date !== undefined && date <= initialDate) return i;
    }
    return 0;
  });
  const activeDate = dateIndex === null ? null : eventDates[dateIndex] ?? null;
  const dateFiltered = useMemo(
    () => (activeDate ? events.filter((event) => event.startDate <= activeDate) : events),
    [events, activeDate],
  );

  const groups = useMemo(
    () => groupByPart(dateFiltered, HISTORICAL_PART_IDS),
    [dateFiltered],
  );

  const filteredGroups = useMemo(() => {
    if (filter === 'all') return groups;
    return groups
      .map((group) => ({ ...group, items: group.items.filter((event) => event.eventType === filter) }))
      .filter((group) => group.items.length > 0);
  }, [groups, filter]);
  const eventTypes = useMemo(() => [...new Set(dateFiltered.map((event) => event.eventType))].sort(), [dateFiltered]);

  if (events.length === 0) {
    return (
      <div className="pw-list-surface">
        <PageHead
          eyebrow="入口 01 / Timeline"
          title="时间线"
          description="按时间顺序阅读：每一个事件都说明它为什么发生、与哪个战役相连。"
        />
        <EmptyState
          title="时间线数据尚未加载"
          body="本入口已经就绪，但共享内容文件 content/history.json 还没有交付任何时间线事件。内容由历史内容模块（HIST）写入同一份 JSON，页面不会用示例事件或编造的日期填充。"
          details={[
            { text: '内容文件未找到或为空', contract: 'content/history.json 由 HIST 模块交付' },
            { text: '契约要求：events[].article 每节带独立来源与 claim', contract: 'contracts/README.md §4.1' },
          ]}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHead
        eyebrow="入口 01 / Timeline"
        title="时间线"
        description="按时间顺序阅读：每一个事件都说明它为什么发生、与哪个战役相连。时间线上的每个节点都可以跳到战役、人物、地图与知识专题。"
      />
      {selected ? (
        <EventDetail event={selected} />
      ) : (
        <>
          {eventDates.length > 1 ? (
            <div
              className="pw-filters"
              role="group"
              aria-label="按日期筛选时间线"
              data-timeline-date-filter=""
              data-timeline-date={activeDate ?? 'all'}
              data-timeline-date-count={dateFiltered.length}
              data-timeline-date-total={events.length}
            >
              <label className="pw-filters__label" htmlFor="pw-timeline-date-range">
                日期
              </label>
              <input
                id="pw-timeline-date-range"
                type="range"
                min={0}
                max={eventDates.length - 1}
                step={1}
                value={dateIndex ?? eventDates.length - 1}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setDateIndex(next >= eventDates.length - 1 ? null : next);
                }}
                aria-valuetext={activeDate ? `显示截至 ${activeDate} 的 ${dateFiltered.length} 个事件（共 ${events.length} 个）` : `显示全部 ${events.length} 个事件`}
                data-timeline-date-range=""
                style={{ minWidth: '12rem', flex: '1 1 12rem' }}
              />
              <span data-timeline-date-display="">
                {activeDate ? `截至 ${activeDate}：${dateFiltered.length} / ${events.length} 个事件` : `全部 ${events.length} 个事件`}
              </span>
              <button
                type="button"
                className="pw-btn"
                aria-pressed={dateIndex === null}
                data-timeline-date-reset=""
                onClick={() => setDateIndex(null)}
              >
                全部日期
              </button>
            </div>
          ) : null}
          <div className="pw-filters" role="group" aria-label="按事件类型筛选">
            <span className="pw-filters__label">事件类型</span>
            <button type="button" className="pw-btn" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
              全部 {dateFiltered.length}
            </button>
            {eventTypes.map((type) => (
              <button key={type} type="button" className="pw-btn" aria-pressed={filter === type} onClick={() => setFilter(type)}>
                {EVENT_TYPE_LABELS[type] ?? type} {dateFiltered.filter((event) => event.eventType === type).length}
              </button>
            ))}
          </div>
          {filteredGroups.length === 0 ? (
            <EmptyState title="当前筛选没有事件" body="请调整日期或事件类型筛选，或选择「全部」。" />
          ) : (
            filteredGroups.map((group) => (
              <section key={group.part} className="pw-section" aria-labelledby={`part-${group.part}`}>
                <h2 className="pw-section__heading" id={`part-${group.part}`}>
                  <span className="pw-section__index">{String(HISTORICAL_PART_META[group.part].ordinal).padStart(2, '0')}</span>
                  {HISTORICAL_PART_META[group.part].title}
                </h2>
                <ol className="pw-timeline">
                  {group.items.map((event) => (
                    <li
                      key={event.id}
                      className={`pw-timeline__item${event.battleId ? ' pw-timeline__item--battle' : ''}`}
                      data-timeline-event={event.id}
                      data-timeline-event-date={event.startDate}
                    >
                      <span className="pw-timeline__date">{formatEventDate(event)}</span>
                      <h3 className="pw-timeline__title">
                        <a href={buildHref('timeline', { id: event.id })}>{event.title}</a>
                      </h3>
                      <p style={{ margin: '0 0 var(--pw-space-2)', fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-sm)', color: 'var(--pw-ink-soft)' }}>
                        {event.summary}
                      </p>
                      <RelatedLinks
                        groups={[
                          {
                            title: '相关',
                            links: [
                              ...(event.battleId && index.battles.has(event.battleId)
                                ? [{ href: buildHref('battles', { id: event.battleId }), label: `战役：${index.battles.get(event.battleId)?.title ?? event.battleId}` }]
                                : []),
                              ...event.placeIds
                                .map((id) => index.places.get(id))
                                .filter((place) => Boolean(place))
                                .slice(0, 4)
                                .map((place) => ({ href: buildHref('atlas', { id: place!.id }), label: place!.historicalName })),
                              ...event.personIds
                                .map((id) => index.people.get(id))
                                .filter((person) => Boolean(person))
                                .map((person) => ({ href: buildHref('people', { id: person!.id }), label: person!.name })),
                            ],
                          },
                        ]}
                      />
                      <ReadingProgressLine contentId={event.id} />
                    </li>
                  ))}
                </ol>
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}

function ReadingProgressLine({ contentId }: { contentId: string }) {
  const progress = readProgress(contentId);
  if (progress <= 0) return null;
  return (
    <div className="pw-progress" aria-label={`已读 ${Math.round(progress * 100)}%`}>
      <span>已读</span>
      <span className="pw-progress__track">
        <span className="pw-progress__fill" style={{ width: `${Math.round(progress * 100)}%` }} />
      </span>
      <span>{Math.round(progress * 100)}%</span>
    </div>
  );
}

function formatEventDate(event: EventEntity): string {
  if (event.endDate && event.endDate !== event.startDate) return `${event.startDate} — ${event.endDate}`;
  return event.startDate;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  background: '背景',
  diplomacy: '外交',
  policy: '政策',
  campaign: '战役行动',
  battle: '战斗',
  raid: '空袭／突袭',
  occupation: '占领',
  aftermath: '影响',
  analysis: '分析',
};

/**
 * 事件详情（#/timeline/<eventId>）
 *
 * 结构：上下文条 → 摘要 → 早期战役十类分析（若存在）→ 文章小节（每节带证据面板）
 *      → 相关实体互链 → 页面级来源。
 */
export function EventDetail({ event }: { event: EventEntity }) {
  const { index } = useApp();
  const [claimFilter, setClaimFilter] = useState<ClaimType | 'all'>('all');
  const claimById = index.claims;
  const sourceById = index.sources;
  const evidence = collectEntityEvidence(event);
  // 早期战役分析：唯一来源是已接受契约的十键 analysisProfiles（ARCH-02）。
  // 不读取 legacy 字段 earlyCampaignAnalysis，也不使用旧五键标题作为渲染条件。
  const analysisBlocks = analysisProfileBlocks(event);
  useReadingProgress(`event-${event.id}`);
  const placeholderPlaces = event.placeIds.map((id) => index.places.get(id)).filter((place) => Boolean(place));

  return (
    <article aria-labelledby="event-title">
      <ContextBar
        items={[
          { key: '时间', value: formatEventDate(event) },
          {
            key: '地点',
            value:
              placeholderPlaces.length > 0 ? (
                <span>
                  {placeholderPlaces.map((place, i) => (
                    <span key={place!.id}>
                      {i > 0 ? '、' : null}
                      <a href={buildHref('atlas', { id: place!.id })}>{place!.historicalName}</a>
                    </span>
                  ))}
                </span>
              ) : (
                '（未登记地点）'
              ),
          },
          { key: '所属部分', value: HISTORICAL_PART_META[event.historicalPart]?.title ?? event.historicalPart },
          { key: '证据', value: `${evidence.claimIds.length} 条判断 · ${evidence.sourceIds.length} 个来源` },
        ]}
      />
      <PageHead
        eyebrow={`时间线 / ${EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}`}
        title={event.title}
        description={event.summary}
      />
      <MetaRow
        items={[
          { key: 'ID', value: <code>{event.id}</code> },
          { key: '开始', value: event.startDate },
          ...(event.endDate ? [{ key: '结束', value: event.endDate }] : []),
          { key: '文章小节', value: `${event.article.length} 节` },
        ]}
      />
      <ClaimTypeFilter value={claimFilter} onChange={setClaimFilter} />

      {analysisBlocks ? (
        <section className="pw-section" aria-labelledby="early-analysis" data-analysis-section="">
          <h2 className="pw-section__heading" id="early-analysis">
            <span className="pw-section__index">十类分析</span>
            早期扩张战役分析结构
          </h2>
          <p style={{ fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-sm)', color: 'var(--pw-ink-soft)' }}>
            契约（ARCH-02）要求早期扩张战役按十类具名分析逐项回答：背景、地理环境、参与方与指挥、双方目标与军力、约束条件、阶段经过、可选方案、结果与损失口径、后续影响、不确定性。各节并排呈现，不折叠成一段；每节各自携带来源与 claim 证据。
          </p>
          {analysisBlocks.map((block) => (
            <div
              className="pw-card"
              key={block.key}
              style={{ marginBottom: 'var(--pw-space-4)' }}
              data-analysis-profile={block.key}
              data-analysis-title={block.title}
            >
              <h3 style={{ fontSize: 'var(--pw-size-lg)', marginBottom: 'var(--pw-space-2)' }} data-analysis-heading={block.key}>
                {block.title}
                <span style={{ fontSize: 'var(--pw-size-xs)', color: 'var(--pw-ink-muted)', marginLeft: '0.5em', fontFamily: 'var(--pw-font-mono)' }}>
                  {block.key}
                </span>
              </h3>
              <div className="pw-article__lede" style={{ borderLeftWidth: '2px', marginBottom: 'var(--pw-space-2)' }} data-analysis-body={block.key}>
                <Prose body={block.body} />
              </div>
              <EvidencePanel
                claimIds={block.claimIds}
                sourceIds={block.sourceIds}
                claimById={claimById}
                sourceById={sourceById}
                claimTypeFilter={claimFilter}
              />
            </div>
          ))}
          {event.researchStatus ? (
            <p style={{ fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-xs)', color: 'var(--pw-ink-muted)' }} data-research-status={event.researchStatus}>
              研究状态：{RESEARCH_STATUS_LABELS[event.researchStatus] ?? event.researchStatus}
            </p>
          ) : null}
        </section>
      ) : null}

      {event.article.length > 0 ? (
        <section aria-label="文章正文">
          {event.article.map((section, index_) => (
            <div className="pw-section" key={`${section.heading}-${index_}`}>
              <h2 className="pw-section__heading">
                <span className="pw-section__index">§ {String(index_ + 1).padStart(2, '0')}</span>
                {section.heading}
              </h2>
              <div className="pw-article">
                <div className="pw-section__body">
                  <Prose body={section.body} />
                </div>
                <EvidencePanel
                  claimIds={section.claimIds}
                  sourceIds={section.sourceIds}
                  claimById={claimById}
                  sourceById={sourceById}
                  claimTypeFilter={claimFilter}
                />
              </div>
            </div>
          ))}
        </section>
      ) : (
        <EmptyState title="这篇文章还没有正文小节" body="该事件目前只有摘要（契约允许时间线事件暂时只有摘要），详细文章由内容任务补全。" />
      )}

      {event.battleId && index.battles.has(event.battleId) ? (
        <p style={{ marginTop: 'var(--pw-space-5)' }}>
          <a className="pw-btn" href={buildHref('battles', { id: event.battleId })}>
            进入战役：{index.battles.get(event.battleId)?.title} →
          </a>
        </p>
      ) : null}

      <h2 className="pw-section__heading" style={{ marginTop: 'var(--pw-space-6)' }}>相关内容</h2>
      <RelatedLinks
        groups={[
          {
            title: '同一部分的其他事件',
            links: (index.eventsByEntity.get(event.id) ?? [])
              .filter((other) => other.id !== event.id)
              .map((other) => ({ href: buildHref('timeline', { id: other.id }), label: other.title })),
          },
          {
            title: '相关事件（relatedEventIds）',
            links: event.relatedEventIds
              .map((id) => index.events.get(id))
              .filter((other) => Boolean(other))
              .map((other) => ({ href: buildHref('timeline', { id: other!.id }), label: other!.title })),
          },
          {
            title: '人物',
            links: event.personIds
              .map((id) => index.people.get(id))
              .filter((person) => Boolean(person))
              .map((person) => ({ href: buildHref('people', { id: person!.id }), label: person!.name, hint: person!.role })),
          },
          {
            title: '地点',
            links: event.placeIds
              .map((id) => index.places.get(id))
              .filter((place) => Boolean(place))
              .map((place) => ({ href: buildHref('atlas', { id: place!.id }), label: place!.historicalName, hint: place!.modernName })),
          },
          {
            title: '知识专题',
            links: event.conceptIds
              .map((id) => index.concepts.get(id))
              .filter((concept) => Boolean(concept))
              .map((concept) => ({ href: buildHref('concepts', { id: concept!.id }), label: concept!.title })),
          },
          {
            title: '出现在这些问题中',
            links: (index.questionsByEntity.get(event.id) ?? []).map((question) => ({
              href: buildHref('questions', { id: question.id }),
              label: question.prompt,
            })),
          },
        ]}
      />

      <section style={{ marginTop: 'var(--pw-space-6)' }}>
        <h2 className="pw-section__heading">全部来源</h2>
        <CitationList sourceIds={evidence.sourceIds} sourceById={sourceById} heading="本文使用的来源" />
      </section>
    </article>
  );
}

/** 供路由在事件 ID 无效时使用：明确告诉读者链接失效，而不是静默跳转。 */
export function useScrollToTopOnChange(value: string) {
  useEffect(() => {
    window.scrollTo?.({ top: 0 });
  }, [value]);
}
