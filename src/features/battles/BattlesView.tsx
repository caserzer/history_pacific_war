/**
 * 战役入口（Battles）
 *
 * 数据：content.battles
 * - 详情按契约的十四类固定字段顺序渲染（coverage.battleSectionKeys），每节带独立 EvidencePanel；
 * - 地图阶段（phases[]）按 sequence 排序展示：时间、双方位置、已知/未知敌情、决策、后果、
 *   双方视角与示意航线声明。（交互式推演由 MAP-01 基于同一 phases[] 实现。）
 * - 双方对称呈现，不使用「己方/敌方」视角，也不做胜负英雄化叙述。
 */

import { useMemo, useState } from 'react';
import { useApp } from '../AppContext';
import { EvidencePanel } from '../../components/EvidencePanel';
import { CitationList } from '../../components/CitationList';
import { CertaintyTag, ClaimTag } from '../../components/ClaimTag';
import {
  ClaimTypeFilter,
  ContextBar,
  EmptyState,
  MetaRow,
  PageHead,
  Prose,
  RelatedLinks,
} from '../../components/primitives';
import {
  BATTLE_SECTION_KEYS,
  type BattleEntity,
  type BattleSectionKey,
  type ClaimType,
  type Phase,
  type Side,
} from '../../data/types';
import { collectEntityEvidence, sortBattles } from '../../data/index';
import { BATTLE_SECTION_TITLES, BATTLE_TYPE_LABELS, HISTORICAL_PART_META, SIDE_LABELS } from '../../content/labels';
import { buildHref } from '../../router/route';
import { useReadingProgress } from '../../a11y/readingProgress';

const OUTCOME_LABELS: Record<string, string> = {
  japan: '日本方面达成其作战目标',
  allies: '盟军方面达成其作战目标',
  inconclusive: '交战结果不宜用单一「胜方」概括',
};

export function BattlesView({ battleId }: { battleId: string | null }) {
  const { index } = useApp();
  const battles = useMemo(() => sortBattles([...index.battles.values()]), [index]);
  const selected = battleId ? index.battles.get(battleId) ?? null : null;

  if (battles.length === 0) {
    return (
      <div>
        <PageHead
          eyebrow="入口 02 / Battles"
          title="战役"
          description="深入单场战斗：从背景、地理、军力到决策、损失与历史争议共十四类分析。"
        />
        <EmptyState
          title="战役数据尚未加载"
          body="本入口已经就绪，但共享内容文件 content/history.json 还没有交付任何战役。战役页按契约的十四类固定字段渲染，不会用示例战役或编造的舰艇数量填充。"
          details={[
            { text: '契约要求：sections 恰好十四个固定键（背景…延伸阅读）', contract: 'contracts/coverage.json battleSectionKeys' },
            { text: '地图阶段：phases[] 按 sequence 排序，位置必须标记 schematic', contract: 'contracts/README.md §4.2' },
          ]}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHead
        eyebrow="入口 02 / Battles"
        title="战役"
        description="深入单场战斗：从背景、地理、军力到决策、损失与历史争议共十四类分析。每类分析都带自己的来源与判断，读者可以逐节查看证据。"
      />
      {selected ? (
        <>
          {selected.id === 'battle-midway' ? <p className="pw-card"><a className="pw-btn" href={buildHref('midway')}>体验中途岛新版：分层阅读与战役地图 →</a></p> : null}
          <BattleDetail battle={selected} />
        </>
      ) : (
        <ol className="pw-entry-grid" aria-label="战役列表">
          {battles.map((battle) => (
            <li key={battle.id}>
              <a className="pw-entry-card" href={buildHref('battles', { id: battle.id })}>
                <span className="pw-entry-card__en">{BATTLE_TYPE_LABELS[battle.battleType] ?? battle.battleType}</span>
                <span className="pw-entry-card__title">{battle.title}</span>
                <span className="pw-entry-card__blurb">{battle.summary}</span>
                <span className="pw-entry-card__count">
                  {battle.startDate} — {battle.endDate} · {battle.phases.length} 个地图阶段
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function BattleDetail({ battle }: { battle: BattleEntity }) {
  const { index } = useApp();
  const [claimFilter, setClaimFilter] = useState<ClaimType | 'all'>('all');
  const evidence = collectEntityEvidence(battle);
  useReadingProgress(`battle-${battle.id}`);
  const phases = useMemo(() => [...battle.phases].sort((a, b) => a.sequence - b.sequence), [battle.phases]);
  const placeNames = battle.placeIds.map((id) => index.places.get(id)).filter((place) => Boolean(place));

  return (
    <article aria-labelledby="battle-title">
      <ContextBar
        items={[
          { key: '时间', value: `${battle.startDate} — ${battle.endDate}` },
          {
            key: '地点',
            value:
              placeNames.length > 0 ? (
                <span>
                  {placeNames.map((place, i) => (
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
          { key: '所属部分', value: HISTORICAL_PART_META[battle.historicalPart]?.title ?? battle.historicalPart },
          { key: '证据', value: `${evidence.claimIds.length} 条判断 · ${evidence.sourceIds.length} 个来源` },
        ]}
      />
      <PageHead
        eyebrow={`战役 / ${BATTLE_TYPE_LABELS[battle.battleType] ?? battle.battleType}`}
        title={battle.title}
        description={battle.summary}
      />
      <MetaRow
        items={[
          { key: 'ID', value: <code>{battle.id}</code> },
          { key: '日方', value: battle.belligerents.japan ?? '—' },
          { key: '盟军', value: battle.belligerents.allies ?? '—' },
          { key: '地图阶段', value: `${phases.length} 个` },
        ]}
      />

      <section className="pw-card" aria-labelledby="outcome-heading" style={{ marginBottom: 'var(--pw-space-5)' }}>
        <h2 className="pw-section__heading" id="outcome-heading" style={{ borderBottom: 0, marginBottom: 'var(--pw-space-2)' }}>
          结果与把握程度
        </h2>
        <p style={{ margin: '0 0 var(--pw-space-2)' }}>{battle.outcome.summary}</p>
        <p style={{ margin: 0, fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-sm)', color: 'var(--pw-ink-soft)' }}>
          交战结果的表述：{OUTCOME_LABELS[battle.outcome.winner] ?? battle.outcome.winner}。这一判断的证据把握：
          <CertaintyTag type={battle.outcome.certainty} />
          <span style={{ display: 'block', marginTop: '0.35rem', fontSize: 'var(--pw-size-xs)', color: 'var(--pw-ink-muted)' }}>
            「争议」表示研究者对结果的解释或统计口径存在分歧；「示意」表示这是教学简化，不能当作精确历史数据。
          </span>
        </p>
      </section>

      <ClaimTypeFilter value={claimFilter} onChange={setClaimFilter} />

      <nav aria-label="本页小节" className="pw-card" style={{ marginBottom: 'var(--pw-space-5)' }}>
        <p style={{ margin: '0 0 var(--pw-space-2)', fontFamily: 'var(--pw-font-mono)', fontSize: 'var(--pw-size-xs)', letterSpacing: '0.1em', color: 'var(--pw-brass-text)' }}>
          十四类分析
        </p>
        <ul className="pw-chip-list">
          {BATTLE_SECTION_KEYS.map((key, i) => (
            <li key={key}>
              <a className="pw-chip" href={`#battle-section-${key}`} onClick={(event) => {
                event.preventDefault();
                document.getElementById(`battle-section-${key}`)?.scrollIntoView({ block: 'start' });
              }}>
                <span style={{ fontFamily: 'var(--pw-font-mono)', marginRight: '0.4em', color: 'var(--pw-brass-text)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {BATTLE_SECTION_TITLES[key]}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {BATTLE_SECTION_KEYS.map((key, i) => (
        <BattleSectionBlock
          key={key}
          sectionKey={key}
          index={i}
          battle={battle}
          claimFilter={claimFilter}
        />
      ))}

      <section aria-labelledby="phases-heading" style={{ marginTop: 'var(--pw-space-6)' }}>
        <h2 className="pw-section__heading" id="phases-heading">
          <span className="pw-section__index">地图阶段</span>
          按时间理解战场
        </h2>
        {phases.length === 0 ? (
          <EmptyState
            title="这场战役还没有地图阶段数据"
            body="契约允许 phases 为空；现场推演由 MAP-01 在 phases[] 存在时实现，页面不会虚构阶段位置。"
          />
        ) : (
          <>
            <p style={{ fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-sm)', color: 'var(--pw-ink-soft)' }}>
              每个阶段都分别记录「当时双方各自知道什么」与「不知道什么」。阶段位置与航线按契约标记为示意，
              请把它理解为帮助理解的模型，而不是精确的历史航迹。
            </p>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {phases.map((phase) => (
                <PhaseBlock key={phase.id} phase={phase} battleId={battle.id} claimFilter={claimFilter} />
              ))}
            </ol>
          </>
        )}
      </section>

      <h2 className="pw-section__heading" style={{ marginTop: 'var(--pw-space-6)' }}>相关内容</h2>
      <RelatedLinks
        groups={[
          {
            title: '指挥官',
            links: (['japan', 'allies'] as const).flatMap((side) =>
              (battle.commanderIds[side] ?? [])
                .map((id) => index.people.get(id))
                .filter((person) => Boolean(person))
                .map((person) => ({
                  href: buildHref('people', { id: person!.id }),
                  label: `${SIDE_LABELS[side]}：${person!.name}`,
                  hint: person!.role,
                })),
            ),
          },
          {
            title: '编制与装备',
            links: [
              ...battle.unitIds
                .map((id) => index.units.get(id))
                .filter((unit) => Boolean(unit))
                .map((unit) => ({ href: buildHref('battles'), label: `编制：${unit!.name}` })),
              ...battle.equipmentIds
                .map((id) => index.equipment.get(id))
                .filter((item) => Boolean(item))
                .map((item) => ({ href: buildHref('concepts'), label: `装备：${item!.name}` })),
            ],
          },
          {
            title: '知识专题',
            links: battle.conceptIds
              .map((id) => index.concepts.get(id))
              .filter((concept) => Boolean(concept))
              .map((concept) => ({ href: buildHref('concepts', { id: concept!.id }), label: concept!.title })),
          },
          {
            title: '相关时间线事件',
            links: [
              ...phases.flatMap((phase) => phase.eventIds).map((id) => index.events.get(id)).filter((event) => Boolean(event)),
              ...(index.eventsByEntity.get(battle.id) ?? []),
            ]
              .filter((event, i, arr) => arr.findIndex((other) => other!.id === event!.id) === i)
              .map((event) => ({ href: buildHref('timeline', { id: event!.id }), label: event!.title })),
          },
          {
            title: '出现在这些问题中',
            links: (index.questionsByEntity.get(battle.id) ?? []).map((question) => ({
              href: buildHref('questions', { id: question.id }),
              label: question.prompt,
            })),
          },
        ]}
      />

      <section style={{ marginTop: 'var(--pw-space-6)' }}>
        <h2 className="pw-section__heading">全部来源</h2>
        <CitationList sourceIds={evidence.sourceIds} sourceById={index.sources} heading="本文使用的来源" />
      </section>
    </article>
  );
}

function BattleSectionBlock({
  sectionKey,
  index: sectionIndex,
  battle,
  claimFilter,
}: {
  sectionKey: BattleSectionKey;
  index: number;
  battle: BattleEntity;
  claimFilter: ClaimType | 'all';
}) {
  const { index } = useApp();
  const section = battle.sections?.[sectionKey];
  if (!section) {
    return (
      <section className="pw-section" id={`battle-section-${sectionKey}`} aria-labelledby={`h-${sectionKey}`}>
        <h2 className="pw-section__heading" id={`h-${sectionKey}`}>
          <span className="pw-section__index">{String(sectionIndex + 1).padStart(2, '0')}</span>
          {BATTLE_SECTION_TITLES[sectionKey]}
        </h2>
        <EmptyState title="这一节尚未交付" body="契约要求战役恰好十四类字段；这里显示字段缺失，而不是用占位文字充数。" />
      </section>
    );
  }
  return (
    <section className="pw-section" id={`battle-section-${sectionKey}`} aria-labelledby={`h-${sectionKey}`} data-battle-section={sectionKey}>
      <h2 className="pw-section__heading" id={`h-${sectionKey}`}>
        <span className="pw-section__index">{String(sectionIndex + 1).padStart(2, '0')}</span>
        {section.title || BATTLE_SECTION_TITLES[sectionKey]}
      </h2>
      <div className="pw-article">
        <div className="pw-section__body">
          <Prose body={section.body} />
        </div>
        <EvidencePanel
          claimIds={section.claimIds}
          sourceIds={section.sourceIds}
          claimById={index.claims}
          sourceById={index.sources}
          claimTypeFilter={claimFilter}
        />
      </div>
    </section>
  );
}

function PhaseBlock({ phase, battleId, claimFilter }: { phase: Phase; battleId: string; claimFilter: ClaimType | 'all' }) {
  const { index } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <li className="pw-card" style={{ marginBottom: 'var(--pw-space-4)' }} data-phase-id={phase.id} data-phase-battle={battleId}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--pw-space-3)', alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'var(--pw-font-mono)', fontSize: 'var(--pw-size-xs)', color: 'var(--pw-brass-text)', letterSpacing: '0.1em' }}>
          阶段 {String(phase.sequence).padStart(2, '0')}
        </span>
        <h3 style={{ margin: 0, fontSize: 'var(--pw-size-lg)' }}>{phase.title}</h3>
        <CertaintyTag type={phase.certainty} />
        {phase.schematic ? <ClaimTag type="schematic" /> : null}
        <button type="button" className="pw-btn" aria-expanded={open} onClick={() => setOpen((value) => !value)} style={{ marginLeft: 'auto' }}>
          {open ? '收起细节' : '展开双方视角与证据'}
        </button>
      </div>
      <p style={{ margin: 'var(--pw-space-2) 0', fontFamily: 'var(--pw-font-mono)', fontSize: 'var(--pw-size-xs)', color: 'var(--pw-ink-muted)' }}>
        {phase.time.display}
      </p>
      {/* MAP-01：从战役叙述定位到地图阶段（深链 URL 由 buildHref 生成，base 子路径无关）。 */}
      <p style={{ margin: '0 0 var(--pw-space-2)' }}>
        <a
          className="pw-btn"
          href={buildHref('atlas', { battle: battleId, phase: phase.id })}
          data-phase-map-link={phase.id}
          data-phase-map-battle={battleId}
        >
          在地图上查看此阶段 →
        </a>
      </p>
      <p style={{ margin: '0 0 var(--pw-space-2)', fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-sm)', color: 'var(--pw-ink-soft)' }}>
        {phase.uncertaintyNote}
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table className="pw-table">
          <caption className="pw-visually-hidden">双方在该阶段的位置、已知与未知敌情、决策与后果</caption>
          <thead>
            <tr>
              <th scope="col">项目</th>
              <th scope="col">日本</th>
              <th scope="col">盟军</th>
            </tr>
          </thead>
          <tbody>
            <PhaseRow label="位置" field="positions" render={(side) => `${phase.positions[side].label}——${phase.positions[side].description}（不确定半径约 ${phase.positions[side].uncertaintyRadiusKm} km）`} />
            <PhaseRow label="已知敌情" field="knownEnemy" render={(side) => phase.knownEnemy[side]} />
            <PhaseRow label="未知敌情" field="unknownEnemy" render={(side) => phase.unknownEnemy[side]} />
            <PhaseRow label="关键决策" field="decision" render={(side) => phase.decision[side]} />
            <PhaseRow label="直接后果" field="consequence" render={(side) => phase.consequence[side]} />
          </tbody>
        </table>
      </div>
      {open ? (
        <div style={{ marginTop: 'var(--pw-space-3)' }}>
          <h4 style={{ fontSize: 'var(--pw-size-md)' }}>当时双方的视角</h4>
          <div className="pw-decision__grid">
            {(['japan', 'allies'] as const).map((side) => (
              <div key={side}>
                <p className="pw-decision__key">{SIDE_LABELS[side]}视角</p>
                <p className="pw-decision__text">{phase.viewpoints[side].perspective}</p>
              </div>
            ))}
          </div>
          {phase.routes.length > 0 ? (
            <>
              <h4 style={{ fontSize: 'var(--pw-size-md)', marginTop: 'var(--pw-space-4)' }}>示意航线</h4>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-sm)' }}>
                {phase.routes.map((route) => (
                  <li key={route.id} style={{ marginBottom: 'var(--pw-space-2)' }}>
                    <strong>{SIDE_LABELS[route.side]}：{route.label}</strong>
                    <span style={{ display: 'block', color: 'var(--pw-ink-soft)' }}>{route.note}</span>
                    <span style={{ fontFamily: 'var(--pw-font-mono)', fontSize: 'var(--pw-size-xs)', color: 'var(--pw-alert)' }}>
                      示意航线（不是精确历史航迹）
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <EvidencePanel
            claimIds={phase.claimIds}
            sourceIds={phase.sourceIds}
            claimById={index.claims}
            sourceById={index.sources}
            claimTypeFilter={claimFilter}
          />
        </div>
      ) : null}
    </li>
  );
}

function PhaseRow({
  label,
  field,
  render,
}: {
  label: string;
  field: string;
  render: (side: Side) => string;
}) {
  return (
    <tr data-phase-field={field}>
      <th scope="row">{label}</th>
      <td>{render('japan')}</td>
      <td>{render('allies')}</td>
    </tr>
  );
}
