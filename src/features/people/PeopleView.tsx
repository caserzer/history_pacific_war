/**
 * 人物入口（People）
 *
 * 数据：content.people（profile + decisions[]）
 * - 决策卡按契约结构渲染：当时知道什么 → 选项 → 约束 → 选择 → 后果 → 证据；
 * - 不使用「正确/错误」标签代替条件分析（契约 §4.3）；
 * - 双方人物使用同一套版式与证据组件。
 */

import { useMemo, useState } from 'react';
import { useApp } from '../AppContext';
import { EvidencePanel } from '../../components/EvidencePanel';
import { CitationList } from '../../components/CitationList';
import { CertaintyTag } from '../../components/ClaimTag';
import { ClaimTypeFilter, ContextBar, EmptyState, MetaRow, PageHead, Prose, RelatedLinks } from '../../components/primitives';
import type { ClaimType, PersonEntity } from '../../data/types';
import { collectEntityEvidence, groupBySide } from '../../data/index';
import { SERVICE_LABELS, SIDE_LABELS } from '../../content/labels';
import { buildHref } from '../../router/route';
import { useReadingProgress } from '../../a11y/readingProgress';

export function PeopleView({ personId }: { personId: string | null }) {
  const { index } = useApp();
  const people = useMemo(
    () => [...index.people.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')),
    [index],
  );
  const selected = personId ? index.people.get(personId) ?? null : null;

  if (people.length === 0) {
    return (
      <div>
        <PageHead
          eyebrow="入口 03 / People"
          title="人物"
          description="指挥官在只知道当时信息的条件下做了什么选择，又受到哪些限制。"
        />
        <EmptyState
          title="人物档案尚未加载"
          body="本入口已经就绪，但共享内容文件 content/history.json 还没有交付人物档案。人物页按契约渲染「当时知道什么—选项—约束—选择—后果—证据」决策卡，不会用示例人物或编造的心理活动填充。"
          details={[
            { text: '契约要求：每人至少 1 张决策卡，每卡至少 2 个选项与 2 项约束', contract: 'contracts/README.md §4.3' },
            { text: '禁止用「正确/错误」标签代替条件分析', contract: 'contracts/README.md §4.3' },
          ]}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHead
        eyebrow="入口 03 / People"
        title="人物"
        description="指挥官在只知道当时信息的条件下做了什么选择，又受到哪些限制。每个人的决策卡都按「当时知道什么—选项—约束—选择—后果—证据」排列。"
      />
      {selected ? (
        <PersonDetail person={selected} />
      ) : (
        groupBySide(people).map((group) => (
          <section key={group.side} className="pw-section" aria-labelledby={`side-${group.side}`}>
            <h2 className="pw-section__heading" id={`side-${group.side}`}>
              {SIDE_LABELS[group.side as 'japan' | 'allies' | 'neutral'] ?? group.side}
              <span style={{ fontSize: 'var(--pw-size-xs)', color: 'var(--pw-ink-muted)', fontFamily: 'var(--pw-font-mono)', marginLeft: '0.5em' }}>
                {group.items.length} 位
              </span>
            </h2>
            <ol className="pw-entry-grid">
              {group.items.map((person) => (
                <li key={person.id}>
                  <a className="pw-entry-card" href={buildHref('people', { id: person.id })}>
                    <span className="pw-entry-card__en">
                      {person.service ? SERVICE_LABELS[person.service] ?? person.service : ''}
                      {person.originalName ? ` · ${person.originalName}` : ''}
                    </span>
                    <span className="pw-entry-card__title">{person.name}</span>
                    <span className="pw-entry-card__blurb">{person.role}</span>
                    <span className="pw-entry-card__blurb" style={{ color: 'var(--pw-ink-muted)' }}>
                      {person.summary}
                    </span>
                    <span className="pw-entry-card__count">{person.decisions.length} 张决策卡</span>
                  </a>
                </li>
              ))}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}

function PersonDetail({ person }: { person: PersonEntity }) {
  const { index } = useApp();
  const [claimFilter, setClaimFilter] = useState<ClaimType | 'all'>('all');
  const evidence = collectEntityEvidence(person);
  useReadingProgress(`person-${person.id}`);

  return (
    <article>
      <ContextBar
        items={[
          { key: '阵营', value: SIDE_LABELS[person.side] ?? person.side },
          { key: '身份', value: person.role },
          { key: '军种', value: person.service ? SERVICE_LABELS[person.service] ?? person.service : '—' },
          { key: '证据', value: `${evidence.claimIds.length} 条判断 · ${evidence.sourceIds.length} 个来源` },
        ]}
      />
      <PageHead
        eyebrow={`人物 / ${SIDE_LABELS[person.side] ?? person.side}`}
        title={person.name}
        description={person.summary}
      />
      <MetaRow
        items={[
          { key: 'ID', value: <code>{person.id}</code> },
          ...(person.originalName ? [{ key: '原文姓名', value: person.originalName }] : []),
          ...(person.birthDate ? [{ key: '生', value: person.birthDate }] : []),
          ...(person.deathDate ? [{ key: '卒', value: person.deathDate }] : []),
          { key: '决策卡', value: `${person.decisions.length} 张` },
        ]}
      />

      <section className="pw-section">
        <h2 className="pw-section__heading">
          <span className="pw-section__index">档案</span>
          人物全貌
        </h2>
        <div className="pw-article">
          <div className="pw-section__body">
            <Prose body={person.profile} />
          </div>
          <EvidencePanel claimIds={person.claimIds} sourceIds={person.sourceIds} claimById={index.claims} sourceById={index.sources} claimTypeFilter={claimFilter} />
        </div>
      </section>

      <ClaimTypeFilter value={claimFilter} onChange={setClaimFilter} />

      <section aria-labelledby="decisions-heading">
        <h2 className="pw-section__heading" id="decisions-heading">
          <span className="pw-section__index">{String(person.decisions.length).padStart(2, '0')}</span>
          决策卡
        </h2>
        <p style={{ fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-sm)', color: 'var(--pw-ink-soft)' }}>
          每张卡先说明当时能看到的信息，再列出真实存在的备选方案与限制。这样读者能判断决定在当时的条件下是否合理，
          而不是用后来的结果反推「本该如何」。
        </p>
        {person.decisions.length === 0 ? (
          <EmptyState title="该人物还没有决策卡" body="契约要求每个人物至少一张决策卡；这里显示缺失状态，而不是用占位文字充数。" />
        ) : (
          person.decisions.map((decision, i) => (
            <div className="pw-decision" key={decision.id} data-decision-id={decision.id}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--pw-space-3)', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--pw-font-mono)', fontSize: 'var(--pw-size-xs)', color: 'var(--pw-brass-text)' }}>
                  决策 {String(i + 1).padStart(2, '0')}
                </span>
                <h3 style={{ margin: 0, fontSize: 'var(--pw-size-lg)' }}>{decision.title}</h3>
                <CertaintyTag type={decision.certainty} />
              </div>
              <div className="pw-decision__grid">
                <div>
                  <p className="pw-decision__key">当时知道什么</p>
                  <p className="pw-decision__text">{decision.context}</p>
                </div>
                <div>
                  <p className="pw-decision__key">可选方案（{decision.options.length}）</p>
                  <ul className="pw-decision__list">
                    {decision.options.map((option) => (
                      <li key={option}>{option}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="pw-decision__key">约束（{decision.constraints.length}）</p>
                  <ul className="pw-decision__list">
                    {decision.constraints.map((constraint) => (
                      <li key={constraint}>{constraint}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="pw-decision__key">实际选择</p>
                  <p className="pw-decision__text">{decision.choice}</p>
                </div>
                <div>
                  <p className="pw-decision__key">后果</p>
                  <p className="pw-decision__text">{decision.consequence}</p>
                </div>
              </div>
              <EvidencePanel
                claimIds={decision.claimIds}
                sourceIds={decision.sourceIds}
                claimById={index.claims}
                sourceById={index.sources}
                claimTypeFilter={claimFilter}
              />
            </div>
          ))
        )}
      </section>

      <h2 className="pw-section__heading" style={{ marginTop: 'var(--pw-space-6)' }}>相关内容</h2>
      <RelatedLinks
        groups={[
          {
            title: '参与战役',
            links: person.battleIds
              .map((id) => index.battles.get(id))
              .filter((battle) => Boolean(battle))
              .map((battle) => ({ href: buildHref('battles', { id: battle!.id }), label: battle!.title })),
          },
          {
            title: '相关时间线事件',
            links: person.eventIds
              .map((id) => index.events.get(id))
              .filter((event) => Boolean(event))
              .map((event) => ({ href: buildHref('timeline', { id: event!.id }), label: event!.title })),
          },
          {
            title: '同时代其他人物',
            links: person.relatedPersonIds
              .map((id) => index.people.get(id))
              .filter((other) => Boolean(other))
              .map((other) => ({ href: buildHref('people', { id: other!.id }), label: other!.name, hint: other!.role })),
          },
          {
            title: '地点',
            links: person.placeIds
              .map((id) => index.places.get(id))
              .filter((place) => Boolean(place))
              .map((place) => ({ href: buildHref('atlas', { id: place!.id }), label: place!.historicalName, hint: place!.modernName })),
          },
          {
            title: '知识专题',
            links: person.conceptIds
              .map((id) => index.concepts.get(id))
              .filter((concept) => Boolean(concept))
              .map((concept) => ({ href: buildHref('concepts', { id: concept!.id }), label: concept!.title })),
          },
          {
            title: '出现在这些问题中',
            links: (index.questionsByEntity.get(person.id) ?? []).map((question) => ({
              href: buildHref('questions', { id: question.id }),
              label: question.prompt,
            })),
          },
        ]}
      />

      <section style={{ marginTop: 'var(--pw-space-6)' }}>
        <h2 className="pw-section__heading">全部来源</h2>
        <CitationList sourceIds={evidence.sourceIds} sourceById={index.sources} heading="本档案使用的来源" />
      </section>
    </article>
  );
}
