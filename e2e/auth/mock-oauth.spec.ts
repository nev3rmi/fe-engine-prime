import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

test.describe("FE-35: Authentication UI - Mock OAuth Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock OAuth responses before each test
    await setupMockOAuth(page);
  });

  test("FE-35-E2E-001: Login page loads correctly", async ({ page }) => {
    await page.goto("/login");

    // Verify page structure and components
    await expect(page.locator("h1")).toContainText("Welcome back");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText("Sign In");

    // Verify OAuth buttons are present
    await expect(page.locator("button", { hasText: "GitHub" })).toBeVisible();
    await expect(page.locator("button", { hasText: "Google" })).toBeVisible();
    await expect(page.locator("button", { hasText: "Discord" })).toBeVisible();
  });

  test("FE-35-E2E-002: Mock GitHub OAuth flow works", async ({ page }) => {
    await page.goto("/login");

    // Mock successful GitHub OAuth response
    await page.route("**/api/auth/signin/github", async route => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `
          <script>
            window.location.href = '/api/auth/callback/github?code=mock_auth_code&state=mock_state';
          </script>
        `,
      });
    });

    // Mock OAuth callback success
    await page.route("**/api/auth/callback/github*", async route => {
      await route.fulfill({
        status: 302,
        headers: {
          Location: "/dashboard",
          "Set-Cookie": "next-auth.session-token=mock_session_token; Path=/; HttpOnly",
        },
      });
    });

    // Mock session endpoint
    await page.route("**/api/auth/session", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            name: "Test User",
            email: "test@github.com",
            image: "https://github.com/avatar/test.jpg",
          },
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
    });

    // Click GitHub OAuth button
    await page.locator("button", { hasText: "GitHub" }).click();

    // Should redirect to dashboard after mock OAuth
    await page.waitForURL("/dashboard", { timeout: 10000 });
    await expect(page).toHaveURL("/dashboard");
  });

  test("FE-35-E2E-003: Mock Google OAuth flow works", async ({ page }) => {
    await page.goto("/login");

    // Mock Google OAuth flow (similar pattern)
    await page.route("**/api/auth/signin/google", async route => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `
          <script>
            window.location.href = '/api/auth/callback/google?code=mock_google_code&state=mock_state';
          </script>
        `,
      });
    });

    await page.route("**/api/auth/callback/google*", async route => {
      await route.fulfill({
        status: 302,
        headers: {
          Location: "/dashboard",
          "Set-Cookie": "next-auth.session-token=mock_google_session; Path=/; HttpOnly",
        },
      });
    });

    await page.route("**/api/auth/session", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            name: "Google Test User",
            email: "test@gmail.com",
            image: "https://lh3.googleusercontent.com/test.jpg",
          },
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
    });

    // Test Google OAuth button
    await page.locator("button", { hasText: "Google" }).click();
    await page.waitForURL("/dashboard", { timeout: 10000 });
    await expect(page).toHaveURL("/dashboard");
  });

  test("FE-35-E2E-004: OAuth error handling works", async ({ page }) => {
    await page.goto("/login");

    // Mock OAuth error response
    await page.route("**/api/auth/signin/github", async route => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `
          <script>
            window.location.href = '/auth/error?error=OAuthCallback';
          </script>
        `,
      });
    });

    // Click GitHub button
    await page.locator("button", { hasText: "GitHub" }).click();

    // Should redirect to error page
    await page.waitForURL("**/auth/error*", { timeout: 10000 });
    await expect(page).toHaveURL(/.*\/auth\/error.*/);

    // Verify error message is displayed
    await expect(page.locator("text=Authentication Error")).toBeVisible();
    await expect(page.locator("text=Error in the OAuth callback")).toBeVisible();

    // Verify navigation buttons work
    await expect(page.locator("a", { hasText: "Try Again" })).toBeVisible();
    await expect(page.locator("a", { hasText: "Go Home" })).toBeVisible();
  });

  test("FE-35-E2E-005: Signout flow works", async ({ page }) => {
    // First mock a successful login
    await mockSuccessfulLogin(page);
    await page.goto("/dashboard");

    // Navigate to signout page
    await page.goto("/auth/signout");

    // Verify signout confirmation page
    await expect(page.locator("h2")).toContainText("Sign Out");
    await expect(page.locator("text=Are you sure you want to sign out")).toBeVisible();

    // Mock signout success
    await page.route("**/api/auth/signout", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "/" }),
      });
    });

    // Click signout button
    await page.locator("button", { hasText: "Yes, Sign Out" }).click();

    // Should redirect to home page
    await page.waitForURL("/", { timeout: 10000 });
    await expect(page).toHaveURL("/");
  });

  test("FE-35-E2E-006: Form validation works", async ({ page }) => {
    await page.goto("/login");

    // Test email validation
    await page.locator('input[type="email"]').fill("invalid-email");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator("text=Please enter a valid email")).toBeVisible();

    // Test password validation
    await page.locator('input[type="email"]').fill("test@example.com");
    await page.locator('input[type="password"]').fill("123");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator("text=Password must be at least 6 characters")).toBeVisible();
  });

  test("FE-35-E2E-007: Responsive design works on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/login");

    // Verify mobile layout
    await expect(page.locator(".grid")).toHaveClass(/grid-cols-1/);

    // OAuth buttons should stack vertically on mobile
    const githubButton = page.locator("button", { hasText: "GitHub" });
    const googleButton = page.locator("button", { hasText: "Google" });

    const githubBox = await githubButton.boundingBox();
    const googleBox = await googleButton.boundingBox();

    // On mobile, buttons should be stacked (Y positions different)
    expect(Math.abs(githubBox!.y - googleBox!.y)).toBeGreaterThan(10);
  });

  test("FE-35-E2E-008: Loading states display correctly", async ({ page }) => {
    await page.goto("/login");

    // Mock slow OAuth response to test loading state
    await page.route("**/api/auth/signin/github", async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: '<script>window.location.href = "/dashboard";</script>',
      });
    });

    // Click GitHub button and verify loading state
    await page.locator("button", { hasText: "GitHub" }).click();

    // Button should be disabled during loading
    await expect(page.locator("button", { hasText: "GitHub" })).toBeDisabled();
  });
});

// Helper function to setup mock OAuth routes
async function setupMockOAuth(page: Page) {
  // Mock NextAuth.js CSRF token endpoint
  await page.route("**/api/auth/csrf", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ csrfToken: "mock_csrf_token" }),
    });
  });

  // Mock NextAuth.js providers endpoint
  await page.route("**/api/auth/providers", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        github: {
          id: "github",
          name: "GitHub",
          type: "oauth",
          signinUrl: "http://localhost:3000/api/auth/signin/github",
        },
        google: {
          id: "google",
          name: "Google",
          type: "oauth",
          signinUrl: "http://localhost:3000/api/auth/signin/google",
        },
        discord: {
          id: "discord",
          name: "Discord",
          type: "oauth",
          signinUrl: "http://localhost:3000/api/auth/signin/discord",
        },
      }),
    });
  });
}

// Helper function to mock successful login
async function mockSuccessfulLogin(page: Page) {
  await page.route("**/api/auth/session", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          name: "Test User",
          email: "test@example.com",
          image: "https://github.com/avatar/test.jpg",
        },
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
  });

  // Set authentication cookies
  await page.context().addCookies([
    {
      name: "next-auth.session-token",
      value: "mock_session_token",
      domain: "localhost",
      path: "/",
      httpOnly: true,
    },
  ]);
}
