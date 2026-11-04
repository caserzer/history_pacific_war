/**
 * 应用上下文：把内容索引与内容状态传给所有视图。
 *
 * 内容状态（available / fixture / missing / invalid）是显示「测试样本」与「未加载」的
 * 唯一依据 —— 来自显式 `fixtureOnly` 标志，绝不靠文件名猜测（契约 §9.9）。
 */

import { createContext, useContext } from 'react';
import type { ContentState } from '../content/loader';
import type { ContentIndex } from '../data/index';

export interface AppContextValue {
  content: ContentState;
  index: ContentIndex;
  /** 内容是否可用（available 或 fixture）。 */
  hasContent: boolean;
  /** 是否为测试样本。 */
  isFixture: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppContextProvider = AppContext.Provider;

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp 必须在 AppContextProvider 内使用');
  return value;
}
