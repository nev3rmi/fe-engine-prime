import { describe, it, expect } from "vitest";
import { filterNavigationItems, isNavigationItemAccessible } from "../filter-navigation";
import { NavigationItem } from "@/types/navigation";
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

const mockNavItems: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    id: "content",
    label: "Content",
    href: "/content",
    requiredPermission: Permission.READ_CONTENT,
  },
  {
    id: "admin",
    label: "Admin",
    href: "/admin",
    requiredPermission: Permission.MANAGE_USER_ROLES,
    children: [
      {
        id: "admin-users",
        label: "Users",
        href: "/admin/users",
        requiredPermission: Permission.MANAGE_USER_ROLES,
      },
    ],
  },
];

describe("filterNavigationItems", () => {
  it("should return all items without permission requirements when no user", async () => {
    const filtered = await filterNavigationItems(mockNavItems, null);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("dashboard");
  });

  it("should filter items based on user permissions", async () => {
    const filtered = await filterNavigationItems(mockNavItems, mockUser);
    expect(filtered.some(item => item.id === "dashboard")).toBe(true);
    expect(filtered.some(item => item.id === "content")).toBe(true);
    expect(filtered.some(item => item.id === "admin")).toBe(false);
  });

  it("should include admin items for admin users", async () => {
    const filtered = await filterNavigationItems(mockNavItems, mockAdminUser);
    expect(filtered.some(item => item.id === "admin")).toBe(true);
  });

  it("should filter children based on permissions", async () => {
    const filtered = await filterNavigationItems(mockNavItems, mockAdminUser);
    const adminItem = filtered.find(item => item.id === "admin");
    expect(adminItem?.children).toBeDefined();
    expect(adminItem?.children?.length).toBe(1);
  });

  it("should remove parent when no children are accessible", async () => {
    const items: NavigationItem[] = [
      {
        id: "parent",
        label: "Parent",
        href: "/parent",
        requiredPermission: Permission.MANAGE_USER_ROLES,
        children: [
          {
            id: "child",
            label: "Child",
            href: "/child",
            requiredPermission: Permission.MANAGE_USER_ROLES,
          },
        ],
      },
    ];

    const filtered = await filterNavigationItems(items, mockUser);
    expect(filtered).toHaveLength(0);
  });
});

describe("isNavigationItemAccessible", () => {
  it("should return true for public items", async () => {
    const item: NavigationItem = {
      id: "public",
      label: "Public",
      href: "/public",
    };

    const accessible = await isNavigationItemAccessible(item, null);
    expect(accessible).toBe(true);
  });

  it("should return false for protected items with no user", async () => {
    const item: NavigationItem = {
      id: "protected",
      label: "Protected",
      href: "/protected",
      requiredPermission: Permission.MANAGE_USER_ROLES,
    };

    const accessible = await isNavigationItemAccessible(item, null);
    expect(accessible).toBe(false);
  });

  it("should check permission for protected items", async () => {
    const item: NavigationItem = {
      id: "content",
      label: "Content",
      href: "/content",
      requiredPermission: Permission.READ_CONTENT,
    };

    const accessible = await isNavigationItemAccessible(item, mockUser);
    expect(accessible).toBe(true);
  });

  it("should deny access when user lacks permission", async () => {
    const item: NavigationItem = {
      id: "admin",
      label: "Admin",
      href: "/admin",
      requiredPermission: Permission.MANAGE_USER_ROLES,
    };

    const accessible = await isNavigationItemAccessible(item, mockUser);
    expect(accessible).toBe(false);
  });
});
