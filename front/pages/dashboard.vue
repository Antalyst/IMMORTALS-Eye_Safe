<template>
  <div class="relative p-3 sm:p-4 md:p-6">
    <div class="max-w-7xl mx-auto relative z-10">
      <!-- Header -->
      <div class="mb-4 sm:mb-6 md:mb-8">
        <h1 class="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Bago City Safety Dashboard
        </h1>
        <p class="text-xs sm:text-sm text-slate-400">Real-time crime monitoring and safety analysis</p>
      </div>

      <!-- Stats Overview -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
        <div class="relative group fade-in-up">
          <div class="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div class="relative bg-slate-900/80 backdrop-blur-lg rounded-lg p-3 sm:p-4 md:p-6 border border-cyan-500/10">
            <h3 class="text-xs sm:text-sm font-semibold text-slate-400 mb-1 sm:mb-2">Total Reports</h3>
            <div class="flex items-center justify-between flex-wrap gap-1">
              <span class="text-lg sm:text-xl md:text-2xl font-bold text-white">{{ totalReports }}</span>
              <span class="text-cyan-400 text-xs sm:text-sm bg-cyan-950/50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full" v-if="recentReportsCount > 0">
                +{{ recentReportsCount }} today
              </span>
            </div>
          </div>
        </div>
        <div class="relative group fade-in-up" style="animation-delay: 0.1s;">
          <div class="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div class="relative bg-slate-900/80 backdrop-blur-lg rounded-lg p-3 sm:p-4 md:p-6 border border-cyan-500/10">
            <h3 class="text-xs sm:text-sm font-semibold text-slate-400 mb-1 sm:mb-2">Active Hotspots</h3>
            <div class="flex items-center justify-between flex-wrap gap-1">
              <span class="text-lg sm:text-xl md:text-2xl font-bold text-white">{{ hotspots.length }}</span>
              <span :class="highRiskCount > 0 ? 'text-red-400 bg-red-950/50' : 'text-green-400 bg-green-950/50'" class="text-xs sm:text-sm px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full">
                {{ highRiskCount }} high
              </span>
            </div>
          </div>
        </div>
        <div class="relative group fade-in-up" style="animation-delay: 0.2s;">
          <div class="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div class="relative bg-slate-900/80 backdrop-blur-lg rounded-lg p-3 sm:p-4 md:p-6 border border-cyan-500/10">
            <h3 class="text-xs sm:text-sm font-semibold text-slate-400 mb-1 sm:mb-2">Safe Routes</h3>
            <div class="flex items-center justify-between flex-wrap gap-1">
              <span class="text-lg sm:text-xl md:text-2xl font-bold text-white">{{ safeRoutes.length }}</span>
              <span class="text-green-400 text-xs sm:text-sm bg-green-950/50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full">Active</span>
            </div>
          </div>
        </div>
        <div class="relative group fade-in-up" style="animation-delay: 0.3s;">
          <div class="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div class="relative bg-slate-900/80 backdrop-blur-lg rounded-lg p-3 sm:p-4 md:p-6 border border-cyan-500/10">
            <h3 class="text-xs sm:text-sm font-semibold text-slate-400 mb-1 sm:mb-2">Risk Level</h3>
            <div class="flex items-center justify-between flex-wrap gap-1">
              <span class="text-lg sm:text-xl md:text-2xl font-bold" :class="overallRiskLevel.color">{{ overallRiskLevel.label }}</span>
              <span :class="overallRiskLevel.badgeClass" class="text-xs sm:text-sm px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full">{{ overallRiskLevel.percentage }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content Grid: Map and Routes -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 md:gap-6 mb-4 sm:mb-6 md:mb-8">
        <!-- Map Section (Left - Larger) -->
        <div class="lg:col-span-7 xl:col-span-8 relative group">
          <div class="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div class="relative bg-slate-900/80 backdrop-blur-lg rounded-lg p-3 sm:p-4 md:p-6 border border-cyan-500/10 min-h-[400px] sm:min-h-[500px] md:min-h-[600px]">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-3">
              <h2 class="text-base sm:text-lg md:text-xl font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Crime Hotspots Map</h2>
              <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
                <button
                  @click="toggleMapRoutes"
                  :class="['px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-full border transition-colors duration-200', showRoutes ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/20 hover:border-cyan-500/40' : 'bg-slate-500/20 hover:bg-slate-500/30 text-slate-300 border-slate-500/20 hover:border-slate-500/40']">
                  <div class="flex items-center gap-1 sm:gap-2">
                    <span class="w-1 h-1 rounded-full" :class="showRoutes ? 'bg-cyan-400' : 'bg-slate-400'"></span>
                    <span class="hidden sm:inline">{{ showRoutes ? 'Hide Routes' : 'Show Routes' }}</span>
                    <span class="sm:hidden">{{ showRoutes ? 'Hide' : 'Show' }}</span>
                  </div>
                </button>
                <button
                  @click="toggleHeatmap"
                  :class="['px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-full border transition-colors duration-200', showHeatmap ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/20 hover:border-red-500/40' : 'bg-slate-500/20 hover:bg-slate-500/30 text-slate-300 border-slate-500/20 hover:border-slate-500/40']">
                  <div class="flex items-center gap-1 sm:gap-2">
                    <span class="w-1 h-1 rounded-full" :class="showHeatmap ? 'bg-red-400' : 'bg-slate-400'"></span>
                    <span class="hidden sm:inline">{{ showHeatmap ? 'Hide Heatmap' : 'Show Heatmap' }}</span>
                    <span class="sm:hidden">{{ showHeatmap ? 'Hide' : 'Show' }}</span>
                  </div>
                </button>
              </div>
            </div>
            <div class="relative w-full h-[350px] sm:h-[400px] md:h-[500px] lg:h-[550px] bg-slate-900/50 rounded-lg overflow-hidden border border-cyan-500/10">
              <div v-if="selectedDestination" class="absolute top-2 left-2 z-[1000] bg-slate-900/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-cyan-500/20 text-xs text-cyan-300">
                <div class="font-semibold">Destination Selected</div>
                <div class="text-slate-400">{{ aiRoutes.length }} route{{ aiRoutes.length !== 1 ? 's' : '' }} analyzed</div>
              </div>
              <ClientOnly>
                <CrimeMap ref="mapRef" />
                <template #fallback>
                  <div class="absolute inset-0 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
                    <div class="flex flex-col items-center gap-3">
                      <div class="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                      <span class="text-sm text-slate-400">Loading map...</span>
                    </div>
                  </div>
                </template>
              </ClientOnly>
            </div>
          </div>
        </div>

        <!-- Right Sidebar: Route Analysis and Routes -->
        <div class="lg:col-span-5 xl:col-span-4 space-y-4 sm:space-y-5 md:space-y-6">
          <!-- Route Analysis Card -->
          <RouteAnalysis
            :route-index="selectedRouteIndex"
            :route="selectedRouteIndex !== null ? aiRoutes[selectedRouteIndex] : null"
            :all-routes="aiRoutes"
          />

          <!-- AI-Powered Safe Route Recommendations -->
          <div class="relative group">
            <div class="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div class="relative bg-slate-900/80 backdrop-blur-lg rounded-lg p-3 sm:p-4 md:p-6 border border-cyan-500/10">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-base sm:text-lg md:text-xl font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">AI Safe Routes</h2>
                <button 
                  v-if="aiRoutes.length > 0"
                  @click="clearRouteSelection"
                  class="text-xs text-slate-400 hover:text-cyan-400 transition-colors px-2 py-1 rounded-lg border border-slate-700/50 hover:border-cyan-500/30"
                >
                  Clear
                </button>
              </div>
              
              <div v-if="analyzing" class="py-8 text-center">
                <div class="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <span class="text-sm text-slate-400">AI analyzing routes...</span>
              </div>
              <div v-else-if="aiRoutes.length === 0" class="py-8 text-center">
                <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30">
                  <svg class="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <p class="text-sm text-slate-400">Click on map to select destination</p>
              </div>
              <div v-else class="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                <div 
                  v-for="(route, idx) in aiRoutes" 
                  :key="idx" 
                  @click="selectRoute(idx)"
                  class="group/item p-4 rounded-lg border transition-all duration-200 cursor-pointer fade-in-up"
                  :class="{
                    'bg-cyan-900/30 border-cyan-500/40 shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-500/20': selectedRouteIndex === idx,
                    'bg-cyan-900/20 border-cyan-900/30 hover:bg-cyan-900/30 hover:border-cyan-500/20': selectedRouteIndex !== idx
                  }"
                  :style="`animation-delay: ${idx * 0.1}s;`"
                >
                  <div class="flex items-start justify-between mb-2">
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                      <span 
                        class="w-2.5 h-2.5 rounded-full shadow-lg flex-shrink-0"
                        :class="{
                          'bg-green-500 shadow-green-500/30': route.riskScore <= 20,
                          'bg-yellow-500 shadow-yellow-500/30': route.riskScore > 20 && route.riskScore <= 50,
                          'bg-orange-500 shadow-orange-500/30': route.riskScore > 50
                        }"
                      ></span>
                      <span class="text-sm font-semibold text-cyan-200">Route {{ idx + 1 }}</span>
                    </div>
                    <span 
                      class="text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0"
                      :class="{
                        'text-green-300 bg-green-950/50': route.riskScore <= 20,
                        'text-yellow-300 bg-yellow-950/50': route.riskScore > 20 && route.riskScore <= 50,
                        'text-orange-300 bg-orange-950/50': route.riskScore > 50
                      }"
                    >
                      {{ route.riskScore }}% risk
                    </span>
                  </div>
                  <p class="text-xs text-slate-300 mb-3 leading-relaxed">{{ route.reasoning }}</p>
                  <div class="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/30">
                    <span class="flex items-center gap-1">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {{ (route.distance / 1000).toFixed(1) }} km
                    </span>
                    <span class="flex items-center gap-1">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      ~{{ route.estimatedTime }} min
                    </span>
                    <span v-if="route.hotspotsAvoided > 0" class="text-green-400 flex items-center gap-1">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Avoids {{ route.hotspotsAvoided }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Section: Crime Analysis and Recent Reports -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 md:gap-6 mb-4 sm:mb-6 md:mb-8">
        <!-- Crime Analysis (Left) -->
        <div class="lg:col-span-7 xl:col-span-8 relative group">
          <div class="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div class="relative bg-slate-900/80 backdrop-blur-lg rounded-lg p-3 sm:p-4 md:p-6 border border-cyan-500/10">
            <div class="flex items-center justify-between mb-4 sm:mb-5 md:mb-6">
              <h2 class="text-base sm:text-lg md:text-xl font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Crime Analysis</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Crime Types -->
              <div>
                <h3 class="text-sm font-semibold text-slate-400 mb-3">Crime Types</h3>
                <div v-if="pending" class="py-4 text-center">
                  <div class="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <span class="text-xs text-slate-400">Loading...</span>
                </div>
                <div v-else-if="crimeTypes.length === 0" class="py-4 text-center">
                  <span class="text-xs text-slate-400">No crime types data available</span>
                </div>
                <div v-else class="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                  <div 
                    v-for="(type, idx) in crimeTypes" 
                    :key="type.name" 
                    class="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/30 hover:border-cyan-500/20 transition-colors duration-200 fade-in-up"
                    :style="`animation-delay: ${idx * 0.05}s;`"
                  >
                    <span class="text-sm text-slate-300 font-medium">{{ type.name }}</span>
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-semibold" :class="type.trend === 'up' ? 'text-red-400' : type.trend === 'down' ? 'text-green-400' : 'text-slate-400'">
                        {{ type.count }}
                      </span>
                      <span v-if="type.trend === 'up'" class="text-red-400 text-xs">↑</span>
                      <span v-else-if="type.trend === 'down'" class="text-green-400 text-xs">↓</span>
                      <span v-else class="text-slate-500 text-xs">→</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- High Risk Areas -->
              <div>
                <h3 class="text-sm font-semibold text-slate-400 mb-3">High Risk Areas</h3>
                <div v-if="pending" class="py-4 text-center">
                  <div class="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <span class="text-xs text-slate-400">Analyzing...</span>
                </div>
                <div v-else-if="highRiskAreas.length === 0" class="py-4 text-center">
                  <span class="text-xs text-slate-400">No high-risk areas identified</span>
                </div>
                <div v-else class="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                  <div 
                    v-for="(area, idx) in highRiskAreas" 
                    :key="area.name" 
                    class="group/item flex items-center justify-between p-3 rounded-lg border transition-colors duration-200 fade-in-up"
                    :class="{
                      'bg-red-900/20 border-red-900/30 hover:bg-red-900/30': area.risk === 'high',
                      'bg-yellow-900/20 border-yellow-900/30 hover:bg-yellow-900/30': area.risk === 'medium',
                      'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/50': area.risk === 'low'
                    }"
                    :style="`animation-delay: ${idx * 0.1}s;`"
                  >
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                      <span 
                        class="w-2 h-2 rounded-full shadow-lg flex-shrink-0"
                        :class="{
                          'bg-red-500 shadow-red-500/30': area.risk === 'high',
                          'bg-yellow-500 shadow-yellow-500/30': area.risk === 'medium',
                          'bg-green-500 shadow-green-500/30': area.risk === 'low'
                        }"
                      ></span>
                      <span 
                        class="text-sm truncate"
                        :class="{
                          'text-red-200': area.risk === 'high',
                          'text-yellow-200': area.risk === 'medium',
                          'text-slate-300': area.risk === 'low'
                        }"
                      >{{ area.name }}</span>
                    </div>
                    <span 
                      class="text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 group-hover/item:opacity-80 transition-opacity"
                      :class="{
                        'text-red-300 bg-red-950/50': area.risk === 'high',
                        'text-yellow-300 bg-yellow-950/50': area.risk === 'medium',
                        'text-green-300 bg-green-950/50': area.risk === 'low'
                      }"
                    >
                      {{ area.incidents }} {{ area.incidents === 1 ? 'incident' : 'incidents' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Reports (Right - Aligned with Route Cards) -->
        <div class="lg:col-span-5 xl:col-span-4 relative group fade-in-up" style="animation-delay: 0.4s;">
          <div class="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div class="relative bg-slate-900/80 backdrop-blur-lg rounded-lg p-3 sm:p-4 md:p-6 border border-cyan-500/10 w-full">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-base sm:text-lg md:text-xl font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Recent Reports</h2>
            </div>
            
            <div v-if="pending" class="flex items-center justify-center py-12">
              <div class="flex flex-col items-center gap-3">
                <div class="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <span class="text-sm text-slate-400">Loading hotspot data...</span>
              </div>
            </div>
            <div v-else-if="error" class="text-center py-12">
              <p class="text-red-400">Failed to load hotspot data</p>
            </div>
            <div v-else-if="recentReports.length === 0" class="text-center py-12">
              <p class="text-slate-400">No recent reports available</p>
            </div>
            <div v-else class="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
              <div 
                v-for="(report, idx) in recentReports" 
                :key="report.id || idx"
                class="group/card relative bg-slate-800/50 rounded-lg p-3 sm:p-4 border border-slate-700/30 hover:border-cyan-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/10 fade-in-up"
                :style="`animation-delay: ${0.5 + idx * 0.1}s;`"
              >
                <div class="flex items-start justify-between mb-2 gap-2">
                  <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-sm text-slate-200 group-hover/card:text-white transition-colors duration-200 mb-1 line-clamp-1 break-words">{{ report.title }}</h3>
                    <p class="text-xs text-slate-400 line-clamp-1 break-words">{{ report.location }}</p>
                  </div>
                  <span :class="{
                    'bg-red-950/50 text-red-300 group-hover/card:bg-red-900/50': report.severity === 'High',
                    'bg-yellow-950/50 text-yellow-300 group-hover/card:bg-yellow-900/50': report.severity === 'Medium',
                    'bg-green-950/50 text-green-300 group-hover/card:bg-green-900/50': report.severity === 'Low'
                  }" class="px-2 py-1 text-xs rounded-full transition-colors duration-200 whitespace-nowrap flex-shrink-0 ml-2">
                    {{ report.severity }}
                  </span>
                </div>
                <p class="text-xs sm:text-sm text-slate-300 mb-3 line-clamp-2 leading-relaxed break-words overflow-hidden">{{ report.description }}</p>
                <div class="flex items-center justify-between text-xs gap-2 pt-2 border-t border-slate-700/30">
                  <span class="text-slate-400 flex-shrink-0">{{ report.time }}</span>
                  <span class="px-2 py-1 rounded-full bg-cyan-950/50 text-cyan-300 text-xs truncate max-w-[100px] sm:max-w-[120px]">{{ report.crimeType }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Feed Monitoring Control -->
    <ClientOnly>
      <FeedMonitoringControl />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useHotspots } from '~/composables/useHotspots'
import { useAIRouting, type AIRoute } from '~/composables/useAIRouting'
import FeedMonitoringControl from '~/components/FeedMonitoringControl.vue'
import RouteAnalysis from '~/components/RouteAnalysis.vue'

definePageMeta({
  layout: 'default'
})

const { crimeTypes, highRiskAreas, safeRoutes, hotspots, pending, error } = useHotspots()

// AI Routing
const { analyzing, aiRoutes, analyzeSafeRoutes, clearRoutes, currentLocation, selectedDestination } = useAIRouting()

// Map control state
const showRoutes = ref(true)
const showHeatmap = ref(true)
const mapRef = ref<any>(null)
const selectedRouteIndex = ref<number | null>(null)

// Map control methods
const toggleMapRoutes = () => {
  showRoutes.value = !showRoutes.value
  if (mapRef.value?.toggleRoutes) {
    mapRef.value.toggleRoutes(showRoutes.value)
  }
}

const toggleHeatmap = () => {
  showHeatmap.value = !showHeatmap.value
  if (mapRef.value?.toggleHeatmap) {
    mapRef.value.toggleHeatmap(showHeatmap.value)
  }
}

// Handle destination selection from map
async function handleDestinationSelected(lat: number, lng: number, userLat?: number, userLng?: number) {
  selectedDestination.value = { lat, lng }
  
  // Use provided user location or get from map
  const startLat = userLat || currentLocation.value?.lat || 10.5312 // Default Bago City center
  const startLng = userLng || currentLocation.value?.lng || 122.8428
  
  currentLocation.value = { lat: startLat, lng: startLng }
  
  try {
    // Analyze routes
    await analyzeSafeRoutes(startLat, startLng, lat, lng, hotspots.value)
    
    // Draw routes on map with distance and time
    if (mapRef.value?.drawAIRoutes) {
      mapRef.value.drawAIRoutes(aiRoutes.value.map(route => ({
        path: route.path,
        riskScore: route.riskScore,
        distance: route.distance,
        estimatedTime: route.estimatedTime
      })))
    }
    
    // Select first route by default (use nextTick to ensure reactivity)
    if (aiRoutes.value.length > 0) {
      await nextTick()
      console.log('[Dashboard] Auto-selecting first route, total routes:', aiRoutes.value.length)
      selectedRouteIndex.value = 0
      if (mapRef.value?.highlightRoute) {
        mapRef.value.highlightRoute(0)
      }
      // Force trigger route analysis by ensuring reactivity
      await nextTick()
      console.log('[Dashboard] First route selected, route data:', {
        routeIndex: selectedRouteIndex.value,
        route: aiRoutes.value[0],
        hasRoute: !!aiRoutes.value[0]
      })
    }
  } catch (error) {
    console.error('[Dashboard] Error analyzing routes:', error)
  }
}

// Select a route
function selectRoute(index: number) {
  // Validate that the route exists
  if (index < 0 || index >= aiRoutes.value.length) {
    console.error('[Dashboard] Invalid route index:', index, 'Total routes:', aiRoutes.value.length)
    return
  }
  
  console.log('[Dashboard] Selecting route:', index, {
    route: aiRoutes.value[index],
    totalRoutes: aiRoutes.value.length
  })
  
  selectedRouteIndex.value = index
  if (mapRef.value?.highlightRoute) {
    mapRef.value.highlightRoute(index)
  }
  
  // Ensure route analysis is triggered
  nextTick(() => {
    console.log('[Dashboard] Route selected, route data:', {
      index,
      route: aiRoutes.value[index],
      selectedRouteIndex: selectedRouteIndex.value
    })
  })
}

// Clear routes and selection
function clearRouteSelection() {
  clearRoutes()
  selectedRouteIndex.value = null
  if (mapRef.value?.clearRoutes) {
    mapRef.value.clearRoutes()
  }
}

// Setup click handler when map is ready
function setupMapClickHandler() {
  if (mapRef.value?.onDestinationClick) {
    mapRef.value.onDestinationClick(handleDestinationSelected)
  }
}

// Watch for map component to become available
watch(() => mapRef.value, () => {
  // Small delay to ensure map is initialized
  setTimeout(() => {
    setupMapClickHandler()
  }, 1000)
}, { immediate: true, flush: 'post' })

// Computed statistics from hotspot data
const totalReports = computed(() => {
  return hotspots.value.length
})

const highRiskCount = computed(() => {
  return hotspots.value.filter(h => h.properties.severity === 'High').length
})

const recentReportsCount = computed(() => {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  return hotspots.value.filter(h => {
    const reportDate = new Date(h.properties.reported_at)
    return reportDate >= todayStart
  }).length
})

const overallRiskLevel = computed(() => {
  const total = hotspots.value.length
  if (total === 0) {
    return { label: 'No Data', color: 'text-slate-400', badgeClass: 'text-slate-400 bg-slate-950/50', percentage: 0 }
  }
  
  const highCount = highRiskCount.value
  const mediumCount = hotspots.value.filter(h => h.properties.severity === 'Medium').length
  const lowCount = hotspots.value.filter(h => h.properties.severity === 'Low').length
  
  // Calculate risk percentage (weighted: High=100%, Medium=50%, Low=25%)
  const riskScore = (highCount * 100 + mediumCount * 50 + lowCount * 25) / total
  const percentage = Math.round(riskScore)
  
  if (percentage >= 70) {
    return { label: 'High', color: 'text-red-400', badgeClass: 'text-red-400 bg-red-950/50', percentage }
  } else if (percentage >= 40) {
    return { label: 'Moderate', color: 'text-yellow-400', badgeClass: 'text-yellow-400 bg-yellow-950/50', percentage }
  } else {
    return { label: 'Low', color: 'text-green-400', badgeClass: 'text-green-400 bg-green-950/50', percentage }
  }
})

// Recent reports from hotspot data
const recentReports = computed(() => {
  // Sort by reported_at date (most recent first) and take the 6 most recent
  const sorted = [...hotspots.value].sort((a, b) => {
    const dateA = new Date(a.properties.reported_at).getTime()
    const dateB = new Date(b.properties.reported_at).getTime()
    return dateB - dateA
  })
  
  return sorted.slice(0, 6).map(hotspot => {
    const reportDate = new Date(hotspot.properties.reported_at)
    const now = new Date()
    const diffMs = now.getTime() - reportDate.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    let timeAgo = ''
    if (diffMins < 60) {
      timeAgo = diffMins <= 1 ? 'Just now' : `${diffMins} mins ago`
    } else if (diffHours < 24) {
      timeAgo = diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
    } else {
      timeAgo = diffDays === 1 ? '1 day ago' : `${diffDays} days ago`
    }
    
    // Extract location from note or use label
    const locationMatch = hotspot.properties.note.match(/near (.+?)[\.,]/i)
    const location = locationMatch ? locationMatch[1] : hotspot.properties.label
    
    return {
      id: hotspot.properties.id,
      title: hotspot.properties.crime_type,
      location: location,
      severity: hotspot.properties.severity as 'High' | 'Medium' | 'Low',
      description: hotspot.properties.note || `Crime incident reported at ${hotspot.properties.label}`,
      time: timeAgo,
      crimeType: hotspot.properties.crime_type,
      coordinates: hotspot.geometry.coordinates
    }
  })
})

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMins < 60) {
    return diffMins <= 1 ? 'Just now' : `${diffMins} mins ago`
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
  } else if (diffDays < 7) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}
</script>