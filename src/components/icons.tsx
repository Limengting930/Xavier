import type { CSSProperties } from 'react'

// ============================================================
// Base type for SVG icons
// ============================================================
interface IconProps {
  size?: number
  color?: string
  className?: string
  style?: CSSProperties
}

// ============================================================
// UI Icons  ·  stroke=2  ·  rounded  ·  currentColor
// ============================================================

export function IconTarget({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="12" r="1.6" fill={color} />
    </svg>
  )
}

export function IconArrowRight({ size = 18, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconPencil({ size = 14, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M14 5l3 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconBook({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 1 4 17.5v-12z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 0 1.5-1.5v-12z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 4v15" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconClock({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.8" />
      <path d="M12 7.5V12l3 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconBookmark({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-4-6 4V5.5a1 1 0 0 1 1-1z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function IconHome({ size = 24, color = 'currentColor', filled = false, style }: IconProps & { filled?: boolean }) {
  if (filled) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
        <path
          d="M4 11.2L12 4l8 7.2V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8.8z"
          fill={color}
        />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M4 11.2L12 4l8 7.2V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8.8z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function IconLibrary({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M4 6a2 2 0 0 1 2-2h5v16H6a2 2 0 0 1-2-2V6zM20 6a2 2 0 0 0-2-2h-5v16h5a2 2 0 0 0 2-2V6z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconStats({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path d="M6 20V11" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M12 20V4" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M18 20v-6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function IconUser({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <circle cx="12" cy="8.5" r="3.6" stroke={color} strokeWidth="1.8" />
      <path
        d="M5 20c1-3.6 4-5.4 7-5.4s6 1.8 7 5.4"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** 放大镜 */
export function IconSearch({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <circle cx="11" cy="11" r="6.5" stroke={color} strokeWidth="1.8" />
      <path d="M16 16l4 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/** 五角星（描边 / 填充可切换） */
export function IconStar({
  size = 22,
  color = '#B0AEB6',
  filled = false,
  style,
}: IconProps & { filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M12 3.4l2.6 5.3 5.9.85-4.25 4.15 1 5.8L12 16.9l-5.25 2.6 1-5.8L3.5 9.55l5.9-.85L12 3.4z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** 下拉三角 */
export function IconChevronDown({ size = 14, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path d="M6 9l6 6 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 手绘紫色下划线（标题下方） */
export function HandUnderline({ width = 130, style }: { width?: number; style?: CSSProperties }) {
  return (
    <svg width={width} height="10" viewBox={`0 0 ${width} 10`} fill="none" style={style}>
      <path
        d={`M2 6 Q ${width * 0.25} 2, ${width * 0.5} 5 T ${width - 2} 4`}
        stroke="#B69EFA"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
        opacity=".8"
      />
    </svg>
  )
}

/** 空复选框（描边圆角方块） */
export function IconCheckbox({
  size = 18,
  color = '#B0AEB6',
  checked = false,
  style,
}: IconProps & { checked?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke={color} strokeWidth="1.8" fill={checked ? color : 'none'} />
      {checked && (
        <path d="M7 12l3.5 3.5L17 9" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}

// ============================================================
// AI & Category Icons
// ============================================================

export function IconCalendar({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke={color} strokeWidth="1.8" />
      <line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="1.8" />
      <path d="M7 14h2v2H7z" fill={color} />
      <path d="M11 14h2v2h-2z" fill={color} />
      <path d="M15 14h2v2h-2z" fill={color} />
    </svg>
  )
}

export function IconNotebook({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <rect x="6" y="3" width="14" height="18" rx="2" stroke={color} strokeWidth="1.8" />
      <path d="M6 7h14M6 12h14M6 17h14" stroke={color} strokeWidth="1.8" strokeLinecap="round" opacity="0.4" />
      <path d="M3 6h4M3 12h4M3 18h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconLayers({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <polyline points="2 12 12 17 22 12" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="2 17 12 22 22 17" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconBarChart({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <line x1="18" y1="20" x2="18" y2="10" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="20" x2="12" y2="4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="6" y1="20" x2="6" y2="14" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconPuzzle({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8" />
    </svg>
  )
}

export function IconRobot({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <rect x="3" y="11" width="18" height="10" rx="2" stroke={color} strokeWidth="1.8" />
      <circle cx="12" cy="5" r="2" stroke={color} strokeWidth="1.8" />
      <path d="M12 7v4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 16v-2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 16v-2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconTerminal({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <polyline points="4 17 10 11 4 5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="19" x2="20" y2="19" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

// ============================================================
// Decorative doodles  ·  header area sparkles / cloud / sun
// ============================================================

/** 小云朵（带小笑脸），Header 右侧装饰 */
export function CloudDoodle({ style }: { style?: CSSProperties }) {
  return (
    <svg width="120" height="72" viewBox="0 0 120 72" fill="none" style={style}>
      <path
        d="M30 52c-9 0-16-6-16-14 0-7 6-13 14-13 1-7 8-13 16-13 8 0 15 5 17 12 2-1 4-1 6-1 9 0 16 6 16 14 0 8-7 15-16 15H30z"
        fill="#FFFFFF"
        stroke="#A78BFA"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* eyes */}
      <circle cx="49" cy="40" r="1.6" fill="#2F2F2F" />
      <circle cx="63" cy="40" r="1.6" fill="#2F2F2F" />
      {/* mouth */}
      <path d="M52 46c1.5 2 6 2 8 0" stroke="#2F2F2F" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      {/* cheeks */}
      <circle cx="44" cy="45" r="2" fill="#FFD1D9" opacity=".75" />
      <circle cx="68" cy="45" r="2" fill="#FFD1D9" opacity=".75" />
    </svg>
  )
}

/** 小太阳 */
export function SunDoodle({ style }: { style?: CSSProperties }) {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={style}>
      <circle cx="22" cy="22" r="8" fill="#FFE58A" stroke="#E8A83C" strokeWidth="1.6" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
        const rad = (a * Math.PI) / 180
        const x1 = 22 + Math.cos(rad) * 13
        const y1 = 22 + Math.sin(rad) * 13
        const x2 = 22 + Math.cos(rad) * 18
        const y2 = 22 + Math.sin(rad) * 18
        return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#E8A83C" strokeWidth="1.8" strokeLinecap="round" />
      })}
    </svg>
  )
}

/** 四角星 sparkle */
export function Sparkle({ size = 16, color = '#A78BFA', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M12 2c.6 4.5 3.5 7.4 8 8-4.5.6-7.4 3.5-8 8-.6-4.5-3.5-7.4-8-8 4.5-.6 7.4-3.5 8-8z"
        fill={color}
        opacity=".85"
      />
    </svg>
  )
}

/** 小爱心 */
export function HeartDoodle({ size = 16, color = '#F0A5B0', style, stroke = false }: IconProps & { stroke?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M12 20s-7-4.5-7-10a4.5 4.5 0 0 1 7-3.7A4.5 4.5 0 0 1 19 10c0 5.5-7 10-7 10z"
        fill={stroke ? 'none' : color}
        stroke={color}
        strokeWidth={stroke ? 1.8 : 1.2}
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ============================================================
// Scrapbook stickers  ·  纸胶带 / 便签
// ============================================================

/** 「SET」纸胶带贴纸，右上贴在主卡片 */
export function TapeStickerSet({ style, onClick }: { style?: CSSProperties; onClick?: () => void }) {
  return (
    <div
      className="tape-sticker-set"
      style={style}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
    >
      <svg width="88" height="46" viewBox="0 0 88 46" fill="none" style={{ display: 'block' }}>
        {/* tape body – slightly tilted rectangle with torn edges */}
        <defs>
          <linearGradient id="tape-set-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F5EBD1" />
            <stop offset="1" stopColor="#E8D9B0" />
          </linearGradient>
        </defs>
        <path
          d="M2 8 L84 4 L86 34 L4 40 Z"
          fill="url(#tape-set-g)"
          opacity=".95"
        />
        {/* stripes suggestion */}
        <path d="M2 8 L84 4" stroke="#D9C494" strokeWidth=".6" opacity=".4" />
        <path d="M4 40 L86 34" stroke="#D9C494" strokeWidth=".6" opacity=".4" />
      </svg>
      <span className="tape-sticker-set-text">
        SET
        <IconPencil size={13} color="#7A6640" style={{ marginLeft: 4, verticalAlign: 'middle' }} />
      </span>
    </div>
  )
}

/** 通用纸胶带（用于小卡片装饰） */
export function TapeStrip({
  color = '#C9E0BE',
  width = 60,
  height = 22,
  tilt = -8,
  style,
}: {
  color?: string
  width?: number
  height?: number
  tilt?: number
  style?: CSSProperties
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      style={{ transform: `rotate(${tilt}deg)`, ...style }}
    >
      {/* tape body – torn edges */}
      <path
        d={`M2 3 L${width - 4} 1 L${width - 1} ${height - 3} L4 ${height - 1} Z`}
        fill={color}
        opacity=".92"
      />
      {/* subtle diagonal texture */}
      {[...Array(6)].map((_, i) => (
        <line
          key={i}
          x1={8 + i * 10}
          y1={2}
          x2={4 + i * 10}
          y2={height - 2}
          stroke="rgba(255,255,255,.4)"
          strokeWidth=".8"
        />
      ))}
    </svg>
  )
}

/** 星星贴纸（"今日掌握" 卡右上）- 手绘可爱风：胖胖的、黄底 + 深棕描边 */
export function StarSticker({ style }: { style?: CSSProperties }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M12 2.4c.6 0 1.2.4 1.5 1L15.3 7l4 .6c1.5.2 2.1 2.1 1 3.1l-2.9 2.8.7 4c.2 1.5-1.3 2.6-2.7 1.9L12 17.5l-3.5 1.9c-1.3.7-2.9-.4-2.7-1.9l.7-4-2.9-2.8c-1.1-1-.5-2.9 1-3.1L8.7 7l1.8-3.6c.3-.6.9-1 1.5-1z"
        fill="#FFE58A"
        stroke="#8B6B3F"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* 小高光点，增加可爱感 */}
      <circle cx="9" cy="10" r=".9" fill="#8B6B3F" opacity=".55" />
    </svg>
  )
}

/** 回形针贴纸（"学习时长" 卡右上）- 只有绿色轮廓，纤细 */
export function ClipSticker({ style }: { style?: CSSProperties }) {
  return (
    <svg width="16" height="26" viewBox="0 0 16 26" fill="none" style={style}>
      <path
        d="M8 2.5c2.8 0 5 2.2 5 5v12.2c0 2-1.6 3.6-3.6 3.6s-3.6-1.6-3.6-3.6V8.3c0-1 .8-1.8 1.8-1.8s1.8.8 1.8 1.8v10.5"
        stroke="#7BB077"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

/** 便签纸胶带（"待复习" 卡右上）- 粉色 + 白色斜纹质感、水平方向、微顺时针倾斜 */
export function NoteTape({ style }: { style?: CSSProperties }) {
  return (
    <svg width="58" height="20" viewBox="0 0 58 20" fill="none" style={style}>
      {/* tape body – 两端锯齿 / 撕裂边 */}
      <path
        d="M2 3 L4 6 L2 9 L4 12 L2 15 L4 17 L54 15 L56 12 L54 9 L56 6 L54 3 L52 5 L4 5 Z"
        fill="#F4C4CC"
        opacity=".92"
      />
      {/* 主体简化矩形（覆盖锯齿路径不美观处） */}
      <path
        d="M4 3.5 L54 2.5 L55 17 L4 16 Z"
        fill="#F4C4CC"
      />
      {/* 白色斜纹条纹 */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <line
          key={i}
          x1={6 + i * 6}
          y1={2}
          x2={2 + i * 6}
          y2={18}
          stroke="#FFFFFF"
          strokeWidth="1.4"
          opacity=".55"
        />
      ))}
    </svg>
  )
}

// ============================================================
// Illustrations  ·  兔子 & 植物
// ============================================================

/**
 * 学习兔子  ·  抱着书看书的小兔子
 * 低饱和 · 圆润 · 手帐感
 */
export function BunnyIllustration({ size = 160, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      style={style}
    >
      {/* left ear */}
      <ellipse cx="58" cy="30" rx="9" ry="22" fill="#FFF6F0" stroke="#E8CFC0" strokeWidth="1.5" transform="rotate(-8 58 30)" />
      <ellipse cx="58" cy="32" rx="4" ry="15" fill="#FFD5D9" opacity=".7" transform="rotate(-8 58 32)" />
      {/* right ear */}
      <ellipse cx="88" cy="30" rx="9" ry="22" fill="#FFF6F0" stroke="#E8CFC0" strokeWidth="1.5" transform="rotate(8 88 30)" />
      <ellipse cx="88" cy="32" rx="4" ry="15" fill="#FFD5D9" opacity=".7" transform="rotate(8 88 32)" />

      {/* body */}
      <ellipse cx="80" cy="105" rx="42" ry="34" fill="#FFF6F0" stroke="#E8CFC0" strokeWidth="1.6" />

      {/* head */}
      <ellipse cx="73" cy="68" rx="30" ry="27" fill="#FFF6F0" stroke="#E8CFC0" strokeWidth="1.6" />

      {/* cheeks */}
      <circle cx="55" cy="76" r="4.5" fill="#FFD1D9" opacity=".85" />
      <circle cx="88" cy="76" r="4.5" fill="#FFD1D9" opacity=".85" />

      {/* eyes (closed happy) */}
      <path d="M60 66c1.5 2 4 2 5.5 0" stroke="#2F2F2F" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M78 66c1.5 2 4 2 5.5 0" stroke="#2F2F2F" strokeWidth="1.8" strokeLinecap="round" fill="none" />

      {/* nose */}
      <path d="M70 74l3 2 3-2-3 3z" fill="#F0A5B0" />
      <path d="M73 77v3" stroke="#2F2F2F" strokeWidth="1" strokeLinecap="round" />

      {/* book (purple) */}
      <path
        d="M50 110 L82 100 L112 110 L110 140 L82 132 L52 140 Z"
        fill="#B69EFA"
        stroke="#8B6EF0"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* book spine center */}
      <path d="M82 100 L82 132" stroke="#8B6EF0" strokeWidth="1.4" />
      {/* book pages hint */}
      <path d="M60 116 L75 112 M60 122 L75 118 M89 112 L104 116 M89 118 L104 122" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity=".7" />

      {/* small heart floating */}
      <path
        d="M108 58c-.4-3 2.8-5 4.5-2.6 1.7-2.4 4.9-.4 4.5 2.6-.3 2.3-4.5 5-4.5 5s-4.2-2.7-4.5-5z"
        fill="#F0A5B0"
      />

      {/* leaves right */}
      <path d="M130 112c-6 0-10 4-10 10 6 0 10-4 10-10z" fill="#B7D9AE" />
      <path d="M138 122c-4 4-4 9 0 12 4-3 4-8 0-12z" fill="#B7D9AE" opacity=".85" />

      {/* front paws */}
      <ellipse cx="52" cy="122" rx="8" ry="6" fill="#FFF6F0" stroke="#E8CFC0" strokeWidth="1.4" />
      <ellipse cx="108" cy="122" rx="8" ry="6" fill="#FFF6F0" stroke="#E8CFC0" strokeWidth="1.4" />
    </svg>
  )
}

/**
 * 盆栽小植物 · Forest 风
 */
export function PlantIllustration({ size = 128, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" style={style}>
      {/* stem */}
      <path d="M64 84 L64 44" stroke="#7BB077" strokeWidth="3" strokeLinecap="round" />
      {/* leaves */}
      <path
        d="M64 60 C50 56 42 42 46 30 C58 32 68 44 64 60z"
        fill="#A5CE9D"
        stroke="#7BB077"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M56 44 L64 56" stroke="#7BB077" strokeWidth="1.2" strokeLinecap="round" />
      <path
        d="M64 54 C78 50 86 36 82 24 C70 26 60 38 64 54z"
        fill="#B7D9AE"
        stroke="#7BB077"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M72 38 L64 50" stroke="#7BB077" strokeWidth="1.2" strokeLinecap="round" />
      <path
        d="M64 78 C55 76 50 68 52 60 C60 62 68 68 64 78z"
        fill="#8FBF87"
        stroke="#6A9B62"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* pot */}
      <path
        d="M42 84 L86 84 L82 108 A4 4 0 0 1 78 112 L50 112 A4 4 0 0 1 46 108 Z"
        fill="#D9A374"
        stroke="#B58358"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* pot rim */}
      <path d="M40 84 L88 84" stroke="#B58358" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="64" cy="84" rx="24" ry="3" fill="#8B5A32" opacity=".35" />
      {/* ground blades removed */}
    </svg>
  )
}

// ============================================================
// Fallback avatar
// ============================================================
export function DefaultAvatar({ size = 46 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 46 46" fill="none">
      <circle cx="23" cy="23" r="23" fill="#F6EAD8" />
      {/* hair */}
      <path d="M8 22 C8 12 15 6 23 6 C31 6 38 12 38 22 L38 26 C34 20 28 19 23 19 C18 19 12 20 8 26 z" fill="#5B3A22" />
      {/* face */}
      <ellipse cx="23" cy="26" rx="12" ry="13" fill="#F1C6A0" />
      {/* glasses */}
      <circle cx="18" cy="27" r="3.2" stroke="#3E2C1E" strokeWidth="1.2" fill="none" />
      <circle cx="28" cy="27" r="3.2" stroke="#3E2C1E" strokeWidth="1.2" fill="none" />
      <path d="M21.2 27h3.6" stroke="#3E2C1E" strokeWidth="1.2" />
      {/* smile */}
      <path d="M20.5 33c1.2 1.2 3.8 1.2 5 0" stroke="#3E2C1E" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {/* cheeks */}
      <circle cx="16" cy="31" r="1.6" fill="#F0A5B0" opacity=".7" />
      <circle cx="30" cy="31" r="1.6" fill="#F0A5B0" opacity=".7" />
      {/* bow */}
      <path d="M10 14 l4 -3 l0 6 z M10 14 l-2 4 l4 -1 z" fill="#F0A5B0" />
    </svg>
  )
}

// ============================================================
// Me Page & Achievement Icons
// ============================================================

export function IconShieldStar({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 7l1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5-2.5-2.5 3.5-.5L12 7z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

export function IconSprout({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path d="M12 22V12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 12c-4-2-6 2-6 2s2 4 6 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
      <path d="M12 15c4-2 6 2 6 2s-2 4-6 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
    </svg>
  )
}

export function IconFlame({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-1 4-5 5-5 9 0 4 2 8 2 8z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
      <path d="M12 22c-2 0-3-1-3-3 0-2 2-3 2-6 1 2 2 3 2 5 0 2-1 4-1 4z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill="currentColor" fillOpacity="0.4" />
    </svg>
  )
}

export function IconLightning({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
    </svg>
  )
}

export function IconTrophy({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path d="M8 21h8M12 17v4M7 4h10v7a5 5 0 0 1-10 0V4z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
      <path d="M7 6H4v3a4 4 0 0 0 4 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 6h3v3a4 4 0 0 1-4 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconCrown({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path d="M4 19h16v2H4v-2z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
      <path d="M4 15l2-9 4 4 2-6 2 6 4-4 2 9H4z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
      <circle cx="6" cy="6" r="1.5" fill={color} />
      <circle cx="12" cy="4" r="1.5" fill={color} />
      <circle cx="18" cy="6" r="1.5" fill={color} />
    </svg>
  )
}

export function IconCheckCircle({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" />
      <path d="M8 12l3 3 5-6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconChevronLeft({ size = 18, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path d="M15 18l-6-6 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconChevronRight({ size = 18, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path d="M9 18l6-6-6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 漏斗筛选 icon */
export function IconFunnel({ size = 16, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M4 5h16l-6 8v6l-4-2v-4L4 5z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

/** 上下箭头（select 指示） */
export function IconUpDown({ size = 14, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path d="M8 9l4-4 4 4M8 15l4 4 4-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 对号（选中态） */
export function IconCheck({ size = 18, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path d="M4.5 12.5l4.5 4L20 6.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 4 宫格（"全部"菜单项 icon） */
export function IconGrid4({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <rect x="3" y="3" width="7" height="7" rx="1.6" fill={color} />
      <rect x="14" y="3" width="7" height="7" rx="1.6" fill={color} />
      <rect x="3" y="14" width="7" height="7" rx="1.6" fill={color} />
      <rect x="14" y="14" width="7" height="7" rx="1.6" fill={color} />
    </svg>
  )
}

/** 打开的书（"知识点"菜单项 icon） */
export function IconBookOpen({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M3 5.5c3-1 6-1 9 .5v13c-3-1.5-6-1.5-9-.5v-13zM21 5.5c-3-1-6-1-9 .5v13c3-1.5 6-1.5 9-.5v-13z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

// ============================================================
// Status Icons  ·  手绘猫爪 + 主符号
// 用于 LibraryPage 列表 & LearnPage 顶部状态标签
// ============================================================

interface StatusIconProps {
  size?: number
  className?: string
  style?: CSSProperties
}

/**
 * 内部：手绘猫爪形状（40×40 viewBox）
 * - 4 个椭圆脚趾（外两个略小，内两个略大略高）
 * - 一个大掌垫（圆润三角形）
 * - stroke 走 currentColor 或指定
 */
function PawShape({
  stroke,
  fill,
  padFill,
}: {
  stroke: string
  fill: string
  padFill?: string
}) {
  const pad = padFill || fill
  return (
    <g strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
      {/* 掌垫（下方大圆润三角）*/}
      <path
        d="M12 22
           C11 26 12.5 30.5 16 32.5
           C18.5 34 21.5 34 24 32.5
           C27.5 30.5 29 26 28 22
           C27 18.5 23.5 17 20 17
           C16.5 17 13 18.5 12 22 Z"
        fill={pad}
        stroke={stroke}
      />
      {/* 左外趾 */}
      <ellipse cx="8.5" cy="17.5" rx="2.8" ry="3.6" fill={fill} stroke={stroke} />
      {/* 左内趾 */}
      <ellipse cx="15" cy="11.5" rx="3.2" ry="4.2" fill={fill} stroke={stroke} />
      {/* 右内趾 */}
      <ellipse cx="25" cy="11.5" rx="3.2" ry="4.2" fill={fill} stroke={stroke} />
      {/* 右外趾 */}
      <ellipse cx="31.5" cy="17.5" rx="2.8" ry="3.6" fill={fill} stroke={stroke} />
    </g>
  )
}

/** 已掌握：绿色猫爪 + 对号 */
export function StatusMastered({ size = 22, className, style }: StatusIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      style={style}
    >
      <PawShape stroke="#7BB077" fill="#E4F1DA" padFill="#DBEBCF" />
      {/* 对号 */}
      <path
        d="M15.5 25l3.3 3 6-7"
        stroke="#5FA05B"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 未掌握：粉红猫爪 + 叉 */
export function StatusUnknown({ size = 22, className, style }: StatusIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      style={style}
    >
      <PawShape stroke="#E17B7B" fill="#F7DDDD" padFill="#F2CCCC" />
      {/* 叉号 */}
      <path
        d="M16.5 22l7 7M23.5 22l-7 7"
        stroke="#D96363"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** 模糊：黄色猫爪 + ≈ */
export function StatusFuzzy({ size = 22, className, style }: StatusIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      style={style}
    >
      <PawShape stroke="#E8A83C" fill="#FBE7C3" padFill="#F6DAA2" />
      {/* 上波浪 ≈ */}
      <path
        d="M14.5 23.5c1.5-1.8 3-1.8 4.5 0s3 1.8 4.5 0 3-1.8 4.5 0"
        stroke="#D18A24"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* 下波浪 */}
      <path
        d="M14.5 28c1.5-1.8 3-1.8 4.5 0s3 1.8 4.5 0 3-1.8 4.5 0"
        stroke="#D18A24"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

/** 未学习：灰色猫爪 + 横杠 */
export function StatusNew({ size = 22, className, style }: StatusIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      style={style}
    >
      <PawShape stroke="#A8A5A0" fill="#EDEBE7" padFill="#DEDBD5" />
      {/* 减号横杠 */}
      <path
        d="M14 25.5h12"
        stroke="#8A867F"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
