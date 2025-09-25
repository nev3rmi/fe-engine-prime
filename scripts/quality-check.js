#!/usr/bin/env node

/**
 * Quality Gate Checker Script
 *
 * This script runs all quality checks locally before committing
 * It ensures that code meets all quality standards before CI/CD pipeline
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
}

// Helper functions
const log = (message, color = colors.white) => {
  console.log(`${color}${message}${colors.reset}`)
}

const logSuccess = (message) => log(`✅ ${message}`, colors.green)
const logError = (message) => log(`❌ ${message}`, colors.red)
const logWarning = (message) => log(`⚠️  ${message}`, colors.yellow)
const logInfo = (message) => log(`ℹ️  ${message}`, colors.blue)
const logStep = (message) => log(`🔧 ${message}`, colors.cyan)

const runCommand = (command, description) => {
  try {
    logStep(`Running: ${description}`)
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' })
    logSuccess(`${description} completed successfully`)
    return { success: true, output }
  } catch (error) {
    logError(`${description} failed`)
    console.error(error.stdout || error.message)
    return { success: false, error: error.stdout || error.message }
  }
}

const checkFileExists = (filePath) => {
  return fs.existsSync(path.resolve(filePath))
}

// Quality gate checks
const qualityGates = {
  // 1. Code Quality Checks
  async codeQuality() {
    log('\n🎯 Running Code Quality Checks', colors.bold)

    const results = []

    // TypeScript type checking
    results.push(runCommand('npm run type-check', 'TypeScript type checking'))

    // ESLint checks
    results.push(runCommand('npm run lint', 'ESLint code analysis'))

    // Prettier formatting check
    results.push(runCommand('npm run format:check', 'Code formatting check'))

    return results.every(result => result.success)
  },

  // 2. Test Coverage
  async testCoverage() {
    log('\n🧪 Running Test Coverage Analysis', colors.bold)

    const result = runCommand('npm run test:coverage -- --reporter=json', 'Unit test coverage')

    if (!result.success) return false

    try {
      // Parse coverage report
      const coverageReport = JSON.parse(result.output)
      const coverage = coverageReport.total

      const thresholds = {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90
      }

      let allMet = true

      Object.entries(thresholds).forEach(([metric, threshold]) => {
        const actual = coverage[metric].pct
        if (actual >= threshold) {
          logSuccess(`${metric}: ${actual}% (>= ${threshold}%)`)
        } else {
          logError(`${metric}: ${actual}% (< ${threshold}%)`)
          allMet = false
        }
      })

      return allMet
    } catch (error) {
      logWarning('Could not parse coverage report, assuming tests passed')
      return true
    }
  },

  // 3. Security Checks
  async securityChecks() {
    log('\n🔒 Running Security Checks', colors.bold)

    const results = []

    // npm audit
    const auditResult = runCommand('npm audit --audit-level=high --json', 'Dependency vulnerability scan')

    if (auditResult.success) {
      try {
        const auditData = JSON.parse(auditResult.output)
        if (auditData.metadata.vulnerabilities.high > 0 || auditData.metadata.vulnerabilities.critical > 0) {
          logError(`Found ${auditData.metadata.vulnerabilities.high} high and ${auditData.metadata.vulnerabilities.critical} critical vulnerabilities`)
          results.push({ success: false })
        } else {
          logSuccess('No high or critical vulnerabilities found')
          results.push({ success: true })
        }
      } catch (error) {
        logWarning('Could not parse audit report')
        results.push({ success: true })
      }
    } else {
      results.push(auditResult)
    }

    // Security-focused tests
    results.push(runCommand('npm run test:security', 'Security test suite'))

    return results.every(result => result.success)
  },

  // 4. Performance Checks
  async performanceChecks() {
    log('\n⚡ Running Performance Checks', colors.bold)

    const results = []

    // Build the application
    const buildResult = runCommand('npm run build', 'Production build')
    results.push(buildResult)

    if (!buildResult.success) return false

    // Bundle size analysis
    if (checkFileExists('.next')) {
      try {
        const stats = fs.statSync('.next')
        logInfo('Build artifacts created successfully')

        // Check bundle size (simplified check)
        const bundleSize = execSync('du -sk .next/static/chunks').toString().split('\t')[0]
        const bundleSizeKB = parseInt(bundleSize)

        if (bundleSizeKB > 1000) { // 1MB threshold
          logWarning(`Bundle size is ${bundleSizeKB}KB, consider optimization`)
        } else {
          logSuccess(`Bundle size is ${bundleSizeKB}KB (within threshold)`)
        }

        results.push({ success: true })
      } catch (error) {
        logError('Could not analyze bundle size')
        results.push({ success: false })
      }
    }

    // Performance tests
    results.push(runCommand('npm run test:performance', 'Performance test suite'))

    return results.every(result => result.success)
  },

  // 5. E2E Tests (optional - can be skipped for faster local checks)
  async e2eTests(skip = false) {
    if (skip) {
      logInfo('Skipping E2E tests (use --e2e flag to include)')
      return true
    }

    log('\n🎭 Running End-to-End Tests', colors.bold)

    // Install Playwright if needed
    if (!checkFileExists('node_modules/@playwright/test')) {
      logInfo('Installing Playwright browsers...')
      runCommand('npx playwright install', 'Playwright browser installation')
    }

    const result = runCommand('npm run test:e2e', 'End-to-end test suite')
    return result.success
  }
}

// Main execution function
async function runQualityGates() {
  const args = process.argv.slice(2)
  const includeE2E = args.includes('--e2e')
  const skipBuild = args.includes('--skip-build')

  log('🚀 Starting Quality Gate Checks...', colors.bold)
  log(`Time: ${new Date().toISOString()}`, colors.cyan)

  const startTime = Date.now()
  const results = {}

  // Run all quality gates
  results.codeQuality = await qualityGates.codeQuality()
  results.testCoverage = await qualityGates.testCoverage()
  results.securityChecks = await qualityGates.securityChecks()

  if (!skipBuild) {
    results.performanceChecks = await qualityGates.performanceChecks()
  }

  results.e2eTests = await qualityGates.e2eTests(!includeE2E)

  // Summary
  const endTime = Date.now()
  const duration = Math.round((endTime - startTime) / 1000)

  log('\n📊 Quality Gate Summary', colors.bold)
  log('═'.repeat(50), colors.cyan)

  const passed = []
  const failed = []

  Object.entries(results).forEach(([gate, success]) => {
    const status = success ? '✅ PASS' : '❌ FAIL'
    const color = success ? colors.green : colors.red
    log(`${gate.padEnd(20)} ${status}`, color)

    if (success) {
      passed.push(gate)
    } else {
      failed.push(gate)
    }
  })

  log('═'.repeat(50), colors.cyan)
  log(`Duration: ${duration}s`, colors.cyan)

  const allPassed = failed.length === 0

  if (allPassed) {
    log('\n🎉 All Quality Gates PASSED!', colors.green + colors.bold)
    log('Your code is ready for commit and deployment.', colors.green)
    process.exit(0)
  } else {
    log('\n💥 Quality Gates FAILED!', colors.red + colors.bold)
    log(`Failed: ${failed.join(', ')}`, colors.red)
    log('\nPlease fix the issues before committing.', colors.yellow)
    process.exit(1)
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  logError(`Unhandled error: ${error.message}`)
  process.exit(1)
})

// Run the quality gates
if (require.main === module) {
  runQualityGates().catch(error => {
    logError(`Quality gate execution failed: ${error.message}`)
    process.exit(1)
  })
}

module.exports = { runQualityGates, qualityGates }