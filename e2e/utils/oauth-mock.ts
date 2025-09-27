import type { Page } from "@playwright/test";

/**
 * OAuth Mock Utilities for Playwright E2E Tests
 * Provides realistic OAuth flow mocking for FE-35 authentication testing
 */

export interface MockUser {
  name: string;
  email: string;
  image: string;
  provider: "github" | "google" | "discord";
}

export const DEFAULT_MOCK_USERS: Record<string, MockUser> = {
  github: {
    name: "GitHub Test User",
    email: "test@github.com",
    image: "https://github.com/avatar/test.jpg",
    provider: "github",
  },
  google: {
    name: "Google Test User",
    email: "test@gmail.com",
    image: "https://lh3.googleusercontent.com/test.jpg",
    provider: "google",
  },
  discord: {
    name: "Discord Test User",
    email: "test@discord.com",
    image: "https://cdn.discordapp.com/avatar/test.jpg",
    provider: "discord",
  },
};

/**
 * Sets up complete OAuth mocking for a page
 * Call this in beforeEach to enable OAuth testing
 */
export async function setupOAuthMocking(page: Page) {
  // Mock NextAuth.js core endpoints
  await mockNextAuthEndpoints(page);

  // Setup OAuth provider flows
  await mockOAuthProviders(page);
}

/**
 * Mock successful OAuth login for specific provider
 */
export async function mockOAuthSuccess(
  page: Page,
  provider: "github" | "google" | "discord",
  user?: MockUser
) {
  const mockUser = user || DEFAULT_MOCK_USERS[provider];

  // Mock OAuth initiation
  await page.route(`**/api/auth/signin/${provider}`, async route => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `
        <script>
          window.location.href = '/api/auth/callback/${provider}?code=mock_auth_code&state=mock_state';
        </script>
      `,
    });
  });

  // Mock OAuth callback success
  await page.route(`**/api/auth/callback/${provider}*`, async route => {
    await route.fulfill({
      status: 302,
      headers: {
        Location: "/dashboard",
        "Set-Cookie": `next-auth.session-token=mock_${provider}_session; Path=/; HttpOnly`,
      },
    });
  });

  // Mock session with user data
  await page.route("**/api/auth/session", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: mockUser,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
  });
}

/**
 * Mock OAuth error scenarios
 */
export async function mockOAuthError(
  page: Page,
  provider: "github" | "google" | "discord",
  errorType: "OAuthCallback" | "AccessDenied" | "OAuthAccountNotLinked" = "OAuthCallback"
) {
  await page.route(`**/api/auth/signin/${provider}`, async route => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `
        <script>
          window.location.href = '/auth/error?error=${errorType}';
        </script>
      `,
    });
  });
}

/**
 * Mock authenticated session (for tests that need pre-auth)
 */
export async function mockAuthenticatedSession(page: Page, user?: MockUser) {
  const mockUser = user || DEFAULT_MOCK_USERS.github;

  await page.route("**/api/auth/session", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: mockUser,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
  });

  // Set authentication cookies
  await page.context().addCookies([
    {
      name: "next-auth.session-token",
      value: "mock_authenticated_session",
      domain: "localhost",
      path: "/",
      httpOnly: true,
    },
  ]);
}

/**
 * Mock signout flow
 */
export async function mockSignout(page: Page) {
  await page.route("**/api/auth/signout", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        url: "/",
        cookies: [],
      }),
    });
  });

  // Clear session after signout
  await page.route("**/api/auth/session", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

/**
 * Private helper functions
 */
async function mockNextAuthEndpoints(page: Page) {
  // Mock CSRF token
  await page.route("**/api/auth/csrf", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ csrfToken: "mock_csrf_token" }),
    });
  });

  // Mock providers list
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

async function mockOAuthProviders(page: Page) {
  // Default to no session (unauthenticated)
  await page.route("**/api/auth/session", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

/**
 * Test OAuth flow with realistic timing
 */
export async function mockSlowOAuth(
  page: Page,
  provider: "github" | "google" | "discord",
  delayMs: number = 2000
) {
  await page.route(`**/api/auth/signin/${provider}`, async route => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, delayMs));

    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `
        <script>
          window.location.href = '/dashboard';
        </script>
      `,
    });
  });
}
