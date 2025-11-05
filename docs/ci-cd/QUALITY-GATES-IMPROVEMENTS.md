# Quality Gates Improvements

**Date:** 2025-11-05

**Issue:** Pipeline Trustworthiness

**Status:** Implemented

---

## Problem Statement

The CI/CD pipeline had trust issues that made it unsuitable for production
deployment:

1. **Coverage was non-blocking** - Could merge code with low test coverage
2. **Security was non-blocking** - Could merge code with HIGH/CRITICAL
   vulnerabilities
3. **Build validation unclear** - Build checks existed but weren't explicitly
   blocking

**Impact:**

- Bad code could reach production
- Pipeline not trustworthy for automated deployment
- No confidence in quality gates

---

## Solution: Make Critical Gates Blocking

Implemented three critical improvements to make the pipeline trustworthy:

### 1. Blocking Coverage Checks ✅

**Before:**

```yaml
- name: Run unit tests
  run: pnpm run test:run
  continue-on-error: true # ❌ Non-blocking

- name: Generate coverage report
  continue-on-error: true # ❌ Non-blocking
  run: pnpm run test:coverage
```

**After:**

```yaml
- name: Run unit tests
  run: pnpm run test:run # ✅ BLOCKING

- name: Generate coverage report
  run: pnpm run test:coverage # ✅ BLOCKING
```

**Thresholds (enforced by vitest.config.mts):**

- Branches: 85%
- Functions: 90%
- Lines: 90%
- Statements: 90%

---

### 2. Blocking Security Checks ✅

**Before:**

```yaml
- name: Run dependency vulnerability scan
  run: pnpm audit --audit-level=moderate
  continue-on-error: true # ❌ Non-blocking

- name: Run OWASP dependency check
  continue-on-error: true # ❌ Non-blocking
  uses: dependency-check/Dependency-Check_Action@main
```

**After:**

```yaml
- name: Run dependency vulnerability scan (BLOCKING for HIGH/CRITICAL)
  run: |
    pnpm audit --audit-level=high || {
      echo "::error::HIGH or CRITICAL vulnerabilities found!"
      exit 1
    }  # ✅ BLOCKING for HIGH/CRITICAL

- name: Run OWASP dependency check
  id: owasp-check
  continue-on-error: true
  uses: dependency-check/Dependency-Check_Action@main
  with:
    failOnCVSS: 7 # CVSS 7.0+ is HIGH/CRITICAL

- name: OWASP gate check (BLOCKING for CVSS >= 7.0)
  if: steps.owasp-check.outcome == 'failure'
  run: exit 1 # ✅ BLOCKING for CVSS >= 7.0
```

**Blocked Vulnerabilities:**

- HIGH severity (CVSS 7.0-8.9)
- CRITICAL severity (CVSS 9.0-10.0)

---

### 3. Explicit Build Validation ✅

**Before:**

- Build validation existed but not clearly documented
- Unclear which Node versions were tested

**After:**

```yaml
# Build Validation (BLOCKING)
# Ensures application builds successfully on supported Node versions
build-validation:
  name: Build Validation
  runs-on: ubuntu-latest

  strategy:
    matrix:
      node-version: [20, 22] # Test both supported versions

  steps:
    - name: Build application (BLOCKING)
      run: |
        pnpm run build
        echo "✅ Build successful for Node ${{ matrix.node-version }}"
```

**Validates:**

- Build succeeds on Node 20
- Build succeeds on Node 22
- Build artifacts created (`.next` directory)
- Application starts successfully

---

## Updated Quality Gates Summary

### BLOCKING Gates (Must Pass)

| Gate           | Check            | Threshold                                    | Action on Failure |
| -------------- | ---------------- | -------------------------------------------- | ----------------- |
| **Build**      | Production build | Success on Node 20 & 22                      | ❌ Block merge    |
| **Unit Tests** | All tests pass   | 100% passing                                 | ❌ Block merge    |
| **Coverage**   | Test coverage    | 85% branches, 90% functions/lines/statements | ❌ Block merge    |
| **Security**   | Vulnerabilities  | No HIGH/CRITICAL (CVSS < 7.0)                | ❌ Block merge    |

### Optional Gates (Informational)

| Gate            | Check            | When Runs                         | Action on Failure |
| --------------- | ---------------- | --------------------------------- | ----------------- |
| **E2E Tests**   | Playwright tests | Epic commits, main branch, manual | ⚠️ Warn only      |
| **Performance** | Perf benchmarks  | Every commit                      | ⚠️ Warn only      |
| **QC Engine**   | Robot tests      | After E2E                         | ⚠️ Warn only      |

---

## Testing Strategy

### What Tests Run When?

**Regular Feature Commit:**

```
✅ TypeScript check (blocking)
✅ Lint (blocking with warnings limit)
✅ Format check (blocking)
✅ Unit tests (BLOCKING) ⭐ NEW
✅ Coverage check (BLOCKING) ⭐ NEW
✅ Build validation (BLOCKING)
✅ Security scan (BLOCKING for HIGH/CRITICAL) ⭐ NEW
❌ E2E tests (skipped - cost optimization)
```

**Epic Commit ([epic] tag):**

```
✅ All above (all blocking)
✅ E2E tests (runs but non-blocking)
✅ QC Engine tests (runs but non-blocking)
```

**Main Branch Push (Production):**

```
✅ All above (all blocking)
✅ E2E tests (runs but non-blocking)
✅ QC Engine tests (runs but non-blocking)
```

---

## Impact

### Before (Untrustworthy)

❌ Could merge code with:

- Low test coverage (< 85%/90%)
- Critical security vulnerabilities
- Build failures
- Failing tests

❌ **Not safe for automated deployment**

### After (Trustworthy)

✅ Cannot merge code with:

- Low test coverage
- HIGH/CRITICAL security vulnerabilities
- Build failures
- Failing tests

✅ **Safe for automated deployment**

---

## Migration Notes

### For Developers

**If your PR fails now but passed before:**

1. **Coverage failure:**

   ```bash
   pnpm test:coverage
   # Add tests to meet thresholds
   ```

2. **Security failure:**

   ```bash
   pnpm audit
   # Fix HIGH/CRITICAL vulnerabilities
   pnpm audit fix
   ```

3. **Build failure:**

   ```bash
   pnpm build
   # Fix build errors
   ```

4. **Unit test failure:**
   ```bash
   pnpm test
   # Fix failing tests
   ```

### Breaking Changes

⚠️ **This change makes previously-passing PRs potentially fail**

**If you have:**

- Low test coverage → Must add tests
- Security vulnerabilities → Must fix or upgrade dependencies
- Failing tests → Must fix tests
- Build errors → Must fix build

**Timeline:**

- Implemented: 2025-11-05
- Effective: Immediately on merge
- Grace period: None (quality gates are critical)

---

## Verification

### How to Test Locally

**1. Check coverage:**

```bash
pnpm test:coverage
# Should meet thresholds
```

**2. Check security:**

```bash
pnpm audit --audit-level=high
# Should have no HIGH/CRITICAL vulnerabilities
```

**3. Check build:**

```bash
pnpm build
# Should succeed
```

**4. Check tests:**

```bash
pnpm test:run
# All tests should pass
```

---

## Future Improvements

### Phase 2: Smart Feature Testing

Implement feature-specific E2E tests:

```yaml
# If auth files changed → run auth E2E
# If avatar files changed → run avatar E2E
# If epic commit → run all E2E
```

**Benefits:**

- Stories test their own features
- Catch bugs before epic merge
- Balanced cost vs coverage

**Status:** Planned (not yet implemented)

---

## Related

- **Epic:** FE-474 (Complete CI/CD Pipeline)
- **Previous Story:** FE-475 (Staging Environment Config)
- **Next Story:** FE-500 (Staging Deployment Workflow)
- **Vitest Config:** `vitest.config.mts`
- **Quality Gates:** `.github/workflows/quality-gates.yml`

---

## Metrics

**Changes:**

- 3 non-blocking checks → blocking
- 0 explicit blocking gates → 4 blocking gates
- Untrustworthy pipeline → Trustworthy pipeline

**Files Modified:**

- `.github/workflows/quality-gates.yml` (69 lines changed)

**Testing:**

- ✅ YAML syntax validated
- ⏳ First real PR will validate blocking behavior

---

**Document Version:** 1.0

**Last Updated:** 2025-11-05

**Author:** Claude Code (AI Assistant)
