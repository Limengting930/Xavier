import { useState } from 'react'
import { DefaultAvatar } from '../icons'

const avatarModules = import.meta.glob('../../assets/avatar.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>
const avatarPng: string | undefined = Object.values(avatarModules)[0]

interface Props {
  size?: number
  /** 已登录用户头像 URL；优先级最高 */
  userAvatar?: string
}

/**
 * 头像
 * - 优先：用户上传头像
 * - 其次：src/assets/avatar.png（设计稿默认女孩头像）
 * - 最后：SVG DefaultAvatar
 */
export default function AvatarImage({ size = 54, userAvatar }: Props) {
  const [userFailed, setUserFailed] = useState(false)
  const [pngFailed, setPngFailed] = useState(false)

  if (userAvatar && !userFailed) {
    return (
      <img
        src={userAvatar}
        alt=""
        width={size}
        height={size}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={() => setUserFailed(true)}
      />
    )
  }

  if (avatarPng && !pngFailed) {
    return (
      <img
        src={avatarPng}
        alt=""
        width={size}
        height={size}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={() => setPngFailed(true)}
      />
    )
  }

  return <DefaultAvatar size={size} />
}
