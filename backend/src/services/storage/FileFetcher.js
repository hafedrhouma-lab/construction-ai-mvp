// services/storage/FileFetcher.js
// FIXED: Now converts PDF to image

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import pdfToImageService from '../pdf/PdfToImageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FileFetcher {
  constructor() {
    // S3 client
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

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
   * Get PDF for specific page number and convert to image
   * @param {object} file - File record from database
   * @param {number} pageNumber - Page number (1-indexed)
   * @returns {Promise<Object>} { tempPdfPath, imagePath }
   */
  async getPdfForPage(file, pageNumber) {
    const { s3_key, id } = file;

    console.log(`📂 Fetching page ${pageNumber}...`);
    console.log(`   S3 Key: ${s3_key}`);

    if (!this.s3Client) {
      throw new Error('S3 client not configured. Check AWS credentials in .env');
    }

    // 1. Download PDF from S3
    const tempPdfPath = await this.downloadPartFromS3(s3_key, pageNumber, id);

    // 2. Convert PDF to image
    console.log(`📸 Converting PDF to image...`);
    const imagePath = await pdfToImageService.convertPageToImage(tempPdfPath, pageNumber);

    console.log(`✅ PDF and image ready`);
    console.log(`   PDF: ${tempPdfPath}`);
    console.log(`   Image: ${imagePath}`);

    return {
      tempPdfPath,
      imagePath
    };
  }

  /**
   * Download part-N.pdf from S3
   */
  async downloadPartFromS3(s3KeyPath, pageNumber, fileId) {
    let key; // Declare at function scope

    try {
      console.log(`   ⬇️  Downloading from S3...`);

      // Get bucket from environment
      const bucket = process.env.AWS_S3_BUCKET || 'quickbids-dev';

      // If s3KeyPath starts with s3://, parse it
      if (s3KeyPath.startsWith('s3://')) {
        const match = s3KeyPath.match(/s3:\/\/([^\/]+)\/(.+)/);
        if (!match) {
          throw new Error(`Invalid S3 path: ${s3KeyPath}`);
        }
        key = `${match[2]}/page-${pageNumber}.pdf`;
      } else {
        // s3KeyPath is like "pages/file-id", construct full key
        key = `${s3KeyPath}/page-${pageNumber}.pdf`;
      }

      console.log(`   Bucket: ${bucket}`);
      console.log(`   Key: ${key}`);

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
      });

      const response = await this.s3Client.send(command);

      // Save to temp
      const tempPath = path.join(this.tempDir, `${fileId}_part${pageNumber}.pdf`);
      const buffer = Buffer.from(await response.Body.transformToByteArray());
      await fs.writeFile(tempPath, buffer);

      console.log(`   ✅ Downloaded: ${tempPath}`);
      return tempPath;

    } catch (error) {
      if (error.name === 'NoSuchKey') {
        throw new Error(`Part ${pageNumber} not found in S3. Expected key: ${key}`);
      }
      throw new Error(`S3 download failed: ${error.message}`);
    }
  }

  /**
   * Cleanup temp file
   */
  async cleanup(filePath) {
    if (filePath.startsWith(this.tempDir)) {
      try {
        await fs.unlink(filePath);
        console.log(`🗑️  Cleaned up: ${filePath}`);
      } catch (error) {
        console.warn('Cleanup failed:', error.message);
      }
    }
  }
}

export default new FileFetcher();