import { Permission } from "@/types/auth";
import type { BreadcrumbConfig } from "@/types/breadcrumb";

export const breadcrumbConfig: BreadcrumbConfig = {
  "/dashboard": [
    { label: "Home", href: "/" },
    { label: "Dashboard", isCurrentPage: true },
  ],
  "/content": [
    { label: "Home", href: "/" },
    { label: "Content", isCurrentPage: true, requiredPermission: Permission.READ_CONTENT },
  ],
  "/admin": [
    { label: "Home", href: "/" },
    {
      label: "Administration",
      isCurrentPage: true,
      requiredPermission: Permission.MANAGE_USER_ROLES,
    },
  ],
  "/admin/settings": [
    { label: "Home", href: "/" },
    { label: "Administration", href: "/admin", requiredPermission: Permission.MANAGE_USER_ROLES },
    { label: "Settings", isCurrentPage: true, requiredPermission: Permission.MANAGE_USER_ROLES },
  ],
};

/**
 * Generate breadcrumbs for a given path
 */
export function generateBreadcrumbs(pathname: string): BreadcrumbConfig[string] | null {
  // Direct match
  if (breadcrumbConfig[pathname]) {
    return breadcrumbConfig[pathname];
  }

  // Try to match dynamic routes (e.g., /admin/users/123)
  const segments = pathname.split("/").filter(Boolean);

  // Build up path segments and check for matches
  for (let i = segments.length; i > 0; i--) {
    const path = `/${segments.slice(0, i).join("/")}`;
    if (breadcrumbConfig[path]) {
      return breadcrumbConfig[path];
    }
  }

  // Fallback: generate from path segments
  if (segments.length > 0) {
    const breadcrumbs: BreadcrumbConfig[string] = [{ label: "Home", href: "/" }];

    let currentPath = "";
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;
      breadcrumbs.push({
        label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " "),
        href: isLast ? undefined : currentPath,
        isCurrentPage: isLast,
      });
    });

    return breadcrumbs;
  }

  return null;
}
