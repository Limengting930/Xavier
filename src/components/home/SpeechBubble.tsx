import { useEffect, useState } from 'react'

interface Props {
  /** 气泡文字 */
  text: string
  /** 递增此值触发一次显示（0 不显示） */
  tick: number
  /** 显示时长 ms */
  duration?: number
  /** 自定义位置 style（相对最近 positioned 祖先） */
  style?: React.CSSProperties
  /** 气泡尾巴方向：默认左下（尾巴在气泡左下角，指向左下方的图片） */
  tail?: 'bottom-left' | 'bottom-right'
}

/**
 * 手绘水彩风格对话气泡
 * - 通过 tick 变化触发显示，自动 duration 后隐藏（默认 3s）
 * - 纯 CSS 复刻风格：浅紫填充 + 深紫细边 + 微微手绘感圆角 + 尾巴
 */
export default function SpeechBubble({ text, tick, duration = 3000, style, tail = 'bottom-left' }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (tick <= 0) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), duration)
    return () => clearTimeout(t)
  }, [tick, duration])

  return (
    <div
      className={`speech-bubble${visible ? ' is-show' : ''} tail-${tail}`}
      style={style}
      aria-hidden={!visible}
    >
      <span className="speech-bubble-text">{text}</span>
    </div>
  )
}
