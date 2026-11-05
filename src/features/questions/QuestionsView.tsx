/**
 * 历史问题入口（Questions）
 *
 * 验收要求：Questions 路由从结构化数据渲染实质性问题与有证据的答案，
 * 并支持跨实体导航，**不得在 JSX 中编造问题或答案**。
 *
 * 因此本视图只做三件事：
 * 1. 按 historicalPart 分组列出 questions[]（prompt / answer 全部来自数据）；
 * 2. 答案下的 entityIds 解析成可点击的跨入口链接；
 * 3. 每条问题渲染自己的 EvidencePanel（来源 + claim + 定位）。
 */

import { useMemo, useState } from 'react';
import { useApp } from '../AppContext';
import { EvidencePanel } from '../../components/EvidencePanel';
import { CitationList } from '../../components/CitationList';
import { ClaimTypeFilter, ContextBar, EmptyState, MetaRow, PageHead, Prose, RelatedLinks } from '../../components/primitives';
import type { ClaimType, QuestionEntity } from '../../data/types';
import { HISTORICAL_PART_IDS } from '../../data/types';
import { entityTitle, groupByPart } from '../../data/index';
import { HISTORICAL_PART_META } from '../../content/labels';
import { buildHref, entityTypeFromId } from '../../router/route';
import { useReadingProgress } from '../../a11y/readingProgress';

export function QuestionsView({ questionId }: { questionId: string | null }) {
  const { index } = useApp();
  const questions = useMemo(
    () => [...index.questions.values()].sort((a, b) => a.id.localeCompare(b.id)),
    [index],
  );
  const selected = questionId ? index.questions.get(questionId) ?? null : null;
  const groups = useMemo(() => groupByPart(questions, HISTORICAL_PART_IDS), [questions]);

  if (questions.length === 0) {
    return (
      <div>
        <PageHead
          eyebrow="入口 06 / Questions"
          title="历史问题"
          description="围绕「为什么」展开探究：每个答案都连回具体事件、人物与证据。"
        />
        <EmptyState
          title="探究问题尚未加载"
          body="本入口已经就绪，但共享内容文件 content/history.json 还没有交付历史问题。问题与答案全部来自结构化数据，页面不会自行编写「为什么」类问题。"
          details={[
            { text: '契约要求：prompt 以问号结尾、答案 ≥160 汉字、至少 2 个实体关联', contract: 'contracts/README.md §4.10' },
            { text: '五个历史部分都必须有实质性问题', contract: 'contracts/coverage.json requiredQuestionParts' },
          ]}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHead
        eyebrow="入口 06 / Questions"
        title="历史问题"
        description="围绕「为什么」展开探究：每个答案都连回具体事件、人物与证据。答案不是结论清单，而是解释「为什么」——读完应该能自己说出理由。"
      />
      {selected ? (
        <QuestionDetail question={selected} />
      ) : (
        groups.map((group) => (
          <section key={group.part} className="pw-section" aria-labelledby={`qpart-${group.part}`}>
            <h2 className="pw-section__heading" id={`qpart-${group.part}`}>
              <span className="pw-section__index">{String(HISTORICAL_PART_META[group.part].ordinal).padStart(2, '0')}</span>
              {HISTORICAL_PART_META[group.part].title}
            </h2>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {group.items.map((question) => {
                const related = resolveEntities(question, index);
                return (
                  <li className="pw-card" key={question.id} style={{ marginBottom: 'var(--pw-space-3)' }}>
                    <h3 style={{ fontSize: 'var(--pw-size-lg)', marginBottom: 'var(--pw-space-2)' }}>
                      <a href={buildHref('questions', { id: question.id })} style={{ color: 'inherit' }}>
                        {question.prompt}
                      </a>
                    </h3>
                    <p style={{ fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-sm)', color: 'var(--pw-ink-soft)', marginBottom: 'var(--pw-space-2)' }}>
                      {question.answer.length > 140 ? `${question.answer.slice(0, 140)}…` : question.answer}
                    </p>
                    <RelatedLinks groups={[{ title: '这个问题涉及', links: related }]} />
                    <p style={{ margin: 'var(--pw-space-2) 0 0' }}>
                      <a className="pw-btn" href={buildHref('questions', { id: question.id })}>
                        阅读完整答案与证据 →
                      </a>
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}

function resolveEntities(question: QuestionEntity, index: ReturnType<typeof useApp>['index']): { href: string; label: string }[] {
  return question.entityIds
    .map((id) => {
      const entity = index.entities.get(id);
      const type = entityTypeFromId(id);
      if (!entity || !type) return null;
      const view = type === 'event' ? 'timeline' : type === 'battle' ? 'battles' : type === 'person' ? 'people' : type === 'place' ? 'atlas' : 'concepts';
      return { href: buildHref(view, { id }), label: entityTitle(entity) };
    })
    .filter((link): link is { href: string; label: string } => link !== null);
}

function QuestionDetail({ question }: { question: QuestionEntity }) {
  const { index } = useApp();
  const [claimFilter, setClaimFilter] = useState<ClaimType | 'all'>('all');
  const evidence = { sourceIds: question.sourceIds, claimIds: question.claimIds };
  useReadingProgress(`question-${question.id}`);
  const related = resolveEntities(question, index);

  return (
    <article>
      <ContextBar
        items={[
          { key: '历史部分', value: HISTORICAL_PART_META[question.historicalPart]?.title ?? question.historicalPart },
          { key: '涉及实体', value: `${question.entityIds.length} 个` },
          { key: '证据', value: `${evidence.claimIds.length} 条判断 · ${evidence.sourceIds.length} 个来源` },
        ]}
      />
      <PageHead eyebrow="历史问题 / 探究" title={question.prompt} />
      <MetaRow items={[
        { key: 'ID', value: <code>{question.id}</code> },
        { key: '答案长度', value: `${question.answer.length} 字` },
      ]} />

      <section className="pw-section">
        <h2 className="pw-section__heading">
          <span className="pw-section__index">答案</span>
          有证据支持的回应
        </h2>
        <div className="pw-article">
          <div className="pw-section__body">
            <Prose body={question.answer} />
          </div>
          <EvidencePanel
            claimIds={question.claimIds}
            sourceIds={question.sourceIds}
            claimById={index.claims}
            sourceById={index.sources}
            claimTypeFilter={claimFilter}
          />
        </div>
      </section>

      <ClaimTypeFilter value={claimFilter} onChange={setClaimFilter} />

      <h2 className="pw-section__heading">顺着线索继续读</h2>
      <RelatedLinks groups={[{ title: '这个问题涉及', links: related }]} />

      <section style={{ marginTop: 'var(--pw-space-6)' }}>
        <h2 className="pw-section__heading">全部来源</h2>
        <CitationList sourceIds={evidence.sourceIds} sourceById={index.sources} heading="回答中使用的来源" />
      </section>
    </article>
  );
}
