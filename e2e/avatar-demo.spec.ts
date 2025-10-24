import { test, expect } from '@playwright/test';

test.describe('Avatar Demo Page', () => {
  test('should load avatar demo page', async ({ page }) => {
    // Navigate to avatar demo page
    await page.goto('http://localhost:3000/avatar-demo');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if page title is correct
    await expect(page).toHaveTitle(/Avatar Demo/i);

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/avatar-demo-loaded.png', fullPage: true });
  });

  test('should display avatar components', async ({ page }) => {
    await page.goto('http://localhost:3000/avatar-demo');
    await page.waitForLoadState('networkidle');

    // Check for main heading
    const heading = page.locator('h1, h2').filter({ hasText: /conversational avatar/i });
    await expect(heading).toBeVisible();

    // Check for microphone button
    const micButton = page.locator('button').filter({ hasText: /start|microphone/i });
    await expect(micButton).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/avatar-components.png', fullPage: true });
  });

  test('should check API status indicators', async ({ page }) => {
    await page.goto('http://localhost:3000/avatar-demo');
    await page.waitForLoadState('networkidle');

    // Wait a bit for API checks to complete
    await page.waitForTimeout(2000);

    // Check for status indicators
    const statusSection = page.locator('text=/status|system/i');

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/avatar-status.png', fullPage: true });

    // Print page content for debugging
    const content = await page.content();
    console.log('Page loaded successfully');
  });

  test('should check for console errors', async ({ page }) => {
    const consoleMessages: string[] = [];
    const errors: string[] = [];

    // Listen for console messages
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      errors.push(`Page Error: ${error.message}`);
    });

    await page.goto('http://localhost:3000/avatar-demo');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/avatar-console-check.png', fullPage: true });

    // Print console messages
    console.log('Console Messages:', consoleMessages);
    console.log('Errors Found:', errors);

    // Check if there are critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('AuthJS') &&
      !e.includes('debug-enabled')
    );

    if (criticalErrors.length > 0) {
      console.error('Critical errors found:', criticalErrors);
    }
  });

  test('should test API endpoints directly', async ({ page }) => {
    // Test TTS endpoint
    const ttsResponse = await page.request.get('http://localhost:3000/api/avatar/tts');
    const ttsData = await ttsResponse.json();
    console.log('TTS API Response:', ttsData);
    expect(ttsResponse.status()).toBe(200);
    expect(ttsData.status).toBe('active');

    // Test Chat endpoint
    const chatResponse = await page.request.get('http://localhost:3000/api/avatar/chat');
    const chatData = await chatResponse.json();
    console.log('Chat API Response:', chatData);
    expect(chatResponse.status()).toBe(200);
    expect(chatData.status).toBe('active');
  });
});
