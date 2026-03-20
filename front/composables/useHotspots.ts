import { computed, ref } from 'vue'

type Coordinates = [number, number]

interface HotspotFeature {
  type: 'Feature'
  properties: {
    id: number
    label: string
    crime_type: string
    severity: 'High' | 'Medium' | 'Low'
    reported_at: string
    note: string
  }
  geometry: {
    type: 'Point'
    coordinates: Coordinates
  }
}

interface AreaDefinition {
  name: string
  center: Coordinates
  radius: number
}

interface CrimeType {
  name: string
  count: number
  trend: 'up' | 'stable' | 'down'
}

interface HighRiskArea {
  name: string
  incidents: number
  risk: 'high' | 'medium' | 'low'
  coords: [number, number]
}

interface RouteInfo {
  name: string
  risk: number
}

// Global state for dynamically added hotspots from crime verification
const dynamicHotspots = ref<HotspotFeature[]>([])

export function useHotspots() {
  const { data, pending, error } = useFetch<{ type: 'FeatureCollection', features: HotspotFeature[] }>('/hotspot.json')

  const rawFeatures = computed(() => {
    const base = (data.value?.features || [])
    return [...base, ...dynamicHotspots.value]
  })
  
  /**
   * Add a new hotspot dynamically from crime verification
   */
  function addDynamicHotspot(crimeReport: {
    text: string
    location?: string
    crimeType?: string
    severity?: 'High' | 'Medium' | 'Low'
    coordinates?: [number, number]
    verified: boolean
  }) {
    // Extract coordinates if provided, or use default Bago City center
    const coords: [number, number] = crimeReport.coordinates || [122.8428, 10.5312]
    
    // Extract crime type from text if not provided
    let crimeType = crimeReport.crimeType || 'Crime Incident'
    if (!crimeReport.crimeType) {
      const lowerText = crimeReport.text.toLowerCase()
      if (lowerText.includes('drug') || lowerText.includes('buy bust') || lowerText.includes('ra 9165')) {
        crimeType = 'Drug-Related'
      } else if (lowerText.includes('theft') || lowerText.includes('robbery')) {
        crimeType = 'Theft/Robbery'
      } else if (lowerText.includes('murder') || lowerText.includes('kill')) {
        crimeType = 'Homicide'
      } else if (lowerText.includes('assault') || lowerText.includes('attack')) {
        crimeType = 'Assault'
      } else if (lowerText.includes('traffic') || lowerText.includes('accident')) {
        crimeType = 'Traffic Incident'
      }
    }
    
    const newHotspot: HotspotFeature = {
      type: 'Feature',
      properties: {
        id: Date.now() + Math.random(), // Unique ID
        label: crimeReport.location || 'Crime Report',
        crime_type: crimeType,
        severity: crimeReport.severity || (crimeReport.verified ? 'Medium' : 'High'),
        reported_at: new Date().toISOString(),
        note: crimeReport.text.slice(0, 200) + (crimeReport.text.length > 200 ? '...' : '')
      },
      geometry: {
        type: 'Point',
        coordinates: coords
      }
    }
    
    dynamicHotspots.value.unshift(newHotspot)
    
    // Keep only last 50 dynamic hotspots
    if (dynamicHotspots.value.length > 50) {
      dynamicHotspots.value = dynamicHotspots.value.slice(0, 50)
    }
  }
  
  /**
   * Clear all dynamic hotspots
   */
  function clearDynamicHotspots() {
    dynamicHotspots.value = []
  }

  const crimeTypes = computed<CrimeType[]>(() => {
    // Create a map to store counts and recent incidents
    const typeStats = new Map<string, { count: number; recentCount: number; oldCount: number }>()
    
    // Process all features
    rawFeatures.value.forEach(f => {
      const type = f.properties.crime_type
      const reportDate = new Date(f.properties.reported_at)
      const now = new Date()
      const isRecent = (now.getTime() - reportDate.getTime()) < (7 * 24 * 60 * 60 * 1000) // 7 days
      
      if (!typeStats.has(type)) {
        typeStats.set(type, { count: 0, recentCount: 0, oldCount: 0 })
      }
      
      const stats = typeStats.get(type)!
      stats.count++
      if (isRecent) {
        stats.recentCount++
      } else {
        stats.oldCount++
      }
    })

    // Convert to array and calculate trends
    const arr: CrimeType[] = Array.from(typeStats.entries()).map(([name, stats]) => {
      // Calculate trend based on recent vs old incidents
      const trend = stats.recentCount > stats.oldCount ? 'up' as const :
                   stats.recentCount < stats.oldCount ? 'down' as const :
                   'stable' as const
      
      return {
        name,
        count: stats.count,
        trend
      }
    })

    return arr.sort((a, b) => b.count - a.count)
  })

  const highRiskAreas = computed<HighRiskArea[]>(() => {
    if (rawFeatures.value.length === 0) return []
    
    // Cluster hotspots by proximity to identify high-risk areas
    const clusters: Array<{ points: Coordinates[]; severityCounts: { high: number; medium: number; low: number } }> = []
    const clusterRadius = 0.002 // ~200 meters
    
    const distance = (p1: Coordinates, p2: Coordinates): number => {
      const dx = p1[0] - p2[0]
      const dy = p1[1] - p2[1]
      return Math.sqrt(dx * dx + dy * dy)
    }
    
    // Group hotspots into clusters
    rawFeatures.value.forEach(f => {
      const point: Coordinates = f.geometry.coordinates
      let assigned = false
      
      for (const cluster of clusters) {
        // Check if point is near any point in cluster
        const isNear = cluster.points.some(p => distance(point, p) <= clusterRadius)
        
        if (isNear) {
          cluster.points.push(point)
          const severity = f.properties.severity.toLowerCase()
          if (severity === 'high') cluster.severityCounts.high++
          else if (severity === 'medium') cluster.severityCounts.medium++
          else cluster.severityCounts.low++
          assigned = true
          break
        }
      }
      
      if (!assigned) {
        // Create new cluster
        const severity = f.properties.severity.toLowerCase()
        clusters.push({
          points: [point],
          severityCounts: {
            high: severity === 'high' ? 1 : 0,
            medium: severity === 'medium' ? 1 : 0,
            low: severity === 'low' ? 1 : 0
          }
        })
      }
    })
    
    // Convert clusters to high-risk areas
    const areaStats: HighRiskArea[] = clusters
      .filter(cluster => cluster.points.length >= 2) // Only areas with 2+ incidents
      .map((cluster, idx) => {
        // Calculate center of cluster
        const center: Coordinates = [
          cluster.points.reduce((sum, p) => sum + p[0], 0) / cluster.points.length,
          cluster.points.reduce((sum, p) => sum + p[1], 0) / cluster.points.length
        ]
        
        const totalIncidents = cluster.points.length
        const { high, medium, low } = cluster.severityCounts
        
        // Determine risk level
        let risk: 'high' | 'medium' | 'low'
        if (totalIncidents >= 5 || high >= 3) {
          risk = 'high'
        } else if (totalIncidents >= 3 || high >= 1) {
          risk = 'medium'
        } else {
          risk = 'low'
        }
        
        // Generate area name based on location and characteristics
        const areaNames = [
          'Central District',
          'Market Area',
          'Downtown Zone',
          'Commercial District',
          'Residential Sector',
          'Urban Center',
          'Business Quarter',
          'City Plaza Area'
        ]
        const name = areaNames[idx % areaNames.length] || `Area ${idx + 1}`
        
        return {
          name,
          incidents: totalIncidents,
          risk,
          coords: center as [number, number]
        }
      })
      .sort((a, b) => {
        // Sort by risk level first, then by incident count
        if (a.risk === 'high' && b.risk !== 'high') return -1
        if (b.risk === 'high' && a.risk !== 'high') return 1
        if (a.risk === 'medium' && b.risk === 'low') return -1
        if (b.risk === 'medium' && a.risk === 'low') return 1
        return b.incidents - a.incidents
      })
      .slice(0, 4) // Return top 4 high-risk areas
    
    return areaStats
  })

  const safeRoutes = computed<RouteInfo[]>(() => {
    if (rawFeatures.value.length === 0) {
      // Default routes if no hotspots
      return [
        { name: 'Main Street Route', risk: 10 },
        { name: 'Downtown Bypass', risk: 15 },
        { name: 'City Park Pathway', risk: 20 },
        { name: 'Commercial Corridor', risk: 25 }
      ]
    }
    
    // Define route points based on actual hotspot distribution
    // Use strategic points that avoid high-density hotspot areas
    const allCoords = rawFeatures.value.map(f => f.geometry.coordinates)
    const avgLon = allCoords.reduce((sum, c) => sum + c[0], 0) / allCoords.length
    const avgLat = allCoords.reduce((sum, c) => sum + c[1], 0) / allCoords.length
    
    // Generate route points around the average location
    const routeBasePoints: Record<string, [number, number]> = {
      'Main Street Route': [avgLon, avgLat] as Coordinates,
      'Downtown Bypass': [avgLon + 0.001, avgLat] as Coordinates,
      'City Park Pathway': [avgLon, avgLat + 0.001] as Coordinates,
      'Commercial Corridor': [avgLon - 0.001, avgLat - 0.001] as Coordinates
    }

    // Helper to calculate distance between two points
    const distance = (p1: Coordinates, p2: Coordinates): number => {
      const dx = p1[0] - p2[0]
      const dy = p1[1] - p2[1]
      return Math.sqrt(dx * dx + dy * dy)
    }

    // Calculate risk based on proximity to hotspots
    return Object.entries(routeBasePoints).map(([name, basePoint]) => {
      let riskScore = 0
      let incidentsNearby = 0

      rawFeatures.value.forEach(feature => {
        const coords = feature.geometry.coordinates
        const dist = distance(basePoint, coords)
        
        // Calculate risk based on distance - higher risk for closer incidents
        const distanceMultiplier = dist < 0.0005 ? 2.0 : // Very close (50m)
                                  dist < 0.001 ? 1.5 :    // Close (100m)
                                  dist < 0.002 ? 1.0 :    // Nearby (200m)
                                  dist < 0.003 ? 0.5 : 0; // Far (300m)
        
        if (distanceMultiplier > 0) {
          incidentsNearby++
          const severity = feature.properties.severity?.toLowerCase()
          const severityScore = severity === 'high' ? 4 :
                               severity === 'medium' ? 2 : 1;
          riskScore += severityScore * distanceMultiplier;
        }
      })

      // Normalize risk score
      const normalizedRisk = incidentsNearby > 0 
        ? Math.min(100, Math.round((riskScore * 15) / incidentsNearby))
        : 10
      
      // Apply minimum risk of 10% and maximum of 100%
      const risk = Math.max(10, Math.min(100, normalizedRisk))
      return { name, risk }
    }).sort((a, b) => a.risk - b.risk) // Sort by risk (safest first)
  })

  return {
    hotspots: rawFeatures,
    crimeTypes,
    highRiskAreas,
    safeRoutes,
    pending,
    error,
    addDynamicHotspot,
    clearDynamicHotspots
  }
}