import { useState, useMemo, useCallback } from 'react'
import { useApp } from '../store'
import { BUILTIN_DECK_ID, BUILTIN_DECK_NAME } from '../types'
import { IconStar, IconSearch, IconCheckbox, HandUnderline, Sparkle, HeartDoodle } from './icons'
import CatSearchImage from './library/CatSearchImage'
import PawStatusImage, { type PawStatus } from './library/PawStatusImage'
import LibFilterMenu, { type FilterType } from './library/LibFilterMenu'
import UploadSheet from './UploadSheet'

interface Props {
  onPreviewCard: (id: number, filteredIds: number[]) => void
}

export default function LibraryPage({ onPreviewCard }: Props) {
  const { state, dispatch, allCards, getCardState, toggleFav } = useApp()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterSub, setFilterSub] = useState('')
  const [onlyFav, setOnlyFav] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  // 题库范围：独立于 filterType 的"当前题库上下文"。'' = 全部题库；否则为某题库 docId / 内置题库 id。
  // 选了题库后，知识点/掌握程度/搜索/收藏都在该题库范围内叠加筛选。
  const [deckScope, setDeckScope] = useState('')
  // 更新目标：非 null 时以「更新模式」打开 UploadSheet
  const [updateTarget, setUpdateTarget] = useState<{ docId: string; docName: string; categories: string[] } | null>(null)
  // 待删除确认的题库
  const [deleteTarget, setDeleteTarget] = useState<{ docId: string; name: string; count: number } | null>(null)

  const cards = useMemo(() => allCards(), [state.questions, state.store.custom, state.store.documents])

  // 当前题库范围内的卡（供知识点候选、列表联动）。deckScope='' 时即全库。
  const scopedCards = useMemo(() => {
    if (!deckScope) return cards
    if (deckScope === BUILTIN_DECK_ID) return cards.filter(c => !c.source)
    return cards.filter(c => c.source?.docId === deckScope)
  }, [cards, deckScope])

  // 知识点候选：按当前选中题库范围内的知识点生成（需求：cat 联动 deck）
  const catOptions = useMemo(
    () => [...new Set(scopedCards.map(c => c.cat))].map(c => ({ v: c, l: c })),
    [scopedCards],
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
  // 题库候选：内置题库 + 每个上传文档
  const deckOptions = useMemo(
    () => [
      { v: BUILTIN_DECK_ID, l: BUILTIN_DECK_NAME },
      ...(state.store.documents || []).map(d => ({ v: d.docId, l: d.name })),
    ],
    [state.store.documents],
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    // 先按题库范围收窄，再叠加其余筛选
    return scopedCards.filter(c => {
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
  }, [scopedCards, search, filterType, filterSub, onlyFav, getCardState])

  // 当前题库范围对应的「上传题库」（内置题库不可管理，返回 null）
  const managedDeck = useMemo(() => {
    if (!deckScope || deckScope === BUILTIN_DECK_ID) return null
    const doc = (state.store.documents || []).find(d => d.docId === deckScope)
    return doc || null
  }, [deckScope, state.store.documents])

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
    if (type === 'deck') {
      // 切换题库范围。切库后旧的知识点/状态筛选可能不适用于新库 → 重置回「全部」
      setDeckScope(sub)
      setFilterType('all')
      setFilterSub('')
    } else if (type === 'all') {
      // 顶层「全部」：彻底清空所有筛选（含题库范围）
      setDeckScope('')
      setFilterType('all')
      setFilterSub('')
    } else {
      // 知识点 / 掌握程度：在当前题库范围内叠加，deckScope 保持不变
      setFilterType(type)
      setFilterSub(sub)
    }
  }, [])

  // 确认删除题库：复用已实现的 REMOVE_DOCUMENT（移除卡片+DocMeta+学习状态+写墓碑）
  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return
    dispatch({ type: 'REMOVE_DOCUMENT', docId: deleteTarget.docId })
    // 删除的正是当前范围题库 → 全部重置，避免筛到空题库
    setDeckScope('')
    setFilterType('all')
    setFilterSub('')
    setDeleteTarget(null)
  }, [deleteTarget, dispatch])

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

        <button className="lib-upload-btn" onClick={() => setUploadOpen(true)}>
          上传文档
        </button>

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
          deckScope={deckScope}
          catOptions={catOptions}
          statusOptions={statusOptions}
          deckOptions={deckOptions}
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

      {/* 题库管理条：仅当筛选到某个上传题库时出现，内置题库不显示 */}
      {managedDeck && (
        <div className="lib-deck-manage">
          <span className="lib-deck-manage-name" title={managedDeck.name}>
            {managedDeck.name}（{managedDeck.cardCount} 张）
          </span>
          <div className="lib-deck-manage-actions">
            <button
              className="lib-deck-btn"
              onClick={() => setUpdateTarget({
                docId: managedDeck.docId,
                docName: managedDeck.name,
                categories: managedDeck.categories || [],
              })}
            >
              更新
            </button>
            <button
              className="lib-deck-btn danger"
              onClick={() => setDeleteTarget({
                docId: managedDeck.docId,
                name: managedDeck.name,
                count: managedDeck.cardCount,
              })}
            >
              删除
            </button>
          </div>
        </div>
      )}

      {/* 列表 */}
      <div className="lib-list">
        {filtered.length === 0 ? (
          <div className="lib-empty">暂无题目</div>
        ) : (
          filtered.map(c => {
            const s = getCardState(c.id)
            const sl = statusLabel(s)
            // 到期口径与全站一致：nextReview 的本地日期 <= 今天 → 待复习
            // 否则显示"N 天后"（按自然日差算，用 setHours(0,0,0,0) 归零两侧到当天起点）
            let nextStr = ''
            if (s?.nextReview) {
              const today0 = new Date(); today0.setHours(0, 0, 0, 0)
              const next0 = new Date(s.nextReview); next0.setHours(0, 0, 0, 0)
              const diffDays = Math.round((next0.getTime() - today0.getTime()) / 86400000)
              nextStr = diffDays <= 0 ? '待复习' : `${diffDays}天后`
            }
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

      {(uploadOpen || updateTarget) && (
        <UploadSheet
          onClose={() => { setUploadOpen(false); setUpdateTarget(null) }}
          onGoLibrary={() => { setUploadOpen(false); setUpdateTarget(null) }}
          updateTarget={updateTarget ?? undefined}
        />
      )}

      {/* 删除题库二次确认弹框（复用 goal-overlay 范式） */}
      {deleteTarget && (
        <div className="goal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="goal-dialog" onClick={e => e.stopPropagation()} style={{ paddingBottom: 32 }}>
            <div className="goal-title">确认删除？</div>
            <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--sub)', margin: '12px 0 24px', lineHeight: 1.6 }}>
              确定删除《{deleteTarget.name}》？<br />
              将移除 {deleteTarget.count} 张卡片及其学习记录，删除后无法找回。
            </div>
            <div className="lib-del-actions">
              <button className="goal-btn secondary" onClick={() => setDeleteTarget(null)}>取消</button>
              <button className="goal-btn danger" onClick={confirmDelete}>删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
