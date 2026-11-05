/**
 * QA-01 axe 可访问性扫描（桌面 + 移动关键页）。
 *
 * 验收：桌面 / 移动关键页无 critical / serious 缺陷；键盘、reduced-motion 与对比度有证据。
 *
 * 说明：本文件在**没有浏览器**的环境下无法执行（沙箱禁止创建子进程）。
 * 请查看 tests/evidence/accessibility.json 中的 status 字段确认实际执行情况。
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE = '/history_pacific_war/';

/** 关键页面（六入口 + 三个重点战役详情 + 一个地点详情）。 */
const KEY_PAGES = [
  { label: 'overview', hash: '/' },
  { label: 'timeline', hash: '/timeline' },
  { label: 'battles', hash: '/battles' },
  { label: 'people', hash: '/people' },
  { label: 'atlas', hash: '/atlas' },
  { label: 'concepts', hash: '/concepts' },
  { label: 'questions', hash: '/questions' },
  { label: 'battle-pearl-harbor', hash: '/battles/battle-pearl-harbor' },
  { label: 'battle-coral-sea', hash: '/battles/battle-coral-sea' },
  { label: 'battle-midway', hash: '/battles/battle-midway' },
  { label: 'place-pearl-harbor', hash: '/atlas/place-pearl-harbor' },
  { label: 'sources', hash: '/sources' },
];

async function openRoute(page: import('@playwright/test').Page, hash: string) {
  await page.goto(`${BASE}index.html#${hash}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, {
    timeout: 20_000,
  });
  /*
   * QA-01 attempt 5：内容加载是异步的（首次渲染 status='loading'）。
   * 这里原先只等 #root 有子节点就开始跑 axe，于是**几乎每一页每一个项目**
   * 都在「正在加载共享内容」的空壳上做审计 —— 既可能报出假阳性，
   * 也完全没有审到真正的教材页面。必须等内容状态离开 loading 再审计。
   * （learning.spec.ts 已用同一标记；此处补齐，两处口径一致。）
   */
  await page.waitForFunction(
    () => {
      const marker = document.querySelector('[data-content-status]');
      const status = marker?.getAttribute('data-content-status');
      return status !== null && status !== undefined && status !== 'loading';
    },
    null,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(300); // 让首屏稳定（无动画依赖）
}

for (const pageDef of KEY_PAGES) {
  test(`axe 无 critical/serious：${pageDef.label}`, async ({ page }) => {
    await openRoute(page, pageDef.hash);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    // 把问题写成可读的断言信息，便于中央审阅具体节点
    const summary = blocking.map(
      (v) => `${v.id} (${v.impact}) × ${v.nodes.length}: ${v.help}`,
    );
    expect(blocking, `严重/致命可访问性缺陷：\n${summary.join('\n')}`).toHaveLength(0);
  });
}

test('对比度：正文与背景对比度由 axe color-contrast 规则覆盖', async ({ page }) => {
  await openRoute(page, '/timeline');
  const results = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();
  const contrast = results.violations.filter((v) => v.id === 'color-contrast');
  expect(contrast, `对比度缺陷：${contrast.map((v) => v.nodes.length).join(',')}`).toHaveLength(0);
});

test('reduced-motion 下无严重可访问性问题', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openRoute(page, '/atlas');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  expect(blocking.map((v) => v.id)).toHaveLength(0);
});
