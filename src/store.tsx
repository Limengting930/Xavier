import React, { createContext, useContext, useReducer, useRef, useCallback, useEffect } from 'react'
import type { Store, CardState, DayRecord, Question, UserInfo } from './types'
import { loadFromCloud, syncToCloud } from './api'

// ══════════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════════
const SK = 'beile_ma_v3'

// ══════════════════════════════════════════════════
// SRS (SM-2 simplified)
// ══════════════════════════════════════════════════
export function srsUpdate(cardId: number, quality: number, cards: Record<string, CardState>): CardState {
  // 关键：拿到旧对象后必须浅拷贝，绝不能 mutate 原对象——
  // 否则会污染 reducer 上一份 state.store.cards[cardId] 的引用，
  // 让「评分前」这个信息永久丢失（RATE_CARD reducer 需要读评分前的 reviewCount/nextReview
  // 判定"这次是复习还是新题"）
  const prev = cards[cardId] || { status: null, fav: false, reviewCount: 0, lastReview: 0, nextReview: 0, interval: 1, easeFactor: 2.5 }
  const s: CardState = { ...prev }
  const now = Date.now()
  s.status = quality
  s.reviewCount = (s.reviewCount || 0) + 1
  s.lastReview = now

  let interval = s.interval || 1
  let ef = s.easeFactor || 2.5

  if (quality === 0) {
    interval = 1
    ef = Math.max(1.3, ef - 0.2)
  } else if (quality === 1) {
    interval = Math.max(1, Math.round(interval * 1.2))
    ef = Math.max(1.3, ef - 0.15)
  } else {
    if (s.reviewCount === 1) interval = 1
    else if (s.reviewCount === 2) interval = 3
    else interval = Math.round(interval * ef)
    ef = Math.min(3, ef + 0.1)
  }

  s.interval = interval
  s.easeFactor = ef
  s.nextReview = now + interval * 86400000
  return s
}

// ══════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════
// 全站统一使用本地日期字符串（YYYY-MM-DD）作为 daily 的 key、到期判断、连击回溯的基准。
// 之前用 toISOString().slice(0,10) 取 UTC 日期，会导致北京时间 0:00-8:00 之间
// 日期串还停留在昨天，引发一系列问题：
//   1. 昨天学的新题（nextReview = 昨天 + 24h = 今天）在今天上午仍不算"到期"，ReviewCard 显示 0
//   2. daily key 归属错位（凌晨评分的题被记到昨天）
//   3. 连击算法与日历高亮"今天"会晃动一天
// sv-SE locale 输出格式恰好是 YYYY-MM-DD，是常用取本地日期字符串的 trick。
export function todayLocal(): string {
  return new Date().toLocaleDateString('sv-SE')
}
// 从任意时间戳算它的本地日期串
export function dateKeyLocal(ts: number): string {
  return new Date(ts).toLocaleDateString('sv-SE')
}
// 复习到期判断：卡片的 nextReview「本地日期」<= 今天本地日期 就算到期。
// 例：昨天 22:00 学的卡 nextReview = 今天 22:00，本地日期是今天 → 今天 0:00 一过就算到期。
export function isDueByLocalDate(nextReview: number, todayStr: string = todayLocal()): boolean {
  return dateKeyLocal(nextReview) <= todayStr
}
// 兼容保留 today() 别名，避免旧引用一次性全改；语义已切换为本地日期
export function today(): string { return todayLocal() }

// 连续学习天数：从今天往回按「本地日期」数，daily[k].ids 有内容视为学过；首日就没内容 streak = 0
export function computeStreak(daily: Record<string, DayRecord>): number {
  let s = 0
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  for (let i = 0; i < 365; i++) {
    const d = new Date(base.getTime() - i * 86400000)
    const k = d.toLocaleDateString('sv-SE')
    const rec = daily[k]
    if (rec && (rec.ids?.length || 0) > 0) s++
    else if (i > 0) break
  }
  return s
}

// 已掌握题数：只算当前题库里 status===2 的
function countMastered(cards: Record<string, CardState>, libIds: Set<number>): number {
  let n = 0
  libIds.forEach(id => { if (cards[id]?.status === 2) n++ })
  return n
}

// 成就检测：传入最新的 store（评分后）+ 今日 goal + 当前题库 id 集合，
// 返回新增的成就时间戳 map。已解锁的成就不会覆盖（保持首次时间）。
export function checkAchievements(
  store: Store,
  goal: number,
  libIds: Set<number>,
): Record<string, number> {
  const now = Date.now()
  const prev = store.achievements || {}
  const next: Record<string, number> = { ...prev }

  const t = today()
  const todayIds = store.daily[t]?.ids || []
  // 今日"新题"完成数：与 getTodayProgress 口径一致——排除掉今天到期复习的部分
  // 到期判断改「本地日期口径」：昨天学的卡今天就算到期，不用等满 24 小时
  const dueIds = new Set<number>()
  libIds.forEach(id => {
    const c = store.cards[id]
    if (c && c.reviewCount > 0 && isDueByLocalDate(c.nextReview, t)) dueIds.add(id)
  })
  const newDoneToday = todayIds.filter(id => libIds.has(id) && !dueIds.has(id)).length

  const streak = computeStreak(store.daily)
  const mastered = countMastered(store.cards, libIds)

  // first：首次完成今日学习目标（新题）。
  // 除了"今日已达成"，也把"历史任意一天已达成"纳入——历史用户可能在成就系统上线前就完成过目标，
  // 这里用当前 goal 作为阈值近似判定，避免永远解锁不了 first。
  const anyDayHitGoal = goal > 0 && Object.values(store.daily).some(d => (d.ids?.length || 0) >= goal)
  if (!next.first && ((goal > 0 && newDoneToday >= goal) || anyDayHitGoal)) next.first = now
  // streak3 / streak7 / streak10
  if (!next.streak3 && streak >= 3) next.streak3 = now
  if (!next.streak7 && streak >= 7) next.streak7 = now
  if (!next.streak10 && streak >= 10) next.streak10 = now
  // master30
  if (!next.master30 && mastered >= 30) next.master30 = now
  // masterAll：题库不为空且全部掌握
  if (!next.masterAll && libIds.size > 0 && mastered >= libIds.size) next.masterAll = now

  return next
}

// 成就进度：给「我的」页弹窗展示。current 上限被 clamp 到 target，避免解锁后进度条超过 100%
// masterAll 的 target 会随题库大小变化，需要传 libIds
export function getAchievementProgress(
  id: string,
  store: Store,
  goal: number,
  libIds: Set<number>,
): { current: number; target: number; unit: string } {
  // 已解锁的成就永远显示满格。否则会出现："first 昨天已解锁，今天早上打开还没学题时
  // 显示 0/10、0%"，让用户误以为成就重置了。
  // 未解锁的成就才展示"今日进度 / 目标"作为激励。
  const unlocked = !!store.achievements?.[id]

  const t = today()
  const todayIds = store.daily[t]?.ids || []
  // 到期判断改「本地日期口径」，与 checkAchievements / getTodayProgress 保持一致
  const dueIds = new Set<number>()
  libIds.forEach(cardId => {
    const c = store.cards[cardId]
    if (c && c.reviewCount > 0 && isDueByLocalDate(c.nextReview, t)) dueIds.add(cardId)
  })
  const newDoneToday = todayIds.filter(cardId => libIds.has(cardId) && !dueIds.has(cardId)).length
  const streak = computeStreak(store.daily)
  const mastered = countMastered(store.cards, libIds)

  const clamp = (cur: number, tgt: number) => Math.min(cur, tgt)
  // 已解锁 → current 直接置为 target（100%），进度条不再回退
  const done = (tgt: number, unit: string) => ({ current: tgt, target: tgt, unit })
  switch (id) {
    case 'first':
      return unlocked ? done(goal || 1, '题') : { current: clamp(newDoneToday, goal || 1), target: goal || 1, unit: '题' }
    case 'streak3':
      return unlocked ? done(3, '天') : { current: clamp(streak, 3), target: 3, unit: '天' }
    case 'streak7':
      return unlocked ? done(7, '天') : { current: clamp(streak, 7), target: 7, unit: '天' }
    case 'streak10':
      return unlocked ? done(10, '天') : { current: clamp(streak, 10), target: 10, unit: '天' }
    case 'master30':
      return unlocked ? done(30, '题') : { current: clamp(mastered, 30), target: 30, unit: '题' }
    case 'masterAll':
      return unlocked ? done(libIds.size || 1, '题') : { current: clamp(mastered, libIds.size || 1), target: libIds.size || 1, unit: '题' }
    default:
      return { current: 0, target: 1, unit: '' }
  }
}

export function loadLocal(): Store {
  try {
    const d = JSON.parse(localStorage.getItem(SK) || '{}')
    const store: Store = {
      cards: d.cards || {},
      daily: d.daily || {},
      custom: d.custom || [],
      mode: d.mode || 'flashcard',
      achievements: d.achievements || {},
    }
    // migration: old daily without ids
    // 从 cards.lastReview 反推每天学过哪些题；用本地日期，与新口径保持一致
    const needsMigration = Object.values(store.daily).some(v => !v.ids)
    if (needsMigration) {
      const dayIds: Record<string, number[]> = {}
      Object.entries(store.cards).forEach(([id, s]) => {
        if (s.lastReview) {
          const k = dateKeyLocal(s.lastReview)
          if (!dayIds[k]) dayIds[k] = []
          if (!dayIds[k].includes(Number(id))) dayIds[k].push(Number(id))
        }
      })
      Object.keys(store.daily).forEach(k => {
        store.daily[k].ids = dayIds[k] || []
        store.daily[k].studied = store.daily[k].ids.length
      })
    }
    return store
  } catch {
    return { cards: {}, daily: {}, custom: [], mode: 'flashcard' }
  }
}

export function saveLocal(store: Store) {
  try { localStorage.setItem(SK, JSON.stringify(store)) } catch {}
}

// ══════════════════════════════════════════════════
// Context types
// ══════════════════════════════════════════════════
export interface AppState {
  store: Store
  questions: Question[]
  user: UserInfo | null
  cloudRowId: number | null
  authReady: boolean
  syncStatus: string
}

type Action =
  | { type: 'SET_QUESTIONS'; questions: Question[] }
  | { type: 'SET_USER'; user: UserInfo | null }
  | { type: 'SET_CLOUD_ROW_ID'; id: number | null }
  | { type: 'AUTH_READY' }
  | { type: 'SET_SYNC_STATUS'; status: string }
  | { type: 'SET_STORE'; store: Store }
  | { type: 'RATE_CARD'; cardId: number; quality: number; goal: number }
  | { type: 'RECHECK_ACHIEVEMENTS'; goal: number }
  | { type: 'TOGGLE_FAV'; cardId: number }
  | { type: 'SET_MODE'; mode: string }
  | { type: 'MERGE_CLOUD'; cloud: NonNullable<Awaited<ReturnType<typeof loadFromCloud>>> }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_QUESTIONS':
      return { ...state, questions: action.questions }
    case 'SET_USER':
      return { ...state, user: action.user }
    case 'SET_CLOUD_ROW_ID':
      return { ...state, cloudRowId: action.id }
    case 'AUTH_READY':
      return { ...state, authReady: true }
    case 'SET_SYNC_STATUS':
      return { ...state, syncStatus: action.status }
    case 'SET_STORE':
      return { ...state, store: action.store }
    case 'SET_MODE': {
      const store = { ...state.store, mode: action.mode }
      saveLocal(store)
      return { ...state, store }
    }
    case 'TOGGLE_FAV': {
      const cards = { ...state.store.cards }
      const existing = cards[action.cardId] || { status: null, fav: false, reviewCount: 0, lastReview: 0, nextReview: 0, interval: 1, easeFactor: 2.5 }
      cards[action.cardId] = { ...existing, fav: !existing.fav }
      const store = { ...state.store, cards }
      saveLocal(store)
      return { ...state, store }
    }
    case 'RATE_CARD': {
      const cards = { ...state.store.cards }
      // 关键：在 srsUpdate 之前，先根据「评分前」的 CardState 判定这次是不是复习到期卡。
      // 判定条件跟 buildQueue('review-due') / getDueSnapshotIds 保持一致：
      //   reviewCount > 0（排除首次学习的新题、和只收藏未评分的卡）
      //   nextReview 的本地日期 <= 今天（自然日到期口径，跨过 0 点即算到期）
      // 之所以要在这里持久化，是因为 srsUpdate 之后 nextReview 会被推到未来，
      // 之后任何时候再看这张卡都没法判断"评分前是不是到期"了。
      const prevCard = state.store.cards[action.cardId]
      const wasReviewDue = !!prevCard && prevCard.reviewCount > 0 && isDueByLocalDate(prevCard.nextReview)

      const newCardState = srsUpdate(action.cardId, action.quality, cards)
      cards[action.cardId] = newCardState
      const daily = { ...state.store.daily }
      const t = today()
      if (!daily[t]) daily[t] = { studied: 0, duration: 0, ids: [], reviewIds: [] }
      // 补齐老数据可能缺失的 reviewIds
      if (!daily[t].reviewIds) daily[t] = { ...daily[t], reviewIds: [] }
      if (!daily[t].ids.includes(action.cardId)) {
        daily[t] = { ...daily[t], ids: [...daily[t].ids, action.cardId], studied: daily[t].ids.length + 1 }
      }
      if (wasReviewDue && !daily[t].reviewIds!.includes(action.cardId)) {
        daily[t] = { ...daily[t], reviewIds: [...daily[t].reviewIds!, action.cardId] }
      }
      // 评分后立刻检测成就（每次评分都算一次，性能可接受：题库通常几百道以内）
      const libIds = new Set<number>([
        ...state.questions.map(q => q.id),
        ...state.store.custom.map(q => q.id),
      ])
      const achievements = checkAchievements({ ...state.store, cards, daily }, action.goal, libIds)
      const store = { ...state.store, cards, daily, achievements }
      saveLocal(store)
      return { ...state, store }
    }
    case 'RECHECK_ACHIEVEMENTS': {
      // 历史用户补检：登录/加载完数据后调用一次，把过去应该解锁但未记录的成就补上。
      // 时间戳会是"今天"（我们没法回溯真实解锁时间），能接受。
      const libIds = new Set<number>([
        ...state.questions.map(q => q.id),
        ...state.store.custom.map(q => q.id),
      ])
      const achievements = checkAchievements(state.store, action.goal, libIds)
      // 如果没变化就不 dispatch 新 store，避免无谓渲染 + 云同步
      const prev = state.store.achievements || {}
      const changed = Object.keys(achievements).some(k => !prev[k]) || Object.keys(prev).length !== Object.keys(achievements).length
      if (!changed) return state
      const store = { ...state.store, achievements }
      saveLocal(store)
      return { ...state, store }
    }
    case 'MERGE_CLOUD': {
      const cloud = action.cloud
      try {
        const cloudCards = JSON.parse(cloud.cards_json) as Record<string, CardState>
        const cloudDaily = JSON.parse(cloud.daily_json) as Record<string, DayRecord>
        const cloudCustom = JSON.parse(cloud.custom_json) as Question[]
        // achievements 是 v4 新增字段；兼容老云端数据（可能没有）
        const cloudAch = cloud.achievements_json ? (JSON.parse(cloud.achievements_json) as Record<string, number>) : {}

        // merge cards: by lastReview
        const mergedCards = { ...state.store.cards }
        Object.entries(cloudCards).forEach(([id, cs]) => {
          const ls = mergedCards[id]
          if (!ls || (cs.lastReview || 0) > (ls.lastReview || 0)) mergedCards[id] = cs
        })
        // merge daily: by studied
        const mergedDaily = { ...state.store.daily }
        Object.entries(cloudDaily).forEach(([k, cd]) => {
          const ld = mergedDaily[k]
          if (!ld || (cd.studied || 0) > (ld.studied || 0)) mergedDaily[k] = cd
        })
        // merge custom: by id
        const existIds = new Set(state.store.custom.map(c => c.id))
        const extraCustom = cloudCustom.filter(c => !existIds.has(c.id))
        // merge achievements: 首次解锁时间取更早的那次
        const mergedAch: Record<string, number> = { ...(state.store.achievements || {}) }
        Object.entries(cloudAch).forEach(([id, ts]) => {
          if (!mergedAch[id] || ts < mergedAch[id]) mergedAch[id] = ts
        })
        const store: Store = {
          cards: mergedCards,
          daily: mergedDaily,
          custom: [...state.store.custom, ...extraCustom],
          mode: cloud.mode || state.store.mode,
          achievements: mergedAch,
        }
        saveLocal(store)
        return { ...state, store, cloudRowId: cloud.rowId }
      } catch {
        return state
      }
    }
    default:
      return state
  }
}

// ══════════════════════════════════════════════════
// Context
// ══════════════════════════════════════════════════
interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<Action>
  allCards: () => Question[]
  getCardState: (id: number) => CardState | null
  isNew: (id: number) => boolean
  isDue: (id: number) => boolean
  isWeak: (id: number) => boolean
  isFav: (id: number) => boolean
  toggleFav: (id: number) => void
  rateCard: (cardId: number, quality: number, goal: number) => void
  addDuration: (ms: number) => void
  syncToCloudDebounced: () => void
  getTodayProgress: () => { reviewTotal: number; reviewDone: number; newDone: number; canStartNew: boolean }
}

const AppContext = createContext<AppContextType>(null!)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null!, () => ({
    store: loadLocal(),
    questions: [],
    user: null,
    cloudRowId: null,
    authReady: false,
    syncStatus: '',
  }))

  const cloudSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  const allCards = useCallback(() => [...stateRef.current.questions, ...stateRef.current.store.custom], [])

  const getCardState = useCallback((id: number) => stateRef.current.store.cards[id] || null, [])

  const isNew = useCallback((id: number) => !getCardState(id), [getCardState])

  const isDue = useCallback((id: number) => {
    const s = getCardState(id)
    return s ? isDueByLocalDate(s.nextReview) : false
  }, [getCardState])

  const isWeak = useCallback((id: number) => {
    const s = getCardState(id)
    return !!(s && (s.status === 0 || s.status === 1))
  }, [getCardState])

  const isFav = useCallback((id: number) => {
    const s = getCardState(id)
    return !!(s && s.fav)
  }, [getCardState])

  const toggleFav = useCallback((id: number) => {
    dispatch({ type: 'TOGGLE_FAV', cardId: id })
  }, [])

  const rateCard = useCallback((cardId: number, quality: number, goal: number) => {
    dispatch({ type: 'RATE_CARD', cardId, quality, goal })
  }, [])

  const addDuration = useCallback((ms: number) => {
    const s = stateRef.current.store
    const daily = { ...s.daily }
    const t = today()
    if (!daily[t]) daily[t] = { studied: 0, duration: 0, ids: [] }
    daily[t] = { ...daily[t], duration: (daily[t].duration || 0) + ms }
    const store = { ...s, daily }
    saveLocal(store)
    dispatch({ type: 'SET_STORE', store })
  }, [])

  // 「今日到期复习题」集合：只增不减的「棘轮」。
  // 到期口径：本地日期 <= 今天本地日期（自然日口径，跨过 0 点即到期），
  // 与 buildQueue('review-due') / RATE_CARD 的 wasReviewDue / checkAchievements 全站保持一致。
  // 之所以还需要 snapshot（只加不删）：卡片评分后 nextReview 会被推到未来，若下次扫描
  // 时就直接消失，分母（reviewTotal）会变小，进度条会诡异回退。所以已发现的到期卡永久留在集合里。
  // reviewCount > 0 用于排除「只收藏过、从未评分」的卡片（其 nextReview 默认 0，恒到期）。
  // 跨自然日时（date 变化）snapshot 清空重建：昨天已到期今天未评的卡会自动再次进入集合。
  const dueSnapshotRef = useRef<{ date: string; ids: Set<number> }>({ date: '', ids: new Set() })
  const getDueSnapshotIds = useCallback((): Set<number> => {
    const t = today()
    if (dueSnapshotRef.current.date !== t) {
      dueSnapshotRef.current = { date: t, ids: new Set() }
    }
    allCards().forEach(c => {
      const s = stateRef.current.store.cards[c.id]
      if (s && s.reviewCount > 0 && isDueByLocalDate(s.nextReview, t)) {
        dueSnapshotRef.current.ids.add(c.id)
      }
    })
    return dueSnapshotRef.current.ids
  }, [allCards])

  // 今日「复习 / 新题」完成情况总览：首页两张学习入口卡片 + 新题学习流程解锁判断都复用这里
  //
  // 分子（reviewDone）从持久化字段 `daily[t].reviewIds` 直接读——这是「评分那一瞬间」
  // 用「评分前」的 CardState 判定并写入 daily 的，不依赖 snapshot 的时序，能保证跨越
  // 进入 LearnPage → 评分 → 返回首页的整个链路都稳定。
  //
  // 分母（reviewTotal）继续用 dueSnapshot 棘轮，同时把 reviewIdsToday 并入 snapshot，
  // 兜住"已评分的复习题在 snapshot 重建后（例如整数级跨天再回望）因 nextReview 被推到未来
  // 不再被扫到"的边缘情况——评分动作本身就是判据，分母必然 >= 分子。
  //
  // 新题（newDone）保持原口径：今日已评分中排除 dueIds、排除旧题库残留 id。
  const getTodayProgress = useCallback(() => {
    const dueIds = getDueSnapshotIds()
    const t = today()
    const todayRecord = stateRef.current.store.daily[t]
    const todayIds = todayRecord?.ids || []
    const reviewIdsToday = todayRecord?.reviewIds || []
    // 把今天已评分的复习题 id 并入 dueIds，保证分母始终 >= 已复习数
    reviewIdsToday.forEach(id => dueIds.add(id))
    const currentLibIds = new Set(allCards().map(c => c.id))
    const reviewTotal = dueIds.size
    const reviewDone = reviewIdsToday.length
    // 新题 = 今日已评分中，属于当前题库、且不属于任何复习相关 id 的部分
    // （reviewIdsToday 已经并入 dueIds，所以 !dueIds.has(id) 一并排除了 review 部分）
    const newDone = todayIds.filter(id => currentLibIds.has(id) && !dueIds.has(id)).length
    const canStartNew = reviewTotal === 0 || reviewDone >= reviewTotal
    return { reviewTotal, reviewDone, newDone, canStartNew }
  }, [getDueSnapshotIds, allCards])

  const syncToCloudDebounced = useCallback(() => {
    if (cloudSyncTimer.current) clearTimeout(cloudSyncTimer.current)
    cloudSyncTimer.current = setTimeout(async () => {
      const st = stateRef.current
      if (!st.user) return
      const newRowId = await syncToCloud(st.store, st.cloudRowId)
      if (newRowId && newRowId !== st.cloudRowId) {
        dispatch({ type: 'SET_CLOUD_ROW_ID', id: newRowId })
      }
    }, 2000)
  }, [])

  // Cloud sync on store changes
  useEffect(() => {
    syncToCloudDebounced()
  }, [state.store, syncToCloudDebounced])

  return (
    <AppContext.Provider value={{
      state, dispatch, allCards, getCardState, isNew, isDue, isWeak, isFav,
      toggleFav, rateCard, addDuration, syncToCloudDebounced, getTodayProgress,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
