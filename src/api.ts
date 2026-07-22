import type { Question, UserInfo } from './types'

// ══════════════════════════════════════════════════
// 配置
// ══════════════════════════════════════════════════
// 后端地址：本地开发填 http://localhost:8000，上线填正式后端域名（在 .env 配 VITE_API_BASE）
const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:8000'
const API = `${API_BASE}/api`

// JWT 存储 key（替换旧的 Builder token）
const TOKEN_KEY = 'beile_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// ══════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════
export function safeJson<T>(str: unknown, fallback: T): T {
  try { return typeof str === 'string' ? JSON.parse(str) : (str as T) || fallback } catch { return fallback }
}

/** 统一请求封装：自动带 JWT，401 时清 token（由上层跳登录）。 */
async function request<T>(path: string, opts: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const { auth = true, ...init } = opts
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> || {}),
  }
  const token = getToken()
  if (auth && token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API}${path}`, { ...init, headers })
  if (res.status === 401) {
    clearToken()
    throw new Error('未登录或登录已失效')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as any)?.detail || `请求失败 (${res.status})`)
  }
  return data as T
}

// ══════════════════════════════════════════════════
// Auth（手机 OTP）
// ══════════════════════════════════════════════════

/** 发送短信验证码 */
export async function sendOtp(phone: string): Promise<void> {
  await request('/auth/send-otp', { method: 'POST', auth: false, body: JSON.stringify({ phone }) })
}

/** 验证码登录/注册，成功存 token 并返回用户信息 */
export async function login(phone: string, code: string): Promise<UserInfo> {
  const data = await request<{ token: string; user: { id: number; phone: string; nickname?: string; avatar?: string } }>(
    '/auth/login',
    { method: 'POST', auth: false, body: JSON.stringify({ phone, code }) },
  )
  setToken(data.token)
  return mapUser(data.user)
}

/** 用已存的 token 拿当前用户（用于刷新后恢复登录态）；无效返回 null */
export async function getMe(): Promise<UserInfo | null> {
  if (!getToken()) return null
  try {
    const u = await request<{ id: number; phone: string; nickname?: string; avatar?: string }>('/auth/me', { method: 'GET' })
    return mapUser(u)
  } catch {
    return null
  }
}

export function logout() {
  clearToken()
}

// 后端用户字段 → 前端 UserInfo 映射
function mapUser(u: { phone: string; nickname?: string; avatar?: string }): UserInfo {
  return {
    nameCn: u.nickname || `用户${u.phone.slice(-4)}`,
    avatar: u.avatar || undefined,
  }
}

// ══════════════════════════════════════════════════
// 题库
// ══════════════════════════════════════════════════
export async function loadQuestions(): Promise<Question[]> {
  try {
    const rows = await request<any[]>('/questions', { method: 'GET' })
    return rows.map(row => ({
      id: row.id,
      cat: row.cat,
      q: row.q,
      summary: row.summary || '',
      a: row.a || '',
      keywords: safeJson(row.keywords, [] as string[]),
      pitfalls: row.pitfalls || '',
      interview: safeJson(row.interview, [] as string[]),
      diff: row.diff || 2,
    }))
  } catch (e) {
    console.warn('题库加载失败', e)
    return []
  }
}

// ══════════════════════════════════════════════════
// Cloud Sync（用户学习进度）
// ══════════════════════════════════════════════════
// 保持与旧实现相同的返回结构，store.tsx 的 MERGE_CLOUD 无需改动。
// rowId 在按用户隔离后已无意义，恒返回 null（store 的 cloudRowId 可保留但不再关键）。
export async function loadFromCloud(): Promise<{
  rowId: number | null
  cards_json: string
  daily_json: string
  custom_json: string
  mode: string
  achievements_json?: string
  documents_json?: string
  deleted_docs_json?: string
} | null> {
  try {
    const p = await request<{
      cards_json: string; daily_json: string; custom_json: string
      documents_json: string; deleted_docs_json: string; achievements_json: string; mode: string
    }>('/progress', { method: 'GET' })
    return {
      rowId: null,
      cards_json: p.cards_json || '{}',
      daily_json: p.daily_json || '{}',
      custom_json: p.custom_json || '[]',
      mode: p.mode || 'flashcard',
      achievements_json: p.achievements_json,
      documents_json: p.documents_json,
      deleted_docs_json: p.deleted_docs_json,
    }
  } catch (e) {
    console.warn('云端进度加载失败', e)
    return null
  }
}

export async function syncToCloud(
  store: { cards: any; daily: any; custom: any; mode: string; documents?: any; deletedDocs?: any; achievements?: any },
  _cloudRowId: number | null,
): Promise<number | null> {
  const body = {
    cards_json: JSON.stringify(store.cards),
    daily_json: JSON.stringify(store.daily),
    custom_json: JSON.stringify(store.custom),
    documents_json: JSON.stringify(store.documents || []),
    deleted_docs_json: JSON.stringify(store.deletedDocs || []),
    achievements_json: JSON.stringify(store.achievements || {}),
    mode: store.mode,
  }
  try {
    await request('/progress', { method: 'PUT', body: JSON.stringify(body) })
  } catch (e) {
    console.warn('云端同步失败', e)
  }
  return null
}
