/**
 * SourceLocator —— 来源定位
 *
 * 验收项：正文可显示「来源及定位」。契约 §4.11 规定每条 claim 的每个 sourceId
 * 都必须有自己的 locator，且 locatorType 来自固定枚举。
 *
 * 这里只渲染数据结构，不判断定位是否足够精确（那是验证器的职责）。
 */

import { LOCATOR_TYPE_LABELS } from '../content/labels';
import type { Locator, Source } from '../data/types';

export interface SourceLocatorProps {
  locator: Locator;
  source: Source | undefined;
}

export function SourceLocator({ locator, source }: SourceLocatorProps) {
  const typeLabel = LOCATOR_TYPE_LABELS[locator.locatorType] ?? locator.locatorType;
  return (
    <span className="pw-locator" data-locator-type={locator.locatorType}>
      <span className="pw-locator__type">定位 · {typeLabel}</span>
      {'：'}
      {locator.locator}
      {source ? ` —— ${source.publisher}` : null}
    </span>
  );
}

export interface SourceLocatorListProps {
  locators: Locator[];
  sourceById: ReadonlyMap<string, Source>;
}

export function SourceLocatorList({ locators, sourceById }: SourceLocatorListProps) {
  if (!Array.isArray(locators) || locators.length === 0) {
    // 契约要求 locators 至少一条；缺失说明内容数据不完整，界面应明说而不是假装有证据。
    return <span className="pw-locator">（该判断缺少来源定位，需由内容验证器拦截）</span>;
  }
  return (
    <span>
      {locators.map((locator, index) => (
        <SourceLocator key={`${locator.sourceId}-${index}`} locator={locator} source={sourceById.get(locator.sourceId)} />
      ))}
    </span>
  );
}
