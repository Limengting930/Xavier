# 背了吗 —— 你的 AI 知识速记卡片

一款专注于 **LLM / Agent 高频面试题** 的移动端闪卡 App。基于科学的 SM-2 间隔重复算法，帮助你利用碎片时间和通勤路上高效记忆知识点，从"看过"到"记住"。

## 项目定位

大模型和 Agent 领域知识更新极快，八股题量大且分散。本项目把高频面试题拆分成一张张卡片，让你：

- 每天设定一个"能坚持"的学习目标（比如 20 题）
- 结合系统按算法推送的"到期复习题"，形成"新学 + 巩固"的良性循环
- 通勤 / 排队 / 睡前，掏出手机就能学几题

## 效果预览

### 主页

<img src="samples/s1.png" width="280" />

首页两张主卡片：紫色「今日学习目标」+ 粉色「待复习」。**必须先学完待复习才能解锁新题**，从机制上保证长期记忆效果。下方是今日掌握数、学习时长、连续打卡等日常数据。

### 学习卡片 · 正面

<img src="samples/s2.png" width="280" />

题面正面：分类标签 + 掌握状态 + 题干。点击卡面翻转看答案，左右滑动切换上下题，键盘 `1/2/3` 也可以快速评分。

### 学习卡片 · 背面

<img src="samples/s4.png" width="280" />

答案背面：Markdown 渲染 + 代码高亮 + 易错点提示 + 高频面试问法。底部三档评分「未掌握 / 模糊 / 已掌握」，驱动 SM-2 算法计算下次复习时间。

### 题库

<img src="samples/s3.png" width="280" />

完整题库预览：支持文本搜索、按知识点 / 掌握程度筛选，「只看收藏」快速回顾重点。三色小爪印一眼看到每题状态，右侧显示「下次复习：X 天后」。

### 学习统计

<img src="samples/s5.png" width="280" />

学习统计：累计学习题数、今日 vs 平均对比、分类掌握矩阵，快速定位哪一类知识还比较薄弱。

### 个人主页

<img src="samples/s6.png" width="280" />

个人主页：连续打卡、最新成就徽章、学习日历（月历热力图）、6 项成就总览，激励长期坚持。

## 功能亮点

### 学习流

- **SM-2 间隔重复算法**：根据你对每题的评分（未掌握 / 模糊 / 已掌握）动态计算下一次复习时间。掌握的题隔得越来越久，模糊的题很快回来找你
- **强制先复习再学新**：首页顶部两张主卡片，「今日学习目标」在"待复习"未清空前处于禁用态，从机制上防止"只学新题不巩固"
- **粉紫双色卡片**：TodayCard（紫色）代表新题目标，ReviewCard（粉色）代表复习任务，视觉清晰
- **卡片翻转 + 手势切换**：点击卡面翻转看答案；左右滑动切换上下题；键盘 `1/2/3` 快速评分
- **答案支持 Markdown + 代码高亮**：面试题答案里的代码块用 highlight.js 高亮渲染，表格支持横向滚动，一屏看完整

### 数据同步

- **本地 + 云端双持久化**：所有学习进度存 localStorage，登录后自动同步到 Builder 平台（BaaS），换设备继续学
- **防抖同步 + 合并策略**：评分后 300ms 防抖上传；多设备并发学习时按 `lastReview` 时间戳择优合并，不覆盖对方进度

### 首页

- **今日学习目标卡片**：大数字 + 进度条 + 兔子插画，一眼看到今天完成度
- **待复习卡片**：粉色主题独立卡片，显示今日待复习进度，学完自动灰化
- **今日掌握 / 学习时长**：轻量 stat card 呈现当日成果
- **连续打卡 · 每日一句**：手帐感设计，激励长期习惯

### 题库

- **搜索 + 二级筛选**：按题目文本 / 分类 / 掌握程度筛选；支持"只看收藏"
- **每题状态可视化**：三色小爪印代表已掌握 / 模糊 / 未掌握，配合"下次复习：X 天后"，一目了然

### 学习统计

- **top card**：累计学习题数、今日 vs 平均对比
- **分类掌握矩阵**：每个分类下已掌握 / 模糊 / 未掌握的分布，快速定位薄弱环节

### 我的

- **成就系统**（6 项）：首次达成目标、连续 3/7/10 天打卡、掌握 30 题、掌握全部题目；解锁后卡片高亮显示获得日期
- **学习日历**：类似 GitHub 贡献图的月历视图，实心格表示当天有学习，一眼看到坚持天数
- **成就总览弹窗**：进度条呈现每个成就的当前进度，鼓励持续学习

### 设计细节

- **手帐 / 便签风**：Nunito + 楷体混搭、纸胶带、穿孔活页本、圆角大卡片、轻阴影
- **兔子 / 猫咪 / 爪印插画**：细节处的手绘装饰，让"学习"不那么严肃
- **纯 CSS 无 UI 库**：所有样式手写，动效基于 CSS transition + spring curve，轻量且可控

## 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| **框架** | React 19 + TypeScript | 严格类型，无 `any` |
| **构建** | Vite 8 | 极速冷启动 + HMR |
| **状态管理** | Context + useReducer | 无第三方状态库；`stateRef` 模式解决 stale closure |
| **样式** | 纯 CSS + CSS 变量 | 无 Tailwind / UI 组件库，1700+ 行手写样式，Design Token 化 |
| **Markdown** | marked | 答案区渲染 |
| **代码高亮** | highlight.js | GitHub Dark 主题 |
| **认证** | 小红书 Builder 平台 OAuth | `X-Builder-Session` header，无 cookie |
| **数据库** | Supabase（Builder BaaS） | `questions` 表存题库，`user_progress` 表存进度 |
| **算法** | SM-2 简化版 | `nextReview = now + interval × 86400000`，interval 按质量指数增长 |
| **Lint** | Oxlint | 极速 lint，替代 ESLint |

## 目录结构

```
src/
├── App.tsx              # 主入口：认证流程、页面切换、队列构建、目标管理
├── App.css              # 全部样式（Design Token + 分模块注释）
├── store.tsx            # 全局状态：Context + useReducer + SM-2 算法 + localStorage
├── api.ts               # 所有 Builder API 请求封装
├── types.ts             # 类型定义 + 常量（PREVIEW_TYPES / QUEUE_LABELS / ACHIEVEMENTS）
├── utils/               # 工具函数
└── components/
    ├── HomePage.tsx     # 首页：TodayCard / ReviewCard / StatsRow / GrowthCard
    ├── LibraryPage.tsx  # 题库：搜索 / 筛选 / 收藏
    ├── StatsPage.tsx    # 统计：累计数据 / 分类掌握矩阵
    ├── MePage.tsx       # 我的：个人信息 / 最新成就 / 学习日历
    ├── LearnPage.tsx    # 学习页：卡片翻转 / 评分 / 手势
    ├── GoalPicker.tsx   # 每日学习目标选择弹窗
    ├── home/            # 首页子组件（TodayCard / ReviewCard / StatsCard 等）
    ├── library/         # 题库子组件（LibFilterMenu / PawStatusImage 等）
    └── learn/           # 学习页子组件
```

## 快速开始

```bash
# 安装依赖（Node 20+）
npm install

# 本地开发
npm run dev

# 生产构建（含 TS 严格检查）
npm run build

# 预览构建产物
npm run preview

# Lint
npm run lint
```

访问 `http://localhost:5173/page/beile-ma-react/` 开始使用。首次访问会自动跳转到小红书 Builder 平台完成 OAuth 授权，登录后自动回跳。

## 关键设计决策

- **`daily[t].reviewIds` 持久化**：不依赖内存快照，评分那一刻用"评分前"的 CardState 判定"是复习还是新题"并写入 daily，跨设备同步 / UTC 跨零点场景都稳定
- **`srsUpdate` immutable**：SRS 状态变更严格浅拷贝，不 mutate 原对象，避免污染 reducer 上一份 state
- **`dueSnapshotRef` 棘轮**：`reviewTotal` 分母只增不减，保证学习过程中分母稳定不抖动
- **round-robin 分类选题**：新题队列按分类轮询取题，避免"一次全刷 CSS"的枯燥
- **目标锁定机制**：一旦当天学过一道新题，「设置目标」按钮就锁定，跨天自动解锁，防止半途改分母
- **认证只用 header 不带 cookie**：`X-Builder-Session` header，避免 431 错误

## Roadmap

- [ ] 题库分类多选筛选
- [ ] 学习数据导出 / 分享
- [ ] 深色模式
- [ ] PWA 离线学习

---

背了吗 · 让你在日积月累中轻松掌握AI面试知识
