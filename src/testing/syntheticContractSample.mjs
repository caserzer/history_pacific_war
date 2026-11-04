/**
 * 合成契约样本（仅用于自动化测试）
 *
 * 为什么需要它：真实 fixtures（contracts/fixtures/*.json）只覆盖事件、地点、来源、
 * 问题与 claim；battles / people / concepts / units / equipment / media 六个集合
 * 在两个 fixture 中都是空的。但 WEB-01 的验收要求「六入口使用同一数据并可互跳」，
 * 并且战役十四类、人物决策卡、专题三层、地图阶段这些渲染路径必须有测试覆盖。
 *
 * 因此这里用**明显是占位**的文字构造最小合法形状的实体（字段名与枚举严格照
 * contracts/content.schema.json，并满足验证器的字符数与引用规则），整份文档标记
 * `fixtureOnly: true`，让它和真实 fixture 一样在界面上显示「测试样本」状态。
 *
 * 严禁把它当作历史内容：所有正文都是「测试占位」，不含任何真实史实、日期或数字。
 * 它只存在于 src/testing/ 内，从不写入 content/，也不会进入构建产物。
 *
 * 校验方式（交付前执行过一次）：
 *   node scripts/validate-content.mjs --file <dump.json> --stage pearl
 * 结构、引用与深度规则全部通过；剩余 FAIL 只来自 coverage 阶段的「缺重点文章」，
 * 这是合成样本本就不覆盖的内容要求，不是结构问题。
 */

const SRC = ['source-synthetic-a'];
const CLAIM_FACT = 'claim-synthetic-a';
const CLAIM_DISPUTED = 'claim-synthetic-disputed';
const CLAIM_SCHEMATIC = 'claim-synthetic-schematic';

/** 构造一个满足 schema minLength 的占位段落（正文本身没有信息量）。 */
function placeholder(length, label) {
  const base = `测试占位（${label}）：本段只用于验证渲染位置与排版，不构成历史叙述。`;
  let text = '';
  while (text.length < length) text += base;
  return text.slice(0, Math.max(length, base.length));
}

export function buildSyntheticDocument() {
  return {
    schemaVersion: '1.0.0',
    fixtureOnly: true,
    events: [
      {
        id: 'event-synthetic-timeline-node',
        title: '测试占位：时间线节点 A',
        historicalPart: 'part-2-pearl-harbor',
        eventType: 'background',
        startDate: '1941-12-07',
        endDate: '1941-12-08',
        summary: '测试占位摘要：只用于验证时间线到战役与地图的互跳，不包含任何真实史实。',
        article: [
          {
            heading: '测试占位小节',
            body: placeholder(60, '事件文章小节'),
            sourceIds: SRC,
            claimIds: [CLAIM_FACT],
          },
        ],
        placeIds: ['place-synthetic-a', 'place-synthetic-b'],
        personIds: ['person-synthetic-commander', 'person-synthetic-other'],
        unitIds: [],
        equipmentIds: [],
        conceptIds: ['concept-synthetic-layer'],
        battleId: 'battle-synthetic-one',
        relatedEventIds: [],
        sourceIds: SRC,
        claimIds: [CLAIM_FACT, CLAIM_DISPUTED],
      },
    ],
    battles: [
      {
        id: 'battle-synthetic-one',
        title: '测试占位：合成战役',
        historicalPart: 'part-2-pearl-harbor',
        battleType: 'carrier-battle',
        theater: 'pacific',
        startDate: '1942-06-04',
        endDate: '1942-06-05',
        summary: placeholder(40, '战役摘要'),
        belligerents: { japan: '测试方甲', allies: '测试方乙' },
        outcome: { summary: placeholder(20, '结果说明'), winner: 'inconclusive', certainty: 'disputed' },
        placeIds: ['place-synthetic-a', 'place-synthetic-b'],
        personIds: ['person-synthetic-commander', 'person-synthetic-other'],
        commanderIds: { japan: ['person-synthetic-commander'], allies: ['person-synthetic-other'] },
        unitIds: ['unit-synthetic-task-force'],
        equipmentIds: ['equipment-synthetic-carrier'],
        conceptIds: ['concept-synthetic-layer'],
        sourceIds: SRC,
        claimIds: [CLAIM_FACT, CLAIM_DISPUTED],
        sections: buildSections(),
        phases: [buildPhase(1), buildPhase(2)],
      },
    ],
    people: [
      buildPerson({
        id: 'person-synthetic-commander',
        name: '测试占位指挥官甲',
        side: 'japan',
        decisionId: 'decision-synthetic-one',
        certainty: 'estimated',
        related: ['person-synthetic-other'],
      }),
      buildPerson({
        id: 'person-synthetic-other',
        name: '测试占位指挥官乙',
        side: 'allies',
        decisionId: 'decision-synthetic-two',
        certainty: 'documented',
        related: ['person-synthetic-commander'],
      }),
    ],
    places: [
      {
        id: 'place-synthetic-a',
        historicalName: '测试占位地点（历史名）',
        modernName: '测试占位地点',
        modernCountry: '测试国家',
        placeType: 'island',
        summary: placeholder(30, '地点说明'),
        coordinates: { lat: 21.3527, lng: -157.95 },
        coordinateAccuracyKm: 5,
        schematic: false,
        relatedPlaceIds: ['place-synthetic-b'],
        sourceIds: SRC,
        claimIds: [CLAIM_FACT],
      },
      {
        id: 'place-synthetic-b',
        historicalName: '测试占位地点乙（历史名）',
        modernName: '测试占位地点乙',
        modernCountry: '测试国家',
        placeType: 'naval-base',
        summary: placeholder(30, '地点说明乙'),
        coordinates: { lat: 22.1, lng: -158.4 },
        coordinateAccuracyKm: 8,
        schematic: false,
        relatedPlaceIds: ['place-synthetic-a'],
        sourceIds: SRC,
        claimIds: [CLAIM_FACT],
      },
    ],
    units: [
      {
        id: 'unit-synthetic-task-force',
        name: '测试占位特混编队',
        side: 'japan',
        service: 'navy',
        echelon: 'task-force',
        description: placeholder(40, '编制说明'),
        eventIds: ['event-synthetic-timeline-node'],
        personIds: ['person-synthetic-commander'],
        equipmentIds: ['equipment-synthetic-carrier'],
        sourceIds: SRC,
        claimIds: [CLAIM_FACT],
      },
    ],
    equipment: [
      {
        id: 'equipment-synthetic-carrier',
        name: '测试占位装备',
        category: 'aircraft-carrier',
        side: 'japan',
        summary: placeholder(40, '装备说明'),
        limitations: placeholder(40, '装备局限'),
        conceptIds: ['concept-synthetic-layer'],
        sourceIds: SRC,
        claimIds: [CLAIM_FACT],
      },
    ],
    concepts: [
      {
        id: 'concept-synthetic-layer',
        title: '测试占位：三层解释',
        summary: placeholder(40, '专题摘要'),
        layers: [1, 2, 3].map((level) => ({
          level,
          title: `测试占位第 ${level} 层标题`,
          body: placeholder(70, `专题第 ${level} 层`),
          sourceIds: SRC,
          claimIds: [CLAIM_FACT],
        })),
        whyItMatters: placeholder(80, '为什么重要'),
        relatedEntityIds: ['battle-synthetic-one', 'person-synthetic-commander', 'event-synthetic-timeline-node'],
        sourceIds: SRC,
        claimIds: [CLAIM_FACT],
      },
    ],
    sources: [
      {
        id: 'source-synthetic-a',
        title: '测试占位来源标题（不得作为史料引用）',
        creator: '测试占位作者',
        publisher: '测试占位出版方',
        year: 2000,
        sourceType: 'archive',
        url: 'https://example.invalid/synthetic-source',
        accessedDate: '2026-01-01',
        citation: placeholder(40, '占位引用'),
        reliabilityNote: placeholder(40, '占位可靠性说明'),
      },
    ],
    media: [],
    questions: [
      {
        id: 'question-synthetic-cross',
        historicalPart: 'part-2-pearl-harbor',
        prompt: '测试占位问题：为什么需要跨实体导航？',
        answer: placeholder(
          200,
          '占位答案。本回答只用于验证问题页面能够渲染问题、完整答案、跨实体链接与证据面板四个部分，不解释任何真实历史问题，也不包含任何史实判断或数字',
        ),
        entityIds: ['battle-synthetic-one', 'person-synthetic-commander', 'event-synthetic-timeline-node'],
        sourceIds: SRC,
        claimIds: [CLAIM_FACT, CLAIM_SCHEMATIC],
      },
    ],
    claims: [
      {
        id: CLAIM_FACT,
        text: '测试占位判断：本条只用于验证 claimType、来源与定位在页面上的呈现方式。',
        claimType: 'fact',
        entityIds: ['battle-synthetic-one', 'event-synthetic-timeline-node', 'place-synthetic-a'],
        sourceIds: SRC,
        locators: [{ sourceId: 'source-synthetic-a', locatorType: 'page', locator: 'p. 1（测试占位定位）' }],
      },
      {
        id: CLAIM_DISPUTED,
        text: '测试占位判断：本条用于验证「争议」标签与争议说明同时可见。',
        claimType: 'disputed',
        entityIds: ['battle-synthetic-one', 'event-synthetic-timeline-node'],
        sourceIds: SRC,
        locators: [{ sourceId: 'source-synthetic-a', locatorType: 'table', locator: '表 1（测试占位定位）' }],
        note: '测试占位争议说明：用于验证争议说明的可见性。',
      },
      {
        id: CLAIM_SCHEMATIC,
        text: '测试占位判断：本条用于验证「示意」标签，位置与航线只是教学示意。',
        claimType: 'schematic',
        entityIds: ['battle-synthetic-one'],
        sourceIds: SRC,
        locators: [{ sourceId: 'source-synthetic-a', locatorType: 'figure', locator: '图 1（测试占位定位）' }],
      },
      {
        id: 'claim-synthetic-interpretation',
        text: '测试占位判断：本条用于验证「解释」标签与学理解释的呈现。',
        claimType: 'interpretation',
        entityIds: ['person-synthetic-commander'],
        sourceIds: SRC,
        locators: [{ sourceId: 'source-synthetic-a', locatorType: 'chapter-section', locator: '第 1 章（测试占位定位）' }],
      },
    ],
  };
}

function buildPerson({ id, name, side, decisionId, certainty, related }) {
  return {
    id,
    name,
    side,
    role: '测试占位职务',
    service: 'navy',
    summary: placeholder(40, `${name}摘要`),
    profile: placeholder(100, `${name}全貌`),
    decisions: [
      {
        id: decisionId,
        title: '测试占位决策',
        context: placeholder(50, '当时知道什么'),
        options: ['测试占位选项一（足够长的描述）', '测试占位选项二（足够长的描述）'],
        choice: '测试占位：选择了其中一个选项。',
        constraints: ['测试占位约束一（足够长）', '测试占位约束二（足够长）'],
        consequence: placeholder(30, '后果'),
        certainty,
        sourceIds: SRC,
        claimIds: [CLAIM_FACT],
      },
    ],
    relatedPersonIds: related,
    placeIds: ['place-synthetic-a'],
    eventIds: ['event-synthetic-timeline-node'],
    battleIds: ['battle-synthetic-one'],
    conceptIds: ['concept-synthetic-layer'],
    sourceIds: SRC,
    claimIds: [CLAIM_FACT],
  };
}

function buildSections() {
  const keys = {
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
  const sections = {};
  Object.entries(keys).forEach(([key, title]) => {
    sections[key] = {
      title,
      body: placeholder(90, `战役小节 ${key} 的正文`),
      sourceIds: SRC,
      claimIds: key === 'controversies' ? [CLAIM_DISPUTED] : [CLAIM_FACT],
    };
  });
  return sections;
}

function buildPhase(sequence) {
  const side = (label) => ({
    label,
    description: placeholder(30, `位置说明 ${label}`),
    placeIds: ['place-synthetic-a'],
    coordinates: { lat: 21.35, lng: -157.95 },
    schematic: true,
    uncertaintyRadiusKm: 120,
    uncertaintyNote: '测试占位不确定说明：位置为教学示意。',
    sourceIds: SRC,
    claimIds: [CLAIM_SCHEMATIC],
  });
  return {
    id: `phase-synthetic-${sequence}`,
    sequence,
    title: `测试占位阶段 ${sequence}`,
    time: {
      start: `1942-06-0${3 + sequence}T00:00Z`,
      display: `测试占位时间显示（阶段 ${sequence}）`,
      uncertainty: '测试占位时间不确定说明。',
    },
    positions: { japan: side(`测试占位方位甲${sequence}`), allies: side(`测试占位方位乙${sequence}`) },
    knownEnemy: { japan: '测试占位：一方当时已知的敌情。', allies: '测试占位：另一方当时已知的敌情。' },
    unknownEnemy: { japan: '测试占位：一方当时未知的敌情。', allies: '测试占位：另一方当时未知的敌情。' },
    decision: { japan: '测试占位：一方的关键决策。', allies: '测试占位：另一方的关键决策。' },
    consequence: { japan: '测试占位：一方选择的直接后果。', allies: '测试占位：另一方选择的直接后果。' },
    certainty: 'schematic',
    viewpoints: {
      japan: {
        perspective: placeholder(40, '一方视角'),
        sourceIds: SRC,
        claimIds: [CLAIM_FACT],
      },
      allies: {
        perspective: placeholder(40, '另一方视角'),
        sourceIds: SRC,
        claimIds: [CLAIM_FACT],
      },
    },
    routes: [
      {
        id: `route-synthetic-${sequence}`,
        side: sequence === 1 ? 'japan' : 'allies',
        label: '测试占位航线',
        fromPlaceId: 'place-synthetic-a',
        toPlaceId: 'place-synthetic-b',
        path: [
          { lat: 21.35, lng: -157.95 },
          { lat: 21.5, lng: -157.8 },
          { lat: 22.1, lng: -158.4 },
        ],
        schematic: true,
        certainty: 'schematic',
        note: '测试占位航线说明：示意折线，不是精确历史航迹。',
        sourceIds: SRC,
        claimIds: [CLAIM_SCHEMATIC],
      },
    ],
    schematic: true,
    uncertaintyNote: '测试占位阶段不确定说明：位置与航线均为教学示意。',
    eventIds: ['event-synthetic-timeline-node'],
    sourceIds: SRC,
    claimIds: [CLAIM_FACT],
  };
}
