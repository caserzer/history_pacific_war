/**
 * 地图标签去重叠（declutter）—— QA-01 attempt 2 / 观察项 ATLAS-READABILITY 修正。
 *
 * 问题：46 个地点各自画两行固定偏移的文字（历史名 + 现代名·国家），在默认缩放（1×）
 * 下大量标签互相压住，整体不可读。观察项要求「保留全部实体、不确定性、必需地理标签、
 * 键盘/触摸交互与阶段信息」——所以**只能隐藏标签，不能删数据、不能删可点节点**。
 *
 * 策略（贪心 + 优先级）：
 *   1. 按优先级排序：重点节点 / 有区域的锚点 > 战役阶段涉及的地点 > 其余；
 *      同优先级按名字长度（短标签更容易放下）与 id 稳定排序。
 *   2. 逐个尝试放置标签包围盒；与已放置的盒子相交则跳过该标签。
 *   3. 被跳过的地点**仍然渲染节点与可点圆**，只是不画文字；其名字仍在
 *      `<title>`（悬停/屏幕阅读器）、地点详情页与站点索引里可发现，
 *      因此「现代名与历史名可发现」不受影响。
 *   4. 缩放足够大（zoom >= LABEL_ALWAYS_ZOOM）时全画——空间已经够了。
 *
 * 该函数是纯函数，站点验证器直接调用同一份实现做断言（不是平行实现）。
 */

/** 两行标签的近似包围盒（相对节点原点，单位＝SVG user unit）。 */
export const LABEL_BOX = {
  /** 文字从节点右侧 10 个单位开始。 */
  offsetX: 10,
  /** 第一行基线 y=4，向上约 9 个单位。 */
  top: -6,
  /** 两行文字总高（第一行 11px + 第二行 9px + 行距）。 */
  height: 24,
} as const;

/** 超过这个缩放就认为空间充足，全部标签直接显示。 */
export const LABEL_ALWAYS_ZOOM = 3;

/**
 * 中文字形的**保守**宽度系数（相对字号）。
 *
 * QA-01 attempt 4 / 真实失败 (4)：原先按「1 个汉字 = 1 个字号的宽度」估算，
 * 服务端算术得出「14 个标签 0 重叠」；但中央在真实 Chromium 里用实际字体排布
 * 测得 **17 对重叠**。原因是估算过于乐观：
 *   - 站点用的是 `Noto Serif SC / Source Han Serif SC / SimSun` 衬线栈，
 *     全角汉字实际占位约 1.0em 以上，且行内还有 letter-spacing；
 *   - 估算完全没算字距。
 * 与其假装能精确预测字体度量，不如**故意高估**：宁可少放几个普通标签，
 * 也不能让读者看到压字的标签。
 */
const CJK_WIDTH_FACTOR = 1.15;
/** 拉丁字符相对字号的宽度（同样按保守取整）。 */
const LATIN_WIDTH_FACTOR = 0.62;
/** 每行额外的字距/内边距余量（user unit）。 */
const LINE_PADDING = 6;

/**
 * 标签所需宽度（**保守上界**）。两行取较长者。
 *
 * 注意：这是给「去重叠判定」用的安全边界，不是像素级测量。真实浏览器里的最终
 * 校验由 `tests/learning.spec.ts` 用 `getBoundingClientRect()` 完成。
 */
export function estimateLabelWidth(historicalName: string, modernLine: string): number {
  const cjk = (s: string) => (s.match(/[\u3400-\u9fff]/g) ?? []).length;
  const other = (s: string) => s.length - cjk(s);
  // 第一行 11px、第二行 9px。
  const first = cjk(historicalName) * 11 * CJK_WIDTH_FACTOR + other(historicalName) * 11 * LATIN_WIDTH_FACTOR;
  const second = cjk(modernLine) * 9 * CJK_WIDTH_FACTOR + other(modernLine) * 9 * LATIN_WIDTH_FACTOR;
  return Math.ceil(Math.max(first, second) + LINE_PADDING);
}

export interface LabelCandidate {
  id: string;
  /** 节点在用户坐标系中的位置（已含缩放/平移后的 screen 位置请先转换）。 */
  x: number;
  y: number;
  historicalName: string;
  modernLine: string;
  /** 优先级：数字越小越优先保留标签。 */
  priority: number;
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function boxesOverlap(a: Box, b: Box): boolean {
  // 留 1 个单位的间隙，避免刚好贴着显得拥挤
  return !(a.right + 1 < b.left || b.right + 1 < a.left || a.bottom + 1 < b.top || b.bottom + 1 < a.top);
}

/**
 * 计算应显示文字标签的地点 id 集合，以及每个标签的放置方式。
 *
 * 纯函数：输入全部候选 + 当前缩放，输出「要画标签的 id → 放置方案」。
 * **节点本身不在返回值里** —— 调用方必须仍然渲染所有节点（含可点圆与 title），
 * 未被选中的地点只是不画两行文字，名字仍可通过 tooltip / 详情页 / 站点索引发现。
 *
 * 为了让密集区域也能放下更多标签，每个候选会依次尝试多个锚点方位
 * （右、左上、右下…），并用折线引线连回节点，避免文字压住节点或彼此压住。
 */
export type LabelPlacement =
  | { mode: 'right' }
  | { mode: 'left' }
  | { mode: 'above' }
  | { mode: 'below' };

export interface LabelPlan {
  id: string;
  placement: LabelPlacement;
  /** 文字左上角相对节点原点的偏移。 */
  dx: number;
  dy: number;
  /** 引线终点（相对节点），无引线时为 null。 */
  leaderTo: { x: number; y: number } | null;
}

const PLACEMENTS: LabelPlacement[] = [{ mode: 'right' }, { mode: 'left' }, { mode: 'above' }, { mode: 'below' }];

/**
 * 必显地名专用的**扩展**方位序列（含小半径偏移）。
 *
 * 为什么需要：真实内容里有些必显地名彼此极近（实测「马来亚」与「新加坡」只差 7.4 个
 * 用户单位）。四个基本方位都放不下时，把标签往外挪一点并加一条引线，既保住「一定可见」，
 * 又不撒谎——引线明确指出这段文字属于哪个节点。偏移量从小到大尝试，视觉上尽量贴身。
 */
const MANDATED_PLACEMENTS: { placement: LabelPlacement; pad: number }[] = [
  { placement: { mode: 'right' }, pad: 0 },
  { placement: { mode: 'left' }, pad: 0 },
  { placement: { mode: 'above' }, pad: 0 },
  { placement: { mode: 'below' }, pad: 0 },
  { placement: { mode: 'right' }, pad: 26 },
  { placement: { mode: 'left' }, pad: 26 },
  { placement: { mode: 'above' }, pad: 22 },
  { placement: { mode: 'below' }, pad: 22 },
  { placement: { mode: 'right' }, pad: 48 },
  { placement: { mode: 'left' }, pad: 48 },
  { placement: { mode: 'above' }, pad: 44 },
  { placement: { mode: 'below' }, pad: 44 },
  // 更外圈：标签宽度按真实字体保守上界估算后，密集区（新加坡/马来亚仅相距 7 个单位）
  // 需要更大的外移半径才能同时放下。引线负责把文字连回它所属的节点。
  { placement: { mode: 'right' }, pad: 72 },
  { placement: { mode: 'left' }, pad: 72 },
  { placement: { mode: 'above' }, pad: 66 },
  { placement: { mode: 'below' }, pad: 66 },
  { placement: { mode: 'right' }, pad: 96 },
  { placement: { mode: 'left' }, pad: 96 },
];

function boxFor(candidate: LabelCandidate, placement: LabelPlacement, width: number, pad = 0): { box: Box; dx: number; dy: number } {
  const gap = 10 + pad;
  switch (placement.mode) {
    case 'right':
      return { box: { left: candidate.x + LABEL_BOX.offsetX + pad, top: candidate.y + LABEL_BOX.top - pad, right: candidate.x + LABEL_BOX.offsetX + pad + width, bottom: candidate.y + LABEL_BOX.top - pad + LABEL_BOX.height }, dx: LABEL_BOX.offsetX + pad, dy: LABEL_BOX.top - pad };
    case 'left':
      return { box: { left: candidate.x - gap - width, top: candidate.y + LABEL_BOX.top - pad, right: candidate.x - gap, bottom: candidate.y + LABEL_BOX.top - pad + LABEL_BOX.height }, dx: -gap - width, dy: LABEL_BOX.top - pad };
    case 'above':
      return { box: { left: candidate.x - width / 2, top: candidate.y - gap - LABEL_BOX.height, right: candidate.x + width / 2, bottom: candidate.y - gap }, dx: -width / 2, dy: -gap - LABEL_BOX.height };
    case 'below':
    default:
      return { box: { left: candidate.x - width / 2, top: candidate.y + gap, right: candidate.x + width / 2, bottom: candidate.y + gap + LABEL_BOX.height }, dx: -width / 2, dy: gap };
  }
}

/**
 * 标签优先级阶梯（数字越小越优先保留）—— **必显地名永远在最前**。
 *
 * 为什么要把必显地名单独提出来：此前只有「区域锚点」拿到最高优先级，工单点名要求
 * 标注的 8 个地名（中途岛/夏威夷/菲律宾/新加坡/马来亚/关岛/威克岛/澳大利亚北部）
 * 掉进了普通地点的 3/4 档，在默认缩放下被大量普通点挤掉——连教材标题里的**中途岛**
 * 都不可见。工单的标注要求必须优先于一般兴趣点。
 */
export const LABEL_PRIORITY = {
  /** 工单强制要求标注的地名（MANDATED_LABELS）。 */
  mandated: 0,
  /** 区域标注层锚点（regions.ts），例如澳大利亚北部的达尔文。 */
  regionAnchor: 1,
  /** 读者当前选中的地点。 */
  selected: 2,
  /** 当前地图阶段涉及的地点（双方位置/航线端点）。 */
  phasePlace: 3,
  /** 普通陆地节点。 */
  land: 4,
  /** 海域/海峡。 */
  water: 5,
} as const;

/**
 * 必显地名的**保底预算**。
 *
 * 去重叠的普通预算（18/26/40）是按「好看」定的，但它有可能比必显地名还少，
 * 于是必显地名会互相挤掉。这里给必显地名单独一条保底通道：它们先按自身数量
 * 占位，**不受普通预算限制**；普通地点再用剩余预算填充。这样「必显地名一定可见」
 * 不依赖预算调参，也不会因为将来增加必显地名而失效。
 */
export function mandatedBudgetSlotCount(mandatedCount: number): number {
  return Math.max(0, mandatedCount);
}

/**
 * 计算标签放置计划。
 *
 * @param candidates 全部地点候选（含屏幕坐标与优先级）
 * @param zoom 当前缩放
 * @param viewport 视口尺寸（用于把标签裁到可见范围内）
 */
export function planLabels(
  candidates: readonly LabelCandidate[],
  zoom: number,
  viewport: { width: number; height: number } = { width: 640, height: 400 },
): Map<string, LabelPlan> {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const plan = new Map<string, LabelPlan>();

  if (safeZoom >= LABEL_ALWAYS_ZOOM) {
    for (const candidate of candidates) {
      plan.set(candidate.id, { id: candidate.id, placement: { mode: 'right' }, dx: LABEL_BOX.offsetX, dy: LABEL_BOX.top, leaderTo: null });
    }
    return plan;
  }

  const budget = safeZoom >= 2 ? 40 : safeZoom >= 1.5 ? 26 : 18;

  const ordered = [...candidates].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const widthDiff = estimateLabelWidth(a.historicalName, a.modernLine) - estimateLabelWidth(b.historicalName, b.modernLine);
    if (widthDiff !== 0) return widthDiff;
    return a.id.localeCompare(b.id);
  });

  const mandated = ordered.filter((candidate) => candidate.priority === LABEL_PRIORITY.mandated);
  const others = ordered.filter((candidate) => candidate.priority !== LABEL_PRIORITY.mandated);

  const placed: Box[] = [];

  /** 尝试用某个方位放下一个标签；成功则写入 plan 并返回 true。 */
  const tryPlace = (candidate: LabelCandidate, placement: LabelPlacement, width: number, pad = 0): boolean => {
    const { box, dx, dy } = boxFor(candidate, placement, width, pad);
    // 裁到视口内：超出边界的方位直接跳过（读者看不到等于没标注）
    if (box.left < 2 || box.right > viewport.width - 2 || box.top < 2 || box.bottom > viewport.height - 2) return false;
    if (placed.some((other) => boxesOverlap(box, other))) return false;
    placed.push(box);
    plan.set(candidate.id, {
      id: candidate.id,
      placement,
      dx,
      dy,
      // 只有左/上/下方需要一条短引线连回节点，避免读者不知道文字属于谁；
      // 带偏移的标签一律画引线（即使朝右），否则读者看不出它属于哪个点。
      leaderTo: placement.mode === 'right' && pad === 0 ? null : { x: 0, y: 0 },
    });
    return true;
  };

  // ---- 第一轮：必显地名。**不计入普通预算**，且允许带偏移的扩展方位，
  //      保证工单要求标注的地名在任何密集情况下都能出现。
  for (const candidate of mandated) {
    const width = estimateLabelWidth(candidate.historicalName, candidate.modernLine);
    for (const { placement, pad } of MANDATED_PLACEMENTS) {
      if (tryPlace(candidate, placement, width, pad)) break;
    }
  }

  // ---- 第二轮：其余地点，用剩余普通预算填充。
  const remaining = Math.max(0, budget - plan.size);
  let filled = 0;
  for (const candidate of others) {
    if (filled >= remaining) break;
    const width = estimateLabelWidth(candidate.historicalName, candidate.modernLine);
    for (const placement of PLACEMENTS) {
      if (tryPlace(candidate, placement, width)) {
        filled += 1;
        break;
      }
    }
  }
  return plan;
}

/**
 * 计算应显示文字标签的地点 id 集合（`planLabels` 的薄封装，保留旧调用点）。
 */
export function selectVisibleLabels(candidates: readonly LabelCandidate[], zoom: number): Set<string> {
  return new Set(planLabels(candidates, zoom).keys());
}
