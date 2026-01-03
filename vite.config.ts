import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  // 1. THIS IS THE MOST IMPORTANT LINE FOR GITHUB PAGES:
  base: '/ironlog-app/', 

  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'IronLog',
        short_name: 'IronLog',
        description: 'Offline-First Gym Tracker',
        // theme_color: '#09090b', <--- REMOVED TO FIX IOS NOTCH BAR
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait',
        
        // 2. UPDATED PWA SCOPES FOR GITHUB PAGES:
        scope: '/ironlog-app/',
        start_url: '/ironlog-app/',
        
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})