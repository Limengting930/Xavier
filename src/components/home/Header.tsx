import { Sparkle, HeartDoodle } from '../icons'
import AvatarImage from './AvatarImage'
import type { UserInfo } from '../../types'

interface Props {
  user: UserInfo | null
}

function getGreeting(): { title: string; sub: string } {
  const h = new Date().getHours()
  if (h < 6) return { title: '夜深了', sub: '早点休息吧，明天继续加油' }
  if (h < 11) return { title: '早上好', sub: '新的一天，从背题开始吧' }
  if (h < 14) return { title: '中午好', sub: '午后小憩前，先记两道' }
  if (h < 18) return { title: '下午好', sub: '今天也是认真学习的一天呀' }
  if (h < 22) return { title: '晚上好', sub: '睡前学习，记忆更牢固' }
  return { title: '晚安', sub: '今天辛苦了，好好休息' }
}

export default function Header({ user }: Props) {
  const { title, sub } = getGreeting()

  return (
    <header className="home-header">
      <div className="home-header-left">
        <h1 className="home-greet-title">
          {title}
          <HeartDoodle size={18} color="#A78BFA" stroke style={{ marginLeft: 8, verticalAlign: 'text-top' }} />
        </h1>
        <p className="home-greet-sub">{sub}</p>
      </div>

      {/* 中间飘浮的手绘小装饰 */}
      <div className="home-header-doodles" aria-hidden>
        <Sparkle size={12} color="#B69EFA" style={{ position: 'absolute', top: 12, left: 24 }} />
        <Sparkle size={10} color="#C9E0BE" style={{ position: 'absolute', top: 68, left: 96 }} />
        <HeartDoodle size={12} color="#F0A5B0" stroke style={{ position: 'absolute', top: 44, left: 60 }} />
      </div>

      <div className="home-header-right">
        <div className="home-avatar">
          <AvatarImage size={54} userAvatar={user?.thumbAvatar || user?.avatar || undefined} />
        </div>
      </div>
    </header>
  )
}
