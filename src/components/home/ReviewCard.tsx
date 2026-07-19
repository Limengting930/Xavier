import { useEffect, useState } from 'react'
import { IconBookmark } from '../icons'
import ProgressBar from './ProgressBar'
import PrimaryButton from './PrimaryButton'
import ReviewImage from './ReviewImage'
import SpeechBubble from './SpeechBubble'

interface Props {
  done: number
  total: number
  onStart: () => void
  /** 父组件递增此值以强制弹出「先来复习哦~」提示（点击 TodayCard 但被阻塞时） */
  forceBubbleTick?: number
}

/**
 * 待复习卡片：跟 TodayCard 同宽同风格的白底大卡片
 * - 无待复习（total === 0）时显示禁用态 + "暂无待复习"文案
 * - 有待复习时可点击「开始复习」进入 review-due 队列
 * - 点击右侧插画冒气泡「搭档你真棒！」
 * - 父组件通过 forceBubbleTick 触发「搭档，先来复习哦~」
 */
export default function ReviewCard({ done, total, onStart, forceBubbleTick = 0 }: Props) {
  const hasReview = total > 0
  const pct = hasReview ? done / total : 0
  const pctText = Math.round(pct * 100)
  const finished = hasReview && done >= total

  let ctaLabel = '开始复习'
  if (!hasReview) ctaLabel = '暂无待复习'
  else if (finished) ctaLabel = '今日已复习'

  const ctaDisabled = !hasReview || finished

  // 图标点击气泡
  const [praiseTick, setPraiseTick] = useState(0)
  // 父组件推送的"先来复习哦"气泡
  const [remindTick, setRemindTick] = useState(0)
  useEffect(() => {
    if (forceBubbleTick > 0) setRemindTick(t => t + 1)
  }, [forceBubbleTick])

  return (
    <section className="review-card">
      {/* 装饰：左侧穿孔（活页本效果），复用 today-card-holes 样式 */}
      <div className="today-card-holes" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <span key={i} className="today-card-hole" />
        ))}
      </div>

      <div className="review-card-body">
        {/* 标题 */}
        <div className="review-card-title">
          <IconBookmark size={18} color="var(--pink)" />
          <span>待复习</span>
        </div>

        {/* 数字 */}
        <div className="review-card-nums">
          <span className="review-card-done">{done}</span>
          <span className="review-card-sep"> / </span>
          <span className="review-card-total">{total}</span>
          <span className="review-card-unit"> 题</span>
        </div>

        {/* 已完成 % */}
        <div className="review-card-percent">
          <span className="review-card-percent-label">已完成</span>
          <span className="review-card-percent-value">{pctText}%</span>
        </div>

        {/* 进度条 */}
        <ProgressBar value={pct} height={10} color="var(--pink)" trackColor="var(--pink-l)" />

        {/* CTA */}
        <div className="review-card-cta">
          <PrimaryButton onClick={onStart} disabled={ctaDisabled}>
            {ctaLabel}
          </PrimaryButton>
        </div>
      </div>

      {/* 右侧装饰插画：点击冒气泡「搭档你真棒！」；父组件触发「先来复习哦~」 */}
      <div
        className="review-card-illust"
        onClick={() => setPraiseTick(t => t + 1)}
        role="button"
        aria-label="点击插画"
      >
        <ReviewImage size={96} />
        <SpeechBubble
          text="搭档你真棒！"
          tick={praiseTick}
          tail="bottom-right"
          style={{ top: -40, left: 'auto', right: 20 }}
        />
        <SpeechBubble
          text="搭档，先来复习哦~"
          tick={remindTick}
          tail="bottom-right"
          style={{ top: -40, left: 'auto', right: 20 }}
        />
      </div>
    </section>
  )
}
