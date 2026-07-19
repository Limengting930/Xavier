import { useMemo, useRef, useState } from 'react'
import { useApp, today } from '../store'
import type { UserInfo } from '../types'
import Header from './home/Header'
import TodayCard from './home/TodayCard'
import ReviewCard from './home/ReviewCard'
import StatsRow from './home/StatsRow'
import GrowthCard from './home/GrowthCard'
import QuoteCard from './home/QuoteCard'

interface Props {
  user: UserInfo | null
  onStartLearn: (type: string) => void
  goal: number
  onEditGoal: () => void
  isGoalLocked: boolean
}

/**
 * 每日一句：按日期稳定随机（同一天永远同一句）
 * 保留手帐感短句
 */
const QUOTES: { title?: string; lines: string[] }[] = [
  { lines: ['Keep going.', 'Little by little.'] },
  { lines: ['Slow is smooth,', 'smooth is fast.'] },
  { lines: ['One card', 'at a time.'] },
  { lines: ['Small steps,', 'big journey.'] },
  { lines: ['Trust the', 'process.'] },
  { lines: ['Be curious,', 'stay kind.'] },
  { lines: ['Discipline', 'beats motivation.'] },
]

function pickQuote(): { title: string; lines: string[] } {
  const t = today()
  // 简单 hash：按日期字符串码值和
  const h = [...t].reduce((s, c) => s + c.charCodeAt(0), 0)
  const q = QUOTES[h % QUOTES.length]
  return { title: '今日一句', lines: q.lines }
}

export default function HomePage({
  user,
  onStartLearn,
  goal,
  onEditGoal,
  isGoalLocked,
}: Props) {
  const { state, getCardState, getTodayProgress } = useApp()
  const { store } = state

  const t = today()
  const todayMs = store.daily[t]?.duration || 0
  const todayMin = Math.round(todayMs / 60000)
  const todayIds = useMemo(() => new Set(store.daily[t]?.ids || []), [store.daily, t])
  const todayMastered = useMemo(
    () => [...todayIds].filter(id => getCardState(id)?.status === 2).length,
    [todayIds, getCardState],
  )

  // 今日「复习 / 新题」完成情况
  const { reviewTotal, reviewDone, newDone } = getTodayProgress()
  const newFinished = goal > 0 && newDone >= goal
  const remainingReview = Math.max(0, reviewTotal - reviewDone)

  // 连续打卡（按本地日期回溯，与 store.computeStreak 口径一致）
  const streak = useMemo(() => {
    let s = 0
    const base = new Date()
    base.setHours(0, 0, 0, 0)
    for (let i = 0; i < 365; i++) {
      const d = new Date(base.getTime() - i * 86400000)
      const k = d.toLocaleDateString('sv-SE')
      if (store.daily[k]?.studied > 0) s++
      else if (i > 0) break
    }
    return s
  }, [store.daily])

  const quote = useMemo(pickQuote, [])

  // TodayCard 数字固定：新题目标
  const newBlocked = remainingReview > 0

  // 简易 Toast
  const [toastMsg, setToastMsg] = useState('')
  const [toastShow, setToastShow] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = (msg: string) => {
    setToastMsg(msg)
    setToastShow(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastShow(false), 2000)
  }

  // 递增即触发一次 ReviewCard 的「先来复习哦~」气泡
  const [reviewBubbleTick, setReviewBubbleTick] = useState(0)

  // ─── 主 CTA 行为 ───
  // TodayCard 只负责「新题目标」，有待复习时点击按钮不进入学习，而是提示先复习（气泡）
  const handleStartNew = () => {
    if (newBlocked) {
      setReviewBubbleTick(t => t + 1)
      return
    }
    if (newFinished) {
      showToast('今日目标已达成，明天见 :)')
      return
    }
    onStartLearn('all')
  }

  const handleStartReview = () => {
    onStartLearn('review-due')
  }

  const handleEditGoal = () => {
    if (isGoalLocked) {
      showToast('今日学习已结束，明天再来吧')
      return
    }
    onEditGoal()
  }

  // TodayCard 数字固定：新题目标
  const todayCtaLabel = newFinished ? '今日已完成' : '开始学习'
  // 未完成复习时按钮**不 disabled**，点击时由 handleStartNew 判断并弹气泡
  const todayCtaDisabled = !newBlocked && goal > 0 && newDone >= goal
  const todayHint = newBlocked ? '请先完成复习' : undefined

  return (
    <div className="home-page">
      <Header user={user} />

      <TodayCard
        done={newDone}
        total={goal}
        onContinue={handleStartNew}
        onEditGoal={handleEditGoal}
        ctaLabel={todayCtaLabel}
        ctaDisabled={todayCtaDisabled}
        hintText={todayHint}
      />

      <ReviewCard
        done={reviewDone}
        total={reviewTotal}
        onStart={handleStartReview}
        forceBubbleTick={reviewBubbleTick}
      />

      <StatsRow
        items={[
          {
            variant: 'mastered',
            label: '今日掌握',
            value: todayMastered,
            desc: `今天学会了 ${todayMastered} 题`,
            onClick: () => onStartLearn('today-mastered'),
          },
          {
            variant: 'duration',
            label: '学习时长',
            value: todayMin,
            unit: 'min',
            desc: '专注学习时长',
          },
        ]}
      />

      <div className="home-bottom-row">
        <GrowthCard streakDays={streak} />
        <QuoteCard title={quote.title} lines={quote.lines} />
      </div>

      {/* Toast */}
      <div className={`home-toast${toastShow ? ' show' : ''}`}>{toastMsg}</div>
    </div>
  )
}
