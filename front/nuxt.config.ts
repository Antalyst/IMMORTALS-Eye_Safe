// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  pages: true,

  runtimeConfig: {
    googleAiApi: (globalThis as any).process?.env?.GOOGLE_AI_KEY || '',
    googleAiKey: (globalThis as any).process?.env?.GOOGLE_AI_KEY || '',
    hfApiKey: (globalThis as any).process?.env?.HF_API_KEY || ''
  },

  modules: ['@nuxtjs/tailwindcss'],

  build: {
    transpile: ['leaflet', '@xenova/transformers'],
    // Ensure proper handling of WebAssembly files
    rollupOptions: {
      external: [],
      output: {
        // Ensure .wasm files are handled correctly
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.wasm')) {
            return 'assets/wasm/[name][extname]'
          }
          return 'assets/[name][extname]'
        }
      }
    }
  },

  // Performance optimizations for mobile
  experimental: {
    payloadExtraction: false, // Reduce payload size
    viewTransition: true // Enable view transitions for smoother navigation
  },

  // Optimize bundle splitting
  vite: {
    // Some ML libraries reference `process.env` at runtime.
    define: { 
      'process.env': {},
      'global': 'globalThis'
    },
    server: {
      allowedHosts: [
        'shelba-chlorophyllous-lilliana.ngrok-free.dev',
        '.ngrok-free.dev', // Allow all ngrok subdomains
        '.ngrok.io', // Allow legacy ngrok domains
        'localhost',
        '127.0.0.1'
      ],
      hmr: {
        clientPort: 443 // For ngrok HTTPS
      }
    },
    build: {
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-vue': ['vue', 'vue-router'],
            'vendor-leaflet': ['leaflet'],
            'vendor-spline': ['@splinetool/viewer']
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    optimizeDeps: {
      include: ['vue', 'vue-router'],
      exclude: [
        '@splinetool/viewer', 
        '@xenova/transformers',
        'onnxruntime-web'
      ]
    },
    // Ensure proper handling of WebAssembly and worker threads
    worker: {
      format: 'es'
    }
  },

  // Reduce initial bundle size
  nitro: {
    compressPublicAssets: true,
    minify: true
  },

  // App configuration
  app: {
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes' },
        { name: 'mobile-web-app-capable', content: 'yes' }
      ]
    }
  },
  ssr: false
})