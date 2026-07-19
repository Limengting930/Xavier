import { useState, useRef, useEffect, useCallback } from 'react'

const OPTIONS = [10, 15, 20, 25, 30]
const ITEM_H = 48

interface Props {
  initialValue: number
  onConfirm: (val: number) => void
  onCancel?: () => void
  locked?: boolean // 已开始学习，不可修改
  // 禁止把目标设得比"今天已学的新题数"还小：
  // 例如已学 20 道，goal 就不能再改到 10（会造成 20/10 这种超标显示）
  // 只是把 <minValue 的选项标灰 + 禁选；locked=true 时优先，所有选项都不可选
  minValue?: number
}

export default function GoalPicker({ initialValue, onConfirm, onCancel, locked = false, minValue = 0 }: Props) {
  // 初始位置：优先用传入的 initialValue，但如果它小于 minValue（比如老 goal 已经不合法了），
  // 落到第一个 >= minValue 的选项上；没有合法选项时兜底到最后一个
  const legalOptions = OPTIONS.filter(v => v >= minValue)
  const fallbackIdx = legalOptions.length > 0
    ? OPTIONS.indexOf(legalOptions[0])
    : OPTIONS.length - 1
  const rawIdx = OPTIONS.indexOf(initialValue)
  const initIdx = rawIdx >= 0 && OPTIONS[rawIdx] >= minValue ? rawIdx : fallbackIdx
  const [selIdx, setSelIdx] = useState(initIdx)
  const listRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startScrollTop = useRef(0)

  // 判断某个 index 是否禁选：locked 时全禁；否则 <minValue 的禁
  const isDisabledIdx = useCallback(
    (i: number) => locked || OPTIONS[i] < minValue,
    [locked, minValue],
  )

  // Scroll to selected on mount
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = initIdx * ITEM_H
    }
  }, [])

  // Snap scroll to nearest LEGAL item
  const snapToNearest = useCallback(() => {
    const el = listRef.current
    if (!el) return
    let idx = Math.round(el.scrollTop / ITEM_H)
    idx = Math.max(0, Math.min(OPTIONS.length - 1, idx))
    // 如果落在禁选项上，就近吸附到下一个合法选项（往大的方向走，因为禁选的都是小的）
    while (idx < OPTIONS.length && OPTIONS[idx] < minValue) idx++
    if (idx >= OPTIONS.length) idx = OPTIONS.length - 1
    el.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' })
    setSelIdx(idx)
  }, [minValue])

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
        ) : minValue > 0 ? (
          <div className="goal-locked-tip">今日已学 {minValue} 题，目标不能小于此数</div>
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
            {OPTIONS.map((n, i) => {
              const disabled = isDisabledIdx(i)
              return (
                <div
                  key={n}
                  className={`goal-picker-item${i === selIdx ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
                  onClick={() => {
                    if (disabled) return
                    setSelIdx(i)
                    listRef.current?.scrollTo({ top: i * ITEM_H, behavior: 'smooth' })
                  }}
                >
                  <span className="goal-num">{n}</span>
                  <span className="goal-unit">题</span>
                </div>
              )
            })}
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
            <button
              className="goal-btn primary"
              disabled={isDisabledIdx(selIdx)}
              onClick={() => {
                if (isDisabledIdx(selIdx)) return
                onConfirm(OPTIONS[selIdx])
              }}
            >
              确定
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
