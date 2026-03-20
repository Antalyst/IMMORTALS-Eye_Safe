import { ref, computed } from 'vue'

export interface AIRoute {
  path: [number, number][] // Array of [lat, lng] coordinates
  riskScore: number // 0-100%
  reasoning: string // AI explanation
  distance: number // Approximate distance in meters
  estimatedTime: number // Estimated travel time in minutes (walking speed)
  hotspotsAvoided: number // Number of hotspots avoided
  hotspotsNearby: Array<{
    id: number
    label: string
    severity: 'High' | 'Medium' | 'Low'
    distance: number // Distance from route in meters
  }>
}

interface HotspotFeature {
  properties: {
    id: number
    label: string
    crime_type: string
    severity: 'High' | 'Medium' | 'Low'
    reported_at: string
    note: string
  }
  geometry: {
    coordinates: [number, number] // [lng, lat]
  }
}

interface RoutePoint {
  lat: number
  lng: number
}

/**
 * Calculate distance between two coordinates in meters (Haversine formula)
 */
function calculateDistance(point1: RoutePoint, point2: RoutePoint): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = (point2.lat - point1.lat) * Math.PI / 180
  const dLon = (point2.lng - point1.lng) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Check if a point is within a certain distance of a hotspot
 */
function isNearHotspot(point: RoutePoint, hotspot: HotspotFeature, thresholdMeters: number): boolean {
  const hotspotPoint: RoutePoint = {
    lat: hotspot.geometry.coordinates[1],
    lng: hotspot.geometry.coordinates[0]
  }
  return calculateDistance(point, hotspotPoint) <= thresholdMeters
}

/**
 * Calculate the risk score for a route segment
 */
function calculateSegmentRisk(
  point1: RoutePoint,
  point2: RoutePoint,
  hotspots: HotspotFeature[],
  avoidanceRadius: number = 100
): { riskScore: number; nearbyHotspots: Array<{ id: number; label: string; severity: 'High' | 'Medium' | 'Low'; distance: number }> } {
  let riskScore = 0
  const nearbyHotspots: Array<{ id: number; label: string; severity: 'High' | 'Medium' | 'Low'; distance: number }> = []
  
  // Sample points along the segment
  const numSamples = 10
  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples
    const samplePoint: RoutePoint = {
      lat: point1.lat + (point2.lat - point1.lat) * t,
      lng: point1.lng + (point2.lng - point1.lng) * t
    }
    
    // Check nearby hotspots
    for (const hotspot of hotspots) {
      const distance = calculateDistance(samplePoint, {
        lat: hotspot.geometry.coordinates[1],
        lng: hotspot.geometry.coordinates[0]
      })
      
      if (distance <= avoidanceRadius) {
        // Weighted scoring based on severity and distance
        const severityWeight = hotspot.properties.severity === 'High' ? 100 :
                              hotspot.properties.severity === 'Medium' ? 50 : 25
        const distanceFactor = 1 - (distance / avoidanceRadius) // Closer = higher risk
        riskScore += severityWeight * distanceFactor * (1 / numSamples)
        
        // Track nearby hotspots
        const existing = nearbyHotspots.find(h => h.id === hotspot.properties.id)
        if (!existing && distance <= avoidanceRadius * 0.8) {
          nearbyHotspots.push({
            id: hotspot.properties.id,
            label: hotspot.properties.label,
            severity: hotspot.properties.severity,
            distance: Math.round(distance)
          })
        }
      }
    }
  }
  
  return { riskScore: Math.min(100, riskScore), nearbyHotspots }
}

/**
 * Generate multiple route options using waypoint variations
 */
function generateRouteOptions(
  start: RoutePoint,
  end: RoutePoint,
  hotspots: HotspotFeature[]
): [number, number][][] {
  const routes: [number, number][][] = []
  
  // Calculate direct route
  routes.push([[start.lat, start.lng], [end.lat, end.lng]])
  
  // Generate alternative routes with waypoints
  const midLat = (start.lat + end.lat) / 2
  const midLng = (start.lng + end.lng) / 2
  
  // Calculate perpendicular offsets for detours
  const deltaLat = end.lat - start.lat
  const deltaLng = end.lng - start.lng
  const distance = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng)
  
  // Create waypoints offset perpendicularly
  const offset1 = 0.001 // ~100 meters
  const offset2 = 0.002 // ~200 meters
  
  // Waypoint 1: North of midpoint
  const waypoint1N: RoutePoint = {
    lat: midLat + offset1,
    lng: midLng
  }
  routes.push([[start.lat, start.lng], [waypoint1N.lat, waypoint1N.lng], [end.lat, end.lng]])
  
  // Waypoint 2: South of midpoint
  const waypoint2S: RoutePoint = {
    lat: midLat - offset1,
    lng: midLng
  }
  routes.push([[start.lat, start.lng], [waypoint2S.lat, waypoint2S.lng], [end.lat, end.lng]])
  
  // Waypoint 3: East of midpoint
  const waypoint3E: RoutePoint = {
    lat: midLat,
    lng: midLng + offset1
  }
  routes.push([[start.lat, start.lng], [waypoint3E.lat, waypoint3E.lng], [end.lat, end.lng]])
  
  // Waypoint 4: West of midpoint
  const waypoint4W: RoutePoint = {
    lat: midLat,
    lng: midLng - offset1
  }
  routes.push([[start.lat, start.lng], [waypoint4W.lat, waypoint4W.lng], [end.lat, end.lng]])
  
  // Waypoint 5: Further detour (northeast)
  const waypoint5NE: RoutePoint = {
    lat: midLat + offset2,
    lng: midLng + offset2
  }
  routes.push([[start.lat, start.lng], [waypoint5NE.lat, waypoint5NE.lng], [end.lat, end.lng]])
  
  // Waypoint 6: Further detour (southwest)
  const waypoint6SW: RoutePoint = {
    lat: midLat - offset2,
    lng: midLng - offset2
  }
  routes.push([[start.lat, start.lng], [waypoint6SW.lat, waypoint6SW.lng], [end.lat, end.lng]])
  
  return routes
}

/**
 * Generate AI reasoning text for a route
 */
function generateReasoning(route: AIRoute): string {
  const highRiskCount = route.hotspotsNearby.filter(h => h.severity === 'High').length
  const mediumRiskCount = route.hotspotsNearby.filter(h => h.severity === 'Medium').length
  const lowRiskCount = route.hotspotsNearby.filter(h => h.severity === 'Low').length
  
  const parts: string[] = []
  
  if (route.riskScore < 20) {
    parts.push("This route is very safe")
    if (route.hotspotsAvoided > 0) {
      parts.push(`and avoids ${route.hotspotsAvoided} known hotspot${route.hotspotsAvoided > 1 ? 's' : ''}`)
    } else {
      parts.push("with no known hotspots nearby")
    }
  } else if (route.riskScore < 40) {
    parts.push("This route is relatively safe")
    if (highRiskCount > 0) {
      parts.push(`but passes near ${highRiskCount} high-risk area${highRiskCount > 1 ? 's' : ''}`)
    } else if (mediumRiskCount > 0) {
      parts.push(`with ${mediumRiskCount} medium-risk area${mediumRiskCount > 1 ? 's' : ''} nearby`)
    }
  } else if (route.riskScore < 60) {
    parts.push("This route has moderate risk")
    if (highRiskCount > 0) {
      parts.push(`due to ${highRiskCount} high-risk hotspot${highRiskCount > 1 ? 's' : ''} in the area`)
    } else {
      parts.push("with several incidents reported nearby")
    }
  } else {
    parts.push("This route has elevated risk")
    if (highRiskCount > 0) {
      parts.push(`with ${highRiskCount} high-severity hotspot${highRiskCount > 1 ? 's' : ''} along the path`)
    } else {
      parts.push("passing through areas with multiple reported incidents")
    }
  }
  
  // Add distance and time info
  const distanceKm = (route.distance / 1000).toFixed(1)
  parts.push(`(${distanceKm} km, ~${route.estimatedTime} min walk)`)
  
  return parts.join(', ') + '.'
}

/**
 * Main function to analyze safe routes
 */
export function useAIRouting() {
  const analyzing = ref(false)
  const currentLocation = ref<RoutePoint | null>(null)
  const selectedDestination = ref<RoutePoint | null>(null)
  const aiRoutes = ref<AIRoute[]>([])
  
  async function analyzeSafeRoutes(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    hotspots: HotspotFeature[]
  ): Promise<AIRoute[]> {
    analyzing.value = true
    
    try {
      const start: RoutePoint = { lat: startLat, lng: startLng }
      const end: RoutePoint = { lat: endLat, lng: endLng }
      
      // Generate multiple route options
      const routePaths = generateRouteOptions(start, end, hotspots)
      
      // Analyze each route
      const analyzedRoutes: AIRoute[] = []
      
      for (const path of routePaths) {
        let totalRisk = 0
        let totalDistance = 0
        const allNearbyHotspots: Map<number, { id: number; label: string; severity: 'High' | 'Medium' | 'Low'; distance: number }> = new Map()
        
        // Analyze each segment
        for (let i = 0; i < path.length - 1; i++) {
          const segmentStart: RoutePoint = { lat: path[i][0], lng: path[i][1] }
          const segmentEnd: RoutePoint = { lat: path[i + 1][0], lng: path[i + 1][1] }
          
          const segmentDistance = calculateDistance(segmentStart, segmentEnd)
          totalDistance += segmentDistance
          
          const { riskScore, nearbyHotspots } = calculateSegmentRisk(
            segmentStart,
            segmentEnd,
            hotspots,
            100 // 100 meter avoidance radius
          )
          
          // Weight risk by segment length
          totalRisk += riskScore * (segmentDistance / totalDistance)
          
          // Collect unique nearby hotspots
          nearbyHotspots.forEach(h => {
            if (!allNearbyHotspots.has(h.id)) {
              allNearbyHotspots.set(h.id, h)
            }
          })
        }
        
        // Count avoided hotspots (not nearby)
        const hotspotsNearbyArray = Array.from(allNearbyHotspots.values())
        const hotspotsAvoided = hotspots.length - hotspotsNearbyArray.length
        
        // Calculate final risk score (weighted average)
        const avgRisk = totalRisk / (path.length - 1)
        const finalRiskScore = Math.min(100, Math.round(avgRisk))
        
        // Estimate travel time (assuming walking speed of 5 km/h)
        const estimatedTime = Math.round((totalDistance / 1000) / 5 * 60) // minutes
        
        const route: AIRoute = {
          path,
          riskScore: finalRiskScore,
          reasoning: '', // Will be generated below
          distance: Math.round(totalDistance),
          estimatedTime,
          hotspotsAvoided,
          hotspotsNearby: hotspotsNearbyArray.sort((a, b) => a.distance - b.distance)
        }
        
        // Generate reasoning
        route.reasoning = generateReasoning(route)
        
        analyzedRoutes.push(route)
      }
      
      // Sort by risk score (lowest first)
      analyzedRoutes.sort((a, b) => a.riskScore - b.riskScore)
      
      // Take top 4 routes
      const topRoutes = analyzedRoutes.slice(0, 4)
      
      aiRoutes.value = topRoutes
      return topRoutes
      
    } catch (error) {
      console.error('[useAIRouting] Error analyzing routes:', error)
      throw error
    } finally {
      analyzing.value = false
    }
  }
  
  function clearRoutes() {
    aiRoutes.value = []
    selectedDestination.value = null
  }
  
  return {
    analyzing,
    currentLocation,
    selectedDestination,
    aiRoutes,
    analyzeSafeRoutes,
    clearRoutes
  }
}

