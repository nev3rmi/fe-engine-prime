/**
 * Unit Tests for Root Route Authentication (FE-229)
 *
 * These tests verify that the root route ("/") properly redirects
 * based on authentication status and doesn't bypass security checks.
 */

import { describe, it, expect } from "vitest";
import { authRoutes } from "../auth";

describe("Root Route Authentication Configuration", () => {
  it("should not include root route in public routes", () => {
    // FE-229 Fix: Root route should NOT be in public routes
    expect(authRoutes.public).not.toContain("/");

    // Verify it was actually removed
    const hasRootRoute = authRoutes.public.some(route => route === "/");
    expect(hasRootRoute).toBe(false);
  });

  it("should include login and auth routes as public", () => {
    // These should still be public
    expect(authRoutes.public).toContain("/login");
    expect(authRoutes.public).toContain("/auth/signin");
    expect(authRoutes.public).toContain("/auth/signup");
    expect(authRoutes.public).toContain("/auth/error");
  });

  it("should include dashboard in protected routes", () => {
    // Dashboard should be protected
    expect(authRoutes.protected).toContain("/dashboard");
  });

  it("should have proper route categorization", () => {
    // Verify no overlap between public and protected routes
    const publicSet = new Set(authRoutes.public);
    const protectedSet = new Set(authRoutes.protected);

    const overlap = [...publicSet].filter(route => protectedSet.has(route));
    expect(overlap).toHaveLength(0);
  });
});

describe("Root Route Security", () => {
  it("should not allow unauthenticated access to dashboard", () => {
    // This is tested in E2E, but we verify config here
    expect(authRoutes.protected).toContain("/dashboard");
    expect(authRoutes.public).not.toContain("/dashboard");
  });

  it("should not allow root route to bypass authentication", () => {
    // FE-229: Root route must not be public
    const isRootPublic = authRoutes.public.includes("/");
    expect(isRootPublic).toBe(false);
  });
});

describe("Authentication Route Patterns", () => {
  it("should match API auth routes", () => {
    const apiAuthPattern = authRoutes.public.find(p => p === "/api/auth/.*");
    expect(apiAuthPattern).toBeDefined();
  });

  it("should match health check route", () => {
    expect(authRoutes.public).toContain("/api/health");
  });

  it("should have admin routes defined", () => {
    expect(authRoutes.admin).toBeDefined();
    expect(authRoutes.admin.length).toBeGreaterThan(0);
  });

  it("should have editor routes defined", () => {
    expect(authRoutes.editor).toBeDefined();
    expect(authRoutes.editor.length).toBeGreaterThan(0);
  });
});

describe("Route Configuration Integrity", () => {
  it("should export authRoutes object", () => {
    expect(authRoutes).toBeDefined();
    expect(typeof authRoutes).toBe("object");
  });

  it("should have all required route categories", () => {
    expect(authRoutes.public).toBeDefined();
    expect(authRoutes.protected).toBeDefined();
    expect(authRoutes.admin).toBeDefined();
    expect(authRoutes.editor).toBeDefined();
  });

  it("should have arrays for all route categories", () => {
    expect(Array.isArray(authRoutes.public)).toBe(true);
    expect(Array.isArray(authRoutes.protected)).toBe(true);
    expect(Array.isArray(authRoutes.admin)).toBe(true);
    expect(Array.isArray(authRoutes.editor)).toBe(true);
  });
});
