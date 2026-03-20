/**
 * Crime Verifier - Real-time crime verification system for Bago City
 * 
 * Performs automatic internet searches and cross-references with official sources
 * to verify crime-related content detected from user screens.
 */

import { logLine } from './logger'
import { SourceVerifier } from './sourceVerifier'

export type CredibilityLevel = 'High' | 'Medium' | 'Low'
export type CrimeType = 'murder' | 'theft' | 'assault' | 'drug' | 'traffic' | 'vandalism' | 'robbery' | 'other'

export interface CrimeReport {
  text: string
  location?: string
  crimeType?: CrimeType
  timestamp?: Date
  sourceName?: string
  extractedDetails?: {
    location?: string
    crimeType?: CrimeType
    time?: string
    suspect?: string
    victim?: string
  }
}

export interface VerificationResult {
  verified: boolean
  credibility: CredibilityLevel
  confidence: number
  sources: Array<{
    title: string
    url: string
    type: 'official' | 'news' | 'social' | 'government'
    credibility: CredibilityLevel
    matchScore: number
  }>
  officialSourcesFound: number
  newsSourcesFound: number
  reasoning: string
  isOfficialSource: boolean
  officialSourceDetails?: {
    name: string
    verified: boolean
    confidence: 'High' | 'Moderate' | 'Low'
    matchScore?: number
    matchedSource?: string
    rawOCRText?: string
    normalizedText?: string
    corrections?: string[]
  }
}

/**
 * Official sources for Bago City crime verification
 */
const OFFICIAL_SOURCES = {
  police: [
    'Bago Component City Police Station',
    'Bago City PNP',
    'Negros Occidental Police Provincial Office',
    'PNP Region 6',
    'Philippine National Police'
  ],
  government: [
    'City Government of Bago',
    'Bago City LGU',
    'Office of the Mayor Bago City'
  ],
  news: [
    'Sun Star Bacolod',
    'Visayan Daily Star',
    'Negros Daily Bulletin',
    'Panay News',
    'Daily Guardian'
  ]
}

/**
 * Search query generators for different platforms
 */
export class CrimeVerifier {
  /**
   * Generates search queries for verifying crime reports
   */
  static generateSearchQueries(report: CrimeReport): string[] {
    const queries: string[] = []
    const location = report.location || report.extractedDetails?.location || 'Bago City'
    const crimeType = report.crimeType || report.extractedDetails?.crimeType || 'crime'
    
    // Query 1: Location + Crime Type
    queries.push(`${location} ${crimeType} ${new Date().getFullYear()}`)
    
    // Query 2: With "PNP" or "police" for official sources
    queries.push(`Bago City PNP ${crimeType}`)
    
    // Query 3: With date context (today, yesterday, recent)
    queries.push(`${location} ${crimeType} today`)
    
    // Query 4: Official police report format
    if (report.sourceName) {
      queries.push(`${report.sourceName} ${crimeType}`)
    }
    
    return queries
  }

  /**
   * Verifies a crime report by searching online sources
   */
  static async verifyCrimeReport(report: CrimeReport): Promise<VerificationResult> {
    try {
      await logLine('info', 'CrimeVerifier: Starting verification', {
        crimeType: report.crimeType,
        hasLocation: !!report.location
      })

      // Step 1: Check if source itself is official (with fuzzy matching)
      const sourceVerification = report.sourceName 
        ? SourceVerifier.verifySourceInText(`${report.sourceName} ${report.text}`, true)
        : SourceVerifier.verifySourceInText(report.text, true)

      // Check if verified as official source (fuzzy match or pattern match)
      const isOfficialSource = sourceVerification.status === 'Verified' || 
                               sourceVerification.status === 'Verified (Official Source)'
      let officialSourceDetails = undefined
      
      if (isOfficialSource && sourceVerification.sourceName) {
        officialSourceDetails = {
          name: sourceVerification.sourceName,
          verified: true,
          confidence: sourceVerification.confidence,
          matchScore: sourceVerification.matchScore,
          matchedSource: sourceVerification.matchedSource,
          rawOCRText: sourceVerification.rawOCRText,
          normalizedText: sourceVerification.normalizedText,
          corrections: sourceVerification.corrections
        }
        
        // Log official source verification with OCR corrections for audit
        await logLine('info', 'CrimeVerifier: Official Source Detected', {
          sourceName: sourceVerification.sourceName,
          status: sourceVerification.status,
          confidence: sourceVerification.confidence,
          matchScore: sourceVerification.matchScore,
          matchedSource: sourceVerification.matchedSource,
          rawOCRText: sourceVerification.rawOCRText,
          normalizedText: sourceVerification.normalizedText,
          corrections: sourceVerification.corrections
        })
      }

      // Step 2: Extract crime details from text
      const extractedDetails = this.extractCrimeDetails(report.text)
      const crimeReport: CrimeReport = {
        ...report,
        extractedDetails: {
          ...extractedDetails,
          ...report.extractedDetails
        }
      }

      // Step 3: Generate search queries
      const searchQueries = this.generateSearchQueries(crimeReport)

      // Step 4: Perform internet searches
      const searchResults = await Promise.all(
        searchQueries.map(query => this.searchForCrimeReports(query))
      )

      // Step 5: Aggregate and score sources
      const aggregatedSources = this.aggregateSources(searchResults)
      const { verified, credibility, confidence, reasoning } = this.analyzeSources(
        aggregatedSources,
        isOfficialSource,
        sourceVerification
      )

      // Override verification if official source detected (regardless of AI prediction)
      let finalVerified = verified
      let finalConfidence = confidence
      let finalReasoning = reasoning
      
      if (sourceVerification.status === 'Verified (Official Source)') {
        // Official source detected - override AI and set to TRUE
        finalVerified = true
        finalConfidence = 0.95
        finalReasoning = `✅ VERIFIED (OFFICIAL SOURCE): Source "${sourceVerification.sourceName}" matched against trusted sources whitelist with ${sourceVerification.matchScore}% similarity. AI prediction overridden - official police/government sources are always trusted. ${reasoning}`
      }

      const result: VerificationResult = {
        verified: finalVerified,
        credibility,
        confidence: finalConfidence,
        sources: aggregatedSources,
        officialSourcesFound: aggregatedSources.filter(s => s.type === 'official' || s.type === 'government').length,
        newsSourcesFound: aggregatedSources.filter(s => s.type === 'news').length,
        reasoning: finalReasoning,
        isOfficialSource,
        officialSourceDetails
      }

      await logLine('info', 'CrimeVerifier: Verification complete', {
        verified: result.verified,
        credibility: result.credibility,
        sourcesFound: result.sources.length
      })

      return result

    } catch (error: any) {
      await logLine('error', 'CrimeVerifier: Verification failed', {
        message: error?.message
      })

      return {
        verified: false,
        credibility: 'Low',
        confidence: 0.1,
        sources: [],
        officialSourcesFound: 0,
        newsSourcesFound: 0,
        reasoning: `Verification failed: ${error?.message || 'Unknown error'}. Content could not be verified - treat as unverified.`,
        isOfficialSource: false
      }
    }
  }

  /**
   * Extracts crime details from text
   */
  static extractCrimeDetails(text: string): CrimeReport['extractedDetails'] {
    const lowerText = text.toLowerCase()
    
    // Extract location
    const locationPatterns = [
      /(?:in|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:\s+City|Street|Barangay|Barrio)?/g,
      /Bago\s+City/gi,
      /Barangay\s+([A-Z][a-z]+)/g
    ]
    
    let location: string | undefined
    for (const pattern of locationPatterns) {
      const match = text.match(pattern)
      if (match && match[0]) {
        location = match[0].trim()
        break
      }
    }

    // Extract crime type
    const crimeKeywords: Record<CrimeType, RegExp[]> = {
      murder: [/murder/i, /homicide/i, /kill/i, /killed/i, /death/i],
      theft: [/theft/i, /steal/i, /stolen/i, /robbery/i],
      assault: [/assault/i, /attack/i, /battery/i],
      drug: [/drug/i, /shabu/i, /marijuana/i, /ra 9165/i, /buy.*bust/i],
      traffic: [/accident/i, /collision/i, /traffic/i, /vehicular/i],
      vandalism: [/vandalism/i, /vandalize/i, /damage/i],
      robbery: [/robbery/i, /hold.*up/i, /snatch/i],
      other: [/crime/i, /incident/i, /violation/i]
    }

    let crimeType: CrimeType = 'other'
    for (const [type, patterns] of Object.entries(crimeKeywords)) {
      if (patterns.some(p => p.test(text))) {
        crimeType = type as CrimeType
        break
      }
    }

    // Extract time
    const timePatterns = [
      /(\d{1,2}):(\d{2})\s*(AM|PM)/i,
      /(today|yesterday|this\s+morning|this\s+afternoon|this\s+evening)/i,
      /(\d+)\s*(minutes?|hours?|days?)\s+ago/i
    ]
    
    let time: string | undefined
    for (const pattern of timePatterns) {
      const match = text.match(pattern)
      if (match) {
        time = match[0].trim()
        break
      }
    }

    return {
      location,
      crimeType,
      time
    }
  }

  /**
   * Searches for crime reports online
   */
  static async searchForCrimeReports(query: string): Promise<Array<{
    title: string
    url: string
    snippet?: string
  }>> {
    try {
      // Use Google Custom Search API or web scraping
      // For now, we'll create Google search URLs that can be opened
      // In production, use Google Custom Search API or similar service
      
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`
      
      // This is a placeholder - in production, you would:
      // 1. Use Google Custom Search API with API key
      // 2. Parse search results
      // 3. Check official websites directly
      // 4. Use news APIs (NewsAPI, etc.)
      
      // For now, return structured search URLs that indicate where to search
      return [{
        title: `Search: ${query}`,
        url: searchUrl,
        snippet: `Search results for: ${query}`
      }]
    } catch (error) {
      return []
    }
  }

  /**
   * Aggregates search results and identifies source types
   */
  static aggregateSources(searchResults: Array<Array<{
    title: string
    url: string
    snippet?: string
  }>>): VerificationResult['sources'] {
    const allSources: VerificationResult['sources'] = []
    const seenUrls = new Set<string>()

    for (const results of searchResults) {
      for (const result of results) {
        if (seenUrls.has(result.url)) continue
        seenUrls.add(result.url)

        // Determine source type and credibility
        const { type, credibility, matchScore } = this.classifySource(result)

        allSources.push({
          title: result.title,
          url: result.url,
          type,
          credibility,
          matchScore
        })
      }
    }

    // Sort by credibility and match score
    return allSources.sort((a, b) => {
      const credibilityOrder = { High: 3, Medium: 2, Low: 1 }
      const credibilityDiff = credibilityOrder[b.credibility] - credibilityOrder[a.credibility]
      if (credibilityDiff !== 0) return credibilityDiff
      return b.matchScore - a.matchScore
    })
  }

  /**
   * Classifies a source by type and credibility
   */
  static classifySource(source: {
    title: string
    url: string
    snippet?: string
  }): {
    type: 'official' | 'news' | 'social' | 'government'
    credibility: CredibilityLevel
    matchScore: number
  } {
    const titleLower = source.title.toLowerCase()
    const urlLower = source.url.toLowerCase()
    const text = `${titleLower} ${urlLower}`

    let type: 'official' | 'news' | 'social' | 'government' = 'social'
    let credibility: CredibilityLevel = 'Low'
    let matchScore = 0

    // Check for official police sources
    if (OFFICIAL_SOURCES.police.some(pat => text.includes(pat.toLowerCase()))) {
      type = 'official'
      credibility = 'High'
      matchScore = 100
    }
    // Check for government sources
    else if (OFFICIAL_SOURCES.government.some(pat => text.includes(pat.toLowerCase()))) {
      type = 'government'
      credibility = 'High'
      matchScore = 95
    }
    // Check for news sources
    else if (OFFICIAL_SOURCES.news.some(pat => text.includes(pat.toLowerCase()))) {
      type = 'news'
      credibility = 'Medium'
      matchScore = 70
    }
    // Check for police/gov domain patterns
    else if (/\.gov\.ph/i.test(urlLower) || /pnp\.gov/i.test(urlLower)) {
      type = 'government'
      credibility = 'High'
      matchScore = 90
    }
    // Check for news domain patterns
    else if (/sunstar|visayan|bulletin|guardian|inquirer|gmanetwork/i.test(urlLower)) {
      type = 'news'
      credibility = 'Medium'
      matchScore = 65
    }
    // Check for social media
    else if (/facebook|twitter|instagram|youtube/i.test(urlLower)) {
      type = 'social'
      credibility = 'Low'
      matchScore = 30
    }

    return { type, credibility, matchScore }
  }

  /**
   * Analyzes aggregated sources to determine verification status with fallback logic
   */
  static analyzeSources(
    sources: VerificationResult['sources'],
    isOfficialSource: boolean,
    sourceVerification: ReturnType<typeof SourceVerifier.verifySourceInText>
  ): {
    verified: boolean
    credibility: CredibilityLevel
    confidence: number
    reasoning: string
  } {
    // PRIORITY 1: If source itself is verified as official source (fuzzy match ≥0.8), override AI prediction
    if (sourceVerification.status === 'Verified (Official Source)') {
      const matchScore = sourceVerification.matchScore || 0.8
      const matchPercent = (matchScore / 100).toFixed(1)
      const corrections = sourceVerification.corrections?.length ? 
        ` OCR corrections applied: ${sourceVerification.corrections.join('; ')}.` : ''
      
      return {
        verified: true,
        credibility: 'High',
        confidence: 0.95, // High confidence for official sources
        reasoning: `✅ VERIFIED (OFFICIAL SOURCE - Fuzzy Match ${matchPercent}%): Source "${sourceVerification.sourceName}" matched against trusted sources whitelist with ${matchPercent}% similarity. Matched: "${sourceVerification.matchedSource}".${corrections} Raw OCR: "${sourceVerification.rawOCRText || sourceVerification.sourceName}". Normalized: "${sourceVerification.normalizedText || sourceVerification.sourceName}". Official police/government reports are authoritative and should be trusted - AI prediction overridden.`
      }
    }
    
    // PRIORITY 2: If source is verified via pattern matching, verify immediately
    if (isOfficialSource && sourceVerification.confidence === 'High') {
      return {
        verified: true,
        credibility: 'High',
        confidence: 0.95,
        reasoning: `✅ VERIFIED: Source "${sourceVerification.sourceName}" is a verified official account. Official police/government reports are authoritative and should be trusted.`
      }
    }

    const officialCount = sources.filter(s => s.type === 'official' || s.type === 'government').length
    const newsCount = sources.filter(s => s.type === 'news').length
    const highCredibilityCount = sources.filter(s => s.credibility === 'High').length

    // PRIORITY 3: Fallback logic - If fuzzy match < 0.8 but internet search confirms match → upgrade to "Verified"
    const fuzzyMatchBelowThreshold = sourceVerification.matchScore !== undefined && 
                                     sourceVerification.matchScore < 80 && 
                                     sourceVerification.matchScore >= 60
    
    if (fuzzyMatchBelowThreshold && (officialCount >= 1 || highCredibilityCount >= 2)) {
      // Internet search confirms match - upgrade to verified
      return {
        verified: true,
        credibility: 'High',
        confidence: Math.min(0.9, 0.7 + (sourceVerification.matchScore || 60) / 100 * 0.33),
        reasoning: `✅ VERIFIED (Upgraded via Internet Search): Source "${sourceVerification.sourceName}" had fuzzy match score ${sourceVerification.matchScore}% (below 80% threshold), but internet search found ${officialCount} official source(s) confirming this report. Verification upgraded to Verified. Fuzzy match details: Raw OCR: "${sourceVerification.rawOCRText || sourceVerification.sourceName}", Normalized: "${sourceVerification.normalizedText || sourceVerification.sourceName}".`
      }
    }

    // PRIORITY 4: Standard internet verification logic
    if (officialCount >= 1 || highCredibilityCount >= 2) {
      return {
        verified: true,
        credibility: 'High',
        confidence: Math.min(0.9, 0.7 + (officialCount * 0.1) + (highCredibilityCount * 0.05)),
        reasoning: `✅ VERIFIED: Found ${officialCount} official source(s) and ${newsCount} news source(s) confirming this report. Cross-referenced with legitimate sources.`
      }
    } else if (newsCount >= 2) {
      return {
        verified: true,
        credibility: 'Medium',
        confidence: 0.6,
        reasoning: `✅ LIKELY TRUE: Found ${newsCount} news source(s) reporting this. However, verify with official sources for highest confidence.`
      }
    } else if (newsCount === 1) {
      return {
        verified: false,
        credibility: 'Medium',
        confidence: 0.4,
        reasoning: `⚠️ UNVERIFIED: Only found ${newsCount} news source. This requires additional verification through official channels before sharing.`
      }
    } else {
      // PRIORITY 5: Final fallback - If both OCR and internet fail → mark "Unverified/Suspect"
      const fuzzyMatchAttempted = sourceVerification.matchScore !== undefined
      const internetConfirmed = officialCount > 0 || newsCount > 0
      
      if (!fuzzyMatchAttempted && !internetConfirmed) {
        return {
          verified: false,
          credibility: 'Low',
          confidence: 0.1,
          reasoning: `🚫 UNVERIFIED/SUSPECT: Both OCR fuzzy matching and internet search failed to verify this content. No official or reliable news sources found confirming this report. This content could be misinformation - DO NOT SHARE without official verification. Sharing unverified crime reports can cause panic and harm public safety.`
        }
      } else {
        return {
          verified: false,
          credibility: 'Low',
          confidence: 0.2,
          reasoning: `🚫 UNVERIFIED: No official or news sources found confirming this report. This content could be misinformation - DO NOT SHARE without official verification. Sharing unverified crime reports can cause panic and harm public safety.`
        }
      }
    }
  }

  /**
   * Prioritizes crime reports based on urgency and verification status
   */
  static prioritizeReport(
    report: CrimeReport,
    verification: VerificationResult
  ): {
    priority: 'Critical' | 'High' | 'Medium' | 'Low'
    shouldAlert: boolean
    riskLevel: 'High' | 'Moderate' | 'Low'
  } {
    const urgentCrimeTypes: CrimeType[] = ['murder', 'assault', 'drug']
    const isUrgent = report.crimeType && urgentCrimeTypes.includes(report.crimeType)
    const isVerified = verification.verified && verification.credibility === 'High'
    const isUnverified = !verification.verified && verification.credibility === 'Low'

    let priority: 'Critical' | 'High' | 'Medium' | 'Low' = 'Low'
    let shouldAlert = false
    let riskLevel: 'High' | 'Moderate' | 'Low' = 'Low'

    
    if ((isUrgent && isVerified) || (isUrgent && isUnverified)) {
      priority = 'Critical'
      shouldAlert = true
      riskLevel = isUnverified ? 'High' : 'Moderate'
    }
    
    else if (isVerified || (isUnverified && verification.credibility === 'Low')) {
      priority = 'High'
      shouldAlert = isUnverified
      riskLevel = isUnverified ? 'High' : 'Moderate'
    }
    
    else if (verification.credibility === 'Medium') {
      priority = 'Medium'
      shouldAlert = false
      riskLevel = 'Moderate'
    }
    // Low: Low priority
    else {
      priority = 'Low'
      shouldAlert = false
      riskLevel = 'Low'
    }

    return { priority, shouldAlert, riskLevel }
  }
}

