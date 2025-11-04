# Rollback Guide - fe-engine-prime

**FE-538: Automated Rollback System**

Complete guide for rolling back deployments in production.

---

## Table of Contents

1. [Overview](#overview)
2. [When to Rollback](#when-to-rollback)
3. [Manual Rollback (CLI)](#manual-rollback-cli)
4. [Manual Rollback (GitHub Actions)](#manual-rollback-github-actions)
5. [Automatic Rollback](#automatic-rollback)
6. [Rollback Verification](#rollback-verification)
7. [Troubleshooting](#troubleshooting)
8. [Recovery Procedures](#recovery-procedures)

---

## Overview

The fe-engine-prime rollback system provides multiple ways to quickly revert to
a previous working version:

- **Automatic Rollback:** Triggered on deployment failures (health check fails)
- **Manual Rollback (GitHub Actions):** Trigger via GitHub UI
- **Manual Rollback (CLI):** Run locally or in CI/CD

**Key Features:**

- ✅ Zero manual intervention for automatic rollbacks
- ✅ Health check validation after rollback
- ✅ Slack/Email notifications
- ✅ Deployment history tracking
- ✅ Rollback to any previous version

---

## When to Rollback

### Automatic Rollback Triggers

The system automatically rolls back when:

1. **Health Check Failure**

   - `/api/health` returns non-200 status code
   - Service unreachable after 3 attempts (90 seconds)
   - Health check times out

2. **Critical Errors** (Future)
   - Runtime errors in logs
   - Error rate > 5%
   - Response time > 5x baseline

### Manual Rollback Scenarios

Trigger manual rollback when:

- **User-reported issues** not caught by health checks
- **Data inconsistencies** detected
- **Performance degradation** over time
- **Security vulnerabilities** discovered
- **Feature needs to be disabled** quickly

---

## Manual Rollback (CLI)

### Prerequisites

1. **Repository Access**

   ```bash
   git clone <repository-url>
   cd fe-engine-prime
   ```

2. **Vercel CLI Installed**

   ```bash
   npm install -g vercel@latest
   ```

3. **Environment Variables** (Optional)
   ```bash
   export VERCEL_TOKEN="your-vercel-token"
   export VERCEL_ORG_ID="your-org-id"
   export VERCEL_PROJECT_ID="your-project-id"
   ```

### Basic Usage

#### 1. List Available Rollback Targets

```bash
./scripts/rollback.sh --list
```

**Output:**

```
════════════════════════════════════════════════════════
  Available Rollback Targets
════════════════════════════════════════════════════════

Recent successful deployments:

Deployment Tags:

  deploy-success-20251104-153000-abc1234
    SHA: abc1234
    Date: 2025-11-04
    Message: feat: Add new feature X

  deploy-success-20251103-143000-def5678
    SHA: def5678
    Date: 2025-11-03
    Message: fix: Fix critical bug Y
```

#### 2. Rollback to Previous Version

```bash
./scripts/rollback.sh
```

This automatically finds and rolls back to the most recent successful
deployment.

#### 3. Rollback to Specific Version

```bash
./scripts/rollback.sh abc1234
```

Replace `abc1234` with the SHA of the target version.

### Step-by-Step Process

The script performs the following steps:

1. **Validate Environment**

   - Check git repository
   - Verify Vercel CLI available
   - Validate credentials

2. **Determine Rollback Target**

   - Find previous successful deployment
   - Or use provided SHA
   - Validate SHA exists

3. **Display Rollback Info**

   ```
   Rollback Target Information:
     SHA: abc1234567890...
     Short SHA: abc1234
     Commit Message: feat: Add feature X
     Author: John Doe
     Date: 2025-11-04 15:30:00
   ```

4. **Confirm Rollback**

   ```
   Proceed with rollback to abc1234? [y/N]
   ```

5. **Execute Rollback**

   - Checkout target version
   - Install dependencies
   - Build application
   - Deploy to Vercel production

6. **Validate Rollback**

   - Wait 60s for stabilization
   - Run health checks (3 attempts)
   - Verify response

7. **Tag Successful Rollback**
   - Create rollback tag
   - Push to repository

### Example Session

```bash
$ ./scripts/rollback.sh

════════════════════════════════════════════════════════
  Automated Rollback - fe-engine-prime
════════════════════════════════════════════════════════

ℹ️  Validating environment...
✅ Environment validated

ℹ️  No target SHA provided, finding previous successful deployment...
ℹ️  Found deployment tag: deploy-success-20251104-153000-abc1234

ℹ️  Rollback Target Information:

  SHA: abc1234567890abcdef1234567890abcdef1234
  Short SHA: abc1234
  Commit Message: feat: Add feature X
  Author: John Doe
  Date: Mon Nov 4 15:30:00 2025 +0000

Proceed with rollback to abc1234? [y/N] y

════════════════════════════════════════════════════════
  Executing Rollback
════════════════════════════════════════════════════════

ℹ️  Checking out target version...
✅ Checked out abc1234

ℹ️  Installing dependencies...
✅ Dependencies installed

ℹ️  Building application...
✅ Build completed

ℹ️  Deploying to Vercel (production)...
✅ Deployed to: https://fe-engine-prime.vercel.app

════════════════════════════════════════════════════════
  Validating Rollback
════════════════════════════════════════════════════════

ℹ️  Waiting 60 seconds for service to stabilize...
ℹ️  Running health checks...

  Attempt 1/3...
✅ Health check passed

Response:
{
  "status": "healthy",
  "service": "fe-engine-prime",
  "version": "0.1.0"
}

ℹ️  Tagging successful rollback...
✅ Rollback tag created: rollback-20251104-160000-abc1234

════════════════════════════════════════════════════════
  Rollback Completed Successfully
════════════════════════════════════════════════════════

✅ Target SHA: abc1234567890abcdef1234567890abcdef1234
✅ Deployment URL: https://fe-engine-prime.vercel.app
✅ Health check: Passed
```

---

## Manual Rollback (GitHub Actions)

### Trigger via GitHub UI

1. **Go to Actions Tab**

   - Navigate to: `https://github.com/<org>/<repo>/actions`

2. **Select Rollback Workflow**

   - Click on "Automated Rollback" workflow

3. **Run Workflow**

   - Click "Run workflow" button
   - Fill in the form:
     - **Reason:** "Health check failing" (required)
     - **Target SHA:** Leave empty for automatic, or specify SHA
     - **Environment:** Choose "production" (default)
   - Click "Run workflow"

4. **Monitor Progress**

   - Workflow runs automatically
   - View real-time logs
   - Check for success/failure

5. **Verify Rollback**
   - Check deployment URL in workflow summary
   - Verify health endpoint
   - Monitor error rates

### Workflow Summary

After completion, you'll see:

```
# Rollback Summary

## Details
| Field | Value |
|-------|-------|
| **Status** | success |
| **Reason** | Health check failing |
| **Environment** | production |
| **Target SHA** | `abc1234567890abcdef1234567890abcdef1234` |
| **Commit** | feat: Add feature X |
| **Deployment URL** | https://fe-engine-prime.vercel.app |
| **Health Check** | passed |
| **Triggered By** | @username |
```

---

## Automatic Rollback

### How It Works

Automatic rollback is triggered during the deployment pipeline:

```
Deploy → Post-Deploy Health Check → [FAIL] → Automatic Rollback
```

**Trigger Conditions:**

1. **Post-Deployment Health Check**

   - Wait 60s for service to stabilize
   - Run health check 3 times (30s interval)
   - If all 3 attempts fail → Trigger rollback

2. **Health Check Criteria**
   - HTTP 200 from `/api/health`
   - Valid JSON response
   - `status: "healthy"` field

### Deployment Flow with Rollback

```yaml
# .github/workflows/deploy.yml (example)

deploy:
  - Deploy to Vercel
  - Wait 60s
  - Health check (3 attempts)
  - If failed → Call rollback workflow
  - If passed → Tag deploy-success
```

### Notifications

When automatic rollback is triggered:

1. **Slack Notification**

   ```
   🔄 Automatic Rollback Triggered

   Environment: production
   Reason: Health check failed (3/3 attempts)
   Failed SHA: xyz9876
   Rolled back to: abc1234
   Status: Success
   ```

2. **Email Alert**

   - Sent to engineering team
   - Includes rollback details
   - Attached logs

3. **GitHub Issue** (Optional)
   - Auto-created for failed deployments
   - Tracks resolution

---

## Rollback Verification

### Automated Verification

The rollback script/workflow automatically verifies:

1. **Health Check**

   - `/api/health` returns 200
   - 3 attempts with 30s intervals
   - Validates JSON response

2. **Response Time**

   - Checks response < 2s
   - Warns if > 5s

3. **Service Availability**
   - Confirms service is reachable
   - Validates deployment URL

### Manual Verification Checklist

After rollback, manually verify:

- [ ] Health endpoint responds: `curl https://your-app.vercel.app/api/health`
- [ ] Homepage loads correctly
- [ ] Authentication works
- [ ] Key user flows functional
- [ ] No errors in browser console
- [ ] API endpoints responding
- [ ] Database connectivity (if applicable)

### Smoke Tests

Run automated smoke tests:

```bash
# Run quick smoke tests
pnpm run test:smoke

# Run E2E tests
pnpm run test:e2e
```

---

## Troubleshooting

### Common Issues

#### 1. Health Check Still Failing After Rollback

**Symptoms:**

- Rollback completes but health check fails
- Service unreachable

**Causes:**

- Infrastructure issue (Vercel outage)
- Database connectivity problem
- External API dependency down

**Resolution:**

1. Check Vercel status: https://www.vercel-status.com/
2. Verify database is running
3. Check external API dependencies
4. Rollback to older version: `./scripts/rollback.sh <older-sha>`

#### 2. Rollback Script Fails to Find Previous Version

**Symptoms:**

- "No deployment tags found"
- Falls back to previous commit

**Causes:**

- Deployment tags not created
- Fresh repository clone

**Resolution:**

```bash
# List all commits
git log --oneline -20

# Manually specify SHA
./scripts/rollback.sh <specific-sha>
```

#### 3. Vercel Deployment Fails

**Symptoms:**

- "Failed to get deployment URL"
- Vercel CLI errors

**Causes:**

- Invalid Vercel credentials
- Project not found
- Rate limiting

**Resolution:**

```bash
# Re-authenticate
vercel login

# Verify project
vercel list

# Check environment variables
echo $VERCEL_TOKEN
```

#### 4. Build Fails During Rollback

**Symptoms:**

- `pnpm run build` fails
- Dependencies not installing

**Causes:**

- Breaking changes in dependencies
- Node version mismatch
- Missing environment variables

**Resolution:**

```bash
# Clean install
rm -rf node_modules .next
pnpm install --frozen-lockfile

# Verify Node version
node --version  # Should match package.json engines

# Check environment
cat .env.local
```

---

## Recovery Procedures

### If Rollback Fails

1. **Emergency Procedure**

   ```bash
   # Option 1: Rollback to last known good version
   ./scripts/rollback.sh <last-known-good-sha>

   # Option 2: Rollback 2 versions back
   git log --oneline -5  # Find SHA from 2 commits ago
   ./scripts/rollback.sh <sha>
   ```

2. **Manual Vercel Rollback**

   - Go to Vercel Dashboard
   - Find project
   - Click "Deployments"
   - Find previous successful deployment
   - Click "..." → "Promote to Production"

3. **Emergency Hotfix**

   ```bash
   # Create hotfix branch from last good version
   git checkout -b hotfix/emergency <last-good-sha>

   # Make minimal fixes
   git commit -m "hotfix: Emergency fix"

   # Deploy
   vercel deploy --prod
   ```

### If Multiple Rollbacks Fail

**This indicates a systemic issue, not a code problem.**

1. **Check Infrastructure**

   - Vercel status
   - DNS configuration
   - CDN issues

2. **Check Dependencies**

   - External APIs
   - Database connectivity
   - Third-party services

3. **Enable Maintenance Mode** (if available)

   ```bash
   # Redirect to maintenance page
   vercel alias set <maintenance-deployment> production
   ```

4. **Contact Support**
   - Vercel support ticket
   - Internal incident channel
   - Escalate to senior engineer

---

## Best Practices

### Deployment Tagging

Always tag successful deployments:

```bash
# After successful deployment
git tag deploy-success-$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)
git push origin --tags
```

### Testing Before Merge

Test deployments before merging to main:

```bash
# Deploy to preview
vercel deploy

# Test preview deployment
curl https://preview-xyz.vercel.app/api/health

# Only merge if preview works
```

### Monitoring

Set up monitoring to catch issues early:

- Health check dashboard (QC Engine)
- Error tracking (Sentry, LogRocket)
- Performance monitoring (Vercel Analytics)
- Uptime monitoring (Pingdom, UptimeRobot)

### Documentation

Document rollback reasons:

```bash
# Good rollback reason
"Health check failing - 500 errors on /api/auth endpoint"

# Bad rollback reason
"Something broke"
```

---

## FAQ

**Q: How long does a rollback take?** A: Typically 3-5 minutes (build + deploy +
validation).

**Q: Will users experience downtime?** A: No, Vercel does zero-downtime
deployments. Old version serves traffic until new version is ready.

**Q: Can I rollback to any previous version?** A: Yes, any commit in git
history.

**Q: What happens to database changes?** A: Currently no automatic database
rollback. See FE-581 for planned database migration rollback.

**Q: Can I test rollback in staging first?** A: Yes, use `environment: staging`
parameter in GitHub workflow.

**Q: What if rollback script is broken in the latest version?** A: Use GitHub
Actions rollback (doesn't depend on code in repo).

---

## Support

- **Slack:** #engineering-alerts
- **JIRA:** [FE-538](https://aifaads.atlassian.net/browse/FE-538)
- **GitHub:** [Issues](https://github.com/<org>/<repo>/issues)

---

**Last Updated:** 2025-11-04

**Version:** 1.0.0
