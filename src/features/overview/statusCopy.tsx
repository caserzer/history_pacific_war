/**
 * 内容状态的统一文案（available / fixture / missing / invalid）。
 *
 * 「诚实展示未加载」是本任务的验收点：状态必须来自内容加载器给出的显式结果，
 * 并且在页面上说清楚「为什么没有内容」「内容会从哪来」「现在能做什么」。
 */

import type { ReactNode } from 'react';
import type { ContentState } from '../../content/loader';
import { CONTENT_PATH } from '../../content/loader';

export function getContentStatusCopy(content: ContentState): ReactNode | null {
  switch (content.status) {
    case 'available':
      return null;
    case 'fixture':
      return (
        <div className="pw-banner pw-banner--fixture" role="status" data-content-status="fixture">
          <span className="pw-banner__title">测试样本（fixtureOnly = true）</span>
          当前页面渲染的是<strong>契约测试样本</strong>，不是已交付的教材内容。它只用于验证六入口、证据标签与来源定位组件是否能正确工作；
          其中的历史句子不得当作正式历史叙述引用。正式内容由历史内容模块（HIST）以 <code>fixtureOnly: false</code> 写入
          <code> {CONTENT_PATH} </code>。
        </div>
      );
    case 'missing':
      return (
        <div className="pw-banner" role="status" data-content-status="missing">
          <span className="pw-banner__title">内容尚未加载（content/history.json 未交付）</span>
          这是本任务（WEB-01，外壳与契约消费）的<strong>预期状态</strong>：站点外壳、六个入口、路由、检索、证据与引用组件都已就绪，
          但历史内容由 HIST 模块写入同一份 <code>{CONTENT_PATH}</code>。为了不误导读者，页面不会用示例事件、虚构日期或占位文章填充；
          每个入口都会明确显示自己的「未加载」状态。内容交付后无需改动代码，页面会自动读取并渲染。
        </div>
      );
    case 'invalid':
      return (
        <div className="pw-banner pw-banner--fixture" role="status" data-content-status="invalid">
          <span className="pw-banner__title">内容文件结构不符合契约</span>
          <code>{CONTENT_PATH}</code> 存在，但无法通过根节点契约检查（需要 schemaVersion、fixtureOnly 与 11 个顶层数组）。
          为避免把错误数据当作历史展示，站点暂停渲染内容。具体问题：
          <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem' }}>
            {content.issues.map((issue) => (
              <li key={issue.message}>
                {issue.message}
                <span style={{ color: 'var(--pw-ink-muted)' }}>（依据：{issue.contract}）</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case 'loading':
      return (
        <div className="pw-banner" role="status" aria-live="polite" data-content-status="loading">
          <span className="pw-banner__title">正在加载共享内容</span>
          正在读取 <code>{CONTENT_PATH}</code>。加载期间不会显示任何示例内容；如果加载失败，这里会给出具体原因。
        </div>
      );
    case 'error':
      return (
        <div className="pw-banner pw-banner--fixture" role="status" data-content-status="error">
          <span className="pw-banner__title">内容加载失败</span>
          无法加载 <code>{CONTENT_PATH}</code> 的内容模块。为避免误导读者，站点不会用示例内容代替。
          <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem' }}>
            {content.issues.map((issue) => (
              <li key={issue.message}>
                {issue.message}
                <span style={{ color: 'var(--pw-ink-muted)' }}>（依据：{issue.contract}）</span>
              </li>
            ))}
          </ul>
        </div>
      );
    default:
      return null;
  }
}
