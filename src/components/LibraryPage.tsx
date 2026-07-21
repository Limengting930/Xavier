import { useState, useMemo, useCallback } from 'react'
import { useApp } from '../store'
import { BUILTIN_DECK_ID, BUILTIN_DECK_NAME } from '../types'
import type { Question } from '../types'
import { IconStar, IconSearch, IconCheckbox, HandUnderline, Sparkle, HeartDoodle, IconChevronLeft, IconPencil, IconBookOpen, IconGrid4 } from './icons'
import CatSearchImage from './library/CatSearchImage'
import PawStatusImage, { type PawStatus } from './library/PawStatusImage'
import LibFilterMenu, { type FilterType } from './library/LibFilterMenu'
import UploadSheet from './UploadSheet'

/** 题库页筛选状态（题目列表内使用）。提升到 App 层持有，切底部导航不重置，仅刷新才回默认。 */
export interface LibFilterState {
  search: string
  filterType: FilterType
  filterSub: string
  onlyFav: boolean
}

interface Props {
  onPreviewCard: (id: number, filteredIds: number[]) => void
  filter: LibFilterState
  onFilterChange: (updater: (prev: LibFilterState) => LibFilterState) => void
  /** 当前进入的题库（docId 或内置题库 id）；null = 题库列表视图 */
  viewDeck: string | null
  onViewDeckChange: (deck: string | null) => void
}

/** 上次学习时间格式化：今天 / N天前 / 未学习 */
function formatLastReview(ts: number): string {
  if (!ts) return '未学习'
  const d0 = new Date(); d0.setHours(0, 0, 0, 0)
  const t0 = new Date(ts); t0.setHours(0, 0, 0, 0)
  const diff = Math.round((d0.getTime() - t0.getTime()) / 86400000)
  if (diff <= 0) return '今天学过'
  if (diff === 1) return '昨天学过'
  if (diff < 30) return `${diff} 天前`
  return new Date(ts).toLocaleDateString('sv-SE')
}

export default function LibraryPage({ onPreviewCard, filter, onFilterChange, viewDeck, onViewDeckChange }: Props) {
  const { state, dispatch, allCards, getCardState, toggleFav } = useApp()
  const { search, filterType, filterSub, onlyFav } = filter
  const patch = useCallback(
    (p: Partial<LibFilterState>) => onFilterChange(prev => ({ ...prev, ...p })),
    [onFilterChange],
  )
  const setSearch = useCallback((v: string) => patch({ search: v }), [patch])
  const setOnlyFav = useCallback((v: boolean) => patch({ onlyFav: v }), [patch])

  const [uploadOpen, setUploadOpen] = useState(false)
  const [updateTarget, setUpdateTarget] = useState<{ docId: string; docName: string; categories: string[] } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ docId: string; name: string; count: number } | null>(null)
  // 重命名弹窗
  const [renameTarget, setRenameTarget] = useState<{ docId: string; name: string } | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState('')

  const cards = useMemo(() => allCards(), [state.questions, state.store.custom, state.store.documents])

  // ── 题库列表（第一级）：内置题库 + 每个上传文档 ──
  const decks = useMemo(() => {
    const docs = state.store.documents || []
    // 内置题库（source 为空的卡）
    const builtinCards = cards.filter(c => !c.source)
    type DeckRow = {
      key: string; name: string; isBuiltin: boolean
      docId?: string; categories?: string[]
      total: number; mastered: number; lastReview: number
    }
    const rowOf = (key: string, name: string, isBuiltin: boolean, list: Question[], docId?: string, categories?: string[]): DeckRow => {
      let mastered = 0, lastReview = 0
      for (const c of list) {
        const s = getCardState(c.id)
        if (s?.status === 2) mastered++
        if (s?.lastReview && s.lastReview > lastReview) lastReview = s.lastReview
      }
      return { key, name, isBuiltin, docId, categories, total: list.length, mastered, lastReview }
    }
    const rows: DeckRow[] = []
    if (builtinCards.length > 0) rows.push(rowOf(BUILTIN_DECK_ID, BUILTIN_DECK_NAME, true, builtinCards))
    // 上传文档按上传时间新→旧
    ;[...docs].sort((a, b) => b.createdAt - a.createdAt).forEach(d => {
      const list = cards.filter(c => c.source?.docId === d.docId)
      rows.push(rowOf(d.docId, d.name, false, list, d.docId, d.categories))
    })
    return rows
  }, [cards, state.store.documents, getCardState])

  // ── 当前题库范围内的卡（第二级题目列表用） ──
  const scopedCards = useMemo(() => {
    if (!viewDeck) return []
    if (viewDeck === BUILTIN_DECK_ID) return cards.filter(c => !c.source)
    return cards.filter(c => c.source?.docId === viewDeck)
  }, [cards, viewDeck])

  const currentDeckName = useMemo(() => {
    if (!viewDeck) return ''
    if (viewDeck === BUILTIN_DECK_ID) return BUILTIN_DECK_NAME
    return (state.store.documents || []).find(d => d.docId === viewDeck)?.name || '题库'
  }, [viewDeck, state.store.documents])

  // 知识点候选：当前题库范围内
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
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

  // 题目列表内的筛选变更（只有 cat / status / all）
  const handleFilterChange = useCallback((type: FilterType, sub: string) => {
    if (type === 'all') patch({ filterType: 'all', filterSub: '' })
    else patch({ filterType: type, filterSub: sub })
  }, [patch])

  // 进入某题库题目列表（重置该库的筛选，避免带入上一个库的知识点）
  const enterDeck = useCallback((key: string) => {
    onViewDeckChange(key)
    patch({ filterType: 'all', filterSub: '', search: '', onlyFav: false })
  }, [onViewDeckChange, patch])

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return
    dispatch({ type: 'REMOVE_DOCUMENT', docId: deleteTarget.docId })
    setDeleteTarget(null)
  }, [deleteTarget, dispatch])

  // 打开重命名
  const openRename = useCallback((docId: string, name: string) => {
    setRenameTarget({ docId, name })
    setRenameValue(name)
    setRenameError('')
  }, [])
  // 确认重命名（含重名校验）
  const confirmRename = useCallback(() => {
    if (!renameTarget) return
    const name = renameValue.trim()
    if (!name) { setRenameError('请输入题库名称'); return }
    const norm = (s: string) => s.trim().toLowerCase()
    if (norm(name) === norm(renameTarget.name)) { setRenameTarget(null); return } // 没改
    const dup = norm(name) === norm(BUILTIN_DECK_NAME)
      || (state.store.documents || []).some(d => d.docId !== renameTarget.docId && norm(d.name) === norm(name))
    if (dup) { setRenameError('已存在同名题库，请换一个名称'); return }
    dispatch({ type: 'RENAME_DOCUMENT', docId: renameTarget.docId, name })
    setRenameTarget(null)
  }, [renameTarget, renameValue, dispatch, state.store.documents])

  // ══════════════════════════════════════════
  // 渲染：第一级 题库列表
  // ══════════════════════════════════════════
  if (!viewDeck) {
    return (
      <div className="library-page">
        <header className="lib-header">
          <div className="lib-title-wrap">
            <h1 className="lib-title">
              共 <span className="lib-title-num">{decks.length}</span> 个题库
            </h1>
            <HandUnderline width={128} style={{ marginTop: 4 }} />
          </div>
          <button className="lib-upload-btn" onClick={() => setUploadOpen(true)}>
            上传题库
          </button>
          <div className="lib-header-doodles" aria-hidden>
            <Sparkle size={11} color="#B69EFA" style={{ position: 'absolute', top: 6, left: 8 }} />
            <Sparkle size={10} color="#E8A83C" style={{ position: 'absolute', top: 62, left: 26 }} />
            <HeartDoodle size={14} color="#F0A5B0" stroke style={{ position: 'absolute', top: 34, right: 78 }} />
          </div>
        </header>

        <div className="lib-list">
          {decks.length === 0 ? (
            <div className="lib-empty">暂无题库，点击右上角上传</div>
          ) : (
            decks.map(d => {
              const pct = d.total ? Math.round(d.mastered / d.total * 100) : 0
              return (
                <div key={d.key} className="deck-item" onClick={() => enterDeck(d.key)}>
                  <div className="deck-item-head">
                    <span className="deck-item-icon">
                      {d.isBuiltin ? <IconGrid4 size={20} color="var(--accent)" /> : <IconBookOpen size={20} color="var(--accent)" />}
                    </span>
                    <span className="deck-item-name" title={d.name}>{d.name}</span>
                    {!d.isBuiltin && (
                      <button
                        className="deck-item-rename"
                        title="重命名"
                        aria-label="重命名"
                        onClick={e => { e.stopPropagation(); openRename(d.docId!, d.name) }}
                      >
                        <IconPencil size={15} color="var(--sub)" />
                      </button>
                    )}
                  </div>

                  <div className="deck-item-progress">
                    <div className="deck-item-bar">
                      <div className="deck-item-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="deck-item-frac">{d.mastered}/{d.total}</span>
                  </div>

                  <div className="deck-item-foot">
                    <span className="deck-item-time">{formatLastReview(d.lastReview)}</span>
                    {!d.isBuiltin && (
                      <span className="deck-item-actions">
                        <button
                          className="deck-act-btn"
                          onClick={e => { e.stopPropagation(); setUpdateTarget({ docId: d.docId!, docName: d.name, categories: d.categories || [] }) }}
                        >
                          更新
                        </button>
                        <button
                          className="deck-act-btn danger"
                          onClick={e => { e.stopPropagation(); setDeleteTarget({ docId: d.docId!, name: d.name, count: d.total }) }}
                        >
                          删除
                        </button>
                      </span>
                    )}
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

        {renameTarget && (
          <div className="goal-overlay" onClick={() => setRenameTarget(null)}>
            <div className="goal-dialog" onClick={e => e.stopPropagation()} style={{ paddingBottom: 32 }}>
              <div className="goal-title">重命名题库</div>
              <input
                className="upload-naming-input"
                style={{ width: '100%', marginTop: 16 }}
                type="text"
                value={renameValue}
                maxLength={40}
                autoFocus
                onChange={e => { setRenameValue(e.target.value); setRenameError('') }}
                onKeyDown={e => { if (e.key === 'Enter') confirmRename() }}
              />
              {renameError && <div className="upload-error">{renameError}</div>}
              <div className="lib-del-actions" style={{ marginTop: 20 }}>
                <button className="goal-btn secondary" onClick={() => setRenameTarget(null)}>取消</button>
                <button className="goal-btn primary" onClick={confirmRename}>保存</button>
              </div>
            </div>
          </div>
        )}

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

  // ══════════════════════════════════════════
  // 渲染：第二级 题目列表
  // ══════════════════════════════════════════
  return (
    <div className="library-page">
      <header className="lib-header lib-header-sub">
        <button className="lib-back-btn" onClick={() => onViewDeckChange(null)} aria-label="返回题库列表">
          <IconChevronLeft size={22} color="var(--text)" />
        </button>
        <h1 className="lib-title lib-title-deck" title={currentDeckName}>{currentDeckName}</h1>
        <span className="lib-sub-count">{filtered.length} 题</span>
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
        <div className="lib-search-cat" aria-hidden>
          <CatSearchImage size={72} />
        </div>
      </div>

      {/* 筛选行：知识点 / 掌握程度 + 收藏（无题库维度） */}
      <div className="lib-filter">
        <LibFilterMenu
          filterType={filterType}
          filterSub={filterSub}
          catOptions={catOptions}
          statusOptions={statusOptions}
          onChange={handleFilterChange}
        />
        <label className={`lib-fav-tog${onlyFav ? ' is-on' : ''}`}>
          <input type="checkbox" checked={onlyFav} onChange={e => setOnlyFav(e.target.checked)} />
          <IconCheckbox size={18} color={onlyFav ? 'var(--accent)' : '#C6C4CB'} checked={onlyFav} />
          <span>我的收藏</span>
        </label>
      </div>

      {/* 题目列表 */}
      <div className="lib-list">
        {filtered.length === 0 ? (
          <div className="lib-empty">暂无题目</div>
        ) : (
          filtered.map(c => {
            const s = getCardState(c.id)
            const sl = statusLabel(s)
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
                  <button className="lib-item-fav" onClick={e => handleFav(c.id, e)} title="收藏" aria-label="收藏">
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
