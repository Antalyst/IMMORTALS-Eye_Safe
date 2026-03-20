export async function logLine(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, any>) {
  const ts = new Date().toISOString()
  const serializedMeta = meta ? ` ${JSON.stringify(meta)}` : ''
  const line = `[${ts}] [${level.toUpperCase()}] ${message}${serializedMeta}\n`

  // Browser-safe fallback: this module is reachable from client bundles via dynamic imports,
  // so avoid importing Node-only modules at top-level.
  if (typeof window !== 'undefined') {
    // Keep it low-noise; server will still write to disk.
    // eslint-disable-next-line no-console
    console.debug(line.trim(), meta ?? '')
    return
  }

  const fsPromises = await import('node:fs/promises')
  const path = await import('node:path')

  const LOG_PATH = path.join(process.cwd(), 'logs', 'app.log')
  const ensureDirExists = async (filePath: string) => {
    try {
      await fsPromises.mkdir(path.dirname(filePath), { recursive: true })
    } catch {
      // ignore
    }
  }

  await ensureDirExists(LOG_PATH)
  try {
    await fsPromises.appendFile(LOG_PATH, line, { encoding: 'utf8' })
  } catch {
    // ignore write errors to avoid breaking API
  }
}



