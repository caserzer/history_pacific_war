/**
 * 阅读级「必显地名」（order-mandated strategic labels）—— QA-01 attempt 2 修正。
 *
 * ## 为什么需要这个文件
 *
 * 工单要求地图必须标注：夏威夷、中途岛、菲律宾、新加坡、马来亚、关岛、威克岛、
 * 澳大利亚北部及相关海域（验收「标注…」+ 现代名与历史名可发现）。
 *
 * 但此前的去重叠（declutter）实现里，这些地名**没有任何特殊地位**：只有区域锚点
 * 拿到 priority 0，其余地点一律落到 3/4，在默认缩放（zoom=1）的标签预算下被
 * 大量普通地点挤掉。实测 8 个必显地名里有 5 个是隐藏的——包括**中途岛**，
 * 也就是整部教材标题里的那场战役。这是读者可见的可读性缺陷，不是数据缺陷。
 *
 * ## 设计原则（与 `regions.ts` 一致）
 *
 * 1. **单一事实来源**：必需地名只在本文件声明一次；`DeclutterPriority` 与验证器都从这里取，
 *    不在渲染层和断言层各写一份 ID 列表。
 * 2. **用「关键词」而不是硬编码 place ID 解析**：内容里的 place ID 属于内容任务所有，
 *    可能调整；这里声明的是**读者需要的概念**（夏威夷 / 中途岛 / …）以及它在内容中
 *    的可识别特征（`keyword`）。解析时到真实 `places[]` 里匹配，匹配不到就如实记为空，
 *    由验证器 FAIL 报警——**绝不伪造坐标或地点**。
 * 3. **区域名单独一类**：澳大利亚北部是区域名而非具体地点，由 `regions.ts` 的
 *    `MAP_REGION_LABELS` 承载，此处用 `regionId` 引用，不重复声明标签。
 * 4. **不新增任何史实/坐标**：本文件只有字符串与 ID 引用。
 */

export interface MandatedLabel {
  /** 读者需要的概念名（也是验证器断言用的字面量）。 */
  label: string;
  /**
   * 在 `places[]` 里匹配的关键词。
   * 用于把「概念」解析到真实地点，而不是硬编码 place ID。
   */
  keyword: string;
  /**
   * 关键词出现在哪个字段才算数（决定解析优先级，避免误匹配）。
   * - `name`：`historicalName` / `modernName`（地名本身），优先级最高
   * - `country`：`modernCountry`（国家名，例如「菲律宾」只出现在马尼拉的国家字段里）
   */
  field: 'name' | 'country';
  /** 若该地名由区域标注层承载（如「澳大利亚北部」），填对应 region id。 */
  regionId?: string;
  /** 该标签在渲染输出中由什么承载（写进验证器消息，便于人工复核）。 */
  satisfiedBy: string;
}

/**
 * 工单强制要求在地图上标注的地名（**唯一事实来源**）。
 *
 * 顺序即优先级内顺序：越靠前越优先保留标签。
 *
 * `field` 的选择依据真实内容：
 * - 「夏威夷」只出现在 `瓦胡岛（美国夏威夷州）` 的现代名里 → 取该岛（`place-oahu`），
 *   它同时也是珍珠港所在地，是读者要找的地方。
 * - 「菲律宾」只出现在马尼拉等地的 `modernCountry` 里 → 取国家字段匹配里第一个
 *   国家为菲律宾的**首都**级地点（马尼拉），比巴丹半岛更符合「标注菲律宾」的意图。
 */
export const MANDATED_LABELS: readonly MandatedLabel[] = [
  { label: '中途岛', keyword: '中途岛', field: 'name', satisfiedBy: '地点标签第一行（历史地名「中途岛」）' },
  { label: '夏威夷', keyword: '夏威夷', field: 'name', satisfiedBy: '地点标签第二行（现代名含「瓦胡岛（美国夏威夷州）」）' },
  { label: '菲律宾', keyword: '菲律宾', field: 'country', satisfiedBy: '地点标签第二行国家字段（「马尼拉 · 菲律宾」）' },
  { label: '新加坡', keyword: '新加坡', field: 'name', satisfiedBy: '地点标签第一行（历史地名「新加坡（英属海峡殖民地）」）' },
  { label: '马来亚', keyword: '马来亚', field: 'name', satisfiedBy: '地点标签第一行（历史地名「马来亚（英属）」）' },
  { label: '关岛', keyword: '关岛', field: 'name', satisfiedBy: '地点标签第一行（历史地名「关岛」）' },
  { label: '威克岛', keyword: '威克岛', field: 'name', satisfiedBy: '地点标签第一行（历史地名「威克岛」）' },
  {
    label: '澳大利亚北部',
    keyword: '达尔文',
    field: 'name',
    regionId: 'region-northern-australia',
    satisfiedBy: '区域标注层（以 place-darwin 为锚点）+ 该地点自身标签',
  },
];

/**
 * 把「必显地名」解析为真实地点 ID。
 *
 * **匹配优先级（重要）**：不能简单地「第一个 haystack 包含关键词就取」——真实内容里
 * 有些**海域/区域**节点的描述里也会提到这些地名（例如「美国第 16、17 特混舰队作战海域」
 * 的描述含「中途岛」，「瓦胡岛」的描述含「夏威夷」），而 `places[]` 的顺序取决于调用方
 * 是否排序，于是「第一次匹配」会随数组顺序而变，导致解析到错误的节点。
 *
 * 因此按「地名是否更可能是该节点的主名」分级匹配：
 *   1. `historicalName` 或 `modernName` **等于**关键词（最精确）
 *   2. `historicalName` 或 `modernName` **以关键词开头**
 *   3. `historicalName` 或 `modernName` **包含**关键词
 *   4. 最后才退到 `modernCountry` / 描述等次要字段
 * 同一级别内按 `places[]` 原顺序（调用方请传内容原始顺序，避免排序影响结果）。
 *
 * @param places 真实 `places[]`（来自 content/history.json，只读）
 * @returns 有序的 { label, placeId | null }；为 null 表示内容里找不到对应地点
 *          （验证器会把这种情况判为 FAIL，而不是静默跳过）。
 */
export function resolveMandatedPlaceIds(
  places: readonly { id: string; historicalName: string; modernName: string; modernCountry: string }[],
): { label: string; placeId: string | null; regionId?: string }[] {
  const score = (
    place: { historicalName: string; modernName: string; modernCountry: string; placeType?: string },
    mandated: MandatedLabel,
  ): number => {
    const keyword = mandated.keyword;
    if (mandated.field === 'country') {
      if (!String(place.modernCountry ?? '').includes(keyword)) return 0;
      // 同为国家字段命中时，优先「首都 / 海军基地」这类读者最可能去找的节点。
      const typeBoost = place.placeType === 'capital' ? 3 : place.placeType === 'naval-base' ? 2 : 0;
      return 1 + typeBoost;
    }
    const primary = [place.historicalName, place.modernName];
    if (primary.some((name) => name === keyword)) return 6;
    if (primary.some((name) => name.startsWith(keyword))) return 5;
    if (primary.some((name) => name.includes(keyword))) return 4;
    if (String(place.modernCountry ?? '').includes(keyword)) return 1;
    return 0;
  };

  return MANDATED_LABELS.map((mandated) => {
    let best: { id: string; score: number; rank: number } | null = null;
    for (const place of places) {
      const s = score(place, mandated);
      if (s === 0) continue;
      // 同分时的**确定性**决胜：短名字更接近「就是这个地方」本身
      // （例如「瓦胡岛（美国夏威夷州）」 9 字 vs 「珍珠港（夏威夷瓦胡岛）」 12 字），
      // 再退到 id 字典序。这样结果不依赖调用方是否排序，
      // 渲染层与验证器永远得到同一个解析结果。
      const rank = (place.historicalName ?? '').length * 1000 + (place.modernName ?? '').length;
      if (best === null || s > best.score || (s === best.score && rank < best.rank)) {
        best = { id: place.id, score: s, rank };
      }
    }
    return {
      label: mandated.label,
      placeId: best ? best.id : null,
      ...(mandated.regionId === undefined ? {} : { regionId: mandated.regionId }),
    };
  });
}

/**
 * 必显地名对应的 place ID 集合（去重、去掉未解析项）。
 */
export function mandatedPlaceIdSet(
  places: readonly { id: string; historicalName: string; modernName: string; modernCountry: string }[],
): Set<string> {
  const ids = new Set<string>();
  for (const item of resolveMandatedPlaceIds(places)) {
    if (item.placeId) ids.add(item.placeId);
  }
  return ids;
}
