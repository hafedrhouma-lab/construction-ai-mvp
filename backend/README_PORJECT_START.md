# QuickBids Backend v2.0 - Clean Architecture

Modern, modular backend for QuickBids AI extraction platform.

## 🎯 Features

- ✅ Project-based organization
- ✅ PDF page splitting (handles 200MB+ files)
- ✅ S3 file storage
- ✅ PostgreSQL database
- ✅ Clean architecture (Controller → Service → Repository)
- ✅ Ready for video support

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Database

```bash
# Create database
createdb quickbids

# Run schema
psql quickbids < schema.sql
```

### 3. Configure Environment

```bash
# Copy example env
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Required variables:
- `DB_PASSWORD` - Your PostgreSQL password
- `AWS_ACCESS_KEY_ID` - AWS credentials
- `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `AWS_S3_BUCKET` - Your S3 bucket name
- `OPENAI_API_KEY` - OpenAI API key

### 4. Start Server

```bash
npm run dev
```

Server will start on http://localhost:3001

## 📡 API Endpoints

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/projects` | Create project |
| GET | `/api/v1/projects` | List projects |
| GET | `/api/v1/projects/:id` | Get project |
| PUT | `/api/v1/projects/:id` | Update project |
| DELETE | `/api/v1/projects/:id` | Archive project |

### Example: Create Project

```bash
curl -X POST http://localhost:3001/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Atlanta Striping Project",
    "description": "Parking lot striping",
    "customer_name": "City of Atlanta",
    "customer_email": "contact@atlanta.gov"
  }'
```

## 📁 Project Structure

```
src/
├── config/              # Configuration
│   ├── database.js     # PostgreSQL pool
│   ├── env.js          # Environment variables
│   └── logger.js       # Winston logger
│
├── modules/             # API modules
│   └── projects/       # Projects CRUD
│       ├── controller.js
│       ├── service.js
│       ├── repository.js
│       └── routes.js
│
├── services/            # Business logic
│   └── file-processing/ # PDF/video processing
│
├── utils/               # Utilities
│   ├── aws/            # S3 client
│   └── processors/     # PDF processor
│
└── app.js              # Express app
```

## 🧪 Testing

```bash
# Health check
curl http://localhost:3001/health

# Create test project
curl -X POST http://localhost:3001/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Project", "customer_name": "Test Customer"}'

# List projects
curl http://localhost:3001/api/v1/projects
```

## 📊 Database Schema

Key tables:
- `projects` - Project information
- `files` - Uploaded files (PDFs, videos)
- `extraction_sessions` - AI extraction sessions
- `scope_items` - Extracted line items
- `scope_item_corrections` - User corrections (training data!)
- `estimates` - Generated estimates

## 🔜 Coming Next

- [ ] Files module (upload, list, delete)
- [ ] PDF splitting on upload
- [ ] AI extraction service
- [ ] Frontend React app

## 🛠️ Development

```bash
# Watch mode (auto-restart)
npm run dev

# Production
npm start

# Run migrations
npm run migrate
```

## 📝 Logging

Logs are written to:
- Console (colored output)
- `logs/combined.log` - All logs
- `logs/error.log` - Errors only

## 🤝 Contributing

This is a clean, modular architecture. When adding features:

1. Create module folder: `src/modules/[feature]/`
2. Add controller, service, repository, routes
3. Register routes in `src/app.js`
4. Test with curl/Postman
5. Commit!

## 📄 License

MIT
