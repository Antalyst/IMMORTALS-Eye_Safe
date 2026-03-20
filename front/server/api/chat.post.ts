import { defineEventHandler, readBody, setHeaders } from 'h3'
import { logLine } from '../utils/logger'

/**
 * Streaming Chat API using Gemini 2.5 Flash
 * 
 * This endpoint:
 * - Accepts POST requests with message and optional history
 * - Uses @google/genai SDK to create a chat session
 * - Streams responses in real-time using Server-Sent Events (SSE)
 * - Secures API key on backend (never exposed to frontend)
 */

interface ChatRequest {
  message: string
  history?: Array<{
    role: 'user' | 'model'
    parts: Array<{ text: string }>
  }>
}

export default defineEventHandler(async (event) => {
  try {
    // Get API key from environment variables (secured on backend)
    // Uses GOOGLE_AI_KEY from .env file
    const config = useRuntimeConfig()
    const geminiApiKey = config.googleAiKey || config.googleAiApi || process.env.GOOGLE_AI_KEY

    if (!geminiApiKey) {
      await logLine('error', 'chat: Missing GOOGLE_AI_KEY')
      return new Response(
        JSON.stringify({ error: 'API key not configured. Please set GOOGLE_AI_KEY in your environment variables.' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Read request body
    const body = (await readBody(event)) as ChatRequest

    if (!body?.message || typeof body.message !== 'string') {
      await logLine('warn', 'chat: Missing or invalid message', { hasMessage: !!body?.message })
      return new Response(
        JSON.stringify({ error: 'Message is required and must be a string' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const { message, history = [] } = body

    await logLine('info', 'chat: Starting streaming chat', {
      messageLength: message.length,
      historyLength: history.length
    })

    // Import Google Generative AI SDK
    // Note: This requires @google/generative-ai package: npm install @google/generative-ai
    let GoogleGenerativeAI: any
    try {
      // Try dynamic import (works in both ESM and CommonJS)
      // @ts-ignore - Package may not be installed yet
      const genaiModule = await import('@google/generative-ai')
      GoogleGenerativeAI = genaiModule.GoogleGenerativeAI || genaiModule.default?.GoogleGenerativeAI
      
      if (!GoogleGenerativeAI) {
        // Fallback: try alternative import path
        try {
          // @ts-ignore - Package may not be installed yet
          const altImport = await import('@google/genai')
          GoogleGenerativeAI = altImport.GoogleGenerativeAI || altImport.default?.GoogleGenerativeAI
        } catch {
          // Ignore alternative import error
        }
      }
    } catch (importError: any) {
      await logLine('warn', 'chat: SDK not available, using REST API fallback', {
        error: importError?.message,
        hint: 'Run: npm install @google/generative-ai for better performance'
      })
      
      // Fallback: Use REST API if SDK not available
      return await streamViaRestAPI(geminiApiKey, message, history || [], event)
    }

    if (!GoogleGenerativeAI) {
      await logLine('error', 'chat: GoogleGenerativeAI not found in package')
      return await streamViaRestAPI(geminiApiKey, message, history || [], event)
    }

    // Initialize Gemini client
    const genAI = new GoogleGenerativeAI(geminiApiKey)
    
    // Use gemini-2.5-flash model (or gemini-1.5-flash as fallback)
    let model
    try {
      model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    } catch (modelError: any) {
      await logLine('warn', 'chat: gemini-2.5-flash not available, trying gemini-1.5-flash', {
        error: modelError?.message
      })
      model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    }

    // Convert history format if needed
    // Gemini expects: [{ role: 'user', parts: [{ text: '...' }] }, { role: 'model', parts: [{ text: '...' }] }]
    const formattedHistory = (history || []).map((item: any) => ({
      role: item.role === 'user' ? 'user' : 'model',
      parts: item.parts && item.parts.length > 0 
        ? item.parts 
        : [{ text: typeof item.text === 'string' ? item.text : (item.parts?.[0]?.text || '') }]
    }))

    // Start chat session with history
    const chat = model.startChat({
      history: formattedHistory
    })

    // Set headers for Server-Sent Events (SSE) streaming
    setHeaders(event, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable buffering in nginx
    })

    // Create a readable stream to send chunks
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial connection message
          const encoder = new TextEncoder()
          controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'))

          // Use sendMessageStream to get streaming response
          const result = await chat.sendMessageStream(message)

          // Stream chunks as they arrive
          for await (const chunk of result.stream) {
            // Extract text from chunk (methods vary by SDK version)
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
              // Format as SSE data
              const data = JSON.stringify({
                type: 'chunk',
                text: chunkText
              })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
          }

          // Send completion message
          controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'))
          
          // Close stream
          controller.close()

          await logLine('info', 'chat: Streaming completed successfully')

        } catch (streamError: any) {
          await logLine('error', 'chat: Streaming error', {
            error: streamError?.message,
            stack: streamError?.stack?.substring(0, 500)
          })

          // Send error message
          const encoder = new TextEncoder()
          const errorData = JSON.stringify({
            type: 'error',
            error: streamError?.message || 'Streaming error occurred'
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.close()
        }
      }
    })

    // Return streaming response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (error: any) {
    await logLine('error', 'chat: Handler error', {
      error: error?.message,
      stack: error?.stack?.substring(0, 500)
    })

    return new Response(
      JSON.stringify({ 
        error: 'Failed to process chat request',
        details: error?.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})

/**
 * Fallback: Stream using REST API if SDK is not available
 */
async function streamViaRestAPI(
  apiKey: string,
  message: string,
  history: ChatRequest['history'],
  event: any
) {
  await logLine('info', 'chat: Using REST API fallback for streaming')

  // Set SSE headers
  setHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  })

  // Convert history to Gemini API format
  const contents: any[] = []
  
  // Add history as contents
  if (history && Array.isArray(history)) {
    history.forEach((item) => {
      contents.push({
        role: item.role === 'user' ? 'user' : 'model',
        parts: item.parts || [{ text: '' }]
      })
    })
  }

  // Add current message
  contents.push({
    role: 'user',
    parts: [{ text: message }]
  })

  // Use Gemini REST API with streaming
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${apiKey}`

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents
      })
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('No response body for streaming')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'))

          while (true) {
            const { done, value } = await reader.read()
            
            if (done) {
              controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'))
              controller.close()
              break
            }

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.substring(6))
                  const candidates = data?.candidates || []
                  
                  for (const candidate of candidates) {
                    const content = candidate?.content
                    const parts = content?.parts || []
                    
                    for (const part of parts) {
                      if (part.text) {
                        const streamData = JSON.stringify({
                          type: 'chunk',
                          text: part.text
                        })
                        controller.enqueue(encoder.encode(`data: ${streamData}\n\n`))
                      }
                    }
                  }
                } catch (parseError) {
                  // Skip invalid JSON lines
                  continue
                }
              }
            }
          }
        } catch (streamError: any) {
          await logLine('error', 'chat: REST API streaming error', {
            error: streamError?.message
          })

          const errorData = JSON.stringify({
            type: 'error',
            error: streamError?.message || 'Streaming error'
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (apiError: any) {
    await logLine('error', 'chat: REST API call failed', {
      error: apiError?.message
    })

    return new Response(
      JSON.stringify({ 
        error: 'Failed to connect to Gemini API',
        details: apiError?.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

