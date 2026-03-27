import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  server: {
    allowedHosts: ["dracin.bzbeez.work"],
    proxy: {
      // Proxy API requests to the cache proxy server
      '/api-proxy': {
        target: process.env.VITE_API_PROXY_URL || 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy/, '/api'),
      },
      // Proxy admin requests directly (no /api prefix)
      '/admin': {
        target: process.env.VITE_API_PROXY_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  plugins: [inspectAttr(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
