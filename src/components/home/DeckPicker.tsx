import { IconCheck, IconBookOpen, IconGrid4 } from '../icons'

export interface DeckOption {
  v: string
  l: string
}

interface Props {
  options: DeckOption[]
  current: string
  /** 返回某题库范围内的卡片总数，用于每项右侧展示 */
  countOf: (v: string) => number
  onPick: (v: string) => void
  onClose: () => void
}

/**
 * 今日学习题库选择弹窗：复用 goal-overlay / goal-dialog 底部弹出范式。
 * 选择后今日「新题目标」只从该题库范围内取题（'' = 全部题库）。
 */
export default function DeckPicker({ options, current, countOf, onPick, onClose }: Props) {
  return (
    <div className="goal-overlay" onClick={onClose}>
      <div className="goal-dialog" onClick={e => e.stopPropagation()}>
        <div className="goal-title">选择学习题库</div>
        <div className="goal-subtitle">今日新题目标将从所选题库中安排</div>

        <div className="deck-picker-list">
          {options.map(o => {
            const active = current === o.v
            return (
              <button
                key={o.v}
                type="button"
                className={`deck-picker-item${active ? ' is-active' : ''}`}
                onClick={() => onPick(o.v)}
              >
                <span className="deck-picker-icon">
                  {o.v === '' ? <IconGrid4 size={18} color="var(--accent)" /> : <IconBookOpen size={18} color="var(--accent)" />}
                </span>
                <span className="deck-picker-name" title={o.l}>{o.l}</span>
                <span className="deck-picker-count">{countOf(o.v)} 题</span>
                {active && <IconCheck size={18} color="var(--accent)" />}
              </button>
            )
          })}
        </div>

        <div className="goal-btns">
          <button className="goal-btn secondary" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}
