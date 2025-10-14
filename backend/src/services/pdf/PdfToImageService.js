// services/pdf/PdfToImageService.js
// PDF to PNG using GraphicsMagick - simple and reliable

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import gm from 'gm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PdfToImageService {
  constructor() {
    this.tempDir = path.join(__dirname, '../../temp');
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  /**
   * Convert PDF page to PNG
   */
  async convertPageToImage(pdfPath, pageNumber) {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      try {
        console.log(`📄 Converting PDF page ${pageNumber} to PNG...`);
        console.log(`   PDF: ${pdfPath}`);

        const outputPath = path.join(
          this.tempDir,
          `page_${pageNumber}_${Date.now()}.png`
        );

        // Use first page of single-page PDF
        const inputPath = `${pdfPath}[0]`;

        gm(inputPath)
          .density(300, 300)           // High quality
          .resize(2048, 2048, '>')     // Max 2048px, maintain aspect ratio
          .quality(95)                 // High quality PNG
          .write(outputPath, async (err) => {
            if (err) {
              console.error('❌ GM conversion failed:', err);
              reject(new Error(`GraphicsMagick conversion failed: ${err.message}`));
              return;
            }

            const processingTime = Date.now() - startTime;
            const stats = await fs.stat(outputPath);

            console.log(`✅ Page converted in ${processingTime}ms`);
            console.log(`   Image: ${outputPath}`);
            console.log(`   Size: ${Math.round(stats.size / 1024)}KB`);

            resolve(outputPath);
          });

      } catch (error) {
        console.error('❌ PDF conversion failed:', error);
        reject(new Error(`Failed to convert PDF: ${error.message}`));
      }
    });
  }

  /**
   * Convert image to base64 data URL
   */
  async imageToBase64DataUrl(imagePath) {
    try {
      const imageBuffer = await fs.readFile(imagePath);
      const base64 = imageBuffer.toString('base64');
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      throw new Error(`Failed to convert to base64: ${error.message}`);
    }
  }

  /**
   * Cleanup temp file
   */
  async cleanup(imagePath) {
    try {
      await fs.unlink(imagePath);
      console.log(`🗑️  Cleaned up: ${imagePath}`);
    } catch (error) {
      console.warn('Cleanup failed:', error.message);
    }
  }

  /**
   * All-in-one: PDF to base64 PNG
   */
  async convertPageToDataUrl(pdfPath, pageNumber) {
    let imagePath = null;

    try {
      imagePath = await this.convertPageToImage(pdfPath, pageNumber);
      const dataUrl = await this.imageToBase64DataUrl(imagePath);
      await this.cleanup(imagePath);
      return dataUrl;
    } catch (error) {
      if (imagePath) {
        await this.cleanup(imagePath);
      }
      throw error;
    }
  }
}

export default new PdfToImageService();