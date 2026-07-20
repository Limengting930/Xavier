/* ─── Types ─── */

export interface CardState {
  status: number | null   // 0=未掌握, 1=模糊, 2=掌握, null=未学习
  fav: boolean
  reviewCount: number
  lastReview: number
  nextReview: number
  interval: number
  easeFactor: number
}

export interface DayRecord {
  studied: number
  duration: number
  ids: number[]
  /** 今日评分的属于「到期复习」的卡的 id（不含新题）。
   * 存在这里是为了在返回首页时能稳定得出"今天复习了几张"，
   * 避免依赖 dueSnapshotRef 内存快照带来的时序 bug。可选字段，兼容老数据。 */
  reviewIds?: number[]
}

export interface Store {
  cards: Record<string, CardState>
  daily: Record<string, DayRecord>
  custom: Question[]
  mode: string
  // 成就首次解锁时间戳：id -> 解锁那一刻 Date.now()。用于「我的」页显示"获得于 YYYY.MM.DD"
  achievements?: Record<string, number>
  // 上传文档生成卡片的元数据列表（可选，兼容老数据）。原始文件不落地，只留指纹用于去重。
  documents?: DocMeta[]
  // 已删除题库的 docId 墓碑列表（可选，兼容老数据）。
  // 作用：MERGE_CLOUD 是并集合并，若不记录已删 docId，云端旧 documents_json/custom_json
  // 会把已删题库合并回来。此列表让 MERGE_CLOUD 主动过滤已删题库，杜绝"删除后复活"。
  deletedDocs?: string[]
}

export interface Question {
  id: number
  cat: string
  q: string
  summary: string
  a: string
  keywords: string[]
  pitfalls: string
  interview: string[]
  diff: number
  // ── 以下为「文件上传生成卡片」新增可选字段，向前兼容 ──
  // 老数据 / 云端题库无这些字段，读取时为 undefined，不影响现有逻辑。
  /** 卡片来源文档，用于按文档管理/删除、统计分区 */
  source?: { docId: string; docName: string }
  /** 逻辑牌组 id，MVP 阶段 = source.docId */
  deckId?: string
}

/** 上传文档的元数据（原始文件不落地，仅存指纹用于去重） */
export interface DocMeta {
  docId: string        // uuid
  name: string         // 原始文件名
  type: string         // 'md' | 'docx' | 'pdf'
  hash: string         // 解析后纯文本的 SHA-256（去重用）
  cardCount: number    // 该文档生成的卡片数
  categories: string[] // 该文档最终使用的分类清单（去重收敛后）
  createdAt: number    // Date.now()
}

export interface UserInfo {
  nameEn?: string
  nameCn?: string
  redName?: string
  avatar?: string
  thumbAvatar?: string
}

export type PageType = 'home' | 'library' | 'stats' | 'learn'
export type QueueType = 'all' | 'today-studied' | 'today-mastered' | 'review' | 'review-due' | 'weak' | 'fav' | 'single' | 'mastered'

export const PREVIEW_TYPES = new Set<string>(['today-studied', 'today-mastered', 'mastered', 'single'])

export const ACHIEVEMENTS = [
  { id: 'first', icon: '🌱', name: '初学乍练', desc: '首次完成学习目标' },
  { id: 'streak3', icon: '🔥', name: '三日不辍', desc: '连续学习3天' },
  { id: 'streak7', icon: '⚡', name: '一周坚持', desc: '连续学习7天' },
  { id: 'streak10', icon: '🏆', name: '十全十美', desc: '连续学习10天' },
  { id: 'master30', icon: '👑', name: '三十而立', desc: '掌握30道题' },
  { id: 'masterAll', icon: '🛡️', name: '通关副本', desc: '掌握所有题目' },
] as const

export const QUEUE_LABELS: Record<string, string> = {
  review: '待复习', weak: '错题强化', fav: '收藏', single: '单题预览',
  all: '全题库', 'today-studied': '今日已学', 'today-mastered': '今日已掌握',
  mastered: '已掌握', 'review-due': '待复习',
}

// ══════════════════════════════════════════════════
// 文件上传生成卡片 · 常量
// ══════════════════════════════════════════════════
/** 生成卡片 id 命名空间基址：id = CUSTOM_ID_BASE + 单调递增序号，避免与云端题库自增 id 撞车 */
export const CUSTOM_ID_BASE = 1_000_000_000
/** 单文件大小上限 5MB */
export const MAX_FILE_SIZE = 5 * 1024 * 1024
/** 单文档分块数上限（约几十页） */
export const MAX_CHUNKS = 40
/** 单块估算 token 上限，超过在段落边界二次切分（适度增大以减少分块数 → 减少 LLM 请求次数） */
export const CHUNK_MAX_TOKENS = 2500
/** 过小相邻块合并的下限 token */
export const CHUNK_MIN_TOKENS = 300
/** 支持的文件扩展名 */
export const SUPPORTED_EXT = ['md', 'markdown', 'txt', 'docx', 'pdf'] as const
/** 每份文档分类清单下限（参考值，短文档允许 <5，不强行凑数） */
export const DOC_CAT_MIN = 5
/** 每份文档分类清单上限（硬约束，防爆炸） */
export const DOC_CAT_MAX = 12
/** 无法归类的兜底分类名 */
export const DOC_CAT_FALLBACK = '其他'
/** 仅含 1 张卡的"孤儿分类"超过该数量时并入「其他」 */
export const ORPHAN_CAT_MERGE_THRESHOLD = 3
/** custom 卡片软上限，超过提示清理（不硬阻断） */
export const CUSTOM_CARDS_SOFT_LIMIT = 2000
/** 逐块生成卡片的并发度：同时发起的 LLM 请求数。2 是速度与限流(429)的稳妥平衡点 */
export const GEN_CONCURRENCY = 2
/** 内置题库（source 为空的卡）的逻辑 docId，用于题库筛选/统计分区 */
export const BUILTIN_DECK_ID = '__builtin__'
/** 内置题库显示名 */
export const BUILTIN_DECK_NAME = '内置题库'

