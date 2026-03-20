<template>
  <div class="space-y-6 w-full max-h-[100vh] overflow-y-auto custom-scrollbar">
    
    <!-- Analysis Overview Charts -->
    <div v-if="totalResults > 0" class="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
      <div class="card-3d card-glow glass-strong rounded-2xl p-6 border border-cyan-500/20 transition-all duration-300 hover:scale-105">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-2 h-2 bg-cyan-400 rounded-full pulse-ai"></div>
          <h3 class="text-base font-bold text-white">Truthfulness Distribution</h3>
        </div>
        <div class="space-y-4">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-slate-300 font-medium">True</span>
              <span class="text-sm font-bold text-green-400">{{ truthfulnessCount.True }}</span>
            </div>
            <div class="w-full bg-slate-800/50 rounded-full h-3 overflow-hidden border border-green-500/20">
              <div 
                class="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all duration-500 ease-out relative"
                :style="{ width: `${(truthfulnessCount.True / totalResults) * 100}%` }"
              >
                <div class="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
              </div>
            </div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-slate-300 font-medium">False</span>
              <span class="text-sm font-bold text-red-400">{{ truthfulnessCount.False }}</span>
            </div>
            <div class="w-full bg-slate-800/50 rounded-full h-3 overflow-hidden border border-red-500/20">
              <div 
                class="bg-gradient-to-r from-red-500 to-rose-600 h-3 rounded-full transition-all duration-500 ease-out relative"
                :style="{ width: `${(truthfulnessCount.False / totalResults) * 100}%` }"
              >
                <div class="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
              </div>
            </div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-slate-300 font-medium">Unverified</span>
              <span class="text-sm font-bold text-yellow-400">{{ truthfulnessCount.Unverified }}</span>
            </div>
            <div class="w-full bg-slate-800/50 rounded-full h-3 overflow-hidden border border-yellow-500/20">
              <div 
                class="bg-gradient-to-r from-yellow-400 to-amber-500 h-3 rounded-full transition-all duration-500 ease-out relative"
                :style="{ width: `${(truthfulnessCount.Unverified / totalResults) * 100}%` }"
              >
                <div class="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Panic Risk Distribution -->
      <div class="card-3d card-glow glass-strong rounded-2xl p-6 border border-purple-500/20 transition-all duration-300 hover:scale-105">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-2 h-2 bg-purple-400 rounded-full pulse-ai"></div>
          <h3 class="text-base font-bold text-white">Panic Risk Distribution</h3>
        </div>
        <div class="space-y-4">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-slate-300 font-medium">High</span>
              <span class="text-sm font-bold text-red-400">{{ panicRiskCount.High }}</span>
            </div>
            <div class="w-full bg-slate-800/50 rounded-full h-3 overflow-hidden border border-red-500/20">
              <div 
                class="bg-gradient-to-r from-red-500 to-rose-600 h-3 rounded-full transition-all duration-500 ease-out relative"
                :style="{ width: `${(panicRiskCount.High / totalResults) * 100}%` }"
              >
                <div class="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
              </div>
            </div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-slate-300 font-medium">Moderate</span>
              <span class="text-sm font-bold text-yellow-400">{{ panicRiskCount.Moderate }}</span>
            </div>
            <div class="w-full bg-slate-800/50 rounded-full h-3 overflow-hidden border border-yellow-500/20">
              <div 
                class="bg-gradient-to-r from-yellow-400 to-amber-500 h-3 rounded-full transition-all duration-500 ease-out relative"
                :style="{ width: `${(panicRiskCount.Moderate / totalResults) * 100}%` }"
              >
                <div class="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
              </div>
            </div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-slate-300 font-medium">Low</span>
              <span class="text-sm font-bold text-green-400">{{ panicRiskCount.Low }}</span>
            </div>
            <div class="w-full bg-slate-800/50 rounded-full h-3 overflow-hidden border border-green-500/20">
              <div 
                class="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all duration-500 ease-out relative"
                :style="{ width: `${(panicRiskCount.Low / totalResults) * 100}%` }"
              >
                <div class="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="card-3d card-glow glass-strong rounded-2xl p-6 border border-blue-500/20 transition-all duration-300 hover:scale-105">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-2 h-2 bg-blue-400 rounded-full pulse-ai"></div>
          <h3 class="text-base font-bold text-white">Overall Risk Score</h3>
        </div>
        <div class="flex items-center justify-center mb-4">
          <div class="relative w-36 h-36">
            <svg class="transform -rotate-90 w-36 h-36 filter drop-shadow-lg">
              <defs>
                <linearGradient :id="`gradient-risk-${overallRiskScore}`" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" v-bind:style="gradientStartStyle" />
                  <stop offset="100%" v-bind:style="gradientEndStyle" />
                </linearGradient>
              </defs>
              <circle
                cx="72"
                cy="72"
                r="64"
                stroke="currentColor"
                stroke-width="6"
                fill="transparent"
                class="text-slate-700/50"
              />
              <circle
                cx="72"
                cy="72"
                r="64"
                :stroke="`url(#gradient-risk-${overallRiskScore})`"
                stroke-width="8"
                fill="transparent"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="circumference - (overallRiskScore / 100) * circumference"
                class="transition-all duration-1000 ease-out"
                stroke-linecap="round"
              />
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="text-center">
                <span class="text-3xl font-bold block" :class="overallRiskScore > 70 ? 'text-red-400' : overallRiskScore > 40 ? 'text-yellow-400' : 'text-green-400'">
                  {{ overallRiskScore }}%
                </span>
              </div>
            </div>
          </div>
        </div>
        <p class="text-sm text-center font-semibold" :class="overallRiskScore > 70 ? 'text-red-400' : overallRiskScore > 40 ? 'text-yellow-400' : 'text-green-400'">
          {{ overallRiskScore > 70 ? 'High Risk' : overallRiskScore > 40 ? 'Moderate Risk' : 'Low Risk' }}
        </p>
      </div>
    </div>

    <!-- AI Analysis Overview -->
    <div v-if="totalResults > 0" class="glass-strong rounded-2xl p-8 border border-cyan-500/20 w-full">
      <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-3">
        <div class="w-2 h-2 bg-cyan-400 rounded-full pulse-ai"></div>
        <span class="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent font-tech">AI Analysis Methodology</span>
      </h3>
      <div class="prose prose-invert max-w-none">
        <div class="glass rounded-xl p-6 border border-cyan-500/20">
          <p class="text-slate-300 leading-relaxed mb-4">
            Our advanced AI system employs a multi-layered approach to analyze and verify content in real-time. The process combines optical character recognition, machine learning analysis, internet verification, and risk assessment to provide comprehensive content evaluation.
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div class="text-center">
              <div class="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 mx-auto mb-2">
                <span class="text-lg font-bold text-cyan-400">1</span>
              </div>
              <h4 class="font-semibold text-cyan-300 mb-1">OCR Extraction</h4>
              <p class="text-xs text-slate-400">Tesseract.js extracts text from screenshots using optical character recognition technology.</p>
            </div>
            <div class="text-center">
              <div class="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30 mx-auto mb-2">
                <span class="text-lg font-bold text-blue-400">2</span>
              </div>
              <h4 class="font-semibold text-blue-300 mb-1">AI Analysis</h4>
              <p class="text-xs text-slate-400">MobileBERT and DistilBERT models analyze content for accuracy and emotional impact.</p>
            </div>
            <div class="text-center">
              <div class="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30 mx-auto mb-2">
                <span class="text-lg font-bold text-purple-400">3</span>
              </div>
              <h4 class="font-semibold text-purple-300 mb-1">Internet Verification</h4>
              <p class="text-xs text-slate-400">Content is cross-referenced with internet sources to verify claims and detect misinformation.</p>
            </div>
            <div class="text-center">
              <div class="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center border border-green-500/30 mx-auto mb-2">
                <span class="text-lg font-bold text-green-400">4</span>
              </div>
              <h4 class="font-semibold text-green-300 mb-1">Risk Assessment</h4>
              <p class="text-xs text-slate-400">Enhanced panic detection flags disaster-related content that could cause social panic.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
      <!-- High-Risk Alerts -->
    <div v-if="results.highRiskAlerts.length > 0" class="glass-strong rounded-2xl p-8 border-2 border-red-500/30 bg-red-900/10 w-full">
      <h3 class="text-xl font-bold text-red-300 mb-6 flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center border border-red-500/40 pulse-ai">
          <span class="text-2xl">⚠️</span>
        </div>
        <span class="bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent font-tech">High-Risk Alerts ({{ results.highRiskAlerts.length }})</span>
      </h3>
      <div class="space-y-6">
        <div
          v-for="(alert, idx) in results.highRiskAlerts"
          :key="idx"
          class="glass rounded-xl p-6 shadow-sm border-l-4 border-red-500 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/20 w-full"
        >
          <!-- Two Column Layout -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- First Column: Image -->
            <div class="flex flex-col items-center justify-center">
              <img 
                v-if="alert.screenshot" 
                :src="alert.screenshot" 
                alt="Analyzed content screenshot"
                class="w-full rounded-lg border border-gray-700 max-h-80 object-contain bg-gray-900/30"
              />
              <div class="mt-4 text-center">
                <div class="text-slate-200 mb-3 leading-relaxed break-words text-sm">
                  <p class="whitespace-pre-wrap font-medium">{{ alert.text }}</p>
                </div>
                <div class="flex flex-wrap gap-2 justify-center">
                  <span 
                    class="px-3 py-1.5 rounded-full text-xs font-semibold"
                    :class="alert.truthfulness === 'True' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : alert.truthfulness === 'False' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'"
                  >
                    Truth: {{ alert.truthfulness }} ({{ (alert.truthfulnessScore * 100).toFixed(0) }}%)
                  </span>
                  <span 
                    class="px-3 py-1.5 rounded-full text-xs font-semibold"
                    :class="alert.panicRisk === 'High' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : alert.panicRisk === 'Moderate' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 'bg-green-500/20 text-green-300 border border-green-500/30'"
                  >
                    Panic Risk: {{ alert.panicRisk }} ({{ (alert.panicScore * 100).toFixed(0) }}%)
                  </span>
                </div>
              </div>
            </div>
            
            <!-- Second Column: Consolidated AI Reasoning -->
            <div v-if="alert.reasoning" class="space-y-4">
              <div class="glass-strong rounded-xl p-6 border border-cyan-500/20">
                <h4 class="text-lg font-bold text-cyan-300 mb-4 flex items-center gap-2">
                  <div class="w-2 h-2 bg-cyan-400 rounded-full pulse-ai"></div>
                  AI Analysis Report
                </h4>
                
                <div class="space-y-4 text-sm">
                  <!-- Truthfulness Analysis -->
                  <div class="bg-gray-900/30 rounded-lg p-4 border-l-4 border-cyan-600">
                    <div class="font-semibold text-cyan-200 mb-2 flex items-center gap-2">
                      <span>🧠</span>
                      <span>Truthfulness Analysis</span>
                    </div>
                    <p class="text-cyan-100 whitespace-pre-wrap break-words leading-relaxed">{{ alert.reasoning?.truthfulnessReasoning }}</p>
                    <div class="mt-2 text-cyan-200 text-xs">
                      Model: {{ alert.reasoning?.modelInfo?.truthfulnessModel }}
                    </div>
                  </div>
                  
                  <!-- Internet Fact-Check Results -->
                  <div v-if="alert.reasoning?.factCheck" class="bg-gray-900/30 rounded-lg p-4 border-l-4 border-orange-500">
                    <div class="font-semibold text-orange-200 mb-2 flex items-center gap-2">
                      <span>🌐</span>
                      <span>Internet Verification</span>
                      <span 
                        class="px-2 py-0.5 rounded text-xs"
                        :class="alert.reasoning.factCheck?.verified ? 'bg-green-700 text-green-100' : 'bg-red-700 text-red-100'"
                      >
                        {{ alert.reasoning.factCheck?.verified ? 'Verified' : 'Unverified' }}
                      </span>
                    </div>
                    <p class="text-orange-200 mb-3 whitespace-pre-wrap break-words leading-relaxed">{{ alert.reasoning.factCheck?.reasoning }}</p>
                    
                    <div class="mb-3">
                      <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-semibold text-orange-300">Confidence Score</span>
                        <span 
                          class="text-xs font-bold"
                          :class="alert.reasoning.factCheck?.confidence && alert.reasoning.factCheck.confidence > 0.7 ? 'text-green-400' : alert.reasoning.factCheck?.confidence && alert.reasoning.factCheck.confidence > 0.5 ? 'text-yellow-400' : 'text-red-400'"
                        >
                          {{ (alert.reasoning.factCheck?.confidence ? (alert.reasoning.factCheck.confidence * 100).toFixed(1) : '0.0') }}%
                        </span>
                      </div>
                      <div class="w-full bg-slate-900/50 rounded-full h-3 overflow-hidden border border-slate-700">
                        <div 
                          class="h-3 rounded-full transition-all duration-500 ease-out"
                          :class="alert.reasoning.factCheck?.confidence && alert.reasoning.factCheck.confidence > 0.7 ? 'bg-gradient-to-r from-green-500 to-emerald-600' : alert.reasoning.factCheck?.confidence && alert.reasoning.factCheck.confidence > 0.5 ? 'bg-gradient-to-r from-yellow-500 to-amber-600' : 'bg-gradient-to-r from-red-500 to-rose-600'"
                          :style="{ width: `${alert.reasoning.factCheck?.confidence ? alert.reasoning.factCheck.confidence * 100 : 0}%` }"
                        ></div>
                      </div>
                    </div>
                    
                    <div v-if="alert.reasoning.factCheck?.sources && alert.reasoning.factCheck.sources.length > 0" class="mt-3">
                      <div class="font-semibold text-orange-300 mb-2 text-xs">📚 Sources:</div>
                      <div class="space-y-1">
                        <a 
                          v-for="(source, idx) in alert.reasoning.factCheck.sources" 
                          :key="idx"
                          :href="source.url" 
                          target="_blank"
                          rel="noopener noreferrer"
                          class="block text-orange-400 hover:text-orange-300 hover:underline text-xs"
                        >
                          • {{ source.title }}
                        </a>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Panic Risk Analysis -->
                  <div class="bg-gray-900/30 rounded-lg p-4 border-l-4 border-purple-400">
                    <div class="font-semibold text-purple-200 mb-2 flex items-center gap-2">
                      <span>💭</span>
                      <span>Panic Risk Assessment</span>
                    </div>
                    <p class="text-purple-200 whitespace-pre-wrap break-words leading-relaxed">{{ alert.reasoning?.panicReasoning }}</p>
                    <div class="mt-2 text-purple-300 text-xs">
                      Model: {{ alert.reasoning?.modelInfo?.sentimentModel }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
      <!-- Verified / Low-Risk Content -->
    <div v-if="results.verifiedLowRisk.length > 0" class="glass-strong rounded-2xl p-8 border border-green-500/30 bg-green-900/10 w-full">
      <h3 class="text-xl font-bold text-green-300 mb-6 flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center border border-green-500/40 pulse-ai">
          <span class="text-2xl">✓</span>
        </div>
        <span class="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent font-tech">Verified / Low-Risk Content ({{ results.verifiedLowRisk.length }})</span>
      </h3>

      <div class="space-y-6 w-full">
        <div
          v-for="(content, idx) in results.verifiedLowRisk"
          :key="idx"
          class="glass rounded-xl p-6 shadow-sm border-l-4 border-green-500 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-green-500/20 w-full"
        >
          <!-- Two Column Layout -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- First Column: Image -->
            <div class="flex flex-col items-center justify-center">
              <img 
                v-if="content.screenshot" 
                :src="content.screenshot" 
                alt="Analyzed content screenshot"
                class="w-full rounded-lg border border-gray-700 max-h-80 object-contain bg-gray-900/30"
              />
              <div class="mt-4 text-center">
                <div class="flex flex-wrap gap-2 justify-center">
                  <span 
                    class="px-3 py-1.5 rounded-full text-xs font-semibold"
                    :class="content.truthfulness === 'True' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : content.truthfulness === 'False' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'"
                  >
                    Truth: {{ content.truthfulness }} ({{ (content.truthfulnessScore * 100).toFixed(0) }}%)
                  </span>
                  <span 
                    class="px-3 py-1.5 rounded-full text-xs font-semibold"
                    :class="content.panicRisk === 'High' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : content.panicRisk === 'Moderate' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 'bg-green-500/20 text-green-300 border border-green-500/30'"
                  >
                    Panic Risk: {{ content.panicRisk }} ({{ (content.panicScore * 100).toFixed(0) }}%)
                  </span>
                </div>
              </div>
            </div>
            
            <!-- Second Column: Consolidated AI Reasoning -->
            <div v-if="content.reasoning" class="space-y-4">
              <div class="glass-strong rounded-xl p-6 border border-cyan-500/20">
                <h4 class="text-lg font-bold text-cyan-300 mb-4 flex items-center gap-2">
                  <div class="w-2 h-2 bg-cyan-400 rounded-full pulse-ai"></div>
                  AI Analysis Report
                </h4>
                
                <div class="space-y-4 text-sm">
                  <!-- Truthfulness Analysis -->
                  <div class="bg-gray-900/30 rounded-lg p-4 border-l-4 border-cyan-600">
                    <div class="font-semibold text-cyan-200 mb-2 flex items-center gap-2">
                      <span>🧠</span>
                      <span>Truthfulness Analysis</span>
                    </div>
                    <p class="text-cyan-100 whitespace-pre-wrap break-words leading-relaxed">{{ content.reasoning?.truthfulnessReasoning }}</p>
                    <div class="mt-2 text-cyan-200 text-xs">
                      Model: {{ content.reasoning?.modelInfo?.truthfulnessModel }}
                    </div>
                  </div>
                  
                  <!-- Panic Risk Analysis -->
                  <div class="bg-gray-900/30 rounded-lg p-4 border-l-4 border-purple-400">
                    <div class="font-semibold text-purple-200 mb-2 flex items-center gap-2">
                      <span>💭</span>
                      <span>Panic Risk Assessment</span>
                    </div>
                    <p class="text-purple-200 whitespace-pre-wrap break-words leading-relaxed">{{ content.reasoning?.panicReasoning }}</p>
                    <div class="mt-2 text-purple-300 text-xs">
                      Model: {{ content.reasoning?.modelInfo?.sentimentModel }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="totalResults === 0" class="text-center py-16 glass rounded-2xl border border-cyan-500/20">
      <div class="flex flex-col items-center gap-4">
        <div class="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30">
          <svg class="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-slate-400 text-lg font-medium">No content analyzed yet. Start screen sharing to scan.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SegregatedResults, ContentAnalysis } from '../composables/useVeritasScan'

const props = defineProps<{
  results: SegregatedResults
}>()

const totalResults = computed(() => props.results.highRiskAlerts.length + props.results.verifiedLowRisk.length)

const truthfulnessCount = computed(() => {
  const all: ContentAnalysis[] = [...props.results.highRiskAlerts, ...props.results.verifiedLowRisk]
  return {
    True: all.filter(a => a.truthfulness === 'True').length,
    False: all.filter(a => a.truthfulness === 'False').length,
    Unverified: all.filter(a => a.truthfulness === 'Unverified').length
  }
})

const panicRiskCount = computed(() => {
  const all: ContentAnalysis[] = [...props.results.highRiskAlerts, ...props.results.verifiedLowRisk]
  return {
    High: all.filter(a => a.panicRisk === 'High').length,
    Moderate: all.filter(a => a.panicRisk === 'Moderate').length,
    Low: all.filter(a => a.panicRisk === 'Low').length
  }
})

const overallRiskScore = computed(() => {
  if (totalResults.value === 0) return 0
  const all: ContentAnalysis[] = [...props.results.highRiskAlerts, ...props.results.verifiedLowRisk]
  const falseCount = all.filter(a => a.truthfulness === 'False').length
  const highPanicCount = all.filter(a => a.panicRisk === 'High').length
  const moderatePanicCount = all.filter(a => a.panicRisk === 'Moderate').length
  
  const riskScore = ((falseCount * 50 + highPanicCount * 40 + moderatePanicCount * 20) / totalResults.value)
  return Math.round(Math.min(100, Math.max(0, riskScore)))
})

const circumference = computed(() => 2 * Math.PI * 64) 

const gradientStartColor = computed(() => {
  if (overallRiskScore.value > 70) return 'rgb(248,113,113)'
  if (overallRiskScore.value > 40) return 'rgb(251,191,36)'
  return 'rgb(74,222,128)'
})

const gradientEndColor = computed(() => {
  if (overallRiskScore.value > 70) return 'rgb(225,29,72)'
  if (overallRiskScore.value > 40) return 'rgb(245,158,11)'
  return 'rgb(34,197,94)'
})

const gradientStartStyle = computed(() => ({ stopColor: gradientStartColor.value }))
const gradientEndStyle = computed(() => ({ stopColor: gradientEndColor.value }))
</script>
