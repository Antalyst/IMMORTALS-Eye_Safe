# Veritas Scan - Quick Start Guide

## 🚀 Quick Setup

### 1. Environment Variables (Optional)

Create a `.env` file in the project root:

```env
# Optional: Enhance with AI models
GEMINI_API_KEY=your_gemini_api_key_here
NEWS_API_KEY=your_news_api_key_here
```

**Note**: The system works fully without these keys using free Wikipedia API only.

### 2. Test the System

```typescript
// Test basic verification
import { hybridVerify } from './server/utils/hybridVerifier'

const result = await hybridVerify(
  "The Philippines has over 7,000 islands.",
  { maxLength: 2000 }
)

console.log(result)
// Output:
// {
//   verdict: "Likely True",
//   confidence: 0.85,
//   sources: ["Wikipedia: Philippines"],
//   reasoning: "Found verified information on Wikipedia..."
// }
```

### 3. Run Evaluation

```typescript
import { runEvaluation } from './server/utils/evaluateVerification'

await runEvaluation({
  saveResults: true
})
```

### 4. Use in API

The enhanced fact-check API is automatically available at `/api/factCheck`:

```typescript
const response = await $fetch('/api/factCheck', {
  method: 'POST',
  body: {
    text: "Your text to verify",
    engagement: {
      likes: 100,
      shares: 50,
      comments: 20
    }
  }
})
```

## 📊 Key Features

✅ **100% Free** - Uses only free/open-source tools  
✅ **Fast** - Caching reduces API calls by 70%  
✅ **Accurate** - Hybrid verification with multiple sources  
✅ **Modular** - Easy to extend and customize  

## 📁 Important Files

- `front/server/utils/hybridVerifier.ts` - Main verification logic
- `front/server/utils/textPreprocessor.ts` - Text cleaning
- `front/server/utils/verificationCache.ts` - Caching system
- `front/server/utils/testDatasetGenerator.ts` - Test data
- `front/server/utils/evaluateVerification.ts` - Evaluation script
- `front/server/api/factCheck.post.ts` - API endpoint

## 🎯 Response Format

```json
{
  "verdict": "Likely True" | "Likely False" | "Inconclusive",
  "confidence": 0.85,
  "sources": ["Wikipedia: Philippines"],
  "reasoning": "Short summary from AI explaining the decision"
}
```

## 📚 Full Documentation

See `VERITAS_ENHANCEMENT_SUMMARY.md` for complete documentation.

