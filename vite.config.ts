import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/page/beile-ma-react/',
  build: { outDir: 'dist' }
})
