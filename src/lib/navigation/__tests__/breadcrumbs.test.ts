import { describe, it, expect } from "vitest";
import { generateBreadcrumbs } from "../breadcrumb-config";
import { filterBreadcrumbs, isBreadcrumbTrailValid } from "../filter-breadcrumbs";
import { BreadcrumbItem } from "@/types/breadcrumb";
import { User, UserRole, Permission } from "@/types/auth";

const mockUser: User = {
  id: "user-1",
  email: "user@example.com",
  username: "testuser",
  role: UserRole.EDITOR,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAdminUser: User = {
  ...mockUser,
  id: "admin-1",
  role: UserRole.ADMIN,
};

describe("generateBreadcrumbs", () => {
  it("should generate breadcrumbs for dashboard route", () => {
    const breadcrumbs = generateBreadcrumbs("/dashboard");
    expect(breadcrumbs).toBeDefined();
    expect(breadcrumbs?.length).toBe(2);
    expect(breadcrumbs?.[0].label).toBe("Home");
    expect(breadcrumbs?.[1].label).toBe("Dashboard");
  });

  it("should generate breadcrumbs for admin route", () => {
    const breadcrumbs = generateBreadcrumbs("/admin");
    expect(breadcrumbs).toBeDefined();
    expect(breadcrumbs?.[0].label).toBe("Home");
    expect(breadcrumbs?.[1].label).toBe("Administration");
    expect(breadcrumbs?.[1].requiredPermission).toBe(Permission.MANAGE_USER_ROLES);
  });

  it("should generate breadcrumbs for nested admin route", () => {
    const breadcrumbs = generateBreadcrumbs("/admin/settings");
    expect(breadcrumbs).toBeDefined();
    expect(breadcrumbs?.length).toBe(3);
    expect(breadcrumbs?.[1].label).toBe("Administration");
    expect(breadcrumbs?.[2].label).toBe("Settings");
  });

  it("should mark last item as current page", () => {
    const breadcrumbs = generateBreadcrumbs("/dashboard");
    const lastItem = breadcrumbs?.[breadcrumbs.length - 1];
    expect(lastItem?.isCurrentPage).toBe(true);
  });

  it("should generate fallback breadcrumbs for unknown routes", () => {
    const breadcrumbs = generateBreadcrumbs("/some/unknown/route");
    expect(breadcrumbs).toBeDefined();
    expect(breadcrumbs?.length).toBe(4); // Home + 3 segments
    expect(breadcrumbs?.[0].label).toBe("Home");
    expect(breadcrumbs?.[1].label).toBe("Some");
    expect(breadcrumbs?.[2].label).toBe("Unknown");
    expect(breadcrumbs?.[3].label).toBe("Route");
  });
});

describe("filterBreadcrumbs", () => {
  it("should return all items without permission requirements", async () => {
    const items: BreadcrumbItem[] = [
      { label: "Home", href: "/" },
      { label: "Dashboard", isCurrentPage: true },
    ];

    const filtered = await filterBreadcrumbs(items, null);
    expect(filtered).toHaveLength(2);
  });

  it("should filter items based on user permissions", async () => {
    const items: BreadcrumbItem[] = [
      { label: "Home", href: "/" },
      { label: "Admin", href: "/admin", requiredPermission: Permission.MANAGE_USER_ROLES },
    ];

    const filtered = await filterBreadcrumbs(items, mockUser);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].label).toBe("Home");
  });

  it("should include protected items for users with permission", async () => {
    const items: BreadcrumbItem[] = [
      { label: "Home", href: "/" },
      { label: "Content", href: "/content", requiredPermission: Permission.READ_CONTENT },
    ];

    const filtered = await filterBreadcrumbs(items, mockUser);
    expect(filtered).toHaveLength(2);
  });

  it("should include admin items for admin users", async () => {
    const items: BreadcrumbItem[] = [
      { label: "Home", href: "/" },
      { label: "Admin", href: "/admin", requiredPermission: Permission.MANAGE_USER_ROLES },
    ];

    const filtered = await filterBreadcrumbs(items, mockAdminUser);
    expect(filtered).toHaveLength(2);
  });
});

describe("isBreadcrumbTrailValid", () => {
  it("should return true for public breadcrumb trail", async () => {
    const items: BreadcrumbItem[] = [
      { label: "Home", href: "/" },
      { label: "Dashboard", isCurrentPage: true },
    ];

    const isValid = await isBreadcrumbTrailValid(items, null);
    expect(isValid).toBe(true);
  });

  it("should return false if any item requires permission and no user", async () => {
    const items: BreadcrumbItem[] = [
      { label: "Home", href: "/" },
      { label: "Admin", requiredPermission: Permission.MANAGE_USER_ROLES },
    ];

    const isValid = await isBreadcrumbTrailValid(items, null);
    expect(isValid).toBe(false);
  });

  it("should return true if user has all required permissions", async () => {
    const items: BreadcrumbItem[] = [
      { label: "Home", href: "/" },
      { label: "Content", requiredPermission: Permission.READ_CONTENT },
    ];

    const isValid = await isBreadcrumbTrailValid(items, mockUser);
    expect(isValid).toBe(true);
  });

  it("should return false if user lacks any required permission", async () => {
    const items: BreadcrumbItem[] = [
      { label: "Home", href: "/" },
      { label: "Content", requiredPermission: Permission.READ_CONTENT },
      { label: "Admin", requiredPermission: Permission.MANAGE_USER_ROLES },
    ];

    const isValid = await isBreadcrumbTrailValid(items, mockUser);
    expect(isValid).toBe(false);
  });
});
