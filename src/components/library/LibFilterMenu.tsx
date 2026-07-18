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

export type FilterType = 'all' | 'cat' | 'status'
export interface SubOption { v: string; l: string }

interface Props {
  filterType: FilterType
  filterSub: string
  /** 知识点全集，用于二级展开 */
  catOptions: SubOption[]
  /** 掌握程度全集，用于二级展开 */
  statusOptions: SubOption[]
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
export default function LibFilterMenu({ filterType, filterSub, catOptions, statusOptions, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [expand, setExpand] = useState<FilterType | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const label =
    filterType === 'all'
      ? '全部'
      : filterType === 'cat'
        ? (catOptions.find(o => o.v === filterSub)?.l || '知识点')
        : (statusOptions.find(o => o.v === filterSub)?.l || '掌握程度')

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
            active={filterType === 'all'}
            icon={<IconGrid4 size={20} color="var(--accent)" />}
            label="全部"
            trailing={filterType === 'all'
              ? <IconCheck size={18} color="var(--accent)" />
              : <IconChevronRight size={16} color="var(--sub)" />}
            onClick={() => handlePickMain('all')}
          />

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
