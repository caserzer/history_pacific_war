/**
 * 媒体插图（QA-01 attempt 2 / 观察项 MEDIA-VISIBLE 修正）。
 *
 * 背景：`content/media.json` 注册了 22 个素材，但站点此前**从未渲染**任何一张
 * （`src` 下没有任何 `<img`/figure 代码），读者只能看到文字。文件存在 + HTTP 可达
 * 不等于读者可见——本组件把注册素材真正放到读者页面上。
 *
 * 合规要求（test-goal.md §5.4 / MEDIA-LICENSE）：
 * - 每张图必须有 `alt`（屏幕阅读器）、`caption`（说明）与**作者 + 许可**署名；
 * - 路径约定：注册表存 `public/media/x.svg`，公开 URL 是 base 下的 `media/x.svg`
 *   （Vite 把 `public/` 内容复制到产物根）；
 * - 只读消费注册表，不编造任何素材或史实。
 */
import type { MediaAsset } from '../data/types';

/**
 * GitHub Pages 仓库子路径。
 *
 * 为什么不从 `vite.config.ts` 导入：那是**构建期配置文件**，把它拉进客户端 bundle
 * 会连带打包 `defineConfig`/插件链，是明确的坏做法。这里用一个与 `vite.config.ts`
 * 的 `BASE_PATH` 一致的本地常量，并由站点验证器断言两者相同（防止静默漂移）。
 */
export const SITE_BASE_PATH = '/history_pacific_war/';

/**
 * 注册表里的仓库路径 → 站点公开 URL。
 * `public/media/x.svg` → `/history_pacific_war/media/x.svg`。
 */
export function mediaPublicUrl(path: string): string {
  const cleaned = String(path ?? '').replace(/^\/+/, '');
  const withoutPublic = cleaned.startsWith('public/') ? cleaned.slice('public/'.length) : cleaned;
  return `${SITE_BASE_PATH}${withoutPublic}`;
}

/** SVG 用 `<img>` 引用同样可行（且能保留 alt 与懒加载语义），统一走 `<img>`。 */
function MediaFigure({ asset, variant = 'article' }: { asset: MediaAsset; variant?: 'article' | 'thumbnail' }) {
  const src = mediaPublicUrl(asset.path);
  const creditParts = [asset.author, asset.license === 'original-work' ? '本站原创' : asset.license]
    .filter((part) => Boolean(part && String(part).trim()))
    .join(' · ');

  return (
    <figure className={`pw-figure pw-figure--${variant}`} data-media-id={asset.id} data-media-type={asset.mediaType}>
      <img
        src={src}
        alt={asset.alt}
        loading="lazy"
        decoding="async"
        {...(asset.width ? { width: asset.width } : {})}
        {...(asset.height ? { height: asset.height } : {})}
      />
      <figcaption className="pw-figure__caption">
        <span className="pw-figure__caption-text" data-media-caption="">
          {asset.caption}
        </span>
        <span className="pw-figure__credit" data-media-credit="">
          {creditParts}
          {asset.licenseUrl ? (
            <>
              {' '}
              <a href={asset.licenseUrl} rel="noopener noreferrer" target="_blank">
                许可
              </a>
            </>
          ) : null}
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * 取与某篇文章关联的素材。
 *
 * `articleIds` 是媒体 → 文章的关联（契约字段）。为了兼容「素材挂在事件/战役上」的
 * 两种写法，这里同时接受传入的候选 ID 列表并做交集，保持单一数据源。
 */
export function mediaForArticle(media: ReadonlyMap<string, MediaAsset> | undefined, articleIds: readonly string[]): MediaAsset[] {
  if (!media || media.size === 0) return [];
  const wanted = new Set(articleIds.filter(Boolean));
  if (wanted.size === 0) return [];
  const out: MediaAsset[] = [];
  for (const asset of media.values()) {
    const refs = Array.isArray(asset.articleIds) ? asset.articleIds : [];
    if (refs.some((id) => wanted.has(id))) out.push(asset);
  }
  // 稳定排序：按 id，避免 map 迭代顺序变化导致渲染抖动
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

/** 一组插图；没有关联素材时不渲染任何东西（不留空壳）。 */
export function MediaGallery({
  media,
  articleIds,
  variant = 'article',
}: {
  media: ReadonlyMap<string, MediaAsset> | undefined;
  articleIds: readonly string[];
  variant?: 'article' | 'thumbnail';
}) {
  const assets = mediaForArticle(media, articleIds);
  if (assets.length === 0) return null;
  return (
    <div className="pw-figures" data-media-gallery="" data-media-count={assets.length}>
      {assets.map((asset) => (
        <MediaFigure key={asset.id} asset={asset} variant={variant} />
      ))}
    </div>
  );
}

export { MediaFigure };
