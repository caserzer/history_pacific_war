import { useEffect, useRef, useState } from "react";
import { useApp } from "../features/AppContext";
import {
  buildHref,
  parseRoute,
  type Route,
  type ViewId,
} from "../router/route";
import {
  ENTRY_NAV,
  HISTORICAL_PART_META,
  SIDE_LABELS,
  SOURCE_TYPE_LABELS,
} from "../content/labels";
import {
  HISTORICAL_PART_IDS,
  BATTLE_SECTION_KEYS,
  type ArticleEntity,
  type BattleEntity,
  type EventEntity,
  type PersonEntity,
  type ConceptEntity,
  type QuestionEntity,
  type PlaceEntity,
  type Source,
} from "../data/types";
import {
  analysisProfileBlocks,
  collectEntityEvidence,
  entityTitle,
  entitySnippet,
  sortEvents,
  sortBattles,
  type ContentIndex,
} from "../data/index";
import { useReadingSize } from "../a11y/readingSize";
import { EvidenceLink, EvidenceProvider, useEvidence } from "./Evidence";
import {
  Reader,
  ReadingBlock,
  mediaFor,
  mediaUrl,
  MediaFigure,
  ReadingProse as Prose,
  type ReadingSection,
} from "./Reader";
import { BattleMap } from "./BattleMap";
import "../features/midway/midway.css";
import "./reading.css";

const NAV = [
  { view: "overview", label: "导读" },
  ...ENTRY_NAV.map((e) => ({ view: e.view, label: e.label })),
  { view: "sources", label: "来源" },
] as { view: ViewId; label: string }[];
export function entityHref(id: string): string {
  const kind = id.split("-")[0];
  return buildHref(
    kind === "event"
      ? "timeline"
      : kind === "battle"
        ? "battles"
        : kind === "person"
          ? "people"
          : kind === "place"
            ? "atlas"
            : "concepts",
    { id },
  );
}
const PART = (id: string) =>
  HISTORICAL_PART_META[id as keyof typeof HISTORICAL_PART_META]?.short ?? "";
const bodySection = (
  id: string,
  title: string,
  body: string,
  sourceIds: string[],
  claimIds: string[],
): ReadingSection => ({ id, title, body, sourceIds, claimIds });

export function ReadingSite({ route }: { route: Route }) {
  const { content, index, isFixture } = useApp();
  const { size, setSize } = useReadingSize();
  const [menu, setMenu] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menu) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.getElementById("rs-menu-search")?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menu]);
  useEffect(() => {
    setMenu(false);
    scrollTo({ top: 0 });
    const frame = requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>("[data-route-heading]")
        ?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [route.view, route.id, route.query, content.status]);
  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = String(
      new FormData(event.currentTarget).get("q") ?? "",
    ).trim();
    window.location.hash = buildHref("search", { query: value });
    setMenu(false);
  };
  const navigation = NAV.map((item) => (
    <a
      key={item.view}
      href={buildHref(item.view)}
      aria-current={
        route.view === item.view ||
        (route.view === "midway" && item.view === "battles")
          ? "page"
          : undefined
      }
      onClick={() => setMenu(false)}
    >
      {item.label}
    </a>
  ));
  return (
    <EvidenceProvider>
      <div className="mw-page rs-site">
        <a
          className="mw-skip"
          href="#rs-main"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("rs-main")?.focus();
          }}
        >
          跳到主要内容
        </a>
        <header className="mw-header rs-header">
          <a
            className="mw-wordmark"
            href={buildHref("overview")}
            aria-label="返回教材导读"
          >
            <span className="mw-emblem" aria-hidden="true">
              ✳
            </span>
            <span>
              太平洋战争<small>THE PACIFIC WAR</small>
            </span>
          </a>
          <nav className="rs-desktop-nav" aria-label="主要阅读入口">
            {navigation}
          </nav>
          <div className="rs-header-tools">
            <a
              className="rs-search-link"
              href={buildHref("search")}
              aria-label="搜索全站"
            >
              ⌕
            </a>
            <button
              type="button"
              className="mw-size"
              aria-label={size === "large" ? "恢复标准字号" : "放大正文字号"}
              aria-pressed={size === "large"}
              onClick={() => setSize(size === "large" ? "standard" : "large")}
            >
              Aa
            </button>
            <button
              type="button"
              ref={menuButton}
              className="rs-menu-button"
              aria-label={menu ? "关闭导航菜单" : "打开导航菜单"}
              aria-expanded={menu}
              aria-controls="rs-mobile-menu"
              onClick={() => setMenu(!menu)}
            >
              {menu ? "×" : "☰"}
            </button>
          </div>
        </header>
        {menu ? (
          <div
            id="rs-mobile-menu"
            className="rs-menu"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setMenu(false);
                menuButton.current?.focus();
              }
            }}
          >
            <form role="search" onSubmit={submitSearch}>
              <label htmlFor="rs-menu-search">搜索教材</label>
              <div>
                <input
                  id="rs-menu-search"
                  name="q"
                  placeholder="事件、人物、地点或概念"
                />
                <button type="submit">搜索 ↗</button>
              </div>
            </form>
            <nav aria-label="手机阅读入口">{navigation}</nav>
          </div>
        ) : null}
        {isFixture ? (
          <p className="rs-status" role="status">
            当前为测试样本，非正式历史内容。
          </p>
        ) : null}
        <main id="rs-main" tabIndex={-1} inert={menu}>
          {content.status === "loading" ? (
            <div className="rs-page">
              <PageIntro
                eyebrow="正在准备阅读"
                title="正在加载教材…"
                description="请稍候，历史正文与地图即将就绪。"
              />
            </div>
          ) : !content.doc ? (
            <div className="rs-page">
              <PageIntro
                eyebrow="暂时无法读取"
                title="教材暂时未能加载"
                description="请刷新页面后重试。"
              />
              <a href={buildHref("overview")}>返回导读</a>
            </div>
          ) : (
            <RouteContent
              key={`${route.view}:${route.id ?? ""}:${route.query}`}
              route={route}
            />
          )}
        </main>
        <footer className="mw-footer rs-footer" inert={menu}>
          <a className="rs-footer-brand" href={buildHref("overview")}>
            太平洋战争 · 从珍珠港到中途岛
          </a>
          <span>从事实出发，理解当时的选择。</span>
          <a href={buildHref("sources")}>来源与素材许可 ↗</a>
          <span>
            {index.events.size} 篇事件 · {index.battles.size} 场战役
          </span>
        </footer>
      </div>
    </EvidenceProvider>
  );
}

function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  useEffect(() => {
    document.title = `${title} · 太平洋战争`;
  }, [title]);
  return (
    <header className="rs-page-intro">
      <p className="rs-eyebrow">{eyebrow}</p>
      <h1 tabIndex={-1} data-route-heading="">
        {title}
      </h1>
      {description ? <p>{description}</p> : null}
    </header>
  );
}
function NotFound() {
  return (
    <div className="rs-page">
      <PageIntro
        eyebrow="未找到内容"
        title="这条阅读线索暂时没有对应内容"
        description="请检查链接，或从导读重新选择章节。"
      />
      <a className="mw-secondary" href={buildHref("overview")}>
        返回导读 ↗
      </a>
    </div>
  );
}
function RouteContent({ route }: { route: Route }) {
  const { index } = useApp();
  if (route.view === "overview") return <Home />;
  if (route.view === "midway")
    return index.battles.has("battle-midway") ? (
      <BattleArticle battle={index.battles.get("battle-midway")!} />
    ) : (
      <NotFound />
    );
  if (route.view === "search") return <SearchPage query={route.query} />;
  if (route.view === "atlas") return <MapPage route={route} />;
  if (route.view === "timeline")
    return route.id ? (
      index.events.has(route.id) ? (
        <EventArticle event={index.events.get(route.id)!} />
      ) : (
        <NotFound />
      )
    ) : (
      <TimelinePage initialDate={route.date} />
    );
  if (route.view === "battles")
    return route.id ? (
      index.battles.has(route.id) ? (
        <BattleArticle battle={index.battles.get(route.id)!} />
      ) : (
        <NotFound />
      )
    ) : (
      <Collection kind="battles" />
    );
  if (route.view === "people")
    return route.id ? (
      index.people.has(route.id) ? (
        <PersonArticle person={index.people.get(route.id)!} />
      ) : (
        <NotFound />
      )
    ) : (
      <Collection kind="people" />
    );
  if (route.view === "questions")
    return route.id ? (
      index.questions.has(route.id) ? (
        <QuestionArticle question={index.questions.get(route.id)!} />
      ) : (
        <NotFound />
      )
    ) : (
      <Collection kind="questions" />
    );
  if (route.view === "sources")
    return route.id ? (
      index.sources.has(route.id) ? (
        <SourceArticle source={index.sources.get(route.id)!} />
      ) : (
        <NotFound />
      )
    ) : (
      <SourceLibrary />
    );
  if (route.view === "concepts") {
    if (!route.id) return <Collection kind="concepts" />;
    const concept = index.concepts.get(route.id);
    if (concept) return <ConceptArticle concept={concept} />;
    return index.entities.has(route.id) ? (
      <SmallEntityArticle entity={index.entities.get(route.id)!} />
    ) : (
      <NotFound />
    );
  }
  return <NotFound />;
}

function Home() {
  useEffect(() => {
    document.title = "太平洋战争：从珍珠港到中途岛";
  }, []);
  const { index } = useApp();
  const photograph = mediaFor("battle-pearl-harbor").find(
    (m) => m.mediaType === "photograph",
  );
  const first = index.events.get("event-overview-part-1-why-war");
  return (
    <>
      <section className="mw-hero rs-home-hero">
        <div className="mw-hero-copy">
          <p className="mw-kicker">一部可以探索的历史教材</p>
          <p className="mw-hero-date">1941.12 — 1942.06 / THE PACIFIC WAR</p>
          <h1 tabIndex={-1} data-route-heading="">
            从珍珠港
            <br />
            到中途岛<span>THE PACIFIC WAR</span>
          </h1>
          <p className="mw-hero-question">看见战场，也理解选择。</p>
          <p className="mw-hero-description">
            从战争为什么爆发开始，沿着地图、人物与关键决策，读懂太平洋战争初期的局势变化。
          </p>
          <div className="mw-hero-bottom">
            <a
              className="mw-primary"
              href={first ? entityHref(first.id) : buildHref("timeline")}
            >
              从第一章开始 <span>↗</span>
            </a>
            <a className="rs-hero-link" href={buildHref("atlas")}>
              在地图上探索 ↗
            </a>
          </div>
        </div>
        {photograph ? (
          <figure className="mw-hero-photo">
            <img
              src={mediaUrl(photograph)}
              alt={photograph.alt}
              width={photograph.width}
              height={photograph.height}
              fetchPriority="high"
            />
            <figcaption>历史影像 · 珍珠港 / 美国海军摄影 · 公有领域</figcaption>
          </figure>
        ) : null}
      </section>
      <div className="rs-page">
        <section className="rs-home-chapters">
          <div className="rs-section-head">
            <div>
              <p className="rs-eyebrow">按章节阅读 / START HERE</p>
              <h2>五个部分，一条理解历史的线索</h2>
            </div>
            <p>
              初次阅读，可以依次开始。
              <br />
              也可以选择你最关心的问题。
            </p>
          </div>
          {HISTORICAL_PART_IDS.map((part, i) => {
            const overview = index.events.get(`event-overview-${part}`);
            const battle = [...index.battles.values()].find(
              (b) => b.historicalPart === part,
            );
            return (
              <a
                className="rs-chapter-row"
                key={part}
                href={
                  overview
                    ? entityHref(overview.id)
                    : battle
                      ? entityHref(battle.id)
                      : buildHref("timeline")
                }
              >
                <span className="rs-large-number">0{i + 1}</span>
                <div>
                  <span className="rs-eyebrow">CHAPTER 0{i + 1}</span>
                  <h3>{PART(part)}</h3>
                  <p>{overview?.summary ?? battle?.summary}</p>
                </div>
                <span className="rs-row-arrow">↗</span>
              </a>
            );
          })}
        </section>
        <section className="rs-home-battles">
          <div className="rs-section-head">
            <div>
              <p className="rs-eyebrow">关键战役 / BATTLES</p>
              <h2>走进三场海战的现场</h2>
            </div>
            <a href={buildHref("battles")}>查看全部 ↗</a>
          </div>
          <div className="rs-card-grid">
            {sortBattles([...index.battles.values()]).map((b) => (
              <EntityCard
                key={b.id}
                entity={b}
                label={`${b.startDate} · ${b.phases.length} 个阶段`}
                showImage
              />
            ))}
          </div>
        </section>
        <section className="rs-home-paths">
          <div className="rs-section-head">
            <div>
              <p className="rs-eyebrow">自由探索 / EXPLORE</p>
              <h2>换一种角度，发现新的联系</h2>
            </div>
          </div>
          <div className="rs-path-grid">
            {ENTRY_NAV.map((entry, i) => (
              <a href={buildHref(entry.view)} key={entry.view}>
                <span>
                  0{i + 1} / {entry.labelEn}
                </span>
                <h3>
                  {entry.label} <span>↗</span>
                </h3>
                <p>{entry.blurb}</p>
              </a>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function EntityCard({
  entity,
  label,
  showImage = false,
}: {
  entity: ArticleEntity;
  label?: string;
  showImage?: boolean;
}) {
  const assets = mediaFor(entity.id);
  const image =
    assets.find((m) => m.mediaType === "photograph") ??
    assets.find((m) => m.mediaType === "portrait");
  return (
    <a className="rs-entity-card" href={entityHref(entity.id)}>
      {showImage && image ? (
        <img
          src={mediaUrl(image)}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading="lazy"
        />
      ) : null}
      <div>
        <p className="rs-card-kicker">
          {label ??
            ("historicalPart" in entity
              ? PART(entity.historicalPart)
              : "历史档案")}
        </p>
        <h2>
          {entityTitle(entity)}
          <span aria-hidden="true">↗</span>
        </h2>
        <p>{entitySnippet(entity)}</p>
      </div>
    </a>
  );
}

function Collection({
  kind,
}: {
  kind: "battles" | "people" | "concepts" | "questions";
}) {
  const { index } = useApp();
  const [filter, setFilter] = useState("all");
  const copy = {
    battles: [
      "BATTLES / 战役",
      "战役",
      "从局势到决策，再到战役的长期影响。跟随阶段地图，理解变化如何发生。",
    ],
    people: [
      "PEOPLE / 人物",
      "人物",
      "回到决策者当时掌握的信息，理解他们面对的选项与约束。",
    ],
    concepts: [
      "CONCEPTS / 知识专题",
      "知识专题",
      "从“是什么”到“如何运作”，再回到它怎样影响历史。",
    ],
    questions: [
      "QUESTIONS / 探究",
      "历史问题",
      "带着“为什么”阅读，用事实、解释与不同观点组织自己的答案。",
    ],
  }[kind]!;
  return (
    <div className="rs-page">
      <PageIntro eyebrow={copy[0]!} title={copy[1]!} description={copy[2]!} />
      {kind === "people" ? (
        <div className="rs-toolbar">
          <label>
            按阵营查看
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">全部人物</option>
              <option value="japan">日本方面</option>
              <option value="allies">盟军方面</option>
            </select>
          </label>
          <span>
            {
              [...index.people.values()].filter(
                (p) => filter === "all" || p.side === filter,
              ).length
            }{" "}
            位人物
          </span>
        </div>
      ) : null}
      {kind === "questions" ? (
        HISTORICAL_PART_IDS.map((part) => {
          const questions = [...index.questions.values()].filter(
            (q) => q.historicalPart === part,
          );
          return questions.length ? (
            <section className="rs-question-group" key={part}>
              <p className="rs-eyebrow">
                0{HISTORICAL_PART_META[part].ordinal} / {PART(part)}
              </p>
              {questions.map((q) => (
                <a
                  className="rs-question-card"
                  href={buildHref("questions", { id: q.id })}
                  key={q.id}
                >
                  <h2>
                    {q.prompt}
                    <span>↗</span>
                  </h2>
                  <p>{q.answer.slice(0, 110)}…</p>
                  <span>阅读答案与证据 ↗</span>
                </a>
              ))}
            </section>
          ) : null;
        })
      ) : (
        <div
          className={`rs-card-grid ${kind === "people" ? "rs-people-grid" : ""}`}
        >
          {kind === "battles"
            ? sortBattles([...index.battles.values()]).map((b) => (
                <EntityCard
                  entity={b}
                  key={b.id}
                  label={`${b.startDate} — ${b.endDate}`}
                  showImage
                />
              ))
            : kind === "people"
              ? [...index.people.values()]
                  .filter((p) => filter === "all" || p.side === filter)
                  .map((p) => (
                    <EntityCard
                      entity={p}
                      key={p.id}
                      label={`${SIDE_LABELS[p.side]} · ${p.role}`}
                      showImage
                    />
                  ))
              : [...index.concepts.values()].map((c, i) => (
                  <EntityCard
                    entity={c}
                    key={c.id}
                    label={`0${i + 1} / 三层解释`}
                  />
                ))}
        </div>
      )}
      {kind === "concepts" ? (
        <details className="mw-deeper">
          <summary>
            装备与部队档案 <span>＋</span>
          </summary>
          <div className="rs-inline-links">
            {[...index.equipment.values(), ...index.units.values()].map((e) => (
              <a href={entityHref(e.id)} key={e.id}>
                {e.name} ↗
              </a>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function TimelinePage({ initialDate }: { initialDate?: string }) {
  const { index } = useApp();
  const [part, setPart] = useState("all");
  const [date, setDate] = useState(initialDate ?? "");
  const all = [
    ...sortEvents([...index.events.values()]),
    ...index.battles.values(),
  ].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const filtered = all.filter(
    (e) =>
      (part === "all" || e.historicalPart === part) &&
      (!date || e.startDate <= date),
  );
  return (
    <div className="rs-page">
      <PageIntro
        eyebrow="TIMELINE / 时间线"
        title="沿着时间，理解局势如何变化"
        description="从战争背景到中途岛，把事件与战役放回彼此相连的时间里。"
      />
      <div className="rs-toolbar">
        <label>
          历史部分
          <select value={part} onChange={(e) => setPart(e.target.value)}>
            <option value="all">全部部分</option>
            {HISTORICAL_PART_IDS.map((p) => (
              <option key={p} value={p}>
                {PART(p)}
              </option>
            ))}
          </select>
        </label>
        <label>
          截至日期
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              history.replaceState(
                null,
                "",
                buildHref("timeline", { date: e.target.value }),
              );
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setPart("all");
            setDate("");
            history.replaceState(null, "", buildHref("timeline"));
          }}
        >
          重置
        </button>
        <span>{filtered.length} 条线索</span>
      </div>
      {HISTORICAL_PART_IDS.map((p) => {
        const items = filtered.filter((e) => e.historicalPart === p);
        return items.length ? (
          <section className="rs-timeline-group" key={p}>
            <h2>
              <span>0{HISTORICAL_PART_META[p].ordinal}</span>
              {PART(p)}
            </h2>
            <ol>
              {items.map((e) => (
                <li key={e.id}>
                  <time>{e.startDate}</time>
                  <a href={entityHref(e.id)}>
                    <span className="rs-card-kicker">
                      {"phases" in e ? "重点战役" : "事件与导读"}
                    </span>
                    <h3>{e.title} ↗</h3>
                    <p>{e.summary}</p>
                  </a>
                </li>
              ))}
            </ol>
          </section>
        ) : null;
      })}
      {!filtered.length ? (
        <p className="rs-empty">
          这个筛选范围内没有内容，请调整日期或历史部分。
        </p>
      ) : null}
    </div>
  );
}

function Related({
  ids,
  questionIds = [],
}: {
  ids: string[];
  questionIds?: string[];
}) {
  const { index } = useApp();
  const unique = [...new Set(ids)];
  const resolved = unique
    .map((id) => index.entities.get(id))
    .filter((e): e is ArticleEntity => !!e);
  return (
    <>
      <div className="rs-related-grid">
        {resolved.slice(0, 2).map((e) => (
          <a href={entityHref(e.id)} key={e.id}>
            <span>
              {e.id.startsWith("person-")
                ? "人物档案"
                : e.id.startsWith("concept-")
                  ? "知识专题"
                  : e.id.startsWith("battle-")
                    ? "战役"
                    : "相关内容"}
            </span>
            <strong>{entityTitle(e)}</strong>
            <span>继续阅读 ↗</span>
          </a>
        ))}
      </div>
      {resolved.length > 2 ? (
        <details className="mw-deeper">
          <summary>
            更多相关线索（{resolved.length - 2}）<span>＋</span>
          </summary>
          <div className="rs-inline-links">
            {resolved.slice(2).map((e) => (
              <a href={entityHref(e.id)} key={e.id}>
                {entityTitle(e)} ↗
              </a>
            ))}
          </div>
        </details>
      ) : null}
      {questionIds.map((id) => {
        const q = index.questions.get(id);
        return q ? (
          <a
            className="rs-question-card"
            href={buildHref("questions", { id })}
            key={id}
          >
            <span className="rs-eyebrow">带着问题继续读</span>
            <h3>{q.prompt}</h3>
            <span>阅读答案与证据 ↗</span>
          </a>
        ) : null;
      })}
    </>
  );
}

function nextReading(index: ContentIndex, id: string) {
  const ordered = HISTORICAL_PART_IDS.flatMap((part) => {
    const events = sortEvents(
      [...index.events.values()].filter((e) => e.historicalPart === part),
    );
    return [
      ...events.filter((e) => e.id.startsWith("event-overview-")),
      ...events.filter((e) => !e.id.startsWith("event-overview-")),
      ...sortBattles(
        [...index.battles.values()].filter((b) => b.historicalPart === part),
      ),
    ];
  });
  const position = ordered.findIndex((e) => e.id === id),
    next = position >= 0 ? ordered[position + 1] : undefined;
  return next ? { href: entityHref(next.id), title: next.title } : undefined;
}
function EventArticle({ event }: { event: EventEntity }) {
  const { index } = useApp();
  const profiles = analysisProfileBlocks(event);
  const sections: ReadingSection[] = event.article.map((s, i) =>
    bodySection(`article-${i}`, s.heading, s.body, s.sourceIds, s.claimIds),
  );
  if (profiles)
    sections.push({
      id: "analysis",
      title: "深入分析：从条件到后果",
      optional: true,
      claimIds: [],
      sourceIds: [],
      content: profiles.map((p) => (
        <ReadingBlock key={p.key} section={{ ...p, id: `profile-${p.key}` }} />
      )),
    });
  const evidence = collectEntityEvidence(event);
  return (
    <Reader
      id={event.id}
      title={event.title}
      kicker={`事件 / ${PART(event.historicalPart)}`}
      meta={`${event.startDate}${event.endDate && event.endDate !== event.startDate ? ` — ${event.endDate}` : ""}`}
      summary={event.summary}
      sections={sections}
      media={mediaFor(event.id)}
      evidence={{ title: event.title, ...evidence }}
      next={nextReading(index, event.id)}
      related={
        <Related
          ids={[
            ...(event.battleId ? [event.battleId] : []),
            ...event.conceptIds,
            ...event.personIds,
            ...event.relatedEventIds,
            ...event.placeIds,
          ]}
          questionIds={(index.questionsByEntity.get(event.id) ?? []).map(
            (q) => q.id,
          )}
        />
      }
    />
  );
}

function BattleArticle({ battle }: { battle: BattleEntity }) {
  const { index } = useApp();
  const open = useEvidence();
  const group = (keys: (typeof BATTLE_SECTION_KEYS)[number][]) =>
    keys.map((key) => (
      <ReadingBlock key={key} section={{ id: key, ...battle.sections[key] }} />
    ));
  const sections: ReadingSection[] = [
    {
      id: "opening",
      title: "战役前的局势与目标",
      sourceIds: [],
      claimIds: [],
      content: (
        <>
          {group(["background", "objectives"])}
          <details className="mw-deeper">
            <summary>
              补充背景：参战者、指挥官、军力与计划<span>＋</span>
            </summary>
            <div>{group(["participants", "commanders", "forces", "plan"])}</div>
          </details>
        </>
      ),
    },
    {
      id: "map",
      title: "在地图上，跟随战役的阶段",
      sourceIds: [],
      claimIds: [],
      content: (
        <>
          <p className="rs-section-lead">
            先观察地理位置，再逐步切换阶段。比较双方当时知道什么、做了什么选择。
          </p>
          <BattleMap battle={battle} places={index.places} onEvidence={open} />
          <details className="mw-deeper">
            <summary>
              文字补充：地理与完整战斗经过<span>＋</span>
            </summary>
            <div>{group(["geography", "course"])}</div>
          </details>
        </>
      ),
    },
    {
      id: "choices",
      title: "信息、约束与关键决策",
      sourceIds: [],
      claimIds: [],
      content: group(["constraints", "decisions"]),
    },
    {
      id: "impact",
      title: "结果、后续影响与争议",
      sourceIds: [],
      claimIds: [],
      content: (
        <>
          {group(["results", "aftermath"])}
          <div className="mw-disputed">
            <span>历史解释 · 留意分歧</span>
            {group(["controversies"])}
          </div>
        </>
      ),
    },
    {
      id: "further",
      title: "延伸阅读与完整来源",
      optional: true,
      sourceIds: [],
      claimIds: [],
      content: (
        <>
          {group(["furtherReading"])}
          {mediaFor(battle.id)
            .filter((m) => m.mediaType === "battle-map")
            .map((asset) => (
              <MediaFigure key={asset.id} asset={asset} />
            ))}
        </>
      ),
    },
  ];
  return (
    <Reader
      id={battle.id}
      title={battle.title}
      kicker={`战役 / ${PART(battle.historicalPart)}`}
      meta={`${battle.startDate} — ${battle.endDate} · ${battle.phases.length} 个地图阶段`}
      summary={battle.summary}
      media={mediaFor(battle.id).filter((m) => m.mediaType === "photograph")}
      sections={sections}
      evidence={{ title: battle.title, ...collectEntityEvidence(battle) }}
      next={nextReading(index, battle.id)}
      related={
        <Related
          ids={[
            ...battle.conceptIds,
            ...battle.commanderIds.allies,
            ...battle.commanderIds.japan,
            ...battle.equipmentIds,
            ...battle.unitIds,
            ...battle.placeIds,
          ]}
          questionIds={(index.questionsByEntity.get(battle.id) ?? []).map(
            (q) => q.id,
          )}
        />
      }
    />
  );
}

function PersonArticle({ person }: { person: PersonEntity }) {
  const { index } = useApp();
  const sections: ReadingSection[] = [
    bodySection(
      "profile",
      "人物与时代",
      person.profile,
      person.sourceIds,
      person.claimIds,
    ),
    ...person.decisions.map((d, i) => ({
      id: d.id,
      title: `决策 ${i + 1}：${d.title}`,
      claimIds: d.claimIds,
      sourceIds: d.sourceIds,
      content: (
        <div className="rs-decision">
          <div>
            <span>当时知道什么</span>
            <Prose body={d.context} />
          </div>
          <div>
            <span>实际选择</span>
            <Prose body={d.choice} />
          </div>
          <div>
            <span>选择的后果</span>
            <Prose body={d.consequence} />
          </div>
          <details className="mw-deeper">
            <summary>
              展开备选方案与约束条件<span>＋</span>
            </summary>
            <div>
              <h3>可选方案</h3>
              <ul>
                {d.options.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
              <h3>受到哪些限制</h3>
              <ul>
                {d.constraints.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </details>
        </div>
      ),
    })),
  ];
  return (
    <Reader
      id={person.id}
      title={person.name}
      kicker={`人物 / ${SIDE_LABELS[person.side]}`}
      meta={[person.originalName, person.role].filter(Boolean).join(" · ")}
      summary={person.summary}
      media={mediaFor(person.id)}
      sections={sections}
      evidence={{ title: person.name, ...collectEntityEvidence(person) }}
      related={
        <Related
          ids={[
            ...person.battleIds,
            ...person.eventIds,
            ...person.relatedPersonIds,
            ...person.placeIds,
          ]}
          questionIds={(index.questionsByEntity.get(person.id) ?? []).map(
            (q) => q.id,
          )}
        />
      }
    />
  );
}

function ConceptArticle({ concept }: { concept: ConceptEntity }) {
  const sections = [
    bodySection(
      "why",
      "为什么值得理解",
      concept.whyItMatters,
      concept.sourceIds,
      concept.claimIds,
    ),
    ...concept.layers.map((layer) =>
      bodySection(
        `layer-${layer.level}`,
        layer.title,
        layer.body,
        layer.sourceIds,
        layer.claimIds,
      ),
    ),
  ];
  return (
    <Reader
      id={concept.id}
      title={concept.title}
      kicker="知识专题 / 从概念到历史"
      summary={concept.summary}
      media={mediaFor(concept.id)}
      sections={sections}
      evidence={{ title: concept.title, ...collectEntityEvidence(concept) }}
      related={<Related ids={concept.relatedEntityIds} />}
    />
  );
}
function QuestionArticle({ question }: { question: QuestionEntity }) {
  return (
    <Reader
      id={question.id}
      title={question.prompt}
      kicker={`探究问题 / ${PART(question.historicalPart)}`}
      summary="先尝试给出自己的解释，再阅读下面的回应与证据。"
      sections={[
        bodySection(
          "answer",
          "有证据支持的回应",
          question.answer,
          question.sourceIds,
          question.claimIds,
        ),
      ]}
      evidence={{
        title: question.prompt,
        claimIds: question.claimIds,
        sourceIds: question.sourceIds,
      }}
      related={<Related ids={question.entityIds} />}
    />
  );
}
function SmallEntityArticle({ entity }: { entity: ArticleEntity }) {
  if (!("description" in entity) && !("limitations" in entity))
    return <NotFound />;
  const sections =
    "description" in entity
      ? [
          bodySection(
            "description",
            "编制与行动",
            entity.description,
            entity.sourceIds,
            entity.claimIds,
          ),
        ]
      : [
          bodySection(
            "summary",
            "装备概况",
            entity.summary,
            entity.sourceIds,
            entity.claimIds,
          ),
          bodySection(
            "limitations",
            "能力与局限",
            entity.limitations,
            entity.sourceIds,
            entity.claimIds,
          ),
        ];
  return (
    <Reader
      id={entity.id}
      title={entity.name}
      kicker={`装备与部队 / ${SIDE_LABELS[entity.side]}`}
      sections={sections}
      evidence={{
        title: entity.name,
        sourceIds: entity.sourceIds,
        claimIds: entity.claimIds,
      }}
      related={
        <Related
          ids={
            "eventIds" in entity
              ? [
                  ...entity.eventIds,
                  ...entity.personIds,
                  ...entity.equipmentIds,
                ]
              : entity.conceptIds
          }
        />
      }
    />
  );
}

function MapPage({ route }: { route: Route }) {
  const { index } = useApp();
  const open = useEvidence();
  const [query, setQuery] = useState("");
  const [showPlaces, setShowPlaces] = useState(!!route.id);
  const battle =
    (route.battle ? index.battles.get(route.battle) : null) ??
    index.battles.values().next().value;
  const place = route.id ? index.places.get(route.id) : undefined;
  if (route.id && !place) return <NotFound />;
  const matches = [...index.places.values()].filter(
    (p) =>
      !query ||
      `${p.historicalName}${p.modernName}${p.summary}`.includes(query),
  );
  return (
    <div className="rs-page rs-atlas-page">
      <PageIntro
        eyebrow="ATLAS / 交互地图"
        title="先看清位置，再理解行动"
        description="选择一场战役，按阶段观察局势变化。地图区分真实地点与示意舰位，手机上可以直接滑动页面。"
      />
      <nav className="rs-battle-select" aria-label="选择地图战役">
        {[...index.battles.values()].map((b) => (
          <a
            key={b.id}
            href={buildHref("atlas", { battle: b.id })}
            aria-current={battle?.id === b.id ? "page" : undefined}
          >
            {b.title}
            <span>{b.phases.length} 个阶段</span>
          </a>
        ))}
      </nav>
      {place ? <PlaceDetail place={place} /> : null}
      {battle ? (
        <BattleMap
          key={`${battle.id}:${route.phase ?? ""}:${place?.id ?? ""}`}
          battle={battle}
          places={index.places}
          selectedPlace={place}
          initialPhaseId={route.phase}
          onEvidence={open}
          onSelectPlace={(id) => {
            window.location.hash = buildHref("atlas", {
              id,
              battle: battle.id,
              phase: parseRoute(window.location.hash).phase,
            });
          }}
          onPhaseChange={(phase) => {
            history.replaceState(
              null,
              "",
              buildHref("atlas", { id: place?.id, battle: battle.id, phase }),
            );
          }}
        />
      ) : (
        <p>暂无可查看的战役阶段。</p>
      )}
      {battle ? (
        <p className="rs-map-read">
          <a href={entityHref(battle.id)}>阅读{battle.title}的完整章节 ↗</a>
        </p>
      ) : null}
      <section className="rs-place-finder">
        <button
          type="button"
          className="rs-place-toggle"
          aria-expanded={showPlaces}
          onClick={() => setShowPlaces(!showPlaces)}
        >
          查找历史地点与现代地名{" "}
          <span>
            {index.places.size} 个地点 {showPlaces ? "−" : "＋"}
          </span>
        </button>
        {showPlaces ? (
          <>
            <label className="rs-search-field">
              搜索地点
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="历史地名或现代地名"
              />
            </label>
            <div className="rs-place-grid">
              {matches.map((p) => (
                <a
                  href={buildHref("atlas", { id: p.id, battle: battle?.id })}
                  key={p.id}
                >
                  <strong>{p.historicalName}</strong>
                  <span>
                    {p.modernName} · {p.modernCountry}
                  </span>
                </a>
              ))}
            </div>
            {!matches.length ? <p>没有匹配的地点，请尝试另一种地名。</p> : null}
          </>
        ) : null}
      </section>
    </div>
  );
}
function PlaceDetail({ place }: { place: PlaceEntity }) {
  const { index } = useApp();
  return (
    <section className="rs-place-detail" data-place-detail={place.id}>
      <p className="rs-eyebrow">地点档案 / 真实地理节点</p>
      <h2>{place.historicalName}</h2>
      <p>
        {place.modernName} · {place.modernCountry}
      </p>
      <Prose body={place.summary} />
      <p className="rs-small">
        坐标精度约 ±{place.coordinateAccuracyKm} km。地点坐标不代表舰队位置。
      </p>
      <EvidenceLink
        title={place.historicalName}
        claimIds={[]}
        sourceIds={place.sourceIds}
      />
      <details className="mw-deeper">
        <summary>
          与这个地点有关的内容<span>＋</span>
        </summary>
        <div className="rs-inline-links">
          {[
            ...(index.eventsByEntity.get(place.id) ?? []),
            ...(index.battlesByEntity.get(place.id) ?? []),
          ]
            .filter((v, i, a) => a.findIndex((e) => e.id === v.id) === i)
            .map((e) => (
              <a href={entityHref(e.id)} key={e.id}>
                {e.title} ↗
              </a>
            ))}
        </div>
      </details>
    </section>
  );
}

function SourceLibrary() {
  const { index } = useApp();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const sources = [...index.sources.values()].filter(
    (s) =>
      (kind === "all" || s.sourceType === kind) &&
      `${s.title}${s.publisher}${s.creator}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="rs-page">
      <PageIntro
        eyebrow="SOURCES / 来源与许可"
        title="每一个判断，都有可追溯的依据"
        description="查找原始来源、具体定位和可核查范围。正文中的证据按钮也会直接带你到对应记录。"
      />
      <div className="rs-toolbar">
        <label>
          查找来源
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="标题、作者或机构"
          />
        </label>
        <label>
          来源类型
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="all">全部类型</option>
            {Object.entries(SOURCE_TYPE_LABELS).map(([k, v]) => (
              <option value={k} key={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <span>{sources.length} 个来源</span>
      </div>
      <div className="rs-source-list">
        {sources.map((s) => (
          <a href={buildHref("sources", { id: s.id })} key={s.id}>
            <span>
              {s.year} / {SOURCE_TYPE_LABELS[s.sourceType]}
            </span>
            <h2>
              {s.title}
              <span>↗</span>
            </h2>
            <p>
              {s.creator} · {s.publisher}
            </p>
            <small>
              支撑 {(index.claimsBySource.get(s.id) ?? []).length} 条判断
            </small>
          </a>
        ))}
      </div>
      {!sources.length ? <p>没有匹配的来源，请调整搜索词或类型。</p> : null}
      <MediaLibrary />
    </div>
  );
}
function MediaLibrary() {
  const { index } = useApp();
  const all = [...index.entities.keys()].flatMap(mediaFor);
  const unique = [...new Map(all.map((m) => [m.id, m])).values()];
  const open = useEvidence();
  return (
    <details className="mw-deeper rs-license-index">
      <summary>
        素材来源与许可（{unique.length} 项）<span>＋</span>
      </summary>
      <div className="rs-media-index">
        {unique.map((m) => (
          <div key={m.id}>
            <strong>{m.title}</strong>
            <span>
              {m.author} ·{" "}
              {m.license === "public-domain" ? "公有领域" : "原创作品"}
            </span>
            <button
              type="button"
              onClick={() =>
                open({
                  title: m.title,
                  claimIds: [],
                  sourceIds: [m.sourceId],
                  media: m,
                  tab: "sources",
                })
              }
            >
              查看来源与许可 ↗
            </button>
          </div>
        ))}
      </div>
    </details>
  );
}
function SourceArticle({ source }: { source: Source }) {
  const { index } = useApp();
  const open = useEvidence();
  const claims = index.claimsBySource.get(source.id) ?? [];
  const [type, setType] = useState("all");
  const [limit, setLimit] = useState(12);
  const filtered = claims.filter((c) => type === "all" || c.claimType === type);
  const entities = [
    ...new Map(
      (index.entitiesBySource.get(source.id) ?? []).map((e) => [e.id, e]),
    ).values(),
  ];
  return (
    <div className="rs-page rs-source-detail">
      <PageIntro
        eyebrow={`${SOURCE_TYPE_LABELS[source.sourceType]} / ${source.year}`}
        title={source.title}
        description={source.citation}
      />
      <p className="rs-source-author">
        {source.creator} · {source.publisher}
      </p>
      <div className="rs-source-actions">
        <a
          className="mw-secondary"
          href={source.url}
          target="_blank"
          rel="noreferrer"
        >
          打开原始来源 ↗
        </a>
        <span>访问日期：{source.accessedDate}</span>
      </div>
      <section className="rs-source-note">
        <h2>这个来源能支持什么？</h2>
        <Prose body={source.reliabilityNote} />
        {source.archiveCollectionId ? (
          <p>馆藏编号：{source.archiveCollectionId}</p>
        ) : null}
      </section>
      <section>
        <div className="rs-section-head">
          <h2>这个来源支撑的判断</h2>
          <label>
            按类型查看
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setLimit(12);
              }}
            >
              <option value="all">全部判断（{claims.length}）</option>
              <option value="fact">事实</option>
              <option value="interpretation">解释</option>
              <option value="disputed">争议</option>
            </select>
          </label>
        </div>
        <div className="rs-claim-index">
          {filtered.slice(0, limit).map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() =>
                open({
                  title: "判断与原始定位",
                  claimIds: [c.id],
                  sourceIds: c.sourceIds,
                })
              }
            >
              <span>
                {c.claimType === "fact"
                  ? "事实"
                  : c.claimType === "disputed"
                    ? "争议"
                    : "解释"}
              </span>
              <p>{c.text}</p>
              <span>核对来源定位 ↗</span>
            </button>
          ))}
        </div>
        {filtered.length > limit ? (
          <button
            className="mw-secondary"
            type="button"
            onClick={() => setLimit(limit + 12)}
          >
            继续显示 {Math.min(12, filtered.length - limit)} 条判断
          </button>
        ) : null}
        {!filtered.length ? <p>这个类型下暂无判断。</p> : null}
      </section>
      <section className="rs-source-related">
        <h2>引用这个来源的文章</h2>
        <Related ids={entities.map((e) => e.id)} />
      </section>
    </div>
  );
}

function SearchPage({ query }: { query: string }) {
  const { index } = useApp();
  const [kind, setKind] = useState("all");
  const term = query.trim().toLowerCase();
  const flatten = (value: unknown): string =>
    typeof value === "string"
      ? value
      : Array.isArray(value)
        ? value.map(flatten).join(" ")
        : value && typeof value === "object"
          ? Object.entries(value)
              .filter(
                ([key]) =>
                  !/^(id|.*Ids|.*Id|source.*|claim.*|historicalPart|schemaVersion|fixtureOnly|researchStatus|side|eventType|theater|battleType|service|category|echelon|coordinates|coordinateAccuracyKm|uncertaintyRadiusKm|schematic|certainty|sequence|level)$/.test(
                    key,
                  ),
              )
              .map(([, child]) => flatten(child))
              .join(" ")
          : "";
  const records = [
    ...[...index.entities.values()].map((e) => ({
      id: e.id,
      title: entityTitle(e),
      body: flatten(e),
      kind: e.id.startsWith("event-")
        ? "时间线"
        : e.id.startsWith("battle-")
          ? "战役"
          : e.id.startsWith("person-")
            ? "人物"
            : e.id.startsWith("place-")
              ? "地点"
              : "知识专题",
      href: entityHref(e.id),
    })),
    ...[...index.questions.values()].map((q) => ({
      id: q.id,
      title: q.prompt,
      body: q.answer,
      kind: "历史问题",
      href: buildHref("questions", { id: q.id }),
    })),
    ...[...index.sources.values()].map((s) => ({
      id: s.id,
      title: s.title,
      body: `${s.creator} ${s.publisher} ${s.reliabilityNote}`,
      kind: "来源",
      href: buildHref("sources", { id: s.id }),
    })),
  ];
  const hits = term
    ? records
        .filter((r) => `${r.title} ${r.body}`.toLowerCase().includes(term))
        .sort(
          (a, b) =>
            Number(b.title.toLowerCase().includes(term)) -
            Number(a.title.toLowerCase().includes(term)),
        )
    : [];
  const visible = hits.filter((h) => kind === "all" || h.kind === kind);
  return (
    <div className="rs-page rs-search-page">
      <PageIntro
        eyebrow="SEARCH / 搜索"
        title="从一个名字，找到更多线索"
        description="搜索事件、人物、地点、术语与来源。"
      />
      <form
        className="rs-search-form"
        role="search"
        key={query}
        onSubmit={(e) => {
          e.preventDefault();
          const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
          location.hash = buildHref("search", { query: q });
          setKind("all");
        }}
      >
        <label className="rs-search-field" htmlFor="rs-search">
          搜索教材
          <input
            autoComplete="off"
            type="search"
            name="q"
            id="rs-search"
            defaultValue={query}
            placeholder="试试：中途岛、南云、雷达…"
          />
        </label>
        <button className="mw-primary" type="submit">
          搜索 ↗
        </button>
      </form>
      {!term ? (
        <div className="rs-search-suggestions">
          <span>可以从这些关键词开始</span>
          {["中途岛", "珍珠港", "雷达", "补给"].map((q) => (
            <a href={buildHref("search", { query: q })} key={q}>
              {q} ↗
            </a>
          ))}
        </div>
      ) : (
        <>
          <div className="rs-toolbar">
            <label>
              结果类型
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="all">全部类型</option>
                {[...new Set(hits.map((h) => h.kind))].map((k) => (
                  <option value={k} key={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <span>
              “{query}” · {visible.length} 条结果
            </span>
          </div>
          <div className="rs-search-results">
            {visible.map((hit) => {
              const pos = hit.body.toLowerCase().indexOf(term);
              const start = Math.max(0, pos - 35);
              const snippet = hit.body.slice(start, start + 140);
              return (
                <a href={hit.href} key={hit.id}>
                  <span>{hit.kind}</span>
                  <h2>{hit.title} ↗</h2>
                  <p>
                    {start ? "…" : ""}
                    {snippet}…
                  </p>
                </a>
              );
            })}
          </div>
          {!visible.length ? (
            <p className="rs-empty">
              没有匹配结果。试试人物的姓氏、另一种地名，或更短的关键词。
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
