import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { PrimeVueResolver } from '@primevue/auto-import-resolver'
// https://vite.dev/config/

export default defineConfig({
  plugins: [
    vue(),
    Components({
      resolvers: [PrimeVueResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    /** 本地调试后端接口 */
    proxy: {
      // '/api/v1/file/upload': {
      //   target: 'http://127.0.0.1:3001', // 目标后端地址
      //   changeOrigin: true, // 改变源以避免跨域问题
      // },
      '/api': {
        // 匹配以 /api 开头的请求
        target: 'http://124.220.149.108:8080', // 目标后端地址
        changeOrigin: true, // 改变源以避免跨域问题
      },
    },
  },
})
