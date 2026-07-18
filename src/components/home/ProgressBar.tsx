interface Props {
  /** 0 ~ 1 */
  value: number
  height?: number
  color?: string
  trackColor?: string
  className?: string
}

/**
 * 胶囊型进度条
 * - 高度默认 10px
 * - 支持圆角 & overflow hidden
 * - 动画：width transition 400ms ease-out
 */
export default function ProgressBar({
  value,
  height = 10,
  color = 'var(--accent)',
  trackColor = 'var(--accent-l)',
  className = '',
}: Props) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div
      className={`ui-progress ${className}`}
      style={{ height, background: trackColor }}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="ui-progress-fill"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}
