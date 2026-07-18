import { useState, useRef, useEffect, useCallback } from 'react'

const OPTIONS = [10, 15, 20, 25, 30]
const ITEM_H = 48

interface Props {
  initialValue: number
  onConfirm: (val: number) => void
  onCancel?: () => void
  locked?: boolean // 已开始学习，不可修改
}

export default function GoalPicker({ initialValue, onConfirm, onCancel, locked = false }: Props) {
  const initIdx = Math.max(0, OPTIONS.indexOf(initialValue))
  const [selIdx, setSelIdx] = useState(initIdx)
  const listRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startScrollTop = useRef(0)

  // Scroll to selected on mount
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = initIdx * ITEM_H
    }
  }, [])

  // Snap scroll to nearest item
  const snapToNearest = useCallback(() => {
    const el = listRef.current
    if (!el) return
    const idx = Math.round(el.scrollTop / ITEM_H)
    const clamped = Math.max(0, Math.min(OPTIONS.length - 1, idx))
    el.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' })
    setSelIdx(clamped)
  }, [])

  const handleScroll = useCallback(() => {
    const el = listRef.current
    if (!el || isDragging.current) return
    const idx = Math.round(el.scrollTop / ITEM_H)
    setSelIdx(Math.max(0, Math.min(OPTIONS.length - 1, idx)))
  }, [])

  // Touch drag
  const onTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true
    startY.current = e.touches[0].clientY
    startScrollTop.current = listRef.current?.scrollTop || 0
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!listRef.current) return
    const dy = startY.current - e.touches[0].clientY
    listRef.current.scrollTop = startScrollTop.current + dy
    const idx = Math.round(listRef.current.scrollTop / ITEM_H)
    setSelIdx(Math.max(0, Math.min(OPTIONS.length - 1, idx)))
  }
  const onTouchEnd = () => {
    isDragging.current = false
    snapToNearest()
  }

  return (
    <div className="goal-overlay" onClick={onCancel}>
      <div className="goal-dialog" onClick={e => e.stopPropagation()}>
        <div className="goal-title">设置今日学习目标</div>
        <div className="goal-subtitle">每天坚持，形成长期记忆</div>

        {locked ? (
          <div className="goal-locked-tip">您已经开始学习了，先完成当前目标吧</div>
        ) : null}

        <div className="goal-picker-wrap">
          {/* Highlight bar */}
          <div className="goal-picker-bar" />

          {/* Scrollable list */}
          <div
            className={`goal-picker-list${locked ? ' locked' : ''}`}
            ref={listRef}
            onScroll={handleScroll}
            onTouchStart={locked ? undefined : onTouchStart}
            onTouchMove={locked ? undefined : onTouchMove}
            onTouchEnd={locked ? undefined : onTouchEnd}
          >
            {/* top padding so first item can center */}
            <div style={{ height: ITEM_H * 2 }} />
            {OPTIONS.map((n, i) => (
              <div
                key={n}
                className={`goal-picker-item${i === selIdx ? ' selected' : ''}`}
                onClick={() => {
                  if (locked) return
                  setSelIdx(i)
                  listRef.current?.scrollTo({ top: i * ITEM_H, behavior: 'smooth' })
                }}
              >
                <span className="goal-num">{n}</span>
                <span className="goal-unit">题</span>
              </div>
            ))}
            {/* bottom padding */}
            <div style={{ height: ITEM_H * 2 }} />
          </div>
        </div>

        <div className="goal-btns">
          {onCancel && (
            <button className="goal-btn secondary" onClick={onCancel}>
              {locked ? '关闭' : '取消'}
            </button>
          )}
          {!locked && (
            <button className="goal-btn primary" onClick={() => onConfirm(OPTIONS[selIdx])}>
              确定
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
