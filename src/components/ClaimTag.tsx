/**
 * ClaimTag —— 证据类型标签
 *
 * 验收项（工单 Acceptance）：正文可显示 fact/interpretation/disputed/schematic 标签。
 *
 * 实现要点：
 * - 文案来自契约枚举（content.schema.json 的 claimType），不是历史内容；
 * - 三重编码：glyph 形状 + 中文文字 + 颜色（DESIGN.md §2.6）；
 * - 输出 `data-claim-type` 属性，便于自动化测试与站点验证脚本断言四类标签都存在。
 */

import { CLAIM_TYPE_META } from '../content/labels';
import { CLAIM_TYPES, type ClaimType } from '../data/types';

export function isClaimType(value: unknown): value is ClaimType {
  return typeof value === 'string' && (CLAIM_TYPES as readonly string[]).includes(value);
}

export interface ClaimTagProps {
  type: ClaimType;
  /** 是否在标签后附加一句话解释（默认不附加，图例里才展开）。 */
  withHint?: boolean;
}

export function ClaimTag({ type, withHint = false }: ClaimTagProps) {
  if (!isClaimType(type)) {
    // 防御性降级：契约外的值不猜测，直接不渲染标签（验证器会拦住脏数据）。
    return null;
  }
  const meta = CLAIM_TYPE_META[type];
  return (
    <span
      className={`pw-tag ${meta.className}`}
      data-claim-type={type}
      title={meta.description}
    >
      <span aria-hidden="true">{meta.glyph}</span>
      <span>{meta.label}</span>
      <span className="pw-visually-hidden">（证据类型）</span>
      {withHint ? <span className="pw-visually-hidden">{meta.description}</span> : null}
    </span>
  );
}

/** 图例：四类标签一次列全，并说明各自含义（放在证据面板顶部与「关于」区）。 */
export function ClaimTagLegend({ counts }: { counts?: Partial<Record<ClaimType, number>> }) {
  return (
    <ul className="pw-chip-list" aria-label="证据类型图例">
      {CLAIM_TYPES.map((type) => {
        const meta = CLAIM_TYPE_META[type];
        const count = counts?.[type];
        return (
          <li key={type} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ClaimTag type={type} />
              {typeof count === 'number' ? (
                <span style={{ fontFamily: 'var(--pw-font-mono)', fontSize: 'var(--pw-size-xs)', color: 'var(--pw-ink-muted)' }}>
                  {count} 条
                </span>
              ) : null}
            </span>
            <span style={{ fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-xs)', color: 'var(--pw-ink-soft)', maxWidth: '24ch' }}>
              {meta.description}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
