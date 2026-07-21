# 文档上传 → AI 自动生成记忆卡片 · 开发纪要（filetoCard.md）

> 记录「背了吗」App 中「上传 md/docx/pdf → AI 生成记忆卡片 → 进入 SRS 学习流」这一功能，
> 从设计动机、关键决策、踩过的坑到边界条件的完整过程。供后续维护与二次开发参考。

---

## 1. 功能动机

- **核心诉求**：让用户把已有的学习资料（面试八股、笔记、讲义）直接变成可背诵的闪卡，而不是手动一张张录入。
- **最小侵入原则**：最大化复用现有能力（SRS 算法、云同步、题库筛选、学习队列），最小化对既有架构的改动。
- **一句话流程**：上传文件 → 前端解析成纯文本 → 分块调 LLM 生成 `Question[]` → 写入现有 `store.custom` → 直接进入现有 SRS 学习流。**原始文件不落地**，只留元数据指纹用于去重。

---

## 2. 整体架构与数据流

```
[选择文件]
  → 校验（类型/大小）
  → 解析为纯文本（docParser：md 直读 / docx 用 mammoth / pdf 用 pdfjs）
  → 计算内容 hash + 跨格式指纹 → 命中已导入则拦截
  → 分块（chunker：优先 Markdown 标题，否则空行段落，token 兜底切分）
  → 阶段一：LLM 产出受控分类清单（优先复用题库现有分类）
  → 阶段二：并发逐块 LLM 生成卡片 → JSON 容错解析 → 字段兜底净化
  → 卡片级去重（题干归一化）
  → 原子写入 store.custom（一次 dispatch）+ 写入 DocMeta
  → 进入现有 SRS：待复习 / 新题队列 / 题库筛选 / 统计口径
```

### 涉及文件
- `src/utils/docParser.ts`：文件解析、内容 hash、跨格式指纹、`toHex` polyfill、pdfjs 主线程加载。
- `src/utils/chunker.ts`：语义分块。
- `src/utils/cardGen.ts`：两阶段归类、并发生成、JSON 容错、字段净化、分类收敛。
- `src/utils/kimi.ts`：新增 `chatOnce`（非流式结构化调用），复用既有 API 常量。
- `src/components/UploadSheet.tsx`：上传 UI + 编排 pipeline + 中断能力。
- `src/components/LibraryPage.tsx` / `library/LibFilterMenu.tsx`：题库（Deck）筛选、删除、更新入口。
- `src/components/home/DeckPicker.tsx` / `TodayCard.tsx` / `GoalPicker.tsx`：今日学习题库范围、目标设置。
- `src/store.tsx` / `src/types.ts` / `src/api.ts`：数据模型、reducer、云同步。

---

## 3. 数据模型决策

### 3.1 卡片 id 命名空间（最高优先级隐患）
- `Question.id` 保持 `number` 类型（改 string 会波及 `getCardState`/`buildQueue`/`rateCard` 等大量签名，代价过高）。
- 内置题库 id 来自云端数据库自增整数；生成卡片若随手分配数字 id 极易与之撞车 → 两张不同卡共享同一份掌握度、状态串号。
- **方案**：生成卡片 id = `CUSTOM_ID_BASE(10 亿) + 单调递增序号`，序号基于当前 `store.custom` 在 reducer 内计算（`nextCustomIdBase`），**禁止用 `Date.now()`/`Math.random()` 直接当 id**（避免并发/重复触发碰撞）。

### 3.2 Question 扩展（全部可选，向前兼容）
- `source?: { docId, docName }`：卡片来源文档。
- `deckId?: string`：逻辑牌组 id，= `source.docId`。
- 老数据/云端题库无这些字段，读取为 `undefined`，不影响现有逻辑。

### 3.3 DocMeta（文档元数据，原始文件不落地）
```
DocMeta { docId, name, type, hash, fingerprint?, cardCount, categories, createdAt }
```
- `hash`：解析后纯文本 SHA-256，用于**同一文件**精确去重。
- `fingerprint`：归一化后 SHA-256，用于**跨格式**去重（docx/md 判同一份），可选、兼容老数据。

### 3.4 Store 扩展
- `documents?: DocMeta[]`、`deletedDocs?: string[]`（删除墓碑）。
- 持久化：localStorage `beile_ma_v3`（新增可选字段，不破坏既有结构）+ 云端 `user_progress` 新增列 `documents_json` / `deleted_docs_json`，仿 `achievements_json` 兼容范式（老库无此列读回 `undefined`，reducer 侧兜底）。

---

## 4. 踩过的坑（重点）

### 4.1 pdfjs-dist v6 依赖 `Uint8Array.prototype.toHex`（导致 PDF 全挂）
- **现象**：上传 PDF 报 "PDF 解析失败，文件可能已损坏或加密"，实际控制台是 `a.toHex is not a function`。
- **根因**：pdfjs-dist 6.x 内部用了很新的 TC39 提案 API `Uint8Array.prototype.toHex`，目标浏览器/WebView（甚至 Node v22）不支持。
- **修复三管齐下**：
  1. 补 `Uint8Array.prototype.toHex`（含 `fromHex`/`setFromHex`）polyfill；
  2. **让 pdfjs 在主线程运行（fake worker）而非独立 Worker** —— 因为 polyfill 只存在于主线程，独立 Worker 是隔离环境拿不到 polyfill 会再次抛错。做法：把 worker 模块导入并挂到 `globalThis.pdfjsWorker`，触发 pdfjs 的主线程模式（见 pdf.mjs `#mainThreadWorkerMessageHandler`）。顺带根除了 worker 文件 URL 在部署 `base` 下 404 的隐患；
  3. 错误提示不再一刀切：`console.error` 原始错误 + 按类型细分（加密/组件加载失败/损坏/其他）。
- **教训**：catch 里"统一兜底文案"会掩盖真实错误，排障时先把原始错误暴露出来。

### 4.2 catch 吞错，"文件损坏" 是伪信号
- 旧代码 `catch { throw new Error('文件可能已损坏或加密') }` 把 worker 加载失败、版本不匹配、真损坏全归为一类。
- **教训**：解析类错误必须保留/打印原始 error，并把可诊断信息（如"共 N 页 / 文本对象 M 个"）透传到前端提示，方便非技术用户反馈。

### 4.3 同一份文档 docx 与 md 生成卡片数差异巨大（63 vs 34）
- **根因**：`chunker` 有分叉——`.md` 保留 `#` 标题 → 走 `splitByHeadings`（少而大的块）；`.docx` 经 mammoth `extractRawText` 转纯文本，**`#` 标题语法丢失** → 走 `splitByParagraphs`（多而碎的块）。块数决定 LLM 调用次数，块越多卡越多。
- **放大因素**：mammoth 的空行/换行处理、有序列表自动编号、LLM temperature 非确定性。
- **结论**：这是"解析层丢失标题结构 + 分块策略分叉"的固有差异，非 bug。**建议对同一份内容固定用一种格式**上传。

### 4.4 跨格式重复文档判不出（docx 传了，md 又能传）
- **根因**：原去重对"解析后纯文本"算 SHA-256，docx/md 解析文本不同 → hash 不同 → 判不出同一份。
- **方案 A（采用）**：新增**归一化内容指纹** `fingerprint`——归一化（去 Markdown 符号 / 去所有空白 / 去标点 / 转小写）后算 SHA-256。去重时优先按 `fingerprint`（跨格式），老数据无指纹回退按 `hash`（精确）。
- **鲁棒性取舍（已确认接受）**：能拦"纯格式差异"，但若 docx 转换丢了个别字符，归一化后仍差几个字符 → 极端漏判。方案 B（SimHash/MinHash 相似度）过度设计，未采用。
- **历史数据坑**：功能上线前上传的 docx 那条 DocMeta **没有 fingerprint**，判重回退到 hash，跨格式必然漏判。老数据无法补算指纹（原始文本没存）。→ 只对**上线后上传的文档**跨格式生效；旧数据需删除重传。

### 4.5 删除题库后又"复活"（MERGE_CLOUD 并集合并）
- **根因**：`MERGE_CLOUD` 是并集合并（云端有、本地没有的补回）。直接改 localStorage 删除、又没写墓碑时，下次登录会把已删题库从云端旧数据合并回来。
- **方案（tombstone 墓碑）**：`Store.deletedDocs` 记录已删 docId，随 localStorage + 云端 `deleted_docs_json` 持久化；`REMOVE_DOCUMENT` 写墓碑；`MERGE_CLOUD` 合并前用两端墓碑并集**主动过滤**云端 custom/documents，杜绝复活。
- **教训**：手写脚本删数据绕过了正规 `REMOVE_DOCUMENT`，不写墓碑 → 复活。**删除务必走 UI（`REMOVE_DOCUMENT`）**。

### 4.6 生成太慢 + AI 429 限流
- **慢**：19KB 文档切 16 块，逐块**串行** await LLM，总耗时 ≈ 16 × 单次。
- **优化**：① 并发池（`GEN_CONCURRENCY`）；② 增大分块（`CHUNK_MAX_TOKENS` 1500→2500）减少块数。总耗时降到约 1/4~1/5。
- **429 限流**：并发拉高后撞 Moonshot 速率限制。→ 并发度回调到 **2**；`chatOnce` 解析 `Retry-After` 头；`chatWithRetry` 最多 3 次退避（优先 `Retry-After`，否则 1s→2s→4s + 抖动），退避等待响应 abort。
- **教训**：并发要配退避 + 尊重 `Retry-After` + 抖动，否则重试会二次撞限流；被限流"跳过块"会静默丢内容。

### 4.7 切换底部导航后题库筛选被重置
- **根因**：筛选状态是 `LibraryPage` 内的 `useState`，`{page==='library' && <LibraryPage/>}` 条件渲染，离开页面组件**卸载** → state 销毁。
- **修复**：筛选状态（search/filterType/filterSub/onlyFav/deckScope）提升到 `App.tsx`（`libFilter`），`LibraryPage` 改受控。切导航保留，刷新页面（App 重建）才重置——正好符合"除非刷新才重置"。

### 4.8 删除题库污染今日进度口径
- **根因**：`getTodayProgress` 的 `reviewIds`/`dueIds` 可能残留已删卡 id，导致 `reviewTotal`/`reviewDone` 虚高。
- **修复**：用当前题库 id 集 `currentLibIds` 剔除孤儿 id 再算。

### 4.9 只有标题、正文为空的文档也能生成卡片（AI 幻觉）
- **现象**：上传"只有标题、正文为空"的 PDF（或类似文档）仍能成功生成一堆带问题和答案的卡片。
- **根因（两层）**：
  1. **空态没拦住**：`parseFile` 只判"完全提取不到文本"，而标题也是文本 → 通过；PDF 无 Markdown `#` 结构，`chunker` 走"按段落分块"，**标题文字被当成正文段落** → 有块 → 进入生成。
  2. **AI 幻觉**：标题词本身是有意义的知识点关键词（如"闭包""事件循环"），即使正文为空，LLM 也会调用自身先验知识**围绕标题词编出整套问答**。对模型而言"标题词=给定文本的一部分"，主观上不认为在"编造文本没提到的"，故防幻觉 prompt 挡不住。
    - 后果：这些卡片不来自用户文档、违背"把你的资料变成卡片"初衷；若标题涉及非通用内容，AI 会编错。
- **修复（三道防线）**：
  1. **文档级空态校验**（`UploadSheet.tsx`）：解析后 `text` 去空白字符数 `< MIN_DOC_CONTENT_CHARS(=20)` → 提示「当前文档为空」，直接终止，不调 AI、不生成。
  2. **块级正文校验**（`cardGen.ts` `processChunk`）：单块 `content` 去空白 `< MIN_CHUNK_CONTENT_CHARS(=12)` → 视为"只有标题、无正文"，**跳过不喂 AI**（不算失败块）。从源头杜绝"标题党"块生成卡。
  3. **强化 prompt**（`cardGen.ts` system prompt 第 6 条）：明确要求"若给定文本只是标题/目录/关键词而无实质讲解内容，**绝对不要根据标题自行补充已知知识编造问答，必须返回 `[]`**"。作为软兜底。
- **阈值取舍**：`MIN_DOC_CONTENT_CHARS=20` / `MIN_CHUNK_CONTENT_CHARS=12` 偏保守，主要拦"只有一两个短标题"。标题很长时可能漏过（可调大）；真实短文档可能误拦（可调小）。均为 `types.ts` 常量，易调。
- **教训**：解析层"非空"不等于"有有效正文"；对"关键词/标题"类输入，LLM 极易幻觉，**硬校验（不喂 AI）比 prompt 约束更可靠**，两者叠加最稳。

---

## 5. 关键边界条件

### 5.1 文件与解析
| 场景 | 处理 |
|---|---|
| 不支持的类型 | 校验拒绝；`.doc` 单独提示转 `.docx`（浏览器无可靠纯前端 .doc 解析） |
| 文件 > 5MB（`MAX_FILE_SIZE`） | 拒绝并提示 |
| 扫描版 / 图片型 PDF（文本对象=0） | 提取为空 → 提示"未能提取到文本"，无法生成（不做 OCR）。提示带"共 N 页/文本对象 M 个"辅助判断 |
| 空文档 / 只有标题正文为空 | 解析后去空白 < `MIN_DOC_CONTENT_CHARS(20)` → 提示「当前文档为空」，不调 AI、不生成（见 §4.9） |
| PDF 加密 / 损坏 | 捕获细分提示，不产生卡片 |
| 提取文本为空 | 终止，不生成 |
| 超长文档（> `MAX_CHUNKS=40` 块） | 只处理前 40 块并明确提示"仅处理前部分内容" |

### 5.2 分类体系（§归类红线）
- `cat` **恒为知识点分类，绝不填文档名**（否则破坏题库筛选与分类掌握度）。文档归属由 `source.docId` 承载（两级：文档→分类）。
- **两阶段归类**：阶段一先产出受控清单（5~12 个，`DOC_CAT_MIN`~`DOC_CAT_MAX`；短文档允许 <5，不强行凑数；上限硬约束防爆炸）；阶段二每张卡的 `cat` 只能从清单选。
- **复用现有分类**：阶段一喂入 `allCards()` 现有 `cat` 清单，命中即一字不差复用；阶段二/后处理二次校准（同义/大小写/空白归一）。
- **兜底**：越界 cat 就近映射，失败入「其他」（`DOC_CAT_FALLBACK`）；孤儿分类（仅 1 张卡）超 `ORPHAN_CAT_MERGE_THRESHOLD` 并入「其他」。收敛后回写 `DocMeta.categories` 与各卡 `cat` 保持一致。

### 5.3 生成与去重
| 场景 | 处理 |
|---|---|
| 单块 LLM 返回非法 JSON | 该块跳过计入 `failedChunks`，不中断整体 |
| 全部块失败 | 报错终止，不写空数据 |
| 部分块成功 | 写入成功卡片（可接受的部分成功） |
| 生成 0 张有效卡 | 不写入并提示 |
| 字段缺失 | `q`/`a` 空 → 丢卡；`summary`/`pitfalls` → `''`；`keywords`/`interview` 非数组 → `[]`；`diff` 非 1~3 → 2 |
| 文档级去重 | 优先 `fingerprint`（跨格式），回退 `hash`；命中拦截 |
| 卡片级去重 | 题干归一化（去标点/空白/小写）与全库比对，完全相同跳过（MVP 不做相似度） |
| 原子性 | 全部块处理完一次性 dispatch 写入；中途失败/中断则一张都不写 |
| 用户中断 | 「取消生成」/ 关闭 Sheet → AbortController 终止在途请求；dispatch 前再查 `signal.aborted` 防写半成品 |

### 5.4 未登录 / 离线
- 上传生成在未登录也可用（卡片进 localStorage），登录后由 `MERGE_CLOUD` 合并上云。
- AI 调用需要网络；无网报错「AI 服务暂不可用」。
- 非安全上下文（`crypto.subtle` 不可用）→ hash 降级为简单字符串 hash，不阻断。

### 5.5 云同步 / 多端（方案 A）
- 写：任何 store 变化 2s 防抖后**全量覆盖**写云端。
- 读：登录时拉一次 + **标签页重新可见 / 切回首页时主动拉**（15s 节流），走 `MERGE_CLOUD` 合并（本地打底、云端补充更新项，不覆盖本地未同步改动）。
- 防乒乓：`MERGE_CLOUD` 合并结果与本地无实质变化时不替换 store，避免无谓写回。
- 未做：实时订阅（方案 C）、写前合并 + 乐观锁（方案 B）。双端同秒改同一数据仍是"按 lastReview/studied 取新"的最终一致。

---

## 6. 学习流集成

### 6.1 排序：生成卡置顶 + 优先学
- `allCards()` 改为 `[...sortedCustom, ...questions]`，custom 按上传时间新→旧。
- 题库展示与 `buildQueue('all')` 同时获得"新卡在前"。
- **复习优先红线不破坏**：`review-due` 队列与 `canStartNew` 不动——复习没清空前新题（含新上传卡）不解锁。"优先学新卡"只作用于新题内部顺序。

### 6.2 今日学习题库范围（Deck 选择）
- `learnDeckScope`（''=全部题库，默认；持久化 `beile_learn_deck`），`buildQueue('all')` 按范围过滤。
- 首页 TodayCard 加「设置题库」按钮 → `DeckPicker`；已完成/进行中时与「设置目标」一致的锁定提醒。
- 当前学习题库被删除时自动回退到「全部题库」。

### 6.3 目标设置
- GoalPicker 加自定义输入（1~50，`<1` 提示"目标必须大于1哦"，`>50` 提示"今日目标不能超过50哦"）。
- 目标超过当前题库题数时提醒（不硬阻断，再次确认放行）。

### 6.4 统计与成就
- StatsPage 按来源（Deck）分区展示掌握度，避免上传其他领域文档稀释「内置题库」掌握率；`getCategoryIcon` fallback 按 cat 字符串稳定派生，避免图标雷同。
- 成就 `master30`（「一库在握」）：解锁逻辑改为**掌握任意一个完整题库**（内置或某文档，非空且全部 status===2）；进度条展示"完成度最高题库"的 done/total。

---

## 7. 常量一览（`src/types.ts`）
```
CUSTOM_ID_BASE = 1_000_000_000     // 生成卡片 id 命名空间基址
MAX_FILE_SIZE  = 5 * 1024 * 1024   // 单文件上限
MAX_CHUNKS     = 40                 // 单文档分块上限
CHUNK_MAX_TOKENS = 2500 / CHUNK_MIN_TOKENS = 300
SUPPORTED_EXT  = ['md','markdown','txt','docx','pdf']
DOC_CAT_MIN=5 / DOC_CAT_MAX=12 / DOC_CAT_FALLBACK='其他'
ORPHAN_CAT_MERGE_THRESHOLD = 3
CUSTOM_CARDS_SOFT_LIMIT = 2000     // 超过提示清理，不硬阻断
MIN_DOC_CONTENT_CHARS = 20         // 文档有效正文最小字符数（去空白），低于视为空文档
MIN_CHUNK_CONTENT_CHARS = 12       // 单块最小正文字符数（去空白），低于视为只有标题，跳过不喂 AI
GEN_CONCURRENCY = 2                 // 逐块生成并发度（429 平衡点）
BUILTIN_DECK_ID = '__builtin__' / BUILTIN_DECK_NAME = '内置题库'
```

---

## 8. 明确的「不做」清单
- 不存原始文件、不引入对象存储。
- 不做消息队列 / 服务端异步任务。
- 不做 OCR（扫描版 PDF 无法处理）。
- 不做卡片相似度去重（只做完全相同去重）。
- 不做实时同步（Realtime）、不做写前合并乐观锁（本期）。
- 不改 `Question.id` 类型 / SRS 算法 / `beile_ma_v3` 既有结构 / DB schema 结构。
- 不升级 React / Vite / TS 核心依赖。
- ⚠️ AI key 前端暴露是既有问题，本方案不新增暴露面，上线前应由团队推进后端代理。

---

## 9. 后续可改进项
1. **旧数据补指纹**：功能上线前的文档无 fingerprint，跨格式查重失效；可提供"重新导入以启用查重"的引导。
2. **多端方案 B/C**：写前合并 + 乐观锁 / Supabase Realtime，解决双端同时在线的覆盖问题。
3. **分块一致性**：让 docx 保留标题层级（`mammoth.convertToHtml` 再转带 `#` 文本），使 docx/md 生成结果趋于一致。
4. **OCR**：接入 OCR 支持扫描版 PDF。
5. **成就逻辑与文案一致性**：改文案时同步检查解锁逻辑（如 master30 从"掌握30题"改为"掌握一个题库"）。
6. **部署 base**：上线前将 `vite.config.ts` 的 `base` 改回 `/page/beile-ma-react/` 并验证（pdf 已改主线程模式，worker 404 风险已消除，但仍需回归）。

---

## 10. 排障速查
| 症状 | 优先排查 |
|---|---|
| PDF "解析失败/损坏" | 控制台 `[pdf]` 原始错误；`toHex` → 已 polyfill + 主线程；文本对象=0 → 扫描版 |
| 跨格式重复没拦住 | 旧 docx 是否有 `fingerprint`（上线前数据无）；两者 fingerprint 是否相等 |
| 删除题库又出现 | `deletedDocs` 墓碑是否写入；是否被云端 `MERGE_CLOUD` 合并回来（用 UI 删除而非脚本） |
| 生成很慢 / 429 | `GEN_CONCURRENCY`、分块数、退避重试是否生效 |
| 切 tab 筛选重置 | 筛选状态是否已提升到 App 层 |
| 今日目标题库/进度异常 | `learnDeckScope` 是否指向已删文档；`getTodayProgress` 孤儿 id 过滤 |
| 空文档/标题仍生成卡片 | 文档级 `MIN_DOC_CONTENT_CHARS`、块级 `MIN_CHUNK_CONTENT_CHARS`、prompt 第 6 条是否生效（见 §4.9） |
```
