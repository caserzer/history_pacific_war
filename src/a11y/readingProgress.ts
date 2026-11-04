/**
 * 可选的阅读进度（工单 §6.3「阅读进度本地保存」）
 *
 * 只保存滚动百分比到 localStorage；不做跨设备同步、不上传。
 * 读者关闭存储时静默降级。
 */

import { useEffect } from 'react';

const STORAGE_KEY = 'pw.reading-progress';

type ProgressMap = Record<string, number>;

function readMap(): ProgressMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const map: ProgressMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'number' && Number.isFinite(value)) map[key] = Math.min(1, Math.max(0, value));
    }
    return map;
  } catch {
    return {};
  }
}

export function readProgress(contentId: string): number {
  if (typeof window === 'undefined') return 0;
  return readMap()[contentId] ?? 0;
}

export function writeProgress(contentId: string, ratio: number): void {
  try {
    const map = readMap();
    const next = Math.min(1, Math.max(0, ratio));
    // 只增不减：重读时不应让已读标记倒退
    if ((map[contentId] ?? 0) >= next - 0.02) return;
    map[contentId] = next;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // 存储不可用：忽略
  }
}

/**
 * 在详情页记录阅读进度（滚动到 25% / 50% / 75% / 90% 时写入）。
 * `prefers-reduced-motion` 不影响此逻辑（它不是动画）。
 */
export function useReadingProgress(contentId: string): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const doc = document.documentElement;
        const scrollable = doc.scrollHeight - window.innerHeight;
        if (scrollable <= 0) return;
        const ratio = window.scrollY / scrollable;
        for (const threshold of [0.25, 0.5, 0.75, 0.9]) {
          if (ratio >= threshold) writeProgress(contentId, threshold);
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [contentId]);
}
