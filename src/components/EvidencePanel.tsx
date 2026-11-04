/**
 * EvidencePanel —— 小节级证据面板
 *
 * 契约 §3.3（最重要的一条 UI 规则）：
 * 「文章正文里的每一节都携带自己的 sourceIds 与 claimIds；UI 不得只显示页面级来源
 *   而隐藏小节级证据。」
 *
 * 因此每个小节（文章小节 / 战役十四类 / 专题三层 / 决策卡 / 地图阶段）都渲染自己的
 * EvidencePanel：逐条 claim（带 claimType 标签 + 定位）＋ 来源。
 */

import type { Claim, ClaimType, Source } from '../data/types';
import { ClaimTag } from './ClaimTag';
import { CitationList } from './CitationList';
import { SourceLocatorList } from './SourceLocator';

export interface EvidencePanelProps {
  claimIds: string[];
  sourceIds: string[];
  claimById: ReadonlyMap<string, Claim>;
  sourceById: ReadonlyMap<string, Source>;
  /** 可选：按 claimType 过滤（读者的筛选器）。 */
  claimTypeFilter?: ClaimType | 'all';
  /** 紧凑模式：只列 claim 文本与标签，不展开来源详情（用于地图阶段等空间有限处）。 */
  compact?: boolean;
}

export function EvidencePanel({
  claimIds,
  sourceIds,
  claimById,
  sourceById,
  claimTypeFilter = 'all',
  compact = false,
}: EvidencePanelProps) {
  const claims = claimIds.map((id) => claimById.get(id)).filter((claim): claim is Claim => Boolean(claim));
  const visibleClaims =
    claimTypeFilter === 'all' ? claims : claims.filter((claim) => claim.claimType === claimTypeFilter);
  const missingClaims = claimIds.length - claims.length;

  // 小节自身的来源 + claim 上声明的来源合并（两者都应可见）
  const mergedSourceIds = [...new Set([...sourceIds, ...claims.flatMap((claim) => claim.sourceIds ?? [])])];

  if (claimIds.length === 0 && sourceIds.length === 0) {
    return null;
  }

  return (
    <div className="pw-evidence" data-evidence-panel="">
      <p className="pw-evidence__legend">
        本节证据
        <span style={{ fontWeight: 400, color: 'var(--pw-ink-muted)', marginLeft: '0.75em', fontSize: 'var(--pw-size-xs)' }}>
          {claims.length} 条判断 · {mergedSourceIds.length} 个来源
          {missingClaims > 0 ? ` · ${missingClaims} 条无法解析` : ''}
        </span>
      </p>
      {visibleClaims.length > 0 ? (
        <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
          {visibleClaims.map((claim) => (
            <li key={claim.id} className="pw-claim" data-claim-id={claim.id} data-claim-type={claim.claimType}>
              <ClaimTag type={claim.claimType} />
              <p className="pw-claim__text">{claim.text}</p>
              {claim.note ? <p className="pw-claim__note">{claim.note}</p> : null}
              <SourceLocatorList locators={claim.locators ?? []} sourceById={sourceById} />
            </li>
          ))}
        </ol>
      ) : claimIds.length > 0 ? (
        <p className="pw-claim__text" style={{ margin: 0 }}>
          当前筛选条件下本节没有对应类型的判断。
        </p>
      ) : null}
      {!compact && mergedSourceIds.length > 0 ? (
        <div style={{ marginTop: '0.75rem' }}>
          <CitationList sourceIds={mergedSourceIds} sourceById={sourceById} heading="本节来源" />
        </div>
      ) : null}
    </div>
  );
}
