import { defineEventHandler, readBody } from 'h3'
import { logLine } from '../utils/logger'

type ClientLogBody = {
  level?: 'info' | 'warn' | 'error'
  message: string
  meta?: Record<string, any>
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as ClientLogBody
  if (!body?.message) return { ok: false }
  const level = body.level || 'info'
  await logLine(level, `client: ${body.message}`, body.meta)
  return { ok: true }
})





