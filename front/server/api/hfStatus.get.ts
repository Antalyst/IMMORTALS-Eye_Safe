import { defineEventHandler } from 'h3'
import { logLine } from '../utils/logger'

export default defineEventHandler(async (): Promise<{ ok: boolean; res?: unknown; error?: string }> => {
  const model = 'hustvl/yolos-tiny'
  const url = `https://api-inference.huggingface.co/status/models/${model}`
  const hfKey = useRuntimeConfig().hfApiKey
  try {
    const res: unknown = await $fetch(url, {
      method: 'GET',
      timeout: 15000,
      headers: hfKey ? { Authorization: `Bearer ${hfKey}` } : undefined
    })
    await logLine('info', 'hfStatus: ok', { model, res })
    return { ok: true, res }
  } catch (e: any) {
    await logLine('error', 'hfStatus: error', { message: e?.message, name: e?.name })
    return { ok: false, error: e?.message || 'fetch failed' }
  }
})



