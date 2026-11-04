/**
 * CitationList —— 来源列表（引用展示组件）
 *
 * 契约 §4.8 / §9.3：显示机构、标题、年份、链接、访问日期，以及 reliabilityNote
 * （这个来源能支持什么、不能支持什么）。
 */

import { SOURCE_TYPE_LABELS } from '../content/labels';
import type { Source } from '../data/types';
import { buildHref } from '../router/route';

export interface CitationListProps {
  sourceIds: string[];
  sourceById: ReadonlyMap<string, Source>;
  /** 标题文字，默认「来源」。 */
  heading?: string;
  /** 只显示前 N 条，其余链接到证据总表。 */
  limit?: number;
}

export function CitationList({ sourceIds, sourceById, heading = '来源', limit }: CitationListProps) {
  const resolved = sourceIds.map((id) => sourceById.get(id)).filter((source): source is Source => Boolean(source));
  const missingCount = sourceIds.length - resolved.length;
  const shown = typeof limit === 'number' ? resolved.slice(0, limit) : resolved;

  if (sourceIds.length === 0) {
    return (
      <p className="pw-citation__note" style={{ margin: 0 }}>
        （此条目没有登记来源；契约要求每个内容实体至少一个来源。）
      </p>
    );
  }

  return (
    <div>
      <p style={{ margin: '0 0 0.25rem', fontWeight: 700, fontSize: 'var(--pw-size-sm)', color: 'var(--pw-navy-950)' }}>
        {heading}
        <span style={{ fontWeight: 400, color: 'var(--pw-ink-muted)', marginLeft: '0.5em', fontSize: 'var(--pw-size-xs)' }}>
          共 {sourceIds.length} 条
        </span>
      </p>
      <ul className="pw-citations">
        {shown.map((source) => (
          <li key={source.id} className="pw-citation" data-source-id={source.id}>
            <span className="pw-citation__badge">{source.year}</span>
            <span className="pw-citation__badge" style={{ background: 'var(--pw-map-green)' }}>
              {SOURCE_TYPE_LABELS[source.sourceType] ?? source.sourceType}
            </span>
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              {source.title}
            </a>
            <span className="pw-citation__note" style={{ display: 'block' }}>
              {source.creator} · {source.publisher} · 访问日期 {source.accessedDate}
            </span>
            <span className="pw-citation__note" style={{ display: 'block' }}>
              <strong>可核查范围：</strong>
              {source.reliabilityNote}
            </span>
            <a
              className="pw-citation__note"
              href={buildHref('sources', { id: source.id })}
              style={{ display: 'inline-block', marginTop: '0.2em' }}
            >
              查看完整引用信息 →
            </a>
          </li>
        ))}
      </ul>
      {typeof limit === 'number' && resolved.length > limit ? (
        <p className="pw-citation__note" style={{ margin: '0.25rem 0 0' }}>
          另有 {resolved.length - limit} 条来源，见页面底部「全部来源」。
        </p>
      ) : null}
      {missingCount > 0 ? (
        <p className="pw-citation__note" style={{ margin: '0.25rem 0 0', color: 'var(--pw-alert)' }}>
          有 {missingCount} 条来源引用无法在当前内容中解析（内容数据不完整，验证器应拦截）。
        </p>
      ) : null}
    </div>
  );
}
