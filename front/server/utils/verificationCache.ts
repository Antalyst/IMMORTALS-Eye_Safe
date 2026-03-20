/**
 * Verification Cache System
 * Caches verification results locally using JSON file or memory
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

export interface CachedVerification {
  textHash: string
  result: {
    verdict: 'Likely True' | 'Likely False' | 'Inconclusive'
    confidence: number
    sources: string[]
    reasoning: string
  }
  timestamp: number
  expiresAt: number
}

const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
const CACHE_FILE = join(process.cwd(), '.veritas-cache.json')

// In-memory cache for fast access
let memoryCache: Map<string, CachedVerification> = new Map()

/**
 * Generate hash from text for cache key
 */
function generateHash(text: string): string {
  return createHash('md5').update(text.trim().toLowerCase()).digest('hex')
}

/**
 * Load cache from file
 */
function loadCache(): void {
  try {
    if (existsSync(CACHE_FILE)) {
      const fileContent = readFileSync(CACHE_FILE, 'utf-8')
      const cachedData: CachedVerification[] = JSON.parse(fileContent)
      
      // Filter expired entries and load into memory
      const now = Date.now()
      memoryCache.clear()
      
      cachedData.forEach(entry => {
        if (entry.expiresAt > now) {
          memoryCache.set(entry.textHash, entry)
        }
      })
      
      // Save cleaned cache back to file
      saveCache()
    }
  } catch (error) {
    console.warn('[VerificationCache] Failed to load cache:', error)
    memoryCache.clear()
  }
}

/**
 * Save cache to file
 */
function saveCache(): void {
  try {
    const cacheDir = join(process.cwd(), '.veritas-cache')
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true })
    }
    
    const entries = Array.from(memoryCache.values())
    writeFileSync(CACHE_FILE, JSON.stringify(entries, null, 2), 'utf-8')
  } catch (error) {
    console.warn('[VerificationCache] Failed to save cache:', error)
  }
}

/**
 * Get cached verification result
 */
export function getCachedVerification(text: string): CachedVerification | null {
  // Load cache if empty
  if (memoryCache.size === 0) {
    loadCache()
  }
  
  const textHash = generateHash(text)
  const cached = memoryCache.get(textHash)
  
  if (cached && cached.expiresAt > Date.now()) {
    return cached
  }
  
  // Remove expired entry
  if (cached) {
    memoryCache.delete(textHash)
  }
  
  return null
}

/**
 * Cache verification result
 */
export function cacheVerification(
  text: string,
  result: {
    verdict: 'Likely True' | 'Likely False' | 'Inconclusive'
    confidence: number
    sources: string[]
    reasoning: string
  },
  ttl: number = CACHE_TTL
): void {
  const textHash = generateHash(text)
  const now = Date.now()
  
  const cached: CachedVerification = {
    textHash,
    result,
    timestamp: now,
    expiresAt: now + ttl
  }
  
  memoryCache.set(textHash, cached)
  
  // Periodically save to file (every 10 entries)
  if (memoryCache.size % 10 === 0) {
    saveCache()
  }
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): number {
  const now = Date.now()
  let cleared = 0
  
  memoryCache.forEach((entry, hash) => {
    if (entry.expiresAt <= now) {
      memoryCache.delete(hash)
      cleared++
    }
  })
  
  if (cleared > 0) {
    saveCache()
  }
  
  return cleared
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  memoryCache.clear()
  try {
    if (existsSync(CACHE_FILE)) {
      writeFileSync(CACHE_FILE, '[]', 'utf-8')
    }
  } catch (error) {
    console.warn('[VerificationCache] Failed to clear cache file:', error)
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number
  entries: number
  memorySize: number
} {
  return {
    size: memoryCache.size,
    entries: memoryCache.size,
    memorySize: JSON.stringify(Array.from(memoryCache.values())).length
  }
}

// Initialize cache on module load
loadCache()

// Clean expired entries every hour
setInterval(() => {
  clearExpiredCache()
}, 60 * 60 * 1000)

