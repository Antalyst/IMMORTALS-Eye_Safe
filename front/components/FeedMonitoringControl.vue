<template>
  <div 
    v-if="isVisible"
    class="fixed bottom-6 right-6 z-[9999] fade-in-up"
  >
    <div class="glass-strong rounded-2xl p-4 border border-cyan-500/30 shadow-2xl">
      <!-- Toggle Button -->
      <button
        @click="toggleMonitoring"
        :disabled="isToggling"
        class="flex items-center gap-3 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300"
        :class="isMonitoring 
          ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/50' 
          : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'"
      >
        <div class="w-3 h-3 rounded-full" :class="isMonitoring ? 'bg-red-400 animate-pulse' : 'bg-cyan-400'"></div>
        <span>{{ isMonitoring ? 'Stop Monitoring' : 'Start Feed Monitoring' }}</span>
      </button>
      
      <!-- Stats (when monitoring) -->
      <div v-if="isMonitoring" class="mt-4 pt-4 border-t border-slate-700/50">
        <div class="text-xs text-slate-400 mb-2">Monitoring Stats</div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span class="text-slate-500">Posts:</span>
            <span class="ml-1 text-white font-semibold">{{ monitoringStats.totalPosts }}</span>
          </div>
          <div>
            <span class="text-slate-500">Crime:</span>
            <span class="ml-1 text-yellow-400 font-semibold">{{ monitoringStats.crimePosts }}</span>
          </div>
          <div>
            <span class="text-slate-500">Verified:</span>
            <span class="ml-1 text-green-400 font-semibold">{{ monitoringStats.verifiedPosts }}</span>
          </div>
          <div>
            <span class="text-slate-500">Fake:</span>
            <span class="ml-1 text-red-400 font-semibold">{{ monitoringStats.fakePosts }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useFeedMonitoring } from '../composables/useFeedMonitoring'

const props = defineProps<{
  isVisible?: boolean
}>()

const isVisible = ref(props.isVisible !== false)
const isToggling = ref(false)
const { isMonitoring, monitoringStats, startMonitoring, stopMonitoring } = useFeedMonitoring()

async function toggleMonitoring() {
  isToggling.value = true
  try {
    if (isMonitoring.value) {
      stopMonitoring()
    } else {
      startMonitoring()
    }
  } finally {
    isToggling.value = false
  }
}

onUnmounted(() => {
  stopMonitoring()
})
</script>

<style scoped>
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in-up {
  animation: fadeInUp 0.5s ease-out;
}
</style>

