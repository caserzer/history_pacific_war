/**
 * 阅读字号控制（无障碍要求：读者可按需调整正文大小）
 *
 * 实现方式：写 `document.documentElement[data-reading-size]`，
 * 由 tokens.css 里的 `[data-reading-size]` 规则切换 `--pw-reading-size`。
 * 纯 CSS 变量驱动 → 不触发组件重排，地图等后续模块无需感知。
 *
 * 持久化：localStorage；不可用时静默降级（隐私模式/禁用存储不报错）。
 */

import { useCallback, useEffect, useState } from 'react';

export const READING_SIZES = ['cozy', 'standard', 'large'] as const;
export type ReadingSize = (typeof READING_SIZES)[number];

const STORAGE_KEY = 'pw.reading-size';

export const READING_SIZE_LABELS: Record<ReadingSize, string> = {
  cozy: '小',
  standard: '中',
  large: '大',
};

function isReadingSize(value: unknown): value is ReadingSize {
  return typeof value === 'string' && (READING_SIZES as readonly string[]).includes(value);
}

export function readStoredReadingSize(): ReadingSize {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isReadingSize(stored)) return stored;
  } catch {
    // localStorage 不可用：使用默认值
  }
  return 'standard';
}

export function applyReadingSize(size: ReadingSize): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-reading-size', size);
}

export function useReadingSize(): { size: ReadingSize; setSize: (next: ReadingSize) => void } {
  const [size, setSizeState] = useState<ReadingSize>(() =>
    typeof window === 'undefined' ? 'standard' : readStoredReadingSize(),
  );

  useEffect(() => {
    applyReadingSize(size);
  }, [size]);

  const setSize = useCallback((next: ReadingSize) => {
    setSizeState(next);
    applyReadingSize(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 忽略：不影响当前会话的字号切换
    }
  }, []);

  return { size, setSize };
}
