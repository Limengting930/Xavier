import { useState, useEffect, useRef } from 'react'
import {
  IconFunnel,
  IconUpDown,
  IconCheck,
  IconChevronRight,
  IconGrid4,
  IconBookOpen,
  IconTarget,
} from '../icons'
import { getCategoryIcon } from '../../utils/categoryIcon'
import PawStatusImage, { type PawStatus } from './PawStatusImage'

export type FilterType = 'all' | 'cat' | 'status' | 'deck'
export interface SubOption { v: string; l: string }

interface Props {
  filterType: FilterType
  filterSub: string
  /** 当前题库范围 docId（'' = 全部题库）。与 filterType 解耦，驱动「题库」项高亮。可选 */
  deckScope?: string
  /** 知识点全集，用于二级展开 */
  catOptions: SubOption[]
  /** 掌握程度全集，用于二级展开 */
  statusOptions: SubOption[]
  /** 题库全集，用于二级展开。不传或为空时不显示「题库」维度 */
  deckOptions?: SubOption[]
  onChange: (type: FilterType, sub: string) => void
}

/**
 * 题库筛选器：设计稿还原
 * - 触发器：漏斗 + 当前 filterLabel + 上下箭头（胶囊，紫色描边）
 * - 弹出面板：
 *   · 3 个主选项（全部 / 知识点 / 掌握程度），带各自 icon
 *   · 已选项高亮 + 右侧 ✓；未选项右侧 ›（提示可展开二级）
 *   · 面板底部装饰：左下叶子、右下星星
 * - 二级：点"知识点"或"掌握程度"后展开子列表（在同一面板内展开）
 * - 点击面板外部自动关闭
 */
export default function LibFilterMenu({ filterType, filterSub, deckScope = '', catOptions, statusOptions, deckOptions, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [expand, setExpand] = useState<FilterType | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const deckLabel = deckScope ? (deckOptions?.find(o => o.v === deckScope)?.l || '题库') : ''
  const label =
    filterType === 'cat'
      ? (catOptions.find(o => o.v === filterSub)?.l || '知识点')
      : filterType === 'status'
        ? (statusOptions.find(o => o.v === filterSub)?.l || '掌握程度')
        : deckLabel || '全部'

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setExpand(null)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const handlePickMain = (t: FilterType) => {
    if (t === 'all') {
      onChange('all', '')
      setOpen(false)
      setExpand(null)
    } else {
      // 展开子菜单
      setExpand(prev => (prev === t ? null : t))
    }
  }

  const handlePickSub = (t: FilterType, v: string) => {
    onChange(t, v)
    setOpen(false)
    setExpand(null)
  }

  // 二级候选（直接用外部传入的两组全集）
  const catOptionsForExpand = expand === 'cat' ? catOptions : []
  const statusOptionsForExpand = expand === 'status' ? statusOptions : []
  const deckOptionsForExpand = expand === 'deck' ? (deckOptions ?? []) : []
  const showDeck = !!deckOptions && deckOptions.length > 0

  return (
    <div className="lib-fm-wrap" ref={wrapRef}>
      {/* 触发器 */}
      <button
        type="button"
        className={`lib-fm-trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        <IconFunnel size={16} color="var(--accent)" />
        <span className="lib-fm-trigger-text">{label}</span>
        <IconUpDown size={14} color="var(--sub)" />
        {/* 右上小笔触装饰 */}
        <span className="lib-fm-trigger-doodle" aria-hidden>
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
            <path d="M2 8L4 5M6 10L7 6M10 4L12 2" stroke="#B69EFA" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      {/* 弹出面板 */}
      {open && (
        <div className="lib-fm-panel">
          <div className="lib-fm-arrow" aria-hidden />

          {/* 主菜单 */}
          <MenuItem
            active={filterType === 'all' && !deckScope}
            icon={<IconGrid4 size={20} color="var(--accent)" />}
            label="全部"
            trailing={filterType === 'all' && !deckScope
              ? <IconCheck size={18} color="var(--accent)" />
              : <IconChevronRight size={16} color="var(--sub)" />}
            onClick={() => handlePickMain('all')}
          />

          {showDeck && (
            <>
              <MenuItem
                active={!!deckScope}
                icon={<IconBookOpen size={20} color="#B69EFA" />}
                label="题库"
                trailing={deckScope
                  ? <IconCheck size={18} color="var(--accent)" />
                  : <IconChevronRight size={16} color="var(--sub)" />}
                onClick={() => handlePickMain('deck')}
              />

              {/* 题库二级 */}
              {expand === 'deck' && deckOptionsForExpand.length > 0 && (
                <div className="lib-fm-sub">
                  {deckOptionsForExpand.map(o => (
                    <button
                      key={o.v}
                      type="button"
                      className={`lib-fm-sub-item${deckScope === o.v ? ' is-active' : ''}`}
                      onClick={() => handlePickSub('deck', o.v)}
                    >
                      <span className="lib-fm-sub-icon">
                        <IconBookOpen size={14} color="var(--accent)" />
                      </span>
                      <span className="lib-fm-sub-label">{o.l}</span>
                      {deckScope === o.v && <IconCheck size={16} color="var(--accent)" />}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <MenuItem
            active={filterType === 'cat'}
            icon={<IconBookOpen size={20} color="#E8A83C" />}
            label="知识点"
            trailing={filterType === 'cat'
              ? <IconCheck size={18} color="var(--accent)" />
              : <IconChevronRight size={16} color="var(--sub)" />}
            onClick={() => handlePickMain('cat')}
          />

          {/* 知识点二级 */}
          {expand === 'cat' && catOptionsForExpand.length > 0 && (
            <div className="lib-fm-sub">
              {catOptionsForExpand.map(o => (
                <button
                  key={o.v}
                  type="button"
                  className={`lib-fm-sub-item${filterSub === o.v ? ' is-active' : ''}`}
                  onClick={() => handlePickSub('cat', o.v)}
                >
                  <span className="lib-fm-sub-icon">
                    {getCategoryIcon(o.l, 14)}
                  </span>
                  <span className="lib-fm-sub-label">{o.l}</span>
                  {filterSub === o.v && <IconCheck size={16} color="var(--accent)" />}
                </button>
              ))}
            </div>
          )}

          <MenuItem
            active={filterType === 'status'}
            icon={<IconTarget size={20} color="#6AAF67" />}
            label="掌握程度"
            trailing={filterType === 'status'
              ? <IconCheck size={18} color="var(--accent)" />
              : <IconChevronRight size={16} color="var(--sub)" />}
            onClick={() => handlePickMain('status')}
          />

          {/* 掌握程度二级 */}
          {expand === 'status' && (
            <div className="lib-fm-sub">
              {statusOptionsForExpand.map(o => {
                const pawStatus: PawStatus =
                  o.v === '2' ? 'mastered'
                  : o.v === '1' ? 'fuzzy'
                  : o.v === '0' ? 'unknown'
                  : 'new'
                return (
                  <button
                    key={o.v}
                    type="button"
                    className={`lib-fm-sub-item${filterSub === o.v ? ' is-active' : ''}`}
                    onClick={() => handlePickSub('status', o.v)}
                  >
                    <span className="lib-fm-sub-icon">
                      <PawStatusImage status={pawStatus} size={18} />
                    </span>
                    <span className="lib-fm-sub-label">{o.l}</span>
                    {filterSub === o.v && <IconCheck size={16} color="var(--accent)" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MenuItem({
  active,
  icon,
  label,
  trailing,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  trailing: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`lib-fm-item${active ? ' is-active' : ''}`}
      onClick={onClick}
    >
      <span className="lib-fm-item-icon">{icon}</span>
      <span className="lib-fm-item-label">{label}</span>
      <span className="lib-fm-item-trailing">{trailing}</span>
    </button>
  )
}
