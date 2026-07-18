import PlantImage from './PlantImage'

interface Props {
  streakDays: number
}

/**
 * 学习成长卡  ·  绿色系  ·  Forest 风
 * 左：文案 + 大数字
 * 右：小植物插画
 */
export default function GrowthCard({ streakDays }: Props) {
  return (
    <div className="growth-card">
      <div className="growth-card-body">
        <div className="growth-card-title">
          学习成长
        </div>
        <div className="growth-card-sub">已经连续学习</div>
        <div className="growth-card-num">
          <span className="growth-card-num-value">{streakDays}</span>
          <span className="growth-card-num-unit"> 天</span>
        </div>
        <div className="growth-card-tip">继续加油，未来可期！</div>
      </div>
      <div className="growth-card-plant" aria-hidden>
        <PlantImage size={80} />
      </div>
    </div>
  )
}
