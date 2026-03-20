<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">VeritasScan Diagnostic Tool</h1>
      
      <!-- Diagnostics Section -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4">System Diagnostics</h2>
        <button 
          @click="runDiagnostics" 
          :disabled="isRunningDiagnostics"
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 mb-4"
        >
          {{ isRunningDiagnostics ? 'Running...' : 'Run Diagnostics' }}
        </button>
        
        <div v-if="diagnostics" class="space-y-4">
          <!-- Browser Info -->
          <div class="border rounded p-4">
            <h3 class="font-semibold text-lg mb-2">Browser Compatibility</h3>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div>User Agent: {{ diagnostics.browser.userAgent.substring(0, 50) }}...</div>
              <div>WebAssembly: {{ diagnostics.browser.webassembly ? '✅ Supported' : '❌ Not Supported' }}</div>
              <div>Web Workers: {{ diagnostics.browser.workers ? '✅ Supported' : '❌ Not Supported' }}</div>
            </div>
          </div>
          
          <!-- Transformers Status -->
          <div class="border rounded p-4">
            <h3 class="font-semibold text-lg mb-2">Transformers.js Library</h3>
            <div class="text-sm">
              <div>Loaded: {{ diagnostics.transformers.loaded ? '✅ Yes' : '❌ No' }}</div>
              <div v-if="diagnostics.transformers.loaded">Version: {{ diagnostics.transformers.version }}</div>
              <div v-if="diagnostics.transformers.error" class="text-red-600">Error: {{ diagnostics.transformers.error }}</div>
              
              <div v-if="diagnostics.transformers.env" class="mt-2">
                <strong>Environment:</strong>
                <div>Allow Remote Models: {{ diagnostics.transformers.env.allowRemoteModels }}</div>
                <div>Remote Host: {{ diagnostics.transformers.env.remoteHost }}</div>
              </div>
            </div>
          </div>
          
          <!-- Model Status -->
          <div class="border rounded p-4">
            <h3 class="font-semibold text-lg mb-2">AI Models</h3>
            <div class="text-sm">
              <div>Truthfulness Model: {{ diagnostics.models.truthfulness ? '✅ Working' : '❌ Failed' }}</div>
              <div>Sentiment Model: {{ diagnostics.models.sentiment ? '✅ Working' : '❌ Failed' }}</div>
              <div v-if="diagnostics.models.details.truthfulnessError" class="text-red-600">
                Truthfulness Error: {{ diagnostics.models.details.truthfulnessError }}
              </div>
              <div v-if="diagnostics.models.details.sentimentError" class="text-red-600">
                Sentiment Error: {{ diagnostics.models.details.sentimentError }}
              </div>
            </div>
          </div>
          
          <!-- Network Status -->
          <div class="border rounded p-4">
            <h3 class="font-semibold text-lg mb-2">Network Connectivity</h3>
            <div class="text-sm">
              <div>HuggingFace: {{ diagnostics.network.huggingface ? '✅ Accessible' : '❌ Blocked' }}</div>
              <div>CDN (jsDelivr): {{ diagnostics.network.cdn ? '✅ Accessible' : '❌ Blocked' }}</div>
              <div v-if="diagnostics.network.error" class="text-red-600">{{ diagnostics.network.error }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Test Scan Section -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold mb-4">Test Scan</h2>
        <p class="text-gray-600 mb-4">
          This section allows you to test the VeritasScan functionality with sample content.
        </p>
        
        <div class="space-y-4">
          <button 
            @click="testWithSampleText"
            :disabled="isScanning"
            class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {{ isScanning ? 'Scanning...' : 'Test with Sample Text' }}
          </button>
          
          <div v-if="scanResults" class="border rounded p-4">
            <h3 class="font-semibold mb-2">Scan Results</h3>
            <pre class="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-64">{{ JSON.stringify(scanResults, null, 2) }}</pre>
          </div>
          
          <div v-if="scanError" class="border border-red-300 bg-red-50 p-4 rounded">
            <h3 class="font-semibold text-red-800 mb-2">Scan Error</h3>
            <p class="text-red-700">{{ scanError }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useVeritasScan } from '~/composables/useVeritasScan'

const { runDiagnostics: runVeritasDiagnostics, scan, analyzing, lastError } = useVeritasScan()

const isRunningDiagnostics = ref(false)
const diagnostics = ref(null)
const scanResults = ref(null)
const scanError = ref(null)
const isScanning = ref(false)

async function runDiagnostics() {
  isRunningDiagnostics.value = true
  try {
    diagnostics.value = await runVeritasDiagnostics()
  } catch (error) {
    console.error('Diagnostics failed:', error)
    scanError.value = `Diagnostics failed: ${error.message}`
  } finally {
    isRunningDiagnostics.value = false
  }
}

async function testWithSampleText() {
  isScanning.value = true
  scanError.value = null
  scanResults.value = null
  
  try {
    // Create a mock canvas with text content
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    const ctx = canvas.getContext('2d')
    
    // Draw background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Draw sample text
    ctx.fillStyle = 'black'
    ctx.font = '24px Arial'
    ctx.fillText('Bago Component City Police Station', 50, 100)
    ctx.font = '18px Arial'
    ctx.fillText('URGENT: Crime reported in downtown area. Please stay alert.', 50, 150)
    ctx.fillText('Contact local authorities if you have information.', 50, 180)
    
    // Run scan
    await scan(canvas)
    
    // Get results from the composable
    scanResults.value = {
      analyzing: analyzing.value,
      lastError: lastError.value,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Test scan failed:', error)
    scanError.value = `Test scan failed: ${error.message}`
  } finally {
    isScanning.value = false
  }
}
</script>
