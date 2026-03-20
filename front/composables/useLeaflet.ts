import { ref, onMounted } from 'vue'

export function useLeaflet() {
  const isLoaded = ref(false)
  const loadError = ref<string | null>(null)

  const loadLeaflet = async () => {
    try {
      // Load CSS
      const linkEl = document.createElement('link')
      linkEl.rel = 'stylesheet'
      linkEl.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(linkEl)

      // Load JS
      const scriptEl = document.createElement('script')
      scriptEl.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      
      // Wait for script to load
      await new Promise((resolve, reject) => {
        scriptEl.onload = resolve
        scriptEl.onerror = reject
        document.head.appendChild(scriptEl)
      })

      isLoaded.value = true
    } catch (err) {
      loadError.value = err instanceof Error ? err.message : 'Failed to load Leaflet'
      console.error('[useLeaflet] Failed to load:', err)
    }
  }

  // Only load on client
  if (process.client) {
    if (!window.L) {
      loadLeaflet()
    } else {
      isLoaded.value = true
    }
  }

  return {
    isLoaded,
    loadError
  }
}

// Type declaration for Leaflet global
declare global {
  interface Window {
    L: any
  }
}