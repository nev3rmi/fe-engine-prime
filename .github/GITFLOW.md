# Gitflow Workflow Guide

## Branch Strategy

```
main (production)     →  https://fe-engine-prime.vercel.app
  ↑
  release/v1.x       →  https://fe-engine-prime-git-release-v1-x.vercel.app (staging)
  ↑
develop (development) →  https://fe-engine-prime-git-develop.vercel.app
  ↑
feature/xyz          →  https://fe-engine-prime-git-feature-xyz.vercel.app (preview)

hotfix/urgent-fix    →  https://fe-engine-prime-git-hotfix-urgent-fix.vercel.app (emergency)
```

---

## Branch Types

### Permanent Branches

#### `main` - Production

- **Environment:** Production
- **Vercel:** Production deployment
- **URL:** https://fe-engine-prime.vercel.app
- **Protected:** Yes
- **Deploys:** Automatically on merge
- **Use:** Live production code only

#### `develop` - Development

- **Environment:** Development
- **Vercel:** Preview deployment
- **URL:** https://fe-engine-prime-git-develop.vercel.app
- **Protected:** Yes (recommended)
- **Deploys:** Automatically on push
- **Use:** Integration branch for features

### Temporary Branches

#### `feature/*` - New Features

- **Created from:** `develop`
- **Merged to:** `develop`
- **Naming:** `feature/user-authentication`, `feature/dashboard-ui`
- **Vercel:** Automatic preview URL per feature
- **Lifespan:** Delete after merge

#### `release/*` - Release Preparation

- **Created from:** `develop`
- **Merged to:** `main` AND back to `develop`
- **Naming:** `release/v1.2.0`, `release/v2.0.0`
- **Vercel:** Staging environment
- **Use:** Final QA, version bumps, release notes
- **Lifespan:** Delete after release

#### `hotfix/*` - Emergency Production Fixes

- **Created from:** `main`
- **Merged to:** `main` AND `develop`
- **Naming:** `hotfix/critical-auth-bug`, `hotfix/security-patch`
- **Vercel:** Hotfix preview
- **Use:** Critical production bugs only
- **Lifespan:** Delete after merge

---

## Workflows

### 1. Feature Development (Normal Flow)

```bash
# 1. Start feature from develop
git checkout develop
git pull origin develop
git checkout -b feature/my-awesome-feature

# 2. Develop feature
# ... make changes ...
git add .
git commit -m "feat: Add awesome feature"
git push -u origin feature/my-awesome-feature

# 3. Create PR to develop
gh pr create --base develop --title "feat: My Awesome Feature" --fill

# 4. Preview URL created automatically
# https://fe-engine-prime-git-feature-my-awesome-feature.vercel.app

# 5. After review + CI passes, merge to develop
gh pr merge --squash

# 6. Delete feature branch
git branch -d feature/my-awesome-feature
git push origin --delete feature/my-awesome-feature

# 7. Test on development environment
# https://fe-engine-prime-git-develop.vercel.app
```

### 2. Release to Production

```bash
# 1. Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0

# 2. Prepare release
# - Update version in package.json
# - Update CHANGELOG.md
# - Final bug fixes (no new features!)
npm version 1.2.0
git add package.json CHANGELOG.md
git commit -m "chore: Bump version to 1.2.0"
git push -u origin release/v1.2.0

# 3. Create PR to main
gh pr create --base main --title "Release v1.2.0" --body "$(cat CHANGELOG.md)"

# 4. QA testing on staging
# https://fe-engine-prime-git-release-v1-2-0.vercel.app

# 5. After approval, merge to main (Production!)
gh pr merge --squash

# 6. Tag the release
git checkout main
git pull origin main
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0

# 7. Merge release back to develop
git checkout develop
git merge release/v1.2.0
git push origin develop

# 8. Delete release branch
git branch -d release/v1.2.0
git push origin --delete release/v1.2.0
```

### 3. Hotfix (Emergency Production Fix)

```bash
# 1. Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-patch

# 2. Fix the issue
# ... make critical fix ...
git add .
git commit -m "fix: Critical security patch for CVE-2025-XXXXX"
git push -u origin hotfix/critical-security-patch

# 3. Create PR to main
gh pr create --base main --title "HOTFIX: Critical Security Patch" --label "hotfix,critical"

# 4. Fast-track review and merge
gh pr merge --squash

# 5. Tag the hotfix
git checkout main
git pull origin main
git tag -a v1.2.1 -m "Hotfix v1.2.1 - Security patch"
git push origin v1.2.1

# 6. Merge hotfix back to develop
git checkout develop
git merge hotfix/critical-security-patch
git push origin develop

# 7. Delete hotfix branch
git branch -d hotfix/critical-security-patch
git push origin --delete hotfix/critical-security-patch
```

---

## Vercel Configuration

### Automatic Deployments

Vercel automatically deploys:

| Branch Pattern | Environment     | URL Pattern                                |
| -------------- | --------------- | ------------------------------------------ |
| `main`         | Production      | `fe-engine-prime.vercel.app`               |
| `develop`      | Development     | `fe-engine-prime-git-develop.vercel.app`   |
| `release/*`    | Staging         | `fe-engine-prime-git-release-*.vercel.app` |
| `hotfix/*`     | Hotfix Preview  | `fe-engine-prime-git-hotfix-*.vercel.app`  |
| `feature/*`    | Feature Preview | `fe-engine-prime-git-feature-*.vercel.app` |
| PR branches    | PR Preview      | `fe-engine-prime-git-*.vercel.app`         |

### Environment Variables

**Configure in Vercel Dashboard → Settings → Environment Variables:**

#### Production (main branch only)

```bash
NODE_ENV=production
NEXTAUTH_URL=https://fe-engine-prime.vercel.app
NEXTAUTH_SECRET=<production-secret>
DATABASE_URL=<production-db>
GOOGLE_CLIENT_ID=<prod-google-id>
GOOGLE_CLIENT_SECRET=<prod-google-secret>
GITHUB_CLIENT_ID=<prod-github-id>
GITHUB_CLIENT_SECRET=<prod-github-secret>
```

#### Preview (develop, release/_, hotfix/_, feature/\*, PRs)

```bash
NODE_ENV=development
NEXTAUTH_URL=https://fe-engine-prime-git-develop.vercel.app
NEXTAUTH_SECRET=<dev-secret>
DATABASE_URL=<dev-staging-db>
GOOGLE_CLIENT_ID=<dev-google-id>
GOOGLE_CLIENT_SECRET=<dev-google-secret>
GITHUB_CLIENT_ID=<dev-github-id>
GITHUB_CLIENT_SECRET=<dev-github-secret>
```

**Note:** Vercel automatically sets `VERCEL_URL` for each deployment

---

## GitHub Branch Protection

### Protect `main` (Production)

```yaml
Settings → Branches → Add rule for 'main':
  ✅ Require pull request reviews (1 approval)
  ✅ Require status checks: Build Validation (20), Build Validation (22)
  ✅ Require branches to be up to date
  ✅ Do not allow bypassing
  ✅ Restrict who can push (admins only)
  ✅ Require linear history (squash/rebase)
```

### Protect `develop` (Development)

```yaml
Settings → Branches → Add rule for 'develop':
  ✅ Require status checks: Build Validation
  ✅ Require branches to be up to date
  ⬜ Allow force pushes (for admins)
  ✅ Require linear history
```

---

## Quality Gates by Branch

| Branch      | Type Check | Build    | Lint    | Unit Tests | E2E     | Security |
| ----------- | ---------- | -------- | ------- | ---------- | ------- | -------- |
| `main`      | ✅ Block   | ✅ Block | ⚠️ Warn | ⚠️ Warn    | ⚠️ Warn | ⚠️ Warn  |
| `develop`   | ✅ Block   | ✅ Block | ⚠️ Warn | ⚠️ Warn    | ⚠️ Warn | ⚠️ Warn  |
| `release/*` | ✅ Block   | ✅ Block | ⚠️ Warn | ⚠️ Warn    | ⚠️ Warn | ⚠️ Warn  |
| `hotfix/*`  | ✅ Block   | ✅ Block | ⚠️ Warn | ⚠️ Warn    | ⚠️ Warn | ⚠️ Warn  |
| `feature/*` | ✅ Block   | ✅ Block | ⚠️ Warn | ⚠️ Warn    | ⚠️ Warn | ⚠️ Warn  |

**Key:** ✅ = Must pass to merge | ⚠️ = Informational only

---

## Quick Reference

### Daily Development

```bash
# Start new feature
git checkout develop && git pull && git checkout -b feature/my-feature

# Work, commit, push
git push -u origin feature/my-feature

# Create PR
gh pr create --base develop
```

### Release Process

```bash
# Create release
git checkout develop && git pull && git checkout -b release/v1.2.0

# Bump version
npm version 1.2.0

# PR to main
gh pr create --base main --title "Release v1.2.0"

# After merge: tag and backmerge
git checkout main && git pull && git tag v1.2.0 && git push origin v1.2.0
git checkout develop && git merge main && git push
```

### Emergency Hotfix

```bash
# Create hotfix from production
git checkout main && git pull && git checkout -b hotfix/critical-fix

# Fix and push
git push -u origin hotfix/critical-fix

# PR to main
gh pr create --base main --title "HOTFIX: Critical Fix" --label hotfix

# After merge: tag and backmerge
git checkout main && git pull && git tag v1.2.1 && git push origin v1.2.1
git checkout develop && git merge main && git push
```

---

## Environment URLs

### Production

- **URL:** https://fe-engine-prime.vercel.app
- **Branch:** `main`
- **Use:** Live users, production data
- **OAuth:** Production credentials

### Development

- **URL:** https://fe-engine-prime-git-develop.vercel.app
- **Branch:** `develop`
- **Use:** Team testing, integration testing
- **OAuth:** Development credentials

### Staging (Release branches)

- **URL:** https://fe-engine-prime-git-release-v\*.vercel.app
- **Branch:** `release/v*`
- **Use:** Final QA before production
- **OAuth:** Development or production test credentials

### Preview (Feature/PR branches)

- **URL:** https://fe-engine-prime-git-\*.vercel.app
- **Branch:** `feature/*`, PR branches
- **Use:** Individual feature testing
- **OAuth:** Development credentials

---

## CI/CD Pipeline

### What Runs on Each Push

**All Branches:**

- ✅ Type Check
- ✅ Build Validation
- ⚠️ Lint (non-blocking)
- ⚠️ Unit Tests (non-blocking)
- ⚠️ E2E Tests (non-blocking)
- ⚠️ Security Tests (non-blocking)
- ⚠️ Performance Tests (non-blocking)

**Deploy Job Runs On:**

- `main` → Production deploy
- `develop` → Development deploy
- `release/*` → Staging deploy
- `hotfix/*` → Hotfix preview deploy

---

## Best Practices

### DO ✅

- Always create features from `develop`
- Squash merge to keep history clean
- Delete branches after merge
- Tag all production releases
- Test on develop before releasing
- Use semantic versioning (v1.2.3)

### DON'T ❌

- Don't commit directly to `main` or `develop`
- Don't create features from `main`
- Don't skip release branches for major versions
- Don't forget to backmerge hotfixes to `develop`
- Don't merge unreviewed code to `main`

---

## Troubleshooting

### Preview URL Not Working

```bash
# Check Vercel deployment status
vercel list

# Or check GitHub Actions deploy job
gh run view <run-id>
```

### Environment Variables Not Applied

- Vercel dashboard → Settings → Environment Variables
- Ensure correct environment selected (Production/Preview)
- Redeploy after changing variables

### Merge Conflicts (develop → main)

```bash
# On release branch
git fetch origin
git merge origin/main
# Resolve conflicts
git commit
git push
```

---

## Migration Checklist

- [x] Create `develop` branch
- [x] Update GitHub Actions workflow
- [ ] Configure Vercel production branch (set to `main`)
- [ ] Set production environment variables in Vercel
- [ ] Set preview environment variables in Vercel
- [ ] Set up branch protection for `main`
- [ ] Set up branch protection for `develop`
- [ ] Test workflow: Create feature → PR to develop → Merge
- [ ] Test release: Create release → PR to main → Merge
- [ ] Document for team

---

## Quick Commands

```bash
# Setup gitflow (one-time)
git checkout main && git pull
git checkout -b develop && git push -u origin develop

# New feature
git checkout develop && git pull
git checkout -b feature/my-feature

# New release
git checkout develop && git pull
git checkout -b release/v1.2.0

# Hotfix
git checkout main && git pull
git checkout -b hotfix/urgent-fix

# Check which branch you're on
git branch --show-current

# List all branches
git branch -a
```

---

**Gitflow is now configured! Start using `develop` branch for all new
development.**
