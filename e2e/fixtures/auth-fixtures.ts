import { test as base, type Page } from "@playwright/test";
import path from "path";

// Extend base test with authentication fixtures
export const test = base.extend<{
  authenticatedPage: Page;
  adminPage: Page;
  editorPage: Page;
}>({
  // Regular authenticated user
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login as test user
    await page.goto("http://localhost:3000/login");
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/password/i).fill("testuser123");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for login to complete
    await page.waitForURL("http://localhost:3000/dashboard", { timeout: 10000 }).catch(() => {
      // If redirect doesn't happen, that's okay for some tests
    });

    await use(page);
    await context.close();
  },

  // Admin authenticated user
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login as admin
    await page.goto("http://localhost:3000/login");
    await page.getByLabel(/email/i).fill("admin@example.com");
    await page.getByLabel(/password/i).fill("adminuser123");
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL("http://localhost:3000/dashboard", { timeout: 10000 }).catch(() => {});

    await use(page);
    await context.close();
  },

  // Editor authenticated user
  editorPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login as editor
    await page.goto("http://localhost:3000/login");
    await page.getByLabel(/email/i).fill("editor@example.com");
    await page.getByLabel(/password/i).fill("editoruser123");
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL("http://localhost:3000/dashboard", { timeout: 10000 }).catch(() => {});

    await use(page);
    await context.close();
  },
});

export { expect } from "@playwright/test";

// Helper functions for authentication
export async function loginAs(page: Page, email: string, password: string) {
  await page.goto("http://localhost:3000/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for redirect
  await page.waitForURL(/dashboard|\//, { timeout: 10000 }).catch(() => {});
}

export async function logout(page: Page) {
  // Navigate to signout page
  await page.goto("http://localhost:3000/auth/signout");

  // Click sign out button
  const signOutButton = page.getByRole("button", { name: /yes|sign out|confirm/i });

  if (await signOutButton.isVisible()) {
    await signOutButton.click();
  }

  await page.waitForTimeout(1000);
}

export async function isAuthenticated(page: Page): Promise<boolean> {
  // Check if we can access dashboard without redirect
  await page.goto("http://localhost:3000/dashboard");

  await page.waitForTimeout(1000);

  const url = page.url();
  return url.includes("/dashboard");
}
