import { useState } from 'react'
import { IconHome, IconLibrary, IconStats, IconUser } from '../icons'

export type NavKey = 'home' | 'library' | 'stats' | 'me'

/**
 * 一次性发现 src/assets/{home,lib,data,me}.png
 * 未提供时不会构建失败，自动回退到原 SVG
 */
const navModules = import.meta.glob('../../assets/{home,lib,data,me}.{png,gif,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

// key(NavKey) -> filename base
const nameMap: Record<NavKey, string> = {
  home: 'home',
  library: 'lib',
  stats: 'data',
  me: 'me',
}

const urlMap: Record<NavKey, string | undefined> = {
  home: undefined,
  library: undefined,
  stats: undefined,
  me: undefined,
}
for (const [k, v] of Object.entries(navModules)) {
  for (const key of Object.keys(nameMap) as NavKey[]) {
    if (k.endsWith(`/${nameMap[key]}.png`) || k.endsWith(`/${nameMap[key]}.gif`) || k.endsWith(`/${nameMap[key]}.webp`)) {
      urlMap[key] = v
    }
  }
}

const svgMap = {
  home: (a: boolean) => <IconHome size={38} filled={a} color={a ? 'var(--accent)' : 'var(--sub)'} />,
  library: (a: boolean) => <IconLibrary size={38} color={a ? 'var(--accent)' : 'var(--sub)'} />,
  stats: (a: boolean) => <IconStats size={38} color={a ? 'var(--accent)' : 'var(--sub)'} />,
  me: (a: boolean) => <IconUser size={38} color={a ? 'var(--accent)' : 'var(--sub)'} />,
} as const

interface Props {
  navKey: NavKey
  active: boolean
  size?: number
}

/**
 * 底部导航图标
 * - 优先渲染 PNG（保留和 SVG 一致的 22px 尺寸）
 * - 找不到 / 加载失败时回退到 SVG
 */
export default function NavIcon({ navKey, active, size = 38 }: Props) {
  const [failed, setFailed] = useState(false)
  const url = urlMap[navKey]

  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        style={{
          display: 'block',
          width: size,
          height: size,
          objectFit: 'contain',
          opacity: active ? 1 : 0.55,
          transition: 'opacity .18s',
        }}
        onError={() => setFailed(true)}
      />
    )
  }

  return <>{svgMap[navKey](active)}</>
}
