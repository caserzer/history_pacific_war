/**
 * 契约类型（与 contracts/content.schema.json v1.0.0 对齐）
 *
 * 原则：
 * - 这里只声明**数据形状**，不包含任何历史叙述。
 * - UI 组件只能通过 `content/loader.ts` 拿到这些类型，不得在 JSX 中拼历史句子。
 * - 契约是可空/可缺省的数组一律按「可能为空」处理（README §3.3：UI 不应假定引用一定非空，
 *   除非 schema 规定 minItems: 1）。
 */

export const HISTORICAL_PART_IDS = [
  'part-1-why-war',
  'part-2-pearl-harbor',
  'part-3-expansion',
  'part-4-turning-point',
  'part-5-midway',
] as const;

export type HistoricalPartId = (typeof HISTORICAL_PART_IDS)[number];

/** claimType 枚举：事实 / 解释 / 争议 / 示意。UI 的标签组件直接消费此枚举。 */
export const CLAIM_TYPES = ['fact', 'interpretation', 'disputed', 'schematic'] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

/** 地图与阶段重建的证据把握等级（与 claimType 同集合，但语义用于位置/航线）。 */
export type Certainty = ClaimType;

export const LOCATOR_TYPES = [
  'page',
  'page-range',
  'chapter-section',
  'section-paragraph',
  'table',
  'figure',
  'archival-item',
  'timecode',
  'transcript-line',
] as const;
export type LocatorType = (typeof LOCATOR_TYPES)[number];

export const SOURCE_TYPES = [
  'official-history',
  'archive',
  'museum',
  'academic',
  'primary-document',
  'reference',
  'other',
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const MEDIA_TYPES = [
  'photograph',
  'portrait',
  'battle-map',
  'map',
  'diagram',
  'illustration',
  'timeline-diagram',
] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export type Side = 'japan' | 'allies';
export type SideOrNeutral = Side | 'neutral';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ArticleSection {
  heading: string;
  body: string;
  sourceIds: string[];
  claimIds: string[];
}

export interface BattleSection {
  title: string;
  body: string;
  sourceIds: string[];
  claimIds: string[];
}

/** coverage.json 的 battleSectionKeys 固定 14 个键；顺序即渲染顺序。 */
export const BATTLE_SECTION_KEYS = [
  'background',
  'geography',
  'participants',
  'commanders',
  'forces',
  'objectives',
  'constraints',
  'plan',
  'course',
  'decisions',
  'results',
  'aftermath',
  'controversies',
  'furtherReading',
] as const;

export type BattleSectionKey = (typeof BATTLE_SECTION_KEYS)[number];

/** 早期扩张战役的五类分析（coverage.earlyCampaign.analysisKeys）。 */
export const EARLY_CAMPAIGN_KEYS = ['background', 'course', 'constraints', 'results', 'impact'] as const;
export type EarlyCampaignKey = (typeof EARLY_CAMPAIGN_KEYS)[number];

export interface EarlyCampaignSection {
  title: string;
  body: string;
  sourceIds: string[];
  claimIds: string[];
}

export type EarlyCampaignAnalysis = Record<EarlyCampaignKey, EarlyCampaignSection>;

export interface Locator {
  sourceId: string;
  locatorType: LocatorType;
  locator: string;
}

export interface Claim {
  id: string;
  text: string;
  claimType: ClaimType;
  entityIds: string[];
  sourceIds: string[];
  locators: Locator[];
  note?: string;
}

export interface Source {
  id: string;
  title: string;
  creator: string;
  publisher: string;
  year: number;
  sourceType: SourceType;
  url: string;
  accessedDate: string;
  citation: string;
  reliabilityNote: string;
  language?: string;
  archiveCollectionId?: string;
}

export interface MediaAsset {
  id: string;
  title: string;
  mediaType: MediaType;
  path: string;
  author: string;
  license: string;
  licenseUrl?: string;
  rightsStatement: string;
  sourceId: string;
  sourcePage?: string;
  creditLine: string;
  alt: string;
  caption: string;
  articleIds: string[];
  width?: number;
  height?: number;
}

export interface EventEntity {
  id: string;
  title: string;
  historicalPart: HistoricalPartId;
  eventType: string;
  startDate: string;
  endDate?: string;
  summary: string;
  article: ArticleSection[];
  placeIds: string[];
  personIds: string[];
  unitIds: string[];
  equipmentIds: string[];
  conceptIds: string[];
  battleId?: string;
  relatedEventIds: string[];
  earlyCampaignAnalysis?: EarlyCampaignAnalysis;
  sourceIds: string[];
  claimIds: string[];
}

export interface PhaseViewpoint {
  perspective: string;
  sourceIds: string[];
  claimIds: string[];
}

export interface PhaseRoute {
  id: string;
  side: Side;
  label: string;
  fromPlaceId: string;
  toPlaceId: string;
  path: Coordinates[];
  schematic: true;
  certainty: Certainty;
  note: string;
  sourceIds: string[];
  claimIds: string[];
}

export interface PhasePosition {
  label: string;
  description: string;
  placeIds: string[];
  coordinates: Coordinates;
  schematic: boolean;
  uncertaintyRadiusKm: number;
  uncertaintyNote: string;
  sourceIds: string[];
  claimIds: string[];
}

export interface Phase {
  id: string;
  sequence: number;
  title: string;
  time: {
    start: string;
    end?: string;
    display: string;
    uncertainty: string;
  };
  positions: Record<Side, PhasePosition>;
  knownEnemy: Record<Side, string>;
  unknownEnemy: Record<Side, string>;
  decision: Record<Side, string>;
  consequence: Record<Side, string>;
  certainty: Certainty;
  viewpoints: Record<Side, PhaseViewpoint>;
  routes: PhaseRoute[];
  schematic: boolean;
  uncertaintyNote: string;
  eventIds: string[];
  sourceIds: string[];
  claimIds: string[];
}

export interface BattleEntity {
  id: string;
  title: string;
  historicalPart: HistoricalPartId;
  battleType: string;
  theater: string;
  startDate: string;
  endDate: string;
  summary: string;
  belligerents: Record<Side, string>;
  outcome: { summary: string; winner: Side | 'inconclusive'; certainty: Certainty };
  placeIds: string[];
  personIds: string[];
  commanderIds: Record<Side, string[]>;
  unitIds: string[];
  equipmentIds: string[];
  conceptIds: string[];
  sourceIds: string[];
  claimIds: string[];
  sections: Record<BattleSectionKey, BattleSection>;
  phases: Phase[];
}

export interface Decision {
  id: string;
  title: string;
  context: string;
  options: string[];
  choice: string;
  constraints: string[];
  consequence: string;
  certainty: Certainty;
  sourceIds: string[];
  claimIds: string[];
}

export interface PersonEntity {
  id: string;
  name: string;
  originalName?: string;
  side: SideOrNeutral;
  role: string;
  service?: string;
  birthDate?: string;
  deathDate?: string;
  summary: string;
  profile: string;
  decisions: Decision[];
  relatedPersonIds: string[];
  placeIds: string[];
  eventIds: string[];
  battleIds: string[];
  conceptIds: string[];
  sourceIds: string[];
  claimIds: string[];
}

export interface PlaceEntity {
  id: string;
  historicalName: string;
  modernName: string;
  modernCountry: string;
  placeType: string;
  summary: string;
  coordinates: Coordinates;
  coordinateAccuracyKm: number;
  schematic: false;
  relatedPlaceIds: string[];
  sourceIds: string[];
  claimIds: string[];
}

export interface UnitEntity {
  id: string;
  name: string;
  side: SideOrNeutral;
  service: string;
  echelon: string;
  parentUnitId?: string;
  description: string;
  eventIds: string[];
  personIds: string[];
  equipmentIds: string[];
  sourceIds: string[];
  claimIds: string[];
}

export interface EquipmentEntity {
  id: string;
  name: string;
  category: string;
  side: SideOrNeutral;
  summary: string;
  limitations: string;
  conceptIds: string[];
  sourceIds: string[];
  claimIds: string[];
}

export interface ConceptLayer {
  level: 1 | 2 | 3;
  title: string;
  body: string;
  sourceIds: string[];
  claimIds: string[];
}

export interface ConceptEntity {
  id: string;
  title: string;
  summary: string;
  layers: ConceptLayer[];
  whyItMatters: string;
  relatedEntityIds: string[];
  sourceIds: string[];
  claimIds: string[];
}

export interface QuestionEntity {
  id: string;
  historicalPart: HistoricalPartId;
  prompt: string;
  answer: string;
  entityIds: string[];
  sourceIds: string[];
  claimIds: string[];
}

/** content/history.json 根节点（README §2）。 */
export interface ContentDocument {
  schemaVersion: string;
  fixtureOnly: boolean;
  events: EventEntity[];
  battles: BattleEntity[];
  people: PersonEntity[];
  places: PlaceEntity[];
  units: UnitEntity[];
  equipment: EquipmentEntity[];
  concepts: ConceptEntity[];
  sources: Source[];
  media: MediaAsset[];
  questions: QuestionEntity[];
  claims: Claim[];
}

export type EntityType =
  | 'event'
  | 'battle'
  | 'person'
  | 'place'
  | 'unit'
  | 'equipment'
  | 'concept';

/** 六入口中的实体型入口。 */
export const ENTITY_TYPES: readonly EntityType[] = [
  'event',
  'battle',
  'person',
  'place',
  'unit',
  'equipment',
  'concept',
];

export type ArticleEntity =
  | EventEntity
  | BattleEntity
  | PersonEntity
  | PlaceEntity
  | UnitEntity
  | EquipmentEntity
  | ConceptEntity;
