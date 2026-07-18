import type { Question, UserInfo } from './types'

// ══════════════════════════════════════════════════
// 配置
// ══════════════════════════════════════════════════
export const BUILDER_ORIGIN = 'https://builder.devops.xiaohongshu.com'
export const BUILDER = `${BUILDER_ORIGIN}/builder-api/v1`
export const APP_ID = 'bld_258e10d749d04cc99139d1b28b1a3854'
export const QUESTIONS_APP_ID = 'bld_142aad4f922548c68389a56ba7ecaaf5'
export const BST_KEY = `bst_${APP_ID}`

const _ru = new URL(location.href)
_ru.hash = ''
_ru.searchParams.delete('builder_auth_code')
_ru.searchParams.delete('expires_in')
export const REDIRECT = _ru.toString()

// ══════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════
export function safeJson<T>(str: unknown, fallback: T): T {
  try { return typeof str === 'string' ? JSON.parse(str) : (str as T) || fallback } catch { return fallback }
}

// ── Builder API 请求工具 ──
export async function bfetch(path: string, opts: RequestInit & { appId?: string } = {}): Promise<any> {
  const { appId, ...fetchOpts } = opts
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Builder-App-Id': appId || APP_ID,
  }
  const token = sessionStorage.getItem('__bst') || localStorage.getItem(BST_KEY)
  if (token) h['X-Builder-Session'] = token
  try {
    const r = await fetch(`${BUILDER}${path}`, { ...fetchOpts, headers: { ...h, ...(fetchOpts.headers as Record<string, string> || {}) } })
    return await r.json()
  } catch (e: any) {
    return { code: -1, message: e.message }
  }
}

// ── 加载题目 ──
export async function loadQuestions(): Promise<Question[]> {
  try {
    const r = await bfetch('/supabase/rows/query', {
      appId: QUESTIONS_APP_ID,
      method: 'POST',
      body: JSON.stringify({
        table_name: 'questions',
        filters: {},
        limit: 500,
        order: [{ column: 'sort_order', ascending: true }],
      }),
    })
    if (r.code === 0 && r.data?.rows?.length) {
      return r.data.rows.map((row: any) => ({
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
    }
  } catch (e) {
    console.warn('题库加载失败', e)
  }
  return []
}

// ── Auth ──
export async function exchangeCode(code: string): Promise<string | null> {
  const r = await bfetch('/auth/exchange', {
    method: 'POST',
    body: JSON.stringify({ builder_auth_code: code }),
  })
  if (r.code === 0 && r.data?.builder_session_token) {
    const tok = r.data.builder_session_token
    localStorage.setItem(BST_KEY, tok)
    sessionStorage.setItem('__bst', tok)
    return tok
  }
  return null
}

export async function verifySession(token: string): Promise<UserInfo | null> {
  sessionStorage.setItem('__bst', token)
  const r = await bfetch('/auth/me', { method: 'GET' })
  if (r.code === 0 && r.data?.user) return r.data.user as UserInfo
  return null
}

export function redirectToLogin() {
  location.href = `${BUILDER_ORIGIN}/auth/start?redirect_uri=${encodeURIComponent(REDIRECT)}&app_id=${APP_ID}`
}

// ── Cloud Sync ──
export async function loadFromCloud(): Promise<{
  rowId: number | null
  cards_json: string
  daily_json: string
  custom_json: string
  mode: string
  achievements_json?: string  // 可选：user_progress 表尚未添加此列，此字段为未来扩展预留
} | null> {
  const r = await bfetch('/supabase/rows/query', {
    method: 'POST',
    body: JSON.stringify({ table_name: 'user_progress', filters: {}, limit: 1 }),
  })
  if (r.code !== 0 || !r.data?.rows?.length) return null
  const row = r.data.rows[0]
  return {
    rowId: row.id,
    cards_json: row.cards_json || '{}',
    daily_json: row.daily_json || '{}',
    custom_json: row.custom_json || '[]',
    mode: row.mode || 'flashcard',
    achievements_json: row.achievements_json,  // 老数据库返回 undefined，reducer 侧兼容处理
  }
}

export async function syncToCloud(
  store: { cards: any; daily: any; custom: any; mode: string },
  cloudRowId: number | null,
): Promise<number | null> {
  const body = {
    cards_json: JSON.stringify(store.cards),
    daily_json: JSON.stringify(store.daily),
    custom_json: JSON.stringify(store.custom),
    mode: store.mode,
    updated_at: new Date().toISOString(),
  }
  if (cloudRowId) {
    await bfetch('/supabase/rows/update', {
      method: 'POST',
      body: JSON.stringify({ table_name: 'user_progress', filters: { id: `eq.${cloudRowId}` }, values: body }),
    })
    return cloudRowId
  } else {
    const r = await bfetch('/supabase/rows/insert', {
      method: 'POST',
      body: JSON.stringify({ table_name: 'user_progress', rows: [body] }),
    })
    if (r.code === 0 && r.data?.rows?.[0]?.id) return r.data.rows[0].id
  }
  return null
}
