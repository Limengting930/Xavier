import type { ReactNode } from 'react'
import NavIcon from './NavIcon'

export type TabKey = 'home' | 'library' | 'stats' | 'me'

interface Props {
  active: TabKey
  onChange: (key: TabKey) => void
}

interface TabDef {
  key: TabKey
  label: string
  icon: (active: boolean) => ReactNode
}

const TABS: TabDef[] = [
  {
    key: 'home',
    label: '首页',
    icon: (a) => <NavIcon navKey="home" active={a} />,
  },
  {
    key: 'library',
    label: '题库',
    icon: (a) => <NavIcon navKey="library" active={a} />,
  },
  {
    key: 'stats',
    label: '统计',
    icon: (a) => <NavIcon navKey="stats" active={a} />,
  },
  {
    key: 'me',
    label: '我的',
    icon: (a) => <NavIcon navKey="me" active={a} />,
  },
]

/**
 * 悬浮胶囊底部导航
 * - 距底 16px  ·  左右 20px
 * - 圆角 32px  ·  白色  ·  轻阴影
 * - 当前项：胶囊 Lavender 背景高亮
 */
export default function BottomNavigation({ active, onChange }: Props) {
  return (
    <nav className="bottom-nav">
      {TABS.map(t => {
        const isActive = active === t.key
        return (
          <button
            key={t.key}
            className={`bn-item${isActive ? ' is-active' : ''}`}
            onClick={() => onChange(t.key)}
          >
            <span className="bn-item-icon">{t.icon(isActive)}</span>
            <span className="bn-item-label">{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
