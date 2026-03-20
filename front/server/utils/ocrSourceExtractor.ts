/**
 * OCR Source Extractor - Enhanced OCR processing with bounding box detection
 * 
 * Extracts source names from images using:
 * 1. Enhanced OCR with bounding box detection focusing on top 15% of image
 * 2. Regex fallback parser if OCR fails
 * 3. Integration with SourceVerifier for verification
 */

import { SourceVerifier } from './sourceVerifier'
import { logLine } from './logger'

export interface OCRSourceExtractionResult {
  sourceName: string | null
  extractionMethod: 'ocr-bounding-box' | 'ocr-full' | 'regex-fallback'
  confidence: 'High' | 'Moderate' | 'Low'
  ocrText?: string
  boundingBoxText?: string
  rawText?: string
  error?: string
}

/**
 * Known entity patterns for source extraction fallback
 */
const KNOWN_ENTITY_PATTERNS = [
  // Police station patterns
  /(?:Bago.*?Police.*?Station|PNP.*?Bago|Bago.*?PNP)/i,
  /(?:Bago.*?Component.*?City.*?Police.*?Station|Bago.*?CCPS)/i,
  /(?:Negros.*?Occidental.*?Police.*?Provincial.*?Office|NOppo)/i,
  /(?:Police.*?Regional.*?Office.*?6|PRO.*?6)/i,
  /(?:Philippine.*?National.*?Police|PNP)/i,
  
  // Government patterns
  /(?:City.*?Government.*?of.*?Bago|Bago.*?City.*?Government)/i,
  /(?:Municipal.*?Government.*?of.*?Bago)/i,
  /(?:Office.*?of.*?the.*?Mayor.*?Bago.*?City)/i,
  
  // News patterns
  /(?:Sun.*?Star.*?Bacolod|Visayan.*?Daily.*?Star|Negros.*?Daily.*?Bulletin)/i,
]

/**
 * Keywords to identify relevant source fragments
 */
const SOURCE_KEYWORDS = ['Police', 'Station', 'City', 'Government', 'PNP', 'News', 'Office', 'Municipal', 'Component']

/**
 * Extracts source name from image canvas using enhanced OCR
 * 
 * @param canvas - HTML Canvas element or image data
 * @returns Extraction result with source name and method
 */
export async function extractSourceFromImage(
  canvas: HTMLCanvasElement | string | Buffer | any
): Promise<OCRSourceExtractionResult> {
  try {
    // If canvas is a string (base64), we need to convert it to canvas
    let canvasElement: HTMLCanvasElement | null = null
    
    if (typeof canvas === 'string') {
      // Try to create canvas from base64 image
      canvasElement = await createCanvasFromBase64(canvas)
    } else if (canvas instanceof HTMLCanvasElement) {
      canvasElement = canvas
    } else {
      return {
        sourceName: null,
        extractionMethod: 'regex-fallback',
        confidence: 'Low',
        error: 'Invalid canvas input type'
      }
    }

    if (!canvasElement) {
      return {
        sourceName: null,
        extractionMethod: 'regex-fallback',
        confidence: 'Low',
        error: 'Failed to create canvas element'
      }
    }

    // Step 1: Enhanced OCR with bounding box detection on top 15%
    const boundingBoxResult = await extractSourceWithBoundingBox(canvasElement)
    if (boundingBoxResult.sourceName) {
      await logLine('info', 'OCRSourceExtractor: Source extracted via bounding box', {
        sourceName: boundingBoxResult.sourceName,
        method: boundingBoxResult.extractionMethod
      })
      return boundingBoxResult
    }

    // Step 2: Fallback to full image OCR
    const fullOCRResult = await extractSourceWithFullOCR(canvasElement)
    if (fullOCRResult.sourceName) {
      await logLine('info', 'OCRSourceExtractor: Source extracted via full OCR', {
        sourceName: fullOCRResult.sourceName,
        method: fullOCRResult.extractionMethod
      })
      return fullOCRResult
    }

    // Step 3: Regex fallback on extracted text
    if (fullOCRResult.rawText) {
      const regexResult = extractSourceWithRegex(fullOCRResult.rawText)
      if (regexResult.sourceName) {
        await logLine('info', 'OCRSourceExtractor: Source extracted via regex fallback', {
          sourceName: regexResult.sourceName,
          rawText: fullOCRResult.rawText.substring(0, 200)
        })
        return regexResult
      }
    }

    return {
      sourceName: null,
      extractionMethod: 'regex-fallback',
      confidence: 'Low',
      error: 'All extraction methods failed',
      rawText: fullOCRResult.rawText
    }
  } catch (error: any) {
    await logLine('error', 'OCRSourceExtractor: Extraction failed', {
      error: error?.message
    })
    return {
      sourceName: null,
      extractionMethod: 'regex-fallback',
      confidence: 'Low',
      error: error?.message || 'Unknown error'
    }
  }
}

/**
 * Creates canvas from base64 image string
 */
async function createCanvasFromBase64(base64: string): Promise<HTMLCanvasElement | null> {
  if (typeof window === 'undefined') {
    // Server-side: would need a different approach (e.g., sharp, canvas npm package)
    return null
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        resolve(canvas)
      } else {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = base64
  })
}

/**
 * Extracts source using OCR on top 15% with bounding box detection
 */
async function extractSourceWithBoundingBox(
  canvas: HTMLCanvasElement
): Promise<OCRSourceExtractionResult> {
  try {
    // Focus on top 15% where page names usually appear
    const topCrop = document.createElement('canvas')
    const cropHeight = Math.max(50, Math.round(canvas.height * 0.15))
    topCrop.width = canvas.width
    topCrop.height = cropHeight
    
    const ctx = topCrop.getContext('2d')
    if (!ctx) {
      return {
        sourceName: null,
        extractionMethod: 'ocr-bounding-box',
        confidence: 'Low',
        error: 'Failed to get canvas context'
      }
    }
    
    ctx.drawImage(canvas, 0, 0, canvas.width, cropHeight, 0, 0, canvas.width, cropHeight)
    
    // Load Tesseract (assumes it's available in browser)
    const Tesseract = (window as any)?.Tesseract
    if (!Tesseract) {
      return {
        sourceName: null,
        extractionMethod: 'ocr-bounding-box',
        confidence: 'Low',
        error: 'Tesseract.js not available'
      }
    }

    // Use enhanced OCR options with interword spaces preserved
    const { data } = await Tesseract.recognize(topCrop, 'eng', {
      logger: () => {},
      preserve_interword_spaces: true
    })

    const extractedText = String(data?.text || '').trim()
    
    // Analyze words/boxes for source keywords
    const words = data?.words || []
    const fragments: string[] = []
    
    // Collect text fragments containing source keywords
    for (const word of words) {
      const wordText = String(word?.text || '').trim()
      const lowerWord = wordText.toLowerCase()
      
      // Check if word contains source keywords
      const hasKeyword = SOURCE_KEYWORDS.some(kw => 
        lowerWord.includes(kw.toLowerCase()) || wordText.includes(kw)
      )
      
      if (hasKeyword && wordText.length > 2) {
        fragments.push(wordText)
      }
    }

    // Try to extract source name from fragments
    let sourceName: string | null = null
    
    // Method 1: Try combining fragments that are close together
    if (fragments.length > 0) {
      // Find consecutive fragments
      let combined = fragments.slice(0, 5).join(' ') // Take first 5 relevant fragments
      sourceName = combined.trim()
    }
    
    // Method 2: Use SourceVerifier to extract from full text
    if (!sourceName || sourceName.length < 5) {
      const sourceVerification = SourceVerifier.extractSourceFromText(extractedText)
      if (sourceVerification) {
        sourceName = sourceVerification
      }
    }
    
    // Method 3: Regex fallback on extracted text
    if (!sourceName || sourceName.length < 5) {
      sourceName = extractSourceWithRegex(extractedText).sourceName
    }

    if (sourceName && sourceName.length >= 5) {
      return {
        sourceName,
        extractionMethod: 'ocr-bounding-box',
        confidence: 'High',
        boundingBoxText: extractedText,
        ocrText: extractedText
      }
    }

    return {
      sourceName: null,
      extractionMethod: 'ocr-bounding-box',
      confidence: 'Low',
      boundingBoxText: extractedText,
      error: 'No source name found in bounding box region'
    }
  } catch (error: any) {
    return {
      sourceName: null,
      extractionMethod: 'ocr-bounding-box',
      confidence: 'Low',
      error: error?.message || 'Bounding box OCR failed'
    }
  }
}

/**
 * Extracts source using full image OCR
 */
async function extractSourceWithFullOCR(
  canvas: HTMLCanvasElement
): Promise<OCRSourceExtractionResult> {
  try {
    const Tesseract = (window as any)?.Tesseract
    if (!Tesseract) {
      return {
        sourceName: null,
        extractionMethod: 'ocr-full',
        confidence: 'Low',
        error: 'Tesseract.js not available'
      }
    }

    const { data } = await Tesseract.recognize(canvas, 'eng', {
      logger: () => {},
      preserve_interword_spaces: true
    })

    const extractedText = String(data?.text || '').trim()
    
    // Use SourceVerifier to extract source
    const sourceName = SourceVerifier.extractSourceFromText(extractedText)

    if (sourceName) {
      return {
        sourceName,
        extractionMethod: 'ocr-full',
        confidence: 'Moderate',
        ocrText: extractedText,
        rawText: extractedText
      }
    }

    return {
      sourceName: null,
      extractionMethod: 'ocr-full',
      confidence: 'Low',
      rawText: extractedText,
      error: 'No source name found in full OCR'
    }
  } catch (error: any) {
    return {
      sourceName: null,
      extractionMethod: 'ocr-full',
      confidence: 'Low',
      error: error?.message || 'Full OCR failed'
    }
  }
}

/**
 * Extracts source using regex patterns on raw text
 */
export function extractSourceWithRegex(text: string): OCRSourceExtractionResult {
  if (!text || typeof text !== 'string') {
    return {
      sourceName: null,
      extractionMethod: 'regex-fallback',
      confidence: 'Low',
      error: 'No text provided'
    }
  }

  // Try each known entity pattern
  for (const pattern of KNOWN_ENTITY_PATTERNS) {
    const match = text.match(pattern)
    if (match && match[0]) {
      const matchedText = match[0].trim()
      if (matchedText.length >= 5) {
        return {
          sourceName: matchedText,
          extractionMethod: 'regex-fallback',
          confidence: 'Moderate',
          rawText: text
        }
      }
    }
  }

  // Fallback: Try SourceVerifier extraction
  const sourceName = SourceVerifier.extractSourceFromText(text)
  if (sourceName) {
    return {
      sourceName,
      extractionMethod: 'regex-fallback',
      confidence: 'Moderate',
      rawText: text
    }
  }

  return {
    sourceName: null,
    extractionMethod: 'regex-fallback',
    confidence: 'Low',
    rawText: text,
    error: 'No matching entity pattern found'
  }
}

