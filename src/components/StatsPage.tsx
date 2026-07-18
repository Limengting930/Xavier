import { useMemo } from 'react'
import { useApp } from '../store'
import {
  IconCalendar,
  IconClock,
  IconNotebook,
  IconStar,
  HandUnderline,
  PlantIllustration,
  Sparkle,
  HeartDoodle,
} from './icons'
import { getCategoryIcon } from '../utils/categoryIcon'

export default function StatsPage() {
  const { state, allCards, getCardState } = useApp()
  const { store } = state
  const cards = useMemo(() => allCards(), [state.questions, store.custom])

  // Stats
  const dayCount = Object.keys(store.daily).filter(k => store.daily[k]?.studied > 0).length
  const totalDuration = Object.values(store.daily).reduce((a, b) => a + (b.duration || 0), 0)
  const totalMin = Math.round(totalDuration / 60000)
  const totalStudied = Object.values(store.daily).reduce((a, b) => a + (b.studied || 0), 0)
  const mastered = cards.filter(c => { const s = getCardState(c.id); return s && s.status === 2 }).length
  const rate = cards.length ? Math.round(mastered / cards.length * 100) : 0

  // Category progress
  const catProgress = useMemo(() => {
    const cats = [...new Set(cards.map(c => c.cat))]
    return cats.map(cat => {
      const catCards = cards.filter(c => c.cat === cat)
      const done = catCards.filter(c => { const s = getCardState(c.id); return s && s.status === 2 })
      const pct = catCards.length ? Math.round(done.length / catCards.length * 100) : 0
      return { cat, done: done.length, total: catCards.length, pct }
    })
    // 按照总数或完成度排序可以更美观，或者保持原有顺序
    // 这里保持原有逻辑
  }, [cards, store.cards])

  return (
    <div className="page active library-page" id="page-stats">
      {/* Header：标题 + 手绘下划线（与题库页样式一致） */}
      <header className="lib-header">
        <div className="lib-title-wrap">
          <h1 className="lib-title">学习数据</h1>
          <HandUnderline width={96} style={{ marginTop: 4 }} />
        </div>

        {/* 顶部飘浮小装饰 */}
        <div className="lib-header-doodles" aria-hidden>
          <Sparkle size={11} color="#B69EFA" style={{ position: 'absolute', top: 6, left: 8 }} />
          <Sparkle size={10} color="#E8A83C" style={{ position: 'absolute', top: 62, left: 26 }} />
          <HeartDoodle size={14} color="#F0A5B0" stroke style={{ position: 'absolute', top: 34, right: 78 }} />
        </div>
      </header>

      {/* 顶部三个数据卡片 */}
      <div className="stats-top-grid">
        <div className="stats-top-card purple">
          <div className="icon-box">
            <IconCalendar size={18} />
          </div>
          <IconStar size={14} color="#B69EFA" style={{ position: 'absolute', top: 12, right: 12, opacity: 0.6 }} />
          <div className="value">{dayCount}</div>
          <div className="label">学习天数</div>
        </div>
        <div className="stats-top-card purple">
          <div className="icon-box">
            <IconClock size={18} />
          </div>
          <IconStar size={14} color="#E8A83C" style={{ position: 'absolute', top: 12, right: 12, opacity: 0.6 }} />
          <div className="value">{totalMin}<small>分</small></div>
          <div className="label">总学习时长</div>
        </div>
        <div className="stats-top-card purple">
          <div className="icon-box">
            <IconNotebook size={18} />
          </div>
          <IconStar size={14} color="#F0A5B0" style={{ position: 'absolute', top: 12, right: 12, opacity: 0.6 }} />
          <div className="value">{totalStudied}</div>
          <div className="label">总学习题数</div>
        </div>
      </div>

      {/* 中间掌握率卡片 */}
      <div className="stats-mastery-card">
        <div className="value">{rate}%</div>
        <div className="label">掌握率</div>
        
        {/* 左侧小装饰 */}
        <div className="plant-decor-left">
          <svg width="24" height="40" viewBox="0 0 24 40" fill="none">
            <path d="M12 40 C12 30 6 24 4 16 C12 20 16 28 12 40" fill="#B7D9AE" opacity="0.8" />
            <path d="M12 34 C18 28 22 20 20 12 C14 16 12 24 12 34" fill="#A5CE9D" opacity="0.8" />
            <path d="M12 40 L12 20" stroke="#7BB077" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          </svg>
        </div>
        <IconStar size={12} color="#F0A5B0" style={{ position: 'absolute', left: 40, top: 30, opacity: 0.8 }} />
        <IconStar size={10} color="#E8A83C" style={{ position: 'absolute', right: 80, bottom: 20, opacity: 0.7 }} />

        {/* 右侧盆栽 */}
        <div className="plant-decor-right">
          <PlantIllustration size={80} />
        </div>
      </div>

      {/* 底部各分类掌握度 */}
      <div className="stats-cat-card">
        <div className="stats-cat-header">
          <h3 className="stats-cat-title">分类掌握度</h3>
          <IconStar size={16} color="var(--accent)" filled style={{ marginLeft: 4, transform: 'rotate(15deg)' }} />
          <div className="stats-cat-underline">
            <HandUnderline width={110} />
          </div>
        </div>

        <div className="stats-cat-list">
          {catProgress.map((cp) => {
            return (
              <div key={cp.cat} className="stats-cat-item">
                <div className="stats-cat-icon">
                  {getCategoryIcon(cp.cat)}
                </div>
                <div className="stats-cat-name" title={cp.cat}>{cp.cat}</div>
                <div className="stats-cat-bar-wrap">
                  <div className="stats-cat-bar">
                    <div
                      className="stats-cat-bar-fill"
                      style={{ width: `${cp.pct}%` }}
                    />
                  </div>
                  <div className="stats-cat-fraction">{cp.done}/{cp.total}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

