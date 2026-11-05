# QQUEST-01 五大历史部分问题集终稿核对（question-coverage）

> 本文件是 QQUEST-01 的**只读核对记录与门禁证据**。结论：五部分均已满足内容验证器的问题覆盖门禁，
> **本任务不新增、不删除、不改写任何问题**；`content/history.json` 未改动。本任务 delta 只有本文件。

## 1. 第 0 步：只读核对（真实命令与输出）

在候选基线（已接受集成 + HIST-04 + MEDIA-02，HEAD `cf4ba1c`）上真实执行：

```text
$ node scripts/validate-content.mjs --stage full
DSH 太平洋战争教材内容验证
文件：C:\Users\caser\code\dsh-team\.state\worktrees\knowledge\content\history.json
根目录：C:\Users\caser\code\dsh-team\.state\worktrees\knowledge
阶段：full（最终硬门禁）
提示：本次未运行 --media；发布前必须单独运行素材门禁。
实体：93；来源：31；claim：282；问题：7；素材：0

警告：
- $.media: history.json 仍含空的 legacy media 数组（过渡窗口内仅警告）。迁移映射：把 history.json 顶层 media[] 原样搬到 content/media.json 的 { "version": 1, "media": [...] } 中（条目形状完全不变，articleIds 仍是文章关联），并删除 history.json 的 media 字段。 由 MEDIA-02 写入 content/media.json；HIST-04 不写；QA-01 运行 --media 校验；WEB-01/MAP-01 只读。

结果：PASS
说明：结构验证通过不等于可读性评审通过；可读性证据须见 tests/evidence/pedagogy.md。
退出码：0
```

- 真实退出码：**0**。
- 验证器实际输出的问题总数：**7**。
- 唯一警告是既有的 history 顶层空 `media` 数组迁移提示（属 MEDIA-02 迁移期提示，不是失败条件；`--media` 仍为 exit 0，见 §6）。

**独立的只读统计分析**（不依赖验证器内部实现，只按已接受契约字段重算；命令运行的是仓库内一次性只读脚本，输出摘要）：

```text
SCHEMA question.required = ["id","historicalPart","prompt","answer","entityIds","sourceIds","claimIds"]
SCHEMA historicalPart.enum = ["part-1-why-war","part-2-pearl-harbor","part-3-expansion","part-4-turning-point","part-5-midway"]
THRESHOLDS = {"questionMinimumAnswerHanChars":160,"questionMinimumEntityRefs":2,"fullRequiredQuestionParts":["part-1-why-war","part-2-pearl-harbor","part-3-expansion","part-4-turning-point","part-5-midway"]}
TOTAL questions = 7
BY PART = {"part-1-why-war":2,"part-2-pearl-harbor":1,"part-3-expansion":2,"part-4-turning-point":1,"part-5-midway":1}
partsWithZero = []
failingQuestions = []
allResolve = true
```

## 2. 计数口径（按现有契约字段，不自造字段）

| 项 | 事实 / 依据 |
|---|---|
| 归属字段 | `content/history.json` 每条 question 的 **`historicalPart`**。该字段是 `contracts/content.schema.json` `$defs.question.required` 的**必填字段**（required = `["id","historicalPart","prompt","answer","entityIds","sourceIds","claimIds"]`）。 |
| 取值枚举 | `$defs.question.properties.historicalPart.enum` = `["part-1-why-war","part-2-pearl-harbor","part-3-expansion","part-4-turning-point","part-5-midway"]`，恰好是五个历史部分 ID。 |
| 覆盖判定 | 验证器 `questionMeetsCoverage()`：answer 汉字数 ≥ `coverage.questionMinimumAnswerHanChars` = **160**；唯一 `entityIds` ≥ `coverage.questionMinimumEntityRefs` = **2**；唯一 `sourceIds` ≥ **1**；唯一 `claimIds` ≥ **1**；且所有 ID 都能在索引中解析。 |
| full 阶段 | `coverage.stages[full].requiredQuestionParts` = `["part-1-why-war","part-2-pearl-harbor","part-3-expansion","part-4-turning-point","part-5-midway"]`，即五部分都必须至少有一个满足覆盖的问题。 |
| 结论 | 契约**已有**显式归属字段，因此**不需要**（也不允许）按“关联事件或导读实体”推断，亦**不得自造**契约字段；本记录直接使用 `historicalPart`。 |

## 3. 五部分前后计数（基线 vs 本任务后）

“前”= 第 0 步只读基线；“后”= 本任务提交候选（`content/history.json` 未改动）。两者**相同**，因为 Step 0 未发现真实缺口。

| 历史部分 | `historicalPart` | 前（基线） | 后（提交候选） | 门禁状态 |
|---|---|---:|---:|---|
| 第 1 部分：战争为什么爆发 | `part-1-why-war` | 2 | 2 | ✅ 已满足 |
| 第 2 部分：珍珠港与战争爆发 | `part-2-pearl-harbor` | 1 | 1 | ✅ 已满足 |
| 第 3 部分：日本的快速扩张 | `part-3-expansion` | 2 | 2 | ✅ 已满足 |
| 第 4 部分：战局开始发生变化 | `part-4-turning-point` | 1 | 1 | ✅ 已满足 |
| 第 5 部分：中途岛海战 | `part-5-midway` | 1 | 1 | ✅ 已满足 |
| **合计** | — | **7** | **7** | 验证器实际输出问题总数 **7** |

## 4. 逐题核对表（7 题）

| question id | `historicalPart` | answer 汉字 | entityIds（唯一） | sourceIds（唯一） | claimIds（唯一） | 覆盖判定（含 ID 解析） |
|---|---|---:|---:|---:|---:|---|
| `question-why-japan-chose-war` | `part-1-why-war` | 534 | 4 | 4 | 8 | ✅ 满足 |
| `question-why-pearl-harbor-unprepared` | `part-1-why-war` | 404 | 3 | 2 | 2 | ✅ 满足 |
| `question-why-pearl-tactical-strategic` | `part-2-pearl-harbor` | 332 | 4 | 3 | 7 | ✅ 满足 |
| `question-why-allies-lost-early` | `part-3-expansion` | 623 | 5 | 3 | 9 | ✅ 满足 |
| `question-why-japan-overextended` | `part-3-expansion` | 531 | 9 | 4 | 7 | ✅ 满足 |
| `question-why-coral-sea-judged-differently` | `part-4-turning-point` | 254 | 4 | 2 | 6 | ✅ 满足 |
| `question-did-midway-change-initiative` | `part-5-midway` | 291 | 4 | 3 | 6 | ✅ 满足 |

补充核对（独立脚本）：7 题的题干都以问号（？）结尾；`historicalPart` 全部落在五值枚举内；7 题的 `entityIds` / `sourceIds` / `claimIds` **全部解析成功**（`allResolve = true`）。所有题目的 answer 汉字数在 254–623 之间，均高于门槛 160；entity 数在 3–9 之间，均 ≥2；source 数在 2–4 之间，均 ≥1；claim 数在 2–9 之间，均 ≥1。

## 5. 新增问题清单

**无（none）。** 第 0 步核对未发现“某部分为空”或“问题缺答案/claim/来源定位或引用断链”的真实缺口，因此按验收要求不新增任何问题、不为“显得有改动”而制造低质量问题，也不删改既有问题。

本任务 delta：仅新增本文件 `docs/research/question-coverage.md`；`content/history.json` **零改动**（`git diff --name-only` 为空，见 §6）。

## 6. 记录检查（本任务提交候选上的真实输出）

```text
$ node scripts/validate-content.mjs --stage full
… 实体：93；来源：31；claim：282；问题：7；素材：0
结果：PASS
退出码：0

$ node scripts/validate-content.mjs --media
… 素材注册表：content/media.json（22 个条目）
结果：PASS
素材门禁：通过；重点文章 19/19 具有所需类型素材。
退出码：0

$ node scripts/validate-content.mjs --check-contracts
结果：PASS（契约文件一致；这不代表 content/history.json 已交付）
退出码：0
```

- `git status --porcelain`：仅 `?? docs/research/question-coverage.md`（本任务唯一 delta）；`git diff --name-only` 为空 → 无任何已跟踪文件（含 `content/history.json`）被修改。
- 未修改契约、验证器、`src`、`tests`、`public/` 或 `content/media.json`；未使用 `--file`；未删除或跳过任何检查。

## 7. 后续缺口（不属于本任务，未修复）

| 缺口 | 证据 / 归属 | 本任务处理 |
|---|---|---|
| `person-yamamoto-isoroku` 档案缺“当时不知道什么”要素 | HIST-04 已接受日志 `docs/research/midway-sources.md` §5.3（约 L118、L122）明确记录：山本档案“当时不知道什么：**仍缺**……该项归 **DOC-02** 复核补写” | **不修复**。这是人物档案深度项，不在本任务的问题集范围；且山本档案是既有已接受内容，本任务不得改写既有历史正文。登记为 **DOC-02** 拥有的开放项。 |
| 问题集合的跨部分计数终稿核对 | 本任务（QQUEST-01） | 已在本文件完成：五部分覆盖、逐题覆盖判定、前后计数与门禁证据齐全；**无问题缺口需要补写**。 |

> 说明：本任务不把 QQUEST-01 之外的后续工作写成“已修复”；除上表登记的 DOC-02 项外，问题集本身在内容验证器的实际口径下五部分均已满足。
