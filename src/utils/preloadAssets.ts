// 预加载所有 src/assets 下的图片资源。
// 目的：切换底部导航（页面组件卸载/重挂）时，图片已在浏览器内存/磁盘缓存中，
// 直接命中，不再产生可见的"重新加载/闪烁"。App 挂载时调用一次即可。
//
// 这些资源经 Vite 打包后带内容 hash（如 bunny-XXXX.webp），URL 稳定，
// 预加载后长期可复用；配合服务器对 /assets/* 的长缓存（见部署说明）效果最佳。

const assetModules = import.meta.glob('../assets/*.{png,gif,webp,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

let done = false

/** 预加载全部图片资源（幂等，仅执行一次） */
export function preloadAssets(): void {
  if (done) return
  done = true
  for (const url of Object.values(assetModules)) {
    const img = new Image()
    img.src = url
  }
}
