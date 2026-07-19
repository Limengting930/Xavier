import { useState } from 'react'
import { IconStar, TapeStickerSet } from '../icons'
import BunnyImage from './BunnyImage'
import ProgressBar from './ProgressBar'
import PrimaryButton from './PrimaryButton'
import SpeechBubble from './SpeechBubble'

interface Props {
  done: number
  total: number
  onContinue: () => void
  onEditGoal: () => void
  ctaLabel?: string
  ctaDisabled?: boolean
  hintText?: string
}

/**
 * 首页主卡片：今日学习目标
 * - 视觉中心
 * - 白色 · 大圆角 32px · 轻阴影
 * - 左侧穿孔样纸 + 右侧兔子插画
 * - 右上 SET 纸胶带
 */
export default function TodayCard({
  done,
  total,
  onContinue,
  onEditGoal,
  ctaLabel = '继续学习',
  ctaDisabled = false,
  hintText,
}: Props) {
  // 显示层截断：done 可能大于 total（用户把 goal 调小之后，历史已学的题目会超出新目标）
  // 数据本身保留真实值不动（外部的 newFinished 判定 newDone >= goal 仍然生效），
  // 这里只做视觉呈现，避免出现「20/10、200%」这种反直觉的显示。
  const displayDone = total > 0 ? Math.min(done, total) : done
  const pct = total > 0 ? displayDone / total : 0
  const pctText = Math.round(pct * 100)

  // 兔子气泡：点击一次 tick+1 → SpeechBubble 显示 3s
  const [bunnyTick, setBunnyTick] = useState(0)

  return (
    <section className="today-card">
      {/* 装饰：SET 纸胶带贴纸 */}
      <TapeStickerSet
        style={{ position: 'absolute', top: -8, right: 18, transform: 'rotate(6deg)' }}
        onClick={onEditGoal}
      />

      {/* 装饰：左侧穿孔（活页本效果） */}
      <div className="today-card-holes" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <span key={i} className="today-card-hole" />
        ))}
      </div>

      <div className="today-card-body">
        {/* 顶部标题 */}
        <div className="today-card-title">
          <IconStar size={18} color="var(--accent)" />
          <span>今日学习目标</span>
        </div>

        {/* 数字（done 截断到 total，避免调小 goal 后出现 20/10 这种超标显示） */}
        <div className="today-card-nums">
          <span className="today-card-done">{displayDone}</span>
          <span className="today-card-sep"> / </span>
          <span className="today-card-total">{total}</span>
          <span className="today-card-unit"> 题</span>
        </div>

        {/* 已完成 % */}
        <div className="today-card-percent">
          <span className="today-card-percent-label">已完成</span>
          <span className="today-card-percent-value">{pctText}%</span>
        </div>

        {/* 进度条 */}
        <ProgressBar value={pct} height={10} />

        {/* Hint 或者按钮 */}
        {hintText && (
          <div className="today-card-hint">{hintText}</div>
        )}

        <div className="today-card-cta">
          <PrimaryButton onClick={onContinue} disabled={ctaDisabled}>
            {ctaLabel}
          </PrimaryButton>
        </div>
      </div>

      {/* 右侧兔子插画：点击冒气泡「搭档加油！」 */}
      <div
        className="today-card-bunny"
        onClick={() => setBunnyTick(t => t + 1)}
        role="button"
        aria-label="点击兔子"
      >
        <BunnyImage size={96} />
        <SpeechBubble
          text="搭档加油！"
          tick={bunnyTick}
          tail="bottom-right"
          style={{ top: -40, left: 'auto', right: 20 }}
        />
      </div>
    </section>
  )
}
