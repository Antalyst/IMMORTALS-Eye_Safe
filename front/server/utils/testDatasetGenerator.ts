/**
 * Test Dataset Generator
 * Generates 20-30 sample news posts (half real, half fake) for testing
 */

export interface TestPost {
  id: string
  text: string
  expectedVerdict: 'Likely True' | 'Likely False' | 'Inconclusive'
  expectedConfidence: number // 0-1
  category: 'real' | 'fake'
  tags: string[]
}

/**
 * Real news posts (verified facts)
 */
const realPosts: Partial<TestPost>[] = [
  {
    text: "The Philippines has over 7,000 islands, making it one of the largest archipelagos in the world.",
    expectedVerdict: 'Likely True',
    expectedConfidence: 0.9,
    tags: ['geography', 'facts']
  },
  {
    text: "Manila is the capital city of the Philippines, located in Metro Manila.",
    expectedVerdict: 'Likely True',
    expectedConfidence: 0.95,
    tags: ['geography', 'facts']
  },
  {
    text: "The Philippine peso (PHP) is the official currency of the Philippines.",
    expectedVerdict: 'Likely True',
    expectedConfidence: 0.95,
    tags: ['economics', 'facts']
  },
  {
    text: "Mount Mayon is an active volcano located in Albay province, Philippines.",
    expectedVerdict: 'Likely True',
    expectedConfidence: 0.9,
    tags: ['geography', 'volcano']
  },
  {
    text: "The Philippines became independent from Spain on June 12, 1898.",
    expectedVerdict: 'Likely True',
    expectedConfidence: 0.9,
    tags: ['history', 'facts']
  },
  {
    text: "Tagalog is one of the official languages of the Philippines, along with English.",
    expectedVerdict: 'Likely True',
    expectedConfidence: 0.9,
    tags: ['language', 'facts']
  },
  {
    text: "The Philippine flag features a sun with eight rays, representing the first eight provinces that revolted against Spanish rule.",
    expectedVerdict: 'Likely True',
    expectedConfidence: 0.85,
    tags: ['history', 'symbols']
  },
  {
    text: "Boracay is a popular tourist destination in the Philippines, known for its white sand beaches.",
    expectedVerdict: 'Likely True',
    expectedConfidence: 0.9,
    tags: ['tourism', 'geography']
  },
  {
    text: "The Philippines has a tropical climate with two main seasons: dry and wet.",
    expectedVerdict: 'Likely True',
    expectedConfidence: 0.9,
    tags: ['climate', 'facts']
  },
  {
    text: "Filipino cuisine includes dishes like adobo, sinigang, and lechon.",
    expectedVerdict: 'Likely True',
    expectedConfidence: 0.85,
    tags: ['culture', 'food']
  },
  {
    text: "The University of the Philippines is the country's national university.",
    expectedVerdict: 'Likely True',
    expectedConfidence: 0.9,
    tags: ['education', 'facts']
  },
  {
    text: "The Philippines is a founding member of the Association of Southeast Asian Nations (ASEAN).",
    expectedVerdict: 'Likely True',
    expectedConfidence: 0.85,
    tags: ['politics', 'international']
  },
  {
    text: "The Banaue Rice Terraces are ancient terraces carved into the mountains of Ifugao province.",
    expectedVerdict: 'Likely True',
    expectedConfidence: 0.9,
    tags: ['culture', 'geography', 'UNESCO']
  },
  {
    text: "The Philippines has a population of over 100 million people.",
    expectedVerdict: 'Likely True',
    expectedConfidence: 0.9,
    tags: ['demographics', 'facts']
  },
  {
    text: "Cebu is the second largest city in the Philippines by population.",
    expectedVerdict: 'Likely True',
    expectedConfidence: 0.85,
    tags: ['geography', 'demographics']
  }
]

/**
 * Fake/misinformation posts
 */
const fakePosts: Partial<TestPost>[] = [
  {
    text: "BREAKING: Apolaki Caldera is the LARGEST caldera on Earth, dwarfing Yellowstone! Scientists confirm it will erupt within 6 months!",
    expectedVerdict: 'Likely False',
    expectedConfidence: 0.9,
    tags: ['disaster', 'volcano', 'fake-news']
  },
  {
    text: "URGENT: Scientists discovered a hidden supervolcano under Manila that could destroy the entire Philippines. Share this immediately!",
    expectedVerdict: 'Likely False',
    expectedConfidence: 0.95,
    tags: ['disaster', 'volcano', 'fake-news', 'panic']
  },
  {
    text: "The Philippine government has been hiding the truth about a massive earthquake that will hit Metro Manila tomorrow. Everyone must evacuate now!",
    expectedVerdict: 'Likely False',
    expectedConfidence: 0.9,
    tags: ['disaster', 'earthquake', 'fake-news', 'panic']
  },
  {
    text: "Philippines has 50,000 islands, not 7,000. The government is lying to you about the actual number.",
    expectedVerdict: 'Likely False',
    expectedConfidence: 0.85,
    tags: ['geography', 'conspiracy']
  },
  {
    text: "Manila is NOT the capital of the Philippines. The real capital is a secret city that the government doesn't want you to know about.",
    expectedVerdict: 'Likely False',
    expectedConfidence: 0.95,
    tags: ['geography', 'conspiracy', 'fake-news']
  },
  {
    text: "BREAKING: The Philippine peso will be replaced by a new digital currency next month. All cash will become worthless!",
    expectedVerdict: 'Likely False',
    expectedConfidence: 0.8,
    tags: ['economics', 'fake-news', 'panic']
  },
  {
    text: "Mount Mayon is actually a dormant volcano that will never erupt again. All recent eruptions were staged by the government.",
    expectedVerdict: 'Likely False',
    expectedConfidence: 0.85,
    tags: ['volcano', 'conspiracy', 'fake-news']
  },
  {
    text: "The Philippines was never colonized by Spain. All history books are wrong. This is a massive cover-up!",
    expectedVerdict: 'Likely False',
    expectedConfidence: 0.95,
    tags: ['history', 'conspiracy', 'fake-news']
  },
  {
    text: "URGENT: Scientists confirm that eating Filipino food causes serious health problems. The government has been poisoning its citizens!",
    expectedVerdict: 'Likely False',
    expectedConfidence: 0.9,
    tags: ['health', 'conspiracy', 'fake-news']
  },
  {
    text: "The Philippines has a population of only 50 million. The government is inflating the numbers for unknown reasons.",
    expectedVerdict: 'Likely False',
    expectedConfidence: 0.85,
    tags: ['demographics', 'conspiracy', 'fake-news']
  },
  {
    text: "Boracay beaches are actually man-made and not natural. The government created them to attract tourists.",
    expectedVerdict: 'Likely False',
    expectedConfidence: 0.85,
    tags: ['tourism', 'conspiracy', 'fake-news']
  },
  {
    text: "BREAKING: The Philippines will experience a total solar eclipse every day for the next week. NASA confirms this is unprecedented!",
    expectedVerdict: 'Likely False',
    expectedConfidence: 0.95,
    tags: ['science', 'fake-news', 'panic']
  },
  {
    text: "The University of the Philippines is actually a secret military facility disguised as a school. Students are being trained for war!",
    expectedVerdict: 'Likely False',
    expectedConfidence: 0.9,
    tags: ['education', 'conspiracy', 'fake-news']
  },
  {
    text: "The Philippines is NOT a member of ASEAN. This is a lie that has been spread for decades.",
    expectedVerdict: 'Likely False',
    expectedConfidence: 0.95,
    tags: ['politics', 'conspiracy', 'fake-news']
  },
  {
    text: "The Banaue Rice Terraces were built by aliens 10,000 years ago. Archaeologists have been covering this up!",
    expectedVerdict: 'Likely False',
    expectedConfidence: 0.9,
    tags: ['history', 'conspiracy', 'fake-news']
  }
]

/**
 * Generate test dataset
 */
export function generateTestDataset(): TestPost[] {
  const dataset: TestPost[] = []
  let id = 1
  
  // Add real posts
  realPosts.forEach((post, index) => {
    dataset.push({
      id: `real-${id++}`,
      text: post.text || '',
      expectedVerdict: post.expectedVerdict || 'Likely True',
      expectedConfidence: post.expectedConfidence || 0.9,
      category: 'real',
      tags: post.tags || []
    })
  })
  
  // Add fake posts
  fakePosts.forEach((post, index) => {
    dataset.push({
      id: `fake-${id++}`,
      text: post.text || '',
      expectedVerdict: post.expectedVerdict || 'Likely False',
      expectedConfidence: post.expectedConfidence || 0.9,
      category: 'fake',
      tags: post.tags || []
    })
  })
  
  return dataset
}

/**
 * Save dataset to JSON file
 */
export function saveDatasetToFile(dataset: TestPost[], filePath: string = 'test-dataset.json'): void {
  const fs = require('fs')
  const path = require('path')
  
  const fullPath = path.join(process.cwd(), filePath)
  fs.writeFileSync(fullPath, JSON.stringify(dataset, null, 2), 'utf-8')
  console.log(`Dataset saved to ${fullPath}`)
}

/**
 * Load dataset from JSON file
 */
export function loadDatasetFromFile(filePath: string = 'test-dataset.json'): TestPost[] {
  const fs = require('fs')
  const path = require('path')
  
  const fullPath = path.join(process.cwd(), filePath)
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf-8')
    return JSON.parse(content) as TestPost[]
  }
  
  // Generate new dataset if file doesn't exist
  const dataset = generateTestDataset()
  saveDatasetToFile(dataset, filePath)
  return dataset
}

