/**
 * Atlas 挂载 API（供 MAP-01 使用）
 * =================================
 *
 * WEB-01 只交付外壳与契约消费，**不实现**交互地图；地图由 MAP-01 在后续任务中实现。
 * 为了让后续工作不必重写路由与数据层，本文件固定了挂载契约。
 *
 * ## 契约（MAP-01 必须遵守）
 *
 * 地图组件通过 `<AtlasMount />` 挂载到一个稳定的 DOM 容器：
 *
 * ```tsx
 * <AtlasMount
 *   view="phases"                      // 'places' | 'phases'（默认 places）
 *   places={places}                    // 仅 places[]，schematic 必须为 false
 *   battles={battles}                  // 可选：用于阶段推演，地图组件自己按 sequence 排序
 *   selectedPlaceId={route.id}         // 来自 #/atlas/<placeId>
 *   onSelectPlace={(placeId) => navigate(buildHref('atlas', { id: placeId }))}
 *   onSelectPhase={(battleId, phaseId) => { ... }}  // 阶段切换；不改变 URL 契约
 * />
 * ```
 *
 * ### 硬性规则（来自 contracts/README.md 与架构政策）
 *
 * 1. **不得创建外部瓦片依赖**：核心功能必须在无网络、无商业 Key 下可用
 *    （本地 SVG/GeoJSON/Canvas 自绘）。地图库、地理数据与瓦片服务必须分别评估许可。
 * 2. **位置语义**：`places[].coordinates` 是真实地理节点的坐标，不是舰队位置；
 *    阶段位置来自 `battle.phases[].positions[side]`，且 `schematic` 必须为 `true`。
 * 3. **示意必须可见**：`phase.schematic`、`phase.uncertaintyNote`、
 *    `route.schematic` 与 `route.note` 必须在界面上可见，不能用精确外观误导读者。
 * 4. **航线**：`route.path` 是示意折线，禁止表示为精确历史航迹。
 * 5. **历史地名 + 现代地名 + 国家** 必须同时显示（契约 §4.4）。
 * 6. **双方对称**：日本与盟军使用同一视觉权重，用形状/线型区分，不只靠颜色。
 * 7. **可访问性**：键盘可达、触摸可缩放平移、`prefers-reduced-motion` 时关闭播放动画；
 *    阶段选择必须是可聚焦控件。
 * 8. **不新建数据源**：地图状态来自同一份 `content/history.json`，不得另建孤立地图数据。
 *
 * ## 路由
 *
 * - 地图入口：`#/atlas` 与 `#/atlas/<placeId>`（已由 buildHref('atlas', ...) 实现）。
 * - 从地图跳转到叙述：使用 `buildHref('battles', { id: battleId })` 或
 *   `buildHref('timeline', { id: eventId })`，不要手写 URL。
 *
 * ## 代码位置
 *
 * MAP-01 实现时新增 `src/features/atlas/MapCanvas.tsx` 之类组件，
 * 在 `src/features/atlas/AtlasView.tsx` 的 `AtlasMount` 插槽内渲染即可，
 * 不需要修改路由、数据索引或证据组件。
 */

import type { BattleEntity, PlaceEntity } from '../../data/types';

export type AtlasViewMode = 'places' | 'phases';

export interface AtlasMountProps {
  /** 当前视图模式。 */
  view?: AtlasViewMode;
  /** 真实地理节点（来自 content.places[]）。 */
  places: readonly PlaceEntity[];
  /** 战役（含 phases[]），仅 view='phases' 时需要。 */
  battles?: readonly BattleEntity[];
  /** 当前选中地点（来自路由 #/atlas/<placeId>）。 */
  selectedPlaceId: string | null;
  /** 选中地点回调；实现方应写回 hash 以保持深链与后退可用。 */
  onSelectPlace: (placeId: string) => void;
  /** 阶段播放/选择需要的配置；具体形状由 MAP-01 定义，但不得改变上述字段语义。 */
  phaseOptions?: {
    battleId?: string;
    autoplay?: boolean;
  };
}

/** 可供 MAP-01 复用的证据类型图例（保证地图与正文标签一致）。 */
export interface AtlasLegendEntry {
  kind: 'japan' | 'allies' | 'schematic' | 'base';
  label: string;
  /** 线型/形状编码，确保不只靠颜色区分。 */
  style: string;
}

export const ATLAS_LEGEND: readonly AtlasLegendEntry[] = [
  { kind: 'japan', label: '日本方面行动', style: '深海军蓝实线' },
  { kind: 'allies', label: '盟军方面行动', style: '地图绿虚线' },
  { kind: 'schematic', label: '示意航线／位置', style: '点线 + 「示意」标签' },
  { kind: 'base', label: '基地／港口／岛屿', style: '正方形节点 + 精度圈' },
];
