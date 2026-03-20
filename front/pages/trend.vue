<template>
  <div class="relative text-white overflow-hidden min-h-[calc(100vh-5rem)] pt-12 pb-16">
    <!-- Enhanced Background Effects -->
    <div class="fixed inset-0 -z-10">
      <div class="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"></div>
      <div class="absolute top-0 -left-4 w-96 h-96 bg-cyan-500/10 rounded-full mix-blend-screen filter blur-[128px] animate-float-slow"></div>
      <div class="absolute top-0 -right-4 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-screen filter blur-[128px] animate-float-slow animation-delay-2000"></div>
      <div class="absolute -bottom-8 left-20 w-96 h-96 bg-purple-500/10 rounded-full mix-blend-screen filter blur-[128px] animate-float-slow animation-delay-4000"></div>
    </div>
    
    <!-- Content -->
    <div class="relative z-10 w-full px-4 sm:px-6 lg:px-8">
      <div class="max-w-7xl mx-auto">
        <!-- Header Section -->
        <div class="mb-12 teSt-center fade-in-up">
          <div class="inline-block mb-4 px-4 py-2 glass-strong rounded-full border border-cyan-500/30">
            <span class="text-sm font-medium text-cyan-400 tracking-wider uppercase">AI-Curated Intelligence</span>
          </div>
          <h1 class="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-400 bg-clip-text text-transparent font-tech">
            Trend News
          </h1>
          <p class="text-slate-300/90 text-lg max-w-2xl mx-auto leading-relaxed w-full text-center">
            AI-curated news feed with real-time analysis and insights
          </p>
        </div>

        <!-- Filter Tabs -->
        <div class="flex flex-wrap gap-3 justify-center mb-12 fade-in-up" style="animation-delay: 0.2s;">
          <button
            @click="activeTab = 'all'"
            :class="['px-6 py-2.5 rounded-full font-medium transition-all duration-300', 
              activeTab === 'all' 
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 text-cyan-300 glow-cyan shadow-lg' 
                : 'glass border border-slate-700/50 text-slate-300 hover:border-cyan-500/30 hover:text-cyan-400 hover:shadow-md']"
          >
            All News
          </button>
          <button
            @click="activeTab = 'local'"
            :class="['px-6 py-2.5 rounded-full font-medium transition-all duration-300', 
              activeTab === 'local' 
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 text-cyan-300 glow-cyan shadow-lg' 
                : 'glass border border-slate-700/50 text-slate-300 hover:border-cyan-500/30 hover:text-cyan-400 hover:shadow-md']"
          >
            Bago City
          </button>
          <button
            @click="activeTab = 'global'"
            :class="['px-6 py-2.5 rounded-full font-medium transition-all duration-300', 
              activeTab === 'global' 
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 text-cyan-300 glow-cyan shadow-lg' 
                : 'glass border border-slate-700/50 text-slate-300 hover:border-cyan-500/30 hover:text-cyan-400 hover:shadow-md']"
          >
            Global
          </button>
        </div>

        <!-- News Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="(article, index) in filteredArticles"
            :key="article.id"
            class="card-3d card-glow group fade-in-up"
            :style="`animation-delay: ${0.3 + index * 0.1}s;`"
          >
            <div class="glass-strong rounded-3xl border border-cyan-500/20 overflow-hidden transition-all duration-500 hover:border-cyan-500/40 hover:shadow-2xl hover:shadow-cyan-500/20 h-full flex flex-col">
              <!-- Article Image -->
              <div class="relative w-full h-48 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
                <img 
                  :src="article.image" 
                  :alt="article.title"
                  class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  @error="handleImageError"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div class="absolute top-3 left-3">
                  <span 
                    class="px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm"
                    :class="article.category === 'local' ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/50' : 'bg-blue-500/30 text-blue-200 border border-blue-500/50'"
                  >
                    {{ article.category === 'local' ? 'Bago City' : 'Global' }}
                  </span>
                </div>
                <div class="absolute bottom-3 left-3 right-3">
                  <span class="text-xs text-slate-200/80 font-medium">{{ formatDate(article.date) }}</span>
                </div>
              </div>

              <!-- Article Content -->
              <div class="p-6 flex flex-col flex-grow">
                <h3 class="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-cyan-400 transition-colors">
                  {{ article.title }}
                </h3>
                <p class="text-slate-300/90 text-sm mb-4 line-clamp-3 leading-relaxed flex-grow">
                  {{ article.summary }}
                </p>

                <!-- AI Badge -->
                <div class="flex items-center gap-2 mb-4 pb-4 border-b border-slate-700/50">
                  <div class="w-2 h-2 bg-cyan-400 rounded-full pulse-ai"></div>
                  <span class="text-xs text-cyan-400 font-medium">AI-Generated Analysis</span>
                </div>

                <!-- Chat Button -->
                <button
                  @click="openChat(article)"
                  class="w-full btn-neon relative group/btn px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span class="relative z-10 flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Ask AI About This News
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredArticles.length === 0" class="text-center py-16 glass-strong rounded-3xl border border-cyan-500/20 fade-in-up">
          <div class="flex flex-col items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30 pulse-ai">
              <svg class="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <p class="text-slate-400 text-lg font-medium">No news found for this category.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Chat Modal -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="newsChat.isActive.value"
        class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm"
        @click.self="newsChat.closeChat()"
      >
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-300 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-4"
        >
          <div v-if="newsChat.isActive.value" class="glass-elevated rounded-2xl sm:rounded-3xl border border-cyan-500/30 w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-glow-lg">
            <!-- Modal Header -->
            <div class="p-4 sm:p-6 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
              <div class="flex items-start justify-between gap-2 sm:gap-4">
                <div class="flex-1 min-w-0">
                  <h3 class="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2 line-clamp-2">{{ newsChat.currentArticle.value?.title }}</h3>
                  <p class="text-xs sm:text-sm text-slate-300/80 line-clamp-2">{{ newsChat.currentArticle.value?.summary }}</p>
                </div>
                <button
                  @click="newsChat.closeChat()"
                  class="flex-shrink-0 p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors touch-manipulation"
                  aria-label="Close chat"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Chat Messages -->
            <div class="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 custom-scrollbar" ref="chatContainer">
              <div
                v-for="(message, idx) in newsChat.chatHistory.value"
                :key="idx"
                class="flex"
                :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
              >
                <div
                  :class="[
                    'max-w-[85%] sm:max-w-[80%] rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3',
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-white'
                      : 'glass border border-slate-700/50 text-slate-200'
                  ]"
                >
                  <p class="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">{{ message.text }}</p>
                  <span v-if="message.timestamp" class="text-xs text-slate-400 mt-1 sm:mt-2 block">
                    {{ formatTime(message.timestamp) }}
                  </span>
                </div>
              </div>
              
              <!-- Streaming Response -->
              <div v-if="newsChat.isSending.value && newsChat.displayText.value" class="flex justify-start">
                <div class="glass border border-slate-700/50 rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 max-w-[85%] sm:max-w-[80%]">
                  <p class="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">{{ newsChat.displayText.value }}</p>
                  <span class="inline-block w-2 h-2 bg-cyan-400 rounded-full ml-1 animate-pulse"></span>
                </div>
              </div>

              <!-- Loading Indicator -->
              <div v-if="newsChat.isSending.value && !newsChat.displayText.value" class="flex justify-start">
                <div class="glass border border-slate-700/50 rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-cyan-400 rounded-full pulse-ai"></div>
                    <span class="text-xs sm:text-sm text-slate-300">AI is thinking...</span>
                  </div>
                </div>
              </div>

              <!-- Error Display -->
              <div v-if="newsChat.error.value && !newsChat.isSending.value" class="flex justify-start">
                <div class="glass border border-red-500/30 rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 max-w-[85%] sm:max-w-[80%] bg-red-500/10">
                  <p class="text-xs sm:text-sm text-red-300 leading-relaxed break-words">
                    ⚠️ {{ newsChat.error.value }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Chat Input -->
            <div class="p-3 sm:p-6 border-t border-cyan-500/20 bg-slate-900/50">
              <form @submit.prevent="handleSendMessage" class="flex gap-2 sm:gap-3">
                <input
                  v-model="chatInput"
                  type="text"
                  placeholder="Ask anything about this news article..."
                  class="flex-1 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base glass border border-slate-700/50 rounded-lg sm:rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/50 transition-colors"
                  :disabled="newsChat.isSending.value"
                />
                <button
                  type="submit"
                  :disabled="!chatInput.trim() || newsChat.isSending.value"
                  class="btn-neon px-4 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                >
                  <span class="relative z-10 flex items-center gap-1 sm:gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span class="hidden sm:inline">Send</span>
                  </span>
                </button>
              </form>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onUnmounted } from 'vue'
import { useNewsChat } from '~/composables/useNewsChat'

definePageMeta({
  layout: 'default'
})

const newsChat = useNewsChat()
const chatInput = ref('')
const chatContainer = ref<HTMLElement | null>(null)

// Prevent body scroll when modal is open
watch(() => newsChat.isActive.value, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

// Cleanup on unmount
onUnmounted(() => {
  document.body.style.overflow = ''
})

interface NewsArticle {
  id: number
  title: string
  summary: string
  category: 'local' | 'global'
  date: string
  image: string
  fullContent?: string
}

const activeTab = ref<'all' | 'local' | 'global'>('all')

// Dummy news data - Bago City local news
const articles: NewsArticle[] = [
  {
    id: 1,
    title: "Bago City PNP Reports Decrease in Street Crimes Following Community Watch Program",
    summary: "The Bago City Police Station has reported a 25% reduction in street-level crimes over the past three months, attributing the success to the newly implemented Community Watch Program that involves local residents and barangay officials.",
    category: 'local',
    date: new Date().toISOString(),
    image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=600&fit=crop',
    fullContent: "The Bago City Police Station (BCPS) has released official statistics showing a significant decrease in street crimes including theft, robbery, and vandalism. Police Chief Inspector Juan dela Cruz credited the Community Watch Program, which was launched in August 2024, as a key factor in the improved security situation. The program involves 42 barangays across Bago City, with over 500 community volunteers participating in neighborhood patrols and reporting suspicious activities."
  },
  {
    id: 2,
    title: "Drug Enforcement Operation Nets Three Suspects in Bago City Market Area",
    summary: "A joint operation by the Bago City Police Station and the Philippine Drug Enforcement Agency (PDEA) resulted in the arrest of three individuals suspected of illegal drug trade activities in the public market area yesterday evening.",
    category: 'local',
    date: new Date(Date.now() - 86400000).toISOString(),
    image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&h=600&fit=crop',
    fullContent: "According to police reports, the operation was conducted at approximately 7:30 PM near the Bago City Public Market. Authorities recovered suspected shabu worth an estimated street value of PHP 50,000, along with drug paraphernalia and cash. The suspects, identified as residents of nearby barangays, are now in custody and facing charges under Republic Act 9165 (Comprehensive Dangerous Drugs Act of 2002). BCPS has increased patrols in the area following the incident."
  },
  {
    id: 3,
    title: "Bago City LGU Launches Digital Crime Reporting System",
    summary: "The Local Government Unit of Bago City has launched a new digital platform that allows residents to report crimes and suspicious activities through a mobile application, aiming to improve response times and community engagement.",
    category: 'local',
    date: new Date(Date.now() - 172800000).toISOString(),
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop',
    fullContent: "Mayor Nicholas Yulo announced the launch of the 'Bago Safe' mobile application, developed in partnership with local tech companies. The app features real-time crime reporting, emergency contact information, and a community safety dashboard. Users can anonymously report incidents, upload photos, and track the status of their reports. The system integrates directly with the Bago City Police Station's operations center for faster response times."
  },
  {
    id: 4,
    title: "Traffic Accident on National Highway Near Bago City Hall Claims One Life",
    summary: "A fatal traffic accident occurred yesterday afternoon on the National Highway in front of Bago City Hall, resulting in one fatality and two injuries. Police are investigating the incident, which involved a motorcycle and a delivery van.",
    category: 'local',
    date: new Date(Date.now() - 259200000).toISOString(),
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=600&fit=crop',
    fullContent: "The accident happened at around 3:45 PM when a motorcycle, driven by a 35-year-old resident of Barangay Poblacion, collided with a delivery van. Emergency responders arrived within 10 minutes, but the motorcycle driver was declared dead on arrival at the Bago City Hospital. Two passengers in the van sustained minor injuries and were treated at the scene. Traffic was temporarily diverted while authorities cleared the scene and conducted their investigation. The Bago City Traffic Management Office reminds motorists to exercise extra caution, especially during peak hours."
  },
  {
    id: 5,
    title: "Barangay Tanods in Bago City Receive New Training on Crime Prevention",
    summary: "Over 150 barangay tanods from various barangays in Bago City completed a comprehensive training program on crime prevention, community policing, and emergency response organized by the city government in partnership with the Philippine National Police.",
    category: 'local',
    date: new Date(Date.now() - 345600000).toISOString(),
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
    fullContent: "The week-long training program covered topics including basic law enforcement, conflict resolution, evidence handling, and proper coordination with police authorities. Barangay tanods play a crucial role in maintaining peace and order at the community level, serving as the first line of defense in their respective areas. City officials emphasized the importance of their role in crime prevention and encouraged active participation in community safety initiatives."
  },
  {
    id: 6,
    title: "Bago City Records Zero Violent Crimes During Fiesta Celebration",
    summary: "Despite large crowds and celebrations, the Bago City Police Station reported zero incidents of violent crimes during the recent city fiesta, which ran from October 1-7. Increased police visibility and security measures contributed to the peaceful event.",
    category: 'local',
    date: new Date(Date.now() - 432000000).toISOString(),
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=600&fit=crop',
    fullContent: "Police Chief Inspector dela Cruz praised the coordination between law enforcement, event organizers, and the community for the successful security operation. Over 80 police personnel were deployed throughout the fiesta area, along with barangay tanods and volunteer security groups. The only incidents reported were minor traffic violations and lost property cases, all of which were resolved on-site. This marks the third consecutive year with zero violent crimes during the city fiesta."
  },
  // Global news
  {
    id: 7,
    title: "Global Cybersecurity Summit Addresses Rising AI-Powered Threats",
    summary: "World leaders and tech executives gathered at the Global Cybersecurity Summit to discuss emerging threats from AI-powered cyber attacks, focusing on preventive measures and international cooperation to combat sophisticated digital crimes.",
    category: 'global',
    date: new Date(Date.now() - 86400000).toISOString(),
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=600&fit=crop',
    fullContent: "The three-day summit, attended by representatives from 45 countries, highlighted the growing sophistication of cyber attacks leveraging artificial intelligence. Experts warned that AI-powered phishing campaigns, deepfake technology for fraud, and automated hacking tools pose significant challenges to cybersecurity infrastructure worldwide. Participants agreed on the need for stronger international regulations and collaborative frameworks to address these evolving threats."
  },
  {
    id: 8,
    title: "United Nations Reports Decline in Global Homicide Rates",
    summary: "The UN Office on Drugs and Crime released its annual Global Study on Homicide, showing a 5% decrease in global homicide rates compared to the previous year, with significant improvements in several regions.",
    category: 'global',
    date: new Date(Date.now() - 172800000).toISOString(),
    image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=600&fit=crop',
    fullContent: "The report analyzed homicide data from 190 countries, revealing that organized crime, interpersonal violence, and conflict-related killings decreased in most regions. However, the report also noted that certain areas continue to face challenges, particularly regions affected by drug trafficking and organized crime networks. Experts attribute the overall decline to improved law enforcement, community-based violence prevention programs, and better access to justice systems."
  },
  {
    id: 9,
    title: "Interpol Launches New Digital Platform for Cross-Border Crime Intelligence",
    summary: "Interpol has unveiled a new digital platform designed to enhance information sharing between member countries, enabling faster identification and tracking of international criminal networks and their activities.",
    category: 'global',
    date: new Date(Date.now() - 259200000).toISOString(),
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
    fullContent: "The platform, called 'CrimIntel Connect', uses advanced analytics and machine learning to identify patterns in cross-border criminal activities. It integrates data from 195 member countries, allowing law enforcement agencies to share intelligence in real-time while maintaining strict security protocols. The system has already helped coordinate several successful international operations targeting human trafficking and cybercrime networks."
  }
]

const filteredArticles = computed(() => {
  if (activeTab.value === 'all') return articles
  return articles.filter(article => article.category === activeTab.value)
})

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop'
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function openChat(article: NewsArticle) {
  newsChat.initializeChat({
    title: article.title,
    summary: article.summary,
    fullContent: article.fullContent || article.summary,
    category: article.category
  })
  chatInput.value = ''
  nextTick(() => scrollChatToBottom())
}

async function handleSendMessage() {
  if (!chatInput.value.trim() || newsChat.isSending.value) return

  const question = chatInput.value.trim()
  chatInput.value = ''

  try {
    await newsChat.sendMessage(question)
    nextTick(() => scrollChatToBottom())
  } catch (error: any) {
    console.error('[Trend] Chat error:', error)
  }
}

function scrollChatToBottom() {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

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

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.5);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(34, 211, 238, 0.3);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(34, 211, 238, 0.5);
}

/* Mobile optimizations */
.touch-manipulation {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/* Better mobile text selection and rendering */
@media (max-width: 640px) {
  * {
    -webkit-tap-highlight-color: rgba(34, 211, 238, 0.1);
  }
  
  .glass-elevated {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
</style>
