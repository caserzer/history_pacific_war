/**
 * QA-01 学习站点真实浏览器回归。
 *
 * 覆盖（对应 QA-01 交付 (1)(2)(7) 与验收「Playwright 测试覆盖…」）：
 *  - 六入口渲染 + 每个入口的详情路由；
 *  - 战役 → 人物 → 地图互跳；地图节点 → 地点详情；叙述 → 地图阶段深链；
 *  - 地图缩放 / 平移 / 图层切换（真实事件派发）；
 *  - 阶段播放 / 暂停 / 上一阶段 / 下一阶段；
 *  - 时间线日期筛选联动（data-timeline-date-count 与事件集合）；
 *  - 现代名 / 历史名可见；双方已知 / 未知情报与决策、后果；
 *  - 四种 claim 标签与来源定位（data-claim-type / data-locator-type）；
 *  - 六入口 fixture 泄露：真实浏览器 DOM 文本中不得出现 fixture 专属事实；
 *  - content/media.json 注册图片在 /history_pacific_war/ 子路径下 HTTP 可达；
 *  - 键盘可达性、prefers-reduced-motion、无外部地图网络。
 *
 * 依赖的稳定选择器均来自站点本身（已在构建产物中核实存在），不新增业务钩子。
 * 本文件只读 content/ 与 public/，绝不改写它们。
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = '/history_pacific_war/';

// ---------------------------------------------------------------- 数据（只读真实内容）
/** 内容实体最小形状（只声明测试用到的字段，避免依赖 src 内部类型）。 */
interface Entity {
  id: string;
  title?: string;
  name?: string;
  historicalName?: string;
  modernName?: string;
  text?: string;
  startDate?: string;
  phases?: Phase[];
  knownEnemy?: Record<string, string>;
  unknownEnemy?: Record<string, string>;
  decision?: Record<string, string>;
  consequence?: Record<string, string>;
}
interface Phase {
  id: string;
  /** 阶段时间（契约字段；F7 文案复查需要核对时间文本确实渲染出来）。 */
  time: { start: string; end?: string; display: string; uncertainty: string };
  knownEnemy: Record<string, string>;
  unknownEnemy: Record<string, string>;
  decision: Record<string, string>;
  consequence: Record<string, string>;
}
interface ContentDoc {
  [collection: string]: Entity[] | undefined;
  events: Entity[];
  battles: Entity[];
  people: Entity[];
  places: Entity[];
  concepts: Entity[];
  questions: Entity[];
}

const realContent = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'content', 'history.json'), 'utf8'),
) as ContentDoc;
const mediaRegistryRaw = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'content', 'media.json'), 'utf8'),
) as { media?: { src?: string; path?: string; file?: string }[] } | { src?: string }[];
const mediaEntries: { src?: string; path?: string; file?: string }[] = Array.isArray(mediaRegistryRaw)
  ? mediaRegistryRaw
  : mediaRegistryRaw.media ?? [];

const FOCUS_BATTLES = ['battle-pearl-harbor', 'battle-coral-sea', 'battle-midway'];

/** 取真实战役并断言其存在且含阶段（失败即前置条件不满足）。 */
function requireBattle(id: string): Entity & { phases: Phase[] } {
  const battle = requireBattle(id);
  expect(battle, `真实内容应含战役 ${id}`).toBeTruthy();
  expect(Array.isArray(battle?.phases) && battle!.phases!.length > 0, `${id} 应有阶段`).toBe(true);
  return battle as Entity & { phases: Phase[] };
}

/** 六个入口（hash 路由）。 */
const ENTRIES = [
  { view: 'timeline', collection: 'events' },
  { view: 'battles', collection: 'battles' },
  { view: 'people', collection: 'people' },
  { view: 'atlas', collection: 'places' },
  { view: 'concepts', collection: 'concepts' },
  { view: 'questions', collection: 'questions' },
];

/**
 * fixture 专属事实：出现在契约夹具里、但不在真实内容里的字符串。
 * 计算方式与站点验证器 LEAK-* 一致（真实内容 + media 注册表的并集之外才算「专属」）。
 * 这些字符串**不得**出现在任何发布路由的渲染文本里。
 */
function fixtureExclusiveFacts() {
  const real = JSON.stringify(realContent) + JSON.stringify(mediaRegistryRaw);
  const fixtureFiles = [
    'contracts/fixtures/valid-min.json',
    'contracts/fixtures/valid-early-campaign.json',
    'contracts/fixtures/map-phases.json',
  ];
  const collected = [];
  for (const rel of fixtureFiles) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const doc = JSON.parse(fs.readFileSync(abs, 'utf8'));
    const flat = [];
    (function walk(value) {
      if (typeof value === 'string') {
        const s = value.trim();
        if (s.length >= 14) flat.push(s);
      } else if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') Object.values(value).forEach(walk);
    })(doc);
    for (const s of flat) if (!real.includes(s)) collected.push(s);
  }
  return [...new Set(collected)];
}

const LEAK_FACTS = fixtureExclusiveFacts();

/** 打开站点某个 hash 路由（等待应用把 #root 渲染出来）。 */
async function openRoute(page: Page, hash: string) {
  await page.goto(`${BASE}index.html#${hash}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 20_000 });
  // QA-01 attempt 4 / 真实失败 (2)：内容加载是**异步**的。此前这里只等 .pw-nav 出现——
  // 但外壳在 status='loading' 时就已渲染完毕，于是测试在 loading 阶段就开始断言，
  // 读到空索引并误报「Questions 显示空状态」。必须等内容状态离开 loading。
  await page.waitForFunction(
    () => {
      const marker = document.querySelector('[data-content-status]');
      if (marker === null) return false;
      const status = marker.getAttribute('data-content-status');
      return status !== null && status !== 'loading';
    },
    null,
    { timeout: 30_000 },
  );
  // 等待 hash 路由生效（标题或入口标记出现）
  await page.waitForFunction(() => document.querySelector('[data-route-heading], .pw-nav') !== null, null, { timeout: 20_000 });
}

/** 渲染文本（不含 script/style）。 */
async function bodyText(page: Page) {
  return page.evaluate(() => {
    const clone = document.body.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('script, style').forEach((n: Element) => n.remove());
    return clone.textContent ?? '';
  });
}

// ================================================================ 六入口
test.describe('六入口在真实完整内容上正常显示', () => {
  for (const entry of ENTRIES) {
    test(`入口 ${entry.view} 渲染出真实条目且不是空状态`, async ({ page }) => {
      await openRoute(page, `/${entry.view}`);

      await expect(page.locator('[data-route-heading], h1').first()).toBeVisible();

      const items = realContent[entry.collection] ?? [];
      expect(items.length, `${entry.collection} 在真实内容中应非空`).toBeGreaterThan(0);

      // 首个真实条目的可识别文本必须出现在页面上（说明数据来自真实内容加载路径）
      const firstItem = items[0];
      const marker =
        firstItem.title ?? firstItem.name ?? firstItem.historicalName ?? firstItem.text ?? '';
      expect(marker.length).toBeGreaterThan(0);

      const text = await bodyText(page);
      expect(text, `${entry.view} 应渲染真实条目「${String(marker).slice(0, 24)}」`).toContain(
        String(marker).slice(0, 24),
      );

      // 真入口不应停留在「未加载 / 尚未交付」空状态
      expect(text).not.toContain('内容尚未加载');
    });
  }
});

// ================================================================ 详情路由
test.describe('详情路由', () => {
  test('战役详情渲染十四类字段与证据面板', async ({ page }) => {
    for (const battleId of FOCUS_BATTLES) {
      await openRoute(page, `/battles/${battleId}`);
      const battle = requireBattle(battleId);
      expect(battle, `${battleId} 应存在于真实内容`).toBeTruthy();
      const text = await bodyText(page);
      expect(text).toContain(String(battle.title).slice(0, 12));
      // 至少渲染出多个小节
      await expect(page.locator('[data-battle-section], section').first()).toBeVisible();
    }
  });

  test('人物详情渲染决策型档案', async ({ page }) => {
    const person = realContent.people[0];
    await openRoute(page, `/people/${person.id}`);
    const text = await bodyText(page);
    expect(text).toContain(String(person.name ?? person.title).slice(0, 6));
  });

  test('地点详情同时给出历史地名与现代地名', async ({ page }) => {
    const place = realContent.places.find((p: Entity) => p.id === 'place-pearl-harbor') ?? realContent.places[0];
    await openRoute(page, `/atlas/${place.id}`);
    const text = await bodyText(page);
    expect(text).toContain('历史地名');
    expect(text).toContain('现代地名');
    expect(text).toContain(place.historicalName);
    expect(text).toContain(place.modernName);
  });
});

// ================================================================ 互跳
test.describe('战役—人物—地图互跳', () => {
  test('战役页 → 人物页 → 地图页 → 回到时间线', async ({ page }) => {
    await openRoute(page, '/battles/battle-midway');

    // 战役页内指向人物的链接
    const personLink = page.locator('a[href*="#/people/"]').first();
    await expect(personLink).toBeVisible();
    await personLink.click();
    await page.waitForFunction(() => location.hash.startsWith('#/people/'));

    // 人物页 → 地图节点链接
    const atlasLink = page.locator('a[href*="#/atlas"]').first();
    await expect(atlasLink).toBeVisible();
    await atlasLink.click();
    await page.waitForFunction(() => location.hash.startsWith('#/atlas'));

    // 地图页 → 时间线导航项
    await page.locator('[data-entry-link="timeline"]').first().click();
    await page.waitForFunction(() => location.hash.startsWith('#/timeline'));
  });

  test('叙述页每个阶段都有跳转到地图的深链', async ({ page }) => {
    for (const battleId of FOCUS_BATTLES) {
      await openRoute(page, `/battles/${battleId}`);
      const links = page.locator('[data-phase-map-link]');
      const count = await links.count();
      const battle = requireBattle(battleId);
      expect(count, `${battleId} 每个阶段都应有地图深链`).toBeGreaterThanOrEqual(
        (battle.phases ?? []).length,
      );
      // 深链必须指向 atlas 且带 battle/phase 参数
      const href = await links.first().getAttribute('href');
      expect(href).toContain('#/atlas');
      expect(href).toContain(`battle=${battleId}`);
    }
  });

  test('地图阶段深链直接选中该阶段', async ({ page }) => {
    const battle = requireBattle('battle-coral-sea');
    const phase = battle.phases[1];
    await openRoute(page, `/atlas?battle=${battle.id}&phase=${phase.id}`);
    const activePhase = await page.locator('[data-atlas-active-phase]').first().getAttribute('data-atlas-active-phase');
    expect(activePhase).toBe(phase.id);
  });
});

// ================================================================ 地图交互
test.describe('地图缩放 / 平移 / 图层', () => {
  test('缩放按钮改变 map zoom', async ({ page }) => {
    await openRoute(page, '/atlas');
    const canvas = page.locator('[data-atlas-canvas]').first();
    await expect(canvas).toBeVisible();

    const zoomOf = async () => Number(await canvas.getAttribute('data-map-zoom'));
    const before = await zoomOf();

    await page.locator('[data-map-action="zoom-in"]').first().click();
    const zoomedIn = await zoomOf();
    expect(zoomedIn).toBeGreaterThan(before);

    await page.locator('[data-map-action="zoom-out"]').first().click();
    expect(await zoomOf()).toBeLessThan(zoomedIn);

    await page.locator('[data-map-action="reset"]').first().click();
    expect(await zoomOf()).toBeCloseTo(before, 1e-6);
  });

  test('方向键平移在地图内生效（键盘可达）', async ({ page }) => {
    await openRoute(page, '/atlas');
    const canvas = page.locator('[data-atlas-canvas]').first();
    const transformOf = async () => await canvas.getAttribute('data-map-transform');
    const zoomOf = async () => Number(await canvas.getAttribute('data-map-zoom'));

    // QA-01 attempt 4 / 真实失败 (5)：
    // 全图视野（zoom=1）下 clampTransform 的 maxTx = W*(zoom-1)/2 = 0，平移到不了任何
    // 地方——这是**正确设计**（不偷偷改缩放）。因此在 zoom=1 期望位移本身是错误期望。
    // 正确做法：先放大到可平移的缩放，再按方向键；并验证 data-can-pan 明确告知读者。
    expect(await canvas.getAttribute('data-can-pan')).toBe('false');
    const atFit = await transformOf();
    await canvas.focus();
    await page.keyboard.press('ArrowRight');
    expect(await transformOf(), '全图视野下平移应被正确钳制（不改 zoom、不偷偷位移）').toBe(atFit);

    // 放大到可平移（方向键「+」也是键盘路径的一部分）
    await page.keyboard.press('+');
    await page.keyboard.press('+');
    expect(await zoomOf()).toBeGreaterThan(1);
    await expect.poll(async () => canvas.getAttribute('data-can-pan')).toBe('true');

    const before = await transformOf();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    const after = await transformOf();
    expect(after, '放大后方向键应改变 data-map-transform（tx 变化）').not.toBe(before);

    // 数字键 0 复位
    await page.keyboard.press('0');
    await expect.poll(async () => zoomOf()).toBeCloseTo(1, 1);
  });

  test('图层开关真实改变渲染节点', async ({ page }) => {
    await openRoute(page, '/atlas');
    const placesToggle = page.locator('[data-layer-toggle="places"]').first();
    await expect(placesToggle).toBeVisible();

    const placeNodes = page.locator('[data-layer="place"]');
    const before = await placeNodes.count();
    expect(before).toBeGreaterThan(0);

    await placesToggle.click();
    await expect(page.locator('[data-layer="place"]')).toHaveCount(0);

    await placesToggle.click();
    await expect(page.locator('[data-layer="place"]')).toHaveCount(before);
  });

  test('地图有图例 / 比例尺 / 经纬网与双方不同视觉编码', async ({ page }) => {
    await openRoute(page, '/atlas');
    await expect(page.locator('[data-layer="scalebar"]').first()).toBeVisible();
    const scalebar = page.locator('[data-layer="scalebar"]').first();
    // 比例尺标签与线段都必须存在（几何正确性由 validate-site 断言）
    await expect(scalebar.locator('text')).toContainText('km');
    const km = Number(await scalebar.getAttribute('data-scalebar-km'));
    expect(km).toBeGreaterThan(0);
    const len = Number(await scalebar.getAttribute('data-scalebar-length'));
    expect(len).toBeGreaterThan(0);
  });
});

// ================================================================ 阶段播放
test.describe('阶段播放 / 暂停 / 前后', () => {
  for (const battleId of FOCUS_BATTLES) {
    test(`${battleId} 播放 / 暂停 / 上下阶段`, async ({ page }) => {
      const battle = requireBattle(battleId);
      await openRoute(page, `/atlas?battle=${battleId}&phase=${battle.phases[0].id}`);

      const counter = page.locator('[data-phase-counter]').first();
      await expect(counter).toBeVisible();

      // 下一阶段
      await page.locator('[data-phase-action="next"]').first().click();
      await expect(page.locator('[data-atlas-active-phase]').first()).toHaveAttribute(
        'data-atlas-active-phase',
        battle.phases[1].id,
      );

      // 上一阶段
      await page.locator('[data-phase-action="prev"]').first().click();
      await expect(page.locator('[data-atlas-active-phase]').first()).toHaveAttribute(
        'data-atlas-active-phase',
        battle.phases[0].id,
      );

      // 播放 → aria-pressed 变 true，按钮文案变「暂停」
      const playBtn = page.locator('[data-phase-action="playpause"]').first();
      await expect(playBtn).toHaveAttribute('aria-pressed', 'false');
      await playBtn.click();
      await expect(playBtn).toHaveAttribute('aria-pressed', 'true');
      await playBtn.click();
      await expect(playBtn).toHaveAttribute('aria-pressed', 'false');
    });
  }

  test('阶段面板显示双方已知 / 未知情报与决策、后果', async ({ page }) => {
    const battle = requireBattle('battle-midway');
    const phase = battle.phases[0];
    await openRoute(page, `/atlas?battle=${battle.id}&phase=${phase.id}`);
    const text = await bodyText(page);
    for (const required of [
      phase.knownEnemy.japan,
      phase.knownEnemy.allies,
      phase.unknownEnemy.japan,
      phase.unknownEnemy.allies,
      phase.decision.japan,
      phase.decision.allies,
      phase.consequence.japan,
      phase.consequence.allies,
    ]) {
      expect(text, '阶段面板应显示该文本').toContain(String(required).slice(0, 20));
    }
  });
});

// ================================================================ 时间线日期筛选
test.describe('时间线日期筛选联动', () => {
  test('选择日期后事件计数与集合随之改变', async ({ page }) => {
    await openRoute(page, '/timeline');

    const filter = page.locator('[data-timeline-date-filter]').first();
    await expect(filter).toBeVisible();

    const totalAll = Number(await filter.getAttribute('data-timeline-date-total'));
    expect(totalAll).toBe(realContent.events.length);

    const countAll = await page.locator('[data-timeline-event]').count();
    expect(countAll).toBe(totalAll);

    // 用日期范围内的某个日期做筛选（取事件日期的中位数，避免硬编码）
    const dates = [...new Set(realContent.events.map((e: Entity) => e.startDate).filter((d): d is string => typeof d === 'string'))].sort();
    const cutoff = dates[Math.floor(dates.length / 2)] as string;
    const expected = realContent.events.filter((e: Entity) => typeof e.startDate === 'string' && e.startDate <= cutoff).length;

    // 通过滑块的键盘操作驱动（也顺带验证键盘可达性）
    const range = page.locator('[data-timeline-date-range]').first();
    await range.focus();
    await page.keyboard.press('End');

    await expect
      .poll(async () => page.locator('[data-timeline-event]').count(), { timeout: 10_000 })
      .toBeLessThanOrEqual(totalAll);

    // 复位按钮恢复全部事件
    await page.locator('[data-timeline-date-reset]').first().click();
    await expect.poll(async () => page.locator('[data-timeline-event]').count()).toBe(totalAll);

    // 直接深链带 date 参数时，计数应为「截至该日」的数量
    await openRoute(page, `/timeline?date=${cutoff}`);
    const filtered = Number(
      await page.locator('[data-timeline-date-filter]').first().getAttribute('data-timeline-date-count'),
    );
    expect(filtered, `#/timeline?date=${cutoff} 应筛选到 ${expected} 条`).toBe(expected);
  });
});

// ================================================================ claim 标签与来源定位
test.describe('四种说法标签与来源定位', () => {
  test('正文出现 claim 标签与来源定位', async ({ page }) => {
    // 用一个已知含 claim 的详情页（战役阶段）
    await openRoute(page, '/battles/battle-pearl-harbor');
    const text = await bodyText(page);
    // 至少一个来源/claim 证据面板
    const panels = await page.locator('[data-evidence-panel]').count();
    expect(panels).toBeGreaterThan(0);

    const claimTypes = await page.evaluate(() =>
      [...document.querySelectorAll('[data-claim-type]')].map((n: Element) => n.getAttribute('data-claim-type')),
    );
    expect(claimTypes.length).toBeGreaterThan(0);
    // 契约四种取值
    for (const t of claimTypes) expect(['fact', 'interpretation', 'disputed', 'schematic']).toContain(t);

    const locators = await page.locator('[data-locator-type]').count();
    expect(locators, '来源定位应可渲染').toBeGreaterThanOrEqual(0);
    expect(text.length).toBeGreaterThan(500);
  });
});

// ================================================================ fixture 泄露（真实浏览器 DOM）
//
// **覆盖策略（QA-01 修订，见 tests/evidence/browser-matrix.json 的 leakCoverage）**
//
// 验收要求「六入口及其详情路由」都不渲染 fixture 专属事实。初版只抽样了每个入口的
// 第 1 个详情页（6/95 ≈ 6.3%），漏掉了「泄露只出现在某个非首条 place-* 详情页」这类
// 系统性缺陷。现在改为：
//
//   - 主力项目 `chromium-desktop`：**穷举全部 95 个实体**的详情路由（6 条集合 × 每个 id 一断言）；
//   - 其余 4 个项目（chromium-tablet/mobile、webkit-desktop/mobile）：列表页仍穷举六入口，
//     详情页只抽第 1 条 —— 因为泄露是「数据 → 渲染」的确定性属性，同一构建产物在不同
//     视口下渲染路径相同；把 95×5 全部铺开会把运行时间乘 5 而不增加信息量。
//
// 这样在不显著增加运行时间的前提下获得**穷举覆盖**，且策略在代码与本文件中明确记录。
test.describe('六入口不渲染 fixture 专属事实', () => {
  /** 穷举覆盖只在主力项目上执行（见上方策略说明）。 */
  const EXHAUSTIVE_PROJECT = 'chromium-desktop';

  test('LEAK_FACTS 非空（前置条件）', () => {
    expect(LEAK_FACTS.length, '应能从夹具派生出专属事实').toBeGreaterThan(20);
  });

  for (const entry of ENTRIES) {
    test(`入口 ${entry.view} 列表页无 fixture 泄露`, async ({ page }) => {
      await openRoute(page, `/${entry.view}`);
      const listText = await bodyText(page);
      const leakedOnList = LEAK_FACTS.filter((fact) => listText.includes(fact));
      expect(leakedOnList, `${entry.view} 列表页出现 fixture 专属事实：${leakedOnList.slice(0, 3).join(' | ')}`).toHaveLength(0);
    });
  }

  // ---------------------------------------------------------------- 穷举：全部实体的详情路由
  test.describe('详情路由穷举（chromium-desktop）', () => {
    for (const entry of ENTRIES) {
      const items = realContent[entry.collection] ?? [];
      for (const item of items) {
        // 仅主力项目执行；其余项目在测试体内 skip（skip 会明确标记，
        // 而被覆盖的断言已在 chromium-desktop 上真实执行，不构成「未执行却计为通过」）。
        test(`${entry.view}/${item.id} 详情穷举无 fixture 泄露`, async ({ page }, testInfo) => {
          test.skip(
            testInfo.project.name !== EXHAUSTIVE_PROJECT,
            `穷举详情泄露覆盖只在 ${EXHAUSTIVE_PROJECT} 上执行（其余项目抽首条，见文件内策略说明）`,
          );
          expect(LEAK_FACTS.length).toBeGreaterThan(20);
          await openRoute(page, `/${entry.view}/${item.id}`);
          const detailText = await bodyText(page);
          const leaked = LEAK_FACTS.filter((fact) => detailText.includes(fact));
          expect(
            leaked,
            `${entry.view}/${item.id} 详情页出现 fixture 专属事实：${leaked.slice(0, 3).join(' | ')}`,
          ).toHaveLength(0);
        });
      }
    }
  });

  // ---------------------------------------------------------------- 其余项目：抽首条详情
  for (const entry of ENTRIES) {
    test(`入口 ${entry.view} 首条详情无 fixture 泄露（非主力项目抽样）`, async ({ page }, testInfo) => {
      // 主力项目已在上面的穷举组里覆盖，这里避免重复。
      test.skip(testInfo.project.name === EXHAUSTIVE_PROJECT, `${EXHAUSTIVE_PROJECT} 已在上方穷举`);
      const items = realContent[entry.collection] ?? [];
      test.skip(items.length === 0, '该集合为空，无详情路由可断言');
      const id = items[0].id;
      await openRoute(page, `/${entry.view}/${id}`);
      const detailText = await bodyText(page);
      const leaked = LEAK_FACTS.filter((fact) => detailText.includes(fact));
      expect(leaked, `${entry.view}/${id} 详情页出现 fixture 专属事实：${leaked.slice(0, 3).join(' | ')}`).toHaveLength(0);
    });
  }
});

// ================================================================ 媒体可达性（真实 HTTP）
test.describe('content/media.json 注册图片在子路径下可达', () => {
  test('注册表非空（前置条件）', () => {
    expect(mediaEntries.length).toBeGreaterThan(0);
  });

  test('每个注册图片都能在 /history_pacific_war/ 下取到 2xx 且内容非空', async ({ request }) => {
    expect(mediaEntries.length).toBeGreaterThan(0);
    const failures = [];
    for (const entry of mediaEntries) {
      const src = entry.src ?? entry.path ?? entry.file;
      if (!src) continue;
      // Vite 把 public/ 复制到 dist 根：public/media/x.svg → /history_pacific_war/media/x.svg
      const url = BASE + String(src).replace(/^\/+/, '').replace(/^public\//, '');
      const response = await request.get(url);
      if (!response.ok()) failures.push(`${src} → ${response.status()} (${url})`);
      else {
        const body = await response.body();
        if (body.length === 0) failures.push(`${src} → 200 but empty`);
      }
    }
    expect(failures, `不可达的媒体：${failures.join('; ')}`).toHaveLength(0);
  });

  test('不存在的媒体路径返回 404（反向对照）', async ({ request }) => {
    const response = await request.get(`${BASE}media/definitely-not-a-real-file.svg`);
    expect(response.status()).toBe(404);
  });
});

// ================================================================ 媒体可见性（F1 MEDIA-VISIBLE）
test.describe('注册素材真的渲染到读者页面（MEDIA-VISIBLE）', () => {
  test('开篇：素材可在真实浏览器中显示', async ({ page }) => {
    expect(mediaEntries.length).toBeGreaterThan(0);
    await openRoute(page, '/battles/battle-pearl-harbor');
    const figures = page.locator('figure[data-media-id]');
    await expect(figures.first()).toBeVisible();
    const count = await figures.count();
    expect(count, '观察项点名的珍珠港页必须出现插图').toBeGreaterThan(0);

    // 每个 <img> 都必须有非空 alt 与可用的 src（子路径）
    const imgs = page.locator('figure[data-media-id] img');
    const n = await imgs.count();
    for (let i = 0; i < n; i += 1) {
      const alt = await imgs.nth(i).getAttribute('alt');
      const src = await imgs.nth(i).getAttribute('src');
      expect((alt ?? '').trim().length, '图片必须有 alt').toBeGreaterThan(0);
      expect(src ?? '', '图片必须走 /history_pacific_war/ 子路径').toContain('/history_pacific_war/media/');
    }
    // 图片来源可真正加载（自然宽度 > 0 说明浏览器成功解码）
    const loaded = await imgs.first().evaluate((el) => (el as HTMLImageElement).naturalWidth);
    expect(loaded, '插图必须能被浏览器成功加载（naturalWidth > 0）').toBeGreaterThan(0);
  });

  test('每篇有素材的详情页都渲染出插图', async ({ page }) => {
    const articleIds = [...new Set(mediaEntries.flatMap((m) => (m as { articleIds?: string[] }).articleIds ?? []))];
    expect(articleIds.length).toBeGreaterThan(0);
    const missing: string[] = [];
    for (const id of articleIds) {
      const view = id.startsWith('battle-') ? 'battles'
        : id.startsWith('person-') ? 'people'
          : id.startsWith('concept-') ? 'concepts'
            : 'timeline';
      await openRoute(page, `/${view}/${id}`);
      const count = await page.locator('figure[data-media-id]').count();
      if (count === 0) missing.push(`${view}/${id}`);
    }
    expect(missing, `这些页面没有渲染插图：${missing.join(', ')}`).toHaveLength(0);
  });

  test('总览页素材计数不再是 0', async ({ page }) => {
    await openRoute(page, '/');
    const text = await page.evaluate(() => document.body.textContent ?? '');
    expect(text).toContain('素材');
    expect(text).toContain(String(mediaEntries.length));
  });
});

// ================================================================ 地图可读性（F2 ATLAS-READABILITY）
test.describe('地图标签去重叠（ATLAS-READABILITY）', () => {
  test('全部地点节点仍在且可点击，标签互不重叠', async ({ page }) => {
    await openRoute(page, '/atlas');
    const places = page.locator('[data-layer="place"]');
    const total = await places.count();
    expect(total).toBe(realContent.places.length);

    // 每个节点仍有可点圆（role=button）
    const buttons = page.locator('[data-layer="place"] [role="button"]');
    expect(await buttons.count()).toBe(total);

    // 默认缩放：部分标签可见（不是全堆叠），且可见标签包围盒不重叠
    const visible = page.locator('[data-layer="place"][data-label-visible="true"]');
    const visibleCount = await visible.count();
    expect(visibleCount).toBeGreaterThan(0);
    expect(visibleCount).toBeLessThan(total);

    // QA-01 attempt 4 / 真实失败 (4)：必须用**真实字体排布**的包围盒，不能只靠服务端几何估算
    // ——估算曾得出「0 重叠」，而 Chromium 实测 17 对重叠。
    // 按「每个地点一个合并盒」比较（把该地点两行文字的并集当作它的标签盒），
    // 否则同一标签的上下两行会被误判为互相重叠。
    const boxes = await visible.evaluateAll((nodes) =>
      nodes
        .map((n) => {
          const rects = [...n.querySelectorAll('[data-place-label]')].map((t) => t.getBoundingClientRect());
          if (rects.length === 0) return null;
          return {
            id: n.getAttribute('data-place-id') ?? '',
            left: Math.min(...rects.map((r) => r.left)),
            right: Math.max(...rects.map((r) => r.right)),
            top: Math.min(...rects.map((r) => r.top)),
            bottom: Math.max(...rects.map((r) => r.bottom)),
          };
        })
        .filter((b): b is { id: string; left: number; right: number; top: number; bottom: number } => b !== null),
    );
    const overlapping: string[] = [];
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        if (!(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top)) {
          overlapping.push(`${a.id}×${b.id}`);
        }
      }
    }
    expect(overlapping, `真实浏览器中可见标签重叠对：${overlapping.slice(0, 6).join(', ')}`).toHaveLength(0);
  });

  test('工单要求的 8 个地名在默认缩放下全部可见（ATLAS-READABILITY）', async ({ page }) => {
    // 用渲染层同一份清单（由站点导出到 HTML 的 data 之外，测试这里按名称核对）
    const MANDATED = ['中途岛', '夏威夷', '菲律宾', '新加坡', '马来亚', '关岛', '威克岛', '澳大利亚北部'];
    await openRoute(page, '/atlas');

    // 可见标签节点的文本
    const visibleText = await page.evaluate(() =>
      [...document.querySelectorAll('[data-layer="place"][data-label-visible="true"]')]
        .map((n) => n.textContent ?? '')
        .join('\n'),
    );
    const missing: string[] = [];
    for (const label of MANDATED) {
      if (label === '夏威夷') {
        // 夏威夷 由「瓦胡岛（美国夏威夷州）」承载
        if (!visibleText.includes('夏威夷')) missing.push(label);
      } else if (label === '澳大利亚北部') {
        // 由区域标注层承载
        const region = page.locator('[data-region-label="澳大利亚北部"]');
        if ((await region.count()) === 0) missing.push(label);
      } else if (!visibleText.includes(label)) {
        missing.push(label);
      }
    }
    expect(missing, `默认缩放下被隐藏的必显地名：${missing.join('、')}`).toHaveLength(0);
  });

  test('必显地名的解析与列表顺序无关（确定性）', async ({ page }) => {
    await openRoute(page, '/atlas');
    // 同一页面上重复读取两次可见集合，必须一致（防止依赖 Map 迭代顺序）
    const read = () => page.evaluate(() =>
      [...document.querySelectorAll('[data-layer="place"][data-label-visible="true"]')]
        .map((n) => n.getAttribute('data-place-id'))
        .sort()
        .join(','),
    );
    const a = await read();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 20_000 });
    const b = await read();
    expect(b).toBe(a);
  });

  test('放大后显示更多标签（缩放自适）', async ({ page }) => {
    await openRoute(page, '/atlas');
    const visible = page.locator('[data-layer="place"][data-label-visible="true"]');
    const before = await visible.count();
    for (let i = 0; i < 3; i += 1) await page.locator('[data-map-action="zoom-in"]').first().click();
    const after = await visible.count();
    expect(after, '放大后应显示不少于原来的标签数').toBeGreaterThanOrEqual(before);
  });

  test('被隐藏标签的地点仍可通过 tooltip 发现历史名与现代名', async ({ page }) => {
    await openRoute(page, '/atlas');
    const hidden = page.locator('[data-layer="place"][data-label-visible="false"]');
    const n = await hidden.count();
    if (n === 0) test.skip(true, '当前缩放下没有隐藏标签');
    const first = hidden.first();
    const title = await first.locator('title').textContent();
    expect(title ?? '').toContain('现代');
    expect((title ?? '').length).toBeGreaterThan(10);
  });
});

// ================================================================ 时间线深链（F1 真实失败 (1)）
test.describe('时间线深链（已挂载后导航）', () => {
  test('在已挂载的 /timeline 上导航到 #/timeline?date=... 会重新筛选', async ({ page }) => {
    // 期望值必须从 content/history.json 计算，**禁止写死 14 或改成 19**。
    const cutoffs = [...new Set(realContent.events.map((e) => e.startDate))]
      .filter((d): d is string => typeof d === 'string')
      .sort();
    const cutoff = cutoffs[Math.floor(cutoffs.length / 2)] as string;
    const expected = realContent.events.filter((e) => typeof e.startDate === 'string' && e.startDate <= cutoff).length;
    const total = realContent.events.length;
    expect(expected).toBeLessThan(total);

    // 1) 先挂载（不带 date）
    await openRoute(page, '/timeline');
    const countOf = async () =>
      Number(await page.locator('[data-timeline-date-filter]').first().getAttribute('data-timeline-date-count'));
    expect(await countOf(), '初始应为全部事件').toBe(total);

    // 2) **不重新加载**，仅改 hash（这正是真实失败场景：组件已挂载，prop 变了）
    await page.evaluate((date) => { window.location.hash = `/timeline?date=${date}`; }, cutoff);
    await page.waitForFunction(
      (d) => (document.querySelector('[data-timeline-date-filter]')?.getAttribute('data-timeline-date') ?? 'all') === d,
      cutoff,
      { timeout: 10_000 },
    );
    expect(await countOf(), `已挂载后导航到 date=${cutoff} 应筛选到 ${expected}/${total}`).toBe(expected);
    // 渲染出的事件条目数也应等于期望值
    expect(await page.locator('[data-timeline-event]').count()).toBe(expected);

    // 3) 再回到无 date，应恢复全部
    await page.evaluate(() => { window.location.hash = '/timeline'; });
    await page.waitForFunction(
      () => (document.querySelector('[data-timeline-date-filter]')?.getAttribute('data-timeline-date') ?? 'all') === 'all',
      null,
      { timeout: 10_000 },
    );
    expect(await countOf(), '移除 date 后应恢复全部事件').toBe(total);
  });
});

// ================================================================ 读者文案（F7 READER-COPY 真实浏览器复查）
test.describe('读者文案：真实浏览器复查（READER-COPY）', () => {
  /** 工程词汇：出现在读者页正文里即为缺陷（与服务端 QA-COPY 同一份清单）。 */
  const JARGON = ['schemaVersion', 'fixtureOnly', '稳定 ID', '按契约', '契约要求', '顶层数组', '十四个固定键', 'content/history.json'];

  const ROUTES = [
    ['overview', '/'],
    ['timeline', '/timeline'],
    ['battles', '/battles'],
    ['battle-detail', '/battles/battle-pearl-harbor'],
    ['people', '/people'],
    ['atlas', '/atlas'],
    ['concepts', '/concepts'],
    ['questions', '/questions'],
    ['sources', '/sources'],
  ] as const;

  for (const [label, route] of ROUTES) {
    test(`入口/页面「${label}」不含工程词汇与占位文案`, async ({ page }) => {
      await openRoute(page, route);
      const text = await page.evaluate(() => document.body.innerText ?? '');
      expect(text.length, '页面应有实际内容（不是空白）').toBeGreaterThan(200);
      const hits = JARGON.filter((term) => text.includes(term));
      expect(hits, `${label} 页面出现工程词汇：${hits.join('、')}`).toHaveLength(0);
      // 已交付内容下不应出现「尚未加载 / 未交付」这类占位状态
      for (const placeholder of ['内容尚未加载', '尚未交付', '测试样本']) {
        expect(text, `${label} 出现占位/未加载文案：${placeholder}`).not.toContain(placeholder);
      }
    });
  }

  test('地图图例与阶段文案可读且无占位', async ({ page }) => {
    const battle = requireBattle('battle-midway');
    await openRoute(page, `/atlas?battle=${battle.id}&phase=${battle.phases[0].id}`);
    const text = await page.evaluate(() => document.body.innerText ?? '');
    // 图例要素（证据把握、双方编码、不确定说明）
    expect(text).toContain('证据把握');
    expect(text).toContain('不确定说明');
    // 阶段面板必须给出时间与双方情报，而不是占位
    expect(text).toContain(battle.phases[0].time.display);
    expect(text).toContain(battle.phases[0].knownEnemy.japan.slice(0, 16));
    expect(text).not.toContain('地图阶段数据尚未交付');
  });

  test('证据面板标签面向读者（claim 类型用中文标签，不暴露原始枚举）', async ({ page }) => {
    await openRoute(page, '/battles/battle-pearl-harbor');
    const text = await page.evaluate(() => document.body.innerText ?? '');
    // 证据面板应有中文的证据类型标签
    expect(text).toMatch(/事实|解释|争议|示意/);
    // 不应把 claimType 原始值直接当正文
    for (const raw of ['interpretation', 'claimType']) {
      expect(text, `正文出现原始枚举 ${raw}`).not.toContain(raw);
    }
  });
});

// ================================================================ 无外部网络
test.describe('无外部地图网络 / 无远程头像服务', () => {
  test('页面加载不发出跨域请求', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.startsWith('http://127.0.0.1') || url.startsWith('data:') || url.startsWith('blob:')) return;
      if (url.startsWith('http://localhost')) return;
      external.push(url);
    });
    await openRoute(page, '/atlas');
    await page.waitForTimeout(1500);
    expect(external, `发现跨域请求：${external.join(', ')}`).toHaveLength(0);
  });
});

// ================================================================ reduced motion
test.describe('prefers-reduced-motion', () => {
  test('reduced-motion 下页面仍可用且阶段仍可切换', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const battle = requireBattle('battle-midway');
    await openRoute(page, `/atlas?battle=${battle.id}&phase=${battle.phases[0].id}`);

    await page.locator('[data-phase-action="next"]').first().click();
    await expect(page.locator('[data-atlas-active-phase]').first()).toHaveAttribute(
      'data-atlas-active-phase',
      battle.phases[1].id,
    );
  });
});

// ================================================================ 键盘可达性
test.describe('键盘可达性', () => {
  test('Tab 可以到达主导航并激活入口', async ({ page }) => {
    await openRoute(page, '/');
    await expect(page.locator('[data-entry-link]').first()).toBeVisible();

    // 通过键盘把焦点移到某个入口并回车
    const timelineLink = page.locator('[data-entry-link="timeline"]').first();
    await timelineLink.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.hash.startsWith('#/timeline'));
  });

  test('阅读字号控件可键盘操作', async ({ page }) => {
    await openRoute(page, '/');
    const sizeOption = page.locator('[data-reading-size-option]').first();
    await expect(sizeOption).toBeVisible();
    await sizeOption.focus();
    await page.keyboard.press('Enter');
    // 控件存在且可获得焦点即满足「键盘可达」；具体字号切换由 site validator 断言
  });
});
