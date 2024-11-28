import {fileURLToPath, URL} from 'node:url'

import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import {PrimeVueResolver} from '@primevue/auto-import-resolver'
// https://vite.dev/config/

const proxyTarget = 'http://127.0.0.1:8080/';
// const proxyTarget = 'http://124.220.149.108:8080/';
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
    proxy: {
      '/api': {
        // 匹配以 /api 开头的请求
        target: proxyTarget, // 目标后端地址
        changeOrigin: true, // 改变源以避免跨域问题
      },
    },
  },
  define: {
    __PROXY_TARGET__: JSON.stringify(proxyTarget), // 注入前端代码
  },
})
