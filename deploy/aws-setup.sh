#!/bin/bash

# AWS Deployment Script for Address District API
# This script sets up the cheapest possible AWS deployment

set -e

echo "🚀 Setting up Address District API on AWS..."

# Configuration
REGION="us-east-1"  # Cheapest region
DB_INSTANCE_CLASS="db.t3.micro"  # Free tier eligible
DB_ALLOCATED_STORAGE="20"  # Minimum for free tier
DB_NAME="addrdistrictdb"
DB_USERNAME="postgres"
APP_NAME="addr-district-api"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "  Region: $REGION"
echo "  Database: RDS PostgreSQL ($DB_INSTANCE_CLASS)"
echo "  App Platform: AWS App Runner"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}❌ AWS CLI not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI configured${NC}"

# Generate a random password
DB_PASSWORD=$(openssl rand -base64 12)
echo -e "${YELLOW}🔐 Generated database password: ${DB_PASSWORD}${NC}"

# Create RDS subnet group
echo -e "${YELLOW}🔧 Creating RDS subnet group...${NC}"
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region $REGION)
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[*].SubnetId' --output text --region $REGION)

aws rds create-db-subnet-group \
    --db-subnet-group-name "$APP_NAME-subnet-group" \
    --db-subnet-group-description "Subnet group for $APP_NAME" \
    --subnet-ids $SUBNET_IDS \
    --region $REGION \
    --tags Key=Application,Value=$APP_NAME || true

# Create security group for RDS
echo -e "${YELLOW}🔧 Creating security group...${NC}"
SG_ID=$(aws ec2 create-security-group \
    --group-name "$APP_NAME-rds-sg" \
    --description "Security group for $APP_NAME RDS" \
    --vpc-id $VPC_ID \
    --region $REGION \
    --query 'GroupId' \
    --output text 2>/dev/null || \
    aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$APP_NAME-rds-sg" \
    --query 'SecurityGroups[0].GroupId' \
    --output text \
    --region $REGION)

# Allow PostgreSQL access from anywhere (for App Runner)
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 5432 \
    --cidr 0.0.0.0/0 \
    --region $REGION 2>/dev/null || true

echo -e "${GREEN}✅ Security group created: $SG_ID${NC}"

# Create RDS instance
echo -e "${YELLOW}🗄️  Creating RDS PostgreSQL instance (this takes 5-10 minutes)...${NC}"
aws rds create-db-instance \
    --db-instance-identifier "$APP_NAME-db" \
    --db-instance-class $DB_INSTANCE_CLASS \
    --engine postgres \
    --engine-version 15.4 \
    --master-username $DB_USERNAME \
    --master-user-password "$DB_PASSWORD" \
    --allocated-storage $DB_ALLOCATED_STORAGE \
    --db-name $DB_NAME \
    --vpc-security-group-ids $SG_ID \
    --db-subnet-group-name "$APP_NAME-subnet-group" \
    --publicly-accessible \
    --no-multi-az \
    --storage-type gp2 \
    --backup-retention-period 0 \
    --region $REGION \
    --tags Key=Application,Value=$APP_NAME \
    2>/dev/null || echo "RDS instance may already exist"

# Wait for RDS to be available
echo -e "${YELLOW}⏳ Waiting for RDS instance to be available...${NC}"
aws rds wait db-instance-available \
    --db-instance-identifier "$APP_NAME-db" \
    --region $REGION

# Get RDS endpoint
DB_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier "$APP_NAME-db" \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text \
    --region $REGION)

echo -e "${GREEN}✅ RDS instance created: $DB_ENDPOINT${NC}"

# Create .env.production file
echo -e "${YELLOW}📝 Creating production environment file...${NC}"
cat > .env.production << EOF
DATABASE_URL=postgresql://$DB_USERNAME:$DB_PASSWORD@$DB_ENDPOINT:5432/$DB_NAME
PORT=3000
NODE_ENV=production

# Database connection details
DB_HOST=$DB_ENDPOINT
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USERNAME
DB_PASSWORD=$DB_PASSWORD

# WPRDC Geomancer API
GEOMANCER_BASE_URL=https://tools.wprdc.org/geo

# Census Geocoder (fallback)
CENSUS_GEOCODER_URL=https://geocoding.geo.census.gov/geocoder
EOF

echo -e "${GREEN}✅ Environment file created${NC}"

# Create deployment summary
echo -e "${YELLOW}📝 Creating deployment summary...${NC}"
cat > deployment-info.txt << EOF
=== AWS Deployment Information ===

Database (RDS PostgreSQL):
- Endpoint: $DB_ENDPOINT
- Database: $DB_NAME
- Username: $DB_USERNAME
- Password: $DB_PASSWORD
- Instance: $DB_INSTANCE_CLASS (Free tier eligible)

Security Group: $SG_ID
Region: $REGION

Estimated Monthly Cost:
- RDS db.t3.micro: \$0 (Free tier: 750 hours/month)
- App Runner: ~\$5-10/month (pay per use)
- Total: ~\$5-10/month

Next Steps:
1. Initialize the database by running the ETL script
2. Deploy to App Runner using the AWS Console or CLI
3. Update App Runner environment variables with the values above

Cost Optimization Tips:
- RDS is free for first 12 months (750 hours/month)
- App Runner only charges for actual usage
- Consider stopping RDS when not in use for development
EOF

echo ""
echo -e "${GREEN}🎉 AWS infrastructure setup complete!${NC}"
echo ""
echo -e "${YELLOW}📋 Summary:${NC}"
echo "- RDS PostgreSQL instance created: $DB_ENDPOINT"
echo "- Environment file: .env.production"
echo "- Deployment info: deployment-info.txt"
echo ""
echo -e "${YELLOW}🚀 Next steps:${NC}"
echo "1. Initialize database: Run ETL script against RDS"
echo "2. Deploy to App Runner: Use AWS Console or CLI"
echo "3. Expected monthly cost: ~\$5-10"
echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"