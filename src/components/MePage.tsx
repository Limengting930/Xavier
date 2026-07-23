import { useMemo, useRef, useState, type ChangeEvent, type ReactElement } from 'react'
import { useApp, getAchievementProgress } from '../store'
import { type UserInfo } from '../types'
import {
  IconStar,
  HandUnderline,
  IconShieldStar,
  IconSprout,
  IconFlame,
  IconLightning,
  IconTrophy,
  IconCrown,
  IconCheckCircle,
  IconChevronLeft,
  IconChevronRight,
  IconPencil,
  Sparkle,
} from './icons'
import AvatarImage from './home/AvatarImage'

// 退出登录 / 相机 图标（内联，避免改动体积很大的 icons.tsx）
function IconLogout({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M15 4h2.5A2.5 2.5 0 0 1 20 6.5v11A2.5 2.5 0 0 1 17.5 20H15" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 8l-4 4 4 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 12h9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconCamera({ size = 13, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2l1.2-2h6.6L15.5 7h4A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-9z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.2" stroke={color} strokeWidth="1.8" />
    </svg>
  )
}

// 读取图片文件并压缩为 256×256 的 jpeg dataURL（cover 居中裁剪），避免头像 base64 过大
function readAndCompressAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('图片解析失败'))
      img.onload = () => {
        const S = 256
        const canvas = document.createElement('canvas')
        canvas.width = S
        canvas.height = S
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('canvas 不可用')); return }
        // cover：按较大比例缩放后居中裁剪，保证正方形头像不变形
        const scale = Math.max(S / img.width, S / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

interface Props {
  user: UserInfo | null
  goal: number  // 当前今日新题目标，用于计算 first 成就进度
  /** 更新用户资料（昵称 / 头像 / 个性签名），仅传入的字段被更新 */
  onUpdateProfile: (patch: { nickname?: string; avatar?: string; slogan?: string }) => void
  /** 退出登录 */
  onLogout: () => void
}

// 展示层配置：id 必须与 types.ts 的 ACHIEVEMENTS + store.tsx checkAchievements 一致
// emoji 字段可选：配置后会用 emoji 替代 SVG Icon（未配置则回落到 Icon）
interface AchievementDef {
  id: string
  Icon: (props: { size?: number; color?: string }) => ReactElement
  name: string
  desc: string
  bg: string
  color: string
  emoji?: string
}
const ALL_ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'first', Icon: IconSprout, name: '初学乍练', desc: '首次完成学习目标', bg: '#EEF8EE', color: '#7BB077' },
  { id: 'streak3', Icon: IconFlame, name: '三日不辍', desc: '连续学习3天', bg: '#FFF0F0', color: '#F27166', emoji: '🔥' },
  { id: 'streak7', Icon: IconLightning, name: '一周坚持', desc: '连续学习7天', bg: '#FFF8DE', color: '#E8A83C' },
  { id: 'streak10', Icon: IconTrophy, name: '十全十美', desc: '连续学习10天', bg: '#F4F0FF', color: '#B69EFA' },
  { id: 'master30', Icon: IconCrown, name: '一库在握', desc: '掌握一个题库', bg: '#FFF6E5', color: '#F2B94A' },
  { id: 'masterAll', Icon: IconShieldStar, name: '通关副本', desc: '掌握所有题目', bg: '#EEF2FF', color: '#8A8EF2' },
]

// 时间戳 -> "2024.05.08"
function fmtDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function MePage({ user, goal, onUpdateProfile, onLogout }: Props) {
  const { state, allCards } = useApp()
  const { store } = state

  // ── 资料编辑：改名 / 改签名弹窗 ──
  const [editKind, setEditKind] = useState<null | 'name' | 'slogan'>(null)
  const [editValue, setEditValue] = useState('')
  const [editErr, setEditErr] = useState('')
  // 退出登录确认弹窗
  const [logoutConfirm, setLogoutConfirm] = useState(false)
  // 头像上传
  const fileRef = useRef<HTMLInputElement>(null)
  const [avatarErr, setAvatarErr] = useState('')

  const displayName = user?.redName || user?.nameCn || user?.nameEn || '同学'
  const hasCustomSlogan = !!user?.slogan?.trim()

  const openNameEdit = () => {
    setEditValue(displayName === '同学' ? '' : displayName)
    setEditErr('')
    setEditKind('name')
  }
  const openSloganEdit = () => {
    setEditValue(user?.slogan?.trim() || '')
    setEditErr('')
    setEditKind('slogan')
  }
  const closeEdit = () => { setEditKind(null); setEditErr('') }
  const submitEdit = () => {
    if (editKind === 'name') {
      const v = editValue.trim()
      if (!v) { setEditErr('名称不能为空'); return }
      onUpdateProfile({ nickname: v })
    } else if (editKind === 'slogan') {
      onUpdateProfile({ slogan: editValue.trim() })
    }
    closeEdit()
  }

  const handlePickAvatar = () => { setAvatarErr(''); fileRef.current?.click() }
  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 清空以允许重复选择同一文件
    if (!file) return
    if (!file.type.startsWith('image/')) { setAvatarErr('请选择图片文件'); return }
    if (file.size > 10 * 1024 * 1024) { setAvatarErr('图片不能超过 10MB'); return }
    try {
      const dataUrl = await readAndCompressAvatar(file)
      onUpdateProfile({ avatar: dataUrl })
    } catch {
      setAvatarErr('头像处理失败，请换一张试试')
    }
  }

  // 当前题库 id 集合（含 custom），供 getAchievementProgress 用
  const libIds = useMemo(() => new Set(allCards().map(c => c.id)), [state.questions, state.store.custom, allCards])

  // 已解锁成就 + 解锁时间：从 store.achievements 读；未解锁 date 为 ''
  const achievements = useMemo(() => {
    const ts = store.achievements || {}
    return ALL_ACHIEVEMENTS.map(a => {
      const unlockedAt = ts[a.id]
      return {
        ...a,
        unlocked: !!unlockedAt,
        date: unlockedAt ? fmtDate(unlockedAt) : '',
      }
    })
  }, [store.achievements])

  // 最新成就：unlockedAt 最大的那个。时间戳相同时（同一次批量补检），
  // 按 ALL_ACHIEVEMENTS 里的索引取更大的一个——列表顺序按"越难越靠后"排的，
  // 所以更靠后的成就视为"更值得炫耀的最新成就"
  const latestAchievement = useMemo(() => {
    const ts = store.achievements || {}
    const idxOf = (id: string) => ALL_ACHIEVEMENTS.findIndex(a => a.id === id)
    let latestId: string | null = null
    let latestTs = -1
    let latestIdx = -1
    Object.entries(ts).forEach(([id, t]) => {
      const idx = idxOf(id)
      if (idx < 0) return  // 未知 id 忽略
      if (t > latestTs || (t === latestTs && idx > latestIdx)) {
        latestTs = t
        latestIdx = idx
        latestId = id
      }
    })
    return latestId ? achievements.find(a => a.id === latestId) || null : null
  }, [achievements, store.achievements])

  // 成就总览弹窗
  const [achDialogOpen, setAchDialogOpen] = useState(false)

  // Calendar
  const [currentDate, setCurrentDate] = useState(new Date())

  // 未来月份不可翻：以"今天所在月份"作为最大可见月份
  const canGoNext = useMemo(() => {
    const now = new Date()
    return currentDate.getFullYear() < now.getFullYear()
      || (currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() < now.getMonth())
  }, [currentDate])

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    // 日历里所有日期都是"当地"含义，dateStr 必须用本地日期格式化，才能和 daily 的
    // 本地日期 key 对上；旧代码用 toISOString 会在北京时区把当天算成前一天，导致高亮错位。
    const todayStr = new Date().toLocaleDateString('sv-SE')

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - startDate.getDay()) // start from Sunday

    const endDate = new Date(lastDay)
    if (endDate.getDay() !== 6) {
      endDate.setDate(endDate.getDate() + (6 - endDate.getDay())) // end at Saturday
    }

    const days = []
    const d = new Date(startDate)
    while (d <= endDate) {
      const dateStr = d.toLocaleDateString('sv-SE')
      // 当天有任何评分（新学 or 复习）都视为"进行了学习"，与 RATE_CARD 写入 daily.ids 的口径一致
      const hasStudied = (store.daily[dateStr]?.ids?.length || 0) > 0
      days.push({
        date: new Date(d),
        dateStr,
        dayNum: d.getDate(),
        isCurrentMonth: d.getMonth() === month,
        isToday: dateStr === todayStr,
        hasStudied,
      })
      d.setDate(d.getDate() + 1)
    }
    return days
  }, [currentDate, store.daily])

  const prevMonth = () => {
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }
  const nextMonth = () => {
    if (!canGoNext) return
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }

  return (
    <div className="me-page">
      {/* Header */}
      <header className="me-header">
        <h1 className="me-title">我的</h1>
        <IconStar size={16} color="var(--accent)" filled style={{ position: 'absolute', top: 6, left: 52, transform: 'rotate(15deg)' }} />
        <div className="me-title-underline">
          <HandUnderline width={60} />
        </div>
      </header>

      {/* Profile Section */}
      <section className="me-profile">
        <div className="me-avatar-btn" onClick={handlePickAvatar} role="button" aria-label="更换头像">
          <div className="me-avatar-wrap">
            <AvatarImage size={80} userAvatar={user?.thumbAvatar || user?.avatar || undefined} />
          </div>
          <div className="me-avatar-cam"><IconCamera size={13} color="#FFFFFF" /></div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
        </div>
        <div className="me-profile-info">
          <div className="me-name-row">
            <div className="me-name">{displayName}</div>
            <button className="me-name-edit" onClick={openNameEdit} aria-label="修改名称">
              <IconPencil size={15} color="var(--sub)" />
            </button>
            <button className="me-logout" onClick={() => setLogoutConfirm(true)}>
              <IconLogout size={13} color="var(--sub)" />
              <span>退出登录</span>
            </button>
          </div>
          <div className="me-slogan" onClick={openSloganEdit} role="button" aria-label="修改个性签名">
            {hasCustomSlogan ? (
              <span className="me-slogan-text">{user!.slogan}</span>
            ) : (
              <span className="me-slogan-text">
                每天进步一点点，未来可期
              </span>
            )}
            <IconPencil size={12} color="var(--sub)" style={{ marginLeft: 3, flexShrink: 0 }} />
          </div>
          {avatarErr && <div className="me-avatar-err">{avatarErr}</div>}
        </div>
      </section>

      {/* Latest Achievement：仅在有已解锁成就时展示；点击打开总览弹窗 */}
      {latestAchievement && (
        <section
          className="me-latest-ach"
          onClick={() => setAchDialogOpen(true)}
          style={{ cursor: 'pointer' }}
        >
          <div className="me-latest-bg-blur"></div>
          <Sparkle size={12} color="#F0A5B0" style={{ position: 'absolute', top: 20, left: 30 }} />
          <Sparkle size={14} color="#E8A83C" style={{ position: 'absolute', bottom: 30, left: 40 }} />
          <Sparkle size={10} color="#B69EFA" style={{ position: 'absolute', top: 40, right: 90 }} />
          <Sparkle size={8} color="#E8A83C" style={{ position: 'absolute', bottom: 20, right: 30 }} />
          <div className="me-latest-plant">
            <svg width="24" height="40" viewBox="0 0 24 40" fill="none">
              <path d="M12 40 C12 30 6 24 4 16 C12 20 16 28 12 40" fill="#B7D9AE" opacity="0.8" />
              <path d="M12 34 C18 28 22 20 20 12 C14 16 12 24 12 34" fill="#A5CE9D" opacity="0.8" />
              <path d="M12 40 L12 20" stroke="#7BB077" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            </svg>
          </div>

          <div className={`me-latest-icon-wrap${latestAchievement.emoji ? ' has-emoji' : ''}`}>
            <div
              className="me-latest-icon-glow"
              style={latestAchievement.emoji ? { background: latestAchievement.bg } : undefined}
            ></div>
            <div
              className="me-latest-icon-bg"
              style={latestAchievement.emoji ? { borderColor: latestAchievement.bg } : undefined}
            >
              {latestAchievement.emoji ? (
                <span className="me-latest-icon-emoji" role="img" aria-label={latestAchievement.name}>
                  {latestAchievement.emoji}
                </span>
              ) : (
                <latestAchievement.Icon size={40} color={latestAchievement.color} />
              )}
            </div>
          </div>

          <div className="me-latest-info">
            <div className="me-latest-tag">最新成就</div>
            <div className="me-latest-name">{latestAchievement.name}</div>
            <div className="me-latest-desc">{latestAchievement.desc}</div>
            <div className="me-latest-date">获得于 {latestAchievement.date}</div>
          </div>
        </section>
      )}

      {/* Learning Calendar */}
      <section className="me-card">
        <div className="me-card-header">
          <h2 className="me-card-title">学习日历</h2>
          <IconStar size={14} color="var(--accent)" style={{ marginLeft: 6, transform: 'rotate(10deg)', opacity: 0.8 }} />
        </div>

        <div className="me-cal-nav">
          <button className="me-cal-btn" onClick={prevMonth}><IconChevronLeft size={16} /></button>
          <div className="me-cal-month">{currentDate.getFullYear()}年{currentDate.getMonth() + 1}月</div>
          <button
            className="me-cal-btn"
            onClick={nextMonth}
            disabled={!canGoNext}
            style={{ opacity: canGoNext ? 1 : 0.3, cursor: canGoNext ? 'pointer' : 'not-allowed' }}
          >
            <IconChevronRight size={16} />
          </button>
        </div>

        <div className="me-cal-grid">
          {['日', '一', '二', '三', '四', '五', '六'].map(d => (
            <div key={d} className="me-cal-dow">{d}</div>
          ))}
          {calendarDays.map((d, i) => {
            const marked = d.hasStudied && d.isCurrentMonth && !d.isToday
            return (
              <div key={i} className={`me-cal-day ${!d.isCurrentMonth ? 'out-month' : ''}`}>
                <div className={`me-cal-num ${d.isToday ? 'is-today' : ''}${marked ? ' is-studied' : ''}`}>
                  {d.dayNum}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 成就总览弹窗：点击最新成就卡片触发，展示 6 个成就 + 各自进度 */}
      {achDialogOpen && (
        <div className="goal-overlay" onClick={() => setAchDialogOpen(false)}>
          <div className="goal-dialog ach-dialog" onClick={e => e.stopPropagation()}>
            <div className="goal-title">成就</div>
            <div className="goal-subtitle">解锁更多成就，见证成长</div>
            <div className="me-ach-list" style={{ maxHeight: '60vh', overflowY: 'auto', marginTop: 8 }}>
              {achievements.map(ach => {
                const prog = getAchievementProgress(ach.id, store, goal, libIds)
                const pct = prog.target > 0 ? Math.min(100, (prog.current / prog.target) * 100) : 0
                return (
                  <div key={ach.id} className={`me-ach-item ach-dialog-item${ach.unlocked ? ' unlocked' : ''}`}>
                    <div
                      className={`me-ach-icon${ach.emoji ? ' has-emoji' : ''}`}
                      style={{ background: ach.bg, color: ach.color, opacity: ach.unlocked ? 1 : 0.5 }}
                    >
                      {ach.emoji ? (
                        <span className="me-ach-icon-emoji" role="img" aria-label={ach.name}>
                          {ach.emoji}
                        </span>
                      ) : (
                        <ach.Icon size={22} />
                      )}
                    </div>
                    <div className="me-ach-text" style={{ flex: 1 }}>
                      <div className="me-ach-name">{ach.name}</div>
                      <div className="me-ach-desc">{ach.desc}</div>
                      {/* 进度条 */}
                      <div className="ach-prog-wrap">
                        <div className="ach-prog-bar">
                          <div
                            className="ach-prog-fill"
                            style={{ width: `${pct}%`, background: ach.color }}
                          />
                        </div>
                        <div className="ach-prog-text">{prog.current}/{prog.target} {prog.unit}</div>
                      </div>
                    </div>
                    <div className="me-ach-right">
                      {ach.unlocked
                        ? <IconCheckCircle size={18} color="#7BB077" />
                        : <div style={{ fontSize: 11, color: 'var(--sub)', fontWeight: 600 }}>未解锁</div>
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 改名 / 改签名 弹窗 */}
      {editKind && (
        <div className="goal-overlay" onClick={closeEdit}>
          <div className="goal-dialog" onClick={e => e.stopPropagation()} style={{ paddingBottom: 24 }}>
            <div className="goal-title">{editKind === 'name' ? '修改名称' : '修改个性签名'}</div>
            <div className="goal-subtitle">
              {editKind === 'name' ? '给自己起个响亮的名字吧' : '写一句激励自己的话'}
            </div>
            {editKind === 'name' ? (
              <input
                className="me-edit-input"
                value={editValue}
                maxLength={10}
                autoFocus
                placeholder="请输入名称"
                onChange={e => { setEditValue(e.target.value); setEditErr('') }}
                onKeyDown={e => { if (e.key === 'Enter') submitEdit() }}
              />
            ) : (
              <textarea
                className="me-edit-textarea"
                value={editValue}
                maxLength={20}
                autoFocus
                placeholder="请输入个性签名"
                onChange={e => { setEditValue(e.target.value); setEditErr('') }}
              />
            )}
            <div className="me-edit-count">{editValue.length}/{editKind === 'name' ? 10 : 20}</div>
            {editErr && <div className="goal-err-tip">{editErr}</div>}
            <div className="goal-btns">
              <button className="goal-btn secondary" onClick={closeEdit}>取消</button>
              <button className="goal-btn primary" onClick={submitEdit}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 退出登录确认 */}
      {logoutConfirm && (
        <div className="goal-overlay" onClick={() => setLogoutConfirm(false)}>
          <div className="goal-dialog" onClick={e => e.stopPropagation()} style={{ paddingBottom: 32 }}>
            <div className="goal-title">退出登录</div>
            <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--sub)', margin: '10px 0 24px' }}>
              确定要退出当前账号吗？
            </div>
            <div className="goal-btns">
              <button className="goal-btn secondary" onClick={() => setLogoutConfirm(false)}>取消</button>
              <button className="goal-btn primary" onClick={() => { setLogoutConfirm(false); onLogout() }}>退出</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
