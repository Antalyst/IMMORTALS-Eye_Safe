/**
 * Evaluation Script for Verification System
 * Tests accuracy, precision, and recall
 */

import { generateTestDataset, type TestPost } from './testDatasetGenerator'
import { hybridVerify } from './hybridVerifier'

export interface EvaluationMetrics {
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  truePositives: number
  trueNegatives: number
  falsePositives: number
  falseNegatives: number
  total: number
}

export interface EvaluationResult {
  metrics: EvaluationMetrics
  detailedResults: Array<{
    post: TestPost
    actualVerdict: string
    actualConfidence: number
    expectedVerdict: string
    expectedConfidence: number
    match: boolean
  }>
}

/**
 * Evaluate verification system against test dataset
 */
export async function evaluateVerificationSystem(
  dataset: TestPost[] = generateTestDataset(),
  options: {
    geminiApiKey?: string
    newsApiKey?: string
  } = {}
): Promise<EvaluationResult> {
  const detailedResults: EvaluationResult['detailedResults'] = []
  
  console.log(`Evaluating ${dataset.length} test posts...`)
  
  for (const post of dataset) {
    try {
      const result = await hybridVerify(post.text, {
        geminiApiKey: options.geminiApiKey,
        newsApiKey: options.newsApiKey,
        maxLength: 2000
      })
      
      const match = result.verdict === post.expectedVerdict
      
      detailedResults.push({
        post,
        actualVerdict: result.verdict,
        actualConfidence: result.confidence,
        expectedVerdict: post.expectedVerdict,
        expectedConfidence: post.expectedConfidence,
        match
      })
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error: any) {
      console.error(`Error evaluating post ${post.id}:`, error.message)
      detailedResults.push({
        post,
        actualVerdict: 'Inconclusive',
        actualConfidence: 0,
        expectedVerdict: post.expectedVerdict,
        expectedConfidence: post.expectedConfidence,
        match: false
      })
    }
  }
  
  // Calculate metrics
  const metrics = calculateMetrics(detailedResults)
  
  return {
    metrics,
    detailedResults
  }
}

/**
 * Calculate evaluation metrics
 */
function calculateMetrics(
  results: EvaluationResult['detailedResults']
): EvaluationMetrics {
  let truePositives = 0  // Correctly identified as True (real)
  let trueNegatives = 0  // Correctly identified as False (fake)
  let falsePositives = 0 // Incorrectly identified as True (fake marked as real)
  let falseNegatives = 0 // Incorrectly identified as False (real marked as fake)
  
  for (const result of results) {
    const expected = result.expectedVerdict
    const actual = result.actualVerdict
    
    // For "Likely True" (real posts)
    if (expected === 'Likely True') {
      if (actual === 'Likely True') {
        truePositives++
      } else if (actual === 'Likely False') {
        falseNegatives++
      }
      // Inconclusive counts as neither
    }
    
    // For "Likely False" (fake posts)
    if (expected === 'Likely False') {
      if (actual === 'Likely False') {
        trueNegatives++
      } else if (actual === 'Likely True') {
        falsePositives++
      }
      // Inconclusive counts as neither
    }
  }
  
  const total = results.length
  const correct = truePositives + trueNegatives
  const accuracy = total > 0 ? correct / total : 0
  
  // Precision: Of all items marked as "Likely True", how many were actually true?
  const precision = (truePositives + falsePositives) > 0 
    ? truePositives / (truePositives + falsePositives) 
    : 0
  
  // Recall: Of all actual true items, how many did we correctly identify?
  const recall = (truePositives + falseNegatives) > 0
    ? truePositives / (truePositives + falseNegatives)
    : 0
  
  // F1 Score: Harmonic mean of precision and recall
  const f1Score = (precision + recall) > 0
    ? (2 * precision * recall) / (precision + recall)
    : 0
  
  return {
    accuracy,
    precision,
    recall,
    f1Score,
    truePositives,
    trueNegatives,
    falsePositives,
    falseNegatives,
    total
  }
}

/**
 * Print evaluation report
 */
export function printEvaluationReport(result: EvaluationResult): void {
  const { metrics, detailedResults } = result
  
  console.log('\n' + '='.repeat(60))
  console.log('VERIFICATION SYSTEM EVALUATION REPORT')
  console.log('='.repeat(60))
  console.log(`\nTotal Test Posts: ${metrics.total}`)
  console.log(`\nConfusion Matrix:`)
  console.log(`  True Positives (TP): ${metrics.truePositives}  - Correctly identified real posts`)
  console.log(`  True Negatives (TN): ${metrics.trueNegatives}  - Correctly identified fake posts`)
  console.log(`  False Positives (FP): ${metrics.falsePositives}  - Fake posts marked as real`)
  console.log(`  False Negatives (FN): ${metrics.falseNegatives}  - Real posts marked as fake`)
  
  console.log(`\nMetrics:`)
  console.log(`  Accuracy:  ${(metrics.accuracy * 100).toFixed(2)}%  - Overall correctness`)
  console.log(`  Precision: ${(metrics.precision * 100).toFixed(2)}%  - Of items marked as true, how many were actually true`)
  console.log(`  Recall:    ${(metrics.recall * 100).toFixed(2)}%  - Of actual true items, how many were found`)
  console.log(`  F1 Score:  ${(metrics.f1Score * 100).toFixed(2)}%  - Harmonic mean of precision and recall`)
  
  console.log(`\nDetailed Results:`)
  console.log('-'.repeat(60))
  
  let correctCount = 0
  let incorrectCount = 0
  
  detailedResults.forEach((result, index) => {
    const status = result.match ? '✓' : '✗'
    const category = result.post.category === 'real' ? 'REAL' : 'FAKE'
    console.log(`${index + 1}. [${status}] ${category} - Expected: ${result.expectedVerdict}, Got: ${result.actualVerdict} (${(result.actualConfidence * 100).toFixed(0)}%)`)
    console.log(`   Text: ${result.post.text.substring(0, 80)}...`)
    
    if (result.match) {
      correctCount++
    } else {
      incorrectCount++
    }
  })
  
  console.log('\n' + '='.repeat(60))
  console.log(`Summary: ${correctCount} correct, ${incorrectCount} incorrect`)
  console.log('='.repeat(60) + '\n')
}

/**
 * Run evaluation and save results
 */
export async function runEvaluation(
  options: {
    geminiApiKey?: string
    newsApiKey?: string
    saveResults?: boolean
  } = {}
): Promise<EvaluationResult> {
  const dataset = generateTestDataset()
  const result = await evaluateVerificationSystem(dataset, options)
  
  printEvaluationReport(result)
  
  if (options.saveResults) {
    const fs = require('fs')
    const path = require('path')
    const filePath = path.join(process.cwd(), 'evaluation-results.json')
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8')
    console.log(`Results saved to ${filePath}`)
  }
  
  return result
}

