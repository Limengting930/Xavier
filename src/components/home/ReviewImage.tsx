import { useState } from 'react'

/**
 * 尝试解析 src/assets/review.png 或 review.gif
 * - 使用 import.meta.glob 惰性发现，未提供图片时不会构建失败
 */
const reviewModules = import.meta.glob('../../assets/review.{png,gif,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const reviewAsset: string | undefined = Object.values(reviewModules)[0]

interface Props {
  size?: number
}

/**
 * 待复习卡片的插画（右侧装饰图）
 * - 优先加载 src/assets/review.png / review.gif
 * - 找不到时直接不渲染
 */
export default function ReviewImage({ size = 96 }: Props) {
  const [failed, setFailed] = useState(false)

  if (failed || !reviewAsset) return null

  return (
    <img
      src={reviewAsset}
      alt=""
      width={size}
      height={size}
      style={{ display: 'block', width: size, height: size, objectFit: 'contain' }}
      onError={() => setFailed(true)}
    />
  )
}
