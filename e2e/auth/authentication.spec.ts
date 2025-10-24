import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto("/");
  });

  test("should display login options", async ({ page }) => {
    await page.goto("/login");

    // Check if OAuth provider buttons are visible
    await expect(page.locator("text=Sign in with GitHub")).toBeVisible();
    await expect(page.locator("text=Sign in with Google")).toBeVisible();
    await expect(page.locator("text=Sign in with Discord")).toBeVisible();
  });

  test("should redirect unauthenticated users to login", async ({ page }) => {
    // Try to access a protected route
    await page.goto("/dashboard");

    // Should be redirected to login or auth page
    await page.waitForURL(/\/login|\/api\/auth/);
  });

  // FE-229: Root Route Authentication Tests
  test("should redirect unauthenticated users from root to login", async ({ page, context }) => {
    // Clear all cookies to ensure unauthenticated state
    await context.clearCookies();

    // Visit root route
    await page.goto("/");

    // Should redirect to login page
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);

    // Should show login form elements
    await expect(page.locator("text=Welcome back")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("should redirect authenticated users from root to dashboard", async ({ page }) => {
    // Authenticate test user using credentials provider
    await page.goto("/login");

    // Fill in test credentials (from login form dev mode)
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "testuser123");

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for authentication to complete and redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Now visit root route while authenticated
    await page.goto("/");

    // Should redirect to dashboard
    await page.waitForURL(/\/dashboard/);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("should preserve deep linking when redirecting from root", async ({ page, context }) => {
    // Clear cookies to ensure unauthenticated state
    await context.clearCookies();

    // Visit root with query parameters (edge case)
    await page.goto("/?redirect=admin");

    // Should redirect to login
    await page.waitForURL(/\/login/);

    // Login URL should have callbackUrl parameter preserved
    const url = new URL(page.url());
    expect(url.searchParams.has("callbackUrl")).toBeTruthy();

    // CallbackUrl should be the root route with original query
    const callbackUrl = url.searchParams.get("callbackUrl");
    expect(callbackUrl).toContain("/");
  });

  test("should handle OAuth authentication flow", async ({ page }) => {
    await page.goto("/login");

    // Mock OAuth flow - in a real test you might use the OAuth provider's testing tools
    // or mock the OAuth response

    // Click GitHub login (this will typically redirect to GitHub)
    const githubButton = page.locator("text=Sign in with GitHub");
    await expect(githubButton).toBeVisible();

    // In a full integration test, this would go through the actual OAuth flow
    // For testing purposes, you might want to mock this or use a test OAuth app
  });

  test("should display user information after login", async ({ page }) => {
    // This test would require actual authentication
    // You might want to set up a test user or use mocked authentication
    // Example of what this might look like:
    // await authenticateTestUser(page)
    // await page.goto('/dashboard')
    // await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible()
    // await expect(page.locator('text=Test User')).toBeVisible()
  });

  test("should handle logout correctly", async ({ page }) => {
    // This test would also require authentication first
    // await authenticateTestUser(page)
    // await page.goto('/dashboard')
    // Find and click logout button
    // await page.click('[data-testid="user-menu"]')
    // await page.click('text=Sign out')
    // Should redirect to home or login page
    // await page.waitForURL('/')
    // await expect(page.locator('text=Sign in')).toBeVisible()
  });

  test("should show appropriate role-based content", async ({ page }) => {
    // Test different user roles see different content
    // This would require setting up different test users with different roles
    // For admin user:
    // await authenticateAdminUser(page)
    // await page.goto('/dashboard')
    // await expect(page.locator('text=Admin Panel')).toBeVisible()
    // For regular user:
    // await authenticateRegularUser(page)
    // await page.goto('/dashboard')
    // await expect(page.locator('text=Admin Panel')).not.toBeVisible()
  });

  test("should handle session expiration", async ({ page }) => {
    // This test would check behavior when session expires
    // await authenticateTestUser(page)
    // await page.goto('/dashboard')
    // Simulate session expiration (might involve manipulating cookies or waiting)
    // await expireSession(page)
    // Try to perform an authenticated action
    // await page.click('[data-testid="protected-action"]')
    // Should redirect to login
    // await page.waitForURL(/\/login|\/api\/auth/)
  });

  test("should prevent access to admin routes for non-admin users", async ({ page }) => {
    // await authenticateRegularUser(page)
    // await page.goto('/admin')
    // Should be redirected or show access denied
    // await expect(page.locator('text=Access denied')).toBeVisible()
  });

  test("should maintain session across page refreshes", async ({ page }) => {
    // await authenticateTestUser(page)
    // await page.goto('/dashboard')
    // Refresh the page
    // await page.reload()
    // Should still be authenticated
    // await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible()
  });
});

// Helper functions that would be implemented based on your auth setup
async function authenticateTestUser(page: any) {
  // Implementation would depend on your auth system
  // This might involve:
  // 1. Using a test OAuth app with predetermined credentials
  // 2. Directly setting auth cookies/tokens
  // 3. Using a test API to create a valid session
}

async function authenticateAdminUser(page: any) {
  // Similar to above but for admin user
}

async function authenticateRegularUser(page: any) {
  // Similar to above but for regular user
}

async function expireSession(page: any) {
  // Implementation to expire the current session
  // This might involve clearing cookies or manipulating tokens
}
