import { defineEventHandler, readBody } from 'h3'
import { logLine } from '../utils/logger'

type AnalyzeRequestBody = {
  imageBase64: string // data URL or raw base64 (PNG/JPEG)
}

type AnalyzeResponse = {
  summary: string
  reliability: 'unknown' | 'mixed' | 'likely_real' | 'likely_false'
  sources?: Array<{ title: string; url: string }>
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const hfKey = config.hfApiKey
  if (!hfKey) {
    return {
      summary: 'AI disabled: Missing HF_API_KEY in runtimeConfig.',
      reliability: 'unknown' as const,
      sources: []
    }
  }

  const body = (await readBody(event)) as AnalyzeRequestBody
  if (!body?.imageBase64) {
    await logLine('warn', 'analyzeScreen: missing imageBase64')
    throw createError({ statusCode: 400, statusMessage: 'imageBase64 required' })
  }

  // Normalize possible data URL to raw base64
  const base64 = body.imageBase64.includes(',') ? body.imageBase64.split(',')[1] : body.imageBase64

  // Hugging Face Inference API - default object detection model
  // Default to a lightweight detection model prone to faster cold-start
  const model = 'hustvl/yolos-tiny'
  const url = `https://api-inference.huggingface.co/models/${model}`
  // Convert base64 to binary Buffer
  const imageBuffer = (globalThis as any).Buffer.from(base64, 'base64')

  try {
    await logLine('info', 'analyzeScreen: request', {
      imageLength: imageBuffer.length,
      mime: 'image/png',
      model
    })
    // Retry loop to handle cold starts and transient network errors
    const maxRetries = 3
    let response: any
    let lastErr: any
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await $fetch<any>(url, {
          method: 'POST',
          body: imageBuffer,
          headers: {
            'Authorization': `Bearer ${hfKey}`,
            'Content-Type': 'image/png',
            'Accept': 'application/json',
            'User-Agent': 'immortals-eye-safe/1.0',
            // Ask HF to load the model and wait until it's ready
            'X-Wait-For-Model': 'true'
          },
          timeout: 90000 // allow cold start
        })
        break
      } catch (e: any) {
        lastErr = e
        await logLine('warn', 'analyzeScreen: hf retry', { attempt, message: e?.message })
        // Backoff: 1s, 2s
        if (attempt < maxRetries) await new Promise(r => setTimeout(r, attempt * 1000))
      }
    }
    if (!response && lastErr) throw lastErr

    // Handle both object detection (box) and classification (no box)
    const items = Array.isArray(response) ? response : []
    const valid = items.filter((i: any) => typeof i?.score === 'number' && typeof i?.label === 'string')
    const sorted = valid.sort((a: any, b: any) => b.score - a.score).slice(0, 6)
    const hasBoxes = sorted.some((i: any) => i?.box)
    const lines = sorted.map((i: any) => {
      const base = `- ${i.label} (${(i.score * 100).toFixed(1)}%)`
      if (i.box && typeof i.box === 'object') {
        const { x, y, w, h } = i.box
        return `${base} [x:${Math.round(x)}, y:${Math.round(y)}, w:${Math.round(w)}, h:${Math.round(h)}]`
      }
      return base
    })
    const summary = lines.join('\n') || (hasBoxes ? 'No objects detected.' : 'No classes found.')
    const result: AnalyzeResponse = {
      summary,
      reliability: 'unknown'
    }
    await logLine('info', 'analyzeScreen: success', { count: items?.length ?? 0, model })
    return result
  } catch (err: any) {
    await logLine('error', 'analyzeScreen: error', {
      message: err?.message,
      name: err?.name,
      status: err?.status,
      data: err?.data
    })
    return {
      summary: 'Analysis failed. Please try again.',
      reliability: 'unknown' as const,
      sources: []
    }
  }
})



