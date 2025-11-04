import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "../[id]/status/route";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/auth/permissions", () => ({
  hasPermission: vi.fn(),
}));

vi.mock("@/lib/auth/user-service", () => ({
  toggleUserStatus: vi.fn(),
  getUserById: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { toggleUserStatus, getUserById } from "@/lib/auth/user-service";
import { UserRole } from "@/types/auth";

describe("PATCH /api/admin/users/[id]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/admin/users/1/status", {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "1" }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.message).toBe("Unauthorized");
  });

  it("returns 403 when user lacks MANAGE_USER_ROLES permission", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user", role: UserRole.USER },
    } as any);
    vi.mocked(hasPermission).mockResolvedValue(false);

    const request = new NextRequest("http://localhost/api/admin/users/1/status", {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "1" }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.message).toBe("Insufficient permissions");
  });

  it("returns 400 for invalid status value", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin", role: UserRole.ADMIN },
    } as any);
    vi.mocked(hasPermission).mockResolvedValue(true);

    const request = new NextRequest("http://localhost/api/admin/users/1/status", {
      method: "PATCH",
      body: JSON.stringify({ isActive: "invalid" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "1" }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe("Invalid status value");
  });

  it("prevents users from deactivating themselves", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin", role: UserRole.ADMIN },
    } as any);
    vi.mocked(hasPermission).mockResolvedValue(true);

    const request = new NextRequest("http://localhost/api/admin/users/admin/status", {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "admin" }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe("Cannot deactivate your own account");
  });

  it("returns 404 when user is not found", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin", role: UserRole.ADMIN },
    } as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(getUserById).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/admin/users/999/status", {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "999" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.message).toBe("User not found");
  });

  it("successfully deactivates user when authorized", async () => {
    const targetUser = {
      id: "1",
      email: "user@example.com",
      isActive: true,
    };

    const updatedUser = {
      ...targetUser,
      isActive: false,
    };

    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin", role: UserRole.ADMIN },
    } as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(getUserById).mockResolvedValue(targetUser as any);
    vi.mocked(toggleUserStatus).mockResolvedValue(updatedUser as any);

    const request = new NextRequest("http://localhost/api/admin/users/1/status", {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("User deactivated successfully");
    expect(data.user.isActive).toBe(false);
  });

  it("successfully activates user when authorized", async () => {
    const targetUser = {
      id: "1",
      email: "user@example.com",
      isActive: false,
    };

    const updatedUser = {
      ...targetUser,
      isActive: true,
    };

    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin", role: UserRole.ADMIN },
    } as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(getUserById).mockResolvedValue(targetUser as any);
    vi.mocked(toggleUserStatus).mockResolvedValue(updatedUser as any);

    const request = new NextRequest("http://localhost/api/admin/users/1/status", {
      method: "PATCH",
      body: JSON.stringify({ isActive: true }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("User activated successfully");
    expect(data.user.isActive).toBe(true);
  });

  it("calls toggleUserStatus with correct parameters", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin", role: UserRole.ADMIN },
    } as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(getUserById).mockResolvedValue({ id: "1" } as any);
    vi.mocked(toggleUserStatus).mockResolvedValue({
      id: "1",
      isActive: false,
    } as any);

    const request = new NextRequest("http://localhost/api/admin/users/1/status", {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    });

    await PATCH(request, { params: Promise.resolve({ id: "1" }) });

    expect(toggleUserStatus).toHaveBeenCalledWith("1", false);
  });
});
