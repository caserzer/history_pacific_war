/**
 * 证据总表（#/sources[/<sourceId>]）
 *
 * 把 content.sources 与 claims 集中呈现，让读者能从任意 claim 的 locator 跳回
 * 完整引用信息（机构、标题、年份、访问日期、可靠性说明），并看到该来源支撑了哪些判断。
 */

import { useMemo } from 'react';
import { useApp } from '../AppContext';
import { CitationList } from '../../components/CitationList';
import { SourceLocatorList } from '../../components/SourceLocator';
import { ClaimTag, ClaimTagLegend } from '../../components/ClaimTag';
import { EmptyState, MetaRow, PageHead } from '../../components/primitives';
import { claimTypeCounts, entityTitle } from '../../data/index';
import type { Source } from '../../data/types';
import { buildHref } from '../../router/route';

export function SourcesView({ sourceId }: { sourceId: string | null }) {
  const { index } = useApp();
  const sources = useMemo(
    () => [...index.sources.values()].sort((a, b) => a.publisher.localeCompare(b.publisher) || a.title.localeCompare(b.title)),
    [index],
  );
  const selected = sourceId ? index.sources.get(sourceId) ?? null : null;
  const counts = useMemo(() => claimTypeCounts(index.claims.values()), [index]);

  if (sources.length === 0) {
    return (
      <div>
        <PageHead eyebrow="证据" title="来源与证据总表" description="所有被正文引用的来源、判断与定位都集中在这里。" />
        <EmptyState title="来源记录尚未加载" body="共享内容文件 content/history.json 还没有交付来源记录。契约要求每个内容实体至少一个来源、每个判断至少一个精确定位。" />
      </div>
    );
  }

  return (
    <div>
      <PageHead
        eyebrow="证据"
        title="来源与证据总表"
        description="所有被正文引用的来源、判断和定位都集中在这里。每条判断都标注了它在来源里的具体位置——页码、档案编号或节段，而不是只给一个网址。"
      />
      <section className="pw-card" style={{ marginBottom: 'var(--pw-space-5)' }}>
        <h2 style={{ fontSize: 'var(--pw-size-lg)', marginBottom: 'var(--pw-space-2)' }}>证据类型分布</h2>
        <ClaimTagLegend counts={counts} />
      </section>
      {selected ? (
        <SourceDetail source={selected} />
      ) : (
        <section>
          <h2 className="pw-section__heading">来源（{sources.length}）</h2>
          <ul className="pw-list">
            {sources.map((source) => (
              <li className="pw-list__item" key={source.id}>
                <a className="pw-list__link" href={buildHref('sources', { id: source.id })}>
                  <span className="pw-list__date">{source.year} · {source.sourceType}</span>
                  <span>
                    <span className="pw-list__title">{source.title}</span>
                    <span className="pw-list__summary">
                      {source.creator} · {source.publisher} · 支撑 {index.claimsBySource.get(source.id)?.length ?? 0} 条判断
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SourceDetail({ source }: { source: Source }) {
  const { index } = useApp();
  const claims = index.claimsBySource.get(source.id) ?? [];
  const entities = index.entitiesBySource.get(source.id) ?? [];
  const sourceById = index.sources;

  return (
    <article>
      <PageHead eyebrow="来源详情" title={source.title} description={source.citation} />
      <MetaRow
        items={[
          { key: 'ID', value: <code>{source.id}</code> },
          { key: '作者/机构', value: source.creator },
          { key: '出版方', value: source.publisher },
          { key: '年份', value: String(source.year) },
          { key: '类型', value: source.sourceType },
          { key: '访问日期', value: source.accessedDate },
          ...(source.archiveCollectionId ? [{ key: '馆藏编号', value: source.archiveCollectionId }] : []),
        ]}
      />
      <p style={{ marginBottom: 'var(--pw-space-3)' }}>
        <a className="pw-btn" href={source.url} target="_blank" rel="noopener noreferrer">
          打开原始来源 ↗
        </a>
      </p>
      <CitationList sourceIds={[source.id]} sourceById={sourceById} heading="完整引用信息" />

      <section style={{ marginTop: 'var(--pw-space-5)' }}>
        <h2 className="pw-section__heading">这个来源支撑的判断（{claims.length}）</h2>
        {claims.length === 0 ? (
          <p style={{ fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-sm)', color: 'var(--pw-ink-soft)' }}>
            目前还没有正文引用这个来源。它可能是一个备用资料，或相关内容仍在整理中。
          </p>
        ) : (
          <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {claims.map((claim) => (
              <li key={claim.id} className="pw-claim" data-claim-id={claim.id} data-claim-type={claim.claimType}>
                <ClaimTag type={claim.claimType} />
                <p className="pw-claim__text">{claim.text}</p>
                {claim.note ? <p className="pw-claim__note">{claim.note}</p> : null}
                <SourceLocatorList locators={claim.locators ?? []} sourceById={sourceById} />
                <p style={{ margin: '0.2rem 0 0', fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-xs)', color: 'var(--pw-ink-muted)' }}>
                  涉及：
                  {claim.entityIds
                    .map((id) => index.entities.get(id))
                    .filter((entity) => Boolean(entity))
                    .slice(0, 6)
                    .map((entity) => entityTitle(entity!))
                    .join('、') || '（无）'}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section style={{ marginTop: 'var(--pw-space-5)' }}>
        <h2 className="pw-section__heading">引用这个来源的条目（{entities.length}）</h2>
        <ul className="pw-chip-list">
          {entities.slice(0, 60).map((entity) => {
            const type = index.entityTypes.get(entity.id);
            const view = type === 'event' ? 'timeline' : type === 'battle' ? 'battles' : type === 'person' ? 'people' : type === 'place' ? 'atlas' : type === 'concept' ? 'concepts' : null;
            const label = entityTitle(entity);
            return (
              <li key={entity.id}>
                {view ? (
                  <a className="pw-chip" href={buildHref(view, { id: entity.id })}>
                    {label}
                  </a>
                ) : (
                  <span className="pw-chip">{label}</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </article>
  );
}
