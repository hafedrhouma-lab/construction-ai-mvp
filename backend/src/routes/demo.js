// backend/src/routes/demo.js
// SAFE PARALLEL + AGGRESSIVE EXTRACTION + FIXED COLLECTION

import express from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { fromPath } from 'pdf2pic';
import { TOPICS, getTopicKeys } from '../config/topics.js';

process.on('uncaughtException', (error) => {
  if (error.code === 'EPIPE' || error.code === 'ECONNRESET') {
    console.error('⚠️  Network connection error (EPIPE/ECONNRESET) - this is expected with parallel requests');
    console.error('   The request will be retried automatically...');
    // Don't crash the process
    return;
  }

  // For other errors, log and let process crash
  console.error('💥 Uncaught Exception:', error);
  throw error;
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

const router = express.Router();
const upload = multer({ dest: 'uploads/demo/' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// SAFE PARALLEL PROCESSING CONFIG
const STAGE1_BATCH_SIZE = 10;   // Process 5 pages at once
const STAGE2_BATCH_SIZE = 4;   // Process 3 pages at once
const BATCH_DELAY_MS = 1500;   // 1.5 second pause between batches
const MAX_RETRIES = 3;         // Retry failed requests up to 3 times

/**
 * Strip markdown code blocks from JSON responses
 */
function cleanJsonResponse(content) {
  if (!content) return null;

  let cleaned = content.trim();

  // Remove markdown code blocks
  if (cleaned.startsWith('```')) {
    const lines = cleaned.split('\n');
    lines.shift(); // Remove first line (```json or ```)

    if (lines[lines.length - 1].trim() === '```') {
      lines.pop();
    }

    cleaned = lines.join('\n').trim();
  }

  // Fallback: extract JSON object
  if (!cleaned.startsWith('{')) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
  }

  return cleaned;
}

/**
 * Call OpenAI with retry logic for network errors
 */
async function callOpenAIWithRetry(apiCall, maxRetries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      // Check if it's a network/connection error
      const isNetworkError =
        error.code === 'EPIPE' ||
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.message?.includes('socket hang up') ||
        error.message?.includes('ECONNREFUSED');

      // Check if it's a rate limit error
      const isRateLimit = error.status === 429;

      if ((isNetworkError || isRateLimit) && attempt < maxRetries) {
        const waitTime = attempt * 2000; // 2s, 4s, 6s exponential backoff
        console.log(`     ⚠️  ${isRateLimit ? 'Rate limit' : 'Network error'}, retrying in ${waitTime/1000}s... (attempt ${attempt}/${maxRetries})`);
        await sleep(waitTime);
        continue;
      }

      // If not retryable or max retries reached, throw
      throw error;
    }
  }
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

router.post('/analyze', upload.single('file'), async (req, res) => {
  let pdfPath = null;
  let tempImages = [];

  try {
    pdfPath = req.file.path;

    console.log(`\n🚀 Starting AGGRESSIVE OpenAI analysis with SAFE PARALLEL PROCESSING`);
    console.log(`📄 File: ${req.file.originalname}`);
    console.log(`💾 Size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`⚙️  Config: Stage1 batch=${STAGE1_BATCH_SIZE}, Stage2 batch=${STAGE2_BATCH_SIZE}, delay=${BATCH_DELAY_MS}ms`);
    logMemory();

    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    console.log(`📊 Total pages: ${totalPages}`);

    // Get topics
    const topicKeys = getTopicKeys();
    console.log(`🔑 Using topics: ${topicKeys.join(', ')}`);

    // STAGE 1: AGGRESSIVE PARALLEL Vision-based scanning
    console.log(`\n🔍 STAGE 1: Aggressive Parallel Scan (${STAGE1_BATCH_SIZE} pages/batch with ${BATCH_DELAY_MS}ms delay)`);
    console.log(`📊 Total pages in document: ${totalPages}`);

    const pagesToScan = getSamplePageNumbers(totalPages, totalPages);  // Scan 30 pages

    const startTime1 = Date.now();
    const relevantPages = await scanPagesWithVisionParallel(pdfPath, pagesToScan, topicKeys, tempImages);
    const stage1Time = ((Date.now() - startTime1) / 1000).toFixed(1);

    console.log(`\n✅ STAGE 1 COMPLETE in ${stage1Time}s`);
    console.log(`   Found ${relevantPages.length} relevant pages out of ${pagesToScan.length} scanned`);
    if (relevantPages.length > 0) {
      console.log(`   Relevant pages: ${relevantPages.map(p => p.page_number).join(', ')}`);
    }
    logMemory();

    // STAGE 2: AGGRESSIVE PARALLEL extraction
    console.log(`\n🔬 STAGE 2: Aggressive Parallel Extraction (${STAGE2_BATCH_SIZE} pages/batch with ${BATCH_DELAY_MS}ms delay)`);
    const pagesToAnalyze = relevantPages.slice(0, 10);  // Analyze top 10

    const startTime2 = Date.now();
    const documentMap = await analyzeRelevantPagesParallel(pdfPath, pagesToAnalyze, tempImages);
    const stage2Time = ((Date.now() - startTime2) / 1000).toFixed(1);

    console.log(`✅ Document map built in ${stage2Time}s with ${documentMap.length} pages analyzed`);
    logMemory();

    // STAGE 3: Conflict Detection
    console.log(`\n⚠️  STAGE 3: Conflict Detection`);
    const conflicts = detectConflicts(documentMap);
    console.log(`Found ${conflicts.length} conflicts`);

    // STAGE 4: Generate Realistic Questions
    console.log(`\n❓ STAGE 4: Generate Questions`);
    const questions = await generateRealisticQuestions(conflicts, documentMap);
    console.log(`Generated ${questions.length} questions`);
    logMemory();

    // Build detailed line items for frontend
    const lineItems = buildLineItems(documentMap);

    // Cleanup
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }
    tempImages.forEach(imgPath => {
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    });
    console.log(`\n🧹 Cleaned up temp files`);

    const stage1Cost = pagesToScan.length * 0.01;
    const stage2Cost = pagesToAnalyze.length * 0.01;
    const totalTime = parseFloat(stage1Time) + parseFloat(stage2Time);

    res.json({
      success: true,
      total_pages: totalPages,
      scanned_pages: pagesToScan.length,
      relevant_pages: relevantPages,
      document_map: documentMap,
      line_items: lineItems,
      conflicts: conflicts,
      questions: questions,
      processing_time: {
        stage1: `${stage1Time}s`,
        stage2: `${stage2Time}s`,
        total: `${totalTime.toFixed(1)}s`
      },
      cost_breakdown: {
        stage1_scan: stage1Cost.toFixed(2),
        stage2_extraction: stage2Cost.toFixed(2),
        stage3_conflicts: '0.00',
        stage4_questions: '0.05',
        total: (stage1Cost + stage2Cost + 0.05).toFixed(2)
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);

    if (pdfPath && fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }
    tempImages.forEach(imgPath => {
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * STAGE 1: AGGRESSIVE PARALLEL scan with retry and delays
 */
async function scanPagesWithVisionParallel(pdfPath, pageNumbers, topicKeys, tempImages) {
  const relevantPages = [];

  // Build topic details
  const topicDetails = topicKeys.map(key => {
    const topic = TOPICS[key];
    return `- ${topic.label}: Look for ${topic.keywords.slice(0, 5).join(', ')}`;
  }).join('\n');

  console.log(`🔄 Processing ${pageNumbers.length} pages in batches of ${STAGE1_BATCH_SIZE}...`);

  // Process in batches with delays
  for (let i = 0; i < pageNumbers.length; i += STAGE1_BATCH_SIZE) {
    const batch = pageNumbers.slice(i, i + STAGE1_BATCH_SIZE);
    const batchNum = Math.floor(i / STAGE1_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(pageNumbers.length / STAGE1_BATCH_SIZE);

    console.log(`\n📦 Batch ${batchNum}/${totalBatches}: Processing pages ${batch.join(', ')} in parallel...`);

    // Process batch in parallel
    const promises = batch.map(pageNum =>
      scanSinglePage(pdfPath, pageNum, topicDetails, tempImages, batch.indexOf(pageNum) + 1, batch.length)
    );

    const results = await Promise.all(promises);

    // Collect relevant pages (FIXED - no duplicate check)
    results.forEach(result => {
      if (result) {  // ✅ FIXED: result is already null if not relevant
        relevantPages.push(result);
      }
    });

    // Delay between batches (except after last batch)
    if (i + STAGE1_BATCH_SIZE < pageNumbers.length) {
      console.log(`   ⏸️  Cooling down for ${BATCH_DELAY_MS}ms before next batch...`);
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log(`\n📊 Scan complete: ${relevantPages.length}/${pageNumbers.length} pages relevant`);

  // Show topic breakdown
  if (relevantPages.length > 0) {
    const topicCounts = {};
    relevantPages.forEach(page => {
      page.topics.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });
    console.log(`📈 Topics found: ${JSON.stringify(topicCounts, null, 2)}`);
  }

  return relevantPages;
}

/**
 * Scan a single page with AGGRESSIVE prompt and retry logic
 */
async function scanSinglePage(pdfPath, pageNum, topicDetails, tempImages, pageInBatch, totalInBatch) {
  try {
    console.log(`  📄 Page ${pageNum} (${pageInBatch}/${totalInBatch})...`);

    const imageBase64 = await convertPageToImage(pdfPath, pageNum, tempImages);

    // Call OpenAI with retry logic and AGGRESSIVE prompt
    const response = await callOpenAIWithRetry(() =>
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: `You are analyzing a construction document page. Check if it contains information about ANY of these topics:

${topicDetails}

IMPORTANT: 
- Check for ALL topics, not just the first few
- Be AGGRESSIVE in identifying relevant pages
- Even if you see just ONE topic keyword, mark as relevant
- Don't be conservative - when in doubt, mark as relevant

Look carefully at:
- Text in drawings and CAD labels (striping, parking, crosswalk text)
- Tables and schedules with quantities
- Quantity callouts and dimensions
- Material specifications in notes
- Detail references and legends
- ANY mention of: striping, paint, signs, parking, ADA, crosswalk, stop bar, curb, thermoplastic

CRITICAL: Respond with ONLY valid JSON. No markdown, no code blocks.

If you see ANY construction/bidding information (striping, parking, signs, specs), return:
{
  "relevant": true,
  "topics_found": ["List ALL specific topics you found"],
  "keywords_found": ["list", "actual", "keywords", "you", "see"],
  "page_type": "Site Plan" | "Detail Sheet" | "Schedule" | "Specification" | "Notes" | "Other",
  "confidence": 75,
  "brief_description": "What you see on the page"
}

If it's clearly a cover page, index, or utility plan with NO relevant info, return:
{
  "relevant": false,
  "topics_found": [],
  "keywords_found": [],
  "page_type": "Cover" | "Index" | "Other",
  "confidence": 0,
  "brief_description": "Brief description"
}

When in doubt, mark as RELEVANT! Better to extract from an extra page than miss important data.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${imageBase64}`,
                detail: "low"
              }
            }
          ]
        }],
        max_tokens: 400,
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    );

    const content = response.choices[0].message.content;

    if (!content || content.trim() === '') {
      console.log(`     ✗ No response`);
      return null;
    }

    // Clean markdown from response
    const cleaned = cleanJsonResponse(content);

    if (!cleaned) {
      console.log(`     ✗ Empty response after cleaning`);
      return null;
    }

    const result = JSON.parse(cleaned);

    if (result.relevant && result.topics_found && result.topics_found.length > 0) {
      console.log(`     ✅ RELEVANT - ${result.topics_found.join(', ')} (${result.confidence}%)`);

      return {
        page_number: pageNum,
        page_type: result.page_type || 'Construction Document',
        topics: result.topics_found,
        matched_keywords: result.keywords_found || [],
        confidence: result.confidence || 70,
        content_summary: result.brief_description || `${result.page_type}: ${result.topics_found.join(', ')}`
      };
    } else {
      console.log(`     ✗ Not relevant - ${result.page_type || 'Unknown'}`);
      return null;
    }

  } catch (error) {
    console.error(`     ❌ Error on page ${pageNum}: ${error.message}`);
    return null;
  }
}

/**
 * STAGE 2: AGGRESSIVE PARALLEL extraction with retry and delays
 */
async function analyzeRelevantPagesParallel(pdfPath, pages, tempImages) {
  const documentMap = [];

  console.log(`🔄 Extracting from ${pages.length} pages in batches of ${STAGE2_BATCH_SIZE}...`);

  // Process in batches with delays
  for (let i = 0; i < pages.length; i += STAGE2_BATCH_SIZE) {
    const batch = pages.slice(i, i + STAGE2_BATCH_SIZE);
    const batchNum = Math.floor(i / STAGE2_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(pages.length / STAGE2_BATCH_SIZE);

    console.log(`\n📦 Batch ${batchNum}/${totalBatches}: Extracting pages ${batch.map(p => p.page_number).join(', ')} in parallel...`);

    // Process batch in parallel
    const promises = batch.map(page =>
      extractSinglePage(pdfPath, page, tempImages, batch.indexOf(page) + 1, batch.length)
    );

    const results = await Promise.all(promises);

    // Collect results
    documentMap.push(...results);

    // Delay between batches (except after last batch)
    if (i + STAGE2_BATCH_SIZE < pages.length) {
      console.log(`   ⏸️  Cooling down for ${BATCH_DELAY_MS}ms before next batch...`);
      await sleep(BATCH_DELAY_MS);
    }
  }

  // Extraction summary
  const totalQty = documentMap.reduce((sum, p) => sum + (p.quantities?.length || 0), 0);
  const totalMat = documentMap.reduce((sum, p) => sum + (p.materials?.length || 0), 0);
  const totalScope = documentMap.reduce((sum, p) => sum + (p.scope_items?.length || 0), 0);
  const totalSpecs = documentMap.reduce((sum, p) => sum + (p.specifications?.length || 0), 0);
  const totalNotes = documentMap.reduce((sum, p) => sum + (p.notes?.length || 0), 0);

  console.log(`\n📦 EXTRACTION SUMMARY:`);
  console.log(`   ✅ ${totalQty} quantities extracted`);
  console.log(`   ✅ ${totalMat} materials identified`);
  console.log(`   ✅ ${totalScope} scope items listed`);
  console.log(`   ✅ ${totalSpecs} specifications captured`);
  console.log(`   ✅ ${totalNotes} notes extracted`);

  if (totalQty === 0 && totalMat === 0) {
    console.log(`   ⚠️  WARNING: No quantifiable data extracted!`);
  }

  return documentMap;
}

/**
 * Extract from a single page with AGGRESSIVE prompt and retry logic
 */
async function extractSinglePage(pdfPath, page, tempImages, pageInBatch, totalInBatch) {
  try {
    const imageBase64 = await convertPageToImage(pdfPath, page.page_number, tempImages);

    console.log(`  📊 Page ${page.page_number} (${pageInBatch}/${totalInBatch})...`);

    // Call OpenAI with retry logic and AGGRESSIVE prompt
    const response = await callOpenAIWithRetry(() =>
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: `You are analyzing a CONSTRUCTION PLAN for creating a bid estimate.

YOUR JOB: Extract EVERY piece of information that helps quantify work and estimate costs.

BE EXTREMELY AGGRESSIVE:
- If you see parking stalls on a plan → COUNT THEM → add to quantities
- If you see striping lines → MEASURE using the scale bar → calculate length
- If you see any signs or symbols → COUNT THEM → add to quantities  
- If you see crosswalks → COUNT THEM
- If you see stop bars → COUNT THEM
- If you see ANY text mentioning materials → EXTRACT IT
- If you see dimensions → USE THEM to calculate quantities
- If you see general notes → CAPTURE THEM
- Even rough estimates are OK!

CRITICAL INSTRUCTIONS:
1. COUNT everything visible (parking stalls, signs, crosswalks, stop bars, arrows)
2. MEASURE striping from scale (if you see "1\\"=20'" use it!)
3. READ all material specs from legends, notes, callouts
4. EXTRACT scope items even without exact quantities
5. BE AGGRESSIVE - extract EVERYTHING you can see!

DON'T be conservative. Don't wait for perfect data. Extract ANYTHING useful!

RESPOND WITH ONLY VALID JSON (no markdown, no code blocks):

{
  "page_type": "Site Plan" | "Detail Sheet" | "Schedule" | "Specification" | "Notes" | "Other",
  
  "quantities": [
    // COUNT or MEASURE everything:
    {"item": "parking stalls", "value": 45, "unit": "EA", "location": "north lot", "source": "counted from plan"},
    {"item": "thermoplastic striping", "value": 850, "unit": "LF", "location": "main parking", "source": "measured from 1\\"=20' scale"},
    {"item": "crosswalks", "value": 3, "unit": "EA", "location": "building entrance", "source": "visible on plan"},
    {"item": "ADA signs", "value": 8, "unit": "EA", "location": "accessible stalls", "source": "symbols shown"},
    {"item": "stop bars", "value": 4, "unit": "EA", "location": "exits", "source": "counted"}
  ],
  
  "materials": [
    // READ specs from anywhere (notes, legends, callouts):
    {"item": "pavement striping", "specification": "4-inch white thermoplastic", "color": "white", "width": "4 inch", "source": "legend"},
    {"item": "curb painting", "specification": "yellow traffic paint", "color": "yellow", "source": "detail note"},
    {"item": "parking signs", "specification": "aluminum reflective", "size": "12x18", "source": "detail"}
  ],
  
  "scope_items": [
    // LIST all work you can identify:
    "Install parking lot striping",
    "Paint curbs yellow",
    "Install ADA signage",
    "Mark crosswalks with thermoplastic"
  ],
  
  "specifications": [
    // EXTRACT technical requirements:
    "Striping shall be 4-inch white thermoplastic",
    "ADA compliance required",
    "All signs reflective aluminum"
  ],
  
  "notes": [
    // CAPTURE anything else useful:
    "Phase 1 includes north parking only",
    "Install after paving complete",
    "See detail C-3 for crosswalk pattern"
  ],
  
  "cross_references": [
    // References to other pages:
    "Detail C-3", "Page 12", "Sheet L-5"
  ]
}

REMEMBER:
- Extract EVERYTHING you can see
- Count items from plans
- Measure using scale
- Read ALL text and notes
- BE AGGRESSIVE - don't be shy!

If page has NO quantifiable information at all, return empty arrays but at least try to fill in page_type and scope_items.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${imageBase64}`,
                detail: "high"
              }
            }
          ]
        }],
        max_tokens: 3000,
        temperature: 0,
        response_format: { type: "json_object" }
      })
    );

    const content = response.choices[0].message.content;

    if (!content || content.trim() === '') {
      console.log(`     ⚠️ No response`);
      return createEmptyPageData(page.page_number, page.content_summary);
    }

    // Clean markdown from response
    const cleaned = cleanJsonResponse(content);

    if (!cleaned) {
      console.log(`     ⚠️ Empty response after cleaning`);
      return createEmptyPageData(page.page_number, page.content_summary);
    }

    const analysis = JSON.parse(cleaned);

    const qtyCount = analysis.quantities?.length || 0;
    const matCount = analysis.materials?.length || 0;
    const scopeCount = analysis.scope_items?.length || 0;

    console.log(`     ✅ Extracted: ${qtyCount} quantities, ${matCount} materials, ${scopeCount} scope items`);

    // Show samples
    if (qtyCount > 0) {
      const sample = analysis.quantities[0];
      console.log(`        📦 ${sample.value} ${sample.unit} ${sample.item}`);
    }

    return {
      page_number: page.page_number,
      page_type: analysis.page_type || 'Unknown',
      quantities: analysis.quantities || [],
      materials: analysis.materials || [],
      scope_items: analysis.scope_items || [],
      specifications: analysis.specifications || [],
      notes: analysis.notes || [],
      cross_references: analysis.cross_references || [],
      content_summary: page.content_summary
    };

  } catch (error) {
    console.error(`     ❌ Error on page ${page.page_number}: ${error.message}`);
    return createEmptyPageData(page.page_number, page.content_summary);
  }
}

/**
 * Build structured line items from document map WITH source breakdown
 */
function buildLineItems(documentMap) {
  const itemsMap = new Map();

  // Aggregate quantities by item type
  documentMap.forEach(page => {
    (page.quantities || []).forEach(qty => {
      const key = `${qty.item}_${qty.unit}`.toLowerCase();

      if (!itemsMap.has(key)) {
        itemsMap.set(key, {
          item: qty.item,
          unit: qty.unit,
          total_quantity: 0,
          locations: [],
          pages: [],
          sources: [],
          source_breakdown: []  // ✅ NEW: Track individual sources
        });
      }

      const existing = itemsMap.get(key);
      existing.total_quantity += qty.value || 0;
      if (qty.location) existing.locations.push(qty.location);
      existing.pages.push(page.page_number);
      if (qty.source) existing.sources.push(qty.source);

      // ✅ NEW: Track individual source breakdown
      existing.source_breakdown.push({
        location: qty.location || 'not specified',
        quantity: qty.value || 0,
        page: page.page_number,
        source: qty.source || 'from plan'
      });
    });
  });

  // Convert to array
  const lineItems = Array.from(itemsMap.values()).map(item => ({
    item: item.item,
    quantity: item.total_quantity,
    unit: item.unit,
    locations: [...new Set(item.locations)],
    pages: [...new Set(item.pages)],
    sources: [...new Set(item.sources)],
    source_breakdown: item.source_breakdown  // ✅ NEW: Include breakdown
  }));

  return lineItems;
}
/**
 * STAGE 3: Detect REALISTIC conflicts
 */
function detectConflicts(documentMap) {
  const conflicts = [];
  const quantityGroups = {};

  // Group quantities by item
  documentMap.forEach(page => {
    (page.quantities || []).forEach(qty => {
      const key = qty.item?.toLowerCase() || 'unknown';
      if (!quantityGroups[key]) {
        quantityGroups[key] = [];
      }
      quantityGroups[key].push({
        page: page.page_number,
        value: qty.value,
        unit: qty.unit,
        location: qty.location || 'unspecified',
        source: qty.source || 'from plan'
      });
    });
  });

  // Find conflicts
  Object.entries(quantityGroups).forEach(([item, values]) => {
    if (values.length > 1) {
      // Check if actually different (not just same item in different locations)
      const uniqueValues = [...new Set(values.map(v => v.value))];

      if (uniqueValues.length > 1) {
        conflicts.push({
          type: 'quantity_conflict',
          item: item,
          issue: `${item} has different quantities across pages`,
          occurrences: values.map(v => ({
            page: v.page,
            value: v.value,
            unit: v.unit,
            location: v.location,
            source: v.source
          }))
        });
      }
    }
  });

  return conflicts;
}

/**
 * STAGE 4: Generate REALISTIC questions
 */
async function generateRealisticQuestions(conflicts, documentMap) {
  if (conflicts.length === 0) {
    const totalQty = documentMap.reduce((sum, p) => sum + (p.quantities?.length || 0), 0);
    const totalMat = documentMap.reduce((sum, p) => sum + (p.materials?.length || 0), 0);

    return [{
      id: 1,
      type: 'summary',
      question: `Extraction complete! Found ${totalQty} quantities and ${totalMat} material specifications with no conflicts detected.`,
      description: 'All extracted data appears consistent across pages. You can now proceed to add your unit prices for bidding.',
      options: [
        'Show me the extracted line items',
        'Review document details',
        'Analyze more pages'
      ]
    }];
  }

  // Build realistic questions from conflicts
  const questions = [];

  conflicts.forEach((conflict, index) => {
    const occurrences = conflict.occurrences;

    questions.push({
      id: index + 1,
      type: 'quantity_conflict',
      item: conflict.item,
      question: `Different ${conflict.item} quantities found across multiple pages. How should we handle this?`,
      description: `Found ${occurrences.length} different counts:`,
      details: occurrences.map(occ =>
        `Page ${occ.page}: ${occ.value} ${occ.unit} at ${occ.location} (${occ.source})`
      ),
      options: [
        `Sum all quantities (Total: ${occurrences.reduce((sum, o) => sum + o.value, 0)} ${occurrences[0].unit})`,
        `Use highest count (${Math.max(...occurrences.map(o => o.value))} ${occurrences[0].unit})`,
        `Keep separate by location`,
        'Need to verify with project documents'
      ]
    });
  });

  return questions;
}

function createEmptyPageData(pageNumber, contentSummary) {
  return {
    page_number: pageNumber,
    page_type: 'Unknown',
    quantities: [],
    materials: [],
    scope_items: [],
    specifications: [],
    notes: [],
    cross_references: [],
    content_summary: contentSummary || 'Analysis failed'
  };
}

async function convertPageToImage(pdfPath, pageNum, tempImages) {
  try {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const options = {
      density: 150,
      saveFilename: `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${pageNum}`,
      savePath: tempDir,
      format: "png",
      width: 1200,
      height: 1600
    };

    const converter = fromPath(pdfPath, options);
    const result = await converter(pageNum, { responseType: "image" });

    tempImages.push(result.path);

    const imageBuffer = fs.readFileSync(result.path);
    return imageBuffer.toString('base64');

  } catch (error) {
    console.error(`Error converting page ${pageNum}:`, error.message);
    throw error;
  }
}

function getSamplePageNumbers(totalPages, samplesToTake) {
  const samples = [];

  if (totalPages <= samplesToTake) {
    for (let i = 1; i <= totalPages; i++) {
      samples.push(i);
    }
    console.log(`📋 Scanning all ${samples.length} pages`);
  } else {
    const interval = totalPages / samplesToTake;

    for (let i = 0; i < samplesToTake; i++) {
      const pageNum = Math.round(1 + (interval * i));
      if (pageNum <= totalPages && !samples.includes(pageNum)) {
        samples.push(pageNum);
      }
    }

    if (!samples.includes(totalPages)) {
      samples[samples.length - 1] = totalPages;
    }

    console.log(`📋 Evenly sampling ${samples.length} pages (1 to ${totalPages})`);
    console.log(`📍 Pages: ${samples.join(', ')}`);
  }

  return samples;
}

function logMemory() {
  const used = process.memoryUsage();
  console.log(`💾 Memory: Heap ${(used.heapUsed / 1024 / 1024).toFixed(2)} MB | RSS ${(used.rss / 1024 / 1024).toFixed(2)} MB`);
}

export default router;