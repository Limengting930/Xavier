import { useState, useMemo, useCallback } from 'react'
import { useApp } from '../store'
import { IconStar, IconSearch, IconCheckbox, HandUnderline, Sparkle, HeartDoodle } from './icons'
import CatSearchImage from './library/CatSearchImage'
import PawStatusImage, { type PawStatus } from './library/PawStatusImage'
import LibFilterMenu from './library/LibFilterMenu'

interface Props {
  onPreviewCard: (id: number, filteredIds: number[]) => void
}

type FilterType = 'all' | 'cat' | 'status'

export default function LibraryPage({ onPreviewCard }: Props) {
  const { state, allCards, getCardState, toggleFav } = useApp()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterSub, setFilterSub] = useState('')
  const [onlyFav, setOnlyFav] = useState(false)

  const cards = useMemo(() => allCards(), [state.questions, state.store.custom])

  // 供 LibFilterMenu 使用的候选：不依赖当前 filterType，直接给两组全集
  const catOptions = useMemo(
    () => [...new Set(cards.map(c => c.cat))].map(c => ({ v: c, l: c })),
    [cards],
  )
  const statusOptions = useMemo(
    () => [
      { v: '0', l: '未掌握' },
      { v: '1', l: '模糊' },
      { v: '2', l: '已掌握' },
      { v: 'new', l: '未学习' },
    ],
    [],
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return cards.filter(c => {
      const matchQ = !q || c.q.toLowerCase().includes(q) || c.cat.toLowerCase().includes(q)
      if (!matchQ) return false
      if (onlyFav && !getCardState(c.id)?.fav) return false
      if (filterType === 'cat') return c.cat === filterSub
      if (filterType === 'status') {
        const s = getCardState(c.id)
        if (filterSub === 'new') return !s
        return !!s && String(s.status) === filterSub
      }
      return true
    })
  }, [cards, search, filterType, filterSub, onlyFav, getCardState])

  const statusLabel = (s: ReturnType<typeof getCardState>): { text: string; cls: string; status: PawStatus } => {
    if (!s) return { text: '未学习', cls: 'sl-new', status: 'new' }
    if (s.status === 2) return { text: '已掌握', cls: 'sl-know', status: 'mastered' }
    if (s.status === 1) return { text: '模糊', cls: 'sl-fuzzy', status: 'fuzzy' }
    return { text: '未掌握', cls: 'sl-forget', status: 'unknown' }
  }

  const handleFav = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    toggleFav(id)
  }

  // 传给 LibFilterMenu 的合并变更处理
  const handleFilterChange = useCallback((type: FilterType, sub: string) => {
    setFilterType(type)
    setFilterSub(sub)
  }, [])

  return (
    <div className="library-page">
      {/* Header：标题 + 手绘下划线 + 兔子插画 */}
      <header className="lib-header">
        <div className="lib-title-wrap">
          <h1 className="lib-title">
            共 <span className="lib-title-num">{cards.length}</span> 道题
          </h1>
          <HandUnderline width={128} style={{ marginTop: 4 }} />
        </div>

        {/* 顶部飘浮小装饰 */}
        <div className="lib-header-doodles" aria-hidden>
          <Sparkle size={11} color="#B69EFA" style={{ position: 'absolute', top: 6, left: 8 }} />
          <Sparkle size={10} color="#E8A83C" style={{ position: 'absolute', top: 62, left: 26 }} />
          <HeartDoodle size={14} color="#F0A5B0" stroke style={{ position: 'absolute', top: 34, right: 78 }} />
        </div>
      </header>

      {/* 搜索框 */}
      <div className="lib-search">
        <IconSearch size={20} color="#9E9AA6" />
        <input
          type="text"
          placeholder="搜索题目…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {/* 趴在搜索框右上的小猫装饰 */}
        <div className="lib-search-cat" aria-hidden>
          <CatSearchImage size={72} />
        </div>
      </div>

      {/* 筛选行 */}
      <div className="lib-filter">
        <LibFilterMenu
          filterType={filterType}
          filterSub={filterSub}
          catOptions={catOptions}
          statusOptions={statusOptions}
          onChange={handleFilterChange}
        />

        <label className={`lib-fav-tog${onlyFav ? ' is-on' : ''}`}>
          <input
            type="checkbox"
            checked={onlyFav}
            onChange={e => setOnlyFav(e.target.checked)}
          />
          <IconCheckbox size={18} color={onlyFav ? 'var(--accent)' : '#C6C4CB'} checked={onlyFav} />
          <span>我的收藏</span>
        </label>
      </div>

      {/* 列表 */}
      <div className="lib-list">
        {filtered.length === 0 ? (
          <div className="lib-empty">暂无题目</div>
        ) : (
          filtered.map(c => {
            const s = getCardState(c.id)
            const sl = statusLabel(s)
            const nextStr = s?.nextReview
              ? s.nextReview <= Date.now()
                ? '待复习'
                : `${Math.ceil((s.nextReview - Date.now()) / 86400000)}天后`
              : ''
            const isFav = !!s?.fav
            return (
              <div key={c.id} className="lib-item" onClick={() => onPreviewCard(c.id, filtered.map(x => x.id))}>
                <div className="lib-item-head">
                  <span className="lib-item-cat">{c.cat}</span>
                  <button
                    className="lib-item-fav"
                    onClick={e => handleFav(c.id, e)}
                    title="收藏"
                    aria-label="收藏"
                  >
                    <IconStar size={22} color={isFav ? '#E8A83C' : '#B0AEB6'} filled={isFav} />
                  </button>
                </div>
                <div className="lib-item-q">{c.q}</div>
                <div className="lib-item-foot">
                  <span className={`lib-item-status ${sl.cls}`}>
                    <PawStatusImage status={sl.status} size={30} />
                    <span>{sl.text}</span>
                  </span>
                  <span className="lib-item-next">{nextStr}</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
