<template>
  <div class="grid lg:grid-cols-2 gap-6 h-full max-h-[calc(150vh)] p-4 sm:p-6 lg:p-8 w-full">

    <div class="flex flex-col min-h-0">
      <div class="flex-none flex flex-col sm:flex-row gap-4 p-4 sm:p-6 items-center justify-between glass-strong rounded-2xl mb-6 border border-cyan-500/20 shadow-glow-lg w-full">
        <button 
          class="btn-neon relative group px-8 py-4 font-semibold text-lg rounded-xl text-white transition-all duration-300 
            disabled:opacity-50 disabled:cursor-not-allowed" 
          @click="onToggle" 
          :disabled="isToggling || analyzing">
          <div class="relative z-10 flex items-center gap-2">
            <svg v-if="!analyzing && isSharing" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            <svg v-else-if="!analyzing" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M15 10.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z" />
            </svg>
            <div v-else class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>{{ analyzing ? 'Analyzing...' : isSharing ? 'Stop Veritas-Scan' : 'Start Veritas-Scan' }}</span>
          </div>
        </button>
        <label class="flex items-center gap-3 cursor-pointer group/label">
          <input 
            class="w-5 h-5 rounded border-cyan-500/50 text-cyan-400 focus:ring-cyan-400 focus:ring-2 bg-slate-800/50 cursor-pointer accent-cyan-400" 
            type="checkbox" 
            v-model="publicOnly" />
          <span class="text-base font-semibold text-slate-200 group-hover/label:text-cyan-300 transition-colors">Public Post Only</span>
        </label>
      </div>

      <!-- Video Container -->
      <div v-if="isSharing" class="flex-1 min-h-0 glass-strong rounded-2xl relative border border-cyan-500/20 shadow-glow-lg overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-purple-500/10"></div>
        <div class="absolute inset-0">
          <video 
            ref="videoEl" 
            class="w-full h-full object-contain"
            autoplay 
            playsinline 
            muted>
          </video>
          <div v-if="isSharing && videoEl" class="absolute bottom-0 left-0 right-0 glass border-t border-cyan-500/20 text-sm p-3 text-slate-200">
            <div class="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span class="font-mono text-xs">{{ videoEl.videoWidth }}x{{ videoEl.videoHeight }}</span>
              <span class="text-slate-400">|</span>
              <span class="flex items-center gap-2" :class="videoEl.readyState === 4 ? 'text-cyan-400' : 'text-yellow-400'">
                <span v-if="videoEl.readyState === 4" class="w-2 h-2 bg-cyan-400 rounded-full pulse-ai"></span>
                <span v-else class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                {{ videoEl.readyState === 4 ? 'Ready' : 'Loading...' }}
              </span>
            </div>
          </div>
        </div>
      </div>
       <div v-if="analyzing" class="glass-strong p-8 rounded-2xl text-white mb-6 border border-cyan-500/20 shadow-glow-lg">
          <div class="flex items-start gap-6">
            <div class="relative">
              <div class="spinner"></div>
              <div class="absolute inset-0 spinner border-t-purple-400" style="animation-delay: 0.5s"></div>
            </div>
            <div class="flex-1">
              <h3 class="text-2xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-400 bg-clip-text text-transparent font-tech">AI Analysis in Progress...</h3>
              <div class="space-y-3 flex flex-col">
                <div class="flex items-center gap-3 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                  <div class="w-2 h-2 rounded-full bg-cyan-400 pulse-ai"></div>
                  <span class="text-slate-200 font-medium">Extracting text from screenshot...</span>
                </div>
                <div class="flex items-center gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <div class="w-2 h-2 rounded-full bg-blue-400 pulse-ai" style="animation-delay: 0.2s"></div>
                  <span class="text-slate-200 font-medium">Classifying truthfulness...</span>
                </div>
                <div class="flex items-center gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                  <div class="w-2 h-2 rounded-full bg-purple-400 pulse-ai" style="animation-delay: 0.4s"></div>
                  <span class="text-slate-200 font-medium">Assessing panic risk...</span>
                </div>
                <div class="flex items-center gap-3 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                  <div class="w-2 h-2 rounded-full bg-cyan-400 pulse-ai" style="animation-delay: 0.6s"></div>
                  <span class="text-slate-200 font-medium">Segregating results...</span>
                </div>
              </div>
              <p class="text-sm text-slate-400 mt-6 flex items-center gap-2">
                <svg class="w-4 h-4 text-cyan-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                This may take 10-30 seconds. Please wait...
              </p>
            </div>
          </div>
        </div>
    </div>

    <!-- Right Column - AI Analysis -->
    <div class="flex flex-col min-h-0 w-full">
      <div class="flex-1 glass-strong rounded-2xl overflow-hidden border border-cyan-500/20 shadow-glow-lg w-full">
        <div class="h-full overflow-y-auto custom-scrollbar px-4 sm:px-6 lg:px-8 py-5 relative w-full">
          <div class="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-purple-500/10 pointer-events-none"></div>
          <div class="relative">
            <div class="mb-4 pb-4 border-b border-cyan-500/20">
              <h2 class="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent font-tech">Analysis Results</h2>
            </div>
          <!-- Analysis Progress -->
         

          <!-- Waiting Message -->
          <div 
            v-if="isSharing && !analyzing && results.verifiedLowRisk.length === 0 && results.highRiskAlerts.length === 0 && !lastError" 
            class="glass p-8 rounded-2xl mb-6 border border-cyan-500/20">
            <div class="flex items-center gap-4 mb-4">
              <div class="relative">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-cyan-400 pulse-ai" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
                <div class="absolute inset-0 w-8 h-8 bg-cyan-400/20 rounded-full blur-xl"></div>
              </div>
              <p class="text-lg font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-400 bg-clip-text text-transparent">Screen share active. Waiting for content analysis...</p>
            </div>
            <p class="text-sm text-slate-300/80 leading-relaxed">
              Check browser console (F12) for detailed logs. If analysis doesn't start, try unchecking "Analyze public posts only".
            </p>
          </div>

          <!-- Results -->
          <VeritasResults 
            v-if="isSharing || scanCompleted || (results.verifiedLowRisk.length > 0 || results.highRiskAlerts.length > 0)" 
            :results="results" 
          />
          
          <!-- Crime Verification Stats -->
          <div v-if="verificationStats.totalAlerts > 0" class="glass-strong rounded-2xl p-6 mb-6 border border-cyan-500/20">
            <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>🚨</span>
              <span>Real-Time Crime Verification</span>
            </h3>
            <div class="grid grid-cols-3 gap-4 text-center">
              <div>
                <div class="text-2xl font-bold text-cyan-400">{{ verificationStats.totalAlerts }}</div>
                <div class="text-sm text-slate-400">Total Alerts</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-green-400">{{ verificationStats.totalVerified }}</div>
                <div class="text-sm text-slate-400">Verified</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-red-400">{{ verificationStats.criticalAlerts }}</div>
                <div class="text-sm text-slate-400">Critical</div>
              </div>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="lastError" class="glass p-6 rounded-2xl mb-6 border border-red-500/30 bg-red-900/20 backdrop-blur-lg">
            <div class="flex items-center gap-3">
              <div class="relative">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div class="absolute inset-0 w-6 h-6 bg-red-400/20 rounded-full blur-md"></div>
              </div>
              <span class="text-red-200 font-semibold">{{ lastError }}</span>
            </div>
          </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Real-Time Crime Alerts Overlay -->
    <ClientOnly>
      <CrimeAlerts />
    </ClientOnly>

</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useVeritasScan } from '../composables/useVeritasScan'
import { useCrimeVerification } from '../composables/useCrimeVerification'
import CrimeAlerts from './CrimeAlerts.vue'

const isSharing = ref(false)
const isToggling = ref(false)
const streamRef = ref<MediaStream | null>(null)
const videoEl = ref<HTMLVideoElement | null>(null)
const privacyStopped = ref(false)
const publicOnly = ref(false)
const scanCompleted = ref(false)

const { analyzing, results, scan, startContinuousScan, stopContinuousScan, lastError } = useVeritasScan()
const { verifyCrimeReport, highPriorityAlerts, verificationStats } = useCrimeVerification()
const route = useRoute()

const sensitiveRoutePatterns = [
  /message/i,
  /inbox/i,
  /dm\b/i,
  /chat/i,
  /mail/i
]

function getCanvasFromVideo(): HTMLCanvasElement | null {
  if (!videoEl.value) {
    console.log('[ScreenShare] No video element')
    return null
  }
  const vid = videoEl.value
  const w = Math.max(1, vid.videoWidth)
  const h = Math.max(1, vid.videoHeight)
  if (w <= 1 || h <= 1) {
    console.log('[ScreenShare] Video not ready, size:', w, 'x', h)
    return null
  }
  const canvas = document.createElement('canvas')
  const maxW = 1280
  const scale = Math.min(1, maxW / w)
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(vid, 0, 0, canvas.width, canvas.height)
  console.log('[ScreenShare] Canvas created:', canvas.width, 'x', canvas.height)
  return canvas
}

async function checkPublicFilter(canvas: HTMLCanvasElement): Promise<boolean> {
  if (!publicOnly.value) return true
  console.log('[ScreenShare] Checking public filter...')
  try {
    if (!(window as any).Tesseract) {
      console.log('[ScreenShare] Loading Tesseract for public filter...')
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
        script.async = true
        script.onload = () => {
          console.log('[ScreenShare] Tesseract loaded successfully')
          resolve()
        }
        script.onerror = () => reject(new Error('Failed to load tesseract'))
        document.head.appendChild(script)
      })
    }
    const t = (window as any).Tesseract
    const topCrop = document.createElement('canvas')
    const ch = Math.max(50, Math.round(canvas.height * 0.25))
    topCrop.width = canvas.width
    topCrop.height = ch
    const ctx = topCrop.getContext('2d')!
    ctx.drawImage(canvas, 0, 0, canvas.width, ch, 0, 0, canvas.width, ch)
    console.log('[ScreenShare] Running OCR on top', ch, 'pixels of canvas...')
    const { data } = await t.recognize(topCrop, 'eng', { logger: () => {} })
    const extractedText = String(data?.text || '').toLowerCase()
    const hasPublic = extractedText.includes('public')
    console.log('[ScreenShare] OCR extracted text from top region:', extractedText.substring(0, 100))
    console.log('[ScreenShare] Public filter result:', hasPublic, '(looking for "public" in extracted text)')
    return hasPublic
  } catch (e: any) {
    console.error('[ScreenShare] Public filter error:', e)
    console.warn('[ScreenShare] OCR failed, allowing scan to proceed (fail-safe)')
    return true 
  }
}

async function startShare() {
  console.log('[ScreenShare] ===== STARTING SCREEN SHARE =====')
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
    console.error('[ScreenShare] Screen capture not available')
    return
  }
  isToggling.value = true
  scanCompleted.value = false
  stopContinuousScan() 
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'browser' 
      } as any,
      audio: false
    })

    streamRef.value = stream

   
    isSharing.value = true
    privacyStopped.value = false

    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    if (videoEl.value) {
      const video = videoEl.value
      if (video.srcObject) {
        const oldStream = video.srcObject as MediaStream
        oldStream.getTracks().forEach(track => track.stop())
      }
      video.srcObject = stream
      console.log('[ScreenShare] Video stream attached')
      
      // Wait for the video to be ready to play
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video load timeout'))
        }, 5000)
        
        const onLoadedMetadata = () => {
          clearTimeout(timeout)
          video.removeEventListener('loadedmetadata', onLoadedMetadata)
          video.removeEventListener('error', onError)
          console.log('[ScreenShare] Video metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight)
          resolve()
        }
        
        const onError = (e: Event) => {
          clearTimeout(timeout)
          video.removeEventListener('loadedmetadata', onLoadedMetadata)
          video.removeEventListener('error', onError)
          reject(new Error('Video error'))
        }
        
        video.addEventListener('loadedmetadata', onLoadedMetadata)
        video.addEventListener('error', onError)
        
        // Try to play if not already playing
        video.play().catch(err => {
          console.warn('[ScreenShare] Video play failed (may be muted):', err)
          // Still resolve if metadata loaded
          if (video.readyState >= 1) {
            clearTimeout(timeout)
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            video.removeEventListener('error', onError)
            resolve()
          }
        })
      })
    } else {
      console.warn('[ScreenShare] Video element not found after nextTick')
    }

    const [track] = stream.getVideoTracks()
    if (track) {
      track.addEventListener('ended', () => {
        console.log('[ScreenShare] Stream ended by browser')
        stopShare()
      })
      
      // Log track settings for debugging
      const settings = track.getSettings()
      console.log('[ScreenShare] Video track settings:', {
        width: settings.width,
        height: settings.height,
        frameRate: settings.frameRate,
        displaySurface: (settings as any).displaySurface
      })
    }

    // Start continuous scanning after video is ready
    setTimeout(async () => {
      console.log('[ScreenShare] Starting continuous real-time analysis...')
      
      // Do an immediate test scan to verify everything works
      const testCanvas = getCanvasFromVideo()
      if (testCanvas) {
        console.log('[ScreenShare] Running immediate test scan...')
        console.log('[ScreenShare] Test canvas dimensions:', testCanvas.width, 'x', testCanvas.height)
        
        if (publicOnly.value) {
          console.log('[ScreenShare] Public filter is enabled, checking...')
          const isPublic = await checkPublicFilter(testCanvas)
          console.log('[ScreenShare] Public filter result:', isPublic)
          if (!isPublic) {
            console.warn('[ScreenShare] ⚠️ Public filter: Could not detect "Public" text. Proceeding anyway with scan...')
            console.warn('[ScreenShare] 💡 Tip: Uncheck "Analyze public posts only" to avoid this check, or scroll to ensure "Public" is visible at the top.')
            // Proceed with scan anyway, but log the warning
          }
          // Run the scan regardless of filter result (filter is advisory)
          await scan(testCanvas)
        } else {
          // Run the test scan immediately
          await scan(testCanvas)
        }
      } else {
        console.warn('[ScreenShare] ⚠️ Cannot create canvas from video. Video might not be ready.')
        console.warn('[ScreenShare] Video element state:', {
          exists: !!videoEl.value,
          videoWidth: videoEl.value?.videoWidth,
          videoHeight: videoEl.value?.videoHeight,
          readyState: videoEl.value?.readyState
        })
      }
      
      // Create a wrapper function that respects the public filter and includes crime verification
      const getCanvasAndCheckFilter = async () => {
        const canvas = getCanvasFromVideo()
        if (!canvas) {
          console.log('[ScreenShare] No canvas available from video')
          return null
        }
        console.log('[ScreenShare] Canvas available for scan:', canvas.width, 'x', canvas.height)
        
        if (publicOnly.value) {
          const isPublic = await checkPublicFilter(canvas)
          if (!isPublic) {
            console.log('[ScreenShare] Public filter: Content not detected as Public, but proceeding with scan anyway (filter is advisory)')
            // Don't block - proceed anyway but log it
            // User can uncheck the filter if they want to avoid this check
          } else {
            console.log('[ScreenShare] Public filter passed, proceeding with scan')
          }
        }
        return canvas
      }
      
      // Enhanced scan function with crime verification callback
      const enhancedScan = async (canvas: HTMLCanvasElement | null) => {
        if (!canvas) return
        const screenshot = canvas.toDataURL('image/png', 0.7)
        
        // Perform regular scan with crime detection callback
        await scan(canvas, async (text: string, screenshot: string) => {
          // Extract source name from text if available
          const sourceMatch = text.match(/([A-Z\s]+(?:Component\s*City|City)?\s*(?:Police\s*Station|Policestation)[^']*)/i)
          const sourceName = sourceMatch ? sourceMatch[1].trim() : undefined
          
          // Trigger crime verification
          console.log('[ScreenShare] 🚨 Triggering real-time crime verification...')
          await verifyCrimeReport(text, screenshot, sourceName)
        })
      }
      
      // Use enhanced scan with crime verification
      startContinuousScan(async () => {
        const canvas = await getCanvasAndCheckFilter()
        if (canvas) {
          await enhancedScan(canvas)
        }
        return canvas
      }, 15000) // Scan every 15 seconds
      scanCompleted.value = true // Show results immediately
    }, 1000) // Give video a bit more time to render
  } catch (err: any) {
    console.error('[ScreenShare] Error starting share:', err)
    isSharing.value = false
    lastError.value = err?.message || 'Failed to start screen share'
  } finally {
    isToggling.value = false
  }
}

function stopShare() {
  console.log('[ScreenShare] ===== STOPPING SCREEN SHARE =====')
  stopContinuousScan()
  const stream = streamRef.value
  if (stream) {
    for (const track of stream.getTracks()) {
      track.stop()
    }
  }
  streamRef.value = null
  if (videoEl.value) {
    videoEl.value.srcObject = null
  }
  isSharing.value = false
}

async function onToggle() {
  console.log('[ScreenShare] Toggle clicked, isSharing:', isSharing.value)
  if (isSharing.value) {
    // Run one final scan before stopping
    const canvas = getCanvasFromVideo()
    if (canvas) {
      console.log('[ScreenShare] Running final scan before stopping...')
      const isPublic = await checkPublicFilter(canvas)
      if (!isPublic && publicOnly.value) {
        console.log('[ScreenShare] Not public, skipping final scan')
        alert('Content not detected as Public. Scan skipped.')
      } else {
        await scan(canvas)
      }
    }
    stopShare()
  } else {
    startShare()
  }
}

onBeforeUnmount(() => {
  console.log('[ScreenShare] Component unmounting, cleaning up...')
  stopShare()
})

watch(
  () => route.fullPath,
  (path) => {
    if (!isSharing.value) return
    if (sensitiveRoutePatterns.some((re) => re.test(path))) {
      console.log('[ScreenShare] Sensitive route detected:', path)
      privacyStopped.value = true
      stopShare()
    }
  }
)

watch(publicOnly, () => {
  if (isSharing.value) {
    console.log('[ScreenShare] Public filter changed, restarting scan with new settings...')
    stopContinuousScan()
    // Restart continuous scan with updated filter
    const getCanvasAndCheckFilter = async () => {
      const canvas = getCanvasFromVideo()
      if (!canvas) return null
      if (publicOnly.value) {
        const isPublic = await checkPublicFilter(canvas)
        if (!isPublic) {
          console.log('[ScreenShare] Public filter: Content not detected as Public, skipping scan')
          return null
        }
      }
      return canvas
    }
    startContinuousScan(getCanvasAndCheckFilter as () => HTMLCanvasElement | null | Promise<HTMLCanvasElement | null>, 15000)
  }
})
</script>

<style scoped>
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(6, 182, 212, 0.3) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(6, 182, 212, 0.3);
  border-radius: 3px;
  transition: background-color 0.3s;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(6, 182, 212, 0.5);
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(6, 182, 212, 0.3);
  border-top-color: rgb(6, 182, 212);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  flex-shrink: 0;
  filter: drop-shadow(0 0 8px rgba(6, 182, 212, 0.3));
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Modern Animation Effects */
@keyframes glow {
  0%, 100% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.3); }
  50% { box-shadow: 0 0 30px rgba(6, 182, 212, 0.5); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(0.98); }
}

/* Glass Effect Background */
.glass-effect {
  position: relative;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: linear-gradient(
    135deg,
    rgba(6, 182, 212, 0.1) 0%,
    rgba(6, 182, 212, 0.05) 100%
  );
  border: 1px solid rgba(6, 182, 212, 0.1);
}

.glass-effect::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1) 0%,
    transparent 100%
  );
  border-radius: inherit;
  pointer-events: none;
}
</style>