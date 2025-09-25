import fs from 'fs'
import path from 'path'

import type { FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global E2E test teardown...')

  try {
    // Clean up temporary files created during testing
    const authFile = path.join(__dirname, 'auth-state.json')
    if (fs.existsSync(authFile)) {
      fs.unlinkSync(authFile)
      console.log('🗑️  Cleaned up authentication state file')
    }

    // Clean up test data or perform global cleanup
    // This is where you might delete test users, clean up databases, etc.

    // If you have a test database or need to reset state:
    // await resetTestDatabase()
    // await cleanupTestFiles()

    console.log('✅ Global teardown completed successfully')

  } catch (error) {
    console.error('❌ Global teardown failed:', error)
    // Don't throw error to avoid masking test failures
  }
}

export default globalTeardown