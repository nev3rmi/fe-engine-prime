# QC Engine Smart Tests - GitHub Actions Workflow

## Overview

Intelligent test execution workflow that automatically detects release type and
runs appropriate test scope.

**Powered by:**

- FE-470: Smart Test Execution with Tags
- FE-468: JIRA-Driven Dependency Resolution
- FE-469: Release-Based Testing Strategy

---

## Workflow: `qc-engine-smart-tests.yml`

### Trigger Conditions

**Automatic Triggers:**

```yaml
push:
  branches:
    - feature/** # Feature branches
    - bugfix/** # Bug fixes
    - hotfix/** # Hotfixes
    - release/story-** # Story releases
    - release/epic-** # Epic releases

pull_request:
  branches:
    - main # PR to main
    - develop # PR to develop
```

**Manual Trigger:**

- Via GitHub Actions UI
- Specify release type and JIRA issue

---

## Release Type Detection

### Branch Pattern Matching

| Branch Pattern      | Release Type | JIRA Extraction | Example                    |
| ------------------- | ------------ | --------------- | -------------------------- |
| `feature/FE-421-*`  | Feature      | `FE-421`        | `feature/FE-421-user-auth` |
| `bugfix/FE-422-*`   | Feature      | `FE-422`        | `bugfix/FE-422-fix-login`  |
| `hotfix/FE-423-*`   | Feature      | `FE-423`        | `hotfix/FE-423-security`   |
| `release/story-2.7` | Story        | `STORY-2.7`     | `release/story-2.7`        |
| `release/epic-2`    | Epic         | `EPIC-2`        | `release/epic-2`           |

**Note:** Story and Epic JIRA mapping requires label lookup (future enhancement)

---

## Test Strategies

### 1. Feature Strategy (Fast Feedback)

**Triggers:**

- `feature/**` branches
- `bugfix/**` branches
- `hotfix/**` branches

**Test Scope:**

```
Current story + smoke tests only
```

**Example:**

```bash
robot --include story-2.7ANDsmoke tests/
```

**Duration:** 3-5 minutes

**Purpose:** Fast feedback during development

**When to use:**

- Active feature development
- Quick iterations
- Pre-commit checks

---

### 2. Story Strategy (With Dependencies)

**Triggers:**

- `release/story-X.X` branches
- PR to main with story context

**Test Scope:**

```
Story tests + dependency tests + smoke
```

**Example:**

```bash
robot --include story-2.7ORstory-2.2ORstory-3.1 tests/
```

**Duration:** 8-12 minutes

**Purpose:** Validate story works with its dependencies

**When to use:**

- Story completion
- Pre-release validation
- Integration testing

**Dependencies resolved from:**

- JIRA issue links ("blocks", "is blocked by", "relates to")
- Automatic via FE-468 dependency resolver

---

### 3. Epic Strategy (Full Regression)

**Triggers:**

- `release/epic-X` branches
- PR to main with epic context

**Test Scope:**

```
All tests in epic + dependent epics
```

**Example:**

```bash
robot --include epic-2 tests/
```

**Duration:** 15-30 minutes

**Purpose:** Comprehensive epic validation

**When to use:**

- Epic completion
- Major releases
- Pre-deployment validation

---

## Workflow Jobs

### Job 1: `detect-release-type`

**Purpose:** Analyze branch and resolve dependencies

**Steps:**

1. Checkout qc-engine-prime
2. Install Python dependencies
3. Detect release type from branch name
4. Extract JIRA issue key
5. Run dependency resolver script
6. Output test scope

**Outputs:**

```yaml
release_type: "feature" | "story" | "epic"
jira_issue: "FE-421"
test_scope: "story-2.7ANDsmoke"
has_tests: "true"
```

---

### Job 2: `run-smart-tests`

**Purpose:** Execute tests with resolved scope

**Steps:**

1. Checkout both repositories
2. Setup Node.js, Python, pnpm
3. Install dependencies
4. Start fe-engine-prime dev server
5. Run Robot Framework with resolved scope
6. Parse results
7. Upload artifacts
8. Fail if tests failed

**Artifacts:**

- `robot-test-results-{type}-{run}.zip`
- `robot-test-screenshots-{type}-{run}.zip`

---

### Job 3: `summary`

**Purpose:** Create workflow summary

**Outputs:**

- GitHub Step Summary with test results
- Release type and JIRA issue
- Test scope used
- Pass/fail status

---

## Usage Examples

### Example 1: Feature Branch Development

```bash
# Create feature branch
git checkout -b feature/FE-421-user-authentication

# Make changes
git commit -am "feat: Add login form"

# Push triggers workflow
git push origin feature/FE-421-user-authentication
```

**Workflow behavior:**

- Detects: Feature branch (FE-421)
- Resolves: `story-2.7ANDsmoke`
- Runs: 3-5 minute smoke tests
- Result: Fast feedback

---

### Example 2: Story Release

```bash
# Create story release branch
git checkout -b release/story-2.7

# Merge completed work
git merge develop

# Push triggers workflow
git push origin release/story-2.7
```

**Workflow behavior:**

- Detects: Story release (story-2.7)
- Queries JIRA for dependencies
- Resolves: `story-2.7ORstory-2.2ORstory-3.1`
- Runs: 8-12 minute integration tests
- Result: Validates story + dependencies

---

### Example 3: Epic Release

```bash
# Create epic release branch
git checkout -b release/epic-2

# Prepare for deployment
git merge main

# Push triggers workflow
git push origin release/epic-2
```

**Workflow behavior:**

- Detects: Epic release (epic-2)
- Resolves: `epic-2`
- Runs: 15-30 minute full regression
- Result: Comprehensive validation

---

### Example 4: Manual Trigger

**Via GitHub UI:**

1. Go to Actions tab
2. Select "QC Engine Smart Tests"
3. Click "Run workflow"
4. Choose:
   - Release type: `story`
   - JIRA issue: `FE-421`
5. Run

**Workflow behavior:**

- Uses manual inputs
- Bypasses branch detection
- Runs with specified parameters

---

## Configuration

### Environment Variables

```yaml
NODE_VERSION: "22"
PNPM_VERSION: "9"
PYTHON_VERSION: "3.10"
```

### Required Secrets

| Secret                 | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| `QC_ENGINE_DEPLOY_KEY` | SSH key for private qc-engine-prime repo |

---

## Integration Points

### FE-470: Tags

Workflow uses Robot Framework tags:

- `story-X.X` - Story identification
- `epic-X` - Epic grouping
- `smoke` - Critical path tests
- `regression` - Comprehensive tests

**Tag filtering:**

```bash
--include story-2.7ANDsmoke  # Feature
--include story-2.7OR...     # Story
--include epic-2             # Epic
```

---

### FE-468: Dependencies

Workflow calls dependency resolver:

```bash
python scripts/resolve_jira_dependencies.py \
  --issue FE-421 \
  --release-type feature \
  --json
```

**Returns:**

```json
{
  "robot_include": "story-2.7ANDsmoke",
  "primary_story": "2.7",
  "dependent_stories": ["2.2", "3.1"]
}
```

---

## Troubleshooting

### Issue: No tests found

**Cause:** Test files don't have matching tags

**Solution:**

1. Verify test files have required tags
2. Run tag validation:
   ```bash
   python scripts/tag_robot_tests.py --validate tests/
   ```
3. Add missing tags

---

### Issue: Dependency resolution fails

**Cause:** JIRA issue not found or no labels

**Solution:**

1. Check JIRA issue exists
2. Verify issue has `story-X.X` label
3. Check issue links are configured
4. Falls back to default scope automatically

---

### Issue: Workflow timeout

**Cause:** Tests taking too long

**Solution:**

1. Check dev server started correctly
2. Verify test scope is appropriate
3. Review slow tests
4. Increase timeout if needed (currently 30 min)

---

## Performance Metrics

### Expected Durations

| Release Type | Test Count | Duration  | Use Case    |
| ------------ | ---------- | --------- | ----------- |
| Feature      | ~30%       | 3-5 min   | Development |
| Story        | ~40-60%    | 8-12 min  | Integration |
| Epic         | ~100%      | 15-30 min | Release     |

### Comparison

**Before Smart Tests:**

- All tests every push: 10-15 minutes
- No dependency awareness
- Manual configuration

**After Smart Tests:**

- Feature: 3-5 minutes (67% faster)
- Story: 8-12 minutes (33% faster)
- Epic: 15-30 minutes (comprehensive)
- Automatic everything

---

## Future Enhancements

### Planned (FE-472)

- Parallel test execution
- Multiple browser testing
- Performance monitoring
- Advanced result aggregation

### Under Consideration

- Auto-retry flaky tests
- Test impact analysis
- Predictive test selection
- Cost optimization

---

## Related Documentation

- **Tagging Conventions:** `qc-engine-prime/docs/TAGGING-CONVENTIONS.md`
- **Test Report:** `qc-engine-prime/TEST-REPORT.md`
- **Dependency Resolver:**
  `qc-engine-prime/scripts/resolve_jira_dependencies.py`
- **Tag Validator:** `qc-engine-prime/scripts/tag_robot_tests.py`

---

## Support

**Issues:**

- GitHub Issues:
  [fe-engine-prime](https://github.com/your-org/fe-engine-prime/issues)
- JIRA Epic: [FE-443](https://aifaads.atlassian.net/browse/FE-443)

**Questions:**

- Check workflow logs in GitHub Actions
- Review TEST-REPORT.md for test details
- Consult TAGGING-CONVENTIONS.md for tag usage

---

**Last Updated:** 2025-11-04

**Version:** 1.0.0

**Status:** ✅ Production Ready
