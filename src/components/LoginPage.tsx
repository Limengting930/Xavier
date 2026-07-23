import { useState, useRef, useCallback, useEffect } from 'react'
import type { UserInfo } from '../types'
import { sendOtp, login } from '../api'
import { HandUnderline } from './icons'

interface Props {
  onLoggedIn: (user: UserInfo) => void
}

const PHONE_RE = /^1[3-9]\d{9}$/

// ============================================================
// 局部装饰 SVG（仅登录页使用，内联避免污染 icons.tsx）
// ============================================================

/** 手绘五角星（描边或填充） */
function DoodleStar({ size = 20, color = '#B69EFA', filled = false, style }: { size?: number; color?: string; filled?: boolean; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M12 3.2l2.35 4.76 5.25.76-3.8 3.7.9 5.23L12 15.9l-4.7 2.47.9-5.23-3.8-3.7 5.25-.76L12 3.2z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** 顶部左侧手绘虚线曲线 */
function CurveDash({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="150" height="110" viewBox="0 0 150 110" fill="none" style={style}>
      <path
        d="M6 30 C 10 8, 46 6, 50 30 C 54 54, 90 66, 140 40"
        stroke="#C9BEF5"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="1 9"
        fill="none"
      />
    </svg>
  )
}

/** 底部装饰虚线 */
function BottomDash({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="130" height="70" viewBox="0 0 130 70" fill="none" style={style}>
      <path
        d="M4 40 C 20 62, 44 62, 48 40 C 52 18, 76 18, 82 38 C 88 58, 112 54, 124 30"
        stroke="#F0BFC6"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray="1 8"
        fill="none"
      />
    </svg>
  )
}

/** 底部坐姿机器人插画 + Hi 气泡 + 书本 */
function RobotSitting() {
  return (
    <svg width="230" height="180" viewBox="0 0 230 180" fill="none">
      <defs>
        <linearGradient id="botBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EDE7FB" />
          <stop offset="1" stopColor="#D7C9F4" />
        </linearGradient>
        <linearGradient id="botHead" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F1ECFC" />
          <stop offset="1" stopColor="#DCD0F6" />
        </linearGradient>
      </defs>

      {/* Hi~ 气泡 */}
      <g>
        <rect x="150" y="10" width="60" height="38" rx="16" fill="#F7C6CE" />
        <path d="M164 46 L158 58 L176 46 Z" fill="#F7C6CE" />
        <text x="180" y="35" fontFamily="'ZCOOL KuaiLe', sans-serif" fontSize="18" fill="#FFFFFF" textAnchor="middle">Hi~</text>
      </g>

      {/* 书本一摞 */}
      <g>
        <rect x="150" y="150" width="66" height="14" rx="4" fill="#F7C6CE" />
        <rect x="156" y="138" width="66" height="14" rx="4" fill="#CDBFF2" />
        <rect x="150" y="126" width="60" height="14" rx="4" fill="#F3E0A8" />
      </g>

      {/* 绿色小苗 */}
      <path d="M218 126 C224 118 224 108 220 104 C216 110 216 120 218 126" fill="#B7D9AE" />

      {/* 机器人身体 */}
      <g>
        {/* 轮子/底座 */}
        <ellipse cx="98" cy="158" rx="46" ry="12" fill="#CFC1EF" opacity="0.7" />
        <circle cx="72" cy="150" r="14" fill="#C4B4EC" />
        <circle cx="124" cy="150" r="14" fill="#C4B4EC" />
        {/* 身体 */}
        <rect x="66" y="104" width="64" height="52" rx="22" fill="url(#botBody)" />
        <rect x="80" y="118" width="36" height="26" rx="10" fill="#C9BAF0" opacity="0.6" />
        {/* 手臂 */}
        <rect x="52" y="112" width="16" height="34" rx="8" fill="#DED2F6" transform="rotate(14 60 129)" />
        <rect x="128" y="112" width="16" height="34" rx="8" fill="#DED2F6" transform="rotate(-14 136 129)" />
        {/* 手里的星星卡片 */}
        <rect x="44" y="132" width="30" height="24" rx="6" fill="#F3E0A8" transform="rotate(-10 59 144)" />
        <path d="M59 138l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5L59 138z" fill="#FFFFFF" transform="rotate(-10 59 144)" />

        {/* 天线 */}
        <circle cx="98" cy="52" r="5" fill="#B7A4EE" />
        <path d="M98 57 L98 66" stroke="#B7A4EE" strokeWidth="3.5" strokeLinecap="round" />
        {/* 头 */}
        <rect x="64" y="66" width="68" height="46" rx="20" fill="url(#botHead)" />
        {/* 耳朵 */}
        <rect x="58" y="82" width="8" height="16" rx="4" fill="#C4B4EC" />
        <rect x="130" y="82" width="8" height="16" rx="4" fill="#C4B4EC" />
        {/* 脸屏 */}
        <rect x="74" y="76" width="48" height="28" rx="13" fill="#6D53E0" />
        <ellipse cx="90" cy="90" rx="4.6" ry="5.6" fill="#FFFFFF" />
        <ellipse cx="106" cy="90" rx="4.6" ry="5.6" fill="#FFFFFF" />
      </g>
    </svg>
  )
}

/** 输入框左侧手机图标（浅紫圆角块内） */
function PhoneGlyph() {
  return (
    <span className="login-ico">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="7" y="3" width="10" height="18" rx="3" stroke="#8B6EF0" strokeWidth="1.8" />
        <path d="M10.5 18h3" stroke="#8B6EF0" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  )
}

/** 输入框左侧盾牌图标（浅紫圆角块内） */
function ShieldGlyph() {
  return (
    <span className="login-ico">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 3l7 2.5v6c0 4.2-3 7.3-7 8.5-4-1.2-7-4.3-7-8.5v-6L12 3z" stroke="#8B6EF0" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke="#8B6EF0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

export default function LoginPage({ onLoggedIn }: Props) {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const startCountdown = useCallback(() => {
    setCountdown(60)
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0 }
        return c - 1
      })
    }, 1000)
  }, [])

  const handleSendOtp = useCallback(async () => {
    setError('')
    if (!PHONE_RE.test(phone)) { setError('请输入正确的手机号'); return }
    setSending(true)
    try {
      await sendOtp(phone)
      startCountdown()
    } catch (e: any) {
      setError(e?.message || '验证码发送失败')
    } finally {
      setSending(false)
    }
  }, [phone, startCountdown])

  const handleLogin = useCallback(async () => {
    setError('')
    if (!PHONE_RE.test(phone)) { setError('请输入正确的手机号'); return }
    if (!/^\d{4,6}$/.test(code)) { setError('请输入验证码'); return }
    setSubmitting(true)
    try {
      const user = await login(phone, code)
      onLoggedIn(user)
    } catch (e: any) {
      setError(e?.message || '登录失败')
    } finally {
      setSubmitting(false)
    }
  }, [phone, code, onLoggedIn])

  return (
    <div className="login-page">
      {/* —— 背景装饰 —— */}
      <CurveDash style={{ position: 'absolute', top: 0, left: -20 }} />
      <DoodleStar size={22} color="#E8A83C" filled style={{ position: 'absolute', top: 60, right: 44 }} />
      <DoodleStar size={13} color="#B69EFA" filled style={{ position: 'absolute', top: 52, right: 96 }} />
      <DoodleStar size={18} color="#B69EFA" style={{ position: 'absolute', top: 150, left: 30 }} />
      <DoodleStar size={14} color="#F0A5B0" style={{ position: 'absolute', top: 168, right: 40 }} />

      {/* —— 主内容 —— */}
      <div className="login-content">
        {/* 品牌名 */}
        <div className="login-brand-wrap">
          <h1 className="login-brand">背了吗</h1>
          <div className="login-brand-underline"><HandUnderline width={140} /></div>
        </div>
        <div className="login-sub">
          <DoodleStar size={11} color="#B69EFA" filled />
          <span>你的专属记忆卡片</span>
          <DoodleStar size={11} color="#F0A5B0" filled />
        </div>

        {/* 表单 */}
        <div className="login-form">
          <div className="login-field">
            <PhoneGlyph />
            <input
              className="login-input"
              type="tel"
              inputMode="numeric"
              maxLength={11}
              placeholder="请输入手机号"
              value={phone}
              onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setError('') }}
            />
          </div>

          <div className="login-field login-field-code">
            <ShieldGlyph />
            <input
              className="login-input"
              type="tel"
              inputMode="numeric"
              maxLength={6}
              placeholder="请输入验证码"
              value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError('') }}
              onKeyDown={e => { if (e.key === 'Enter') handleLogin() }}
            />
            <span className="login-otp-divider" />
            <button
              className="login-otp-btn"
              disabled={sending || countdown > 0}
              onClick={handleSendOtp}
            >
              {countdown > 0 ? `${countdown}s` : (sending ? '发送中…' : '获取验证码')}
            </button>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button className="login-submit" disabled={submitting} onClick={handleLogin}>
            {submitting ? '登录中…' : '登录'}
          </button>
        </div>
      </div>

      {/* —— 底部机器人插画 —— */}
      <div className="login-bottom">
        <DoodleStar size={20} color="#8FCB7C" style={{ position: 'absolute', left: 20, bottom: 120 }} />
        <BottomDash style={{ position: 'absolute', left: 0, bottom: 0 }} />
        <div className="login-bot-illust"><RobotSitting /></div>
      </div>
    </div>
  )
}
