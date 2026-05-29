import { defineConfig } from 'vite'
import react from '@vitejs/react-swc' // 或者 @vitejs/plugin-react，看你原本是哪一個

// https://vitejs.dev/config/
export default defineConfig({
  base: '/tempus-逆時防線/', // 🔥 必須加上這行，告訴瀏覽器你的資料夾叫這個名字！
  plugins: [react()],
})
