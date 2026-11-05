/**
 * 知识专题入口（Concepts）
 *
 * 数据：content.concepts
 * - 契约要求恰好三层 layers（level 1/2/3）：是什么 → 怎样运作 → 为什么影响决策；
 *   UI 用三级分栏呈现，**不折叠成一段、不只显示第一层**（契约 §4.7）。
 * - relatedEntityIds 把专题接回时间线、战役与人物。
 */

import { useMemo, useState } from 'react';
import { useApp } from '../AppContext';
import { EvidencePanel } from '../../components/EvidencePanel';
import { CitationList } from '../../components/CitationList';
import { ClaimTypeFilter, ContextBar, EmptyState, MetaRow, PageHead, Prose, RelatedLinks } from '../../components/primitives';
import type { ClaimType, ConceptEntity } from '../../data/types';
import { collectEntityEvidence } from '../../data/index';
import { entityTitle } from '../../data/index';
import { buildHref, entityTypeFromId } from '../../router/route';
import { ReadingLayersDiagram } from '../../diagrams/Diagrams';
import { useReadingProgress } from '../../a11y/readingProgress';

const LAYER_LABELS: Record<number, string> = {
  1: '第 1 层 · 是什么',
  2: '第 2 层 · 怎样运作',
  3: '第 3 层 · 为什么影响决策',
};

export function ConceptsView({ conceptId }: { conceptId: string | null }) {
  const { index } = useApp();
  const concepts = useMemo(
    () => [...index.concepts.values()].sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN')),
    [index],
  );
  const selected = conceptId ? index.concepts.get(conceptId) ?? null : null;

  if (concepts.length === 0) {
    return (
      <div>
        <PageHead
          eyebrow="入口 05 / Concepts"
          title="知识专题"
          description="三层解释：是什么 → 怎样运作 → 为什么会影响一场战役的决策。"
        />
        <EmptyState
          title="知识专题尚未加载"
          body="本入口已经就绪，但共享内容文件 content/history.json 还没有交付知识专题。专题按契约要求恰好三层、逐层递进，不会用示例术语解释充数。"
          details={[
            { text: '契约要求：layers 恰好 3 层，每层独立带来源与 claim', contract: 'contracts/README.md §4.7' },
            { text: 'relatedEntityIds 至少 2 个内容实体，用于接回战役与人物', contract: 'contracts/README.md §4.7' },
          ]}
        />
        <ReadingLayersDiagram />
      </div>
    );
  }

  return (
    <div>
      <PageHead
        eyebrow="入口 05 / Concepts"
        title="知识专题"
        description="三层解释：是什么 → 怎样运作 → 为什么会影响一场战役的决策。每一层都有自己的来源与判断，可以单独核查。"
      />
      {selected ? (
        <ConceptDetail concept={selected} />
      ) : (
        <>
          <ol className="pw-entry-grid" aria-label="知识专题列表">
            {concepts.map((concept) => (
              <li key={concept.id}>
                <a className="pw-entry-card" href={buildHref('concepts', { id: concept.id })}>
                  <span className="pw-entry-card__en">{concept.layers.length} 层解释</span>
                  <span className="pw-entry-card__title">{concept.title}</span>
                  <span className="pw-entry-card__blurb">{concept.summary}</span>
                  <span className="pw-entry-card__count">关联 {concept.relatedEntityIds.length} 个实体</span>
                </a>
              </li>
            ))}
          </ol>
          <ReadingLayersDiagram />
        </>
      )}
    </div>
  );
}

function ConceptDetail({ concept }: { concept: ConceptEntity }) {
  const { index } = useApp();
  const [claimFilter, setClaimFilter] = useState<ClaimType | 'all'>('all');
  const evidence = collectEntityEvidence(concept);
  useReadingProgress(`concept-${concept.id}`);

  const relatedGroups = useMemo(() => {
    const groups: Record<string, { href: string; label: string }[]> = {
      时间线: [],
      战役: [],
      人物: [],
      地点: [],
      编制与装备: [],
      其他专题: [],
    };
    for (const id of concept.relatedEntityIds) {
      const entity = index.entities.get(id);
      if (!entity) continue;
      if (id.startsWith('unit-')) {
        const unit = index.units.get(id);
        if (unit) groups['编制与装备']!.push({ href: buildHref('battles'), label: unit.name });
        continue;
      }
      if (id.startsWith('equipment-')) {
        const item = index.equipment.get(id);
        if (item) groups['编制与装备']!.push({ href: buildHref('concepts'), label: item.name });
        continue;
      }
      const type = entityTypeFromId(id);
      if (!type) continue;
      const label = entityTitle(entity);
      const href = buildHref(type === 'event' ? 'timeline' : type === 'battle' ? 'battles' : type === 'person' ? 'people' : type === 'place' ? 'atlas' : 'concepts', { id });
      const key = type === 'event' ? '时间线' : type === 'battle' ? '战役' : type === 'person' ? '人物' : type === 'place' ? '地点' : '其他专题';
      groups[key]!.push({ href, label });
    }
    return Object.entries(groups)
      .filter(([, links]) => links.length > 0)
      .map(([title, links]) => ({ title, links }));
  }, [concept.relatedEntityIds, index]);

  return (
    <article>
      <ContextBar
        items={[
          { key: '专题', value: concept.title },
          { key: '层数', value: `${concept.layers.length} 层` },
          { key: '关联实体', value: `${concept.relatedEntityIds.length} 个` },
          { key: '证据', value: `${evidence.claimIds.length} 条判断 · ${evidence.sourceIds.length} 个来源` },
        ]}
      />
      <PageHead eyebrow="知识专题" title={concept.title} description={concept.summary} />
      <MetaRow
        items={[
          { key: 'ID', value: <code>{concept.id}</code> },
          { key: '层级', value: concept.layers.map((layer) => layer.level).join(' / ') },
        ]}
      />
      <ClaimTypeFilter value={claimFilter} onChange={setClaimFilter} />

      <section className="pw-card" aria-labelledby="why-heading" style={{ marginBottom: 'var(--pw-space-5)' }}>
        <h2 style={{ fontSize: 'var(--pw-size-lg)', marginBottom: 'var(--pw-space-2)' }} id="why-heading">为什么重要</h2>
        <Prose body={concept.whyItMatters} />
        <EvidencePanel claimIds={concept.claimIds} sourceIds={concept.sourceIds} claimById={index.claims} sourceById={index.sources} claimTypeFilter={claimFilter} />
      </section>

      <div className="pw-layers">
        {concept.layers.map((layer) => (
          <section className={`pw-layer pw-layer--${layer.level}`} key={layer.level} data-layer-level={layer.level}>
            <p className="pw-layer__level">{LAYER_LABELS[layer.level] ?? `第 ${layer.level} 层`}</p>
            <h3 style={{ fontSize: 'var(--pw-size-lg)', margin: 'var(--pw-space-1) 0 var(--pw-space-2)' }}>{layer.title}</h3>
            <div className="pw-section__body">
              <Prose body={layer.body} />
            </div>
            <EvidencePanel
              claimIds={layer.claimIds}
              sourceIds={layer.sourceIds}
              claimById={index.claims}
              sourceById={index.sources}
              claimTypeFilter={claimFilter}
            />
          </section>
        ))}
      </div>

      <h2 className="pw-section__heading" style={{ marginTop: 'var(--pw-space-6)' }}>相关内容</h2>
      <RelatedLinks groups={relatedGroups} />

      <section style={{ marginTop: 'var(--pw-space-6)' }}>
        <h2 className="pw-section__heading">全部来源</h2>
        <CitationList sourceIds={evidence.sourceIds} sourceById={index.sources} heading="本专题使用的来源" />
      </section>
    </article>
  );
}
