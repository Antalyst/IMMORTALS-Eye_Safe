import { ref } from 'vue'

declare global {
  interface Window {
    transformers?: any
    Tesseract?: any
  }
}

/**
 * Enhanced Social Media UI Detection
 * 
 * This module provides specialized detection for social media engagement elements
 * that are typically missed by general object detection models.
 */

export interface SocialMediaDetection {
  hasShareButton: boolean
  hasCommentButton: boolean
  hasLikeButton: boolean
  hasEngagementNumbers: boolean
  engagementText?: string
  detectedElements: string[]
  confidence: number
}

export function useSocialMediaDetector() {
  const detecting = ref(false)
  const lastResult = ref<SocialMediaDetection | null>(null)
  const lastError = ref<string | null>(null)

  let detector: any | null = null
  let tesseract: any | null = null

  async function loadTransformers(): Promise<any> {
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

  async function loadTesseract(): Promise<any> {
    if (typeof window === 'undefined') return null
    if ((window as any).Tesseract) {
      return (window as any).Tesseract
    }
    
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load tesseract.js'))
      document.head.appendChild(script)
    })
    return (window as any).Tesseract
  }

  async function ensureDetector(): Promise<any> {
    if (detector) return detector
    const transformers = await loadTransformers()
    if (!transformers) throw new Error('Transformers not available')
    
    // Load a more specialized model for UI elements
    detector = await transformers.pipeline('object-detection', 'Xenova/detr-resnet-50')
    return detector
  }

  async function ensureTesseractInstance(): Promise<any> {
    if (tesseract) return tesseract
    tesseract = await loadTesseract()
    return tesseract
  }

  /**
   * Extract text from specific regions of the image where engagement metrics typically appear
   */
  async function extractEngagementRegions(canvas: HTMLCanvasElement): Promise<{
    topRight?: string
    bottomRight?: string
    bottomLeft?: string
    fullText: string
  }> {
    const t = await ensureTesseractInstance()
    if (!t) return { fullText: '' }

    const width = canvas.width
    const height = canvas.height

    // Extract text from regions where engagement metrics typically appear
    const regions = [
      {
        name: 'topRight',
        x: Math.floor(width * 0.7),
        y: 0,
        w: Math.floor(width * 0.3),
        h: Math.floor(height * 0.2)
      },
      {
        name: 'bottomRight', 
        x: Math.floor(width * 0.7),
        y: Math.floor(height * 0.8),
        w: Math.floor(width * 0.3),
        h: Math.floor(height * 0.2)
      },
      {
        name: 'bottomLeft',
        x: 0,
        y: Math.floor(height * 0.8),
        w: Math.floor(width * 0.3),
        h: Math.floor(height * 0.2)
      }
    ]

    const results: any = { fullText: '' }

    // Extract full text first
    const { data: fullData } = await t.recognize(canvas, 'eng', {
      logger: () => {},
      preserve_interword_spaces: true
    })
    results.fullText = String(fullData?.text || '').trim()

    // Extract text from specific regions
    for (const region of regions) {
      try {
        const regionCanvas = document.createElement('canvas')
        regionCanvas.width = region.w
        regionCanvas.height = region.h
        const ctx = regionCanvas.getContext('2d')
        if (!ctx) continue

        ctx.drawImage(canvas, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h)

        const { data } = await t.recognize(regionCanvas, 'eng', {
          logger: () => {},
          preserve_interword_spaces: true
        })
        
        const text = String(data?.text || '').trim()
        if (text.length > 0) {
          results[region.name] = text
        }
      } catch (error) {
        console.warn(`[SocialMediaDetector] Failed to extract ${region.name} region:`, error)
      }
    }

    return results
  }

  /**
   * Detect social media UI elements using OCR and pattern recognition
   */
  async function detectSocialMediaElements(canvas: HTMLCanvasElement): Promise<SocialMediaDetection> {
    if (detecting.value) return lastResult.value || {
      hasShareButton: false,
      hasCommentButton: false,
      hasLikeButton: false,
      hasEngagementNumbers: false,
      detectedElements: [],
      confidence: 0
    }

    detecting.value = true
    lastError.value = null

    try {
      console.log('[SocialMediaDetector] Starting social media UI detection...')

      // Extract text from engagement regions
      const textRegions = await extractEngagementRegions(canvas)
      const allText = textRegions.fullText.toLowerCase()
      
      const detection: SocialMediaDetection = {
        hasShareButton: false,
        hasCommentButton: false,
        hasLikeButton: false,
        hasEngagementNumbers: false,
        detectedElements: [],
        confidence: 0
      }

      // Enhanced patterns for social media elements
      const sharePatterns = [
        /share/i,
        /send/i,
        /forward/i,
        /retweet/i,
        /repost/i
      ]

      const commentPatterns = [
        /comment/i,
        /reply/i,
        /chat/i,
        /discuss/i
      ]

      const likePatterns = [
        /like/i,
        /react/i,
        /love/i,
        /heart/i,
        /thumbs?up/i
      ]

      const engagementPatterns = [
        /(\d+(?:\.\d+)?[km]?\s*(?:comment|share|like|react|view|retweet)s?)/i,
        /(\d+(?:\.\d+)?k\+)/i,
        /(\d+(?:\.\d+)?\+\s*(?:comment|share|like))/i,
        /(\d+(?:\.\d+)?m)/i
      ]

      // Check all text regions for patterns
      const allRegionText = [
        textRegions.topRight,
        textRegions.bottomRight, 
        textRegions.bottomLeft,
        textRegions.fullText
      ].filter(Boolean).join(' ').toLowerCase()

      // Detect share elements
      if (sharePatterns.some(pattern => pattern.test(allRegionText))) {
        detection.hasShareButton = true
        detection.detectedElements.push('share-button')
      }

      // Detect comment elements
      if (commentPatterns.some(pattern => pattern.test(allRegionText))) {
        detection.hasCommentButton = true
        detection.detectedElements.push('comment-button')
      }

      // Detect like elements  
      if (likePatterns.some(pattern => pattern.test(allRegionText))) {
        detection.hasLikeButton = true
        detection.detectedElements.push('like-button')
      }

      // Detect engagement numbers
      if (engagementPatterns.some(pattern => pattern.test(allRegionText))) {
        detection.hasEngagementNumbers = true
        detection.detectedElements.push('engagement-numbers')
        
        // Extract the engagement text for further processing
        const engagementMatch = allRegionText.match(/(\d+(?:\.\d+)?[km]?\s*(?:comment|share|like|react|view|retweet)s?)/i)
        if (engagementMatch) {
          detection.engagementText = engagementMatch[0]
        }
      }

      // Calculate confidence based on number of elements detected
      const elementCount = detection.detectedElements.length
      if (elementCount >= 3) {
        detection.confidence = 0.9
      } else if (elementCount >= 2) {
        detection.confidence = 0.7
      } else if (elementCount >= 1) {
        detection.confidence = 0.5
      }

      console.log('[SocialMediaDetector] Detection result:', detection)
      lastResult.value = detection

      return detection

    } catch (error: any) {
      console.error('[SocialMediaDetector] Detection failed:', error)
      lastError.value = error?.message || 'Social media detection failed'
      return {
        hasShareButton: false,
        hasCommentButton: false,
        hasLikeButton: false,
        hasEngagementNumbers: false,
        detectedElements: [],
        confidence: 0
      }
    } finally {
      detecting.value = false
    }
  }

  /**
   * Enhanced engagement extraction that combines OCR and pattern recognition
   */
  async function extractEnhancedEngagement(canvas: HTMLCanvasElement): Promise<{
    likes?: number
    shares?: number
    comments?: number
    detectedElements: string[]
    confidence: number
  }> {
    const detection = await detectSocialMediaElements(canvas)
    
    // Extract engagement numbers from text
    const engagement = {
      likes: 0,
      shares: 0,
      comments: 0,
      detectedElements: detection.detectedElements,
      confidence: detection.confidence
    }

    if (detection.engagementText) {
      const text = detection.engagementText.toLowerCase()
      
      // Extract numbers using enhanced patterns
      const patterns = [
        { regex: /(\d+(?:\.\d+)?k)\s*(?:comment|comments)/i, type: 'comments' },
        { regex: /(\d+(?:\.\d+)?k)\s*(?:share|shares)/i, type: 'shares' },
        { regex: /(\d+(?:\.\d+)?k)\s*(?:like|likes)/i, type: 'likes' },
        { regex: /(\d+(?:\.\d+)?k)\+\s*(?:comment|share|like)/i, type: 'all', multiplier: 1.2 },
        { regex: /(\d+(?:\.\d+)?m)\s*(?:comment|share|like)/i, type: 'all', multiplier: 1000000 },
        { regex: /(\d+\.\d+)k\s*(?:comment|share|like)/i, type: 'all' },
        { regex: /(\d+)k\s*(?:comment|share|like)/i, type: 'all' }
      ]

      for (const pattern of patterns) {
        const match = text.match(pattern.regex)
        if (match && match[1]) {
          let value = parseFloat(match[1])
          
          // Handle K/M multipliers
          if (match[0].toLowerCase().includes('k')) {
            value = value * 1000
          } else if (match[0].toLowerCase().includes('m')) {
            value = value * 1000000
          }
          
          // Apply multiplier for "+" indicators
          if (pattern.multiplier) {
            value = value * pattern.multiplier
          }
          
          value = Math.round(value)
          
          if (pattern.type === 'comments') {
            engagement.comments = value
          } else if (pattern.type === 'shares') {
            engagement.shares = value
          } else if (pattern.type === 'likes') {
            engagement.likes = value
          } else if (pattern.type === 'all') {
            // For patterns that could match any type, check the context
            const context = match[0].toLowerCase()
            if (context.includes('comment')) {
              engagement.comments = value
            } else if (context.includes('share')) {
              engagement.shares = value
            } else if (context.includes('like')) {
              engagement.likes = value
            }
          }
          
          break // Use first match found
        }
      }
    }

    console.log('[SocialMediaDetector] Enhanced engagement extraction:', engagement)
    return engagement
  }

  return {
    detecting,
    lastResult,
    lastError,
    detectSocialMediaElements,
    extractEnhancedEngagement,
    extractEngagementRegions
  }
}
