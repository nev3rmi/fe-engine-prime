# Phase 2: Smart E2E Testing Plan

**Status:** Planned (Not Yet Implemented)

**Goal:** Run feature-specific E2E tests based on changed files, balancing cost
vs coverage

**Created:** 2025-11-05

---

## Problem Statement

### Current E2E Strategy (Phase 1)

**E2E tests run when:**

- Commit has `[epic]` tag
- Push to `main` branch
- Manual workflow dispatch

**Issues:**

1. **Stories never test their features** - Regular feature commits skip E2E
   entirely
2. **All-or-nothing approach** - Either run all E2E tests or none
3. **Bugs caught late** - Only discovered when merging to epic or main
4. **No feature validation** - Cannot verify feature works until epic commit

**Example Problem:**

```
1. Developer works on auth feature (story FE-123)
2. Commits code without [epic] tag
3. E2E tests skipped (cost optimization)
4. Auth bug not detected
5. Epic merge happens
6. All E2E tests run
7. Auth bug discovered (too late!)
8. Need to fix and re-test entire epic
```

---

## Solution: Smart Feature-Based E2E

### Core Concept

**Run only relevant E2E tests based on changed files**

```
If auth files changed → run auth E2E tests
If avatar files changed → run avatar E2E tests
If epic commit → run all E2E tests
```

**Benefits:**

- ✅ Stories test their own features
- ✅ Catch bugs early (at story level)
- ✅ Lower cost (run subset of tests)
- ✅ Faster feedback (shorter test runs)
- ✅ Better coverage (more commits tested)

---

## Implementation Design

### Step 1: Tag E2E Tests by Feature

**Playwright Test Tags:**

```typescript
// e2e/auth/login.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Login", () => {
  test("should login successfully @auth @critical", async ({ page }) => {
    // Test implementation
  });

  test("should show error for invalid credentials @auth", async ({ page }) => {
    // Test implementation
  });
});

// e2e/avatar/avatar-demo.spec.ts
test.describe("Avatar Demo", () => {
  test("should load avatar demo page @avatar @critical", async ({ page }) => {
    // Test implementation
  });

  test("should generate speech @avatar @tts", async ({ page }) => {
    // Test implementation
  });
});

// e2e/dashboard/dashboard.spec.ts
test.describe("Dashboard", () => {
  test("should display user dashboard @dashboard @critical", async ({
    page,
  }) => {
    // Test implementation
  });
});
```

**Tag Categories:**

| Tag          | Purpose                | Example                       |
| ------------ | ---------------------- | ----------------------------- |
| `@auth`      | Authentication feature | Login, signup, password reset |
| `@avatar`    | Avatar/TTS feature     | Avatar demo, TTS generation   |
| `@dashboard` | Dashboard feature      | User dashboard, analytics     |
| `@admin`     | Admin feature          | User management, roles        |
| `@api`       | API testing            | API endpoints                 |
| `@critical`  | Critical path          | Must-pass tests               |
| `@smoke`     | Smoke tests            | Quick sanity checks           |

---

### Step 2: Map Files to Test Tags

**Create mapping file:** `.github/e2e-mapping.json`

```json
{
  "mappings": [
    {
      "name": "Authentication",
      "tag": "@auth",
      "patterns": [
        "src/app/login/**",
        "src/app/auth/**",
        "src/components/auth/**",
        "src/app/api/auth/**",
        "src/lib/auth.ts"
      ]
    },
    {
      "name": "Avatar & TTS",
      "tag": "@avatar",
      "patterns": [
        "src/app/avatar-demo/**",
        "src/app/api/avatar/**",
        "src/components/avatar/**",
        "src/hooks/useLipSync.ts",
        "src/hooks/useAudioPlayer.ts"
      ]
    },
    {
      "name": "Dashboard",
      "tag": "@dashboard",
      "patterns": ["src/app/dashboard/**", "src/components/dashboard/**"]
    },
    {
      "name": "Admin",
      "tag": "@admin",
      "patterns": [
        "src/app/admin/**",
        "src/app/api/admin/**",
        "src/components/admin/**"
      ]
    },
    {
      "name": "API",
      "tag": "@api",
      "patterns": ["src/app/api/**"]
    }
  ],
  "always_run": ["@critical", "@smoke"],
  "epic_runs_all": true
}
```

---

### Step 3: Create Smart Test Selection Script

**Create script:** `scripts/select-e2e-tests.js`

```javascript
#!/usr/bin/env node

const fs = require("fs");
const { execSync } = require("child_process");

/**
 * Smart E2E Test Selector
 *
 * Determines which E2E tests to run based on changed files
 */

function getChangedFiles() {
  try {
    // Get files changed in this commit
    const output = execSync("git diff --name-only HEAD~1 HEAD", {
      encoding: "utf-8",
    });
    return output.split("\n").filter(Boolean);
  } catch (error) {
    console.error("Error getting changed files:", error);
    return [];
  }
}

function loadMapping() {
  const mappingPath = ".github/e2e-mapping.json";
  if (!fs.existsSync(mappingPath)) {
    console.error("E2E mapping file not found!");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(mappingPath, "utf-8"));
}

function matchPatterns(file, patterns) {
  return patterns.some(pattern => {
    // Convert glob pattern to regex
    const regex = new RegExp(
      "^" +
        pattern
          .replace(/\*\*/g, ".*")
          .replace(/\*/g, "[^/]*")
          .replace(/\?/g, ".") +
        "$"
    );
    return regex.test(file);
  });
}

function selectTests(changedFiles, mapping) {
  const tags = new Set();

  // Always run critical and smoke tests
  mapping.always_run.forEach(tag => tags.add(tag));

  // Check if any changed file matches a feature pattern
  for (const file of changedFiles) {
    for (const feature of mapping.mappings) {
      if (matchPatterns(file, feature.patterns)) {
        console.log(`✓ ${file} → ${feature.name} (${feature.tag})`);
        tags.add(feature.tag);
      }
    }
  }

  return Array.from(tags);
}

function main() {
  const changedFiles = getChangedFiles();

  if (changedFiles.length === 0) {
    console.log("No changed files detected");
    console.log("Running smoke tests only");
    console.log("@smoke");
    return;
  }

  console.log(`\nChanged files (${changedFiles.length}):`);
  changedFiles.forEach(file => console.log(`  - ${file}`));
  console.log();

  const mapping = loadMapping();
  const selectedTags = selectTests(changedFiles, mapping);

  if (selectedTags.length === 0) {
    console.log("No feature-specific tests needed");
    console.log("Running smoke tests only");
    console.log("@smoke");
    return;
  }

  console.log(`\nSelected test tags (${selectedTags.length}):`);
  selectedTags.forEach(tag => console.log(`  - ${tag}`));
  console.log();

  // Output tags for GitHub Actions
  const grepPattern = selectedTags.join("|");
  console.log(`\nPlaywright grep pattern:`);
  console.log(grepPattern);
}

main();
```

---

### Step 4: Update GitHub Actions Workflow

**Modify:** `.github/workflows/quality-gates.yml`

Add new job: `smart-e2e-tests`

```yaml
# Smart E2E Tests (Feature-Specific)
# Runs relevant E2E tests based on changed files
smart-e2e-tests:
  name: Smart E2E Tests
  runs-on: ubuntu-latest
  timeout-minutes: 15
  # Skip if:
  # - Epic commit (full E2E runs instead)
  # - Main branch (full E2E runs instead)
  if: |
    !contains(github.event.head_commit.message, '[epic]') &&
    !contains(github.event.head_commit.message, 'epic:') &&
    github.ref != 'refs/heads/main' &&
    github.event_name != 'workflow_dispatch'

  steps:
    - name: Checkout code
      uses: actions/checkout@v4
      with:
        fetch-depth: 2 # Need previous commit for diff

    - name: Setup pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 9

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: "pnpm"

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Install Playwright browsers
      run: pnpm exec playwright install --with-deps

    - name: Select relevant E2E tests
      id: select-tests
      run: |
        node scripts/select-e2e-tests.js > selection.log
        cat selection.log

        # Extract grep pattern from last line
        GREP_PATTERN=$(tail -1 selection.log)
        echo "grep_pattern=$GREP_PATTERN" >> $GITHUB_OUTPUT

        # Check if any tests selected
        if [[ "$GREP_PATTERN" == "@smoke" ]]; then
          echo "tests_selected=smoke" >> $GITHUB_OUTPUT
        elif [[ -n "$GREP_PATTERN" ]]; then
          echo "tests_selected=feature" >> $GITHUB_OUTPUT
        else
          echo "tests_selected=none" >> $GITHUB_OUTPUT
        fi

    - name: Build application
      if: steps.select-tests.outputs.tests_selected != 'none'
      run: pnpm run build

    - name: Run selected E2E tests
      if: steps.select-tests.outputs.tests_selected != 'none'
      run: |
        echo "Running E2E tests with pattern: ${{ steps.select-tests.outputs.grep_pattern }}"
        pnpm exec playwright test --grep "${{ steps.select-tests.outputs.grep_pattern }}"
      env:
        CI: true

    - name: Upload test results
      if: failure()
      uses: actions/upload-artifact@v4
      with:
        name: smart-e2e-report
        path: playwright-report/
        retention-days: 7

    - name: Comment on PR
      if:
        github.event_name == 'pull_request' &&
        steps.select-tests.outputs.tests_selected != 'none'
      uses: actions/github-script@v7
      with:
        script: |
          const pattern = '${{ steps.select-tests.outputs.grep_pattern }}';
          const type = '${{ steps.select-tests.outputs.tests_selected }}';

          let message = '### 🧪 Smart E2E Tests\n\n';

          if (type === 'smoke') {
            message += '✅ Smoke tests passed\n\n';
            message += 'No feature-specific changes detected.';
          } else {
            message += `✅ Feature-specific E2E tests passed\n\n`;
            message += `**Test pattern:** \`${pattern}\`\n\n`;
            message += 'Changed files triggered relevant E2E tests.';
          }

          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: message
          });
```

---

### Step 5: Update Full E2E Job

**Modify existing `e2e-tests` job:**

```yaml
# Full E2E Tests
# Runs ALL E2E tests for epic commits, main branch, or manual trigger
e2e-tests:
  name: Full E2E Tests
  runs-on: ubuntu-latest
  timeout-minutes: 30
  if: |
    contains(github.event.head_commit.message, '[epic]') ||
    contains(github.event.head_commit.message, 'epic:') ||
    github.ref == 'refs/heads/main' ||
    github.event_name == 'workflow_dispatch'

  steps:
    # ... existing steps ...

    - name: Run ALL E2E tests
      run: |
        echo "Running FULL E2E test suite"
        echo "Reason: Epic commit, main branch, or manual trigger"
        pnpm run test:e2e
      env:
        CI: true
```

---

## Test Execution Matrix

| Scenario                                       | E2E Tests Run                                                                       | Example               |
| ---------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------- |
| **Regular commit (no changes to features)**    | Smoke tests only (`@smoke`)                                                         | README update         |
| **Regular commit (auth files changed)**        | Auth E2E + Smoke + Critical (`@auth \| @smoke \| @critical`)                        | Login page update     |
| **Regular commit (avatar files changed)**      | Avatar E2E + Smoke + Critical (`@avatar \| @smoke \| @critical`)                    | TTS feature fix       |
| **Regular commit (multiple features changed)** | Multiple feature E2E + Smoke + Critical (`@auth \| @avatar \| @smoke \| @critical`) | Auth + Avatar changes |
| **Epic commit (`[epic]` tag)**                 | ALL E2E tests                                                                       | Epic merge            |
| **Main branch push**                           | ALL E2E tests                                                                       | Production deployment |
| **Manual trigger**                             | ALL E2E tests                                                                       | Manual QA run         |

---

## Cost & Time Savings

### Current (Phase 1)

**Regular commit:**

- E2E tests: ❌ Skipped
- Cost: $0
- Time: 0 minutes
- Coverage: 0% of commits tested

**Epic commit:**

- E2E tests: ✅ All tests (40 tests)
- Cost: ~$5
- Time: 25 minutes
- Coverage: 10% of commits tested (epics only)

**Total monthly cost (assuming 100 commits, 10 epics):**

- E2E runs: 10 times
- Cost: ~$50/month
- Coverage: 10% commits

---

### Phase 2 (Smart E2E)

**Regular commit (with feature changes):**

- E2E tests: ✅ Feature-specific (8-12 tests)
- Cost: ~$1.25
- Time: 6-8 minutes
- Coverage: 80% of commits tested

**Epic commit:**

- E2E tests: ✅ All tests (40 tests)
- Cost: ~$5
- Time: 25 minutes
- Coverage: 10% of commits tested

**Total monthly cost (assuming 100 commits, 80 feature commits, 10 epics):**

- Smart E2E runs: 80 times × $1.25 = $100
- Full E2E runs: 10 times × $5 = $50
- **Total: ~$150/month**
- **Coverage: 90% commits tested** ⭐

---

### Cost-Benefit Analysis

| Metric                   | Phase 1 | Phase 2 | Change |
| ------------------------ | ------- | ------- | ------ |
| **Monthly Cost**         | $50     | $150    | +$100  |
| **Commits Tested**       | 10%     | 90%     | +80%   |
| **Bugs Caught Early**    | Low     | High    | ⭐     |
| **Developer Confidence** | Low     | High    | ⭐     |
| **Deployment Safety**    | Medium  | High    | ⭐     |

**ROI:**

- **Cost increase:** +$100/month
- **Bugs caught early:** Save ~4 hours/bug × 5 bugs/month = 20 hours saved
- **Developer time saved:** 20 hours × $50/hour = $1,000 value
- **Net benefit:** $1,000 - $100 = **$900/month savings** 💰

---

## Implementation Timeline

### Week 1: Tag Tests

- [ ] Review all E2E tests
- [ ] Add tags to each test
- [ ] Verify tags work with `--grep`
- [ ] Document tagging strategy

### Week 2: Create Mapping

- [ ] Create `.github/e2e-mapping.json`
- [ ] Map files to features
- [ ] Test pattern matching
- [ ] Add edge cases

### Week 3: Build Script

- [ ] Create `scripts/select-e2e-tests.js`
- [ ] Test with various commit scenarios
- [ ] Handle edge cases (no changes, all features, etc.)
- [ ] Add error handling

### Week 4: Update Workflow

- [ ] Add `smart-e2e-tests` job
- [ ] Update `e2e-tests` job conditions
- [ ] Test in staging branch
- [ ] Deploy to main

### Week 5: Monitor & Tune

- [ ] Monitor test execution
- [ ] Measure cost savings
- [ ] Tune test selection
- [ ] Adjust mappings as needed

---

## Success Criteria

### Must Have ✅

- [ ] Feature-specific E2E tests run on relevant commits
- [ ] Full E2E tests still run on epic/main
- [ ] Cost increase < 200% (currently ~150%)
- [ ] Test coverage > 80% of commits
- [ ] No false positives (wrong tests selected)
- [ ] No false negatives (relevant tests skipped)

### Should Have 🎯

- [ ] Test execution < 10 minutes for feature E2E
- [ ] PR comments show which tests ran
- [ ] Clear feedback on test selection
- [ ] Easy to update mappings
- [ ] Documentation for developers

### Nice to Have 💡

- [ ] Visual test coverage dashboard
- [ ] Historical cost tracking
- [ ] Smart test timeout scaling
- [ ] Parallel test execution by feature
- [ ] AI-powered test selection (future)

---

## Risks & Mitigation

### Risk 1: Wrong Tests Selected

**Scenario:** File mapping is incorrect, wrong tests run

**Mitigation:**

- Always run `@critical` and `@smoke` tests
- Manual review of mappings
- Test selection dry-run in PR comments
- Fallback to smoke tests if unsure

---

### Risk 2: Cost Overrun

**Scenario:** More tests run than expected, cost exceeds budget

**Mitigation:**

- Monitor costs weekly
- Set cost alerts in GitHub Actions
- Adjust test selection if needed
- Limit parallel workers

---

### Risk 3: Mapping Maintenance

**Scenario:** Mappings become outdated as code evolves

**Mitigation:**

- Quarterly review of mappings
- Document mapping strategy
- Add validation in CI
- Community contributions

---

### Risk 4: Flaky Tests

**Scenario:** Feature-specific tests are flaky, cause false failures

**Mitigation:**

- Fix flaky tests immediately
- Retry failed tests (max 2 retries)
- Track flakiness metrics
- Remove persistently flaky tests

---

## Rollback Plan

If Phase 2 doesn't work:

1. **Disable `smart-e2e-tests` job** - Comment out in workflow
2. **Keep full E2E on epic/main** - Existing behavior unchanged
3. **Analyze what went wrong** - Review logs and metrics
4. **Fix issues** - Address problems found
5. **Re-enable gradually** - Start with one feature

---

## Future Enhancements (Phase 3)

### AI-Powered Test Selection

Use AI to intelligently select tests based on:

- Code complexity analysis
- Historical failure patterns
- Risk assessment
- Code coverage gaps

### Visual Test Matrix

Dashboard showing:

- Which features tested
- Which commits tested
- Cost per feature
- Coverage metrics

### Auto-Scaling Test Runners

Dynamically adjust:

- Test parallelization
- Timeout values
- Retry strategies
- Cost optimization

---

## Related Documentation

- **Phase 1:** `docs/ci-cd/QUALITY-GATES-IMPROVEMENTS.md`
- **E2E Tests:** `e2e/README.md`
- **Playwright Config:** `playwright.config.ts`
- **Workflow:** `.github/workflows/quality-gates.yml`

---

## Questions & Answers

**Q: Why not run all E2E on every commit?**

A: Cost and time. Full E2E suite takes 25 minutes and costs ~$5. For 100
commits/month, that's $500 and slows development.

---

**Q: What if mapping is wrong?**

A: We always run `@critical` and `@smoke` tests as safety net. Plus full E2E
runs on epic commits.

---

**Q: How do I add a new feature mapping?**

A: Update `.github/e2e-mapping.json` with new patterns and tag. Test locally
first.

---

**Q: Can I force full E2E on my PR?**

A: Yes! Add `[epic]` to your commit message or manually trigger workflow.

---

## Approval & Sign-off

- [ ] Technical review
- [ ] Cost approval
- [ ] Timeline approval
- [ ] Implementation start date

---

**Plan Version:** 1.0

**Created:** 2025-11-05

**Next Review:** After Phase 1 stabilization (2-4 weeks)

**Status:** 📋 Planned - Awaiting approval and Phase 1 completion
