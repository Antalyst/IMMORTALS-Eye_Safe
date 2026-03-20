<template>
  <Transition name="modal">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      @click.self="$emit('close')"
    >
      <div class="glass-strong rounded-2xl border border-cyan-500/30 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-glow-lg">
        <!-- Modal Header -->
        <div class="p-6 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <h3 class="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                <span v-if="verified" class="text-2xl">✅</span>
                <span v-else class="text-2xl">🚫</span>
                <span>Verification Details</span>
                <span
                  class="px-3 py-1 text-sm rounded-full font-semibold"
                  :class="verified ? 'bg-green-500/30 text-green-300 border border-green-500/50' : 'bg-red-500/30 text-red-300 border border-red-500/50'"
                >
                  {{ verified ? 'VERIFIED' : 'UNVERIFIED' }}
                </span>
              </h3>
              <p class="text-sm text-slate-300/80">
                Comprehensive source verification analysis with fuzzy matching results
              </p>
            </div>
            <button
              @click="$emit('close')"
              class="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Modal Content -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <!-- Credibility Score Gauge -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="glass rounded-xl p-6 border border-cyan-500/20">
              <div class="text-sm text-slate-400 mb-2">Confidence Score</div>
              <div class="text-3xl font-bold" :class="confidence > 0.7 ? 'text-green-400' : confidence > 0.4 ? 'text-yellow-400' : 'text-red-400'">
                {{ Math.round(confidence * 100) }}%
              </div>
            </div>
            <div class="glass rounded-xl p-6 border border-cyan-500/20">
              <div class="text-sm text-slate-400 mb-2">Credibility Level</div>
              <div
                class="text-2xl font-bold capitalize"
                :class="credibility === 'High' ? 'text-green-400' : credibility === 'Medium' ? 'text-yellow-400' : 'text-red-400'"
              >
                {{ credibility }}
              </div>
            </div>
            <div class="glass rounded-xl p-6 border border-cyan-500/20">
              <div class="text-sm text-slate-400 mb-2">Verification Level</div>
              <div class="text-2xl font-bold text-cyan-400">{{ verificationLevel }}</div>
            </div>
          </div>

          <!-- Official Source Match (if available) -->
          <div
            v-if="officialSourceDetails"
            class="glass rounded-xl p-6 border-2 border-green-500/50 bg-green-900/20"
          >
            <h4 class="text-lg font-bold text-green-300 mb-4 flex items-center gap-2">
              <span>✅</span>
              <span>Official Source Detected</span>
            </h4>
            <div class="space-y-3">
              <div>
                <div class="text-sm text-slate-400 mb-1">Matched Source</div>
                <div class="text-white font-semibold">{{ officialSourceDetails.matchedSource || officialSourceDetails.name }}</div>
              </div>
              
              <div v-if="officialSourceDetails.matchScore" class="flex items-center gap-4">
                <div>
                  <div class="text-sm text-slate-400 mb-1">Fuzzy Match Score</div>
                  <div class="text-2xl font-bold text-green-400">{{ officialSourceDetails.matchScore }}%</div>
                </div>
                <div>
                  <div class="text-sm text-slate-400 mb-1">Confidence</div>
                  <div class="text-lg font-semibold text-green-300 capitalize">{{ officialSourceDetails.confidence }}</div>
                </div>
              </div>

              <!-- OCR Correction Details -->
              <div v-if="officialSourceDetails.rawOCRText || officialSourceDetails.corrections?.length" class="mt-4 pt-4 border-t border-green-500/30">
                <div class="text-sm font-semibold text-green-300 mb-2">OCR Processing Details</div>
                <div class="space-y-2 text-sm">
                  <div v-if="officialSourceDetails.rawOCRText">
                    <div class="text-slate-400">Raw OCR Text:</div>
                    <div class="text-slate-200 font-mono bg-slate-900/50 p-2 rounded">{{ officialSourceDetails.rawOCRText }}</div>
                  </div>
                  <div v-if="officialSourceDetails.normalizedText">
                    <div class="text-slate-400">Normalized Text:</div>
                    <div class="text-slate-200 font-mono bg-slate-900/50 p-2 rounded">{{ officialSourceDetails.normalizedText }}</div>
                  </div>
                  <div v-if="officialSourceDetails.corrections?.length">
                    <div class="text-slate-400">OCR Corrections Applied:</div>
                    <div class="flex flex-wrap gap-2">
                      <span
                        v-for="(correction, idx) in officialSourceDetails.corrections"
                        :key="idx"
                        class="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded text-xs font-mono"
                      >
                        {{ correction }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Reasoning -->
          <div class="glass rounded-xl p-6 border border-cyan-500/20">
            <h4 class="text-lg font-bold text-cyan-300 mb-4">Verification Reasoning</h4>
            <div class="text-slate-200 whitespace-pre-wrap leading-relaxed">{{ reasoning }}</div>
          </div>

          <!-- Sources Breakdown -->
          <div class="glass rounded-xl p-6 border border-cyan-500/20">
            <h4 class="text-lg font-bold text-cyan-300 mb-4">Verification Sources</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div class="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <span class="text-slate-300">Official Sources</span>
                <span class="text-2xl font-bold text-green-400">{{ officialSourcesFound }}</span>
              </div>
              <div class="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <span class="text-slate-300">News Sources</span>
                <span class="text-2xl font-bold text-blue-400">{{ newsSourcesFound }}</span>
              </div>
            </div>
            
            <div v-if="sources.length > 0" class="space-y-2">
              <div
                v-for="(source, idx) in sources"
                :key="idx"
                class="p-3 rounded-lg border transition-colors hover:border-cyan-500/50"
                :class="{
                  'bg-green-500/10 border-green-500/30': source.type === 'official' || source.type === 'government',
                  'bg-blue-500/10 border-blue-500/30': source.type === 'news',
                  'bg-slate-800/50 border-slate-700/30': source.type === 'social'
                }"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex-1">
                    <a
                      :href="source.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-cyan-400 hover:text-cyan-300 font-semibold underline"
                    >
                      {{ source.title }}
                    </a>
                    <div class="flex items-center gap-2 mt-1">
                      <span
                        class="px-2 py-0.5 text-xs rounded-full"
                        :class="{
                          'bg-green-500/30 text-green-300': source.type === 'official' || source.type === 'government',
                          'bg-blue-500/30 text-blue-300': source.type === 'news',
                          'bg-slate-700 text-slate-300': source.type === 'social'
                        }"
                      >
                        {{ source.type }}
                      </span>
                      <span
                        class="px-2 py-0.5 text-xs rounded-full"
                        :class="{
                          'bg-green-500/30 text-green-300': source.credibility === 'High',
                          'bg-yellow-500/30 text-yellow-300': source.credibility === 'Medium',
                          'bg-red-500/30 text-red-300': source.credibility === 'Low'
                        }"
                      >
                        {{ source.credibility }} ({{ source.matchScore }}%)
                      </span>
                    </div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </div>
            </div>
            <div v-else class="text-slate-400 text-center py-4">
              No verification sources found
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  verified: boolean
  credibility: 'High' | 'Medium' | 'Low'
  confidence: number
  verificationLevel: 'Verified' | 'Unverified' | 'False'
  reasoning: string
  sources: Array<{
    title: string
    url: string
    type: 'official' | 'news' | 'social' | 'government'
    credibility: 'High' | 'Medium' | 'Low'
    matchScore: number
  }>
  officialSourcesFound: number
  newsSourcesFound: number
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
}>()

defineEmits<{
  close: []
}>()
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(6, 182, 212, 0.3) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(6, 182, 212, 0.3);
  border-radius: 3px;
}
</style>

