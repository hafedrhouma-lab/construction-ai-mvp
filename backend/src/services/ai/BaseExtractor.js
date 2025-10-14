// services/ai/BaseExtractor.js
// Abstract base class for AI providers (ES6 format)

class BaseExtractor {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * Extract line items from a page image
   * @param {string} imageUrl - URL or base64 of page image
   * @param {string} prompt - Extraction prompt
   * @param {object} options - Additional options
   * @returns {Promise<object>} Extraction result
   */
  async extract(imageUrl, prompt, options = {}) {
    throw new Error('extract() must be implemented by subclass');
  }

  /**
   * Parse and validate AI response
   * @param {object} rawResponse - Raw API response
   * @returns {object} Parsed extraction data
   */
  parseResponse(rawResponse) {
    try {
      const data = typeof rawResponse === 'string'
        ? JSON.parse(rawResponse)
        : rawResponse;

      if (!data || !data.line_items) {
        console.warn('⚠️  AI returned no line items, using empty array');
        return {
          line_items: [],
          confidence_score: null,
          raw_response: rawResponse
        };
      }

      if (!Array.isArray(data.line_items)) {
        throw new Error('Invalid response format: line_items is not an array');
      }
      // Validate and clean each line item
      const lineItems = data.line_items.map((item, index) => ({
        line_number: index + 1,
        description: item.description || '',
        quantity: this.parseNumber(item.quantity),
        unit: item.unit || '',
        unit_price: this.parseNumber(item.unit_price),
        total_price: this.parseNumber(item.total_price),
        confidence_score: item.confidence_score || null
      }));

      return {
        line_items: lineItems,
        confidence_score: this.calculateAverageConfidence(lineItems),
        raw_response: rawResponse
      };

    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error(`Response parsing failed: ${error.message}`);
    }
  }

  /**
   * Parse number safely
   */
  parseNumber(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }

  /**
   * Calculate average confidence score
   */
  calculateAverageConfidence(lineItems) {
    const scores = lineItems
      .map(item => item.confidence_score)
      .filter(score => score !== null);

    if (scores.length === 0) return null;

    const sum = scores.reduce((a, b) => a + b, 0);
    return Math.round((sum / scores.length) * 100) / 100;
  }

  /**
   * Get provider name
   */
  getProviderName() {
    return 'base';
  }

  /**
   * Get model version
   */
  getModelVersion() {
    return 'unknown';
  }
}

export default BaseExtractor;