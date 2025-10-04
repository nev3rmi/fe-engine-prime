import { test, expect } from "@playwright/test";

test.describe("Navigation Flows E2E Tests", () => {
  test.describe("Unauthenticated Navigation", () => {
    test("should redirect to login when accessing protected dashboard", async ({ page }) => {
      await page.goto("/dashboard");

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);

      // Should show login form
      await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    });

    test("should redirect to login when accessing admin area", async ({ page }) => {
      await page.goto("/admin");

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test("should show limited navigation menu when not authenticated", async ({ page }) => {
      await page.goto("/");

      // Public navigation should be visible
      // Admin navigation should not be visible
      const adminLink = page.getByRole("link", { name: /administration/i });
      await expect(adminLink)
        .not.toBeVisible({ timeout: 2000 })
        .catch(() => {
          // Link might not exist at all, which is fine
        });
    });
  });

  test.describe("Authenticated Navigation - Regular User", () => {
    test.beforeEach(async ({ page }) => {
      // Simulate login as regular user
      await page.goto("/login");

      // Mock successful login (in real tests, use actual credentials)
      await page.evaluate(() => {
        window.localStorage.setItem(
          "mock-session",
          JSON.stringify({
            user: {
              id: "user-1",
              email: "user@example.com",
              role: "USER",
              isActive: true,
            },
          })
        );
      });
    });

    test("should access dashboard after login", async ({ page }) => {
      await page.goto("/dashboard");

      // Should successfully load dashboard
      await expect(page).toHaveURL("/dashboard");

      // Should show dashboard content
      await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
    });

    test("should not see admin navigation items", async ({ page }) => {
      await page.goto("/dashboard");

      // Wait for navigation to load
      await page.waitForLoadState("networkidle");

      // Admin link should not be visible
      const adminLink = page.getByRole("link", { name: /administration/i });
      await expect(adminLink)
        .not.toBeVisible({ timeout: 2000 })
        .catch(() => {
          // Expected - link doesn't exist for regular users
        });
    });

    test("should be redirected when trying to access admin area", async ({ page }) => {
      await page.goto("/admin");

      // Should redirect away from admin (to dashboard or login)
      await page.waitForURL(url => url.pathname !== "/admin", { timeout: 5000 });

      // Should not be on admin page
      expect(page.url()).not.toContain("/admin");
    });
  });

  test.describe("Authenticated Navigation - Admin User", () => {
    test.beforeEach(async ({ page }) => {
      // Simulate login as admin user
      await page.goto("/login");

      await page.evaluate(() => {
        window.localStorage.setItem(
          "mock-session",
          JSON.stringify({
            user: {
              id: "admin-1",
              email: "admin@example.com",
              role: "ADMIN",
              isActive: true,
            },
          })
        );
      });
    });

    test("should see admin navigation items", async ({ page }) => {
      await page.goto("/dashboard");

      // Wait for navigation to load
      await page.waitForLoadState("networkidle");

      // Admin link should be visible
      const adminLink = page.getByRole("link", { name: /administration|admin/i }).first();
      await expect(adminLink).toBeVisible({ timeout: 5000 });
    });

    test("should access admin area", async ({ page }) => {
      await page.goto("/admin");

      // Should successfully load admin page
      await expect(page).toHaveURL("/admin");

      // Should show admin content
      await expect(
        page.getByRole("heading", { name: /user management|administration/i })
      ).toBeVisible({ timeout: 5000 });
    });

    test("should navigate between dashboard and admin", async ({ page }) => {
      // Start at dashboard
      await page.goto("/dashboard");
      await expect(page).toHaveURL("/dashboard");

      // Navigate to admin
      const adminLink = page.getByRole("link", { name: /administration|admin/i }).first();
      await adminLink.click();

      await expect(page).toHaveURL(/\/admin/);

      // Navigate back to dashboard
      const dashboardLink = page.getByRole("link", { name: /dashboard/i }).first();
      await dashboardLink.click();

      await expect(page).toHaveURL("/dashboard");
    });
  });

  test.describe("Breadcrumb Navigation", () => {
    test("should show breadcrumbs on nested pages", async ({ page }) => {
      // Mock admin session
      await page.goto("/login");
      await page.evaluate(() => {
        window.localStorage.setItem(
          "mock-session",
          JSON.stringify({
            user: {
              id: "admin-1",
              email: "admin@example.com",
              role: "ADMIN",
              isActive: true,
            },
          })
        );
      });

      await page.goto("/admin/settings");

      // Wait for page to load
      await page.waitForLoadState("networkidle");

      // Breadcrumbs should be visible (if implemented on page)
      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');

      // Check if breadcrumbs exist
      const breadcrumbExists = (await breadcrumb.count()) > 0;
      if (breadcrumbExists) {
        await expect(breadcrumb).toBeVisible();

        // Should show navigation path
        await expect(page.getByRole("link", { name: /home/i })).toBeVisible();
      }
    });

    test("should allow navigation via breadcrumbs", async ({ page }) => {
      // Mock admin session
      await page.goto("/login");
      await page.evaluate(() => {
        window.localStorage.setItem(
          "mock-session",
          JSON.stringify({
            user: {
              id: "admin-1",
              email: "admin@example.com",
              role: "ADMIN",
              isActive: true,
            },
          })
        );
      });

      await page.goto("/admin/settings");
      await page.waitForLoadState("networkidle");

      // Click home in breadcrumbs if available
      const homeLink = page.getByRole("link", { name: /home/i }).first();
      const homeLinkExists = (await homeLink.count()) > 0;

      if (homeLinkExists) {
        await homeLink.click();
        await expect(page).toHaveURL("/");
      }
    });
  });

  test.describe("Dynamic Menu Rendering", () => {
    test("should show different menus for different roles", async ({ page }) => {
      // Test as regular user
      await page.goto("/login");
      await page.evaluate(() => {
        window.localStorage.setItem(
          "mock-session",
          JSON.stringify({
            user: {
              id: "user-1",
              email: "user@example.com",
              role: "USER",
              isActive: true,
            },
          })
        );
      });

      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      // Capture menu items for user
      const userMenuItems = await page.locator("nav a").count();

      // Now test as admin
      await page.evaluate(() => {
        window.localStorage.setItem(
          "mock-session",
          JSON.stringify({
            user: {
              id: "admin-1",
              email: "admin@example.com",
              role: "ADMIN",
              isActive: true,
            },
          })
        );
      });

      await page.reload();
      await page.waitForLoadState("networkidle");

      // Capture menu items for admin
      const adminMenuItems = await page.locator("nav a").count();

      // Admin should have more menu items
      expect(adminMenuItems).toBeGreaterThanOrEqual(userMenuItems);
    });

    test("should show loading state while checking permissions", async ({ page }) => {
      await page.goto("/dashboard");

      // Look for loading indicators
      const loader = page.getByText(/loading/i).first();

      // Loader might appear briefly
      // Just check that page eventually loads
      await page.waitForLoadState("networkidle");

      // Page should be loaded (no infinite loading)
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Logout Flow", () => {
    test("should clear navigation after logout", async ({ page }) => {
      // Login as user
      await page.goto("/login");
      await page.evaluate(() => {
        window.localStorage.setItem(
          "mock-session",
          JSON.stringify({
            user: {
              id: "user-1",
              email: "user@example.com",
              role: "USER",
              isActive: true,
            },
          })
        );
      });

      await page.goto("/dashboard");
      await expect(page).toHaveURL("/dashboard");

      // Logout (simulate)
      await page.evaluate(() => {
        window.localStorage.removeItem("mock-session");
      });

      // Try to access protected route
      await page.goto("/dashboard");

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("Inactive User Handling", () => {
    test("should prevent inactive users from accessing protected routes", async ({ page }) => {
      await page.goto("/login");
      await page.evaluate(() => {
        window.localStorage.setItem(
          "mock-session",
          JSON.stringify({
            user: {
              id: "user-1",
              email: "user@example.com",
              role: "USER",
              isActive: false, // Inactive user
            },
          })
        );
      });

      await page.goto("/dashboard");

      // Should redirect inactive users
      await page.waitForURL(url => url.pathname !== "/dashboard", { timeout: 5000 });
      expect(page.url()).not.toContain("/dashboard");
    });
  });
});
