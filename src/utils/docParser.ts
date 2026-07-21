// 文件解析：把上传的 md/docx/pdf 读入内存并解析为纯文本。
// 原始文件仅在内存中处理，用完即弃，绝不上传、绝不写 localStorage（见技术方案 §1）。
//
// 依赖：
//   - mammoth：docx → 纯文本（浏览器版 extractRawText）
//   - pdfjs-dist：pdf 逐页 getTextContent 拼接
// 这两个库体积较大，改用动态 import 按需加载（仅用户点上传解析时才拉取），避免拖慢首屏。
// pdfjs worker 用 Vite 的 ?url 方式加载，Vite 会产出带 base 前缀的正确 URL，规避生产 base 下 404。

import type { PDFDocumentProxy } from 'pdfjs-dist'

// ── polyfill：Uint8Array.prototype.toHex ──
// pdfjs-dist 6.x 内部使用了很新的 TC39 提案 API `Uint8Array.prototype.toHex`，
// 部分浏览器 / WebView 尚未实现，会抛 "a.toHex is not a function"。这里补上标准语义实现。
// 必须在（主线程）加载/运行 pdfjs 之前注入。
function installUint8ArrayHexPolyfill() {
  const proto = Uint8Array.prototype as any
  if (typeof proto.toHex !== 'function') {
    proto.toHex = function toHex(this: Uint8Array): string {
      let s = ''
      for (let i = 0; i < this.length; i++) s += this[i].toString(16).padStart(2, '0')
      return s
    }
  }
  const ctor = Uint8Array as any
  if (typeof ctor.fromHex !== 'function') {
    ctor.fromHex = function fromHex(hex: string): Uint8Array {
      const clean = String(hex)
      const out = new Uint8Array(clean.length >> 1)
      for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16)
      return out
    }
  }
  if (typeof proto.setFromHex !== 'function') {
    proto.setFromHex = function setFromHex(this: Uint8Array, hex: string) {
      const clean = String(hex)
      const len = Math.min(this.length, clean.length >> 1)
      for (let i = 0; i < len; i++) this[i] = parseInt(clean.substr(i * 2, 2), 16)
      return { read: len * 2, written: len }
    }
  }
}

export interface ParseResult {
  text: string
  type: string // 'md' | 'docx' | 'pdf' | 'txt'
}

/** 取文件扩展名（小写，不含点） */
export function fileExt(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

/** 基础清洗：合并 3+ 连续空行为 1 行、trim 行尾空白（不做激进清洗以免破坏结构） */
function cleanText(raw: string): string {
  return raw
    .split(/\r\n|\r|\n/)
    .map(line => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function parseDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  try {
    const mammoth = (await import('mammoth')).default
    const { value } = await mammoth.extractRawText({ arrayBuffer })
    return value || ''
  } catch {
    throw new Error('.docx 解析失败，文件可能已损坏')
  }
}

// 懒加载并配置 pdfjs
let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null
async function loadPdfjs(): Promise<typeof import('pdfjs-dist')> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      try {
        // 1) 先注入 toHex polyfill（主线程）
        installUint8ArrayHexPolyfill()
        const pdfjs = await import('pdfjs-dist')
        // 2) 把 worker 模块作为普通模块导入并挂到 globalThis.pdfjsWorker。
        //    pdfjs 检测到 globalThis.pdfjsWorker.WorkerMessageHandler 存在时，会走
        //    「主线程 fake worker」而不 new 独立 Worker（见 pdf.mjs #mainThreadWorkerMessageHandler）。
        //    好处：① worker 逻辑在主线程执行，能用到上面注入的 toHex polyfill；
        //         ② 不依赖 worker 文件 URL，规避 base 路径 404 / 版本不匹配。
        // @ts-expect-error pdf.worker.min.mjs 无类型声明，作为运行时模块导入即可
        const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.min.mjs')
        ;(globalThis as any).pdfjsWorker = pdfjsWorker
        return pdfjs
      } catch (e) {
        pdfjsPromise = null // 允许下次重试
        console.error('[pdf] pdfjs 加载失败：', e)
        throw new Error('PDF 解析组件加载失败，请检查网络或刷新后重试')
      }
    })()
  }
  return pdfjsPromise
}

async function parsePdf(file: File): Promise<{ text: string; pages: number; items: number }> {
  const pdfjs = await loadPdfjs()
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) })
  let doc: PDFDocumentProxy
  try {
    doc = await loadingTask.promise
  } catch (e: any) {
    // 打印原始错误，便于定位真实原因（worker 未加载 / 版本不匹配 / 加密 / 损坏）
    console.error('[pdf] getDocument 失败：', e)
    const msg = String(e?.message || e?.name || '')
    if (e?.name === 'PasswordException' || /password/i.test(msg)) {
      throw new Error('该 PDF 已加密，无法解析')
    }
    if (/worker|version|dynamically imported|Failed to fetch|importScripts/i.test(msg)) {
      throw new Error('PDF 解析组件加载失败，请刷新后重试（可能是网络或部署路径问题）')
    }
    if (/InvalidPDF|structure|corrupt/i.test(msg)) {
      throw new Error('PDF 文件已损坏，无法解析')
    }
    throw new Error(`PDF 解析失败：${msg || '未知错误'}`)
  }
  const parts: string[] = []
  let totalItems = 0
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p)
      const content = await page.getTextContent()
      totalItems += content.items.length
      const pageText = content.items
        .map((it: any) => (typeof it.str === 'string' ? it.str : ''))
        .join(' ')
      parts.push(pageText)
      if (p <= 3) {
        console.log(`[pdf] 第${p}页 items=${content.items.length} 文本长度=${pageText.length} 示例=`,
          JSON.stringify(pageText.slice(0, 80)))
      }
    }
    const joined = parts.join('\n\n')
    console.log(`[pdf] 共 ${doc.numPages} 页，items 合计=${totalItems}，提取文本总长度=${joined.trim().length}`)
    return { text: joined, pages: doc.numPages, items: totalItems }
  } finally {
    // 释放 pdf 文档资源
    await loadingTask.destroy()
  }
}

/**
 * 解析上传文件为纯文本。
 * @throws 文本为空 / 解析异常时抛出可读错误
 */
export async function parseFile(file: File): Promise<ParseResult> {
  const ext = fileExt(file.name)
  console.log('[parse] 开始解析文件：', file.name, ' 扩展名=', ext, ' 大小=', file.size)
  let text = ''
  let type = ext
  let pdfDiag = ''

  if (ext === 'md' || ext === 'markdown' || ext === 'txt') {
    text = await file.text()
    type = ext === 'txt' ? 'txt' : 'md'
  } else if (ext === 'docx') {
    text = await parseDocx(file)
    type = 'docx'
  } else if (ext === 'doc') {
    // 老二进制格式浏览器无可靠纯前端解析方案
    throw new Error('暂不支持 .doc，请转存为 .docx 后再上传')
  } else if (ext === 'pdf') {
    const r = await parsePdf(file)
    text = r.text
    pdfDiag = `（共${r.pages}页/文本对象${r.items}个）`
    type = 'pdf'
  } else {
    throw new Error('不支持的文件类型')
  }

  text = cleanText(text)
  console.log('[parse] 提取文本总长度=', text.length)
  if (text.length === 0) {
    if (ext === 'pdf') {
      throw new Error(`未能从 PDF 提取到文本${pdfDiag}。若文本对象为 0，是扫描版/图片 PDF；否则可能是字体问题，请把此提示发给开发者`)
    }
    throw new Error('未能从文档中提取到文本（可能是扫描版 PDF / 纯图片）')
  }
  return { text, type }
}

/**
 * 计算文本 SHA-256（去重用）。
 * 非安全上下文（crypto.subtle 不可用）降级为简单字符串 hash。
 */
export async function hashText(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const buf = new TextEncoder().encode(text)
      const digest = await crypto.subtle.digest('SHA-256', buf)
      return Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    } catch {
      // 落到下面的降级分支
    }
  }
  // 降级：简单字符串 hash（djb2 变体），非安全上下文兜底
  let h = 5381
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0
  }
  return 'fallback_' + (h >>> 0).toString(16) + '_' + text.length
}

/**
 * 归一化文本为"跨格式内容指纹源"：抹掉 Markdown 语法、空白、标点、大小写差异，
 * 使同一份内容的不同格式（.md 保留 # 标题、.docx 经 mammoth 转纯文本丢失 #）归一到
 * 几乎相同的字符流，从而可用于判断"本质是否同一份文档"。
 *
 * 注意：这是"绝大多数情况能拦、极端情况漏判"的启发式——若 docx 转换丢了个别字符，
 * 归一化后仍可能差几个字符导致漏判（已与产品口径确认接受）。
 */
export function normalizeForFingerprint(text: string): string {
  return text
    .toLowerCase()
    // 去代码围栏 / 行内反引号
    .replace(/```+/g, '')
    .replace(/`/g, '')
    // 去常见 Markdown 结构/强调符号：# > * _ ~ | 以及列表项符号、链接图片语法符号
    .replace(/[#>*_~|=]/g, '')
    .replace(/!?\[|\]|\(|\)/g, '')
    // 去所有空白（含全角空格）
    .replace(/[\s\u3000]+/g, '')
    // 去中英文常见标点（Unicode 标点类）
    .replace(/[\p{P}]/gu, '')
}

/**
 * 计算跨格式内容指纹（归一化后再算 SHA-256）。
 * 用于判断不同格式（docx / md / pdf）是否为同一份文档内容。
 */
export async function contentFingerprint(text: string): Promise<string> {
  return hashText(normalizeForFingerprint(text))
}
