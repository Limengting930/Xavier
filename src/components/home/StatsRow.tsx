import StatsCard from './StatsCard'

interface StatItem {
  variant: 'mastered' | 'duration' | 'review'
  label: string
  value: number
  unit?: string
  desc: string
  onClick?: () => void
}

interface Props {
  items: StatItem[]
}

export default function StatsRow({ items }: Props) {
  return (
    <div className="stats-row">
      {items.map((it, i) => (
        <StatsCard key={i} {...it} />
      ))}
    </div>
  )
}

