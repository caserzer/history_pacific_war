import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useApp } from "../features/AppContext";
import { EvidencePanel } from "../components/EvidencePanel";
import { CitationList } from "../components/CitationList";
import type { ClaimType, MediaAsset } from "../data/types";

export interface EvidenceSelection {
  title: string;
  claimIds: string[];
  sourceIds: string[];
  media?: MediaAsset;
  tab?: "claims" | "sources";
}
const EvidenceContext = createContext<(selection: EvidenceSelection) => void>(
  () => {},
);
export const useEvidence = () => useContext(EvidenceContext);

export function EvidenceProvider({ children }: { children: ReactNode }) {
  const { index } = useApp();
  const [selection, setSelection] = useState<EvidenceSelection | null>(null);
  const [tab, setTab] = useState<"claims" | "sources">("claims");
  const [filter, setFilter] = useState<ClaimType | "all">("all");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const open = (value: EvidenceSelection) => {
    trigger.current = document.activeElement as HTMLElement;
    setTab(value.tab ?? (value.claimIds.length ? "claims" : "sources"));
    setFilter("all");
    setSelection(value);
  };
  const close = () => {
    dialog.current?.close();
    setSelection(null);
  };
  useEffect(() => {
    if (!selection || !dialog.current) return;
    dialog.current.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      trigger.current?.focus({ preventScroll: true });
    };
  }, [selection]);
  const sources = selection
    ? [
        ...new Set([
          ...selection.sourceIds,
          ...selection.claimIds.flatMap(
            (id) => index.claims.get(id)?.sourceIds ?? [],
          ),
        ]),
      ]
    : [];
  return (
    <EvidenceContext.Provider value={open}>
      {children}
      {selection ? (
        <dialog
          ref={dialog}
          className="mw-evidence-dialog"
          aria-labelledby="rs-evidence-title"
          onCancel={close}
          onClose={() => setSelection(null)}
          onClick={(e) => {
            if (e.target !== e.currentTarget) return;
            const r = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < r.left ||
              e.clientX > r.right ||
              e.clientY < r.top ||
              e.clientY > r.bottom
            )
              close();
          }}
        >
          <header className="mw-dialog-header">
            <div>
              <p>按需查证 / EVIDENCE</p>
              <h2 id="rs-evidence-title">{selection.title}</h2>
            </div>
            <button
              type="button"
              autoFocus
              onClick={close}
              aria-label="关闭证据，返回正文"
            >
              ×
            </button>
          </header>
          <div
            className="mw-dialog-tabs"
            role="group"
            aria-label="证据显示方式"
          >
            <button
              type="button"
              aria-pressed={tab === "claims"}
              onClick={() => setTab("claims")}
            >
              判断与定位
            </button>
            <button
              type="button"
              aria-pressed={tab === "sources"}
              onClick={() => setTab("sources")}
            >
              完整来源
            </button>
          </div>
          <div className="mw-dialog-body">
            {tab === "claims" ? (
              <>
                <p className="mw-small">
                  逐条区分事实、解释与争议，并保留来源的具体定位。
                </p>
                <label className="mw-evidence-filter">
                  筛选证据类型
                  <select
                    value={filter}
                    onChange={(e) =>
                      setFilter(e.target.value as ClaimType | "all")
                    }
                  >
                    <option value="all">全部类型</option>
                    <option value="fact">事实</option>
                    <option value="interpretation">解释</option>
                    <option value="disputed">争议</option>
                    <option value="schematic">示意</option>
                  </select>
                </label>
                {selection.claimIds.length ? (
                  <EvidencePanel
                    {...selection}
                    claimById={index.claims}
                    sourceById={index.sources}
                    claimTypeFilter={filter}
                    compact
                  />
                ) : (
                  <p>本项未单列判断，来源与许可请查看“完整来源”。</p>
                )}
              </>
            ) : (
              <>
                {!selection.media ? (
                  <CitationList
                    sourceIds={sources}
                    sourceById={index.sources}
                    heading="完整引用信息"
                  />
                ) : null}
                {selection.media ? (
                  <div className="mw-photo-license">
                    <h3>图像来源与许可</h3>
                    <p>{selection.media.caption}</p>
                    <p>摄影 / 制作：{selection.media.author}</p>
                    <p>{selection.media.creditLine}</p>
                    {selection.media.sourcePage ? (
                      <p>
                        <a href={selection.media.sourcePage} target="_blank" rel="noreferrer">
                          查看图像来源登记 ↗
                        </a>
                      </p>
                    ) : null}
                    <p>{selection.media.rightsStatement}</p>
                    {selection.media.licenseUrl ? (
                      <a
                        href={selection.media.licenseUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        查看许可 ↗
                      </a>
                    ) : null}
                  </div>
                ) : null}
                {selection.media ? (
                  <details className="rs-photo-context">
                    <summary>相关正文文献</summary>
                    <CitationList
                      sourceIds={sources}
                      sourceById={index.sources}
                      heading="正文背景来源"
                    />
                  </details>
                ) : null}
              </>
            )}
          </div>
          <footer className="mw-dialog-footer">
            <button type="button" onClick={close}>
              返回原来的阅读位置 ↑
            </button>
          </footer>
        </dialog>
      ) : null}
    </EvidenceContext.Provider>
  );
}

export function EvidenceLink({
  title,
  claimIds,
  sourceIds,
}: EvidenceSelection) {
  const open = useEvidence();
  const { index } = useApp();
  if (!claimIds.length && !sourceIds.length) return null;
  const types = new Set(claimIds.map((id) => index.claims.get(id)?.claimType));
  return (
    <div className="mw-cite-row">
      <button
        type="button"
        className="mw-cite"
        onClick={() => open({ title, claimIds, sourceIds })}
        aria-label={`查看${title}的证据与来源`}
      >
        ↗ 证据与来源 <span>{claimIds.length || sourceIds.length}</span>
      </button>
      <span className="mw-evidence-kind">
        {types.has("disputed")
          ? "含有争议的判断"
          : types.has("interpretation")
            ? "事实与历史解释"
            : "有来源记录"}
      </span>
    </div>
  );
}
