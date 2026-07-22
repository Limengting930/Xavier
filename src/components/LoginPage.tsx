import { useState, useRef, useCallback, useEffect } from 'react'
import type { UserInfo } from '../types'
import { sendOtp, login } from '../api'

interface Props {
  onLoggedIn: (user: UserInfo) => void
}

const PHONE_RE = /^1[3-9]\d{9}$/

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
      <div className="login-card">
        <div className="login-brand">背了吗</div>
        <div className="login-sub">你的 AI 知识速记卡片</div>

        <div className="login-field">
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
          <input
            className="login-input"
            type="tel"
            inputMode="numeric"
            maxLength={6}
            placeholder="验证码"
            value={code}
            onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError('') }}
            onKeyDown={e => { if (e.key === 'Enter') handleLogin() }}
          />
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
          {submitting ? '登录中…' : '登录 / 注册'}
        </button>

        <div className="login-tip">未注册的手机号将自动创建账号</div>
      </div>
    </div>
  )
}
