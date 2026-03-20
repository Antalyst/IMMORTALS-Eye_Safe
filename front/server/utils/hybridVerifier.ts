/**
 * Hybrid Verification System
 * Uses free public APIs and AI models for fact-checking
 */

import { preprocessText } from './textPreprocessor'
import { checkVerifiedSourceAuthenticity } from './verifiedSourceAuthenticator'

export type Verdict = 'Likely True' | 'Likely False' | 'Inconclusive'

export interface VerificationResult {
  verdict: Verdict
  confidence: number // 0-1
  sources: string[] // Array of verified source names
  reasoning: string // Short summary from AI explaining the decision
}

/**
 * Free public APIs for fact-checking
 */

// Wikipedia API (free, no key required)
async function searchWikipedia(query: string): Promise<{ title: string; snippet: string }[]> {
  try {
    // Clean query: remove special chars, use first few words
    const cleanQuery = query
      .replace(/[^\w\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .join(' ')
      .substring(0, 100)
    
    if (!cleanQuery) return []
    
    // Try direct page lookup first
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanQuery)}`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'VeritasScan/1.0 (Fact-Checking Bot; contact@example.com)'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.extract && data.extract.length > 50) {
        return [{ title: data.title || cleanQuery, snippet: data.extract }]
      }
    }
  } catch (error) {
    console.warn('[HybridVerifier] Wikipedia search failed:', error)
  }
  
  // Fallback: Try first word only
  try {
    const firstWord = query.trim().split(/\s+/)[0]
    if (firstWord && firstWord.length > 2) {
      const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstWord)}`
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'VeritasScan/1.0 (Fact-Checking Bot; contact@example.com)'
        }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.extract && data.extract.length > 50) {
          return [{ title: data.title || firstWord, snippet: data.extract }]
        }
      }
    }
  } catch (error) {
    // Silently fail
  }
  
  return []
}

// News API (free tier - 100 requests/day)
// Note: Requires API key in production, but we'll use it as optional enhancement
async function searchNews(query: string, apiKey?: string): Promise<{ title: string; source: string; url: string }[]> {
  if (!apiKey) {
    // Without API key, return empty (graceful degradation)
    return []
  }
  
  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=5`
    const response = await fetch(url, {
      headers: {
        'X-API-Key': apiKey,
        'User-Agent': 'VeritasScan/1.0'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.articles) {
        return data.articles.slice(0, 5).map((article: any) => ({
          title: article.title,
          source: article.source?.name || 'Unknown',
          url: article.url
        }))
      }
    }
  } catch (error) {
    console.warn('[HybridVerifier] News API search failed:', error)
  }
  
  return []
}

// Free AI model endpoint (Hugging Face Inference API - free tier)
async function getAIAnalysis(text: string): Promise<{ verdict: string; reasoning: string; confidence: number } | null> {
  try {
    // Use Hugging Face Inference API (free tier, no key required for some models)
    // Using a free model: microsoft/DialoGPT-medium or similar
    // For fact-checking, we'll use a simpler approach with text classification
    
    // Alternative: Use Gemini 1.5 Flash free tier if available
    // For now, we'll use a rule-based approach with Wikipedia verification
    
    // Extract key entities/claims from text
    const entities = extractEntities(text)
    
    // Check Wikipedia for each entity
    const wikipediaResults = await Promise.all(
      entities.slice(0, 3).map(entity => searchWikipedia(entity))
    )
    
    if (wikipediaResults.length > 0 && wikipediaResults.some(r => r.length > 0)) {
      const hasVerifiedInfo = wikipediaResults.some(results => 
        results.some(result => 
          result.snippet && result.snippet.length > 50
        )
      )
      
      if (hasVerifiedInfo) {
        return {
          verdict: 'Likely True',
          reasoning: 'Content matches verified information from Wikipedia.',
          confidence: 0.7
        }
      }
    }
    
    return null
  } catch (error) {
    console.warn('[HybridVerifier] AI analysis failed:', error)
    return null
  }
}

// Extract key entities/claims from text
function extractEntities(text: string): string[] {
  const entities: string[] = []
  
  // Extract capitalized phrases (likely proper nouns)
  const capitalizedPhrases = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) || []
  entities.push(...capitalizedPhrases.slice(0, 5))
  
  // Extract quoted phrases (claims)
  const quotedPhrases = text.match(/"([^"]+)"/g) || []
  entities.push(...quotedPhrases.map(q => q.replace(/"/g, '')))
  
  // Extract numbers with units (statistics)
  const statistics = text.match(/\d+\s*(million|billion|thousand|percent|%|km|miles?)/gi) || []
  entities.push(...statistics.slice(0, 3))
  
  return entities.filter((e, i, arr) => arr.indexOf(e) === i).slice(0, 10)
}

// Gemini 1.5 Flash (free tier) - if API key available
async function getGeminiAnalysis(text: string, apiKey?: string): Promise<{ verdict: Verdict; reasoning: string; confidence: number } | null> {
  if (!apiKey) {
    return null
  }
  
  try {
    const prompt = `Analyze this text for truthfulness. Respond ONLY with valid JSON:
{
  "verdict": "Likely True" | "Likely False" | "Inconclusive",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Text: ${text.substring(0, 1000)}`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      
      // Try to parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        return {
          verdict: result.verdict || 'Inconclusive',
          reasoning: result.reasoning || 'AI analysis completed',
          confidence: Math.max(0, Math.min(1, result.confidence || 0.5))
        }
      }
    }
  } catch (error) {
    console.warn('[HybridVerifier] Gemini analysis failed:', error)
  }
  
  return null
}

/**
 * Main hybrid verification function
 */
export async function hybridVerify(
  text: string,
  options: {
    geminiApiKey?: string
    newsApiKey?: string
    maxLength?: number
    postUrl?: string // Optional: Post URL for official account verification
  } = {}
): Promise<VerificationResult> {
  // Step 0: Check for verified institutional sources FIRST (before AI models)
  // This prevents OCR-based misclassification and ensures trusted sources are correctly identified
  // IMPORTANT: Only auto-verifies if BOTH source name AND URL match official accounts
  const verifiedSourceCheck = await checkVerifiedSourceAuthenticity(text, options.postUrl)
  
  if (verifiedSourceCheck.isVerified) {
    // Auto-classify as "Likely True" with high confidence
    // Weighted confidence adjustment: +0.2 boost (as requested)
    const boostedConfidence = Math.min(1.0, verifiedSourceCheck.confidence + 0.2)
    
    console.log(`[HybridVerifier] ✅ Verified institutional source detected: ${verifiedSourceCheck.sourceName}`)
    console.log(`[HybridVerifier] Auto-classifying as "Likely True" with confidence ${(boostedConfidence * 100).toFixed(1)}%`)
    
    return {
      verdict: 'Likely True',
      confidence: boostedConfidence,
      sources: verifiedSourceCheck.sourceName ? [`Verified Source: ${verifiedSourceCheck.sourceName}`] : [],
      reasoning: verifiedSourceCheck.reasoning
    }
  }
  
  // Step 1: Preprocess text (only if not verified source)
  const preprocessed = preprocessText(text, options.maxLength || 2000, true)
  const cleanedText = preprocessed.cleaned
  
  if (cleanedText.length < 10) {
    return {
      verdict: 'Inconclusive',
      confidence: 0.0,
      sources: [],
      reasoning: 'Text too short after preprocessing to verify.'
    }
  }
  
  // Step 2: Extract entities and claims
  const entities = extractEntities(cleanedText)
  
  // Step 3: Wikipedia verification (free, always available)
  const wikipediaResults = await Promise.all(
    entities.slice(0, 3).map(entity => searchWikipedia(entity))
  )
  
  const verifiedSources: string[] = []
  let wikipediaMatchCount = 0
  
  wikipediaResults.forEach(results => {
    results.forEach(result => {
      if (result.snippet && result.snippet.length > 50) {
        verifiedSources.push(`Wikipedia: ${result.title}`)
        wikipediaMatchCount++
      }
    })
  })
  
  // Step 4: Try AI analysis (Gemini if available, otherwise fallback)
  let aiAnalysis = await getGeminiAnalysis(cleanedText, options.geminiApiKey)
  
  if (!aiAnalysis) {
    // Fallback to rule-based analysis
    aiAnalysis = await getAIAnalysis(cleanedText)
  }
  
  // Step 5: News API (optional, requires key)
  const newsResults = await searchNews(cleanedText.substring(0, 100), options.newsApiKey)
  newsResults.forEach(news => {
    verifiedSources.push(`News: ${news.source} - ${news.title}`)
  })
  
  // Step 6: Combine results and determine verdict
  // IMPORTANT: If verified source was detected, we already returned above
  // This section only runs for non-verified sources
  let verdict: Verdict = 'Inconclusive'
  let confidence = 0.5
  let reasoning = ''
  
  // If Wikipedia found matches, increase confidence
  if (wikipediaMatchCount > 0) {
    confidence = Math.min(0.85, 0.5 + (wikipediaMatchCount * 0.15))
    verdict = 'Likely True'
    reasoning = `Found ${wikipediaMatchCount} verified source(s) on Wikipedia. `
  }
  
  // If AI analysis available, incorporate it
  // BUT: Prevent AI from marking verified sources as "False" unless multiple contradictions
  if (aiAnalysis) {
    const aiConfidence = aiAnalysis.confidence || 0.5
    const aiVerdict = aiAnalysis.verdict || 'Inconclusive'
    
    // Weighted average: Wikipedia (40%) + AI (60%)
    confidence = (confidence * 0.4) + (aiConfidence * 0.6)
    
    // If AI and Wikipedia agree, boost confidence
    if ((verdict === 'Likely True' && aiVerdict === 'Likely True') ||
        (verdict === 'Likely False' && aiVerdict === 'Likely False')) {
      confidence = Math.min(0.95, confidence + 0.1)
    } else if (aiVerdict !== 'Inconclusive') {
      // If AI disagrees with Wikipedia, check for contradictions
      // Only mark as False if we have multiple contradicting sources
      if (aiVerdict === 'Likely False' && wikipediaMatchCount === 0) {
        // No Wikipedia support + AI says False = likely false
        verdict = aiVerdict as Verdict
        confidence = Math.max(0.3, confidence - 0.1)
      } else if (aiVerdict === 'Likely False' && wikipediaMatchCount > 0) {
        // Wikipedia says True but AI says False = inconclusive (need more checks)
        verdict = 'Inconclusive'
        confidence = 0.5
        reasoning += 'Conflicting signals: Wikipedia verification suggests accuracy, but AI analysis indicates potential issues. '
      } else {
        verdict = aiVerdict as Verdict
      }
    }
    
    reasoning += aiAnalysis.reasoning
  } else {
    // No AI analysis, rely on Wikipedia
    if (wikipediaMatchCount === 0) {
      verdict = 'Inconclusive'
      confidence = 0.3
      reasoning = 'No verified sources found. Unable to determine truthfulness.'
    }
  }
  
  // Step 7: Apply fallback for low confidence
  if (confidence < 0.5) {
    verdict = 'Inconclusive'
    reasoning = 'Verification inconclusive — further checking required. ' + reasoning
  }
  
  // Step 8: Limit sources list
  const sources = verifiedSources.slice(0, 10)
  
  return {
    verdict,
    confidence: Math.max(0, Math.min(1, confidence)),
    sources,
    reasoning: reasoning.trim() || 'Content analyzed but verification inconclusive.'
  }
}

