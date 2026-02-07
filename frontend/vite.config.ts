import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // Changed from 'autoUpdate' to prevent reload loops with Firebase SW
      includeAssets: ['studyasan-logo-lady.png', 'studyasan-logo.png', 'logo.jpg'],
      manifest: {
        name: 'StudyAsan - Appointment Management',
        short_name: 'StudyAsan',
        description: 'StudyAsan - Your trusted appointment and consultation management platform',
        theme_color: '#0276D3',
        background_color: '#0276D3',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        categories: ['education', 'productivity', 'business'],
        screenshots: [],
        shortcuts: [
          {
            name: 'Book Appointment',
            short_name: 'Book',
            description: 'Quick book an appointment',
            url: '/',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB limit
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              networkTimeoutSeconds: 10
            }
          }
        ]
      },
      devOptions: {
        enabled: false // Disabled to prevent conflicts with Firebase messaging SW during dev
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5173,
    strictPort: false,
    open: true,
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1500, // 1500 KB warning limit
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React - keep together as foundation
          'react-core': [
            'react',
            'react-dom',
            'react-router-dom',
            'scheduler'
          ],
          // UI components that depend on React
          'ui-components': [
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            'lucide-react',
            'sonner',
            'cmdk'
          ],
          // Charts - includes React dependencies
          'charts': [
            'recharts'
          ],
          // PDF generation (no React dependency)
          'pdf': [
            'jspdf',
            'jspdf-autotable'
          ],
          // Lottie animations
          'lottie': [
            '@lottiefiles/dotlottie-react'
          ],
          // Utilities (no React dependency)
          'utils': [
            'date-fns',
            'axios',
            'clsx',
            'tailwind-merge',
            'class-variance-authority',
            'zustand',
            'socket.io-client',
            'canvas-confetti'
          ]
        },
      },
    },
  },
})
