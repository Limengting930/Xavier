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

/**
 * 根据分类名匹配对应图标
 * - 在统计页 stats-cat-icon 与 题库 select 二级菜单里共用
 * - 颜色统一 var(--accent)，size 可传
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
  return <IconBook size={size} color={color} />
}
