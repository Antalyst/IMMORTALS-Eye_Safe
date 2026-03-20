import { ref } from 'vue'

type AnalyzeResponse = {
  summary: string
  reliability: 'unknown' | 'mixed' | 'likely_real' | 'likely_false'
}

declare global {
  interface Window {
    transformers?: any
  }
}

async function loadTransformersFromCDN(): Promise<any> {
  if (typeof window === 'undefined') return null
  if (window.transformers) return window.transformers
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/@xenova/transformers/dist/transformers.min.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load transformers.js'))
    document.head.appendChild(script)
  })
  return window.transformers
}

export function useLocalDetector() {
  const analyzing = ref(false)
  const lastResult = ref<AnalyzeResponse | null>(null)
  const lastError = ref<string | null>(null)
  const privacyFlag = ref(false)
  const publicOnly = ref(false)

  let detector: any | null = null
  let tesseract: any | null = null
  let timer: ReturnType<typeof setInterval> | null = null

  async function ensureDetector(): Promise<any> {
    if (detector) return detector
    const transformers = await loadTransformersFromCDN()
    if (!transformers) throw new Error('Transformers not available')
    // Load a small object detection model
    detector = await transformers.pipeline('object-detection', 'Xenova/detr-resnet-50')
    return detector
  }

  async function ensureTesseract(): Promise<any> {
    if (typeof window === 'undefined') return null
    if (tesseract) return tesseract
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load tesseract.js'))
      document.head.appendChild(script)
    })
    // @ts-ignore
    tesseract = (window as any).Tesseract
    return tesseract
  }

  async function captureDownscaledCanvas(stream: MediaStream): Promise<HTMLCanvasElement> {
    const track = stream.getVideoTracks()[0]
    const imageCapture = new (window as any).ImageCapture(track)
    const bitmap = await imageCapture.grabFrame()
    const canvas = document.createElement('canvas')
    const maxW = 640
    const scale = Math.min(1, maxW / bitmap.width)
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas
  }

  async function analyzeCanvas(canvas: HTMLCanvasElement, onPrivacyHit?: () => void) {
    if (analyzing.value) return
    analyzing.value = true
    lastError.value = null
    try {
      const pipe = await ensureDetector()

      // Public-only OCR filter
      if (publicOnly.value) {
        try {
          const t = await ensureTesseract()
          if (t) {
            const topCrop = document.createElement('canvas')
            const ch = Math.max(24, Math.round(canvas.height * 0.18))
            topCrop.width = canvas.width
            topCrop.height = ch
            const ctx = topCrop.getContext('2d')!
            ctx.drawImage(canvas, 0, 0, canvas.width, ch, 0, 0, canvas.width, ch)
            const { data } = await t.recognize(topCrop, 'eng', { logger: () => {} })
            const text = String(data?.text || '').toLowerCase()
            const isPublic = text.includes('public')
            if (!isPublic) {
              lastResult.value = {
                summary: 'Skipped: Not detected as Public (OCR filter).',
                reliability: 'unknown'
              }
              return
            }
          }
        } catch {}
      }

      const outputs = await pipe(canvas)
      const items = Array.isArray(outputs) ? outputs : []
      const sorted = items
        .filter((i: any) => typeof i?.score === 'number' && typeof i?.label === 'string')
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 6)
      const summary = sorted
        .map((i: any) => `- ${i.label} (${(i.score * 100).toFixed(1)}%)`)
        .join('\n') || 'No objects detected.'

      lastResult.value = { summary, reliability: 'unknown' }
      const labels = sorted.map((i: any) => String(i.label).toLowerCase())
      const hit = labels.some((l: string) => l.includes('settings') || l.includes('message'))
      privacyFlag.value = hit
      if (hit && onPrivacyHit) onPrivacyHit()
    } catch (e: any) {
      lastError.value = e?.message || 'Local analysis failed.'
    } finally {
      analyzing.value = false
    }
  }

  async function analyzeOnce(stream: MediaStream, onPrivacyHit?: () => void) {
    if (analyzing.value) return
    analyzing.value = true
    lastError.value = null
    try {
      const pipe = await ensureDetector()
      const canvas = await captureDownscaledCanvas(stream)

      // Public-only OCR filter: look for the word "Public" in the top region
      if (publicOnly.value) {
        try {
          const t = await ensureTesseract()
          if (t) {
            const topCrop = document.createElement('canvas')
            const ch = Math.max(24, Math.round(canvas.height * 0.18))
            topCrop.width = canvas.width
            topCrop.height = ch
            const ctx = topCrop.getContext('2d')!
            ctx.drawImage(canvas, 0, 0, canvas.width, ch, 0, 0, canvas.width, ch)
            const { data } = await t.recognize(topCrop, 'eng', { logger: () => {} })
            const text = String(data?.text || '').toLowerCase()
            const isPublic = text.includes('public')
            if (!isPublic) {
              lastResult.value = {
                summary: 'Skipped: Not detected as Public (OCR filter).',
                reliability: 'unknown'
              }
              return
            }
          }
        } catch {
          // ignore OCR errors
        }
      }
      const outputs = await pipe(canvas)
      // outputs: Array<{ score, label, box }>
      const items = Array.isArray(outputs) ? outputs : []
      const sorted = items
        .filter((i: any) => typeof i?.score === 'number' && typeof i?.label === 'string')
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 6)
      const summary = sorted
        .map((i: any) => `- ${i.label} (${(i.score * 100).toFixed(1)}%)`)
        .join('\n') || 'No objects detected.'

      lastResult.value = { summary, reliability: 'unknown' }

      const labels = sorted.map((i: any) => String(i.label).toLowerCase())
      const hit = labels.some((l: string) => l.includes('settings') || l.includes('message'))
      privacyFlag.value = hit
      if (hit && onPrivacyHit) onPrivacyHit()
    } catch (e: any) {
      lastError.value = e?.message || 'Local analysis failed.'
    } finally {
      analyzing.value = false
    }
  }

  function startAuto(stream: MediaStream, onPrivacyHit?: () => void) {
    if (timer) return
    analyzeOnce(stream, onPrivacyHit)
    timer = setInterval(() => analyzeOnce(stream, onPrivacyHit), 7000)
  }

  function stopAuto() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  return {
    analyzing,
    lastResult,
    lastError,
    privacyFlag,
    publicOnly,
    analyzeOnce,
    analyzeCanvas,
    startAuto,
    stopAuto,
  }
}



type AnalyzeResponse = {
  summary: string
  reliability: 'unknown' | 'mixed' | 'likely_real' | 'likely_false'
}

declare global {
  interface Window {
    transformers?: any
  }
}

async function loadTransformersFromCDN(): Promise<any> {
  if (typeof window === 'undefined') return null
  if (window.transformers) return window.transformers
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/@xenova/transformers/dist/transformers.min.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load transformers.js'))
    document.head.appendChild(script)
  })
  return window.transformers
}

export function useLocalDetector() {
  const analyzing = ref(false)
  const lastResult = ref<AnalyzeResponse | null>(null)
  const lastError = ref<string | null>(null)
  const privacyFlag = ref(false)
  const publicOnly = ref(false)

  let detector: any | null = null
  let tesseract: any | null = null
  let timer: ReturnType<typeof setInterval> | null = null

  async function ensureDetector(): Promise<any> {
    if (detector) return detector
    const transformers = await loadTransformersFromCDN()
    if (!transformers) throw new Error('Transformers not available')
    // Load a small object detection model
    detector = await transformers.pipeline('object-detection', 'Xenova/detr-resnet-50')
    return detector
  }

  async function ensureTesseract(): Promise<any> {
    if (typeof window === 'undefined') return null
    if (tesseract) return tesseract
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load tesseract.js'))
      document.head.appendChild(script)
    })
    // @ts-ignore
    tesseract = (window as any).Tesseract
    return tesseract
  }

  async function captureDownscaledCanvas(stream: MediaStream): Promise<HTMLCanvasElement> {
    const track = stream.getVideoTracks()[0]
    const imageCapture = new (window as any).ImageCapture(track)
    const bitmap = await imageCapture.grabFrame()
    const canvas = document.createElement('canvas')
    const maxW = 640
    const scale = Math.min(1, maxW / bitmap.width)
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas
  }

  async function analyzeCanvas(canvas: HTMLCanvasElement, onPrivacyHit?: () => void) {
    if (analyzing.value) return
    analyzing.value = true
    lastError.value = null
    try {
      const pipe = await ensureDetector()

      // Public-only OCR filter
      if (publicOnly.value) {
        try {
          const t = await ensureTesseract()
          if (t) {
            const topCrop = document.createElement('canvas')
            const ch = Math.max(24, Math.round(canvas.height * 0.18))
            topCrop.width = canvas.width
            topCrop.height = ch
            const ctx = topCrop.getContext('2d')!
            ctx.drawImage(canvas, 0, 0, canvas.width, ch, 0, 0, canvas.width, ch)
            const { data } = await t.recognize(topCrop, 'eng', { logger: () => {} })
            const text = String(data?.text || '').toLowerCase()
            const isPublic = text.includes('public')
            if (!isPublic) {
              lastResult.value = {
                summary: 'Skipped: Not detected as Public (OCR filter).',
                reliability: 'unknown'
              }
              return
            }
          }
        } catch {}
      }

      const outputs = await pipe(canvas)
      const items = Array.isArray(outputs) ? outputs : []
      const sorted = items
        .filter((i: any) => typeof i?.score === 'number' && typeof i?.label === 'string')
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 6)
      const summary = sorted
        .map((i: any) => `- ${i.label} (${(i.score * 100).toFixed(1)}%)`)
        .join('\n') || 'No objects detected.'

      lastResult.value = { summary, reliability: 'unknown' }
      const labels = sorted.map((i: any) => String(i.label).toLowerCase())
      const hit = labels.some((l: string) => l.includes('settings') || l.includes('message'))
      privacyFlag.value = hit
      if (hit && onPrivacyHit) onPrivacyHit()
    } catch (e: any) {
      lastError.value = e?.message || 'Local analysis failed.'
    } finally {
      analyzing.value = false
    }
  }

  async function analyzeOnce(stream: MediaStream, onPrivacyHit?: () => void) {
    if (analyzing.value) return
    analyzing.value = true
    lastError.value = null
    try {
      const pipe = await ensureDetector()
      const canvas = await captureDownscaledCanvas(stream)

      // Public-only OCR filter: look for the word "Public" in the top region
      if (publicOnly.value) {
        try {
          const t = await ensureTesseract()
          if (t) {
            const topCrop = document.createElement('canvas')
            const ch = Math.max(24, Math.round(canvas.height * 0.18))
            topCrop.width = canvas.width
            topCrop.height = ch
            const ctx = topCrop.getContext('2d')!
            ctx.drawImage(canvas, 0, 0, canvas.width, ch, 0, 0, canvas.width, ch)
            const { data } = await t.recognize(topCrop, 'eng', { logger: () => {} })
            const text = String(data?.text || '').toLowerCase()
            const isPublic = text.includes('public')
            if (!isPublic) {
              lastResult.value = {
                summary: 'Skipped: Not detected as Public (OCR filter).',
                reliability: 'unknown'
              }
              return
            }
          }
        } catch {
          // ignore OCR errors
        }
      }
      const outputs = await pipe(canvas)
      // outputs: Array<{ score, label, box }>
      const items = Array.isArray(outputs) ? outputs : []
      const sorted = items
        .filter((i: any) => typeof i?.score === 'number' && typeof i?.label === 'string')
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 6)
      const summary = sorted
        .map((i: any) => `- ${i.label} (${(i.score * 100).toFixed(1)}%)`)
        .join('\n') || 'No objects detected.'

      lastResult.value = { summary, reliability: 'unknown' }

      const labels = sorted.map((i: any) => String(i.label).toLowerCase())
      const hit = labels.some((l: string) => l.includes('settings') || l.includes('message'))
      privacyFlag.value = hit
      if (hit && onPrivacyHit) onPrivacyHit()
    } catch (e: any) {
      lastError.value = e?.message || 'Local analysis failed.'
    } finally {
      analyzing.value = false
    }
  }

  function startAuto(stream: MediaStream, onPrivacyHit?: () => void) {
    if (timer) return
    analyzeOnce(stream, onPrivacyHit)
    timer = setInterval(() => analyzeOnce(stream, onPrivacyHit), 7000)
  }

  function stopAuto() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  return {
    analyzing,
    lastResult,
    lastError,
    privacyFlag,
    publicOnly,
    analyzeOnce,
    analyzeCanvas,
    startAuto,
    stopAuto,
  }
}


