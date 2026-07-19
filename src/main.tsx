import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// 禁止页面缩放（iOS Safari 会忽略 viewport 的 user-scalable=no，需 JS 兜底）
function disableZoom() {
  // 双指缩放手势（iOS Safari 专有事件）
  const preventGesture = (e: Event) => e.preventDefault()
  document.addEventListener('gesturestart', preventGesture)
  document.addEventListener('gesturechange', preventGesture)
  document.addEventListener('gestureend', preventGesture)

  // 双指 touchmove 兜底（部分浏览器不触发 gesture 事件）
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length > 1) e.preventDefault()
    },
    { passive: false },
  )

  // 双击缩放：两次 touchend 间隔过短则拦截
  let lastTouchEnd = 0
  document.addEventListener(
    'touchend',
    (e) => {
      const now = Date.now()
      if (now - lastTouchEnd <= 300) e.preventDefault()
      lastTouchEnd = now
    },
    { passive: false },
  )
}
disableZoom()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
