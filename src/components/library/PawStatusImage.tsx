import { useState } from 'react'
import {
  StatusMastered,
  StatusUnknown,
  StatusFuzzy,
  StatusNew,
} from '../icons'

export type PawStatus = 'mastered' | 'unknown' | 'fuzzy' | 'new'

/**
 * 一次性发现 src/assets/status-*.png
 * - 未提供图片时不会构建失败，自动 fallback 到 SVG
 */
const pawModules = import.meta.glob(
  '../../assets/status-{mastered,unknown,fuzzy,new}.{png,gif,webp}',
  { eager: true, query: '?url', import: 'default' }
) as Record<string, string>

// 建立 status → 图片 url 的映射
const pawMap: Record<PawStatus, string | undefined> = {
  mastered: undefined,
  unknown: undefined,
  fuzzy: undefined,
  new: undefined,
}
for (const [k, v] of Object.entries(pawModules)) {
  if (k.includes('status-mastered')) pawMap.mastered = v
  else if (k.includes('status-unknown')) pawMap.unknown = v
  else if (k.includes('status-fuzzy')) pawMap.fuzzy = v
  else if (k.includes('status-new')) pawMap.new = v
}

// SVG fallback 映射
const svgMap = {
  mastered: StatusMastered,
  unknown: StatusUnknown,
  fuzzy: StatusFuzzy,
  new: StatusNew,
} as const

interface Props {
  status: PawStatus
  size?: number
}

/**
 * 状态图标（猫爪）
 * - 优先渲染 src/assets/status-{status}.png
 * - 找不到 / 加载失败时自动回退到 SVG 版本
 */
export default function PawStatusImage({ status, size = 30 }: Props) {
  const [failed, setFailed] = useState(false)
  const src = pawMap[status]

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        style={{
          display: 'block',
          width: size,
          height: size,
          objectFit: 'contain',
        }}
        onError={() => setFailed(true)}
      />
    )
  }

  const Svg = svgMap[status]
  if (!Svg) return null
  return <Svg size={size} />
}
