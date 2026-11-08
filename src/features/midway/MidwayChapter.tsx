import { useEffect, useRef, useState, type ReactNode } from "react";
import { useApp } from "../AppContext";
import { buildHref } from "../../router/route";
import { Prose, EmptyState } from "../../components/primitives";
import { EvidencePanel } from "../../components/EvidencePanel";
import { CitationList } from "../../components/CitationList";
import { collectEntityEvidence } from "../../data/index";
import { useReadingSize } from "../../a11y/readingSize";
import type { BattleSectionKey } from "../../data/types";
import registry from "../../../content/media.json";
import { MidwayMap } from "./MidwayMap";
import "./midway.css";

type EvidenceSelection = {
  title: string;
  claimIds: string[];
  sourceIds: string[];
};
const CHAPTERS = [
  ["opening", "战役前的局势"],
  ["battle-map", "在地图上看经过"],
  ["choices", "信息与选择"],
  ["aftermath", "结果与争议"],
  ["explore", "继续探索"],
] as const;

function Citation({
  title,
  claimIds,
  sourceIds,
  onEvidence,
}: EvidenceSelection & { onEvidence: (value: EvidenceSelection) => void }) {
  const { index } = useApp();
  const kinds = new Set(claimIds.map((id) => index.claims.get(id)?.claimType));
  return (
    <div className="mw-cite-row">
      <button
        type="button"
        className="mw-cite"
        onClick={() => onEvidence({ title, claimIds, sourceIds })}
        aria-label={`查看${title}的${claimIds.length}条证据与来源`}
      >
        <span aria-hidden="true">↗</span> 证据与来源{" "}
        <span>{claimIds.length}</span>
      </button>
      <span className="mw-evidence-kind">
        {kinds.has("disputed")
          ? "含有争议的判断"
          : kinds.has("interpretation")
            ? "事实与历史解释"
            : "有来源记录"}
      </span>
    </div>
  );
}

function SectionText({
  sectionKey,
  onEvidence,
}: {
  sectionKey: BattleSectionKey;
  onEvidence: (value: EvidenceSelection) => void;
}) {
  const { index } = useApp();
  const section = index.battles.get("battle-midway")?.sections[sectionKey];
  if (!section) return null;
  return (
    <div className="mw-text-block" data-reading-section={sectionKey}>
      <h3>{section.title}</h3>
      <Prose body={section.body} />
      <Citation
        title={section.title}
        claimIds={section.claimIds}
        sourceIds={section.sourceIds}
        onEvidence={onEvidence}
      />
    </div>
  );
}

function Chapter({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      className="mw-chapter"
      id={`mw-${id}`}
      tabIndex={-1}
      aria-labelledby={`mw-heading-${id}`}
    >
      <div className="mw-section-kicker">
        <span>{number}</span> MIDWAY / 1942
      </div>
      <h2 id={`mw-heading-${id}`}>{title}</h2>
      {children}
    </section>
  );
}

export function MidwayChapter() {
  const { index, isFixture } = useApp();
  const battle = index.battles.get("battle-midway");
  const [active, setActive] = useState<string>("opening");
  const [selection, setSelection] = useState<EvidenceSelection | null>(null);
  const [dialogTab, setDialogTab] = useState<"claims" | "sources">("claims");
  const [claimType, setClaimType] = useState<
    "all" | "fact" | "interpretation" | "disputed" | "schematic"
  >("all");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const tocRef = useRef<HTMLDetailsElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const { size, setSize } = useReadingSize();

  useEffect(() => {
    const previous = document.title;
    document.title = "中途岛海战 · 阅读样板 · 太平洋战争";
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting)
            setActive(entry.target.id === "mw-hero" ? "opening" : entry.target.id.replace("mw-", ""));
      },
      { rootMargin: "-12% 0px -65% 0px", threshold: 0 },
    );
    for (const [id] of CHAPTERS) {
      const element = document.getElementById(`mw-${id}`);
      if (element) observer.observe(element);
    }
    const hero = document.getElementById("mw-hero");
    if (hero) observer.observe(hero);
    return () => {
      observer.disconnect();
      document.title = previous;
    };
  }, [battle]);

  useEffect(() => {
    if (!selection) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      lastTrigger.current?.focus({ preventScroll: true });
    };
  }, [selection]);

  const jump = (id: string) => {
    if (tocRef.current) tocRef.current.open = false;
    const element = document.getElementById(`mw-${id}`);
    element?.scrollIntoView({ block: "start" });
    element?.focus({ preventScroll: true });
    setActive(id);
  };
  const showEvidence = (
    value: EvidenceSelection,
    tab: "claims" | "sources" = "claims",
  ) => {
    lastTrigger.current = document.activeElement as HTMLElement;
    setDialogTab(tab);
    setClaimType("all");
    setSelection(value);
  };
  const closeEvidence = () => {
    dialogRef.current?.close();
    setSelection(null);
  };
  const photo = registry.media.find(
    (asset) =>
      asset.articleIds.includes("battle-midway") &&
      asset.mediaType === "photograph",
  );

  if (!battle)
    return (
      <div className="mw-page">
        <EmptyState
          title="中途岛章节暂时无法加载"
          body={<a href={buildHref("overview")}>返回教材总览</a>}
        />
      </div>
    );
  const allEvidence = collectEntityEvidence(battle);
  const readingMinutes = Math.ceil(
    Object.values(battle.sections).reduce(
      (sum, section) => sum + section.body.length,
      0,
    ) / 260,
  );

  const toc = CHAPTERS.map(([id, label], i) => (
    <button
      type="button"
      key={id}
      aria-current={active === id ? "location" : undefined}
      onClick={() => jump(id)}
    >
      <span>0{i + 1}</span>
      {label}
      <span aria-hidden="true">↗</span>
    </button>
  ));

  return (
    <div className="mw-page">
      <a
        className="mw-skip"
        href="#mw-opening"
        onClick={(event) => {
          event.preventDefault();
          jump("opening");
        }}
      >
        跳到正文
      </a>
      <header className="mw-header">
        <a className="mw-wordmark" href={buildHref("overview")}>
          <span className="mw-emblem" aria-hidden="true">
            ✳
          </span>
          <span>
            太平洋战争<small>THE PACIFIC WAR</small>
          </span>
        </a>
        <div className="mw-header-actions">
          <span className="mw-pilot-label">中途岛 · 新版样板</span>
          <button
            type="button"
            className="mw-size"
            aria-pressed={size === "large"}
            onClick={() => setSize(size === "large" ? "standard" : "large")}
            aria-label={size === "large" ? "恢复标准字号" : "放大正文字号"}
          >
            Aa
          </button>
          <a
            className="mw-original"
            href={buildHref("battles", { id: battle.id })}
          >
            原版对照 <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>
      {isFixture ? <p role="status">测试样本，非正式历史内容</p> : null}

      <main>
      <section className="mw-hero" id="mw-hero" aria-labelledby="mw-title">
          <div className="mw-hero-copy">
            <p className="mw-kicker">
              第五章 <span>/</span> 战局的转折
            </p>
            <p className="mw-hero-date">1942.06.04 — 06.07 · 北太平洋</p>
            <h1 id="mw-title" tabIndex={-1} data-route-heading="">
              中途岛海战<span>MIDWAY</span>
            </h1>
            <p className="mw-hero-question">
              谁先发现对方，
              <br />
              谁就能掌握主动吗？
            </p>
            <p className="mw-hero-description">
              跟随五个战役阶段，理解情报、时间与选择如何交织，改变一场海战的结果。
            </p>
            <div className="mw-hero-bottom">
              <button
                type="button"
                className="mw-primary"
                onClick={() => jump("opening")}
              >
                开始阅读 <span aria-hidden="true">↓</span>
              </button>
              <span>正文约 {readingMinutes} 分钟 · 证据按需查看</span>
            </div>
          </div>
          {photo ? (
            <figure className="mw-hero-photo">
              <img
                src={`${import.meta.env.BASE_URL}${photo.path.replace(/^public\//, "")}`}
                alt={photo.alt}
                width={photo.width}
                height={photo.height}
                fetchPriority="high"
              />
              <figcaption>
                <span>历史影像 / 1942</span>约克城号遭日机攻击。
                <button
                  type="button"
                  onClick={() =>
                    showEvidence(
                      {
                        title: "历史照片：来源与许可",
                        claimIds: [],
                        sourceIds: [photo.sourceId],
                      },
                      "sources",
                    )
                  }
                >
                  美国海军摄影 · 公有领域 ↗
                </button>
              </figcaption>
            </figure>
          ) : null}
        </section>

        <div className="mw-mobile-nav">
          <details ref={tocRef}>
            <summary>
              本章目录{" "}
              <span>{CHAPTERS.find(([id]) => id === active)?.[1]} ⌄</span>
            </summary>
            <nav aria-label="手机章节目录">{toc}</nav>
          </details>
        </div>

        <div className="mw-reading-layout">
          <aside className="mw-toc">
            <nav aria-label="本章目录">
              <p>
                本章阅读 <span>CONTENTS</span>
              </p>
              {toc}
            </nav>
            <div className="mw-toc-note">
              <span>阅读提示</span>
              <p>
                先沿正文理解经过。想核对某个判断时，再打开该节的证据与来源。
              </p>
              <button
                type="button"
                onClick={() =>
                  showEvidence(
                    { title: "本章完整来源", ...allEvidence },
                    "sources",
                  )
                }
              >
                本章来源索引 ↗
              </button>
            </div>
          </aside>
          <div className="mw-story">
            <div className="mw-intro">
              <span>带着一个问题开始</span>
              <p>这场海战的意义，能只用双方损失了多少艘航母来衡量吗？</p>
              <div>
                <span>01 理解局势</span>
                <span>02 跟随经过</span>
                <span>03 判断影响</span>
              </div>
            </div>

            <Chapter id="opening" number="01" title="战役前，双方想要什么？">
              <SectionText onEvidence={showEvidence} sectionKey="background" />
              <SectionText onEvidence={showEvidence} sectionKey="objectives" />
              <details className="mw-deeper">
                <summary>
                  补充背景：参战者、指挥官与军力 <span>＋</span>
                </summary>
                <div>
                  <SectionText
                    onEvidence={showEvidence}
                    sectionKey="participants"
                  />
                  <SectionText
                    onEvidence={showEvidence}
                    sectionKey="commanders"
                  />
                  <SectionText onEvidence={showEvidence} sectionKey="forces" />
                  <SectionText onEvidence={showEvidence} sectionKey="plan" />
                </div>
              </details>
            </Chapter>

            <Chapter
              id="battle-map"
              number="02"
              title="在地图上，跟随战役的五个阶段"
            >
              <p className="mw-section-lead">
                先在太平洋全局找到中途岛，再放大到战区。每次只看一个阶段，比较双方当时掌握的信息。
              </p>
              <MidwayMap
                battle={battle}
                places={index.places}
                onEvidence={showEvidence}
              />
              <details className="mw-deeper">
                <summary>
                  文字补充：地理与完整战斗经过 <span>＋</span>
                </summary>
                <div>
                  <SectionText
                    onEvidence={showEvidence}
                    sectionKey="geography"
                  />
                  <SectionText onEvidence={showEvidence} sectionKey="course" />
                </div>
              </details>
            </Chapter>

            <Chapter
              id="choices"
              number="03"
              title="同一片海面，不同的信息与选择"
            >
              <SectionText onEvidence={showEvidence} sectionKey="constraints" />
              <SectionText onEvidence={showEvidence} sectionKey="decisions" />
              <div className="mw-pause">
                <span>停下来想一想</span>
                <p>
                  如果你只知道当时的情报，而不知道后来的结果，会怎样评价这些决定？
                </p>
                <div className="mw-person-links">
                  {battle.commanderIds.allies
                    .slice(0, 2)
                    .concat(battle.commanderIds.japan.slice(1))
                    .map((id) => {
                      const person = index.people.get(id);
                      return person ? (
                        <a href={buildHref("people", { id })} key={id}>
                          {person.name}的决策档案 ↗
                        </a>
                      ) : null;
                    })}
                </div>
              </div>
            </Chapter>

            <Chapter
              id="aftermath"
              number="04"
              title="战役结束了，影响才刚刚开始"
            >
              <SectionText onEvidence={showEvidence} sectionKey="results" />
              <SectionText onEvidence={showEvidence} sectionKey="aftermath" />
              <div className="mw-disputed">
                <span>历史解释 · 留意分歧</span>
                <SectionText
                  onEvidence={showEvidence}
                  sectionKey="controversies"
                />
              </div>
            </Chapter>

            <Chapter id="explore" number="05" title="读到这里，还可以继续探索">
              <p className="mw-section-lead">
                正文到这里结束。根据你的兴趣，选择一个问题或专题继续读。
              </p>
              <div className="mw-explore-grid">
                {["concept-codebreaking", "concept-carrier-aircraft"].map(
                  (id) => {
                    const concept = index.concepts.get(id);
                    return concept ? (
                      <a href={buildHref("concepts", { id })} key={id}>
                        <span>
                          知识专题 <span aria-hidden="true">↗</span>
                        </span>
                        <h3>{concept.title}</h3>
                        <p>{concept.summary}</p>
                      </a>
                    ) : null;
                  },
                )}
              </div>
              <div className="mw-question-link">
                {[...index.questions.values()]
                  .filter((q) => q.historicalPart === battle.historicalPart)
                  .map((q) => (
                    <a href={buildHref("questions", { id: q.id })} key={q.id}>
                      <span>探究问题</span>
                      <h3>{q.prompt}</h3>
                      <span>阅读答案与证据 ↗</span>
                    </a>
                  ))}
              </div>
              <details className="mw-deeper">
                <summary>
                  延伸阅读与完整来源 <span>＋</span>
                </summary>
                <div>
                  <SectionText
                    onEvidence={showEvidence}
                    sectionKey="furtherReading"
                  />
                  <button
                    className="mw-secondary"
                    type="button"
                    onClick={() =>
                      showEvidence(
                        { title: "本章完整来源", ...allEvidence },
                        "sources",
                      )
                    }
                  >
                    打开本章全部 {allEvidence.sourceIds.length} 个来源 ↗
                  </button>
                  <p className="mw-small">
                    照片：{photo?.creditLine}。许可：公有领域。地理底图：Natural
                    Earth，公有领域；所有舰位与航线为教学示意。
                  </p>
                </div>
              </details>
              <div className="mw-end">
                <span aria-hidden="true">✳</span>
                <p>历史的答案，藏在事实与选择之间。</p>
                <button
                  type="button"
                  onClick={() => {
                    setActive("opening");
                    document.getElementById("mw-title")?.scrollIntoView();
                    document
                      .getElementById("mw-title")
                      ?.focus({ preventScroll: true });
                  }}
                >
                  回到本章开头 ↑
                </button>
              </div>
            </Chapter>
          </div>
        </div>
      </main>
      <footer className="mw-footer">
        <span>太平洋战争 · 从珍珠港到中途岛</span>
        <a href={buildHref("overview")}>探索完整教材 ↗</a>
        <span>中途岛响应式样板 · 2026.11</span>
      </footer>

      {selection ? (
        <dialog
          ref={dialogRef}
          className="mw-evidence-dialog"
          aria-labelledby="mw-evidence-title"
          onCancel={closeEvidence}
          onClose={() => setSelection(null)}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              const r = event.currentTarget.getBoundingClientRect();
              if (
                event.clientX < r.left ||
                event.clientX > r.right ||
                event.clientY < r.top ||
                event.clientY > r.bottom
              )
                closeEvidence();
            }
          }}
        >
          <div className="mw-dialog-header">
            <div>
              <p>按需查证 / EVIDENCE</p>
              <h2 id="mw-evidence-title">{selection.title}</h2>
            </div>
            <button
              type="button"
              autoFocus
              aria-label="关闭证据，返回正文"
              onClick={closeEvidence}
            >
              ×
            </button>
          </div>
          <div
            className="mw-dialog-tabs"
            role="group"
            aria-label="证据显示方式"
          >
            <button
              type="button"
              aria-pressed={dialogTab === "claims"}
              onClick={() => setDialogTab("claims")}
            >
              判断与定位
            </button>
            <button
              type="button"
              aria-pressed={dialogTab === "sources"}
              onClick={() => setDialogTab("sources")}
            >
              完整来源
            </button>
          </div>
          <div className="mw-dialog-body">
            {dialogTab === "claims" ? (
              <>
                <p className="mw-small">
                  事实、解释与争议分别标注。每条判断都附有可核对的来源位置。
                </p>
                <label className="mw-evidence-filter">
                  筛选证据类型
                  <select
                    value={claimType}
                    onChange={(event) =>
                      setClaimType(event.target.value as typeof claimType)
                    }
                  >
                    <option value="all">全部类型</option>
                    <option value="fact">事实</option>
                    <option value="interpretation">解释</option>
                    <option value="disputed">争议</option>
                    <option value="schematic">示意</option>
                  </select>
                </label>
                <EvidencePanel
                  claimIds={selection.claimIds}
                  sourceIds={selection.sourceIds}
                  claimById={index.claims}
                  sourceById={index.sources}
                  compact
                  claimTypeFilter={claimType}
                />
              </>
            ) : (
              <>
                <CitationList
                  sourceIds={[
                    ...new Set([
                      ...selection.sourceIds,
                      ...selection.claimIds.flatMap(
                        (id) => index.claims.get(id)?.sourceIds ?? [],
                      ),
                    ]),
                  ]}
                  sourceById={index.sources}
                  heading="本节完整来源"
                />
                {selection.title.startsWith("历史照片") && photo ? (
                  <div className="mw-photo-license">
                    <p>{photo.caption}</p>
                    <p>{photo.creditLine}</p>
                    <p>{photo.rightsStatement}</p>
                    <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
                      查看许可 ↗
                    </a>
                  </div>
                ) : null}
              </>
            )}
          </div>
          <div className="mw-dialog-footer">
            <button type="button" onClick={closeEvidence}>
              返回原来的阅读位置 ↑
            </button>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
