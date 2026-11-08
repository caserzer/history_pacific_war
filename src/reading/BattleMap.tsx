import { useEffect, useId, useRef, useState } from "react";
import type {
  BattleEntity,
  Coordinates,
  PlaceEntity,
  Side,
} from "../data/types";
import land from "./land.json";
import localLand from "./local-land.json";

interface Props {
  battle: BattleEntity;
  places: ReadonlyMap<string, PlaceEntity>;
  initialPhaseId?: string | null;
  onPhaseChange?: (id: string) => void;
  selectedPlace?: PlaceEntity;
  onSelectPlace?: (id: string) => void;
  onEvidence: (selection: {
    title: string;
    claimIds: string[];
    sourceIds: string[];
  }) => void;
}
const SIDES: Side[] = ["japan", "allies"];
const longitude = (value: number) => (value < 0 ? value + 360 : value);
const W = 800;
const H = 450;

/** 独立战役地图：现代自然地理底图、战役契约中的示意位置和航线分层绘制。 */
export function BattleMap({
  battle,
  places,
  onEvidence,
  initialPhaseId,
  onPhaseChange,
  selectedPlace,
  onSelectPlace,
}: Props) {
  const [step, setStep] = useState(() =>
    Math.max(
      0,
      battle.phases.findIndex((p) => p.id === initialPhaseId),
    ),
  );
  const [mode, setMode] = useState<"pacific" | "battle">(
    initialPhaseId ? "battle" : "pacific",
  );
  const [side, setSide] = useState<Side>("japan");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [uncertainty, setUncertainty] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [focusPlace, setFocusPlace] = useState(!!selectedPlace);
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      if (step >= battle.phases.length - 1) setPlaying(false);
      else setStep(step + 1);
    }, 5000);
    return () => clearTimeout(timer);
  }, [playing, step, battle]);
  useEffect(() => {
    const selected = battle.phases[step];
    if (selected) onPhaseChange?.(selected.id);
  }, [step, battle, onPhaseChange]);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );
  const svgRef = useRef<SVGSVGElement>(null);
  const id = useId().replace(/:/g, "");
  const phase = battle.phases[step];
  if (!phase) return <p>这场战役尚未登记可查看的地图阶段。</p>;
  const geographyOnly =
    focusPlace && selectedPlace && !battle.placeIds.includes(selectedPlace.id);
  const PHASE_NAMES = battle.phases.map((p) =>
    p.title
      .split("：")
      .at(-1)!
      .replace(/（示意）/g, ""),
  );
  const coordinates = battle.phases.flatMap((p) =>
    SIDES.map((team) => p.positions[team].coordinates),
  );
  const lngs = coordinates.map((p) => longitude(p.lng));
  const lats = coordinates.map((p) => p.lat);
  const local = {
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    span: Math.max(
      0.16,
      (Math.max(...lngs) - Math.min(...lngs)) * 1.65,
      ((Math.max(...lats) - Math.min(...lats)) * W * 1.65) / H,
    ),
  };
  const overview = { lng: 155, lat: 15, span: 135 };
  const base =
    focusPlace && selectedPlace
      ? {
          lng: longitude(selectedPlace.coordinates.lng),
          lat: selectedPlace.coordinates.lat,
          span: 6,
        }
      : mode === "pacific"
        ? overview
        : local;
  const span = base.span / zoom;
  const scale = W / span;
  const scaleTargetKm = (span * 111.32) / 5;
  const scaleMagnitude = 10 ** Math.floor(Math.log10(scaleTargetKm));
  const scaleKm =
    ([5, 2, 1].find((n) => n * scaleMagnitude <= scaleTargetKm) ?? 1) *
    scaleMagnitude;
  const center = { lng: base.lng + offset.x, lat: base.lat + offset.y };
  const project = (point: Coordinates) => ({
    x: W / 2 + (longitude(point.lng) - center.lng) * scale,
    y: H / 2 - (point.lat - center.lat) * scale,
  });
  const path = (points: number[][]) =>
    points
      .map(([lng = 0, lat = 0], i) => {
        const p = project({ lat, lng });
        return `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(" ");
  const selectMode = (next: typeof mode) => {
    setFocusPlace(false);
    setMode(next);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };
  const selectStep = (next: number) => {
    setPlaying(false);
    setStep(Math.max(0, Math.min(battle.phases.length - 1, next)));
    selectMode(
      battle.id === "battle-midway" && next === battle.phases.length - 1
        ? "pacific"
        : "battle",
    );
  };
  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };
  const changeZoom = (delta: number) =>
    setZoom((value) => Math.max(1, Math.min(3, value + delta)));
  const ids =
    focusPlace && selectedPlace
      ? [selectedPlace.id]
      : mode === "pacific"
        ? [...new Set(["place-japan-home-islands", ...battle.placeIds])]
        : battle.placeIds.filter((placeId) => {
            const place = places.get(placeId);
            if (!place) return false;
            const p = project(place.coordinates);
            return p.x > 25 && p.x < W - 25 && p.y > 25 && p.y < H - 45;
          });
  const mapPoints = ids
    .filter((placeId) => places.has(placeId))
    .map((placeId, i) => ({
      id: placeId,
      label: places
        .get(placeId)!
        .historicalName.replace(/（.*?）/g, "")
        .replace("硫磺岛东南登陆海岸", "东南登陆海岸")
        .replace("硫磺岛北部阵地地区", "北部阵地"),
      dx: 0,
      dy: i % 2 === 0 ? -18 : 32,
    }));
  const coastRings =
    mode === "battle" || focusPlace
      ? ((localLand as Record<string, number[][][]>)[battle.id] ?? land)
      : land;

  return (
    <div
      className="mw-map-module"
      data-battle-map={battle.id}
      data-phase={phase.id}
    >
      <div className="mw-map-top">
        <div>
          <span className="mw-map-status">交互战役地图</span>
          <p>
            {focusPlace && selectedPlace
              ? `地点：${selectedPlace.historicalName}`
              : mode === "pacific"
                ? `${battle.title} · 太平洋全局`
                : `${battle.title} · 战区放大`}
          </p>
        </div>
        <div className="mw-map-modes" role="group" aria-label="地图观察范围">
          <button
            type="button"
            aria-pressed={mode === "pacific"}
            onClick={() => selectMode("pacific")}
          >
            太平洋全局
          </button>
          <button
            type="button"
            aria-pressed={mode === "battle"}
            onClick={() => selectMode("battle")}
          >
            战区放大
          </button>
        </div>
      </div>
      <div className="mw-map-canvas">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          role="group"
          tabIndex={0}
          aria-label={`${battle.title}，${mode === "pacific" ? "太平洋全局" : "战区"}地图，阶段${step + 1}：${PHASE_NAMES[step]}。方向键平移，加减号缩放，0复位。部队位置与行动方向为示意。`}
          onKeyDown={(event) => {
            const shifts: Record<string, [number, number]> = {
              ArrowLeft: [-1, 0],
              ArrowRight: [1, 0],
              ArrowUp: [0, 1],
              ArrowDown: [0, -1],
            };
            const shift = shifts[event.key];
            if (shift) {
              event.preventDefault();
              setOffset((value) => ({
                x: Math.max(
                  -span,
                  Math.min(span, value.x + shift[0] * span * 0.05),
                ),
                y: Math.max(
                  -span / 2,
                  Math.min(span / 2, value.y + shift[1] * span * 0.05),
                ),
              }));
            } else if (event.key === "+" || event.key === "=") {
              event.preventDefault();
              changeZoom(0.5);
            } else if (event.key === "-") {
              event.preventDefault();
              changeZoom(-0.5);
            } else if (event.key === "0") {
              event.preventDefault();
              reset();
            }
          }}
          onPointerDown={(event) => {
            if (event.pointerType !== "mouse" || event.button !== 0) return;
            drag.current = {
              x: event.clientX,
              y: event.clientY,
              ox: offset.x,
              oy: offset.y,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const start = drag.current;
            if (!start) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const unit = span / rect.width;
            setOffset({
              x: Math.max(
                -span,
                Math.min(span, start.ox - (event.clientX - start.x) * unit),
              ),
              y: Math.max(
                -span / 2,
                Math.min(span / 2, start.oy + (event.clientY - start.y) * unit),
              ),
            });
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          <defs>
            <pattern
              id={`${id}-grid`}
              width="80"
              height="75"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M80 0H0V75"
                fill="none"
                stroke="#bfd1cf"
                strokeWidth=".6"
              />
            </pattern>
            <marker
              id={`${id}-japan`}
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
            >
              <path
                d="M0 0L6 3L0 6"
                fill="none"
                stroke="#85603b"
                strokeWidth="1.5"
              />
            </marker>
            <marker
              id={`${id}-allies`}
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
            >
              <path
                d="M0 0L6 3L0 6"
                fill="none"
                stroke="#216a70"
                strokeWidth="1.5"
              />
            </marker>
            <clipPath id={`${id}-clip`}>
              <rect width={W} height={H} />
            </clipPath>
          </defs>
          <rect width={W} height={H} fill="#e5efed" />
          <rect width={W} height={H} fill={`url(#${id}-grid)`} />
          <g clipPath={`url(#${id}-clip)`}>
            {coastRings.map((ring, i) => (
              <path
                d={`${path(ring)}Z`}
                fill="#cbd6ba"
                stroke="#a2b39c"
                strokeWidth=".8"
                key={i}
              />
            ))}
            {mode === "pacific" ? (
              <>
                <text x="95" y="310" className="mw-ocean-label">
                  太 平 洋
                </text>
                <text x="95" y="333" className="mw-ocean-en">
                  PACIFIC OCEAN
                </text>
              </>
            ) : (
              <>
                <text x="515" y="375" className="mw-ocean-label">
                  {battle.title.replace("海战", "").replace("袭击", "")}战区
                </text>
                <text x="515" y="398" className="mw-ocean-en">
                  BATTLE AREA / SCHEMATIC
                </text>
              </>
            )}
            {uncertainty
              ? SIDES.map((team) => {
                  const position = phase.positions[team];
                  const p = project(position.coordinates);
                  return (
                    <circle
                      key={team}
                      cx={p.x}
                      cy={p.y}
                      r={(position.uncertaintyRadiusKm / 111.32) * scale}
                      fill={team === "japan" ? "#85603b" : "#216a70"}
                      fillOpacity=".09"
                      stroke={team === "japan" ? "#85603b" : "#216a70"}
                      strokeDasharray="4 5"
                    >
                      <title>{`${position.uncertaintyNote}，约 ±${position.uncertaintyRadiusKm} 公里`}</title>
                    </circle>
                  );
                })
              : null}
            {phase.routes.map((route) => (
              <path
                key={route.id}
                d={path(route.path.map((p) => [p.lng, p.lat]))}
                fill="none"
                stroke={route.side === "japan" ? "#85603b" : "#216a70"}
                strokeWidth="2.4"
                strokeDasharray={route.side === "allies" ? "7 6" : undefined}
                markerEnd={`url(#${id}-${route.side})`}
              >
                <title>{`${route.label}。${route.note}`}</title>
              </path>
            ))}
            {mapPoints.map((point) => {
              const place = places.get(point.id);
              if (!place) return null;
              const p = project(place.coordinates);
              return (
                <g
                  key={point.id}
                  transform={`translate(${p.x} ${p.y})`}
                  role={onSelectPlace ? "button" : undefined}
                  tabIndex={onSelectPlace ? 0 : undefined}
                  aria-label={`查看地点 ${point.label}`}
                  onClick={() => onSelectPlace?.(point.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectPlace?.(point.id);
                    }
                  }}
                >
                  <circle
                    r={point.id === "place-midway" ? 7 : 5}
                    fill="#1d3940"
                    stroke="#fffdf7"
                    strokeWidth="2"
                  />
                  <text
                    x={point.dx}
                    y={point.dy}
                    textAnchor="middle"
                    className="mw-map-label"
                  >
                    {point.label}
                  </text>
                </g>
              );
            })}
            {mode === "battle" && !focusPlace
              ? SIDES.map((team) => {
                  const p = project(phase.positions[team].coordinates);
                  return (
                    <g key={team} transform={`translate(${p.x} ${p.y})`}>
                      <circle r="16" fill="#fffdf7" fillOpacity=".9" />
                      {team === "japan" ? (
                        <rect
                          x="-6"
                          y="-6"
                          width="12"
                          height="12"
                          fill="#85603b"
                        />
                      ) : (
                        <path d="M0 -8L8 6H-8Z" fill="#216a70" />
                      )}
                      <text
                        x={team === "japan" || p.x > W * 0.7 ? -22 : 22}
                        y="-12"
                        textAnchor={
                          team === "japan" || p.x > W * 0.7 ? "end" : "start"
                        }
                        className="mw-map-label"
                      >
                        {phase.positions[team].label
                          .replace("（示意位置）", "")
                          .replace("日军航母机动部队", "日军航母编队")
                          .replace("中途岛守备与巡逻", "中途岛守备")
                          .replace("美军航母攻击群", "美军攻击群")}
                      </text>
                      <title>{`${phase.positions[team].label}：${phase.positions[team].description}`}</title>
                    </g>
                  );
                })
              : null}
          </g>
          <g transform="translate(35 38)" aria-hidden="true">
            <path d="M0 22V-6M-5 0L0 -7L5 0" fill="none" stroke="#2c5359" />
            <text x="-5" y="-15" fontSize="12" fill="#2c5359">
              N
            </text>
          </g>
          <g
            transform="translate(26 420)"
            aria-label={`纬向近似比例尺${scaleKm}公里`}
          >
            <path
              d={`M0 -5V0H${(scaleKm / 111.32) * scale}V-5`}
              fill="none"
              stroke="#2c5359"
              strokeWidth="2"
            />
            <text y="18" fontSize="12" fill="#2c5359">
              约 {scaleKm} km · 纬向
            </text>
          </g>
        </svg>
        <div className="mw-map-tools" role="group" aria-label="地图缩放">
          <button
            type="button"
            aria-label="放大地图"
            disabled={zoom >= 3}
            onClick={() => changeZoom(0.5)}
          >
            ＋
          </button>
          <button
            type="button"
            aria-label="缩小地图"
            disabled={zoom <= 1}
            onClick={() => changeZoom(-0.5)}
          >
            −
          </button>
          <button type="button" aria-label="复位地图" onClick={reset}>
            ↺
          </button>
        </div>
        <span className="mw-map-schematic">部队位置与行动方向为示意</span>
      </div>
      <div className="mw-map-caption">
        <div>
          <span className="mw-legend-japan">■ 日军 · 实线</span>
          <span className="mw-legend-allies">▲ 盟军 · 虚线</span>
        </div>
        <label>
          <input
            type="checkbox"
            checked={uncertainty}
            onChange={(event) => setUncertainty(event.target.checked)}
          />{" "}
          位置不确定范围
        </label>
      </div>
      <p className="mw-map-attribution">
        自然地理底图：
        <a
          href="https://www.naturalearthdata.com/about/terms-of-use/"
          target="_blank"
          rel="noreferrer"
        >
          Natural Earth
        </a>
        （公有领域）。小岛以定位点表示；底图不表示历史疆界。手机上可直接滑动页面。
      </p>

      {geographyOnly ? (
        <p className="rs-small">
          当前查看历史地点的位置。选择上方战役，再查看相应阶段与双方行动。
        </p>
      ) : (
        <>
          <ol
            className="mw-phase-steps"
            style={{
              gridTemplateColumns: `repeat(${battle.phases.length},1fr)`,
            }}
            aria-label="选择战役阶段"
          >
            {battle.phases.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={step === i ? "step" : undefined}
                  onClick={() => selectStep(i)}
                  aria-label={`第${i + 1}阶段：${PHASE_NAMES[i]}`}
                >
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <span>{PHASE_NAMES[i]}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="mw-phase-detail">
            <div className="mw-phase-heading">
              <div>
                <span>
                  阶段 {step + 1} / {battle.phases.length}
                </span>
                <h3 aria-live="polite" aria-atomic="true">
                  {PHASE_NAMES[step]}
                </h3>
              </div>
              <div className="mw-phase-arrows">
                <button
                  type="button"
                  className="rs-map-play"
                  aria-label={playing ? "暂停阶段" : "播放阶段"}
                  aria-pressed={playing}
                  onClick={() => {
                    setFocusPlace(false);
                    setMode("battle");
                    if (step === battle.phases.length - 1) setStep(0);
                    setPlaying(!playing);
                  }}
                >
                  {playing ? "Ⅱ" : "▶"}
                </button>
                <button
                  type="button"
                  disabled={step === 0}
                  onClick={() => selectStep(step - 1)}
                  aria-label="上一个阶段"
                >
                  ←
                </button>
                <button
                  type="button"
                  disabled={step === battle.phases.length - 1}
                  onClick={() => selectStep(step + 1)}
                  aria-label="下一个阶段"
                >
                  →
                </button>
              </div>
            </div>
            <p className="mw-phase-time">{phase.time.display}</p>
            <div
              className="mw-side-tabs"
              role="group"
              aria-label="查看一方的情报与决策"
            >
              <button
                type="button"
                aria-pressed={side === "japan"}
                onClick={() => setSide("japan")}
              >
                ■ 日方视角
              </button>
              <button
                type="button"
                aria-pressed={side === "allies"}
                onClick={() => setSide("allies")}
              >
                ▲ 盟军视角
              </button>
            </div>
            <div className="mw-phase-facts" aria-live="polite">
              <div>
                <span>当时知道什么</span>
                <p>{phase.knownEnemy[side]}</p>
              </div>
              <div>
                <span>还不知道什么</span>
                <p>{phase.unknownEnemy[side]}</p>
              </div>
              <div>
                <span>做了什么决定</span>
                <p>{phase.decision[side]}</p>
              </div>
              <div>
                <span>带来了什么后果</span>
                <p>{phase.consequence[side]}</p>
              </div>
            </div>
            <div className="mw-phase-bottom">
              <button
                type="button"
                className="mw-cite"
                onClick={() =>
                  onEvidence({
                    title: `地图阶段 ${step + 1}：${PHASE_NAMES[step]}`,
                    claimIds: phase.claimIds,
                    sourceIds: phase.sourceIds,
                  })
                }
              >
                ↗ 阶段证据与来源 <span>{phase.claimIds.length}</span>
              </button>
              <button
                type="button"
                className="mw-map-note-toggle"
                aria-expanded={expanded}
                onClick={() => setExpanded(!expanded)}
              >
                示意与不确定性说明 {expanded ? "−" : "＋"}
              </button>
            </div>
            {expanded ? (
              <div className="mw-map-notes">
                <p>{phase.uncertaintyNote}</p>
                <p>时间：{phase.time.uncertainty}</p>
                {SIDES.map((team) => (
                  <p key={team}>
                    {team === "japan" ? "日方" : "美方"}位置约 ±
                    {phase.positions[team].uncertaintyRadiusKm} 公里：
                    {phase.positions[team].uncertaintyNote}
                  </p>
                ))}
                {phase.routes.map((route) => (
                  <p key={route.id}>
                    {route.label}：{route.note}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
