import { useMemo } from 'react'
import { useApp } from '../store'
import {
  IconCalendar,
  IconClock,
  IconNotebook,
  IconStar,
  HandUnderline,
  Sparkle,
  HeartDoodle,
} from './icons'
import { getCategoryIcon } from '../utils/categoryIcon'

export default function StatsPage() {
  const { state, allCards, getCardState } = useApp()
  const { store } = state
  const cards = useMemo(() => allCards(), [state.questions, store.custom, store.documents])

  // Stats（顶部全局区：跨领域仍有意义的指标）
  const dayCount = Object.keys(store.daily).filter(k => store.daily[k]?.studied > 0).length
  const totalDuration = Object.values(store.daily).reduce((a, b) => a + (b.duration || 0), 0)
  const totalMin = Math.round(totalDuration / 60000)
  const totalStudied = Object.values(store.daily).reduce((a, b) => a + (b.studied || 0), 0)

  // 按来源（Deck）分区：内置题库（source 为空）+ 每个上传文档。
  // 掌握率不再全局混算，避免上传其他领域文档稀释「内置题库」的掌握率。
  const BUILTIN = '__builtin__'
  const sections = useMemo(() => {
    // 分组归属：card.source?.docId ?? '__builtin__'
    const groups = new Map<string, typeof cards>()
    for (const c of cards) {
      const key = c.source?.docId ?? BUILTIN
      const list = groups.get(key)
      if (list) list.push(c)
      else groups.set(key, [c])
    }
    const docNameOf = (docId: string) =>
      (store.documents || []).find(d => d.docId === docId)?.name || '上传文档'

    // 顺序：内置题库在前，其余文档按上传时间新→旧
    const docOrder = [...(store.documents || [])]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(d => d.docId)
    const orderedKeys = [BUILTIN, ...docOrder].filter(k => groups.has(k))

    return orderedKeys.map(key => {
      const list = groups.get(key)!
      const mastered = list.filter(c => getCardState(c.id)?.status === 2).length
      const rate = list.length ? Math.round(mastered / list.length * 100) : 0
      // 该来源内按 cat 的分类掌握度
      const cats = [...new Set(list.map(c => c.cat))]
      const catProgress = cats.map(cat => {
        const catCards = list.filter(c => c.cat === cat)
        const done = catCards.filter(c => getCardState(c.id)?.status === 2).length
        const pct = catCards.length ? Math.round(done / catCards.length * 100) : 0
        return { cat, done, total: catCards.length, pct }
      })
      return {
        key,
        title: key === BUILTIN ? '内置题库' : docNameOf(key),
        total: list.length,
        mastered,
        rate,
        catProgress,
      }
    })
  }, [cards, store.cards, store.documents, getCardState])

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

      {/* 底部：按来源分区展示掌握度（内置题库 + 每个上传文档） */}
      {sections.map(sec => (
        <div key={sec.key} className="stats-cat-card">
          <div className="stats-cat-header">
            <h3 className="stats-cat-title" title={sec.title}>{sec.title}</h3>
            <IconStar size={16} color="var(--accent)" filled style={{ marginLeft: 4, transform: 'rotate(15deg)' }} />
            <div className="stats-cat-underline">
              <HandUnderline width={110} />
            </div>
          </div>

          <div className="stats-section-summary">
            掌握 {sec.mastered} / {sec.total}（{sec.rate}%）
          </div>

          <div className="stats-cat-list">
            {sec.catProgress.map((cp) => (
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
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

