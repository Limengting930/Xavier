import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    // 图片内联阈值：小红书 Builder 平台不支持配置静态资源缓存头，
    // 散图每次刷新/切页都会重复请求。这里把 assets 图片（当前最大 ~13KB）
    // 全部内联为 base64 打进 JS/CSS —— 图片不再是独立请求，随 bundle 一起加载与缓存，
    // 彻底消除"重复请求图片"。阈值 20KB 覆盖现有全部图；新增更大图片需相应调整。
    // 注意：pdf.worker 等是 JS chunk（非 asset），不受此阈值影响。
    assetsInlineLimit: 20 * 1024,
  },
})
