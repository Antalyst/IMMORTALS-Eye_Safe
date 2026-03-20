import { defineEventHandler, readBody, setHeaders } from 'h3'
import { logLine } from '../utils/logger'

/**
 * News Article Chat API using Gemini 1.5 Flash
 * 
 * This endpoint:
 * - Accepts POST requests with article content, question, and conversation history
 * - Uses Gemini 1.5 Flash (free model) to answer questions about the article
 * - Strictly scopes responses to only the provided article content
 * - Streams responses in real-time using Server-Sent Events (SSE)
 * - Secures API key on backend (never exposed to frontend)
 */

interface NewsChatRequest {
  article: {
    title: string
    summary: string
    fullContent: string
    category?: 'local' | 'global'
  }
  question: string
  conversationHistory?: Array<{
    role: 'user' | 'model'
    parts: Array<{ text: string }>
  }>
}

export default defineEventHandler(async (event) => {
  await logLine('info', 'newsChat: Endpoint called', {
    method: event.node.req.method,
    url: event.node.req.url
  })

  try {
    // Get API key from environment variables (secured on backend)
    const config = useRuntimeConfig()
    const geminiApiKey = config.googleAiKey || config.googleAiApi || process.env.GOOGLE_AI_KEY

    await logLine('info', 'newsChat: API key check', {
      hasKey: !!geminiApiKey,
      keyLength: geminiApiKey ? geminiApiKey.length : 0
    })

    if (!geminiApiKey) {
      await logLine('error', 'newsChat: Missing GOOGLE_AI_KEY')
      setHeaders(event, { 'Content-Type': 'application/json' })
      return {
        error: 'API key not configured. Please set GOOGLE_AI_KEY in your environment variables.'
      }
    }

    // Read request body
    const body = (await readBody(event)) as NewsChatRequest

    await logLine('info', 'newsChat: Request body received', {
      hasArticle: !!body?.article,
      hasQuestion: !!body?.question,
      articleTitle: body?.article?.title?.substring(0, 30),
      questionLength: body?.question?.length || 0
    })

    if (!body?.article || !body?.question) {
      await logLine('warn', 'newsChat: Missing required fields', {
        hasArticle: !!body?.article,
        hasQuestion: !!body?.question
      })
      setHeaders(event, { 'Content-Type': 'application/json' })
      return {
        error: 'Article and question are required'
      }
    }

    const { article, question, conversationHistory = [] } = body

    await logLine('info', 'newsChat: Processing request', {
      articleTitle: article.title?.substring(0, 50),
      questionLength: question.length,
      historyLength: conversationHistory.length
    })

    // Build system instruction to scope responses strictly to the article
    const systemInstruction = `You are a helpful assistant that answers questions about news articles. 
IMPORTANT RULES:
1. You MUST only base your responses on the provided article content below.
2. If the question asks about something not mentioned in the article, politely say you can only discuss what's in the article.
3. Do NOT use external knowledge or information beyond what's provided in the article.
4. .
5. If asked about topics outsBe concise and accurateide the article, redirect to what the article actually covers.

ARTICLE CONTENT:
Title: ${article.title}
Summary: ${article.summary}
Full Content: ${article.fullContent || article.summary}`

    // Build conversation history with system instruction
    const formattedHistory: Array<{
      role: 'user' | 'model'
      parts: Array<{ text: string }>
    }> = [
      {
        role: 'user',
        parts: [{ text: systemInstruction }]
      },
      {
        role: 'model',
        parts: [{ text: 'I understand. I will only answer questions based on the provided article content and will not use external information.' }]
      },
      ...conversationHistory
    ]

    // Try to use @google/generative-ai SDK if available
    let GoogleGenerativeAI: any
    try {
      const genaiModule = await import('@google/generative-ai')
      GoogleGenerativeAI = genaiModule.GoogleGenerativeAI || genaiModule.default?.GoogleGenerativeAI
    } catch (importError: any) {
      await logLine('warn', 'newsChat: SDK not available, using REST API fallback', {
        error: importError?.message
      })
      return await streamViaRestAPI(geminiApiKey, article, question, formattedHistory, event)
    }

    if (!GoogleGenerativeAI) {
      await logLine('error', 'newsChat: GoogleGenerativeAI not found in package')
      return await streamViaRestAPI(geminiApiKey, article, question, formattedHistory, event)
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey)
    
    // Try gemini-2.5-flash first (latest), then fallback to gemini-1.5-flash, then gemini-1.5-pro
    let model: any
    try {
      model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        systemInstruction: systemInstruction
      })
      await logLine('info', 'newsChat: Using gemini-2.5-flash model')
    } catch (modelError: any) {
      try {
        await logLine('warn', 'newsChat: gemini-2.5-flash not available, trying gemini-1.5-flash', {
          error: modelError?.message
        })
        model = genAI.getGenerativeModel({ 
          model: 'gemini-1.5-flash',
          systemInstruction: systemInstruction
        })
        await logLine('info', 'newsChat: Using gemini-1.5-flash model')
      } catch (modelError2: any) {
        await logLine('warn', 'newsChat: gemini-1.5-flash not available, falling back to gemini-1.5-pro', {
          error: modelError2?.message
        })
        model = genAI.getGenerativeModel({ 
          model: 'gemini-1.5-pro',
          systemInstruction: systemInstruction
        })
        await logLine('info', 'newsChat: Using gemini-1.5-pro model')
      }
    }

    // Create chat session with history
    const chat = model.startChat({
      history: formattedHistory.slice(0, -1) // Exclude the current question from history
    })

    // Set up streaming response
    setHeaders(event, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    })

    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'))

        try {
          const result = await chat.sendMessageStream(question)

          for await (const chunk of result.stream) {
            let chunkText = ''
            if (typeof chunk.text === 'function') {
              chunkText = chunk.text()
            } else if (chunk.text) {
              chunkText = chunk.text
            } else if (chunk.response?.text) {
              chunkText = chunk.response.text()
            } else if (typeof chunk === 'string') {
              chunkText = chunk
            }

            if (chunkText) {
              const data = JSON.stringify({
                type: 'chunk',
                text: chunkText
              })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
          }
          
          controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'))
        } catch (streamError: any) {
          await logLine('error', 'newsChat: Stream error', {
            message: streamError?.message,
            stack: streamError?.stack
          })
          const errorData = JSON.stringify({
            type: 'error',
            message: streamError?.message || 'An error occurred during streaming.'
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
        } finally {
          controller.close()
        }
      }
    })

    return readableStream

  } catch (error: any) {
    await logLine('error', 'newsChat: Error', {
      message: error?.message,
      stack: error?.stack?.substring(0, 500),
      errorType: error?.constructor?.name
    })
    setHeaders(event, { 'Content-Type': 'application/json' })
    return {
      error: error?.message || 'An error occurred processing your request',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }
  }
})

/**
 * Fallback REST API implementation if SDK is not available
 */
async function streamViaRestAPI(
  geminiApiKey: string,
  article: NewsChatRequest['article'],
  question: string,
  history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  event: any
) {
  const systemInstruction = `You are a helpful assistant that answers questions about news articles. 
IMPORTANT: You MUST only base your responses on the provided article content. 
Do NOT use external knowledge. If asked about something not in the article, politely say you can only discuss what's in the article.

ARTICLE:
Title: ${article.title}
Summary: ${article.summary}
Content: ${article.fullContent || article.summary}`

  // Set headers for streaming response
  setHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  })

  const encoder = new TextEncoder()

  // Try multiple model endpoints - use v1 API and try different models
  const models = [
    'gemini-2.5-flash',
    'gemini-1.5-flash-latest', 
    'gemini-1.5-pro',
    'gemini-pro'
  ]
  
  await logLine('info', 'newsChat: Using REST API fallback', {
    tryingModels: models
  })
  
  // Try v1 API first (newer), then v1beta
  const apiVersions = ['v1', 'v1beta']
  
  const readableStream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'))

      let lastError: Error | null = null
      
      for (const apiVersion of apiVersions) {
        for (const modelName of models) {
          try {
            const apiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${geminiApiKey}`
            
            await logLine('info', 'newsChat: Trying REST API', {
              apiVersion,
              model: modelName,
              url: apiUrl.replace(geminiApiKey, '***REDACTED***')
            })
            
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                contents: [
                  {
                    role: 'user',
                    parts: [{ text: systemInstruction }]
                  },
                  {
                    role: 'model',
                    parts: [{ text: 'I understand. I will only answer based on the article.' }]
                  },
                  ...history.map(msg => ({
                    role: msg.role,
                    parts: msg.parts
                  })),
                  {
                    role: 'user',
                    parts: [{ text: question }]
                  }
                ]
              })
            })

            if (!response.ok) {
              const errorText = await response.text()
              lastError = new Error(`API error: ${response.status} - ${errorText}`)
              await logLine('warn', 'newsChat: REST API attempt failed', {
                apiVersion,
                model: modelName,
                status: response.status,
                error: errorText.substring(0, 200)
              })
              // Continue to next model
              continue
            }

            await logLine('info', 'newsChat: REST API success', {
              apiVersion,
              model: modelName
            })

            const responseData = await response.json()
            
            await logLine('info', 'newsChat: Google API response received', {
              hasCandidates: !!responseData.candidates,
              candidatesLength: responseData.candidates?.length || 0
            })

            // Extract text from response
            if (responseData.candidates?.[0]?.content?.parts?.[0]?.text) {
              const fullText = responseData.candidates[0].content.parts[0].text
              
              await logLine('info', 'newsChat: Extracted text from response', {
                textLength: fullText.length,
                preview: fullText.substring(0, 100)
              })
              
              // Simulate streaming by sending chunks
              const words = fullText.split(' ')
              for (let i = 0; i < words.length; i++) {
                const chunk = (i > 0 ? ' ' : '') + words[i]
                const eventData = JSON.stringify({
                  type: 'chunk',
                  text: chunk
                })
                controller.enqueue(encoder.encode(`data: ${eventData}\n\n`))
                
                // Small delay to simulate streaming
                await new Promise(resolve => setTimeout(resolve, 20))
              }
              
              controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'))
              controller.close()
              return // Success - exit function
            } else {
              await logLine('warn', 'newsChat: No text in API response', {
                responseKeys: Object.keys(responseData),
                responsePreview: JSON.stringify(responseData).substring(0, 200)
              })
              // Try next model
              continue
            }
          } catch (fetchError: any) {
            lastError = fetchError
            await logLine('warn', 'newsChat: REST API fetch error', {
              apiVersion,
              model: modelName,
              error: fetchError?.message
            })
            continue
          }
        }
      }
      
      // If all attempts failed, send error
      await logLine('error', 'newsChat: All REST API attempts failed', {
        lastError: lastError?.message
      })
      const errorData = JSON.stringify({
        type: 'error',
        message: lastError?.message || 'All API endpoint attempts failed. Please check your API key and try again.'
      })
      controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
      controller.close()
    }
  })

  return readableStream
}

