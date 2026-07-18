import { HeartDoodle } from '../icons'

interface Props {
  title?: string
  lines: string[]
}

/**
 * 便签纸卡片  ·  奶油黄底  ·  打孔 + 网格纸质感
 */
export default function QuoteCard({ title = '今日一句', lines }: Props) {
  return (
    <div className="quote-card">
      {/* 左侧打孔 */}
      <div className="quote-card-holes" aria-hidden>
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <span key={i} className="quote-card-hole" />
        ))}
      </div>

      <div className="quote-card-body">
        <div className="quote-card-title">{title}</div>
        <div className="quote-card-lines">
          {lines.map((line, i) => (
            <p key={i} className="quote-card-line">{line}</p>
          ))}
        </div>
      </div>

      {/* 右下小爱心 */}
      <HeartDoodle
        size={22}
        color="#F0A5B0"
        stroke
        style={{ position: 'absolute', right: 14, bottom: 12 }}
      />
    </div>
  )
}
