# 项目工作说明

## 项目概述

- 本项目是「背了吗」前端面试闪卡 App，基于 SM-2 间隔重复算法帮助用户记忆前端知识点。
- 技术栈：Vite + React 19 + TypeScript
- 后端依赖小红书内部 Builder 平台（BaaS），提供 OAuth 认证和 Supabase 数据库能力。
- 优先遵循现有代码风格，不要引入新的架构、UI 库或状态管理库。

## 常用命令

- 安装依赖：`npm install`
- 本地开发：`npm run dev`
- 构建检查：`npm run build`

## 目录结构

- `src/App.tsx`：主入口，负责认证流程、页面切换、学习队列构建、目标管理
- `src/index.css`：CSS 变量定义（`:root`）+ 全局基础样式
- `src/styles/`：按模块拆分的样式文件（`base.css` 全局容器+通用 Toast/Overlay/Sheet；`home.css` / `nav.css` / `learn.css` / `library.css` / `stats.css` / `goal-picker.css` / `me.css` / `speech-bubble.css` / `chatbot.css` 各对应组件），统一在 `src/App.tsx` 顶部 import；基于 CSS 变量体系，不要内联样式或引入外部 CSS
- `src/store.tsx`：全局状态（Context + useReducer）、SRS 算法、localStorage 持久化
- `src/api.ts`：所有 Builder API 请求封装，认证、题目加载、云端同步
- `src/types.ts`：类型定义和常量（PREVIEW_TYPES、QUEUE_LABELS 等）
- `src/components/`：各页面组件（HomePage / LibraryPage / StatsPage / LearnPage / GoalPicker）

## 编码规范

- 所有 Builder API 请求必须放在 `src/api.ts`，组件不直接调用 `fetch`。
- 状态读写必须通过 `useApp()` Hook，不要在组件内直接操作 localStorage。
- 新增可复用逻辑（如计算连击天数、格式化时长）抽到 `src/store.tsx` 或独立 hook 文件。
- CSS 新增样式写在 `src/styles/` 下对应模块文件末尾（全局/通用样式写 `base.css`），用注释标注归属模块；如新增模块需在 `src/App.tsx` 顶部 import。
- 组件 props 必须定义 TypeScript interface，不用 `any`。

## 关键约束

### 认证
- 所有 API 请求只用 `X-Builder-Session` header，**不携带 cookie**（会导致 431 错误）。
- `builder_session_token` 存在 `localStorage`，key 为 `bst_bld_258e10d749d04cc99139d1b28b1a3854`。
- `redirect_uri` 必须用 `new URL(location.href)` 构建后删除 `builder_auth_code` 和 `expires_in`，不能用 `location.origin + location.pathname`。

### 数据库
- 题目数据查询用 `QUESTIONS_APP_ID = bld_142aad4f922548c68389a56ba7ecaaf5`（和进度数据的 APP_ID 不同）。
- 用户进度读写用 `APP_ID = bld_258e10d749d04cc99139d1b28b1a3854`。
- `keywords` 和 `interview` 字段从数据库取出是 JSON 字符串，使用前必须 `JSON.parse`。

### SRS 状态
- `store.cards[id].status`：`0`=未掌握，`1`=模糊，`2`=已掌握，`null`=未学习。
- `store.daily[date].ids`：当天已评分题目 id 数组，`studied = ids.length`，去重用，不要直接 `studied++`。
- localStorage key 固定为 `beile_ma_v3`，不要修改。

### 学习队列
- 首页强制学习顺序：当天有到期复习题时必须先在「待复习」卡片里学完，「今日学习目标」（新题）卡片才会解锁；判断条件 `canStartNew = reviewTotal === 0 || reviewDone >= reviewTotal`。
- `buildQueue('review-due')`：今日到期的复习题（`reviewCount > 0 && nextReview <= now`），不限数量，全部取出，有评分栏。
- `buildQueue('all')`（新题）：排除 `todayIds`（今日已学）+ 排除当前到期的复习题（不会和复习题混在一起），取前 `goal` 道作为候选池。
- `reviewCount > 0` 这个条件很重要：只收藏过、从未评分的卡片 `nextReview` 默认是 `0`，如果只判断 `nextReview <= now` 会被误判为"到期"。
- `getTodayProgress()`（`store.tsx` 暴露）返回 `{ reviewTotal, reviewDone, newDone, canStartNew }`：`reviewTotal`/复习题分母来自当天首次访问时缓存的到期复习题 **ID 快照**（不是纯数字），因为评分后 `nextReview` 会被推到未来、脱离"到期"集合，若不快照分母会跟着抖动甚至无法到达 100%。`reviewDone` = 今日已评分 id 与快照 id 的交集，`newDone` = 今日已评分总数减去 `reviewDone`。
- 'all' 模式下是否学完由 `newDoneLive >= goal` 判断（`goal` 现在纯粹代表"新题目标"，不再包含复习数），不是看本地队列是否遍历完（队列只是一个足够大的候选池，可能被多次重建续接）。
- `PREVIEW_TYPES`（今日已学/已掌握等）进入学习页不显示评分栏；`review-due` 不在 `PREVIEW_TYPES` 里，会显示评分栏。
- 首页只保留「待复习」入口卡片（`nextReview <= 今天`），没有"明日待复习"的说法，避免和"待复习"口径混淆；不要再引入基于明天截止时间的复习统计。

## 禁止事项

- 不要提交 token、密钥或任何凭据。
- 不要升级 React、Vite、TypeScript 等核心依赖版本。
- 不要修改数据库 schema，除非用户明确要求。
- 不要引入 Redux、Zustand、React Router、Tailwind、Ant Design 等外部库。
- 不要修改 `beile_ma_v3` localStorage 结构（会导致用户数据丢失）。
- 不要在 `vite.config.ts` 的 `base` 上线时忘记改回 `/page/beile-ma-react/`。

## 验证要求

- 修改业务逻辑后，必须 `npm run build` 无 TypeScript 错误才能发布。
- 修改学习队列、SRS 算法、进度计算后，手动验证：学习几题 → 退出 → 再进入，进度是否续接。
- 修改认证流程后，验证登录跳转、token exchange、/auth/me 验证均正常。

## 常见坑

- 表格在移动端需要横向滚动：`.answer table { display: block; overflow-x: auto; white-space: nowrap; }`。
- `useCallback` 依赖数组缺失会导致闭包捕获旧 state，涉及 `newDoneLive`、`isDone`、`goalReached` 的函数必须把它们加入依赖。
- `addDuration` 通过 `SET_STORE` dispatch，和 `RATE_CARD` 是两次 dispatch，中间可能触发一次额外渲染。
- GoalPicker 的「今日已弹」标记在弹出时立即写入（不是确认后），防止刷新重复弹出。
- 遇到认证问题，先检查 `src/api.ts` 中的 header 是否带了 `X-Builder-Session`，是否误带了 cookie。
