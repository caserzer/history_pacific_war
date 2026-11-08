/**
 * 站点外壳：页眉（品牌 + 搜索 + 阅读字号）、六入口导航、主内容、页脚。
 *
 * 无障碍要点：
 * - Skip link 直达主内容；
 * - 每个路由切换后把焦点移到页面标题；
 * - 导航使用真实链接（hash），可用 Tab/Enter 访问，`:focus-visible` 有 3px 焦点环；
 * - 页眉工具按钮全部有可读标签与 aria-pressed 状态。
 */

import { useEffect, type ReactNode } from 'react';
import { useApp } from '../features/AppContext';
import { ENTRY_NAV } from '../content/labels';
import { entryCounts } from '../data/index';
import { buildHref, type Route } from '../router/route';
import { isActiveView } from '../router/route';
import { READING_SIZES, READING_SIZE_LABELS, useReadingSize } from '../a11y/readingSize';

function BrandMark() {
  return (
    <svg className="pw-brand__mark" viewBox="0 0 64 64" role="img" aria-label="太平洋战争数字档案馆标志">
      <rect width="64" height="64" rx="6" fill="#18222d" stroke="#d9b45a" strokeWidth="1.5" />
      <path d="M6 44c8-3 12-9 26-9s18 6 26 9" fill="none" stroke="#7fb49c" strokeWidth="2" />
      <path d="M6 50c8-3 12-9 26-9s18 6 26 9" fill="none" stroke="#7fb49c" strokeWidth="1.2" opacity="0.65" />
      <circle cx="32" cy="24" r="11" fill="none" stroke="#d9b45a" strokeWidth="2.2" />
      <path d="M32 18v12M32 24l7 5" stroke="#f2e8d5" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function AppShell({ route, children }: { route: Route; children: ReactNode }) {
  const { index, content } = useApp();
  const counts = entryCounts(index);
  const { size, setSize } = useReadingSize();

  // 路由切换：滚动到顶部并把焦点交给页面标题（读屏用户能立刻知道换了页面）
  useEffect(() => {
    window.scrollTo?.({ top: 0 });
    const heading = document.querySelector<HTMLElement>('[data-route-heading]');
    heading?.focus({ preventScroll: true });
  }, [route.view, route.id]);

  // 独立样板拥有紧凑的阅读外壳，原站各入口保留用于对照。
  if (route.view === 'midway') return <>{children}</>;

  return (
    <div className="pw-shell">
      <a className="pw-skip-link" href="#pw-main">
        跳到主要内容
      </a>
      <header className="pw-header">
        <div className="pw-header__inner">
          <a className="pw-brand" href={buildHref('overview')} aria-label="返回总览">
            <BrandMark />
            <span className="pw-brand__text">
              <span className="pw-brand__title">太平洋战争：从珍珠港到中途岛</span>
              <span className="pw-brand__sub">THE PACIFIC WAR · 1941.12 — 1942.06</span>
            </span>
          </a>
          <div className="pw-header__tools">
            <div className="pw-field" style={{ minWidth: 'min(18rem, 40vw)' }}>
              <SearchFormInline />
            </div>
            <div role="group" aria-label="阅读字号" style={{ display: 'flex', gap: '0.25rem' }}>
              {READING_SIZES.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="pw-btn pw-btn--ghost"
                  aria-pressed={size === option}
                  data-reading-size-option={option}
                  onClick={() => setSize(option)}
                  title={`正文大小：${READING_SIZE_LABELS[option]}`}
                >
                  {READING_SIZE_LABELS[option]}
                  <span className="pw-visually-hidden">字号</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <nav className="pw-nav" aria-label="六个阅读入口">
        <div className="pw-nav__inner">
          {ENTRY_NAV.map((entry, i) => (
            <a
              key={entry.view}
              className="pw-nav__link"
              href={buildHref(entry.view)}
              aria-current={isActiveView(route, entry.view) ? 'page' : undefined}
              data-entry-link={entry.view}
            >
              <span className="pw-nav__index">{String(i + 1).padStart(2, '0')}</span>
              <span>{entry.label}</span>
              <span className="pw-nav__count" aria-hidden="true">
                {counts[entry.view] ?? 0}
              </span>
              <span className="pw-visually-hidden">{entry.labelEn}</span>
            </a>
          ))}
          <a
            className="pw-nav__link"
            href={buildHref('sources')}
            aria-current={isActiveView(route, 'sources') ? 'page' : undefined}
            data-entry-link="sources"
          >
            <span className="pw-nav__index">07</span>
            <span>来源与证据</span>
            <span className="pw-nav__count" aria-hidden="true">
              {index.sources.size}
            </span>
          </a>
        </div>
      </nav>

      <main className="pw-main" id="pw-main" tabIndex={-1}>
        {children}
      </main>

      <footer className="pw-footer">
        <div className="pw-footer__inner">
          <div>
            <p style={{ margin: 0 }}>
              《太平洋战争：从珍珠港到中途岛》· 中文交互历史教材 · 面向 11 岁读者
            </p>
            <p style={{ margin: 0 }}>
              内容状态：
              {content.status === 'available' ? '已加载正式内容' : null}
              {content.status === 'fixture' ? '测试样本（未交付内容）' : null}
              {content.status === 'missing' ? '内容尚未加载' : null}
              {content.status === 'invalid' ? '内容结构不符合契约' : null}
              {content.doc ? ` · schemaVersion ${content.doc.schemaVersion}` : null}
            </p>
          </div>
          <div>
            <p style={{ margin: 0 }}>
              内容来源与许可见 <a href={buildHref('sources')}>来源与证据总表</a>。示意图为本站原创作品。
            </p>
            <p style={{ margin: 0 }}>本页不依赖外部瓦片服务、商业 API 或 CDN 字体。</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** 页眉里的紧凑搜索：提交后跳转 #/search?q=... */
function SearchFormInline() {
  return (
    <form
      role="search"
      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', width: '100%' }}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const value = String(data.get('q') ?? '').trim();
        window.location.hash = buildHref('search', value ? { query: value } : {}).slice(1);
      }}
    >
      <label className="pw-visually-hidden" htmlFor="header-search">
        搜索全部内容
      </label>
      <input
        id="header-search"
        name="q"
        type="search"
        placeholder="搜索…"
        autoComplete="off"
        onKeyDown={(event) => {
          if (event.key === '/' && event.target instanceof HTMLInputElement && (event.target as HTMLInputElement).value.length === 0) {
            event.preventDefault();
          }
        }}
      />
      <button type="submit" className="pw-btn" style={{ minHeight: '32px', minWidth: 'auto', padding: '0.1em 0.6em' }}>
        搜索
      </button>
    </form>
  );
}
