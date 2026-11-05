/**
 * src/main.tsx —— 站点入口
 *
 * 职责：
 * 1. 加载唯一内容源（content/history.json，Vite glob eager import，见 content/loader.ts）；
 * 2. 构建索引（含反向索引，用于「这条内容还出现在哪里」）；
 * 3. 挂载 hash 路由与六入口外壳。
 *
 * 内容缺失时**不阻塞**渲染：给出诚实的未加载状态，六个入口仍可导航。
 * 站内不存在第二份历史数据。
 */

import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/tokens.css';
import './styles/app.css';

import { loadContentAsync, emptyDocument } from './content/loader';
import { buildIndex } from './data/index';
import { useHashRoute } from './router/useHashRoute';
import type { Route } from './router/route';
import { AppContextProvider, type AppContextValue } from './features/AppContext';
import { AppShell } from './shell/AppShell';
import { OverviewView } from './features/overview/OverviewView';
import { TimelineView } from './features/timeline/TimelineView';
import { BattlesView } from './features/battles/BattlesView';
import { PeopleView } from './features/people/PeopleView';
import { AtlasView } from './features/atlas/AtlasView';
import { ConceptsView } from './features/concepts/ConceptsView';
import { QuestionsView } from './features/questions/QuestionsView';
import { SearchView } from './features/search/SearchView';
import { SourcesView } from './features/sources/SourcesView';
import { EmptyState, PageHead } from './components/primitives';
import { applyReadingSize, readStoredReadingSize } from './a11y/readingSize';
import type { ContentState } from './content/loader';

/** 在首帧前应用已保存的阅读字号，避免闪烁。 */
if (typeof document !== 'undefined') {
  applyReadingSize(readStoredReadingSize());
}

function App() {
  const { route } = useHashRoute();
  // 内容状态是异步的：构建产物可能把 content/history.json 拆成独立 chunk。
  // 先渲染 loading（诚实说明「正在加载共享内容」），拿到结果后再决定渲染内容或状态。
  const [contentState, setContentState] = useState<ContentState>(() => ({ status: 'loading', doc: null, issues: [], sourceKey: null }));

  useEffect(() => {
    let cancelled = false;
    void loadContentAsync().then((state) => {
      if (!cancelled) setContentState(state);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const contextValue = useMemo<AppContextValue>(() => {
    const doc = contentState.doc ?? emptyDocument();
    return {
      content: contentState,
      index: buildIndex(doc),
      hasContent: contentState.doc !== null,
      isFixture: contentState.status === 'fixture',
    };
  }, [contentState]);

  return (
    <AppContextProvider value={contextValue}>
      <AppShell route={route}>
        {/*
          QA-01 attempt 4 / 真实失败 (2)：内容加载是异步的（首次渲染 status='loading'）。
          此前页面**没有**任何属性表明「内容已经就绪」，浏览器测试看到 .pw-nav 出现就
          开始断言，命中 loading 阶段，于是 Questions 等入口读到空索引 → 误报「空状态」。
          这里给出稳定的就绪标记，测试据此等待，而不是靠猜。
        */}
        <div data-content-status={contentState.status} hidden />
        {contentState.status === 'loading' ? <ContentLoading /> : <RouteView route={route} />}
      </AppShell>
    </AppContextProvider>
  );
}

/** 内容加载中的诚实状态：说明正在加载什么，而不是展示骨架屏假内容。 */
function ContentLoading() {
  return (
    <div>
      <PageHead
        eyebrow="内容加载"
        title="正在加载共享内容"
        description="正在读取 content/history.json。这份文件由内容模块交付，站点自身的六个入口、路由与证据组件已经就绪。"
      />
      <p aria-live="polite" style={{ fontFamily: 'var(--pw-font-sans)', fontSize: 'var(--pw-size-sm)', color: 'var(--pw-ink-soft)' }}>
        如果长时间停在这里，说明内容文件无法加载；页面会显示具体原因，而不会用示例内容代替。
      </p>
    </div>
  );
}

function RouteView({ route }: { route: Route }) {
  switch (route.view) {
    case 'overview':
      return <OverviewView />;
    case 'timeline':
      return <TimelineView eventId={route.id} initialDate={route.date ?? null} />;
    case 'battles':
      return <BattlesView battleId={route.id} />;
    case 'people':
      return <PeopleView personId={route.id} />;
    case 'atlas':
      // MAP-01：支持 #/atlas?battle=<battleId>&phase=<phaseId> 深链定位到战役阶段。
      return <AtlasView placeId={route.id} battleId={route.battle ?? null} phaseId={route.phase ?? null} />;
    case 'concepts':
      return <ConceptsView conceptId={route.id} />;
    case 'questions':
      return <QuestionsView questionId={route.id} />;
    case 'search':
      return <SearchView query={route.query} />;
    case 'sources':
      return <SourcesView sourceId={route.id} />;
    default:
      return (
        <div>
          <PageHead eyebrow="未找到" title="这个地址没有对应的阅读入口" />
          <EmptyState title="页面不存在" body="请使用页面上方的六个入口导航，或从总览开始阅读。" />
        </div>
      );
  }
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('缺少 #root 挂载节点（index.html 应包含 <div id="root">）');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
