<template>
  <div class="map-container">
    <ClientOnly>
      <template #default>
        <div ref="mapEl" class="map-element"></div>
        <div class="absolute top-4 right-4 z-[1000] text-xs text-slate-300 bg-slate-900/60 px-2 py-1 rounded">
          <div v-if="errorMsg" class="text-red-300">{{ errorMsg }}</div>
          <div v-else>Leaflet: {{ loaded ? 'loaded' : 'loading' }} • Map: {{ mapReady ? 'ready' : 'init' }} • Hotspots: {{ hotspots.length }}</div>
        </div>
        <div v-if="guidanceText" class="absolute bottom-4 left-4 z-[1000] bg-slate-900/80 text-slate-100 p-3 rounded-lg border border-cyan-500/20 max-w-sm">
          <div class="text-sm font-semibold">AI Guidance</div>
          <div class="text-xs mt-1">{{ guidanceText }}</div>
        </div>
      </template>
      <template #fallback>
        <div class="map-element flex items-center justify-center bg-slate-800">
          <div class="text-slate-400">Loading map...</div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, onBeforeUnmount, defineExpose } from 'vue'
import { useLeaflet } from '~/composables/useLeaflet'
// Import types only so TypeScript knows Leaflet types without importing at runtime
import type { Map as LeafletMap, Circle as LeafletCircle, Marker as LeafletMarker, Polyline as LeafletPolyline, LatLng as LeafletLatLng } from 'leaflet'

let L: any = null

interface Hotspot {
  id: number
  label: string
  crime_type: string
  severity: 'Low' | 'Medium' | 'High'
  reported_at: string
  note: string
  lat: number
  lng: number
  radius?: number // Optional radius for the circle
  name?: string // Optional name for guidance text
}

// Bago City boundary coordinates (approximate)
const bagoCityBounds = [
    [10.591686815470128, 122.91378708945263],
  [10.551946768850842, 122.83228733700635], // Northwest
  [10.515492783982106,122.83450824490329], // Southeast
  [10.43480617909591,122.88464909295301], // Southwest
  [10.500808711796303, 123.07823084356964]  // Close the polygon
]

const mapEl = ref<HTMLDivElement | null>(null)
let map: LeafletMap | null = null
let cityBoundary: any = null
const hotspots = ref<Hotspot[]>([])
const hotspotLayers: Record<number, LeafletCircle> = {}
const userMarker = ref<LeafletMarker | null>(null)
const destMarker = ref<LeafletMarker | null>(null)
let routeLayer: LeafletPolyline | null = null
const aiRouteLayers: LeafletPolyline[] = []
const aiRouteGlowLayers: LeafletPolyline[] = []
const aiRouteLabels: any[] = []
const aiRouteData: Map<number, { riskScore: number; distance?: number; estimatedTime?: number }> = new Map()
const selectedRouteIndex = ref<number | null>(null)

const guidanceText = ref('')
const loaded = ref(false)
const mapReady = ref(false)
const errorMsg = ref('')
let showHeat = true
let showRoutes = true
let onDestinationClickCallback: ((lat: number, lng: number, userLat?: number, userLng?: number) => void) | null = null

async function loadHotspots() {
  try {
    console.debug('[CrimeMap] Loading hotspots...')
    
    // Load hotspot data
    const files = ['/hotspot.json']
    const allFeatures: any[] = []
    const allIds = new Set<number>()
    
    for (const file of files) {
      try {
        const res = await fetch(file, {
          headers: {
            'Accept': 'application/json'
          }
        })
        if (!res.ok) {
          console.warn(`[CrimeMap] Failed to load ${file}:`, res.status, res.statusText)
          continue
        }
        const geojson = await res.json()
        if (geojson?.features) {
          // Filter out duplicates by ID
          for (const feature of geojson.features) {
            if (feature.properties?.id && !allIds.has(feature.properties.id)) {
              allIds.add(feature.properties.id)
              allFeatures.push(feature)
            }
          }
        }
      } catch (e) {
        console.warn(`[CrimeMap] Error loading ${file}:`, e)
      }
    }
    
    // Create merged GeoJSON
    const geojson = {
      type: 'FeatureCollection',
      features: allFeatures
    }
    
    console.debug('[CrimeMap] Loaded and merged GeoJSON:', geojson, 'Total hotspots:', allFeatures.length)
    
    if (!geojson?.features?.length) {
      throw new Error('No hotspots found in data')
    }
    
    // Transform GeoJSON features to our Hotspot format
    hotspots.value = geojson.features.map((f: any) => {
      // Calculate base radius based on severity
      const baseRadius = 20 // Base radius in meters
      const severityMultiplier = f.properties.severity === 'High' ? 1.5 : 
                                f.properties.severity === 'Medium' ? 1.2 : 1
      
      return {
        id: f.properties.id,
        label: f.properties.label,
        crime_type: f.properties.crime_type,
        severity: f.properties.severity as 'Low' | 'Medium' | 'High',
        reported_at: f.properties.reported_at,
        note: f.properties.note,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        radius: baseRadius * severityMultiplier,
        name: f.properties.label
      }
    }).filter((h: Hotspot) => h.lat && h.lng) // Filter out any invalid coordinates
    
    renderHotspots()
    console.debug('[CrimeMap] loaded hotspots', hotspots.value)
  } catch (e) {
    console.warn('Could not load hotspots', e)
    errorMsg.value = 'Failed to load crime hotspots'
  }
}

function colorForSeverity(s: Hotspot['severity']) {
  if (s === 'High') return 'rgba(239,68,68,0.6)' // Brighter red with higher opacity
  if (s === 'Medium') return 'rgba(250,204,21,0.5)' // Brighter yellow with medium opacity
  return 'rgba(34,197,94,0.4)' // Brighter green with higher opacity
}

function renderHotspots() {
  if (!map) return
  // clear existing
  Object.values(hotspotLayers).forEach(l => l.remove())
  
  for (const h of hotspots.value) {
    // Calculate radius based on severity (in meters) - smaller for street level
    const baseRadius = 20 // Much smaller base radius
    const radiusMultiplier = h.severity === 'High' ? 1.5 : h.severity === 'Medium' ? 1.2 : 1
    const radius = baseRadius * radiusMultiplier

    const circle = L.circle([h.lat, h.lng], {
      radius: radius,
      color: colorForSeverity(h.severity),
      fillColor: colorForSeverity(h.severity),
      fillOpacity: 0.6,
      weight: 2,
      opacity: 0.9
    })
    circle.addTo(map)
    circle.bindPopup(`
      <div class="bg-slate-800 p-3 rounded-lg shadow-lg min-w-[200px]">
        <div class="text-lg font-bold text-cyan-400 mb-2">${h.label}</div>
        <div class="space-y-1">
          <div class="flex justify-between">
            <span class="text-slate-400">Type:</span>
            <span class="text-white font-medium">${h.crime_type}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Severity:</span>
            <span class="text-white font-medium">${h.severity}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Reported:</span>
            <span class="text-white font-medium">${new Date(h.reported_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div class="mt-2 text-sm text-slate-300 border-t border-slate-700 pt-2">
          ${h.note}
        </div>
      </div>
    `, {
      className: 'custom-popup'
    })
    hotspotLayers[h.id] = circle
  }
  setHeatVisibility(showHeat)
}

function setHeatVisibility(v: boolean) {
  showHeat = v
  Object.values(hotspotLayers).forEach(l => {
    if (v) l.addTo(map!)
    else l.remove()
  })
}

function setRoutesVisibility(v: boolean) {
  showRoutes = v
  if (routeLayer) {
    if (v) routeLayer.addTo(map!)
    else routeLayer.remove()
  }
}

function lineIntersectsCircle(a: LeafletLatLng, b: LeafletLatLng, center: LeafletLatLng, radiusM: number) {
  // Convert to simple Cartesian using lat/lng degrees approx for short distances by approximating meters per degree
  const metersPerDegLat = 111320
  const metersPerDegLng = metersPerDegLat * Math.cos(center.lat * Math.PI / 180)

  const ax = (a.lat - center.lat) * metersPerDegLat
  const ay = (a.lng - center.lng) * metersPerDegLng
  const bx = (b.lat - center.lat) * metersPerDegLat
  const by = (b.lng - center.lng) * metersPerDegLng

  const vx = bx - ax
  const vy = by - ay
  const t = -(ax * vx + ay * vy) / (vx * vx + vy * vy)
  const tClamped = Math.max(0, Math.min(1, t))
  const cx = ax + vx * tClamped
  const cy = ay + vy * tClamped
  const dist = Math.sqrt(cx * cx + cy * cy)
  return dist <= radiusM
}

function computeDetour(a: LeafletLatLng, b: LeafletLatLng, h: Hotspot) {
  // compute closest point and offset perpendicular by radius+buffer
  const center = L.latLng(h.lat, h.lng)
  const metersPerDegLat = 111320
  const metersPerDegLng = metersPerDegLat * Math.cos(center.lat * Math.PI / 180)

  const ax = a.lat * metersPerDegLat
  const ay = a.lng * metersPerDegLng
  const bx = b.lat * metersPerDegLat
  const by = b.lng * metersPerDegLng
  const cx = center.lat * metersPerDegLat
  const cy = center.lng * metersPerDegLng

  const vx = bx - ax
  const vy = by - ay
  const t = ((cx - ax) * vx + (cy - ay) * vy) / (vx * vx + vy * vy)
  const tClamped = Math.max(0, Math.min(1, t))
  const px = ax + vx * tClamped
  const py = ay + vy * tClamped

  // vector from hotspot center to closest point
  const dx = px - cx
  const dy = py - cy
  const dist = Math.sqrt(cx * cx + cy * cy)
  const buffer = 60 // meters
  const radius = h.radius || 20 // Default to 20m if no radius set
  const needed = (radius + buffer) - dist
  // normalized perpendicular vector to the path
  // perpendicular to (vx,vy) -> (-vy, vx)
  const perpX = -vy
  const perpY = vx
  const lenPerp = Math.sqrt(perpX * perpX + perpY * perpY)
  const normX = perpX / (lenPerp || 1)
  const normY = perpY / (lenPerp || 1)

  const offsetX = px + normX * (radius + buffer)
  const offsetY = py + normY * (radius + buffer)

  // convert back to lat/lng
  const detourLat = offsetX / metersPerDegLat
  const detourLng = offsetY / metersPerDegLng
  return L.latLng(detourLat, detourLng)
}

function computeRoute() {
  if (!userMarker.value || !destMarker.value) return
  const a = userMarker.value.getLatLng()
  const b = destMarker.value.getLatLng()

  // check intersections
  const intersecting = hotspots.value.find(h => lineIntersectsCircle(a, b, L.latLng(h.lat, h.lng), h.radius || 20))
  let points: LeafletLatLng[] = [a]
  if (intersecting) {
    const detour = computeDetour(a, b, intersecting)
    points.push(detour)
    guidanceText.value = `Avoid hotspot: ${intersecting.name ?? 'area'} (severity: ${intersecting.severity}). Detouring via a safer waypoint.`
  } else {
    guidanceText.value = 'Direct route is clear of known hotspots.'
  }
  points.push(b)

  // draw
  if (routeLayer) routeLayer.remove()
  routeLayer = L.polyline(points, { color: 'cyan', weight: 4, opacity: 0.95 })
  if (showRoutes && routeLayer) routeLayer.addTo(map!)
}

onMounted(async () => {
  console.debug('[CrimeMap] Mounting component...')

  // Give the DOM time to render the map element
  await new Promise(resolve => setTimeout(resolve, 0))

  if (!mapEl.value) {
    console.error('[CrimeMap] Map element not found after mount')
    return
  }

  try {
    const { isLoaded, loadError } = useLeaflet()
    console.debug('[CrimeMap] Waiting for Leaflet to load...')
    
    // Wait for Leaflet to load
    await new Promise<void>((resolve) => {
      if (isLoaded.value) {
        console.debug('[CrimeMap] Leaflet already loaded')
        resolve()
      } else {
        console.debug('[CrimeMap] Watching for Leaflet to load...')
        watch(isLoaded, (value) => {
          if (value) {
            console.debug('[CrimeMap] Leaflet load detected')
            resolve()
          }
        })
      }
    })

    if (loadError.value) {
      throw new Error(loadError.value)
    }

    // Get the global Leaflet instance
    L = window.L
    if (!L) {
      throw new Error('Leaflet not found in window')
    }

    loaded.value = true
    console.debug('[CrimeMap] Using Leaflet:', L)

    // Create map instance
    map = L.map(mapEl.value, {
      zoomControl: true,
      attributionControl: true,
      fadeAnimation: true,
      zoomAnimation: true
    }).setView([10.5312, 122.8428], 15) // Center on Bago City

    console.debug('[CrimeMap] Map instance created:', map)

    // Add Bago City boundary
    cityBoundary = L.polygon(bagoCityBounds, {
      color: '#60A5FA', // blue-400
      weight: 2,
      opacity: 0.8,
      fillColor: '#3B82F6', // blue-500
      fillOpacity: 0.1,
      dashArray: '5,10',
      className: 'city-boundary'
    }).addTo(map)

    // Add a label for Bago City
    L.marker([10.5312, 122.8428], {
      icon: L.divIcon({
        className: 'city-label',
        html: '<div class="px-2 py-1 bg-blue-500/80 text-white text-sm rounded shadow">Bago City</div>',
        iconSize: [80, 20],
        iconAnchor: [40, 10]
      })
    }).addTo(map)
   } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    errorMsg.value = 'Failed to initialize Leaflet: ' + message
    console.error('[CrimeMap] Leaflet init error:', err)
    return
   }
   console.debug('[CrimeMap] map created', map)
  mapReady.value = true

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map)

  // detect user
  map!.locate({ setView: true, maxZoom: 15 })
  map!.on('locationfound', (e: any) => {
    if (userMarker.value) userMarker.value.remove()
    
    // Create animated pulsing marker for user location
    // Use simpler HTML structure that works better with Leaflet positioning
    const pulsingIcon = L.divIcon({
      className: 'pulsing-marker-start',
      html: `
        <div style="position: relative; width: 32px; height: 32px;">
          <div class="pulse-ring" style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(34, 211, 238, 0.6); animation: ping-ring 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: #22d3ee; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 1;">
            <span style="color: white; font-size: 12px; font-weight: bold;">S</span>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16], // Anchor at center - this is the key fix
      popupAnchor: [0, -16] // Popup appears above marker
    })
    
    userMarker.value = L.marker(e.latlng, { 
      title: 'You',
      icon: pulsingIcon,
      // Ensure marker stays at exact coordinates
      riseOnHover: false,
      zIndexOffset: 900
    }).addTo(map!)
    
    userMarker.value!.bindPopup('Your location')
  })

  // click to set destination
  map!.on('click', (ev: any) => {
    const clickedLat = ev.latlng.lat
    const clickedLng = ev.latlng.lng
    
    // Helper function to create a fresh destination marker icon
    function createDestMarkerIcon() {
      // Create a completely fresh icon instance each time
      return L.divIcon({
        className: 'pulsing-marker-dest',
        html: `
          <div style="position: relative; width: 32px; height: 32px; margin: 0; padding: 0;">
            <div class="pulse-ring" style="position: absolute; width: 32px; height: 32px; left: 0; top: 0; border-radius: 50%; background: rgba(239, 68, 68, 0.6); animation: ping-ring 2s cubic-bezier(0, 0, 0.2, 1) infinite; transform-origin: 16px 16px; pointer-events: none;"></div>
            <div style="position: absolute; width: 32px; height: 32px; left: 0; top: 0; border-radius: 50%; background: #ef4444; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 1;">
              <span style="color: white; font-size: 12px; font-weight: bold;">D</span>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16], // Anchor at center - CRITICAL for proper positioning
        popupAnchor: [0, -16]
      })
    }
    
    // Properly remove old marker and clean up completely
    if (destMarker.value) {
      try {
        // Close popup if open
        if (destMarker.value.isPopupOpen()) {
          destMarker.value.closePopup()
        }
        // Unbind popup
        destMarker.value.unbindPopup()
        // Remove all event listeners
        destMarker.value.off()
        // Remove from map using map's removeLayer method
        map!.removeLayer(destMarker.value)
      } catch (e) {
        console.warn('[CrimeMap] Error cleaning up old marker:', e)
      }
      // Always clear the reference
      destMarker.value = null
    }
    
    // Create fresh marker icon
    const pulsingDestIcon = createDestMarkerIcon()
    
    // Create new marker with exact coordinates
    const newMarker = L.marker([clickedLat, clickedLng], { 
      draggable: true, 
      title: 'Destination',
      icon: pulsingDestIcon,
      riseOnHover: false,
      zIndexOffset: 1000,
      keyboard: false
    })
    
    // Set up dragend handler
    newMarker.on('dragend', function() {
      const marker = this as any
      const newLat = marker.getLatLng().lat
      const newLng = marker.getLatLng().lng
      if (onDestinationClickCallback) {
        const userLat = userMarker.value?.getLatLng()?.lat
        const userLng = userMarker.value?.getLatLng()?.lng
        onDestinationClickCallback(newLat, newLng, userLat, userLng)
      } else {
        computeRoute()
      }
    })
    
    // Add to map
    newMarker.addTo(map!)
    
    // Store reference
    destMarker.value = newMarker
    
    // Bind and open popup
    newMarker.bindPopup('Destination').openPopup()
    
    // Call parent callback if available
    if (onDestinationClickCallback) {
      const userLat = userMarker.value?.getLatLng()?.lat
      const userLng = userMarker.value?.getLatLng()?.lng
      onDestinationClickCallback(clickedLat, clickedLng, userLat, userLng)
    } else {
      // Fallback to old behavior
      computeRoute()
    }
  })

  loadHotspots()
})

onBeforeUnmount(() => {
  if (cityBoundary) cityBoundary.remove()
  if (map) map.remove()
})

/**
 * Smooth route path using Bezier curve approximation
 */
function smoothRoutePath(path: [number, number][]): [number, number][] {
  if (path.length <= 2) return path
  
  const smoothed: [number, number][] = [path[0]] // Start point
  
  for (let i = 0; i < path.length - 1; i++) {
    const p0 = path[i]
    const p1 = path[i + 1]
    
    // Add intermediate points for smoother curves
    if (i < path.length - 1) {
      const midLat = (p0[0] + p1[0]) / 2
      const midLng = (p0[1] + p1[1]) / 2
      
      // Add control points for curve
      smoothed.push([midLat, midLng])
    }
    
    smoothed.push(p1) // End point
  }
  
  return smoothed
}

// Draw AI routes on map
function drawAIRoutes(routes: Array<{ path: [number, number][]; riskScore: number; distance?: number; estimatedTime?: number }>) {
  // Clear existing AI routes, glow layers, and labels
  aiRouteLayers.forEach(layer => layer.remove())
  aiRouteGlowLayers.forEach(layer => layer.remove())
  aiRouteLabels.forEach(label => {
    if (map && label) {
      try {
        map.removeLayer(label)
      } catch (e) {
        // Ignore if already removed
      }
    }
  })
  aiRouteLayers.length = 0
  aiRouteGlowLayers.length = 0
  aiRouteLabels.length = 0
  
  if (!map || !routes.length) return
  
  // Draw each route with color based on risk score
  routes.forEach((route, index) => {
    const riskScore = route.riskScore
    const distance = route.distance || 0
    const estimatedTime = route.estimatedTime || 0
    
    // Determine colors and styles based on risk
    let color = '#10b981' // green (low risk)
    let glowColor = 'rgba(16, 185, 129, 0.4)' // green glow
    let weight = 4
    let glowWeight = 8
    let opacity = 0.8
    
    if (riskScore > 50) {
      color = '#f97316' // orange (high risk)
      glowColor = 'rgba(249, 115, 22, 0.5)'
      weight = 5
      glowWeight = 10
      opacity = 0.9
    } else if (riskScore > 20) {
      color = '#eab308' // yellow (moderate risk)
      glowColor = 'rgba(234, 179, 8, 0.4)'
      weight = 4
      glowWeight = 9
      opacity = 0.85
    }
    
    // Smooth the route path
    const smoothedPath = smoothRoutePath(route.path)
    const latlngs = smoothedPath.map(([lat, lng]) => [lat, lng] as [number, number])
    
    // Create glow layer (wider, more transparent line behind main route)
    const glowPolyline = L.polyline(latlngs, {
      color: glowColor,
      weight: glowWeight,
      opacity: 0.3,
      smoothFactor: 1.0,
      className: `route-glow-${index}`
    })
    glowPolyline.addTo(map)
    aiRouteGlowLayers.push(glowPolyline)
    
    // Create main route line
    const polyline = L.polyline(latlngs, {
      color,
      weight,
      opacity,
      smoothFactor: 1.0,
      lineCap: 'round',
      lineJoin: 'round',
      className: `route-line-${index}`
    })
    
    // Add route to map (behind glow but above background)
    polyline.addTo(map)
    
    // Create popup with enhanced info
    const distanceKm = (distance / 1000).toFixed(1)
    polyline.bindPopup(`
      <div class="bg-slate-800 p-3 rounded-lg shadow-lg min-w-[200px]">
        <div class="text-lg font-bold text-cyan-400 mb-2">Route ${index + 1}</div>
        <div class="space-y-1">
          <div class="flex justify-between">
            <span class="text-slate-400">Risk:</span>
            <span class="text-white font-medium">${riskScore}%</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Distance:</span>
            <span class="text-white font-medium">${distanceKm} km</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Time:</span>
            <span class="text-white font-medium">~${estimatedTime} min</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Status:</span>
            <span class="text-white font-medium">${riskScore <= 20 ? 'Safe' : riskScore <= 50 ? 'Moderate' : 'Risky'}</span>
          </div>
        </div>
      </div>
    `, {
      className: 'custom-popup'
    })
    
    aiRouteLayers.push(polyline)
    aiRouteData.set(index, { riskScore, distance, estimatedTime })
    
    // Add distance/time label at midpoint of route
    // Always push to aiRouteLabels array to keep it in sync with aiRouteLayers
    // Push null if no label can be created
    if (latlngs.length > 0) {
      try {
        const midIndex = Math.floor(latlngs.length / 2)
        const midPoint = latlngs[midIndex]
        
        // Validate midPoint coordinates
        if (!midPoint || !Array.isArray(midPoint) || midPoint.length < 2 || 
            typeof midPoint[0] !== 'number' || typeof midPoint[1] !== 'number') {
          console.warn('[CrimeMap] Invalid midpoint for route label:', midPoint, 'Route index:', index)
          aiRouteLabels.push(null)
        } else {
          // Determine border color class
          let borderColorClass = 'border-orange-500/30'
          if (riskScore <= 20) {
            borderColorClass = 'border-green-500/30'
          } else if (riskScore <= 50) {
            borderColorClass = 'border-yellow-500/30'
          }
          
          const labelIcon = L.divIcon({
            className: 'route-label',
            html: `
              <div class="route-label-container bg-slate-900/90 backdrop-blur-sm px-2 py-1 rounded-lg border ${borderColorClass} shadow-lg">
                <div class="text-xs font-semibold text-white">${distanceKm} km</div>
                <div class="text-xs text-slate-400">~${estimatedTime} min</div>
              </div>
            `,
            iconSize: [80, 40],
            iconAnchor: [40, 20]
          })
          
          const labelMarker = L.marker([midPoint[0], midPoint[1]], {
            icon: labelIcon,
            interactive: false,
            zIndexOffset: 1000
          })
          
          if (map) {
            labelMarker.addTo(map)
            aiRouteLabels.push(labelMarker)
          } else {
            console.warn('[CrimeMap] Map not available when creating label')
            aiRouteLabels.push(null)
          }
        }
      } catch (e) {
        console.error('[CrimeMap] Error creating route label:', e, 'Route index:', index)
        aiRouteLabels.push(null)
      }
    } else {
      // No valid coordinates, push null to keep arrays in sync
      aiRouteLabels.push(null)
    }
  })
  
  // Bring all route layers to front in correct order
  aiRouteGlowLayers.forEach(layer => {
    if (layer && typeof layer.bringToBack === 'function') {
      layer.bringToBack()
    }
  })
  aiRouteLayers.forEach(layer => {
    if (layer && typeof layer.bringToFront === 'function') {
      layer.bringToFront()
    }
  })
  aiRouteLabels.forEach(label => {
    if (label && typeof label.bringToFront === 'function') {
      try {
        label.bringToFront()
      } catch (e) {
        console.warn('[CrimeMap] Error bringing label to front:', e)
      }
    }
  })
}

// Highlight a specific route
function highlightRoute(index: number) {
  selectedRouteIndex.value = index
  
  if (!map) {
    console.warn('[CrimeMap] Cannot highlight route: map not available')
    return
  }
  
  if (!aiRouteLayers[index]) {
    console.warn('[CrimeMap] Cannot highlight route: route layer not available', { index, totalRoutes: aiRouteLayers.length })
    return
  }
  
  // Validate index
  if (index < 0 || index >= aiRouteLayers.length) {
    console.warn('[CrimeMap] Invalid route index:', index, 'Total routes:', aiRouteLayers.length)
    return
  }
  
  // Reset all routes to default opacity
  aiRouteLayers.forEach((layer, idx) => {
    if (!layer) return // Skip if layer doesn't exist
    
    const routeData = aiRouteData.get(idx)
    const riskScore = routeData?.riskScore || 50
    
    if (idx === index) {
      // Highlight selected route with cyan and enhanced glow
      try {
        if (typeof layer.setStyle === 'function') {
          layer.setStyle({
            weight: 6,
            opacity: 1.0,
            color: '#60A5FA' // cyan highlight
          })
        }
        
        // Enhance glow for selected route
        if (aiRouteGlowLayers[idx] && typeof aiRouteGlowLayers[idx].setStyle === 'function') {
          aiRouteGlowLayers[idx].setStyle({
            weight: 12,
            opacity: 0.5,
            color: 'rgba(96, 165, 250, 0.6)'
          })
        }
        
        if (typeof layer.bringToFront === 'function') {
          layer.bringToFront()
        }
      } catch (e) {
        console.error('[CrimeMap] Error highlighting route:', e, { idx })
      }
      
      // Show label for selected route
      if (aiRouteLabels[idx] && typeof aiRouteLabels[idx].bringToFront === 'function') {
        try {
          aiRouteLabels[idx].bringToFront()
        } catch (e) {
          console.warn('[CrimeMap] Error bringing label to front:', e)
        }
      }
    } else {
      // Dim other routes
      try {
        let color = '#10b981'
        if (riskScore > 50) color = '#f97316'
        else if (riskScore > 20) color = '#eab308'
        
        if (typeof layer.setStyle === 'function') {
          layer.setStyle({
            weight: 3,
            opacity: 0.25,
            color
          })
        }
        
        // Dim glow for unselected routes
        if (aiRouteGlowLayers[idx] && typeof aiRouteGlowLayers[idx].setStyle === 'function') {
          aiRouteGlowLayers[idx].setStyle({
            opacity: 0.1
          })
        }
      } catch (e) {
        console.error('[CrimeMap] Error dimming route:', e, { idx })
      }
      
      // Hide labels for unselected routes
      if (aiRouteLabels[idx] && typeof aiRouteLabels[idx].setOpacity === 'function') {
        try {
          aiRouteLabels[idx].setOpacity(0.3)
        } catch (e) {
          console.warn('[CrimeMap] Error setting label opacity:', e)
        }
      }
    }
  })
}

// Clear all AI routes
function clearAIRoutes() {
  aiRouteLayers.forEach(layer => layer.remove())
  aiRouteGlowLayers.forEach(layer => layer.remove())
  aiRouteLabels.forEach(label => {
    if (map && label) {
      try {
        map.removeLayer(label)
      } catch (e) {
        // Ignore if already removed
      }
    }
  })
  aiRouteLayers.length = 0
  aiRouteGlowLayers.length = 0
  aiRouteLabels.length = 0
  aiRouteData.clear()
  selectedRouteIndex.value = null
}

// Setup destination click handler
function onDestinationClick(callback: (lat: number, lng: number, userLat?: number, userLng?: number) => void) {
  onDestinationClickCallback = callback
}

// Expose methods for parent control
defineExpose({
  get mapReady() { return mapReady.value },
  toggleHeatmap(v: boolean) { setHeatVisibility(v) },
  toggleRoutes(v: boolean) { setRoutesVisibility(v) },
  drawAIRoutes,
  highlightRoute,
  clearRoutes: clearAIRoutes,
  onDestinationClick
})
</script>

<style>
/* Remove scoped to allow Leaflet styles to work properly */
.leaflet-container {
  width: 100% !important;
  height: 100% !important;
  z-index: 1;
}

/* Custom map styles */
.map-container {
  position: relative;
  width: 100%;
  height: 500px;  /* Explicit height */
  background: #0f172a; /* Darker background */
  overflow: hidden;
  border-radius: 0.75rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.map-element {
  position: absolute !important;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  background: #1e293b; /* Slate-800 background */
  border-radius: 0.75rem;
}

/* Override some Leaflet defaults for dark theme */
:deep(.leaflet-tile-pane) {
  opacity: 0.7; /* Slightly more transparent tiles */
  filter: saturate(0.7) brightness(0.8); /* Darker, less saturated map */
}

:deep(.leaflet-control-zoom a) {
  background-color: #1e293b; /* Slate-800 */
  color: #e2e8f0; /* Slate-200 */
  border-color: #475569; /* Slate-600 */
  transition: all 0.2s ease;
}

:deep(.leaflet-control-zoom a:hover) {
  background-color: #334155; /* Slate-700 */
  color: #f8fafc; /* Slate-50 */
}

/* Custom popup styles */
:deep(.leaflet-popup-content-wrapper) {
  background: transparent;
  border-radius: 0.75rem;
  padding: 0;
  box-shadow: none;
}

:deep(.leaflet-popup-content) {
  margin: 0;
}

:deep(.leaflet-popup-tip) {
  background: #1e293b; /* Slate-800 */
}

:deep(.leaflet-popup-close-button) {
  color: #94a3b8 !important; /* Slate-400 */
  transition: color 0.2s ease;
}

:deep(.leaflet-popup-close-button:hover) {
  color: #e2e8f0 !important; /* Slate-200 */
}

/* City boundary styles */
:deep(.city-boundary) {
  transition: all 0.3s ease;
}

:deep(.city-boundary:hover) {
  opacity: 0.9;
}

:deep(.city-label) {
  background: transparent;
  border: none;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Animated pulsing markers */
:deep(.pulsing-marker-start),
:deep(.pulsing-marker-dest) {
  background: transparent !important;
  border: none !important;
}

/* Ensure Leaflet marker icons work correctly - DO NOT override transform */
/* Leaflet uses CSS transforms for positioning markers, so we must not interfere */

/* Make sure marker container doesn't have conflicting styles */
:deep(.leaflet-marker-icon) {
  /* Don't override Leaflet's transform - it's essential for positioning */
  position: absolute;
}

/* Ensure pulse ring animation doesn't interfere with positioning */
:deep(.pulse-ring) {
  pointer-events: none;
  z-index: 0;
  /* Ensure animation doesn't affect marker container */
  will-change: transform, opacity;
}

/* Ensure each marker icon is properly isolated */
:deep(.leaflet-div-icon) {
  /* Reset any potential transforms that might interfere */
  background: transparent !important;
  border: none !important;
  /* Ensure proper box model */
  box-sizing: border-box;
}

/* Ensure marker icons don't have conflicting styles */
:deep(.leaflet-marker-icon.pulsing-marker-dest) {
  /* Ensure marker uses Leaflet's positioning system correctly */
  margin: 0 !important;
  padding: 0 !important;
}

/* Pulse ring animation for markers */
@keyframes ping-ring {
  0% {
    transform: scale(1);
    opacity: 0.75;
  }
  75%, 100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

/* Route glow effects */
:deep(.route-glow-0),
:deep(.route-glow-1),
:deep(.route-glow-2),
:deep(.route-glow-3) {
  filter: drop-shadow(0 0 8px currentColor);
  animation: route-glow 2s ease-in-out infinite;
}

@keyframes route-glow {
  0%, 100% {
    opacity: 0.3;
    filter: drop-shadow(0 0 8px currentColor);
  }
  50% {
    opacity: 0.5;
    filter: drop-shadow(0 0 12px currentColor);
  }
}

/* Route line animations */
:deep(.route-line-0),
:deep(.route-line-1),
:deep(.route-line-2),
:deep(.route-line-3) {
  transition: all 0.3s ease;
}

/* Route label styling */
:deep(.route-label) {
  background: transparent !important;
  border: none !important;
  pointer-events: none;
}

.route-label-container {
  white-space: nowrap;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
</style>
