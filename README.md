# QuickBids - AI Construction Document Extraction

**Version:** 1.0.0 | **Status:** Production Ready MVP

## What It Does

AI-powered platform that extracts line items from construction PDFs automatically.

1. Upload PDF → Select topics (striping, signage, etc.)
2. AI extracts line items (quantities, descriptions, prices)
3. Human reviews and corrects
4. Export estimate with AI vs Human tracking

## Key Features

- ✅ Topic-based page filtering (50% cost savings)
- ✅ Dual AI extraction (standard v1 + enhanced v2)
- ✅ Complete delta tracking (AI vs Human)
- ✅ Re-extraction limits (2 per page)
- ✅ CSV export with comparison
- ✅ Demo mode with conflict resolution

## Tech Stack

**Frontend:** React 18 + Vite | Deployed on AWS S3  
**Backend:** Node.js 18 + Express | Deployed on AWS Lightsail  
**Database:** PostgreSQL 14+ | AWS Lightsail Managed  
**Storage:** AWS S3  
**AI:** OpenAI GPT-4o

## Quick Start
```bash
# 1. Database
createdb quickbids
psql quickbids < backend/schema.sql

# 2. Backend
cd backend
npm install
cp .env.example .env  # Edit with your credentials
npm run dev  # Runs on :3001

# 3. Frontend
cd frontend
npm install
echo "VITE_API_URL=http://localhost:3001/api/v1" > .env
npm run dev  # Runs on :5173
```

## Required Credentials
```bash
# Backend .env
DB_PASSWORD=your_postgres_password
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=quickbids-files
OPENAI_API_KEY=sk-proj-...
```

## Project Structure
```
quickbids/
├── backend/          # Node.js API
│   ├── src/
│   │   ├── modules/  # Projects, Files (MVC pattern)
│   │   ├── routes/   # Extractions, Estimates
│   │   ├── services/ # AI, PDF, Storage
│   │   └── app.js
│   ├── schema.sql
│   └── .env
├── frontend/         # React app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   └── .env
└── docs/            # Documentation
```

## Production Deployment

**Frontend:** AWS S3 bucket (static hosting)  
**Backend:** AWS Lightsail instance (2GB, $10/month)  
**Database:** AWS Lightsail PostgreSQL (2GB, $15/month)  
**Files:** AWS S3 bucket  
**Total Cost:** ~$33-43/month

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for full guide.

## API Endpoints
```
POST   /api/v1/projects              Create project
GET    /api/v1/projects              List projects
POST   /api/v1/files/upload          Upload PDF
GET    /api/v1/files?project_id=...  List files
POST   /api/v1/extractions/start     Extract page
GET    /api/v1/extractions/:id       Get results
PUT    /api/v1/line-items/:id        Edit item
POST   /api/v1/estimates/generate    Generate estimate
```

See [API.md](docs/API.md) for complete reference.

## Demo User
```
Email: demo@quickbids.com
User ID: 00000000-0000-0000-0000-000000000001
Project: Atlanta Striping Project
```

## Documentation

- [API.md](docs/API.md) - API endpoints reference
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design
- [BACKEND_QUICK.md](docs/BACKEND_QUICK.md) - Backend guide
- [FRONTEND_QUICK.md](docs/FRONTEND_QUICK.md) - Frontend guide
- [DEPLOYMENT_QUICK.md](docs/DEPLOYMENT_QUICK.md) - Deploy to AWS

## Support

- Check logs: `backend/logs/combined.log`
- Test API: `curl http://localhost:3001/health`
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Next Steps

1. ✅ Test locally (see Quick Start above)
2. ⚠️ Add authentication (currently uses demo user)
3. ⚠️ Add monitoring (CloudWatch, Sentry)
4. ⚠️ Add rate limiting
5. 🚀 Deploy to production (see DEPLOYMENT_QUICK.md)

---

**Last Updated:** October 2025  
**Delivery:** Week 1 Complete ✅