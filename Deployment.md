# Deployment Quick Guide

## AWS Production Deployment

### Requirements Checklist

Before you start, gather:

- [ ] AWS Account
- [ ] Domain name (optional but recommended)
- [ ] OpenAI API Key (sk-proj-...)
- [ ] Credit card for AWS billing

### Cost Estimate

| Service | Monthly Cost |
|---------|--------------|
| Lightsail Backend (2GB) | $10 |
| Lightsail Database (2GB) | $15 |
| S3 Frontend | $1-2 |
| S3 Files (100GB) | $2-3 |
| OpenAI API | Variable |
| **Total** | **~$33-43** |

---

## Step 1: Create IAM User

**1. Login to AWS Console**
```
https://console.aws.amazon.com/
```

**2. Go to IAM → Users → Create User**
- Name: `quickbids-app`
- Access type: Programmatic access

**3. Attach Policies**
- AmazonS3FullAccess
- AWSLightsailFullAccess

**4. Download Credentials CSV**
- Save Access Key ID and Secret Access Key

⚠️ **NEVER commit these to Git!**

---

## Step 2: Configure AWS CLI

**Install AWS CLI:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

**Configure:**
```bash
aws configure

AWS Access Key ID: AKIA...your-key
AWS Secret Access Key: your-secret-key
Default region name: us-east-1
Default output format: json
```

**Verify:**
```bash
aws sts get-caller-identity
```

---

## Step 3: Create S3 Buckets

**Create frontend bucket:**
```bash
aws s3 mb s3://quickbids-app --region us-east-1
```

**Create files bucket:**
```bash
aws s3 mb s3://quickbids-files --region us-east-1
```

**Enable versioning on files bucket:**
```bash
aws s3api put-bucket-versioning \
  --bucket quickbids-files \
  --versioning-configuration Status=Enabled
```

**Enable website hosting on frontend:**
```bash
aws s3 website s3://quickbids-app \
  --index-document index.html \
  --error-document index.html
```

**Set public read policy for frontend:**
```bash
cat > bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::quickbids-app/*"
  }]
}
EOF

aws s3api put-bucket-policy \
  --bucket quickbids-app \
  --policy file://bucket-policy.json
```

**Configure CORS for files bucket:**
```bash
cat > cors.json << 'EOF'
{
  "CORSRules": [{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }]
}
EOF

aws s3api put-bucket-cors \
  --bucket quickbids-files \
  --cors-configuration file://cors.json
```

---

## Step 4: Create Lightsail Instance (Backend)

**Using AWS Console:**
1. Go to `https://lightsail.aws.amazon.com/`
2. Create instance
3. Select: Linux/Unix → Ubuntu 20.04
4. Choose plan: $10/month (2GB RAM, 1 vCPU) - Recommended
5. Name: quickbids-backend
6. Create instance
7. Download SSH key

**Or using CLI:**
```bash
aws lightsail create-instances \
  --instance-names quickbids-backend \
  --availability-zone us-east-1a \
  --blueprint-id ubuntu_20_04 \
  --bundle-id micro_2_0
```

---

## Step 5: Setup Backend Server

**Connect to instance:**
```bash
chmod 400 quickbids-keypair.pem
ssh -i quickbids-keypair.pem ubuntu@<your-instance-ip>
```

**Update system:**
```bash
sudo apt update && sudo apt upgrade -y
```

**Install Node.js 18:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

**Verify:**
```bash
node --version
npm --version
```

**Install PM2:**
```bash
sudo npm install -g pm2
```

**Install PostgreSQL client:**
```bash
sudo apt install -y postgresql-client
```

**Create app directory:**
```bash
sudo mkdir -p /var/www/quickbids
sudo chown -R ubuntu:ubuntu /var/www/quickbids
```

---

## Step 6: Deploy Backend Code

**Option A: Using Git (Recommended)**
```bash
cd /var/www/quickbids
git clone <your-repo-url> backend
cd backend
npm install --production
```

**Option B: Using SCP**
```bash
# From local machine
cd quickbids/backend
tar -czf backend.tar.gz src/ package*.json schema.sql
scp -i quickbids-keypair.pem backend.tar.gz ubuntu@<ip>:/var/www/quickbids/

# On server
cd /var/www/quickbids
tar -xzf backend.tar.gz
npm install --production
```

**Create directories:**
```bash
mkdir -p logs uploads/temp
```

---

## Step 7: Create Database

**Using Lightsail Console:**
1. Go to Databases → Create database
2. PostgreSQL 12+
3. Choose plan: $15/month (2GB RAM)
4. Name: quickbids-db
5. Master username: dbmasteruser
6. Set strong password
7. Create database

**Get endpoint:**
```bash
aws lightsail get-relational-database \
  --relational-database-name quickbids-db
```

Note the endpoint: `ls-xxxxx.us-east-1.rds.amazonaws.com`

**Connect and setup:**
```bash
psql -h ls-xxxxx.us-east-1.rds.amazonaws.com \
     -U dbmasteruser \
     -d quickbids
```

**Create database:**
```sql
CREATE DATABASE quickbids;
\c quickbids
```

**Run schema:**
```sql
\i schema.sql
```

**Or from file:**
```bash
psql -h ls-xxxxx.us-east-1.rds.amazonaws.com \
     -U dbmasteruser \
     -d quickbids \
     -f schema.sql
```

**Verify:**
```sql
\dt
SELECT * FROM users;
```

---

## Step 8: Configure Backend Environment
```bash
cd /var/www/quickbids/backend
nano .env
```

**Production .env:**
```bash
NODE_ENV=production
PORT=3001
LOG_LEVEL=warn

DB_HOST=ls-xxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=quickbids
DB_USER=dbmasteruser
DB_PASSWORD=your-secure-database-password

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...your-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=quickbids-files

OPENAI_API_KEY=sk-proj-your-production-key

ALLOWED_ORIGINS=http://quickbids-app.s3-website-us-east-1.amazonaws.com,https://yourdomain.com
```

**Secure the file:**
```bash
chmod 600 .env
```

---

## Step 9: Start Backend with PM2
```bash
cd /var/www/quickbids/backend
```

**Start app:**
```bash
pm2 start src/app.js --name quickbids-api
```

**Save configuration:**
```bash
pm2 save
```

**Setup auto-start on boot:**
```bash
pm2 startup
```

Copy and run the command it outputs (usually starts with sudo)

**Check status:**
```bash
pm2 status
pm2 logs quickbids-api
```

**Test locally:**
```bash
curl http://localhost:3001/health
```

Expected: `{"status":"ok"}`

---

## Step 10: Configure Firewall

**Using Lightsail Console:**
1. Go to your instance → Networking
2. Add rules:
   - HTTP (80)
   - HTTPS (443)
   - Custom TCP (3001) - for API

**Or using UFW:**
```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 3001/tcp # API
sudo ufw enable
```

---

## Step 11: Setup Nginx (Optional but Recommended)

**Install:**
```bash
sudo apt install -y nginx
```

**Create config:**
```bash
sudo nano /etc/nginx/sites-available/quickbids
```

**Config:**
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for long AI requests
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }
    
    client_max_body_size 500M;
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/quickbids /etc/nginx/sites-enabled/
```

**Test:**
```bash
sudo nginx -t
```

**Restart:**
```bash
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## Step 12: Setup SSL with Let's Encrypt

**Install Certbot:**
```bash
sudo apt install -y certbot python3-certbot-nginx
```

**Get certificate:**
```bash
sudo certbot --nginx -d api.yourdomain.com
```

**Follow prompts:**
- Email: your@email.com
- Agree to terms: Yes
- Redirect HTTP to HTTPS: Yes

Certificate auto-renews via cron

**Verify:**
```bash
sudo certbot renew --dry-run
```

---

## Step 13: Deploy Frontend

**Local machine:**
```bash
cd quickbids/frontend
```

**Create production .env:**
```bash
echo "VITE_API_URL=https://api.yourdomain.com/api/v1" > .env.production
```

**Or for S3 URL:**
```bash
echo "VITE_API_URL=http://<lightsail-ip>:3001/api/v1" > .env.production
```

**Build:**
```bash
npm run build
```

**Deploy to S3:**
```bash
aws s3 sync dist/ s3://quickbids-app --delete
```

**Set content types:**
```bash
aws s3 sync dist/ s3://quickbids-app \
  --exclude "*" --include "*.html" \
  --content-type "text/html" \
  --cache-control "no-cache"

aws s3 sync dist/ s3://quickbids-app \
  --exclude "*" --include "*.js" \
  --content-type "application/javascript" \
  --cache-control "max-age=31536000"

aws s3 sync dist/ s3://quickbids-app \
  --exclude "*" --include "*.css" \
  --content-type "text/css" \
  --cache-control "max-age=31536000"
```

---

## Step 14: Access Your App

**Frontend URL:**
```
http://quickbids-app.s3-website-us-east-1.amazonaws.com
```

**Backend API:**
```
http://<lightsail-ip>:3001
or
https://api.yourdomain.com (if configured)
```

**Test:**
```bash
curl http://quickbids-app.s3-website-us-east-1.amazonaws.com
curl https://api.yourdomain.com/health
```

---

## Maintenance

**View logs:**
```bash
ssh -i quickbids-keypair.pem ubuntu@<ip>
pm2 logs quickbids-api
tail -f /var/www/quickbids/backend/logs/combined.log
```

**Restart backend:**
```bash
pm2 restart quickbids-api
```

**Update backend code:**
```bash
cd /var/www/quickbids/backend
git pull origin main
npm install --production
pm2 restart quickbids-api
```

**Update frontend:**
```bash
cd quickbids/frontend
git pull origin main
npm run build
aws s3 sync dist/ s3://quickbids-app --delete
```

**Database backup:**
```bash
pg_dump -h ls-xxxxx.us-east-1.rds.amazonaws.com \
        -U dbmasteruser \
        -d quickbids \
        > backup_$(date +%Y%m%d).sql
```

**Restore:**
```bash
psql -h ls-xxxxx.us-east-1.rds.amazonaws.com \
     -U dbmasteruser \
     -d quickbids \
     < backup_20251017.sql
```

---

## Monitoring

**PM2 status:**
```bash
pm2 status
pm2 monit
```

**Database:**
```bash
psql -h ls-xxxxx.us-east-1.rds.amazonaws.com \
     -U dbmasteruser \
     -d quickbids \
     -c "SELECT COUNT(*) FROM projects;"
```

**Disk space:**
```bash
df -h
```

**Memory:**
```bash
free -h
```

**Processes:**
```bash
top
```

**Nginx logs:**
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Troubleshooting

**Backend won't start:**
```bash
pm2 logs quickbids-api --lines 100
```
- Check .env file exists and has correct values
- Check database connection: `psql -h <db-host> -U dbmasteruser -d quickbids`

**Frontend not loading:**
- Check S3 bucket policy is public
- Verify VITE_API_URL in build
- Check CORS on backend

**Database connection failed:**
- Check security group allows connections
- Verify credentials in .env
- Test connection: `psql -h <endpoint> -U dbmasteruser`

**SSL certificate issues:**
```bash
sudo certbot certificates
sudo certbot renew
sudo nginx -t
```

---

## Security Checklist

- [ ] Strong database password
- [ ] .env file permissions (chmod 600)
- [ ] Firewall configured (only necessary ports)
- [ ] SSL/HTTPS enabled
- [ ] S3 buckets not publicly writable
- [ ] AWS credentials secured
- [ ] OpenAI API key secured
- [ ] Regular backups scheduled

---

## Scaling

**Current capacity:**
- 50+ concurrent users
- 100 requests/minute
- 10 concurrent AI extractions

**To scale:**
1. Vertical: Upgrade Lightsail to 4GB ($20/month)
2. Horizontal: Add load balancer + multiple instances
3. Database: Read replicas for heavy read loads

---

## Production Checklist

- [ ] Database created and schema loaded
- [ ] Backend deployed and running (PM2)
- [ ] Frontend deployed to S3
- [ ] Environment variables configured
- [ ] SSL certificate installed
- [ ] DNS configured (if using custom domain)
- [ ] Firewall rules set
- [ ] Backups scheduled
- [ ] Monitoring setup
- [ ] API health check passes
- [ ] Can create project via UI
- [ ] Can upload file
- [ ] Can extract with AI

---

## Post-Deployment

Next steps after deployment:
1. Add authentication (JWT)
2. Setup monitoring (CloudWatch, Sentry)
3. Add rate limiting
4. Schedule database backups
5. Setup alerting
6. Performance testing
7. Load testing

---

## Support

**Check logs first:**
- Backend: `pm2 logs quickbids-api`
- Nginx: `/var/log/nginx/error.log`
- Database: Check connection with psql

**Test endpoints:**
```bash
curl https://api.yourdomain.com/health
curl https://api.yourdomain.com/api/v1/projects
```

**If issues persist:**
- Check all environment variables
- Verify S3 permissions
- Test database connection
- Review firewall rules
- Check SSL certificate status

---

**Last Updated:** October 2025  
**Version:** 1.0.0