# 「背了吗」公网化迁移方案（国内用户 · 不含 RAG）

> 目标：把当前**内网 Builder BaaS、隐式单用户**的应用，迁移为**面向国内外部用户、公网可访问、多用户数据隔离**的正式产品。
> **本期不做 RAG**（RAG 作为后续独立阶段，见文末"后续演进"）。
>
> 本文是架构/迁移方案，**不含实现代码**。所有判断基于对现有代码的实读：
> `src/api.ts`、`src/store.tsx`、`src/App.tsx`、`src/utils/kimi.ts`、`src/components/UploadSheet.tsx`、`src/types.ts`。
>
> 迁移原则：**分阶段、可回滚、业务逻辑（SRS/store/UI）尽量不动**；每期可独立上线。

---

## 〇、现状基线（迁移前必须认清）

### 认证（Builder OAuth，内网 SSO）
- `App.tsx:44-93` + `api.ts:74-98`：授权码模式。`redirectToLogin` → Builder `/auth/start` → 回调带
  `builder_auth_code` → `exchangeCode` 换 `builder_session_token` → 存 `localStorage(bst_bld_...)` + `sessionStorage` →
  `verifySession` 调 `/auth/me` 拿 `UserInfo`。
- 请求带 `X-Builder-Session` header，**绝不带 cookie**（`api.ts:33`，带 cookie 会 431）。
- 身份/权限判定全在 Builder 服务端。**没有自建后端。**

### 数据库（Builder 托管 Supabase，REST 代理）
- `api.ts` 全程 `POST /supabase/rows/{query|insert|update}`，`X-Builder-App-Id` + `X-Builder-Session`。
- `questions` 表（只读，`loadQuestions`，`QUESTIONS_APP_ID`）。
- `user_progress` 表（`APP_ID`）：**单行 JSON blob** —— `cards_json/daily_json/custom_json/documents_json`。
- **致命隐患（多用户）**：`loadFromCloud` 用 `filters:{}` 取第一行（`api.ts:111`）——当前隐式"整库一个人"。
  公网多用户下会让所有人**共享同一份数据**，必须彻底改造。

### AI（前端直连 Kimi，key 暴露）
- `kimi.ts:11` 读 `VITE_KIMI_API_KEY`，打包进 bundle。注释已自述"上线需后端代理"。
- 公网上线后**任何人可从 bundle 扒 key 盗刷**，是硬红线。

### 部署
- `vite.config.ts` `base: './'`，`dist/` 产物。当前无公网域名/HTTPS/备案。

---

## 一、供应商选型（国内约束下的关键决策）

**结论：不使用 Supabase 官方云**（服务器在海外，国内访问延迟高、数据出境不合规）。
选用**国内云厂商的 BaaS + Serverless + 托管数据库**组合。核心能力需求与国内对应产品：

| 能力（替代 Builder） | 国内可选方案（择一） |
|---|---|
| 认证（替代 SSO） | 腾讯云开发 CloudBase 身份认证 / 微信开放平台登录 / 自建短信OTP+第三方登录 SDK |
| 数据库 + 行级权限 | CloudBase 云数据库（自带安全规则）/ 云 PostgreSQL(RDS) + 自写鉴权 |
| Serverless（AI 代理） | 腾讯云 SCF / 阿里云 FC / CloudBase 云函数 |
| 静态托管 + CDN | 腾讯云 CloudBase 静态托管 / 阿里云 OSS+CDN / Vercel（国内访问不稳，不推荐） |

**两条主流落地路线（二选一，本方案以路线 A 为主，路线 B 作为备选）：**

### 路线 A：腾讯云 CloudBase（TCB）全家桶 —— ★ 推荐
- 一站式：身份认证 + 云数据库（NoSQL，天然按用户隔离）+ 云函数 + 静态托管，均在国内、可备案。
- 与现状**心智最接近**：CloudBase 数据库也是"文档/集合 + SDK 直连 + 安全规则"，和你现在"REST 直连 + 服务端权限"模型高度相似，`user_progress` 的 JSON blob 可几乎原样搬。
- 微信生态登录接入成熟（国内 C 端刚需）。
- 运维负担最低，无需自建服务器。

### 路线 B：自建轻后端 + 云数据库
- 云 PostgreSQL(RDS) + 一个轻后端（Node/Go）做 JWT 鉴权与数据接口 + Serverless 或后端内做 AI 代理。
- 掌控力最强、可平滑对接规范化表结构，但**要写后端、部署运维**，成本更高。
- 仅当你确定未来有复杂服务端业务（支付、复杂风控、系统集成）时才选。

> 本方案后续以**路线 A（CloudBase）**为主线描述；术语上"云数据库/云函数/身份认证"即对应 CloudBase 组件，
> 换其他国内厂商时概念一一对应即可。

---

## 二、目标架构总览（路线 A）

```
┌─────────────────────────────────────────────┐
│  React SPA（国内静态托管 + CDN，已备案域名）    │
│  · CloudBase JS SDK：身份认证 + 云数据库访问    │
│  · 业务层（store/SRS/UI）几乎不动               │
└───────────────┬─────────────────────────────┘
                │ HTTPS（国内）
    ┌───────────┴───────────────────────────┐
    │        腾讯云 CloudBase（国内）          │
    │  ① 身份认证（微信/手机OTP/邮箱，签发凭证） │
    │  ② 云数据库 + 安全规则（按 openid 隔离）   │
    │       - questions（共享只读）            │
    │       - user_progress（每用户一条）       │
    │  ③ 云函数（Serverless）                  │
    │       - ai-chat（代理 Kimi，藏 key，SSE） │
    └────────────────────────────────────────┘
```

**关键决策：不建传统独立后端。** CloudBase 的身份认证 + 数据库安全规则 + 云函数已覆盖
"鉴权、数据权限、密钥保护"三件后端该做的事。

---

## 三、迁移分两期（各自可独立上线）

| 期 | 目标 | 上线效果 |
|---|---|---|
| **第一期** | 认证 + 数据库迁移到 CloudBase，多用户隔离 | 国内外部用户可注册登录、各自数据隔离、公网可用 |
| **第二期** | AI 代理（藏 key）+ 公网部署硬化（域名/备案/限流/合规） | 密钥安全、正式对外 |

---

## 四、第一期：认证 + 数据库迁移（多用户）

### 4.1 认证：Builder OAuth → CloudBase 身份认证
**废弃**：`api.ts` 的 `exchangeCode` / `verifySession` / `redirectToLogin` / `BST_KEY` / `X-Builder-Session`。
**引入**：CloudBase 身份认证 SDK。

- **登录方式**（国内 C 端建议）：
  - **微信登录**（公众号/小程序/开放平台，视你的载体定）——国内注册门槛最低，首选。
  - **手机号 + 短信验证码**——通用兜底（需开通短信服务，涉及签名报备）。
  - 邮箱密码可作为补充。
- **会话管理**：SDK 自动持有并刷新登录凭证，前端不再手动存 token/传 header。
- **改造点**：
  - `App.tsx:44-93` 认证初始化 → 改为"检查登录态：已登录加载数据；未登录显示登录页"。
  - `UserInfo`（`types.ts:44`）字段映射到 CloudBase 用户信息（微信昵称/头像等）。现有字段尽量保留。
- **新增登录/注册页**：当前无（直接跳 SSO）。需做 App 内登录页，复用现有 CSS 变量体系，**不引 UI 库**（遵守 CLAUDE.md）。

### 4.2 数据库：集合结构 + 多用户改造
CloudBase 云数据库为文档型，两个集合：
- **`questions`**：题库，结构照搬（`id/cat/q/summary/a/keywords/pitfalls/interview/diff/sort_order`），全体共享、只读。
  注意 `keywords/interview` 仍按 JSON 字符串存储，保持 `api.ts:62,64` 的 `safeJson` 解析口径不变。
- **`user_progress`**：**每用户一条文档，带 `_openid`（CloudBase 自动写入登录用户标识）**。
  字段 `cards_json/daily_json/custom_json/documents_json` 照搬（**第一期先保留 JSON blob 模式，改动最小**）。
  - **弃用** `filters:{}` 取第一行的写法（`api.ts:111`）。
  - 查询：`where({ _openid: 当前用户 })`，靠**安全规则**兜底强制隔离。

### 4.3 数据隔离（安全规则）—— 多用户的核心，替代 Builder 服务端权限
> **没有安全规则，公网多用户 = 数据裸奔。这是从内网转公网必做的第一安全项。**

- `user_progress`：安全规则设为**仅创建者可读写**（CloudBase 内置规则：`auth.openid == doc._openid`）。
  → A 用户即使前端代码写错也读不到 B 的数据。
- `questions`：安全规则设为**所有已登录用户可读、不可写**。
- **验收**：用两个测试账号交叉验证，A 绝对读不到/改不到 B 的 `user_progress`。

### 4.4 前端数据访问改造（`api.ts`）
- 所有 `bfetch('/supabase/rows/...')` → CloudBase SDK 的 `db.collection(...).where(...).get/add/update`。
- **保持对外函数签名不变**：`loadQuestions()` / `loadFromCloud()` / `syncToCloud()` 对外接口尽量维持，
  只换内部实现 → `store.tsx` 的 `MERGE_CLOUD`（并集合并逻辑）/ `syncToCloudDebounced`（`store.tsx:494`）几乎不用动。
- `loadFromCloud` 的 `rowId` 语义：改为按当前用户 upsert（无则 add、有则 update）；
  `cloudRowId`（`store.tsx:250` `SET_CLOUD_ROW_ID`）可保留为该用户文档的 `_id`。

### 4.5 数据迁移（现有用户）
- 现有 `user_progress` 是单行 blob，导出简单。但**无用户维度**：
  - 若是你/团队测试数据 → 迁移时手动关联到指定新账号，或直接放弃（外部用户全新起）。
  - 用户端 localStorage 兜底（`beile_ma_v3`）仍在，登录新账号后经现有 `MERGE_CLOUD` 并集合并上云。
  - **注意回归**：`MERGE_CLOUD` 是并集合并（cards 按 lastReview、custom 按 id、documents 按 docId），
    且已有 `deletedDocs` 墓碑（`store.tsx:382`）——迁移后首次登录的合并行为需专门测试，避免把本不属于该用户的数据合入。

### 4.6 第一期不动 / 保留
- **暂不拆 blob**（cards/daily 仍是 JSON）。规模化拆表留到卡片量突破数千再做（现方案软上限 2000）。
- SRS 算法（`srsUpdate`）、学习队列（`buildQueue`）、成就、统计、题库管理（上传/删除/更新/墓碑）逻辑**完全不动**。
- `beile_ma_v3` localStorage 结构不动（仍作离线兜底）。

---

## 五、第二期：AI 代理 + 公网硬化

### 5.1 AI key 保护（硬红线）
- 新建云函数 `ai-chat`：接收前端对话消息 → 服务端用环境变量里的 Kimi key 调 Moonshot → **SSE 流式透传**回前端。
- 改造 `kimi.ts`：
  - `streamChat`（`kimi.ts:151`）及卡片生成用的一次性调用的 `API_URL/API_KEY` → 改为调云函数，
    **前端不再持有 key**，移除 `.env.local` 里的 `VITE_KIMI_API_KEY`。
  - **保留** `kimi.ts` 现有的三道流式完整性防线、token 预算截断、System Prompt/卡片上下文治理
    （`buildApiMessages` 等纯前端编排逻辑不受代理影响）。
  - `cardGen.ts`（文档生成卡片）同样走代理。
- **鉴权**：云函数校验调用方登录态，拒绝匿名/越权调用。
- **限流**：云函数内对每用户做速率限制，防止薅 AI 额度（公网必做）。
- **SSE 注意**：确认所选云函数支持流式响应；若不支持，需评估用长连接/分块返回替代，或该函数走支持流式的网关。

### 5.2 公网部署硬化
- **静态托管**：`dist/` 部署到 CloudBase 静态托管 / OSS+CDN（国内）。调整 `vite.config.ts` `base` 为实际路径。
- **域名 + 备案**：国内公网必须 **ICP 备案**；涉及经营性内容还需相应资质。**备案有周期，尽早启动。**
- **HTTPS**：必须（现有 `docParser` 的 `crypto.subtle` 计算 hash/fingerprint 依赖安全上下文，`UploadSheet.tsx:92-93`）。
- **环境变量**：CloudBase 环境 ID/公开配置走前端注入（公开无妨，门禁是安全规则）；Kimi key 只存云函数环境变量。
- **合规**（面向 C 端）：隐私政策、用户协议（收集微信信息/手机号）、《个人信息保护法》合规；用户注销/数据删除能力。
- **滥用防护**：注册限流、AI 限流、上传大小限制（已有 `MAX_FILE_SIZE`）、类型白名单（已有 `SUPPORTED_EXT`）。

---

## 六、逐模块改造影响清单（速查）

| 文件 | 第一期（认证+DB） | 第二期（AI代理+硬化） |
|---|---|---|
| `api.ts` | 大改：Auth+DB 换 CloudBase SDK，保持对外签名 | — |
| `App.tsx` | 中改：认证初始化 + 接入登录页 | — |
| 新增 登录/注册页 | 新增（复用现有 CSS 体系） | — |
| `store.tsx` | 小改：`cloudRowId` 语义、MERGE 回归验证 | — |
| `kimi.ts` | — | 中改：改调 ai-chat 云函数，移除 key |
| `cardGen.ts` | — | 小改：生成调用走代理 |
| `.env.local` / 构建 | 加 CloudBase 配置 | 移除 `VITE_KIMI_API_KEY` |
| CloudBase 侧 | 建集合 + 安全规则 + 身份认证 | 云函数 ai-chat + 限流 |
| 部署 | 静态托管 + 域名 + 备案 + HTTPS | 限流 + 合规页 |

**始终不动**：SRS 算法、`buildQueue`、成就、统计口径、题库管理逻辑、`beile_ma_v3` 结构。

---

## 七、风险与回滚

| 风险 | 应对 |
|---|---|
| 多用户数据串号（最高危） | 安全规则强制隔离 + 两账号交叉验收，上线前必测 |
| AI key 泄露盗刷 | 第二期代理为硬门槛；代理未完成前不对外开放注册 |
| `MERGE_CLOUD` 并集把他人/已删数据合入 | 复用 `deletedDocs` 墓碑；迁移后回归首次登录合并 |
| 备案周期拖延上线 | 尽早启动备案，与开发并行 |
| 云函数不支持 SSE 流式 | 提前验证；不支持则改流式方案或换网关 |
| 迁移中断 | 分期上线、各自可回滚；保留 Builder 版本为回退分支 |

---

## 八、推荐执行顺序（落地 checklist）

**准备（可与开发并行）**
0. 确定登录载体（微信公众号/小程序/H5）→ 申请对应微信登录能力；启动**域名备案**。

**第一期（公网多用户）**
1. 开通 CloudBase 环境 → 建 `questions`/`user_progress` 集合 → 导入题库数据。
2. 配安全规则（`user_progress` 仅创建者读写、`questions` 登录可读）→ 后台交叉验证隔离。
3. 接 CloudBase 身份认证 + 登录/注册页，替换 `App.tsx` 认证逻辑。
4. `api.ts` 数据访问换 CloudBase SDK，保持对外签名不变。
5. 回归：多账号交叉测试隔离；SRS/上传/删除/更新/统计/成就全正常；老 localStorage 合并正常。

**第二期（安全正式上线）**
6. 云函数 `ai-chat` 代理 Kimi（验证 SSE），`kimi.ts`/`cardGen.ts` 改调代理，移除前端 key。
7. 静态托管 + 备案域名 + HTTPS + 每用户限流 + 隐私政策/用户协议/注销能力。→ 正式对外。

---

## 九、后续演进（本期不做，预留）
- **RAG**（检索用户上传的文档原文）：需持久化文档分块 + 向量检索。国内可用
  CloudBase 向量能力 / 云 PostgreSQL 的 pgvector / 独立向量库（如腾讯云向量数据库）+ embedding 云函数，
  检索触发策略采用**"自由追问才检索、快捷按钮不检索"**（已定）。**推翻现有"文档不落地"设计**，作为独立一期，
  建议前两期上线、观察真实需求后再投入。
- **blob 拆表**：卡片量破数千后，把 `cards/custom` 拆为按用户+按卡片的规范化存储，支持增量同步与分页。

---

## 十、一句话总结
**面向国内外部用户，不用 Supabase 官方云，改用腾讯云 CloudBase（或同类国内 BaaS）**：
身份认证换 SSO、数据库安全规则做多用户隔离、云函数藏 Kimi key。分「公网多用户 → 安全代理+硬化」两期推进，
业务逻辑（SRS/store/UI）几乎不动，每期可独立上线回滚。**RAG 与 blob 拆表留作后续独立阶段。**
关键前置：**尽早启动域名备案、确定微信登录载体、验证云函数 SSE 支持**。
