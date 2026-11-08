# 媒体注册表结构修正说明（media-contract-correction）

> 2026-11-08 增补：注册表形状仍为 v1；`portrait` 可关联任意已存在的人物，其他媒体仍限重点文章。原有重点文章覆盖要求不变。当前 31 项素材及 14 张真实人物照片的登记见 [historical-portraits.md](historical-portraits.md)；下文的 22 项计数是原始迁移快照。

> 归属：MEDIA-02。本文件只**说明**已接受文档中的媒体结构矛盾、正确结构、`content/history.json` 遗留
> 顶层 `media` 字段到 `content/media.json` 的迁移映射与归属；**不在 `contracts/` 或 `src/` 内写入，也不编辑
> `content/history.json`**（HIST-04 已冻结为只读）。

## 1. 已接受文档中的矛盾（逐处引用）

| 位置 | 原文要点 | 与何种内容矛盾 |
|---|---|---|
| `contracts/README.md` §2「数据顶层」（约 L89–L113，尤其 L105） | 把 `"media": []` 列为 `content/history.json` 根节点“包含且仅包含”的十一个顶层数组之一 | 与本 README §6.1、schema 与验证器“history 顶层 media 已废弃/被拒绝”的规则矛盾 |
| `contracts/README.md` §6.1「媒体注册表迁移到 `content/media.json`（ARCH-02 R4）」（约 L530–L553） | 素材条目**不再**放在 `content/history.json` 顶层 `media`，而是独立 `content/media.json`；L550「history.json 顶层 media **含条目**即被拒绝」；L551 空的 legacy `media` 数组只产生警告 | 与 §2 把 `media` 继续列为 history 顶层数组直接矛盾 |
| `contracts/content.schema.json` | 根 `properties.media` 标记 `deprecated: true`，描述要求迁移到 `content/media.json`（`$defs.mediaRegistry`）；`$defs.mediaRegistry = {version:1, media:[...]}` | 与 §2 的顶层数组示例矛盾；schema 才是机器可执行的事实来源 |
| `scripts/validate-content.mjs`（约 L2944–L2965、L6692–L6716、L2808–L2848） | history 顶层 `media` 含条目/非法形状 → 具名错误；空数组 → 仅警告（过渡）。`--media` 读取 `content/media.json`，先做注册表结构校验，再按 `requiredMediaTypes` 逐篇检查并验证文件真实存在且非空 | 与 README §2 示例矛盾；这是 `--media` 的实际语义 |

**结论**：以 **schema + 验证器** 为机器可执行的事实来源——媒体注册只存在于 `content/media.json`；`content/history.json` 的顶层 `media` 已废弃。README §2 的示例是过时描述，不应被当作可继续在 history 顶层登记媒体的依据。

## 2. 正确结构

`content/media.json`：

```json
{
  "version": 1,
  "media": [
    {
      "id": "media-...",
      "title": "...",
      "mediaType": "photograph | portrait | battle-map | map | diagram | illustration | timeline-diagram",
      "path": "public/media/<file>",
      "author": "...",
      "license": "public-domain | cc0-1.0 | cc-by-4.0 | cc-by-sa-4.0 | original-work | permission-granted",
      "licenseUrl": "…（permission-granted 时必填；其余可选）",
      "rightsStatement": "...",
      "sourceId": "已存在于 content/history.json 的来源 ID",
      "sourcePage": "…（可选）",
      "creditLine": "...",
      "alt": "...",
      "caption": "...",
      "width": 1200,
      "height": 800,
      "articleIds": ["必须是 contracts/coverage.json 的 keyArticleIds"]
    }
  ]
}
```

根节点**只允许** `version` 与 `media` 两个字段；`version` 必须为 `1`；条目不得含 schema 未声明的字段。

## 3. 迁移映射（history.json 遗留 `media` → content/media.json）

| 项 | 规则 / 当前实测 |
|---|---|
| 搬运规则 | 把 `content/history.json` 顶层 `media[]` 的条目**原样**搬到 `content/media.json` 的 `media[]`；条目形状完全不变；`articleIds` 仍表示重点文章关联 |
| 完成后 | 从 `content/history.json` **删除**顶层 `media` 字段；该字段一旦含条目即被验证器拒绝 |
| 当前实测 | `content/history.json` 顶层 `media` = `[]`（**0 条**），因此没有条目需要搬运；MEDIA-02 已首次交付 `content/media.json`（**22 条**），覆盖 19 篇 / 22 槽位 |
| 遗留字段处理 | 因本任务**不得编辑** `content/history.json`（HIST-04 冻结），其空 `media` 字段保留；验证器对空数组**只产生迁移 warning**，不是 `--media` 的失败条件（本轮 `--media` 实测 exit 0）。该字段的删除应留给后续获准编辑 history 的任务/集成步骤，且删除前无需新契约任务 |
| 无条目可搬的证明 | `content/history.json` 的 `media` 长度为 0；`content/media.json` 已独立存在 22 条；二者不冲突 |

## 4. 归属与消费方

| 角色 | 职责 |
|---|---|
| **MEDIA-02** | 写 `content/media.json` 与 `public/media/`；首次交付注册表；本说明的作者 |
| **HIST-04** | 不写 `content/media.json`；不改写历史正文/claims/Questions |
| **QA-01** | 运行 `node scripts/validate-content.mjs --media`，并在构建产物中实际断言图片可达 |
| **WEB-01 / MAP-01** | 只读消费注册表与素材，不在运行时依赖外部下载 |

## 5. 本轮核对证据（真实输出摘要）

- `node scripts/validate-content.mjs --media` → `素材注册表：content/media.json（22 个条目）` … `结果：PASS` / `素材门禁：通过；重点文章 19/19 具有所需类型素材。` → **exit 0**。
- `content/media.json` 根字段恰为 `{version, media}`；22 条、ID 唯一、路径唯一。
- `public/media/` 下 22 个文件，每个文件恰有一条注册、路径大小写一致、文件非空。
- 22/22 槽位命中；`sourceId` 全部解析到已接受来源；`articleIds` 全部是 coverage 重点文章。
