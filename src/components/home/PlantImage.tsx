import { useState } from 'react'
import { PlantIllustration } from '../icons'

const plantModules = import.meta.glob('../../assets/plant.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>
const plantPng: string | undefined = Object.values(plantModules)[0]

interface Props {
  size?: number
}

/**
 * 盆栽插画
 * - 优先 src/assets/plant.png
 * - 找不到时回退到 SVG
 */
export default function PlantImage({ size = 92 }: Props) {
  const [failed, setFailed] = useState(false)
  if (failed || !plantPng) {
    return <PlantIllustration size={size} />
  }
  return (
    <img
      src={plantPng}
      alt=""
      width={size}
      height={size}
      style={{ display: 'block', width: size, height: size, objectFit: 'contain' }}
      onError={() => setFailed(true)}
    />
  )
}
