

import { defineEventHandler, readBody } from 'h3'
import { logLine } from '../utils/logger'
import { CrimeVerifier, type CrimeReport } from '../utils/crimeVerifier'

type VerifyCrimeRequest = {
  text: string
  screenshot?: string
  timestamp?: string
  sourceName?: string
  engagement?: {
    likes?: number
    shares?: number
    comments?: number
  }
}

type VerifyCrimeResponse = {
  verified: boolean
  credibility: 'High' | 'Medium' | 'Low'
  confidence: number
  sources: Array<{
    title: string
    url: string
    type: 'official' | 'news' | 'social' | 'government'
    credibility: 'High' | 'Medium' | 'Low'
    matchScore: number
  }>
  reasoning: string
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  shouldAlert: boolean
  riskLevel: 'High' | 'Moderate' | 'Low'
  isOfficialSource: boolean
  crimeDetails?: {
    location?: string
    crimeType?: string
    time?: string
  }
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

export default defineEventHandler(async (event): Promise<VerifyCrimeResponse> => {
  try {
    const body = (await readBody(event)) as VerifyCrimeRequest

    if (!body?.text) {
      await logLine('warn', 'verifyCrime: Missing text')
      throw createError({ statusCode: 400, statusMessage: 'text required' })
    }

    await logLine('info', 'verifyCrime: Processing crime verification', {
      textLength: body.text.length,
      hasSourceName: !!body.sourceName
    })

    // Create crime report
    const crimeReport: CrimeReport = {
      text: body.text,
      timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
      sourceName: body.sourceName
    }

    // Verify the crime report
    const verification = await CrimeVerifier.verifyCrimeReport(crimeReport)

    // Prioritize the report
    const { priority, shouldAlert, riskLevel } = CrimeVerifier.prioritizeReport(
      crimeReport,
      verification
    )

    // Extract crime details for response
    const extractedDetails = CrimeVerifier.extractCrimeDetails(body.text)

    const response: VerifyCrimeResponse = {
      verified: verification.verified,
      credibility: verification.credibility,
      confidence: verification.confidence,
      sources: verification.sources,
      reasoning: verification.reasoning,
      priority,
      shouldAlert,
      riskLevel,
      isOfficialSource: verification.isOfficialSource,
      crimeDetails: extractedDetails ? {
        location: extractedDetails.location,
        crimeType: extractedDetails.crimeType,
        time: extractedDetails.time
      } : undefined,
      officialSourceDetails: verification.officialSourceDetails
    }

    await logLine('info', 'verifyCrime: Verification complete', {
      verified: response.verified,
      credibility: response.credibility,
      priority: response.priority,
      shouldAlert: response.shouldAlert
    })

    return response

  } catch (error: any) {
    await logLine('error', 'verifyCrime: Error', {
      message: error?.message,
      stack: error?.stack
    })

    return {
      verified: false,
      credibility: 'Low',
      confidence: 0.1,
      sources: [],
      reasoning: `Verification failed: ${error?.message || 'Unknown error'}. Treat as unverified.`,
      priority: 'Low',
      shouldAlert: false,
      riskLevel: 'Low',
      isOfficialSource: false
    }
  }
})

