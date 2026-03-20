import { ref, computed } from 'vue'
import type { VerifyCrimeResponse } from '~/server/api/verifyCrime.post'

let hotspotComposable: ReturnType<typeof import('./useHotspots').useHotspots> | null = null

export type CrimeAlert = {
  id: string
  text: string
  verified: boolean
  credibility: 'High' | 'Medium' | 'Low'
  confidence?: number
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  riskLevel: 'High' | 'Moderate' | 'Low'
  timestamp: Date
  sources: VerifyCrimeResponse['sources']
  reasoning: string
  crimeDetails?: {
    location?: string
    crimeType?: string
    time?: string
  }
  screenshot?: string
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

export function useCrimeVerification() {
  const alerts = ref<CrimeAlert[]>([])
  const isVerifying = ref(false)
  const lastError = ref<string | null>(null)
  const verificationStats = ref({
    totalVerified: 0,
    totalUnverified: 0,
    totalAlerts: 0,
    criticalAlerts: 0
  })
  function isCrimeContent(text: string): boolean {
    if (!text || text.length < 20) return false

    const lowerText = text.toLowerCase()
    const crimeKeywords = [
      'crime', 'murder', 'kill', 'homicide', 'robbery', 'theft', 'rape', 'assault',
      'shooting', 'gun', 'weapon', 'attack', 'violence', 'terrorist', 'bomb',
      'kidnap', 'abduction', 'missing', 'dead', 'death', 'victim', 'suspect',
      'arrest', 'police', 'criminal', 'gang', 'drug', 'stolen', 'stabbing',
      'buy bust', 'ra 9165', 'pnp', 'police station', 'incident', 'accident'
    ]
    const locationKeywords = [
      'bago city', 'bago', 'negros occidental', 'negros', 'philippines',
      'barangay', 'bacolod'
    ]
    const hasCrimeKeyword = crimeKeywords.some(kw => lowerText.includes(kw))
    const hasLocation = locationKeywords.some(loc => lowerText.includes(loc))
    return hasCrimeKeyword && hasLocation
  }
  async function verifyCrimeReport(
    text: string,
    screenshot?: string,
    sourceName?: string
  ): Promise<CrimeAlert | null> {
    if (!isCrimeContent(text)) {
      return null
    }

    isVerifying.value = true
    lastError.value = null

    try {
      const response = await $fetch<VerifyCrimeResponse>('/api/verifyCrime', {
        method: 'POST',
        body: {
          text,
          screenshot,
          sourceName,
          timestamp: new Date().toISOString()
        }
      })

      const alert: CrimeAlert = {
        id: `crime-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text,
        verified: response.verified,
        credibility: response.credibility,
        confidence: response.confidence,
        priority: response.priority,
        riskLevel: response.riskLevel,
        timestamp: new Date(),
        sources: response.sources,
        reasoning: response.reasoning,
        crimeDetails: response.crimeDetails,
        screenshot,
        officialSourceDetails: response.officialSourceDetails
      }
      alerts.value.unshift(alert) 
      
      if (alerts.value.length > 50) {
        alerts.value = alerts.value.slice(0, 50)
      }
      if (response.verified) {
        verificationStats.value.totalVerified++
      } else {
        verificationStats.value.totalUnverified++
      }
      
      if (response.priority === 'Critical') {
        verificationStats.value.criticalAlerts++
      }
      
      verificationStats.value.totalAlerts++

      if (response.verified && alert.crimeDetails?.location) {
        try {
          if (!hotspotComposable) {
            const { useHotspots } = await import('./useHotspots')
            hotspotComposable = useHotspots()
          }
          const coords: [number, number] | undefined = undefined 
          
          hotspotComposable.addDynamicHotspot({
            text: alert.text,
            location: alert.crimeDetails.location,
            crimeType: alert.crimeDetails.crimeType,
            severity: alert.priority === 'Critical' ? 'High' : 
                     alert.priority === 'High' ? 'Medium' : 'Low',
            coordinates: coords,
            verified: true
          })
          
          console.log('[CrimeVerification] ✅ Added verified crime to hotspot map')
        } catch (error) {
          console.warn('[CrimeVerification] Failed to add to hotspot map:', error)
        }
      }

      return alert

    } catch (error: any) {
      lastError.value = error?.message || 'Verification failed'
      console.error('[CrimeVerification] Error:', error)
      return null
    } finally {
      isVerifying.value = false
    }
  }
  const highPriorityAlerts = computed(() => {
    return alerts.value.filter(
      alert => alert.priority === 'Critical' || alert.priority === 'High'
    )
  })

  const unverifiedAlerts = computed(() => {
    return alerts.value.filter(alert => !alert.verified)
  })

  const verifiedAlerts = computed(() => {
    return alerts.value.filter(alert => alert.verified)
  })

  function clearAlerts() {
    alerts.value = []
    verificationStats.value = {
      totalVerified: 0,
      totalUnverified: 0,
      totalAlerts: 0,
      criticalAlerts: 0
    }
  }
  function removeAlert(id: string) {
    const index = alerts.value.findIndex(a => a.id === id)
    if (index !== -1) {
      alerts.value.splice(index, 1)
    }
  }

  return {
    alerts,
    isVerifying,
    lastError,
    verificationStats,
    highPriorityAlerts,
    unverifiedAlerts,
    verifiedAlerts,
    isCrimeContent,
    verifyCrimeReport,
    clearAlerts,
    removeAlert
  }
}

