/**
 * Gemini API Models Debugger
 * 
 * This utility file helps diagnose which Gemini models and API versions are available.
 * Run this to test different model names and API versions before using them in production.
 * 
 * Usage:
 * 1. Set GOOGLE_AI_KEY in your environment
 * 2. Import and call testGeminiModels() from your code
 * 3. Check the logs for which models/versions work
 */

import { logLine } from '../utils/logger'

interface ModelTestResult {
  apiVersion: string
  modelName: string
  success: boolean
  status?: number
  error?: string
  responseTime?: number
}

/**
 * Test a single Gemini API model and version combination
 */
async function testGeminiModel(
  apiKey: string,
  apiVersion: string,
  modelName: string
): Promise<ModelTestResult> {
  const startTime = Date.now()
  const apiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${apiKey}`
  
  try {
    await logLine('info', `Testing: ${apiVersion}/${modelName}`, {
      url: apiUrl.replace(apiKey, '***REDACTED***')
    })

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Hello, this is a test. Please respond with "OK".'
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 10
        }
      })
    })

    const responseTime = Date.now() - startTime
    const responseText = await response.text()

    if (response.ok) {
      try {
        const data = JSON.parse(responseText)
        await logLine('info', `✅ SUCCESS: ${apiVersion}/${modelName}`, {
          responseTime: `${responseTime}ms`,
          hasCandidates: !!data.candidates,
          finishReason: data.candidates?.[0]?.finishReason
        })
        return {
          apiVersion,
          modelName,
          success: true,
          status: response.status,
          responseTime
        }
      } catch (parseError) {
        await logLine('warn', `⚠️  Parse error for ${apiVersion}/${modelName}`, {
          responseText: responseText.substring(0, 200)
        })
        return {
          apiVersion,
          modelName,
          success: false,
          status: response.status,
          error: 'Failed to parse response',
          responseTime
        }
      }
    } else {
      let errorMessage = responseText
      try {
        const errorJson = JSON.parse(responseText)
        errorMessage = errorJson.error?.message || errorJson.message || responseText
      } catch {
        // Use raw response text
      }

      await logLine('error', `❌ FAILED: ${apiVersion}/${modelName}`, {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage.substring(0, 200),
        responseTime: `${responseTime}ms`
      })

      return {
        apiVersion,
        modelName,
        success: false,
        status: response.status,
        error: errorMessage.substring(0, 200),
        responseTime
      }
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    await logLine('error', `❌ EXCEPTION: ${apiVersion}/${modelName}`, {
      error: error?.message || String(error),
      responseTime: `${responseTime}ms`
    })
    return {
      apiVersion,
      modelName,
      success: false,
      error: error?.message || String(error),
      responseTime
    }
  }
}

/**
 * Test multiple Gemini API models and versions
 * Returns a summary of which combinations work
 */
export async function testGeminiModels(apiKey: string): Promise<{
  working: ModelTestResult[]
  failed: ModelTestResult[]
  summary: string
}> {
  await logLine('info', '🔍 Starting Gemini Models Debug Test', {
    timestamp: new Date().toISOString()
  })

  // Common API versions
  const apiVersions = ['v1', 'v1beta']
  
  // Common model names to test
  const modelNames = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro'
  ]

  const results: ModelTestResult[] = []

  // Test each combination
  for (const apiVersion of apiVersions) {
    for (const modelName of modelNames) {
      const result = await testGeminiModel(apiKey, apiVersion, modelName)
      results.push(result)
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  const working = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  await logLine('info', `📊 Gemini API Models Test Results:`, {
    workingCount: working.length,
    failedCount: failed.length,
    totalTests: results.length
  })

  await logLine('info', `✅ Working Models (${working.length}):`, {
    models: working.map(r => `${r.apiVersion}/${r.modelName}`)
  })

  if (failed.length > 0) {
    await logLine('warn', `❌ Failed Models (${failed.length}):`, {
      models: failed.map(r => `${r.apiVersion}/${r.modelName}: ${r.error}`).slice(0, 10)
    })
  }

  const summary = `📊 Gemini API Models Test Results:
✅ Working: ${working.length} models
❌ Failed: ${failed.length} models
Total Tests: ${results.length}

Working Models:
${working.map(r => `  - ${r.apiVersion}/${r.modelName}`).join('\n')}

Failed Models:
${failed.slice(0, 10).map(r => `  - ${r.apiVersion}/${r.modelName}: ${r.error}`).join('\n')}
`

  return {
    working,
    failed,
    summary
  }
}

/**
 * Quick test function to check if a specific model/version works
 */
export async function quickTest(
  apiKey: string,
  apiVersion: string = 'v1',
  modelName: string = 'gemini-1.5-flash'
): Promise<boolean> {
  const result = await testGeminiModel(apiKey, apiVersion, modelName)
  return result.success
}
