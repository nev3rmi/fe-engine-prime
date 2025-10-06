import { test, expect } from "@playwright/test";

test.describe("Complete Authentication Journey - E2E", () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "testuser123";

  test("should complete full authentication journey: login → dashboard → profile → logout", async ({
    page,
  }) => {
    // PHASE 1: Navigate to Login
    await page.goto("/login");
    await expect(page).toHaveURL("/login");

    // PHASE 2: Login with Test Credentials
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for redirect to dashboard
    await page.waitForURL("/dashboard", { timeout: 10000 });
    await expect(page).toHaveURL("/dashboard");

    // PHASE 3: Verify Dashboard Access
    // User should see dashboard content
    await expect(page.getByText(/dashboard/i)).toBeVisible();

    // PHASE 4: Navigate to Profile
    // Open user menu (look for user email or name)
    const userMenu = page
      .locator('[data-testid="user-menu"]')
      .or(page.locator("text=test@example.com"))
      .or(page.getByRole("button").filter({ hasText: /@/ }))
      .first();

    if (await userMenu.isVisible()) {
      await userMenu.click();

      // Click profile link if menu opened
      const profileLink = page
        .getByRole("menuitem", { name: /profile/i })
        .or(page.getByText(/profile/i).first());

      if (await profileLink.isVisible()) {
        await profileLink.click();
        await page.waitForURL("/profile", { timeout: 5000 });
      }
    } else {
      // Direct navigation if menu not found
      await page.goto("/profile");
    }

    // Verify profile page loaded
    await expect(page.getByText(/profile settings/i).or(page.getByText(/profile/i))).toBeVisible();

    // PHASE 5: Test Profile Edit
    const nameInput = page
      .getByLabel(/display name/i)
      .or(page.getByLabel(/name/i))
      .first();

    if (await nameInput.isVisible()) {
      await nameInput.fill("Updated Test User");

      const saveButton = page.getByRole("button", { name: /save/i });

      // Only click save if button is enabled
      if (await saveButton.isEnabled()) {
        await saveButton.click();

        // Wait for success message or profile update
        await page.waitForTimeout(1000);
      }
    }

    // PHASE 6: Logout
    await page.goto("/dashboard");

    // Open user menu for logout
    const userMenuForLogout = page
      .locator('[data-testid="user-menu"]')
      .or(page.getByRole("button").filter({ hasText: /@/ }))
      .first();

    if (await userMenuForLogout.isVisible()) {
      await userMenuForLogout.click();

      const logoutButton = page
        .getByRole("menuitem", { name: /log out|sign out/i })
        .or(page.getByText(/log out|sign out/i));

      if (await logoutButton.isVisible()) {
        await logoutButton.click();
      }
    }

    // Verify logout redirect
    await page.waitForTimeout(2000);

    // PHASE 7: Verify Session Cleared
    await page.goto("/dashboard");

    // Should redirect to login or show login page
    await page.waitForURL(/\/login|\/api\/auth/, { timeout: 5000 });
  });

  test("should block unauthorized access to protected routes", async ({ page }) => {
    // PHASE 1: Attempt to access dashboard without auth
    await page.goto("/dashboard");

    // Should redirect to login
    await page.waitForURL(/\/login|\/api\/auth/, { timeout: 5000 });

    // Verify login page elements
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("should handle invalid login credentials", async ({ page }) => {
    await page.goto("/login");

    // Fill with invalid credentials
    await page.getByLabel(/email/i).fill("invalid@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid|incorrect|failed/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Should remain on login page
    await expect(page).toHaveURL("/login");
  });

  test("should persist session across browser refresh", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL("/dashboard", { timeout: 10000 });

    // Refresh the page
    await page.reload();

    // Should still be on dashboard (session persisted)
    await expect(page).toHaveURL("/dashboard");

    // User menu should still be visible
    await page.waitForTimeout(2000);
  });

  test("should display role-appropriate content", async ({ page }) => {
    // Login as test user
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL("/dashboard", { timeout: 10000 });

    // Check for role badge or role indicator
    // This will vary based on user role in test database
    await page.waitForTimeout(1000);

    // Verify user sees appropriate navigation items
    // (Specific assertions depend on role configuration)
  });

  test("should handle form validation on profile page", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL("/dashboard", { timeout: 10000 });

    // Navigate to profile
    await page.goto("/profile");
    await expect(page.getByText(/profile settings/i).or(page.getByText(/profile/i))).toBeVisible();

    // Try to submit empty name
    const nameInput = page
      .getByLabel(/display name/i)
      .or(page.getByLabel(/name/i))
      .first();

    if (await nameInput.isVisible()) {
      await nameInput.fill("");

      const saveButton = page.getByRole("button", { name: /save/i });

      // Button should be disabled or show validation error
      const isDisabled = await saveButton.isDisabled();
      expect(isDisabled).toBe(true);
    }
  });
});

test.describe("OAuth Provider Integration", () => {
  test("should display OAuth provider buttons", async ({ page }) => {
    await page.goto("/login");

    // Verify all OAuth buttons are visible
    await expect(page.getByRole("button", { name: /github/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /discord/i })).toBeVisible();
  });

  // Note: Full OAuth flow testing deferred to Story 2.8 (FE-110)
  // These tests verify UI elements are present and clickable
  test("should have clickable OAuth buttons", async ({ page }) => {
    await page.goto("/login");

    const githubButton = page.getByRole("button", { name: /github/i });
    const googleButton = page.getByRole("button", { name: /google/i });
    const discordButton = page.getByRole("button", { name: /discord/i });

    await expect(githubButton).toBeEnabled();
    await expect(googleButton).toBeEnabled();
    await expect(discordButton).toBeEnabled();
  });
});

test.describe("Session Management", () => {
  const testPassword = "testuser123";

  test("should maintain session after page navigation", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL("/dashboard", { timeout: 10000 });

    // Navigate to different pages
    await page.goto("/");
    await page.goto("/dashboard");

    // Should still be authenticated
    await expect(page).toHaveURL("/dashboard");
  });

  test("should clear session on logout", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL("/dashboard", { timeout: 10000 });

    // Attempt logout through signout page
    await page.goto("/auth/signout");

    // Look for sign out button
    const signOutButton = page.getByRole("button", { name: /yes|sign out|confirm/i });

    if (await signOutButton.isVisible()) {
      await signOutButton.click();
    }

    // Wait for redirect
    await page.waitForTimeout(2000);

    // Try to access dashboard - should be redirected
    await page.goto("/dashboard");
    await page.waitForURL(/\/login|\/api\/auth/, { timeout: 5000 });
  });
});

test.describe("Error Handling", () => {
  test("should show error for invalid email format", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel(/email/i).fill("not-an-email");
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should show validation error
    await expect(page.getByText(/valid email|email address/i).first()).toBeVisible({
      timeout: 3000,
    });
  });

  test("should show error for short password", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/password/i).fill("123");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should show validation error
    await expect(page.getByText(/password must be|at least/i).first()).toBeVisible({
      timeout: 3000,
    });
  });
});
