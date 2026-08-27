import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/ToD/',
  plugins: [
    react(),
    VitePWA({
      injectRegister: 'auto',
      manifest: {
        background_color: '#427cbe',
        description: 'Локальная игра «Правда или действие» для компании.',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        lang: 'ru',
        name: 'Правда или Действие',
        orientation: 'any',
        scope: '/ToD/',
        short_name: 'П или Д',
        start_url: '/ToD/',
        theme_color: '#427cbe',
      },
      registerType: 'autoUpdate',
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        globPatterns: ['**/*.{css,html,js,png,svg,woff,woff2}'],
        navigateFallback: 'index.html',
        skipWaiting: true,
      },
    }),
  ],
})
