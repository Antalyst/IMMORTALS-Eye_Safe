/**
 * useFeedMonitoring - Real-time social media feed monitoring
 * 
 * Monitors dynamically loaded posts in feeds, extracts content,
 * and verifies them using the Veritas Scan pipeline.
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { useVeritasScan } from './useVeritasScan'
import { useCrimeVerification } from './useCrimeVerification'

export interface PostMetadata {
  id: string
  text: string
  author: string | null
  postUrl: string | null
  timestamp: Date | null
  element: HTMLElement
  processed: boolean
}

export interface PostVerification {
  postId: string
  isVerifiedSource: boolean
  verdict: 'Likely True' | 'Likely False' | 'Unverified'
  confidence: number
  reasoning: string
  riskLevel: 'Low' | 'Medium' | 'High'
  sourceName: string | null
  alertsTriggered: boolean
  factCheckResult?: any
}

/**
 * Preprocess text - remove emojis, whitespace, hidden chars
 */
function preprocessText(text: string): string {
  if (!text || typeof text !== 'string') return ''
  
  // Remove emojis
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu
  let cleaned = text.replace(emojiRegex, '')
  
  // Remove hidden characters and normalize whitespace
  cleaned = cleaned
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width spaces
    .replace(/\s+/g, ' ') // Multiple spaces to single
    .trim()
  
  return cleaned
}

/**
 * Extract keywords: crime types, Bago City, dates/times
 */
function extractKeywords(text: string): {
  crimeTypes: string[]
  locations: string[]
  dates: string[]
} {
  const lowerText = text.toLowerCase()
  
  const crimeTypes = [
    'crime', 'murder', 'kill', 'homicide', 'robbery', 'theft', 'rape', 'assault',
    'shooting', 'gun', 'weapon', 'attack', 'violence', 'terrorist', 'bomb',
    'kidnap', 'abduction', 'missing', 'dead', 'death', 'victim', 'suspect',
    'arrest', 'police', 'criminal', 'gang', 'drug', 'stolen', 'stabbing',
    'buy bust', 'ra 9165', 'incident', 'accident'
  ].filter(kw => lowerText.includes(kw))
  
  const locations = [
    'bago city', 'bago', 'negros occidental', 'negros', 'philippines',
    'barangay', 'bacolod'
  ].filter(loc => lowerText.includes(loc))
  
  // Extract dates/times (simple patterns)
  const datePattern = /\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4}|\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)/gi
  const timePattern = /\d{1,2}:\d{2}\s*(am|pm)?/gi
  const dates = [
    ...(text.match(datePattern) || []),
    ...(text.match(timePattern) || [])
  ]
  
  return { crimeTypes, locations, dates }
}

/**
 * Check if post is about Bago City crime
 */
function isBagoCityCrimePost(text: string, keywords: { crimeTypes: string[]; locations: string[] }): boolean {
  const hasCrimeKeyword = keywords.crimeTypes.length > 0
  const hasLocation = keywords.locations.some(loc => 
    loc.includes('bago') || loc.includes('negros')
  )
  
  return hasCrimeKeyword && hasLocation
}

/**
 * Extract post metadata from DOM element
 */
function extractPostMetadata(element: HTMLElement): PostMetadata | null {
  // Try to extract text content (Facebook post structure)
  const textSelectors = [
    '[data-ad-preview="message"]',
    '[data-testid="post_message"]',
    '[role="article"] p',
    '.userContent',
    '[data-pagelet="FeedUnit"] p'
  ]
  
  let text = ''
  for (const selector of textSelectors) {
    const textElement = element.querySelector(selector)
    if (textElement) {
      text = textElement.textContent || ''
      break
    }
  }
  
  // Fallback: get all text from element
  if (!text) {
    text = element.innerText || element.textContent || ''
  }
  
  // Clean and preprocess
  text = preprocessText(text)
  
  if (text.length < 20) {
    return null // Too short to analyze
  }
  
  // Extract author/page name
  const authorSelectors = [
    '[data-testid="story-subtitle"] a',
    '[data-pagelet="ProfileTilesFeedUnit"] a',
    'h3 a',
    '[role="link"] strong',
    '.x1i10hfl a'
  ]
  
  let author: string | null = null
  for (const selector of authorSelectors) {
    const authorElement = element.querySelector(selector)
    if (authorElement) {
      author = authorElement.textContent?.trim() || null
      if (author) break
    }
  }
  
  // Extract post URL
  let postUrl: string | null = null
  const linkElements = element.querySelectorAll('a[href*="facebook.com"]')
  for (const link of Array.from(linkElements)) {
    const href = link.getAttribute('href')
    if (href && (href.includes('/posts/') || href.includes('/permalink/'))) {
      postUrl = href
      break
    }
  }
  
  // Extract timestamp
  let timestamp: Date | null = null
  const timeSelectors = [
    'a[href*="/posts/"]',
    'a[role="link"] abbr',
    '[data-testid="story-subtitle"] a abbr'
  ]
  
  for (const selector of timeSelectors) {
    const timeElement = element.querySelector(selector)
    if (timeElement) {
      const timeText = timeElement.getAttribute('title') || timeElement.textContent
      if (timeText) {
        try {
          timestamp = new Date(timeText)
          if (isNaN(timestamp.getTime())) timestamp = null
        } catch {
          timestamp = null
        }
      }
      if (timestamp) break
    }
  }
  
  // Generate unique ID for post
  const postId = `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  return {
    id: postId,
    text,
    author,
    postUrl,
    timestamp: timestamp || new Date(),
    element,
    processed: false
  }
}

export function useFeedMonitoring() {
  const { scan } = useVeritasScan()
  const { verifyCrimeReport, isCrimeContent } = useCrimeVerification()
  
  const isMonitoring = ref(false)
  const processedPosts = ref<Map<string, PostVerification>>(new Map())
  const observer = ref<MutationObserver | null>(null)
  const monitoringStats = ref({
    totalPosts: 0,
    verifiedPosts: 0,
    fakePosts: 0,
    unverifiedPosts: 0,
    crimePosts: 0
  })
  
  /**
   * Chunk long texts for AI context preservation
   */
  function chunkText(text: string, maxChunkLength: number = 1000): string[] {
    if (text.length <= maxChunkLength) {
      return [text]
    }
    
    // Split by sentences first
    const sentences = text.split(/[.!?]\s+/).filter(s => s.length > 10)
    
    const chunks: string[] = []
    let currentChunk = ''
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= maxChunkLength) {
        currentChunk += (currentChunk ? '. ' : '') + sentence
      } else {
        if (currentChunk) {
          chunks.push(currentChunk)
        }
        currentChunk = sentence
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk)
    }
    
    return chunks.length > 0 ? chunks : [text.slice(0, maxChunkLength)]
  }
  
  /**
   * Process a single post through verification pipeline
   */
  async function processPost(post: PostMetadata): Promise<PostVerification | null> {
    if (post.processed) {
      return processedPosts.value.get(post.id) || null
    }
    
    console.log(`[FeedMonitoring] Processing post: ${post.id}`)
    
    // Step 1: Preprocess text (clean emojis, whitespace, hidden chars)
    const cleanedText = preprocessText(post.text)
    
    if (cleanedText.length < 20) {
      post.processed = true
      return null
    }
    
    // Step 2: Extract keywords
    const keywords = extractKeywords(cleanedText)
    
    // Step 3: Check if it's a Bago City crime post
    const isCrimePost = isBagoCityCrimePost(cleanedText, keywords)
    
    if (!isCrimePost) {
      // Not a crime post, skip detailed verification
      post.processed = true
      return null
    }
    
    console.log(`[FeedMonitoring] 🚨 Crime post detected in Bago City`)
    console.log(`[FeedMonitoring] Crime types: ${keywords.crimeTypes.join(', ')}`)
    console.log(`[FeedMonitoring] Locations: ${keywords.locations.join(', ')}`)
    monitoringStats.value.crimePosts++
    
    // Step 4: Source verification (check if official account)
    let verifiedSourceCheck: any = { isVerified: false, sourceName: null, confidence: 0.5, reasoning: 'Source verification pending' }
    try {
      // Dynamically import to avoid SSR issues
      const { checkVerifiedSourceAuthenticity } = await import('../server/utils/verifiedSourceAuthenticator')
      // Use cleaned text for source verification (includes original text in metadata)
      verifiedSourceCheck = await checkVerifiedSourceAuthenticity(cleanedText, post.postUrl || undefined)
    } catch (error) {
      console.warn('[FeedMonitoring] Source verification failed:', error)
      verifiedSourceCheck = { isVerified: false, sourceName: null, confidence: 0.5, reasoning: 'Source verification failed' }
    }
    
    let verification: PostVerification
    
    if (verifiedSourceCheck.isVerified) {
      // Official source - auto-verify as True
      console.log(`[FeedMonitoring] ✅ Official source detected: ${verifiedSourceCheck.sourceName}`)
      
      verification = {
        postId: post.id,
        isVerifiedSource: true,
        verdict: 'Likely True',
        confidence: verifiedSourceCheck.confidence,
        reasoning: verifiedSourceCheck.reasoning,
        riskLevel: 'Low',
        sourceName: verifiedSourceCheck.sourceName || null,
        alertsTriggered: false
      }
      
      monitoringStats.value.verifiedPosts++
      
      // Add visual indicator to post
      addVerificationIndicator(post.element, verification)
      
    } else {
      // Not official source - run full AI + fact-check pipeline
      console.log(`[FeedMonitoring] ⚠️ Not official source, running full verification pipeline`)
      
      // Step 5: Chunk text for AI processing (if needed)
      const textChunks = chunkText(cleanedText, 1000)
      const mainChunk = textChunks[0] // Use first chunk for fact-check
      
      // Step 6: Run fact-check API
      let factCheckResult
      try {
        factCheckResult = await $fetch('/api/factCheck', {
          method: 'POST',
          body: {
            text: mainChunk, // Use cleaned, chunked text
            postUrl: post.postUrl || undefined,
            postId: post.id
          }
        })
      } catch (error: any) {
        console.error('[FeedMonitoring] Fact-check failed:', error)
        factCheckResult = {
          verified: false,
          confidence: 0.5,
          verdict: 'Unverified',
          reasoning: 'Fact-checking failed'
        }
      }
      
      // Step 5: Determine verdict based on confidence
      const verdict: 'Likely True' | 'Likely False' | 'Unverified' = 
        factCheckResult.verdict === 'Likely True' ? 'Likely True' :
        factCheckResult.confidence < 0.3 ? 'Likely False' :
        factCheckResult.confidence < 0.5 ? 'Unverified' :
        'Likely True'
      
      const riskLevel: 'Low' | 'Medium' | 'High' = 
        factCheckResult.confidence > 0.7 ? 'Low' :
        factCheckResult.confidence > 0.5 ? 'Medium' :
        'High'
      
      verification = {
        postId: post.id,
        isVerifiedSource: false,
        verdict,
        confidence: factCheckResult.confidence || 0.5,
        reasoning: factCheckResult.reasoning || 'Unable to verify',
        riskLevel,
        sourceName: verifiedSourceCheck.sourceName || null,
        alertsTriggered: verdict === 'Likely False' || riskLevel === 'High',
        factCheckResult
      }
      
      // Update stats
      if (verdict === 'Likely True') {
        monitoringStats.value.verifiedPosts++
      } else if (verdict === 'Likely False') {
        monitoringStats.value.fakePosts++
      } else {
        monitoringStats.value.unverifiedPosts++
      }
      
      // Step 7: If high risk, trigger crime alert
      if (verification.alertsTriggered && isCrimeContent(cleanedText)) {
        console.log(`[FeedMonitoring] 🚨 High-risk crime post - triggering alert`)
        await verifyCrimeReport(cleanedText, undefined, post.author || undefined)
      }
      
      // Add visual indicator to post
      addVerificationIndicator(post.element, verification)
    }
    
    // Mark as processed and store
    post.processed = true
    processedPosts.value.set(post.id, verification)
    monitoringStats.value.totalPosts++
    
    return verification
  }
  
  /**
   * Add visual verification indicator to post element
   */
  function addVerificationIndicator(element: HTMLElement, verification: PostVerification) {
    // Remove existing indicator if any
    const existingIndicator = element.querySelector('.veritas-indicator')
    if (existingIndicator) {
      existingIndicator.remove()
    }
    
    // Create indicator element
    const indicator = document.createElement('div')
    indicator.className = 'veritas-indicator'
    indicator.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      z-index: 10000;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      ${verification.verdict === 'Likely True' 
        ? 'background: rgba(34, 197, 94, 0.9); color: white; border: 2px solid rgb(34, 197, 94);' 
        : verification.verdict === 'Likely False'
        ? 'background: rgba(239, 68, 68, 0.9); color: white; border: 2px solid rgb(239, 68, 68);'
        : 'background: rgba(234, 179, 8, 0.9); color: white; border: 2px solid rgb(234, 179, 8);'
      }
    `
    
    indicator.textContent = 
      verification.verdict === 'Likely True' ? '✓ Verified' :
      verification.verdict === 'Likely False' ? '✗ Fake' :
      '? Unverified'
    
    // Add tooltip on hover
    indicator.title = `${verification.verdict} (${(verification.confidence * 100).toFixed(0)}% confidence)\n${verification.reasoning}`
    
    // Add click handler to show details
    indicator.addEventListener('click', (e) => {
      e.stopPropagation()
      showVerificationDetails(verification)
    })
    
    // Make sure parent element is positioned
    const computedStyle = window.getComputedStyle(element)
    if (computedStyle.position === 'static') {
      element.style.position = 'relative'
    }
    
    element.appendChild(indicator)
    
    // Add border highlight based on verdict
    element.style.border = 
      verification.verdict === 'Likely True' ? '2px solid rgba(34, 197, 94, 0.5)' :
      verification.verdict === 'Likely False' ? '2px solid rgba(239, 68, 68, 0.5)' :
      '2px solid rgba(234, 179, 8, 0.5)'
    element.style.borderRadius = '8px'
    element.style.transition = 'all 0.3s ease'
  }
  
  /**
   * Show verification details in a modal/tooltip
   */
  function showVerificationDetails(verification: PostVerification) {
    // Create modal
    const modal = document.createElement('div')
    modal.className = 'veritas-details-modal'
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(15, 23, 42, 0.95);
      border: 2px solid ${verification.verdict === 'Likely True' ? 'rgb(34, 197, 94)' : verification.verdict === 'Likely False' ? 'rgb(239, 68, 68)' : 'rgb(234, 179, 8)'};
      border-radius: 16px;
      padding: 24px;
      max-width: 500px;
      z-index: 100000;
      color: white;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    `
    
    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 18px; font-weight: 700;">
          Verification Details
        </h3>
        <button class="close-btn" style="background: transparent; border: none; color: white; font-size: 24px; cursor: pointer; padding: 0; width: 32px; height: 32px;">&times;</button>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="font-weight: 600;">Verdict:</span>
          <span style="padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 600;
            ${verification.verdict === 'Likely True' ? 'background: rgba(34, 197, 94, 0.2); color: rgb(34, 197, 94);' :
              verification.verdict === 'Likely False' ? 'background: rgba(239, 68, 68, 0.2); color: rgb(239, 68, 68);' :
              'background: rgba(234, 179, 8, 0.2); color: rgb(234, 179, 8);'
            }">
            ${verification.verdict}
          </span>
        </div>
        <div style="margin-bottom: 8px;">
          <span style="font-weight: 600;">Confidence:</span>
          <span style="margin-left: 8px;">${(verification.confidence * 100).toFixed(1)}%</span>
        </div>
        <div style="margin-bottom: 8px;">
          <span style="font-weight: 600;">Risk Level:</span>
          <span style="margin-left: 8px;">${verification.riskLevel}</span>
        </div>
        ${verification.sourceName ? `
          <div style="margin-bottom: 8px;">
            <span style="font-weight: 600;">Source:</span>
            <span style="margin-left: 8px;">${verification.sourceName}</span>
          </div>
        ` : ''}
      </div>
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
        <div style="font-weight: 600; margin-bottom: 8px;">Reasoning:</div>
        <div style="font-size: 14px; line-height: 1.6; color: rgba(255,255,255,0.9);">
          ${verification.reasoning}
        </div>
      </div>
    `
    
    // Close button handler
    const closeBtn = modal.querySelector('.close-btn')
    closeBtn?.addEventListener('click', () => {
      modal.remove()
    })
    
    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove()
      }
    })
    
    document.body.appendChild(modal)
  }
  
  /**
   * Process all visible posts
   */
  async function processVisiblePosts() {
    // Find all article elements (common in social media feeds)
    const postSelectors = [
      'article[role="article"]',
      '[data-pagelet="FeedUnit"]',
      '[role="article"]',
      '.x1y1aw1k', // Facebook post container
      '.x1n2onr6',  // Alternative Facebook container
      '[data-pagelet*="FeedUnit"]', // Facebook dynamic feeds
      'div[data-testid="fbfeed_story"]' // Facebook feed stories
    ]
    
    const posts: PostMetadata[] = []
    
    for (const selector of postSelectors) {
      const elements = document.querySelectorAll<HTMLElement>(selector)
      for (const element of Array.from(elements)) {
        // Skip if already processed
        if (element.dataset.veritasProcessed === 'true') continue
        
        // Skip if element is too small (likely not a full post)
        const rect = element.getBoundingClientRect()
        if (rect.height < 50 || rect.width < 200) continue
        
        const metadata = extractPostMetadata(element)
        if (metadata && metadata.text.length >= 20) {
          posts.push(metadata)
          element.dataset.veritasProcessed = 'true'
        }
      }
    }
    
    if (posts.length > 0) {
      console.log(`[FeedMonitoring] Found ${posts.length} new posts to process`)
    }
    
    // Process posts sequentially to avoid overwhelming the system
    for (const post of posts) {
      await processPost(post)
      // Small delay between posts to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  /**
   * Start monitoring feed
   */
  function startMonitoring() {
    if (isMonitoring.value) {
      console.log('[FeedMonitoring] Already monitoring')
      return
    }
    
    console.log('[FeedMonitoring] Starting feed monitoring...')
    isMonitoring.value = true
    
    // Process existing posts
    processVisiblePosts()
    
    // Set up MutationObserver to detect new posts
    observer.value = new MutationObserver((mutations) => {
      let shouldProcess = false
      
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          // Check if any added nodes are post elements
          for (const node of Array.from(mutation.addedNodes)) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement
              if (element.querySelector('article[role="article"]') || 
                  element.matches('article[role="article"]') ||
                  element.querySelector('[data-pagelet="FeedUnit"]')) {
                shouldProcess = true
                break
              }
            }
          }
        }
        
        if (shouldProcess) break
      }
      
      if (shouldProcess) {
        // Debounce processing
        setTimeout(() => {
          processVisiblePosts()
        }, 500)
      }
    })
    
    // Observe the feed container (adjust selector based on your feed structure)
    const feedContainer = document.querySelector('[role="feed"]') || 
                          document.querySelector('[data-pagelet="FeedUnit"]')?.parentElement ||
                          document.body
    
    if (feedContainer) {
      observer.value.observe(feedContainer, {
        childList: true,
        subtree: true
      })
      console.log('[FeedMonitoring] MutationObserver started')
    }
    
    // Also process periodically as fallback
    const intervalId = setInterval(() => {
      if (isMonitoring.value) {
        processVisiblePosts()
      } else {
        clearInterval(intervalId)
      }
    }, 5000) // Every 5 seconds
  }
  
  /**
   * Stop monitoring feed
   */
  function stopMonitoring() {
    if (!isMonitoring.value) return
    
    console.log('[FeedMonitoring] Stopping feed monitoring...')
    isMonitoring.value = false
    
    if (observer.value) {
      observer.value.disconnect()
      observer.value = null
    }
    
    // Remove all indicators
    document.querySelectorAll('.veritas-indicator').forEach(indicator => {
      indicator.remove()
    })
  }
  
  // Cleanup on unmount
  onUnmounted(() => {
    stopMonitoring()
  })
  
  return {
    isMonitoring,
    processedPosts,
    monitoringStats,
    startMonitoring,
    stopMonitoring,
    processVisiblePosts
  }
}

