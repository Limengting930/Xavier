// Kimi (Moonshot) API 封装
// 注意：前端临时方案，API Key 走 VITE_KIMI_API_KEY，打包后会暴露在 bundle 中，
// 仅用于本地/个人验证，正式上线需改为后端代理转发。

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const API_URL = 'https://api.moonshot.cn/v1/chat/completions'
const API_KEY = import.meta.env.VITE_KIMI_API_KEY as string
const MODEL = 'moonshot-v1-8k'

/** 发送给 API 的软 token 预算：超过则从最老对话开始截断（moonshot-v1-8k 上限 8K，留足输出空间） */
export const TOKEN_BUDGET = 5000
/** 无论如何都保留的最近对话轮数（user+assistant 计为一条条消息） */
export const KEEP_RECENT = 8

/** 当前卡片上下文（字段均可选） */
export interface CardContext {
  cat?: string
  q?: string
  summary?: string
  a?: string
  pitfalls?: string
  interview?: string[]
}

/**
 * 构建固定的 System Prompt。
 * 只包含 AI 身份、风格、防幻觉边界约束，不含任何卡片信息，整个会话恒定不变。
 */
export function buildSystemPrompt(): Message {
  return {
    role: 'system',
    content: [
      '你是「背了吗」App 的 AI 学习助手，名叫「兔叽咪」，专门帮助用户理解前端面试知识点。',
      '',
      '【回答风格】简洁准确，适合面试准备；可使用 Markdown 格式（加粗、列表、代码块）。',
      '',
      '【重要约束，务必遵守】',
      '1. 对话中会以「当前题目背景」的形式给出用户正在学习的题目及其标准答案，回答该题相关问题时，必须优先依据给定的标准答案，不得脱离答案自行编造。',
      '2. 如果标准答案没有涵盖用户所问的内容，明确说明「这道题的标准答案未涉及，以下为补充说明」，再谨慎作答；不要伪装成标准答案的一部分。',
      '3. 严禁编造不存在的 API、参数、配置项、版本号或链接。不确定时直接说「我不确定」，不要杜撰。',
      '4. 用户可能连续学习多道题目，请严格按对话中出现的先后顺序区分「第一题、第二题……」，不要把当前题目误当成之前的题目。',
    ].join('\n'),
  }
}

/**
 * 构建一条「卡片背景」消息，用于在用户切换到新题目、首次提问前插入对话历史。
 * 使用 system 角色（中途系统提示），写入后固化在历史中，不再随翻卡改动。
 */
export function buildCardContextMessage(card: CardContext): Message {
  const parts: string[] = [
    '【当前题目背景】以下是用户此刻正在学习的题目及标准答案，请在回答与本题相关的问题时优先依据它：',
    card.cat ? `分类：${card.cat}` : '',
    `题目：${card.q ?? ''}`,
    card.summary ? `要点：${card.summary}` : '',
    card.a ? `标准答案：\n${card.a}` : '',
    card.pitfalls ? `易错点：${card.pitfalls}` : '',
    card.interview?.length ? `高频面试问法：\n${card.interview.map((q) => `- ${q}`).join('\n')}` : '',
  ].filter(Boolean)
  return { role: 'system', content: parts.join('\n') }
}

/**
 * 粗略估算文本 token 数（前端无 tokenizer，用经验值）：
 * 中日韩字符 ≈ 1 token/字，其余（英文/符号/空白）≈ 1 token/4 字符。
 */
export function estimateTokens(text: string): number {
  let cjk = 0
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    // 常见 CJK 统一表意 + 假名 + 全角标点范围
    if (code >= 0x3000 && code <= 0x9fff) cjk++
  }
  const rest = text.length - cjk
  return cjk + Math.ceil(rest / 4)
}

function tokensOf(m: Message): number {
  // +4 粗略计入 role / 分隔符开销
  return estimateTokens(m.content) + 4
}

/**
 * 组装并按 token 预算截断发送给 API 的消息列表（滑动窗口 + token 预算）。
 * 保护策略：
 *  - System Prompt 固定置顶，永不截断；
 *  - history 中的 system 消息（各卡片背景）受保护，保持在历史中的原始位置，不被丢弃；
 *  - 普通对话（user/assistant）从最老的开始丢弃，直到总量落入预算；
 *  - 无论预算如何，至少保留最近 KEEP_RECENT 条普通对话。
 * 保持所有保留消息的原始先后顺序（保证「第一题/第二题」的时间线正确）。
 */
export function buildApiMessages(
  system: Message,
  history: Message[],
  budget: number = TOKEN_BUDGET,
): Message[] {
  // 固定开销：System Prompt + 所有卡片背景（system 消息，受保护）
  const protectedTokens =
    tokensOf(system) +
    history.filter((m) => m.role === 'system').reduce((s, m) => s + tokensOf(m), 0)

  // 普通对话在原数组中的下标（保序）
  const chatIdx = history
    .map((m, i) => (m.role !== 'system' ? i : -1))
    .filter((i) => i >= 0)

  // 从最新往回决定保留哪些普通对话
  const keepChatIdx = new Set<number>()
  let used = protectedTokens
  for (let k = chatIdx.length - 1; k >= 0; k--) {
    const i = chatIdx[k]
    const t = tokensOf(history[i])
    const mustKeep = chatIdx.length - k <= KEEP_RECENT
    if (used + t <= budget || mustKeep) {
      keepChatIdx.add(i)
      used += t
    } else {
      break
    }
  }

  // 按原始顺序回填：保留所有 system（卡片背景）+ 被选中的普通对话
  const kept = history.filter(
    (m, i) => m.role === 'system' || keepChatIdx.has(i),
  )
  return [system, ...kept]
}

/** 流式结束原因 */
export type StreamFinish =
  | 'done' // 收到 [DONE]，正常完整结束
  | 'stop' // finish_reason=stop，模型自然说完
  | 'length' // finish_reason=length，撞 max_tokens 被截断（内容未说完）
  | 'content_filter' // 被内容审核截断

/**
 * 流式调用 Kimi (Moonshot)，保证前端重组后的消息「有序且完整」。
 *
 * 完整性由三道防线保证：
 *  1. 字节层：TextDecoder stream 模式 + 结束 flush，杜绝多字节字符被拆成乱码、残留字节丢失；
 *  2. 事件层：buffer 累积、按行切分且最后一段永远留存、兼容 \r\n/\r/\n、循环后处理残留；
 *  3. 语义层：必须收到 [DONE] 才算正常完整；否则（提前 done / 网络断）抛错，绝不静默当成成功。
 *
 * @returns 结束原因；正常为 'done'/'stop'，'length'/'content_filter' 表示内容被截断
 * @throws  连接中途断开且未收到 [DONE] 时抛出「响应未完整结束」错误
 */
export async function streamChat(
  messages: Message[],
  onChunk: (text: string) => void,
  onDone: () => void,
  signal?: AbortSignal,
): Promise<StreamFinish> {
  const res = await fetch(API_URL, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: true,
      max_tokens: 1024,
      temperature: 0.3,
    }),
  })

  if (!res.ok) throw new Error(`Kimi API error: ${res.status}`)
  if (!res.body) throw new Error('Kimi API: 响应体为空')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let gotDone = false // 是否收到 [DONE]
  let finishReason: StreamFinish | null = null

  // 处理一批完整行；返回 true 表示遇到 [DONE] 可提前结束
  const consumeLines = (lines: string[]): boolean => {
    for (const raw of lines) {
      const line = raw.trim()
      if (!line || line.startsWith(':')) continue // 空行 / SSE 注释行，跳过
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') {
        gotDone = true
        return true
      }
      let json: {
        choices?: { delta?: { content?: string }; finish_reason?: string | null }[]
      }
      try {
        json = JSON.parse(data)
      } catch {
        // data 行应当是合法 JSON，解析失败说明该片段损坏
        throw new Error('SSE 数据片段解析失败，响应可能已损坏')
      }
      const choice = json.choices?.[0]
      const text = choice?.delta?.content
      if (text) onChunk(text)
      const fr = choice?.finish_reason
      if (fr === 'length') finishReason = 'length'
      else if (fr === 'content_filter') finishReason = 'content_filter'
      else if (fr === 'stop') finishReason = 'stop'
    }
    return false
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    // 防线 1：stream 模式解码，多字节字符跨包不产生乱码
    buffer += decoder.decode(value, { stream: true })
    // 防线 2：兼容三种换行；最后一段可能不完整，留到下次
    const parts = buffer.split(/\r\n|\r|\n/)
    buffer = parts.pop() ?? ''
    if (consumeLines(parts)) {
      onDone()
      return 'done'
    }
  }

  // 防线 1 收尾：flush 解码器内部残留字节
  buffer += decoder.decode()
  // 防线 2 收尾：处理 buffer 中最后一个可能没带换行符的完整行
  if (buffer) consumeLines(buffer.split(/\r\n|\r|\n/))

  // 防线 3：未收到 [DONE] 即为异常截断，抛错让上层感知，绝不静默成功
  if (!gotDone) {
    throw new Error('响应未完整结束（连接中断，未收到结束标记）')
  }

  onDone()
  return finishReason ?? 'done'
}
