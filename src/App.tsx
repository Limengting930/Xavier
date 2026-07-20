import { useState, useEffect, useCallback } from 'react'
import { AppProvider, useApp, todayLocal, isDueByLocalDate } from './store'
import { exchangeCode, verifySession, redirectToLogin, loadQuestions, loadFromCloud } from './api'
import type { Question } from './types'
import { BUILTIN_DECK_ID, BUILTIN_DECK_NAME } from './types'
import HomePage from './components/HomePage'
import LibraryPage from './components/LibraryPage'
import StatsPage from './components/StatsPage'
import MePage from './components/MePage'
import LearnPage from './components/LearnPage'
import GoalPicker from './components/GoalPicker'
import DeckPicker from './components/home/DeckPicker'
import BottomNavigation, { type TabKey } from './components/home/BottomNavigation'
import './styles/base.css'
import './styles/home.css'
import './styles/nav.css'
import './styles/learn.css'
import './styles/library.css'
import './styles/stats.css'
import './styles/goal-picker.css'
import './styles/me.css'
import './styles/speech-bubble.css'
import './styles/chatbot.css'
import './styles/upload.css'

const GOAL_KEY = 'beile_goal'
const GOAL_DATE_KEY = 'beile_goal_date'
// 今日学习题库范围：'' = 全部题库（默认）；否则为某题库 docId / 内置题库 id
const LEARN_DECK_KEY = 'beile_learn_deck'

function AppInner() {
  const { state, dispatch, allCards, getCardState, getTodayProgress } = useApp()
  const [page, setPage] = useState<TabKey>('home')
  const [goalPickerOpen, setGoalPickerOpen] = useState(false)
  const [lockedAlert, setLockedAlert] = useState(false)
  const [goal, setGoal] = useState<number>(() => {
    const saved = localStorage.getItem(GOAL_KEY)
    return saved ? parseInt(saved, 10) : 20
  })
  // 今日学习题库范围（'' = 全部题库）
  const [learnDeckScope, setLearnDeckScope] = useState<string>(() => localStorage.getItem(LEARN_DECK_KEY) || '')
  const [deckPickerOpen, setDeckPickerOpen] = useState(false)
  const [learnState, setLearnState] = useState<{
    active: boolean
    queue: Question[]
    queueType: string
    goal: number
    startIdx?: number
  } | null>(null)

  // Auth flow
  useEffect(() => {
    const init = async () => {
      // Step 1: handle OAuth callback
      const params = new URLSearchParams(location.search)
      const code = params.get('builder_auth_code')
      if (code) {
        const tok = await exchangeCode(code)
        if (tok) {
          dispatch({ type: 'SET_USER', user: null }) // will be set after verify
        }
        // Clean URL
        const cu = new URL(location.href)
        cu.searchParams.delete('builder_auth_code')
        cu.searchParams.delete('expires_in')
        history.replaceState(null, '', cu.pathname + cu.search + cu.hash)
      }

      // Step 2: try to restore session
      const token = localStorage.getItem(`bst_bld_258e10d749d04cc99139d1b28b1a3854`)
      if (token) {
        const user = await verifySession(token)
        if (user) {
          dispatch({ type: 'SET_USER', user })
          dispatch({ type: 'SET_SYNC_STATUS', status: '🔄 同步中…' })

          // Step 3: parallel load questions and cloud progress
          const [questions, cloudData] = await Promise.all([
            loadQuestions(),
            loadFromCloud(),
          ])

          if (questions.length) dispatch({ type: 'SET_QUESTIONS', questions })
          if (cloudData) dispatch({ type: 'MERGE_CLOUD', cloud: cloudData })

          dispatch({ type: 'SET_SYNC_STATUS', status: '✅ 已同步' })
          setTimeout(() => dispatch({ type: 'SET_SYNC_STATUS', status: '' }), 2000)
          dispatch({ type: 'AUTH_READY' })
          // 补检成就：为"成就系统上线之前就已达标"的历史用户补上时间戳，避免卡片空空
          dispatch({ type: 'RECHECK_ACHIEVEMENTS', goal })
          return
        }
        // token invalid
        localStorage.removeItem(`bst_bld_258e10d749d04cc99139d1b28b1a3854`)
      }

      // Step 4: redirect to login
      redirectToLogin()
    }
    init()
  }, [])

  // Build queue for learning
  const buildQueue = useCallback((type: string, goal: number): Question[] => {
    const cards = allCards()
    const t = todayLocal()
    const todayIds = new Set(state.store.daily[t]?.ids || [])

    if (type === 'review') return cards.filter(c => { const s = getCardState(c.id); return s && isDueByLocalDate(s.nextReview, t) })
    if (type === 'weak') return cards.filter(c => { const s = getCardState(c.id); return s && (s.status === 0 || s.status === 1) })
    if (type === 'fav') return cards.filter(c => { const s = getCardState(c.id); return s && s.fav })
    if (type === 'mastered') return cards.filter(c => { const s = getCardState(c.id); return s && s.status === 2 })
    if (type === 'today-studied') return cards.filter(c => todayIds.has(c.id))
    if (type === 'today-mastered') return cards.filter(c => todayIds.has(c.id) && getCardState(c.id)?.status === 2)
    if (type === 'single') return cards

    // type === 'review-due'：今日到期的复习题，全部取出（有评分栏，非预览）
    // 到期口径：本地日期 <= 今天。昨天学的新题今天就算到期，不用等满 24 小时。
    if (type === 'review-due') {
      return cards.filter(c => {
        const s = getCardState(c.id)
        return !!s && s.reviewCount > 0 && isDueByLocalDate(s.nextReview, t)
      })
    }

    // type === 'all'（新题）：排除今日已学 + 排除当前到期的复习题，按分类 round-robin 取 goal 道
    // 复习题必须先在「待复习」卡片里完成，不会混进新题队列
    //
    // 「新上传卡优先」（§12）：allCards() 已把 custom（上传生成卡）按上传时间新→旧排在最前，
    // 故 pool 保序后，最新文档的分类会成为 round-robin 分类遍历的打头项 → 今日新题先出最新上传卡。
    // 复习优先红线不受影响：本分支与 review-due / canStartNew 无关，复习没清空前新题不解锁。
    const reviewIds = new Set(
      cards
        .filter(c => { const s = getCardState(c.id); return !!s && s.reviewCount > 0 && isDueByLocalDate(s.nextReview, t) })
        .map(c => c.id)
    )
    // 今日学习题库范围过滤（需求1/2）：learnDeckScope='' 学全库；否则只学该题库的新题
    const inScope = (c: Question): boolean => {
      if (!learnDeckScope) return true
      if (learnDeckScope === BUILTIN_DECK_ID) return !c.source
      return c.source?.docId === learnDeckScope
    }
    const pool = cards.filter(c => !todayIds.has(c.id) && !reviewIds.has(c.id) && inScope(c))

    // 按分类分组，组内保持原顺序（loadQuestions 已按 sort_order 升序）
    // 分类首次出现的顺序 = 该分类第 1 道题在 pool 中的位置，保证结果稳定
    const buckets = new Map<string, Question[]>()
    for (const q of pool) {
      const list = buckets.get(q.cat)
      if (list) list.push(q)
      else buckets.set(q.cat, [q])
    }

    // Round-robin：每轮从每个非空分类取一道；某类耗尽后其余分类继续贡献直至凑齐 goal
    const result: Question[] = []
    const cats = [...buckets.keys()]
    while (result.length < goal) {
      let picked = 0
      for (const cat of cats) {
        if (result.length >= goal) break
        const list = buckets.get(cat)!
        if (list.length) {
          result.push(list.shift()!)
          picked++
        }
      }
      if (picked === 0) break  // 所有分类都空了，pool 不够 goal 道
    }
    return result
  }, [state.questions, state.store, getCardState, allCards, learnDeckScope])

  const startLearn = useCallback((type: string, cardId?: number, ids?: number[]) => {
    let queue: Question[]
    let startIdx: number | undefined = undefined
    if (type === 'single' && cardId !== undefined) {
      const all = allCards()
      if (ids && ids.length > 0) {
        // 从题库预览进入：queue 为筛选后的所有题目，定位到点击的那一道
        const idSet = new Set(ids)
        // 保持传入的 ids 顺序（filtered 的显示顺序），而不是 allCards 的顺序
        const byId = new Map(all.filter(c => idSet.has(c.id)).map(c => [c.id, c]))
        queue = ids.map(id => byId.get(id)).filter((c): c is Question => !!c)
        startIdx = Math.max(0, queue.findIndex(c => c.id === cardId))
      } else {
        queue = all.filter(c => c.id === cardId)
      }
    } else {
      queue = buildQueue(type, goal)
    }
    setLearnState({
      active: true,
      queue,
      queueType: type,
      goal,
      startIdx,
    })
  }, [buildQueue, goal, allCards])

  const exitLearn = useCallback(() => {
    setLearnState(null)
  }, [])

  // 当前今日学习题库范围内的卡片总数（供 GoalPicker 判断目标是否超过题库题数）
  const scopeCardCount = useCallback((scope: string): number => {
    const cards = allCards()
    if (!scope) return cards.length
    if (scope === BUILTIN_DECK_ID) return cards.filter(c => !c.source).length
    return cards.filter(c => c.source?.docId === scope).length
  }, [allCards])

  // 当前题库显示名
  const deckName = !learnDeckScope
    ? '全部题库'
    : learnDeckScope === BUILTIN_DECK_ID
      ? BUILTIN_DECK_NAME
      : (state.store.documents || []).find(d => d.docId === learnDeckScope)?.name || '全部题库'

  // 题库选项：全部 + 内置 + 各上传文档
  const deckOptions = [
    { v: '', l: '全部题库' },
    { v: BUILTIN_DECK_ID, l: BUILTIN_DECK_NAME },
    ...(state.store.documents || []).map(d => ({ v: d.docId, l: d.name })),
  ]

  // 选择今日学习题库
  const handlePickDeck = useCallback((scope: string) => {
    setLearnDeckScope(scope)
    localStorage.setItem(LEARN_DECK_KEY, scope)
    setDeckPickerOpen(false)
  }, [])

  // 若当前学习题库指向的文档已被删除，自动回退到「全部题库」，避免今日新题池为空
  useEffect(() => {
    if (!learnDeckScope || learnDeckScope === BUILTIN_DECK_ID) return
    const exists = (state.store.documents || []).some(d => d.docId === learnDeckScope)
    if (!exists) {
      setLearnDeckScope('')
      localStorage.setItem(LEARN_DECK_KEY, '')
    }
  }, [learnDeckScope, state.store.documents])

  // Show goal picker on first visit of the day (only once per day)
  // 用本地日期作为 key，与全站 today() 口径一致，避免北京时间 0:00-8:00 之间
  // key 停留在昨天导致目标弹窗跨天不触发的问题。
  useEffect(() => {
    const t = todayLocal()
    const lastDate = localStorage.getItem(GOAL_DATE_KEY)
    if (lastDate !== t) {
      // First open today: show picker AND mark as shown
      localStorage.setItem(GOAL_DATE_KEY, t)
      setGoalPickerOpen(true)
    }
  }, [])

  const handleGoalConfirm = useCallback((val: number) => {
    const t = todayLocal()
    setGoal(val)
    localStorage.setItem(GOAL_KEY, String(val))
    localStorage.setItem(GOAL_DATE_KEY, t)
    setGoalPickerOpen(false)
  }, [])

  // 设置目标按钮是否锁定：今天只要学过任何一道新题就锁定，跨天后自动解锁
  const { newDone } = getTodayProgress()
  const isGoalLocked = newDone > 0

  
  // If in learn mode
  if (learnState?.active) {
    return (
      <div className="app-container">
        <LearnPage
          onExit={exitLearn}
          queue={learnState.queue}
          queueType={learnState.queueType}
          goal={learnState.goal}
          startIdx={learnState.startIdx}
        />
      </div>
    )
  }

  return (
    <div className="app-container">
      {/* Pages */}
      {page === 'home' && (
        <HomePage
          user={state.user}
          onStartLearn={startLearn}
          goal={goal}
          onEditGoal={() => {
            if (isGoalLocked) setLockedAlert(true)
            else setGoalPickerOpen(true)
          }}
          onEditDeck={() => {
            // 与「设置目标」一致的锁定判断：
            // 已完成 → 弹「今日目标已达成」；进行中 → 弹「已经开始学习了…」
            if (isGoalLocked) setLockedAlert(true)
            else setDeckPickerOpen(true)
          }}
          deckName={deckName}
        />
      )}
      {page === 'library' && (
        <LibraryPage
          onPreviewCard={(id, filteredIds) => startLearn('single', id, filteredIds)}
        />
      )}
      {page === 'stats' && <StatsPage />}

      {page === 'me' && <MePage user={state.user} goal={goal} />}
      {/* 同步状态浮标（右上角小字） */}
      {state.syncStatus && (
        <div className="sync-badge">{state.syncStatus}</div>
      )}

      {/* 悬浮胶囊底部导航 */}
      <BottomNavigation active={page} onChange={setPage} />

      {/* Goal Picker */}
      {goalPickerOpen && (
        <GoalPicker
          initialValue={goal}
          onConfirm={handleGoalConfirm}
          onCancel={() => setGoalPickerOpen(false)}
          locked={false}
          minValue={newDone}
          deckCardCount={scopeCardCount(learnDeckScope)}
        />
      )}

      {/* Deck Picker：今日学习题库范围 */}
      {deckPickerOpen && (
        <DeckPicker
          options={deckOptions}
          current={learnDeckScope}
          countOf={scopeCardCount}
          onPick={handlePickDeck}
          onClose={() => setDeckPickerOpen(false)}
        />
      )}
      {/* Locked Alert */}
      {lockedAlert && (
        <div className="goal-overlay" onClick={() => setLockedAlert(false)}>
          <div className="goal-dialog" onClick={e => e.stopPropagation()} style={{ paddingBottom: 32 }}>
            <div className="goal-title">{newDone >= goal ? '今日目标已达成' : '已经开始学习了'}</div>
            <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--sub)', margin: '10px 0 24px' }}>
              {newDone >= goal ? '明天再来吧' : '先完成当前的学习计划吧'}
            </div>
            <button className="goal-btn primary" style={{ width: '100%' }} onClick={() => setLockedAlert(false)}>我知道了</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}
