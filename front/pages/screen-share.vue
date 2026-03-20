<template>
  <div class="relative text-white overflow-hidden min-h-[150vh]">
    <!-- Enhanced Background Effects -->
    <div class="fixed inset-0 -z-10">
      <div class="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"></div>
      <div class="absolute top-0 -left-4 w-96 h-96 bg-cyan-500/10 rounded-full mix-blend-screen filter blur-[128px] animate-float-slow"></div>
      <div class="absolute top-0 -right-4 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-screen filter blur-[128px] animate-float-slow animation-delay-2000"></div>
      <div class="absolute -bottom-8 left-20 w-96 h-96 bg-purple-500/10 rounded-full mix-blend-screen filter blur-[128px] animate-float-slow animation-delay-4000"></div>
    </div>
    
    <!-- Content -->
    <div class="relative z-10 w-full"> 
      <!-- Header Section -->
      <div class="w-full px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div class="mb-12 text-center fade-in-up">
          <div class="inline-block mb-4 px-4 py-2 glass-strong rounded-full border border-cyan-500/30">
            <span class="text-sm font-medium text-cyan-400 tracking-wider uppercase">Real-time AI Analysis</span>
          </div>
          <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-400 bg-clip-text text-transparent font-tech">
            Veritas Scan
          </h1>
          <p class="text-slate-300/90 text-lg max-w-2xl mx-auto leading-relaxed">
            Real-time AI-powered content analysis and fake information detection
          </p>
        </div>
      </div>

      <!-- Main Content Card - Full Width -->
      <div class="w-full px-4 sm:px-6 lg:px-8 pb-12">
        <div class=" fade-in-up" style="animation-delay: 0.2s;">
          <ClientOnly>
            <ScreenShareButton />
          </ClientOnly>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default'
})
</script>

<style scoped>
@keyframes floatSlow {
  0%, 100% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

.animate-float-slow {
  animation: floatSlow 15s ease-in-out infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}
</style>
