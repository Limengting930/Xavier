import type { ReactNode } from 'react'
import { IconBook, IconClock, IconBookmark, StarSticker, ClipSticker, NoteTape } from '../icons'

interface StatItem {
  variant: 'mastered' | 'duration' | 'review'
  label: string
  value: number
  unit?: string
  desc: string
  onClick?: () => void
}

export default function StatsCard({ variant, label, value, unit, desc, onClick }: StatItem) {
  let icon: ReactNode
  let tileClass = ''
  let sticker: ReactNode = null

  if (variant === 'mastered') {
    icon = <IconBook size={22} color="#8B6EF0" />
    tileClass = 'stat-tile-purple'
    sticker = (
      <StarSticker
        style={{
          position: 'absolute',
          top: -12,
          right: -6,
          transform: 'rotate(18deg)',
          zIndex: 3,
        }}
      />
    )
  } else if (variant === 'duration') {
    icon = <IconClock size={22} color="#6A9B62" />
    tileClass = 'stat-tile-green'
    sticker = (
      <ClipSticker
        style={{
          position: 'absolute',
          top: -14,
          right: 8,
          transform: 'rotate(-14deg)',
          zIndex: 3,
        }}
      />
    )
  } else {
    icon = <IconBookmark size={22} color="#D97F5B" />
    tileClass = 'stat-tile-orange'
    sticker = (
      <NoteTape
        style={{
          position: 'absolute',
          top: -6,
          right: -8,
          transform: 'rotate(8deg) scale(0.75)',
          zIndex: 3,
        }}
      />
    )
  }

  return (
    <div className="stat-card" onClick={onClick} role={onClick ? 'button' : undefined}>
      {sticker}
      <div className="stat-card-main">
        <div className={`stat-tile ${tileClass}`}>{icon}</div>
        <div className="stat-content">
          <div className="stat-label">{label}</div>
          <div className="stat-value-row">
            <span className="stat-value">{value}</span>
            {unit && <span className="stat-unit">{unit}</span>}
          </div>
        </div>
      </div>
      <div className="stat-desc">{desc}</div>
    </div>
  )
}
