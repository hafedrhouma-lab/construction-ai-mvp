// services/ai/index.js
// Factory to get the right AI extractor (ES6 format)

import OpenAIExtractor from './OpenAIExtractor.js';
// import ClaudeExtractor from './ClaudeExtractor.js'; // For later

/**
 * Get AI extractor based on environment config
 */
function createExtractor() {
  const provider = process.env.AI_PROVIDER || 'openai';

  console.log(`🤖 Using AI Provider: ${provider}`);

  switch (provider.toLowerCase()) {
    case 'openai':
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        throw new Error('OPENAI_API_KEY not found in environment');
      }
      return new OpenAIExtractor(openaiKey);

    // case 'claude':
    //   const claudeKey = process.env.CLAUDE_API_KEY;
    //   if (!claudeKey) {
    //     throw new Error('CLAUDE_API_KEY not found in environment');
    //   }
    //   return new ClaudeExtractor(claudeKey);

    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

// Singleton instance
let extractorInstance = null;

/**
 * Get the configured AI extractor
 */
export function getExtractor() {
  if (!extractorInstance) {
    extractorInstance = createExtractor();
  }
  return extractorInstance;
}

/**
 * Reset extractor (useful for testing)
 */
export function resetExtractor() {
  extractorInstance = null;
}