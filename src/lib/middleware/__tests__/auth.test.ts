import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../auth";
import { Permission, UserRole } from "@/types/auth";
import { createMockSession, createMockAdminSession } from "@/test/utils/test-utils";

// Mock the auth function
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock permission checking
vi.mock("@/lib/auth/permissions", () => ({
  hasPermission: vi.fn(),
  hasAllPermissions: vi.fn(),
  hasAnyPermission: vi.fn(),
}));

describe("Authentication Middleware", () => {
  let mockAuth: any;
  let mockHasPermission: any;
  let mockHasAllPermissions: any;
  let mockHasAnyPermission: any;

  beforeEach(async () => {
    const authModule = await import("@/lib/auth");
    const permissionsModule = await import("@/lib/auth/permissions");

    mockAuth = vi.mocked(authModule.auth);
    mockHasPermission = vi.mocked(permissionsModule.hasPermission);
    mockHasAllPermissions = vi.mocked(permissionsModule.hasAllPermissions);
    mockHasAnyPermission = vi.mocked(permissionsModule.hasAnyPermission);

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe("withAuth wrapper", () => {
    it("should return 401 when no session exists", async () => {
      mockAuth.mockResolvedValue(null);

      const handler = withAuth(async (req, context) => {
        return NextResponse.json({ success: true });
      });

      const request = new NextRequest("http://localhost:3000/api/test");
      const response = await handler(request);

      expect(response.status).toBe(401);
      const responseData = await response.json();
      expect(responseData.error).toBe("Unauthorized");
    });

    it("should return 403 when user lacks required permissions", async () => {
      const session = createMockSession();
      mockAuth.mockResolvedValue(session);
      mockHasAllPermissions.mockResolvedValue(false);

      const handler = withAuth(
        async (req, context) => {
          return NextResponse.json({ success: true });
        },
        {
          requiredPermissions: [Permission.ADMIN_API_ACCESS],
          requireAll: true,
        }
      );

      const request = new NextRequest("http://localhost:3000/api/admin/test");
      const response = await handler(request);

      expect(response.status).toBe(403);
      const responseData = await response.json();
      expect(responseData.error).toBe("Insufficient permissions");
    });

    it("should call handler when user has required permissions", async () => {
      const session = createMockAdminSession();
      mockAuth.mockResolvedValue(session);
      mockHasAllPermissions.mockResolvedValue(true);

      const mockHandler = vi.fn(async (req, context) => {
        expect(context.user).toEqual(session.user);
        return NextResponse.json({ success: true, user: context.user.name });
      });

      const handler = withAuth(mockHandler, {
        requiredPermissions: [Permission.ADMIN_API_ACCESS],
        requireAll: true,
      });

      const request = new NextRequest("http://localhost:3000/api/admin/test");
      const response = await handler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalledWith(request, {
        user: session.user,
      });

      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.user).toBe("Admin User");
    });

    it("should work without permission requirements", async () => {
      const session = createMockSession();
      mockAuth.mockResolvedValue(session);

      const mockHandler = vi.fn(async (req, context) => {
        return NextResponse.json({ user: context.user.name });
      });

      const handler = withAuth(mockHandler);

      const request = new NextRequest("http://localhost:3000/api/protected");
      const response = await handler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();

      // Should not call permission checking functions
      expect(mockHasAllPermissions).not.toHaveBeenCalled();
      expect(mockHasAnyPermission).not.toHaveBeenCalled();
    });

    it("should use hasAnyPermission when requireAll is false", async () => {
      const session = createMockSession();
      mockAuth.mockResolvedValue(session);
      mockHasAnyPermission.mockResolvedValue(true);

      const handler = withAuth(
        async (req, context) => {
          return NextResponse.json({ success: true });
        },
        {
          requiredPermissions: [Permission.READ_CONTENT, Permission.CREATE_CONTENT],
          requireAll: false,
        }
      );

      const request = new NextRequest("http://localhost:3000/api/content");
      const response = await handler(request);

      expect(response.status).toBe(200);
      expect(mockHasAnyPermission).toHaveBeenCalledWith(session.user, [
        Permission.READ_CONTENT,
        Permission.CREATE_CONTENT,
      ]);
      expect(mockHasAllPermissions).not.toHaveBeenCalled();
    });

    it("should handle single permission requirement", async () => {
      const session = createMockSession();
      mockAuth.mockResolvedValue(session);
      mockHasPermission.mockResolvedValue(true);

      const handler = withAuth(
        async (req, context) => {
          return NextResponse.json({ success: true });
        },
        {
          requiredPermissions: [Permission.READ_CONTENT],
        }
      );

      const request = new NextRequest("http://localhost:3000/api/content");
      const response = await handler(request);

      expect(response.status).toBe(200);
      expect(mockHasPermission).toHaveBeenCalledWith(session.user, Permission.READ_CONTENT);
    });

    it("should handle errors in auth handler", async () => {
      mockAuth.mockRejectedValue(new Error("Auth error"));

      const handler = withAuth(async (req, context) => {
        return NextResponse.json({ success: true });
      });

      const request = new NextRequest("http://localhost:3000/api/test");
      const response = await handler(request);

      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.error).toBe("Internal server error");
    });

    it("should handle errors in permission checking", async () => {
      const session = createMockSession();
      mockAuth.mockResolvedValue(session);
      mockHasAllPermissions.mockRejectedValue(new Error("Permission error"));

      const handler = withAuth(
        async (req, context) => {
          return NextResponse.json({ success: true });
        },
        {
          requiredPermissions: [Permission.READ_CONTENT],
        }
      );

      const request = new NextRequest("http://localhost:3000/api/test");
      const response = await handler(request);

      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.error).toBe("Internal server error");
    });

    it("should handle inactive user accounts", async () => {
      const session = createMockSession();
      session.user.isActive = false;
      mockAuth.mockResolvedValue(session);

      const handler = withAuth(async (req, context) => {
        return NextResponse.json({ success: true });
      });

      const request = new NextRequest("http://localhost:3000/api/test");
      const response = await handler(request);

      expect(response.status).toBe(403);
      const responseData = await response.json();
      expect(responseData.error).toBe("Account is inactive");
    });

    it("should handle users with email not verified", async () => {
      const session = createMockSession();
      session.user.emailVerified = false;
      mockAuth.mockResolvedValue(session);

      const handler = withAuth(
        async (req, context) => {
          return NextResponse.json({ success: true });
        },
        {
          requireEmailVerified: true,
        }
      );

      const request = new NextRequest("http://localhost:3000/api/test");
      const response = await handler(request);

      expect(response.status).toBe(403);
      const responseData = await response.json();
      expect(responseData.error).toBe("Email verification required");
    });

    it("should pass custom context to handler", async () => {
      const session = createMockSession();
      mockAuth.mockResolvedValue(session);

      const mockHandler = vi.fn(async (req, context) => {
        expect(context.user).toEqual(session.user);
        expect(context.customData).toBe("test-data");
        return NextResponse.json({ success: true });
      });

      const handler = withAuth(mockHandler);

      const request = new NextRequest("http://localhost:3000/api/test");

      // Simulate adding custom context (this would normally be done in the withAuth implementation)
      const response = await handler(request);

      expect(mockHandler).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          user: session.user,
        })
      );
    });
  });

  describe("Role-based access", () => {
    it("should allow admin access to all endpoints", async () => {
      const session = createMockAdminSession();
      mockAuth.mockResolvedValue(session);
      mockHasAllPermissions.mockResolvedValue(true);

      const handler = withAuth(
        async (req, context) => {
          return NextResponse.json({ role: context.user.role });
        },
        {
          requiredPermissions: [Permission.ADMIN_API_ACCESS],
        }
      );

      const request = new NextRequest("http://localhost:3000/api/admin/settings");
      const response = await handler(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.role).toBe(UserRole.ADMIN);
    });

    it("should deny user access to admin endpoints", async () => {
      const session = createMockSession();
      mockAuth.mockResolvedValue(session);
      mockHasAllPermissions.mockResolvedValue(false);

      const handler = withAuth(
        async (req, context) => {
          return NextResponse.json({ success: true });
        },
        {
          requiredPermissions: [Permission.ADMIN_API_ACCESS],
        }
      );

      const request = new NextRequest("http://localhost:3000/api/admin/settings");
      const response = await handler(request);

      expect(response.status).toBe(403);
    });
  });
});
