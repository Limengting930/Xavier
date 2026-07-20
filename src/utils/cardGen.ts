// 卡片生成：把分块文本调 LLM 结构化生成 Question[]。
// 两阶段归类（§11）：先产出受控分类清单（优先复用题库现有分类），再逐块按清单打 cat。
// 归类相关红线：cat 必须是"知识点分类"，绝不填文档名。
//
// 复用 kimi.ts 的 chatOnce（非流式）+ API 常量，禁止另起 fetch（CLAUDE.md 铁律）。

import type { Question } from '../types'
import { DOC_CAT_MAX, DOC_CAT_FALLBACK, ORPHAN_CAT_MERGE_THRESHOLD, GEN_CONCURRENCY } from '../types'
import { chatOnce, type Message } from './kimi'
import type { Chunk } from './chunker'

export interface GenerateResult {
  cards: Omit<Question, 'id'>[]
  failedChunks: number
}

// ── 限流退避重试：最多 2 次 ──
// ── 限流退避重试：最多 3 次；429 优先尊重服务端 Retry-After，否则指数退避 1s→2s→4s（带抖动）──
async function chatWithRetry(
  messages: Message[],
  opts: { signal?: AbortSignal; temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const MAX_RETRY = 3
  let lastErr: unknown
  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    try {
      return await chatOnce(messages, opts)
    } catch (e: any) {
      lastErr = e
      if (e?.name === 'AbortError') throw e
      // 仅对 429 退避重试，其余错误直接抛
      if (e?.status !== 429 || attempt === MAX_RETRY) throw e
      // 优先用服务端 Retry-After；否则指数退避（1s/2s/4s）+ 0~300ms 抖动，避免多请求同步重试再次撞限流
      const backoff = 1000 * Math.pow(2, attempt) + Math.floor(Math.random() * 300)
      const waitMs = typeof e?.retryAfterMs === 'number' ? e.retryAfterMs : backoff
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, waitMs)
        // 等待期间若被中断，立即取消定时器并抛 AbortError
        opts.signal?.addEventListener('abort', () => {
          clearTimeout(timer)
          reject(new DOMException('aborted', 'AbortError'))
        }, { once: true })
      })
    }
  }
  throw lastErr
}

// ── JSON 容错解析：strip 代码围栏 → 直接 parse → 截取首[到末] 再 parse ──
function tryParseJsonArray(raw: string): any[] | null {
  let s = raw.trim()
  // strip ```json / ``` 代码围栏
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    const v = JSON.parse(s)
    if (Array.isArray(v)) return v
  } catch { /* 继续兜底 */ }
  // 截取首个 [ 到末个 ]
  const start = s.indexOf('[')
  const end = s.lastIndexOf(']')
  if (start >= 0 && end > start) {
    try {
      const v = JSON.parse(s.slice(start, end + 1))
      if (Array.isArray(v)) return v
    } catch { /* 放弃 */ }
  }
  return null
}

// ── 分类名归一化：去空白、转小写，供就近匹配 ──
function normCat(s: string): string {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, '')
}

// ── 归一化字符串数组：非数组时尝试按行/逗号拆分 ──
function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean)
  if (typeof v === 'string') {
    return v
      .split(/[\n,，、]/)
      .map(x => x.trim())
      .filter(Boolean)
  }
  return []
}

/**
 * 阶段一：产出受控分类清单（5~12 个，优先复用题库现有分类）。
 * 输入文档大纲（chunk title + 前若干字）+ 现有分类清单。
 * 失败/为空时由上层降级（用 chunk title 去重）。
 */
export async function generateCategories(
  chunks: Chunk[],
  docName: string,
  existingCats: string[],
  signal?: AbortSignal,
): Promise<string[]> {
  // 组装大纲：每块 title + 前 60 字，省 token
  const outline = chunks
    .map((c, i) => `${i + 1}. ${c.title || '(无标题)'}：${c.content.slice(0, 60).replace(/\n/g, ' ')}`)
    .join('\n')

  const existingBlock = existingCats.length
    ? `\n已有分类清单（能对应到的知识点必须一字不差复用这些名字，只有都覆盖不到才新建）：\n${existingCats.join('、')}\n`
    : ''

  const sys: Message = {
    role: 'system',
    content: [
      '你是知识分类专家。请根据给定文档大纲，归纳出一组「知识点大类」用于组织记忆卡片。',
      '要求：',
      `1. 产出 5~${DOC_CAT_MAX} 个大类（文档内容单一时可少于 5，不要强行凑数）；数量绝不超过 ${DOC_CAT_MAX} 个。`,
      '2. 分类必须是「知识点主题」，绝不能是文档名或文件名。',
      '3. 分类之间尽量互斥、粒度均衡、能覆盖全文。',
      '4. 优先复用给定的已有分类清单（能对应就一字不差沿用），只有都覆盖不到才新建。',
      '5. 只输出一个 JSON 字符串数组，例如 ["分类A","分类B"]，不要输出任何解释、不要代码围栏。',
    ].join('\n'),
  }
  const user: Message = {
    role: 'user',
    content: `文档名：${docName}${existingBlock}\n文档大纲：\n${outline}`,
  }

  const raw = await chatWithRetry([sys, user], { signal, temperature: 0.2, maxTokens: 512 })
  const arr = tryParseJsonArray(raw)
  if (!arr) return []
  // 去重 + 截断到上限
  const seen = new Set<string>()
  const cats: string[] = []
  for (const c of arr) {
    const name = String(c).trim()
    if (!name) continue
    const key = normCat(name)
    if (seen.has(key)) continue
    seen.add(key)
    cats.push(name)
    if (cats.length >= DOC_CAT_MAX) break
  }
  return cats
}

/**
 * 阶段二：逐块生成卡片。categories 为阶段一产出的受控清单，cat 只能取自其中。
 */
export async function generateCards(
  chunks: Chunk[],
  docName: string,
  categories: string[],
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<GenerateResult> {
  const catList = categories.length ? categories : [DOC_CAT_FALLBACK]
  const cards: Omit<Question, 'id'>[] = []
  let failedChunks = 0
  const total = chunks.length

  const sys: Message = {
    role: 'system',
    content: [
      '你是前端/技术知识卡片生成助手。请把给定文本片段拆解为若干「原子知识点」记忆卡片。',
      '严格要求：',
      '1. 只依据给定文本，不得编造 API、参数、版本号或链接；文本没提到的不要写。',
      '2. 一卡一知识点，问题可独立作答，卡片之间不要重复。',
      `3. 每张卡的 cat 只能从这个分类清单里选一个（一字不差），不得新造：${catList.join('、')}`,
      '4. 输出严格的 JSON 数组，每个元素为一张卡，字段如下：',
      '   - q: string（必填，问题）',
      '   - summary: string（一句话要点，可空）',
      '   - a: string（必填，答案，支持 Markdown）',
      '   - keywords: string[]（关键词）',
      '   - pitfalls: string（易错点，可空）',
      '   - interview: string[]（高频面试问法）',
      '   - diff: number（难度 1~3）',
      '   - cat: string（必须取自上面的分类清单）',
      '5. 只输出 JSON 数组本身，不要解释、不要代码围栏。文本内容太少无法出卡时输出 []。',
    ].join('\n'),
  }

  // 处理单块：调 LLM → 容错解析 → 净化。返回该块产出的卡片，失败抛错由上层计数。
  const processChunk = async (c: Chunk): Promise<Omit<Question, 'id'>[]> => {
    const user: Message = {
      role: 'user',
      content: `【文档：${docName}】\n【章节：${c.title || '未命名'}】\n${c.content}`,
    }
    const raw = await chatWithRetry([sys, user], { signal, temperature: 0.3, maxTokens: 2048 })
    const arr = tryParseJsonArray(raw)
    if (!arr) throw new Error('JSON 解析失败')
    const out: Omit<Question, 'id'>[] = []
    for (const item of arr) {
      const card = sanitizeCard(item, catList)
      if (card) out.push(card)
    }
    return out
  }

  // 并发池：同时最多 GEN_CONCURRENCY 个请求在途。
  // - 结果按块索引写回 perChunk，保证卡片顺序与文档一致（不受完成先后影响）；
  // - 每块完成即推进进度；某块失败（解析/网络）计入 failedChunks，不中断其余块；
  // - AbortError 立即向上抛出，中断整个生成（不写半成品）。
  const perChunk: (Omit<Question, 'id'>[] | null)[] = new Array(total).fill(null)
  let done = 0
  let nextIndex = 0
  let aborted = false

  const worker = async () => {
    while (true) {
      if (aborted) return
      if (signal?.aborted) throw new DOMException('aborted', 'AbortError')
      const i = nextIndex++
      if (i >= chunks.length) return
      try {
        perChunk[i] = await processChunk(chunks[i])
      } catch (e: any) {
        if (e?.name === 'AbortError') { aborted = true; throw e }
        failedChunks++
        perChunk[i] = []
      }
      done++
      onProgress(done, total)
    }
  }

  const poolSize = Math.min(GEN_CONCURRENCY, chunks.length)
  await Promise.all(Array.from({ length: poolSize }, () => worker()))

  // 按块顺序汇总
  for (const list of perChunk) {
    if (list) cards.push(...list)
  }

  // 后处理：分类归一化 + 孤儿合并
  finalizeCategories(cards, catList)

  return { cards, failedChunks }
}

// ── 单卡字段兜底与净化；q 或 a 为空 → 返回 null（丢弃） ──
function sanitizeCard(item: any, catList: string[]): Omit<Question, 'id'> | null {
  if (!item || typeof item !== 'object') return null
  const q = String(item.q ?? '').trim()
  const a = String(item.a ?? '').trim()
  if (!q || !a) return null

  let diff = Number(item.diff)
  if (!Number.isInteger(diff) || diff < 1 || diff > 3) diff = 2

  // cat 映射回清单：命中（含归一化同义）→ 标准名；否则先记原值，finalize 再统一收敛
  const rawCat = String(item.cat ?? '').trim()
  const matched = matchCat(rawCat, catList)

  return {
    cat: matched ?? rawCat ?? DOC_CAT_FALLBACK,
    q,
    a,
    summary: String(item.summary ?? '').trim(),
    keywords: toStringArray(item.keywords),
    pitfalls: String(item.pitfalls ?? '').trim(),
    interview: toStringArray(item.interview),
    diff,
  }
}

// 就近匹配清单项：完全相同或归一化相同则返回清单里的标准名
function matchCat(cat: string, catList: string[]): string | null {
  if (!cat) return null
  const n = normCat(cat)
  for (const c of catList) {
    if (normCat(c) === n) return c
  }
  return null
}

// 后处理：把越界 cat 归入「其他」；孤儿分类合并；回写卡片 cat（原地修改）
function finalizeCategories(cards: Omit<Question, 'id'>[], catList: string[]): void {
  const listSet = new Set(catList)
  // 1. 越界映射：不在清单内 → 就近匹配，仍失败入「其他」
  for (const card of cards) {
    if (!listSet.has(card.cat)) {
      const m = matchCat(card.cat, catList)
      card.cat = m ?? DOC_CAT_FALLBACK
    }
  }
  // 2. 统计每类卡片数，找孤儿（仅 1 张）
  const count = new Map<string, number>()
  for (const card of cards) count.set(card.cat, (count.get(card.cat) || 0) + 1)
  const orphans = [...count.entries()].filter(([, n]) => n === 1).map(([c]) => c)
  // 3. 孤儿数量超阈值 → 全部并入「其他」
  if (orphans.length > ORPHAN_CAT_MERGE_THRESHOLD) {
    const orphanSet = new Set(orphans)
    orphanSet.delete(DOC_CAT_FALLBACK)
    for (const card of cards) {
      if (orphanSet.has(card.cat)) card.cat = DOC_CAT_FALLBACK
    }
  }
}

/**
 * 从最终卡片列表收敛出实际使用的分类清单（去重，保序），写入 DocMeta.categories。
 * 保证「清单与卡片最终一致」。
 */
export function collectUsedCategories(cards: Omit<Question, 'id'>[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const c of cards) {
    if (!seen.has(c.cat)) {
      seen.add(c.cat)
      result.push(c.cat)
    }
  }
  return result
}
