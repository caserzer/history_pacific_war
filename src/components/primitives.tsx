/**
 * 通用呈现组件：页面标题、空状态、正文段落、相关实体互链、元数据。
 * 这些组件只负责**排版**，内容全部来自传入的数据。
 */

import type { ReactNode } from 'react';
import { ClaimTag } from './ClaimTag';
import type { ClaimType } from '../data/types';

export function PageHead({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="pw-page-head">
      <p className="pw-page-head__eyebrow">{eyebrow}</p>
      <h1 tabIndex={-1} data-route-heading="">
        {title}
      </h1>
      {description ? <p>{description}</p> : null}
      {aside}
    </header>
  );
}

/**
 * 空状态：内容尚未交付时的诚实说明。
 * 工单要求「缺少内容时可构建契约兼容的加载状态」，且不得用示例历史填充。
 */
export function EmptyState({
  title,
  body,
  details,
  footnote,
}: {
  title: string;
  body: ReactNode;
  details?: { text: string; contract?: string }[];
  footnote?: ReactNode;
}) {
  return (
    <section className="pw-empty" aria-live="polite" data-empty-state="">
      <p className="pw-empty__title">{title}</p>
      <div className="pw-empty__body">
        {body}
        {details && details.length > 0 ? (
          <ul>
            {details.map((detail) => (
              <li key={detail.text}>
                {detail.text}
                {detail.contract ? (
                  <span style={{ color: 'var(--pw-ink-muted)', fontSize: 'var(--pw-size-xs)' }}> —— {detail.contract}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {footnote ? <p style={{ marginTop: '0.75rem' }}>{footnote}</p> : null}
      </div>
    </section>
  );
}

/** 正文段落渲染：契约用 \n 表示换行，空行分段。 */
export function Prose({ body }: { body: string }) {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
  if (paragraphs.length === 0) return null;
  return (
    <div className="pw-prose">
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  );
}

export interface RelatedLink {
  href: string;
  label: string;
  hint?: string;
}

export interface RelatedGroup {
  title: string;
  links: RelatedLink[];
}

/**
 * 相关实体互链：满足「用户应始终知道正在读什么，以及它与其他历史内容的联系」。
 * 空分组不渲染（契约允许部分引用数组为空）。
 */
export function RelatedLinks({ groups }: { groups: RelatedGroup[] }) {
  const nonEmpty = groups.filter((group) => group.links.length > 0);
  if (nonEmpty.length === 0) return null;
  return (
    <nav className="pw-related" aria-label="相关内容">
      {nonEmpty.map((group) => (
        <div className="pw-related__group" key={group.title}>
          <h4>{group.title}</h4>
          <ul className="pw-chip-list">
            {group.links.map((link) => (
              <li key={`${group.title}-${link.href}-${link.label}`}>
                <a className="pw-chip" href={link.href}>
                  {link.label}
                  {link.hint ? <span style={{ color: 'var(--pw-ink-muted)', marginLeft: '0.35em' }}>{link.hint}</span> : null}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** 档案元数据行（等宽小字），用于显示 ID、日期、类型等可核查标签。 */
export function MetaRow({ items }: { items: { key: string; value: ReactNode; title?: string }[] }) {
  return (
    <dl className="pw-meta">
      {items.map((item) => (
        <div className="pw-meta__item" key={item.key + String(item.value)} title={item.title}>
          <dt className="pw-meta__key">{item.key}</dt>
          <dd style={{ margin: 0 }}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 详情页顶部的「当前上下文条」：时间 / 地点 / 所属部分。 */
export function ContextBar({ items }: { items: { key: string; value: ReactNode }[] }) {
  return (
    <aside className="pw-context-bar" aria-label="当前阅读上下文">
      {items.map((item) => (
        <div key={item.key}>
          <span className="pw-context-bar__key">{item.key}</span>
          <span>{item.value}</span>
        </div>
      ))}
    </aside>
  );
}

/** 证据类型筛选器（单选，对无障碍友好：使用 aria-pressed 的按钮组）。 */
export function ClaimTypeFilter({
  value,
  onChange,
  counts,
}: {
  value: ClaimType | 'all';
  onChange: (next: ClaimType | 'all') => void;
  counts?: Partial<Record<ClaimType | 'all', number>>;
}) {
  const options: { value: ClaimType | 'all'; label: string }[] = [
    { value: 'all', label: '全部证据' },
    { value: 'fact', label: '事实' },
    { value: 'interpretation', label: '解释' },
    { value: 'disputed', label: '争议' },
    { value: 'schematic', label: '示意' },
  ];
  return (
    <div className="pw-filters" role="group" aria-label="按证据类型筛选">
      <span className="pw-filters__label">证据类型</span>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="pw-btn"
          aria-pressed={value === option.value}
          data-claim-filter={option.value}
          onClick={() => onChange(option.value)}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em' }}>
            {option.value !== 'all' ? <ClaimTag type={option.value} /> : option.label}
            {counts?.[option.value] !== undefined ? (
              <span style={{ fontFamily: 'var(--pw-font-mono)', fontSize: 'var(--pw-size-xs)' }}>{counts[option.value]}</span>
            ) : null}
          </span>
        </button>
      ))}
    </div>
  );
}
