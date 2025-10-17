# Backend Quick Guide

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- AWS Account (S3)
- OpenAI API Key

### Installation

**1. Install Dependencies**
```bash
cd backend
npm install
```

**2. Create Database**
```bash
createdb quickbids
psql quickbids < schema.sql
```

**3. Configure Environment**
```bash
cp .env.example .env
nano .env
```

**Required .env variables:**
```bash
NODE_ENV=development
PORT=3001
LOG_LEVEL=info

DB_HOST=localhost
DB_PORT=5432
DB_NAME=quickbids
DB_USER=postgres
DB_PASSWORD=your_password

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=quickbids-files

OPENAI_API_KEY=sk-proj-...
```

**4. Start Server**
```bash
npm run dev
```

**Expected output:**
```
✅ Database connected
🚀 Server running on port 3001
```

**Test:**
```bash
curl http://localhost:3001/health
```

---

## Project Structure
```
backend/
├── src/
│   ├── config/              # Configuration
│   │   ├── database.js     # PostgreSQL pool
│   │   ├── env.js          # Environment vars
│   │   ├── logger.js       # Winston logger
│   │   └── topics.js       # Topic definitions
│   │
│   ├── modules/            # MVC modules
│   │   ├── projects/
│   │   │   ├── controller.js
│   │   │   ├── service.js
│   │   │   ├── repository.js
│   │   │   └── routes.js
│   │   └── files/
│   │       └── (same structure)
│   │
│   ├── routes/            # Additional routes
│   │   ├── extractions.js
│   │   ├── line-items.js
│   │   ├── estimates.js
│   │   └── demo.js
│   │
│   ├── services/          # Business logic
│   │   ├── ai/
│   │   │   ├── OpenAIExtractor.js
│   │   │   └── prompts/
│   │   ├── pdf/
│   │   │   └── PdfToImageService.js
│   │   ├── storage/
│   │   │   └── FileFetcher.js
│   │   └── filtering/
│   │       └── KeywordChecker.js
│   │
│   ├── utils/
│   │   ├── aws/
│   │   │   └── s3Client.js
│   │   └── pdf/
│   │       └── pdfProcessor.js
│   │
│   └── app.js            # Express app
│
├── migrations/           # Database migrations
├── logs/                # Winston logs
├── uploads/             # Temp uploads
├── schema.sql           # Database schema
├── .env                 # Environment (not in git)
├── .env.example         # Template
└── package.json
```

---

## MVC Pattern

All modules follow this structure:
```
Request → Routes → Controller → Service → Repository → Database
```

### Example: Projects Module

**1. routes.js - Define endpoints**
```javascript
import express from 'express';
import controller from './controller.js';

const router = express.Router();
router.post('/', controller.create);
router.get('/', controller.getAll);
export default router;
```

**2. controller.js - Handle HTTP**
```javascript
import service from './service.js';

class ProjectsController {
  async create(req, res) {
    try {
      const project = await service.create(req.body);
      res.status(201).json(project);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
export default new ProjectsController();
```

**3. service.js - Business logic**
```javascript
import repository from './repository.js';
import logger from '../../config/logger.js';

class ProjectsService {
  async create(data) {
    // Validation
    if (!data.name) throw new Error('name required');
    
    logger.info('Creating project:', data.name);
    const project = await repository.create(data);
    logger.info('✅ Project created:', project.id);
    
    return project;
  }
}
export default new ProjectsService();
```

**4. repository.js - Database**
```javascript
import pool from '../../config/database.js';

class ProjectsRepository {
  async create(data) {
    const query = `
      INSERT INTO projects (name, customer_name)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await pool.query(query, [data.name, data.customer_name]);
    return result.rows[0];
  }
  
  async findAll() {
    const query = 'SELECT * FROM projects ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  }
}
export default new ProjectsRepository();
```

---

## Database Connection

**config/database.js:**
```javascript
import pg from 'pg';
import config from './env.js';

const { Pool } = pg;

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected');
  }
});

export default pool;
```

**Usage in repository:**
```javascript
const result = await pool.query('SELECT * FROM projects');
const projects = result.rows;
```

---

## SQL Best Practices

**1. Always use parameterized queries**
```javascript
// ❌ BAD - SQL injection risk
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ GOOD - Safe
const query = 'SELECT * FROM users WHERE email = $1';
const result = await pool.query(query, [email]);
```

**2. Transactions**
```javascript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO projects...');
  await client.query('INSERT INTO files...');
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

**3. Always filter soft deletes**
```sql
WHERE deleted_at IS NULL
```

---

## Logging

**config/logger.js uses Winston:**
```javascript
import logger from './config/logger.js';

logger.info('✅ Operation successful');
logger.warn('⚠️ Warning message');
logger.error('❌ Error:', error);
logger.debug('🔍 Debug info');
```

**Logs written to:**
- console (colored)
- logs/combined.log
- logs/error.log (errors only)

---

## Error Handling

**Global error handler in app.js:**
```javascript
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    error: err.message,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});
```

**In controllers:**
```javascript
try {
  const result = await service.doSomething();
  res.json(result);
} catch (error) {
  logger.error('Operation failed:', error);
  res.status(500).json({ error: error.message });
}
```

---

## S3 Integration

**utils/aws/s3Client.js:**
```javascript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
```

**Upload file:**
```javascript
async function uploadToS3(buffer, key, bucket) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: 'application/pdf',
  });
  await s3Client.send(command);
}
```

**Get presigned URL (1 hour expiry):**
```javascript
async function getPresignedUrl(key, bucket) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
```

---

## OpenAI Integration

**services/ai/OpenAIExtractor.js:**
```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function extractFromPage(imageUrl, prompt) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } }
      ]
    }],
    max_tokens: 4096,
    temperature: 0.1,
    response_format: { type: 'json_object' }
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

---

## PDF Processing

**utils/pdf/pdfProcessor.js:**
```javascript
import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';

async function splitPDF(filePath) {
  const pdfBytes = await fs.readFile(filePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pageCount = pdfDoc.getPageCount();
  
  const pages = [];
  
  for (let i = 0; i < pageCount; i++) {
    const newDoc = await PDFDocument.create();
    const [copiedPage] = await newDoc.copyPages(pdfDoc, [i]);
    newDoc.addPage(copiedPage);
    
    const pageBytes = await newDoc.save();
    pages.push(pageBytes);
  }
  
  return pages;
}
```

---

## Background Processing

**File uploads process in background:**
```javascript
// modules/files/service.js
async uploadAndProcess(file, projectId) {
  // Create DB record
  const fileRecord = await repository.create({...});
  
  // Return immediately
  setTimeout(() => {
    this.processInBackground(file, fileRecord);
  }, 0);
  
  return fileRecord;
}

async processInBackground(file, fileRecord) {
  try {
    // Split PDF
    const pages = await pdfProcessor.split(file.path);
    
    // Upload to S3
    for (const page of pages) {
      await s3.upload(page, ...);
    }
    
    // Update status
    await repository.update(fileRecord.id, { status: 'ready' });
  } catch (error) {
    logger.error('Processing failed:', error);
    await repository.update(fileRecord.id, { status: 'failed' });
  }
}
```

---

## Testing

**Manual API testing:**
```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/v1/projects
```

**Check logs:**
```bash
tail -f logs/combined.log
```

**Check database:**
```bash
psql quickbids
SELECT * FROM projects;
```

---

## Common Issues

**1. Database connection failed**
- Check PostgreSQL is running: `pg_isready`
- Check credentials in `.env`
- Check port 5432 is open

**2. S3 upload fails**
- Verify AWS credentials
- Check bucket exists: `aws s3 ls`
- Check bucket permissions

**3. OpenAI errors**
- Verify API key: `echo $OPENAI_API_KEY`
- Check API limits/billing
- Check network connectivity

**4. Port already in use**
- Check: `lsof -i :3001`
- Kill process: `kill -9 <PID>`
- Or change PORT in `.env`

---

## Development Commands
```bash
npm run dev        # Start with nodemon (auto-restart)
npm start          # Production start
npm run logs       # View logs
npm run db:reset   # Reset database (recreate schema)
```

---

## Production Deployment

See DEPLOYMENT_QUICK.md for:
- AWS Lightsail setup
- PM2 process manager
- Nginx reverse proxy
- SSL with Let's Encrypt

---

**Last Updated:** October 2025  
**Version:** 1.0.0