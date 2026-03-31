import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

function normalizeBasePath(value = '/'): string {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  const withTrailingSlash = withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
  return withTrailingSlash.replace(/\/+/g, '/')
}

function createProxy(basePath: string) {
  const proxy = {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  } as Record<string, { target: string; changeOrigin: boolean }>

  if (basePath !== '/') {
    proxy[`${basePath.slice(0, -1)}/api`] = {
      target: 'http://localhost:8000',
      changeOrigin: true,
    }
  }

  return proxy
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const basePath = normalizeBasePath(process.env.APP_BASE_PATH || '/')

  return {
  base: command === 'build' ? './' : basePath,
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
  ],
  build: {
    outDir: '../static',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: createProxy(basePath),
  },
  }
})
