/**
 * Text Preprocessing Utility
 * Removes URLs, emojis, hashtags, and normalizes text for analysis
 */

export interface PreprocessedText {
  cleaned: string
  removed: {
    urls: string[]
    emojis: string[]
    hashtags: string[]
    symbols: string[]
  }
  originalLength: number
  cleanedLength: number
}

/**
 * Remove URLs from text
 */
function removeUrls(text: string): { cleaned: string; removed: string[] } {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g
  const urls: string[] = []
  const cleaned = text.replace(urlRegex, (match) => {
    urls.push(match)
    return ''
  })
  return { cleaned, removed: urls }
}

/**
 * Remove emojis from text
 */
function removeEmojis(text: string): { cleaned: string; removed: string[] } {
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu
  const emojis: string[] = []
  const cleaned = text.replace(emojiRegex, (match) => {
    emojis.push(match)
    return ''
  })
  return { cleaned, removed: emojis }
}

/**
 * Remove hashtags from text
 */
function removeHashtags(text: string): { cleaned: string; removed: string[] } {
  const hashtagRegex = /#\w+/g
  const hashtags: string[] = []
  const cleaned = text.replace(hashtagRegex, (match) => {
    hashtags.push(match)
    return ''
  })
  return { cleaned, removed: hashtags }
}

/**
 * Remove extra symbols and normalize
 */
function removeExtraSymbols(text: string): { cleaned: string; removed: string[] } {
  // Keep basic punctuation but remove excessive symbols
  const symbolsRegex = /[^\w\s.,!?;:'"-]/g
  const symbols: string[] = []
  const cleaned = text.replace(symbolsRegex, (match) => {
    symbols.push(match)
    return ''
  })
  return { cleaned, removed: symbols }
}

/**
 * Normalize whitespace
 */
function normalizeWhitespace(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Multiple spaces to single
    .replace(/\n\s*\n/g, '\n') // Multiple newlines to single
    .trim()
}

/**
 * Preprocess text for analysis
 * @param text - Original text to preprocess
 * @param maxLength - Maximum length after preprocessing (default: 2000)
 * @param toLowerCase - Convert to lowercase (default: true)
 */
export function preprocessText(
  text: string,
  maxLength: number = 2000,
  toLowerCase: boolean = true
): PreprocessedText {
  const originalLength = text.length
  let cleaned = text

  // Step 1: Remove URLs
  const urlResult = removeUrls(cleaned)
  cleaned = urlResult.cleaned

  // Step 2: Remove emojis
  const emojiResult = removeEmojis(cleaned)
  cleaned = emojiResult.cleaned

  // Step 3: Remove hashtags
  const hashtagResult = removeHashtags(cleaned)
  cleaned = hashtagResult.cleaned

  // Step 4: Remove extra symbols
  const symbolResult = removeExtraSymbols(cleaned)
  cleaned = symbolResult.cleaned

  // Step 5: Normalize whitespace
  cleaned = normalizeWhitespace(cleaned)

  // Step 6: Convert to lowercase if requested
  if (toLowerCase) {
    cleaned = cleaned.toLowerCase()
  }

  // Step 7: Limit length
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength)
  }

  return {
    cleaned,
    removed: {
      urls: urlResult.removed,
      emojis: emojiResult.removed,
      hashtags: hashtagResult.removed,
      symbols: symbolResult.removed
    },
    originalLength,
    cleanedLength: cleaned.length
  }
}

