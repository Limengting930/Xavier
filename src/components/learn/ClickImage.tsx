import { useState } from 'react'

/**
 * 尝试解析 src/assets/click.{png,gif,webp}
 * - 使用 import.meta.glob 惰性发现，未提供图片时不会构建失败
 */
const clickModules = import.meta.glob('../../assets/click.{png,gif,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const clickAsset: string | undefined = Object.values(clickModules)[0]

interface Props {
  size?: number
}

/**
 * 学习卡片正面「点击查看答案」前的提示图标
 * - 优先加载 src/assets/click.png
 * - 找不到时不渲染
 */
export default function ClickImage({ size = 30 }: Props) {
  const [failed, setFailed] = useState(false)

  if (failed || !clickAsset) return null

  return (
    <img
      src={clickAsset}
      alt=""
      width={size}
      height={size}
      style={{ display: 'block', width: size, height: size, objectFit: 'contain' }}
      onError={() => setFailed(true)}
    />
  )
}
