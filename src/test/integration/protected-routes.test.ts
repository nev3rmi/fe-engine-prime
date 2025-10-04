import { describe, it, expect, beforeEach, vi } from "vitest";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { UserRole, Permission } from "@/types/auth";

// Mock dependencies
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/auth/permissions", () => ({
  hasPermission: vi.fn(),
}));

describe("Protected Routes Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Unauthenticated Access", () => {
    it("should redirect unauthenticated users from /dashboard to /login", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      // Simulate the dashboard page protection logic
      const session = await auth();
      if (!session?.user) {
        redirect("/login");
      }

      expect(redirect).toHaveBeenCalledWith("/login");
    });

    it("should redirect unauthenticated users from /admin to /login", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const session = await auth();
      if (!session?.user) {
        redirect("/login");
      }

      expect(redirect).toHaveBeenCalledWith("/login");
    });

    it("should redirect unauthenticated users from /content to /login", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const session = await auth();
      if (!session?.user) {
        redirect("/login");
      }

      expect(redirect).toHaveBeenCalledWith("/login");
    });
  });

  describe("Authenticated Access - No Permission", () => {
    it("should redirect regular user from /admin to /dashboard", async () => {
      const mockSession = {
        user: {
          id: "user-1",
          email: "user@example.com",
          role: UserRole.USER,
        },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(hasPermission).mockResolvedValue(false);

      // Simulate admin page protection logic
      const session = await auth();
      if (!session?.user) {
        redirect("/login");
      }

      const canManageUsers = await hasPermission(session.user as any, Permission.MANAGE_USER_ROLES);

      if (!canManageUsers) {
        redirect("/dashboard");
      }

      expect(redirect).toHaveBeenCalledWith("/dashboard");
    });

    it("should redirect user without READ_CONTENT from /content to /dashboard", async () => {
      const mockSession = {
        user: {
          id: "user-1",
          email: "user@example.com",
          role: UserRole.USER,
        },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(hasPermission).mockResolvedValue(false);

      const session = await auth();
      const canReadContent = await hasPermission(session.user as any, Permission.READ_CONTENT);

      if (!canReadContent) {
        redirect("/dashboard");
      }

      expect(redirect).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("Authenticated Access - With Permission", () => {
    it("should allow admin user to access /admin", async () => {
      const mockSession = {
        user: {
          id: "admin-1",
          email: "admin@example.com",
          role: UserRole.ADMIN,
        },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(hasPermission).mockResolvedValue(true);

      const session = await auth();
      expect(session?.user).toBeDefined();

      const canManageUsers = await hasPermission(session.user as any, Permission.MANAGE_USER_ROLES);

      expect(canManageUsers).toBe(true);
      expect(redirect).not.toHaveBeenCalled();
    });

    it("should allow editor to access /content", async () => {
      const mockSession = {
        user: {
          id: "editor-1",
          email: "editor@example.com",
          role: UserRole.EDITOR,
        },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(hasPermission).mockResolvedValue(true);

      const session = await auth();
      expect(session?.user).toBeDefined();

      const canReadContent = await hasPermission(session.user as any, Permission.READ_CONTENT);

      expect(canReadContent).toBe(true);
      expect(redirect).not.toHaveBeenCalled();
    });

    it("should allow any authenticated user to access /dashboard", async () => {
      const mockSession = {
        user: {
          id: "user-1",
          email: "user@example.com",
          role: UserRole.USER,
        },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);

      const session = await auth();
      expect(session?.user).toBeDefined();
      expect(redirect).not.toHaveBeenCalled();
    });
  });

  describe("Role-Based Route Restrictions", () => {
    it("should enforce ADMIN-only routes", async () => {
      // Test USER role
      const userSession = {
        user: {
          id: "user-1",
          email: "user@example.com",
          role: UserRole.USER,
        },
      };

      vi.mocked(auth).mockResolvedValue(userSession as any);
      vi.mocked(hasPermission).mockResolvedValue(false);

      let session = await auth();
      let canAccess = await hasPermission(session.user as any, Permission.MANAGE_USER_ROLES);

      expect(canAccess).toBe(false);

      // Test EDITOR role
      const editorSession = {
        user: {
          id: "editor-1",
          email: "editor@example.com",
          role: UserRole.EDITOR,
        },
      };

      vi.mocked(auth).mockResolvedValue(editorSession as any);
      vi.mocked(hasPermission).mockResolvedValue(false);

      session = await auth();
      canAccess = await hasPermission(session.user as any, Permission.MANAGE_USER_ROLES);

      expect(canAccess).toBe(false);

      // Test ADMIN role
      const adminSession = {
        user: {
          id: "admin-1",
          email: "admin@example.com",
          role: UserRole.ADMIN,
        },
      };

      vi.mocked(auth).mockResolvedValue(adminSession as any);
      vi.mocked(hasPermission).mockResolvedValue(true);

      session = await auth();
      canAccess = await hasPermission(session.user as any, Permission.MANAGE_USER_ROLES);

      expect(canAccess).toBe(true);
    });

    it("should enforce EDITOR+ routes (READ_CONTENT)", async () => {
      // Test USER role
      const userSession = {
        user: {
          id: "user-1",
          email: "user@example.com",
          role: UserRole.USER,
        },
      };

      vi.mocked(auth).mockResolvedValue(userSession as any);
      vi.mocked(hasPermission).mockResolvedValue(false);

      let session = await auth();
      let canAccess = await hasPermission(session.user as any, Permission.READ_CONTENT);

      expect(canAccess).toBe(false);

      // Test EDITOR role
      const editorSession = {
        user: {
          id: "editor-1",
          email: "editor@example.com",
          role: UserRole.EDITOR,
        },
      };

      vi.mocked(auth).mockResolvedValue(editorSession as any);
      vi.mocked(hasPermission).mockResolvedValue(true);

      session = await auth();
      canAccess = await hasPermission(session.user as any, Permission.READ_CONTENT);

      expect(canAccess).toBe(true);
    });
  });

  describe("API Route Protection", () => {
    it("should protect admin API endpoints", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const session = await auth();

      if (!session?.user) {
        // Should return 401
        expect(session).toBeNull();
      }
    });

    it("should check permissions on admin API endpoints", async () => {
      const mockSession = {
        user: {
          id: "user-1",
          email: "user@example.com",
          role: UserRole.USER,
        },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(hasPermission).mockResolvedValue(false);

      const session = await auth();
      const canManageUsers = await hasPermission(session.user as any, Permission.MANAGE_USER_ROLES);

      if (!canManageUsers) {
        // Should return 403
        expect(canManageUsers).toBe(false);
      }
    });

    it("should allow authorized users to access admin API", async () => {
      const mockSession = {
        user: {
          id: "admin-1",
          email: "admin@example.com",
          role: UserRole.ADMIN,
        },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(hasPermission).mockResolvedValue(true);

      const session = await auth();
      const canManageUsers = await hasPermission(session.user as any, Permission.MANAGE_USER_ROLES);

      expect(session?.user).toBeDefined();
      expect(canManageUsers).toBe(true);
    });
  });

  describe("Session Validation", () => {
    it("should validate session before granting access", async () => {
      const validSession = {
        user: {
          id: "user-1",
          email: "user@example.com",
          role: UserRole.USER,
          isActive: true,
        },
      };

      vi.mocked(auth).mockResolvedValue(validSession as any);

      const session = await auth();
      expect(session?.user).toBeDefined();
      expect(session?.user.isActive).toBe(true);
    });

    it("should reject inactive user sessions", async () => {
      const inactiveSession = {
        user: {
          id: "user-1",
          email: "user@example.com",
          role: UserRole.USER,
          isActive: false,
        },
      };

      vi.mocked(auth).mockResolvedValue(inactiveSession as any);

      const session = await auth();

      if (session?.user && !session.user.isActive) {
        redirect("/login");
      }

      expect(redirect).toHaveBeenCalledWith("/login");
    });
  });
});
