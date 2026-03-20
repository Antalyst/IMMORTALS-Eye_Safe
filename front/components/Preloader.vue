<template>
  <Transition
    enter-active-class="transition-opacity duration-1000 ease-out"
    enter-from-class="opacity-100"
    enter-to-class="opacity-0"
    leave-active-class="transition-opacity duration-500 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
    @after-leave="onAfterLeave"
  >
    <div
      v-if="isVisible"
      class="preloader-container fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
    >
      <!-- Animated Background -->
      <div class="absolute inset-0 overflow-hidden">
        <!-- Gradient Orbs -->
        <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full mix-blend-screen filter blur-[120px] animate-blob-slow"></div>
        <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full mix-blend-screen filter blur-[120px] animate-blob-slow animation-delay-2000"></div>
        
        <!-- Particle Field -->
        <div
          v-for="i in 50"
          :key="`particle-${i}`"
          class="absolute rounded-full bg-cyan-400/30"
          :style="{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${Math.random() * 4 + 2}px`,
            height: `${Math.random() * 4 + 2}px`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${Math.random() * 3 + 2}s`,
          }"
          :class="['particle-float']"
        ></div>
      </div>

      <!-- Neural Orb Center -->
      <div class="relative z-10 flex flex-col items-center gap-8">
        <!-- Main Neural Orb -->
        <div class="neural-orb-container">
          <div class="neural-orb">
            <!-- Outer Rings -->
            <div class="orb-ring orb-ring-1"></div>
            <div class="orb-ring orb-ring-2"></div>
            <div class="orb-ring orb-ring-3"></div>
            
            <!-- Core -->
            <div class="orb-core">
              <!-- Neural Network Nodes -->
              <div
                v-for="i in 12"
                :key="`node-${i}`"
                class="neural-node"
                :style="{
                  transform: `rotate(${i * 30}deg) translateX(30px)`,
                }"
              >
                <div class="node-pulse"></div>
              </div>
              
              <!-- Connecting Lines -->
              <svg class="neural-connections" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <line
                  v-for="i in 6"
                  :key="`line-${i}`"
                  x1="50"
                  y1="50"
                  :x2="50 + Math.cos((i * 60) * Math.PI / 180) * 30"
                  :y2="50 + Math.sin((i * 60) * Math.PI / 180) * 30"
                  stroke="rgba(34, 211, 238, 0.4)"
                  stroke-width="0.5"
                  class="connection-line"
                />
              </svg>
              
              <!-- Central Core Glow -->
              <div class="orb-inner-core"></div>
            </div>
          </div>
        </div>

        <!-- Loading Text -->
        <div class="text-center space-y-2">
          <h2 class="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent font-tech">
            Immortals Eye-Safe
          </h2>
          <div class="flex items-center gap-2 justify-center">
            <div class="loading-dot loading-dot-1"></div>
            <div class="loading-dot loading-dot-2"></div>
            <div class="loading-dot loading-dot-3"></div>
          </div>
        </div>

        <!-- Data Stream Effect -->
        <div class="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            v-for="i in 5"
            :key="`stream-${i}`"
            class="data-stream"
            :style="{
              left: `${20 + i * 15}%`,
              animationDelay: `${i * 0.3}s`,
            }"
          ></div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const isVisible = ref(true)

const onAfterLeave = () => {
  // Component will be automatically removed by Vue after transition
}

onMounted(() => {
  // Preloader shows for 1.5-2 seconds
  const minTime = 1500
  const maxTime = 2000
  const showTime = minTime + Math.random() * (maxTime - minTime)

  setTimeout(() => {
    isVisible.value = false
  }, showTime)
})
</script>

<style scoped>
/* Neural Orb Animation */
.neural-orb-container {
  position: relative;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.neural-orb {
  position: relative;
  width: 150px;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.orb-ring {
  position: absolute;
  border: 2px solid rgba(34, 211, 238, 0.3);
  border-radius: 50%;
  animation: orbRotate 10s linear infinite;
}

.orb-ring-1 {
  width: 150px;
  height: 150px;
  animation-duration: 15s;
}

.orb-ring-2 {
  width: 120px;
  height: 120px;
  animation-duration: 12s;
  animation-direction: reverse;
  border-color: rgba(139, 92, 246, 0.3);
}

.orb-ring-3 {
  width: 90px;
  height: 90px;
  animation-duration: 8s;
  border-color: rgba(59, 130, 246, 0.3);
}

@keyframes orbRotate {
  0% {
    transform: rotate(0deg);
    opacity: 0.3;
  }
  50% {
    opacity: 0.8;
  }
  100% {
    transform: rotate(360deg);
    opacity: 0.3;
  }
}

.orb-core {
  position: relative;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.orb-inner-core {
  position: absolute;
  width: 30px;
  height: 30px;
  background: radial-gradient(circle, rgba(34, 211, 238, 0.8), rgba(59, 130, 246, 0.4));
  border-radius: 50%;
  filter: blur(8px);
  animation: corePulse 2s ease-in-out infinite;
  box-shadow: 0 0 30px rgba(34, 211, 238, 0.6), 0 0 60px rgba(59, 130, 246, 0.4);
}

@keyframes corePulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

.neural-node {
  position: absolute;
  width: 8px;
  height: 8px;
  top: 50%;
  left: 50%;
  transform-origin: 0 0;
}

.node-pulse {
  width: 100%;
  height: 100%;
  background: rgba(34, 211, 238, 0.9);
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(34, 211, 238, 0.8);
  animation: nodePulse 2s ease-in-out infinite;
}

@keyframes nodePulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.5);
    opacity: 1;
  }
}

.neural-connections {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
}

.connection-line {
  stroke-dasharray: 30;
  stroke-dashoffset: 30;
  animation: lineFlow 3s ease-in-out infinite;
}

@keyframes lineFlow {
  0% {
    stroke-dashoffset: 30;
    opacity: 0.3;
  }
  50% {
    stroke-dashoffset: 0;
    opacity: 1;
  }
  100% {
    stroke-dashoffset: -30;
    opacity: 0.3;
  }
}

/* Particle Float Animation */
.particle-float {
  animation: particleFloat 4s ease-in-out infinite;
}

@keyframes particleFloat {
  0%, 100% {
    transform: translateY(0) translateX(0);
    opacity: 0.3;
  }
  50% {
    transform: translateY(-30px) translateX(20px);
    opacity: 0.8;
  }
}

/* Loading Dots */
.loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(34, 211, 238, 0.8);
  box-shadow: 0 0 10px rgba(34, 211, 238, 0.6);
  animation: dotPulse 1.4s ease-in-out infinite;
}

.loading-dot-1 {
  animation-delay: 0s;
}

.loading-dot-2 {
  animation-delay: 0.2s;
}

.loading-dot-3 {
  animation-delay: 0.4s;
}

@keyframes dotPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.3);
    opacity: 1;
  }
}

/* Data Stream Animation */
.data-stream {
  position: absolute;
  width: 2px;
  height: 100px;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(34, 211, 238, 0.6),
    rgba(139, 92, 246, 0.6),
    transparent
  );
  animation: streamFlow 2s ease-in-out infinite;
  filter: blur(1px);
}

@keyframes streamFlow {
  0% {
    transform: translateY(-100vh) scaleY(0);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) scaleY(1);
    opacity: 0;
  }
}

/* Blob Animation */
.animate-blob-slow {
  animation: blobSlow 15s ease-in-out infinite;
}

@keyframes blobSlow {
  0%, 100% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(50px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-30px, 30px) scale(0.9);
  }
}

.animation-delay-2000 {
  animation-delay: 2s;
}
</style>

