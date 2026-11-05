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

/**
 * 证据把握等级（used by phase / route / decision / battle outcome）。
 *
 * 注意：这是**另一个枚举**，与 claimType 不同。
 *   contracts/content.schema.json: certainty enum = documented | estimated | disputed | schematic
 *   contracts/content.schema.json: claimType enum = fact | interpretation | disputed | schematic
 * 早期版本错误地把 Certainty 别名成 ClaimType，导致 documented/estimated 两个合法值
 * 在类型层面不可表达（MAP-00 修正）。
 *
 * ── BUGFIX 记录（MAP-00，供后续任务与中央审查追溯） ──────────────────────────
 * 缺陷：WEB-01 中写的是 `export type Certainty = ClaimType;`（git 历史可见），
 *   把两个**不同的**契约枚举错误地合并成一个。后果有两层：
 *   1. 类型层：`documented` / `estimated` 不是 ClaimType 的成员，因此阶段、航线、
 *      决策卡、战役 outcome 上这些**契约合法**的 certainty 值无法被类型系统正确表达。
 *   2. 渲染层（真正的用户可见缺陷）：`BattlesView` 的战役 outcome 把握程度、
 *      `BattlesView` 的阶段标签、`PeopleView` 的决策卡把握程度都把 `certainty`
 *      直接传给 `<ClaimTag type=...>`。ClaimTag 内部有
 *      `if (!isClaimType(type)) return null;` 的防御性判断，于是：
 *        - `documented` → **静默不渲染**，界面上完全没有把握程度标签；
 *        - `estimated`  → 同样**静默不渲染**；
 *        - `disputed` / `schematic` → 恰好同名，正常渲染。
 *      也就是说：**最需要向读者说明「这是有记录的」或「这是估计」的地方，
 *      标签反而消失了**，直接违背 CONTENT-UNCERTAINTY（事实、解释、争议、
 *      教学简化必须明确区分）。静默缺失比显示错误更难被发现，故附实测说明。
 *   修复：
 *   - 本文件恢复独立的 `CERTAINTIES` / `Certainty` 类型，与 schema 一一对应；
 *   - `src/components/ClaimTag.tsx` 新增 `CertaintyTag`（与 ClaimTag 共享视觉编码，
 *     但使用 `data-certainty` 属性与正确中文标签：有记录 / 估计 / 有争议 / 示意）；
 *   - 上述三个调用点改用 `CertaintyTag`；`src/atlas/controls.tsx` 的图例同样使用它。
 *   回归测试：`scripts/validate-site.mjs` 的 `M9-certainty-*`（四值分别渲染，
 *   并注明「不再把 documented 误标为事实」）与 `M9-8`（契约外值不渲染）。
 *   ⚠ 后续若新增使用 certainty 的组件，请使用 `CertaintyTag`，不要用 `ClaimTag`；
 *     `ClaimTag` 只接受 claimType。
 * ──────────────────────────────────────────────────────────────────────────
 */
export const CERTAINTIES = ['documented', 'estimated', 'disputed', 'schematic'] as const;
export type Certainty = (typeof CERTAINTIES)[number];

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

/**
 * 早期扩张战役分析 —— 已接受契约（ARCH-02）只有**一种**结构：十键具名分析
 * `analysisProfiles`（背景/地理/参与方/目标与军力/约束/经过/可选方案/结果与损失/
 * 影响/不确定性），顺序与 schema $defs.analysisProfiles.required 一致。
 *
 * 旧五键 `earlyCampaignAnalysis` 已被契约门禁一律拒绝（contracts/README.md，
 * legacyDisabledBy=HIST-01），因此这里**不再声明**旧结构类型，UI 也不存在任何
 * legacy 渲染/回退路径 —— 渲染条件只有 `analysisProfiles`。
 */
export const ANALYSIS_PROFILE_KEYS = [
  'background',
  'geography',
  'participants',
  'objectivesAndForces',
  'constraints',
  'course',
  'options',
  'resultsAndLosses',
  'impact',
  'uncertainty',
] as const;
export type AnalysisProfileKey = (typeof ANALYSIS_PROFILE_KEYS)[number];

/** 每个分析小节的标题、正文与**本节自己的**来源/claim（契约 §3.3：不得只显示页面级来源）。 */
export interface AnalysisProfileSection {
  title: string;
  body: string;
  sourceIds: string[];
  claimIds: string[];
}

export type AnalysisProfiles = Record<AnalysisProfileKey, AnalysisProfileSection>;

/** 研究/检索过程状态（ARCH-02）：正文中不得出现研究过程措辞，只能放在这里。 */
export const RESEARCH_STATUSES = [
  'not-started',
  'sources-identified',
  'sources-retrieved',
  'cross-checked',
  'final',
] as const;
export type ResearchStatus = (typeof RESEARCH_STATUSES)[number];

export const RESEARCH_STATUS_LABELS: Record<ResearchStatus, string> = {
  'not-started': '尚未开始',
  'sources-identified': '已定位来源',
  'sources-retrieved': '已取得来源',
  'cross-checked': '已交叉核对',
  final: '已定稿',
};

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
  /** ARCH-02 已接受契约：十键具名分析。这是早期战役分析唯一的渲染来源。 */
  analysisProfiles?: AnalysisProfiles;
  /** 研究过程状态（ARCH-02）；正文不得出现研究过程措辞。 */
  researchStatus?: ResearchStatus;
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
