import type { ReactNode } from 'react'
import {
  IconBook,
  IconSearch,
  IconTerminal,
  IconLayers,
  IconBarChart,
  IconPuzzle,
  IconRobot,
} from '../components/icons'

// fallback 图标池：未命中关键词时按 cat 字符串稳定派生，避免统计页图标全部雷同
const FALLBACK_ICONS = [IconBook, IconSearch, IconTerminal, IconLayers, IconBarChart, IconPuzzle, IconRobot] as const

// 简单稳定字符串 hash（djb2），用于在 fallback 图标池里选定一个
function hashString(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return h >>> 0
}

/**
 * 根据分类名匹配对应图标
 * - 在统计页 stats-cat-icon 与 题库 select 二级菜单里共用
 * - 颜色统一 var(--accent)，size 可传
 * - 未命中任何关键词时，按 cat 字符串稳定派生一个 fallback 图标（不全用 default），
 *   避免上传文档产生的新分类在统计页图标全部相同
 */
export function getCategoryIcon(catName: string, size = 18, color: string = 'var(--accent)'): ReactNode {
  if (catName.includes('概念') || catName.includes('基础') || catName.includes('HTML') || catName.includes('CSS'))
    return <IconBook size={size} color={color} />
  if (catName.includes('预训练') || catName.includes('微调') || catName.includes('搜索'))
    return <IconSearch size={size} color={color} />
  if (catName.includes('Prompt') || catName.includes('工程') || catName.includes('JS') || catName.includes('代码'))
    return <IconTerminal size={size} color={color} />
  if (catName.includes('多模态') || catName.includes('架构') || catName.includes('React') || catName.includes('Vue'))
    return <IconLayers size={size} color={color} />
  if (catName.includes('评估') || catName.includes('性能') || catName.includes('优化'))
    return <IconBarChart size={size} color={color} />
  if (catName.includes('推理') || catName.includes('部署') || catName.includes('工程化'))
    return <IconPuzzle size={size} color={color} />
  if (catName.includes('Agent') || catName.includes('工具') || catName.includes('Node'))
    return <IconRobot size={size} color={color} />
  // fallback：按 cat 字符串稳定派生，保证不同分类图标不雷同
  const Icon = FALLBACK_ICONS[hashString(catName || '') % FALLBACK_ICONS.length]
  return <Icon size={size} color={color} />
}
