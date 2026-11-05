/**
 * 数据索引与查询 —— 纯函数，无 React 依赖，可直接用契约 fixture 做单元测试。
 *
 * 设计依据（contracts/README.md §3.3 / §9）：
 * - 六个入口共享同一批实体 ID，链接由引用字段建立，不另建孤立页面数据；
 * - 所有引用先解析成实体，缺失即降级隐藏而不是崩溃（验证器保证引用完整，
 *   UI 仍要防御性处理）；
 * - 反向索引让读者看到「这条内容还出现在哪里」。
 */

import type {
  ArticleEntity,
  BattleEntity,
  Claim,
  ClaimType,
  ConceptEntity,
  ContentDocument,
  EquipmentEntity,
  EventEntity,
  HistoricalPartId,
  MediaAsset,
  PersonEntity,
  PlaceEntity,
  QuestionEntity,
  Source,
  UnitEntity,
} from './types';
import { ANALYSIS_PROFILE_KEYS, type AnalysisProfileKey } from './types';
export { ANALYSIS_PROFILE_KEYS, type AnalysisProfileKey } from './types';

export type EntityMap<T> = ReadonlyMap<string, T>;

export interface ContentIndex {
  doc: ContentDocument;
  events: EntityMap<EventEntity>;
  battles: EntityMap<BattleEntity>;
  people: EntityMap<PersonEntity>;
  places: EntityMap<PlaceEntity>;
  units: EntityMap<UnitEntity>;
  equipment: EntityMap<EquipmentEntity>;
  concepts: EntityMap<ConceptEntity>;
  sources: EntityMap<Source>;
  media: EntityMap<MediaAsset>;
  questions: EntityMap<QuestionEntity>;
  claims: EntityMap<Claim>;
  /** 任意实体 ID → 实体（不含 source / media / question / claim）。 */
  entities: EntityMap<ArticleEntity>;
  /** 任意实体 ID → 实体类型。 */
  entityTypes: EntityMap<EntityKind>;
  /** 反向索引：实体 ID → 引用它的时间线事件。 */
  eventsByEntity: EntityMap<EventEntity[]>;
  /** 反向索引：实体 ID → 引用它的战役。 */
  battlesByEntity: EntityMap<BattleEntity[]>;
  /** 反向索引：实体 ID → 引用它的人物。 */
  peopleByEntity: EntityMap<PersonEntity[]>;
  /** 反向索引：实体 ID → 引用它的知识专题。 */
  conceptsByEntity: EntityMap<ConceptEntity[]>;
  /** 反向索引：实体 ID → 引用它的问题。 */
  questionsByEntity: EntityMap<QuestionEntity[]>;
  /** 反向索引：实体 ID → 牵涉它的 claim。 */
  claimsByEntity: EntityMap<Claim[]>;
  /** 反向索引：来源 ID → 引用它的 claim。 */
  claimsBySource: EntityMap<Claim[]>;
  /** 反向索引：来源 ID → 引用它的实体。 */
  entitiesBySource: EntityMap<ArticleEntity[]>;
}

export type EntityKind = 'event' | 'battle' | 'person' | 'place' | 'unit' | 'equipment' | 'concept';

function indexBy<T extends { id: string }>(items: readonly T[] | undefined): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items ?? []) {
    if (item && typeof item.id === 'string') map.set(item.id, item);
  }
  return map;
}

function pushInto<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

/** 引用字段的「本实体 → 它引用了谁」抽取表。 */
function entityRefs(entity: ArticleEntity): string[] {
  const refs: string[] = [];
  const collect = (values: readonly string[] | undefined) => {
    if (Array.isArray(values)) refs.push(...values);
  };
  if ('placeIds' in entity) collect(entity.placeIds);
  if ('personIds' in entity && Array.isArray(entity.personIds)) collect(entity.personIds);
  if ('unitIds' in entity && Array.isArray(entity.unitIds)) collect(entity.unitIds);
  if ('equipmentIds' in entity && Array.isArray(entity.equipmentIds)) collect(entity.equipmentIds);
  if ('conceptIds' in entity && Array.isArray(entity.conceptIds)) collect(entity.conceptIds);
  if ('relatedEventIds' in entity && Array.isArray(entity.relatedEventIds)) collect(entity.relatedEventIds);
  if ('relatedPersonIds' in entity && Array.isArray(entity.relatedPersonIds)) collect(entity.relatedPersonIds);
  if ('relatedPlaceIds' in entity && Array.isArray(entity.relatedPlaceIds)) collect(entity.relatedPlaceIds);
  if ('relatedEntityIds' in entity && Array.isArray(entity.relatedEntityIds)) collect(entity.relatedEntityIds);
  if ('eventIds' in entity && Array.isArray(entity.eventIds)) collect(entity.eventIds);
  if ('battleIds' in entity && Array.isArray(entity.battleIds)) collect(entity.battleIds);
  if ('entityIds' in entity && Array.isArray(entity.entityIds)) collect(entity.entityIds);
  if ('battleId' in entity && typeof entity.battleId === 'string') refs.push(entity.battleId);
  return refs;
}

export function buildIndex(doc: ContentDocument): ContentIndex {
  const events = indexBy(doc.events);
  const battles = indexBy(doc.battles);
  const people = indexBy(doc.people);
  const places = indexBy(doc.places);
  const units = indexBy(doc.units);
  const equipment = indexBy(doc.equipment);
  const concepts = indexBy(doc.concepts);
  const sources = indexBy(doc.sources);
  const media = indexBy(doc.media);
  const questions = indexBy(doc.questions);
  const claims = indexBy(doc.claims);

  const entities = new Map<string, ArticleEntity>();
  const entityTypes = new Map<string, EntityKind>();
  const register = <T extends ArticleEntity>(kind: EntityKind, map: Map<string, T>) => {
    for (const [id, entity] of map) {
      entities.set(id, entity as ArticleEntity);
      entityTypes.set(id, kind);
    }
  };
  register('event', events);
  register('battle', battles);
  register('person', people);
  register('place', places);
  register('unit', units);
  register('equipment', equipment);
  register('concept', concepts);

  const eventsByEntity = new Map<string, EventEntity[]>();
  const battlesByEntity = new Map<string, BattleEntity[]>();
  const peopleByEntity = new Map<string, PersonEntity[]>();
  const conceptsByEntity = new Map<string, ConceptEntity[]>();
  const questionsByEntity = new Map<string, QuestionEntity[]>();
  const claimsByEntity = new Map<string, Claim[]>();
  const claimsBySource = new Map<string, Claim[]>();
  const entitiesBySource = new Map<string, ArticleEntity[]>();

  for (const event of events.values()) {
    for (const ref of new Set(entityRefs(event))) pushInto(eventsByEntity, ref, event);
  }
  for (const battle of battles.values()) {
    for (const ref of new Set(entityRefs(battle))) pushInto(battlesByEntity, ref, battle);
    // 战役的双方指挥官也要能在人物页反向查到。
    for (const side of ['japan', 'allies'] as const) {
      for (const id of battle.commanderIds?.[side] ?? []) pushInto(battlesByEntity, id, battle);
    }
    for (const phase of battle.phases ?? []) {
      for (const side of ['japan', 'allies'] as const) {
        for (const id of phase.positions?.[side]?.placeIds ?? []) pushInto(battlesByEntity, id, battle);
        for (const route of phase.routes ?? []) {
          pushInto(battlesByEntity, route.fromPlaceId, battle);
          pushInto(battlesByEntity, route.toPlaceId, battle);
        }
      }
    }
  }
  for (const person of people.values()) {
    for (const ref of new Set(entityRefs(person))) pushInto(peopleByEntity, ref, person);
  }
  for (const concept of concepts.values()) {
    for (const ref of new Set(entityRefs(concept))) pushInto(conceptsByEntity, ref, concept);
  }
  for (const question of questions.values()) {
    for (const ref of new Set(question.entityIds)) pushInto(questionsByEntity, ref, question);
  }
  for (const claim of claims.values()) {
    for (const ref of new Set(claim.entityIds)) pushInto(claimsByEntity, ref, claim);
    for (const sourceId of new Set(claim.sourceIds)) pushInto(claimsBySource, sourceId, claim);
  }
  for (const [id, entity] of entities) {
    void id;
    for (const sourceId of new Set((entity as { sourceIds?: string[] }).sourceIds ?? [])) {
      pushInto(entitiesBySource, sourceId, entity);
    }
    // 战役小节/文章小节/专题层的来源也算「该实体引用」。
    const sections = collectSectionEvidence(entity);
    for (const sourceId of sections.sourceIds) pushInto(entitiesBySource, sourceId, entity);
  }

  return {
    doc,
    events,
    battles,
    people,
    places,
    units,
    equipment,
    concepts,
    sources,
    media,
    questions,
    claims,
    entities,
    entityTypes,
    eventsByEntity,
    battlesByEntity,
    peopleByEntity,
    conceptsByEntity,
    questionsByEntity,
    claimsByEntity,
    claimsBySource,
    entitiesBySource,
  };
}

/** 一节证据（小节标题 + 来源 + claim），用于「小节级证据」渲染。 */
export interface EvidenceBlock {
  key: string;
  heading: string;
  sourceIds: string[];
  claimIds: string[];
}

/**
 * 早期扩张战役分析的**唯一**取值入口（ARCH-02 已接受契约）。
 *
 * 契约只有十键具名 `analysisProfiles`（见 contracts/content.schema.json
 * $defs.analysisProfiles 与 contracts/README.md）；旧五键 `earlyCampaignAnalysis`
 * 已被门禁一律拒绝，因此这里**没有** legacy 分支，也不读取该字段。
 *
 * 返回契约顺序（ANALYSIS_PROFILE_KEYS）下**可渲染**的小节：
 * - 标题与正文都非空的小节才会返回，因此 UI 不可能出现「空洞小节」或
 *   `undefined` 标题；
 * - 每个小节原样携带自己的 `sourceIds` / `claimIds`，供小节级证据面板使用；
 * - 事件没有 `analysisProfiles`（或全部小节为空）时返回 `null`，UI 不渲染分析区。
 *
 * 视图（TimelineView）与站点验证器都经由本函数取值，避免两处各写一套判断。
 */
export interface AnalysisProfileBlock {
  key: AnalysisProfileKey;
  title: string;
  body: string;
  sourceIds: string[];
  claimIds: string[];
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function analysisProfileBlocks(event: EventEntity): AnalysisProfileBlock[] | null {
  const profiles = event.analysisProfiles;
  if (!profiles || typeof profiles !== 'object') return null;
  const blocks: AnalysisProfileBlock[] = [];
  for (const key of ANALYSIS_PROFILE_KEYS) {
    const section = profiles[key];
    if (!section || typeof section !== 'object') continue;
    // 只渲染有标题且有正文的小节：避免「空洞小节」与伪造的占位标题。
    if (!nonEmptyString(section.title) || !nonEmptyString(section.body)) continue;
    blocks.push({
      key,
      title: section.title.trim(),
      body: section.body,
      sourceIds: stringArray(section.sourceIds),
      claimIds: stringArray(section.claimIds),
    });
  }
  return blocks.length > 0 ? blocks : null;
}

/**
 * 抽取一个实体的**全部小节级证据块**。
 * 契约 §3.3：文章正文里每一节都携带自己的 sourceIds 与 claimIds。
 */
export function collectEvidenceBlocks(entity: ArticleEntity): EvidenceBlock[] {
  const blocks: EvidenceBlock[] = [];
  const add = (key: string, heading: string, sourceIds?: string[], claimIds?: string[]) => {
    blocks.push({
      key,
      heading,
      sourceIds: Array.isArray(sourceIds) ? sourceIds : [],
      claimIds: Array.isArray(claimIds) ? claimIds : [],
    });
  };
  if ('article' in entity && Array.isArray(entity.article)) {
    entity.article.forEach((section, i) => add(`article-${i}`, section.heading, section.sourceIds, section.claimIds));
  }
  // 早期扩张战役分析：契约（ARCH-02）唯一结构是十键 `analysisProfiles`。
  // 逐一登记每节的 sourceIds/claimIds（含正文尚为空的小节，证据仍要可见），
  // 不存在旧五键 `earlyCampaignAnalysis` 的回退分支。
  if ('analysisProfiles' in entity && entity.analysisProfiles) {
    for (const key of ANALYSIS_PROFILE_KEYS) {
      const section = entity.analysisProfiles[key];
      if (section) add(`profile-${key}`, section.title, section.sourceIds, section.claimIds);
    }
  }
  if ('sections' in entity && entity.sections) {
    for (const [key, section] of Object.entries(entity.sections)) {
      if (section) add(`battle-${key}`, section.title, section.sourceIds, section.claimIds);
    }
  }
  if ('layers' in entity && Array.isArray(entity.layers)) {
    for (const layer of entity.layers) {
      add(`layer-${layer.level}`, layer.title, layer.sourceIds, layer.claimIds);
    }
  }
  if ('decisions' in entity && Array.isArray(entity.decisions)) {
    for (const decision of entity.decisions) {
      add(`decision-${decision.id}`, decision.title, decision.sourceIds, decision.claimIds);
    }
  }
  if ('phases' in entity && Array.isArray(entity.phases)) {
    for (const phase of entity.phases) {
      add(`phase-${phase.id}`, phase.title, phase.sourceIds, phase.claimIds);
    }
  }
  return blocks;
}

function collectSectionEvidence(entity: ArticleEntity): { sourceIds: Set<string>; claimIds: Set<string> } {
  const sourceIds = new Set<string>();
  const claimIds = new Set<string>();
  for (const block of collectEvidenceBlocks(entity)) {
    block.sourceIds.forEach((id) => sourceIds.add(id));
    block.claimIds.forEach((id) => claimIds.add(id));
  }
  return { sourceIds, claimIds };
}

/** 实体集合的并集证据（页面级汇总）。 */
export function collectEntityEvidence(entity: ArticleEntity): { sourceIds: string[]; claimIds: string[] } {
  const sourceIds = new Set<string>((entity as { sourceIds?: string[] }).sourceIds ?? []);
  const claimIds = new Set<string>((entity as { claimIds?: string[] }).claimIds ?? []);
  for (const block of collectEvidenceBlocks(entity)) {
    block.sourceIds.forEach((id) => sourceIds.add(id));
    block.claimIds.forEach((id) => claimIds.add(id));
  }
  return { sourceIds: [...sourceIds], claimIds: [...claimIds] };
}

// ---------------------------------------------------------------------------
// 排序与分组
// ---------------------------------------------------------------------------

export function sortEvents(events: readonly EventEntity[]): EventEntity[] {
  return [...events].sort((a, b) => {
    if (a.startDate !== b.startDate) return a.startDate < b.startDate ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function sortBattles(battles: readonly BattleEntity[]): BattleEntity[] {
  return [...battles].sort((a, b) => {
    if (a.startDate !== b.startDate) return a.startDate < b.startDate ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export interface PartGroup<T> {
  part: HistoricalPartId;
  items: T[];
}

/** 按五个历史部分分组，保持 part 顺序（1→5）。 */
export function groupByPart<T extends { historicalPart: HistoricalPartId }>(
  items: readonly T[],
  partOrder: readonly HistoricalPartId[],
): PartGroup<T>[] {
  return partOrder
    .map((part) => ({ part, items: items.filter((item) => item.historicalPart === part) }))
    .filter((group) => group.items.length > 0);
}

/** 两方对称分组（日本 / 盟军），用于人物、装备、编制。 */
export function groupBySide<T extends { side: string }>(items: readonly T[]): { side: string; items: T[] }[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) pushInto(buckets, item.side, item);
  return [...buckets.entries()].map(([side, list]) => ({ side, items: list }));
}

// ---------------------------------------------------------------------------
// 搜索
// ---------------------------------------------------------------------------

export interface SearchHit {
  kind: 'entity' | 'question' | 'source';
  id: string;
  title: string;
  snippet: string;
  /** 该条目所属入口，用于分组显示。 */
  group: string;
}

function plainText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(plainText).join(' ');
  if (typeof value === 'object' && value !== null) return Object.values(value).map(plainText).join(' ');
  return '';
}

const ENTITY_GROUP_LABELS: Record<EntityKind, string> = {
  event: '时间线',
  battle: '战役',
  person: '人物',
  place: '地图',
  unit: '编制',
  equipment: '装备',
  concept: '知识专题',
};

export function searchContent(index: ContentIndex, query: string, limit = 40): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [];
  const hits: SearchHit[] = [];
  const match = (haystack: string) => haystack.toLowerCase().includes(needle);

  for (const [id, entity] of index.entities) {
    const kind = index.entityTypes.get(id) ?? 'event';
    const title = entityTitle(entity);
    const summaryText = plainText(entity as unknown as Record<string, unknown>);
    if (matchesEntityTitle(id, title, needle) || match(summaryText)) {
      hits.push({
        kind: 'entity',
        id,
        title,
        snippet: entitySnippet(entity),
        group: ENTITY_GROUP_LABELS[kind],
      });
    }
  }
  for (const question of index.questions.values()) {
    if (match(question.prompt) || match(question.answer) || match(question.id)) {
      hits.push({ kind: 'question', id: question.id, title: question.prompt, snippet: truncate(question.answer, 80), group: '历史问题' });
    }
  }
  for (const source of index.sources.values()) {
    if (match(source.title) || match(source.publisher) || match(source.creator) || match(source.id)) {
      hits.push({
        kind: 'source',
        id: source.id,
        title: source.title,
        snippet: `${source.publisher} · ${source.year}`,
        group: '来源',
      });
    }
  }
  return hits.slice(0, limit);
}

function matchesEntityTitle(id: string, title: string, needle: string): boolean {
  return id.toLowerCase().includes(needle) || title.toLowerCase().includes(needle);
}

export function entityTitle(entity: ArticleEntity): string {
  if ('name' in entity) return entity.name;
  if ('title' in entity) return entity.title;
  return 'id' in entity ? String(entity.id) : '';
}

export function entitySnippet(entity: ArticleEntity): string {
  const candidate =
    ('summary' in entity && typeof entity.summary === 'string' && entity.summary) ||
    ('role' in entity && typeof entity.role === 'string' && entity.role) ||
    ('title' in entity && typeof entity.title === 'string' && entity.title) ||
    '';
  return truncate(candidate, 90);
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

// ---------------------------------------------------------------------------
// 入口 → 路由
// ---------------------------------------------------------------------------

export interface EntrySummary {
  /** 每入口一条「可用/未加载」说明所需的最小计数。 */
  view: string;
  count: number;
  label: string;
}

/** 集合计数（用于导航徽标与空状态说明）。 */
export function entryCounts(index: ContentIndex): Record<string, number> {
  return {
    timeline: index.events.size,
    battles: index.battles.size,
    people: index.people.size,
    atlas: index.places.size,
    concepts: index.concepts.size,
    questions: index.questions.size,
  };
}

/** 按 claimType 统计 claim 数量，用于「证据类型分布」图例。 */
export function claimTypeCounts(claims: Iterable<Claim>): Record<ClaimType, number> {
  const counts: Record<ClaimType, number> = { fact: 0, interpretation: 0, disputed: 0, schematic: 0 };
  for (const claim of claims) {
    if (claim.claimType in counts) counts[claim.claimType] += 1;
  }
  return counts;
}
