import { useState } from 'react'

/**
 * 尝试解析 src/assets/cat-search.{png,gif}
 * 未提供时静默不渲染，不会构建失败
 */
const catModules = import.meta.glob('../../assets/cat-search.{png,gif,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const catAsset: string | undefined = Object.values(catModules)[0]

interface Props {
  size?: number
}

/**
 * "趴在搜索框上"的小猫装饰图
 * - 只做加载 + fallback，不做定位
 * - 定位由父容器 CSS 负责（.lib-search-cat）
 */
export default function CatSearchImage({ size = 72 }: Props) {
  const [failed, setFailed] = useState(false)
  if (failed || !catAsset) return null
  return (
    <img
      src={catAsset}
      alt=""
      width={size}
      height={size}
      style={{ display: 'block', width: size, height: size, objectFit: 'contain' }}
      onError={() => setFailed(true)}
    />
  )
}
