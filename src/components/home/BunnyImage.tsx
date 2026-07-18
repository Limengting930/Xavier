import { useState } from 'react'
import { BunnyIllustration } from '../icons'

/**
 * 尝试解析 src/assets/bunny.png 或 bunny.gif
 * - 使用 import.meta.glob 惰性发现，未提供图片时不会导致构建失败
 */
const bunnyModules = import.meta.glob('../../assets/bunny.{png,gif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

// 如果存在多个（比如同时有 png 和 gif），优先取第一个找到的
const bunnyAsset: string | undefined = Object.values(bunnyModules)[0]

interface Props {
  size?: number
}

/**
 * 兔子插画组件
 * - 优先加载 src/assets/bunny.png 或 bunny.gif
 * - 找不到 / 加载失败时回退到 SVG 版本
 */
export default function BunnyImage({ size = 172 }: Props) {
  const [failed, setFailed] = useState(false)

  if (failed || !bunnyAsset) {
    return <BunnyIllustration size={size} />
  }

  return (
    <img
      src={bunnyAsset}
      alt=""
      width={size}
      height={size}
      style={{ display: 'block', width: size, height: size, objectFit: 'contain' }}
      onError={() => setFailed(true)}
    />
  )
}
