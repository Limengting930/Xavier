import type { ReactNode, MouseEvent } from 'react'
import { IconArrowRight } from '../icons'

interface Props {
  children: ReactNode
  onClick?: (e: MouseEvent) => void
  disabled?: boolean
  showArrow?: boolean
  className?: string
}

/**
 * Lavender 胶囊主按钮
 * - 高度 52px
 * - 圆角 999px
 * - 轻阴影
 * - Spring press 动效
 */
export default function PrimaryButton({
  children,
  onClick,
  disabled,
  showArrow = true,
  className = '',
}: Props) {
  return (
    <button
      className={`ui-primary-btn${disabled ? ' is-disabled' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="ui-primary-btn-text">{children}</span>
      {showArrow && !disabled && (
        <span className="ui-primary-btn-arrow" aria-hidden>
          <IconArrowRight size={16} color="currentColor" />
        </span>
      )}
    </button>
  )
}
