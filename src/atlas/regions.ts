/**
 * 地图区域标注（region labels）—— MAP-01 地理标注层
 *
 * 这里只做**地理命名**：给已接受内容里的真实地点周边补上读者易懂的区域名，使验收
 * 要求的地理标签（例如「澳大利亚北部」）真正出现在地图上。
 *
 * 硬性边界（与 `features/atlas/mountApi.ts` 的规则一致）：
 * 1. **不新增任何地理坐标**：每个区域都用已接受 `content/history.json` 中的真实
 *    `place` 作为**锚点**（区域名渲染在该地点上方），因此不存在自造的精确位置；
 * 2. **不新增历史叙述**：`description` 只说明「区域名不是精确边界、也不代表舰队位置」，
 *    不含日期、数量、部队或航迹；
 * 3. **数据仍来自同一份内容**：锚点在内容中不存在时，该区域标签不渲染（绝不兜造坐标）。
 *
 * 为什么需要显式表：内容契约的 `places[]` 是具体节点（港口 / 岛屿 / 城市 / 海域），
 * 没有「区域」实体；验收要求标注「澳大利亚北部」这一**区域**，因此用最小显式表把区域名
 * 锚定到真实地点。新增区域时必须同时写清 `label`、`anchorPlaceId` 与 `description`，
 * 并确认锚点存在于已接受 `places[]`。
 */

export interface RegionLabel {
  /** 稳定 ID（供验证器与浏览器测试选择：data-region-id）。 */
  id: string;
  /** 屏幕上显示的区域名（验收要求的地理标签）。 */
  label: string;
  /** 锚点地点 ID：必须存在于 content/history.json 的 places[]；坐标复用该地点。 */
  anchorPlaceId: string;
  /** 屏幕阅读器 / tooltip 说明：区域名不代表精确边界，也不代表舰队位置。 */
  description: string;
}

/**
 * MAP-01 需要的区域标注。
 *
 * - `region-northern-australia`：验收要求标注「澳大利亚北部」；内容里对应的是
 *   达尔文港（place-darwin，澳大利亚北部港口）与珊瑚海/帝汶一带，故以达尔文港为锚点。
 *   这是区域名，不是新地点、新坐标或新史实。
 */
export const MAP_REGION_LABELS: readonly RegionLabel[] = [
  {
    id: 'region-northern-australia',
    label: '澳大利亚北部',
    anchorPlaceId: 'place-darwin',
    description: '区域标注：澳大利亚北部（以达尔文港为锚点；区域名不是精确边界，也不代表舰队位置）。',
  },
];
