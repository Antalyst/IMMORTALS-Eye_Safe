import { ref } from 'vue'
import { useSocialMediaDetector } from './useSocialMediaDetector'

export type ContentAnalysis = {
  text: string
  truthfulness: 'True' | 'False' | 'Unverified'
  panicRisk: 'High' | 'Moderate' | 'Low'
  truthfulnessScore: number
  panicScore: number
  screenshot?: string 
  engagement?: {
    likes?: number
    shares?: number
    comments?: number
  }
  reasoning?: {
    truthfulnessReasoning: string
    panicReasoning: string
    modelInfo: {
      truthfulnessModel: string
      sentimentModel: string
    }
    factCheck?: {
      verified: boolean
      confidence: number
      reasoning: string
      sources: Array<{ title: string; url: string }>
      engagementRisk?: 'High' | 'Moderate' | 'Low'
      engagementReasoning?: string
    }
  }
}

export type SegregatedResults = {
  verifiedLowRisk: ContentAnalysis[]
  highRiskAlerts: ContentAnalysis[]
}

declare global {
  interface Window {
    transformers?: any
    Tesseract?: any
  }
}

const XENOVA_TRANSFORMERS_VERSION = '2.17.2'
const XENOVA_TRANSFORMERS_CDN_DIST_BASE = `https://cdn.jsdelivr.net/npm/@xenova/transformers@${XENOVA_TRANSFORMERS_VERSION}/dist`
const FALLBACK_MODELS = {
  truthfulness: {
    primary: 'Xenova/mobilebert-uncased-mnli',
    alternatives: [
      'Xenova/distilbert-base-uncased-mnli',
      'Xenova/bert-base-uncased-mnli'
    ]
  },
  sentiment: {
    primary: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
    alternatives: [
      'Xenova/roberta-base-sentiment',
      'Xenova/bert-base-uncased-sentiment'
    ]
  }
}

function normalizeTransformersModule(mod: any): any | null {
  if (!mod) return null
  const lib = mod.default ?? mod
  if (lib?.pipeline && typeof lib.pipeline === 'function') return lib
  if (lib?.transformers?.pipeline && typeof lib.transformers.pipeline === 'function') return lib.transformers
  return null
}

function configureTransformersEnv(transformersLib: any) {
  const env = transformersLib?.env
  if (!env) return
  env.allowLocalModels = false
  env.allowRemoteModels = true
  env.remoteHost = 'https://huggingface.co/'
  env.remotePathTemplate = '{model}/resolve/{revision}/'
  try {
    if (env.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.wasmPaths = `${XENOVA_TRANSFORMERS_CDN_DIST_BASE}/`
    }
  } catch {
    // ignore
  }
}

async function loadTransformers(): Promise<any> {
  if (typeof window === 'undefined') return null
  const existingTransformers = (window as any).transformers ?? (globalThis as any).transformers
  if (existingTransformers && typeof existingTransformers.pipeline === 'function') {
    configureTransformersEnv(existingTransformers)
    return existingTransformers
  }
  async function loadViaScriptTag(src: string): Promise<any | null> {
    const existingScript = document.querySelector(`script[data-veritas-transformers="${src}"]`) as HTMLScriptElement | null
    if (existingScript && (window as any).transformers) {
      return (window as any).transformers
    }

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.setAttribute('data-veritas-transformers', src)
      script.onload = () => resolve()
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
      document.head.appendChild(script)
    })

    const winTf = (window as any).transformers
    if (winTf && typeof winTf.pipeline === 'function') return winTf
    const maybeDefault = winTf?.default
    if (maybeDefault && typeof maybeDefault.pipeline === 'function') return maybeDefault
    return null
  }

  try {
    console.log('[VeritasScan] [Transformers] Loading from installed @xenova/transformers...')
    const mod = await import('@xenova/transformers')
    const lib = normalizeTransformersModule(mod)
    if (lib) {
      configureTransformersEnv(lib)
      ;(window as any).transformers = lib
      return lib
    }
    throw new Error('Loaded module but pipeline was not found on exports')
  } catch (npmError: any) {
    console.warn('[VeritasScan] [Transformers] Installed package import failed:', npmError?.message || npmError)
  }
  const esmUrls = [
    `${XENOVA_TRANSFORMERS_CDN_DIST_BASE}/transformers.min.js`,
    `${XENOVA_TRANSFORMERS_CDN_DIST_BASE}/transformers.js`,
    `https://unpkg.com/@xenova/transformers@${XENOVA_TRANSFORMERS_VERSION}/dist/transformers.min.js`
  ]

  let lastError: any = null
  for (const esmUrl of esmUrls) {
    try {
      console.log('[VeritasScan] [Transformers] CDN attempt (pre-check):', esmUrl)
      try {
        const mod = await import(/* @vite-ignore */ esmUrl)
        const lib = normalizeTransformersModule(mod)
        if (lib) {
          configureTransformersEnv(lib)
          ;(window as any).transformers = lib
          return lib
        }
      } catch (importErr: any) {
        console.warn('[VeritasScan] [Transformers] CDN import() failed, trying script tag. Error:', importErr?.message || importErr)
      }

      const loadedFromScript = await loadViaScriptTag(esmUrl)
      if (loadedFromScript) {
        configureTransformersEnv(loadedFromScript)
        ;(window as any).transformers = loadedFromScript
        return loadedFromScript
      }

      throw new Error('CDN artifact loaded but no transformers pipeline could be found')
    } catch (e: any) {
      lastError = e
      console.warn('[VeritasScan] [Transformers] CDN attempt failed:', e?.message || e)
    }
  }

  throw new Error(
    `Transformers.js could not be loaded. ${
      lastError ? `Last error: ${lastError?.message || lastError}` : 'No additional error captured.'
    }`
  )
}

function installJsonHtmlFetchGuard(remoteHost?: string) {
  const g: any = globalThis as any
  if (g.__veritasJsonHtmlFetchGuardInstalled) {
    console.log('[VeritasScan] JSON/HTML fetch guard already installed')
    return
  }
  if (typeof globalThis.fetch !== 'function') {
    console.warn('[VeritasScan] fetch not available, cannot install HTML/JSON guard')
    return
  }

  g.__veritasJsonHtmlFetchGuardInstalled = true
  const originalFetch = globalThis.fetch.bind(globalThis)
  g.__veritasJsonHtmlFetchGuardOriginalFetch = originalFetch

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await originalFetch(input as any, init)

    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as any)?.url || ''

    const contentType = res.headers.get('content-type') || ''
    const looksJson = url.includes('.json') || contentType.includes('application/json')

    const shouldInspect =
      looksJson &&
      (url.includes('huggingface.co') || 
       url.includes('cdn.jsdelivr.net') ||
       url.includes('unpkg.com') ||
       (remoteHost ? url.startsWith(remoteHost) : false))

    if (shouldInspect) {
      try {
        const clone = res.clone()
        const text = await clone.text()
        const trimmed = text.trimStart()
        
        console.log(`[VeritasScan] Fetch guard inspecting: ${url} (${res.status} ${contentType})`)
        
        if (
          contentType.includes('text/html') ||
          trimmed.startsWith('<!DOCTYPE') ||
          trimmed.startsWith('<html') ||
          res.status === 404
        ) {
          const errorMsg = `[VeritasScan] Model download returned HTML${res.status === 404 ? ' (404 Not Found)' : ''} instead of JSON for: ${url}. ` +
            `This usually means the remote URL is wrong or blocked (404/HTML error page). ` +
            `Status: ${res.status}, Content-Type: ${contentType}`
          console.error(errorMsg)
          throw new Error(errorMsg)
        }
      } catch (e: any) {
        if (String(e?.message || e).includes('returned HTML instead of JSON')) throw e
        console.warn('[VeritasScan] Fetch guard warning:', e?.message || e)
      }
    }

    return res
  }) as any
  
  console.log('[VeritasScan] JSON/HTML fetch guard installed successfully')
}

async function loadTesseract(): Promise<any> {
  if (typeof window === 'undefined') return null
  if ((window as any).Tesseract) {
    console.log('[VeritasScan] Tesseract already loaded')
    return (window as any).Tesseract
  }
  console.log('[VeritasScan] Loading tesseract.js from CDN...')
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
    script.async = true
    script.onload = () => {
      console.log('[VeritasScan] Tesseract loaded successfully')
      resolve()
    }
    script.onerror = () => {
      console.error('[VeritasScan] Failed to load tesseract.js')
      reject(new Error('Failed to load tesseract.js'))
    }
    document.head.appendChild(script)
  })
  return (window as any).Tesseract
}

export function useVeritasScan() {
  const analyzing = ref(false)
  const extractedTexts = ref<string[]>([])
  const results = ref<SegregatedResults>({
    verifiedLowRisk: [],
    highRiskAlerts: []
  })
  const lastError = ref<string | null>(null)
  
  // Initialize social media detector
  const { extractEnhancedEngagement } = useSocialMediaDetector()

  let transformers: any | null = null
  let tesseract: any | null = null
  let truthfulnessClassifier: any | null = null
  let sentimentClassifier: any | null = null
  let classifiersInitPromise: Promise<void> | null = null
  let scanTimer: ReturnType<typeof setInterval> | null = null
  async function runDiagnostics(): Promise<{
    transformers: { loaded: boolean; version?: string; env?: any; error?: string }
    models: { truthfulness: boolean; sentiment: boolean; details: any }
    network: { huggingface: boolean; cdn: boolean; error?: string }
    browser: { userAgent: string; webassembly: boolean; workers: boolean }
  }> {
    console.log('[VeritasScan] 🩺 Running diagnostics...')
    
    const diagnostics = {
      transformers: { loaded: false },
      models: { truthfulness: false, sentiment: false, details: {} },
      network: { huggingface: false, cdn: false },
      browser: { 
        userAgent: navigator.userAgent, 
        webassembly: typeof WebAssembly === 'object', 
        workers: typeof Worker !== 'undefined' 
      }
    } as any
    try {
      const tf = await ensureTransformers()
      if (tf) {
        diagnostics.transformers.loaded = true
        diagnostics.transformers.version = tf.version || 'unknown'
        diagnostics.transformers.env = {
          allowLocalModels: tf?.env?.allowLocalModels,
          allowRemoteModels: tf?.env?.allowRemoteModels,
          remoteHost: tf?.env?.remoteHost,
          remotePathTemplate: tf?.env?.remotePathTemplate
        }
      }
    } catch (error: any) {
      diagnostics.transformers.error = error?.message || 'Unknown error'
    }
    if (diagnostics.transformers.loaded) {
      try {
        const tf = await ensureTransformers()
        const testPipeline = await tf.pipeline('zero-shot-classification', 'Xenova/all-MiniLM-L6-v2')
        await testPipeline('test', ['positive', 'negative'])
        await testPipeline.dispose()
        diagnostics.models.truthfulness = true
      } catch (error: any) {
        diagnostics.models.details.truthfulnessError = error?.message || 'Unknown error'
      }
      
      try {
        const tf = await ensureTransformers()
        const testPipeline = await tf.pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english')
        await testPipeline('test')
        await testPipeline.dispose()
        diagnostics.models.sentiment = true
      } catch (error: any) {
        diagnostics.models.details.sentimentError = error?.message || 'Unknown error'
      }
    }
    try {
      const hfResponse = await fetch('https://huggingface.co/Xenova/mobilebert-uncased-mnli/resolve/main/config.json', { 
        method: 'HEAD',
        mode: 'no-cors' 
      })
      diagnostics.network.huggingface = true
    } catch (error) {
      diagnostics.network.huggingface = false
      diagnostics.network.error = 'HuggingFace not accessible'
    }
    
    try {
      const cdnResponse = await fetch(`${XENOVA_TRANSFORMERS_CDN_DIST_BASE}/transformers.min.js`, { 
        method: 'HEAD',
        mode: 'no-cors' 
      })
      diagnostics.network.cdn = true
    } catch (error) {
      diagnostics.network.cdn = false
    }
    
    console.log('[VeritasScan] 🩺 Diagnostics complete:', diagnostics)
    return diagnostics
  }

  async function ensureTransformers(): Promise<any> {
    if (!transformers) {
      console.log('[VeritasScan] Initializing transformers...')
      transformers = await loadTransformers()
    }
    return transformers
  }

  async function ensureTesseract(): Promise<any> {
    if (!tesseract) {
      console.log('[VeritasScan] Initializing tesseract...')
      tesseract = await loadTesseract()
    }
    return tesseract
  }

  async function ensureClassifiers() {
    if (typeof window === 'undefined') {
      throw new Error('[VeritasScan] Cannot initialize AI classifiers outside the browser.')
    }

    if (classifiersInitPromise) {
      await classifiersInitPromise
      return
    }

    if (truthfulnessClassifier && sentimentClassifier) {
      console.log('[VeritasScan] Classifiers already initialized')
      return
    }

    classifiersInitPromise = (async () => {
      console.log('[VeritasScan] Loading AI classifiers...')

      const tf = await ensureTransformers()
      if (!tf) {
        throw new Error('[VeritasScan] Transformers library is not available.')
      }
      if (typeof tf.pipeline !== 'function') {
        const errorMsg = `Transformers library loaded but pipeline method not found. Library type: ${typeof tf}, Available keys: ${Object.keys(tf).join(', ')}`
        console.error('[VeritasScan]', errorMsg)
        console.log('[VeritasScan] Transformers object:', tf)
        throw new Error(errorMsg)
      }

      configureTransformersEnv(tf)
      installJsonHtmlFetchGuard(tf?.env?.remoteHost)

      try {
        console.log('[VeritasScan] Creating zero-shot classifier (this may take a minute on first load)...')
        let truthfulnessModelLoaded = false
        const truthfulnessModels = [FALLBACK_MODELS.truthfulness.primary, ...FALLBACK_MODELS.truthfulness.alternatives]
        
        for (const modelName of truthfulnessModels) {
          try {
            console.log(`[VeritasScan] Trying truthfulness model: ${modelName}`)
            truthfulnessClassifier = await tf.pipeline('zero-shot-classification', modelName)
            console.log(`[VeritasScan] Truthfulness model loaded: ${modelName}`)
            truthfulnessModelLoaded = true
            break
          } catch (modelError: any) {
            console.warn(`[VeritasScan] Failed to load ${modelName}:`, modelError?.message || modelError)
          }
        }
        
        if (!truthfulnessModelLoaded) {
          throw new Error('Failed to load any truthfulness classification model')
        }
        console.log('[VeritasScan] Creating sentiment classifier...')
        let sentimentModelLoaded = false
        const sentimentModels = [FALLBACK_MODELS.sentiment.primary, ...FALLBACK_MODELS.sentiment.alternatives]
        
        for (const modelName of sentimentModels) {
          try {
            console.log(`[VeritasScan] Trying sentiment model: ${modelName}`)
            sentimentClassifier = await tf.pipeline('sentiment-analysis', modelName)
            console.log(`[VeritasScan] Sentiment model loaded: ${modelName}`)
            sentimentModelLoaded = true
            break
          } catch (modelError: any) {
            console.warn(`[VeritasScan]  Failed to load ${modelName}:`, modelError?.message || modelError)
          }
        }
        
        if (!sentimentModelLoaded) {
          throw new Error('Failed to load any sentiment analysis model')
        }

        console.log('[VeritasScan] All classifiers ready!')
      } catch (e: any) {
        console.error('[VeritasScan] Error creating classifiers:', e)
        const msg = e?.message || String(e)
        console.error('[VeritasScan] Full error details:', e)
        console.error('[VeritasScan] Error stack:', e?.stack)
        
        if (msg.includes('<!DOCTYPE') || msg.includes('Unexpected token') || msg.includes('returned HTML instead of JSON')) {
          throw new Error(
            `Failed to create AI classifiers because model/asset downloads returned HTML instead of the expected JSON/JS. ` +
              `This usually means the remote model URL is incorrect or blocked (404/proxy/CORS). ` +
              `Please check: 1) Internet connection 2) HuggingFace.co accessibility 3) Corporate firewall/proxy settings. ` +
              `Original error: ${msg}`
          )
        }
        
        if (msg.includes('Failed to fetch') || msg.includes('Network error') || msg.includes('ECONNREFUSED')) {
          throw new Error(
            `Failed to create AI classifiers due to network connectivity issues. ` +
              `Please check your internet connection and try again. ` +
              `If behind a corporate firewall, you may need to whitelist huggingface.co. ` +
              `Original error: ${msg}`
          )
        }
        
        throw new Error(`Failed to create AI classifiers: ${msg}. This may be due to model download issues - check your internet connection and HuggingFace.co accessibility.`)
      }
    })()

    try {
      await classifiersInitPromise
    } finally {
      classifiersInitPromise = null
    }
  }

  function preprocessImageForOCR(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const ctx = canvas.getContext('2d')
    if (!ctx) return canvas
    const processedCanvas = document.createElement('canvas')
    processedCanvas.width = canvas.width
    processedCanvas.height = canvas.height
    const processedCtx = processedCanvas.getContext('2d')
    if (!processedCtx) return canvas
    processedCtx.drawImage(canvas, 0, 0)
    const imageData = processedCtx.getImageData(0, 0, processedCanvas.width, processedCanvas.height)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0
      const g = data[i + 1] ?? 0
      const b = data[i + 2] ?? 0
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
      const threshold = 128
      const value = gray > threshold ? 255 : 0
      data[i] = value    
      data[i + 1] = value 
      data[i + 2] = value 
    }

    processedCtx.putImageData(imageData, 0, 0)

    return processedCanvas
  }

  async function extractText(canvas: HTMLCanvasElement): Promise<string> {
    const t = await ensureTesseract()
    if (!t) {
      console.error('[VeritasScan] Tesseract not available')
      return ''
    }
    const startTime = Date.now()
    const processedCanvas = preprocessImageForOCR(canvas)
    const { data } = await t.recognize(processedCanvas, 'eng', { 
      logger: () => {},
      preserve_interword_spaces: true,
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;!?()-\'"/ '
    })
    const text = String(data?.text || '').trim()
    const elapsed = Date.now() - startTime
    console.log('[VeritasScan] OCR completed in', elapsed, 'ms, extracted', text.length, 'characters')
    return text
  }
  async function extractTextWithBoundingBox(canvas: HTMLCanvasElement): Promise<{
    fullText: string
    boundingBoxText: string
    sourceFragments: string[]
  }> {
    const t = await ensureTesseract()
    if (!t) {
      console.error('[VeritasScan] Tesseract not available')
      return { fullText: '', boundingBoxText: '', sourceFragments: [] }
    }
    const topCrop = document.createElement('canvas')
    const cropHeight = Math.max(50, Math.round(canvas.height * 0.15))
    topCrop.width = canvas.width
    topCrop.height = cropHeight
    
    const ctx = topCrop.getContext('2d')
    if (!ctx) {
      return { fullText: '', boundingBoxText: '', sourceFragments: [] }
    }
    ctx.drawImage(canvas, 0, 0, canvas.width, cropHeight, 0, 0, canvas.width, cropHeight)
    const processedTopCrop = preprocessImageForOCR(topCrop)
    const { data: boundingBoxData } = await t.recognize(processedTopCrop, 'eng', {
      logger: () => {},
      preserve_interword_spaces: true,
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;!?()-\'"/ '
    })
    const boundingBoxText = String(boundingBoxData?.text || '').trim()
    const sourceKeywords = ['BAGO Component City Police Station', 'Police', 'Station', 'City', 'Government', 'PNP', 'News', 'Office', 'Municipal', 'Component']
    const words = boundingBoxData?.words || []
    const sourceFragments: string[] = []
    
    for (const word of words) {
      const wordText = String(word?.text || '').trim()
      const lowerWord = wordText.toLowerCase()
      const hasKeyword = sourceKeywords.some(kw => 
        lowerWord.includes(kw.toLowerCase()) || wordText.includes(kw)
      )
      if (hasKeyword && wordText.length > 2) {
        sourceFragments.push(wordText)
      }
    }
    const processedCanvas = preprocessImageForOCR(canvas)
    const { data: fullData } = await t.recognize(processedCanvas, 'eng', {
      logger: () => {},
      preserve_interword_spaces: true,
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;!?()-\'"/ '
    })
    const fullText = String(fullData?.text || '').trim()
    
    console.log('[VeritasScan] Bounding box extraction:', {
      boundingBoxText: boundingBoxText.substring(0, 100),
      sourceFragmentsCount: sourceFragments.length
    })
    
    return { fullText, boundingBoxText, sourceFragments }
  }

  async function classifyTruthfulness(text: string): Promise<{ label: string; score: number }> {
    console.log('[VeritasScan] Classifying truthfulness for text:', text.slice(0, 50), '...')
    await ensureClassifiers()
    if (!truthfulnessClassifier || !text) return { label: 'Unverified', score: 0 }
    try {
      const startTime = Date.now()
      const result = await truthfulnessClassifier(text, ['True', 'False', 'Unverified'])
      const elapsed = Date.now() - startTime
      const top = Array.isArray(result?.labels) && result?.labels[0] ? {
        label: result.labels[0] as 'True' | 'False' | 'Unverified',
        score: result.scores?.[0] || 0
      } : { label: 'Unverified' as const, score: 0 }
      console.log('[VeritasScan] Truthfulness:', top.label, '(', (top.score * 100).toFixed(1), '%) in', elapsed, 'ms')
      return top
    } catch (e: any) {
      console.error('[VeritasScan] Truthfulness classification error:', e)
      return { label: 'Unverified', score: 0 }
    }
  }

  async function classifyPanicRisk(text: string, engagement?: { likes?: number; shares?: number; comments?: number }): Promise<{ label: string; score: number }> {
    await ensureClassifiers()
    if (!sentimentClassifier || !text) return { label: 'Low', score: 0 }
    
    const lowerText = text.toLowerCase()
    const disasterKeywords = [
      'supervolcano', 'caldera', 'volcano', 'eruption', 'erupt', 'lava', 'ash',
      'earthquake', 'tsunami', 'flood', 'hurricane', 'typhoon', 'tornado',
      'pandemic', 'outbreak', 'virus', 'disease', 'epidemic',
      'nuclear', 'radiation', 'toxic', 'contamination',
      'cataclysmic', 'catastrophe', 'disaster', 'crisis', 'emergency',
      'evacuate', 'evacuation', 'alert', 'warning', 'threat', 'danger',
      'imminent', 'urgent', 'immediate', 'now', 'today', 'soon'
    ]
    const hasDisasterKeywords = disasterKeywords.some(kw => lowerText.includes(kw))
    const superlatives = ['largest', 'biggest', 'greatest', 'huge', 'massive', 'enormous', 'dwarfs']
    const hasSuperlatives = superlatives.some(s => lowerText.includes(s))
    const fakeNewsPatterns = [
      /hidden.*secret/i,
      /they.*don.*want.*you.*know/i,
      /breaking.*urgent/i,
      /share.*now/i,
      /everyone.*needs.*see/i
    ]
    const hasFakePattern = fakeNewsPatterns.some(pattern => pattern.test(text))
    
    // Calculate engagement-based risk boost
    let engagementRiskBoost = 0
    if (engagement) {
      const totalEngagement = (engagement.likes || 0) + (engagement.shares || 0) * 2 + (engagement.comments || 0)
      
      // High engagement significantly increases panic risk, especially for disaster content
      if (totalEngagement > 5000) {
        engagementRiskBoost = 0.4 // Very high virality
        console.log('[VeritasScan] Very high engagement detected:', totalEngagement, '- significant panic risk boost')
      } else if (totalEngagement > 1000) {
        engagementRiskBoost = 0.3 // High virality
        console.log('[VeritasScan] High engagement detected:', totalEngagement, '- moderate panic risk boost')
      } else if (totalEngagement > 500) {
        engagementRiskBoost = 0.2 // Moderate virality
        console.log('[VeritasScan] Moderate engagement detected:', totalEngagement, '- low panic risk boost')
      } else if (totalEngagement > 100) {
        engagementRiskBoost = 0.1 // Low virality
        console.log('[VeritasScan] Low engagement detected:', totalEngagement, '- minimal panic risk boost')
      }
      
      // Extra boost if disaster content has high engagement
      if (hasDisasterKeywords && totalEngagement > 1000) {
        engagementRiskBoost += 0.2
        console.log('[VeritasScan] Disaster content with high engagement - additional risk boost')
      }
    }
    
    try {
      const startTime = Date.now()
      const result = await sentimentClassifier(text)
      const elapsed = Date.now() - startTime
      const score = Array.isArray(result) ? result[0]?.score || 0 : result?.score || 0
      const label = result?.label || 'NEUTRAL'
      let panicScore = label === 'NEGATIVE' ? score : 1 - score
      let panicLabel: 'High' | 'Moderate' | 'Low' = 'Low'

      // Apply engagement-based boost
      panicScore = Math.min(1, panicScore + engagementRiskBoost)

      if (hasDisasterKeywords) {
        panicScore = Math.min(1, panicScore + 0.3) 
        if (hasSuperlatives) {
          panicScore = Math.min(1, panicScore + 0.2) 
        }
        if (hasFakePattern) {
          panicScore = Math.min(1, panicScore + 0.2) 
        }
      }

      // Enhanced thresholds considering engagement
      if (panicScore > 0.7 || (hasDisasterKeywords && hasSuperlatives) || engagementRiskBoost >= 0.3) {
        panicLabel = 'High'
      } else if (panicScore > 0.5 || hasDisasterKeywords || engagementRiskBoost >= 0.2) {
        panicLabel = 'Moderate'
      }
      
      console.log('[VeritasScan] Panic Risk:', panicLabel, '(', (panicScore * 100).toFixed(1), '%) in', elapsed, 'ms')
      if (hasDisasterKeywords) {
        console.log('[VeritasScan] Disaster keywords detected - enhanced panic risk')
      }
      if (engagementRiskBoost > 0) {
        console.log('[VeritasScan] Engagement-based risk boost:', (engagementRiskBoost * 100).toFixed(1), '%')
      }
      
      return { label: panicLabel, score: panicScore }
    } catch (e: any) {
      console.error('[VeritasScan] Panic risk classification error:', e)
      return { label: 'Low', score: 0 }
    }
  }

  async function analyzeContent(canvas: HTMLCanvasElement): Promise<ContentAnalysis[]> {
    console.log('[VeritasScan] ===== Starting content analysis =====')

    let networkStatus: any = null
    try {
      console.log('[VeritasScan] Checking network connectivity...')
      networkStatus = await $fetch('/api/netCheck')
      console.log('[VeritasScan] Network status:', networkStatus)
      
      if (!networkStatus.googleStatus.ok) {
        console.warn('[VeritasScan] Google connectivity issues detected')
      }
      if (!networkStatus.hfStatus.ok) {
        console.warn('[VeritasScan] HuggingFace connectivity issues detected - AI models may be affected')
      }
    } catch (error) {
      console.warn('[VeritasScan] Network check failed:', error)
    }
    
    const text = await extractText(canvas)
    if (!text || text.length < 10) {
      console.warn('[VeritasScan] No text extracted or text too short:', text.length, 'chars')
      return []
    }
    console.log('[VeritasScan] Extracted text preview:', text.slice(0, 100), '...')
    const screenshot = canvas.toDataURL('image/png', 0.7)
    
    const crimeKeywords = [
      'crime', 'murder', 'kill', 'homicide', 'robbery', 'theft', 'rape', 'assault',
      'shooting', 'gun', 'weapon', 'attack', 'violence', 'terrorist', 'bomb',
      'kidnap', 'abduction', 'missing', 'dead', 'death', 'victim', 'suspect',
      'arrest', 'police', 'criminal', 'gang', 'drug', 'stolen', 'stabbing'
    ]
    const locationKeywords = ['bago city', 'bago', 'negros occidental', 'negros', 'philippines']
    const lowerText = text.toLowerCase()
    const hasCrimeKeywords = crimeKeywords.some(kw => lowerText.includes(kw))
    const hasLocationMention = locationKeywords.some(loc => lowerText.includes(loc))
    const isBagoCityCrime = hasCrimeKeywords && hasLocationMention
    
    let verifiedSourceResult: { isVerified: boolean; sourceName: string | null; confidence: number; reasoning: string; rejectionReason?: string } | null = null
    let crimeVerificationResult: any = null
    
    try {
      const { checkVerifiedSourceAuthenticity } = await import('../server/utils/verifiedSourceAuthenticator')
      const urlPattern = /(https?:\/\/)?(web\.)?facebook\.com\/[a-zA-Z0-9._-]+/gi
      const urlMatch = text.match(urlPattern)
      const extractedUrl = urlMatch ? urlMatch[0] : undefined
      
      verifiedSourceResult = await checkVerifiedSourceAuthenticity(text, extractedUrl)
      
      if (verifiedSourceResult.isVerified) {
        console.log(`[VeritasScan] Verified institutional source detected: ${verifiedSourceResult.sourceName}`)
        console.log(`[VeritasScan] URL verified: ${extractedUrl || 'N/A'}`)
        console.log(`[VeritasScan] Auto-classifying as "True" with confidence ${(verifiedSourceResult.confidence * 100).toFixed(1)}%`)
      } else if (verifiedSourceResult.rejectionReason) {
        console.log(`[VeritasScan] Source verification rejected: ${verifiedSourceResult.rejectionReason}`)
        console.log(`[VeritasScan] Running full AI + internet fact-check pipeline.`)
      }
    } catch (error) {
      console.warn('[VeritasScan] Verified source check failed:', error)
    }
    if (isBagoCityCrime) {
      try {
        console.log('[VeritasScan] 🚨 Bago City crime content detected - using specialized crime verification...')
        crimeVerificationResult = await $fetch('/api/verifyCrime', {
          method: 'POST',
          body: {
            text: text,
            screenshot: screenshot,
            engagement: await extractEngagementMetrics(text, canvas)
          }
        })
        console.log('[VeritasScan] Crime verification result:', crimeVerificationResult)
      } catch (error) {
        console.warn('[VeritasScan] Crime verification failed:', error)
      }
    }

    const engagement = await extractEngagementMetrics(text, canvas)
    const chunks = intelligentChunking(text, 5)
    if (chunks.length === 0) chunks.push(text.slice(0, 500))
    console.log('[VeritasScan] Analyzing', chunks.length, 'text chunks')
    const fullTextAnalysis = await Promise.all([
      classifyTruthfulness(text.slice(0, 1000)), 
      classifyPanicRisk(text.slice(0, 1000), engagement)
    ])
    
    const baselineTruth = fullTextAnalysis[0]
    const baselinePanic = fullTextAnalysis[1]

    const analyses: ContentAnalysis[] = []
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      if (!chunk) continue
      console.log(`[VeritasScan] Processing chunk ${i + 1}/${chunks.length}...`)
      // Priority 1: Use crime verification results if available
      if (crimeVerificationResult) {
        console.log('[VeritasScan] Using crime verification results as primary source')
        const panic = await classifyPanicRisk(chunk, engagement)
        
        const truthfulnessReasoning = crimeVerificationResult.reasoning
        const panicReasoning = generatePanicReasoning(
          panic.label,
          panic.score,
          chunk,
          engagement
        )
        
        analyses.push({
          text: chunk,
          truthfulness: crimeVerificationResult.verified ? 'True' : 'False',
          panicRisk: crimeVerificationResult.riskLevel || panic.label as 'High' | 'Moderate' | 'Low',
          truthfulnessScore: crimeVerificationResult.confidence,
          panicScore: panic.score,
          screenshot: i === 0 ? screenshot : undefined,
          engagement: i === 0 ? engagement : undefined,
          reasoning: {
            truthfulnessReasoning,
            panicReasoning,
            modelInfo: {
              truthfulnessModel: 'Crime Verification API (Specialized Crime Analysis)',
              sentimentModel: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english (Sentiment Analysis)'
            },
            factCheck: {
              verified: crimeVerificationResult.verified,
              confidence: crimeVerificationResult.confidence,
              reasoning: crimeVerificationResult.reasoning,
              sources: crimeVerificationResult.sources || [],
              engagementRisk: crimeVerificationResult.riskLevel || 'Low',
              engagementReasoning: `Crime verification priority: ${crimeVerificationResult.priority}, Should Alert: ${crimeVerificationResult.shouldAlert}`
            }
          }
        })
        continue
      }
      
      // Priority 2: Use verified source results if available
      if (verifiedSourceResult && verifiedSourceResult.isVerified) {
        const boostedConfidence = Math.min(1.0, verifiedSourceResult.confidence + 0.2) 
        console.log(`[VeritasScan] Overriding AI classification with verified source: ${verifiedSourceResult.sourceName}`)
        const panic = await classifyPanicRisk(chunk, engagement)
       
        const truthfulnessReasoning = `${verifiedSourceResult.reasoning}\n\n✅ Verified Source Override: This content originates from a verified institutional source. AI classification was bypassed to prevent OCR-based misclassification errors.`
        const panicReasoning = generatePanicReasoning(
          panic.label,
          panic.score,
          chunk,
          engagement
        )
        analyses.push({
          text: chunk,
          truthfulness: 'True',
          panicRisk: panic.label as 'High' | 'Moderate' | 'Low',
          truthfulnessScore: boostedConfidence,
          panicScore: panic.score,
          screenshot: i === 0 ? screenshot : undefined,
          engagement: i === 0 ? engagement : undefined,
          reasoning: {
            truthfulnessReasoning,
            panicReasoning,
            modelInfo: {
              truthfulnessModel: 'Verified Source Authenticator (Pre-AI Check)',
              sentimentModel: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english (Sentiment Analysis)'
            },
            factCheck: {
              verified: true,
              confidence: boostedConfidence,
              reasoning: verifiedSourceResult.reasoning,
              sources: verifiedSourceResult.sourceName ? [{
                title: `Verified Source: ${verifiedSourceResult.sourceName}`,
                url: ''
              }] : []
            }
          }
        })
        
        continue 
      }
      const [truth, panic] = await Promise.all([
        classifyTruthfulness(chunk),
        classifyPanicRisk(chunk, engagement)
      ])
      let consistentTruth: { label: string; score: number }
      if (truth.label === baselineTruth.label) {
        consistentTruth = {
          label: truth.label,
          score: Math.max(truth.score, baselineTruth.score) * 0.8 + Math.min(truth.score, baselineTruth.score) * 0.2
        }
      } else {
        const moreConfident = truth.score > baselineTruth.score ? truth : baselineTruth
        consistentTruth = {
          label: moreConfident.label,
          score: moreConfident.score * 0.85
        }
      }
      let consistentPanic: { label: string; score: number }
      if (panic.label === baselinePanic.label) {
        consistentPanic = {
          label: panic.label,
          score: Math.max(panic.score, baselinePanic.score) * 0.8 + Math.min(panic.score, baselinePanic.score) * 0.2
        }
      } else {
        const higherRisk = getHigherRisk(panic, baselinePanic)
        consistentPanic = {
          label: higherRisk.label,
          score: Math.max(panic.score, baselinePanic.score)
        }
      }
      
      function getHigherRisk(a: { label: string; score: number }, b: { label: string; score: number }): { label: string; score: number } {
        const riskOrder = { 'High': 3, 'Moderate': 2, 'Low': 1 }
        const aOrder = riskOrder[a.label as keyof typeof riskOrder] || 0
        const bOrder = riskOrder[b.label as keyof typeof riskOrder] || 0
        return aOrder >= bOrder ? a : b
      }
      const truthfulnessReasoning = generateTruthfulnessReasoning(
        consistentTruth.label, 
        consistentTruth.score, 
        chunk
      )
      const panicReasoning = generatePanicReasoning(
        consistentPanic.label, 
        consistentPanic.score, 
        chunk,
        engagement 
      )
      let factCheckResult: any = null
      try {
        console.log('[VeritasScan] Performing internet fact-check with engagement data...')
        
        // Enhanced fact-check with network status context
        const factCheckBody: any = {
          text: chunk,
          engagement: engagement
        }
        
        // Add network status information if available
        if (networkStatus) {
          factCheckBody.networkContext = {
            huggingfaceAvailable: networkStatus.hfStatus?.ok || false,
            googleAvailable: networkStatus.googleStatus?.ok || false,
            proxySettings: networkStatus.env || {}
          }
        }
        
        const factCheckResponse = await $fetch('/api/factCheck', {
          method: 'POST',
          body: factCheckBody
        })
        factCheckResult = factCheckResponse
        console.log('[VeritasScan] Fact-check result:', factCheckResult)

        if (factCheckResult.verified && factCheckResult.confidence > 0.7) {
          consistentTruth.label = 'True'
          consistentTruth.score = Math.max(consistentTruth.score, factCheckResult.confidence)
          console.log('[VeritasScan]  Internet verification confirms: True (Official source detected)')
        } else if (!factCheckResult.verified) {
          const isOfficialInReasoning = factCheckResult.reasoning && (
            factCheckResult.reasoning.includes('OFFICIAL') ||
            factCheckResult.reasoning.includes('VERIFIED OFFICIAL') ||
            factCheckResult.reasoning.includes('government') ||
            factCheckResult.reasoning.includes('police station')
          )

          if (isOfficialInReasoning && factCheckResult.confidence > 0.7) {
            consistentTruth.label = 'True'
            consistentTruth.score = Math.max(consistentTruth.score, factCheckResult.confidence)
            console.log('[VeritasScan]  Official source detected - marking as True')
          } else {
            consistentTruth.label = 'False'
            consistentTruth.score = factCheckResult.confidence || 0.3
            if (factCheckResult.confidence < 0.3) {
              consistentTruth.score = 0.2
            }
          }
        }
    
        if (factCheckResult.engagementRisk === 'Low' && factCheckResult.engagementReasoning) {
          if (consistentPanic.label === 'High' && consistentPanic.score < 0.8) {
            consistentPanic.label = 'Moderate'
            consistentPanic.score = Math.max(0.3, consistentPanic.score * 0.7)
            console.log('[VeritasScan]  Reduced panic risk due to low engagement')
          } else if (consistentPanic.label === 'Moderate' && consistentPanic.score < 0.6) {
            consistentPanic.label = 'Low'
            consistentPanic.score = Math.max(0.1, consistentPanic.score * 0.6)
            console.log('[VeritasScan]  Reduced panic risk to Low due to low engagement')
          }
        } else if (factCheckResult.engagementRisk === 'High') {
          consistentPanic.score = Math.min(1, consistentPanic.score * 1.2)
          if (consistentPanic.score > 0.7) consistentPanic.label = 'High'
          console.log('[VeritasScan] ⬆ Increased panic risk due to high engagement/virality')
        }
      } catch (e: any) {
        console.warn('[VeritasScan] Fact-check failed:', e.message)
      }
      let finalTruthfulnessReasoning = truthfulnessReasoning
      if (factCheckResult) {
        if (factCheckResult.verified && factCheckResult.confidence > 0.7) {
  
          finalTruthfulnessReasoning = `${factCheckResult.reasoning}\n\n This content has been verified as an OFFICIAL SOURCE. Official police/government reports are authoritative and should be trusted.`
        } else if (!factCheckResult.verified) {
          const isOfficialInReasoning = factCheckResult.reasoning && factCheckResult.reasoning.includes('OFFICIAL')
          
          if (isOfficialInReasoning) {
            finalTruthfulnessReasoning = `${factCheckResult.reasoning}\n\n This content has been identified as an OFFICIAL SOURCE despite verification flag. Official police/government reports are authoritative.`
          } else {
            finalTruthfulnessReasoning = ` INTERNET VERIFICATION (PRIMARY): ${factCheckResult.reasoning}\n\n AI Model Prediction (SECONDARY): The zero-shot classifier suggested this might be TRUE (${(consistentTruth.score * 100).toFixed(0)}% confidence), but INTERNET FACT-CHECKING overrides this conclusion because the claims are UNVERIFIED. For crime-related content, unverified claims are treated as FALSE/MISINFORMATION to prevent panic.`
          }
        } else {
          finalTruthfulnessReasoning = ` INTERNET VERIFICATION (PRIMARY): ${factCheckResult.reasoning}\n\nAI Model Prediction: ${truthfulnessReasoning}`
        }
      }
      
      analyses.push({
        text: chunk,
        truthfulness: consistentTruth.label as 'True' | 'False' | 'Unverified',
        panicRisk: consistentPanic.label as 'High' | 'Moderate' | 'Low',
        truthfulnessScore: consistentTruth.score,
        panicScore: consistentPanic.score,
        screenshot: i === 0 ? screenshot : undefined,
        engagement: i === 0 ? engagement : undefined,
        reasoning: {
          truthfulnessReasoning: finalTruthfulnessReasoning,
          panicReasoning,
          modelInfo: {
            truthfulnessModel: 'Xenova/mobilebert-uncased-mnli (Zero-shot Classification)',
            sentimentModel: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english (Sentiment Analysis)'
          },
          factCheck: factCheckResult ? {
            verified: factCheckResult.verified,
            confidence: factCheckResult.confidence,
            reasoning: factCheckResult.reasoning,
            sources: factCheckResult.sources || [],
            engagementRisk: factCheckResult.engagementRisk,
            engagementReasoning: factCheckResult.engagementReasoning
          } : undefined
        }
      })
    }
    console.log('[VeritasScan] Analysis complete:', analyses.length, 'results')
    return analyses
  }

  async function extractEngagementMetrics(text: string, canvas?: HTMLCanvasElement): Promise<{ likes?: number; shares?: number; comments?: number }> {
    const engagement: { likes?: number; shares?: number; comments?: number } = {}
    
    // Enhanced regex patterns for social media engagement
    const commentMatch = text.match(/(\d+(?:\.\d+)?[KM]?)\s*(?:comment|comments)/i)
    const shareMatch = text.match(/(\d+(?:\.\d+)?[KM]?)\s*(?:share|shares)/i)
    const likeMatch = text.match(/(\d+(?:\.\d+)?[KM]?)\s*(?:like|likes)/i)
    const playMatch = text.match(/(\d+(?:\.\d+)?[KM]?)\s*(?:play|plays)/i)
    
    // Additional patterns for social media platforms
    const reactMatch = text.match(/(\d+(?:\.\d+)?[KM]?)\s*(?:react|reactions)/i)
    const viewMatch = text.match(/(\d+(?:\.\d+)?[KM]?)\s*(?:view|views)/i)
    const retweetMatch = text.match(/(\d+(?:\.\d+)?[KM]?)\s*(?:retweet|retweets)/i)
    
    // Pattern for "1.7k" style numbers
    const decimalKMatch = text.match(/(\d+\.\d+)k\s*(comment|share|like|react|view|retweet)s?/i)
    const wholeKMatch = text.match(/(\d+)k\s*(comment|share|like|react|view|retweet)s?/i)
    const millionMatch = text.match(/(\d+(?:\.\d+)?m)\s*(comment|share|like|react|view|retweet)s?/i)
    
    // Additional patterns for standalone numbers that might be engagement metrics
    const standaloneDecimalK = text.match(/(\d+\.\d+)k\b/i)
    const standaloneWholeK = text.match(/(\d+)k\b/i)
    const standaloneDecimalKWithSpace = text.match(/(\d+\.\d+)\s*k\b/i)
    const standaloneWholeKWithSpace = text.match(/(\d+)\s*k\b/i)
    
    // Pattern for "6k+" or "1.7k+" style numbers with plus sign
    const plusKMatch = text.match(/(\d+(?:\.\d+)?k)\+\s*(comment|share|like|react|view|retweet)s?/i)
    const plusMatch = text.match(/(\d+(?:\.\d+)?)[KM]?\+\s*(comment|share|like|react|view|retweet)s?/i)
    
    const parseNumber = (str: string): number => {
      const num = parseFloat(str)
      if (str.toLowerCase().includes('k')) return num * 1000
      if (str.toLowerCase().includes('m')) return num * 1000000
      return num
    }
    
    // Extract from standard patterns
    if (commentMatch && commentMatch[1]) {
      engagement.comments = Math.round(parseNumber(commentMatch[1]))
    }
    if (shareMatch && shareMatch[1]) {
      engagement.shares = Math.round(parseNumber(shareMatch[1]))
    }
    if (likeMatch && likeMatch[1]) {
      engagement.likes = Math.round(parseNumber(likeMatch[1]))
    }
    if (playMatch && playMatch[1] && !engagement.likes) {
      engagement.likes = Math.round(parseNumber(playMatch[1]))
    }
    if (reactMatch && reactMatch[1]) {
      engagement.likes = Math.round(parseNumber(reactMatch[1]))
    }
    if (viewMatch && viewMatch[1]) {
      engagement.likes = Math.round(parseNumber(viewMatch[1]))
    }
    if (retweetMatch && retweetMatch[1]) {
      engagement.shares = Math.round(parseNumber(retweetMatch[1]))
    }
    
    // Extract from enhanced patterns
    if (decimalKMatch && decimalKMatch[1]) {
      const value = parseNumber(decimalKMatch[1])
      const type = decimalKMatch[2]?.toLowerCase() || ''
      if (type.includes('comment')) engagement.comments = Math.round(value)
      else if (type.includes('share')) engagement.shares = Math.round(value)
      else if (type.includes('like') || type.includes('react')) engagement.likes = Math.round(value)
      else if (type.includes('view')) engagement.likes = Math.round(value)
      else if (type.includes('retweet')) engagement.shares = Math.round(value)
    }
    
    if (wholeKMatch && wholeKMatch[1]) {
      const value = parseNumber(wholeKMatch[1])
      const type = wholeKMatch[2]?.toLowerCase() || ''
      if (type.includes('comment')) engagement.comments = Math.round(value)
      else if (type.includes('share')) engagement.shares = Math.round(value)
      else if (type.includes('like') || type.includes('react')) engagement.likes = Math.round(value)
      else if (type.includes('view')) engagement.likes = Math.round(value)
      else if (type.includes('retweet')) engagement.shares = Math.round(value)
    }
    
    if (millionMatch && millionMatch[1]) {
      const value = parseNumber(millionMatch[1])
      const type = millionMatch[2]?.toLowerCase() || ''
      if (type.includes('comment')) engagement.comments = Math.round(value)
      else if (type.includes('share')) engagement.shares = Math.round(value)
      else if (type.includes('like') || type.includes('react')) engagement.likes = Math.round(value)
      else if (type.includes('view')) engagement.likes = Math.round(value)
      else if (type.includes('retweet')) engagement.shares = Math.round(value)
    }
    
    // Handle "plus" indicators (means "at least this many")
    if (plusKMatch && plusKMatch[1]) {
      const value = parseNumber(plusKMatch[1])
      const type = plusKMatch[2]?.toLowerCase() || ''
      // For "6k+" we should treat it as at least 6000, potentially more
      const adjustedValue = value * 1.2 // Add 20% buffer for "+" indicators
      if (type.includes('comment')) engagement.comments = Math.round(adjustedValue)
      else if (type.includes('share')) engagement.shares = Math.round(adjustedValue)
      else if (type.includes('like') || type.includes('react')) engagement.likes = Math.round(adjustedValue)
      else if (type.includes('view')) engagement.likes = Math.round(adjustedValue)
      else if (type.includes('retweet')) engagement.shares = Math.round(adjustedValue)
    }
    
    if (plusMatch && plusMatch[1]) {
      const value = parseNumber(plusMatch[1])
      const type = plusMatch[2]?.toLowerCase() || ''
      const adjustedValue = value * 1.2 // Add 20% buffer for "+" indicators
      if (type.includes('comment')) engagement.comments = Math.round(adjustedValue)
      else if (type.includes('share')) engagement.shares = Math.round(adjustedValue)
      else if (type.includes('like') || type.includes('react')) engagement.likes = Math.round(adjustedValue)
      else if (type.includes('view')) engagement.likes = Math.round(adjustedValue)
      else if (type.includes('retweet')) engagement.shares = Math.round(adjustedValue)
    }
    
    // Handle standalone K numbers (without explicit labels) by inferring from context
    if (!engagement.comments && !engagement.shares && !engagement.likes) {
      // Check for standalone K numbers and assign based on position/context
      const allKNumbers = [
        standaloneDecimalK?.[1],
        standaloneWholeK?.[1],
        standaloneDecimalKWithSpace?.[1],
        standaloneWholeKWithSpace?.[1]
      ].filter(Boolean)
      
      if (allKNumbers.length > 0) {
        // Look for context clues in the text
        const lowerText = text.toLowerCase()
        const commentKeywords = ['comment', 'reply', 'chat', 'discuss']
        const shareKeywords = ['share', 'send', 'forward', 'retweet', 'repost']
        const likeKeywords = ['like', 'react', 'love', 'heart', 'thumbs']
        
        // Assign based on context keywords
        for (const kNumber of allKNumbers) {
          if (!kNumber) continue
          const value = parseNumber(kNumber)
          
          // Check for comment context
          if (commentKeywords.some(keyword => lowerText.includes(keyword)) && !engagement.comments) {
            engagement.comments = Math.round(value)
            console.log('[VeritasScan] Inferred comments from standalone K number:', kNumber)
            continue
          }
          
          // Check for share context
          if (shareKeywords.some(keyword => lowerText.includes(keyword)) && !engagement.shares) {
            engagement.shares = Math.round(value)
            console.log('[VeritasScan] Inferred shares from standalone K number:', kNumber)
            continue
          }
          
          // Check for like context
          if (likeKeywords.some(keyword => lowerText.includes(keyword)) && !engagement.likes) {
            engagement.likes = Math.round(value)
            console.log('[VeritasScan] Inferred likes from standalone K number:', kNumber)
            continue
          }
          
          // If no clear context, assign to comments as default for social media posts
          if (!engagement.comments) {
            engagement.comments = Math.round(value)
            console.log('[VeritasScan] Assigned standalone K number to comments (default):', kNumber)
          }
        }
      }
    }
    
    // If canvas is provided and text extraction didn't find engagement metrics, try enhanced detection
    if (Object.keys(engagement).length > 0) {
      console.log('[VeritasScan] Extracted engagement metrics:', engagement)
    }
    
    return engagement
  }

  function intelligentChunking(text: string, maxChunks: number): string[] {
    const sentences = text.split(/[.!?]\s+/).filter(s => s.length > 20)
    if (sentences.length <= maxChunks) {
      return sentences
    }
    const chunks: string[] = []
    const chunkSize = Math.ceil(sentences.length / maxChunks)
    
    for (let i = 0; i < sentences.length; i += chunkSize) {
      chunks.push(sentences.slice(i, i + chunkSize).join('. ') + '.')
    }
    
    return chunks.slice(0, maxChunks)
  }

  function generateTruthfulnessReasoning(label: string, score: number, text: string): string {
    const confidence = (score * 100).toFixed(1)
    if (label === 'True') {
      return `The zero-shot classifier analyzed the text and determined it is likely TRUE with ${confidence}% confidence. The model compared the content against patterns it learned from training data and found it aligns with factual, verifiable statements.`
    } else if (label === 'False') {
      return `The zero-shot classifier flagged this content as likely FALSE with ${confidence}% confidence. The model detected patterns that suggest misinformation, exaggeration, or claims that contradict established facts.`
    } else {
      return `The classifier could not definitively determine truthfulness (${confidence}% confidence). This may indicate ambiguous language, opinion-based content, or statements that require additional context to verify.`
    }
  }

  function generatePanicReasoning(label: string, score: number, text: string, engagement?: { likes?: number; shares?: number; comments?: number }): string {
    const confidence = (score * 100).toFixed(1)
    const lowerText = text.toLowerCase()
    const crimeWords = ['crime', 'murder', 'kill', 'homicide', 'robbery', 'theft', 'rape', 'assault', 'shooting', 'gun', 'weapon', 'attack', 'violence', 'terrorist', 'bomb', 'kidnap', 'abduction', 'missing', 'dead', 'death', 'victim'].filter(w => lowerText.includes(w))
    const locationWords = ['bago city', 'bago', 'negros occidental'].filter(w => lowerText.includes(w))
    const isLocalCrime = crimeWords.length > 0 && locationWords.length > 0
    
    const negativeWords = ['crisis', 'emergency', 'urgent', 'danger', 'warning', 'alert', 'panic', 'fear', 'worried', 'scared'].filter(w => lowerText.includes(w))
    const disasterWords = ['supervolcano', 'caldera', 'eruption', 'cataclysmic', 'disaster', 'crisis', 'threat'].filter(w => lowerText.includes(w))
    const allTriggerWords = [...crimeWords, ...negativeWords, ...disasterWords]
    
    const totalEngagement = engagement ? (engagement.likes || 0) + (engagement.shares || 0) * 2 + (engagement.comments || 0) : 0
    const engagementContext = totalEngagement > 0 && engagement
      ? ` Current engagement: ${engagement.likes || 0} likes, ${engagement.shares || 0} shares, ${engagement.comments || 0} comments (${totalEngagement < 50 ? 'LOW virality - limited spread risk' : totalEngagement > 1000 ? 'HIGH virality - rapid spread risk' : 'MODERATE virality'}).`
      : ''
    
    if (label === 'High') {
      let reasoning = ` HIGH panic risk detected (${confidence}% confidence). `

      if (isLocalCrime && crimeWords.length > 0) {
        reasoning += ` CRITICAL PUBLIC SAFETY RISK: This content contains CRIME-related keywords (${crimeWords.slice(0, 3).join(', ')}) about LOCAL AREA (${locationWords.join(', ')}). UNVERIFIED crime news can cause WIDESPREAD PANIC among local citizens, create fear, and harm public safety. This is especially dangerous if the crime report is FALSE - it can trigger unnecessary fear and panic in the community. `
      } else if (crimeWords.length > 0) {
        reasoning += ` CRIME CONTENT DETECTED: Content mentions crime-related keywords (${crimeWords.slice(0, 3).join(', ')}) that can cause fear and panic, especially if unverified. `
      }
      
      if (disasterWords.length > 0) {
        reasoning += `CRITICAL: Content contains disaster-related keywords (${disasterWords.slice(0, 3).join(', ')}) that can cause widespread social panic, even if the sentiment seems neutral. `
      }
      
      if (negativeWords.length > 0) {
        reasoning += `Strong negative emotional indicators detected: ${negativeWords.slice(0, 3).join(', ')}. `
      }
      
      reasoning += `This type of content poses a serious risk of triggering mass anxiety, misinformation spread, and public panic - especially if it contains unverified claims about crimes, natural disasters, or emergencies.`
      
      if (isLocalCrime) {
        reasoning += `  LOCAL CRIME ALERT: For public safety, this content MUST be verified through official sources (local police, city government, reputable local news) before sharing. False crime reports can cause unnecessary panic in the local community.`
      }
      
      if (totalEngagement < 50) {
        reasoning += ` However, LOW engagement (${totalEngagement} total interactions) reduces immediate spread risk - the content is not currently going viral, which limits its panic-inducing potential.`
      } else if (totalEngagement > 1000) {
        reasoning += ` URGENT: HIGH engagement detected - this content is spreading rapidly and requires immediate fact-checking to prevent mass panic.`
      }
      
      return reasoning
    } else if (label === 'Moderate') {
      let modReasoning = `Sentiment analysis shows MODERATE panic risk (${confidence}% confidence). The content contains some concerning language${allTriggerWords.length > 0 ? ` including: ${allTriggerWords.slice(0, 3).join(', ')}` : ''} but may not cause severe distress.`
      
      if (isLocalCrime) {
        modReasoning += `  Note: This is LOCAL CRIME content - please verify through official local sources before sharing to prevent unnecessary panic.`
      }
      
      modReasoning += ` Monitor for verification.${engagementContext}`
      return modReasoning
    } else {
      let reasoning = `Sentiment analysis indicates LOW panic risk (${confidence}% confidence). The content maintains a neutral or positive tone and is unlikely to cause significant emotional distress.`
      
      if (totalEngagement < 50 && engagement) {
        reasoning += ` Low engagement (${totalEngagement} interactions) further confirms limited spread potential.`
      }
      
      return reasoning
    }
  }
  function deduplicateAnalyses(analyses: ContentAnalysis[]): ContentAnalysis[] {
    const seen = new Set<string>()
    const deduplicated: ContentAnalysis[] = []
    
    for (const analysis of analyses) {
      const normalizedText = analysis.text.trim().toLowerCase().replace(/\s+/g, ' ')
      const textHash = normalizedText.slice(0, 100)
      let isDuplicate = false
      for (const existing of deduplicated) {
        const existingNormalized = existing.text.trim().toLowerCase().replace(/\s+/g, ' ')
        const existingHash = existingNormalized.slice(0, 100)
        if (textHash === existingHash) {
          isDuplicate = true
          break
        }
        const similarity = calculateSimilarity(normalizedText, existingNormalized)
        if (similarity > 0.8) {
          isDuplicate = true
          break
        }
      }
      
      if (!isDuplicate && !seen.has(textHash)) {
        seen.add(textHash)
        deduplicated.push(analysis)
      }
    }
    
    console.log('[VeritasScan] Deduplication:', analyses.length, '->', deduplicated.length, 'results')
    return deduplicated
  }
  
  function calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    if (longer.length / shorter.length > 2) return 0

    if (longer.includes(shorter)) {
      return shorter.length / longer.length
    }
    const set1 = new Set(longer.split(''))
    const set2 = new Set(shorter.split(''))
    let intersection = 0
    for (const char of set2) {
      if (set1.has(char)) intersection++
    }
    
    return intersection / Math.max(set1.size, set2.size)
  }

  function segregate(analyses: ContentAnalysis[]): SegregatedResults {
    const deduplicated = deduplicateAnalyses(analyses)
    
    const verifiedLowRisk: ContentAnalysis[] = []
    const highRiskAlerts: ContentAnalysis[] = []

    for (const analysis of deduplicated) {
      const isFactuallyFalse = analysis.truthfulness === 'False'
      const hasHighPanicRisk = analysis.panicRisk === 'High'
      const engagement = analysis.engagement || {}
      const totalEngagement = (engagement.likes || 0) + (engagement.shares || 0) * 2 + (engagement.comments || 0)
      const hasLowEngagement = totalEngagement < 50
      let isHighRisk = false
      
      if (isFactuallyFalse) {
    
        if (hasHighPanicRisk || analysis.panicRisk === 'Moderate') {
          isHighRisk = true
        } else if (!hasLowEngagement && totalEngagement > 0) {

          isHighRisk = true
        }
      } else if (hasHighPanicRisk) {
        if (!hasLowEngagement || analysis.truthfulness !== 'True') {
          isHighRisk = true
        } else {
          isHighRisk = true
        }
      } else if (analysis.panicRisk === 'Moderate' && analysis.truthfulness === 'False') {
        isHighRisk = true
      }
      
      if (isHighRisk) {
        highRiskAlerts.push(analysis)
      } else {
        verifiedLowRisk.push(analysis)
      }
    }

    console.log('[VeritasScan] Segregation:', {
      highRisk: highRiskAlerts.length,
      verified: verifiedLowRisk.length
    })
    return { verifiedLowRisk, highRiskAlerts }
  }

  async function scan(canvas: HTMLCanvasElement, onCrimeDetected?: (text: string, screenshot: string) => void) {
    if (analyzing.value) {
      console.log('[VeritasScan] Scan already in progress, skipping...')
      return
    }
    analyzing.value = true
    lastError.value = null
    try {
      const analyses = await analyzeContent(canvas)
      if (analyses.length === 0) {
        console.warn('[VeritasScan] No analyses returned - likely no text found')
      }
      
      if (onCrimeDetected) {
        for (const analysis of analyses) {
          const lowerText = analysis.text.toLowerCase()
          const crimeKeywords = ['crime', 'murder', 'kill', 'theft', 'robbery', 'assault', 'police', 'arrest', 'drug']
          const locationKeywords = ['bago', 'bago city', 'negros occidental']
          
          const hasCrime = crimeKeywords.some(kw => lowerText.includes(kw))
          const hasLocation = locationKeywords.some(loc => lowerText.includes(loc))
          
          if (hasCrime && hasLocation && analysis.screenshot) {
            console.log('[VeritasScan]  Crime content detected, triggering verification...')
            onCrimeDetected(analysis.text, analysis.screenshot)
          }
        }
      }
      
      const segregated = segregate(analyses)
      results.value = segregated
      extractedTexts.value = analyses.map(a => a.text)
    
    } catch (e: any) {
      lastError.value = e?.message || 'Scan failed'
    } finally {
      analyzing.value = false
    }
  }

  function startContinuousScan(
    getCanvas: () => HTMLCanvasElement | null | Promise<HTMLCanvasElement | null>,
    intervalMs = 15000
  ) {
    if (scanTimer) {
      console.log('[VeritasScan] Continuous scan already running')
      return
    }
    console.log('[VeritasScan] Starting continuous scan every', intervalMs, 'ms')
    const getCanvasAsync = async () => {
      const result = getCanvas()
      return result instanceof Promise ? result : Promise.resolve(result)
    }
    getCanvasAsync().then((canvas) => {
      if (canvas) {
        console.log('[VeritasScan] Running initial scan...')
        scan(canvas)
      } else {
        console.warn('[VeritasScan] No canvas available for initial scan')
      }
    }).catch((e) => {
      console.error('[VeritasScan] Error getting canvas for initial scan:', e)
    })
    scanTimer = setInterval(() => {
      console.log('[VeritasScan] Interval scan triggered')
      getCanvasAsync().then((canvas) => {
        if (canvas) {
          scan(canvas)
        } else {
          console.warn('[VeritasScan] No canvas available for interval scan')
        }
      }).catch((e) => {
        console.error('[VeritasScan] Error getting canvas for interval scan:', e)
      })
    }, intervalMs)
  }

  function stopContinuousScan() {
    if (scanTimer) {
      console.log('[VeritasScan] Stopping continuous scan')
      clearInterval(scanTimer)
      scanTimer = null
    }
  }

  return {
    analyzing,
    results,
    extractedTexts,
    lastError,
    scan,
    startContinuousScan,
    stopContinuousScan,
    runDiagnostics
  }
}

