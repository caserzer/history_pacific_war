/**
 * 原创示意图 —— 元数据与许可
 *
 * 工单要求「原创 SVG 示意图并注明许可」，同时规定 `public/media` 与媒体登记表由
 * knowledge 模块 MEDIA-01 拥有，本模块**不创建 public 资产**。因此本任务绘制的
 * 都是**界面说明性图形**（解释证据分类、六入口数据关系、阅读层级），
 * 以 React + inline SVG 写在 src 内，并在此登记作者/许可/署名。
 *
 * 重要区分：
 * - 这些图**不是**历史照片、历史地图或史料原件，也不是对真实历史位置的描摹；
 * - 它们不参与 claims/来源体系（那是历史叙述的证据），但同样不得冒充史料；
 * - 历史地图与战役推演图由 MAP-01 与 MEDIA-01 负责，不在本文件的许可声明范围内。
 */

export interface DiagramMeta {
  id: string;
  title: string;
  /** 图形说明，展示在图注中。 */
  caption: string;
  alt: string;
  author: string;
  license: string;
  licenseNote: string;
  /** 该图不是历史素材，必须明示。 */
  notHistoricalSource: true;
}

export const DIAGRAM_LICENCE_NOTE = '本图为站点原创示意图（original-work），随本仓储以 CC BY-SA 4.0 或同等的开放许可使用；不是历史照片、历史地图或史料原件。';

export const DIAGRAMS: Record<string, DiagramMeta> = {
  'diagram-evidence-types': {
    id: 'diagram-evidence-types',
    title: '四类证据如何在正文中出现',
    caption:
      '同一段叙述里可能同时出现四类信息：事实（有记录）、解释（学界的因果分析）、争议（研究者有分歧）与示意（教学简化）。读者看到的标签决定这段文字应该被当作哪一种证据来读。',
    alt: '四栏示意图：事实、解释、争议、示意四类证据标签，分别用方形、圆形、虚线菱形与点线框区分的图例。',
    author: 'experience 模块（WEB-01）',
    license: 'original-work',
    licenseNote: DIAGRAM_LICENCE_NOTE,
    notHistoricalSource: true,
  },
  'diagram-six-entries': {
    id: 'diagram-six-entries',
    title: '六个入口共享同一份数据',
    caption:
      '时间线、战役、人物、地图、知识专题与历史问题，讲的其实是同一段历史，只是看法不同。你在任何一处点开的事件、人物或地点，都能顺着链接走到另外几处讲同一件事的地方，所以不会出现「同一件事在两个入口说法不一样」。',
    alt: '示意图：中心是同一份教材内容，六个入口围绕它并用箭头表示互跳关系。',
    author: 'experience 模块（WEB-01）',
    license: 'original-work',
    licenseNote: DIAGRAM_LICENCE_NOTE,
    notHistoricalSource: true,
  },
  'diagram-reading-layers': {
    id: 'diagram-reading-layers',
    title: '三层解释：是什么 → 怎样运作 → 为什么影响决策',
    caption:
      '每个知识专题都分三层讲：第一层用日常语言说清它是什么，第二层讲它怎么运作、有哪些限制，第三层放回具体战役，说明它改变了哪些选择。三层一层比一层深，而不是把同一句话重复三遍。',
    alt: '三层阶梯示意图，标出第一层定义、第二层运作机制、第三层对决策的影响。',
    author: 'experience 模块（WEB-01）',
    license: 'original-work',
    licenseNote: DIAGRAM_LICENCE_NOTE,
    notHistoricalSource: true,
  },
};
