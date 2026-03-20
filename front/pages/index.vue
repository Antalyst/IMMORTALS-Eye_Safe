<template>
  <div class="relative overflow-hidden min-h-screen">
   
    <div class="relative z-10 w-full px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 md:pt-32 pb-12 sm:pb-16 md:pb-20">
      
      <!-- Hero Section with Staggered Animations -->
      <div class="text-center relative z-10 max-w-6xl mx-auto ">
          <div class="absolute top-4 sm:top-8 md:top-10 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full z-10">
            <div class="mb-4 sm:mb-6 md:mb-8 fade-in-up" style="animation-delay: 4s;">
            <div class="inline-block px-3 py-1.5 sm:px-4 sm:py-2 md:px-6 md:py-2.5 glass-strong rounded-full border border-cyan-500/30 backdrop-blur-xl">
              <span class="text-xs sm:text-sm font-semibold text-cyan-400 tracking-wider uppercase">WHERE AI LIVES TO PROTECT YOU</span>
            </div>
          </div>

          <!-- Main Heading -->
          <h1 class="text-3xl sm:text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-4 sm:mb-6 md:mb-8 fade-in-up" style="animation-delay: 4.2s;">
            <span class="block mb-1 sm:mb-2 bg-gradient-to-r from-white via-cyan-100 to-blue-100 bg-clip-text text-transparent font-tech tracking-tight">
              Intelligent Safety
            </span>
            <span class="block text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent font-tech">
              For Your Digital World
            </span>
          </h1>
        </div>
        
        <!-- Badge -->
       

        <!-- 3D Spline Viewer - Centered and Prominent -->
        <div class="relative -z-1 flex justify-center mt-8 sm:mt-12 md:mt-16 mb-12 sm:mb-16 md:mb-20 fade-in-up" style="animation-delay: 4.4s;">
          <div class="relative w-full max-w-4xl">
            
            
            <ClientOnly>
              <template #fallback>
                <div class="spline-placeholder w-full h-[280px] sm:h-[380px] md:h-[450px] lg:h-[520px] glass-strong rounded-2xl sm:rounded-3xl flex items-center justify-center">
                  <div class="text-center">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full animate-spin mx-auto mb-3 sm:mb-4"></div>
                    <p class="text-xs sm:text-sm text-slate-400">Loading 3D Experience...</p>
                  </div>
                </div>
              </template>
              <div v-if="isSplineReady" class="spline-interactive-wrapper rounded-3xl overflow-hidden ">
                <spline-viewer
                  ref="splineViewerRef"
                  class="spline-interactive"
                  url="https://prod.spline.design/3kHWT6La6UzaaBUV/scene.splinecode"
                  background="transparent"
                />
              </div>
            </ClientOnly>
          </div>
        </div>

        <!-- Subtle 3D Elements - Floating in Background -->
        <div class="none absolute top-40 left-10 w-32 h-32 opacity-30 fade-in-up" style="animation-delay: 4.6s; pointer-events: none;">
          <div class="neural-sphere-small">
            <div v-for="i in 30" :key="i" 
              class="neural-point-small"
              :style="{
                transform: `rotateY(${i * 12}deg) rotateX(${i * 12}deg) translateZ(30px)`,
              }"
            ></div>
          </div>
        </div>

        <div class="none absolute top-60 right-10 w-24 h-24 opacity-20 fade-in-up" style="animation-delay: 4.8s; pointer-events: none;">
          <div class="dna-helix-small">
            <div v-for="i in 15" :key="i"
              class="dna-strand-small"
              :style="{
                transform: `rotateY(${i * 24}deg) translateZ(20px) translateY(${i * 8}px)`,
              }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Features Grid - Enhanced Glass Morphism -->
      <div class="mt-12 sm:mt-16 md:mt-24 lg:mt-32 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 max-w-7xl mx-auto">
        <!-- Feature Card 1 -->
        <div 
          class="card-3d card-glow group fade-in-up" 
          style="animation-delay: 5s;"
        >
          <div class="relative p-4 sm:p-6 md:p-8 glass-strong rounded-2xl sm:rounded-3xl border border-cyan-500/20 h-full flex flex-col overflow-hidden transition-all duration-500 hover:border-cyan-500/40 hover:shadow-2xl hover:shadow-cyan-500/20">
            <!-- Animated Background Glow -->
            <div class="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-3xl transition-transform duration-500 group-hover:scale-150"></div>
            
            <!-- Icon -->
            <div class="relative z-10 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mb-4 sm:mb-5 md:mb-6 rounded-xl sm:rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30 pulse-ai backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            
            <!-- Content -->
            <h3 class="text-lg sm:text-xl md:text-2xl font-bold text-white mb-3 sm:mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Real-time Protection
            </h3>
            <p class="text-sm sm:text-base text-slate-300/90 leading-relaxed flex-grow mb-4 sm:mb-5 md:mb-6">
              Advanced AI algorithms continuously monitor your digital environment for potential threats and misinformation in real-time.
            </p>
            
            <!-- Status -->
            <div class="mt-auto pt-4 sm:pt-5 md:pt-6 border-t border-cyan-500/20">
              <div class="flex items-center text-cyan-400 text-xs sm:text-sm font-medium">
                <span>Active Monitoring</span>
                <div class="ml-2 w-2 h-2 bg-cyan-400 rounded-full pulse-ai"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Feature Card 2 -->
        <div 
          class="card-3d card-glow group fade-in-up" 
          style="animation-delay: 5.2s;"
        >
          <div class="relative p-4 sm:p-6 md:p-8 glass-strong rounded-2xl sm:rounded-3xl border border-blue-500/20 h-full flex flex-col overflow-hidden transition-all duration-500 hover:border-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/20">
            <div class="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl transition-transform duration-500 group-hover:scale-150"></div>
            
            <div class="relative z-10 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mb-4 sm:mb-5 md:mb-6 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/30 pulse-ai backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8c-.519-.598-1.489-1-2.599-1M12 16c-1.11 0-2.08-.402-2.599-1M12 16c.519.598 1.489 1 2.599 1M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            
            <h3 class="text-lg sm:text-xl md:text-2xl font-bold text-white mb-3 sm:mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Threat Analysis
            </h3>
            <p class="text-sm sm:text-base text-slate-300/90 leading-relaxed flex-grow mb-4 sm:mb-5 md:mb-6">
              In-depth analysis of detected threats using advanced ML models to provide insights and actionable recommendations.
            </p>
            
            <div class="mt-auto pt-4 sm:pt-5 md:pt-6 border-t border-blue-500/20">
              <div class="flex items-center text-blue-400 text-xs sm:text-sm font-medium">
                <span>AI-Powered Analysis</span>
                <div class="ml-2 w-2 h-2 bg-blue-400 rounded-full pulse-ai"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Feature Card 3 -->
        <div 
          class="card-3d card-glow group fade-in-up" 
          style="animation-delay: 5.4s;"
        >
          <div class="relative p-4 sm:p-6 md:p-8 glass-strong rounded-2xl sm:rounded-3xl border border-purple-500/20 h-full flex flex-col overflow-hidden transition-all duration-500 hover:border-purple-500/40 hover:shadow-2xl hover:shadow-purple-500/20">
            <div class="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl transition-transform duration-500 group-hover:scale-150"></div>
            
            <div class="relative z-10 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mb-4 sm:mb-5 md:mb-6 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/30 pulse-ai backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h3 class="text-lg sm:text-xl md:text-2xl font-bold text-white mb-3 sm:mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Fake Information Detection
            </h3>
            <p class="text-sm sm:text-base text-slate-300/90 leading-relaxed flex-grow mb-4 sm:mb-5 md:mb-6">
              Cutting-edge AI technology identifies and flags fake information, protecting you from misinformation and deceptive content.
            </p>
            
            <div class="mt-auto pt-4 sm:pt-5 md:pt-6 border-t border-purple-500/20">
              <div class="flex items-center text-purple-400 text-xs sm:text-sm font-medium">
                <span>Verified Protection</span>
                <div class="ml-2 w-2 h-2 bg-purple-400 rounded-full pulse-ai"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, nextTick } from 'vue'

const SPLINE_SCRIPT_SRC = 'https://unpkg.com/@splinetool/viewer@1.10.90/build/spline-viewer.js'
const isSplineReady = ref(false)
const splineViewerRef = ref<any>(null)

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

// Optimized watermark removal function with performance in mind
function hideSplineWatermark() {
  if (typeof window === 'undefined') return

  // Target specific Spline viewer in index page using ref or class selector
  const viewer = splineViewerRef.value?.$el || 
                 splineViewerRef.value || 
                 document.querySelector('.spline-interactive') as HTMLElement
  
  if (!viewer) return

  try {
    // Remove backgrounds efficiently (batch style updates)
    Object.assign(viewer.style, {
      background: 'transparent',
      backgroundColor: 'transparent',
      backgroundImage: 'none'
    })
    
    const shadowRoot = viewer.shadowRoot
    if (shadowRoot) {
      // Remove background from canvas
      const canvas = shadowRoot.querySelector('canvas') as HTMLElement
      if (canvas) {
        Object.assign(canvas.style, {
          background: 'transparent',
          backgroundColor: 'transparent',
          backgroundImage: 'none'
        })
      }
      
      // Hide watermark elements efficiently - use most common selectors first
      const watermarkSelectors = [
        'a[href*="spline"]', // Links are most common watermark type
        '[class*="watermark"]',
        '[class*="logo"]',
        '[id*="watermark"]',
        '[id*="logo"]',
        '[class*="badge"]',
        '[class*="branding"]'
      ]
      
      // Batch DOM operations for better performance
      const watermarkElements: HTMLElement[] = []
      watermarkSelectors.forEach(selector => {
        try {
          const elements = shadowRoot.querySelectorAll(selector)
          elements.forEach((el: any) => {
            if (el && el.style && el.tagName) {
              const className = el.className?.toString().toLowerCase() || ''
              const id = el.id?.toString().toLowerCase() || ''
              const isWatermark = className.includes('logo') ||
                                 className.includes('watermark') ||
                                 id.includes('logo') ||
                                 id.includes('watermark') ||
                                 el.tagName === 'A'
              
              if (isWatermark && !watermarkElements.includes(el)) {
                watermarkElements.push(el)
              }
            }
          })
        } catch (e) {
          // Skip if selector fails - don't break execution
        }
      })
      
      // Batch style updates for all watermark elements
      watermarkElements.forEach(el => {
        Object.assign(el.style, {
          display: 'none',
          visibility: 'hidden',
          opacity: '0',
          pointerEvents: 'none',
          width: '0',
          height: '0',
          overflow: 'hidden'
        })
      })
    }

    // Check direct children (non-shadow DOM) - limit scope for performance
    const directChildren = viewer.querySelectorAll('a, [class*="logo"], [class*="watermark"], [id*="logo"], [id*="watermark"]')
    directChildren.forEach((el: any) => {
      if (el && el.style) {
        Object.assign(el.style, {
          display: 'none',
          visibility: 'hidden',
          opacity: '0',
          pointerEvents: 'none'
        })
      }
    })
    
    // Remove canvas backgrounds
    const canvases = viewer.querySelectorAll('canvas')
    canvases.forEach((canvas: any) => {
      if (canvas && canvas.style) {
        Object.assign(canvas.style, {
          background: 'transparent',
          backgroundColor: 'transparent'
        })
      }
    })
  } catch (error) {
    // Silently fail if we can't access shadow DOM - don't affect performance
    // Error is expected if shadow DOM is not accessible
  }
}

onMounted(async () => {
  try {
    await ensureSplineScript()
    isSplineReady.value = true
    
    await nextTick()
    
    // Optimized watermark removal with fewer attempts and debouncing
    let watermarkRemoved = false
    const removeWatermark = () => {
      if (!watermarkRemoved) {
        hideSplineWatermark()
        watermarkRemoved = true
      }
    }
    
    // Try removing watermark at strategic intervals
    const attempts = [200, 500, 1000] // Reduced attempts for better performance
    attempts.forEach(delay => {
      setTimeout(removeWatermark, delay)
    })

    // Use MutationObserver with debouncing for better performance
    let observerTimeout: ReturnType<typeof setTimeout> | null = null
    const observer = new MutationObserver(() => {
      // Debounce observer calls
      if (observerTimeout) clearTimeout(observerTimeout)
      observerTimeout = setTimeout(() => {
        if (!watermarkRemoved) {
          removeWatermark()
        }
      }, 100)
    })

    const checkInterval = setInterval(() => {
      const viewer = splineViewerRef.value?.$el || 
                     splineViewerRef.value || 
                     document.querySelector('.spline-interactive')
      if (viewer) {
        observer.observe(viewer, {
          childList: true,
          subtree: true,
          attributes: false,
          attributeFilter: ['class', 'style'] // Only watch relevant attributes
        })
        clearInterval(checkInterval)
        // Initial removal attempt
        setTimeout(removeWatermark, 100)
      }
    }, 100)

    // Cleanup after 8 seconds (reduced from 10s for better performance)
    setTimeout(() => {
      observer.disconnect()
      clearInterval(checkInterval)
      if (observerTimeout) clearTimeout(observerTimeout)
      // Final removal attempt
      removeWatermark()
    }, 8000)

  } catch (error) {
    console.error('[Spline] Viewer initialization failed', error)
  }
})
</script>

<style scoped>
/* Fade In Up Animation */
.fade-in-up {
  opacity: 0;
  transform: translateY(30px);
  animation: fadeInUp 0.8s ease-out forwards;
  animation-fill-mode: both;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Ensure content is hidden until animation starts */
.fade-in-up:not([style*="animation-delay"]) {
  opacity: 0;
}

/* Float Slow Animation */
.animate-float-slow {
  animation: floatSlow 20s ease-in-out infinite;
}

@keyframes floatSlow {
  0%, 100% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -30px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-3000 {
  animation-delay: 3s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}

.animation-delay-6000 {
  animation-delay: 6s;
}

/* Particle Field */
.particle-field {
  background-image: 
    radial-gradient(2px 2px at 20% 30%, rgba(34, 211, 238, 0.3), transparent),
    radial-gradient(2px 2px at 60% 70%, rgba(139, 92, 246, 0.3), transparent),
    radial-gradient(1px 1px at 50% 50%, rgba(59, 130, 246, 0.3), transparent);
  background-size: 200% 200%;
  animation: particleMove 20s ease-in-out infinite;
  opacity: 0.4;
}

@keyframes particleMove {
  0%, 100% {
    background-position: 0% 0%, 100% 100%, 50% 50%;
  }
  50% {
    background-position: 100% 100%, 0% 0%, 50% 50%;
  }
}

/* Small Neural Sphere */
.neural-sphere-small {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  animation: sphereRotate 20s infinite linear;
}

.neural-point-small {
  position: absolute;
  width: 2px;
  height: 2px;
  background: #06b6d4;
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(6, 182, 212, 0.6);
  top: 50%;
  left: 50%;
}

/* Small DNA Helix */
.dna-helix-small {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  animation: dnaRotate 25s infinite linear;
}

.dna-strand-small {
  position: absolute;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.6);
  box-shadow: 0 0 6px rgba(139, 92, 246, 0.5);
  top: 50%;
  left: 50%;
}

@keyframes sphereRotate {
  0% { transform: rotateX(0) rotateY(0) rotateZ(0); }
  100% { transform: rotateX(360deg) rotateY(360deg) rotateZ(360deg); }
}

@keyframes dnaRotate {
  0% { transform: rotateY(0) rotateX(0); }
  100% { transform: rotateY(360deg) rotateX(360deg); }
}

/* Spline Viewer Styles */
.spline-interactive-wrapper {
  width: 100%;
  height: min(280px, 85vw);
  overflow: hidden;
  position: relative;
}

@media (min-width: 640px) {
  .spline-interactive-wrapper {
    height: min(380px, 85vw);
  }
}

@media (min-width: 768px) {
  .spline-interactive-wrapper {
    height: min(450px, 85vw);
  }
}

@media (min-width: 1024px) {
  .spline-interactive-wrapper {
    height: min(520px, 85vw);
  }
}

.spline-interactive {
  width: 100%;
  height: 100%;
  background: transparent !important;
  background-color: transparent !important;
  cursor: grab;
}

.spline-interactive:active {
  cursor: grabbing;
}

spline-viewer {
  background: transparent !important;
  background-color: transparent !important;
}

spline-viewer canvas,
.spline-interactive-wrapper canvas {
  background: transparent !important;
  background-color: transparent !important;
}

/* Hide Spline watermark */
spline-viewer::part(logo),
spline-viewer::part(logo-container),
spline-viewer::part(branding),
spline-viewer::part(watermark) {
  display: none !important;
}

spline-viewer /deep/ [class*="logo"],
spline-viewer /deep/ [id*="logo"],
spline-viewer /deep/ [class*="watermark"],
spline-viewer /deep/ [id*="watermark"],
spline-viewer /deep/ [class*="branding"],
spline-viewer /deep/ [id*="branding"] {
  display: none !important;
}

spline-viewer::shadow [class*="logo"],
spline-viewer::shadow [id*="logo"],
spline-viewer::shadow [class*="watermark"],
spline-viewer::shadow [id*="watermark"] {
  display: none !important;
}

spline-viewer {
  --spline-viewer-logo-display: none;
}

.spline-interactive-wrapper ::ng-deep spline-viewer [class*="logo"],
.spline-interactive-wrapper ::ng-deep spline-viewer [class*="badge"] {
  display: none !important;
}

spline-viewer *[class*="logo"],
spline-viewer *[class*="badge"],
spline-viewer *[class*="watermark"],
spline-viewer *[class*="branding"],
spline-viewer *[id*="logo"],
spline-viewer *[id*="badge"],
spline-viewer *[id*="watermark"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  height: 0 !important;
  width: 0 !important;
  overflow: hidden !important;
  position: absolute !important;
  left: -9999px !important;
}

/* Additional watermark hiding for Spline viewer in index page */
.spline-interactive-wrapper spline-viewer::part(logo),
.spline-interactive-wrapper spline-viewer::part(logo-container),
.spline-interactive-wrapper spline-viewer::part(branding),
.spline-interactive-wrapper spline-viewer::part(watermark),
.spline-interactive-wrapper spline-viewer a,
.spline-interactive-wrapper spline-viewer [href*="spline"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
}

.none{
  display: none !important;
}
</style>
