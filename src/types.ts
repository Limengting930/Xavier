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

