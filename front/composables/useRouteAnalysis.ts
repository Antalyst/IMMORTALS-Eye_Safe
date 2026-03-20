import { ref } from 'vue'
import type { AIRoute } from './useAIRouting'

interface RouteAnalysis {
  analysis: string
  routeIndex: number
  timestamp: string
}

/**
 * Composable for route analysis
 * Works with local reasoning system (no external API required)
 */
export function useRouteAnalysis() {
  const analyzing = ref(false)
  const currentAnalysis = ref<RouteAnalysis | null>(null)
  const error = ref<string | null>(null)
  const errorDetails = ref<string | null>(null)

  /**
   * Get analysis for a specific route
   */
  async function analyzeRoute(
    route: AIRoute,
    routeIndex: number,
    allRoutes: AIRoute[]
  ): Promise<string | null> {
    analyzing.value = true
    error.value = null
    errorDetails.value = null

    try {
      // Validate route data
      if (!route) {
        error.value = 'Route data is required'
        return null
      }

      // Ensure hotspotsNearby is an array (even if empty)
      const hotspotsNearby = Array.isArray(route.hotspotsNearby) 
        ? route.hotspotsNearby 
        : []

      console.log('[useRouteAnalysis] Analyzing route:', {
        routeIndex,
        riskScore: route.riskScore,
        distance: route.distance,
        hotspotsAvoided: route.hotspotsAvoided,
        hotspotsNearby: hotspotsNearby.length
      })

      const response = await $fetch<{ analysis: string; routeIndex: number; timestamp: string; error?: string }>('/api/routeAnalysis', {
        method: 'POST',
        body: {
          route: {
            riskScore: route.riskScore || 0,
            distance: route.distance || 0,
            estimatedTime: route.estimatedTime || 0,
            hotspotsAvoided: route.hotspotsAvoided || 0,
            hotspotsNearby: hotspotsNearby,
            reasoning: route.reasoning || ''
          },
          allRoutes: allRoutes.map(r => ({
            riskScore: r.riskScore || 0,
            distance: r.distance || 0,
            estimatedTime: r.estimatedTime || 0,
            hotspotsAvoided: r.hotspotsAvoided || 0
          })),
          routeIndex
        }
      })

      if (response.error) {
        error.value = response.error
        errorDetails.value = response.details || null
        return null
      }

      if (response.analysis) {
        currentAnalysis.value = {
          analysis: response.analysis,
          routeIndex: response.routeIndex,
          timestamp: response.timestamp
        }
        return response.analysis
      }

      return null
    } catch (err: any) {
      // Extract error message from various possible locations
      let errorMessage = 'Failed to analyze route'
      
      if (err?.data?.error) {
        errorMessage = err.data.error
      } else if (err?.data?.details) {
        errorMessage = err.data.details
      } else if (err?.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err?.response?.data?.details) {
        errorMessage = err.response.data.details
      } else if (err?.message) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      }

      error.value = errorMessage
      
      // Extract detailed error information
      if (err?.data?.details) {
        errorDetails.value = err.data.details
      } else if (err?.response?.data?.details) {
        errorDetails.value = err.response.data.details
      } else if (err?.data?.error && err.data.error !== errorMessage) {
        errorDetails.value = err.data.error
      } else if (process.env.NODE_ENV === 'development') {
        errorDetails.value = err?.stack?.substring(0, 200) || null
      }
      
      console.error('[useRouteAnalysis] Error:', {
        message: errorMessage,
        error: err,
        errorData: err?.data,
        errorResponse: err?.response?.data,
        status: err?.status,
        statusCode: err?.statusCode,
        routeIndex,
        route: route ? {
          riskScore: route.riskScore,
          distance: route.distance,
          hotspotsAvoided: route.hotspotsAvoided,
          hasHotspotsNearby: Array.isArray(route.hotspotsNearby)
        } : null
      })
      
      return null
    } finally {
      analyzing.value = false
    }
  }

  /**
   * Clear current analysis
   */
  function clearAnalysis() {
    currentAnalysis.value = null
    error.value = null
    errorDetails.value = null
  }

  return {
    analyzing,
    currentAnalysis,
    error,
    errorDetails,
    analyzeRoute,
    clearAnalysis
  }
}


