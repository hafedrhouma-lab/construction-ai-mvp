// test-openai-direct.js
// Run with: node test-openai-direct.js

import OpenAI from 'openai';
import { promises as fs } from 'fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testExtraction() {
  try {
    // Read the image that was just created
    const imagePath = process.argv[2];
    if (!imagePath) {
      console.error('Usage: node test-openai-direct.js <image-path>');
      process.exit(1);
    }

    console.log('📷 Reading image:', imagePath);
    const imageBuffer = await fs.readFile(imagePath);
    const base64 = imageBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    console.log('📊 Image stats:');
    console.log('  - Size:', imageBuffer.length, 'bytes');
    console.log('  - Base64 length:', dataUrl.length);

    const prompt = `You are analyzing a construction plan/drawing page to perform a quantity takeoff.

Your job is to extract QUANTITIES of work items from drawings, plans, site layouts, and detail sheets - NOT prices.

For EACH work item visible on this page, extract:
- line_number: sequential number (1, 2, 3...)
- description: what is being built/installed (be specific: "6-inch concrete sidewalk" not just "concrete")
- quantity: numeric amount from dimension labels, counts, areas shown
- unit: appropriate unit (SF, LF, EA, CY, SY, LS, etc.)
- unit_price: null (no prices on plans)
- total_price: null (no prices on plans)
- confidence_score: your confidence 0-1
- notes: any relevant specs, dimensions, or details shown

WHAT TO LOOK FOR:

**Site Plans:**
- Paving areas (calculate from dimensions if shown)
- Concrete areas (parking, sidewalks, pads)
- Linear items (curb, fence, striping)
- Counts (parking spaces, light poles, trees, bollards)
- Utilities (length of pipes, number of structures)

**Detail Sheets:**
- Individual components shown (bollards, poles, signs, etc.)
- Count how many detail callouts reference this item on other sheets
- Material specifications

**Grading/Utility Plans:**
- Earthwork volumes if shown
- Pipe lengths from station numbers
- Structure quantities

**Notes/Legends:**
- Development summary tables
- Parking summary tables
- Material specifications

CRITICAL: You MUST respond with valid JSON in this exact format:
{
  "line_items": [
    {
      "line_number": 1,
      "description": "Asphalt Paving - Parking Lot",
      "quantity": 45000,
      "unit": "SF",
      "unit_price": null,
      "total_price": null,
      "confidence_score": 0.9,
      "notes": "Standard duty asphalt per detail"
    },
    {
      "line_number": 2,
      "description": "6-inch Concrete Sidewalk",
      "quantity": 450,
      "unit": "LF",
      "unit_price": null,
      "total_price": null,
      "confidence_score": 0.85,
      "notes": "4-inch thick per C6-00"
    }
  ]
}

If this page has NO quantifiable work items (like a cover sheet), return: {"line_items": []}

EXTRACTION RULES:
1. Be specific in descriptions (include size, material, type)
2. Use dimensions shown to calculate quantities when possible
3. Reference detail numbers in notes when applicable
4. For detail sheets, extract the component being detailed
5. Include material specifications in description
6. Use standard construction units
7. Be generous - extract anything that represents physical work to be done

Common Units:
- SF (square feet) - areas
- LF (linear feet) - linear items
- CY (cubic yards) - earthwork, concrete
- SY (square yards) - paving
- EA (each) - countable items
- LS (lump sum) - complete systems
- TON - materials by weight`;

    console.log('🤖 Calling OpenAI...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    console.log('\n✅ RESPONSE:');
    console.log(JSON.stringify(response.choices[0].message.content, null, 2));

    const parsed = JSON.parse(response.choices[0].message.content);
    console.log('\n📊 PARSED:');
    console.log('Line items found:', parsed.line_items?.length || 0);
    console.log('Items:', parsed.line_items);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testExtraction();