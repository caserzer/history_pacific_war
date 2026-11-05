/**
 * Atlas SVG 地图引擎 —— 离线自绘，无瓦片、无商业 Key、无外部依赖。
 *
 * 能力：
 * - 缩放（按钮 / 滚轮 / 双指捏合）、平移（拖拽 / 方向键 / 触摸单指拖动）
 * - 图层开关（地点、阶段位置、示意航线、不确定范围、网格）
 * - 日期选择联动（时间轴滑块 → 阶段跳转）
 * - 键盘：Tab 聚焦、方向键平移、+/- 缩放、0 复位、1..9 跳阶段
 * - 触摸：单指拖动平移、双指捏合缩放
 *
 * 硬性规则（mountApi.ts）：
 * - 地点坐标是真实地理节点，**不是**舰队位置；
 * - 舰队位置只来自 `phase.positions[side]`，且必须显示「示意」与不确定半径；
 * - 航线是示意折线，界面上必须写明「不是精确历史航迹」；
 * - 双方使用形状/线型区分，不只靠颜色。
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import type { Phase, PlaceEntity } from '../data/types';
import { MAP_REGION_LABELS } from './regions';
import {
  LAYER_LABELS,
  panView,
  resetView,
  setLayerChecked,
  zoomByFactor,
  type MapLayers,
} from './stateMachines';
import {
  IDENTITY_TRANSFORM,
  KM_PER_DEGREE,
  MAX_ZOOM,
  MIN_ZOOM,
  SIDE_ENCODING,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  clampTransform,
  createProjection,
  project,
  scaleBarGeometry,
  svgTransform,
  toUserSpace,
  uncertaintyRadius,
  zoomAt,
  type GeoBounds,
  type ViewTransform,
} from './projection';

// 图层模型与标签定义在纯函数模块 stateMachines.ts 中（可被验证器直接调用）。
// 这里 re-export，保持既有 import 路径不变。
export { DEFAULT_LAYERS, LAYER_LABELS } from './stateMachines';
export type { MapLayers } from './stateMachines';

export interface AtlasMapEngineProps {
  places: readonly PlaceEntity[];
  bounds: GeoBounds;
  phase: Phase | null;
  battleTitle?: string;
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
  layers: MapLayers;
  onLayersChange: (layers: MapLayers) => void;
  /** 外部控制的视口（可选）；不传则内部维护。 */
  transform?: ViewTransform;
  onTransformChange?: (transform: ViewTransform) => void;
  /** 由播放控件调用：跳到下一个/上一个阶段后，地图负责保持视野可读。 */
  label: string;
}

/** 只保留在视野范围内的可见性判断（用于给读屏用户跳过无关节点）。 */
function isFinitePoint(point: { lat: number; lng: number } | undefined): boolean {
  return Boolean(point) && Number.isFinite(point!.lat) && Number.isFinite(point!.lng);
}

export function AtlasMapEngine({
  places,
  bounds,
  phase,
  battleTitle,
  selectedPlaceId,
  onSelectPlace,
  layers,
  onLayersChange,
  transform: controlledTransform,
  onTransformChange,
  label,
}: AtlasMapEngineProps) {
  const projection = useMemo(() => createProjection(bounds), [bounds]);
  const [innerTransform, setInnerTransform] = useState<ViewTransform>(IDENTITY_TRANSFORM);
  const transform = controlledTransform ?? innerTransform;

  const setTransform = useCallback(
    (next: ViewTransform) => {
      const clamped = clampTransform(next);
      if (onTransformChange) onTransformChange(clamped);
      else setInnerTransform(clamped);
    },
    [onTransformChange],
  );

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const pointerRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const touchRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ distance: number; center: { x: number; y: number } } | null>(null);

  const zoomBy = useCallback(
    (factor: number) => {
      // 状态迁移由纯函数 stateMachines.zoomByFactor 提供（验证器直接调用同一函数）。
      setTransform(zoomByFactor(transform, factor));
    },
    [setTransform, transform],
  );

  // ---------------------------------------------------------------- 指针（鼠标/触摸统一）
  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    // 触摸：记录所有触点用于捏合
    if (event.pointerType === 'touch') {
      touchRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchRef.current.size === 2) {
        const [a, b] = [...touchRef.current.values()];
        pinchRef.current = {
          distance: Math.hypot(a!.x - b!.x, a!.y - b!.y),
          center: { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 },
        };
        return;
      }
    }
    pointerRef.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    setDragging(true);
    svg.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;

    if (event.pointerType === 'touch' && touchRef.current.has(event.pointerId)) {
      touchRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchRef.current.size === 2 && pinchRef.current) {
        const [a, b] = [...touchRef.current.values()];
        const distance = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        const center = { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 };
        const previous = pinchRef.current;
        if (previous.distance > 0) {
          const rect = svg.getBoundingClientRect();
          const focus = toUserSpace(center.x, center.y, rect, transform);
          const factor = distance / previous.distance;
          if (Number.isFinite(factor) && factor > 0) setTransform(zoomAt(transform, factor, focus));
        }
        pinchRef.current = { distance, center };
        return;
      }
    }

    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    const dxClient = event.clientX - pointer.x;
    const dyClient = event.clientY - pointer.y;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    // 客户端像素 → SVG 用户单位
    const dx = (dxClient / rect.width) * VIEW_WIDTH;
    const dy = (dyClient / rect.height) * VIEW_HEIGHT;
    pointerRef.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    // 同方向键：zoom=1 时没有平移余量，拖动应先放大到 2× 才有意义。
    // D4：拖动**不改变缩放**（旧实现在 zoom=1 时偷偷把 zoom 改成 2，评审认为困惑）。
    // 全图视野下没有平移余量时，panView 会安全返回原位；界面另有「复位」按钮。
    setTransform(panView(transform, dx, dy));
  };

  const endPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    touchRef.current.delete(event.pointerId);
    if (touchRef.current.size < 2) pinchRef.current = null;
    if (pointerRef.current?.id === event.pointerId) pointerRef.current = null;
    setDragging(false);
    svgRef.current?.releasePointerCapture?.(event.pointerId);
  };

  const onWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    // 用滚轮缩放；不调用 preventDefault 的话页面会同时滚动，
    // 但 React 的 passive wheel 监听无法阻止，因此交由外层容器处理（见 AtlasEngine）。
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const focus = toUserSpace(event.clientX, event.clientY, rect, transform);
    const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;
    setTransform(zoomAt(transform, factor, focus));
  };

  // ---------------------------------------------------------------- 键盘
  const onKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    const step = event.shiftKey ? 60 : 24;
    // D4：方向键**只平移，不改缩放**。
    // 全图视野（zoom=1）下没有平移余量时保持原位，避免「按了没反应」的困惑 ——
    // 这一点由界面上的缩放按钮/复位按钮与 aria 提示解决，而不是偷偷改 zoom。
    switch (event.key) {
      case 'ArrowLeft':
        setTransform(panView(transform, step, 0));
        break;
      case 'ArrowRight':
        setTransform(panView(transform, -step, 0));
        break;
      case 'ArrowUp':
        setTransform(panView(transform, 0, step));
        break;
      case 'ArrowDown':
        setTransform(panView(transform, 0, -step));
        break;
      case '+':
      case '=':
        zoomBy(1.25);
        break;
      case '-':
      case '_':
        zoomBy(1 / 1.25);
        break;
      case '0':
        setTransform(resetView());
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  // ---------------------------------------------------------------- 投影后的节点
  const projectedPlaces = useMemo(
    () =>
      places
        .filter((place) => isFinitePoint(place.coordinates))
        .map((place) => ({ place, point: project(place.coordinates, projection) })),
    [places, projection],
  );
  const projectedById = useMemo(() => new Map(projectedPlaces.map(({ place, point }) => [place.id, point])), [projectedPlaces]);

  const sideGeometry = useMemo(() => {
    if (!phase) return null;
    const positions = (['japan', 'allies'] as const).map((side) => {
      const position = phase.positions?.[side];
      if (!position || !isFinitePoint(position.coordinates)) return null;
      return {
        side,
        position,
        point: project(position.coordinates, projection),
        radius: uncertaintyRadius(position.uncertaintyRadiusKm, projection),
      };
    });
    const routes = (phase.routes ?? [])
      .map((route) => {
        const points = (route.path ?? [])
          .filter((point) => isFinitePoint(point))
          .map((point) => project(point, projection));
        if (points.length < 2) return null;
        return { route, points };
      })
      .filter((entry): entry is { route: NonNullable<Phase['routes']>[number]; points: { x: number; y: number }[] } => entry !== null);
    return { positions: positions.filter((entry) => entry !== null), routes };
  }, [phase, projection]);

  // 外接框缩放到视野时不裁切：stage 区域可滚动（窄屏友好）
  // 比例尺几何（MAP-01 attempt 3 修正）：线长与标签由同一个 km 派生，随 zoom 一致换算。
  const scaleBar = useMemo(() => scaleBarGeometry(projection, transform.zoom), [projection, transform.zoom]);
  const scaleBarKmLabel = scaleBar.km >= 1 ? String(Math.round(scaleBar.km)) : scaleBar.km.toFixed(2);

  return (
    <div className="pw-map" data-atlas-engine="">
      <div className="pw-maptoolbar" role="toolbar" aria-label="地图视口控制">
        <button type="button" className="pw-btn" onClick={() => zoomBy(1.5)} aria-label="放大地图" data-map-action="zoom-in">
          ＋
        </button>
        <button type="button" className="pw-btn" onClick={() => zoomBy(1 / 1.5)} aria-label="缩小地图" data-map-action="zoom-out">
          －
        </button>
        <button type="button" className="pw-btn" onClick={() => setTransform(resetView())} aria-label="复位视图" data-map-action="reset">
          复位
        </button>
        <span className="pw-map__zoom" data-map-zoom={transform.zoom.toFixed(2)}>
          缩放 {transform.zoom.toFixed(1)}×
        </span>
        <span className="pw-visually-hidden" aria-live="polite">
          {`当前缩放 ${transform.zoom.toFixed(1)} 倍`}
        </span>
      </div>

      <svg
        ref={svgRef}
        className={`pw-map__canvas${dragging ? ' is-dragging' : ''}`}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        role="application"
        aria-label={`${label}。使用方向键平移，加号减号缩放，数字键 0 复位。`}
        tabIndex={0}
        data-atlas-canvas=""
        data-map-zoom={transform.zoom.toFixed(2)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onKeyDown={onKeyDown}
        onWheel={onWheel}
      >
        <defs>
          <pattern id="pw-atlas-graticule" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1f5c4a" strokeOpacity="0.18" strokeWidth="1" />
          </pattern>
          <marker id="pw-atlas-arrow-japan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#141c26" />
          </marker>
          <marker id="pw-atlas-arrow-allies" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#1f5c4a" />
          </marker>
        </defs>

        {/* 底色（旧纸 + 海图绿） */}
        <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#eef0e2" />
        <g transform={svgTransform(transform)}>
          {layers.graticule ? (
            <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#pw-atlas-graticule)" data-layer="graticule" aria-hidden="true" />
          ) : null}

          {/* 不确定范围：先画，位于位置符号之下 */}
          {layers.uncertainty && sideGeometry
            ? sideGeometry.positions
                .filter((entry) => entry.radius > 0)
                .map(({ side, point, radius, position }) => (
                  <circle
                    key={`unc-${side}`}
                    cx={point.x}
                    cy={point.y}
                    r={radius}
                    fill="none"
                    stroke={side === 'japan' ? '#141c26' : '#1f5c4a'}
                    strokeWidth="1"
                    strokeDasharray={side === 'japan' ? '2 4' : '6 3'}
                    opacity="0.75"
                    data-layer="uncertainty"
                    data-side={side}
                    data-uncertainty-radius-km={position.uncertaintyRadiusKm}
                  >
                    <title>{`${SIDE_ENCODING[side].label}位置不确定范围约 ±${position.uncertaintyRadiusKm} km（${position.uncertaintyNote}）`}</title>
                  </circle>
                ))
            : null}

          {/* 示意航线 */}
          {layers.routes && sideGeometry
            ? sideGeometry.routes.map(({ route, points }) => {
                const encoded = SIDE_ENCODING[route.side];
                return (
                  <g key={route.id} data-layer="route" data-side={route.side} data-schematic={String(route.schematic)}>
                    <polyline
                      points={points.map((point) => `${point.x},${point.y}`).join(' ')}
                      fill="none"
                      stroke={route.side === 'japan' ? '#141c26' : '#1f5c4a'}
                      strokeWidth={route.side === 'japan' ? 2 : 1.8}
                      strokeDasharray={route.side === 'japan' ? `${encoded.dash}` : '7 4'}
                      strokeOpacity="0.85"
                      markerEnd={route.side === 'japan' ? 'url(#pw-atlas-arrow-japan)' : 'url(#pw-atlas-arrow-allies)'}
                    >
                      <title>{`${encoded.label}示意航线：${route.label}。${route.note}`}</title>
                    </polyline>
                  </g>
                );
              })
            : null}

          {/* 真实地点 */}
          {layers.places
            ? projectedPlaces.map(({ place, point }) => {
                const selected = place.id === selectedPlaceId;
                return (
                  <g
                    key={place.id}
                    transform={`translate(${point.x} ${point.y})`}
                    className="pw-map__place"
                    data-layer="place"
                    data-place-id={place.id}
                    data-selected={selected ? 'true' : 'false'}
                  >
                    <rect
                      x={-6}
                      y={-6}
                      width={12}
                      height={12}
                      fill={selected ? '#d9b45a' : '#fbf5e9'}
                      stroke="#1c2530"
                      strokeWidth="1.6"
                    />
                    <text x={10} y={4} fontSize="11" aria-hidden="true" fill="#1c2530">
                      {place.historicalName}
                    </text>
                    <text x={10} y={16} fontSize="9" aria-hidden="true" fill="#4a5561">
                      {place.modernName} · {place.modernCountry}
                    </text>
                    <title>{`${place.historicalName}（现代：${place.modernName}，${place.modernCountry}）。坐标精度约 ±${place.coordinateAccuracyKm} km。`}</title>
                    <circle
                      r={14}
                      fill="transparent"
                      role="button"
                      tabIndex={0}
                      aria-label={`选择地点 ${place.historicalName}`}
                      onClick={() => onSelectPlace(place.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onSelectPlace(place.id);
                        }
                      }}
                    />
                  </g>
                );
              })
            : null}

          {/* 区域标注（MAP-01 地理标注层）：区域名锚定到真实地点，不新增坐标/史实 */}
          {layers.places
            ? MAP_REGION_LABELS.map((region) => {
                const point = projectedById.get(region.anchorPlaceId);
                // 锚点地点不在当前内容里 → 不渲染该区域标签（绝不兜造坐标）。
                if (!point) return null;
                return (
                  <g
                    key={region.id}
                    data-layer="region"
                    data-region-id={region.id}
                    data-region-label={region.label}
                    data-anchor-place={region.anchorPlaceId}
                    transform={`translate(${point.x} ${point.y - 26})`}
                  >
                    <text x={0} y={0} fontSize="12.5" fontWeight="700" textAnchor="middle" fill="#7a4a1f" aria-hidden="true">
                      {region.label}
                    </text>
                    <title>{region.description}</title>
                  </g>
                );
              })
            : null}

          {/* 阶段双方位置（示意） */}
          {layers.positions && sideGeometry
            ? sideGeometry.positions.map(({ side, point, position }) => {
                const encoded = SIDE_ENCODING[side];
                return (
                  <g
                    key={`pos-${side}`}
                    transform={`translate(${point.x} ${point.y})`}
                    data-layer="position"
                    data-side={side}
                    data-schematic={String(position.schematic)}
                  >
                    {encoded.shape === 'square' ? (
                      <rect x={-9} y={-9} width={18} height={18} fill={side === 'japan' ? '#141c26' : '#fbf5e9'} stroke={side === 'japan' ? '#141c26' : '#1f5c4a'} strokeWidth="2.4" />
                    ) : (
                      <polygon points="0,-11 10,8 -10,8" fill={side === 'japan' ? '#141c26' : '#fbf5e9'} stroke={side === 'japan' ? '#141c26' : '#1f5c4a'} strokeWidth="2.4" />
                    )}
                    <text x={0} y={26} fontSize="9.5" textAnchor="middle" fill="#1c2530" aria-hidden="true">
                      {position.label}
                    </text>
                    <title>{`${encoded.label}（示意位置）：${position.label} — ${position.description}。不确定半径约 ±${position.uncertaintyRadiusKm} km。`}</title>
                  </g>
                );
              })
            : null}
        </g>

        {/* 比例尺（位于缩放组之外：线长按屏幕 user unit 绘制；km 标签由同一几何派生） */}
        <g
          transform={`translate(16 ${VIEW_HEIGHT - 22})`}
          data-layer="scalebar"
          role="img"
          aria-label={`比例尺：约 ${scaleBarKmLabel} 公里`}
          data-scalebar-km={scaleBar.km}
          data-scalebar-length={scaleBar.screenLength.toFixed(3)}
          data-scalebar-zoom={scaleBar.zoom.toFixed(3)}
          data-scalebar-projection-scale={projection.scale.toFixed(6)}
          data-scalebar-target-px={110}
        >
          <rect x={-6} y={-14} width={Math.max(132, scaleBar.screenLength + 24)} height={24} fill="#f2e8d5" fillOpacity="0.85" stroke="#1c2530" strokeOpacity="0.3" />
          <line x1={0} y1={-6} x2={scaleBar.screenLength} y2={-6} stroke="#1c2530" strokeWidth="2" />
          <text x={0} y={4} fontSize="10" fill="#1c2530">
            ≈ {scaleBarKmLabel} km
          </text>
        </g>
      </svg>

      <div className="pw-map__layers" role="group" aria-label="图层">
        {(Object.keys(LAYER_LABELS) as (keyof MapLayers)[]).map((key) => (
          <label key={key} className="pw-map__layer">
            <input
              type="checkbox"
              checked={layers[key]}
              data-layer-toggle={key}
              onChange={(event) => onLayersChange(setLayerChecked(layers, key, event.target.checked))}
            />
            {LAYER_LABELS[key]}
          </label>
        ))}
      </div>
      <p className="pw-atlas__note">
        {battleTitle ? `当前战役：${battleTitle}。` : ''}
        等距圆柱投影的自绘海图，用于理解相对位置与航程方向；不是精确测绘地图。
        带「示意」标记的位置与航线是教学简化，不代表精确历史坐标或航迹。
        比例尺按当前缩放换算，约 1° 纬度 ≈ {KM_PER_DEGREE} km。
      </p>
      <span className="pw-visually-hidden" data-map-zoom-range={`${MIN_ZOOM}-${MAX_ZOOM}`} />
    </div>
  );
}
