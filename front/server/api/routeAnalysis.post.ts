import { defineEventHandler, readBody } from 'h3'
import { logLine } from '../utils/logger'

/**
 * Route Analysis API - Local Reasoning System
 * 
 * Provides intelligent route safety analysis using local reasoning logic.
 * No external API calls required - works completely offline.
 */

interface RouteAnalysisRequest {
  route: {
    riskScore: number
    distance: number
    estimatedTime: number
    hotspotsAvoided: number
    hotspotsNearby: Array<{
      id: number
      label: string
      severity: 'High' | 'Medium' | 'Low'
      distance: number
    }>
    reasoning?: string
  }
  allRoutes: Array<{
    riskScore: number
    distance: number
    estimatedTime: number
    hotspotsAvoided: number
  }>
  routeIndex: number
}

/**
 * Generate local route analysis based on route data
 */
function generateRouteAnalysis(
  route: RouteAnalysisRequest['route'],
  allRoutes: RouteAnalysisRequest['allRoutes'],
  routeIndex: number
): string {
  const riskScore = route.riskScore || 0
  const distance = route.distance || 0
  const distanceKm = (distance / 1000).toFixed(1)
  const estimatedTime = route.estimatedTime || 0
  const hotspotsAvoided = route.hotspotsAvoided || 0
  const hotspotsNearby = route.hotspotsNearby || []
  const nearbyCount = hotspotsNearby.length

  // Categorize risk level
  let riskLevel: 'very-low' | 'low' | 'medium' | 'high' | 'very-high'
  let riskDescription: string
  
  if (riskScore < 15) {
    riskLevel = 'very-low'
    riskDescription = 'exceptionally safe'
  } else if (riskScore < 30) {
    riskLevel = 'low'
    riskDescription = 'very safe'
  } else if (riskScore < 50) {
    riskLevel = 'medium'
    riskDescription = 'moderately safe'
  } else if (riskScore < 70) {
    riskLevel = 'high'
    riskDescription = 'somewhat risky'
  } else {
    riskLevel = 'very-high'
    riskDescription = 'highly risky'
  }

  // Analyze hotspots
  const highSeverityNearby = hotspotsNearby.filter(h => h.severity === 'High').length
  const hasHighRiskNearby = highSeverityNearby > 0
  const hasNearbyHotspots = nearbyCount > 0

  // Compare with other routes
  const otherRoutes = allRoutes.filter((_, i) => i !== routeIndex)
  const hasAlternatives = otherRoutes.length > 0
  
  let comparisonContext = ''
  if (hasAlternatives) {
    const saferRoutes = otherRoutes.filter(r => (r.riskScore || 0) < riskScore)
    const riskierRoutes = otherRoutes.filter(r => (r.riskScore || 0) > riskScore)
    const fasterRoutes = otherRoutes.filter(r => (r.estimatedTime || 0) < estimatedTime)
    
    if (saferRoutes.length === 0 && riskierRoutes.length > 0) {
      comparisonContext = 'safest'
    } else if (saferRoutes.length > 0 && riskierRoutes.length === 0) {
      comparisonContext = 'riskier'
    } else if (saferRoutes.length < riskierRoutes.length) {
      comparisonContext = 'safer than most'
    } else if (saferRoutes.length > riskierRoutes.length) {
      comparisonContext = 'riskier than most'
    } else {
      comparisonContext = 'comparable'
    }
  }

  // Build analysis sentences
  const sentences: string[] = []

  // First sentence: Overall safety assessment
  if (riskLevel === 'very-low' || riskLevel === 'low') {
    if (hotspotsAvoided > 10) {
      sentences.push(`Route ${routeIndex + 1} appears to be one of the safest options, with a ${riskScore}% risk score and ${hotspotsAvoided} crime hotspots avoided.`)
    } else if (hotspotsAvoided > 5) {
      sentences.push(`Route ${routeIndex + 1} is ${riskDescription}, with a ${riskScore}% risk score and successfully avoids ${hotspotsAvoided} known crime hotspots.`)
    } else {
      sentences.push(`Route ${routeIndex + 1} shows a ${riskScore}% risk score, indicating ${riskDescription} conditions for navigation.`)
    }
  } else if (riskLevel === 'medium') {
    if (hotspotsAvoided > 5) {
      sentences.push(`Route ${routeIndex + 1} presents a moderate ${riskScore}% risk level while avoiding ${hotspotsAvoided} crime hotspots, balancing safety with efficiency.`)
    } else {
      sentences.push(`Route ${routeIndex + 1} has a ${riskScore}% risk score, indicating ${riskDescription} conditions that require standard safety precautions.`)
    }
  } else {
    if (hasHighRiskNearby) {
      sentences.push(`Route ${routeIndex + 1} shows a ${riskScore}% risk score with ${highSeverityNearby} high-severity hotspot${highSeverityNearby > 1 ? 's' : ''} nearby, requiring extra caution.`)
    } else {
      sentences.push(`Route ${routeIndex + 1} presents a ${riskScore}% risk score, indicating ${riskDescription} conditions that warrant careful consideration.`)
    }
  }

  // Second sentence: Key factors and comparison
  if (hasAlternatives && comparisonContext) {
    if (comparisonContext === 'safest') {
      sentences.push(`This route is the safest option available, making it an excellent choice for prioritizing security over speed.`)
    } else if (comparisonContext === 'safer than most') {
      sentences.push(`Compared to other routes, this option is ${comparisonContext}, offering a good balance between safety and travel time.`)
    } else if (comparisonContext === 'riskier than most') {
      if (estimatedTime < otherRoutes.reduce((min, r) => Math.min(min, r.estimatedTime || 999), 999)) {
        sentences.push(`While this route is ${comparisonContext} alternatives, it may be the fastest option if time is a critical factor.`)
      } else {
        sentences.push(`Other routes offer better safety profiles, so consider alternatives unless this route serves a specific need.`)
      }
    } else {
      sentences.push(`This route offers ${comparisonContext} safety levels to the alternatives, making it a reasonable choice depending on your priorities.`)
    }
  } else {
    // No comparison available, focus on route specifics
    if (hotspotsAvoided > 0 && !hasNearbyHotspots) {
      sentences.push(`The route successfully avoids ${hotspotsAvoided} crime hotspots with no high-risk areas nearby, providing clear passage.`)
    } else if (hasNearbyHotspots && hotspotsAvoided > 0) {
      sentences.push(`While the route avoids ${hotspotsAvoided} hotspots, there ${nearbyCount === 1 ? 'is' : 'are'} ${nearbyCount} nearby hotspot${nearbyCount > 1 ? 's' : ''} to be aware of.`)
    } else if (hasNearbyHotspots) {
      sentences.push(`Be cautious as there ${nearbyCount === 1 ? 'is' : 'are'} ${nearbyCount} nearby hotspot${nearbyCount > 1 ? 's' : ''} along this route.`)
    }
  }

  // Third sentence: Practical advice
  if (riskLevel === 'very-low' || riskLevel === 'low') {
    if (estimatedTime > 0) {
      sentences.push(`With an estimated travel time of ${estimatedTime} minutes over ${distanceKm} km, this route balances safety and efficiency effectively, making it ideal for daily commutes.`)
    } else {
      sentences.push(`This route balances safety and efficiency effectively, making it a reliable choice for regular travel.`)
    }
  } else if (riskLevel === 'medium') {
    sentences.push(`Standard safety precautions are recommended, such as traveling during daylight hours and staying alert to your surroundings.`)
  } else {
    sentences.push(`If you must take this route, consider traveling with others, avoiding late-night hours, and remaining highly alert throughout your journey.`)
  }

  // Combine sentences into final analysis
  let analysis = sentences.join(' ')
  
  // Ensure we have at least 2-3 sentences
  if (sentences.length < 2) {
    // Fallback: Add a generic safety note
    analysis += ` Remember to stay aware of your surroundings and trust your instincts while navigating.`
  }

  return analysis.trim()
}

export default defineEventHandler(async (event) => {
  let body: RouteAnalysisRequest | null = null
  let routeIndex = -1
  
  try {
    body = (await readBody(event)) as RouteAnalysisRequest

    await logLine('info', 'routeAnalysis: Received request', {
      hasBody: !!body,
      hasRoute: !!body?.route,
      routeIndex: body?.routeIndex,
      hasAllRoutes: !!body?.allRoutes,
      allRoutesLength: body?.allRoutes?.length
    })

    if (!body?.route) {
      await logLine('error', 'routeAnalysis: Missing route data in request body', {
        bodyKeys: body ? Object.keys(body) : [],
        body: JSON.stringify(body).substring(0, 500)
      })
      return {
        error: 'Route data is required',
        analysis: null,
        routeIndex: body?.routeIndex ?? -1
      }
    }

    const { route, allRoutes, routeIndex: idx } = body
    routeIndex = idx

    // Validate route data
    if (typeof route.riskScore !== 'number' || typeof route.distance !== 'number') {
      await logLine('error', 'routeAnalysis: Invalid route data', {
        route: JSON.stringify(route).substring(0, 500)
      })
      return {
        error: 'Invalid route data: riskScore and distance must be numbers',
        analysis: null,
        routeIndex: routeIndex
      }
    }

    // Ensure hotspotsNearby is an array
    if (!Array.isArray(route.hotspotsNearby)) {
      await logLine('warn', 'routeAnalysis: hotspotsNearby is not an array, converting', {
        hotspotsNearby: route.hotspotsNearby
      })
      route.hotspotsNearby = []
    }

    // Ensure allRoutes is an array
    const validAllRoutes = Array.isArray(allRoutes) ? allRoutes : []

    await logLine('info', 'routeAnalysis: Generating local analysis', {
      routeIndex,
      riskScore: route.riskScore,
      distance: route.distance,
      hotspotsAvoided: route.hotspotsAvoided,
      hotspotsNearby: route.hotspotsNearby?.length || 0,
      allRoutesCount: validAllRoutes.length
    })

    // Generate analysis using local reasoning
    let analysis: string
    try {
      analysis = generateRouteAnalysis(route, validAllRoutes, routeIndex)
    } catch (error: any) {
      await logLine('error', 'routeAnalysis: Error generating analysis', {
        error: error?.message || String(error)
      })
      // Fallback to basic analysis
      analysis = route.reasoning || `Route ${routeIndex + 1} has a risk score of ${route.riskScore}% and avoids ${route.hotspotsAvoided || 0} known crime hotspots.`
    }

    await logLine('info', 'routeAnalysis: Generated analysis', {
      routeIndex,
      analysisLength: analysis.length,
      analysisPreview: analysis.substring(0, 100)
    })

    return {
      analysis,
      routeIndex,
      timestamp: new Date().toISOString()
    }

  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error'
    const errorDetails = {
      message: errorMessage,
      stack: error?.stack?.substring(0, 500),
      name: error?.name,
      status: error?.status,
      statusCode: error?.statusCode,
      response: error?.response,
      data: error?.data
    }

    await logLine('error', 'routeAnalysis: Handler error', errorDetails)

    // Return user-friendly error message
    let userErrorMessage = 'Failed to generate route analysis'
    
    if (errorMessage.includes('Route data is required') || errorMessage.includes('Invalid route data')) {
      userErrorMessage = errorMessage
    } else {
      userErrorMessage = `Error: ${errorMessage}`
    }

    return {
      error: userErrorMessage,
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      analysis: null,
      routeIndex: routeIndex
    }
  }
})
