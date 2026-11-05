/**
 * 原创 inline SVG 示意图组件（见 diagramMetadata.ts 的许可见声明）。
 * 全部使用设计 token 对应色值，随主题一致；无外部引用、无网络请求。
 */

import type { ReactNode } from 'react';
import { DIAGRAMS, type DiagramMeta } from './diagramMetadata';

function FigureFrame({ meta, children }: { meta: DiagramMeta; children: ReactNode }) {
  return (
    <figure className="pw-figure" data-diagram-id={meta.id}>
      <svg
        className="pw-figure__canvas"
        role="img"
        aria-label={meta.alt}
        viewBox="0 0 720 300"
        preserveAspectRatio="xMidYMid meet"
      >
        <title>{meta.title}</title>
        <desc>{meta.caption}</desc>
        {children}
      </svg>
      <figcaption>
        <strong>{meta.title}。</strong>
        {meta.caption}
        <span className="pw-figure__license">
          作者：{meta.author} · 许可：{meta.license} · {meta.licenseNote}
        </span>
      </figcaption>
    </figure>
  );
}

const INK = '#1c2530';
const NAVY = '#141c26';
const GREEN = '#1f5c4a';
const GREEN_SOFT = '#7fb49c';
const BRASS = '#7a4e0c';
const BRASS_LIGHT = '#d9b45a';
const PAPER = '#fbf5e9';
const PAPER_2 = '#e8dcc3';
const ALERT = '#9c2f22';

export function EvidenceTypesDiagram() {
  const meta = DIAGRAMS['diagram-evidence-types'] as DiagramMeta;
  const columns = [
    { x: 20, label: '事实', sub: 'fact', glyph: 'square', color: NAVY },
    { x: 190, label: '解释', sub: 'interpretation', glyph: 'circle', color: GREEN },
    { x: 360, label: '争议', sub: 'disputed', glyph: 'diamond', color: ALERT },
    { x: 530, label: '示意', sub: 'schematic', glyph: 'dotted', color: BRASS },
  ];
  return (
    <FigureFrame meta={meta}>
      <rect x="0" y="0" width="720" height="300" fill={PAPER} />
      {columns.map((column) => (
        <g key={column.sub} transform={`translate(${column.x}, 30)`}>
          <rect x="0" y="0" width="170" height="230" fill={PAPER_2} stroke={INK} strokeOpacity="0.2" />
          {column.glyph === 'square' ? <rect x="55" y="24" width="60" height="60" rx="2" fill={column.color} /> : null}
          {column.glyph === 'circle' ? <circle cx="85" cy="54" r="30" fill={column.color} /> : null}
          {column.glyph === 'diamond' ? (
            <rect
              x="62"
              y="31"
              width="46"
              height="46"
              fill="none"
              stroke={column.color}
              strokeWidth="4"
              strokeDasharray="8 5"
              transform="rotate(45 85 54)"
            />
          ) : null}
          {column.glyph === 'dotted' ? (
            <rect x="55" y="24" width="60" height="60" fill="none" stroke={column.color} strokeWidth="4" strokeDasharray="2 6" />
          ) : null}
          <text x="85" y="125" textAnchor="middle" fontSize="26" fontFamily="serif" fill={column.color} fontWeight="700">
            {column.label}
          </text>
          <text x="85" y="150" textAnchor="middle" fontSize="13" fontFamily="monospace" fill={INK} opacity="0.75">
            {column.sub}
          </text>
          <line x1="20" y1="168" x2="150" y2="168" stroke={column.color} strokeWidth="1" strokeOpacity="0.5" />
          <text x="85" y="196" textAnchor="middle" fontSize="12" fontFamily="sans-serif" fill={INK} opacity="0.8">
            {column.sub === 'fact' ? '可核查的记录' : null}
            {column.sub === 'interpretation' ? '学界的因果分析' : null}
            {column.sub === 'disputed' ? '研究者有分歧' : null}
            {column.sub === 'schematic' ? '为理解而简化' : null}
          </text>
        </g>
      ))}
      <text x="360" y="288" textAnchor="middle" fontSize="12" fontFamily="monospace" fill={INK} opacity="0.65">
        形状 + 文字 + 颜色三重编码 · 不只依赖颜色区分
      </text>
    </FigureFrame>
  );
}

export function SixEntriesDiagram() {
  const meta = DIAGRAMS['diagram-six-entries'] as DiagramMeta;
  const center = { x: 360, y: 150 };
  const entries = [
    { label: '时间线', en: 'Timeline', angle: -90 },
    { label: '战役', en: 'Battles', angle: -30 },
    { label: '人物', en: 'People', angle: 30 },
    { label: '地图', en: 'Atlas', angle: 90 },
    { label: '知识专题', en: 'Concepts', angle: 150 },
    { label: '历史问题', en: 'Questions', angle: 210 },
  ];
  return (
    <FigureFrame meta={meta}>
      <rect x="0" y="0" width="720" height="300" fill={PAPER} />
      {entries.map((entry) => {
        const rad = (entry.angle * Math.PI) / 180;
        const x = center.x + Math.cos(rad) * 220;
        const y = center.y + Math.sin(rad) * 100;
        return (
          <g key={entry.en}>
            <line x1={center.x} y1={center.y} x2={x} y2={y} stroke={BRASS} strokeWidth="1.5" strokeDasharray="5 4" />
            <rect x={x - 62} y={y - 22} width="124" height="44" fill={PAPER_2} stroke={GREEN} strokeWidth="1.5" />
            <text x={x} y={y - 2} textAnchor="middle" fontSize="16" fontFamily="serif" fill={INK} fontWeight="700">
              {entry.label}
            </text>
            <text x={x} y={y + 14} textAnchor="middle" fontSize="10" fontFamily="monospace" fill={BRASS}>
              {entry.en}
            </text>
          </g>
        );
      })}
      <ellipse cx={center.x} cy={center.y} rx="86" ry="44" fill={NAVY} />
      <text x={center.x} y={center.y - 4} textAnchor="middle" fontSize="15" fontFamily="serif" fill={PAPER} fontWeight="700">
        同一份教材内容
      </text>
      <text x={center.x} y={center.y + 14} textAnchor="middle" fontSize="10" fontFamily="monospace" fill={BRASS_LIGHT}>
        事件 · 人物 · 地点 · 战役
      </text>
      <text x="360" y="288" textAnchor="middle" fontSize="12" fontFamily="monospace" fill={INK} opacity="0.65">
        指向同一个人物或事件 · 跳转后仍是同一段历史
      </text>
    </FigureFrame>
  );
}

export function ReadingLayersDiagram() {
  const meta = DIAGRAMS['diagram-reading-layers'] as DiagramMeta;
  const steps = [
    { y: 190, w: 520, color: GREEN, level: '第 1 层', text: '是什么 —— 用日常语言给出定义' },
    { y: 130, w: 420, color: BRASS, level: '第 2 层', text: '怎样运作 —— 流程、人员与限制' },
    { y: 70, w: 320, color: NAVY, level: '第 3 层', text: '为什么影响决策 —— 放回具体战役' },
  ];
  return (
    <FigureFrame meta={meta}>
      <rect x="0" y="0" width="720" height="300" fill={PAPER} />
      {steps.map((step, index) => (
        <g key={step.level}>
          <rect x={360 - step.w / 2} y={step.y} width={step.w} height="48" rx="2" fill={step.color} opacity={0.12} />
          <rect x={360 - step.w / 2} y={step.y} width="6" height="48" fill={step.color} />
          <text x={360 - step.w / 2 + 20} y={step.y + 22} fontSize="12" fontFamily="monospace" fill={step.color} fontWeight="700">
            {step.level}
          </text>
          <text x={360 - step.w / 2 + 20} y={step.y + 40} fontSize="15" fontFamily="serif" fill={INK}>
            {step.text}
          </text>
          {index < steps.length - 1 ? (
            <path
              d={`M 380 ${step.y - 4} L 380 ${step.y - 12}`}
              stroke={BRASS}
              strokeWidth="2"
              markerEnd="url(#pw-layer-arrow)"
            />
          ) : null}
        </g>
      ))}
      <defs>
        <marker id="pw-layer-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={BRASS} />
        </marker>
      </defs>
      <text x="360" y="272" textAnchor="middle" fontSize="12" fontFamily="monospace" fill={INK} opacity="0.65">
        三层一层比一层深，依次递进而非重复
      </text>
      <circle cx="660" cy="34" r="10" fill={GREEN_SOFT} opacity="0.5" />
    </FigureFrame>
  );
}
