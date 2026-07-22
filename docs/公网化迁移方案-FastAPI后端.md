# 「背了吗」公网化迁移方案 · FastAPI 后端 + 腾讯云 PostgreSQL + 独立 H5

> 目标：把当前**内网 Builder BaaS、隐式单用户**的应用，迁移为**面向国内外部用户、公网可访问、多用户数据隔离、密钥安全**的正式产品。
>
> 本方案的技术选型（已定）：
> - 后端：**Python + FastAPI**（自建，代码位于 `backend/`）
> - 数据库：**PostgreSQL**（开发期用**本地 Docker**、生产用**腾讯云**，代码零差异，只换连接串）
> - 登录：**手机号 + 短信验证码（OTP）**
> - 云厂商：**腾讯云**
> - 前端载体：**独立 H5**（现有 React SPA）
> - 本期**不做 RAG**（留后续独立阶段）
>
> ⚠️ 阅读对象：**只熟悉前端、后端与数据库零基础**。因此后端 / 数据库 / 云操作部分写得非常详细，
> 概念都用前端类比解释。前端改造部分假设你已熟悉，写得相对简洁。

---

## 实施进度（本文档动态维护）

> **第一期「后端 + 认证 + 多用户数据隔离」的代码已全部落地并本地跑通。** 以下为当前真实状态：

### 已完成 ✅
- **后端 `backend/`（FastAPI）已建**：
  - `app/main.py`（CORS + 路由 + 启动自动建表）、`config.py`、`database.py`、`models.py`、`schemas.py`、`auth.py`（JWT）、`deps.py`、`sms.py`
  - 路由：`routers/auth.py`（手机 OTP）、`questions.py`、`progress.py`
  - `scripts/import_questions.py`（题库导入）、`Dockerfile`、`requirements.txt`、`.env.example`、`README.md`
- **前端已改造**：`api.ts` 重写为调 FastAPI + JWT（`loadQuestions/loadFromCloud/syncToCloud` 签名保持不变，`store` 业务逻辑未动）；
  新增 `components/LoginPage.tsx` + `styles/login.css`；`App.tsx` 认证改为「检查 JWT → 有则进主界面，无则显示登录页」。
- **开发环境跑通**：本地 Docker PostgreSQL + `DEV_FAKE_SMS=true`（验证码固定 `000000`，打印到后端终端），
  无需云数据库、无需真短信即可完成注册登录与全部功能调试。

### 开发环境决策（与最初方案的差异）
- **数据库开发期改用本地 Docker，而非云库**：一条命令起 PostgreSQL，零费用、断网可用、不污染系统。
  上线再把 `.env` 的 `DATABASE_URL` 换成腾讯云地址即可，**代码不变**。
- **Python 版本坑**：必须用 **3.11 / 3.12**，**不能用 3.14**（pydantic-core 依赖的 PyO3 尚不支持 3.14，会编译失败）。

### 待办（第一期收尾 + 第二期）
- [ ] 导入真实题库数据到 `questions` 表
- [ ] 两账号交叉验证多用户隔离
- [ ] （上线前）开通腾讯云短信、审核签名/模板，切 `DEV_FAKE_SMS=false`
- [ ] （上线前）域名 ICP 备案、HTTPS
- [ ] 第二期：AI 代理云函数/接口（藏 Kimi key）+ 公网硬化

### 一分钟本地跑通（当前可用）
```bash
# 1) 起本地数据库（装了 Docker Desktop）
docker run -d --name beile-pg \
  -e POSTGRES_USER=beile -e POSTGRES_PASSWORD=beile123 -e POSTGRES_DB=beile_dev \
  -p 5432:5432 postgres:16
# 2) 后端
cd backend && python3.12 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # 填 DATABASE_URL=本地库、JWT_SECRET；DEV_FAKE_SMS 保持 true
uvicorn app.main:app --reload --port 8000   # http://localhost:8000/docs
# 3) 前端（根目录）
echo "VITE_API_BASE=http://localhost:8000" > .env.local
npm install && npm run dev
# 登录：输手机号 → 获取验证码 → 验证码看后端终端打印的 000000 → 登录
```

---

## 第 0 章 · 给前端同学的后端概念扫盲

在动手前，先用你熟悉的前端概念类比一遍，后面就不懵了。

| 后端概念 | 一句话解释 | 前端类比 |
|---|---|---|
| **后端（Server）** | 一个一直在云上运行的程序，接收请求、处理、返回数据 | 就像你 `fetch` 的那个 `api.xxx.com`，现在这个「那一端」由你自己写 |
| **FastAPI** | Python 写后端的框架 | 相当于后端界的 React——一个帮你快速搭 API 的工具 |
| **API 接口** | 后端暴露的一个网址 + 方法（GET/POST…），前端调它 | 你现在 `api.ts` 里 `fetch` 的每个 URL，就是一个接口 |
| **数据库** | 专门存数据的软件，数据永久保存、可查询 | 相当于一个超级强大的、多人共享的 localStorage，但用 SQL 查询 |
| **PostgreSQL** | 一种数据库软件（和 MySQL 同类） | —— |
| **SQL** | 操作数据库的语言（增删改查） | 类似你写 `array.filter/map`，只是用文本语句 |
| **JWT（Token）** | 登录后后端发给你的一张「电子身份证」，之后每个请求带上它证明你是谁 | 你现在存的 `builder_session_token`，概念一样 |
| **环境变量** | 存密钥/配置的地方，不写进代码、不进 git | 类似 `.env.local` 里的 `VITE_KIMI_API_KEY`，但在服务器上 |
| **Docker / 镜像** | 把「你的程序 + 运行环境」打包成一个盒子，到哪都能一模一样地跑 | 类似 `npm run build` 出的 `dist`，只不过打包的是整个后端运行环境 |
| **部署** | 把后端程序放到云服务器上让它一直运行、对外提供服务 | 类似你把 `dist` 传到静态托管，只是后端要「一直活着」 |
| **CORS** | 浏览器的安全策略：前端域名和后端域名不同时，后端要「允许」前端访问 | 你可能遇到过的「跨域」报错，就是它 |
| **ORM（SQLAlchemy）** | 用 Python 对象操作数据库，不用手写 SQL | 类似用对象/方法代替手写字符串，更安全好维护 |

**核心心智**：迁移后，前端不再直连数据库，而是**前端 → 调你的 FastAPI 后端 → 后端连数据库 / 调 AI**。
后端是「守门人」，负责三件事：**① 验证你是谁（认证）② 只给你你自己的数据（隔离）③ 藏好 AI 密钥（代理）**。

---

## 第 1 章 · 为什么必须迁移（现状三大隐患）

基于对现有代码的实读（`src/api.ts` / `src/store.tsx` / `src/App.tsx` / `src/utils/kimi.ts`）：

1. **多用户数据串号（最高危）**：`loadFromCloud` 用 `filters:{}` 取 `user_progress` 表的第一行（`api.ts` 约 111 行）。
   现在整库隐式「就一个人」，没暴露；一旦公网多人用，**所有人共享同一份数据**——你我的学习进度、上传题库全混在一起。
2. **AI key 裸奔**：`kimi.ts` 把 `VITE_KIMI_API_KEY` 打进前端 bundle，任何人都能扒出来盗刷。
3. **依赖内网 SSO + 无公网基建**：认证走 Builder 内网 SSO，没有公网域名 / 备案 / HTTPS。

迁移后达成：**公网可访问、每人数据隔离、手机号注册登录、AI 密钥安全**。

---

## 第 2 章 · 目标架构总览

```
┌───────────────────────────────────────────────┐
│  React SPA（独立 H5）                            │
│  · 腾讯云静态托管 + CDN，已备案域名               │
│  · 业务层 store / SRS / UI 几乎不动              │
│  · 通过 fetch 调「你自己的后端」，请求头带 JWT    │
└───────────────────┬───────────────────────────┘
                    │ HTTPS，Authorization: Bearer <JWT>
┌───────────────────┴───────────────────────────┐
│  FastAPI 后端（部署在腾讯云「云托管」）           │
│  · /auth/*   手机 OTP 注册登录，签发 JWT          │
│  · /questions   题库（共享只读）                  │
│  · /progress    用户学习进度（按 user_id 隔离）    │
│  · /ai/chat     代理 Kimi（藏 key，SSE 流式）      │
│  · 中间件：JWT 鉴权 / 限流 / CORS                 │
└───────────────────┬───────────────────────────┘
                    │ 内网/加密连接
┌───────────────────┴───────────────────────────┐
│  腾讯云 PostgreSQL（云数据库）                    │
│  · questions        题库（共享只读）              │
│  · users            账号（手机号）                │
│  · user_progress    每用户一条（外键 user_id 隔离）│
│  · otp_codes        短信验证码临时表（可选）       │
└────────────────────────────────────────────────┘
```

**数据隔离靠后端强制**：每个 `/progress` 接口从 JWT 解析出 `user_id`，SQL 里强制 `WHERE user_id = <当前用户>`。
前端传什么都改不了别人的数据——这比 BaaS 安全规则更直接可控。

---

## 第 3 章 · 环境与工具准备（后端零基础从这开始）

### 3.1 安装 Python
- 需要 **Python 3.11 或 3.12**。
- ⚠️ **不要用 Python 3.14**：`pydantic-core`（pydantic 底层，用 Rust 编译）依赖的 PyO3 目前**最高只支持 3.13**，
  用 3.14 会在 `pip install` 时编译失败（报 `the configured Python interpreter version (3.14) is newer than PyO3's maximum supported version`）。
- macOS 用 Homebrew 装 3.12：`brew install python@3.12`，之后用完整路径 `/opt/homebrew/bin/python3.12` 建虚拟环境最稳。
- 验证：`python3.12 --version` 显示 `Python 3.12.x` 即可。
- 若之前误用 3.14 建过虚拟环境导致装依赖失败：`deactivate` → `rm -rf venv` → 用 3.12 重建（见 3.2）。

### 3.2 理解「虚拟环境」（重要，类比 node_modules）
Python 项目的依赖要装在**项目专属的虚拟环境**里（类似前端的 `node_modules`，避免污染全局）：

```bash
# 在后端项目根目录执行
python3 -m venv venv          # 创建虚拟环境（生成 venv 文件夹，类似 node_modules）
source venv/bin/activate      # 激活（Windows 是 venv\Scripts\activate）
# 激活后命令行前面会出现 (venv)，之后 pip install 都装进这里
```

### 3.3 后端依赖（`requirements.txt`，类比 package.json 的 dependencies）
```
fastapi                 # 后端框架
uvicorn[standard]       # 运行 FastAPI 的服务器（类比 vite dev server）
sqlalchemy              # ORM，用 Python 对象操作数据库
asyncpg                 # PostgreSQL 异步驱动
alembic                 # 数据库迁移工具（管理表结构变更，类比 git 管代码）
python-jose[cryptography]  # 签发/校验 JWT
passlib[bcrypt]         # 密码哈希（本项目手机OTP其实不存密码，留作邮箱登录扩展）
pydantic                # 数据校验（FastAPI 内置依赖，定义请求/响应格式）
pydantic-settings       # 读环境变量配置
httpx                   # 后端发 HTTP 请求（代理 Kimi 用）
tencentcloud-sdk-python # 腾讯云 SDK（发短信用）
python-dotenv           # 读 .env 文件
```
安装：`pip install -r requirements.txt`

### 3.4 建议的后端项目结构
```
backend/
├── venv/                    # 虚拟环境（不进 git）
├── .env                     # 环境变量：数据库连接串、JWT密钥、Kimi key、短信配置（不进 git）
├── requirements.txt
├── alembic/                 # 数据库迁移脚本
├── app/
│   ├── main.py              # FastAPI 入口（注册路由、中间件、CORS）
│   ├── config.py            # 读 .env 配置
│   ├── database.py          # 数据库连接
│   ├── models.py            # 数据表定义（ORM 模型）
│   ├── schemas.py           # 请求/响应数据格式（Pydantic）
│   ├── auth.py              # JWT 签发/校验、鉴权依赖
│   ├── deps.py              # 通用依赖（获取当前登录用户等）
│   └── routers/
│       ├── auth.py          # /auth/* 手机 OTP
│       ├── questions.py     # /questions
│       ├── progress.py      # /progress
│       └── ai.py            # /ai/chat 代理 Kimi
└── Dockerfile               # 部署用（打包镜像）
```

---

## 第 4 章 · 数据库准备

> **开发期推荐用本地 Docker 数据库（4.0），零费用、断网可用；上线再用腾讯云（4.1+）。**
> 两者都是 PostgreSQL，后端代码完全一样，**只换 `.env` 的 `DATABASE_URL`**。

### 4.0 本地 Docker PostgreSQL（开发首选）✅ 已采用
前提：安装 **Docker Desktop**（docker.com 下载，按芯片选 Apple/Intel 版）。

```bash
# 起一个本地 PostgreSQL（首次会下载镜像）
docker run -d --name beile-pg \
  -e POSTGRES_USER=beile -e POSTGRES_PASSWORD=beile123 -e POSTGRES_DB=beile_dev \
  -p 5432:5432 postgres:16

# 常用：docker start beile-pg / docker stop beile-pg / docker rm -f beile-pg（删数据重来）
```
对应 `.env`：
```
DATABASE_URL=postgresql+asyncpg://beile:beile123@localhost:5432/beile_dev
```
> 数据存本地容器，删容器即清空（开发够用）。想持久化加 `-v beile-pgdata:/var/lib/postgresql/data`。
> 本地库只有本机能连；要在手机真机 / 多设备联调后端时才需要云库。

### 4.1 开通腾讯云云数据库（上线用；也可用于开发）
1. 注册 / 登录 [腾讯云控制台](https://console.cloud.tencent.com)。
2. 搜索「**云数据库 PostgreSQL**」→ 点「新建」。
3. 选**按量计费**（开发期便宜、随时销毁）、最小规格（如 1核2G）、选**离你近的地域**（如广州/上海）。
4. 设置**管理员账号密码**（记牢，后面连接要用）。
5. 创建后进入实例详情，能看到**内网地址**和**外网地址**（host + port）。

### 4.2 开公网访问 + 加白名单（开发期直连云库的关键）
> 云数据库默认不让外部连，必须显式放行你的开发机。

1. 实例详情 →「网络」→**开启外网访问**（会给你一个外网 host:port）。
2. 「安全组 / 白名单」→ 添加你的**开发机公网 IP**（百度「我的IP」可查）。
   - ⚠️ 家庭/公司 IP 会变，变了要重新加。图省事可临时加 `0.0.0.0/0`（放行所有 IP），
     **但必须配强密码，且上线前务必收紧**，否则数据库裸奔。

### 4.3 建开发库和生产库（环境隔离）
用数据库管理工具连上（推荐图形工具 **DBeaver**，免费、跨平台，类比数据库界的 VS Code）：
1. DBeaver 新建连接 → 选 PostgreSQL → 填外网 host/port/管理员账号密码 → 测试连接。
2. 连上后新建两个数据库（database）：
   - `beile_dev`（开发用）
   - `beile_prod`（上线用，先建着）
3. **开发期后端连 `beile_dev`，上线连 `beile_prod`，只改连接串，代码不变。**

### 4.4 连接串格式（填进后端 .env）
```
# postgresql+asyncpg://用户名:密码@主机:端口/数据库名
DATABASE_URL=postgresql+asyncpg://root:你的密码@外网host:5432/beile_dev
```

---

## 第 5 章 · 数据库表结构设计

第一期**沿用 JSON blob**（和现有 `user_progress` 一致，前端几乎不动）。各 `*_json` 字段用 **TEXT 存 JSON 字符串**，
与前端「`JSON.parse` 口径」完全一致，API 原样收发字符串、前端零改动（将来需按内容查询再迁 `jsonb`）。

### 5.1 建表 SQL（在 DBeaver 里对 `beile_dev` 执行；正式用 alembic 迁移管理）

```sql
-- 用户表
CREATE TABLE users (
  id          BIGSERIAL PRIMARY KEY,          -- 自增主键（类比自动生成的 id）
  phone       VARCHAR(20) UNIQUE NOT NULL,     -- 手机号，唯一
  nickname    VARCHAR(50),
  avatar      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 题库表（共享只读，从现有 questions 导入）
CREATE TABLE questions (
  id          BIGINT PRIMARY KEY,
  cat         TEXT,
  q           TEXT,
  summary     TEXT,
  a           TEXT,
  keywords    TEXT,        -- 仍存 JSON 字符串，前端 safeJson 解析（口径不变）
  pitfalls    TEXT,
  interview   TEXT,        -- 同上，JSON 字符串
  diff        INT,
  sort_order  INT
);

-- 用户学习进度（每用户一条，按 user_id 隔离）
-- 说明：实际由后端启动时自动建表（SQLAlchemy create_all），此 SQL 为等价参考。
-- 各 *_json 用 TEXT 存 JSON 字符串（与前端「JSON.parse 口径」一致，API 原样收发，前端零改动）。
CREATE TABLE user_progress (
  user_id            BIGINT PRIMARY KEY,          -- 一人一行（= users.id）
  cards_json         TEXT DEFAULT '{}',
  daily_json         TEXT DEFAULT '{}',
  custom_json        TEXT DEFAULT '[]',
  documents_json     TEXT DEFAULT '[]',
  deleted_docs_json  TEXT DEFAULT '[]',           -- 题库删除墓碑
  achievements_json  TEXT DEFAULT '{}',           -- 成就
  mode               VARCHAR(20) DEFAULT 'flashcard',
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- 短信验证码临时表（也可用 Redis，但初期用表更简单）
CREATE TABLE otp_codes (
  phone       VARCHAR(20) PRIMARY KEY,
  code        VARCHAR(6) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,           -- 过期时间（如 5 分钟后）
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### 5.2 关键设计说明
- **数据隔离**：`user_progress.user_id` 是主键且外键关联 `users`，**一个用户只有一行**。
  后端所有进度操作都强制带 `WHERE user_id = 当前登录用户`，从根上杜绝串号。
- **`keywords/interview` 仍存 JSON 字符串**：保持前端 `safeJson`（`api.ts` 现有解析）口径不变，前端零改动。
- **JSON blob 不拆表**：`cards/daily/custom/documents` 继续整块存 **TEXT（JSON 字符串）**，前端 `MERGE_CLOUD`/同步逻辑不动。
  卡片量破数千再考虑拆表（现软上限 2000）。

---

## 第 6 章 · 手机 OTP 登录（腾讯云短信 + 后端流程）

> 手机 OTP = 输手机号 → 收短信验证码 → 输码登录。是国内 C 端最主流方式。
>
> **开发期可跳过腾讯云短信开通**：`.env` 里 `DEV_FAKE_SMS=true`（已实现），不真发短信，
> 验证码**固定 `000000`** 并打印到后端终端，即可完整调试登录。仅**上线前**才需开通短信、审核签名/模板、切 `false`。

### 6.1 腾讯云短信开通（有审核周期，尽早办）
1. 控制台搜「**短信 SMS**」→ 开通。
2. **申请短信签名**：如「背了吗」，需提供网站/APP 信息，**人工审核约 1~2 工作日**。
3. **申请短信正文模板**：如 `您的验证码是{1}，5分钟内有效，请勿泄露。`，同样需审核。
4. 审核通过后得到：`SDKAppID`、签名内容、模板 ID，以及 API 密钥 `SecretId`/`SecretKey`。
   全部填进后端 `.env`（不进 git）。

> ⚠️ 签名/模板审核有周期，**和开发并行尽早提交**，别卡上线。

### 6.2 OTP 登录后端流程（两个接口）

**接口 1：发送验证码 `POST /auth/send-otp`**
```
请求：{ "phone": "13800138000" }
后端逻辑：
  1. 校验手机号格式
  2. 限流：同一手机号 60 秒内只能发一次、一天最多 N 次（防刷）
  3. 生成 6 位随机码，存入 otp_codes（phone, code, expires_at=now+5min）
  4. 调腾讯云短信 SDK 发送验证码
  5. 返回 { "ok": true }（绝不把验证码返回给前端）
```

**接口 2：验证码登录/注册 `POST /auth/login`**
```
请求：{ "phone": "13800138000", "code": "123456" }
后端逻辑：
  1. 查 otp_codes：phone 对应的 code 是否匹配、是否未过期
  2. 不匹配/过期 → 返回错误
  3. 匹配 → 删除该验证码（一次性）
  4. 查 users 表：手机号存在则登录；不存在则自动注册（插入 users）
  5. 用 python-jose 签发 JWT（payload 含 user_id、过期时间）
  6. 返回 { "token": "xxx.yyy.zzz", "user": { id, phone, nickname, avatar } }
```

**接口 3：获取当前用户 `GET /auth/me`**（替换现有 verifySession）
```
请求头：Authorization: Bearer <token>
后端逻辑：从 token 解出 user_id，查 users 返回用户信息；token 无效返回 401
```

### 6.3 JWT 工作方式（类比现在的 session token）
- 登录成功后端签发 JWT，前端存 localStorage。
- 之后**每个请求**在 header 带 `Authorization: Bearer <token>`。
- 后端用一个「依赖」`get_current_user`（FastAPI 的 `Depends`）自动解析 token → 拿到 user_id →
  接口里就知道「是谁在请求」，无需前端传 user_id。
- token 过期（如 7 天）→ 前端跳登录页重新登录（可选做 refresh token 续期，二期再说）。

---

## 第 7 章 · 后端 API 完整设计（替换 Builder 的 `/supabase/rows/*`）

**设计原则**：前端 `api.ts` 的对外函数签名**尽量不变**，只换内部实现，这样 `store.tsx` 的
`MERGE_CLOUD` / `syncToCloudDebounced` 几乎不用动。

| 现有前端函数 | 新后端接口 | 方法 | 鉴权 | 说明 |
|---|---|---|---|---|
| — | `/auth/send-otp` | POST | 否 | 发短信验证码 |
| `exchangeCode` 替代 | `/auth/login` | POST | 否 | 验证码登录，返回 JWT |
| `verifySession` 替代 | `/auth/me` | GET | 是 | 拿当前用户信息 |
| `loadQuestions()` | `/questions` | GET | 是 | 题库全量（可缓存） |
| `loadFromCloud()` | `/progress` | GET | 是 | 返回当前用户的 progress（无则返回空默认值） |
| `syncToCloud()` | `/progress` | PUT | 是 | upsert 当前用户 progress（整块 blob 覆盖写） |
| AI（二期） | `/ai/chat` | POST | 是 | 代理 Kimi，SSE 流式 |

**`/progress` 的 GET 返回格式**（对齐现有 `loadFromCloud` 返回，前端解析口径不变）：
```json
{
  "cards_json": "{...}",
  "daily_json": "{...}",
  "custom_json": "[...]",
  "documents_json": "[...]",
  "deleted_docs_json": "[...]",
  "achievements_json": "{...}",
  "mode": "flashcard"
}
```
> 后端从 JWT 取 user_id，`SELECT ... FROM user_progress WHERE user_id = <当前用户>`；无记录返回空默认值。

**`/progress` 的 PUT**：接收整块 JSON → `INSERT ... ON CONFLICT (user_id) DO UPDATE`（PostgreSQL 的 upsert）。
对应现有 `syncToCloud` 的「有则更新、无则插入」语义，`cloudRowId` 概念可弱化（用户维度已经唯一）。

---

## 第 8 章 · AI 代理（FastAPI 原生 SSE，无流式顾虑）

> 这是自建 FastAPI 相比 BaaS 云函数的最大优势：**FastAPI 原生支持 SSE 流式**（`StreamingResponse`），
> 不用担心云函数流式限制。

**接口 `/ai/chat`**：
```
请求头：Authorization: Bearer <token>（校验登录，拒匿名）
请求体：{ "messages": [...] }  # 前端组装好的对话消息（沿用 kimi.ts 现有编排）
后端逻辑：
  1. 校验 JWT + 每用户限流（防薅 AI 额度）
  2. 用环境变量里的 Kimi key 调 Moonshot（stream=true）
  3. 用 StreamingResponse 把 Moonshot 的 SSE 逐块透传回前端
```

**前端改造（`kimi.ts` / `cardGen.ts`，二期）**：
- `streamChat` 的 `fetch(API_URL, ...)` → 改为 `fetch(后端/ai/chat, { headers: Authorization })`。
- **移除 `VITE_KIMI_API_KEY`**，前端不再持有 key。
- **保留** kimi.ts 现有的三道流式完整性防线、token 预算截断、System Prompt / 卡片上下文治理
  （`buildApiMessages` 等纯前端编排逻辑不受代理影响）。
- `cardGen.ts`（文档生成卡片的一次性调用）同样改调代理。

---

## 第 9 章 · 前端改造清单

> 前端你熟，这里只列改动点。**业务逻辑（SRS/store/UI）不动**。

### 第一期（认证 + 数据）
1. **`api.ts` 大改**：
   - 删除 Builder 全套：`exchangeCode` / `verifySession` / `redirectToLogin` / `BST_KEY` / `X-Builder-Session` / `bfetch`。
   - 新增：一个带 JWT 的 `request` 封装（自动加 `Authorization` header、处理 401 跳登录）。
   - `loadQuestions` / `loadFromCloud` / `syncToCloud` **保持函数签名**，内部改调新后端接口。
   - 新增 `sendOtp(phone)` / `login(phone, code)` / `getMe()`。
2. **新增登录页组件**（当前无，直接跳 SSO）：手机号输入 + 发验证码 + 输码登录。**复用现有 CSS 变量体系，不引 UI 库**（遵守 CLAUDE.md）。
3. **`App.tsx` 认证初始化改造**（现约 44-93 行）：
   - 从「处理 OAuth 回调 → 换 token」改为「检查 localStorage 有无 JWT → 有则 `getMe` 验证 + 加载数据；无则显示登录页」。
4. **`store.tsx` 小改**：`cloudRowId` 语义（用户维度已唯一，可保留/弱化）；`MERGE_CLOUD` 逻辑不动，但**首次登录合并要回归测试**。
5. **token 存储**：JWT 存 localStorage（如 key `beile_token`），替换 `bst_bld_...`。

### 第二期（AI 代理）
6. `kimi.ts` / `cardGen.ts` 改调 `/ai/chat`，移除 `VITE_KIMI_API_KEY`。

### 环境变量
- 前端 `.env`：新增 `VITE_API_BASE`（后端地址）；第二期移除 `VITE_KIMI_API_KEY`。

---

## 第 10 章 · 本地开发怎么跑（前端 + 后端 + 云库联调）

1. **启动后端**（连云库 `beile_dev`）：
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn app.main:app --reload --port 8000
   # 访问 http://localhost:8000/docs 能看到 FastAPI 自动生成的接口文档（可直接点着测接口！）
   ```
   > FastAPI 有个杀手锏：`/docs` 自动生成交互式 API 文档，你能在网页上直接填参数测每个接口，
   > 对后端零基础极友好——不用 Postman。
2. **启动前端**：`npm run dev`，`.env` 里 `VITE_API_BASE=http://localhost:8000`。
3. **解决 CORS**：后端 `main.py` 里配 CORS 中间件，允许前端本地地址（`http://localhost:5173`）。
   否则浏览器会报跨域错误。
4. 前端调后端、后端连云库——本地就能完整联调。

---

## 第 11 章 · 部署（腾讯云，尽量少运维）

### 11.1 后端部署：腾讯云「云托管 CloudBase Run / 容器服务」
> 推荐**云托管**：给它一个 Dockerfile，它自动构建镜像并跑起来，**不用你管服务器**。

1. 写 `Dockerfile`（打包 FastAPI + Python 环境，方案可提供模板）。
2. 腾讯云控制台 → 云托管 → 新建服务 → 上传代码 / 关联 git → 自动构建部署。
3. 环境变量（数据库连接串、JWT 密钥、Kimi key、短信配置）在云托管控制台配置（**不写进代码/镜像**）。
4. 数据库连接串改为 `beile_prod` + **内网地址**（后端和数据库同地域走内网，更快更安全）。
5. 得到后端公网访问域名，填进前端 `.env` 的 `VITE_API_BASE`。

### 11.2 前端部署：腾讯云静态托管 / COS + CDN
- `npm run build` → `dist/` 上传到静态托管。
- 调整 `vite.config.ts` 的 `base` 为实际部署路径。

### 11.3 域名 / 备案 / HTTPS（国内公网硬性要求）
- **ICP 备案**：国内公网访问的域名必须备案，**有周期（约 1~2 周），尽早启动**，和开发并行。
- **HTTPS 必须**：现有 `docParser` 用 `crypto.subtle` 算文档 hash / 指纹（去重用），**依赖安全上下文（HTTPS）**，
  非 HTTPS 会降级；且 JWT/隐私数据传输必须加密。腾讯云可申请免费 SSL 证书。

### 11.4 合规与滥用防护（面向 C 端）
- 隐私政策、用户协议（收集手机号需告知）、《个人信息保护法》合规、**用户注销 / 数据删除**能力。
- 注册限流、AI 限流（每用户）、短信发送限流、上传大小限制（已有 `MAX_FILE_SIZE`）、类型白名单（已有 `SUPPORTED_EXT`）。

---

## 第 12 章 · 分期与执行 checklist

### 第一期：后端 + 认证 + 数据（公网多用户）
**准备（并行）**：
- [ ] 启动**域名 ICP 备案**
- [ ] 开通**腾讯云短信**，提交签名 + 模板审核

**后端**：
- [ ] 装 Python / 建虚拟环境 / 装依赖
- [ ] 开通腾讯云 PostgreSQL，建 `beile_dev`/`beile_prod`，配白名单
- [ ] 建表（users / questions / user_progress / otp_codes），导入题库数据
- [ ] 搭 FastAPI 骨架：config / database / models / JWT / CORS / 限流中间件
- [ ] 实现 `/auth/send-otp`、`/auth/login`、`/auth/me`
- [ ] 实现 `/questions`、`/progress`(GET/PUT)
- [ ] 用 `/docs` 自测每个接口

**前端**：
- [ ] 新增登录页（手机号 + 验证码）
- [ ] `api.ts` 换成调后端 + 带 JWT
- [ ] `App.tsx` 认证初始化改造

**回归**：
- [ ] **两个账号交叉验证数据隔离（最高危项，必测）**
- [ ] SRS / 上传 / 删除 / 更新 / 统计 / 成就全正常
- [ ] 老 localStorage 首次登录合并正常（`MERGE_CLOUD` + `deletedDocs` 墓碑）

### 第二期：AI 代理 + 硬化（正式对外）
- [ ] 后端 `/ai/chat` 代理 Kimi（验证 SSE 流式）
- [ ] 前端 `kimi.ts` / `cardGen.ts` 改调代理，移除 `VITE_KIMI_API_KEY`
- [ ] 后端部署（云托管 + 内网连库）+ 前端静态托管
- [ ] 备案域名 + HTTPS + 每用户限流 + 隐私政策 / 用户协议 / 注销能力
- [ ] 正式对外

> ⚠️ **时间窗风险**：第一期上线了多用户但 AI key 仍在前端（第二期才代理）。因此
> **第一期只做内测/灰度、不真开放注册**，或两期一起上，避免 key 在窗口期暴露。

---

## 第 13 章 · 风险与回滚

| 风险 | 应对 |
|---|---|
| 多用户数据串号（最高危） | 后端强制 `WHERE user_id` + 两账号交叉验收，上线前必测 |
| AI key 泄露盗刷 | 第二期代理为硬门槛；代理未完成前不真开放注册 |
| 数据库白名单开 `0.0.0.0/0` 忘记收紧 | 上线前收紧白名单为后端内网；强密码 |
| 短信被刷（薅短信费） | 手机号 60s/单条 + 每日上限限流；图形验证码（可选） |
| 备案周期拖延上线 | 尽早启动，与开发并行 |
| `MERGE_CLOUD` 并集把他人/已删数据合入 | 复用 `deletedDocs` 墓碑；首次登录合并回归 |
| 迁移中断 | 分期上线、各自可回滚；保留 Builder 版本为回退分支 |

---

## 第 14 章 · 后续演进（本期不做，预留）
- **RAG**（检索用户上传文档原文）：需持久化文档分块 + 向量检索。腾讯云可用向量数据库 / PostgreSQL 的
  `pgvector` 扩展 + embedding。会**推翻现有「文档不落地」设计**，作为独立一期，前两期上线、观察真实需求后再投。
- **blob 拆表**：卡片量破数千后，把 `cards/custom` 拆为规范化存储，支持增量同步与分页。
- **refresh token / 第三方登录（微信扫码）**：提升登录体验。

---

## 第 15 章 · 一句话总结
自建 **FastAPI 后端**做守门人（认证 / 数据隔离 / AI 代理），数据存**腾讯云 PostgreSQL**，
登录用**手机号 OTP**，前端**独立 H5** 通过 JWT 调后端。分「后端+多用户 → AI代理+硬化」两期推进，
业务逻辑（SRS/store/UI）几乎不动，每期可独立回滚。
**关键前置：尽早启动域名备案 + 短信签名审核；开发期直连云库（分 dev/prod 库）；上线务必收紧数据库白名单、上 HTTPS、藏好 Kimi key。**
