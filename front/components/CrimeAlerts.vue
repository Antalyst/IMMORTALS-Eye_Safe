<template>
  <div class="fixed top-4 right-4 z-50 max-w-md w-full space-y-3 pointer-events-none">
    <TransitionGroup name="alert" tag="div">
      <div
        v-for="alert in highPriorityAlerts.slice(0, 3)"
        :key="alert.id"
        class="pointer-events-auto glass-strong rounded-xl p-4 border-2 shadow-glow-lg transition-all duration-300"
        :class="{
          'border-red-500/50 bg-red-900/20': alert.priority === 'Critical',
          'border-yellow-500/50 bg-yellow-900/20': alert.priority === 'High' && !alert.verified,
          'border-green-500/50 bg-green-900/20': alert.verified && alert.credibility === 'High'
        }"
      >
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 mt-0.5">
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center"
              :class="{
                'bg-red-500/20 border border-red-500/40': alert.priority === 'Critical',
                'bg-yellow-500/20 border border-yellow-500/40': alert.priority === 'High' && !alert.verified,
                'bg-green-500/20 border border-green-500/40': alert.verified
              }"
            >
              <span class="text-2xl">
                {{ alert.priority === 'Critical' ? '🚨' : alert.verified ? '✓' : '⚠️' }}
              </span>
            </div>
          </div>
          
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span
                class="text-xs font-bold px-2 py-0.5 rounded-full"
                :class="{
                  'bg-red-500/30 text-red-200': alert.priority === 'Critical',
                  'bg-yellow-500/30 text-yellow-200': alert.priority === 'High',
                  'bg-green-500/30 text-green-200': alert.verified
                }"
              >
                {{ alert.verified ? 'VERIFIED' : 'UNVERIFIED' }}
              </span>
              <span
                class="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300"
              >
                {{ alert.priority }}
              </span>
            </div>
            
            <p class="text-sm text-white font-semibold mb-2 line-clamp-2">
              {{ alert.text.slice(0, 100) }}{{ alert.text.length > 100 ? '...' : '' }}
            </p>
            
            <div v-if="alert.crimeDetails" class="text-xs text-slate-300 mb-2 space-y-1">
              <div v-if="alert.crimeDetails.location">
                📍 <span class="font-medium">{{ alert.crimeDetails.location }}</span>
              </div>
              <div v-if="alert.crimeDetails.crimeType">
                🚔 <span class="font-medium capitalize">{{ alert.crimeDetails.crimeType }}</span>
              </div>
            </div>
            
            <div class="flex items-center gap-2 text-xs">
              <span
                class="px-2 py-0.5 rounded"
                :class="{
                  'bg-red-500/20 text-red-300': alert.credibility === 'Low',
                  'bg-yellow-500/20 text-yellow-300': alert.credibility === 'Medium',
                  'bg-green-500/20 text-green-300': alert.credibility === 'High'
                }"
              >
                {{ alert.credibility }} Credibility
              </span>
              <span class="text-slate-400">
                {{ formatTime(alert.timestamp) }}
              </span>
            </div>
            
            <div class="absolute top-2 right-2 flex items-center gap-2">
              <button
                @click="openDetails(alert)"
                class="p-1 rounded hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 transition-colors"
                title="View verification details"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                @click="dismissAlert(alert.id)"
                class="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Dismiss alert"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div v-if="alert.sources.length > 0" class="mt-3 pt-3 border-t border-slate-700/50">
          <div class="text-xs text-slate-400 mb-1">
            {{ alert.sources.length }} source(s) found:
          </div>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="(source, idx) in alert.sources.slice(0, 3)"
              :key="idx"
              class="text-xs px-2 py-0.5 rounded"
              :class="{
                'bg-green-500/20 text-green-300': source.type === 'official' || source.type === 'government',
                'bg-blue-500/20 text-blue-300': source.type === 'news',
                'bg-gray-500/20 text-gray-300': source.type === 'social'
              }"
            >
              {{ source.type }}
            </span>
          </div>
        </div>
      </div>
    </TransitionGroup>
    <div
      v-if="verificationStats.totalAlerts > 0"
      class="pointer-events-auto glass-strong rounded-lg p-3 border border-cyan-500/30 bg-cyan-900/10"
    >
      <div class="text-xs text-cyan-300 font-semibold mb-2">Verification Stats</div>
      <div class="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div class="text-slate-400">Total</div>
          <div class="text-white font-bold">{{ verificationStats.totalAlerts }}</div>
        </div>
        <div>
          <div class="text-slate-400">Verified</div>
          <div class="text-green-400 font-bold">{{ verificationStats.totalVerified }}</div>
        </div>
        <div>
          <div class="text-slate-400">Critical</div>
          <div class="text-red-400 font-bold">{{ verificationStats.criticalAlerts }}</div>
        </div>
      </div>
    </div>
    <VerificationDetailsModal
      v-if="selectedAlert"
      :show="showDetailsModal"
      :verified="selectedAlert.verified"
      :credibility="selectedAlert.credibility"
      :confidence="selectedAlert.confidence || 0.8"
      :verification-level="selectedAlert.verified ? 'Verified' : 'Unverified'"
      :reasoning="selectedAlert.reasoning"
      :sources="selectedAlert.sources || []"
      :official-sources-found="selectedAlert.sources?.filter((s: any) => s.type === 'official' || s.type === 'government').length || 0"
      :news-sources-found="selectedAlert.sources?.filter((s: any) => s.type === 'news').length || 0"
      :official-source-details="selectedAlert.officialSourceDetails"
      @close="closeDetails"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCrimeVerification } from '../composables/useCrimeVerification'
import VerificationDetailsModal from './VerificationDetailsModal.vue'

const { highPriorityAlerts, verificationStats, removeAlert } = useCrimeVerification()
const showDetailsModal = ref(false)
const selectedAlert = ref<any>(null)

function openDetails(alert: any) {
  selectedAlert.value = alert
  showDetailsModal.value = true
}

function closeDetails() {
  showDetailsModal.value = false
  selectedAlert.value = null
}

function formatTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  
  if (minutes < 1) return 'Just now'
  if (minutes === 1) return '1 min ago'
  if (minutes < 60) return `${minutes} mins ago`
  
  const hours = Math.floor(minutes / 60)
  if (hours === 1) return '1 hour ago'
  if (hours < 24) return `${hours} hours ago`
  
  return date.toLocaleDateString()
}

function dismissAlert(id: string) {
  removeAlert(id)
}
</script>

<style scoped>
.alert-enter-active,
.alert-leave-active {
  transition: all 0.3s ease;
}

.alert-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.alert-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>

