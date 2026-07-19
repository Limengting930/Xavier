# 背了吗 —— 你的 AI 知识速记卡片

> 收录 Agent / LLM 开发高频面试题的闪卡 App。用碎片时间和通勤路上，快速记住大模型与智能体相关的核心知识。

「背了吗」是一款专为 **LLM / Agent 方向面试**打造的知识速记工具。它把零散的知识点做成可翻转的闪卡，配合 **SM-2 间隔重复算法**智能安排复习节奏，帮你把"看过就忘"变成"真正记住"。

## 亮点

- **聚焦 AI 面试**：内置 Agent 开发高频面试题，覆盖 LLM、Prompt、工具调用、记忆、规划等核心考点。
- **碎片化学习**：卡片式交互，通勤、排队随时来几张，学习无压力。
- **科学复习**：基于 SM-2 间隔重复算法，按你的掌握程度自动决定"什么时候再看这道题"。
- **复习优先机制**：当天有到期复习题时先复习再学新题，避免知识欠账越滚越多。
- **进度可视化**：学习时长、连击天数、掌握进度、成就体系，一目了然，正反馈拉满。
- **极致轻量**：纯前端 + BaaS，无重型依赖，首屏图片资源经 WebP 优化压缩约 98%。

## 功能演示

### 主页 —— 学习与复习入口

<img src="samples/s1.png" width="300" alt="主页" />

进入 App 的首页。这里汇总了今日的学习目标与待复习题目，点击即可开始学习或复习。到期复习题会优先解锁，学完才能继续攻新题。

### 学习卡片 —— 翻转记忆

<img src="samples/s2.png" width="300" alt="学习卡片正面" /> <img src="samples/s4.png" width="300" alt="学习卡片背面与评分" />

卡片正面展示问题（左图），点击即可翻转到答案面（右图），答案含关键词、易错点与面试追问。看完答案后，在底部选择自己对这道题的掌握程度（未掌握 / 模糊 / 已掌握），系统据此安排下次复习时间。

### 题库 —— 浏览与筛选

<img src="samples/s3.png" width="300" alt="题库页" />

完整题库一览。支持搜索关键词、按分类筛选、按掌握状态过滤，方便你有针对性地预览和挑选题目。

### 统计 —— 学习情况一览

<img src="samples/s5.png" width="300" alt="统计页" />

统计你的学习全貌：累计学习时长、连续学习天数、题目掌握分布等，量化每一次进步。

### 个人主页 —— 成就展示

<img src="samples/s6.png" width="300" alt="个人主页" />

展示已解锁的成就徽章（连续学习、掌握题数等里程碑）与个人学习信息，让坚持看得见。

## 技术栈

| 分类 | 选型 |
|---|---|
| 构建工具 | Vite 8 |
| 框架 | React 19 |
| 语言 | TypeScript 6 |
| 状态管理 | React Context + useReducer（无第三方状态库） |
| 样式 | 原生 CSS（CSS 变量体系） |
| Markdown 渲染 | marked + highlight.js（答案富文本 + 代码高亮） |
| 复习算法 | SM-2 间隔重复算法（自实现） |
| 后端 | 小红书内部 Builder 平台（BaaS：OAuth 认证 + Supabase 数据库） |
| 数据持久化 | 云端同步 + localStorage 本地兜底 |
| 代码检查 | oxlint |


## 快速开始

```bash
npm install      # 安装依赖
npm run dev      # 本地开发
npm run build    # 构建 + TypeScript 检查
npm run preview  # 预览生产构建
npm run lint     # oxlint 静态检查
```

## 目录结构

```
src/
├── App.tsx            # 主入口：认证流程、页面切换、学习队列构建、目标管理
├── App.css            # 全部样式（CSS 变量体系）
├── store.tsx          # 全局状态、SM-2 算法、localStorage 持久化
├── api.ts             # Builder API 请求封装（认证、题目加载、云端同步）
├── types.ts           # 类型定义与常量
├── utils/             # 工具函数（分类图标映射等）
└── components/
    ├── HomePage.tsx       # 主页（学习 / 复习入口）
    ├── LearnPage.tsx      # 学习页（翻卡、评分）
    ├── LibraryPage.tsx    # 题库（浏览、筛选）
    ├── StatsPage.tsx      # 统计页
    ├── MePage.tsx         # 个人主页（成就）
    ├── GoalPicker.tsx     # 每日目标选择
    ├── icons.tsx          # SVG 图标 / 插画（图片组件 fallback）
    ├── home/  library/  learn/   # 各页子组件
```

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

## 部署

- `vite.config.ts` 的 `base` 上线时须为 `/page/beile-ma-react/`。
- 构建产物位于 `dist/`。

---

更多开发约定见 `CLAUDE.md`。
