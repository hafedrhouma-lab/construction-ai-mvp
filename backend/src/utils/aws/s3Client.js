import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '../../config/env.js';
import { createReadStream } from 'fs';
import fs from 'fs';
import logger from '../helpers/logger.js';

/**
 * S3 Client for file operations
 *
 * IMPORTANT FOR LAMBDA:
 * - In production, AWS SDK automatically uses IAM Role credentials
 * - No need to provide accessKeyId/secretAccessKey
 * - The Lambda execution role must have S3 permissions
 */
class S3Service {
  constructor() {
    // In production (Lambda), credentials come from IAM Role automatically
    // In development, use credentials from environment variables
    const clientConfig = {
      region: config.aws.region,
    };

    if (config.env === 'development' && config.aws.accessKeyId && config.aws.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      };
    }

    this.client = new S3Client(clientConfig);
    this.bucket = config.s3.bucket;
  }

  /**
   * Generate S3 key for a file
   * Format: {userId}/{customerId}/{fileId}.{extension}
   * Example: 123e4567-e89b-12d3-a456-426614174000/456e7890/789e0123.pdf
   */
  generateS3Key(userId, customerId, fileId, filename) {
    const ext = filename.split('.').pop();
    return `${userId}/${customerId}/${fileId}.${ext}`;
  }

  /**
   * Upload file to S3
   */
  async uploadFile(filePath, s3Key, mimeType) {
    try {
      const fileStream = createReadStream(filePath);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: fileStream,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
      });

      await this.client.send(command);

      logger.info(`✅ File uploaded to S3: ${s3Key}`);

      return {
        bucket: this.bucket,
        key: s3Key,
        url: `https://${this.bucket}.s3.${config.aws.region}.amazonaws.com/${s3Key}`,
      };
    } catch (error) {
      logger.error('❌ S3 upload failed:', error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  /**
   * ✨ NEW: Upload file from path (for page splitting)
   */
  async uploadFileFromPath(filePath, s3Key, mimeType) {
    try {
      const fileContent = fs.readFileSync(filePath);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: fileContent,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
      });

      await this.client.send(command);

      return {
        bucket: this.bucket,
        key: s3Key,
      };
    } catch (error) {
      logger.error('❌ S3 upload from path failed:', error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  /**
   * ✨ NEW: Upload buffer directly to S3 (for split pages)
   */
  async uploadBuffer(buffer, s3Key, bucket, mimeType = 'application/pdf') {
    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
      });

      await this.client.send(command);

      logger.debug(`✅ Buffer uploaded to S3: ${s3Key}`);

      return {
        bucket,
        key: s3Key,
      };
    } catch (error) {
      logger.error('❌ S3 buffer upload failed:', error);
      throw new Error(`Failed to upload buffer to S3: ${error.message}`);
    }
  }

  /**
   * ✨ NEW: Download file from S3 to local path
   */
  async downloadFile(s3Key, destPath) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      });

      const response = await this.client.send(command);
      const stream = response.Body;
      const writeStream = fs.createWriteStream(destPath);

      return new Promise((resolve, reject) => {
        stream.pipe(writeStream);
        stream.on('error', reject);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
    } catch (error) {
      logger.error('❌ S3 download failed:', error);
      throw new Error(`Failed to download file from S3: ${error.message}`);
    }
  }

  /**
   * Generate signed URL for secure file access
   * URL expires after configured time (default 1 hour)
   */
  async getSignedUrl(s3Key, expiresIn = config.s3.urlExpiration) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      });

      const signedUrl = await getSignedUrl(this.client, command, {
        expiresIn
      });

      return signedUrl;
    } catch (error) {
      logger.error('❌ Failed to generate signed URL:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(s3Key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      });

      await this.client.send(command);

      logger.info(`🗑️  File deleted from S3: ${s3Key}`);

      return true;
    } catch (error) {
      logger.error('❌ S3 delete failed:', error);
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(s3Key) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file from S3 key (reverse lookup)
   * Given: "123e4567/456e7890/789e0123.pdf"
   * Returns: { userId: "123e4567", customerId: "456e7890", fileId: "789e0123" }
   */
  parseS3Key(s3Key) {
    const parts = s3Key.split('/');
    if (parts.length !== 3) {
      throw new Error('Invalid S3 key format');
    }

    const [userId, customerId, fileWithExt] = parts;
    const fileId = fileWithExt.split('.')[0];

    return { userId, customerId, fileId };
  }

  /**
 * Generate presigned URL for PUT/GET operations
 * Used for client-side uploads
 */
  async generatePresignedUrl(bucket, key, operation = 'getObject', expiresIn = 900) {
    try {
      let command;

      if (operation === 'putObject') {
        command = new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          ContentType: 'application/pdf',
        });
      } else {
        command = new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        });
      }

      const signedUrl = await getSignedUrl(this.client, command, {
        expiresIn
      });

      return signedUrl;
    } catch (error) {
      logger.error('❌ Failed to generate presigned URL:', error);
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  /**
   * Upload buffer directly to S3 (for split pages)
   */
  async uploadBuffer(buffer, s3Key, bucket, mimeType = 'application/pdf') {
    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
      });

      await this.client.send(command);

      logger.debug(`✅ Buffer uploaded to S3: ${s3Key}`);

      return {
        bucket,
        key: s3Key,
      };
    } catch (error) {
      logger.error('❌ S3 buffer upload failed:', error);
      throw new Error(`Failed to upload buffer to S3: ${error.message}`);
    }
  }

}

// Export singleton instance
export const s3Service = new S3Service();
export default s3Service;

export const generatePresignedUrl = (bucket, key, operation, expiresIn) => {
  return s3Service.generatePresignedUrl(bucket, key, operation, expiresIn);
};