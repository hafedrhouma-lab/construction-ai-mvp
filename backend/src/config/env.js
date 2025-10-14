import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  
  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'quickbids',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20, // Max pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  
  // AWS
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  
  // S3
  s3: {
    bucket: process.env.AWS_S3_BUCKET || 'quickbids-files',
    urlExpiration: 3600, // 1 hour
  },
  
  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4-vision-preview',
    maxTokens: 4096,
    temperature: 0.1, // Low temperature for consistency
  },
  
  // JWT (future)
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: '24h',
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export default config;
