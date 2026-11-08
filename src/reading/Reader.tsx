import { useEffect, useRef, useState, type ReactNode } from "react";
import { useApp } from "../features/AppContext";
import type { MediaAsset } from "../data/types";
import { EvidenceLink, useEvidence, type EvidenceSelection } from "./Evidence";
import registry from "../../content/media.json";

/** Sentence-boundary reading breaks; historical wording is preserved verbatim. */
export function ReadingProse({ body }: { body: string }) {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((paragraph) => {
      const chunks: string[] = [];
      let start = 0;
      for (let i = 0; i < paragraph.length; i++) {
        if (i - start < 120 || !/[。！？]/.test(paragraph[i]!)) continue;
        let end = i + 1;
        while (end < paragraph.length && /[”’」』]/.test(paragraph[end]!))
          end++;
        chunks.push(paragraph.slice(start, end));
        start = end;
        i = end - 1;
      }
      const tail = paragraph.slice(start);
      if (tail.length < 40 && chunks.length) chunks[chunks.length - 1] += tail;
      else if (tail) chunks.push(tail);
      return chunks;
    });
  return (
    <div className="pw-prose rs-prose">
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

export const mediaFor = (id: string): MediaAsset[] =>
  (registry.media as MediaAsset[]).filter((asset) =>
    asset.articleIds.includes(id),
  );
export const mediaUrl = (asset: MediaAsset) =>
  `${import.meta.env.BASE_URL}${asset.path.replace(/^public\//, "")}`;
export interface ReadingSection extends EvidenceSelection {
  id: string;
  body?: string;
  content?: ReactNode;
  optional?: boolean;
}

export function MediaFigure({
  asset,
  compact = false,
}: {
  asset: MediaAsset;
  compact?: boolean;
}) {
  const open = useEvidence();
  return (
    <figure className={`rs-media ${compact ? "rs-media-compact" : ""}`}>
      <img
        src={mediaUrl(asset)}
        alt={asset.alt}
        width={asset.width}
        height={asset.height}
        loading="lazy"
      />
      <figcaption>
        <span>{asset.caption}</span>
        <a
          href={mediaUrl(asset)}
          target="_blank"
          rel="noopener noreferrer"
          className="rs-original-image"
        >
          查看原图 ↗
        </a>
        <button
          type="button"
          onClick={() =>
            open({
              title: asset.title,
              claimIds: [],
              sourceIds: [asset.sourceId],
              media: asset,
              tab: "sources",
            })
          }
        >
          来源与许可 ↗
        </button>
      </figcaption>
    </figure>
  );
}

export function ReadingBlock({ section }: { section: ReadingSection }) {
  return (
    <div className="rs-reading-block" data-reading-section={section.id}>
      <h3>{section.title}</h3>
      {section.body ? <ReadingProse body={section.body} /> : null}
      {section.content}
      <EvidenceLink
        title={section.title}
        claimIds={section.claimIds}
        sourceIds={section.sourceIds}
      />
    </div>
  );
}

export function Reader({
  id,
  title,
  summary,
  kicker,
  meta,
  sections,
  media = [],
  related,
  evidence,
  next,
}: {
  id: string;
  title: string;
  summary?: string;
  kicker: string;
  meta?: string;
  sections: ReadingSection[];
  media?: MediaAsset[];
  related?: ReactNode;
  evidence: EvidenceSelection;
  next?: { href: string; title: string };
}) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const [progress, setProgress] = useState(0);
  const mobile = useRef<HTMLDetailsElement>(null);
  const open = useEvidence();
  const { isFixture } = useApp();
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · 太平洋战争`;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting)
            setActive(e.target.getAttribute("data-reader-anchor") ?? "");
      },
      { rootMargin: "-18% 0px -60% 0px" },
    );
    document
      .querySelectorAll("[data-reader-anchor]")
      .forEach((el) => observer.observe(el));
    const onScroll = () => {
      const height = document.documentElement.scrollHeight - innerHeight;
      setProgress(
        height > 0 ? Math.min(100, Math.round((scrollY / height) * 100)) : 0,
      );
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      removeEventListener("scroll", onScroll);
      document.title = previous;
    };
  }, [id, title]);
  const jump = (sectionId: string) => {
    if (mobile.current) mobile.current.open = false;
    const target = document.getElementById(`rs-${sectionId}`);
    target?.scrollIntoView({ block: "start" });
    target?.focus({ preventScroll: true });
    setActive(sectionId);
  };
  const toc = sections.map((s, i) => (
    <button
      type="button"
      key={s.id}
      onClick={() => jump(s.id)}
      aria-current={active === s.id ? "location" : undefined}
    >
      <span>{String(i + 1).padStart(2, "0")}</span>
      {s.title}
      <span aria-hidden="true">↗</span>
    </button>
  ));
  return (
    <article className="rs-reader" data-reader-id={id}>
      <header className="rs-reader-head">
        <p className="rs-eyebrow">{kicker}</p>
        {meta ? <p className="rs-dateline">{meta}</p> : null}
        <h1 tabIndex={-1} data-route-heading="">
          {title}
        </h1>
        {summary ? <p className="rs-reader-summary">{summary}</p> : null}
        <div className="rs-reader-meta">
          <span>{sections.length} 个阅读部分</span>
          <button
            type="button"
            onClick={() => open({ ...evidence, tab: "sources" })}
          >
            本篇来源索引 ↗
          </button>
          {isFixture ? <strong>测试样本</strong> : null}
        </div>
      </header>
      <div className="mw-mobile-nav rs-reader-mobile">
        <details ref={mobile}>
          <summary>
            本篇目录{" "}
            <span>{sections.find((s) => s.id === active)?.title} ⌄</span>
          </summary>
          <nav aria-label="手机文章目录">{toc}</nav>
        </details>
      </div>
      <div className="mw-reading-layout rs-reading-layout">
        <aside className="mw-toc">
          <nav aria-label="本篇目录">
            <p>
              本篇阅读 <span>CONTENTS</span>
            </p>
            {toc}
          </nav>
          <div className="mw-toc-note">
            <span>阅读提示</span>
            <p>
              先理解正文主线，需要核对时再打开证据。补充内容与拓展阅读可以按兴趣选择。
            </p>
            <span>阅读进度 {progress}%</span>
          </div>
        </aside>
        <div className="mw-story rs-story">
          {media.map((asset) => (
            <MediaFigure
              key={asset.id}
              asset={asset}
              compact={asset.mediaType === "portrait"}
            />
          ))}
          {sections.map((section, i) => (
            <section
              key={section.id}
              id={`rs-${section.id}`}
              tabIndex={-1}
              data-reader-anchor={section.id}
              className="mw-chapter rs-section"
            >
              <div className="mw-section-kicker">
                <span>{String(i + 1).padStart(2, "0")}</span> THE PACIFIC WAR
              </div>
              {section.optional ? (
                <details className="mw-deeper">
                  <summary>
                    {section.title}
                    <span>＋</span>
                  </summary>
                  <div>
                    {section.body ? <ReadingProse body={section.body} /> : null}
                    {section.content}
                    <EvidenceLink
                      title={section.title}
                      claimIds={section.claimIds}
                      sourceIds={section.sourceIds}
                    />
                  </div>
                </details>
              ) : (
                <>
                  <h2>{section.title}</h2>
                  {section.body ? <ReadingProse body={section.body} /> : null}
                  {section.content}
                  <EvidenceLink
                    title={section.title}
                    claimIds={section.claimIds}
                    sourceIds={section.sourceIds}
                  />
                </>
              )}
            </section>
          ))}
          {related ? (
            <section className="mw-chapter rs-section rs-related-section">
              <div className="mw-section-kicker">
                继续探索 / FURTHER READING
              </div>
              <h2>沿着线索，继续读下去</h2>
              {related}
            </section>
          ) : null}
          {next ? (
            <a className="rs-next-reading" href={next.href}>
              <span>下一篇 / CONTINUE READING</span>
              <strong>{next.title}</strong>
              <span aria-hidden="true">↗</span>
            </a>
          ) : null}
          <div className="rs-reader-end">
            <span aria-hidden="true">✳</span>
            <button
              type="button"
              onClick={() => open({ ...evidence, tab: "sources" })}
            >
              查看本篇完整来源 ↗
            </button>
            <button
              type="button"
              onClick={() => {
                scrollTo({ top: 0 });
                document
                  .querySelector<HTMLElement>("[data-route-heading]")
                  ?.focus({ preventScroll: true });
              }}
            >
              回到文章开头 ↑
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
