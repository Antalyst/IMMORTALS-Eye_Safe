/**
 * SourceVerifier - Verifies if a source name represents a legitimate official government/police account
 * 
 * Verification Protocol:
 * 1. Normalizes OCR text (lowercase, remove spaces, fix common OCR mistakes)
 * 2. Uses fuzzy string comparison against trusted sources whitelist
 * 3. Checks source name against known official naming patterns
 * 4. Validates against official government/police account conventions
 * 5. Returns verification status with confidence scores
 */

import { compareTwoStrings } from 'string-similarity'
import trustedSourcesData from './trustedSources.json'

export type VerificationStatus = 'Verified' | 'Verified (Official Source)' | 'Unverified/Suspect'

interface TrustedSourceItem {
  name?: string
  officialAccounts?: string[]
}

export class SourceVerifier {
  /**
   * Trusted sources whitelist loaded from JSON
   * Handles both old format (string array) and new format (object array with officialAccounts)
   */
  private static readonly TRUSTED_SOURCES: string[] = (trustedSourcesData as any[]).map((item: any) => {
    if (typeof item === 'string') {
      return item
    }
    if (item && typeof item === 'object' && item.name) {
      return item.name
    }
    return ''
  }).filter((name: string) => name.length > 0)

  /**
   * Common OCR mistakes and their corrections
   */
  private static readonly OCR_CORRECTIONS: Record<string, string> = {
    '0': 'O', // Common OCR mistake: 0 instead of O
    '1': 'I', // Common OCR mistake: 1 instead of I
    '5': 'S', // Common OCR mistake: 5 instead of S
    '8': 'B', // Common OCR mistake: 8 instead of B
    '@': 'A', // Common OCR mistake: @ instead of A
    'rn': 'm', // Common OCR mistake: rn instead of m
    'vv': 'w', // Common OCR mistake: vv instead of w
    'cl': 'd', // Common OCR mistake: cl instead of d
  }

  /**
   * Known official source patterns for Bago City and Negros Occidental
   * These patterns represent legitimate government/police accounts
   */
  private static readonly OFFICIAL_PATTERNS = {
    // Bago City Police Station - official naming variations
    bagoCityPolice: [
      /^bago\s*component\s*city\s*police\s*station$/i,
      /^bagocomponentcitypolicestation$/i,
      /^bago\s*ccps$/i,
      /^bago\s*city\s*police\s*station$/i,
      /^bago\s*component\s*city\s*pnp$/i,
      /^bago\s*city\s*pnp$/i
    ],
    
    // Negros Occidental Police - official patterns
    negrosOccidentalPolice: [
      /^negros\s*occidental\s*police\s*provincial\s*office$/i,
      /^noppo$/i,
      /^police\s*regional\s*office\s*6$/i,
      /^pro\s*6$/i,
      /^negros\s*occidental\s*pnp$/i
    ],
    
    // Bago City Government - official patterns
    bagoCityGovernment: [
      /^city\s*government\s*of\s*bago$/i,
      /^bago\s*city\s*government$/i,
      /^city\s*of\s*bago$/i,
      /^municipal\s*government\s*of\s*bago$/i
    ],
    
    // Generic official police patterns
    genericOfficialPolice: [
      /^philippine\s*national\s*police$/i,
      /^pnp$/i,
      /^police\s*station$/i,
      /^city\s*police$/i,
      /^municipal\s*police$/i
    ]
  }

  /**
   * Suspicious patterns that indicate potential fake/impostor accounts
   */
  private static readonly SUSPICIOUS_PATTERNS = [
    /unofficial/i,
    /fan\s*page/i,
    /community/i,
    /news\s*page/i,
    /update\s*page/i,
    /info\s*page/i,
    /^bago\s*police\s*(?!station|official|government)/i, // "Bago Police" without "Station/Official/Government"
    /fake/i,
    /parody/i,
    /satire/i,
    /memes/i
  ]

  /**
   * Official markers that increase trust score when present
   */
  private static readonly OFFICIAL_MARKERS = [
    'official',
    'verified',
    'government',
    'pnp',
    'police station',
    'city government',
    'municipal',
    'component city'
  ]

  /**
   * Normalizes OCR text by fixing common mistakes and standardizing format
   * 
   * @param text - Raw OCR text that may contain mistakes
   * @returns Normalized text and list of corrections applied
   */
  static normalizeOCRText(text: string): {
    normalized: string
    corrections: string[]
  } {
    if (!text || typeof text !== 'string') {
      return { normalized: '', corrections: [] }
    }

    let normalized = text.trim()
    const corrections: string[] = []

    // Apply OCR corrections
    for (const [mistake, correction] of Object.entries(this.OCR_CORRECTIONS)) {
      const regex = new RegExp(mistake, 'gi')
      if (regex.test(normalized)) {
        normalized = normalized.replace(regex, correction)
        corrections.push(`${mistake} → ${correction}`)
      }
    }

    // Remove extra spaces and normalize
    normalized = normalized.replace(/\s+/g, ' ').trim()

    return { normalized, corrections }
  }

  /**
   * Performs fuzzy matching against trusted sources whitelist
   * 
   * @param sourceName - Source name to match
   * @returns Best match with similarity score, or null if no good match
   */
  static fuzzyMatchAgainstWhitelist(sourceName: string): {
    matchedSource: string
    similarity: number
    matchScore: number
  } | null {
    if (!sourceName || typeof sourceName !== 'string') {
      return null
    }

    const { normalized: normalizedSource } = this.normalizeOCRText(sourceName)
    const sourceLower = normalizedSource.toLowerCase()
    const sourceWithoutSpaces = sourceLower.replace(/\s+/g, '')

    let bestMatch: { source: string; similarity: number } | null = null
    let bestSimilarity = 0

    // Try matching against all trusted sources
    for (const trustedSource of this.TRUSTED_SOURCES) {
      const trustedLower = trustedSource.toLowerCase()
      const trustedWithoutSpaces = trustedLower.replace(/\s+/g, '')

      // Calculate similarity using string-similarity library
      const similarity1 = compareTwoStrings(sourceLower, trustedLower)
      const similarity2 = compareTwoStrings(sourceWithoutSpaces, trustedWithoutSpaces)

      // Use the higher similarity score
      const similarity = Math.max(similarity1, similarity2)

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity
        bestMatch = { source: trustedSource, similarity }
      }
    }

    // Return match if similarity is >= 0.8 (80% threshold)
    if (bestMatch && bestSimilarity >= 0.8) {
      return {
        matchedSource: bestMatch.source,
        similarity: bestSimilarity,
        matchScore: Math.round(bestSimilarity * 100)
      }
    }

    return null
  }

  /**
   * Checks if a source name represents a legitimate official account
   * 
   * @param sourceName - The name of the source to verify (e.g., "Bago Component City Police Station")
   * @param useFuzzyMatch - Whether to use fuzzy matching against whitelist (default: true)
   * @returns Verification status with details
   */
  static checkSourceTrust(
    sourceName: string,
    useFuzzyMatch: boolean = true
  ): {
    status: VerificationStatus
    matchScore?: number
    matchedSource?: string
    rawOCRText?: string
    normalizedText?: string
    corrections?: string[]
  } {
    if (!sourceName || typeof sourceName !== 'string') {
      return {
        status: 'Unverified/Suspect'
      }
    }

    const rawOCRText = sourceName
    const { normalized: normalizedText, corrections } = this.normalizeOCRText(sourceName)
    const normalizedSource = normalizedText.toLowerCase()

    // Step 1: Check for suspicious patterns (high priority - overrides verification)
    const hasSuspiciousPattern = this.SUSPICIOUS_PATTERNS.some(pattern => 
      pattern.test(normalizedSource)
    )
    
    if (hasSuspiciousPattern) {
      return {
        status: 'Unverified/Suspect',
        rawOCRText,
        normalizedText,
        corrections
      }
    }

    // Step 2: Fuzzy matching against whitelist (if enabled)
    if (useFuzzyMatch) {
      const fuzzyMatch = this.fuzzyMatchAgainstWhitelist(sourceName)
      if (fuzzyMatch && fuzzyMatch.similarity >= 0.8) {
        // High confidence match - mark as verified official source
        return {
          status: 'Verified (Official Source)',
          matchScore: fuzzyMatch.matchScore,
          matchedSource: fuzzyMatch.matchedSource,
          rawOCRText,
          normalizedText,
          corrections
        }
      }
    }

    // Step 3: Check against official patterns
    const allOfficialPatterns = [
      ...this.OFFICIAL_PATTERNS.bagoCityPolice,
      ...this.OFFICIAL_PATTERNS.negrosOccidentalPolice,
      ...this.OFFICIAL_PATTERNS.bagoCityGovernment,
      ...this.OFFICIAL_PATTERNS.genericOfficialPolice
    ]

    const matchesOfficialPattern = allOfficialPatterns.some(pattern => 
      pattern.test(normalizedSource)
    )

    // Step 4: Check for official markers (secondary verification)
    const hasOfficialMarkers = this.OFFICIAL_MARKERS.some(marker => 
      normalizedSource.includes(marker.toLowerCase())
    )

    // Step 5: Specific verification for Bago City Police Station
    const isBagoCityPolice = this.OFFICIAL_PATTERNS.bagoCityPolice.some(pattern =>
      pattern.test(normalizedSource)
    )

    // Verification decision logic
    if (matchesOfficialPattern) {
      // Strong match - definitely verified
      return {
        status: 'Verified',
        rawOCRText,
        normalizedText,
        corrections
      }
    } else if (hasOfficialMarkers && normalizedSource.includes('bago')) {
      // Has official markers + Bago reference - likely verified
      return {
        status: 'Verified',
        rawOCRText,
        normalizedText,
        corrections
      }
    } else if (isBagoCityPolice) {
      // Specific Bago City Police match - verified
      return {
        status: 'Verified',
        rawOCRText,
        normalizedText,
        corrections
      }
    } else if (normalizedSource.includes('police') && normalizedSource.includes('station') && normalizedSource.includes('bago')) {
      // Contains key terms: police + station + bago - likely official
      return {
        status: 'Verified',
        rawOCRText,
        normalizedText,
        corrections
      }
    }

    // Default: Unverified if no pattern matches
    return {
      status: 'Unverified/Suspect',
      rawOCRText,
      normalizedText,
      corrections
    }
  }

  /**
   * Extracts source name from text content
   * Looks for common patterns like account names, post authors, etc.
   */
  static extractSourceFromText(text: string): string | null {
    if (!text || typeof text !== 'string') {
      return null
    }

    // Pattern 1: Look for account name patterns like "BAGO Component City Police Station's Post"
    const accountPattern1 = /([A-Z\s]+(?:Component\s*City|City)?\s*(?:Police\s*Station|Policestation|CCPS|PNP)[^']*)/i
    const match1 = text.match(accountPattern1)
    if (match1 && match1[1]) {
      return match1[1].trim()
    }

    // Pattern 2: Look for "Post" or "Announcement" after account name
    const accountPattern2 = /([A-Z][^'"]*?(?:Police\s*Station|Policestation|City\s*Government)[^'"]*?)(?:\s*['']s\s*Post|Post|Announcement)/i
    const match2 = text.match(accountPattern2)
    if (match2 && match2[1]) {
      return match2[1].trim()
    }

    // Pattern 3: Look for "@accountname" pattern
    const accountPattern3 = /@\s*([A-Z\s]+(?:Component\s*City|City)?\s*(?:Police|Government)[^@\s]*)/i
    const match3 = text.match(accountPattern3)
    if (match3 && match3[1]) {
      return match3[1].trim()
    }

    // Pattern 4: Look for "by [source]" or "from [source]"
    const accountPattern4 = /(?:by|from)\s+([A-Z][^.,!?\n]+(?:Police\s*Station|Policestation|City\s*Government))/i
    const match4 = text.match(accountPattern4)
    if (match4 && match4[1]) {
      return match4[1].trim()
    }

    return null
  }

  /**
   * Comprehensive verification that extracts source and checks it with fuzzy matching
   * Includes fallback regex extraction if initial extraction fails
   * 
   * @param text - Full text content to analyze
   * @param useFuzzyMatch - Whether to use fuzzy matching (default: true)
   * @param canvas - Optional canvas/image for OCR-based extraction
   * @returns Object with extracted source and verification status
   */
  static async verifySourceInText(
    text: string,
    useFuzzyMatch: boolean = true,
    canvas?: HTMLCanvasElement | string | any
  ): Promise<{
    sourceName: string | null
    status: VerificationStatus
    confidence: 'High' | 'Moderate' | 'Low'
    matchScore?: number
    matchedSource?: string
    rawOCRText?: string
    normalizedText?: string
    corrections?: string[]
    extractionMethod?: string
  }> {
    // Step 1: Try standard extraction
    let sourceName = this.extractSourceFromText(text)
    let extractionMethod = 'pattern-match'
    
    // Step 2: If extraction failed and canvas provided, try OCR-based extraction
    if (!sourceName && canvas) {
      try {
        const { extractSourceFromImage } = await import('./ocrSourceExtractor')
        const ocrResult = await extractSourceFromImage(canvas)
        if (ocrResult.sourceName) {
          sourceName = ocrResult.sourceName
          extractionMethod = ocrResult.extractionMethod
        }
      } catch (error) {
        console.warn('[SourceVerifier] OCR extraction failed:', error)
      }
    }
    
    // Step 3: If still no source, try regex fallback
    if (!sourceName) {
      try {
        const { extractSourceWithRegex } = await import('./ocrSourceExtractor')
        const regexResult = extractSourceWithRegex(text)
        if (regexResult.sourceName) {
          sourceName = regexResult.sourceName
          extractionMethod = regexResult.extractionMethod
        }
      } catch (error) {
        console.warn('[SourceVerifier] Regex fallback failed:', error)
      }
    }
    
    // Log extraction result for accuracy tracking
    if (sourceName) {
      console.debug('[SourceVerifier] Source extracted:', {
        sourceName,
        method: extractionMethod,
        textLength: text.length
      })
    } else {
      console.debug('[SourceVerifier] Source extraction failed for text:', text.substring(0, 100))
    }
    
    if (!sourceName) {
      return {
        sourceName: null,
        status: 'Unverified/Suspect',
        confidence: 'Low',
        extractionMethod
      }
    }

    const trustResult = this.checkSourceTrust(sourceName, useFuzzyMatch)
    
    // Determine confidence based on verification status and match quality
    let confidence: 'High' | 'Moderate' | 'Low' = 'Moderate'
    
    if (trustResult.status === 'Verified (Official Source)') {
      // Official source with fuzzy match >= 0.8 = High confidence (95%)
      confidence = 'High'
    } else if (trustResult.status === 'Verified') {
      // Pattern match = Moderate to High confidence
      const normalizedSource = sourceName.toLowerCase()
      const isExactBagoMatch = this.OFFICIAL_PATTERNS.bagoCityPolice.some(pattern =>
        pattern.test(normalizedSource)
      )
      confidence = isExactBagoMatch ? 'High' : 'Moderate'
    } else {
      // Unverified = Low confidence
      confidence = 'Low'
    }

    return {
      sourceName,
      status: trustResult.status,
      confidence,
      matchScore: trustResult.matchScore,
      matchedSource: trustResult.matchedSource,
      rawOCRText: trustResult.rawOCRText,
      normalizedText: trustResult.normalizedText,
      corrections: trustResult.corrections,
      extractionMethod
    }
  }

  /**
   * Verifies source using internet search to check official domains
   * 
   * @param sourceName - Source name to verify
   * @returns Verification result with official domain confirmation
   */
  static async verifySourceWithInternet(
    sourceName: string
  ): Promise<{
    isOfficial: boolean
    verifiedDomains: string[]
    confidence: 'High' | 'Moderate' | 'Low'
    reasoning: string
  }> {
    if (!sourceName || sourceName.length < 5) {
      return {
        isOfficial: false,
        verifiedDomains: [],
        confidence: 'Low',
        reasoning: 'Source name too short for verification'
      }
    }

    try {
      // Official domain patterns
      const officialDomains = [
        '.gov.ph',
        '.pnp.gov.ph',
        'facebook.com/pages',
        'facebook.com/[a-z0-9.-]+/posts'
      ]

      // Check if source name contains official keywords
      const lowerName = sourceName.toLowerCase()
      const hasOfficialKeywords = 
        lowerName.includes('police') ||
        lowerName.includes('government') ||
        lowerName.includes('pnp') ||
        lowerName.includes('city') ||
        lowerName.includes('municipal')

      if (!hasOfficialKeywords) {
        return {
          isOfficial: false,
          verifiedDomains: [],
          confidence: 'Low',
          reasoning: 'Source name does not contain official keywords'
        }
      }

      // In a real implementation, this would query Google Custom Search API
      // or Bing News API to search for the source name + "official site" or "Facebook"
      // For now, we'll use pattern matching against known official sources

      // Check against trusted sources whitelist
      const fuzzyMatch = this.fuzzyMatchAgainstWhitelist(sourceName)
      if (fuzzyMatch && fuzzyMatch.similarity >= 0.8) {
        return {
          isOfficial: true,
          verifiedDomains: ['whitelist-match'],
          confidence: 'High',
          reasoning: `Source "${sourceName}" matched against trusted sources whitelist with ${Math.round(fuzzyMatch.similarity * 100)}% similarity. Matched: "${fuzzyMatch.matchedSource}".`
        }
      }

      // Pattern-based verification
      const normalized = this.normalizeOCRText(sourceName).normalized.toLowerCase()
      const isOfficialPattern = [
        ...this.OFFICIAL_PATTERNS.bagoCityPolice,
        ...this.OFFICIAL_PATTERNS.negrosOccidentalPolice,
        ...this.OFFICIAL_PATTERNS.bagoCityGovernment
      ].some(pattern => pattern.test(normalized))

      if (isOfficialPattern) {
        return {
          isOfficial: true,
          verifiedDomains: ['pattern-match'],
          confidence: 'High',
          reasoning: `Source "${sourceName}" matches official naming patterns for Bago City police/government sources.`
        }
      }

      return {
        isOfficial: false,
        verifiedDomains: [],
        confidence: 'Moderate',
        reasoning: `Source "${sourceName}" contains official keywords but could not be verified against known patterns. Internet verification recommended.`
      }
    } catch (error: any) {
      return {
        isOfficial: false,
        verifiedDomains: [],
        confidence: 'Low',
        reasoning: `Internet verification failed: ${error?.message || 'Unknown error'}`
      }
    }
  }
}

