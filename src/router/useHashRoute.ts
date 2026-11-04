/**
 * hash 路由的 React 绑定。
 *
 * 只依赖 `window.location.hash` 与 `hashchange`，因此：
 * - GitHub Pages 子路径下可用（不需要服务器 rewrite）；
 * - 深链、后退/前进、手改地址栏都走同一套解析。
 */

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_ROUTE, parseRoute, type Route } from './route';

function currentRoute(): Route {
  if (typeof window === 'undefined') return DEFAULT_ROUTE;
  return parseRoute(window.location.hash);
}

export interface UseHashRoute {
  route: Route;
  /** 用代码导航（会写入历史记录，可后退）。 */
  navigate: (hash: string) => void;
  /** 后退；没有历史时回总览。 */
  back: () => void;
}

export function useHashRoute(): UseHashRoute {
  const [route, setRoute] = useState<Route>(currentRoute);

  useEffect(() => {
    const onChange = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onChange);
    // 首次进入若没有 hash，补一个可分享的规范地址（不新增历史条目）。
    if (window.location.hash === '') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/`);
    }
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((hash: string) => {
    window.location.hash = hash.startsWith('#') ? hash.slice(1) : hash;
  }, []);

  const back = useCallback(() => {
    if (window.history.length > 1) window.history.back();
    else window.location.hash = '/';
  }, []);

  return { route, navigate, back };
}
