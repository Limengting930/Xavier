import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { Dispatch, SetStateAction } from 'react'
import { marked } from 'marked'
import {
  streamChat,
  buildSystemPrompt,
  buildCardContextMessage,
  buildApiMessages,
  type Message,
  type CardContext,
} from '../../utils/kimi'
import botAvatarUrl from '../../assets/home.webp'

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

export interface ChatMessage {
  id: string
  /** 界面角色：user / assistant。卡片背景消息用 assistant 占位但 hidden 不显示 */
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
  /** 发给 API 时使用的真实角色（卡片背景为 system），缺省时等同 role */
  apiRole?: Message['role']
  /** 仅用于发给模型的上下文消息，不在界面渲染 */
  hidden?: boolean
  /** 该条 assistant 回答生成失败/中断，可重新生成 */
  error?: boolean
}

/** 首条欢迎消息（清空 / 首次进入时使用） */
export function welcomeMessage(): ChatMessage {
  return {
    id: uid(),
    role: 'assistant',
    content:
      '你好呀搭档！我是兔叽咪。你的 AI 学习助手~ ✨\n\n你可以问我各种学习问题，比如知识点解释、题目分析、学习建议等。\n\n你想问点什么呢？',
  }
}

/** 快捷问题按钮 */
const QUICK_ACTIONS: { label: string; icon: 'bulb' | 'book' | 'star'; prompt: string }[] = [
  { label: '举个例子', icon: 'bulb', prompt: '结合当前这道题的标准答案，举一个具体、贴近实际开发的例子帮我理解。' },
  { label: '相关题目', icon: 'book', prompt: '基于这道题的知识点，列出几道面试中常一起考的相关题目，并简要说明各自的考点。' },
  { label: '学习建议', icon: 'star', prompt: '针对这道题涉及的知识点，给我一些记忆技巧和高效学习建议。' },
]

interface Props {
  /** 当前卡片信息（card-back 时传入，含题目+标准答案，用于 System Prompt） */
  currentCard?: CardContext
  /** 聊天记录由父组件（LearnPage）持有，跨卡片保留 */
  messages: ChatMessage[]
  /** 直接透传父组件 useState 的 setter，支持函数式更新 */
  onMessagesChange: Dispatch<SetStateAction<ChatMessage[]>>
}

// ─── 内联图标 ───
function BotAvatar({ size = 34 }: { size?: number }) {
  return (
    <img
      className="aichat-bot-face"
      src={botAvatarUrl}
      alt=""
      width={size}
      height={size}
      style={{ display: 'block', width: size, height: size, objectFit: 'contain' }}
    />
  )
}

function SendIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 12l16-7-7 16-2.5-6.5L4 12z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function RegenIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M20 11a8 8 0 10-1.6 6M20 5v6h-6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function QuickIcon({ type, size = 15 }: { type: 'bulb' | 'book' | 'star'; size?: number }) {
  const c = 'var(--accent)'
  if (type === 'bulb')
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.8.8 1 1.3 1 2.5h6c0-1.2.2-1.7 1-2.5A6 6 0 0012 3z" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  if (type === 'book')
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M4 5.5A2.5 2.5 0 016.5 3H12v16H6.5A2.5 2.5 0 004 21.5v-16zM20 5.5A2.5 2.5 0 0017.5 3H12v16h5.5a2.5 2.5 0 012.5 2.5v-16z" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export default function AIChatBot({ currentCard, messages, onMessagesChange }: Props) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // 记录上次已注入卡片背景的题目（用题干区分卡片），切卡后首次提问才重新注入
  const lastInjectedQRef = useRef<string | null>(null)

  // 首次打开且无记录时插入欢迎语
  useEffect(() => {
    if (open && messages.length === 0) {
      onMessagesChange([welcomeMessage()])
    }
  }, [open, messages.length, onMessagesChange])

  // 滚动消息容器到底部。smooth=平滑（新消息），auto=瞬时（重开面板对齐最新内容）
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = bodyRef.current
    if (!el) return // 面板关闭时容器不存在，直接跳过
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  // 新消息 / 流式片段到来时滚到底部（仅面板打开时）
  useEffect(() => {
    if (open) scrollToBottom('smooth')
  }, [messages, open, scrollToBottom])

  // 重新打开面板时，DOM 重建后瞬时对齐到最新内容（修复关闭期间滚动未跟进导致的“停住”视觉）
  useEffect(() => {
    if (open) requestAnimationFrame(() => scrollToBottom('auto'))
  }, [open, scrollToBottom])

  // 注意：不在打开面板时自动聚焦输入框，避免首次进入即弹出软键盘（移动端体验）


  // 组件卸载时中断请求
  useEffect(() => () => abortRef.current?.abort(), [])

  // 流式执行核心：向 API 发送 apiMessages，把结果写进 id 为 asstId 的占位消息。
  // 首次发送与「重新生成」共用此函数。
  const runStream = useCallback(
    async (asstId: string, apiMessages: Message[]) => {
      setLoading(true)
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const finish = await streamChat(
          apiMessages,
          (chunk) => {
            onMessagesChange((prev) =>
              prev.map((m) => (m.id === asstId ? { ...m, content: m.content + chunk } : m)),
            )
          },
          () => {
            onMessagesChange((prev) =>
              prev.map((m) => (m.id === asstId ? { ...m, loading: false, error: false } : m)),
            )
            setLoading(false)
          },
          controller.signal,
        )
        // 撞 max_tokens 上限：内容未说完，追加提示并标记可重新生成
        if (finish === 'length') {
          onMessagesChange((prev) =>
            prev.map((m) =>
              m.id === asstId
                ? { ...m, content: m.content + '\n\n_（回答较长已截断，可重新生成或追问「继续」）_', error: true }
                : m,
            ),
          )
        }
      } catch (e: unknown) {
        if ((e as Error).name === 'AbortError') return
        // 保留已流式生成的内容，末尾追加中断提示并标记可重新生成，绝不丢弃已读部分
        onMessagesChange((prev) =>
          prev.map((m) => {
            if (m.id !== asstId) return m
            const partial = m.content.trim()
            return {
              ...m,
              content: partial ? partial + '\n\n_（回答生成中断）_' : '请求失败，请稍后重试',
              loading: false,
              error: true,
            }
          }),
        )
        setLoading(false)
      }
    },
    [onMessagesChange],
  )

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || loading) return

      setInput('')

      // 切卡后首次提问：把当前卡片背景作为一条隐藏历史消息（固化，不随后续翻卡改动）
      const needInjectCard =
        !!currentCard?.q && currentCard.q !== lastInjectedQRef.current
      const cardMsg: ChatMessage | null = needInjectCard
        ? {
            id: uid(),
            role: 'assistant',
            hidden: true,
            apiRole: 'system',
            content: buildCardContextMessage(currentCard!).content,
          }
        : null
      if (needInjectCard) lastInjectedQRef.current = currentCard!.q ?? null

      const asstId = uid()
      const userMsg: ChatMessage = { id: uid(), role: 'user', content: trimmed }
      const asstMsg: ChatMessage = { id: asstId, role: 'assistant', content: '', loading: true }

      // 组装发给 API 的历史（含刚插入的卡片背景），映射真实角色、去掉 loading 空消息
      const history: Message[] = [
        ...messages
          .filter((m) => !m.loading && m.content)
          .map((m) => ({ role: m.apiRole ?? m.role, content: m.content }) as Message),
        ...(cardMsg ? [{ role: 'system', content: cardMsg.content } as Message] : []),
        { role: 'user', content: trimmed },
      ]
      // System Prompt 固定 + 滑动窗口/token 预算截断（system 与卡片背景受保护）
      const apiMessages = buildApiMessages(buildSystemPrompt(), history)

      onMessagesChange((prev) => [
        ...prev,
        ...(cardMsg ? [cardMsg] : []),
        userMsg,
        asstMsg,
      ])

      await runStream(asstId, apiMessages)
    },
    [loading, messages, currentCard, onMessagesChange, runStream],
  )

  // 重新生成某条 assistant 回答：清空其内容，用它之前的历史重新请求
  const regenerate = useCallback(
    async (asstId: string) => {
      if (loading) return
      const idx = messages.findIndex((m) => m.id === asstId)
      if (idx < 0) return

      // 取该回答之前的历史（不含它自己），映射为 API 消息
      const history: Message[] = messages
        .slice(0, idx)
        .filter((m) => !m.loading && m.content)
        .map((m) => ({ role: m.apiRole ?? m.role, content: m.content }) as Message)
      const apiMessages = buildApiMessages(buildSystemPrompt(), history)

      // 丢弃该回答之后的所有消息，并把它重置为 loading 占位（保持同一 id 与位置）
      onMessagesChange((prev) => {
        const i = prev.findIndex((m) => m.id === asstId)
        if (i < 0) return prev
        const kept = prev.slice(0, i)
        return [...kept, { id: asstId, role: 'assistant', content: '', loading: true }]
      })

      await runStream(asstId, apiMessages)
    },
    [loading, messages, onMessagesChange, runStream],
  )

  const send = useCallback(() => sendText(input), [sendText, input])

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
    e.stopPropagation() // 阻止冒泡到 LearnPage 的全局快捷键
  }

  const clearChat = () => {
    abortRef.current?.abort()
    setLoading(false)
    lastInjectedQRef.current = null // 清空后下次提问需重新注入卡片背景
    onMessagesChange([welcomeMessage()])
  }

  // 通过 Portal 挂到 body，脱离 .card-back 的 transform/overflow 上下文，
  // 保证 position:fixed 相对视口生效（悬浮按钮滚动不动、面板浮于卡片之上）
  return createPortal(
    <>
      {/* 悬浮机器人按钮（固定右下角） */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="AI 助手"
        className={`aichat-fab${open ? ' active' : ''}`}
      >
        <BotAvatar size={40} />
      </button>

      {/* 对话面板 */}
      {open && (
        <div className="aichat-panel" onClick={(e) => e.stopPropagation()}>
          {/* 顶栏 */}
          <div className="aichat-header">
            <div className="aichat-header-avatar">
              <BotAvatar size={34} />
            </div>
            <div className="aichat-header-info">
              <div className="aichat-header-title">
                兔叽咪
              </div>
              <div className="aichat-header-sub">搭档，闪来了！</div>
            </div>
            <div className="aichat-header-actions">
              <button type="button" className="aichat-icon-btn" onClick={clearChat} aria-label="清空">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <button type="button" className="aichat-icon-btn" onClick={() => setOpen(false)} aria-label="关闭">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* 消息列表 */}
          <div className="aichat-body" ref={bodyRef}>
            {messages.filter((m) => !m.hidden).map((msg) => (
              <div key={msg.id} className={`aichat-row ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="aichat-msg-avatar">
                    <BotAvatar size={30} />
                  </div>
                )}
                <div className={`aichat-bubble ${msg.role}`}>
                  {msg.content ? (
                    msg.role === 'assistant' ? (
                      <div
                        className="aichat-md"
                        dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) as string }}
                      />
                    ) : (
                      <span className="aichat-plain">{msg.content}</span>
                    )
                  ) : (
                    msg.loading && (
                      <span className="aichat-typing">
                        <i /><i /><i />
                      </span>
                    )
                  )}
                  {msg.loading && msg.content && <span className="aichat-caret">▌</span>}
                </div>
                {msg.role === 'assistant' && msg.error && !msg.loading && (
                  <button
                    type="button"
                    className="aichat-regen"
                    disabled={loading}
                    onClick={() => regenerate(msg.id)}
                  >
                    <RegenIcon size={13} />
                    重新生成
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* 快捷按钮 */}
          <div className="aichat-quick">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                type="button"
                className="aichat-quick-btn"
                disabled={loading}
                onClick={() => sendText(a.prompt)}
              >
                <QuickIcon type={a.icon} />
                {a.label}
              </button>
            ))}
          </div>

          {/* 输入区 */}
          <div className="aichat-input-bar">
            <textarea
              ref={inputRef}
              className="aichat-input"
              rows={1}
              placeholder="有问题尽管问我..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <button
              type="button"
              className="aichat-send"
              disabled={loading || !input.trim()}
              onClick={send}
              aria-label="发送"
            >
              <SendIcon size={20} />
            </button>
          </div>
        </div>
      )}
    </>,
    document.body,
  )
}
