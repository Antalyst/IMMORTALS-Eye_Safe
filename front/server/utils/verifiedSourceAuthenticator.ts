/**
 * Verified Source Authenticity Layer
 * Checks if content originates from verified institutional sources before AI analysis
 * This prevents OCR-based misclassification and ensures trusted sources are correctly identified
 * 
 * IMPORTANT: Only auto-verifies if BOTH conditions are met:
 * 1. Source name matches a trusted source (fuzzy matching allowed)
 * 2. Post URL/account matches an official account from trustedSources.json
 */

import { SourceVerifier } from './sourceVerifier'
import type { VerificationStatus } from './sourceVerifier'
import trustedSourcesData from './trustedSources.json'

interface TrustedSource {
  name: string
  officialAccounts?: string[]
}

export interface VerifiedSourceResult {
  isVerified: boolean
  sourceName: string | null
  confidence: number // 0.9-1.0 for verified sources
  status: VerificationStatus
  reasoning: string
  matchedSource?: string
  matchScore?: number
  urlMatch?: boolean
  extractedUrl?: string
  rejectionReason?: string
}

/**
 * Extract URL from text content
 * Looks for Facebook URLs, web URLs, and account identifiers
 */
function extractUrlFromText(text: string): string | null {
  if (!text || typeof text !== 'string') return null

  // Pattern 1: Full Facebook URLs
  const facebookUrlPattern = /(https?:\/\/)?(web\.)?facebook\.com\/[a-zA-Z0-9._-]+/gi
  const facebookMatch = text.match(facebookUrlPattern)
  if (facebookMatch && facebookMatch[0]) {
    return facebookMatch[0].toLowerCase()
  }

  // Pattern 2: Facebook account path (without protocol)
  const facebookPathPattern = /facebook\.com\/([a-zA-Z0-9._-]+)/gi
  const pathMatch = text.match(facebookPathPattern)
  if (pathMatch && pathMatch[0]) {
    return pathMatch[0].toLowerCase()
  }

  // Pattern 3: Account identifier (e.g., /bago.advocacyprograms)
  const accountPathPattern = /\/([a-zA-Z0-9._-]+)/g
  const accountMatches = text.matchAll(accountPathPattern)
  for (const match of accountMatches) {
    const accountPath = match[0].toLowerCase()
    // Check if it looks like a Facebook account (common patterns)
    if (accountPath.includes('.') || accountPath.length > 5) {
      return accountPath
    }
  }

  // Pattern 4: Just the account name (e.g., "bago.advocacyprograms")
  const accountNamePattern = /([a-zA-Z0-9._-]+)/g
  const accountNameMatches = text.matchAll(accountNamePattern)
  for (const match of accountNameMatches) {
    const accountName = match[1].toLowerCase()
    // Common Facebook account patterns
    if (accountName.includes('.') && accountName.length > 5 && accountName.length < 50) {
      return accountName
    }
  }

  return null
}

/**
 * Normalize URL for comparison
 * Removes protocol, www, trailing slashes, and converts to lowercase
 */
function normalizeUrl(url: string): string {
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .trim()
}

/**
 * Check if extracted URL matches any official account
 */
function matchesOfficialAccount(
  extractedUrl: string | null,
  trustedSource: TrustedSource
): boolean {
  if (!extractedUrl || !trustedSource.officialAccounts || trustedSource.officialAccounts.length === 0) {
    return false
  }

  const normalizedExtracted = normalizeUrl(extractedUrl)

  for (const officialAccount of trustedSource.officialAccounts) {
    const normalizedOfficial = normalizeUrl(officialAccount)
    
    // Exact match
    if (normalizedExtracted === normalizedOfficial) {
      return true
    }

    // Check if extracted URL contains the official account
    if (normalizedExtracted.includes(normalizedOfficial) || normalizedOfficial.includes(normalizedExtracted)) {
      return true
    }

    // Check if both contain the same account identifier (e.g., "bago.advocacyprograms")
    const extractedAccount = normalizedExtracted.split('/').pop() || normalizedExtracted
    const officialAccountId = normalizedOfficial.split('/').pop() || normalizedOfficial
    
    if (extractedAccount === officialAccountId) {
      return true
    }
  }

  return false
}

/**
 * Find trusted source that matches the source name
 */
function findMatchingTrustedSource(sourceName: string): TrustedSource | null {
  const trustedSources = (trustedSourcesData as any[]).filter((item: any) => 
    typeof item === 'object' && item.name
  ) as TrustedSource[]

  for (const trustedSource of trustedSources) {
    const sourceLower = sourceName.toLowerCase().trim()
    const trustedLower = trustedSource.name.toLowerCase().trim()

    // Exact match
    if (sourceLower === trustedLower) {
      return trustedSource
    }

    // Check if source name contains trusted source name or vice versa
    if (sourceLower.includes(trustedLower) || trustedLower.includes(sourceLower)) {
      return trustedSource
    }

    // Fuzzy matching for common variations
    const sourceWords = sourceLower.split(/\s+/)
    const trustedWords = trustedLower.split(/\s+/)
    
    // Check if most words match
    const matchingWords = sourceWords.filter(word => 
      trustedWords.some(trustedWord => 
        word.includes(trustedWord) || trustedWord.includes(word)
      )
    )

    if (matchingWords.length >= Math.min(sourceWords.length, trustedWords.length) * 0.7) {
      return trustedSource
    }
  }

  return null
}

/**
 * Checks if text contains verified institutional sources
 * This runs BEFORE AI models to prevent misclassification
 * 
 * IMPORTANT: Only auto-verifies if BOTH source name AND URL match
 * 
 * @param text - Text content to check
 * @param postUrl - Optional post URL (if available from metadata)
 * @returns Verification result with auto-classification
 */
export async function checkVerifiedSourceAuthenticity(
  text: string,
  postUrl?: string
): Promise<VerifiedSourceResult> {
  if (!text || typeof text !== 'string' || text.length < 10) {
    return {
      isVerified: false,
      sourceName: null,
      confidence: 0.5,
      status: 'Unverified/Suspect',
      reasoning: 'Text too short for source verification'
    }
  }

  // Step 1: Extract source name from text
  const sourceVerification = await SourceVerifier.verifySourceInText(text, true)
  
  if (!sourceVerification.sourceName) {
    return {
      isVerified: false,
      sourceName: null,
      confidence: 0.5,
      status: 'Unverified/Suspect',
      reasoning: 'No source name detected in text'
    }
  }

  const sourceName = sourceVerification.sourceName
  const status = sourceVerification.status

  // Step 2: Find matching trusted source with official accounts
  const matchingTrustedSource = findMatchingTrustedSource(sourceName)
  
  if (!matchingTrustedSource) {
    // Source name not in trusted list, don't auto-verify
    console.log(`[SourceVerifier] ⚠️ Source name "${sourceName}" not found in trusted sources list`)
    return {
      isVerified: false,
      sourceName,
      confidence: 0.5,
      status: 'Unverified/Suspect',
      reasoning: `Source "${sourceName}" is not in the trusted sources list. Running full AI + internet fact-check.`,
      rejectionReason: 'Source name not in trusted list'
    }
  }

  // Step 3: Check if source has official accounts defined
  if (!matchingTrustedSource.officialAccounts || matchingTrustedSource.officialAccounts.length === 0) {
    // No official accounts defined, fall back to source name matching only
    console.log(`[SourceVerifier] ⚠️ Source "${sourceName}" has no official accounts defined. Using source name matching only.`)
    const baseConfidence = status === 'Verified (Official Source)' ? 0.95 : 0.9
    
    return {
      isVerified: true,
      sourceName,
      confidence: baseConfidence,
      status,
      reasoning: `Content originates from verified source: "${sourceName}". No official account URL verification required (no accounts defined in trusted sources).`,
      matchedSource: matchingTrustedSource.name,
      urlMatch: true // No URL check needed if no accounts defined
    }
  }

  // Step 4: Extract URL from text or use provided postUrl
  const extractedUrl = postUrl || extractUrlFromText(text)
  
  if (!extractedUrl) {
    // No URL found - REJECT auto-verification
    console.log(`[SourceVerifier] ❌ REJECTED: Source name "${sourceName}" matches trusted source, but no URL found in post.`)
    console.log(`[SourceVerifier] Post will be processed through normal AI + internet fact-check pipeline.`)
    
    return {
      isVerified: false,
      sourceName,
      confidence: 0.5,
      status: 'Unverified/Suspect',
      reasoning: `Source name "${sourceName}" matches a trusted source, but the post does not contain an official account URL. This post will be analyzed through the full AI + internet fact-check pipeline to prevent false positives.`,
      matchedSource: matchingTrustedSource.name,
      urlMatch: false,
      rejectionReason: 'No URL found in post',
      extractedUrl: null
    }
  }

  // Step 5: Check if URL matches any official account
  const urlMatches = matchesOfficialAccount(extractedUrl, matchingTrustedSource)
  
  if (!urlMatches) {
    // URL doesn't match - REJECT auto-verification
    console.log(`[SourceVerifier] ❌ REJECTED: Source name "${sourceName}" matches trusted source, but URL "${extractedUrl}" does not match official accounts.`)
    console.log(`[SourceVerifier] Expected official accounts: ${matchingTrustedSource.officialAccounts?.join(', ')}`)
    console.log(`[SourceVerifier] Post will be processed through normal AI + internet fact-check pipeline.`)
    
    return {
      isVerified: false,
      sourceName,
      confidence: 0.5,
      status: 'Unverified/Suspect',
      reasoning: `Source name "${sourceName}" matches a trusted source, but the post URL "${extractedUrl}" does not match any official account. Expected: ${matchingTrustedSource.officialAccounts?.join(', ')}. This post will be analyzed through the full AI + internet fact-check pipeline.`,
      matchedSource: matchingTrustedSource.name,
      urlMatch: false,
      rejectionReason: 'URL mismatch',
      extractedUrl
    }
  }

  // Step 6: BOTH conditions met - Auto-verify!
  const baseConfidence = status === 'Verified (Official Source)' ? 0.95 : 0.9
  
  // Increase confidence based on match quality
  let finalConfidence = baseConfidence
  if (sourceVerification.matchScore && sourceVerification.matchScore >= 90) {
    finalConfidence = 0.98 // Very high match = higher confidence
  } else if (sourceVerification.matchScore && sourceVerification.matchScore >= 85) {
    finalConfidence = 0.95
  }

  // Log verified source detection
  console.log(`[SourceVerifier] ✅ VERIFIED: Source name "${sourceName}" matches trusted source AND URL "${extractedUrl}" matches official account.`)
  console.log(`[SourceVerifier] Matched against: ${matchingTrustedSource.name}`)
  if (sourceVerification.matchedSource) {
    console.log(`[SourceVerifier] Source match score: ${sourceVerification.matchScore}% similarity`)
  }

  return {
    isVerified: true,
    sourceName,
    confidence: finalConfidence,
    status,
    reasoning: `Content originates from a verified public safety institution: "${sourceName}". ${sourceVerification.matchedSource ? `Matched against trusted source: ${sourceVerification.matchedSource} (${sourceVerification.matchScore}% similarity).` : ''} Post URL "${extractedUrl}" verified against official account. Official government and law enforcement sources are authoritative and should be trusted.`,
    matchedSource: matchingTrustedSource.name,
    matchScore: sourceVerification.matchScore,
    urlMatch: true,
    extractedUrl
  }
}

/**
 * Quick check for verified sources (synchronous, no extraction)
 * Useful for early filtering before full verification
 */
export function hasVerifiedSourceKeywords(text: string): boolean {
  if (!text || typeof text !== 'string') return false

  const lowerText = text.toLowerCase()
  
  // Check for verified organization keywords
  const verifiedKeywords = [
    'bago component city police station',
    'bago city police station',
    'philippine national police',
    'pnp',
    'department of health',
    'doh',
    'ndrrmc',
    'national disaster risk reduction',
    'dost-pagasa',
    'pagasa',
    'philippine red cross',
    'bureau of fire protection',
    'bfp',
    'office of civil defense',
    'ocd',
    'department of interior and local government',
    'dilg'
  ]

  return verifiedKeywords.some(keyword => lowerText.includes(keyword))
}

