// 文件解析：把上传的 md/docx/pdf 读入内存并解析为纯文本。
// 原始文件仅在内存中处理，用完即弃，绝不上传、绝不写 localStorage（见技术方案 §1）。
//
// 依赖：
//   - mammoth：docx → 纯文本（浏览器版 extractRawText）
//   - pdfjs-dist：pdf 逐页 getTextContent 拼接
// 这两个库体积较大，改用动态 import 按需加载（仅用户点上传解析时才拉取），避免拖慢首屏。
// pdfjs worker 用 Vite 的 ?url 方式加载，Vite 会产出带 base 前缀的正确 URL，规避生产 base 下 404。

import type { PDFDocumentProxy } from 'pdfjs-dist'

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

// 懒加载并配置 pdfjs（worker 只需配置一次）
let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null
async function loadPdfjs(): Promise<typeof import('pdfjs-dist')> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist')
      // Vite 会把 worker 资源打包并产出带 base 前缀的正确 URL，规避 base=/page/... 下 404
      const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
      return pdfjs
    })()
  }
  return pdfjsPromise
}

async function parsePdf(file: File): Promise<string> {
  const pdfjs = await loadPdfjs()
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) })
  let doc: PDFDocumentProxy
  try {
    doc = await loadingTask.promise
  } catch (e: any) {
    // 加密 / 损坏 / 非法 PDF
    if (e?.name === 'PasswordException') throw new Error('该 PDF 已加密，无法解析')
    throw new Error('PDF 解析失败，文件可能已损坏或加密')
  }
  const parts: string[] = []
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((it: any) => (typeof it.str === 'string' ? it.str : ''))
        .join(' ')
      parts.push(pageText)
    }
  } finally {
    // 释放 pdf 文档资源
    await loadingTask.destroy()
  }
  return parts.join('\n\n')
}

/**
 * 解析上传文件为纯文本。
 * @throws 文本为空 / 解析异常时抛出可读错误
 */
export async function parseFile(file: File): Promise<ParseResult> {
  const ext = fileExt(file.name)
  let text = ''
  let type = ext

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
    text = await parsePdf(file)
    type = 'pdf'
  } else {
    throw new Error('不支持的文件类型')
  }

  text = cleanText(text)
  if (text.length === 0) {
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
