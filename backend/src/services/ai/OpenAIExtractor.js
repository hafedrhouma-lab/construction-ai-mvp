// services/ai/OpenAIExtractor.js
// OpenAI GPT-4 Vision implementation (ES6 format)

import OpenAI from 'openai';
import BaseExtractor from './BaseExtractor.js';

class OpenAIExtractor extends BaseExtractor {
  constructor(apiKey) {
    super(apiKey);
    this.client = new OpenAI({ apiKey: this.apiKey });
    this.model = 'gpt-4o'; // or 'gpt-4-vision-preview' or 'gpt-4o-mini'
  }

  /**
   * Extract line items using OpenAI Vision
   */
  async extract(imageUrl, prompt, options = {}) {
    const startTime = Date.now();

    try {
      console.log('🤖 Calling OpenAI API...');
      console.log(`   Model: ${this.model}`);
      console.log(`   Image: ${imageUrl.substring(0, 50)}...`);

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: options.detail || 'high' // 'low', 'high', 'auto'
                }
              }
            ]
          }
        ],
        max_tokens: options.max_tokens || 4096,
        temperature: options.temperature || 0.1, // Low temp for consistency
        response_format: { type: 'json_object' } // Force JSON response
      });

      const processingTime = Date.now() - startTime;
      console.log(`✅ OpenAI responded in ${processingTime}ms`);

      const content = response.choices[0].message.content;
      const parsed = this.parseResponse(content);

      return {
        ...parsed,
        processing_time_ms: processingTime,
        model_version: this.model,
        tokens_used: response.usage?.total_tokens || 0
      };

    } catch (error) {
      console.error('❌ OpenAI API Error:', error.message);

      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key');
      } else if (error.status === 429) {
        throw new Error('OpenAI rate limit exceeded');
      } else if (error.status === 413) {
        throw new Error('Image too large for OpenAI API');
      }

      throw new Error(`OpenAI extraction failed: ${error.message}`);
    }
  }

  getProviderName() {
    return 'openai';
  }

  getModelVersion() {
    return this.model;
  }
}

export default OpenAIExtractor;