import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  //  server: {
  //   host: '0.0.0.0', // 监听所有网络接口
  //   port: 5173,
  //   strictPort: true, // 如果端口被占用则退出
  //   open: false, // 不自动打开浏览器
    
    // 可选：配置代理等
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:5000',
    //     changeOrigin: true,
    //   }
    // }
  
})
