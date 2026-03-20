import { defineEventHandler } from 'h3'
import { logLine } from '../utils/logger'

async function tryFetch(url: string, timeoutMs = 10000, headers?: Record<string, string>) {
  try {
    const res = await $fetch(url, { method: 'GET', timeout: timeoutMs, headers })
    return { ok: true, res }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'fetch failed', name: e?.name }
  }
}

export default defineEventHandler(async () => {
  const hfModel = 'hustvl/yolos-tiny'
  const hfStatusUrl = `https://api-inference.huggingface.co/status/models/${hfModel}`
  const googleUrl = 'https://www.google.com/generate_204'
  const hfKey = useRuntimeConfig().hfApiKey

  const [hfStatus, googleStatus] = await Promise.all([
    tryFetch(hfStatusUrl, 15000, hfKey ? { Authorization: `Bearer ${hfKey}` } : undefined),
    tryFetch(googleUrl)
  ])

  const result = { hfStatus, googleStatus, env: {
    HTTPS_PROXY: (globalThis as any).process?.env?.HTTPS_PROXY || null,
    HTTP_PROXY: (globalThis as any).process?.env?.HTTP_PROXY || null,
    NO_PROXY: (globalThis as any).process?.env?.NO_PROXY || null
  } }
  await logLine('info', 'netCheck', result as any)
  return result
})



