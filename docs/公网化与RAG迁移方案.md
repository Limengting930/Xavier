# 「背了吗」公网化迁移方案：Builder BaaS → Supabase 官方云 + 多用户 + RAG

> 目标：把当前**内网 Builder BaaS、隐式单用户**的应用，迁移为**面向外部用户、公网可访问、多用户数据隔离**，
> 并在 AI 学习助手中引入 **RAG（检索用户上传的文档原文）**。
>
> 本文是架构/迁移方案，**不含实现代码**。所有判断基于对现有代码的实读：
> `src/api.ts`、`src/store.tsx`、`src/App.tsx`、`src/utils/kimi.ts`、`src/components/UploadSheet.tsx`、
> `src/components/learn/AIChatBot.tsx`、`src/utils/cardGen.ts`、`src/utils/docParser.ts`、`src/types.ts`。
>
> 迁移原则：**分阶段、可回滚、业务逻辑（SRS/store/UI）尽量不动**；先完成「公网多用户」再叠加「RAG」，
> 两者解耦，任一阶段都可独立上线。

---

## 〇、现状基线（迁移前必须认清）

### 认证（Builder OAuth，内网 SSO）
- `App.tsx:44-93` + `api.ts:74-98`：授权码模式。`redirectToLogin` → Builder `/auth/start` → 回调带
  `builder_auth_code` → `exchangeCode` 换 `builder_session_token` → 存 `localStorage(bst_bld_...)` + `sessionStorage` →
  `verifySession` 调 `/auth/me` 拿 `UserInfo`。
- 所有请求带 `X-Builder-Session` header，**绝不带 cookie**（`api.ts:33`，带 cookie 会 431）。
- 身份/权限判定全在 Builder 服务端。**没有自建后端。**

### 数据库（Builder 托管 Supabase，REST 代理）
- `api.ts` 全程 `POST /supabase/rows/{query|insert|update}`，`X-Builder-App-Id` + `X-Builder-Session`。
- `questions` 表（只读，`loadQuestions`，`QUESTIONS_APP_ID`）。
- `user_progress` 表（`APP_ID`）：**单行 JSON blob** —— `cards_json/daily_json/custom_json/documents_json`。
- **致命隐患（多用户）**：`loadFromCloud` 用 `filters:{}` 取第一行（`api.ts:111`）——当前隐式"整库一个人"。
  公网多用户下这会让所有人**共享同一份数据**，必须彻底改造。

### AI（前端直连 Kimi，key 暴露）
- `kimi.ts:11` 读 `VITE_KIMI_API_KEY`，打包进 bundle。注释已自述"上线需后端代理"。
- 公网上线后**任何人可从 bundle 扒 key 盗刷**，是硬红线。

### 文档处理（原文不落地）
- `UploadSheet.tsx:81` `parseFile` 解析后**原文即弃**，只留 `hash`/`fingerprint`（`docParser`）。
- 生成的卡片进 `store.custom`。**RAG 需要原文/分块持久化——这是与现状最大的结构冲突（现方案 §10 明确"不做 chunk 持久化"，RAG 推翻此条）。**

### 部署
- `vite.config.ts` `base: './'`，`dist/` 产物。当前无公网域名/HTTPS。

---

## 一、目标架构总览

```
┌─────────────────────────────────────────────┐
│  React SPA（公网，Vercel/Netlify/CF Pages）   │
│  · Supabase JS SDK：Auth + DB 访问             │
│  · 业务层（store/SRS/UI）几乎不动               │
└───────────────┬─────────────────────────────┘
                │ HTTPS
    ┌───────────┴───────────────────────────┐
    │        Supabase 官方云                  │
    │  ① Auth（邮箱/手机/OAuth，签发 JWT）     │
    │  ② PostgreSQL + RLS（按 user_id 隔离）   │
    │       - questions（共享只读）            │
    │       - user_progress（每用户一行）       │
    │       - documents / document_chunks（RAG）│
    │       - pgvector 扩展（向量检索）         │
    │  ③ Edge Functions（Serverless）         │
    │       - ai-chat（代理 Kimi，藏 key）     │
    │       - rag-ingest（分块→embedding→入库）│
    │       - rag-retrieve（检索 Top-K）       │
    │       - embed（embedding 代理）          │
    └────────────────────────────────────────┘
```

**关键决策：不建独立后端。** Supabase 的 Auth + RLS + Edge Function + pgvector 已覆盖
"鉴权、数据权限、密钥保护、向量检索"四件后端该做的事。独立后端留到 Serverless 扛不住复杂逻辑时再上。

---

## 二、迁移分期（三期，可独立上线）

| 期 | 目标 | 上线后效果 |
|---|---|---|
| **第一期** | 认证 + 数据库迁移到 Supabase，多用户隔离 | 外部用户可注册登录、各自数据隔离、公网可用（AI 仍是旧卡片答疑，无 RAG） |
| **第二期** | AI 代理（藏 key）+ 公网部署硬化 | 密钥安全、限流、正式对外 |
| **第三期** | RAG（文档持久化 + 向量检索 + 聊天融合） | 学习助手能检索用户上传的原文 |

> 第一、二期是"公网化"的必做项；第三期"RAG"独立叠加。**先把前两期稳了再做 RAG，避免一次性大爆炸。**

---

## 三、第一期：认证 + 数据库迁移（多用户）

### 3.1 认证：Builder OAuth → Supabase Auth

**废弃**：`api.ts` 的 `exchangeCode` / `verifySession` / `redirectToLogin` / `BST_KEY` / `X-Builder-Session`。
**引入**：`@supabase/supabase-js` 的 Auth。

- **登录方式**（按用户群选，建议至少两种）：
  - 国内 C 端：**手机号 + 短信 OTP**（Supabase 支持配置短信服务商）+ **微信 OAuth**。
  - 通用/海外：邮箱密码 / 邮箱 Magic Link / Google。
- **会话管理**：SDK 自动持有并刷新 JWT，前端不再手动存 token/传 header。
- **改造点**：
  - `App.tsx:44-93` 认证初始化 → 改为 `supabase.auth.getSession()` + `onAuthStateChange` 监听：
    有 session 加载数据；无 session 显示登录页。
  - `UserInfo`（`types.ts:44`）字段映射到 Supabase user（`user_metadata`）。现有字段（nameCn/avatar 等）
    尽量保留，登录 UI 采集或第三方 OAuth 带入。
- **新增登录/注册页**：当前无（直接跳 SSO）。需做 App 内登录页，复用现有 CSS 变量体系，不引 UI 库（遵守 CLAUDE.md）。

### 3.2 数据库：表结构 + 多用户改造

- **`questions`**：结构照搬（`id/cat/q/summary/a/keywords/pitfalls/interview/diff/sort_order`）。
  全体用户共享、只读。注意 `keywords/interview` 仍是 JSON 字符串存储（保持 `api.ts:62,64` 的 `safeJson` 解析口径）。
- **`user_progress`**：**新增 `user_id` 列**（关联 `auth.users.id`，唯一）。
  其余 `cards_json/daily_json/custom_json/documents_json` 照搬（**第一期先保留 JSON blob 模式，改动最小**）。
  - **弃用** `filters:{}` 取第一行的写法。查询靠 RLS 自动过滤到当前用户。
  - insert 时写入 `user_id = auth.uid()`；每用户至多一行。

### 3.3 RLS（行级安全）—— 多用户隔离的核心

> 这是替代 Builder 服务端权限判定的关键。**没有 RLS，公网多用户 = 数据裸奔。**

- `user_progress`：启用 RLS，策略 `auth.uid() = user_id`（select/insert/update/delete 均限本人）。
  → A 用户即使前端代码写错也读不到 B 的数据。
- `questions`：启用 RLS，允许所有已登录用户 `SELECT`，禁止写。
- **验收**：在 Supabase 后台用两个测试账号交叉验证，A 绝对读不到 B 的 `user_progress`。

### 3.4 前端数据访问改造（`api.ts`）

- 所有 `bfetch('/supabase/rows/...')` → `supabase.from(...).select/insert/update`。
- **保持对外函数签名不变**：`loadQuestions()` / `loadFromCloud()` / `syncToCloud()` 对外接口尽量维持，
  只换内部实现 → `store.tsx` 的 `MERGE_CLOUD` / `syncToCloudDebounced`（`store.tsx:494`）几乎不用动。
- `loadFromCloud` 的 rowId 语义：改为按 `user_id` upsert，`cloudRowId` 可保留或改为"是否已有行"的布尔，
  评估对 `SET_CLOUD_ROW_ID`（`store.tsx:250`）的影响。

### 3.5 数据迁移（现有用户）

- 现有 `user_progress` 是单行 blob，导出简单。但**无 user_id 概念**：
  - 若现有数据是你/团队的测试数据 → 迁移时手动关联到指定新账号，或直接放弃（外部用户全新起）。
  - localStorage 兜底数据（`beile_ma_v3`）在用户端仍在，登录新账号后经现有 `MERGE_CLOUD` 并集合并上云——
    **注意**：`MERGE_CLOUD` 是并集合并（`store.tsx` 中 cards 按 lastReview、custom 按 id、documents 按 docId），
    且已有 `deletedDocs` 墓碑（`store.tsx:382`）——迁移后首次登录的合并行为需回归测试。

### 3.6 第一期不做 / 保留
- **暂不拆 blob 表**（cards/daily 仍是 JSON）。规模化拆表（每卡一行）留到卡片量突破数千再做（现方案 §6 软上限 2000）。
- SRS 算法、learn/library/stats/成就 逻辑**完全不动**。

---

## 四、第二期：AI 代理 + 公网硬化

### 4.1 AI key 保护（硬红线）
- 新建 Edge Function `ai-chat`：接收前端对话消息 → 服务端用环境变量里的 Kimi key 调 Moonshot → **SSE 流式透传**回前端。
- 改造 `kimi.ts`：
  - `streamChat`（`kimi.ts:151`）与 `chatOnce`（若已加）的 `API_URL/API_KEY` → 改为调 Edge Function，
    **前端不再持有 key**，移除 `VITE_KIMI_API_KEY`。
  - **保留** `kimi.ts` 现有的三道流式完整性防线、token 预算截断、System Prompt/卡片上下文治理逻辑
    （这些是纯前端编排，不受代理影响）。
  - `cardGen.ts` 的生成调用同样走代理。
- **鉴权**：Edge Function 校验调用方的 Supabase JWT，拒绝匿名/越权调用。
- **限流**：在 Edge Function 里对每用户做速率限制，防止薅 AI 额度（公网必做）。

### 4.2 公网部署硬化
- **部署**：`dist/` 部署到 Vercel/Netlify/Cloudflare Pages（纯前端，一键）。调整 `vite.config.ts` `base` 为实际路径。
- **HTTPS**：必须（`docParser` 的 `crypto.subtle` hash/fingerprint 依赖安全上下文，`UploadSheet.tsx:92-93`）。
- **环境变量**：Supabase URL/anon key 走 `VITE_` 注入（anon key 公开无妨，门禁是 RLS）；敏感 key 只在 Edge Function。
- **合规**（面向 C 端）：隐私政策、用户协议（收集邮箱/手机号）；国内涉及 ICP 备案与数据合规。
- **滥用防护**：注册限流、AI 限流、上传大小限制（已有 `MAX_FILE_SIZE`）、文件类型白名单（已有 `SUPPORTED_EXT`）。

---

## 五、第三期：RAG（检索用户上传的文档）

> **前提结论（务必先读）**：RAG 只在"用户学习时追问、且答案需回到原文精准检索"时才有价值。
> 卡片本身已是自包含学习单元，现有助手已能基于"当前卡片背景"答疑。**建议先上线前两期、观察真实用户是否有
> "卡片答不了需翻原文"的强需求，再决定是否投入 RAG。** 以下为决定做 RAG 时的完整方案。

### 5.0 RAG 带来的最大架构变化：文档必须持久化
- 现状：`parseFile` 后原文即弃（`UploadSheet.tsx`），只留 hash。
- RAG 要求：**至少持久化"分块文本 + 其向量"**。这推翻现方案 §10「不做 DocumentChunk 持久化」。
- 存哪：Supabase PostgreSQL 新表（见下），**不需要对象存储**（除非未来要做"点卡片跳原文原始排版"，那才需存原文件）。

### 5.1 新增数据表（pgvector）
- **启用 `pgvector` 扩展**。
- **`documents`**（若要与 `user_progress.documents_json` 解耦，可新建独立表；也可复用 blob 内的 DocMeta，
  但 RAG 场景建议独立表便于关联）：`docId / user_id / name / type / hash / fingerprint / createdAt`。
- **`document_chunks`**：
  - `id / doc_id / user_id / chunk_index / title / content(文本) / embedding(vector) / token_count`。
  - RLS：`auth.uid() = user_id`（用户只能检索自己的文档分块）。
  - 向量索引（IVFFlat/HNSW）加速 Top-K。

### 5.2 上传流程改造（Ingest Pipeline）
在现有 `UploadSheet` pipeline（解析→分块→归类→生成卡片）**之外，并行/追加一步入库**：

```
现有：parseFile → chunk → generateCategories → generateCards → 写 store.custom
新增：            chunk ─┬→（已有生成卡片支线）
                        └→ rag-ingest：每个 chunk → embed → 写入 document_chunks
```

- **复用现有 `chunk()`（`chunker.ts`）的分块结果**，避免重复切分。
  （注意：现有 chunk 面向"生成卡片"，粒度 800~1500 token；RAG 检索粒度可沿用，也可另设更小粒度，
  评估后决定是否为 RAG 单独切一份。MVP 先复用。）
- **入库走 Edge Function `rag-ingest`**：接收 chunks → 调 embedding 模型 → 批量写 `document_chunks`（带 user_id）。
- **embedding 模型**：用 Kimi/OpenAI 的 embedding API，或 Supabase 支持的开源模型；key 只在 Edge Function。
- **成本提示**：每次上传为每个 chunk 付一次 embedding 费用；大文档成本可观，需在 UI/额度上约束。
- **失败处理**：入库失败**不应阻断卡片生成**（卡片是核心资产，RAG 是增强）。入库可异步补偿/重试；
  文档删除时（现有 `REMOVE_DOCUMENT`）需**同步删除 `document_chunks`**（扩展该 action 或加 Edge Function 清理）。

### 5.3 聊天检索流程（Retrieve + Generate）
改造 `AIChatBot`（`AIChatBot.tsx`）的发送逻辑，在调用 AI 前插入检索：

```
用户提问
  → rag-retrieve：query embed → pgvector 查该用户 Top-K 相关 chunk（可加 metadata 过滤：仅当前卡片所属文档）
  → 把 Top-K 原文片段作为「检索到的原文背景」拼进 prompt（与现有"当前卡片背景"分层共存）
  → ai-chat：LLM 基于 [System + 卡片背景 + 检索原文 + 对话历史] 回答
```

- **与现有上下文治理融合**：`kimi.ts` 已有分层消息（System / 卡片背景 / 对话历史）+ token 预算截断
  （`buildApiMessages`）。检索到的原文作为**新增一层受保护上下文**注入，需纳入 token 预算，
  必要时压缩/减少 Top-K（K 建议 3~5）。
- **何时触发检索**（省成本、提质量）：
  - 不必每条消息都检索。建议：用户**自由追问**时检索；点"举例/相关题目/学习建议"快捷按钮
    （`AIChatBot.tsx:45-49`，答案已在卡片里）时**可不检索**。
  - 或让 LLM 先判断"本题卡片是否足以回答"，不足才检索（增加一次调用，权衡成本）。
- **检索范围（metadata filtering）**：优先检索**当前卡片所属文档**的 chunk（用 `doc_id` 过滤），
  再按需扩大到该用户全部文档。避免跨文档噪声。

### 5.4 RAG 组件取舍（按需，别全上）
| 组件 | 是否需要 | 说明 |
|---|---|---|
| Embedding | ✅ 必须 | RAG 地基 |
| 向量存储（pgvector） | ✅ 必须 | 用 Supabase 内置，不引独立向量库 |
| Retriever（Top-K） | ✅ 必须 | pgvector 相似度查询 |
| Metadata Filtering | ✅ 建议 | 按 doc_id / user_id 过滤，降噪+隔离 |
| Re-ranking | ⏭️ 暂不 | 初期 Top-K 够用，效果不足再加 |
| Hybrid Search（关键词+向量） | ⏭️ 暂不 | 中文精确匹配需求强时再加 |
| 独立向量库（Qdrant/Milvus） | ❌ 不需要 | pgvector 满足，少一个组件 |

### 5.5 RAG 的成本/复杂度提醒
- **AI 成本**：embedding（每次上传）+ 检索时 query embedding + 更长 prompt 的生成成本。
- **复杂度**：新增 3 个 Edge Function、1 张向量表、上传/聊天两条流程改造。
- **维护**：向量索引调优、Top-K/K 值、检索触发策略需迭代。
- **结论**：只有验证了真实需求再投入；技术上 Supabase 方案已把复杂度压到最低。

---

## 六、逐模块改造影响清单（速查）

| 文件 | 第一期（认证+DB） | 第二期（AI代理） | 第三期（RAG） |
|---|---|---|---|
| `api.ts` | 大改：Auth+DB 换 Supabase SDK | — | 新增 chunks 读写封装 |
| `App.tsx` | 中改：认证初始化+登录页 | — | — |
| 新增登录/注册页 | 新增 | — | — |
| `store.tsx` | 小改：cloudRowId 语义、MERGE 回归 | — | REMOVE_DOCUMENT 联动删 chunks |
| `kimi.ts` | — | 中改：改调 ai-chat 代理，移除 key | 注入检索上下文、token 预算 |
| `cardGen.ts` | — | 小改：走代理 | 可复用 chunk 供 ingest |
| `UploadSheet.tsx` | — | — | 追加 rag-ingest 支线 |
| `AIChatBot.tsx` | — | — | 中改：发送前插入检索 |
| Supabase 侧 | 建表+RLS+Auth | Edge Function ai-chat | pgvector+chunks+ingest/retrieve |
| 部署 | 公网部署+HTTPS+域名 | 限流+合规 | — |

**始终不动**：SRS 算法（`srsUpdate`）、学习队列（`buildQueue`）、成就、统计口径、`beile_ma_v3` 结构。

---

## 七、风险与回滚

| 风险 | 应对 |
|---|---|
| 多用户数据串号（最高危） | RLS 强制隔离 + 两账号交叉验收，上线前必测 |
| AI key 泄露盗刷 | 第二期代理为硬门槛，代理未完成不对外开放注册 |
| `MERGE_CLOUD` 并集把已删/他人数据合并 | 复用 `deletedDocs` 墓碑；迁移后回归首次登录合并 |
| RAG 成本失控 | 检索触发策略 + 每用户限流 + 上传额度 |
| 国内访问 Supabase 延迟/合规 | 见第八节 |
| 迁移中断 | 分期上线，每期独立可回滚；Builder 版本保留为回退分支 |

---

## 八、国内 C 端特别提示（如目标用户在国内）
- **Supabase 服务器在海外**：国内访问可能有延迟；数据出境涉及合规。
- 若国内合规/速度是硬约束，替代路径：
  - Supabase **自托管**部署在国内云；或
  - 换国内 BaaS（如腾讯云 CloudBase、LeanCloud）+ 国内向量库；
  - Edge Function 换国内 Serverless（腾讯云 SCF / 阿里云 FC）。
- 架构思路不变（Auth + RLS/权限 + Serverless 代理 + 向量检索），仅换供应商。
- **决策前先明确目标用户地域**，它直接决定选 Supabase 官方云还是国内替代。

---

## 九、推荐执行顺序（落地 checklist）

**第一期（公网多用户）**
1. 建 Supabase 项目 → 建 `questions`/`user_progress`（含 user_id）→ 导入题库。
2. 配 RLS（user_progress 按 user_id、questions 只读）→ 后台交叉验证隔离。
3. 接 Supabase Auth + 登录/注册页，替换 `App.tsx` 认证。
4. `api.ts` 数据访问换 SDK，保持对外签名。
5. 回归：多账号交叉测试隔离、SRS/上传/统计/题库管理全正常、老 localStorage 合并正常。

**第二期（安全上线）**
6. Edge Function `ai-chat` 代理 Kimi，`kimi.ts`/`cardGen.ts` 改调代理，移除前端 key。
7. 部署公网 + HTTPS + 域名 + 限流 + 合规页。→ 正式对外。

**第三期（RAG，按需）**
8. 启用 pgvector，建 `documents`/`document_chunks` + RLS + 向量索引。
9. Edge Function `embed`/`rag-ingest`/`rag-retrieve`。
10. `UploadSheet` 追加入库支线；`REMOVE_DOCUMENT` 联动删 chunks。
11. `AIChatBot` 发送前插入检索，融合进现有分层上下文 + token 预算。
12. 回归：检索命中率、成本、隔离（只检索到自己的文档）、token 不超限。

---

## 十、一句话总结
**给外部用户用 + RAG，不需要传统自建后端。** 迁到 Supabase 官方云，用 Auth 换 SSO、RLS 做多用户隔离、
Edge Function 藏 AI/embedding key、pgvector 做向量检索——四件"后端该做的事"全由 Supabase 托管完成。
按「公网多用户 → 安全代理 → RAG」三期推进，业务逻辑（SRS/store/UI）几乎不动，每期可独立上线回滚。
RAG 是最重的一期，且推翻了现有"文档不落地"的设计，**建议前两期上线后按真实需求再决定是否投入**。
