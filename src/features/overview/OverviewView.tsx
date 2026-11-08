/**
 * 总览（#/）
 *
 * 六个入口的索引 + 内容状态说明 + 原创示意图 + 证据类型图例。
 * 这里展示的所有数字（实体计数、claim 数）都从数据计算，没有硬编码的历史内容。
 */

import { useApp } from '../AppContext';
import { ClaimTagLegend } from '../../components/ClaimTag';
import { EmptyState, PageHead } from '../../components/primitives';
import { claimTypeCounts, entryCounts } from '../../data/index';
import { CLAIM_TYPES } from '../../data/types';
import { ENTRY_NAV, HISTORICAL_PART_META } from '../../content/labels';
import { HISTORICAL_PART_IDS } from '../../data/types';
import { buildHref } from '../../router/route';
import { EvidenceTypesDiagram, SixEntriesDiagram } from '../../diagrams/Diagrams';
import { getContentStatusCopy } from './statusCopy';

const PART_TO_ENTRY: Record<string, string> = {
  'part-1-why-war': '时间线 · 战役 · 历史问题',
  'part-2-pearl-harbor': '时间线 · 战役 · 人物',
  'part-3-expansion': '时间线 · 战役 · 人物',
  'part-4-turning-point': '时间线 · 战役 · 知识专题',
  'part-5-midway': '时间线 · 战役 · 人物 · 知识专题',
};

export function OverviewView() {
  const { content, index, hasContent, isFixture } = useApp();
  const counts = entryCounts(index);
  const claimCounts = claimTypeCounts(index.claims.values());
  const statusCopy = getContentStatusCopy(content);
  const totalEntities =
    index.events.size +
    index.battles.size +
    index.people.size +
    index.places.size +
    index.concepts.size +
    index.units.size +
    index.equipment.size;

  return (
    <div>
      <PageHead
        eyebrow="太平洋战争 · 数字历史档案馆"
        title="《太平洋战争：从珍珠港到中途岛》"
        description="一部面向 11 岁读者的中文交互式历史教材。它以同一份带证据定位的内容为基础，提供六种互相连通的阅读入口：按时间读、按战役读、按人物读、按地理读、按知识读、按问题读。"
      />

      {statusCopy ? <div style={{ marginBottom: 'var(--pw-space-5)' }}>{statusCopy}</div> : null}

      {index.battles.has('battle-midway') ? <p className="pw-card"><a className="pw-btn" href={buildHref('midway')}>新版样板 · 中途岛海战：开始阅读 →</a><span style={{ display: 'block', marginTop: '0.5rem', fontSize: 'var(--pw-size-sm)' }}>适配手机与桌面，体验新的正文、引用与地图。</span></p> : null}

      <section aria-labelledby="entries-heading">
        <h2 className="pw-section__heading" id="entries-heading">
          <span className="pw-section__index">六入口</span>
          选择一种阅读方式
        </h2>
        <p style={{ fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-sm)', color: 'var(--pw-ink-soft)', maxWidth: '62ch' }}>
          六个入口不是六份各自编写的内容，而是同一批稳定 ID 实体的不同投影。你在任何一个入口看到的事件、人物与地点，
          都可以跳到其他入口里的同一条记录。
        </p>
        <ol className="pw-entry-grid">
          {ENTRY_NAV.map((entry, i) => (
            <li key={entry.view}>
              <a className="pw-entry-card" href={buildHref(entry.view)}>
                <span className="pw-entry-card__head">
                  <span className="pw-entry-card__title">{entry.label}</span>
                  <span className="pw-entry-card__en">{entry.labelEn}</span>
                </span>
                <span className="pw-entry-card__blurb">{entry.blurb}</span>
                <span className="pw-entry-card__count">
                  {String(i + 1).padStart(2, '0')} · {counts[entry.view] ?? 0} 条记录
                  {hasContent && (counts[entry.view] ?? 0) === 0 ? ' · 该入口暂无内容' : ''}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      {!hasContent ? (
        <Box>
          <EmptyState
            title="内容尚未加载：这是外壳与契约消费任务（WEB-01）的预期状态"
            body="本站点已经完成六入口外壳、hash 路由、检索、证据与引用组件、无障碍与视觉设计。历史内容由历史内容模块（HIST）写入同一份 content/history.json；在那之前，页面如实显示「未加载」，不会用示例事件、虚构日期或占位文章填充。"
            details={[
              { text: '内容状态来自显式标志（fixtureOnly），不是文件名猜测', contract: 'contracts/README.md §9.9' },
              { text: '缺内容时构建仍须成功，六入口仍须可导航', contract: '工单 WEB-01 Acceptance' },
            ]}
            footnote={
              <a href={buildHref('sources')}>查看证据规范与来源总表 →</a>
            }
          />
        </Box>
      ) : null}

      <section aria-labelledby="structure-heading" style={{ marginTop: 'var(--pw-space-6)' }}>
        <h2 className="pw-section__heading" id="structure-heading">
          <span className="pw-section__index">结构</span>
          五个历史部分
        </h2>
        <p style={{ fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-sm)', color: 'var(--pw-ink-soft)', maxWidth: '62ch' }}>
          内容按契约的五个历史部分组织。每个部分都有导读、必需事件，并且最终必须有带证据的探究问题。
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table className="pw-table">
            <caption className="pw-visually-hidden">五个历史部分及其阅读入口</caption>
            <thead>
              <tr>
                <th scope="col">部分</th>
                <th scope="col">标题</th>
                <th scope="col">主要入口</th>
                <th scope="col">时间线事件</th>
                <th scope="col">问题</th>
              </tr>
            </thead>
            <tbody>
              {HISTORICAL_PART_IDS.map((part) => {
                const eventsInPart = [...index.events.values()].filter((event) => event.historicalPart === part).length;
                const questionsInPart = [...index.questions.values()].filter((question) => question.historicalPart === part).length;
                return (
                  <tr key={part}>
                    <th scope="row">{String(HISTORICAL_PART_META[part].ordinal).padStart(2, '0')}</th>
                    <td>{HISTORICAL_PART_META[part].title}</td>
                    <td>{PART_TO_ENTRY[part]}</td>
                    <td>{eventsInPart}</td>
                    <td>{questionsInPart}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="evidence-heading" style={{ marginTop: 'var(--pw-space-6)' }}>
        <h2 className="pw-section__heading" id="evidence-heading">
          <span className="pw-section__index">证据</span>
          你会在正文里看到四类标签
        </h2>
        <p style={{ fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-sm)', color: 'var(--pw-ink-soft)', maxWidth: '62ch' }}>
          同一段叙述可能包含不同类型的信息。标签告诉你这段文字应该被当作哪一种证据来读：是当时留下的记录、
          学界的解释、尚有分歧的判断，还是为了讲清楚而做的教学简化。
        </p>
        <ClaimTagLegend counts={hasContent ? claimCounts : Object.fromEntries(CLAIM_TYPES.map((type) => [type, 0]))} />
        <EvidenceTypesDiagram />
      </section>

      <section aria-labelledby="stats-heading" style={{ marginTop: 'var(--pw-space-6)' }}>
        <h2 className="pw-section__heading" id="stats-heading">
          <span className="pw-section__index">数据</span>
          当前内容规模
        </h2>
        {hasContent ? (
          <div className="pw-card">
            <table className="pw-table">
              <caption className="pw-visually-hidden">当前内容数据规模</caption>
              <tbody>
                <StatRow label="内容实体" value={totalEntities} />
                <StatRow label="来源" value={index.sources.size} />
                <StatRow label="判断（claim）" value={index.claims.size} />
                <StatRow label="素材" value={index.media.size} />
                <StatRow label="问题" value={index.questions.size} />
              </tbody>
            </table>
            {isFixture ? (
              <p style={{ margin: 'var(--pw-space-3) 0 0', fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-sm)', color: 'var(--pw-alert)' }}>
                以上数字来自测试样本，不代表已交付的教材内容。
              </p>
            ) : null}
          </div>
        ) : (
          <p style={{ fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-sm)', color: 'var(--pw-ink-soft)' }}>
            内容尚未加载，因此没有可统计的数据。这不是「0 条内容」的结论，而是「还没有可读的内容文件」。
          </p>
        )}
        <SixEntriesDiagram />
      </section>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <tr>
      <th scope="row" style={{ width: '40%' }}>{label}</th>
      <td style={{ fontFamily: 'var(--pw-font-mono)' }}>{value}</td>
    </tr>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return <div style={{ marginTop: 'var(--pw-space-5)' }}>{children}</div>;
}
