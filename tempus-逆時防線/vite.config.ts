import { defineConfig } from 'vite'
import react from '@vitejs/react-swc'

export default defineConfig({
  base: './', // 🔥 直接改成 './'，用相對路徑徹底解決所有目錄迷路問題！
  plugins: [react()],
})
