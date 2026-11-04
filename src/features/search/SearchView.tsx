/**
 * 搜索视图（#/search?q=...）
 *
 * 跨六个入口检索同一份数据，结果按入口分组，可直接跳转。
 * 搜索只做字符串匹配与展示，不生成任何历史内容。
 */

import { useMemo } from 'react';
import { useApp } from '../AppContext';
import { EmptyState, PageHead } from '../../components/primitives';
import { searchContent } from '../../data/index';
import { buildHref, entityTypeFromId } from '../../router/route';
import type { SearchHit } from '../../data/index';

export function SearchView({ query }: { query: string }) {
  const { index, hasContent } = useApp();
  const hits = useMemo(() => searchContent(index, query), [index, query]);

  if (!hasContent) {
    return (
      <div>
        <PageHead eyebrow="搜索" title="搜索" description="在六个入口之间检索同一份内容。" />
        <EmptyState title="暂无可搜索的内容" body="内容文件尚未加载，因此搜索没有结果。这不是「搜不到」，而是「还没有内容」。内容由 HIST 模块交付后，搜索会自动生效。" />
      </div>
    );
  }

  const grouped = new Map<string, SearchHit[]>();
  for (const hit of hits) {
    const list = grouped.get(hit.group);
    if (list) list.push(hit);
    else grouped.set(hit.group, [hit]);
  }

  return (
    <div>
      <PageHead
        eyebrow="搜索"
        title={query ? `搜索：${query}` : '搜索'}
        description={`跨时间线、战役、人物、地图、知识专题与历史问题检索。共 ${hits.length} 条结果。`}
      />
      <SearchForm initialQuery={query} />
      {hits.length === 0 ? (
        <EmptyState
          title="没有匹配结果"
          body={`没有找到与「${query}」匹配的条目。可以试试事件名称、地名、人物姓名或知识专题的关键词。`}
        />
      ) : (
        [...grouped.entries()].map(([group, list]) => (
          <section key={group} className="pw-section">
            <h2 className="pw-section__heading">{group}（{list.length}）</h2>
            <ul className="pw-list">
              {list.map((hit) => {
                const href =
                  hit.kind === 'question'
                    ? buildHref('questions', { id: hit.id })
                    : hit.kind === 'source'
                      ? buildHref('sources', { id: hit.id })
                      : hrefForEntityId(hit.id);
                return (
                  <li className="pw-list__item" key={`${hit.kind}-${hit.id}`}>
                    <a className="pw-list__link" href={href}>
                      <span className="pw-list__date">{hit.id}</span>
                      <span>
                        <span className="pw-list__title">{hit.title}</span>
                        <span className="pw-list__summary">{hit.snippet}</span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function hrefForEntityId(id: string): string {
  const type = entityTypeFromId(id);
  if (!type) return buildHref('overview');
  const view = type === 'event' ? 'timeline' : type === 'battle' ? 'battles' : type === 'person' ? 'people' : type === 'place' ? 'atlas' : 'concepts';
  return buildHref(view, { id });
}

/** 搜索表单：提交后把查询词写进 hash，保证结果页可分享、可后退。 */
export function SearchForm({ initialQuery = '' }: { initialQuery?: string }) {
  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const value = String(data.get('q') ?? '').trim();
        window.location.hash = buildHref('search', value ? { query: value } : {}).slice(1);
      }}
      style={{ display: 'flex', gap: 'var(--pw-space-2)', margin: 'var(--pw-space-3) 0 var(--pw-space-5)', maxWidth: '36rem' }}
    >
      <label className="pw-visually-hidden" htmlFor="search-input">
        搜索内容
      </label>
      <div className="pw-field" style={{ flex: 1 }}>
        <input id="search-input" name="q" type="search" defaultValue={initialQuery} placeholder="搜索事件、人物、地点、概念…" autoComplete="off" />
      </div>
      <button type="submit" className="pw-btn">
        搜索
      </button>
    </form>
  );
}
