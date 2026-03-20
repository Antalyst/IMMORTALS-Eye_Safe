<template>
  <Transition
    enter-active-class="transition-opacity duration-500 ease-out"
    enter-from-class="opacity-100"
    enter-to-class="opacity-0"
    leave-active-class="transition-opacity duration-500 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
    @after-leave="onAfterLeave"
  >
    <div
      v-if="isVisible"
      ref="introScreenRef"
      class="logo-intro-screen fixed inset-0 z-[10000] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
      :class="{ 'no-animation': prefersReducedMotion }"
    >
      <!-- Animated Background -->
      <div class="absolute inset-0 overflow-hidden">
        <!-- Gradient Orbs -->
        <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full mix-blend-screen filter blur-[120px] animate-blob-slow"></div>
        <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full mix-blend-screen filter blur-[120px] animate-blob-slow animation-delay-2000"></div>
      </div>

      <!-- Progress Bar - Shows First -->
      <div 
        v-if="showProgressBar"
        ref="progressBarContainerRef"
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-full max-w-md px-4 sm:px-6 md:px-8"
      >
        <div class="progress-bar-wrapper">
          <div class="progress-bar-label mb-4 text-center">
            <span class="text-sm sm:text-base md:text-lg text-cyan-400/80 font-medium tracking-wide">
              Loading...
            </span>
          </div>
          <div class="progress-bar-track relative h-2 sm:h-2.5 md:h-3 bg-slate-800/50 rounded-full overflow-hidden border border-cyan-500/20 backdrop-blur-sm">
            <div 
              ref="progressBarFillRef"
              class="progress-bar-fill h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
              :style="{ width: `${progressValue}%` }"
            >
              <div class="progress-bar-shine absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
          </div>
          <div class="progress-bar-percentage mt-2 text-center">
            <span 
              ref="progressPercentageRef"
              class="text-xs sm:text-sm text-cyan-400/60 font-mono"
              :style="{ opacity: progressValue > 0 ? 1 : 0 }"
            >
              {{ Math.round(progressValue) }}%
            </span>
          </div>
        </div>
      </div>

      <!-- Spline Logo Container -->
      <div 
        ref="contentContainerRef"
        class="relative z-10 flex flex-col items-center gap-4 w-full"
        :style="{ opacity: showContent ? 1 : 0, transition: 'opacity 0.5s ease-in' }"
      >
        <div
          ref="splineContainerRef"
          class="spline-logo-intro-wrapper w-full h-[60vh] sm:h-[70vh] md:h-[80vh] flex items-center justify-center spline-idle-motion"
        >
          <ClientOnly>
            <template #fallback>
              <div class="w-full h-full flex items-center justify-center">
                <div class="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
              </div>
            </template>
            <spline-viewer
              v-if="isSplineReady"
              ref="splineViewerRef"
              class="spline-logo-intro w-full h-full"
              url="https://prod.spline.design/3kHWT6La6UzaaBUV/scene.splinecode"
              background="transparent"
            />
          </ClientOnly>
        </div>
        <div class="flex flex-col items-center gap-2">
          <div 
            ref="eyeSafeTextRef"
            class="eye-safe-text-container flex items-center justify-center gap-1 sm:gap-2 md:gap-3"
          >
            <span
              v-for="(letter, index) in 'EyeSafe'.split('')"
              :key="index"
              :ref="el => setLetterRef(el, index)"
              class="eye-safe-letter text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-400 bg-clip-text text-transparent font-tech tracking-wide"
              :style="{ opacity: 0, transform: 'translateY(30px) scale(0.5)' }"
            >
              {{ letter }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue'

const isVisible = ref(true)
const introScreenRef = ref<HTMLElement | null>(null)
const splineContainerRef = ref<HTMLElement | null>(null)
const splineViewerRef = ref<any>(null)
const eyeSafeTextRef = ref<HTMLElement | null>(null)
const letterRefs = ref<(HTMLElement | null)[]>([])
const progressBarContainerRef = ref<HTMLElement | null>(null)
const progressBarFillRef = ref<HTMLElement | null>(null)
const progressPercentageRef = ref<HTMLElement | null>(null)
const contentContainerRef = ref<HTMLElement | null>(null)
const progressValue = ref(0)
const showProgressBar = ref(true)
const showContent = ref(false)
const isSplineReady = ref(false)
const prefersReducedMotion = ref(false)

const SPLINE_SCRIPT_SRC = 'https://unpkg.com/@splinetool/viewer@1.10.90/build/spline-viewer.js'

let gsap: any = null
let animationTimeline: any = null

// Check for prefers-reduced-motion
onMounted(() => {
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.value = mediaQuery.matches
    
    // Listen for changes
    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.value = e.matches
    }
    mediaQuery.addEventListener('change', handleChange)
    
    // Cleanup listener on unmount
    onBeforeUnmount(() => {
      mediaQuery.removeEventListener('change', handleChange)
    })
  }
  
  ensureSplineScript()
  startProgressBar()
})

const ensureSplineScript = async (): Promise<void> => {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }

  if ((window as any).customElements?.get('spline-viewer')) {
    isSplineReady.value = true
    await nextTick()
    await initializeAnimation()
    return Promise.resolve()
  }

  const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${SPLINE_SCRIPT_SRC}"]`)

  if (existingScript) {
    if ((window as any).customElements?.whenDefined) {
      await (window as any).customElements.whenDefined('spline-viewer')
      isSplineReady.value = true
      await nextTick()
      await initializeAnimation()
      return Promise.resolve()
    }
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.type = 'module'
    script.src = SPLINE_SCRIPT_SRC
    script.defer = true

    script.addEventListener('load', async () => {
      if ((window as any).customElements?.whenDefined) {
        try {
          await (window as any).customElements.whenDefined('spline-viewer')
          isSplineReady.value = true
          await nextTick()
          await initializeAnimation()
          resolve()
        } catch (error) {
          console.error('[LogoIntro] Spline viewer definition failed', error)
          reject(error)
        }
      } else {
        isSplineReady.value = true
        await nextTick()
        await initializeAnimation()
        resolve()
      }
    })

    script.addEventListener('error', (error) => {
      console.error('[LogoIntro] Failed to load Spline script', error)
      // Fallback: proceed without Spline
      setTimeout(() => {
        initializeAnimation()
      }, 1000)
      reject(error)
    })

    document.head.appendChild(script)
  })
}

const hideSplineWatermark = () => {
  if (typeof window === 'undefined') return

  const viewer = splineViewerRef.value || document.querySelector('.spline-logo-intro') as HTMLElement
  if (!viewer) return

  try {
    // Remove all backgrounds
    viewer.style.background = 'transparent'
    viewer.style.backgroundColor = 'transparent'
    viewer.style.backgroundImage = 'none'
    
    const shadowRoot = viewer.shadowRoot
    if (shadowRoot) {
      // Remove background from canvas
      const canvas = shadowRoot.querySelector('canvas')
      if (canvas) {
        const canvasEl = canvas as HTMLElement
        canvasEl.style.background = 'transparent'
        canvasEl.style.backgroundColor = 'transparent'
        canvasEl.style.backgroundImage = 'none'
      }
      
      // Remove background from any container elements
      const containers = shadowRoot.querySelectorAll('div, section, main')
      containers.forEach((el: any) => {
        if (el && el.style) {
          el.style.background = 'transparent'
          el.style.backgroundColor = 'transparent'
        }
      })
      
      // Hide Spline branding/watermarks
      const logos = shadowRoot.querySelectorAll('[class*="logo"], [id*="logo"], [class*="watermark"], [id*="watermark"], [class*="badge"], [class*="branding"]')
      logos.forEach((el: any) => {
        if (el) {
          el.style.display = 'none'
          el.style.visibility = 'hidden'
          el.style.opacity = '0'
          el.style.pointerEvents = 'none'
        }
      })
    }
  } catch (error) {
    // Silently fail if we can't access shadow DOM
  }
}

const initializeAnimation = async () => {
  // Only proceed if content is shown (after progress bar)
  if (!showContent.value) {
    return
  }

  // Wait a bit for Spline to render
  await nextTick()
  
  // Hide Spline watermark
  const attempts = [100, 300, 500, 1000, 2000]
  attempts.forEach(delay => {
    setTimeout(() => {
      hideSplineWatermark()
    }, delay)
  })
  
  // Try to load GSAP first
  try {
    if (typeof window !== 'undefined') {
      // Check if GSAP is available globally first
      if ((window as any).gsap) {
        gsap = (window as any).gsap
        console.log('[LogoIntro] GSAP loaded from global')
      } else {
        // Try to import GSAP dynamically
        try {
          // @ts-ignore - GSAP may not be installed, fallback to CSS animation
          const gsapModule = await import('gsap')
          gsap = gsapModule.gsap || gsapModule.default || (gsapModule as any)
          if (gsap) {
            console.log('[LogoIntro] GSAP loaded successfully')
          }
        } catch (importError) {
          console.warn('[LogoIntro] GSAP import failed, using CSS fallback:', importError)
        }
      }
    }
  } catch (error) {
    console.warn('[LogoIntro] GSAP not available, using CSS fallback:', error)
  }
  
  // Animate EyeSafe text letters appearing one by one (after GSAP check)
  await animateEyeSafeText()
  
  // Start main animation
  if (gsap) {
    await startGSAPAnimation()
  } else {
    // Fallback to CSS animation
    await startCSSAnimation()
  }
}

const startGSAPAnimation = async () => {
  if (!gsap || prefersReducedMotion.value) {
    // Skip animation if reduced motion is preferred
    setTimeout(() => {
      isVisible.value = false
      showNavbarLogo()
      // Ensure content is visible immediately
      const mainContent = document.querySelector('.main-content') || document.querySelector('main')
      if (mainContent) {
        ;(mainContent as HTMLElement).style.opacity = '1'
        ;(mainContent as HTMLElement).style.transform = 'none'
      }
    }, 500)
    return
  }

  await nextTick()
  
  if (!splineContainerRef.value || !introScreenRef.value) {
    console.error('[LogoIntro] Refs not available')
    return
  }

  // Get navbar logo position (use Spline viewer in navbar if available, otherwise use navbar logo)
  const navbarSpline = document.querySelector('.spline-logo-wrapper spline-viewer') as HTMLElement
  const navbarLogo = document.querySelector('.logo-navbar') as HTMLElement
  const targetElement = navbarSpline || navbarLogo
  
  if (!targetElement) {
    console.error('[LogoIntro] Navbar logo/Spline not found')
    // Fallback: just fade out
    gsap.to(introScreenRef.value, {
      opacity: 0,
      duration: 0.8,
      delay: 1,
      onComplete: () => {
        isVisible.value = false
        showNavbarLogo()
      }
    })
    return
  }

  // Get positions
  const introRect = splineContainerRef.value.getBoundingClientRect()
  const navbarRect = targetElement.getBoundingClientRect()
  
  // Calculate transform values
  const deltaX = navbarRect.left + navbarRect.width / 2 - (introRect.left + introRect.width / 2)
  const deltaY = navbarRect.top + navbarRect.height / 2 - (introRect.top + introRect.height / 2)
  const finalScale = Math.min(navbarRect.width / introRect.width, 0.3) // Scale down significantly for navbar

  // Hide navbar logo/Spline initially
  targetElement.style.opacity = '0'

  // Create animation timeline with improved 3-step movement
  animationTimeline = gsap.timeline({
    onComplete: () => {
      // Hide intro Spline completely before showing navbar
      if (splineContainerRef.value) {
        splineContainerRef.value.style.opacity = '0'
        splineContainerRef.value.style.pointerEvents = 'none'
      }
      // Small delay to ensure clean transition
      setTimeout(() => {
        isVisible.value = false
        showNavbarLogo()
      }, 100)
    }
  })

  // Step 1a: Zoom center (scale 1 → 1.15) with power1.inOut
  animationTimeline.to(splineContainerRef.value, {
    scale: 1.15,
    duration: 2.0,
    ease: 'power1.inOut',
    delay: 1.8 // Start at 3.8s (1.8s after content appears at 2s)
  })

  // Step 1b: Arc motion to navbar using curved path
  // Create arc effect by animating y position separately
  const arcHeight = 30 // Arc height in pixels
  
  // Animate x and scale
  animationTimeline.to(splineContainerRef.value, {
    x: deltaX,
    scale: finalScale,
    duration: 5.0,
    ease: 'power2.inOut',
    delay: -0.5 // Overlap with zoom
  }, '<')
  
  // Animate y with arc (starts higher, goes down, then up)
  animationTimeline.to(splineContainerRef.value, {
    y: deltaY - arcHeight, // Start arc upward
    duration: 2.5,
    ease: 'power2.out',
    delay: -5.0
  }, '<')
  .to(splineContainerRef.value, {
    y: deltaY, // Complete arc to final position
    duration: 2.5,
    ease: 'power2.in'
  })

  // Step 1c: Micro bounce on navbar landing
  animationTimeline.to(splineContainerRef.value, {
    scale: 0.33, // Bounce up
    duration: 0.15,
    ease: 'power2.out',
    delay: -0.1 // Start just before landing
  })
  .to(splineContainerRef.value, {
    scale: 0.3, // Settle
    duration: 0.2,
    ease: 'power2.in'
  })

  // Step 2: Fade out Spline during movement (overlapped)
  animationTimeline.to(splineContainerRef.value, {
    opacity: 0,
    duration: 4.0,
    ease: 'power2.in',
    delay: -4.0 // Start during movement
  }, '<')

  // Step 3: Glow shrinking effect
  if (splineContainerRef.value) {
    animationTimeline.to(splineContainerRef.value, {
      filter: 'drop-shadow(0 0 0px rgba(34, 211, 238, 0))',
      duration: 4.0,
      ease: 'power2.in',
      delay: -4.0
    }, '<')
  }

  // Step 4: Background fade with blur
  animationTimeline.to(
    introScreenRef.value,
    {
      opacity: 0,
      filter: 'blur(10px)',
      duration: 4.0,
      ease: 'power2.out',
      delay: -3.0 // Start after movement begins
    },
    '<'
  )

  // Fade in main content with stagger (starts at 7.8s)
  const mainContent = document.querySelector('.main-content') || document.querySelector('main')
  if (mainContent) {
    // Set initial state
    ;(mainContent as HTMLElement).style.opacity = '0'
    ;(mainContent as HTMLElement).style.transform = 'translateY(20px)'
    
    // Stagger individual content elements
    const contentElements = mainContent.querySelectorAll('div, h1, h2, h3, p, img, section')
    contentElements.forEach((el, index) => {
      const htmlEl = el as HTMLElement
      htmlEl.style.opacity = '0'
      
      // Different translateY for images vs text
      const isImage = el.tagName === 'IMG' || el.querySelector('img')
      htmlEl.style.transform = `translateY(${isImage ? 30 : 20}px)`
      
      gsap.to(htmlEl, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: 5.8 + (index * 0.1), // Start at 7.8s with stagger
        ease: 'power2.out'
      })
    })
    
    // Also animate main container
    gsap.to(mainContent, {
      opacity: 1,
      y: 0,
      duration: 2.0,
      delay: 5.8, // Start at 7.8s
      ease: 'power2.out',
      onComplete: () => {
        ;(mainContent as HTMLElement).style.opacity = '1'
        ;(mainContent as HTMLElement).style.transform = 'translateY(0)'
      }
    })
  } else {
    // Fallback: show content after delay
    setTimeout(() => {
      const fallbackContent = document.querySelector('.main-content') || document.querySelector('main')
      if (fallbackContent) {
        ;(fallbackContent as HTMLElement).style.opacity = '1'
        ;(fallbackContent as HTMLElement).style.transform = 'translateY(0)'
      }
    }, 10000)
  }
}

const startCSSAnimation = async () => {
  if (prefersReducedMotion.value) {
    // Skip animation if reduced motion is preferred
    setTimeout(() => {
      isVisible.value = false
      showNavbarLogo()
      // Ensure content is visible immediately
      const mainContent = document.querySelector('.main-content') || document.querySelector('main')
      if (mainContent) {
        ;(mainContent as HTMLElement).style.opacity = '1'
        ;(mainContent as HTMLElement).style.transform = 'none'
      }
    }, 500)
    return
  }

  await nextTick()
  
  if (!splineContainerRef.value || !introScreenRef.value) {
    console.error('[LogoIntro] Refs not available for CSS animation')
    return
  }

  // Get navbar logo/Spline position
  const navbarSpline = document.querySelector('.spline-logo-wrapper spline-viewer') as HTMLElement
  const navbarLogo = document.querySelector('.logo-navbar') as HTMLElement
  const targetElement = navbarSpline || navbarLogo
  
  if (!targetElement) {
    console.error('[LogoIntro] Navbar logo/Spline not found for CSS animation')
    // Fallback: just fade out
    setTimeout(() => {
      isVisible.value = false
      showNavbarLogo()
    }, 1500)
    return
  }

  // Hide navbar logo/Spline initially
  targetElement.style.opacity = '0'

  // Get positions
  const introRect = splineContainerRef.value.getBoundingClientRect()
  const navbarRect = targetElement.getBoundingClientRect()
  
  // Calculate transform values
  const deltaX = navbarRect.left + navbarRect.width / 2 - (introRect.left + introRect.width / 2)
  const deltaY = navbarRect.top + navbarRect.height / 2 - (introRect.top + introRect.height / 2)
  const finalScale = Math.min(navbarRect.width / introRect.width, 0.3)

  // Set CSS custom properties for animation
  splineContainerRef.value.style.setProperty('--target-x', `${deltaX}px`)
  splineContainerRef.value.style.setProperty('--target-y', `${deltaY}px`)
  splineContainerRef.value.style.setProperty('--target-scale', finalScale.toString())
  splineContainerRef.value.style.setProperty('--zoom-scale', '1.15') // Match GSAP zoom
  
  // Add animation class
  splineContainerRef.value.classList.add('spline-animate-to-navbar')

  // Fade out intro screen smoothly (starts around 5s)
  setTimeout(() => {
    if (introScreenRef.value) {
      introScreenRef.value.style.transition = 'opacity 4s ease-out'
      introScreenRef.value.style.opacity = '0'
    }
  }, 5000)

  // Fade in main content (starts around 8s)
  const mainContent = document.querySelector('.main-content') || document.querySelector('main')
  if (mainContent) {
    ;(mainContent as HTMLElement).style.opacity = '0'
    setTimeout(() => {
      ;(mainContent as HTMLElement).style.transition = 'opacity 2s ease-out, transform 2s ease-out'
      ;(mainContent as HTMLElement).style.opacity = '1'
      ;(mainContent as HTMLElement).style.transform = 'translateY(0)'
    }, 8000)
  }

  // Complete animation - ensure Spline is completely hidden before showing navbar (10s total)
  setTimeout(() => {
    // Hide Spline completely
    if (splineContainerRef.value) {
      splineContainerRef.value.style.opacity = '0'
      splineContainerRef.value.style.pointerEvents = 'none'
      splineContainerRef.value.style.visibility = 'hidden'
    }
    
    // Small delay to ensure clean transition
    setTimeout(() => {
      isVisible.value = false
      showNavbarLogo()
      
      // Final fallback: ensure content is visible
      const mainContent = document.querySelector('.main-content') || document.querySelector('main')
      if (mainContent) {
        ;(mainContent as HTMLElement).style.opacity = '1'
        ;(mainContent as HTMLElement).style.transform = 'translateY(0)'
        ;(mainContent as HTMLElement).classList.add('visible')
      }
    }, 150) // Small delay for clean transition
  }, 10000) // 10 seconds total
  
  // Safety timeout: always show content after 10.5 seconds
  setTimeout(() => {
    const mainContent = document.querySelector('.main-content') || document.querySelector('main')
    if (mainContent) {
      ;(mainContent as HTMLElement).style.opacity = '1'
      ;(mainContent as HTMLElement).style.transform = 'translateY(0)'
      ;(mainContent as HTMLElement).classList.add('visible')
    }
  }, 10500)
}

const showNavbarLogo = () => {
  // Ensure intro Spline is completely hidden first
  if (splineContainerRef.value) {
    splineContainerRef.value.style.opacity = '0'
    splineContainerRef.value.style.visibility = 'hidden'
    splineContainerRef.value.style.pointerEvents = 'none'
  }
  
  // Small delay to ensure clean transition
  setTimeout(() => {
    // Show navbar Spline if available, otherwise show logo
    const navbarSpline = document.querySelector('.spline-logo-wrapper spline-viewer') as HTMLElement
    const navbarLogo = document.querySelector('.logo-navbar') as HTMLElement
    
    if (navbarSpline) {
      navbarSpline.style.transition = 'opacity 0.6s ease-out'
      navbarSpline.style.opacity = '1'
    }
    
    if (navbarLogo) {
      navbarLogo.style.transition = 'opacity 0.6s ease-out'
      navbarLogo.style.opacity = '1'
    }
  }, 100) // Small delay for clean transition
  
  // Ensure main content is visible
  const mainContent = document.querySelector('.main-content') || document.querySelector('main')
  if (mainContent) {
    const mainEl = mainContent as HTMLElement
    mainEl.style.opacity = '1'
    mainEl.style.transform = 'translateY(0)'
    mainEl.classList.add('visible')
  }
  
  // Also ensure body content is visible (fallback)
  setTimeout(() => {
    const allContent = document.querySelectorAll('.main-content, main, [class*="content"]')
    allContent.forEach((el) => {
      const htmlEl = el as HTMLElement
      if (htmlEl && htmlEl.style) {
        htmlEl.style.opacity = '1'
        htmlEl.style.transform = 'translateY(0)'
      }
    })
  }, 100)
}

const setLetterRef = (el: any, index: number) => {
  if (el) {
    letterRefs.value[index] = el
  }
}

const startProgressBar = () => {
  if (prefersReducedMotion.value) {
    // Skip progress bar if reduced motion
    progressValue.value = 100
    setTimeout(() => {
      showProgressBar.value = false
      showContent.value = true
    }, 100)
    return
  }

  // Animate progress bar from 0% to 100% with ease-out
  const duration = 2000 // 2 seconds for progress bar
  const startTime = Date.now()
  
  // Ease-out function
  const easeOut = (t: number): number => {
    return 1 - Math.pow(1 - t, 3)
  }
  
  const updateProgress = () => {
    const elapsed = Date.now() - startTime
    const rawProgress = Math.min(elapsed / duration, 1)
    const easedProgress = easeOut(rawProgress)
    const progress = easedProgress * 100
    progressValue.value = progress

    // Animate percentage number with easing
    if (progressPercentageRef.value) {
      if (gsap) {
        gsap.to(progressPercentageRef.value, {
          scale: 1 + (progress / 100) * 0.1,
          duration: 0.1,
          ease: 'power1.out'
        })
      } else {
        // CSS fallback for percentage animation
        const scale = 1 + (progress / 100) * 0.1
        progressPercentageRef.value.style.transition = 'transform 0.1s ease-out'
        progressPercentageRef.value.style.transform = `scale(${scale})`
      }
    }

    if (progress < 100) {
      requestAnimationFrame(updateProgress)
    } else {
      // Pulse effect at 100%
      if (progressBarFillRef.value) {
        if (gsap) {
          gsap.to(progressBarFillRef.value, {
            scale: 1.02,
            duration: 0.2,
            yoyo: true,
            repeat: 2,
            ease: 'power2.inOut'
          })
        } else {
          // CSS fallback pulse
          progressBarFillRef.value.classList.add('pulse-complete')
          setTimeout(() => {
            if (progressBarFillRef.value) {
              progressBarFillRef.value.classList.remove('pulse-complete')
            }
          }, 1800)
        }
      }
      
      // Progress complete - hide progress bar and show content
      setTimeout(() => {
        if (progressBarContainerRef.value) {
          progressBarContainerRef.value.style.transition = 'opacity 0.5s ease-out'
          progressBarContainerRef.value.style.opacity = '0'
        }
        setTimeout(() => {
          showProgressBar.value = false
          showContent.value = true
          // Start Spline and EyeSafe animations after content is shown
          nextTick(() => {
            initializeAnimation()
          })
        }, 500)
      }, 300)
    }
  }

  requestAnimationFrame(updateProgress)
}

const animateEyeSafeText = async () => {
  await nextTick()
  
  if (prefersReducedMotion.value) {
    // Show all letters immediately if reduced motion
    letterRefs.value.forEach((letter) => {
      if (letter) {
        letter.style.opacity = '1'
        letter.style.transform = 'translateY(0) scale(1)'
      }
    })
    return
  }
  
  // Use GSAP if available
  if (gsap && letterRefs.value.length > 0) {
    const letters = letterRefs.value.filter(Boolean)
    
    letters.forEach((letter, index) => {
      if (!letter) return
      
      // Random rotation ±2° per letter
      const rotation = (Math.random() - 0.5) * 4 // -2° to +2°
      
      // Scale overshoot: 1 → 1.2 → 1
      const scaleTimeline = gsap.timeline({
        delay: 0.3 + (index * 0.128) // 0.9s total / 7 letters ≈ 0.128s per letter
      })
      
      // Initial blur → sharp effect
      gsap.set(letter, {
        filter: 'blur(10px)',
        opacity: 0,
        y: 30,
        scale: 0.5,
        rotation: rotation
      })
      
      // Animate with overshoot
      scaleTimeline.to(letter, {
        opacity: 1,
        y: 0,
        scale: 1.2, // Overshoot
        rotation: rotation,
        filter: 'blur(0px)',
        duration: 0.4,
        ease: 'power2.out'
      })
      .to(letter, {
        scale: 1, // Settle to final
        duration: 0.2,
        ease: 'power2.in'
      })
    })
  } else {
    // CSS fallback animation with overshoot
    letterRefs.value.forEach((letter, index) => {
      if (letter) {
        const delay = 0.3 + (index * 0.128) // Tightened stagger: 0.9s total / 7 letters
        const rotation = (Math.random() - 0.5) * 4 // -2° to +2°
        
        letter.style.filter = 'blur(10px)'
        letter.style.opacity = '0'
        letter.style.transform = `translateY(30px) scale(0.5) rotate(${rotation}deg)`
        
        // Overshoot animation
        setTimeout(() => {
          if (letter) {
            letter.style.transition = 'opacity 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55), transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55), filter 0.4s ease-out'
            letter.style.opacity = '1'
            letter.style.transform = `translateY(0) scale(1.2) rotate(${rotation}deg)`
            letter.style.filter = 'blur(0px)'
            
            // Settle to final scale
            setTimeout(() => {
              if (letter) {
                letter.style.transition = 'transform 0.2s cubic-bezier(0.55, 0.055, 0.675, 0.19)'
                letter.style.transform = `translateY(0) scale(1) rotate(${rotation}deg)`
              }
            }, 400)
          }
        }, delay * 1000)
      }
    })
  }
}

const onAfterLeave = () => {
  // Cleanup animation timeline if GSAP was used
  if (animationTimeline) {
    animationTimeline.kill()
    animationTimeline = null
  }
}
</script>

<style scoped>
.logo-intro-screen {
  background: linear-gradient(135deg, #0a0e27 0%, #0f172a 50%, #1a1f3a 100%);
}

.spline-logo-intro-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  will-change: transform, opacity; /* Optimize for animations */
  backface-visibility: hidden; /* Prevent flickering */
  transform-style: preserve-3d; /* Better 3D rendering */
}

/* Subtle idle motion for Spline */
.spline-idle-motion {
  animation: splineIdleFloat 8s ease-in-out infinite;
}

@keyframes splineIdleFloat {
  0%, 100% {
    transform: translateY(0) rotateZ(0deg);
  }
  25% {
    transform: translateY(-10px) rotateZ(1deg);
  }
  50% {
    transform: translateY(0) rotateZ(0deg);
  }
  75% {
    transform: translateY(10px) rotateZ(-1deg);
  }
}

/* Micro parallax on hover */
.spline-logo-intro-wrapper:hover .spline-logo-intro {
  transform: translateZ(20px) scale(1.02);
  transition: transform 0.3s ease-out;
}

.spline-logo-intro {
  width: 100% !important;
  height: 100% !important;
  background: transparent !important;
  background-color: transparent !important;
  filter: drop-shadow(0 0 30px rgba(34, 211, 238, 0.4));
  transition: filter 0.3s ease;
  will-change: transform, opacity; /* Optimize for animations */
  backface-visibility: hidden; /* Prevent flickering */
}

/* Ensure Spline canvas has no background */
.spline-logo-intro::part(canvas),
.spline-logo-intro canvas {
  background: transparent !important;
  background-color: transparent !important;
}

/* CSS Animation Fallback - 10 seconds total */
.spline-animate-to-navbar {
  animation: splineToNavbar 10s cubic-bezier(0.4, 0, 0.2, 1) 1s forwards;
  transform-origin: center center;
}

@keyframes splineToNavbar {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
    visibility: visible;
  }
  10% {
    transform: translate(0, 0) scale(var(--zoom-scale, 1.15));
    opacity: 1;
    visibility: visible;
  }
  40% {
    transform: translate(
      calc(var(--target-x, 0) * 0.4), 
      calc(var(--target-y, 0) * 0.4)
    ) scale(calc(var(--target-scale, 0.3) + 0.5));
    opacity: 0.95;
    visibility: visible;
  }
  70% {
    transform: translate(
      calc(var(--target-x, 0) * 0.7), 
      calc(var(--target-y, 0) * 0.7)
    ) scale(calc(var(--target-scale, 0.3) + 0.2));
    opacity: 0.5;
    visibility: visible;
  }
  90% {
    transform: translate(
      calc(var(--target-x, 0) * 0.9), 
      calc(var(--target-y, 0) * 0.9)
    ) scale(calc(var(--target-scale, 0.3) + 0.05));
    opacity: 0.2;
    visibility: visible;
  }
  100% {
    transform: translate(var(--target-x, 0), var(--target-y, 0)) scale(var(--target-scale, 0.3));
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }
}

/* Reduced Motion Support */
.no-animation .spline-logo-intro-wrapper {
  animation: none !important;
  transform: none !important;
}

/* Blob Animation */
.animate-blob-slow {
  animation: blobSlow 15s ease-in-out infinite;
}

@keyframes blobSlow {
  0%, 100% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(50px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-30px, 30px) scale(0.9);
  }
}

.animation-delay-2000 {
  animation-delay: 2s;
}

/* Progress Bar Styles */
.progress-bar-wrapper {
  width: 100%;
}

.progress-bar-track {
  position: relative;
  box-shadow: 0 0 20px rgba(34, 211, 238, 0.2) inset;
}

.progress-bar-fill {
  box-shadow: 0 0 10px rgba(34, 211, 238, 0.5),
              0 0 20px rgba(59, 130, 246, 0.3);
  position: relative;
  transition: width 0.1s ease-out;
}

/* Pulse effect at 100% */
.progress-bar-fill.pulse-complete {
  animation: progressPulse 0.6s ease-in-out 3;
}

@keyframes progressPulse {
  0%, 100% {
    transform: scaleX(1);
    box-shadow: 0 0 10px rgba(34, 211, 238, 0.5),
                0 0 20px rgba(59, 130, 246, 0.3);
  }
  50% {
    transform: scaleX(1.02);
    box-shadow: 0 0 20px rgba(34, 211, 238, 0.8),
                0 0 40px rgba(59, 130, 246, 0.6);
  }
}

.progress-bar-shine {
  width: 50%;
  height: 100%;
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(200%);
  }
}

.progress-bar-label {
  text-shadow: 0 0 10px rgba(34, 211, 238, 0.5);
}

.progress-bar-percentage {
  font-variant-numeric: tabular-nums;
}

/* Hide Spline watermark */
.spline-logo-intro::part(logo),
.spline-logo-intro::part(logo-container),
.spline-logo-intro::part(branding),
.spline-logo-intro::part(watermark) {
  display: none !important;
}

/* EyeSafe Text Animation Styles */
.eye-safe-text-container {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
}

.eye-safe-letter {
  display: inline-block;
  will-change: transform, opacity, filter;
  backface-visibility: hidden;
  transform-origin: center center;
  text-shadow: 0 0 20px rgba(34, 211, 238, 0.5),
               0 0 40px rgba(59, 130, 246, 0.3),
               0 0 60px rgba(139, 92, 246, 0.2);
  filter: drop-shadow(0 0 10px rgba(34, 211, 238, 0.4));
  transition: filter 0.3s ease;
}

.eye-safe-letter:hover {
  filter: drop-shadow(0 0 20px rgba(34, 211, 238, 0.6));
}

/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .spline-logo-intro-wrapper,
  .animate-blob-slow,
  .eye-safe-letter {
    animation: none !important;
  }
  
  .logo-intro-screen {
    transition: opacity 0.3s ease !important;
  }
  
  .eye-safe-letter {
    opacity: 1 !important;
    transform: translateY(0) scale(1) !important;
  }
}
</style>
