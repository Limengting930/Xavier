import { useState, useRef, useCallback } from 'react'
import { useApp } from '../store'
import type { DocMeta } from '../types'
import {
  MAX_FILE_SIZE,
  SUPPORTED_EXT,
  DOC_CAT_FALLBACK,
  CUSTOM_CARDS_SOFT_LIMIT,
  MIN_DOC_CONTENT_CHARS,
  BUILTIN_DECK_NAME,
} from '../types'
import { parseFile, hashText, contentFingerprint, fileExt } from '../utils/docParser'
import { chunk } from '../utils/chunker'
import { generateCategories, generateCards, collectUsedCategories } from '../utils/cardGen'
import CatSearchImage from './library/CatSearchImage'

interface Props {
  onClose: () => void
  /** 生成成功后「在题库查看」：切回题库页（本组件在题库页，直接关闭即可，但保留语义接口） */
  onGoLibrary: () => void
  /** 更新模式：传入则为「往已存在题库追加」，不传为「新建题库」 */
  updateTarget?: { docId: string; docName: string; categories: string[] }
}

type Phase = 'idle' | 'naming' | 'parsing' | 'generating' | 'success' | 'error'

// uuid 生成（带降级）
function genUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'doc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10)
}

const ACCEPT = SUPPORTED_EXT.map(e => '.' + e).join(',')

export default function UploadSheet({ onClose, onGoLibrary, updateTarget }: Props) {
  const { state, dispatch, allCards } = useApp()
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 })
  const [message, setMessage] = useState('')
  const [resultCount, setResultCount] = useState(0)
  // 新建模式：选文件后先让用户为题库命名（默认文件名）
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [deckName, setDeckName] = useState('')
  const [nameError, setNameError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const isUpdate = !!updateTarget

  // 关闭：中断在途请求，不写半成品
  const handleClose = useCallback(() => {
    abortRef.current?.abort()
    onClose()
  }, [onClose])

  const runPipeline = useCallback(async (file: File, nameOverride?: string) => {
    // 新建模式题库名：优先用用户重命名的值，否则回退文件名
    const deckDisplayName = (nameOverride && nameOverride.trim()) || file.name
    // 1. 校验类型
    const ext = fileExt(file.name)
    if (ext === 'doc') {
      setPhase('error'); setMessage('暂不支持 .doc，请转存为 .docx 后再上传')
      return
    }
    if (!(SUPPORTED_EXT as readonly string[]).includes(ext)) {
      setPhase('error'); setMessage(`不支持的文件类型，支持：${SUPPORTED_EXT.join(' / ')}`)
      return
    }
    // 2. 校验大小
    if (file.size > MAX_FILE_SIZE) {
      setPhase('error'); setMessage('文件过大，请控制在 5MB 内或拆分')
      return
    }

    const controller = new AbortController()
    abortRef.current = controller

    try {
      // 3. 解析
      setPhase('parsing'); setMessage('正在解析文档…')
      const { text, type } = await parseFile(file)

      // 3.1 空态校验：去空白后有效字符过少（如只有标题、正文为空）→ 视为空文档，拦截
      if (text.replace(/\s/g, '').length < MIN_DOC_CONTENT_CHARS) {
        setPhase('error'); setMessage('当前文档为空')
        return
      }

      // 4. 文档去重（新建 / 更新语义不同）。
      //    - fingerprint：归一化内容指纹，跨格式判重（同一份内容的 docx/md/pdf 互相拦截）。
      //    - hash：解析后纯文本精确 hash，兼容无 fingerprint 的老数据。
      const hash = await hashText(text)
      const fingerprint = await contentFingerprint(text)
      const docs = state.store.documents || []
      // 命中判定：优先按内容指纹（跨格式）；老数据无 fingerprint 时回退按精确 hash
      const dupHit = docs.find(d =>
        d.fingerprint ? d.fingerprint === fingerprint : d.hash === hash,
      )
      if (isUpdate) {
        // 更新模式：命中同 docId → 内容无变化；命中别的 docId → 该内容其实属于另一个题库
        if (dupHit && dupHit.docId === updateTarget!.docId) {
          setPhase('error'); setMessage('文档内容无变化，无需更新')
          return
        }
        if (dupHit && dupHit.docId !== updateTarget!.docId) {
          setPhase('error'); setMessage(`该内容已作为《${dupHit.name}》导入过`)
          return
        }
      } else {
        // 新建模式：命中任意题库即拦截（含"同内容的其他格式"）
        if (dupHit) {
          setPhase('error')
          setMessage(`该文档已导入过（《${dupHit.name}》，可能是同内容的其他格式，已生成 ${dupHit.cardCount} 张卡）`)
          return
        }
      }

      // 5. 分块
      const { chunks, truncated } = chunk(text)
      if (chunks.length === 0) {
        setPhase('error'); setMessage('文档内容过少，未生成卡片')
        return
      }

      // 6. 阶段一：受控分类清单。
      // 更新模式优先复用「该题库已有分类」+ 全库现有分类；新建模式用全库现有分类。
      setPhase('generating'); setProgress({ done: 0, total: chunks.length })
      setMessage(truncated ? '文档较大，仅处理前部分内容…' : '正在归纳知识点分类…')
      const existingCats = [
        ...new Set([
          ...(isUpdate ? updateTarget!.categories : []),
          ...allCards().map(c => c.cat),
        ]),
      ]
      const docNameForGen = isUpdate ? updateTarget!.docName : deckDisplayName
      let categories: string[] = []
      try {
        categories = await generateCategories(chunks, docNameForGen, existingCats, controller.signal)
      } catch (e: any) {
        if (e?.name === 'AbortError') return
        // 阶段一失败降级：用 chunk title 去重
        categories = []
      }
      if (categories.length === 0) {
        categories = [...new Set(chunks.map(c => c.title).filter(Boolean))]
        if (categories.length === 0) categories = [DOC_CAT_FALLBACK]
      }

      // 7. 阶段二：逐块生成卡片
      setMessage('正在生成卡片…')
      const { cards, failedChunks } = await generateCards(
        chunks,
        docNameForGen,
        categories,
        (done, total) => setProgress({ done, total }),
        controller.signal,
      )

      // 8. 卡片级去重（跨文档完全相同 q；更新模式同样对全库去重，避免与旧卡重复）
      const existQ = new Set(allCards().map(c => normQ(c.q)))
      const deduped = cards.filter(c => {
        const key = normQ(c.q)
        if (existQ.has(key)) return false
        existQ.add(key)
        return true
      })

      if (deduped.length === 0) {
        // 全部块失败或无有效卡（更新场景：可能全是重复卡）
        setPhase('error')
        if (isUpdate && failedChunks < chunks.length) {
          setMessage('未发现新增内容，题库未变化')
        } else {
          setMessage(failedChunks >= chunks.length
            ? 'AI 未能解析该文档内容，请稍后重试'
            : '未能从该文档生成有效卡片')
        }
        return
      }

      // 9. 收敛最终分类清单 + 写入（新建 vs 追加）
      // 写入前再确认未被中断：防止用户在生成末尾、dispatch 前点了「取消生成」仍写入半成品
      if (controller.signal.aborted) return
      const usedCats = collectUsedCategories(deduped)
      if (isUpdate) {
        dispatch({
          type: 'APPEND_TO_DOCUMENT',
          docId: updateTarget!.docId,
          cards: deduped,
          categories: usedCats,
          hash,
          fingerprint,
        })
      } else {
        const doc: DocMeta = {
          docId: genUuid(),
          name: deckDisplayName,
          type,
          hash,
          fingerprint,
          cardCount: deduped.length,
          categories: usedCats,
          createdAt: Date.now(),
        }
        dispatch({ type: 'ADD_GENERATED_CARDS', cards: deduped, doc })
      }

      // 10. 成功
      setResultCount(deduped.length)
      setPhase('success')
      const parts = [isUpdate ? `新增 ${deduped.length} 张卡片` : `成功生成 ${deduped.length} 张卡片`]
      if (truncated) parts.push('文档较大，仅处理了前部分内容')
      const totalCustom = state.store.custom.length + deduped.length
      if (totalCustom > CUSTOM_CARDS_SOFT_LIMIT) parts.push('本地卡片较多，建议清理')
      setMessage(parts.join('，'))
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      setPhase('error')
      const msg = String(e?.message || '')
      if (/未能从文档中提取|扫描版|加密|损坏|PDF|解析组件|docx/i.test(msg)) setMessage(msg)
      else if (/Kimi|API|fetch|network|Failed to fetch/i.test(msg)) setMessage('AI 服务暂不可用，请稍后重试')
      else setMessage(msg || '生成失败，请稍后重试')
    }
  }, [state.store.documents, state.store.custom, allCards, dispatch, isUpdate, updateTarget])

  const onPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // 允许重复选择同一文件：清空 value
    e.target.value = ''
    if (!file) return
    if (isUpdate) {
      // 更新模式：追加到已有题库，题库名固定，不需要重命名
      runPipeline(file)
      return
    }
    // 新建模式：先让用户为题库命名（默认取文件名去扩展名）
    const dot = file.name.lastIndexOf('.')
    const defaultName = dot > 0 ? file.name.slice(0, dot) : file.name
    setPendingFile(file)
    setDeckName(defaultName)
    setPhase('naming')
  }, [runPipeline, isUpdate])

  // 确认题库命名 → 开始生成
  const confirmName = useCallback(() => {
    if (!pendingFile) return
    const name = deckName.trim()
    if (!name) { setNameError('请输入题库名称'); return }
    // 重名校验：不能与已有题库（含内置题库）同名（trim 后比较）
    const norm = (s: string) => s.trim().toLowerCase()
    const dup = norm(name) === norm(BUILTIN_DECK_NAME)
      || (state.store.documents || []).some(d => norm(d.name) === norm(name))
    if (dup) { setNameError('已存在同名题库，请换一个名称'); return }
    const file = pendingFile
    setPendingFile(null)
    setNameError('')
    runPipeline(file, name)
  }, [pendingFile, deckName, runPipeline, state.store.documents])

  // 取消命名 → 回到初始态
  const cancelName = useCallback(() => {
    setPendingFile(null)
    setDeckName('')
    setNameError('')
    setPhase('idle')
  }, [])

  // 中断生成：终止在途 AI 请求，回到可重新选择文件的初始态（不关闭弹窗、不写半成品）
  const handleCancelGen = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setProgress({ done: 0, total: 0 })
    setMessage('')
    setPhase('idle')
  }, [])

  const busy = phase === 'parsing' || phase === 'generating'
  const pct = progress.total > 0 ? Math.round(progress.done / progress.total * 100) : 0

  return (
    <div className="overlay show" onClick={busy ? undefined : handleClose}>
      <div className="sheet upload-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-title">
          {isUpdate ? `更新题库《${updateTarget!.docName}》` : '上传文档生成卡片'}
          {!busy && <button className="sheet-close" onClick={handleClose} aria-label="关闭">×</button>}
        </div>

        {(phase === 'idle' || phase === 'error') && (
          <>
            <button className="upload-dropzone" onClick={() => inputRef.current?.click()}>
              <div className="upload-dz-icon">📄</div>
              <div className="upload-dz-title">{isUpdate ? '选择新文件追加' : '选择文件'}</div>
              <div className="upload-dz-sub">支持 {SUPPORTED_EXT.join(' / ')}，≤ 5MB</div>
            </button>
            <p className="upload-tip">
              {isUpdate
                ? '将解析新文件并把新增卡片追加到该题库，已学卡片的学习进度会保留。'
                : '文件仅在本地解析，不会上传服务器。生成的卡片进入现有题库与学习流程。'}
            </p>
            {phase === 'error' && <div className="upload-error">{message}</div>}
          </>
        )}

        {phase === 'naming' && (
          <div className="upload-naming-box">
            <div className="upload-naming-file" title={pendingFile?.name}>
              已选择：{pendingFile?.name}
            </div>
            <label className="upload-naming-label">题库名称</label>
            <input
              className="upload-naming-input"
              type="text"
              value={deckName}
              placeholder="为这个题库起个名字"
              maxLength={40}
              autoFocus
              onChange={e => { setDeckName(e.target.value); setNameError('') }}
              onKeyDown={e => { if (e.key === 'Enter') confirmName() }}
            />
            {nameError && <div className="upload-error">{nameError}</div>}
            <div className="upload-naming-actions">
              <button className="upload-btn" onClick={cancelName}>取消</button>
              <button
                className="upload-btn primary"
                disabled={!deckName.trim()}
                onClick={confirmName}
              >
                开始生成
              </button>
            </div>
          </div>
        )}

        {busy && (
          <div className="upload-progress-box">
            <div className="upload-progress-msg">{message}</div>
            {phase === 'generating' && (
              <>
                <div className="upload-progress-bar">
                  <div className="upload-progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="upload-progress-count">{progress.done} / {progress.total} 段</div>
              </>
            )}
            {phase === 'parsing' && <div className="upload-spinner" aria-hidden />}
            <button className="upload-cancel-btn" onClick={handleCancelGen}>
              取消生成
            </button>
          </div>
        )}

        {phase === 'success' && (
          <div className="upload-success-box">
            <div className="upload-success-emoji">
              <CatSearchImage size={80} />
            </div>
            <div className="upload-success-msg">{message}</div>
            <div className="upload-success-actions">
              <button className="upload-btn primary" onClick={() => { onGoLibrary(); onClose() }}>
                在题库查看
              </button>
            </div>
            <div className="upload-success-hint">已生成 {resultCount} 张卡片</div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          style={{ display: 'none' }}
          onChange={onPick}
        />
      </div>
    </div>
  )
}

// 题干归一化（去标点/空白、转小写）用于卡片级去重
function normQ(q: string): string {
  return q.toLowerCase().replace(/[\s\p{P}]/gu, '')
}
