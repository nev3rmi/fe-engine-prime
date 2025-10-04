import { hasPermission } from "@/lib/auth/permissions";
import type { User } from "@/types/auth";
import type { BreadcrumbItem } from "@/types/breadcrumb";

/**
 * Filter breadcrumb items based on user permissions
 */
export async function filterBreadcrumbs(
  items: BreadcrumbItem[],
  user: User | null
): Promise<BreadcrumbItem[]> {
  const filtered: BreadcrumbItem[] = [];

  for (const item of items) {
    // Check if user has required permission
    if (item.requiredPermission) {
      if (!user) {
        // Skip items requiring permission if no user
        continue;
      }

      const allowed = await hasPermission(user, item.requiredPermission);
      if (!allowed) {
        continue; // Skip this item
      }
    }

    filtered.push(item);
  }

  return filtered;
}

/**
 * Check if a breadcrumb trail is valid for the user
 */
export async function isBreadcrumbTrailValid(
  items: BreadcrumbItem[],
  user: User | null
): Promise<boolean> {
  for (const item of items) {
    if (item.requiredPermission) {
      if (!user) {
        return false;
      }

      const allowed = await hasPermission(user, item.requiredPermission);
      if (!allowed) {
        return false;
      }
    }
  }

  return true;
}
