// 分块：把纯文本切成语义块，供逐块生成卡片。
// 策略优先语义边界（Markdown 标题 / 空行段落），token 兜底二次切分，过小相邻块合并。
// chunk 只在内存中，不持久化（见技术方案 §10）。

import { estimateTokens } from './kimi'
import { CHUNK_MAX_TOKENS, CHUNK_MIN_TOKENS, MAX_CHUNKS } from '../types'

export interface Chunk {
  title: string
  content: string
}

export interface ChunkResult {
  chunks: Chunk[]
  /** 是否因超出 MAX_CHUNKS 而截断（上层据此提示只处理了前部分） */
  truncated: boolean
}

// 是否存在 Markdown 标题结构
function hasMarkdownHeadings(text: string): boolean {
  return /^#{1,6}\s+\S/m.test(text)
}

// 按 Markdown 标题切分：标题行作为 title，标题到下个标题之间为 content
function splitByHeadings(text: string): Chunk[] {
  const lines = text.split('\n')
  const chunks: Chunk[] = []
  let curTitle = ''
  let curBody: string[] = []
  const flush = () => {
    const content = curBody.join('\n').trim()
    if (curTitle || content) chunks.push({ title: curTitle, content })
    curBody = []
  }
  for (const line of lines) {
    const m = /^(#{1,6})\s+(.*)$/.exec(line)
    if (m) {
      flush()
      curTitle = m[2].trim()
    } else {
      curBody.push(line)
    }
  }
  flush()
  return chunks.filter(c => c.title || c.content)
}

// 无标题结构：按空行分段聚合成块（连续非空行为一段）
function splitByParagraphs(text: string): Chunk[] {
  const paras = text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
  return paras.map((p, i) => ({ title: `段落 ${i + 1}`, content: p }))
}

// 按段落边界把过长块二次切分（token 兜底）
function splitLongChunk(chunk: Chunk): Chunk[] {
  if (estimateTokens(chunk.content) <= CHUNK_MAX_TOKENS) return [chunk]
  const paras = chunk.content.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
  const result: Chunk[] = []
  let buf: string[] = []
  let bufTokens = 0
  let part = 1
  const flush = () => {
    if (!buf.length) return
    result.push({
      title: part === 1 ? chunk.title : `${chunk.title}（续 ${part}）`,
      content: buf.join('\n\n'),
    })
    part++
    buf = []
    bufTokens = 0
  }
  for (const p of paras) {
    const t = estimateTokens(p)
    if (bufTokens > 0 && bufTokens + t > CHUNK_MAX_TOKENS) flush()
    buf.push(p)
    bufTokens += t
  }
  flush()
  return result.length ? result : [chunk]
}

// 合并过小的相邻块（< CHUNK_MIN_TOKENS），避免产出零碎卡片
function mergeSmall(chunks: Chunk[]): Chunk[] {
  const result: Chunk[] = []
  for (const c of chunks) {
    const prev = result[result.length - 1]
    if (prev && estimateTokens(prev.content) < CHUNK_MIN_TOKENS) {
      prev.content = (prev.content + '\n\n' + (c.title ? `${c.title}\n` : '') + c.content).trim()
    } else {
      result.push({ ...c })
    }
  }
  return result
}

/**
 * 主分块入口。空文本返回空块；超 MAX_CHUNKS 只保留前 MAX_CHUNKS 并标记 truncated。
 */
export function chunk(text: string): ChunkResult {
  const trimmed = text.trim()
  if (!trimmed) return { chunks: [], truncated: false }

  let base = hasMarkdownHeadings(trimmed)
    ? splitByHeadings(trimmed)
    : splitByParagraphs(trimmed)

  // 丢弃 content 为空的纯标题块（会与下一块合并；这里直接过滤空内容）
  base = base.filter(c => c.content.trim().length > 0)

  // token 二次切分
  let expanded: Chunk[] = []
  for (const c of base) expanded.push(...splitLongChunk(c))

  // 合并过小块
  expanded = mergeSmall(expanded)

  const truncated = expanded.length > MAX_CHUNKS
  const chunks = truncated ? expanded.slice(0, MAX_CHUNKS) : expanded
  return { chunks, truncated }
}
