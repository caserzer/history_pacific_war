/**
 * 契约词汇表 —— 界面文案
 *
 * 这里的中文只翻译**契约枚举**（claimType、locatorType、sourceType、历史部分标题、
 * 战役十四类字段名）。这些名字由
 * contracts/content.schema.json 与 contracts/coverage.json 固定，
 * 不是历史叙述，也不复制任何文章正文。
 *
 * 早期扩张战役分析的十类小节标题**不在这里**：它们逐条来自内容数据的
 * `analysisProfiles[<key>].title`（契约 ARCH-02），代码中不存在旧五键标题表。
 *
 * 历史叙述一律来自 content/history.json。
 */

import type {
  BattleSectionKey,
  ClaimType,
  HistoricalPartId,
  LocatorType,
  SourceType,
} from '../data/types';

export interface ClaimTypeMeta {
  label: string;
  /** 一句话解释「这一类信息意味着什么」，用于图例与帮助，不涉及具体史实。 */
  description: string;
  /** 形状 + 文字 + 颜色三重编码，避免只靠颜色。 */
  glyph: string;
  className: string;
}

export const CLAIM_TYPE_META: Record<ClaimType, ClaimTypeMeta> = {
  fact: {
    label: '事实',
    description: '有可追溯来源直接支持的记录（日期、决定、统计口径明确的数字）。',
    glyph: '▣',
    className: 'pw-tag--fact',
  },
  interpretation: {
    label: '解释',
    description: '学界普遍接受的解释或因果分析，本身是判断而不是原始记录。',
    glyph: '◆',
    className: 'pw-tag--interpretation',
  },
  disputed: {
    label: '争议',
    description: '研究者之间存在分歧；看见这个标签时应同时阅读不同观点与证据强弱。',
    glyph: '◈',
    className: 'pw-tag--disputed',
  },
  schematic: {
    label: '示意',
    description: '为帮助理解而做的教学简化：位置、航线或数量是示意，不是精确历史数据。',
    glyph: '▨',
    className: 'pw-tag--schematic',
  },
};

export const LOCATOR_TYPE_LABELS: Record<LocatorType, string> = {
  page: '页码',
  'page-range': '页码范围',
  'chapter-section': '章节',
  'section-paragraph': '小节段落',
  table: '表格',
  figure: '图版',
  'archival-item': '档案条目',
  timecode: '时间码',
  'transcript-line': '转录行',
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  'official-history': '官方战史',
  archive: '档案馆',
  museum: '博物馆',
  academic: '学术研究',
  'primary-document': '第一手文件',
  reference: '工具书',
  other: '其他来源',
};

/** 五个历史部分的标题，逐字来自 contracts/coverage.json 的 historicalParts[].title。 */
export const HISTORICAL_PART_META: Record<HistoricalPartId, { title: string; short: string; ordinal: number }> = {
  'part-1-why-war': { title: '第一部分：战争为什么爆发', short: '战争为什么爆发', ordinal: 1 },
  'part-2-pearl-harbor': { title: '第二部分：珍珠港与战争爆发', short: '珍珠港与战争爆发', ordinal: 2 },
  'part-3-expansion': { title: '第三部分：日本的快速扩张', short: '日本的快速扩张', ordinal: 3 },
  'part-4-turning-point': { title: '第四部分：战局开始发生变化', short: '战局开始发生变化', ordinal: 4 },
  'part-5-midway': { title: '第五部分：中途岛海战', short: '中途岛海战', ordinal: 5 },
};

/** 战役十四类字段的中文标题，逐字来自 contracts/coverage.json 的 battleSectionKeys[].title。 */
export const BATTLE_SECTION_TITLES: Record<BattleSectionKey, string> = {
  background: '背景',
  geography: '地理环境',
  participants: '主要参与方',
  commanders: '主要指挥官',
  forces: '双方军力对比',
  objectives: '各自战略目标',
  constraints: '决策约束',
  plan: '作战计划',
  course: '战斗经过',
  decisions: '关键决策',
  results: '结果与损失',
  aftermath: '后续影响',
  controversies: '历史争议',
  furtherReading: '延伸阅读',
};

/** 五种验证阶段的中文名（coverage.stages[].title），用于「内容交付进度」说明。 */
export const STAGE_TITLES: Record<string, string> = {
  strategy: '战略背景与基础',
  background: '日本快速扩张',
  pearl: '珍珠港与战争爆发',
  coral: '战局开始变化',
  full: '中途岛与全量交付',
};

export const SIDE_LABELS: Record<'japan' | 'allies' | 'neutral', string> = {
  japan: '日本',
  allies: '盟军',
  neutral: '中立',
};

export const PLACE_TYPE_LABELS: Record<string, string> = {
  city: '城市',
  island: '岛屿',
  atoll: '环礁',
  'naval-base': '海军基地',
  base: '基地',
  capital: '首都',
  sea: '海域',
  strait: '海峡',
  region: '地区',
  port: '港口',
  airfield: '机场',
  other: '其他',
};

export const EQUIPMENT_CATEGORY_LABELS: Record<string, string> = {
  'aircraft-carrier': '航空母舰',
  battleship: '战列舰',
  cruiser: '巡洋舰',
  destroyer: '驱逐舰',
  submarine: '潜艇',
  aircraft: '飞机',
  radar: '雷达',
  weapon: '武器',
  other: '其他装备',
};

export const BATTLE_TYPE_LABELS: Record<string, string> = {
  'air-raid': '空袭',
  'carrier-battle': '航母海战',
  'surface-battle': '水面战斗',
  amphibious: '两栖作战',
  mixed: '混合作战',
};

export const ECHENON_LABELS: Record<string, string> = {
  fleet: '舰队',
  'task-force': '特混编队',
  squadron: '中队 / 战队',
  division: '师 / 战队',
  brigade: '旅',
  regiment: '联队',
  battalion: '大队 / 营',
  'air-group': '航空队',
  other: '其他编制',
};

export const SERVICE_LABELS: Record<string, string> = {
  navy: '海军',
  army: '陆军',
  air: '航空兵',
  government: '政府',
  other: '其他',
};

/** 六入口的导航元数据（顺序即工单给定顺序）。 */
export interface EntryNav {
  view: 'timeline' | 'battles' | 'people' | 'atlas' | 'concepts' | 'questions';
  label: string;
  labelEn: string;
  /** 该入口在数据中对应的集合，用于空状态与计数。 */
  collection: 'events' | 'battles' | 'people' | 'places' | 'concepts' | 'questions';
  blurb: string;
}

export const ENTRY_NAV: readonly EntryNav[] = [
  {
    view: 'timeline',
    label: '时间线',
    labelEn: 'Timeline',
    collection: 'events',
    blurb: '按时间顺序阅读：每一个事件都说明它为什么发生、与哪个战役相连。',
  },
  {
    view: 'battles',
    label: '战役',
    labelEn: 'Battles',
    collection: 'battles',
    blurb: '深入单场战斗：从背景、地理、军力到决策、损失与历史争议共十四类分析。',
  },
  {
    view: 'people',
    label: '人物',
    labelEn: 'People',
    collection: 'people',
    blurb: '指挥官在只知道当时信息的条件下做了什么选择，又受到哪些限制。',
  },
  {
    view: 'atlas',
    label: '地图',
    labelEn: 'Atlas',
    collection: 'places',
    blurb: '从地理空间理解行动：历史地名与现代地名并列，坐标精度与示意标记可见。',
  },
  {
    view: 'concepts',
    label: '知识专题',
    labelEn: 'Concepts',
    collection: 'concepts',
    blurb: '三层解释：是什么 → 怎样运作 → 为什么会影响一场战役的决策。',
  },
  {
    view: 'questions',
    label: '历史问题',
    labelEn: 'Questions',
    collection: 'questions',
    blurb: '围绕「为什么」展开探究：每个答案都连回具体事件、人物与证据。',
  },
];
