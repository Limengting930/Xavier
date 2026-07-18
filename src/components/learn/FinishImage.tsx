import { useState } from 'react'

/**
 * 尝试解析 src/assets/finish.{png,gif,webp}
 * - 使用 import.meta.glob 惰性发现，未提供图片时不会构建失败
 */
const finishModules = import.meta.glob('../../assets/finish.{png,gif,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const finishAsset: string | undefined = Object.values(finishModules)[0]

interface Props {
  size?: number
}

/**
 * 学习/复习完成态插画
 * - 优先加载 src/assets/finish.png
 * - 找不到时不渲染
 */
export default function FinishImage({ size = 120 }: Props) {
  const [failed, setFailed] = useState(false)

  if (failed || !finishAsset) return null

  return (
    <img
      src={finishAsset}
      alt=""
      width={size}
      height={size}
      style={{ display: 'block', width: size, height: size, objectFit: 'contain' }}
      onError={() => setFailed(true)}
    />
  )
}
