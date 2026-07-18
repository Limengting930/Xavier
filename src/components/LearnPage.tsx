import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../store'
import type { Question } from '../types'
import { QUEUE_LABELS, PREVIEW_TYPES } from '../types'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import PawStatusImage, { type PawStatus } from './library/PawStatusImage'
import ClickImage from './learn/ClickImage'
import FinishImage from './learn/FinishImage'

interface Props {
  onExit: () => void
  queue: Question[]
  queueType: string
  goal: number  // 新题目标（仅 'all' 模式用于判断今日新题是否学完）
  startIdx?: number  // 起始位置：从题库预览进入时定位到用户点击的那道题
}

export default function LearnPage({ onExit, queue, queueType, goal, startIdx }: Props) {
  const { getCardState, rateCard: globalRate, addDuration, getTodayProgress } = useApp()
  const [idx, setIdx] = useState(startIdx || 0)
  const [flipped, setFlipped] = useState(false)
  const [startTs] = useState(Date.now())
  const cardViewTs = useRef(Date.now())
  const viewportRef = useRef<HTMLDivElement>(null)

  const isPreview = PREVIEW_TYPES.has(queueType)
  const total = queue.length

  // 'all' 模式下今日新题是否已完成需要实时读取全局今日新题完成数（newDone），
  // 而不是看本地队列是否遍历完（队列只是一个足够大的候选池，可能会被反复重建续接）
  const isAllMode = queueType === 'all'
  const newDoneLive = isAllMode ? getTodayProgress().newDone : 0
  const goalReached = isAllMode && goal > 0 && newDoneLive >= goal
  const isDone = goalReached || idx >= total

  const card = isDone ? null : queue[idx]

  // keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleFlip() }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { if (!flipped) goNext() }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { if (!flipped && idx > 0) goPrev() }
      if (e.key === '1') handleRate(0)
      if (e.key === '2') handleRate(1)
      if (e.key === '3') handleRate(2)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  // touch gesture
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    let sx = 0, sy = 0, dir: string | null = null, moved = false, inHScroll = false

    const isHScrollable = (node: Element | null) => {
      let el = node
      while (el && el !== vp) {
        const ov = window.getComputedStyle(el).overflowX
        if ((ov === 'auto' || ov === 'scroll') && el.scrollWidth > el.clientWidth) return true
        el = el.parentElement
      }
      return false
    }

    const onTouchStart = (e: TouchEvent) => {
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; dir = null; moved = false
      inHScroll = isHScrollable(e.target as Element)
    }
    const onTouchMove = (e: TouchEvent) => {
      if (inHScroll) return
      const dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy
      if (!dir && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) dir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      if (dir === 'h') { e.preventDefault(); moved = true }
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (inHScroll) return
      if (dir === 'h' && moved) {
        const dx = e.changedTouches[0].clientX - sx
        if (Math.abs(dx) > 50) {
          if (dx < 0 && !flipped) goNext()
          else if (dx > 0 && !flipped && idx > 0) goPrev()
        }
      } else if (!moved && !flipped) handleFlip()
    }

    vp.addEventListener('touchstart', onTouchStart, { passive: true })
    vp.addEventListener('touchmove', onTouchMove, { passive: false })
    vp.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      vp.removeEventListener('touchstart', onTouchStart)
      vp.removeEventListener('touchmove', onTouchMove)
      vp.removeEventListener('touchend', onTouchEnd)
    }
  })

  const handleFlip = useCallback(() => {
    if (isDone) return
    setFlipped(f => !f)
  }, [isDone])

  const goNext = useCallback(() => {
    setFlipped(false)
    cardViewTs.current = Date.now()
    setIdx(i => i + 1)
  }, [])

  const goPrev = useCallback(() => {
    setFlipped(false)
    cardViewTs.current = Date.now()
    setIdx(i => Math.max(0, i - 1))
  }, [])

  const handleRate = useCallback((quality: number) => {
    if (isDone || !card) return
    // Double-check: if already at goal, block rating
    if (isAllMode && goal > 0 && newDoneLive >= goal) return
    const spent = cardViewTs.current > 0 ? Date.now() - cardViewTs.current : 0
    addDuration(spent)
    globalRate(card.id, quality, goal)
    cardViewTs.current = Date.now()
    setFlipped(false)
    setIdx(i => i + 1)
  }, [isDone, isAllMode, goal, newDoneLive, card, addDuration, globalRate])

  const handleExit = useCallback(() => {
    // record remaining card time if flipped
    if (flipped && card) {
      const spent = cardViewTs.current > 0 ? Date.now() - cardViewTs.current : 0
      addDuration(spent)
    }
    onExit()
  }, [flipped, card, addDuration, onExit])

  // Render answer content
  const renderAnswer = (card: Question) => {
    let html = ''
    if (card.summary) {
      html += `<div class="cb-summary-box">💡 ${card.summary}</div>`
    }
    html += `<div class="cb-section">
      <div class="cb-section-title">📖 详细解析 <span class="cb-section-arrow" style="transform:rotate(0deg)">▾</span></div>
      <div class="cb-section-body" style="max-height:2000px">
        <div class="answer">${marked.parse(card.a || '')}</div>
      </div>
    </div>`
    if (card.pitfalls) {
      html += `<div class="cb-section">
        <div class="cb-section-title">⚠️ 易错点 <span class="cb-section-arrow">▾</span></div>
        <div class="cb-section-body" style="max-height:500px">
          <div class="answer">${marked.parse(card.pitfalls)}</div>
        </div>
      </div>`
    }
    if (card.interview?.length) {
      html += `<div class="cb-section">
        <div class="cb-section-title">🎤 高频面试问法 <span class="cb-section-arrow">▾</span></div>
        <div class="cb-section-body" style="max-height:500px">
          <ul class="answer" style="padding-left:16px">${card.interview.map(q => `<li>${q}</li>`).join('')}</ul>
        </div>
      </div>`
    }
    return html
  }

  // highlight code blocks after render
  useEffect(() => {
    if (flipped) {
      setTimeout(() => {
        document.querySelectorAll('.card-back pre code').forEach(el => {
          if (!(el as any).dataset.highlighted) hljs.highlightElement(el as any)
        })
      }, 50)
    }
  }, [flipped, idx])

  // Progress display
  const displayDone = isAllMode ? newDoneLive : idx
  const displayTotal = isAllMode ? goal : total
  const prog = displayTotal > 0 ? Math.min(100, displayDone / displayTotal * 100) : 0
  const s = card ? getCardState(card.id) : null
  const nextStr = s && s.nextReview > Date.now() ? `下次复习: ${Math.ceil((s.nextReview - Date.now()) / 86400000)}天后` : ''

  // Empty state
  if (total === 0) {
    return (
      <div className="page active" id="learn-page">
        <div className="learn-header">
          <button className="learn-back" onClick={handleExit}>‹</button>
          <div style={{ fontSize: 13, color: 'var(--sub)' }}>{QUEUE_LABELS[queueType] || ''}</div>
        </div>
        <div className="card-viewport">
          <div className="state-box show">
            <div className="state-emoji">📭</div>
            <div className="state-title">暂无题目</div>
            <div className="state-sub">换个队列试试？</div>
            <div className="state-row">
              <button className="state-btn primary" onClick={handleExit}>返回首页</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Done state
  if (isDone) {
    const elapsed = Math.round((Date.now() - startTs) / 60000)
    return (
      <div className="page active" id="learn-page">
        <div className="learn-header">
          <button className="learn-back" onClick={handleExit}>‹</button>
          <div style={{ fontSize: 13, color: 'var(--sub)' }}>{QUEUE_LABELS[queueType] || ''}</div>
        </div>
        <div className="card-viewport">
          <div className="state-box show">
            <div className="state-finish-img"><FinishImage size={140} /></div>
            <div className="state-title">{isPreview ? '预览结束' : '完成！'}</div>
            {!isPreview && (
              <div className="state-sub">完成 {isAllMode ? displayDone : total} 题，用时约 {elapsed} 分钟</div>
            )}
            <div className="state-row">
              <button className="state-btn primary" onClick={handleExit}>返回首页</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page active" id="learn-page">
      <div className="learn-header">
        <button className="learn-back" onClick={handleExit}>‹</button>
          <div style={{ fontSize: 13, color: 'var(--sub)' }}>{QUEUE_LABELS[queueType] || ''}</div>
      </div>
      {!isPreview && (
        <div className="learn-prog-wrap">
          <div className="learn-prog-info">
            <span>{displayDone} / {displayTotal}</span>
            <span style={{ fontSize: 11, color: 'var(--sub)' }}>{nextStr}</span>
          </div>
          <div className="learn-prog-bar"><div className="learn-prog-fill" style={{ width: `${prog}%` }}></div></div>
        </div>
      )}

      <div className="card-viewport" ref={viewportRef}>
        {/* Card Front */}
        <div className={`card-front${flipped ? ' hidden' : ''}`} onClick={() => { if (!flipped) handleFlip() }}>
          <div className="cf-head">
            <span className="cat-tag">{card!.cat}</span>
            {s && s.status !== null && s.status !== undefined && (
              <span className={`cf-status s${s.status}`}>
                <PawStatusImage
                  status={(['unknown', 'fuzzy', 'mastered'] as PawStatus[])[s.status]}
                  size={30}
                />
                <span>{['未掌握', '模糊', '已掌握'][s.status]}</span>
              </span>
            )}
          </div>
          <div className="cf-question">{card!.q}</div>
          <div className="cf-hint">
            <ClickImage size={50} />
            点击查看答案 · 左右滑切换
          </div>
        </div>

        {/* Card Back */}
        <div className={`card-back${flipped ? ' visible' : ''}`} style={{ bottom: isPreview ? 8 : 100 }}>
          <div className="cb-head">
            <div className="cb-head-left">参考答案</div>
            <button className="cb-close" onClick={handleFlip}>×</button>
          </div>
          <div dangerouslySetInnerHTML={{ __html: renderAnswer(card!) }} />
        </div>
      </div>

      {/* Rate bar - only in study mode */}
      {!isPreview && flipped && (
        <div className="rate-bar">
          <button className="rate-btn rate-forget" onClick={() => handleRate(0)}>
            <PawStatusImage status="unknown" size={50} />
            <small>未掌握</small>
          </button>
          <button className="rate-btn rate-fuzzy" onClick={() => handleRate(1)}>
            <PawStatusImage status="fuzzy" size={50} />
            <small>模糊</small>
          </button>
          <button className="rate-btn rate-know" onClick={() => handleRate(2)}>
            <PawStatusImage status="mastered" size={50} />
            <small>掌握</small>
          </button>
        </div>
      )}
    </div>
  )
}
