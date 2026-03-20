import { ref, computed } from 'vue'

/**
 * News Chat Composable
 * 
 * Manages chat state for news article conversations
 * - Handles streaming responses from Gemini 1.5 Flash
 * - Maintains conversation history scoped to an article
 * - Formats messages for the news chat API
 */

export interface NewsChatMessage {
  role: 'user' | 'model'
  text: string
  timestamp?: Date
}

export interface NewsArticle {
  title: string
  summary: string
  fullContent: string
  category?: 'local' | 'global'
}

export function useNewsChat() {
  const chatHistory = ref<NewsChatMessage[]>([])
  const currentResponse = ref('')
  const isSending = ref(false)
  const error = ref<string | null>(null)
  const currentArticle = ref<NewsArticle | null>(null)

  /**
   * Initialize chat for a new article
   */
  function initializeChat(article: NewsArticle) {
    currentArticle.value = article
    chatHistory.value = []
    currentResponse.value = ''
    error.value = null
    
    // Add welcome message
    chatHistory.value.push({
      role: 'model',
      text: `Hello! I'm your AI assistant for this article: "${article.title}".\n\nI can help you understand, analyze, or discuss any aspects of this news article. What would you like to know?`,
      timestamp: new Date()
    })
  }

  /**
   * Convert chat history to API format
   */
  function formatHistoryForAPI() {
    return chatHistory.value.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }))
  }

  /**
   * Send a message and stream the response
   */
  async function sendMessage(question: string): Promise<void> {
    if (!question.trim() || isSending.value || !currentArticle.value) {
      return
    }

    error.value = null
    currentResponse.value = ''
    isSending.value = true

    // Add user message to history
    const userMessage: NewsChatMessage = {
      role: 'user',
      text: question.trim(),
      timestamp: new Date()
    }
    chatHistory.value.push(userMessage)

    try {
      // Format history for API (exclude the current user message)
      const historyForAPI = formatHistoryForAPI().slice(0, -1)

      const requestBody = {
        article: {
          title: currentArticle.value.title,
          summary: currentArticle.value.summary,
          fullContent: currentArticle.value.fullContent || currentArticle.value.summary,
          category: currentArticle.value.category
        },
        question: question.trim(),
        conversationHistory: historyForAPI
      }

      console.log('[NewsChat] Sending message:', {
        questionLength: question.length,
        articleTitle: currentArticle.value.title.substring(0, 50),
        historyLength: historyForAPI.length
      })

      // Make streaming request
      const response = await fetch('/api/newsChat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData: any = { error: 'Unknown error' }
        
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}: ${response.statusText}` }
        }
        
        console.error('[NewsChat] API error response:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        })
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      if (!response.body) {
        console.error('[NewsChat] No response body')
        throw new Error('No response body for streaming')
      }

      console.log('[NewsChat] Response OK, starting to read stream')

      // Read stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      // Process stream chunks
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        // Process each line (SSE format: "data: {...}")
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6))

              switch (data.type) {
                case 'connected':
                  console.log('[NewsChat] ✅ Stream connected')
                  break

                case 'chunk':
                  if (data?.text) {
                    currentResponse.value += data.text
                  }
                  break

                case 'done':
                  console.log('[NewsChat] ✅ Stream completed')
                  
                  // Add complete response to history
                  if (currentResponse.value.trim()) {
                    const modelMessage: NewsChatMessage = {
                      role: 'model',
                      text: currentResponse.value.trim(),
                      timestamp: new Date()
                    }
                    chatHistory.value.push(modelMessage)
                  }
                  
                  currentResponse.value = ''
                  break

                case 'error':
                  console.error('[NewsChat] Stream error:', data?.message)
                  throw new Error(data?.message || 'Streaming error occurred')
              }
            } catch (parseError) {
              console.warn('[NewsChat] Failed to parse SSE data:', {
                line: line.substring(0, 100),
                error: parseError
              })
              continue
            }
          }
        }
        
        console.log('[NewsChat] Stream reading completed')
      }

      console.log('[NewsChat] ✅ Message processed successfully', {
        historyLength: chatHistory.value.length
      })

    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to send message'
      error.value = errorMessage
      
      console.error('[NewsChat] ❌ Error:', {
        error: errorMessage,
        stack: err?.stack?.substring(0, 200)
      })

      // Add error message to chat history so user can see it
      const errorChatMessage: NewsChatMessage = {
        role: 'model',
        text: `I apologize, but I encountered an error: ${errorMessage}. Please try again or check if the API key is configured correctly.`,
        timestamp: new Date()
      }
      
      // Remove user message from history if there was an error (since we'll add error response)
      if (chatHistory.value.length > 0 && chatHistory.value[chatHistory.value.length - 1]?.role === 'user') {
        chatHistory.value.pop()
      }
      
      // Add error message
      chatHistory.value.push(errorChatMessage)

      currentResponse.value = ''

      // Don't throw - let UI handle the error display
    } finally {
      isSending.value = false
    }
  }

  /**
   * Clear chat and reset state
   */
  function clearChat() {
    chatHistory.value = []
    currentResponse.value = ''
    error.value = null
    currentArticle.value = null
  }

  /**
   * Close chat and hide modal
   */
  function closeChat() {
    chatHistory.value = []
    currentResponse.value = ''
    error.value = null
    currentArticle.value = null // This closes the modal
  }

  /**
   * Get display text for current streaming response
   */
  const displayText = computed(() => {
    if (isSending.value && currentResponse.value) {
      return currentResponse.value
    }
    return ''
  })

  /**
   * Check if chat has messages
   */
  const hasMessages = computed(() => chatHistory.value.length > 0)

  /**
   * Check if chat is active (has an article)
   */
  const isActive = computed(() => currentArticle.value !== null)

  // Watch for streaming updates to auto-scroll (handled in component)

  return {
    // State
    chatHistory,
    currentResponse,
    isSending,
    error,
    currentArticle,
    
    // Computed
    displayText,
    hasMessages,
    isActive,
    
    // Methods
    initializeChat,
    sendMessage,
    clearChat,
    closeChat,
    formatHistoryForAPI
  }
}

