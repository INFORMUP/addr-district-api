# AWS Deployment Guide

Deploy your Address District API to AWS with minimal costs (~$5-10/month).

## 🏗️ Architecture

- **App Runner**: Serverless container platform for the API
- **RDS PostgreSQL**: Managed database (db.t3.micro - free tier eligible)
- **Estimated Cost**: $5-10/month (free for first 12 months with AWS Free Tier)

## 📋 Prerequisites

1. AWS Account with Free Tier
2. AWS CLI configured (`aws configure`)
3. Docker installed (for local testing)

## 🚀 Quick Deployment

### Option 1: Automated Setup (Recommended)

```bash
# 1. Make setup script executable
chmod +x deploy/aws-setup.sh

# 2. Run automated setup (creates RDS + configs)
./deploy/aws-setup.sh

# 3. Initialize database
node deploy/init-production-db.js

# 4. Deploy to App Runner (see manual steps below)
```

### Option 2: Manual Setup

#### Step 1: Create RDS Database

```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
    --db-instance-identifier addr-district-api-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --master-username postgres \
    --master-user-password YOUR_PASSWORD \
    --allocated-storage 20 \
    --publicly-accessible \
    --region us-east-1
```

#### Step 2: Create App Runner Service

1. Go to AWS App Runner Console
2. Click "Create service"
3. Choose "Source code repository"
4. Connect your GitHub repo
5. Configure build settings:
   - Build command: `npm ci --omit=dev`
   - Start command: `npm start`
   - Port: `3000`

#### Step 3: Set Environment Variables

In App Runner, add these environment variables:

```
NODE_ENV=production
PORT=3000
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=5432
DB_NAME=addr_district_db
DB_USER=postgres
DB_PASSWORD=your-password
GEOMANCER_BASE_URL=https://tools.wprdc.org/geo
CENSUS_GEOCODER_URL=https://geocoding.geo.census.gov/geocoder
```

#### Step 4: Initialize Database

```bash
# Load environment and run setup
node deploy/init-production-db.js
```

## 💰 Cost Optimization

### Free Tier Benefits (First 12 Months)
- **RDS**: 750 hours/month of db.t3.micro (FREE)
- **App Runner**: Pay per use (~$5-10/month)

### After Free Tier
- **RDS db.t3.micro**: ~$15/month
- **App Runner**: ~$5-10/month
- **Total**: ~$20-25/month

### Cost Reduction Tips

1. **Use RDS Scheduler**: Stop RDS when not in use
```bash
# Stop RDS (saves money during development)
aws rds stop-db-instance --db-instance-identifier addr-district-api-db

# Start when needed
aws rds start-db-instance --db-instance-identifier addr-district-api-db
```

2. **App Runner Auto-scaling**: Automatically scales to zero when not used

3. **Alternative for Ultra-Low Cost**: Use AWS Lambda + RDS Proxy (more complex setup)

## 🔧 Deployment Options by Cost

### Option A: Minimal Cost (~$0-5/month)
- **App Runner** (serverless, pay per use)
- **RDS db.t3.micro** (free tier)
- Best for: Low traffic, development

### Option B: Production Ready (~$20-30/month)
- **App Runner** with reserved capacity
- **RDS db.t3.small** with Multi-AZ
- Best for: Production workloads

### Option C: Ultra Minimal (<$5/month)
- **Lambda** + **API Gateway**
- **RDS Serverless v2** (Aurora)
- Best for: Very low traffic

## 🔍 Monitoring

App Runner provides built-in monitoring:
- Application logs
- Metrics dashboard
- Health checks
- Automatic deployments

## 🛠️ Troubleshooting

### Common Issues

1. **RDS Connection Issues**
   - Check security groups allow port 5432
   - Ensure RDS is publicly accessible
   - Verify VPC/subnet configuration

2. **App Runner Build Failures**
   - Check Dockerfile
   - Verify npm scripts
   - Review build logs

3. **Environment Variables**
   - Double-check all required vars are set
   - Test database connection string

### Health Check Endpoint

Your API includes a health check at `/health`:

```bash
curl https://your-app-runner-url.amazonaws.com/health
```

## 📊 Performance

Expected performance on minimal setup:
- **Response Time**: <500ms for address lookups
- **Throughput**: 100+ requests/minute
- **Availability**: 99.9% (App Runner SLA)

## 🔐 Security

- HTTPS enabled by default (App Runner)
- Database credentials in environment variables
- VPC security groups restrict database access
- Content Security Policy headers enabled

## 🚀 Go Live Checklist

- [ ] RDS instance created and accessible
- [ ] Database schema and data loaded
- [ ] App Runner service deployed
- [ ] Environment variables configured
- [ ] Health check endpoint responding
- [ ] Test API with sample addresses
- [ ] Monitor costs in AWS Billing Dashboard

## 📞 Support

For issues:
1. Check AWS CloudWatch logs
2. Verify environment configuration
3. Test database connectivity
4. Review App Runner deployment status

---

**Total Setup Time**: 15-30 minutes
**Monthly Cost**: $5-10 (free tier) / $20-25 (after free tier)