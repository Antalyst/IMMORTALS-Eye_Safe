import { defineEventHandler, readBody } from 'h3'
import { logLine } from '../utils/logger'

type Detection = { label: string; score: number; box?: { x: number; y: number; w: number; h: number } }

// Minimum-viable message(peer, message) handler
export async function message(peer: any, message: any) {
  // Expect message to contain raw image bytes or data URL
  const config = useRuntimeConfig()
  const hfKey = config.hfApiKey
  if (!hfKey) {
    return { ok: false, error: 'Missing HF_API_KEY' }
  }

  let bytes: Uint8Array | null = null
  if (message instanceof Uint8Array || message instanceof ArrayBuffer) {
    bytes = message instanceof Uint8Array ? message : new Uint8Array(message as ArrayBuffer)
  } else if (typeof message === 'string' && message.startsWith('data:image/')) {
    const b64 = message.includes(',') ? message.split(',')[1] : message
    bytes = new Uint8Array((globalThis as any).Buffer.from(b64, 'base64'))
  } else if (typeof message === 'string') {
    // assume base64 string
    bytes = new Uint8Array((globalThis as any).Buffer.from(message, 'base64'))
  }

  if (!bytes) {
    return { ok: false, error: 'Unsupported message format' }
  }

  const model = 'hustvl/yolos-tiny'
  const url = `https://api-inference.huggingface.co/models/${model}`

  try {
    const response = await $fetch<any>(url, {
      method: 'POST',
      body: bytes,
      headers: {
        Authorization: `Bearer ${hfKey}`,
        'Content-Type': 'application/octet-stream',
        Accept: 'application/json',
        'User-Agent': 'immortals-eye-safe/1.0',
        'X-Wait-For-Model': 'true'
      },
      timeout: 90000
    })

    const detections: Detection[] = Array.isArray(response)
      ? response
          .filter((i: any) => typeof i?.label === 'string' && typeof i?.score === 'number')
          .map((i: any) => ({ label: i.label, score: i.score, box: i.box }))
      : []

    const summary = detections
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((d) => `- ${d.label} (${(d.score * 100).toFixed(1)}%)`)
      .join('\n') || 'No objects detected.'

    const lowerLabels = detections.map((d) => d.label.toLowerCase())
    const privacy = lowerLabels.some((l) => l.includes('settings') || l.includes('message'))

    return {
      ok: true,
      privacy,
      summary,
      detections
    }
  } catch (e: any) {
    await logLine('error', 'stream.message error', { message: e?.message })
    return { ok: false, error: e?.message || 'fetch failed' }
  }
}

// Also expose as an HTTP POST API for convenience: body = { peer?, message }
export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as { peer?: any; message: any }
  const res = await message(body?.peer, body?.message)
  return res
})





