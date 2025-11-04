import path from "path";

import { chromium } from "@playwright/test";

import type { FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  console.log("🚀 Starting global E2E test setup...");

  // Launch browser for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the development server to be ready
    console.log("⏳ Waiting for development server...");
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle", { timeout: 60000 });
    console.log("✅ Development server is ready");

    // Setup test data or perform global authentication if needed
    // This is where you might create test users, seed data, etc.

    // Check if basic pages are accessible
    await page.goto("http://localhost:3000");
    await page.waitForSelector("body", { timeout: 10000 });

    // Store authentication state for tests that need it
    // This can speed up tests by avoiding repeated login flows
    const authFile = path.join(__dirname, "auth-state.json");

    // If you have a test user, you could authenticate and save state here:
    // await page.goto('/login')
    // await page.fill('[data-testid="email"]', 'test@example.com')
    // await page.fill('[data-testid="password"]', 'testpassword')
    // await page.click('[data-testid="login-button"]')
    // await page.waitForURL('/dashboard')
    // await page.context().storageState({ path: authFile })

    console.log("✅ Global setup completed successfully");
  } catch (error) {
    console.error("❌ Global setup failed:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
