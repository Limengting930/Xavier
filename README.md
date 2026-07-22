# 背了吗 —— 你的知识速记卡片

> 把琐碎的知识点整理成小卡片，让你在通勤、排队等各种碎片化场景都能随时随地大小背，堪称八股界的「不背单词」。

「背了吗」是一款 **AI 驱动的通用知识速记工具**。它把零散的知识点做成可翻转的闪卡，配合 **SM-2 间隔重复算法**智能安排复习节奏，帮你把"看过就忘"变成"真正记住"。

**你的任何资料都能一键变成题库**——上传 `md / Word / PDF`，AI 自动拆成记忆卡片。不管是 LLM / Agent 面试八股、考研专业课、要考的证书，还是想背下来的笔记，都能用它随时随地背。

---

今天，你「背了吗」？

是不是总有一堆想记住的东西：考研的专业课、要考的证书、面试八股文……

收藏了、下载了、整理了，划了一堆重点，却一直拖着没真正记住？

有了「背了吗」，任何资料都能变成随身闪记卡。上传一份 `md / Word / PDF`，AI 自动帮你拆成一张张记忆卡片，不用手动录入。每天通勤、排队、等车时，拿出来刷一刷，当天该学的、该复习的，立马轻松完成。

它可以帮助你：

1. **上传任意文档**（`md / docx / pdf`），AI 自动生成专属题库，不用一张张手打。
2. 把碎片时间用起来，**想背什么就建什么库**，随心切换。
3. 用 **SM-2 间隔重复算法**，在你快要忘记时刚好推送复习，科学记忆，直到形成"肌肉记忆"。
4. **可视化学习数据**，按题库分门别类，让日积月累的成果被"看见"。
5. 内置 **AI 小助手**，随时答疑解惑、举一反三。

你想记住的一切，都能变成随身携带的记忆卡片。下次考试、面试、或只是想检验自己前，先问一句：**今天，你「背了吗」？**

## 亮点

- **上传文档，一键成库**：上传本地 `md / Word / PDF`，AI 自动解析并拆成一张张记忆卡片，无需手动录题——你自己的讲义、笔记、八股，都能秒变随身题库。
- **多题库自由管理**：内置「AI 面试题库」+ 无限自建题库，支持重命名、增量更新、删除；可按题库浏览、筛选、统计，还能在首页指定「今天只学哪个题库」。
- **聚焦 AI 面试**：内置 Agent 开发高频面试题，覆盖 LLM、Prompt、工具调用、记忆、规划等核心考点，开箱即用。
- **碎片化学习**：卡片式交互，通勤、排队随时来几张，学习无压力。
- **科学复习**：基于 SM-2 间隔重复算法，按你的掌握程度自动决定"什么时候再看这道题"。
- **复习优先机制**：当天有到期复习题时先复习再学新题，避免知识欠账越滚越多。
- **进度可视化**：学习时长、连击天数、分题库掌握进度、成就体系与学习日历，一目了然，正反馈拉满。
- **AI 学习助手**：翻卡看答案时可唤起「兔叽咪」，基于当前题目与标准答案答疑、举例、拓展考点，流式输出 + Markdown 渲染。
- **多端同步 & 离线兜底**：登录后学习进度、自建题库云端同步，多设备接力；未登录 / 离线以 localStorage 兜底，数据不丢。
- **极致轻量**：纯前端 + BaaS，无重型依赖，图片资源经 WebP 压缩约 98% 并内联，切页/刷新不重复请求。

## 功能演示

### 主页 —— 复习与今日学习入口

<div align="center">
  <img src="samples/s1.png" width="300" alt="主页" />
</div>

App 首页。汇总今日的待复习题目与学习目标，点击即可开始复习或学习。到期复习题优先解锁，学完才能继续攻新题；还能在这里选择「今天想学哪个题库」。

### 学习流程 —— 翻卡、评分、随学随问

<div align="center">
  <img src="samples/s2.png" width="240" alt="学习卡片题面" />
  <img src="samples/s3.png" width="240" alt="学习卡片答案页" />
  <img src="samples/s4.png" width="240" alt="AI 学习助手" />
</div>

卡片正面展示题目（支持图文，左图），点击翻到答案面（中图）可快速查看完整解析——关键词、易错点、面试追问，并选择自己对这道题的掌握程度（未掌握 / 模糊 / 已掌握），系统据此安排下次复习时间。点击答案页右下角图标，即可唤起 AI 助手「兔叽咪」（右图）：它自动读取当前题目与标准答案作为上下文，围绕本题举例、拓展考点、给出记忆建议，也支持自由追问；回答流式输出、Markdown 渲染（含代码高亮），断流可一键「重新生成」。

---

### 上传文档，AI 自动生成题库 ✨

> 「背了吗」不止内置题库——你自己的任何资料都能一键变成学习卡片。

<div align="center">
  <img src="samples/s5.png" width="240" alt="上传本地文档" />
  <img src="samples/s6.png" width="240" alt="卡片生成进度" />
  <img src="samples/s7.png" width="240" alt="生成成功" />
</div>

在题库页上传本地文档（`md / Word / PDF`），AI 自动解析内容并拆成一张张记忆卡片，无需手动录题。生成过程实时展示进度，逐段解析、支持随时取消，不必干等。生成成功后提示卡片数量，可进入题库查看这批新卡片。

### 题库管理 —— 自建、命名、随心组织

<div align="center">
  <img src="samples/s8.png" width="240" alt="题库列表（含用户上传题库）" />
  <img src="samples/s9.png" width="240" alt="题库重命名" />
  <img src="samples/s10.png" width="240" alt="首页选择今日学习题库" />
</div>

题库页按题库分组展示：内置「AI 面试题库」+ 你上传的每一个题库并列呈现，每个题库直观显示学习进度与上次学习时间，点击进入该题库的题目列表。上传的题库可随时重命名，也支持增量更新与删除，方便长期维护自己的知识库。还能在首页指定「今天想学习哪个题库」，让每日学习目标只从选定题库中安排，专注攻克某个方向。

---

### 统计 —— 学习情况 & 分题库掌握度

<div align="center">
  <img src="samples/s11.png" width="300" alt="统计页" />
</div>

统计你的学习全貌：累计学习时长、连续学习天数、总学习题数，并**按题库分区展示各自的掌握程度**——每个题库学到什么程度，一目了然，互不干扰。

### 个人主页 & 成就 —— 让坚持被看见

<div align="center">
  <img src="samples/s12.png" width="260" alt="个人主页" />
  <img src="samples/s13.png" width="260" alt="成就列表" />
</div>

个人主页展示学习信息、已获成就与学习日历，坚持了多少天、哪天学过都看得见；成就列表汇总连续学习、掌握题库等里程碑徽章，达成即点亮，正反馈拉满。


## 技术栈

| 分类 | 选型 |
|---|---|
| 构建工具 | Vite 8 |
| 框架 | React 19 |
| 语言 | TypeScript 6 |
| 状态管理 | React Context + useReducer（无第三方状态库） |
| 样式 | 原生 CSS（CSS 变量体系） |
| Markdown 渲染 | marked + highlight.js（答案富文本 + 代码高亮） |
| AI 助手 | Kimi (Moonshot) OpenAI 兼容协议 · SSE 流式输出 |
| 复习算法 | SM-2 间隔重复算法（自实现） |
| 后端 | Python + FastAPI |
| 数据库 | PostgreSQL（开发用本地 Docker，生产用腾讯云）|
| 认证 | 手机号 + 短信验证码（OTP）· JWT |
| 数据持久化 | 后端云同步 + localStorage 本地兜底 |
| 代码检查 | oxlint（前端）|


## 快速开始（在任意设备上从零运行整个项目）

项目分**前端**（根目录）和**后端**（`backend/`），配套一个 **PostgreSQL 数据库**。
开发环境推荐：本地用 Docker 跑数据库 + 后端 `DEV_FAKE_SMS`（不真发短信，验证码固定 `000000`）。

### 前置要求（换新设备先装这些）
- **Node.js 20+**（前端）
- **Python 3.11 或 3.12**（后端；⚠️ 不要用 3.14，pydantic 尚未适配）
- **Docker Desktop**（本地跑数据库；或用云 PostgreSQL 也可）

### 第 1 步 · 启动数据库（本地 Docker）
```bash
docker run -d --name beile-pg \
  -e POSTGRES_USER=beile -e POSTGRES_PASSWORD=beile123 -e POSTGRES_DB=beile_dev \
  -p 5432:5432 postgres:16
# 已建过容器时，之后只需：docker start beile-pg
```
> 不用 Docker 也可：用云 PostgreSQL（如腾讯云），把下面 `.env` 的 `DATABASE_URL` 换成云库地址即可，代码不变。

### 第 2 步 · 启动后端（FastAPI）
```bash
cd backend
python3.12 -m venv venv          # 用 3.11/3.12 创建虚拟环境
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env              # 复制配置模板，然后编辑 .env（见下方「配置说明」）

uvicorn app.main:app --reload --port 8000   # 首次启动自动建表
# 打开 http://localhost:8000/docs 能看到接口文档 = 后端 + 数据库连通
```

**导入题库**（题库页需要数据）：准备 `questions.json` 后运行
```bash
python scripts/import_questions.py questions.json
```
> `questions.json` 获取方式见 `backend/README.md`。

### 第 3 步 · 启动前端（React）
```bash
# 回到项目根目录
npm install
# 新建 .env.local，写入后端地址：
echo "VITE_API_BASE=http://localhost:8000" > .env.local
npm run dev
```
打开前端 → **登录页** → 输入任意合法手机号 → 点「获取验证码」→
**验证码看后端终端打印的 `000000`** → 登录（未注册手机号自动创建账号）。

### 常用命令
```bash
# 前端（根目录）
npm run dev / npm run build / npm run preview / npm run lint

# 后端（backend/，需先 source venv/bin/activate）
uvicorn app.main:app --reload --port 8000
```

### 配置说明（两个 .env）

**① 后端 `backend/.env`**（从 `.env.example` 复制，不提交 git）：
| 变量 | 说明 | 开发期填法 |
|---|---|---|
| `DATABASE_URL` | 数据库连接串 | `postgresql+asyncpg://beile:beile123@localhost:5432/beile_dev` |
| `JWT_SECRET` | JWT 签名密钥（保密） | 任意长随机串，可用 `openssl rand -hex 32` 生成 |
| `DEV_FAKE_SMS` | 是否假发短信 | 开发 `true`（验证码固定 `000000`，打印到后端终端）|
| `CORS_ORIGINS` | 允许的前端地址 | 默认含 `http://localhost:5173`，端口不同要改 |
| 腾讯云短信相关 | 真发短信才需要 | 开发期留空即可 |

**② 前端 `.env.local`**（不提交 git）：
| 变量 | 说明 | 开发期填法 |
|---|---|---|
| `VITE_API_BASE` | 后端地址 | `http://localhost:8000` |

> 换设备时：装好前置要求 → 起数据库 → 建两个 `.env` → 分别装依赖启动即可。
> `.env` / `.env.local` / `venv` / `node_modules` 都不进 git，需在新设备重新创建 / 安装。


## 目录结构

```
beile-ma/
├── src/                       # 前端源码（React SPA）
│   ├── App.tsx                # 主入口：认证/登录 gate、页面切换、学习队列、目标/题库管理
│   ├── api.ts                 # 后端 API 封装（JWT 认证、题库、进度同步、AI 代理）
│   ├── store.tsx              # 全局状态、SM-2 算法、localStorage 持久化、云端合并
│   ├── types.ts              # 类型定义与常量
│   ├── index.css              # CSS 变量（:root）+ 全局基础样式
│   ├── styles/                # 按模块拆分的样式（home/learn/library/stats/login/upload…）
│   ├── utils/                 # 工具（kimi AI 封装、docParser 文档解析、chunker、cardGen、分类图标…）
│   └── components/
│       ├── LoginPage.tsx      # 登录页（手机 OTP）
│       ├── HomePage.tsx       # 主页（学习 / 复习入口、今日题库）
│       ├── LearnPage.tsx      # 学习页（翻卡、评分）
│       ├── LibraryPage.tsx    # 题库（两级：题库列表 → 题目列表；上传/删除/更新/重命名）
│       ├── StatsPage.tsx      # 统计页（按题库分区掌握度）
│       ├── MePage.tsx         # 个人主页（成就、日历）
│       ├── UploadSheet.tsx    # 上传文档 → AI 生成卡片
│       ├── GoalPicker.tsx     # 每日目标选择
│       ├── icons.tsx          # SVG 图标 / 插画（图片组件 fallback）
│       └── home/ library/ learn/  # 各页子组件
├── backend/                   # 后端源码（Python + FastAPI）
│   ├── app/
│   │   ├── main.py            # 入口：CORS、注册路由、启动建表
│   │   ├── config.py          # 读 .env 配置
│   │   ├── database.py        # 数据库连接（SQLAlchemy 异步）
│   │   ├── models.py          # 数据表：users / questions / user_progress / otp_codes
│   │   ├── schemas.py         # 请求/响应格式（Pydantic）
│   │   ├── auth.py            # JWT 签发 / 校验
│   │   ├── deps.py            # 当前登录用户依赖（按 JWT 解析）
│   │   ├── sms.py             # 腾讯云短信（开发模式假发）
│   │   └── routers/
│   │       ├── auth.py        # /api/auth/*   手机 OTP 登录注册
│   │       ├── questions.py   # /api/questions   题库（共享只读）
│   │       └── progress.py    # /api/progress    学习进度（按 user_id 隔离）
│   ├── scripts/import_questions.py  # 题库导入脚本
│   ├── requirements.txt       # 后端依赖
│   ├── .env.example           # 后端环境变量模板
│   ├── Dockerfile             # 部署镜像
│   └── README.md              # 后端专属说明
├── docs/                      # 设计与迁移方案文档
├── samples/                   # README 截图
└── README.md                  # 本文件（项目总说明）
```

### 后端接口一览（前缀 `/api`）
| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| POST | `/auth/send-otp` | 否 | 发送短信验证码（开发模式打印到后端终端） |
| POST | `/auth/login` | 否 | 验证码登录 / 注册，返回 JWT |
| GET | `/auth/me` | 是 | 当前登录用户信息 |
| GET | `/questions` | 是 | 题库全量（共享只读） |
| GET | `/progress` | 是 | 当前用户学习进度 |
| PUT | `/progress` | 是 | 覆盖写当前用户进度 |
| GET | `/health` | 否 | 健康检查 |

> 数据隔离：所有 `/progress` 操作从 JWT 解析 `user_id`，SQL 强制 `WHERE user_id = 当前用户`，杜绝多用户串号。


## 核心机制

### SM-2 间隔重复

每张卡片记录 `status`（0 未掌握 / 1 模糊 / 2 已掌握 / null 未学习）、`interval`、
`easeFactor`、`nextReview` 等字段。评分后按算法推算下次复习时间——记得越牢，
间隔越长；答错则缩短间隔，直到真正掌握。

### 复习优先队列

首页判断 `canStartNew = reviewTotal === 0 || reviewDone >= reviewTotal`：
当天到期复习题未清空前不解锁新题，保证旧知识先巩固。复习分母采用当天首次访问的
ID 快照，避免评分后 `nextReview` 推移导致进度抖动。

### 云端 + 本地双持久化

登录后学习进度写入 Builder 数据库；未登录或离线时以 localStorage
（key `beile_ma_v3`）兜底，保证数据不丢。

### AI 助手上下文治理

整个学习队列共享一份对话，退出即销毁。为兼顾"记得住"与"不串题"，采用分层消息结构：
固定 System Prompt（身份 + 防幻觉约束）、切卡时以隐藏消息注入当前题目背景（写入即固化、界面不显示）、
严格时间序的对话历史；发送前按 token 预算做滑动窗口截断（保护 System 与题目背景）。
流式输出经三道防线保证完整性（字节重组、事件切分、`[DONE]` 校验），断流保留已生成内容并支持重新生成。

> 完整设计与踩坑记录见 `robot.md`。

## 性能优化：图片资源

`src/assets/` 原有大量 PNG 插画/图标（合计约 5.8MB，单文件 200KB~1.4MB），
但实际渲染尺寸仅 22~120px，造成严重浪费。优化方案：

1. **PNG → WebP + 按显示尺寸 resize**（各组件默认 `size` 的 2x），删除旧 PNG。
2. **补齐组件 `import.meta.glob` 的 `webp` 匹配**，让新图被正确读取。

效果：**图片总量 ~5.8MB → ~85KB，缩减约 98%**。

素材优化脚本：`scripts/optimize-assets.sh`（依赖 `imagemagick` + `webp`）：

```bash
brew install imagemagick webp        # macOS 安装工具
bash scripts/optimize-assets.sh      # 新增/替换素材后运行
npm run build                        # 验证产物体积
```

脚本按预设尺寸表把 `src/assets/<name>.png` 转为 `<name>.webp`（`q=82`、`method=6`、
去元数据、只缩不放大）。新增图片在脚本 `SPECS` 列表补一行 `文件名 最大边像素` 即可。

> 每个图片组件都带 SVG fallback（`src/components/icons.tsx`），素材缺失或加载失败会自动回退。
> 构建时 <4KB 小图被 Vite 内联为 base64（省请求），较大图独立成带 hash 的 `.webp`。

### 图片加载与缓存优化

除了压缩体积，还针对「刷新 / 切换导航时图片被重复请求 / 重新加载」做了优化。

**背景**：图片默认打包成带 hash 的独立 `.webp` 文件。要让浏览器缓存它们、避免刷新重复下载，
标准做法是服务器对 `/assets/*` 配长缓存头（`Cache-Control: public, max-age=31536000, immutable`）。
但**本项目部署平台（小红书 Builder）不支持配置静态资源缓存头** —— 没有缓存头，浏览器不会缓存图片，
即使前端做了「预加载」也只是提前请求一次、用完即弃，后续每个 `<img>` 挂载仍会重复请求。

**实际采用方案：构建内联（base64）**。既然无法配缓存头，就让图片**不再是独立请求** ——
调高 `vite.config.ts` 的 `build.assetsInlineLimit`，把 `assets` 图片全部内联进 JS/CSS：

```ts
// vite.config.ts
build: {
  assetsInlineLimit: 20 * 1024, // 20KB，覆盖现有全部图（最大 ~13KB）
}
```

效果：

- 构建产物 `dist/assets` 下**不再有独立 `.webp`**，图片以 base64 随 JS/CSS 一起加载；
- **切换导航**：bundle 早在内存，图片是其中的字符串，`<img>` 直接用，**零网络请求**；
- **刷新页面**：图片跟主 bundle 一起走，不再有几十个散图各自重复请求。
- 代价：主 JS/CSS 体积略增（图片总量本就压到 ~85KB，gzip 后增量可接受）。

> 注意：`pdf.worker` 等是 JS chunk（非 asset），不受 `assetsInlineLimit` 影响，仍按需独立加载。
> 新增图片若 > 20KB 会退回独立文件（重新出现重复请求问题），需相应调高阈值。

**辅助：全量预加载**（`src/utils/preloadAssets.ts`）：App 挂载时用 `import.meta.glob` 收集
`src/assets` 下所有图片并 `new Image()` 预加载。内联后 glob 返回 data URI，预加载基本成为空操作；
保留它是为了兼容「未内联的散图」场景（如阈值下有大图时），仍能提前缓存、减少切页闪烁。

**备选（其他支持缓存头的平台推荐）**：若部署平台可配缓存头，更优做法是不内联、保持散图 + 配长缓存：

| 资源 | 缓存策略 | 原因 |
|---|---|---|
| `/assets/*`（带 hash 的 js/css/图片） | `Cache-Control: public, max-age=31536000, immutable` | 内容变文件名就变，可永久强缓存 |
| `index.html` | `Cache-Control: no-cache`（或很短 max-age） | 必须每次校验，才能拿到引用新 hash 资源的最新版本 |

```nginx
location /page/beile-ma-react/assets/ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}
location = /page/beile-ma-react/index.html {
  add_header Cache-Control "no-cache";
}
```

> **验证**：线上 F12 → Network → 过滤 Img。内联方案下切导航 / 刷新都应**看不到 webp 图片请求**；
> 缓存头方案下刷新时图片状态应为 `(from disk cache)` / `304`。



## 部署

- `vite.config.ts` 的 `base` 上线时须为 `/page/beile-ma-react/`。
- 构建产物位于 `dist/`。

---

更多开发约定见 `CLAUDE.md`。
