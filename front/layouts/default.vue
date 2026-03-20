<template>
  <div class="min-h-screen text-white relative">
    <!-- Enhanced Navigation Bar with Glass Morphism -->
    <nav class="fixed top-0 left-0 right-0 z-50 glass-nav border-b border-cyan-500/20 shadow-glow-nav backdrop-blur-xl transition-all duration-300">
      <div class="w-full px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-20">
          <!-- Logo and Brand -->
          <div class="flex items-center gap-3 group">
            <NuxtLink to="/" class="flex items-center gap-3 group/link transition-transform duration-300 hover:scale-105">
              <img 
                src="/Untitled.png" 
                alt="EyeSafe Logo" 
                class="w-10 h-10 object-contain"
                @error="handleImageError"
                @load="handleImageLoad"
                  />
              <div class="flex flex-col">
                <span class="text-xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-400 bg-clip-text text-transparent font-tech tracking-wide">
                  EyeSafe
                </span>
              </div>
            </NuxtLink>
          </div>

          <!-- Navigation Links -->
          <div class="hidden sm:flex sm:items-center sm:gap-2">
            <NuxtLink 
              to="/" 
              class="relative px-4 py-2.5 rounded-xl text-slate-300 hover:text-cyan-400 transition-all duration-300 group/nav"
              :class="{ 'text-cyan-400': $route.path === '/' }"
            >
              <span class="relative z-10 font-medium">Home</span>
              <span v-if="$route.path === '/'" class="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/30 glow-cyan-nav"></span>
              <span v-else class="absolute inset-0 bg-slate-800/30 rounded-xl opacity-0 group-hover/nav:opacity-100 transition-opacity duration-300 border border-cyan-500/20"></span>
            </NuxtLink>
            <NuxtLink 
              to="/screen-share" 
              class="relative px-4 py-2.5 rounded-xl text-slate-300 hover:text-cyan-400 transition-all duration-300 group/nav veritas"
              :class="{ 'text-cyan-400': $route.path === '/screen-share' }"
            >
              <span class="relative z-10 font-medium">Veritas Scan</span>
              <span v-if="$route.path === '/screen-share'" class="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/30 glow-cyan-nav"></span>
              <span v-else class="absolute inset-0 bg-slate-800/30 rounded-xl opacity-0 group-hover/nav:opacity-100 transition-opacity duration-300 border border-cyan-500/20"></span>
            </NuxtLink>
            <NuxtLink 
              to="/dashboard" 
              class="relative px-4 py-2.5 rounded-xl text-slate-300 hover:text-cyan-400 transition-all duration-300 group/nav"
              :class="{ 'text-cyan-400': $route.path === '/dashboard' }"
            >
              <span class="relative z-10 font-medium">Dashboard</span>
              <span v-if="$route.path === '/dashboard'" class="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/30 glow-cyan-nav"></span>
              <span v-else class="absolute inset-0 bg-slate-800/30 rounded-xl opacity-0 group-hover/nav:opacity-100 transition-opacity duration-300 border border-cyan-500/20"></span>
            </NuxtLink>
            <NuxtLink 
              to="/trend" 
              class="relative px-4 py-2.5 rounded-xl text-slate-300 hover:text-cyan-400 transition-all duration-300 group/nav"
              :class="{ 'text-cyan-400': $route.path === '/trend' }"
            >
              <span class="relative z-10 font-medium">Trend</span>
              <span v-if="$route.path === '/trend'" class="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/30 glow-cyan-nav"></span>
              <span v-else class="absolute inset-0 bg-slate-800/30 rounded-xl opacity-0 group-hover/nav:opacity-100 transition-opacity duration-300 border border-cyan-500/20"></span>
            </NuxtLink>
          </div>

          <!-- Mobile Menu Button -->
          <div class="sm:hidden">
            <button 
              @click="mobileMenuOpen = !mobileMenuOpen" 
              class="p-2 rounded-xl hover:bg-cyan-500/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 border border-cyan-500/20 transition-all duration-300"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                class="h-6 w-6 text-cyan-400 transition-transform duration-300"
                :class="{ 'rotate-90': mobileMenuOpen }"
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile Menu with Slide Animation -->
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 max-h-0"
        enter-to-class="opacity-100 max-h-96"
        leave-active-class="transition-all duration-300 ease-in"
        leave-from-class="opacity-100 max-h-96"
        leave-to-class="opacity-0 max-h-0"
      >
        <div 
          v-if="mobileMenuOpen"
          class="sm:hidden glass border-t border-cyan-500/20 overflow-hidden"
        >
          <div class="px-2 pt-2 pb-3 space-y-1">
            <NuxtLink 
              to="/" 
              class="block px-4 py-3 rounded-xl text-slate-300 hover:text-cyan-400 transition-all duration-300 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30"
              :class="{ 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-400 border-cyan-500/30': $route.path === '/' }"
              @click="mobileMenuOpen = false"
            >
              Home
            </NuxtLink>
            <NuxtLink 
              to="/screen-share" 
              class="block px-4 py-3 rounded-xl text-slate-300 hover:text-cyan-400 transition-all duration-300 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30 veritas  "
              :class="{ 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-400 border-cyan-500/30': $route.path === '/screen-share' }"
              @click="mobileMenuOpen = false"
            >
              Veritas Scan
            </NuxtLink>
            <NuxtLink 
              to="/dashboard" 
              class="block px-4 py-3 rounded-xl text-slate-300 hover:text-cyan-400 transition-all duration-300 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30"
              :class="{ 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-400 border-cyan-500/30': $route.path === '/dashboard' }"
              @click="mobileMenuOpen = false"
            >
              Dashboard
            </NuxtLink>
            <NuxtLink 
              to="/trend" 
              class="block px-4 py-3 rounded-xl text-slate-300 hover:text-cyan-400 transition-all duration-300 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30"
              :class="{ 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-400 border-cyan-500/30': $route.path === '/trend' }"
              @click="mobileMenuOpen = false"
            >
              Trend
            </NuxtLink>
          </div>
        </div>
      </Transition>
    </nav>

    <!-- Main Content -->
    <main class="pt-20 relative z-10">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

const mobileMenuOpen = ref(false)
const isSplineReady = ref(false)

const SPLINE_SCRIPT_SRC = 'https://unpkg.com/@splinetool/viewer@1.10.90/build/spline-viewer.js'

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  console.error('Failed to load logo image:', img.src)
  console.error('Trying alternative paths...')
  // Try alternative path
  if (img.src.includes('/Untitled.png')) {
    img.src = '/Untitled.png'
  }
}

function handleImageLoad(event: Event) {
  const img = event.target as HTMLImageElement
  console.log('Logo image loaded successfully:', img.src)
}

function ensureSplineScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }

  if ((window as any).customElements?.get('spline-viewer')) {
    return Promise.resolve()
  }

  const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${SPLINE_SCRIPT_SRC}"]`)

  if (existingScript) {
    return (window as any).customElements?.whenDefined
      ? (window as any).customElements.whenDefined('spline-viewer')
      : Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.type = 'module'
    script.src = SPLINE_SCRIPT_SRC
    script.defer = true

    script.addEventListener('load', () => {
      if ((window as any).customElements?.whenDefined) {
        (window as any).customElements.whenDefined('spline-viewer').then(() => resolve()).catch(reject)
      } else {
        resolve()
      }
    })

    script.addEventListener('error', (error) => {
      console.error('[Spline] Failed to load viewer script', error)
      reject(error)
    })

    document.head.appendChild(script)
  })
}

function zoomSplineLogo() {
  if (typeof window === 'undefined') return

  const logoContainer = document.querySelector('.spline-logo-wrapper')
  const viewer = logoContainer?.querySelector('spline-viewer') as any
  if (!viewer) return

  try {
    // Access the Spline application instance
    if (viewer.application) {
      const app = viewer.application
      if (app.camera) {
        // Zoom in by moving camera closer
        app.camera.position.set(0, 0, 2) // Closer to the object
        app.camera.updateProjectionMatrix()
      }
    }
  } catch (error) {
    // Silently fail if we can't access the camera
  }
}

function hideSplineWatermark() {
  if (typeof window === 'undefined') return

  // Target the logo Spline viewer specifically
  const logoContainer = document.querySelector('.spline-logo-wrapper')
  const viewer = logoContainer?.querySelector('spline-viewer') as HTMLElement
  if (!viewer) return

  try {
    // Ensure viewer is visible
    viewer.style.display = 'block'
    viewer.style.visibility = 'visible'
    viewer.style.opacity = '1'
    viewer.style.background = 'transparent'
    viewer.style.backgroundColor = 'transparent'
    
    const shadowRoot = viewer.shadowRoot
    if (shadowRoot) {
      // Ensure canvas is visible
      const canvas = shadowRoot.querySelector('canvas') as HTMLElement
      if (canvas) {
        canvas.style.display = 'block'
        canvas.style.visibility = 'visible'
        canvas.style.opacity = '1'
        canvas.style.background = 'transparent'
        canvas.style.backgroundColor = 'transparent'
      }
      
      // Only hide Spline's specific branding elements, not everything with "logo"
      const watermarkSelectors = [
        '[class*="spline-logo"]',
        '[id*="spline-logo"]',
        '[class*="spline-watermark"]',
        '[id*="spline-watermark"]',
        '[class*="spline-badge"]',
        '[id*="spline-badge"]',
        '[class*="spline-branding"]',
        '[id*="spline-branding"]',
        'a[href*="spline"]',
        'button[class*="watermark"]',
        'button[class*="badge"]'
      ]
      
      watermarkSelectors.forEach(selector => {
        const elements = shadowRoot.querySelectorAll(selector)
        elements.forEach((el: any) => {
          if (el && !el.closest('canvas')) {
            el.style.display = 'none'
            el.style.visibility = 'hidden'
            el.style.opacity = '0'
            el.style.pointerEvents = 'none'
          }
        })
      })
    }
  } catch (error) {
    // Silently fail if we can't access shadow DOM
  }
}

onMounted(async () => {
  try {
    await ensureSplineScript()
    isSplineReady.value = true
    
    await nextTick()
    
    const attempts = [100, 300, 500, 1000, 2000]
    attempts.forEach(delay => {
      setTimeout(() => {
        hideSplineWatermark()
        zoomSplineLogo()
      }, delay)
    })

    const observer = new MutationObserver(() => {
      hideSplineWatermark()
      zoomSplineLogo()
    })

    const checkInterval = setInterval(() => {
      const logoContainer = document.querySelector('.spline-logo-wrapper')
      const viewer = logoContainer?.querySelector('spline-viewer') || document.querySelector('spline-viewer')
      if (viewer) {
        observer.observe(viewer, {
          childList: true,
          subtree: true,
          attributes: false
        })
        clearInterval(checkInterval)
      }
    }, 100)

    setTimeout(() => {
      observer.disconnect()
      clearInterval(checkInterval)
    }, 10000)

  } catch (error) {
    console.error('[Spline] Viewer initialization failed', error)
  }
})
</script>

<style scoped>
/* Glass Navigation */
.glass-nav {
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(34, 211, 238, 0.2);
  box-shadow: 
    0 8px 32px 0 rgba(0, 0, 0, 0.37),
    0 0 20px rgba(34, 211, 238, 0.1);
}

.glow-cyan-nav {
  box-shadow: 
    0 0 15px rgba(34, 211, 238, 0.3),
    0 0 30px rgba(34, 211, 238, 0.15);
}

.shadow-glow-nav {
  box-shadow: 
    0 4px 20px rgba(0, 0, 0, 0.3),
    0 0 30px rgba(34, 211, 238, 0.1);
}

/* Smooth transitions */
.router-link-active {
  @apply text-cyan-400;
}

/* Navigation link hover effect */
.group\/nav:hover .relative {
  transform: translateY(-1px);
}

/* Spline Logo Styles */
.spline-logo-wrapper {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spline-logo {
  width: 100%;
  height: 100%;
  background: transparent !important;
  background-color: transparent !important;
  pointer-events: none;
  transform: scale(3);
  transform-origin: center;
}

.spline-logo canvas {
  pointer-events: none !important;
}

/* Ensure Spline viewer is visible */
.spline-logo-wrapper spline-viewer {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
}

.spline-logo-wrapper spline-viewer canvas {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
}

/* Hide only Spline's specific branding/watermark elements */
.spline-logo-wrapper spline-viewer::part(logo),
.spline-logo-wrapper spline-viewer::part(logo-container),
.spline-logo-wrapper spline-viewer::part(branding),
.spline-logo-wrapper spline-viewer::part(watermark) {
  display: none !important;
}

/* Hide Spline branding links and buttons */
.spline-logo-wrapper spline-viewer a[href*="spline"],
.spline-logo-wrapper spline-viewer button[class*="watermark"],
.spline-logo-wrapper spline-viewer button[class*="badge"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
@media(max-width: 640px) {
  .veritas{
    display: none;
  }
}
</style>
