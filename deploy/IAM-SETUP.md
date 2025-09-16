# IAM Permissions Setup Guide

This guide shows how to create the minimal IAM permissions needed to deploy the Address District API to AWS.

## 🔐 IAM Policy Options

### Option 1: Full Deployment Policy (Recommended)
**File:** `iam-policy.json`
- Complete permissions for automated deployment
- Includes ECR access for container builds
- Suitable for CI/CD pipelines

### Option 2: Minimal Manual Policy
**File:** `iam-minimal-policy.json`
- Minimum permissions for manual deployment
- More restrictive, requires some manual steps
- Better security posture

## 🚀 Quick Setup (AWS Console)

### Step 1: Create IAM User

1. Go to **IAM Console** → **Users** → **Create user**
2. Username: `addr-district-deployer`
3. Access type: **Programmatic access**
4. **Next: Permissions**

### Step 2: Create Custom Policy

1. Click **Create policy** → **JSON**
2. Copy and paste the policy from `iam-policy.json`
3. Policy name: `AddressDistrictAPIDeployment`
4. **Create policy**

### Step 3: Attach Policy to User

1. Select the policy you just created
2. **Next: Tags** (optional)
3. **Next: Review** → **Create user**
4. **Save the Access Key ID and Secret Access Key**

## 🖥️ CLI Setup

### Option A: Create Everything via CLI

```bash
# 1. Create the policy
aws iam create-policy \
    --policy-name AddressDistrictAPIDeployment \
    --policy-document file://deploy/iam-policy.json

# 2. Create the user
aws iam create-user --user-name addr-district-deployer

# 3. Attach the policy (replace ACCOUNT-ID with your AWS account)
aws iam attach-user-policy \
    --user-name addr-district-deployer \
    --policy-arn arn:aws:iam::ACCOUNT-ID:policy/AddressDistrictAPIDeployment

# 4. Create access keys
aws iam create-access-key --user-name addr-district-deployer
```

### Option B: Use Existing User

```bash
# Attach policy to existing user
aws iam attach-user-policy \
    --user-name YOUR-USERNAME \
    --policy-arn arn:aws:iam::ACCOUNT-ID:policy/AddressDistrictAPIDeployment
```

## 📋 Policy Breakdown

### RDS Permissions
```json
{
  "Sid": "RDSManagement",
  "Effect": "Allow",
  "Action": [
    "rds:CreateDBInstance",
    "rds:DescribeDBInstances",
    "rds:StartDBInstance",
    "rds:StopDBInstance"
  ]
}
```

### App Runner Permissions
```json
{
  "Sid": "AppRunnerFullAccess",
  "Effect": "Allow",
  "Action": ["apprunner:*"]
}
```

### VPC & Security Groups
```json
{
  "Sid": "VPCNetworking",
  "Effect": "Allow",
  "Action": [
    "ec2:DescribeVpcs",
    "ec2:CreateSecurityGroup",
    "ec2:AuthorizeSecurityGroupIngress"
  ]
}
```

## 🔒 Security Best Practices

### 1. Use Minimal Policy for Production
- Start with `iam-minimal-policy.json`
- Add permissions as needed
- Regularly audit permissions

### 2. Rotate Access Keys
```bash
# Create new keys
aws iam create-access-key --user-name addr-district-deployer

# Delete old keys
aws iam delete-access-key --user-name addr-district-deployer --access-key-id OLD-KEY-ID
```

### 3. Use IAM Roles for Production
Instead of IAM users, consider:
- **EC2 Instance Roles** for deployment servers
- **GitHub Actions OIDC** for CI/CD
- **AWS SSO** for human access

### 4. Resource-Level Restrictions
```json
{
  "Effect": "Allow",
  "Action": "rds:*",
  "Resource": "arn:aws:rds:us-east-1:*:db:addr-district-api-*"
}
```

## 🧪 Testing Permissions

### Verify Setup
```bash
# Test AWS CLI access
aws sts get-caller-identity

# Test RDS permissions
aws rds describe-db-instances --region us-east-1

# Test App Runner permissions
aws apprunner list-services --region us-east-1
```

### Common Issues

**Issue:** `AccessDenied` errors
**Solution:** Check policy attachment and JSON syntax

**Issue:** `InvalidUserType.NotSupported`
**Solution:** Ensure programmatic access is enabled

**Issue:** `UnauthorizedOperation`
**Solution:** Add missing permissions to policy

## 📊 Permission Summary

| Service | Permissions | Purpose |
|---------|------------|---------|
| **RDS** | Create, Describe, Start/Stop | Database management |
| **App Runner** | Full access | Deploy and manage API |
| **EC2** | VPC, Security Groups | Network configuration |
| **IAM** | Service-linked roles | App Runner integration |
| **ECR** | Push/Pull images | Container registry |
| **CloudWatch** | Logs | Monitoring and debugging |

## 🔄 Alternative: AWS-Managed Policies

For testing, you can use broader AWS-managed policies:

```bash
# Attach broader policies (less secure)
aws iam attach-user-policy \
    --user-name addr-district-deployer \
    --policy-arn arn:aws:iam::aws:policy/AmazonRDSFullAccess

aws iam attach-user-policy \
    --user-name addr-district-deployer \
    --policy-arn arn:aws:iam::aws:policy/AWSAppRunnerFullAccess
```

⚠️ **Warning:** AWS-managed policies are overly broad for production use.

## 🎯 Next Steps

1. Create IAM user with appropriate policy
2. Configure AWS CLI: `aws configure`
3. Run deployment: `./deploy/aws-setup.sh`
4. Monitor costs in AWS Billing Dashboard

---

**Total setup time:** 5-10 minutes
**Security level:** Production-ready with minimal permissions