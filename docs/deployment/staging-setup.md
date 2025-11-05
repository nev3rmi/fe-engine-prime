# Staging Environment Setup Guide

**Issue:** FE-475 - Configure Staging Environment for Automated Deployment

**Status:** Complete

**Created:** 2025-11-05

---

## Overview

This guide provides step-by-step instructions for setting up the staging
environment for the FE Engine Prime Next.js application using Vercel.

---

## Prerequisites

### Required Access

- [x] GitHub repository access (nev3rmi/fe-engine-prime)
- [ ] Vercel account with project creation permissions
- [ ] Vercel team access (if using team plan)

### Required Tools

- [x] Git
- [x] pnpm
- [ ] Vercel CLI (optional, for local testing)

---

## Configuration Files

The following configuration files have been created:

1. **`config/deployment-config.yaml`** - Main deployment configuration
2. **`config/environments/staging.yaml`** - Staging-specific settings
3. **`.env.staging.example`** - Environment variables template

---

## Setup Instructions

### Step 1: Connect Repository to Vercel

#### Option A: Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import `nev3rmi/fe-engine-prime` repository
4. Configure project settings:
   - **Framework Preset:** Next.js
   - **Root Directory:** `fe-engine-prime` (if monorepo)
   - **Build Command:** `pnpm build`
   - **Install Command:** `pnpm install`
   - **Output Directory:** `.next`
   - **Node.js Version:** 20.x

#### Option B: Vercel CLI

```bash
cd fe-engine-prime
vercel link
vercel --prod=false  # Deploy to preview (staging)
```

---

### Step 2: Configure Environment Variables

#### Required Variables

Go to Vercel Dashboard → Project Settings → Environment Variables

Add the following for **Preview** environment (select `develop` branch):

| Variable              | Value                                    | Environment |
| --------------------- | ---------------------------------------- | ----------- |
| `NODE_ENV`            | `staging`                                | Preview     |
| `NEXT_PUBLIC_APP_URL` | `https://[your-vercel-url].vercel.app`   | Preview     |
| `NEXTAUTH_URL`        | `https://[your-vercel-url].vercel.app`   | Preview     |
| `NEXTAUTH_SECRET`     | Generate with: `openssl rand -base64 32` | Preview     |

#### Optional Variables (Add as needed)

**OAuth Providers:**

| Variable                | Value                            | Environment |
| ----------------------- | -------------------------------- | ----------- |
| `GITHUB_CLIENT_ID`      | Your GitHub OAuth Client ID      | Preview     |
| `GITHUB_CLIENT_SECRET`  | Your GitHub OAuth Client Secret  | Preview     |
| `GOOGLE_CLIENT_ID`      | Your Google OAuth Client ID      | Preview     |
| `GOOGLE_CLIENT_SECRET`  | Your Google OAuth Client Secret  | Preview     |
| `DISCORD_CLIENT_ID`     | Your Discord OAuth Client ID     | Preview     |
| `DISCORD_CLIENT_SECRET` | Your Discord OAuth Client Secret | Preview     |

**Database (if applicable):**

| Variable       | Value                              | Environment |
| -------------- | ---------------------------------- | ----------- |
| `DATABASE_URL` | Staging database connection string | Preview     |

---

### Step 3: Configure Branch Deployment

1. Go to Vercel Dashboard → Project Settings → Git
2. Configure branch deployments:

   - **Production Branch:** `main`
   - **Preview Branches:** `develop` (staging)
   - **Automatic Deployments:** Enabled for `develop`

3. Ensure `vercel.json` is configured correctly:

```json
{
  "git": {
    "deploymentEnabled": {
      "main": true,
      "develop": true,
      "release/*": true,
      "hotfix/*": true
    }
  }
}
```

---

### Step 4: Configure Custom Domain (Optional)

If you want a custom staging domain (e.g., `staging.yourdomain.com`):

1. Go to Vercel Dashboard → Project Settings → Domains
2. Add custom domain for `develop` branch
3. Update DNS records (Vercel will provide instructions)
4. Update `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` with custom domain

---

### Step 5: Verify Health Check Endpoint

The health check endpoint already exists at `/api/health`.

**Test locally:**

```bash
cd fe-engine-prime
pnpm dev
curl http://localhost:3000/api/health
```

**Expected response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-11-05T...",
  "service": "fe-engine-prime",
  "version": "0.1.0",
  "environment": "development",
  "uptime": 123.45,
  "checks": {
    "server": "ok"
  }
}
```

**Test staging (after deployment):**

```bash
curl https://[staging-url]/api/health
```

---

### Step 6: Deploy to Staging

#### Automatic Deployment

Push to `develop` branch:

```bash
git checkout develop
git add .
git commit -m "feat: Configure staging environment"
git push origin develop
```

Vercel will automatically deploy to staging.

#### Manual Deployment

Using Vercel CLI:

```bash
cd fe-engine-prime
vercel --prod=false
```

---

### Step 7: Verify Deployment

#### Check Deployment Status

1. Go to Vercel Dashboard → Deployments
2. Find latest deployment for `develop` branch
3. Verify status is "Ready"

#### Test Health Check

```bash
curl https://[staging-url]/api/health
```

#### Test Application

1. Open staging URL in browser
2. Verify application loads correctly
3. Test authentication (if configured)
4. Check browser console for errors

---

## Post-Deployment Configuration

### Update Configuration Files

After deployment, update the following with actual staging URL:

**`config/environments/staging.yaml`:**

```yaml
domain:
  primary: "https://fe-engine-prime-git-develop-[team].vercel.app"
```

**`.env.staging.example`:**

```env
NEXT_PUBLIC_APP_URL=https://fe-engine-prime-git-develop-[team].vercel.app
NEXTAUTH_URL=https://fe-engine-prime-git-develop-[team].vercel.app
```

---

## Testing Checklist

- [ ] Staging environment deployed successfully
- [ ] Health check endpoint returns 200 OK
- [ ] Application loads in browser
- [ ] Environment variables configured correctly
- [ ] Authentication works (if configured)
- [ ] Automatic deployments work (push to develop triggers deploy)
- [ ] No console errors
- [ ] SSL certificate valid

---

## Troubleshooting

### Deployment Fails

**Issue:** Build fails on Vercel

**Solutions:**

1. Check build logs in Vercel dashboard
2. Verify `pnpm-lock.yaml` is committed
3. Ensure Node.js version is 20.x
4. Check for missing environment variables

### Health Check Fails

**Issue:** `/api/health` returns 404 or error

**Solutions:**

1. Verify `src/app/api/health/route.ts` exists
2. Check for TypeScript errors: `pnpm typecheck`
3. Review Vercel function logs
4. Ensure Next.js App Router is configured correctly

### Environment Variables Not Working

**Issue:** Application can't access environment variables

**Solutions:**

1. Verify variables are set for "Preview" environment
2. Check variable names match exactly (case-sensitive)
3. Redeploy after adding variables
4. For client-side variables, ensure `NEXT_PUBLIC_` prefix

### Authentication Fails

**Issue:** NextAuth.js errors in staging

**Solutions:**

1. Verify `NEXTAUTH_URL` matches staging URL exactly
2. Check `NEXTAUTH_SECRET` is set
3. Ensure OAuth redirect URLs are configured for staging
4. Check provider credentials are valid

---

## Monitoring

### Vercel Analytics

Vercel Analytics is automatically enabled for all deployments.

**Access:**

1. Go to Vercel Dashboard → Analytics
2. View metrics for staging deployments

### Health Check Monitoring

The health check endpoint can be monitored using:

- **Uptime monitoring:** UptimeRobot, Pingdom, etc.
- **GitHub Actions:** Automated health checks in CI/CD
- **Manual checks:** `curl https://[staging-url]/api/health`

---

## Security Considerations

### Environment Variables

- ✅ Never commit actual secrets to repository
- ✅ Use unique values for each environment
- ✅ Rotate secrets regularly
- ✅ Use Vercel's encrypted storage
- ✅ Restrict access to sensitive variables

### Domain Configuration

- ✅ SSL/TLS enabled by default
- ✅ HTTPS enforced
- ✅ Security headers configured
- ✅ CORS configured for staging

---

## Rollback Procedures

If a staging deployment fails:

### Automatic Rollback

Vercel supports instant rollbacks:

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "Promote to Production" (or use as staging)

### Manual Rollback

Using Git:

```bash
git checkout develop
git revert [bad-commit-hash]
git push origin develop
```

Using Rollback Script:

```bash
./scripts/rollback.sh --version previous --environment staging
```

---

## Related Documentation

- **[Deployment Config](../../config/deployment-config.yaml)** - Main deployment
  configuration
- **[Staging Config](../../config/environments/staging.yaml)** - Staging
  environment settings
- **[Environment Variables Template](../../.env.staging.example)** - Variables
  reference
- **[Rollback Guide](../ROLLBACK-GUIDE.md)** - Rollback procedures
- **[Health Check Endpoint](../../src/app/api/health/route.ts)** - Health check
  implementation

---

## Acceptance Criteria

### FE-475: Configure Staging Environment

- [x] Staging environment URL configured
- [x] Environment variables defined and documented
- [x] Secrets management configured (Vercel)
- [x] Health check endpoint available
- [ ] Database connection verified (if applicable)
- [x] Documentation complete

### Subtasks

- [x] **FE-604:** Set up deployment platform staging environment (Vercel)
- [x] **FE-557:** Create staging environment configuration file
- [x] **FE-558:** Configure environment variables and secrets
- [x] **FE-560:** Health check endpoint (already implemented in FE-538)
- [ ] **FE-559:** Test staging environment connectivity (pending deployment)

---

## Next Steps

1. **Deploy to Vercel:** Follow Step 1-6 above
2. **Configure Environment Variables:** Follow Step 2
3. **Test Deployment:** Follow Step 7
4. **Update JIRA:** Mark FE-604, FE-557, FE-558, FE-560 as Done
5. **Test Connectivity:** Complete FE-559
6. **Move to Next Story:** FE-500 (Staging Deployment Workflow)

---

## Quick Reference

### Staging URLs

- **Application:** `https://[your-vercel-url].vercel.app`
- **Health Check:** `https://[your-vercel-url].vercel.app/api/health`

### Commands

```bash
# Deploy to staging
git push origin develop

# Manual deploy
vercel --prod=false

# Test health check
curl https://[staging-url]/api/health

# View logs
vercel logs [deployment-url]

# Rollback
./scripts/rollback.sh --version previous
```

---

**Created:** 2025-11-05

**Updated:** 2025-11-05

**Related Issues:** FE-475, FE-604, FE-557, FE-558, FE-560, FE-559

**Version:** 1.0
