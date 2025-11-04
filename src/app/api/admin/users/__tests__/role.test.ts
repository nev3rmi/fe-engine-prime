import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "../[id]/role/route";
import { UserRole } from "@/types/auth";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/audit/audit-service", () => ({
  logRoleChange: vi.fn(),
}));

vi.mock("@/lib/auth/permissions", () => ({
  hasPermission: vi.fn(),
  canManageRole: vi.fn(),
}));

vi.mock("@/lib/auth/user-service", () => ({
  updateUserRole: vi.fn(),
  getUserById: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { hasPermission, canManageRole } from "@/lib/auth/permissions";
import { updateUserRole, getUserById } from "@/lib/auth/user-service";

describe("PATCH /api/admin/users/[id]/role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/admin/users/1/role", {
      method: "PATCH",
      body: JSON.stringify({ role: UserRole.EDITOR }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "1" }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.message).toBe("Unauthorized");
  });

  it("returns 403 when user lacks MANAGE_USER_ROLES permission", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin", role: UserRole.EDITOR },
    } as any);
    vi.mocked(hasPermission).mockResolvedValue(false);

    const request = new NextRequest("http://localhost/api/admin/users/1/role", {
      method: "PATCH",
      body: JSON.stringify({ role: UserRole.EDITOR }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "1" }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.message).toBe("Insufficient permissions");
  });

  it("returns 400 for invalid role", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin", role: UserRole.ADMIN },
    } as any);
    vi.mocked(hasPermission).mockResolvedValue(true);

    const request = new NextRequest("http://localhost/api/admin/users/1/role", {
      method: "PATCH",
      body: JSON.stringify({ role: "INVALID_ROLE" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "1" }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe("Invalid role");
  });

  it("returns 403 when user cannot manage target role", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "editor", role: UserRole.EDITOR },
    } as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(canManageRole).mockReturnValue(false);

    const request = new NextRequest("http://localhost/api/admin/users/1/role", {
      method: "PATCH",
      body: JSON.stringify({ role: UserRole.ADMIN }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "1" }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.message).toContain("cannot assign");
  });

  it("returns 404 when user is not found", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin", role: UserRole.ADMIN },
    } as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(canManageRole).mockReturnValue(true);
    vi.mocked(getUserById).mockResolvedValue(null);
    vi.mocked(updateUserRole).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/admin/users/999/role", {
      method: "PATCH",
      body: JSON.stringify({ role: UserRole.EDITOR }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "999" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.message).toBe("User not found");
  });

  it("successfully updates user role when authorized", async () => {
    const targetUser = {
      id: "1",
      email: "user@example.com",
      name: "Test User",
      role: UserRole.USER,
    };

    const updatedUser = {
      ...targetUser,
      role: UserRole.EDITOR,
    };

    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin", role: UserRole.ADMIN },
    } as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(canManageRole).mockReturnValue(true);
    vi.mocked(getUserById).mockResolvedValue(targetUser as any);
    vi.mocked(updateUserRole).mockResolvedValue(updatedUser as any);

    const request = new NextRequest("http://localhost/api/admin/users/1/role", {
      method: "PATCH",
      body: JSON.stringify({ role: UserRole.EDITOR }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("User role updated successfully");
    expect(data.user.role).toBe(UserRole.EDITOR);
  });

  it("calls updateUserRole with correct parameters", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin", role: UserRole.ADMIN },
    } as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(canManageRole).mockReturnValue(true);
    vi.mocked(getUserById).mockResolvedValue({ id: "1", role: UserRole.EDITOR } as any);
    vi.mocked(updateUserRole).mockResolvedValue({
      id: "1",
      role: UserRole.USER,
    } as any);

    const request = new NextRequest("http://localhost/api/admin/users/1/role", {
      method: "PATCH",
      body: JSON.stringify({ role: UserRole.USER }),
    });

    await PATCH(request, { params: Promise.resolve({ id: "1" }) });

    expect(updateUserRole).toHaveBeenCalledWith("1", UserRole.USER);
  });
});
